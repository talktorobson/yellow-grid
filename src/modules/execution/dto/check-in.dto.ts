import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CheckInDto {
  @ApiProperty({ description: 'Service order ID' })
  @IsUUID()
  serviceOrderId: string;

  @ApiProperty({ description: 'Work team ID' })
  @IsUUID()
  workTeamId: string;

  @ApiProperty({ description: 'Provider ID' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Technician ID performing check-in (user ID)' })
  @IsUUID()
  technicianUserId: string;

  @ApiProperty({ description: 'Check-in timestamp (ISO)' })
  @IsDateString()
  occurredAt: string;

  @ApiProperty({ description: 'Latitude', example: 40.4168 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ description: 'Longitude', example: -3.7038 })
  @IsLongitude()
  lng: number;

  @ApiProperty({ description: 'GPS accuracy in meters', required: false })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
