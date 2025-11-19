import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractsEventHandler } from './contracts.event-handler';
import { ESignatureModule } from './esignature/esignature.module';

@Module({
  imports: [ESignatureModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsEventHandler],
  exports: [ContractsService],
})
export class ContractsModule {}
