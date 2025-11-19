import { Module, Global } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { EventHandlerRegistry } from './event-handler.registry';
import { KafkaHealthIndicator } from './kafka-health.indicator';

/**
 * Global Kafka Module
 *
 * Provides Kafka producer and consumer functionality throughout the application.
 * Marked as @Global() so it doesn't need to be imported in every module.
 *
 * Features:
 * - KafkaProducerService: Send events to Kafka topics
 * - KafkaConsumerService: Subscribe to Kafka topics
 * - EventHandlerRegistry: Auto-discover and register @EventHandler decorated methods
 * - KafkaHealthIndicator: Health checks for Kafka components
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    EventHandlerRegistry,
    KafkaHealthIndicator,
  ],
  exports: [KafkaProducerService, KafkaConsumerService, KafkaHealthIndicator],
})
export class KafkaModule {}
