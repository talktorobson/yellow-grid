import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ScheduleServiceOrderDto {
  @ApiProperty({
    description: 'Scheduled date',
    example: '2025-11-25',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({
    description: 'Scheduled start time',
    example: '2025-11-25T09:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledStartTime: string;

  @ApiProperty({
    description: 'Scheduled end time',
    example: '2025-11-25T11:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledEndTime: string;

  @ApiProperty({
    description: 'Notes about scheduling',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
