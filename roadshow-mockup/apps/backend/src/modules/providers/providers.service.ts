import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProviderRiskStatus, CountryCode } from '../../common/types/schema.types';

export interface CreateProviderDto {
  name: string;
  countryCode: CountryCode;
  buCode?: string;
  legalName?: string;
  siret?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  tier?: number; // 1, 2, or 3 (default 2)
  active?: boolean;
  certifications?: Array<{
    code: string;
    name: string;
    expiresAt?: Date;
  }>;
}

export interface UpdateProviderDto {
  name?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  tier?: number;
  active?: boolean;
}

export interface SuspendProviderDto {
  reason: string;
  suspendedFrom?: Date;
  suspendedUntil?: Date;
}

export interface AddCertificationDto {
  code: string;
  name: string;
  expiresAt?: Date;
}

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all providers with filters
   */
  async findAll(
    pagination: PaginationDto,
    filters?: {
      countryCode?: CountryCode;
      buCode?: string;
      active?: boolean;
      tier?: number;
      riskStatus?: ProviderRiskStatus;
    }
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.countryCode) {
      where.countryCode = filters.countryCode;
    }

    if (filters?.buCode) {
      where.buCode = filters.buCode;
    }

    if (filters?.active !== undefined) {
      where.active = filters.active;
    }

    if (filters?.tier) {
      where.tier = filters.tier;
    }

    if (filters?.riskStatus) {
      where.riskStatus = filters.riskStatus;
    }

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        include: {
          workTeams: {
            select: {
              id: true,
              name: true,
              active: true,
            },
          },
          zones: {
            select: {
              id: true,
              name: true,
              postalCodes: true,
            },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data: providers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get provider by ID with full details
   */
  async findOne(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        workTeams: {
          include: {
            _count: {
              select: {
                assignments: true,
              },
            },
          },
        },
        zones: true,
        assignments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            serviceOrder: {
              select: {
                id: true,
                externalId: true,
                serviceType: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignments: true,
            workTeams: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    // Parse certifications from JSON
    const parsedProvider = {
      ...provider,
      certifications: provider.certifications
        ? JSON.parse(provider.certifications as string)
        : [],
    };

    return parsedProvider;
  }

  /**
   * Create a new provider
   */
  async create(data: CreateProviderDto) {
    // Validate tier (1, 2, or 3)
    if (data.tier && ![1, 2, 3].includes(data.tier)) {
      throw new BadRequestException('Tier must be 1, 2, or 3');
    }

    const provider = await this.prisma.provider.create({
      data: {
        name: data.name,
        countryCode: data.countryCode,
        buCode: data.buCode,
        legalName: data.legalName,
        siret: data.siret,
        email: data.email,
        phone: data.phone,
        contactName: data.contactName,
        tier: data.tier || 2, // Default to tier 2
        active: data.active ?? true,
        riskStatus: ProviderRiskStatus.OK,
        rating: 0,
        certifications: data.certifications ? JSON.stringify(data.certifications) : null,
      },
      include: {
        workTeams: true,
        zones: true,
      },
    });

    return provider;
  }

  /**
   * Update provider
   */
  async update(id: string, data: UpdateProviderDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    // Validate tier if provided
    if (data.tier && ![1, 2, 3].includes(data.tier)) {
      throw new BadRequestException('Tier must be 1, 2, or 3');
    }

    const updated = await this.prisma.provider.update({
      where: { id },
      data,
      include: {
        workTeams: true,
        zones: true,
      },
    });

    return updated;
  }

  /**
   * Delete provider (soft delete by setting active = false)
   */
  async remove(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    // Check if provider has active assignments
    const activeAssignments = await this.prisma.assignment.count({
      where: {
        providerId: id,
        status: {
          in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeAssignments > 0) {
      throw new BadRequestException(
        `Cannot delete provider with ${activeAssignments} active assignments. Suspend instead.`
      );
    }

    // Soft delete
    await this.prisma.provider.update({
      where: { id },
      data: {
        active: false,
      },
    });

    return { deleted: true, soft: true };
  }

  // ==================== TIER MANAGEMENT ====================

  /**
   * Update provider tier (1 = best, 2 = standard, 3 = lower)
   */
  async updateTier(id: string, tier: number) {
    if (![1, 2, 3].includes(tier)) {
      throw new BadRequestException('Tier must be 1, 2, or 3');
    }

    const provider = await this.prisma.provider.update({
      where: { id },
      data: { tier },
    });

    return provider;
  }

  /**
   * Get providers by tier
   */
  async getProvidersByTier(tier: number, countryCode?: CountryCode) {
    const where: any = { tier };

    if (countryCode) {
      where.countryCode = countryCode;
    }

    return this.prisma.provider.findMany({
      where,
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
    });
  }

  // ==================== RISK MANAGEMENT ====================

  /**
   * Suspend provider
   */
  async suspend(id: string, data: SuspendProviderDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    const suspendedFrom = data.suspendedFrom || new Date();
    const suspendedUntil = data.suspendedUntil;

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        riskStatus: ProviderRiskStatus.SUSPENDED,
        riskReason: data.reason,
        suspendedFrom,
        suspendedUntil,
        active: false, // Suspend means inactive
      },
    });

    // TODO: Cancel all pending assignments
    // TODO: Send notification to provider
    // TODO: Create alert for affected service orders

    return updated;
  }

  /**
   * Unsuspend provider (lift suspension)
   */
  async unsuspend(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    if (provider.riskStatus !== ProviderRiskStatus.SUSPENDED) {
      throw new BadRequestException('Provider is not suspended');
    }

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        riskStatus: ProviderRiskStatus.OK,
        riskReason: null,
        suspendedFrom: null,
        suspendedUntil: null,
        active: true,
      },
    });

    return updated;
  }

  /**
   * Put provider on watch (warning status)
   */
  async putOnWatch(id: string, reason: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        riskStatus: ProviderRiskStatus.ON_WATCH,
        riskReason: reason,
      },
    });

    // TODO: Send notification to provider
    // TODO: Create task for operator to monitor

    return updated;
  }

  /**
   * Clear watch status (back to OK)
   */
  async clearWatch(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        riskStatus: ProviderRiskStatus.OK,
        riskReason: null,
      },
    });

    return updated;
  }

  // ==================== CERTIFICATIONS ====================

  /**
   * Add certification to provider
   */
  async addCertification(id: string, certification: AddCertificationDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    const existingCerts = provider.certifications
      ? JSON.parse(provider.certifications as string)
      : [];

    // Check if certification already exists
    const certExists = existingCerts.some((cert: any) => cert.code === certification.code);

    if (certExists) {
      throw new BadRequestException(
        `Certification ${certification.code} already exists for this provider`
      );
    }

    const updatedCerts = [...existingCerts, certification];

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        certifications: JSON.stringify(updatedCerts),
      },
    });

    return {
      ...updated,
      certifications: updatedCerts,
    };
  }

  /**
   * Remove certification from provider
   */
  async removeCertification(id: string, certificationCode: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    const existingCerts = provider.certifications
      ? JSON.parse(provider.certifications as string)
      : [];

    const updatedCerts = existingCerts.filter((cert: any) => cert.code !== certificationCode);

    const updated = await this.prisma.provider.update({
      where: { id },
      data: {
        certifications: JSON.stringify(updatedCerts),
      },
    });

    return {
      ...updated,
      certifications: updatedCerts,
    };
  }

  /**
   * Get providers with expiring certifications
   */
  async getProvidersWithExpiringCertifications(daysFromNow: number = 30) {
    const providers = await this.prisma.provider.findMany({
      where: {
        active: true,
        certifications: {
          not: null,
        },
      },
    });

    const expiringThreshold = new Date();
    expiringThreshold.setDate(expiringThreshold.getDate() + daysFromNow);

    const providersWithExpiring = providers
      .map((provider: any) => {
        const certs = provider.certifications ? JSON.parse(provider.certifications) : [];
        const expiringCerts = certs.filter((cert: any) => {
          if (!cert.expiresAt) return false;
          const expiresAt = new Date(cert.expiresAt);
          return expiresAt <= expiringThreshold;
        });

        if (expiringCerts.length > 0) {
          return {
            ...provider,
            certifications: certs,
            expiringCertifications: expiringCerts,
          };
        }

        return null;
      })
      .filter((p: any) => p !== null);

    return providersWithExpiring;
  }

  // ==================== STATISTICS ====================

  /**
   * Get provider statistics
   */
  async getProviderStats(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            serviceOrder: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    const totalAssignments = provider.assignments.length;
    const acceptedAssignments = provider.assignments.filter(
      (a: any) => ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(a.status)
    ).length;
    const completedJobs = provider.assignments.filter(
      (a: any) => a.serviceOrder.status === 'COMPLETED'
    ).length;

    return {
      provider: {
        id: provider.id,
        name: provider.name,
        tier: provider.tier,
        riskStatus: provider.riskStatus,
        rating: provider.rating,
      },
      metrics: {
        totalAssignments,
        acceptedAssignments,
        completedJobs,
        acceptanceRate:
          totalAssignments > 0 ? (acceptedAssignments / totalAssignments) * 100 : 0,
        completionRate:
          acceptedAssignments > 0 ? (completedJobs / acceptedAssignments) * 100 : 0,
      },
    };
  }
}
