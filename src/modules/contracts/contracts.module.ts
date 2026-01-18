import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractsEventHandler } from './contracts.event-handler';
import { ESignatureModule } from './esignature/esignature.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { KafkaModule } from '../../common/kafka/kafka.module';
import { PdfModule } from '../../common/pdf/pdf.module';

@Module({
  imports: [ESignatureModule, PrismaModule, KafkaModule, PdfModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsEventHandler],
  exports: [ContractsService],
})
export class ContractsModule {}
