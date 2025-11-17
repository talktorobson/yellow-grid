import { IsString, IsNotEmpty, IsDate, IsObject, IsEnum, ValidateNested, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Kafka event types for service catalog synchronization
 */
export enum ServiceCatalogEventType {
  SERVICE_CREATED = 'service.created',
  SERVICE_UPDATED = 'service.updated',
  SERVICE_DEPRECATED = 'service.deprecated',
}

/**
 * I18n name translations
 */
export class ServiceNameI18n {
  @IsString()
  @IsOptional()
  es?: string;

  @IsString()
  @IsOptional()
  fr?: string;

  @IsString()
  @IsOptional()
  it?: string;

  @IsString()
  @IsOptional()
  pl?: string;

  @IsString()
  @IsOptional()
  en?: string;
}

/**
 * Service catalog event payload data
 */
export class ServiceCatalogEventData {
  @IsString()
  @IsNotEmpty()
  externalServiceCode: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  businessUnit: string;

  @IsString()
  @IsNotEmpty()
  type: string; // installation, confirmation_visit, quotation_visit, etc.

  @IsString()
  @IsNotEmpty()
  category: string; // hvac, plumbing, electrical, etc.

  @ValidateNested()
  @Type(() => ServiceNameI18n)
  name: ServiceNameI18n;

  @ValidateNested()
  @Type(() => ServiceNameI18n)
  description: ServiceNameI18n;

  @ValidateNested()
  @Type(() => ServiceNameI18n)
  @IsOptional()
  shortDescription?: ServiceNameI18n;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopeIncluded?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopeExcluded?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  worksiteRequirements?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productPrerequisites?: string[];

  @IsString()
  @IsOptional()
  contractType?: string; // pre_service, post_service

  @IsNumber()
  @IsOptional()
  estimatedDuration?: number; // minutes

  @IsString()
  @IsOptional()
  complexity?: string; // LOW, MEDIUM, HIGH

  @IsBoolean()
  @IsOptional()
  requiresTechnicalVisit?: boolean;

  @IsString()
  @IsOptional()
  effectiveFrom?: string; // ISO 8601 date

  @IsString()
  @IsOptional()
  effectiveTo?: string; // ISO 8601 date

  @IsString()
  @IsOptional()
  version?: string;

  // Additional fields for deprecation events
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  replacementServiceCode?: string;
}

/**
 * Complete Kafka event payload
 */
export class ServiceCatalogKafkaEvent {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsEnum(ServiceCatalogEventType)
  @IsNotEmpty()
  eventType: ServiceCatalogEventType;

  @IsString()
  @IsNotEmpty()
  eventTimestamp: string; // ISO 8601

  @IsString()
  @IsNotEmpty()
  source: string; // PYXIS, TEMPO, SAP

  @IsString()
  @IsOptional()
  version?: string;

  @ValidateNested()
  @Type(() => ServiceCatalogEventData)
  @IsNotEmpty()
  data: ServiceCatalogEventData;
}
