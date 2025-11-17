import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingService } from '../booking.service';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';

@ApiTags('Calendar - Availability')
@Controller('calendar/availability')
export class AvailabilityController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @ApiOperation({ summary: 'Get availability slots for a work team on a date' })
  @ApiResponse({
    status: 200,
    description: 'Availability fetched',
    schema: {
      properties: {
        availableStartSlots: { type: 'array', items: { type: 'number' } },
        availability: { type: 'array', items: { type: 'boolean' } },
        slotSizeMinutes: { type: 'number', example: 15 },
        slotsPerDay: { type: 'number', example: 96 },
      },
    },
  })
  async getAvailability(@Query() query: AvailabilityQueryDto) {
    const { availableStartSlots, availability } = await this.bookingService.getAvailability(query);
    return {
      availableStartSlots,
      availability,
      slotSizeMinutes: 15,
      slotsPerDay: 96,
    };
  }
}
