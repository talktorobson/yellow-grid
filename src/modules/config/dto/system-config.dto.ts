import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeatureFlagsDto {
  @ApiProperty({ description: 'Enable AI-powered risk assessment', example: true })
  @IsBoolean()
  aiRiskAssessment: boolean;

  @ApiProperty({ description: 'Enable AI-powered sales potential assessment', example: true })
  @IsBoolean()
  aiSalesPotential: boolean;

  @ApiProperty({ description: 'Enable automatic project ownership assignment', example: false })
  @IsBoolean()
  autoProjectOwnership: boolean;

  @ApiProperty({ description: 'Enable mobile app features', example: true })
  @IsBoolean()
  mobileApp: boolean;

  @ApiProperty({ description: 'Enable contract e-signature', example: true })
  @IsBoolean()
  eSignature: boolean;
}

export class EmailConfigDto {
  @ApiProperty({ description: 'SMTP server host', example: 'smtp.gmail.com' })
  @IsString()
  smtpHost: string;

  @ApiProperty({ description: 'SMTP server port', example: 587 })
  @IsInt()
  @Min(1)
  smtpPort: number;

  @ApiProperty({ description: 'SMTP username' })
  @IsString()
  smtpUser: string;

  @ApiProperty({ description: 'From email address', example: 'noreply@yellowgrid.com' })
  @IsString()
  fromEmail: string;

  @ApiProperty({ description: 'From name', example: 'Yellow Grid Platform' })
  @IsString()
  fromName: string;
}

export class SmsConfigDto {
  @ApiProperty({ description: 'SMS provider', example: 'twilio' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Sender ID or phone number', example: 'YellowGrid' })
  @IsString()
  senderId: string;
}

export class UpdateSystemConfigDto {
  @ApiPropertyOptional({ description: 'Feature flags configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeatureFlagsDto)
  featureFlags?: FeatureFlagsDto;

  @ApiPropertyOptional({ description: 'Email configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailConfigDto)
  emailConfig?: EmailConfigDto;

  @ApiPropertyOptional({ description: 'SMS configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmsConfigDto)
  smsConfig?: SmsConfigDto;

  @ApiPropertyOptional({ description: 'Additional settings as JSON' })
  @IsOptional()
  @IsObject()
  additionalSettings?: Record<string, any>;
}
