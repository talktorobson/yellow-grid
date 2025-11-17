import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { MediaUploadService } from './media-upload.service';

@Module({
  imports: [PrismaModule],
  providers: [ExecutionService, MediaUploadService],
  controllers: [ExecutionController],
  exports: [ExecutionService, MediaUploadService],
})
export class ExecutionModule {}
