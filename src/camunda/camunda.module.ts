import { Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CamundaService } from './camunda.service';
import { CamundaConfig } from './camunda.config';
import { OperateService } from './operate/operate.service';
import { CamundaEventListener } from './camunda.event-listener';
import { CamundaController } from './camunda.controller';

// Workers
import { ValidateOrderWorker } from './workers/validation/validate-order.worker';
import { FindProvidersWorker } from './workers/assignment/find-providers.worker';
import { RankProvidersWorker } from './workers/assignment/rank-providers.worker';
import { AutoAssignProviderWorker } from './workers/assignment/auto-assign-provider.worker';
import { SendOfferWorker } from './workers/assignment/send-offer.worker';
import { CheckAvailabilityWorker } from './workers/booking/check-availability.worker';
import { ReserveSlotWorker } from './workers/booking/reserve-slot.worker';
import { GoCheckWorker } from './workers/execution/go-check.worker';
import { SendNotificationWorker } from './workers/notification/send-notification.worker';
import { EscalateOfferTimeoutWorker } from './workers/escalation/escalate-offer-timeout.worker';

// Common modules (no circular dependency)
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [CamundaController],
  providers: [
    CamundaConfig,
    CamundaService,
    OperateService,
    CamundaEventListener,
    // Workers
    ValidateOrderWorker,
    FindProvidersWorker,
    RankProvidersWorker,
    AutoAssignProviderWorker,
    SendOfferWorker,
    CheckAvailabilityWorker,
    ReserveSlotWorker,
    GoCheckWorker,
    SendNotificationWorker,
    EscalateOfferTimeoutWorker,
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
