import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelTaskDto {
  @ApiProperty({
    description: 'Reason for cancelling the task',
    example: 'Service order was cancelled by customer',
  })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;
}
