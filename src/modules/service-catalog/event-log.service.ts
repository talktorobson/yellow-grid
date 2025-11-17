import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventProcessingStatus } from '@prisma/client';

/**
 * Service Catalog Event Log Service
 *
 * Manages event log entries for idempotency and audit trail.
 * Prevents duplicate event processing and tracks event lifecycle.
 */
@Injectable()
export class ServiceCatalogEventLogService {
  private readonly logger = new Logger(ServiceCatalogEventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find event by event ID (for idempotency check)
   * @param eventId - Unique event identifier
   * @returns Event log entry if exists, null otherwise
   */
  async findByEventId(eventId: string) {
    return this.prisma.serviceCatalogEventLog.findUnique({
      where: { eventId },
    });
  }

  /**
   * Create a new event log entry
   * @param data - Event log creation data
   * @returns Created event log entry
   */
  async create(data: {
    eventId: string;
    eventType: string;
    externalSource: string;
    externalServiceCode: string;
    payload: any;
  }) {
    return this.prisma.serviceCatalogEventLog.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType,
        externalSource: data.externalSource,
        externalServiceCode: data.externalServiceCode,
        payload: data.payload,
        processingStatus: EventProcessingStatus.PENDING,
        retryCount: 0,
        receivedAt: new Date(),
      },
    });
  }

  /**
   * Mark event as completed
   * @param eventId - Event identifier
   */
  async markAsCompleted(eventId: string) {
    return this.prisma.serviceCatalogEventLog.update({
      where: { eventId },
      data: {
        processingStatus: EventProcessingStatus.COMPLETED,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark event as failed
   * @param eventId - Event identifier
   * @param error - Error that occurred
   */
  async markAsFailed(eventId: string, error: Error) {
    const eventLog = await this.findByEventId(eventId);

    if (!eventLog) {
      this.logger.error(`Event ${eventId} not found for failure marking`);
      return;
    }

    const newRetryCount = eventLog.retryCount + 1;
    const maxRetries = 3;

    // Move to dead letter queue if max retries exceeded
    const status =
      newRetryCount >= maxRetries
        ? EventProcessingStatus.DEAD_LETTER
        : EventProcessingStatus.FAILED;

    return this.prisma.serviceCatalogEventLog.update({
      where: { eventId },
      data: {
        processingStatus: status,
        errorMessage: error.message,
        retryCount: newRetryCount,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark event for retry (reset to PENDING)
   * @param eventId - Event identifier
   */
  async markForRetry(eventId: string) {
    const eventLog = await this.findByEventId(eventId);

    if (!eventLog) {
      throw new Error(`Event ${eventId} not found`);
    }

    if (eventLog.retryCount >= 3) {
      throw new Error(`Event ${eventId} has exceeded max retries`);
    }

    return this.prisma.serviceCatalogEventLog.update({
      where: { eventId },
      data: {
        processingStatus: EventProcessingStatus.PENDING,
        errorMessage: null,
      },
    });
  }

  /**
   * Get failed events for manual review
   * @param limit - Maximum number of events to return
   * @returns List of failed events
   */
  async getFailedEvents(limit: number = 50) {
    return this.prisma.serviceCatalogEventLog.findMany({
      where: {
        processingStatus: {
          in: [EventProcessingStatus.FAILED, EventProcessingStatus.DEAD_LETTER],
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get events by external service code
   * @param externalServiceCode - External service code
   * @param limit - Maximum number of events to return
   * @returns List of events for the service
   */
  async getEventsByServiceCode(externalServiceCode: string, limit: number = 20) {
    return this.prisma.serviceCatalogEventLog.findMany({
      where: { externalServiceCode },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get event statistics
   * @param since - Start date for statistics (default: 7 days ago)
   * @returns Event processing statistics
   */
  async getStatistics(since?: Date) {
    const startDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, completed, failed, deadLetter, byType, bySource] =
      await Promise.all([
        this.prisma.serviceCatalogEventLog.count({
          where: { receivedAt: { gte: startDate } },
        }),
        this.prisma.serviceCatalogEventLog.count({
          where: {
            receivedAt: { gte: startDate },
            processingStatus: EventProcessingStatus.COMPLETED,
          },
        }),
        this.prisma.serviceCatalogEventLog.count({
          where: {
            receivedAt: { gte: startDate },
            processingStatus: EventProcessingStatus.FAILED,
          },
        }),
        this.prisma.serviceCatalogEventLog.count({
          where: {
            receivedAt: { gte: startDate },
            processingStatus: EventProcessingStatus.DEAD_LETTER,
          },
        }),
        this.prisma.serviceCatalogEventLog.groupBy({
          by: ['eventType'],
          where: { receivedAt: { gte: startDate } },
          _count: true,
        }),
        this.prisma.serviceCatalogEventLog.groupBy({
          by: ['externalSource'],
          where: { receivedAt: { gte: startDate } },
          _count: true,
        }),
      ]);

    return {
      period: {
        since: startDate,
        until: new Date(),
      },
      total,
      byStatus: {
        completed,
        failed,
        deadLetter,
        pending: total - completed - failed - deadLetter,
      },
      successRate:
        total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
      byType: byType.map((item) => ({
        type: item.eventType,
        count: item._count,
      })),
      bySource: bySource.map((item) => ({
        source: item.externalSource,
        count: item._count,
      })),
    };
  }

  /**
   * Clean up old completed events (housekeeping)
   * @param olderThanDays - Delete events older than this many days
   * @returns Number of deleted events
   */
  async cleanupOldEvents(olderThanDays: number = 30) {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.serviceCatalogEventLog.deleteMany({
      where: {
        processingStatus: EventProcessingStatus.COMPLETED,
        processedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} event log entries older than ${olderThanDays} days`,
    );

    return result.count;
  }
}
