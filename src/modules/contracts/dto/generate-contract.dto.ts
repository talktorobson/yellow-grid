import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SignatureMethod } from '@prisma/client';

export class GenerateContractDto {
  @ApiProperty({ description: 'Service order that requires a pre-service contract' })
  @IsUUID()
  serviceOrderId!: string;

  @ApiPropertyOptional({ description: 'Explicit contract template override' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Override customer email for delivery' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Override customer phone for SMS delivery' })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Optional template variables that will override default payload values',
    type: () => Object,
    example: { installationDate: '2025-02-01', depositAmount: '125.00 EUR' },
  })
  @IsOptional()
  @IsObject()
  mergeData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Preferred signature capture method for the customer signer',
    enum: SignatureMethod,
    default: SignatureMethod.TYPED,
  })
  @IsOptional()
  @IsEnum(SignatureMethod)
  signatureMethod?: SignatureMethod;

  @ApiPropertyOptional({
    description: 'Allow generation even if the service does not require a contract',
  })
  @IsOptional()
  @IsBoolean()
  allowOptionalContract?: boolean;
}
