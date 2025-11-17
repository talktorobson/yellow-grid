import { IsString, IsEnum, IsArray, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ServiceType, ServiceCategory } from '@prisma/client';

/**
 * Base structure for service catalog events from external systems
 */
export interface ServiceEventPayload {
  eventId: string;
  eventType: 'service.created' | 'service.updated' | 'service.deprecated';
  timestamp: string;
  source: string;
  data: ServiceEventData;
}

/**
 * Service data from external event
 */
export interface ServiceEventData {
  externalServiceCode: string;
  countryCode: string;
  businessUnit: string;
  type: string; // Will map to ServiceType enum
  category: string; // Will map to ServiceCategory enum
  name: string;
  description?: string;
  scopeIncluded: string[];
  scopeExcluded: string[];
  worksiteRequirements: string[];
  productPrerequisites: string[];
  estimatedDurationMinutes: number;
  requiresPreServiceContract: boolean;
  requiresPostServiceWCF: boolean;
  contractTemplateCode?: string;
  deprecationReason?: string; // Only for deprecated events
}

/**
 * Service event DTO for validation
 */
export class ServiceEventDto {
  @IsString()
  eventId: string;

  @IsEnum(['service.created', 'service.updated', 'service.deprecated'])
  eventType: 'service.created' | 'service.updated' | 'service.deprecated';

  @IsString()
  timestamp: string;

  @IsString()
  source: string;

  data: ServiceEventDataDto;
}

export class ServiceEventDataDto {
  @IsString()
  externalServiceCode: string;

  @IsString()
  countryCode: string;

  @IsString()
  businessUnit: string;

  @IsString()
  type: string;

  @IsString()
  category: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  scopeIncluded: string[];

  @IsArray()
  @IsString({ each: true })
  scopeExcluded: string[];

  @IsArray()
  @IsString({ each: true })
  worksiteRequirements: string[];

  @IsArray()
  @IsString({ each: true })
  productPrerequisites: string[];

  @IsNumber()
  estimatedDurationMinutes: number;

  @IsBoolean()
  requiresPreServiceContract: boolean;

  @IsBoolean()
  requiresPostServiceWCF: boolean;

  @IsString()
  @IsOptional()
  contractTemplateCode?: string;

  @IsString()
  @IsOptional()
  deprecationReason?: string;
}

/**
 * Type mapping utilities
 */
export class ServiceEventMapper {
  /**
   * Map external service type string to ServiceType enum
   */
  static mapServiceType(externalType: string): ServiceType {
    const mapping: Record<string, ServiceType> = {
      installation: 'INSTALLATION',
      confirmation_tv: 'CONFIRMATION_TV',
      quotation_tv: 'QUOTATION_TV',
      maintenance: 'MAINTENANCE',
      rework: 'REWORK',
      complex: 'COMPLEX',
    };

    const normalized = externalType.toLowerCase();
    if (!mapping[normalized]) {
      throw new Error(`Unknown service type: ${externalType}`);
    }

    return mapping[normalized];
  }

  /**
   * Map external category string to ServiceCategory enum
   */
  static mapServiceCategory(externalCategory: string): ServiceCategory {
    const mapping: Record<string, ServiceCategory> = {
      hvac: 'HVAC',
      plumbing: 'PLUMBING',
      electrical: 'ELECTRICAL',
      kitchen: 'KITCHEN',
      bathroom: 'BATHROOM',
      flooring: 'FLOORING',
      windows_doors: 'WINDOWS_DOORS',
      garden: 'GARDEN',
      furniture: 'FURNITURE',
      other: 'OTHER',
    };

    const normalized = externalCategory.toLowerCase();
    if (!mapping[normalized]) {
      throw new Error(`Unknown service category: ${externalCategory}`);
    }

    return mapping[normalized];
  }
}
