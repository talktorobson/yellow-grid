import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProviderRegisterDto {
  @ApiProperty({
    description: 'Provider email address',
    example: 'manager@provider.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Password (minimum 8 characters, must include uppercase, lowercase, number, and special character)',
    example: 'SecureP@ss123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+34612345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Provider ID to link this user to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  providerId: string;

  @ApiProperty({
    description: 'Country code',
    example: 'ES',
    minLength: 2,
    maxLength: 3,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  countryCode: string;

  @ApiProperty({
    description: 'Business unit',
    example: 'LM_ES',
  })
  @IsString()
  businessUnit: string;
}
