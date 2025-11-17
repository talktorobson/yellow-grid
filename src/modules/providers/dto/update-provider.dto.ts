import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderStatus } from './create-provider.dto';

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

export class UpdateProviderDto {
  @ApiProperty({
    description: 'Provider commercial name',
    example: 'Acme Services Ltd',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Provider legal name',
    example: 'Acme Services Limited',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  legalName?: string;

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
    required: false,
  })
  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;
}
