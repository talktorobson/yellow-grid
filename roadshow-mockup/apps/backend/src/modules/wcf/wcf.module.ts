import { Module } from '@nestjs/common';
import { WCFController } from './wcf.controller';
import { WCFService } from './wcf.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WCFController],
  providers: [WCFService],
  exports: [WCFService],
})
export class WCFModule {}
