import { Module, Global } from '@nestjs/common';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * Global Kafka Module
 *
 * Provides Kafka producer functionality throughout the application.
 * Marked as @Global() so it doesn't need to be imported in every module.
 */
@Global()
@Module({
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
