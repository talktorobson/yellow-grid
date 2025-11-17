import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ServiceCatalogService } from './service-catalog.service';
import { PricingService } from './pricing.service';
import { GeographicService } from './geographic.service';
import { ProviderSpecialtyService } from './provider-specialty.service';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCatalogSyncService } from './services/service-catalog-sync.service';
import { ServiceCatalogEventLogService } from './services/service-catalog-event-log.service';
import { ServiceCatalogEventConsumer } from './consumers/service-catalog.consumer';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCatalogController],
  providers: [
    // Core services
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,

    // Sync and event handling services
    ServiceCatalogSyncService,
    ServiceCatalogEventLogService,

    // Kafka consumer
    ServiceCatalogEventConsumer,
  ],
  exports: [
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,
    ServiceCatalogSyncService,
    ServiceCatalogEventLogService,
  ],
})
export class ServiceCatalogModule {}
