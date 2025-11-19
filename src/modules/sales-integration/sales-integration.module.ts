import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Common modules
import { KafkaModule } from '../../common/kafka/kafka.module';
import { RedisModule } from '../../common/redis/redis.module';

// Services
import {
  OrderIntakeService,
  EventMappingService,
  OrderMappingService,
  SlotAvailabilityService,
  InstallationOutcomeWebhookService,
  PreEstimationService,
} from './services';

// Controllers
import { SalesIntegrationController } from './controllers/sales-integration.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    KafkaModule,
    RedisModule,
  ],
  controllers: [SalesIntegrationController],
  providers: [
    OrderIntakeService,
    EventMappingService,
    OrderMappingService,
    SlotAvailabilityService,
    InstallationOutcomeWebhookService,
    PreEstimationService,
  ],
  exports: [
    OrderIntakeService,
    EventMappingService,
    OrderMappingService,
    SlotAvailabilityService,
    InstallationOutcomeWebhookService,
    PreEstimationService,
  ],
})
export class SalesIntegrationModule {}
