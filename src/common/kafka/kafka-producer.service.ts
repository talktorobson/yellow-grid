import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';

/**
 * Kafka Producer Service
 *
 * Provides a reusable Kafka producer for publishing events across the application.
 *
 * Features:
 * - Automatic connection management
 * - Graceful shutdown
 * - Error handling and retry logic
 * - Correlation ID support
 * - Can be disabled for testing (KAFKA_ENABLED=false)
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'yellow-grid-fsm',
      brokers: this.parseBrokers(),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: this.parseSaslConfig(),
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });

    // Initialize producer
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
      idempotent: true, // Prevent duplicate events
    });
  }

  /**
   * Module initialization - connect to Kafka
   */
  async onModuleInit() {
    // Skip Kafka connection if disabled (for testing)
    if (process.env.KAFKA_ENABLED === 'false') {
      this.logger.warn('⚠️  Kafka producer disabled (KAFKA_ENABLED=false)');
      return;
    }

    try {
      this.logger.log('🔌 Connecting Kafka producer...');
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('✅ Kafka producer connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect Kafka producer', error);
      // Don't throw - allow application to start even if Kafka is unavailable
    }
  }

  /**
   * Module destruction - disconnect from Kafka
   */
  async onModuleDestroy() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Send a single message to a Kafka topic
   *
   * @param topic - Kafka topic name
   * @param message - Message to send
   * @param key - Optional message key for partitioning
   * @param headers - Optional message headers
   * @returns Promise<RecordMetadata[]> - Metadata about the sent message
   */
  async send(
    topic: string,
    message: any,
    key?: string,
    headers?: Record<string, string>,
  ): Promise<RecordMetadata[] | null> {
    if (!this.isConnected) {
      this.logger.warn(
        `⚠️  Kafka producer not connected, skipping message to topic: ${topic}`,
      );
      return null;
    }

    try {
      const kafkaMessage = {
        key: key || undefined,
        value: JSON.stringify(message),
        headers: this.serializeHeaders(headers),
      };

      const result = await this.producer.send({
        topic,
        messages: [kafkaMessage],
      });

      this.logger.debug(
        `📤 Sent message to topic: ${topic} | Key: ${key || 'none'} | Partition: ${result[0]?.partition}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Send multiple messages to a Kafka topic
   *
   * @param topic - Kafka topic name
   * @param messages - Array of messages to send
   * @returns Promise<RecordMetadata[]> - Metadata about the sent messages
   */
  async sendBatch(
    topic: string,
    messages: Array<{
      value: any;
      key?: string;
      headers?: Record<string, string>;
    }>,
  ): Promise<RecordMetadata[] | null> {
    if (!this.isConnected) {
      this.logger.warn(
        `⚠️  Kafka producer not connected, skipping batch to topic: ${topic}`,
      );
      return null;
    }

    try {
      const kafkaMessages = messages.map((msg) => ({
        key: msg.key || undefined,
        value: JSON.stringify(msg.value),
        headers: this.serializeHeaders(msg.headers),
      }));

      const result = await this.producer.send({
        topic,
        messages: kafkaMessages,
      });

      this.logger.debug(
        `📤 Sent ${messages.length} messages to topic: ${topic}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ Failed to send batch to topic ${topic}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send a domain event with standardized structure
   *
   * @param eventName - Event name (e.g., 'projects.tv_outcome.recorded')
   * @param eventData - Event data payload
   * @param correlationId - Optional correlation ID for tracing
   * @returns Promise<RecordMetadata[]> - Metadata about the sent event
   */
  async sendEvent(
    eventName: string,
    eventData: any,
    correlationId?: string,
  ): Promise<RecordMetadata[] | null> {
    const [domain, entity] = eventName.split('.');
    const topic = this.getTopicName(domain);

    const event = {
      event_id: this.generateEventId(),
      event_name: eventName,
      event_timestamp: Date.now(),
      correlation_id: correlationId,
      ...eventData,
    };

    const headers: Record<string, string> = {
      'event-name': eventName,
      'event-version': '1.0',
    };

    if (correlationId) {
      headers['correlation-id'] = correlationId;
    }

    return this.send(topic, event, event.event_id, headers);
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
      this.logger.warn(
        '⚠️  KAFKA_SASL_MECHANISM set but credentials missing',
      );
      return undefined;
    }

    return {
      mechanism: mechanism as any,
      username,
      password,
    };
  }

  /**
   * Serialize headers to Buffer format required by KafkaJS
   */
  private serializeHeaders(
    headers?: Record<string, string>,
  ): Record<string, Buffer> | undefined {
    if (!headers) {
      return undefined;
    }

    const serialized: Record<string, Buffer> = {};
    for (const [key, value] of Object.entries(headers)) {
      serialized[key] = Buffer.from(value);
    }
    return serialized;
  }

  /**
   * Get topic name from domain
   */
  private getTopicName(domain: string): string {
    // Map domain to topic name based on naming convention
    const topicMap: Record<string, string> = {
      projects: process.env.KAFKA_PROJECTS_TOPIC || 'fsm.projects',
      assignments: process.env.KAFKA_ASSIGNMENTS_TOPIC || 'fsm.assignments',
      scheduling: process.env.KAFKA_SCHEDULING_TOPIC || 'fsm.scheduling',
      execution: process.env.KAFKA_EXECUTION_TOPIC || 'fsm.execution',
      contracts: process.env.KAFKA_CONTRACTS_TOPIC || 'fsm.contracts',
    };

    return topicMap[domain] || `fsm.${domain}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get producer connection status
   */
  isProducerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get producer status (for health checks)
   */
  getStatus(): { connected: boolean; brokers: string[] } {
    return {
      connected: this.isConnected,
      brokers: this.parseBrokers(),
    };
  }
}
