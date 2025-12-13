import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * I18n name/description object
 */
export class I18nText {
  @ApiPropertyOptional({ example: 'Instalación de Aire Acondicionado' })
  @IsString()
  @IsOptional()
  es?: string;

  @ApiPropertyOptional({ example: 'Installation de Climatisation' })
  @IsString()
  @IsOptional()
  fr?: string;

  @ApiPropertyOptional({ example: 'Installazione Aria Condizionata' })
  @IsString()
  @IsOptional()
  it?: string;

  @ApiPropertyOptional({ example: 'Instalacja Klimatyzacji' })
  @IsString()
  @IsOptional()
  pl?: string;

  @ApiPropertyOptional({ example: 'Air Conditioning Installation' })
  @IsString()
  @IsOptional()
  en?: string;
}

/**
 * DTO for creating a new service in the catalog
 */
export class CreateServiceDto {
  @ApiProperty({
    description: 'External service code from source system',
    example: 'PYX_ES_HVAC_00123',
  })
  @IsString()
  @IsNotEmpty()
  externalServiceCode: string;

  @ApiProperty({
    description: 'External system source',
    example: 'PYXIS',
    enum: ['PYXIS', 'TEMPO', 'SAP', 'FSM_CUSTOM'],
  })
  @IsString()
  @IsNotEmpty()
  externalSource: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'ES',
  })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({
    description: 'Business unit identifier',
    example: 'LM_ES',
  })
  @IsString()
  @IsNotEmpty()
  businessUnit: string;

  @ApiProperty({
    description: 'Service type',
    example: 'INSTALLATION',
    enum: ['INSTALLATION', 'CONFIRMATION_TV', 'QUOTATION_TV', 'MAINTENANCE', 'REWORK', 'COMPLEX'],
  })
  @IsEnum(['INSTALLATION', 'CONFIRMATION_TV', 'QUOTATION_TV', 'MAINTENANCE', 'REWORK', 'COMPLEX'])
  @IsNotEmpty()
  serviceType: string;

  @ApiProperty({
    description: 'Service category',
    example: 'HVAC',
    enum: [
      'HVAC',
      'PLUMBING',
      'ELECTRICAL',
      'KITCHEN',
      'BATHROOM',
      'FLOORING',
      'WINDOWS_DOORS',
      'GARDEN',
      'FURNITURE',
      'OTHER',
    ],
  })
  @IsEnum([
    'HVAC',
    'PLUMBING',
    'ELECTRICAL',
    'KITCHEN',
    'BATHROOM',
    'FLOORING',
    'WINDOWS_DOORS',
    'GARDEN',
    'FURNITURE',
    'OTHER',
  ])
  @IsNotEmpty()
  serviceCategory: string;

  @ApiProperty({
    description: 'Service name (multilingual)',
    type: I18nText,
  })
  @ValidateNested()
  @Type(() => I18nText)
  @IsNotEmpty()
  name: I18nText;

  @ApiPropertyOptional({
    description: 'Service description (multilingual)',
    type: I18nText,
  })
  @ValidateNested()
  @Type(() => I18nText)
  @IsOptional()
  description?: I18nText;

  @ApiPropertyOptional({
    description: 'What is included in the service scope',
    example: ['Remove old unit', 'Install new unit', 'System testing'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopeIncluded?: string[];

  @ApiPropertyOptional({
    description: 'What is explicitly excluded from service scope',
    example: ['Wall modifications', 'Electrical panel upgrades'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopeExcluded?: string[];

  @ApiPropertyOptional({
    description: 'Worksite requirements',
    example: ['Electrical outlet within 2 meters', 'Clear access to installation location'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  worksiteRequirements?: string[];

  @ApiPropertyOptional({
    description: 'Product prerequisites',
    example: ['AC unit delivered to site', 'Installation kit included'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productPrerequisites?: string[];

  @ApiPropertyOptional({
    description: 'Contract template ID',
    example: 'tpl-uuid-123',
  })
  @IsString()
  @IsOptional()
  contractTemplateId?: string;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 180,
  })
  @IsNumber()
  @IsNotEmpty()
  estimatedDurationMinutes: number;

  @ApiPropertyOptional({
    description: 'Requires pre-service contract',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresPreServiceContract?: boolean;

  @ApiPropertyOptional({
    description: 'Requires post-service Work Closing Form',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  requiresPostServiceWCF?: boolean;

  @ApiPropertyOptional({
    description: 'Service status',
    example: 'ACTIVE',
    enum: ['CREATED', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'],
    default: 'ACTIVE',
  })
  @IsEnum(['CREATED', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'])
  @IsOptional()
  status?: string;
}
