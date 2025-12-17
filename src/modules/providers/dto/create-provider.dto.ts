import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
  IsEnum,
  ValidateNested,
  MinLength,
  MaxLength,
  IsNumber,
  IsDateString,
  IsUUID,
  IsArray,
  Min,
  Max,
} from 'class-validator';
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

export enum ProviderTypeEnum {
  P1 = 'P1',
  P2 = 'P2',
}

export enum RiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
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
    example: 'DIY_STORE',
    enum: ['DIY_STORE', 'PRO_STORE'],
  })
  @IsString()
  @IsIn(['DIY_STORE', 'PRO_STORE'])
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

  // ============================================================================
  // New fields from AHS Business Requirements
  // ============================================================================

  @ApiProperty({
    description:
      'Provider type - P1 (primary, always accept core services) or P2 (secondary, bundle only)',
    enum: ProviderTypeEnum,
    default: ProviderTypeEnum.P1,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProviderTypeEnum)
  providerType?: ProviderTypeEnum;

  @ApiProperty({
    description: 'Parent provider ID for hierarchical structures (company groups)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parentProviderId?: string;

  @ApiProperty({
    description: 'Risk level for the provider based on historical performance',
    enum: RiskLevel,
    default: RiskLevel.NONE,
    required: false,
  })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  // Flattened address fields (preferred)
  @ApiProperty({
    description: 'Street address',
    example: 'Calle Mayor 123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressStreet?: string;

  @ApiProperty({
    description: 'City',
    example: 'Madrid',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCity?: string;

  @ApiProperty({
    description: 'Postal code',
    example: '28001',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressPostalCode?: string;

  @ApiProperty({
    description: 'Region/Province',
    example: 'Madrid',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  addressRegion?: string;

  @ApiProperty({
    description: 'Country code',
    example: 'ES',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  addressCountry?: string;

  @ApiProperty({
    description: 'Coordinates {lat, lng}',
    example: { lat: 40.4168, lng: -3.7038 },
    required: false,
  })
  @IsOptional()
  coordinates?: { lat: number; lng: number };

  @ApiProperty({
    description: 'Contract start date',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  contractStartDate?: string;

  @ApiProperty({
    description: 'Contract end date',
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;
}
