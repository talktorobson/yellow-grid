import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BufferLogicService } from './buffer-logic.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { SlotCalculatorService } from './slot-calculator.service';
import { RedisBitmapService } from './redis-bitmap.service';
import { BookingService } from './booking.service';
import { AvailabilityController } from './controllers/availability.controller';
import { BookingsController } from './controllers/bookings.controller';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ConfigModule,
    RedisModule,
  ],
  providers: [BufferLogicService, SlotCalculatorService, RedisBitmapService, BookingService],
  controllers: [AvailabilityController, BookingsController],
  exports: [BufferLogicService, SlotCalculatorService, BookingService],
})
export class SchedulingModule {}
