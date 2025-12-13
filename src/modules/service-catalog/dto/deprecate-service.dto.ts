import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for deprecating a service
 */
export class DeprecateServiceDto {
  @ApiPropertyOptional({
    description: 'Reason for deprecation',
    example: 'Service no longer offered, replaced by new model',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'ID of replacement service (if any)',
    example: 'svc-uuid-456',
  })
  @IsString()
  @IsOptional()
  replacementServiceId?: string;
}
