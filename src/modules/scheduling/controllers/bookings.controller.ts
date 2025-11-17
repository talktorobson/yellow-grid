import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingService } from '../booking.service';
import { PreBookDto } from '../dto/pre-book.dto';
import { ConfirmBookingDto } from '../dto/confirm-booking.dto';
import { CancelBookingDto } from '../dto/cancel-booking.dto';

@ApiTags('Calendar - Bookings')
@Controller('calendar/bookings')
export class BookingsController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('pre-book')
  @ApiOperation({
    summary: 'Create a pre-booking hold (PRE_BOOKED)',
    description: 'Atomically reserves slots in Redis and records a PRE_BOOKED booking with 48h TTL by default.',
  })
  @ApiResponse({ status: 201, description: 'Pre-booking created' })
  async preBook(@Body() dto: PreBookDto) {
    return this.bookingService.preBook(dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm a pre-booked hold' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  async confirm(@Body() dto: ConfirmBookingDto) {
    return this.bookingService.confirm(dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel a booking or hold and release slots' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancel(@Body() dto: CancelBookingDto) {
    return this.bookingService.cancel(dto);
  }
}
