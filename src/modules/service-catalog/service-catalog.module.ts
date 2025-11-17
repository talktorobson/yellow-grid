import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ServiceCatalogService } from './service-catalog.service';
import { PricingService } from './pricing.service';
import { GeographicService } from './geographic.service';
import { ProviderSpecialtyService } from './provider-specialty.service';
import { ServiceCatalogEventLogService } from './event-log.service';
import { ServiceCatalogSyncService } from './sync.service';
import { ServiceCatalogEventProcessor } from './event-processor.service';
import { ServiceCatalogController } from './service-catalog.controller';
import { EventSyncController } from './event-sync.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCatalogController, EventSyncController],
  providers: [
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,
    ServiceCatalogEventLogService,
    ServiceCatalogSyncService,
    ServiceCatalogEventProcessor,
  ],
  exports: [
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,
    ServiceCatalogEventLogService,
    ServiceCatalogSyncService,
    ServiceCatalogEventProcessor,
  ],
})
export class ServiceCatalogModule {}
