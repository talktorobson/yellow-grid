import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SyncService } from './sync.service';
import { ServiceEventPayload } from './dto/service-event.dto';

/**
 * Kafka Event Consumer for Service Catalog
 *
 * Subscribes to service-catalog topic and processes events in real-time.
 * Implements idempotency using service_catalog_event_log table.
 *
 * NOTE: This is a simplified implementation. In production, you would use
 * a proper Kafka client library like @nestjs/microservices with KafkaJS.
 */
@Injectable()
export class ServiceCatalogEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(ServiceCatalogEventConsumer.name);
  private isEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: SyncService,
  ) {
    // Check if sync is enabled via environment variable
    this.isEnabled =
      process.env.SERVICE_CATALOG_SYNC_ENABLED === 'true' || false;
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn(
        'Service catalog sync is DISABLED (set SERVICE_CATALOG_SYNC_ENABLED=true to enable)',
      );
      return;
    }

    this.logger.log('Service catalog event consumer initialized');

    // In production, this would connect to Kafka:
    // await this.connectToKafka();
    // await this.subscribeToTopic('service-catalog');
    // await this.startConsumer();
  }

  /**
   * Handle incoming Kafka message
   * This method would be called by the Kafka consumer for each message
   *
   * @param message - Kafka message
   */
  async handleMessage(message: {
    key: Buffer | null;
    value: Buffer | null;
    timestamp: string;
    partition: number;
    offset: string;
  }): Promise<void> {
    try {
      // Extract event ID from message key
      const eventId = message.key?.toString() || `evt_${Date.now()}`;

      // Parse message payload
      const payload: ServiceEventPayload = JSON.parse(
        message.value?.toString() || '{}',
      );

      this.logger.log(
        `Received event ${eventId}: ${payload.eventType} for ${payload.data.externalServiceCode}`,
      );

      // Step 1: Check idempotency (has this event been processed before?)
      const existingLog = await this.prisma.serviceCatalogEventLog.findUnique({
        where: { eventId },
      });

      if (existingLog) {
        if (existingLog.processingStatus === 'COMPLETED') {
          this.logger.warn(
            `Event ${eventId} already processed successfully, skipping`,
          );
          return;
        }

        if (existingLog.processingStatus === 'PROCESSING') {
          this.logger.warn(
            `Event ${eventId} is currently being processed, skipping duplicate`,
          );
          return;
        }

        // If FAILED or DEAD_LETTER, allow retry
        this.logger.log(`Event ${eventId} previously failed, retrying`);
      }

      // Step 2: Log event to database (for idempotency tracking)
      const eventLog = existingLog || await this.prisma.serviceCatalogEventLog.create({
        data: {
          eventId,
          eventType: payload.eventType,
          externalSource: payload.source,
          externalServiceCode: payload.data.externalServiceCode,
          processingStatus: 'PENDING',
          payload: payload as any,
          receivedAt: new Date(payload.timestamp),
        },
      });

      // Step 3: Mark as processing
      await this.prisma.serviceCatalogEventLog.update({
        where: { id: eventLog.id },
        data: { processingStatus: 'PROCESSING' },
      });

      // Step 4: Process event based on type
      const startTime = Date.now();

      switch (payload.eventType) {
        case 'service.created':
          await this.syncService.handleServiceCreated(payload, eventLog.id);
          break;

        case 'service.updated':
          await this.syncService.handleServiceUpdated(payload, eventLog.id);
          break;

        case 'service.deprecated':
          await this.syncService.handleServiceDeprecated(payload, eventLog.id);
          break;

        default:
          throw new Error(`Unknown event type: ${payload.eventType}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Event ${eventId} processed successfully in ${processingTime}ms`,
      );

      // Step 5: Event log status is updated by SyncService methods
      // No need to update here
    } catch (error) {
      this.logger.error(
        `Failed to process Kafka message: ${error.message}`,
        error.stack,
      );
      throw error; // Let Kafka consumer handle retry
    }
  }

  /**
   * Simulate receiving a Kafka event (for testing without Kafka)
   * This method can be called via an admin API endpoint for testing
   *
   * @param payload - Service event payload
   */
  async simulateEvent(payload: ServiceEventPayload): Promise<void> {
    this.logger.log(`Simulating event: ${payload.eventType} (source: ${payload.source})`);

    const message = {
      key: Buffer.from(payload.eventId),
      value: Buffer.from(JSON.stringify(payload)),
      timestamp: payload.timestamp,
      partition: 0,
      offset: '0',
    };

    await this.handleMessage(message);
  }

  /**
   * Production Kafka connection (example implementation)
   * Uncomment and implement when Kafka is available
   */
  /*
  private async connectToKafka() {
    const { Kafka } = require('kafkajs');

    const kafka = new Kafka({
      clientId: 'yellow-grid-fsm',
      brokers: process.env.KAFKA_BROKERS?.split(',') || [],
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL_MECHANISM
        ? {
            mechanism: process.env.KAFKA_SASL_MECHANISM,
            username: process.env.KAFKA_SASL_USERNAME || '',
            password: process.env.KAFKA_SASL_PASSWORD || '',
          }
        : undefined,
    });

    this.consumer = kafka.consumer({
      groupId: 'service-catalog-sync',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    await this.consumer.connect();
    this.logger.log('Connected to Kafka');
  }

  private async subscribeToTopic(topic: string) {
    await this.consumer.subscribe({
      topic,
      fromBeginning: false, // Only process new messages
    });
    this.logger.log(`Subscribed to topic: ${topic}`);
  }

  private async startConsumer() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.handleMessage(message);
      },
    });
    this.logger.log('Kafka consumer started');
  }
  */

  /**
   * Get consumer health status
   */
  getHealthStatus() {
    return {
      enabled: this.isEnabled,
      status: this.isEnabled ? 'running' : 'disabled',
      // In production, add Kafka connection status
    };
  }
}
