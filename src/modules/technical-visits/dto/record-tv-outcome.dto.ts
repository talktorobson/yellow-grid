import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TvOutcome } from '@prisma/client';

export class TvModificationDto {
  @ApiProperty({ description: 'Description of the modification required' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Extra duration required in minutes',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  extraDurationMin?: number;

  @ApiPropertyOptional({ description: 'Reason for the modification' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RecordTvOutcomeDto {
  @ApiProperty({
    description: 'TV Service Order ID (must be CONFIRMATION_TV or QUOTATION_TV type)',
    example: 'so_abc123',
  })
  @IsString()
  tvServiceOrderId: string;

  @ApiPropertyOptional({
    description: 'Linked Installation Service Order ID',
    example: 'so_def456',
  })
  @IsOptional()
  @IsString()
  linkedInstallationOrderId?: string;

  @ApiProperty({
    description: 'Technical Visit outcome',
    enum: TvOutcome,
    example: TvOutcome.YES,
  })
  @IsEnum(TvOutcome)
  outcome: TvOutcome;

  @ApiPropertyOptional({
    description:
      'Modifications required (mandatory for YES_BUT, optional for others)',
    type: [TvModificationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TvModificationDto)
  modifications?: TvModificationDto[];

  @ApiPropertyOptional({
    description: 'Technician notes about the technical visit',
  })
  @IsOptional()
  @IsString()
  technicianNotes?: string;
}
