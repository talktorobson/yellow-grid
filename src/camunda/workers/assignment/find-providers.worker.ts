import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for find-providers task
 */
interface FindProvidersInput {
  serviceOrderId: string;
  serviceTypeCode: string;
  postalCode: string;
  countryCode: string;
  businessUnit?: string;
  scheduledDate?: string;
  urgency: 'URGENT' | 'STANDARD' | 'LOW';
}

/**
 * Output variables from find-providers task
 */
interface FindProvidersOutput {
  candidateProviders: Array<{
    providerId: string;
    providerName: string;
    providerType: 'P1' | 'P2';
    workTeamId: string | null;
    zoneType: string;
    maxCommuteMinutes: number | null;
    hasCapacity: boolean;
  }>;
  providersFound: number;
  assignmentMode: 'OFFER' | 'AUTO_ACCEPT';
}

/**
 * Find Providers Worker
 *
 * Task Type: find-providers
 *
 * Finds eligible providers based on:
 * - Service type specialty match
 * - Geographic coverage (postal code in intervention zone)
 * - Country code and business unit match
 * - Provider status (ACTIVE only)
 */
@Injectable()
export class FindProvidersWorker extends BaseWorker<FindProvidersInput, FindProvidersOutput> {
  protected readonly logger = new Logger(FindProvidersWorker.name);
  readonly taskType = 'find-providers';
  readonly timeout = 30000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<FindProvidersInput>): Promise<FindProvidersOutput> {
    const { serviceTypeCode, postalCode, countryCode, businessUnit } =
      job.variables;

    this.logger.log(
      `Finding providers for ${serviceTypeCode} in ${postalCode}, ${countryCode}/${businessUnit || 'any'}`,
    );

    // Normalize postal code
    const normalizedPostal = postalCode.replaceAll(/\s+/g, '').toUpperCase();

    // Get the service to find required specialties
    const service = await this.prisma.serviceCatalog.findFirst({
      where: { fsmServiceCode: serviceTypeCode, status: 'ACTIVE' },
      include: {
        skillRequirements: {
          where: { isRequired: true },
          select: { specialtyId: true },
        },
      },
    });

    const requiredSpecialtyIds = service?.skillRequirements.map((sr: { specialtyId: string }) => sr.specialtyId) || [];

    // Build provider filter
    const providerFilter: any = {
      countryCode,
      status: 'ACTIVE',
    };
    if (businessUnit) {
      providerFilter.businessUnit = businessUnit;
    }

    // Find intervention zones that cover this postal code
    // Prisma doesn't support JSON array search natively, so we fetch and filter
    const interventionZones = await this.prisma.interventionZone.findMany({
      where: {
        provider: providerFilter,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            providerType: true,
            status: true,
            workTeams: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                maxDailyJobs: true,
                specialtyAssignments: {
                  where: { isActive: true },
                  select: { specialtyId: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ assignmentPriority: 'asc' }, { zoneType: 'asc' }],
    });

    // Filter zones that cover the postal code
    const matchingZones = interventionZones.filter((zone) => {
      const postalCodes = zone.postalCodes as string[] | null;
      return postalCodes?.includes(normalizedPostal);
    });

    if (matchingZones.length === 0) {
      this.logger.warn(`No providers cover postal code: ${normalizedPostal}`);
      throw new BpmnError(
        'NO_PROVIDERS_FOUND',
        `No active providers cover postal code ${normalizedPostal} in ${countryCode}`,
      );
    }

    // Build candidate list with deduplication
    const candidateMap = new Map<
      string,
      FindProvidersOutput['candidateProviders'][0]
    >();

    for (const zone of matchingZones) {
      const provider = zone.provider;
      
      // Check if provider has work teams with required specialties
      let eligibleWorkTeam: { id: string; maxDailyJobs: number } | null = null;
      
      for (const team of provider.workTeams) {
        const teamSpecialtyIds = new Set(team.specialtyAssignments.map((sa) => sa.specialtyId));
        // Note: every() returns true for empty array, which is correct - no requirements = any team qualifies
        const hasAllRequired = requiredSpecialtyIds.every((id: string) => teamSpecialtyIds.has(id));
        
        if (hasAllRequired) {
          eligibleWorkTeam = team;
          break; // Take first eligible team
        }
      }

      // Skip if provider already added with better zone type
      if (candidateMap.has(provider.id)) {
        continue;
      }

      candidateMap.set(provider.id, {
        providerId: provider.id,
        providerName: provider.name,
        providerType: (provider.providerType as 'P1' | 'P2') || 'P2',
        workTeamId: eligibleWorkTeam?.id || null,
        zoneType: zone.zoneType,
        maxCommuteMinutes: zone.maxCommuteMinutes,
        hasCapacity: eligibleWorkTeam !== null && eligibleWorkTeam.maxDailyJobs > 0,
      });
    }

    const candidateProviders = Array.from(candidateMap.values());

    // Sort: P1 first, then by zone type (PRIMARY > SECONDARY > OVERFLOW)
    const zoneOrder: Record<string, number> = { PRIMARY: 0, SECONDARY: 1, OVERFLOW: 2 };
    candidateProviders.sort((a, b) => {
      // P1 providers first
      if (a.providerType === 'P1' && b.providerType !== 'P1') return -1;
      if (a.providerType !== 'P1' && b.providerType === 'P1') return 1;

      // Then by zone type
      return (zoneOrder[a.zoneType] ?? 99) - (zoneOrder[b.zoneType] ?? 99);
    });

    this.logger.log(`Found ${candidateProviders.length} eligible providers for ${normalizedPostal}`);

    // Determine assignment mode based on country (ES, IT use AUTO_ACCEPT)
    const assignmentMode = ['ES', 'IT'].includes(countryCode) ? 'AUTO_ACCEPT' : 'OFFER';

    return {
      candidateProviders,
      providersFound: candidateProviders.length,
      assignmentMode,
    };
  }
}
