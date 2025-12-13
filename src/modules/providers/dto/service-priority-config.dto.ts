import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  IsNumber,
  Min,
  IsArray,
  IsDateString,
} from 'class-validator';

// Match the Prisma enum exactly
export enum ServicePriorityType {
  P1 = 'P1', // Always Accept - core competency
  P2 = 'P2', // Bundle Only - requires P1 service in same order
  OPT_OUT = 'OPT_OUT', // Never Accept - provider declines this service
}

export class CreateServicePriorityConfigDto {
  @ApiProperty({
    description: 'Provider Specialty ID to configure priority for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  specialtyId: string;

  @ApiProperty({
    description: 'Service priority type',
    enum: ServicePriorityType,
    default: ServicePriorityType.P2,
    example: 'P1',
  })
  @IsEnum(ServicePriorityType)
  priority: ServicePriorityType = ServicePriorityType.P2;

  @ApiProperty({
    description: 'For P2 services: which P1 specialty IDs can unlock this service',
    example: ['uuid1', 'uuid2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bundledWithSpecialtyIds?: string[];

  @ApiProperty({
    description: 'Maximum monthly volume for this service',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxMonthlyVolume?: number;

  @ApiProperty({
    description: 'Price override percentage (e.g., 10.5 for 10.5% markup)',
    example: 5.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priceOverridePercent?: number;

  @ApiProperty({
    description: 'Valid from date (ISO 8601)',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiProperty({
    description: 'Valid until date (ISO 8601)',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class UpdateServicePriorityConfigDto {
  @ApiProperty({
    description: 'Service priority type',
    enum: ServicePriorityType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ServicePriorityType)
  priority?: ServicePriorityType;

  @ApiProperty({
    description: 'For P2 services: which P1 specialty IDs can unlock this service',
    example: ['uuid1', 'uuid2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bundledWithSpecialtyIds?: string[];

  @ApiProperty({
    description: 'Maximum monthly volume for this service',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxMonthlyVolume?: number;

  @ApiProperty({
    description: 'Price override percentage (e.g., 10.5 for 10.5% markup)',
    example: 5.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priceOverridePercent?: number;

  @ApiProperty({
    description: 'Valid from date (ISO 8601)',
    example: '2025-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiProperty({
    description: 'Valid until date (ISO 8601)',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class BulkUpsertServicePriorityDto {
  @ApiProperty({
    description: 'Array of service priority configurations',
    type: [CreateServicePriorityConfigDto],
    example: [
      { specialtyId: 'uuid1', priority: 'P1' },
      { specialtyId: 'uuid2', priority: 'P2', bundledWithSpecialtyIds: ['uuid1'] },
      { specialtyId: 'uuid3', priority: 'OPT_OUT' },
    ],
  })
  priorities: CreateServicePriorityConfigDto[];
}
