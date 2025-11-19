import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEnum,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceLocationDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;
}

export class DateRangeDto {
  @ApiProperty({ description: 'Start date (ISO 8601 date)' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date (ISO 8601 date)' })
  @IsString()
  @IsNotEmpty()
  endDate: string;
}

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

export class SlotFiltersDto {
  @ApiPropertyOptional({ description: 'Time window', type: Object })
  @ValidateNested()
  @IsOptional()
  timeWindow?: {
    start: string; // HH:mm
    end: string;
  };

  @ApiPropertyOptional({ description: 'Dates to exclude (ISO 8601)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludeDates?: string[];

  @ApiPropertyOptional({ description: 'Preferred days of week', enum: DayOfWeek, isArray: true })
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @IsOptional()
  preferredDays?: DayOfWeek[];
}

export class SlotAvailabilityRequestDto {
  @ApiProperty({ description: 'Service address location', type: ServiceLocationDto })
  @ValidateNested()
  @Type(() => ServiceLocationDto)
  serviceAddress: ServiceLocationDto;

  @ApiProperty({ description: 'Service type' })
  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @ApiProperty({ description: 'Estimated duration in minutes' })
  @IsNumber()
  estimatedDuration: number;

  @ApiProperty({ description: 'Date range', type: DateRangeDto })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange: DateRangeDto;

  @ApiPropertyOptional({ description: 'Required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @ApiPropertyOptional({ description: 'Technician preference' })
  @IsString()
  @IsOptional()
  technicianPreference?: string;

  @ApiPropertyOptional({ description: 'Slot filters', type: SlotFiltersDto })
  @ValidateNested()
  @Type(() => SlotFiltersDto)
  @IsOptional()
  filters?: SlotFiltersDto;
}
