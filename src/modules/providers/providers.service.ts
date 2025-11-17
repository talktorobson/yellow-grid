import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
  QueryProvidersDto,
  CreateWorkTeamDto,
  UpdateWorkTeamDto,
  CreateTechnicianDto,
  UpdateTechnicianDto,
} from './dto';

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // PROVIDER CRUD
  // ============================================================================

  async createProvider(dto: CreateProviderDto, currentUserId: string) {
    // Check for duplicate external ID
    if (dto.externalId) {
      const existing = await this.prisma.provider.findUnique({
        where: { externalId: dto.externalId },
      });
      if (existing) {
        throw new ConflictException(`Provider with external ID ${dto.externalId} already exists`);
      }
    }

    const provider = await this.prisma.provider.create({
      data: {
        externalId: dto.externalId,
        countryCode: dto.countryCode,
        businessUnit: dto.businessUnit,
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        address: dto.address ? (dto.address as any) : null,
        status: dto.status || 'ACTIVE',
      },
      include: {
        workTeams: {
          include: {
            technicians: true,
          },
        },
      },
    });

    this.logger.log(`Provider created: ${provider.name} (${provider.id}) by ${currentUserId}`);
    return provider;
  }

  async findAllProviders(query: QueryProvidersDto, currentUserCountry: string, currentUserBU: string) {
    const { page = 1, limit = 20, search, countryCode, businessUnit, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      countryCode: countryCode || currentUserCountry,
      businessUnit: businessUnit || currentUserBU,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [providers, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip,
        take: limit,
        include: {
          workTeams: {
            include: {
              technicians: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
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

  async findOneProvider(id: string, currentUserCountry: string, currentUserBU: string) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        id,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
      include: {
        workTeams: {
          include: {
            technicians: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async updateProvider(
    id: string,
    dto: UpdateProviderDto,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
    const existing = await this.prisma.provider.findFirst({
      where: {
        id,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
    });

    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    const provider = await this.prisma.provider.update({
      where: { id },
      data: {
        name: dto.name,
        legalName: dto.legalName,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        address: dto.address !== undefined ? (dto.address as any) : undefined,
        status: dto.status,
      },
      include: {
        workTeams: {
          include: {
            technicians: true,
          },
        },
      },
    });

    this.logger.log(`Provider updated: ${provider.name} (${provider.id}) by ${currentUserId}`);
    return provider;
  }

  async removeProvider(id: string, currentUserId: string, currentUserCountry: string, currentUserBU: string) {
    const existing = await this.prisma.provider.findFirst({
      where: {
        id,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
      include: {
        workTeams: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    // Check if provider has work teams
    if (existing.workTeams.length > 0) {
      throw new ForbiddenException('Cannot delete provider with existing work teams. Delete work teams first.');
    }

    await this.prisma.provider.delete({
      where: { id },
    });

    this.logger.log(`Provider deleted: ${existing.name} (${id}) by ${currentUserId}`);
    return { message: 'Provider successfully deleted' };
  }

  // ============================================================================
  // WORK TEAM CRUD
  // ============================================================================

  async createWorkTeam(
    providerId: string,
    dto: CreateWorkTeamDto,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
    // Verify provider exists and belongs to current tenant
    const provider = await this.prisma.provider.findFirst({
      where: {
        id: providerId,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const workTeam = await this.prisma.workTeam.create({
      data: {
        providerId,
        countryCode: provider.countryCode,
        name: dto.name,
        maxDailyJobs: dto.maxDailyJobs,
        skills: dto.skills,
        serviceTypes: dto.serviceTypes,
        postalCodes: dto.postalCodes,
        workingDays: dto.workingDays,
        shifts: dto.shifts,
      },
      include: {
        technicians: true,
        provider: true,
      },
    });

    this.logger.log(`Work team created: ${workTeam.name} (${workTeam.id}) for provider ${providerId} by ${currentUserId}`);
    return workTeam;
  }

  async findAllWorkTeams(providerId: string, currentUserCountry: string, currentUserBU: string) {
    // Verify provider exists and belongs to current tenant
    const provider = await this.prisma.provider.findFirst({
      where: {
        id: providerId,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const workTeams = await this.prisma.workTeam.findMany({
      where: {
        providerId,
      },
      include: {
        technicians: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return workTeams;
  }

  async findOneWorkTeam(workTeamId: string, currentUserCountry: string) {
    const workTeam = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
      include: {
        technicians: true,
        provider: true,
      },
    });

    if (!workTeam) {
      throw new NotFoundException('Work team not found');
    }

    return workTeam;
  }

  async updateWorkTeam(
    workTeamId: string,
    dto: UpdateWorkTeamDto,
    currentUserId: string,
    currentUserCountry: string,
  ) {
    const existing = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
    });

    if (!existing) {
      throw new NotFoundException('Work team not found');
    }

    const workTeam = await this.prisma.workTeam.update({
      where: { id: workTeamId },
      data: {
        name: dto.name,
        maxDailyJobs: dto.maxDailyJobs,
        skills: dto.skills,
        serviceTypes: dto.serviceTypes,
        postalCodes: dto.postalCodes,
        workingDays: dto.workingDays,
        shifts: dto.shifts,
      },
      include: {
        technicians: true,
        provider: true,
      },
    });

    this.logger.log(`Work team updated: ${workTeam.name} (${workTeam.id}) by ${currentUserId}`);
    return workTeam;
  }

  async removeWorkTeam(workTeamId: string, currentUserId: string, currentUserCountry: string) {
    const existing = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
      include: {
        technicians: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Work team not found');
    }

    // Check if work team has technicians
    if (existing.technicians.length > 0) {
      throw new ForbiddenException('Cannot delete work team with existing technicians. Delete technicians first.');
    }

    await this.prisma.workTeam.delete({
      where: { id: workTeamId },
    });

    this.logger.log(`Work team deleted: ${existing.name} (${workTeamId}) by ${currentUserId}`);
    return { message: 'Work team successfully deleted' };
  }

  // ============================================================================
  // TECHNICIAN CRUD
  // ============================================================================

  async createTechnician(
    workTeamId: string,
    dto: CreateTechnicianDto,
    currentUserId: string,
    currentUserCountry: string,
  ) {
    // Verify work team exists and belongs to current tenant
    const workTeam = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
    });

    if (!workTeam) {
      throw new NotFoundException('Work team not found');
    }

    const technician = await this.prisma.technician.create({
      data: {
        workTeamId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
      },
      include: {
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });

    this.logger.log(`Technician created: ${technician.firstName} ${technician.lastName} (${technician.id}) for work team ${workTeamId} by ${currentUserId}`);
    return technician;
  }

  async findAllTechnicians(workTeamId: string, currentUserCountry: string) {
    // Verify work team exists and belongs to current tenant
    const workTeam = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
    });

    if (!workTeam) {
      throw new NotFoundException('Work team not found');
    }

    const technicians = await this.prisma.technician.findMany({
      where: {
        workTeamId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return technicians;
  }

  async findOneTechnician(technicianId: string, currentUserCountry: string) {
    const technician = await this.prisma.technician.findFirst({
      where: {
        id: technicianId,
        workTeam: {
          countryCode: currentUserCountry,
        },
      },
      include: {
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return technician;
  }

  async updateTechnician(
    technicianId: string,
    dto: UpdateTechnicianDto,
    currentUserId: string,
    currentUserCountry: string,
  ) {
    const existing = await this.prisma.technician.findFirst({
      where: {
        id: technicianId,
        workTeam: {
          countryCode: currentUserCountry,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Technician not found');
    }

    const technician = await this.prisma.technician.update({
      where: { id: technicianId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
      },
      include: {
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });

    this.logger.log(`Technician updated: ${technician.firstName} ${technician.lastName} (${technician.id}) by ${currentUserId}`);
    return technician;
  }

  async removeTechnician(technicianId: string, currentUserId: string, currentUserCountry: string) {
    const existing = await this.prisma.technician.findFirst({
      where: {
        id: technicianId,
        workTeam: {
          countryCode: currentUserCountry,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Technician not found');
    }

    await this.prisma.technician.delete({
      where: { id: technicianId },
    });

    this.logger.log(`Technician deleted: ${existing.firstName} ${existing.lastName} (${technicianId}) by ${currentUserId}`);
    return { message: 'Technician successfully deleted' };
  }
}
