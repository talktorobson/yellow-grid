import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServiceStatus, ServiceType, ServiceCategory } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Service Catalog Service
 *
 * Main CRUD service for service catalog management.
 * Handles service lifecycle, sync checksum computation, and status transitions.
 */
@Injectable()
export class ServiceCatalogService {
  private readonly logger = new Logger(ServiceCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find service by external service code (from sales system)
   * @param externalServiceCode - External service code (e.g., PYX_ES_HVAC_001)
   * @returns Service with all relations
   */
  async findByExternalCode(externalServiceCode: string) {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode },
      include: {
        contractTemplate: true,
        pricing: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          },
          include: {
            postalCode: {
              include: {
                city: {
                  include: {
                    province: {
                      include: {
                        country: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(
        `Service with external code ${externalServiceCode} not found`,
      );
    }

    return service;
  }

  /**
   * Find service by FSM internal code
   * @param fsmServiceCode - FSM internal service code (e.g., SVC_ES_001)
   * @returns Service with all relations
   */
  async findByFSMCode(fsmServiceCode: string) {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { fsmServiceCode },
      include: {
        contractTemplate: true,
        pricing: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(
        `Service with FSM code ${fsmServiceCode} not found`,
      );
    }

    return service;
  }

  /**
   * Find service by ID
   * @param id - Service UUID
   * @returns Service with all relations
   */
  async findById(id: string) {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id },
      include: {
        contractTemplate: true,
        pricing: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  /**
   * Find all services for a country/business unit
   * @param countryCode - Country code (ES, FR, IT, PL)
   * @param businessUnit - Business unit code
   * @param filters - Optional filters
   * @returns List of services
   */
  async findAll(
    countryCode: string,
    businessUnit: string,
    filters?: {
      serviceType?: ServiceType;
      serviceCategory?: ServiceCategory;
      status?: ServiceStatus;
      externalSource?: string;
    },
  ) {
    const where: any = {
      countryCode,
      businessUnit,
    };

    if (filters?.serviceType) {
      where.serviceType = filters.serviceType;
    }

    if (filters?.serviceCategory) {
      where.serviceCategory = filters.serviceCategory;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.externalSource) {
      where.externalSource = filters.externalSource;
    }

    return this.prisma.serviceCatalog.findMany({
      where,
      include: {
        contractTemplate: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
      orderBy: [{ serviceCategory: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Search services by name or description
   * @param searchTerm - Search term
   * @param countryCode - Country code
   * @param businessUnit - Business unit code
   * @param limit - Maximum results to return (default: 20)
   * @returns List of matching services
   */
  async search(
    searchTerm: string,
    countryCode: string,
    businessUnit: string,
    limit: number = 20,
  ) {
    return this.prisma.serviceCatalog.findMany({
      where: {
        countryCode,
        businessUnit,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        contractTemplate: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new service (typically from sync events or manual entry)
   * @param serviceData - Service creation data
   * @returns Created service
   */
  async create(serviceData: {
    externalServiceCode: string;
    fsmServiceCode: string;
    externalSource: string;
    countryCode: string;
    businessUnit: string;
    serviceType: ServiceType;
    serviceCategory: ServiceCategory;
    name: string;
    description?: string;
    scopeIncluded: string[];
    scopeExcluded: string[];
    worksiteRequirements: string[];
    productPrerequisites: string[];
    estimatedDurationMinutes: number;
    requiresPreServiceContract: boolean;
    requiresPostServiceWCF: boolean;
    contractTemplateId?: string;
    createdBy: string;
  }) {
    // Check for duplicate external service code
    const existing = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: serviceData.externalServiceCode },
    });

    if (existing) {
      throw new ConflictException(
        `Service with external code ${serviceData.externalServiceCode} already exists`,
      );
    }

    // Compute sync checksum
    const syncChecksum = this.computeChecksum(serviceData);

    // Create service
    return this.prisma.serviceCatalog.create({
      data: {
        ...serviceData,
        status: ServiceStatus.CREATED,
        syncChecksum,
        lastSyncedAt: new Date(),
      },
      include: {
        contractTemplate: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing service
   * @param id - Service UUID
   * @param updateData - Service update data
   * @param updatedBy - User who updated the service
   * @returns Updated service
   */
  async update(
    id: string,
    updateData: Partial<{
      name: string;
      description: string;
      scopeIncluded: string[];
      scopeExcluded: string[];
      worksiteRequirements: string[];
      productPrerequisites: string[];
      estimatedDurationMinutes: number;
      requiresPreServiceContract: boolean;
      requiresPostServiceWCF: boolean;
      contractTemplateId: string;
    }>,
    updatedBy: string,
  ) {
    // Verify service exists
    await this.findById(id);

    // Update service
    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        ...updateData,
        updatedBy,
      },
      include: {
        contractTemplate: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });
  }

  /**
   * Activate a service (transition to ACTIVE status)
   * @param id - Service UUID
   * @param updatedBy - User who activated the service
   * @returns Updated service
   */
  async activate(id: string, updatedBy: string) {
    const service = await this.findById(id);

    if (service.status === ServiceStatus.ACTIVE) {
      throw new BadRequestException(`Service ${id} is already active`);
    }

    if (service.status === ServiceStatus.DEPRECATED) {
      throw new BadRequestException(
        `Cannot activate a deprecated service. Create a new service instead.`,
      );
    }

    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        status: ServiceStatus.ACTIVE,
        updatedBy,
      },
      include: {
        contractTemplate: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });
  }

  /**
   * Deprecate a service (can have active orders but no new orders)
   * @param id - Service UUID
   * @param reason - Deprecation reason
   * @param updatedBy - User who deprecated the service
   * @returns Updated service
   */
  async deprecate(id: string, reason: string, updatedBy: string) {
    const service = await this.findById(id);

    if (service.status === ServiceStatus.DEPRECATED) {
      throw new BadRequestException(`Service ${id} is already deprecated`);
    }

    this.logger.log(`Deprecating service ${id}: ${reason}`);

    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        status: ServiceStatus.DEPRECATED,
        deprecatedAt: new Date(),
        deprecationReason: reason,
        updatedBy,
      },
      include: {
        contractTemplate: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });
  }

  /**
   * Archive a service (fully archived, no active orders remain)
   * @param id - Service UUID
   * @param updatedBy - User who archived the service
   * @returns Updated service
   */
  async archive(id: string, updatedBy: string) {
    const service = await this.findById(id);

    if (service.status !== ServiceStatus.DEPRECATED) {
      throw new BadRequestException(
        `Service must be deprecated before archiving. Current status: ${service.status}`,
      );
    }

    // TODO: Check if there are any active service orders using this service
    // For now, we'll allow archiving if deprecated

    this.logger.log(`Archiving service ${id}`);

    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        status: ServiceStatus.ARCHIVED,
        updatedBy,
      },
      include: {
        contractTemplate: true,
        skillRequirements: {
          include: {
            specialty: true,
          },
        },
      },
    });
  }

  /**
   * Compute checksum for sync tracking
   * @param serviceData - Service data to hash
   * @returns SHA256 checksum
   */
  computeChecksum(serviceData: {
    externalServiceCode: string;
    serviceType: ServiceType;
    serviceCategory: ServiceCategory;
    name: string;
    description?: string;
    scopeIncluded: string[];
    scopeExcluded: string[];
    worksiteRequirements: string[];
    productPrerequisites: string[];
    estimatedDurationMinutes: number;
  }): string {
    // Create canonical representation for hashing
    const canonical = {
      externalServiceCode: serviceData.externalServiceCode,
      serviceType: serviceData.serviceType,
      serviceCategory: serviceData.serviceCategory,
      name: serviceData.name,
      description: serviceData.description || '',
      scopeIncluded: serviceData.scopeIncluded.sort(),
      scopeExcluded: serviceData.scopeExcluded.sort(),
      worksiteRequirements: serviceData.worksiteRequirements.sort(),
      productPrerequisites: serviceData.productPrerequisites.sort(),
      estimatedDurationMinutes: serviceData.estimatedDurationMinutes,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(canonical))
      .digest('hex');
  }

  /**
   * Detect breaking changes between existing and new service data
   * Used during sync to determine if manual review is needed
   * @param existingService - Current service from DB
   * @param newData - New service data from sync
   * @returns true if breaking changes detected
   */
  detectBreakingChanges(
    existingService: {
      scopeIncluded: any;
      scopeExcluded: any;
      worksiteRequirements: any;
      productPrerequisites: any;
    },
    newData: {
      scopeIncluded: string[];
      scopeExcluded: string[];
      worksiteRequirements: string[];
      productPrerequisites: string[];
    },
  ): boolean {
    // Breaking change: Items removed from scope included
    const existingIncluded = existingService.scopeIncluded as string[];
    const newIncluded = newData.scopeIncluded;
    const includedRemoved = existingIncluded.some(
      (item) => !newIncluded.includes(item),
    );

    // Breaking change: Items added to scope excluded
    const existingExcluded = existingService.scopeExcluded as string[];
    const newExcluded = newData.scopeExcluded;
    const excludedAdded = newExcluded.some(
      (item) => !existingExcluded.includes(item),
    );

    // Breaking change: New requirements added
    const existingRequirements =
      existingService.worksiteRequirements as string[];
    const newRequirements = newData.worksiteRequirements;
    const requirementsAdded = newRequirements.some(
      (item) => !existingRequirements.includes(item),
    );

    // Breaking change: New prerequisites added
    const existingPrereqs = existingService.productPrerequisites as string[];
    const newPrereqs = newData.productPrerequisites;
    const prereqsAdded = newPrereqs.some(
      (item) => !existingPrereqs.includes(item),
    );

    return (
      includedRemoved ||
      excludedAdded ||
      requirementsAdded ||
      prereqsAdded
    );
  }

  /**
   * Get service statistics for a country/business unit
   * @param countryCode - Country code
   * @param businessUnit - Business unit code
   * @returns Service statistics
   */
  async getStatistics(countryCode: string, businessUnit: string) {
    const [
      total,
      active,
      deprecated,
      archived,
      byType,
      byCategory,
      byExternalSource,
    ] = await Promise.all([
      this.prisma.serviceCatalog.count({
        where: { countryCode, businessUnit },
      }),
      this.prisma.serviceCatalog.count({
        where: { countryCode, businessUnit, status: ServiceStatus.ACTIVE },
      }),
      this.prisma.serviceCatalog.count({
        where: { countryCode, businessUnit, status: ServiceStatus.DEPRECATED },
      }),
      this.prisma.serviceCatalog.count({
        where: { countryCode, businessUnit, status: ServiceStatus.ARCHIVED },
      }),
      this.prisma.serviceCatalog.groupBy({
        by: ['serviceType'],
        where: { countryCode, businessUnit },
        _count: true,
      }),
      this.prisma.serviceCatalog.groupBy({
        by: ['serviceCategory'],
        where: { countryCode, businessUnit },
        _count: true,
      }),
      this.prisma.serviceCatalog.groupBy({
        by: ['externalSource'],
        where: { countryCode, businessUnit },
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: {
        active,
        deprecated,
        archived,
      },
      byType: byType.map((item) => ({
        type: item.serviceType,
        count: item._count,
      })),
      byCategory: byCategory.map((item) => ({
        category: item.serviceCategory,
        count: item._count,
      })),
      byExternalSource: byExternalSource.map((item) => ({
        source: item.externalSource,
        count: item._count,
      })),
    };
  }
}
