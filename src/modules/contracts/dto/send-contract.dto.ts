import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SendContractDto {
  @ApiPropertyOptional({ description: 'Send contract via email notification', default: true })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @ApiPropertyOptional({ description: 'Destination email (defaults to stored customer email)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Send contract via SMS with signing link', default: false })
  @IsOptional()
  @IsBoolean()
  sendSms?: boolean;

  @ApiPropertyOptional({
    description: 'Destination phone in E.164 format',
    example: '+34600000000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone?: string;

  @ApiPropertyOptional({ description: 'Custom message to include in notifications' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({
    description: 'Expiration window (hours) for the contract link',
    default: 48,
    minimum: 1,
    maximum: 168,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  expiresInHours?: number;
}
