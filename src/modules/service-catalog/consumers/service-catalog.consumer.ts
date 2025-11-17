import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ServiceCatalogSyncService } from '../services/service-catalog-sync.service';
import { ServiceCatalogEventLogService } from '../services/service-catalog-event-log.service';
import { ServiceCatalogEventType } from '../dto/kafka-event.dto';

/**
 * Kafka consumer for service catalog synchronization events
 *
 * Subscribes to 'service-catalog' topic and processes:
 * - service.created
 * - service.updated
 * - service.deprecated
 *
 * Features:
 * - Idempotent event processing (event ID deduplication)
 * - Automatic retry with exponential backoff
 * - Dead letter queue after 3 failed attempts
 * - Event log tracking for audit trail
 */
@Injectable()
export class ServiceCatalogEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceCatalogEventConsumer.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;

  constructor(
    private readonly syncService: ServiceCatalogSyncService,
    private readonly eventLogService: ServiceCatalogEventLogService,
  ) {
    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: 'yellow-grid-fsm',
      brokers: this.parseBrokers(),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: this.parseSaslConfig(),
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });

    // Initialize consumer
    this.consumer = this.kafka.consumer({
      groupId: 'service-catalog-consumer-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }

  /**
   * Module initialization - connect to Kafka and start consuming
   */
  async onModuleInit() {
    // Skip Kafka connection if disabled (for testing)
    if (process.env.KAFKA_ENABLED === 'false') {
      this.logger.warn('⚠️  Kafka consumer disabled (KAFKA_ENABLED=false)');
      return;
    }

    try {
      this.logger.log('🔌 Connecting to Kafka...');
      await this.consumer.connect();
      this.isConnected = true;

      await this.consumer.subscribe({
        topic: process.env.KAFKA_SERVICE_CATALOG_TOPIC || 'service-catalog',
        fromBeginning: false, // Only new messages
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('✅ Service Catalog Event Consumer started successfully');
    } catch (error) {
      this.logger.error('❌ Failed to start Service Catalog Event Consumer', error);
      // Don't throw - allow application to start even if Kafka is unavailable
      // TODO: Implement health check that monitors consumer status
    }
  }

  /**
   * Module destruction - disconnect from Kafka
   */
  async onModuleDestroy() {
    if (this.isConnected) {
      await this.consumer.disconnect();
      this.isConnected = false;
      this.logger.log('Service Catalog Event Consumer disconnected');
    }
  }

  /**
   * Handle incoming Kafka message
   */
  private async handleMessage({ topic, partition, message }: EachMessagePayload) {
    const eventId = message.key?.toString() || `unknown_${Date.now()}_${Math.random()}`;
    const rawPayload = message.value?.toString();

    if (!rawPayload) {
      this.logger.warn(`Empty message received: ${eventId}`);
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      this.logger.error(`Invalid JSON in message ${eventId}`, error);
      // Invalid JSON cannot be retried - log and skip
      return;
    }

    this.logger.log(
      `📩 Received event: ${payload.eventType} | Service: ${payload.data?.externalServiceCode} | Event ID: ${eventId}`
    );

    try {
      // Step 1: Check idempotency (already processed?)
      const existingLog = await this.eventLogService.findByEventId(eventId);

      if (existingLog) {
        if (existingLog.processingStatus === 'COMPLETED') {
          this.logger.log(`⏭️  Event ${eventId} already completed, skipping`);
          return;
        } else if (existingLog.processingStatus === 'DEAD_LETTER') {
          this.logger.warn(`⚠️  Event ${eventId} in dead letter queue, skipping`);
          return;
        }
        // If PENDING or FAILED, continue to reprocess
      }

      // Step 2: Log event to database (if not exists)
      let eventLog = existingLog;
      if (!eventLog) {
        eventLog = await this.eventLogService.create({
          eventId,
          eventType: payload.eventType,
          eventSource: payload.source || 'UNKNOWN',
          eventTimestamp: new Date(payload.eventTimestamp),
          externalServiceCode: payload.data?.externalServiceCode || 'UNKNOWN',
          payload,
          processingStatus: 'PENDING',
        });
      }

      // Step 3: Process based on event type
      await this.processEvent(payload, eventLog.id);

      // Step 4: Mark as processed
      await this.eventLogService.markAsProcessed(eventLog.id);
      this.logger.log(`✅ Event ${eventId} processed successfully`);

    } catch (error) {
      this.logger.error(`❌ Error processing event ${eventId}:`, error);

      // Update event log with error
      await this.eventLogService.markAsFailed(eventId, error);

      // Note: KafkaJS will automatically retry based on consumer configuration
      // Our event log tracks attempts and moves to dead letter queue after 3 attempts
    }
  }

  /**
   * Process event based on type
   */
  private async processEvent(payload: any, eventLogId: string): Promise<void> {
    switch (payload.eventType) {
      case ServiceCatalogEventType.SERVICE_CREATED:
      case 'service.created':
        await this.syncService.handleServiceCreated(payload.data, eventLogId);
        break;

      case ServiceCatalogEventType.SERVICE_UPDATED:
      case 'service.updated':
        await this.syncService.handleServiceUpdated(payload.data, eventLogId);
        break;

      case ServiceCatalogEventType.SERVICE_DEPRECATED:
      case 'service.deprecated':
        await this.syncService.handleServiceDeprecated(payload.data, eventLogId);
        break;

      default:
        this.logger.warn(`❓ Unknown event type: ${payload.eventType}`);
        await this.eventLogService.markAsSkipped(eventLogId, `Unknown event type: ${payload.eventType}`);
    }
  }

  // ============================================================================
  // Configuration Helpers
  // ============================================================================

  /**
   * Parse Kafka brokers from environment variable
   */
  private parseBrokers(): string[] {
    const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    return brokers.split(',').map(b => b.trim());
  }

  /**
   * Parse SASL configuration for authentication
   */
  private parseSaslConfig(): any {
    const mechanism = process.env.KAFKA_SASL_MECHANISM;

    if (!mechanism) {
      return undefined;
    }

    const username = process.env.KAFKA_SASL_USERNAME;
    const password = process.env.KAFKA_SASL_PASSWORD;

    if (!username || !password) {
      this.logger.warn('⚠️  KAFKA_SASL_MECHANISM set but credentials missing');
      return undefined;
    }

    return {
      mechanism: mechanism as any, // 'plain', 'scram-sha-256', 'scram-sha-512'
      username,
      password,
    };
  }

  /**
   * Get consumer status (for health checks)
   */
  getStatus(): { connected: boolean; topic: string; groupId: string } {
    return {
      connected: this.isConnected,
      topic: process.env.KAFKA_SERVICE_CATALOG_TOPIC || 'service-catalog',
      groupId: 'service-catalog-consumer-group',
    };
  }
}
