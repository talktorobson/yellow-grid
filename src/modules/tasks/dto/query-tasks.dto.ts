import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaskStatus, TaskPriority, TaskType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTasksDto {
  @ApiPropertyOptional({
    description: 'Filter by task status (comma-separated)',
    example: 'OPEN,ASSIGNED',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.split(','))
  status?: TaskStatus[];

  @ApiPropertyOptional({
    description: 'Filter by task priority (comma-separated)',
    example: 'URGENT,CRITICAL',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.split(','))
  priority?: TaskPriority[];

  @ApiPropertyOptional({
    description: 'Filter by task type (comma-separated)',
    example: 'PRE_FLIGHT_FAILURE,PAYMENT_FAILED',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.split(','))
  taskType?: TaskType[];

  @ApiPropertyOptional({
    description: 'Filter by assigned operator user ID',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by service order ID',
    example: 'so_abc123',
  })
  @IsOptional()
  @IsString()
  serviceOrderId?: string;

  @ApiPropertyOptional({
    description: 'Filter by country code',
    example: 'FR',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by SLA status',
    enum: ['on_track', 'at_risk', 'breached'],
    example: 'at_risk',
  })
  @IsOptional()
  @IsEnum(['on_track', 'at_risk', 'breached'])
  slaStatus?: 'on_track' | 'at_risk' | 'breached';

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['slaDeadline', 'priority', 'createdAt', 'assignedAt', 'completedAt'],
    default: 'slaDeadline',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'slaDeadline';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
