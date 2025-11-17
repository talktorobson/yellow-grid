import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ServiceStatus,
  ServiceType,
  ServiceCategory,
} from '@prisma/client';
import * as crypto from 'crypto';
import { ServiceCatalogEventData } from '../dto/kafka-event.dto';

/**
 * Service for synchronizing service catalog data from external systems
 * Handles create, update, and deprecate operations
 */
@Injectable()
export class ServiceCatalogSyncService {
  private readonly logger = new Logger(ServiceCatalogSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle service.created event
   */
  async handleServiceCreated(data: ServiceCatalogEventData, eventLogId: string): Promise<void> {
    this.logger.log(`Creating service: ${data.externalServiceCode}`);

    // Check if already exists (race condition protection)
    const existing = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (existing) {
      this.logger.warn(
        `Service ${data.externalServiceCode} already exists, treating as update`
      );
      return this.handleServiceUpdated(data, eventLogId);
    }

    // Get contract template
    const contractTemplateId = await this.resolveContractTemplate(
      data.contractType,
      data.countryCode
    );

    // Create service
    const service = await this.prisma.serviceCatalog.create({
      data: {
        externalServiceCode: data.externalServiceCode,
        externalSource: data.countryCode === 'ES' || data.countryCode === 'IT' ? 'PYXIS' : 'TEMPO',
        fsmServiceCode: this.generateFsmCode(data),

        serviceType: this.mapServiceType(data.type),
        serviceCategory: this.mapServiceCategory(data.category),

        // Use English name/description as default (i18n will be added in v2)
        name: data.name.en || data.name.es || Object.values(data.name)[0] || 'Unnamed Service',
        description: data.description?.en || data.description?.es || Object.values(data.description || {})[0] || null,

        scopeIncluded: data.scopeIncluded || [],
        scopeExcluded: data.scopeExcluded || [],
        worksiteRequirements: data.worksiteRequirements || [],
        productPrerequisites: data.productPrerequisites || [],

        contractTemplateId: contractTemplateId,

        estimatedDurationMinutes: data.estimatedDuration || 0,
        requiresPreServiceContract: data.contractType === 'pre_service',
        requiresPostServiceWCF: true,

        countryCode: data.countryCode,
        businessUnit: data.businessUnit,

        status: ServiceStatus.ACTIVE,

        lastSyncedAt: new Date(),
        syncChecksum: this.computeChecksum(data),

        createdBy: 'SYNC_JOB',
        updatedBy: 'SYNC_JOB',
      },
    });

    this.logger.log(`✅ Service created: ${service.fsmServiceCode} (${service.id})`);
  }

  /**
   * Handle service.updated event
   */
  async handleServiceUpdated(data: ServiceCatalogEventData, eventLogId: string): Promise<void> {
    this.logger.log(`Updating service: ${data.externalServiceCode}`);

    const existing = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (!existing) {
      this.logger.warn(
        `Service ${data.externalServiceCode} not found, creating new`
      );
      return this.handleServiceCreated(data, eventLogId);
    }

    // Check for breaking changes
    const hasBreakingChanges = this.detectBreakingChanges(existing, data);

    if (hasBreakingChanges) {
      this.logger.warn(
        `⚠️  Breaking changes detected for ${data.externalServiceCode}`
      );
      // TODO: Create pending change record for manual review
      // For now, we'll log and proceed with the update
    }

    // Update service
    const updated = await this.prisma.serviceCatalog.update({
      where: { id: existing.id },
      data: {
        name: data.name.en || data.name.es || Object.values(data.name)[0] || existing.name,
        description: data.description?.en || data.description?.es || Object.values(data.description || {})[0] || existing.description,

        scopeIncluded: (data.scopeIncluded || existing.scopeIncluded) as any,
        scopeExcluded: (data.scopeExcluded || existing.scopeExcluded) as any,
        worksiteRequirements: (data.worksiteRequirements || existing.worksiteRequirements) as any,
        productPrerequisites: (data.productPrerequisites || existing.productPrerequisites) as any,

        estimatedDurationMinutes: data.estimatedDuration || existing.estimatedDurationMinutes,

        lastSyncedAt: new Date(),
        syncChecksum: this.computeChecksum(data),

        updatedBy: 'SYNC_JOB',
      },
    });

    this.logger.log(`✅ Service updated: ${updated.fsmServiceCode}`);
  }

  /**
   * Handle service.deprecated event
   */
  async handleServiceDeprecated(data: ServiceCatalogEventData, eventLogId: string): Promise<void> {
    this.logger.log(`Deprecating service: ${data.externalServiceCode}`);

    const service = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (!service) {
      this.logger.error(
        `Cannot deprecate: service ${data.externalServiceCode} not found`
      );
      throw new Error('Service not found');
    }

    // Note: ServiceOrder model may not exist yet, skip active orders check for now
    // TODO: Re-enable when ServiceOrder model is implemented
    // const activeOrdersCount = await this.prisma.serviceOrder.count({
    //   where: {
    //     serviceId: service.id,
    //     status: { in: ['CREATED', 'SCHEDULED', 'ASSIGNED', 'DISPATCHED', 'IN_PROGRESS'] },
    //   },
    // });

    this.logger.warn(`⚠️  Deprecating service ${data.externalServiceCode}`);

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
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate FSM service code
   */
  private generateFsmCode(data: ServiceCatalogEventData): string {
    const category = this.mapServiceCategory(data.category).substring(0, 4).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${data.countryCode}_${category}_${timestamp}${random}`;
  }

  /**
   * Map external service type to internal enum
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
    return mapping[clientType] || ServiceType.INSTALLATION;
  }

  /**
   * Map external service category to internal enum
   */
  private mapServiceCategory(clientCategory: string): ServiceCategory {
    const mapping: Record<string, ServiceCategory> = {
      hvac: ServiceCategory.HVAC,
      plumbing: ServiceCategory.PLUMBING,
      electrical: ServiceCategory.ELECTRICAL,
      kitchen: ServiceCategory.KITCHEN,
      bathroom: ServiceCategory.BATHROOM,
      flooring: ServiceCategory.FLOORING,
      windows: ServiceCategory.WINDOWS_DOORS,
      doors: ServiceCategory.WINDOWS_DOORS,
      garden: ServiceCategory.GARDEN,
      furniture: ServiceCategory.FURNITURE,
      other: ServiceCategory.OTHER,
    };
    return mapping[clientCategory.toLowerCase()] || ServiceCategory.OTHER;
  }

  /**
   * Resolve contract template ID
   */
  private async resolveContractTemplate(
    contractType: string | undefined,
    countryCode: string
  ): Promise<string | null> {
    if (!contractType) return null;

    // Find a suitable contract template by code pattern
    // Contract templates are identified by code (e.g., INSTALL_STD_V1, TV_QUOTE_V2)
    const codePattern = contractType === 'pre_service' ? 'PRE_SERVICE' : 'POST_SERVICE';

    const template = await this.prisma.contractTemplate.findFirst({
      where: {
        code: { contains: codePattern },
        countryCode,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent template
      },
    });

    return template?.id || null;
  }

  /**
   * Compute checksum for drift detection
   */
  private computeChecksum(data: ServiceCatalogEventData): string {
    const relevantFields = {
      name: data.name,
      description: data.description,
      scopeIncluded: data.scopeIncluded || [],
      scopeExcluded: data.scopeExcluded || [],
      requirements: data.worksiteRequirements || [],
      prerequisites: data.productPrerequisites || [],
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(relevantFields))
      .digest('hex');
  }

  /**
   * Detect breaking changes between existing and incoming service data
   */
  private detectBreakingChanges(existing: any, incoming: ServiceCatalogEventData): boolean {
    // Breaking changes:
    // 1. Scope reduced (items removed from scopeIncluded)
    // 2. Requirements added (new worksiteRequirements)
    // 3. Prerequisites added (new productPrerequisites)

    const existingScope = Array.isArray(existing.scopeIncluded) ? existing.scopeIncluded : [];
    const incomingScope = incoming.scopeIncluded || [];

    const existingScopeSet = new Set<string>(existingScope);
    const incomingScopeSet = new Set<string>(incomingScope);

    // Check if any existing scope items were removed
    for (const item of existingScopeSet) {
      if (!incomingScopeSet.has(item)) {
        this.logger.warn(`Breaking change: scope item removed: ${item}`);
        return true; // Breaking: scope reduced
      }
    }

    // Check if new requirements were added
    const existingRequirements = new Set(existing.worksiteRequirements || []);
    const incomingRequirements = new Set(incoming.worksiteRequirements || []);

    for (const item of incomingRequirements) {
      if (!existingRequirements.has(item)) {
        this.logger.warn(`Breaking change: new requirement added: ${item}`);
        return true; // Breaking: new requirement
      }
    }

    // Check if new prerequisites were added
    const existingPrerequisites = new Set(existing.productPrerequisites || []);
    const incomingPrerequisites = new Set(incoming.productPrerequisites || []);

    for (const item of incomingPrerequisites) {
      if (!existingPrerequisites.has(item)) {
        this.logger.warn(`Breaking change: new prerequisite added: ${item}`);
        return true; // Breaking: new prerequisite
      }
    }

    return false;
  }

  /**
   * Find service by external code
   */
  private async findServiceByExternalCode(externalCode: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: externalCode },
    });
  }
}
