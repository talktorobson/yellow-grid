import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
  QueryProvidersDto,
  CreateWorkTeamDto,
  UpdateWorkTeamDto,
  CreateProviderWorkingScheduleDto,
  CreateInterventionZoneDto,
  UpdateInterventionZoneDto,
  CreateServicePriorityConfigDto,
  BulkUpsertServicePriorityDto,
} from './dto';

/**
 * Service for managing providers and work teams.
 *
 * NOTE: Individual technician management is intentionally NOT provided.
 * Platform operates at WorkTeam level only to avoid co-employer liability.
 * See: docs/LEGAL_BOUNDARY_WORKTEAM_VS_TECHNICIAN.md
 */
@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // PROVIDER CRUD
  // ============================================================================

  /**
   * Creates a new provider.
   *
   * @param dto - The provider creation data.
   * @param currentUserId - The ID of the user creating the provider.
   * @returns {Promise<ProviderResponseDto>} The created provider.
   * @throws {ConflictException} If a provider with the same external ID exists.
   */
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
        addressStreet: dto.addressStreet,
        addressCity: dto.addressCity,
        addressPostalCode: dto.addressPostalCode,
        addressRegion: dto.addressRegion,
        addressCountry: dto.addressCountry,
        coordinates: dto.coordinates,
        status: dto.status || 'ACTIVE',
        // New fields from AHS business requirements
        providerType: dto.providerType,
        parentProviderId: dto.parentProviderId,
        riskLevel: dto.riskLevel || 'NONE',
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
      },
      include: {
        workTeams: {
          include: {
            certifications: true,
            calendar: true,
            zoneAssignments: {
              include: {
                interventionZone: true,
              },
            },
          },
        },
        workingSchedule: true,
        servicePriorities: {
          include: {
            specialty: true,
          },
        },
        interventionZones: {
          include: {
            workTeamZoneAssignments: true,
          },
        },
        storeAssignments: {
          include: {
            store: true,
          },
        },
        parentProvider: true,
        subProviders: true,
      },
    });

    this.logger.log(`Provider created: ${provider.name} (${provider.id}) by ${currentUserId}`);
    return provider;
  }

  /**
   * Retrieves all providers with pagination and filters.
   *
   * @param query - The query parameters.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns A paginated list of providers.
   */
  async findAllProviders(
    query: QueryProvidersDto,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
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
              certifications: true,
              calendar: true,
            },
          },
          workingSchedule: true,
          servicePriorities: {
            include: {
              specialty: true,
            },
          },
          interventionZones: {
            include: {
              workTeamZoneAssignments: true,
            },
          },
          storeAssignments: {
            include: {
              store: true,
            },
          },
          parentProvider: {
            select: {
              id: true,
              name: true,
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

  /**
   * Retrieves a provider by ID.
   *
   * @param id - The provider ID.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<ProviderResponseDto>} The provider details.
   * @throws {NotFoundException} If the provider is not found.
   */
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
            certifications: true,
            calendar: true,
            zoneAssignments: {
              include: {
                interventionZone: true,
              },
            },
          },
        },
        workingSchedule: true,
        servicePriorities: {
          include: {
            specialty: true,
          },
        },
        interventionZones: {
          include: {
            workTeamZoneAssignments: true,
          },
        },
        storeAssignments: {
          include: {
            store: true,
          },
        },
        parentProvider: {
          select: {
            id: true,
            name: true,
          },
        },
        subProviders: {
          select: {
            id: true,
            name: true,
            providerType: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  /**
   * Updates a provider.
   *
   * @param id - The provider ID.
   * @param dto - The update data.
   * @param currentUserId - The ID of the user performing the update.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<ProviderResponseDto>} The updated provider.
   * @throws {NotFoundException} If the provider is not found.
   */
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
        addressStreet: dto.addressStreet,
        addressCity: dto.addressCity,
        addressPostalCode: dto.addressPostalCode,
        addressRegion: dto.addressRegion,
        addressCountry: dto.addressCountry,
        coordinates: dto.coordinates,
        status: dto.status,
        // New fields from AHS business requirements
        providerType: dto.providerType,
        parentProviderId: dto.parentProviderId,
        riskLevel: dto.riskLevel,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
      },
      include: {
        workTeams: {
          include: {
            certifications: true,
            calendar: true,
          },
        },
        workingSchedule: true,
        servicePriorities: {
          include: {
            specialty: true,
          },
        },
        interventionZones: {
          include: {
            workTeamZoneAssignments: true,
          },
        },
        storeAssignments: {
          include: {
            store: true,
          },
        },
        parentProvider: true,
        subProviders: true,
      },
    });

    this.logger.log(`Provider updated: ${provider.name} (${provider.id}) by ${currentUserId}`);
    return provider;
  }

  /**
   * Deletes a provider.
   *
   * @param id - The provider ID.
   * @param currentUserId - The ID of the user deleting the provider.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<{ message: string }>} A confirmation message.
   * @throws {NotFoundException} If the provider is not found.
   * @throws {ForbiddenException} If the provider has associated work teams.
   */
  async removeProvider(
    id: string,
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
      include: {
        workTeams: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    // Check if provider has work teams
    if (existing.workTeams.length > 0) {
      throw new ForbiddenException(
        'Cannot delete provider with existing work teams. Delete work teams first.',
      );
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

  /**
   * Creates a work team.
   *
   * @param providerId - The provider ID.
   * @param dto - The work team creation data.
   * @param currentUserId - The ID of the user creating the work team.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<WorkTeamResponseDto>} The created work team.
   * @throws {NotFoundException} If the provider is not found.
   */
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
        externalId: dto.externalId,
        name: dto.name,
        status: dto.status || 'ACTIVE',
        maxDailyJobs: dto.maxDailyJobs,
        minTechnicians: dto.minTechnicians || 1,
        maxTechnicians: dto.maxTechnicians,
        skills: dto.skills,
        serviceTypes: dto.serviceTypes,
        postalCodes: dto.postalCodes,
        workingDays: dto.workingDays,
        shifts: dto.shifts ? (dto.shifts as unknown as any) : undefined,
      },
      include: {
        certifications: true,
        provider: true,
        calendar: true,
        zoneAssignments: {
          include: {
            interventionZone: true,
          },
        },
      },
    });

    this.logger.log(
      `Work team created: ${workTeam.name} (${workTeam.id}) for provider ${providerId} by ${currentUserId}`,
    );
    return workTeam;
  }

  /**
   * Retrieves all work teams for a provider.
   *
   * @param providerId - The provider ID.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<WorkTeamResponseDto[]>} A list of work teams.
   * @throws {NotFoundException} If the provider is not found.
   */
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
        certifications: true,
        calendar: true,
        zoneAssignments: {
          include: {
            interventionZone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return workTeams;
  }

  /**
   * Retrieves a work team by ID.
   *
   * @param workTeamId - The work team ID.
   * @param currentUserCountry - The country code of the current user.
   * @returns {Promise<WorkTeamResponseDto>} The work team details.
   * @throws {NotFoundException} If the work team is not found.
   */
  async findOneWorkTeam(workTeamId: string, currentUserCountry: string) {
    const workTeam = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
      include: {
        certifications: true,
        provider: {
          include: {
            workingSchedule: true,
          },
        },
        calendar: {
          include: {
            plannedAbsences: {
              where: {
                endDate: {
                  gte: new Date(),
                },
              },
            },
            dedicatedWorkingDays: {
              where: {
                date: {
                  gte: new Date(),
                },
              },
            },
          },
        },
        zoneAssignments: {
          include: {
            interventionZone: true,
          },
        },
      },
    });

    if (!workTeam) {
      throw new NotFoundException('Work team not found');
    }

    return workTeam;
  }

  /**
   * Updates a work team.
   *
   * @param workTeamId - The work team ID.
   * @param dto - The update data.
   * @param currentUserId - The ID of the user updating the work team.
   * @param currentUserCountry - The country code of the current user.
   * @returns {Promise<WorkTeamResponseDto>} The updated work team.
   * @throws {NotFoundException} If the work team is not found.
   */
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
        externalId: dto.externalId,
        name: dto.name,
        status: dto.status,
        maxDailyJobs: dto.maxDailyJobs,
        minTechnicians: dto.minTechnicians,
        maxTechnicians: dto.maxTechnicians,
        skills: dto.skills,
        serviceTypes: dto.serviceTypes,
        postalCodes: dto.postalCodes,
        workingDays: dto.workingDays,
        shifts: dto.shifts ? (dto.shifts as unknown as any) : undefined,
      },
      include: {
        certifications: true,
        provider: true,
        calendar: true,
        zoneAssignments: {
          include: {
            interventionZone: true,
          },
        },
      },
    });

    this.logger.log(`Work team updated: ${workTeam.name} (${workTeam.id}) by ${currentUserId}`);
    return workTeam;
  }

  /**
   * Deletes a work team.
   *
   * @param workTeamId - The work team ID.
   * @param currentUserId - The ID of the user deleting the work team.
   * @param currentUserCountry - The country code of the current user.
   * @returns {Promise<{ message: string }>} A confirmation message.
   * @throws {NotFoundException} If the work team is not found.
   */
  async removeWorkTeam(workTeamId: string, currentUserId: string, currentUserCountry: string) {
    const existing = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
    });

    if (!existing) {
      throw new NotFoundException('Work team not found');
    }

    await this.prisma.workTeam.delete({
      where: { id: workTeamId },
    });

    this.logger.log(`Work team deleted: ${existing.name} (${workTeamId}) by ${currentUserId}`);
    return { message: 'Work team successfully deleted' };
  }

  // NOTE: Individual technician CRUD methods removed per legal requirement
  // Platform operates at WorkTeam level only to avoid co-employer liability
  // See: docs/LEGAL_BOUNDARY_WORKTEAM_VS_TECHNICIAN.md

  // ============================================================================
  // PROVIDER WORKING SCHEDULE CRUD
  // ============================================================================

  /**
   * Retrieves the working schedule of a provider.
   *
   * @param providerId - The provider ID.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<ProviderWorkingScheduleResponseDto>} The working schedule.
   * @throws {NotFoundException} If the provider is not found.
   */
  async getProviderWorkingSchedule(
    providerId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        id: providerId,
        countryCode: currentUserCountry,
        businessUnit: currentUserBU,
      },
      include: {
        workingSchedule: {
          include: {
            calendarConfig: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider.workingSchedule;
  }

  /**
   * Creates or updates a provider's working schedule.
   *
   * @param providerId - The provider ID.
   * @param dto - The schedule data.
   * @param currentUserId - The ID of the user creating/updating the schedule.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<ProviderWorkingScheduleResponseDto>} The updated schedule.
   * @throws {NotFoundException} If the provider is not found.
   */
  async upsertProviderWorkingSchedule(
    providerId: string,
    dto: CreateProviderWorkingScheduleDto,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
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

    const schedule = await this.prisma.providerWorkingSchedule.upsert({
      where: {
        providerId,
      },
      create: {
        providerId,
        calendarConfigId: dto.calendarConfigId,
        workingDays: dto.workingDays,
        morningShiftEnabled: dto.morningShiftEnabled,
        morningShiftStart: dto.morningShiftStart,
        morningShiftEnd: dto.morningShiftEnd,
        afternoonShiftEnabled: dto.afternoonShiftEnabled,
        afternoonShiftStart: dto.afternoonShiftStart,
        afternoonShiftEnd: dto.afternoonShiftEnd,
        eveningShiftEnabled: dto.eveningShiftEnabled,
        eveningShiftStart: dto.eveningShiftStart,
        eveningShiftEnd: dto.eveningShiftEnd,
        lunchBreakEnabled: dto.lunchBreakEnabled ?? true,
        lunchBreakStart: dto.lunchBreakStart,
        lunchBreakEnd: dto.lunchBreakEnd,
        maxDailyJobsTotal: dto.maxDailyJobsTotal,
        maxWeeklyJobsTotal: dto.maxWeeklyJobsTotal,
        allowCrossDayJobs: dto.allowCrossDayJobs,
        allowCrossShiftJobs: dto.allowCrossShiftJobs,
        timezoneOverride: dto.timezoneOverride,
      },
      update: {
        calendarConfigId: dto.calendarConfigId,
        workingDays: dto.workingDays,
        morningShiftEnabled: dto.morningShiftEnabled,
        morningShiftStart: dto.morningShiftStart,
        morningShiftEnd: dto.morningShiftEnd,
        afternoonShiftEnabled: dto.afternoonShiftEnabled,
        afternoonShiftStart: dto.afternoonShiftStart,
        afternoonShiftEnd: dto.afternoonShiftEnd,
        eveningShiftEnabled: dto.eveningShiftEnabled,
        eveningShiftStart: dto.eveningShiftStart,
        eveningShiftEnd: dto.eveningShiftEnd,
        lunchBreakEnabled: dto.lunchBreakEnabled,
        lunchBreakStart: dto.lunchBreakStart,
        lunchBreakEnd: dto.lunchBreakEnd,
        maxDailyJobsTotal: dto.maxDailyJobsTotal,
        maxWeeklyJobsTotal: dto.maxWeeklyJobsTotal,
        allowCrossDayJobs: dto.allowCrossDayJobs,
        allowCrossShiftJobs: dto.allowCrossShiftJobs,
        timezoneOverride: dto.timezoneOverride,
      },
      include: {
        calendarConfig: true,
      },
    });

    this.logger.log(`Working schedule upserted for provider ${providerId} by ${currentUserId}`);
    return schedule;
  }

  // ============================================================================
  // INTERVENTION ZONE CRUD
  // ============================================================================

  /**
   * Retrieves all intervention zones for a provider.
   *
   * @param providerId - The provider ID.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<InterventionZoneResponseDto[]>} A list of intervention zones.
   * @throws {NotFoundException} If the provider is not found.
   */
  async getProviderInterventionZones(
    providerId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
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

    return this.prisma.interventionZone.findMany({
      where: { providerId },
      include: {
        workTeamZoneAssignments: {
          include: {
            workTeam: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ zoneType: 'asc' }, { assignmentPriority: 'asc' }],
    });
  }

  /**
   * Creates an intervention zone.
   *
   * @param providerId - The provider ID.
   * @param dto - The intervention zone data.
   * @param currentUserId - The ID of the user creating the zone.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<InterventionZoneResponseDto>} The created intervention zone.
   * @throws {NotFoundException} If the provider is not found.
   */
  async createInterventionZone(
    providerId: string,
    dto: CreateInterventionZoneDto,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
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

    const zone = await this.prisma.interventionZone.create({
      data: {
        providerId,
        name: dto.name,
        zoneCode: dto.zoneCode,
        zoneType: dto.zoneType,
        postalCodes: dto.postalCodes || [],
        postalCodeVectors: dto.postalCodeVectors
          ? (dto.postalCodeVectors as unknown as any)
          : undefined,
        boundaryGeoJson: dto.boundaryGeoJson ? (dto.boundaryGeoJson as unknown as any) : undefined,
        maxCommuteMinutes: dto.maxCommuteMinutes ?? 60,
        defaultTravelBuffer: dto.defaultTravelBuffer ?? 30,
        maxDailyJobsInZone: dto.maxDailyJobsInZone,
        assignmentPriority: dto.assignmentPriority ?? 1,
      },
      include: {
        workTeamZoneAssignments: {
          include: {
            workTeam: true,
          },
        },
      },
    });

    this.logger.log(
      `Intervention zone created: ${zone.name} (${zone.id}) for provider ${providerId} by ${currentUserId}`,
    );
    return zone;
  }

  /**
   * Updates an intervention zone.
   *
   * @param zoneId - The intervention zone ID.
   * @param dto - The update data.
   * @param currentUserId - The ID of the user updating the zone.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<InterventionZoneResponseDto>} The updated intervention zone.
   * @throws {NotFoundException} If the intervention zone is not found.
   */
  async updateInterventionZone(
    zoneId: string,
    dto: UpdateInterventionZoneDto,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
    const zone = await this.prisma.interventionZone.findFirst({
      where: {
        id: zoneId,
        provider: {
          countryCode: currentUserCountry,
          businessUnit: currentUserBU,
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('Intervention zone not found');
    }

    const updated = await this.prisma.interventionZone.update({
      where: { id: zoneId },
      data: {
        name: dto.name,
        zoneCode: dto.zoneCode,
        zoneType: dto.zoneType,
        postalCodes: dto.postalCodes,
        postalCodeVectors: dto.postalCodeVectors
          ? (dto.postalCodeVectors as unknown as any)
          : undefined,
        boundaryGeoJson: dto.boundaryGeoJson ? (dto.boundaryGeoJson as unknown as any) : undefined,
        maxCommuteMinutes: dto.maxCommuteMinutes,
        defaultTravelBuffer: dto.defaultTravelBuffer,
        maxDailyJobsInZone: dto.maxDailyJobsInZone,
        assignmentPriority: dto.assignmentPriority,
      },
      include: {
        workTeamZoneAssignments: {
          include: {
            workTeam: true,
          },
        },
      },
    });

    this.logger.log(`Intervention zone updated: ${updated.name} (${zoneId}) by ${currentUserId}`);
    return updated;
  }

  /**
   * Deletes an intervention zone.
   *
   * @param zoneId - The intervention zone ID.
   * @param currentUserId - The ID of the user deleting the zone.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<{ message: string }>} A confirmation message.
   * @throws {NotFoundException} If the intervention zone is not found.
   */
  async deleteInterventionZone(
    zoneId: string,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
    const zone = await this.prisma.interventionZone.findFirst({
      where: {
        id: zoneId,
        provider: {
          countryCode: currentUserCountry,
          businessUnit: currentUserBU,
        },
      },
      include: {
        workTeamZoneAssignments: true,
      },
    });

    if (!zone) {
      throw new NotFoundException('Intervention zone not found');
    }

    // Delete related work team assignments first
    if (zone.workTeamZoneAssignments.length > 0) {
      await this.prisma.workTeamZoneAssignment.deleteMany({
        where: { interventionZoneId: zoneId },
      });
    }

    await this.prisma.interventionZone.delete({
      where: { id: zoneId },
    });

    this.logger.log(`Intervention zone deleted: ${zone.name} (${zoneId}) by ${currentUserId}`);
    return { message: 'Intervention zone successfully deleted' };
  }

  // ============================================================================
  // SERVICE PRIORITY CONFIG CRUD
  // ============================================================================

  /**
   * Retrieves service priority configurations for a provider.
   *
   * @param providerId - The provider ID.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<ServicePriorityConfigResponseDto[]>} A list of service priority configs.
   * @throws {NotFoundException} If the provider is not found.
   */
  async getProviderServicePriorities(
    providerId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
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

    return this.prisma.servicePriorityConfig.findMany({
      where: { providerId },
      include: {
        specialty: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
    });
  }

  /**
   * Creates or updates a service priority configuration.
   *
   * @param providerId - The provider ID.
   * @param dto - The configuration data.
   * @param currentUserId - The ID of the user upserting the config.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<ServicePriorityConfigResponseDto>} The updated configuration.
   * @throws {NotFoundException} If the provider or specialty is not found.
   */
  async upsertServicePriorityConfig(
    providerId: string,
    dto: CreateServicePriorityConfigDto,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
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

    // Verify specialty exists
    const specialty = await this.prisma.providerSpecialty.findUnique({
      where: { id: dto.specialtyId },
    });

    if (!specialty) {
      throw new NotFoundException('Provider specialty not found');
    }

    const config = await this.prisma.servicePriorityConfig.upsert({
      where: {
        providerId_specialtyId: {
          providerId,
          specialtyId: dto.specialtyId,
        },
      },
      create: {
        providerId,
        specialtyId: dto.specialtyId,
        priority: dto.priority,
        bundledWithSpecialtyIds: dto.bundledWithSpecialtyIds,
        maxMonthlyVolume: dto.maxMonthlyVolume,
        priceOverridePercent: dto.priceOverridePercent,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      update: {
        priority: dto.priority,
        bundledWithSpecialtyIds: dto.bundledWithSpecialtyIds,
        maxMonthlyVolume: dto.maxMonthlyVolume,
        priceOverridePercent: dto.priceOverridePercent,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      include: {
        specialty: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    this.logger.log(
      `Service priority config upserted for provider ${providerId}, specialty ${dto.specialtyId} by ${currentUserId}`,
    );
    return config;
  }

  /**
   * Bulk updates service priority configurations.
   *
   * @param providerId - The provider ID.
   * @param dto - The bulk configuration data.
   * @param currentUserId - The ID of the user upserting the configs.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<void>}
   * @throws {NotFoundException} If the provider is not found.
   */
  async bulkUpsertServicePriorityConfig(
    providerId: string,
    dto: BulkUpsertServicePriorityDto,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
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

    const results = await Promise.all(
      dto.priorities.map((priorityConfig) =>
        this.prisma.servicePriorityConfig.upsert({
          where: {
            providerId_specialtyId: {
              providerId,
              specialtyId: priorityConfig.specialtyId,
            },
          },
          create: {
            providerId,
            specialtyId: priorityConfig.specialtyId,
            priority: priorityConfig.priority,
            bundledWithSpecialtyIds: priorityConfig.bundledWithSpecialtyIds,
            maxMonthlyVolume: priorityConfig.maxMonthlyVolume,
            priceOverridePercent: priorityConfig.priceOverridePercent,
            validFrom: priorityConfig.validFrom ? new Date(priorityConfig.validFrom) : undefined,
            validUntil: priorityConfig.validUntil ? new Date(priorityConfig.validUntil) : undefined,
          },
          update: {
            priority: priorityConfig.priority,
            bundledWithSpecialtyIds: priorityConfig.bundledWithSpecialtyIds,
            maxMonthlyVolume: priorityConfig.maxMonthlyVolume,
            priceOverridePercent: priorityConfig.priceOverridePercent,
            validFrom: priorityConfig.validFrom ? new Date(priorityConfig.validFrom) : undefined,
            validUntil: priorityConfig.validUntil ? new Date(priorityConfig.validUntil) : undefined,
          },
          include: {
            specialty: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        }),
      ),
    );

    this.logger.log(
      `Bulk service priority config upsert for provider ${providerId} by ${currentUserId}`,
    );
    return results;
  }

  /**
   * Deletes a service priority configuration.
   *
   * @param providerId - The provider ID.
   * @param specialtyId - The specialty ID.
   * @param currentUserId - The ID of the user deleting the config.
   * @param currentUserCountry - The country code of the current user.
   * @param currentUserBU - The business unit of the current user.
   * @returns {Promise<{ message: string }>} A confirmation message.
   * @throws {NotFoundException} If the config is not found.
   */
  async deleteServicePriorityConfig(
    providerId: string,
    specialtyId: string,
    currentUserId: string,
    currentUserCountry: string,
    currentUserBU: string,
  ) {
    const config = await this.prisma.servicePriorityConfig.findFirst({
      where: {
        providerId,
        specialtyId,
        provider: {
          countryCode: currentUserCountry,
          businessUnit: currentUserBU,
        },
      },
    });

    if (!config) {
      throw new NotFoundException('Service priority config not found');
    }

    await this.prisma.servicePriorityConfig.delete({
      where: {
        providerId_specialtyId: {
          providerId,
          specialtyId,
        },
      },
    });

    this.logger.log(
      `Service priority config deleted for provider ${providerId}, specialty ${specialtyId} by ${currentUserId}`,
    );
    return { message: 'Service priority config successfully deleted' };
  }

  // ============================================================================
  // WORK TEAM ZONE ASSIGNMENT CRUD
  // ============================================================================

  /**
   * Assigns a work team to an intervention zone.
   *
   * @param workTeamId - The work team ID.
   * @param interventionZoneId - The intervention zone ID.
   * @param overrides - Optional overrides for limits and priority.
   * @param currentUserId - The ID of the user performing the assignment.
   * @param currentUserCountry - The country code of the current user.
   * @returns {Promise<WorkTeamZoneAssignmentResponseDto>} The created assignment.
   * @throws {NotFoundException} If the work team or zone is not found.
   */
  async assignWorkTeamToZone(
    workTeamId: string,
    interventionZoneId: string,
    overrides: {
      maxDailyJobsOverride?: number;
      assignmentPriorityOverride?: number;
      travelBufferOverride?: number;
    } = {},
    currentUserId: string,
    currentUserCountry: string,
  ) {
    const workTeam = await this.prisma.workTeam.findFirst({
      where: {
        id: workTeamId,
        countryCode: currentUserCountry,
      },
    });

    if (!workTeam) {
      throw new NotFoundException('Work team not found');
    }

    const zone = await this.prisma.interventionZone.findUnique({
      where: { id: interventionZoneId },
    });

    if (!zone) {
      throw new NotFoundException('Intervention zone not found');
    }

    const assignment = await this.prisma.workTeamZoneAssignment.upsert({
      where: {
        workTeamId_interventionZoneId: {
          workTeamId,
          interventionZoneId,
        },
      },
      create: {
        workTeamId,
        interventionZoneId,
        maxDailyJobsOverride: overrides.maxDailyJobsOverride,
        assignmentPriorityOverride: overrides.assignmentPriorityOverride,
        travelBufferOverride: overrides.travelBufferOverride,
      },
      update: {
        maxDailyJobsOverride: overrides.maxDailyJobsOverride,
        assignmentPriorityOverride: overrides.assignmentPriorityOverride,
        travelBufferOverride: overrides.travelBufferOverride,
      },
      include: {
        interventionZone: true,
        workTeam: true,
      },
    });

    this.logger.log(
      `Work team ${workTeamId} assigned to zone ${interventionZoneId} by ${currentUserId}`,
    );
    return assignment;
  }

  /**
   * Removes a work team from an intervention zone.
   *
   * @param workTeamId - The work team ID.
   * @param interventionZoneId - The intervention zone ID.
   * @param currentUserId - The ID of the user performing the removal.
   * @param currentUserCountry - The country code of the current user.
   * @returns {Promise<{ message: string }>} A confirmation message.
   * @throws {NotFoundException} If the assignment is not found.
   */
  async removeWorkTeamFromZone(
    workTeamId: string,
    interventionZoneId: string,
    currentUserId: string,
    currentUserCountry: string,
  ) {
    const assignment = await this.prisma.workTeamZoneAssignment.findFirst({
      where: {
        workTeamId,
        interventionZoneId,
        workTeam: {
          countryCode: currentUserCountry,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Work team zone assignment not found');
    }

    await this.prisma.workTeamZoneAssignment.delete({
      where: {
        workTeamId_interventionZoneId: {
          workTeamId,
          interventionZoneId,
        },
      },
    });

    this.logger.log(
      `Work team ${workTeamId} removed from zone ${interventionZoneId} by ${currentUserId}`,
    );
    return { message: 'Work team zone assignment successfully deleted' };
  }

  // ============================================================================
  // CERTIFICATION METHODS (Work Team Level)
  // ============================================================================
  // NOTE: Certifications are tracked at the Work Team level, not individual technician level.
  // This is a deliberate design decision to avoid co-employer liability.

  /**
   * Get all work team certifications with verification status
   * For PSM verification workflow
   */
  async getAllCertifications(
    filters: {
      status?: 'pending' | 'approved' | 'rejected' | 'expired';
      providerId?: string;
      page?: number;
      limit?: number;
    },
    currentUserCountry: string,
    currentUserBU: string,
  ) {
    const { status, providerId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: any = {
      workTeam: {
        countryCode: currentUserCountry,
      },
    };

    if (providerId) {
      where.workTeam = {
        ...where.workTeam,
        providerId,
      };
    }

    // Apply status filter
    if (status === 'pending') {
      where.isVerified = false;
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
    } else if (status === 'approved') {
      where.isVerified = true;
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
    } else if (status === 'rejected') {
      // Rejected = verified as false with a verification attempt
      where.isVerified = false;
      where.verifiedAt = { not: null };
    } else if (status === 'expired') {
      where.expiresAt = { lt: now };
    }

    const [certifications, total] = await Promise.all([
      this.prisma.workTeamCertification.findMany({
        where,
        skip,
        take: limit,
        include: {
          workTeam: {
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ isVerified: 'asc' }, { expiresAt: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.workTeamCertification.count({ where }),
    ]);

    // Transform to include computed status
    const transformedCertifications = certifications.map((cert) => {
      let computedStatus: 'pending' | 'approved' | 'rejected' | 'expired' = 'pending';

      if (cert.expiresAt && cert.expiresAt < now) {
        computedStatus = 'expired';
      } else if (cert.isVerified) {
        computedStatus = 'approved';
      } else if (cert.verifiedAt) {
        computedStatus = 'rejected';
      }

      return {
        ...cert,
        status: computedStatus,
        workTeamName: cert.workTeam.name,
        providerName: cert.workTeam.provider.name,
        providerId: cert.workTeam.provider.id,
      };
    });

    return {
      data: transformedCertifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update certification verification status
   */
  async verifyCertification(
    certificationId: string,
    action: 'approve' | 'reject',
    currentUserId: string,
    currentUserCountry: string,
    notes?: string,
  ) {
    const certification = await this.prisma.workTeamCertification.findFirst({
      where: {
        id: certificationId,
        workTeam: {
          countryCode: currentUserCountry,
        },
      },
    });

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    const updated = await this.prisma.workTeamCertification.update({
      where: { id: certificationId },
      data: {
        isVerified: action === 'approve',
        verifiedAt: new Date(),
        verifiedBy: currentUserId,
      },
      include: {
        workTeam: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Certification ${certificationId} ${action}d by ${currentUserId}`);
    return updated;
  }

  /**
   * Get all intervention zones aggregated for coverage analysis
   * For PSM coverage management
   */
  async getInterventionZonesForCoverage(currentUserCountry: string, currentUserBU: string) {
    const zones = await this.prisma.interventionZone.findMany({
      where: {
        provider: {
          countryCode: currentUserCountry,
          businessUnit: currentUserBU,
          status: { not: 'INACTIVE' },
        },
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        workTeamZoneAssignments: {
          include: {
            workTeam: {
              select: {
                id: true,
                name: true,
                status: true,
                serviceTypes: true,
              },
            },
          },
        },
      },
    });

    return { data: zones };
  }
}
