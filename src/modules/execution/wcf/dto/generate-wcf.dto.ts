import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

export class GenerateWcfDto {
  @ApiProperty({ description: 'Service order ID' })
  @IsUUID()
  serviceOrderId: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Technician name', required: false })
  @IsOptional()
  @IsString()
  technicianName?: string;
}
