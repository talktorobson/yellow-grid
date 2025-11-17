import { IsEmail, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProviderLoginDto {
  @ApiProperty({
    description: 'Provider email address',
    example: 'manager@provider.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecureP@ss123',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'MFA code (6 digits, required if MFA is enabled)',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'MFA code must be exactly 6 digits' })
  mfaCode?: string;
}
