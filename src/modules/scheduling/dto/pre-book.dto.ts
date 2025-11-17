import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PreBookDto {
  @ApiProperty({ description: 'Service order ID to associate the booking with' })
  @IsString()
  serviceOrderId: string;

  @ApiProperty({ description: 'Provider ID' })
  @IsString()
  providerId: string;

  @ApiProperty({ description: 'Work team ID' })
  @IsString()
  workTeamId: string;

  @ApiProperty({ description: 'Booking date (YYYY-MM-DD)' })
  @IsDateString()
  bookingDate: string;

  @ApiProperty({ description: 'Start slot index (0-95)', minimum: 0, maximum: 95 })
  @IsInt()
  @Min(0)
  startSlot: number;

  @ApiProperty({ description: 'End slot index (0-95)', minimum: 0, maximum: 95 })
  @IsInt()
  @Min(0)
  endSlot: number;

  @ApiProperty({
    description: 'Optional duration override (minutes, default based on slot range)',
    required: false,
    minimum: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @ApiProperty({
    description: 'Idempotency key for pre-booking (per customer/time window)',
    required: false,
  })
  @IsOptional()
  @IsString()
  holdReference?: string;
}
