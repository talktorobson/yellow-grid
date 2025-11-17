import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignServiceOrderDto {
  @ApiProperty({
    description: 'Provider ID to assign',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({
    description: 'Work team ID to assign (optional, can be selected later)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  workTeamId?: string;

  @ApiProperty({
    description: 'Assignment notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
