import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteTaskDto {
  @ApiProperty({
    description: 'Resolution notes explaining the actions taken',
    example: 'Contacted customer, payment confirmed. Manually overrode Go Execution check.',
  })
  @IsString()
  @IsNotEmpty()
  resolutionNotes: string;
}
