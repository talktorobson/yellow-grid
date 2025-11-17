import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmBookingDto {
  @ApiProperty({ description: 'Booking ID', required: false })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ description: 'Hold reference (idempotency key)', required: false })
  @IsOptional()
  @IsString()
  holdReference?: string;
}
