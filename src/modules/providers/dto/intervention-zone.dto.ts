import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsObject,
} from 'class-validator';

// Match the Prisma enum exactly
export enum ZoneType {
  PRIMARY = 'PRIMARY', // Main coverage area - prioritized
  SECONDARY = 'SECONDARY', // Extended coverage - lower priority
  OVERFLOW = 'OVERFLOW', // Emergency coverage only
}

class PostalCodeVectorDto {
  from: string;
  to: string;
}

export class CreateInterventionZoneDto {
  @ApiProperty({
    description: 'Zone name',
    example: 'Madrid Centro',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Zone code (unique per provider)',
    example: 'MAD-CENTRO',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  zoneCode?: string;

  @ApiProperty({
    description: 'Zone type',
    enum: ZoneType,
    default: ZoneType.PRIMARY,
  })
  @IsEnum(ZoneType)
  zoneType: ZoneType = ZoneType.PRIMARY;

  @ApiProperty({
    description: 'Postal codes covered by this zone (array of strings)',
    example: ['28001', '28002', '28003', '28004', '28005'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postalCodes?: string[];

  @ApiProperty({
    description: 'Postal code vectors (ranges) [{from: "28000", to: "28050"}]',
    example: [{ from: '28000', to: '28050' }],
    required: false,
  })
  @IsOptional()
  @IsArray()
  postalCodeVectors?: PostalCodeVectorDto[];

  @ApiProperty({
    description: 'GeoJSON Polygon for zone boundary',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [-3.71, 40.42],
          [-3.7, 40.41],
          [-3.72, 40.4],
          [-3.71, 40.42],
        ],
      ],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  boundaryGeoJson?: object;

  @ApiProperty({
    description: 'Maximum commute time in minutes',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  maxCommuteMinutes?: number;

  @ApiProperty({
    description: 'Default travel buffer in minutes',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  defaultTravelBuffer?: number;

  @ApiProperty({
    description: 'Maximum daily jobs in this zone',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyJobsInZone?: number;

  @ApiProperty({
    description: 'Assignment priority (1 = highest priority)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignmentPriority?: number;
}

export class UpdateInterventionZoneDto {
  @ApiProperty({
    description: 'Zone name',
    example: 'Madrid Centro',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Zone code (unique per provider)',
    example: 'MAD-CENTRO',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  zoneCode?: string;

  @ApiProperty({
    description: 'Zone type',
    enum: ZoneType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ZoneType)
  zoneType?: ZoneType;

  @ApiProperty({
    description: 'Postal codes covered by this zone (array of strings)',
    example: ['28001', '28002', '28003', '28004', '28005'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postalCodes?: string[];

  @ApiProperty({
    description: 'Postal code vectors (ranges) [{from: "28000", to: "28050"}]',
    example: [{ from: '28000', to: '28050' }],
    required: false,
  })
  @IsOptional()
  @IsArray()
  postalCodeVectors?: PostalCodeVectorDto[];

  @ApiProperty({
    description: 'GeoJSON Polygon for zone boundary',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [-3.71, 40.42],
          [-3.7, 40.41],
          [-3.72, 40.4],
          [-3.71, 40.42],
        ],
      ],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  boundaryGeoJson?: object;

  @ApiProperty({
    description: 'Maximum commute time in minutes',
    example: 60,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  maxCommuteMinutes?: number;

  @ApiProperty({
    description: 'Default travel buffer in minutes',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  defaultTravelBuffer?: number;

  @ApiProperty({
    description: 'Maximum daily jobs in this zone',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyJobsInZone?: number;

  @ApiProperty({
    description: 'Assignment priority (1 = highest priority)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  assignmentPriority?: number;
}
