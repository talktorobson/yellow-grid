import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { MediaUploadService } from './media-upload.service';
import { WcfService } from './wcf/wcf.service';
import { WcfController } from './wcf/wcf.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [ExecutionService, MediaUploadService, WcfService],
  controllers: [ExecutionController, WcfController],
  exports: [ExecutionService, MediaUploadService, WcfService],
})
export class ExecutionModule {}
