import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

/**
 * Chat Module for Yellow Grid
 *
 * Provides real-time messaging between:
 * - Customer (end customer)
 * - Operator (control tower)
 * - Work Team (technicians)
 * - Provider Manager (provider company)
 *
 * All conversations are scoped to a ServiceOrder context.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
