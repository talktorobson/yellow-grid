import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ServiceCatalogService } from './service-catalog.service';
import { PricingService } from './pricing.service';
import { GeographicService } from './geographic.service';
import { ProviderSpecialtyService } from './provider-specialty.service';
import { ServiceCatalogController } from './service-catalog.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceCatalogController],
  providers: [
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,
  ],
  exports: [
    ServiceCatalogService,
    PricingService,
    GeographicService,
    ProviderSpecialtyService,
  ],
})
export class ServiceCatalogModule {}
