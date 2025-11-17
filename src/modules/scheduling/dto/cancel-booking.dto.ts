import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiProperty({ description: 'Booking ID to cancel' })
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'Cancellation reason', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
