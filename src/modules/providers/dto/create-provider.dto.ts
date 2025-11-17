import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsIn, IsEnum, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'Madrid' })
  @IsString()
  city: string;

  @ApiProperty({ example: '28001' })
  @IsString()
  postalCode: string;

  @ApiProperty({ example: 'Spain' })
  @IsString()
  country: string;
}

export enum ProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class CreateProviderDto {
  @ApiProperty({
    description: 'External ID (from SAP or other system)',
    example: 'SAP-12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({
    description: 'Country code',
    example: 'FR',
    enum: ['FR', 'ES', 'IT', 'PL'],
  })
  @IsString()
  @IsIn(['FR', 'ES', 'IT', 'PL'])
  countryCode: string;

  @ApiProperty({
    description: 'Business unit',
    example: 'LEROY_MERLIN',
    enum: ['LEROY_MERLIN', 'BRICO_DEPOT'],
  })
  @IsString()
  @IsIn(['LEROY_MERLIN', 'BRICO_DEPOT'])
  businessUnit: string;

  @ApiProperty({
    description: 'Provider commercial name',
    example: 'Acme Services Ltd',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Provider legal name',
    example: 'Acme Services Limited',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  legalName: string;

  @ApiProperty({
    description: 'Tax ID / VAT number',
    example: 'FR12345678901',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiProperty({
    description: 'Provider email',
    example: 'contact@acme-services.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Provider phone',
    example: '+33 1 23 45 67 89',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Provider address',
    type: AddressDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({
    description: 'Provider status',
    enum: ProviderStatus,
    default: ProviderStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;
}
