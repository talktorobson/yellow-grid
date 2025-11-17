import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitWcfDto {
  @ApiProperty({ description: 'Service order ID' })
  @IsUUID()
  serviceOrderId: string;

  @ApiProperty({ description: 'Customer accepted the WCF' })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({ description: 'Signature image data (base64)', required: false })
  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  @ApiProperty({ description: 'Refusal reason if rejected', required: false })
  @IsOptional()
  @IsString()
  refusalReason?: string;
}
