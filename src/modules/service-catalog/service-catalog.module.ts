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

// Sync services
import { SyncService } from './sync/sync.service';
import { ServiceCatalogEventConsumer } from './sync/service-catalog-event.consumer';
import { ReconciliationService } from './sync/reconciliation.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCatalogController, EventSyncController],
  providers: [
    // Core services
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,

    // Sync services (Phase 3)
    SyncService,
    ServiceCatalogEventConsumer,
    ReconciliationService,
    ServiceCatalogEventLogService,
    ServiceCatalogSyncService,
    ServiceCatalogEventProcessor,
  ],
  exports: [
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,
    SyncService,
    ServiceCatalogEventConsumer,
    ReconciliationService,
    ServiceCatalogEventLogService,
    ServiceCatalogSyncService,
    ServiceCatalogEventProcessor,
  ],
})
export class ServiceCatalogModule {}
