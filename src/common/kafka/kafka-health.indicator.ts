import { Injectable } from '@nestjs/common';
// import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';

/**
 * Kafka Health Indicator
 *
 * Provides health check functionality for Kafka producer and consumer.
 * Used by NestJS Terminus health checks.
 */
@Injectable()
export class KafkaHealthIndicator {
  constructor(
    private readonly producerService: KafkaProducerService,
    private readonly consumerService: KafkaConsumerService,
  ) {}

  /**
   * Check Kafka producer health
   */
  async isProducerHealthy(key: string = 'kafka_producer'): Promise<any> {
    const status = this.producerService.getStatus();
    const isHealthy = status.connected;

    const result = {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        connected: status.connected,
        brokers: status.brokers,
      },
    };

    if (!isHealthy) {
      throw new Error('Kafka producer health check failed');
    }

    return result;
  }

  /**
   * Check Kafka consumer health
   */
  async isConsumerHealthy(key: string = 'kafka_consumer'): Promise<any> {
    const status = this.consumerService.getStatus();
    const isHealthy = status.enabled;

    const result = {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        enabled: status.enabled,
        totalConsumers: status.totalConsumers,
        consumerGroups: status.consumerGroups,
      },
    };

    return result;
  }

  /**
   * Check overall Kafka health (both producer and consumer)
   */
  async isHealthy(key: string = 'kafka'): Promise<any> {
    const producerStatus = this.producerService.getStatus();
    const consumerStatus = this.consumerService.getStatus();

    const isHealthy = producerStatus.connected && consumerStatus.enabled;

    const result = {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        producer: {
          connected: producerStatus.connected,
          brokers: producerStatus.brokers,
        },
        consumer: {
          enabled: consumerStatus.enabled,
          totalConsumers: consumerStatus.totalConsumers,
          consumerGroups: consumerStatus.consumerGroups,
        },
      },
    };

    if (!isHealthy) {
      throw new Error('Kafka health check failed');
    }

    return result;
  }
}
