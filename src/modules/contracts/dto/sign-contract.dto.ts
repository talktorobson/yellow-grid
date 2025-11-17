import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SignContractDto {
  @ApiProperty({ description: 'Name that will appear on the signed document' })
  @IsString()
  @MaxLength(255)
  signerName!: string;

  @ApiProperty({ description: 'Typed signature or token representing the signature draw/upload' })
  @IsString()
  signatureData!: string;

  @ApiProperty({ description: 'Verification code delivered via email/SMS' })
  @IsString()
  @MaxLength(20)
  verificationCode!: string;

  @ApiPropertyOptional({ description: 'IP address captured at signing time' })
  @IsString()
  @MaxLength(60)
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent captured at signing time' })
  @IsString()
  @MaxLength(255)
  userAgent?: string;
}
