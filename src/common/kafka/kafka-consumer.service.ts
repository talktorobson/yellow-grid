import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload, ConsumerConfig, KafkaMessage } from 'kafkajs';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * Handler function type for processing Kafka messages
 */
export type MessageHandler = (payload: {
  topic: string;
  partition: number;
  message: KafkaMessage;
  data: any;
  headers: Record<string, string>;
}) => Promise<void>;

/**
 * Consumer subscription configuration
 */
export interface ConsumerSubscription {
  topics: string[];
  groupId: string;
  handler: MessageHandler;
  fromBeginning?: boolean;
  autoCommit?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;
}

/**
 * Kafka Consumer Service
 *
 * Provides a reusable Kafka consumer for subscribing to events across the application.
 *
 * Features:
 * - Multiple consumer group management
 * - Automatic connection management
 * - Graceful shutdown
 * - Error handling with retry logic
 * - Dead Letter Queue (DLQ) support
 * - Correlation ID tracking
 * - Can be disabled for testing (KAFKA_ENABLED=false)
 */
@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();
  private isEnabled: boolean;

  constructor(private readonly producerService: KafkaProducerService) {
    this.isEnabled = process.env.KAFKA_ENABLED !== 'false';

    if (!this.isEnabled) {
      this.logger.warn('⚠️  Kafka consumer disabled (KAFKA_ENABLED=false)');
      return;
    }

    // Initialize Kafka client (shared configuration with producer)
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'yellow-grid-fsm',
      brokers: this.parseBrokers(),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: this.parseSaslConfig(),
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });
  }

  /**
   * Module initialization - start all consumers
   */
  async onModuleInit() {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('🔌 Kafka consumer service initialized');
  }

  /**
   * Module destruction - disconnect all consumers
   */
  async onModuleDestroy() {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('🔌 Disconnecting all Kafka consumers...');
    await this.disconnectAll();
    this.logger.log('✅ All Kafka consumers disconnected');
  }

  /**
   * Subscribe to Kafka topics with a message handler
   *
   * @param config - Consumer subscription configuration
   * @returns Promise<void>
   */
  async subscribe(config: ConsumerSubscription): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn(
        `⚠️  Kafka consumer disabled, skipping subscription to: ${config.topics.join(', ')}`,
      );
      return;
    }

    const { groupId, topics, handler, fromBeginning = false, autoCommit = true } = config;

    // Check if consumer already exists
    if (this.consumers.has(groupId)) {
      this.logger.warn(`⚠️  Consumer group "${groupId}" already exists, skipping subscription`);
      return;
    }

    try {
      // Create consumer
      const consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: config.sessionTimeout || 30000,
        heartbeatInterval: config.heartbeatInterval || 3000,
        maxBytesPerPartition: 1048576, // 1 MB
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
        allowAutoTopicCreation: false,
      });

      // Connect consumer
      this.logger.log(`🔌 Connecting consumer group: ${groupId}...`);
      await consumer.connect();
      this.logger.log(`✅ Consumer group "${groupId}" connected`);

      // Subscribe to topics
      await consumer.subscribe({
        topics,
        fromBeginning,
      });

      this.logger.log(`📥 Consumer group "${groupId}" subscribed to: ${topics.join(', ')}`);

      // Start consuming messages
      await consumer.run({
        autoCommit,
        autoCommitInterval: 5000,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload, handler, groupId);
        },
      });

      // Store consumer reference
      this.consumers.set(groupId, consumer);

      this.logger.log(`✅ Consumer group "${groupId}" started successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to start consumer group "${groupId}":`, error);
      throw error;
    }
  }

  /**
   * Handle a single Kafka message
   *
   * @param payload - Kafka message payload
   * @param handler - Message handler function
   * @param groupId - Consumer group ID
   */
  private async handleMessage(
    payload: EachMessagePayload,
    handler: MessageHandler,
    groupId: string,
  ): Promise<void> {
    const { topic, partition, message } = payload;

    const startTime = Date.now();
    const offset = message.offset;
    const key = message.key?.toString();
    const correlationId = this.extractHeader(message, 'correlation-id');

    try {
      // Parse message value
      const data = this.parseMessageValue(message.value);

      // Extract headers
      const headers = this.extractHeaders(message);

      this.logger.debug(
        `📥 [${groupId}] Processing message from ${topic}[${partition}] @ offset ${offset} | key: ${key || 'none'} | correlation-id: ${correlationId || 'none'}`,
      );

      // Call handler
      await handler({
        topic,
        partition,
        message,
        data,
        headers,
      });

      const duration = Date.now() - startTime;
      this.logger.debug(
        `✅ [${groupId}] Processed message from ${topic}[${partition}] @ offset ${offset} in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ [${groupId}] Failed to process message from ${topic}[${partition}] @ offset ${offset} after ${duration}ms:`,
        error,
      );

      // Send to DLQ
      await this.sendToDLQ({
        topic,
        partition,
        offset,
        key,
        message,
        error,
        groupId,
        correlationId,
      });

      // Don't throw - allows consumer to continue processing other messages
      // If we want to stop on error, we can throw here
    }
  }

  /**
   * Send failed message to Dead Letter Queue
   *
   * @param params - DLQ parameters
   */
  private async sendToDLQ(params: {
    topic: string;
    partition: number;
    offset: string;
    key: string | undefined;
    message: KafkaMessage;
    error: any;
    groupId: string;
    correlationId: string | undefined;
  }): Promise<void> {
    const { topic, partition, offset, key, message, error, groupId, correlationId } = params;

    try {
      const dlqTopic = process.env.KAFKA_DLQ_TOPIC || 'dlq.processing_errors';

      const dlqMessage = {
        original_topic: topic,
        original_partition: partition,
        original_offset: offset,
        original_key: key,
        original_timestamp: message.timestamp,
        consumer_group: groupId,
        error_message: error?.message || 'Unknown error',
        error_stack: error?.stack,
        error_timestamp: Date.now(),
        correlation_id: correlationId,
        message_value: message.value?.toString(),
        message_headers: this.extractHeaders(message),
      };

      await this.producerService.send(
        dlqTopic,
        dlqMessage,
        `${topic}:${partition}:${offset}`,
        {
          'original-topic': topic,
          'original-partition': partition.toString(),
          'original-offset': offset,
          'error-timestamp': Date.now().toString(),
          ...(correlationId && { 'correlation-id': correlationId }),
        },
      );

      this.logger.warn(
        `📨 Sent message to DLQ: ${dlqTopic} | original: ${topic}[${partition}]@${offset}`,
      );
    } catch (dlqError) {
      this.logger.error('❌ Failed to send message to DLQ:', dlqError);
      // We can't do much more here - log and continue
    }
  }

  /**
   * Disconnect a specific consumer group
   *
   * @param groupId - Consumer group ID to disconnect
   */
  async disconnect(groupId: string): Promise<void> {
    const consumer = this.consumers.get(groupId);

    if (!consumer) {
      this.logger.warn(`⚠️  Consumer group "${groupId}" not found`);
      return;
    }

    try {
      await consumer.disconnect();
      this.consumers.delete(groupId);
      this.logger.log(`✅ Consumer group "${groupId}" disconnected`);
    } catch (error) {
      this.logger.error(`❌ Failed to disconnect consumer group "${groupId}":`, error);
      throw error;
    }
  }

  /**
   * Disconnect all consumer groups
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.consumers.entries()).map(
      async ([groupId, consumer]) => {
        try {
          await consumer.disconnect();
          this.logger.log(`✅ Consumer group "${groupId}" disconnected`);
        } catch (error) {
          this.logger.error(`❌ Failed to disconnect consumer group "${groupId}":`, error);
        }
      },
    );

    await Promise.all(disconnectPromises);
    this.consumers.clear();
  }

  /**
   * Get consumer status (for health checks)
   */
  getStatus(): {
    enabled: boolean;
    consumerGroups: string[];
    totalConsumers: number;
  } {
    return {
      enabled: this.isEnabled,
      consumerGroups: Array.from(this.consumers.keys()),
      totalConsumers: this.consumers.size,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Parse Kafka brokers from environment variable
   */
  private parseBrokers(): string[] {
    const brokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    return brokers.split(',').map((b) => b.trim());
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
      mechanism: mechanism as any,
      username,
      password,
    };
  }

  /**
   * Parse message value (handles JSON and string)
   */
  private parseMessageValue(value: Buffer | null | undefined): any {
    if (!value) {
      return null;
    }

    const stringValue = value.toString();

    try {
      return JSON.parse(stringValue);
    } catch {
      // If not JSON, return as string
      return stringValue;
    }
  }

  /**
   * Extract all headers from Kafka message
   */
  private extractHeaders(message: KafkaMessage): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!message.headers) {
      return headers;
    }

    for (const [key, value] of Object.entries(message.headers)) {
      if (value) {
        headers[key] = value.toString();
      }
    }

    return headers;
  }

  /**
   * Extract a specific header from Kafka message
   */
  private extractHeader(message: KafkaMessage, headerKey: string): string | undefined {
    if (!message.headers || !message.headers[headerKey]) {
      return undefined;
    }

    const value = message.headers[headerKey];
    return value ? value.toString() : undefined;
  }
}
