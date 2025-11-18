import { Module } from '@nestjs/common';
import { TechnicalVisitsController } from './technical-visits.controller';
import { TechnicalVisitsService } from './technical-visits.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicalVisitsController],
  providers: [TechnicalVisitsService],
  exports: [TechnicalVisitsService],
})
export class TechnicalVisitsModule {}
