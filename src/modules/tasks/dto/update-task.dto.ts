import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskPriority } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    enum: TaskPriority,
    description: 'Update task priority',
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Additional notes or context',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
