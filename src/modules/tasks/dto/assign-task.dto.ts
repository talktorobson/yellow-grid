import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTaskDto {
  @ApiProperty({
    description: 'User ID to assign the task to',
    example: 'user_456',
  })
  @IsString()
  @IsNotEmpty()
  assignedTo: string;
}
