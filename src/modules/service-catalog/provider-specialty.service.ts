import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ExperienceLevel, ServiceCategory } from '@prisma/client';

/**
 * Provider Specialty Service
 *
 * Manages provider specialties (capabilities) and work team specialty assignments.
 * Handles certification tracking, performance metrics, and experience levels.
 */
@Injectable()
export class ProviderSpecialtyService {
  private readonly logger = new Logger(ProviderSpecialtyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // PROVIDER SPECIALTY MANAGEMENT (Master Data)
  // ============================================================================

  /**
   * Find specialty by code
   * @param code - Specialty code (e.g., HVAC_INSTALL)
   * @returns Specialty with service mappings
   */
  async findSpecialtyByCode(code: string) {
    const specialty = await this.prisma.providerSpecialty.findUnique({
      where: { code },
      include: {
        serviceMappings: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!specialty) {
      throw new NotFoundException(`Specialty with code ${code} not found`);
    }

    return specialty;
  }

  /**
   * Find all specialties, optionally filtered by category
   * @param category - Optional service category filter
   * @returns List of specialties
   */
  async findAllSpecialties(category?: ServiceCategory) {
    const where = category ? { category } : {};

    return this.prisma.providerSpecialty.findMany({
      where,
      include: {
        serviceMappings: {
          include: {
            service: {
              select: {
                id: true,
                fsmServiceCode: true,
                name: true,
                serviceType: true,
              },
            },
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Create a new specialty
   * @param specialtyData - Specialty creation data
   * @returns Created specialty
   */
  async createSpecialty(specialtyData: {
    code: string;
    name: string;
    description?: string;
    category: ServiceCategory;
    requiresCertification: boolean;
    certificationAuthority?: string;
  }) {
    // Check for duplicate code
    const existing = await this.prisma.providerSpecialty.findUnique({
      where: { code: specialtyData.code },
    });

    if (existing) {
      throw new ConflictException(
        `Specialty with code ${specialtyData.code} already exists`,
      );
    }

    return this.prisma.providerSpecialty.create({
      data: specialtyData,
    });
  }

  // ============================================================================
  // WORK TEAM SPECIALTY ASSIGNMENTS
  // ============================================================================

  /**
   * Assign a specialty to a work team
   * @param workTeamId - Work team UUID
   * @param specialtyId - Specialty UUID
   * @param assignmentData - Assignment details
   * @returns Created assignment
   */
  async assignSpecialtyToWorkTeam(
    workTeamId: string,
    specialtyId: string,
    assignmentData: {
      isCertified: boolean;
      certificationNumber?: string;
      certificationIssuedAt?: Date;
      certificationExpiresAt?: Date;
      experienceLevel: ExperienceLevel;
      yearsOfExperience: number;
    },
  ) {
    // Check if assignment already exists
    const existing = await this.prisma.providerSpecialtyAssignment.findUnique({
      where: {
        workTeamId_specialtyId: {
          workTeamId,
          specialtyId,
        },
      },
    });

    if (existing && existing.isActive) {
      throw new ConflictException(
        `Work team ${workTeamId} already has specialty ${specialtyId} assigned`,
      );
    }

    // If exists but inactive, reactivate it
    if (existing && !existing.isActive) {
      return this.prisma.providerSpecialtyAssignment.update({
        where: { id: existing.id },
        data: {
          ...assignmentData,
          isActive: true,
          assignedAt: new Date(),
          revokedAt: null,
          revocationReason: null,
        },
        include: {
          specialty: true,
          workTeam: {
            include: {
              provider: true,
            },
          },
        },
      });
    }

    // Create new assignment
    return this.prisma.providerSpecialtyAssignment.create({
      data: {
        workTeamId,
        specialtyId,
        ...assignmentData,
        isActive: true,
      },
      include: {
        specialty: true,
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Revoke a specialty from a work team
   * @param workTeamId - Work team UUID
   * @param specialtyId - Specialty UUID
   * @param reason - Revocation reason
   * @returns Updated assignment
   */
  async revokeSpecialtyFromWorkTeam(
    workTeamId: string,
    specialtyId: string,
    reason: string,
  ) {
    const assignment = await this.prisma.providerSpecialtyAssignment.findUnique(
      {
        where: {
          workTeamId_specialtyId: {
            workTeamId,
            specialtyId,
          },
        },
      },
    );

    if (!assignment) {
      throw new NotFoundException(
        `Assignment not found for work team ${workTeamId} and specialty ${specialtyId}`,
      );
    }

    if (!assignment.isActive) {
      throw new BadRequestException(
        `Assignment is already revoked for work team ${workTeamId} and specialty ${specialtyId}`,
      );
    }

    this.logger.log(
      `Revoking specialty ${specialtyId} from work team ${workTeamId}: ${reason}`,
    );

    return this.prisma.providerSpecialtyAssignment.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revocationReason: reason,
      },
      include: {
        specialty: true,
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Get all specialty assignments for a work team
   * @param workTeamId - Work team UUID
   * @param activeOnly - Only return active assignments (default: true)
   * @returns List of assignments
   */
  async getWorkTeamSpecialties(workTeamId: string, activeOnly: boolean = true) {
    const where: any = { workTeamId };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.providerSpecialtyAssignment.findMany({
      where,
      include: {
        specialty: true,
      },
      orderBy: [{ specialty: { category: 'asc' } }, { specialty: { name: 'asc' } }],
    });
  }

  /**
   * Get all work teams that have a specific specialty
   * @param specialtyId - Specialty UUID
   * @param countryCode - Optional country filter
   * @param activeOnly - Only return active assignments (default: true)
   * @returns List of work teams with the specialty
   */
  async getWorkTeamsWithSpecialty(
    specialtyId: string,
    countryCode?: string,
    activeOnly: boolean = true,
  ) {
    const where: any = { specialtyId };
    if (activeOnly) {
      where.isActive = true;
    }
    if (countryCode) {
      where.workTeam = { countryCode };
    }

    return this.prisma.providerSpecialtyAssignment.findMany({
      where,
      include: {
        workTeam: {
          include: {
            provider: true,
          },
        },
        specialty: true,
      },
      orderBy: [
        { workTeam: { provider: { name: 'asc' } } },
        { workTeam: { name: 'asc' } },
      ],
    });
  }

  /**
   * Update certification information for an assignment
   * @param assignmentId - Assignment UUID
   * @param certificationData - Certification update data
   * @returns Updated assignment
   */
  async updateCertification(
    assignmentId: string,
    certificationData: {
      isCertified: boolean;
      certificationNumber?: string;
      certificationIssuedAt?: Date;
      certificationExpiresAt?: Date;
    },
  ) {
    return this.prisma.providerSpecialtyAssignment.update({
      where: { id: assignmentId },
      data: certificationData,
      include: {
        specialty: true,
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Record job completion for performance tracking
   * @param assignmentId - Assignment UUID
   * @param jobData - Job completion data
   * @returns Updated assignment with new metrics
   */
  async recordJobCompletion(
    assignmentId: string,
    jobData: {
      durationMinutes: number;
      qualityScore: number; // 0-5 scale
      success: boolean;
    },
  ) {
    const assignment = await this.prisma.providerSpecialtyAssignment.findUnique(
      {
        where: { id: assignmentId },
      },
    );

    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    // Calculate new averages
    const totalJobs =
      assignment.totalJobsCompleted + assignment.totalJobsFailed;
    const newTotalJobs = totalJobs + 1;

    const currentAvgDuration = assignment.avgDurationMinutes || 0;
    const newAvgDuration =
      (currentAvgDuration * totalJobs + jobData.durationMinutes) / newTotalJobs;

    const currentAvgQuality = Number(assignment.avgQualityScore || 0);
    const newAvgQuality =
      (currentAvgQuality * totalJobs + jobData.qualityScore) / newTotalJobs;

    // Update counters and averages
    return this.prisma.providerSpecialtyAssignment.update({
      where: { id: assignmentId },
      data: {
        totalJobsCompleted: jobData.success
          ? assignment.totalJobsCompleted + 1
          : assignment.totalJobsCompleted,
        totalJobsFailed: !jobData.success
          ? assignment.totalJobsFailed + 1
          : assignment.totalJobsFailed,
        avgDurationMinutes: Math.round(newAvgDuration),
        avgQualityScore: parseFloat(newAvgQuality.toFixed(2)),
      },
      include: {
        specialty: true,
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Find work teams with required specialties for a service
   * @param serviceId - Service UUID
   * @param countryCode - Country code
   * @param minimumExperienceLevel - Minimum experience level required
   * @returns List of work teams that meet all requirements
   */
  async findQualifiedWorkTeamsForService(
    serviceId: string,
    countryCode: string,
    minimumExperienceLevel?: ExperienceLevel,
  ) {
    // Get required specialties for the service
    const requirements = await this.prisma.serviceSkillRequirement.findMany({
      where: { serviceId, isRequired: true },
      include: { specialty: true },
    });

    if (requirements.length === 0) {
      this.logger.warn(
        `Service ${serviceId} has no required specialties defined`,
      );
      return [];
    }

    const requiredSpecialtyIds = requirements.map((req) => req.specialtyId);

    // Find work teams that have ALL required specialties
    const workTeams = await this.prisma.workTeam.findMany({
      where: {
        countryCode,
        specialtyAssignments: {
          some: {
            specialtyId: { in: requiredSpecialtyIds },
            isActive: true,
          },
        },
      },
      include: {
        provider: true,
        specialtyAssignments: {
          where: {
            isActive: true,
            specialtyId: { in: requiredSpecialtyIds },
          },
          include: {
            specialty: true,
          },
        },
      },
    });

    // Filter work teams that have ALL required specialties
    const qualifiedTeams = workTeams.filter((team) => {
      const teamSpecialtyIds = team.specialtyAssignments.map(
        (assignment) => assignment.specialtyId,
      );

      // Check if team has all required specialties
      const hasAllRequiredSpecialties = requiredSpecialtyIds.every(
        (requiredId) => teamSpecialtyIds.includes(requiredId),
      );

      if (!hasAllRequiredSpecialties) {
        return false;
      }

      // Check minimum experience level if specified
      if (minimumExperienceLevel) {
        const experienceLevels: ExperienceLevel[] = [
          'JUNIOR',
          'INTERMEDIATE',
          'SENIOR',
          'EXPERT',
        ];
        const minLevelIndex = experienceLevels.indexOf(minimumExperienceLevel);

        const meetsExperienceRequirement = team.specialtyAssignments.every(
          (assignment) => {
            const assignmentLevelIndex = experienceLevels.indexOf(
              assignment.experienceLevel,
            );
            return assignmentLevelIndex >= minLevelIndex;
          },
        );

        if (!meetsExperienceRequirement) {
          return false;
        }
      }

      return true;
    });

    return qualifiedTeams;
  }

  /**
   * Get certifications expiring soon for a work team or all work teams
   * @param daysThreshold - Number of days ahead to check (default: 30)
   * @param workTeamId - Optional work team filter
   * @returns List of assignments with expiring certifications
   */
  async getExpiringCertifications(daysThreshold: number = 30, workTeamId?: string) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const where: any = {
      isActive: true,
      isCertified: true,
      certificationExpiresAt: {
        lte: thresholdDate,
        gte: new Date(),
      },
    };

    if (workTeamId) {
      where.workTeamId = workTeamId;
    }

    return this.prisma.providerSpecialtyAssignment.findMany({
      where,
      include: {
        specialty: true,
        workTeam: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { certificationExpiresAt: 'asc' },
    });
  }

  /**
   * Get specialty statistics for a country
   * @param countryCode - Country code
   * @returns Specialty assignment statistics
   */
  async getStatistics(countryCode: string) {
    const [totalAssignments, activeAssignments, certifiedAssignments, byCategory] =
      await Promise.all([
        this.prisma.providerSpecialtyAssignment.count({
          where: {
            workTeam: { countryCode },
          },
        }),
        this.prisma.providerSpecialtyAssignment.count({
          where: {
            workTeam: { countryCode },
            isActive: true,
          },
        }),
        this.prisma.providerSpecialtyAssignment.count({
          where: {
            workTeam: { countryCode },
            isActive: true,
            isCertified: true,
          },
        }),
        this.prisma.providerSpecialtyAssignment.groupBy({
          by: ['specialtyId'],
          where: {
            workTeam: { countryCode },
            isActive: true,
          },
          _count: true,
        }),
      ]);

    return {
      totalAssignments,
      activeAssignments,
      certifiedAssignments,
      certificationRate:
        activeAssignments > 0
          ? ((certifiedAssignments / activeAssignments) * 100).toFixed(2)
          : '0.00',
      bySpecialty: byCategory.length,
    };
  }
}
