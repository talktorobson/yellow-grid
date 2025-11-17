import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsArray, IsOptional, Min, ArrayMinSize, MinLength, MaxLength } from 'class-validator';

export class UpdateWorkTeamDto {
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
    description: 'Maximum daily jobs capacity',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDailyJobs?: number;

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
    type: Array,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  shifts?: Array<{ code: string; startLocal: string; endLocal: string }>;
}
