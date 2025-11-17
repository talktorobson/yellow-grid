import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Work team ID' })
  @IsString()
  workTeamId: string;

  @ApiProperty({ description: 'Booking date (YYYY-MM-DD)' })
  @IsDateString()
  bookingDate: string;

  @ApiProperty({
    description: 'Desired duration in minutes (optional). When provided, only start slots that fit are returned.',
    required: false,
    minimum: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;
}
