import { Injectable, Logger } from '@nestjs/common';
import { ServiceCatalogEventLogService } from './event-log.service';
import { ServiceCatalogSyncService } from './sync.service';

/**
 * Service Catalog Event Processor
 *
 * Processes service catalog events from external systems.
 * Can work with real Kafka events or mock events for testing.
 * Implements idempotency and error handling with retry logic.
 */
@Injectable()
export class ServiceCatalogEventProcessor {
  private readonly logger = new Logger(ServiceCatalogEventProcessor.name);

  constructor(
    private readonly eventLogService: ServiceCatalogEventLogService,
    private readonly syncService: ServiceCatalogSyncService,
  ) {}

  /**
   * Process a service catalog event
   * @param event - Event payload from Kafka or mock source
   * @returns Processing result
   */
  async processEvent(event: ServiceCatalogEvent): Promise<ProcessingResult> {
    const eventId = event.eventId || `${event.eventType}_${Date.now()}`;

    this.logger.log(
      `📩 Processing event: ${event.eventType} | Service: ${event.data?.externalServiceCode} | Event ID: ${eventId}`,
    );

    try {
      // Step 1: Check idempotency (already processed?)
      const existingLog = await this.eventLogService.findByEventId(eventId);

      if (existingLog) {
        this.logger.warn(`⚠️  Event ${eventId} already processed, skipping`);
        return {
          success: true,
          eventId,
          action: 'skipped',
          reason: 'Already processed',
        };
      }

      // Step 2: Log event to database
      const eventLog = await this.eventLogService.create({
        eventId,
        eventType: event.eventType,
        externalSource: event.source || 'UNKNOWN',
        externalServiceCode: event.data.externalServiceCode,
        payload: event,
      });

      // Step 3: Process based on event type
      let result: any;

      switch (event.eventType) {
        case 'service.created':
          result = await this.syncService.handleServiceCreated(event.data);
          break;

        case 'service.updated':
          result = await this.syncService.handleServiceUpdated(event.data);
          break;

        case 'service.deprecated':
          result = await this.syncService.handleServiceDeprecated(event.data);
          break;

        default:
          this.logger.warn(`❓ Unknown event type: ${event.eventType}`);
          throw new Error(`Unknown event type: ${event.eventType}`);
      }

      // Step 4: Mark as completed
      await this.eventLogService.markAsCompleted(eventId);

      this.logger.log(`✅ Event ${eventId} processed successfully`);

      return {
        success: true,
        eventId,
        action: event.eventType.split('.')[1], // created, updated, deprecated
        serviceId: result.id,
        serviceFsmCode: result.fsmServiceCode,
      };
    } catch (error) {
      this.logger.error(`❌ Error processing event ${eventId}:`, error);

      // Update event log with error
      await this.eventLogService.markAsFailed(eventId, error);

      return {
        success: false,
        eventId,
        action: 'failed',
        reason: error.message,
      };
    }
  }

  /**
   * Process multiple events in batch
   * @param events - Array of events
   * @returns Batch processing results
   */
  async processEventBatch(
    events: ServiceCatalogEvent[],
  ): Promise<BatchProcessingResult> {
    this.logger.log(`📦 Processing batch of ${events.length} events`);

    const results = await Promise.allSettled(
      events.map((event) => this.processEvent(event)),
    );

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success,
    ).length;
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success),
    ).length;

    this.logger.log(
      `✅ Batch processed: ${successful} successful, ${failed} failed`,
    );

    const processedResults: ProcessingResult[] = results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, eventId: 'unknown', action: 'failed', reason: 'Promise rejected' },
    );

    return {
      total: events.length,
      successful,
      failed,
      results: processedResults,
    };
  }

  /**
   * Retry failed events
   * @param maxRetries - Maximum number of events to retry
   * @returns Number of events retried
   */
  async retryFailedEvents(maxRetries: number = 10): Promise<number> {
    this.logger.log(`🔄 Retrying failed events (max: ${maxRetries})`);

    const failedEvents = await this.eventLogService.getFailedEvents(maxRetries);

    let retriedCount = 0;

    for (const eventLog of failedEvents) {
      try {
        await this.eventLogService.markForRetry(eventLog.eventId);

        // Reconstruct event from payload
        const event = eventLog.payload as unknown as ServiceCatalogEvent;

        const result = await this.processEvent(event);

        // Only count successful retries
        if (result.success) {
          retriedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to retry event ${eventLog.eventId}:`,
          error,
        );
      }
    }

    this.logger.log(`✅ Retried ${retriedCount} events`);

    return retriedCount;
  }
}

/**
 * Service Catalog Event interface
 */
export interface ServiceCatalogEvent {
  eventId?: string;
  eventType: 'service.created' | 'service.updated' | 'service.deprecated';
  eventTimestamp?: string;
  source?: string;
  version?: string;
  data: {
    externalServiceCode: string;
    countryCode: string;
    businessUnit: string;
    type: string;
    category: string;
    name: any; // Can be string or i18n object
    description?: any;
    scopeIncluded: string[];
    scopeExcluded: string[];
    worksiteRequirements: string[];
    productPrerequisites: string[];
    contractType?: string;
    estimatedDuration: number;
    complexity?: string;
    requiresTechnicalVisit?: boolean;
    effectiveFrom?: string;
    effectiveTo?: string;
    reason?: string; // For deprecation
  };
}

/**
 * Processing result interface
 */
export interface ProcessingResult {
  success: boolean;
  eventId: string;
  action: string;
  serviceId?: string;
  serviceFsmCode?: string;
  reason?: string;
}

/**
 * Batch processing result interface
 */
export interface BatchProcessingResult {
  total: number;
  successful: number;
  failed: number;
  results: ProcessingResult[];
}
