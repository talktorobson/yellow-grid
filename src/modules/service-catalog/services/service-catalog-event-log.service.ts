import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ServiceCatalogEventLog, EventProcessingStatus, Prisma } from '@prisma/client';

/**
 * Service for managing service catalog event logs
 * Handles idempotency tracking and event processing status
 */
@Injectable()
export class ServiceCatalogEventLogService {
  private readonly logger = new Logger(ServiceCatalogEventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find event log by event ID (for idempotency check)
   */
  async findByEventId(eventId: string): Promise<ServiceCatalogEventLog | null> {
    return this.prisma.serviceCatalogEventLog.findUnique({
      where: { eventId },
    });
  }

  /**
   * Create a new event log entry
   */
  async create(data: {
    eventId: string;
    eventType: string;
    eventSource: string;
    eventTimestamp: Date;
    externalServiceCode: string;
    payload: any;
    processingStatus: EventProcessingStatus;
  }): Promise<ServiceCatalogEventLog> {
    return this.prisma.serviceCatalogEventLog.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType,
        externalSource: data.eventSource,
        externalServiceCode: data.externalServiceCode,
        payload: data.payload as Prisma.JsonObject,
        processingStatus: data.processingStatus,
        retryCount: 0,
        receivedAt: new Date(),
      },
    });
  }

  /**
   * Mark event as successfully processed
   */
  async markAsProcessed(eventLogId: string): Promise<void> {
    await this.prisma.serviceCatalogEventLog.update({
      where: { id: eventLogId },
      data: {
        processingStatus: EventProcessingStatus.COMPLETED,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark event as skipped (e.g., unknown event type)
   */
  async markAsSkipped(eventLogId: string, reason: string): Promise<void> {
    await this.prisma.serviceCatalogEventLog.update({
      where: { id: eventLogId },
      data: {
        processingStatus: EventProcessingStatus.FAILED,
        errorMessage: reason,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark event as failed and increment retry counter
   */
  async markAsFailed(eventId: string, error: any): Promise<void> {
    const eventLog = await this.findByEventId(eventId);

    if (!eventLog) {
      this.logger.error(`Cannot mark event ${eventId} as failed: event log not found`);
      return;
    }

    const retries = (eventLog.retryCount || 0) + 1;
    const status: EventProcessingStatus = retries >= 3 ? EventProcessingStatus.DEAD_LETTER : EventProcessingStatus.FAILED;

    await this.prisma.serviceCatalogEventLog.update({
      where: { id: eventLog.id },
      data: {
        processingStatus: status,
        retryCount: retries,
        errorMessage: error.message || 'Unknown error',
      },
    });

    if (status === EventProcessingStatus.DEAD_LETTER) {
      this.logger.error(
        `⚠️ Event ${eventId} moved to dead letter queue after ${retries} attempts`
      );
    }
  }

  /**
   * Find retryable failed events
   */
  async findRetryable(limit: number = 100): Promise<ServiceCatalogEventLog[]> {
    return this.prisma.serviceCatalogEventLog.findMany({
      where: {
        processingStatus: EventProcessingStatus.FAILED,
        retryCount: { lt: 3 },
      },
      orderBy: { receivedAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Get event processing statistics
   */
  async getStatistics(since?: Date): Promise<{
    total: number;
    completed: number;
    failed: number;
    deadLetter: number;
    pending: number;
    processing: number;
  }> {
    const whereClause = since ? { receivedAt: { gte: since } } : {};

    const [total, completed, failed, deadLetter, pending, processing] = await Promise.all([
      this.prisma.serviceCatalogEventLog.count({ where: whereClause }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...whereClause, processingStatus: EventProcessingStatus.COMPLETED },
      }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...whereClause, processingStatus: EventProcessingStatus.FAILED },
      }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...whereClause, processingStatus: EventProcessingStatus.DEAD_LETTER },
      }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...whereClause, processingStatus: EventProcessingStatus.PENDING },
      }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...whereClause, processingStatus: EventProcessingStatus.PROCESSING },
      }),
    ]);

    return {
      total,
      completed,
      failed,
      deadLetter,
      pending,
      processing,
    };
  }

  /**
   * Get recent events for monitoring
   */
  async getRecentEvents(limit: number = 50): Promise<ServiceCatalogEventLog[]> {
    return this.prisma.serviceCatalogEventLog.findMany({
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
  }
}
