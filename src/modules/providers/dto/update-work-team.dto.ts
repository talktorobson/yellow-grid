import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsArray,
  IsOptional,
  Min,
  ArrayMinSize,
  MinLength,
  MaxLength,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkTeamStatus } from './create-work-team.dto';

class ShiftDto {
  @ApiProperty({ example: 'M', description: 'Shift code (M=Morning, T=Afternoon, J=Full Day)' })
  @IsString()
  code: string;

  @ApiProperty({ example: '08:00', description: 'Shift start time (HH:mm)' })
  @IsString()
  startLocal: string;

  @ApiProperty({ example: '13:00', description: 'Shift end time (HH:mm)' })
  @IsString()
  endLocal: string;
}

export class UpdateWorkTeamDto {
  @ApiProperty({
    description: 'External ID (from SAP or other system)',
    example: 'WT-12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({
    description: 'Work team name',
    example: 'Team Alpha',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Work team status',
    enum: WorkTeamStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(WorkTeamStatus)
  status?: WorkTeamStatus;

  @ApiProperty({
    description: 'Maximum daily jobs capacity',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDailyJobs?: number;

  @ApiProperty({
    description: 'Minimum required technicians for the team',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minTechnicians?: number;

  @ApiProperty({
    description: 'Maximum allowed technicians for the team',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTechnicians?: number;

  @ApiProperty({
    description: 'Team skills',
    example: ['installation', 'repair', 'tv'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({
    description: 'Service types handled by team',
    example: ['P1', 'P2'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceTypes?: string[];

  @ApiProperty({
    description: 'Postal codes covered by team',
    example: ['28001', '28002', '28003'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  postalCodes?: string[];

  @ApiProperty({
    description: 'Working days (ISO codes)',
    example: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  workingDays?: string[];

  @ApiProperty({
    description: 'Work shifts',
    example: [
      { code: 'M', startLocal: '08:00', endLocal: '13:00' },
      { code: 'T', startLocal: '14:00', endLocal: '19:00' },
    ],
    type: [ShiftDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  shifts?: ShiftDto[];
}
