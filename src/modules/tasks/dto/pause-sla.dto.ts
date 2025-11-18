import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PauseSlaDto {
  @ApiProperty({
    description: 'Reason for pausing the SLA',
    example: 'Waiting for customer to respond to email',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
