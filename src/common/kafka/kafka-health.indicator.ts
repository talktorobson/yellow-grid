import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';

/**
 * Kafka Health Indicator
 *
 * Provides health check functionality for Kafka producer and consumer.
 * Used by NestJS Terminus health checks.
 */
@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  constructor(
    private readonly producerService: KafkaProducerService,
    private readonly consumerService: KafkaConsumerService,
  ) {
    super();
  }

  /**
   * Check Kafka producer health
   */
  async isProducerHealthy(key: string = 'kafka_producer'): Promise<HealthIndicatorResult> {
    const status = this.producerService.getStatus();
    const isHealthy = status.connected;

    const result = this.getStatus(key, isHealthy, {
      connected: status.connected,
      brokers: status.brokers,
    });

    if (!isHealthy) {
      throw new HealthCheckError('Kafka producer health check failed', result);
    }

    return result;
  }

  /**
   * Check Kafka consumer health
   */
  async isConsumerHealthy(key: string = 'kafka_consumer'): Promise<HealthIndicatorResult> {
    const status = this.consumerService.getStatus();
    const isHealthy = status.enabled;

    const result = this.getStatus(key, isHealthy, {
      enabled: status.enabled,
      totalConsumers: status.totalConsumers,
      consumerGroups: status.consumerGroups,
    });

    if (!isHealthy && status.enabled) {
      // Only throw error if consumers are enabled but unhealthy
      throw new HealthCheckError('Kafka consumer health check failed', result);
    }

    return result;
  }

  /**
   * Check overall Kafka health (both producer and consumer)
   */
  async isHealthy(key: string = 'kafka'): Promise<HealthIndicatorResult> {
    const producerStatus = this.producerService.getStatus();
    const consumerStatus = this.consumerService.getStatus();

    const isHealthy = producerStatus.connected && consumerStatus.enabled;

    const result = this.getStatus(key, isHealthy, {
      producer: {
        connected: producerStatus.connected,
        brokers: producerStatus.brokers,
      },
      consumer: {
        enabled: consumerStatus.enabled,
        totalConsumers: consumerStatus.totalConsumers,
        consumerGroups: consumerStatus.consumerGroups,
      },
    });

    if (!isHealthy) {
      throw new HealthCheckError('Kafka health check failed', result);
    }

    return result;
  }
}
