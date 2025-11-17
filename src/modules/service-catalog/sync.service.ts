import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ServiceStatus,
  ServiceType,
  ServiceCategory,
  ServiceCatalog,
} from '@prisma/client';
import { ServiceCatalogService } from './service-catalog.service';

/**
 * Service Catalog Sync Service
 *
 * Handles synchronization of service catalog data from external systems.
 * Processes events: service.created, service.updated, service.deprecated
 * Implements breaking change detection and checksum validation.
 */
@Injectable()
export class ServiceCatalogSyncService {
  private readonly logger = new Logger(ServiceCatalogSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceCatalogService: ServiceCatalogService,
  ) {}

  /**
   * Handle service.created event
   * @param data - Service data from external system
   * @returns Created service
   */
  async handleServiceCreated(data: any): Promise<ServiceCatalog> {
    this.logger.log(`📝 Creating service: ${data.externalServiceCode}`);

    // Check if already exists (race condition protection)
    const existing = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (existing) {
      this.logger.warn(
        `⚠️  Service ${data.externalServiceCode} already exists, treating as update`,
      );
      return this.handleServiceUpdated(data);
    }

    // Map external data to internal format
    const serviceData = this.mapExternalToInternal(data);

    // Generate FSM internal code
    const fsmServiceCode = this.generateFsmCode(data);

    // Compute checksum for drift detection
    const syncChecksum = this.serviceCatalogService.computeChecksum({
      externalServiceCode: data.externalServiceCode,
      serviceType: serviceData.serviceType,
      serviceCategory: serviceData.serviceCategory,
      name: serviceData.name,
      description: serviceData.description,
      scopeIncluded: serviceData.scopeIncluded,
      scopeExcluded: serviceData.scopeExcluded,
      worksiteRequirements: serviceData.worksiteRequirements,
      productPrerequisites: serviceData.productPrerequisites,
      estimatedDurationMinutes: serviceData.estimatedDurationMinutes,
    });

    // Create service
    const service = await this.prisma.serviceCatalog.create({
      data: {
        externalServiceCode: data.externalServiceCode,
        fsmServiceCode,
        externalSource: data.source || 'PYXIS',
        countryCode: data.countryCode,
        businessUnit: data.businessUnit,
        serviceType: serviceData.serviceType,
        serviceCategory: serviceData.serviceCategory,
        name: serviceData.name,
        description: serviceData.description,
        scopeIncluded: serviceData.scopeIncluded,
        scopeExcluded: serviceData.scopeExcluded,
        worksiteRequirements: serviceData.worksiteRequirements,
        productPrerequisites: serviceData.productPrerequisites,
        estimatedDurationMinutes: serviceData.estimatedDurationMinutes,
        requiresPreServiceContract: data.contractType === 'pre_service',
        requiresPostServiceWCF: true,
        status: ServiceStatus.ACTIVE,
        syncChecksum,
        lastSyncedAt: new Date(),
        createdBy: 'SYNC_JOB',
        updatedBy: 'SYNC_JOB',
      },
    });

    this.logger.log(
      `✅ Service created: ${service.fsmServiceCode} (${service.id})`,
    );

    return service;
  }

  /**
   * Handle service.updated event
   * @param data - Updated service data from external system
   * @returns Updated service
   */
  async handleServiceUpdated(data: any): Promise<ServiceCatalog> {
    this.logger.log(`📝 Updating service: ${data.externalServiceCode}`);

    const existing = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (!existing) {
      this.logger.warn(
        `⚠️  Service ${data.externalServiceCode} not found, creating new`,
      );
      return this.handleServiceCreated(data);
    }

    // Map external data to internal format
    const serviceData = this.mapExternalToInternal(data);

    // Check for breaking changes
    const hasBreakingChanges = this.serviceCatalogService.detectBreakingChanges(
      existing,
      serviceData,
    );

    if (hasBreakingChanges) {
      this.logger.warn(
        `⚠️  Breaking changes detected for ${data.externalServiceCode}`,
      );
      // TODO: Create pending change record for manual review
      // For now, we'll apply the changes but log the warning
    }

    // Compute new checksum
    const syncChecksum = this.serviceCatalogService.computeChecksum({
      externalServiceCode: data.externalServiceCode,
      serviceType: serviceData.serviceType,
      serviceCategory: serviceData.serviceCategory,
      name: serviceData.name,
      description: serviceData.description,
      scopeIncluded: serviceData.scopeIncluded,
      scopeExcluded: serviceData.scopeExcluded,
      worksiteRequirements: serviceData.worksiteRequirements,
      productPrerequisites: serviceData.productPrerequisites,
      estimatedDurationMinutes: serviceData.estimatedDurationMinutes,
    });

    // Update service
    const updated = await this.prisma.serviceCatalog.update({
      where: { id: existing.id },
      data: {
        name: serviceData.name,
        description: serviceData.description,
        scopeIncluded: serviceData.scopeIncluded,
        scopeExcluded: serviceData.scopeExcluded,
        worksiteRequirements: serviceData.worksiteRequirements,
        productPrerequisites: serviceData.productPrerequisites,
        estimatedDurationMinutes: serviceData.estimatedDurationMinutes,
        syncChecksum,
        lastSyncedAt: new Date(),
        updatedBy: 'SYNC_JOB',
      },
    });

    this.logger.log(`✅ Service updated: ${updated.fsmServiceCode}`);

    return updated;
  }

  /**
   * Handle service.deprecated event
   * @param data - Service deprecation data
   * @returns Deprecated service
   */
  async handleServiceDeprecated(data: any): Promise<ServiceCatalog> {
    this.logger.log(`📝 Deprecating service: ${data.externalServiceCode}`);

    const service = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (!service) {
      this.logger.error(
        `❌ Cannot deprecate: service ${data.externalServiceCode} not found`,
      );
      throw new Error(`Service ${data.externalServiceCode} not found`);
    }

    if (service.status === ServiceStatus.DEPRECATED) {
      this.logger.warn(
        `⚠️  Service ${data.externalServiceCode} already deprecated`,
      );
      return service;
    }

    // Deprecate service
    const deprecated = await this.prisma.serviceCatalog.update({
      where: { id: service.id },
      data: {
        status: ServiceStatus.DEPRECATED,
        deprecatedAt: new Date(),
        deprecationReason: data.reason || 'Deprecated by external system',
        lastSyncedAt: new Date(),
        updatedBy: 'SYNC_JOB',
      },
    });

    this.logger.log(`✅ Service deprecated: ${deprecated.fsmServiceCode}`);

    return deprecated;
  }

  /**
   * Map external system data format to internal schema
   * @param data - External service data
   * @returns Internal service data format
   */
  private mapExternalToInternal(data: any) {
    return {
      serviceType: this.mapServiceType(data.type),
      serviceCategory: this.mapServiceCategory(data.category),
      name: this.extractLocalizedString(data.name),
      description: this.extractLocalizedString(data.description),
      scopeIncluded: Array.isArray(data.scopeIncluded)
        ? data.scopeIncluded
        : [],
      scopeExcluded: Array.isArray(data.scopeExcluded)
        ? data.scopeExcluded
        : [],
      worksiteRequirements: Array.isArray(data.worksiteRequirements)
        ? data.worksiteRequirements
        : [],
      productPrerequisites: Array.isArray(data.productPrerequisites)
        ? data.productPrerequisites
        : [],
      estimatedDurationMinutes: data.estimatedDuration || 60,
    };
  }

  /**
   * Generate FSM internal service code
   * @param data - External service data
   * @returns FSM service code (e.g., ES_HVAC_00123)
   */
  private generateFsmCode(data: any): string {
    const category = this.mapServiceCategory(data.category)
      .substring(0, 4)
      .toUpperCase();
    const timestamp = Date.now().toString().slice(-5);
    return `${data.countryCode}_${category}_${timestamp}`;
  }

  /**
   * Map external service type to internal enum
   * @param clientType - External service type string
   * @returns Internal ServiceType enum value
   */
  private mapServiceType(clientType: string): ServiceType {
    const mapping: Record<string, ServiceType> = {
      installation: ServiceType.INSTALLATION,
      confirmation_visit: ServiceType.CONFIRMATION_TV,
      quotation_visit: ServiceType.QUOTATION_TV,
      maintenance: ServiceType.MAINTENANCE,
      rework: ServiceType.REWORK,
      complex: ServiceType.COMPLEX,
    };

    return (
      mapping[clientType?.toLowerCase()] || ServiceType.INSTALLATION
    );
  }

  /**
   * Map external service category to internal enum
   * @param clientCategory - External service category string
   * @returns Internal ServiceCategory enum value
   */
  private mapServiceCategory(clientCategory: string): ServiceCategory {
    const mapping: Record<string, ServiceCategory> = {
      hvac: ServiceCategory.HVAC,
      plumbing: ServiceCategory.PLUMBING,
      electrical: ServiceCategory.ELECTRICAL,
      appliance: ServiceCategory.OTHER,
      kitchen: ServiceCategory.KITCHEN,
      bathroom: ServiceCategory.BATHROOM,
      flooring: ServiceCategory.FLOORING,
      painting: ServiceCategory.OTHER,
      windows: ServiceCategory.WINDOWS_DOORS,
      doors: ServiceCategory.WINDOWS_DOORS,
      garden: ServiceCategory.GARDEN,
      furniture: ServiceCategory.FURNITURE,
      general: ServiceCategory.OTHER,
    };

    return (
      mapping[clientCategory?.toLowerCase()] ||
      ServiceCategory.OTHER
    );
  }

  /**
   * Extract localized string from i18n object
   * Uses country code to select appropriate language
   * @param i18nObject - Object with language keys (es, fr, it, pl, en)
   * @returns Localized string or first available value
   */
  private extractLocalizedString(i18nObject: any): string {
    if (typeof i18nObject === 'string') {
      return i18nObject;
    }

    if (!i18nObject || typeof i18nObject !== 'object') {
      return '';
    }

    // Try common languages in priority order
    const languages = ['en', 'es', 'fr', 'it', 'pl'];

    for (const lang of languages) {
      if (i18nObject[lang]) {
        return i18nObject[lang];
      }
    }

    // Return first available value
    const firstValue = Object.values(i18nObject)[0];
    return typeof firstValue === 'string' ? firstValue : '';
  }
}
