import {
  IsString,
  IsBoolean,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkingHoursDto {
  @ApiProperty({ description: 'Start time (HH:mm)', example: '08:00' })
  @IsString()
  start: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '18:00' })
  @IsString()
  end: string;
}

export class SlaConfigDto {
  @ApiProperty({ description: 'P1 response time in hours', example: 24 })
  @IsInt()
  @Min(1)
  p1ResponseHours: number;

  @ApiProperty({ description: 'P2 response time in hours', example: 72 })
  @IsInt()
  @Min(1)
  p2ResponseHours: number;

  @ApiProperty({ description: 'Buffer percentage for scheduling', example: 20 })
  @IsInt()
  @Min(0)
  @Max(100)
  bufferPercentage: number;
}

export class UpdateCountryConfigDto {
  @ApiPropertyOptional({ description: 'Country code', example: 'FR' })
  @IsOptional()
  @IsString()
  @IsIn(['FR', 'ES', 'IT', 'PL'])
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Country display name', example: 'France' })
  @IsOptional()
  @IsString()
  countryName?: string;

  @ApiPropertyOptional({ description: 'Default timezone', example: 'Europe/Paris' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Default locale', example: 'fr-FR' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Date format', example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({
    description: 'Working days',
    example: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[];

  @ApiPropertyOptional({ description: 'Working hours configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @ApiPropertyOptional({ description: 'SLA configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SlaConfigDto)
  slaConfig?: SlaConfigDto;

  @ApiPropertyOptional({ description: 'Auto-accept assignments', example: true })
  @IsOptional()
  @IsBoolean()
  autoAcceptAssignments?: boolean;

  @ApiPropertyOptional({ description: 'Require e-signature for contracts', example: true })
  @IsOptional()
  @IsBoolean()
  requireESignature?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications', example: true })
  @IsOptional()
  @IsBoolean()
  enableSmsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Country-specific settings' })
  @IsOptional()
  countrySpecificSettings?: Record<string, any>;
}
