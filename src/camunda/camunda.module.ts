import { Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CamundaService } from './camunda.service';
import { CamundaConfig } from './camunda.config';
import { OperateService } from './operate/operate.service';

// Workers
import { FindProvidersWorker } from './workers/assignment/find-providers.worker';
import { RankProvidersWorker } from './workers/assignment/rank-providers.worker';
import { SendOfferWorker } from './workers/assignment/send-offer.worker';
import { CheckAvailabilityWorker } from './workers/booking/check-availability.worker';
import { ReserveSlotWorker } from './workers/booking/reserve-slot.worker';
import { GoCheckWorker } from './workers/execution/go-check.worker';
import { SendNotificationWorker } from './workers/notification/send-notification.worker';

// Existing services for worker dependencies
import { ProvidersModule } from '../modules/providers/providers.module';
import { ServiceOrdersModule } from '../modules/service-orders/service-orders.module';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [ConfigModule, ProvidersModule, ServiceOrdersModule, PrismaModule],
  providers: [
    CamundaConfig,
    CamundaService,
    OperateService,
    // Workers
    FindProvidersWorker,
    RankProvidersWorker,
    SendOfferWorker,
    CheckAvailabilityWorker,
    ReserveSlotWorker,
    GoCheckWorker,
    SendNotificationWorker,
  ],
  exports: [CamundaService, OperateService],
})
export class CamundaModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CamundaModule.name);

  constructor(
    private readonly camundaService: CamundaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const enabledValue = this.configService.get<string>('CAMUNDA_ENABLED', 'false');
    const enabled = enabledValue === 'true' || enabledValue === '1';

    if (!enabled) {
      this.logger.warn('Camunda integration is disabled. Set CAMUNDA_ENABLED=true to enable.');
      return;
    }

    const zeebeAddress =
      this.configService.get<string>('ZEEBE_GATEWAY_ADDRESS') ||
      this.configService.get<string>('ZEEBE_ADDRESS', 'localhost:26500');
    this.logger.log(`Initializing Camunda 8 integration (Zeebe: ${zeebeAddress})...`);

    try {
      await this.camundaService.initialize();
      this.logger.log('✅ Camunda 8 integration initialized successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Camunda 8: ${error.message}`);
      // Don't throw - allow app to start without Camunda if it fails
    }
  }

  async onModuleDestroy() {
    await this.camundaService.shutdown();
    this.logger.log('Camunda 8 integration shut down');
  }
}
