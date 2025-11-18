import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { TaskType, TaskPriority } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    enum: TaskType,
    description: 'Type of task',
    example: 'PRE_FLIGHT_FAILURE',
  })
  @IsEnum(TaskType)
  @IsNotEmpty()
  taskType: TaskType;

  @ApiProperty({
    enum: TaskPriority,
    description: 'Priority of the task',
    example: 'URGENT',
  })
  @IsEnum(TaskPriority)
  @IsNotEmpty()
  priority: TaskPriority;

  @ApiProperty({
    description: 'Service order ID associated with this task',
    example: 'so_abc123',
  })
  @IsString()
  @IsNotEmpty()
  serviceOrderId: string;

  @ApiProperty({
    description: 'Task-type-specific context data',
    example: {
      goExecutionStatus: 'NOT_OK_PAYMENT',
      paymentStatus: 'NOT_PAID',
      scheduledDate: '2025-01-20T09:00:00Z',
      timeUntilAppointment: 6,
    },
  })
  @IsObject()
  @IsNotEmpty()
  context: any;

  @ApiPropertyOptional({
    description: 'User ID to assign the task to (optional, otherwise auto-assigned)',
    example: 'user_123',
  })
  @IsString()
  @IsOptional()
  assignedTo?: string;
}
