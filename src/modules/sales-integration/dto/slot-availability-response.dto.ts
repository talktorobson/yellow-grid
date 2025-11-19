import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlotAvailabilityRequestDto } from './slot-availability-request.dto';

export enum SlotType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  FULL_DAY = 'FULL_DAY',
}

export class PriceDto {
  @ApiProperty({ description: 'Amount' })
  amount: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;
}

export class TimeWindowResponseDto {
  @ApiProperty({ description: 'Start time (ISO 8601 timestamp)' })
  start: string;

  @ApiProperty({ description: 'End time (ISO 8601 timestamp)' })
  end: string;
}

export class AvailableSlotDto {
  @ApiProperty({ description: 'Slot ID' })
  slotId: string;

  @ApiProperty({ description: 'Date (ISO 8601 date)' })
  date: string;

  @ApiProperty({ description: 'Time window', type: TimeWindowResponseDto })
  timeWindow: TimeWindowResponseDto;

  @ApiProperty({ description: 'Slot type', enum: SlotType })
  slotType: SlotType;

  @ApiProperty({ description: 'Technician ID' })
  technicianId: string;

  @ApiProperty({ description: 'Technician name' })
  technicianName: string;

  @ApiProperty({ description: 'Travel time in minutes' })
  travelTime: number;

  @ApiProperty({ description: 'Capacity remaining' })
  capacityRemaining: number;

  @ApiPropertyOptional({ description: 'Price', type: PriceDto })
  price?: PriceDto;
}

export class SlotAvailabilityResponseDto {
  @ApiProperty({ description: 'Available slots', type: [AvailableSlotDto] })
  availableSlots: AvailableSlotDto[];

  @ApiProperty({ description: 'Total slots found' })
  totalSlotsFound: number;

  @ApiProperty({ description: 'Search criteria', type: SlotAvailabilityRequestDto })
  searchCriteria: SlotAvailabilityRequestDto;
}
