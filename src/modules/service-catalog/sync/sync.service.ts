import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ServiceCatalogService } from '../service-catalog.service';
import {
  ServiceEventPayload,
  ServiceEventData,
  ServiceEventMapper,
} from './dto/service-event.dto';
import { EventProcessingStatus } from '@prisma/client';

/**
 * Sync Service
 *
 * Handles synchronization of service catalog from external systems.
 * Processes Kafka events with idempotency and breaking change detection.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceCatalogService: ServiceCatalogService,
  ) {}

  /**
   * Process a service.created event
   * @param eventPayload - Full event payload
   * @param eventLogId - Event log ID for tracking
   */
  async handleServiceCreated(
    eventPayload: ServiceEventPayload,
    eventLogId: string,
  ): Promise<void> {
    const data = eventPayload.data;

    this.logger.log(
      `Processing service.created: ${data.externalServiceCode} from ${eventPayload.source}`,
    );

    try {
      // Check if service already exists
      const existing = await this.prisma.serviceCatalog.findUnique({
        where: { externalServiceCode: data.externalServiceCode },
      });

      if (existing) {
        this.logger.warn(
          `Service ${data.externalServiceCode} already exists, treating as update`,
        );
        await this.handleServiceUpdated(eventPayload, eventLogId);
        return;
      }

      // Map external types to internal enums
      const serviceType = ServiceEventMapper.mapServiceType(data.type);
      const serviceCategory = ServiceEventMapper.mapServiceCategory(
        data.category,
      );

      // Resolve contract template if provided
      let contractTemplateId: string | undefined;
      if (data.contractTemplateCode) {
        const template = await this.prisma.contractTemplate.findUnique({
          where: { code: data.contractTemplateCode },
        });
        contractTemplateId = template?.id;

        if (!contractTemplateId) {
          this.logger.warn(
            `Contract template ${data.contractTemplateCode} not found, proceeding without it`,
          );
        }
      }

      // Generate FSM service code (auto-increment pattern)
      const fsmServiceCode = await this.generateFSMServiceCode(
        data.countryCode,
        serviceCategory,
      );

      // Create service using ServiceCatalogService (includes checksum computation)
      await this.serviceCatalogService.create({
        externalServiceCode: data.externalServiceCode,
        fsmServiceCode,
        externalSource: eventPayload.source,
        countryCode: data.countryCode,
        businessUnit: data.businessUnit,
        serviceType,
        serviceCategory,
        name: data.name,
        description: data.description,
        scopeIncluded: data.scopeIncluded,
        scopeExcluded: data.scopeExcluded,
        worksiteRequirements: data.worksiteRequirements,
        productPrerequisites: data.productPrerequisites,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        requiresPreServiceContract: data.requiresPreServiceContract,
        requiresPostServiceWCF: data.requiresPostServiceWCF,
        contractTemplateId,
        createdBy: `SYNC_${eventPayload.source}`,
      });

      this.logger.log(
        `Successfully created service ${data.externalServiceCode} with FSM code ${fsmServiceCode}`,
      );

      // Update event log status
      await this.updateEventLogStatus(eventLogId, 'COMPLETED', null);
    } catch (error) {
      this.logger.error(
        `Failed to create service ${data.externalServiceCode}: ${error.message}`,
        error.stack,
      );

      await this.updateEventLogStatus(
        eventLogId,
        'FAILED',
        error.message || 'Unknown error',
      );
      throw error;
    }
  }

  /**
   * Process a service.updated event
   * @param eventPayload - Full event payload
   * @param eventLogId - Event log ID for tracking
   */
  async handleServiceUpdated(
    eventPayload: ServiceEventPayload,
    eventLogId: string,
  ): Promise<void> {
    const data = eventPayload.data;

    this.logger.log(
      `Processing service.updated: ${data.externalServiceCode} from ${eventPayload.source}`,
    );

    try {
      // Find existing service
      const existing = await this.serviceCatalogService.findByExternalCode(
        data.externalServiceCode,
      );

      // Detect breaking changes (scope reduction, new requirements)
      const hasBreakingChanges =
        this.serviceCatalogService.detectBreakingChanges(existing, {
          scopeIncluded: data.scopeIncluded,
          scopeExcluded: data.scopeExcluded,
          worksiteRequirements: data.worksiteRequirements,
          productPrerequisites: data.productPrerequisites,
        });

      if (hasBreakingChanges) {
        this.logger.warn(
          `Breaking changes detected for ${data.externalServiceCode}. Manual review may be required.`,
        );

        // TODO: Create a pending change record for manual review
        // For now, we log and continue with the update
        // In production, this would trigger an alert or create a review task
      }

      // Compute new checksum
      const serviceType = ServiceEventMapper.mapServiceType(data.type);
      const serviceCategory = ServiceEventMapper.mapServiceCategory(
        data.category,
      );

      const newChecksum = this.serviceCatalogService.computeChecksum({
        externalServiceCode: data.externalServiceCode,
        serviceType,
        serviceCategory,
        name: data.name,
        description: data.description,
        scopeIncluded: data.scopeIncluded,
        scopeExcluded: data.scopeExcluded,
        worksiteRequirements: data.worksiteRequirements,
        productPrerequisites: data.productPrerequisites,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
      });

      // Check if checksum has changed
      if (existing.syncChecksum === newChecksum) {
        this.logger.debug(
          `No changes detected for ${data.externalServiceCode}, skipping update`,
        );
        await this.updateEventLogStatus(eventLogId, 'COMPLETED', null);
        return;
      }

      // Update service
      await this.serviceCatalogService.update(
        existing.id,
        {
          name: data.name,
          description: data.description,
          scopeIncluded: data.scopeIncluded,
          scopeExcluded: data.scopeExcluded,
          worksiteRequirements: data.worksiteRequirements,
          productPrerequisites: data.productPrerequisites,
          estimatedDurationMinutes: data.estimatedDurationMinutes,
          requiresPreServiceContract: data.requiresPreServiceContract,
          requiresPostServiceWCF: data.requiresPostServiceWCF,
        },
        `SYNC_${eventPayload.source}`,
      );

      // Update sync metadata
      await this.prisma.serviceCatalog.update({
        where: { id: existing.id },
        data: {
          syncChecksum: newChecksum,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(
        `Successfully updated service ${data.externalServiceCode}`,
      );

      await this.updateEventLogStatus(eventLogId, 'COMPLETED', null);
    } catch (error) {
      this.logger.error(
        `Failed to update service ${data.externalServiceCode}: ${error.message}`,
        error.stack,
      );

      await this.updateEventLogStatus(
        eventLogId,
        'FAILED',
        error.message || 'Unknown error',
      );
      throw error;
    }
  }

  /**
   * Process a service.deprecated event
   * @param eventPayload - Full event payload
   * @param eventLogId - Event log ID for tracking
   */
  async handleServiceDeprecated(
    eventPayload: ServiceEventPayload,
    eventLogId: string,
  ): Promise<void> {
    const data = eventPayload.data;

    this.logger.log(
      `Processing service.deprecated: ${data.externalServiceCode} from ${eventPayload.source}`,
    );

    try {
      // Find existing service
      const existing = await this.serviceCatalogService.findByExternalCode(
        data.externalServiceCode,
      );

      // Deprecate service
      await this.serviceCatalogService.deprecate(
        existing.id,
        data.deprecationReason || 'Deprecated by external system',
        `SYNC_${eventPayload.source}`,
      );

      this.logger.log(
        `Successfully deprecated service ${data.externalServiceCode}`,
      );

      await this.updateEventLogStatus(eventLogId, 'COMPLETED', null);
    } catch (error) {
      this.logger.error(
        `Failed to deprecate service ${data.externalServiceCode}: ${error.message}`,
        error.stack,
      );

      await this.updateEventLogStatus(
        eventLogId,
        'FAILED',
        error.message || 'Unknown error',
      );
      throw error;
    }
  }

  /**
   * Generate FSM service code with auto-increment pattern
   * Format: SVC_{COUNTRY}_{CATEGORY}_{SEQUENCE}
   * Example: SVC_ES_HVAC_001
   */
  private async generateFSMServiceCode(
    countryCode: string,
    category: string,
  ): Promise<string> {
    const prefix = `SVC_${countryCode}_${category}`;

    // Find the highest sequence number for this prefix
    const existing = await this.prisma.serviceCatalog.findMany({
      where: {
        fsmServiceCode: {
          startsWith: prefix,
        },
      },
      select: {
        fsmServiceCode: true,
      },
      orderBy: {
        fsmServiceCode: 'desc',
      },
      take: 1,
    });

    let sequence = 1;
    if (existing.length > 0) {
      const lastCode = existing[0].fsmServiceCode;
      const match = lastCode.match(/_(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}_${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Update event log status
   */
  private async updateEventLogStatus(
    eventLogId: string,
    status: EventProcessingStatus,
    errorMessage: string | null,
  ): Promise<void> {
    await this.prisma.serviceCatalogEventLog.update({
      where: { id: eventLogId },
      data: {
        processingStatus: status,
        errorMessage,
        processedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(
    source: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = { externalSource: source };

    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) where.receivedAt.gte = startDate;
      if (endDate) where.receivedAt.lte = endDate;
    }

    const [total, completed, failed, pending, processing] = await Promise.all([
      this.prisma.serviceCatalogEventLog.count({ where }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...where, processingStatus: 'COMPLETED' },
      }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...where, processingStatus: 'FAILED' },
      }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...where, processingStatus: 'PENDING' },
      }),
      this.prisma.serviceCatalogEventLog.count({
        where: { ...where, processingStatus: 'PROCESSING' },
      }),
    ]);

    return {
      total,
      completed,
      failed,
      pending,
      processing,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
      failureRate: total > 0 ? ((failed / total) * 100).toFixed(2) : '0.00',
    };
  }

  /**
   * Retry failed events
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   */
  async retryFailedEvents(maxRetries: number = 3): Promise<number> {
    const failedEvents = await this.prisma.serviceCatalogEventLog.findMany({
      where: {
        processingStatus: 'FAILED',
        retryCount: {
          lt: maxRetries,
        },
      },
      take: 100, // Process in batches
    });

    this.logger.log(
      `Found ${failedEvents.length} failed events to retry (max retries: ${maxRetries})`,
    );

    let retriedCount = 0;

    for (const eventLog of failedEvents) {
      try {
        const payload = eventLog.payload as any;

        // Increment retry count
        await this.prisma.serviceCatalogEventLog.update({
          where: { id: eventLog.id },
          data: {
            retryCount: eventLog.retryCount + 1,
            processingStatus: 'PROCESSING',
          },
        });

        // Reprocess based on event type
        switch (payload.eventType) {
          case 'service.created':
            await this.handleServiceCreated(payload, eventLog.id);
            break;
          case 'service.updated':
            await this.handleServiceUpdated(payload, eventLog.id);
            break;
          case 'service.deprecated':
            await this.handleServiceDeprecated(payload, eventLog.id);
            break;
          default:
            throw new Error(`Unknown event type: ${payload.eventType}`);
        }

        retriedCount++;
      } catch (error) {
        this.logger.error(
          `Retry failed for event ${eventLog.eventId}: ${error.message}`,
        );

        // If max retries reached, move to dead letter
        if (eventLog.retryCount + 1 >= maxRetries) {
          await this.prisma.serviceCatalogEventLog.update({
            where: { id: eventLog.id },
            data: {
              processingStatus: 'DEAD_LETTER',
              errorMessage: `Max retries (${maxRetries}) exceeded. Last error: ${error.message}`,
            },
          });
        }
      }
    }

    this.logger.log(`Successfully retried ${retriedCount} events`);
    return retriedCount;
  }
}
