import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COUNTRY_ADMIN = 'COUNTRY_ADMIN',
  OPERATOR = 'OPERATOR',
  PROVIDER_ADMIN = 'PROVIDER_ADMIN',
  TECHNICIAN = 'TECHNICIAN',
}

export enum CountryCode {
  ES = 'ES',
  FR = 'FR',
  IT = 'IT',
  PL = 'PL',
}

export enum BusinessUnit {
  DIY_STORE = 'DIY_STORE',
  PRO_STORE = 'PRO_STORE',
}

export class LoginDto {
  @ApiProperty({ example: 'admin@yellowgrid.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'admin@yellowgrid.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ enum: CountryCode, example: CountryCode.FR })
  @IsEnum(CountryCode)
  countryCode: CountryCode;

  @ApiProperty({ enum: BusinessUnit, example: BusinessUnit.DIY_STORE })
  @IsEnum(BusinessUnit)
  buCode: BusinessUnit;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    countryCode: CountryCode;
    buCode: BusinessUnit;
  };
}
