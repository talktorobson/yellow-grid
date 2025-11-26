import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { BookingService } from '../booking.service';

class ScheduledOrdersQueryDto {
  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsArray()
  providerIds?: string[];

  @IsOptional()
  @IsString()
  countryCode?: string;
}

class UtilizationQueryDto {
  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsArray()
  providerIds?: string[];
}

@ApiTags('Calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('scheduled-orders')
  @ApiOperation({ summary: 'Get scheduled service orders for calendar view' })
  @ApiResponse({
    status: 200,
    description: 'Scheduled orders fetched',
  })
  async getScheduledOrders(@Query() query: ScheduledOrdersQueryDto) {
    // Handle both providerId (legacy/single) and providerIds (multi)
    let providerIds = query.providerIds;
    if (!providerIds && query.providerId) {
      providerIds = [query.providerId];
    } else if (providerIds && !Array.isArray(providerIds)) {
      // If query param is passed as providerIds=123 (single value), nestjs might not parse as array automatically depending on validation pipe
      providerIds = [providerIds];
    }

    return this.bookingService.getScheduledOrders({
      startDate: query.startDate,
      endDate: query.endDate,
      providerIds,
      countryCode: query.countryCode,
    });
  }

  @Get('utilization')
  @ApiOperation({ summary: 'Get utilization stats for calendar view' })
  @ApiResponse({
    status: 200,
    description: 'Utilization stats fetched',
  })
  async getUtilizationStats(@Query() query: UtilizationQueryDto) {
    let providerIds = query.providerIds;
    if (!providerIds && query.providerId) {
      providerIds = [query.providerId];
    } else if (providerIds && !Array.isArray(providerIds)) {
      providerIds = [providerIds];
    }

    return this.bookingService.getUtilizationMetrics({
      startDate: query.startDate,
      endDate: query.endDate,
      providerIds,
    });
  }
}
