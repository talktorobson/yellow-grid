import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Completion status for check-out
 * Based on product-docs/domain/06-execution-field-operations.md:112-118
 */
export enum CompletionStatus {
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  INCOMPLETE = 'INCOMPLETE',
  CANCELLED = 'CANCELLED',
  REQUIRES_FOLLOWUP = 'REQUIRES_FOLLOWUP',
}

/**
 * Location data for check-out
 */
export class LocationDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'GPS accuracy in meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}

/**
 * Material usage tracking
 * Based on product-docs/domain/06-execution-field-operations.md:128-136
 */
export class MaterialUsageDto {
  @ApiProperty({ description: 'Material ID' })
  @IsString()
  materialId: string;

  @ApiProperty({ description: 'Material name' })
  @IsString()
  materialName: string;

  @ApiProperty({ description: 'Quantity used' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Serial numbers', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];

  @ApiProperty({ description: 'Whether material was installed', required: false })
  @IsOptional()
  @IsBoolean()
  installed?: boolean;
}

/**
 * Work summary for check-out
 * Based on product-docs/domain/06-execution-field-operations.md:120-126
 */
export class WorkSummaryDto {
  @ApiProperty({ description: 'Work description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Tasks completed', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tasksCompleted: string[];

  @ApiProperty({ description: 'Tasks incomplete', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tasksIncomplete?: string[];

  @ApiProperty({ description: 'Issues encountered', required: false })
  @IsOptional()
  @IsString()
  issuesEncountered?: string;

  @ApiProperty({ description: 'Resolution notes', required: false })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

/**
 * Signature data
 */
export class SignatureDto {
  @ApiProperty({ description: 'Signature data URL (base64 encoded PNG)' })
  @IsString()
  dataUrl: string;

  @ApiProperty({ description: 'Name of person who signed' })
  @IsString()
  signedBy: string;

  @ApiProperty({ description: 'Signature timestamp (ISO)' })
  @IsDateString()
  signedAt: string;
}

/**
 * Enhanced Check-Out DTO
 * Based on product-docs/api/06-execution-mobile-api.md:427-487
 * and product-docs/domain/06-execution-field-operations.md:89-159
 */
export class CheckOutDto {
  @ApiProperty({ description: 'Service order ID' })
  @IsUUID()
  serviceOrderId: string;

  @ApiProperty({ description: 'Technician user ID performing check-out' })
  @IsUUID()
  technicianUserId: string;

  @ApiProperty({ description: 'Check-out timestamp (ISO)' })
  @IsDateString()
  occurredAt: string;

  @ApiProperty({ description: 'Check-out location', type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Break time in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(480) // Max 8 hours of breaks seems reasonable
  breakTimeMinutes?: number;

  @ApiProperty({ description: 'Travel time in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  travelTimeMinutes?: number;

  @ApiProperty({ description: 'Completion status', enum: CompletionStatus })
  @IsEnum(CompletionStatus)
  completionStatus: CompletionStatus;

  @ApiProperty({ description: 'Work summary', type: WorkSummaryDto })
  @ValidateNested()
  @Type(() => WorkSummaryDto)
  workSummary: WorkSummaryDto;

  @ApiProperty({ description: 'Materials used', type: [MaterialUsageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialUsageDto)
  materialsUsed: MaterialUsageDto[];

  @ApiProperty({ description: 'Customer signature', required: false, type: SignatureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SignatureDto)
  customerSignature?: SignatureDto;

  @ApiProperty({ description: 'Technician signature', required: false, type: SignatureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SignatureDto)
  technicianSignature?: SignatureDto;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Manual duration override in minutes (only use if auto-calculation is incorrect)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMinutesOverride?: number;

  @ApiProperty({ description: 'Whether this check-out was queued offline', required: false })
  @IsOptional()
  @IsBoolean()
  offlineQueued?: boolean;
}
