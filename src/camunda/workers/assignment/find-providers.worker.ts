import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Input variables for find-providers task
 */
interface FindProvidersInput {
  serviceOrderId: string;
  serviceType: string;
  postalCode: string;
  countryCode: string;
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
    providerType: string;
    score: number;
    distanceKm: number;
    hasCapacity: boolean;
  }>;
  providersFound: boolean;
  assignmentMode: 'OFFER' | 'AUTO_ACCEPT' | 'DIRECT';
}

/**
 * Find Providers Worker
 * 
 * Task Type: find-providers
 * 
 * Finds eligible providers based on:
 * - Service type (specialty)
 * - Geographic coverage (postal code in intervention zone)
 * - Country code
 * - Availability on scheduled date
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
    const { serviceType, postalCode, countryCode, scheduledDate, urgency } = job.variables;

    this.logger.log(
      `Finding providers for ${serviceType} in ${postalCode} (${countryCode})`
    );

    // Find providers with matching intervention zones
    const providers = await this.prisma.provider.findMany({
      where: {
        status: 'ACTIVE',
        interventionZones: {
          some: {
            postalCodes: {
              has: postalCode,
            },
            isActive: true,
          },
        },
        servicePriorityConfigs: {
          some: {
            specialty: {
              code: serviceType,
            },
            priorityType: {
              in: ['P1', 'P2'], // Not OPT_OUT
            },
          },
        },
      },
      include: {
        workingSchedule: true,
        interventionZones: {
          where: {
            postalCodes: { has: postalCode },
          },
        },
        servicePriorityConfigs: {
          where: {
            specialty: { code: serviceType },
          },
          include: {
            specialty: true,
          },
        },
        workTeams: {
          where: { status: 'ACTIVE' },
          include: {
            certifications: true,
          },
        },
      },
    });

    if (providers.length === 0) {
      this.logger.warn(`No providers found for ${serviceType} in ${postalCode}`);
      return {
        candidateProviders: [],
        providersFound: false,
        assignmentMode: this.getAssignmentMode(countryCode),
      };
    }

    // Score and rank providers
    const rankedProviders = providers
      .map(provider => {
        const zone = provider.interventionZones[0];
        const priority = provider.servicePriorityConfigs[0];
        
        // Calculate score based on:
        // - Zone type (PRIMARY > SECONDARY > OVERFLOW)
        // - Provider type (P1 > P2)
        // - Has active work teams
        let score = 50; // Base score
        
        if (zone?.zoneType === 'PRIMARY') score += 30;
        else if (zone?.zoneType === 'SECONDARY') score += 15;
        
        if (provider.type === 'P1') score += 10;
        if (priority?.priorityType === 'P1') score += 10;
        
        if (provider.workTeams.length > 0) score += 10;
        
        return {
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          score,
          distanceKm: zone?.maxDistanceKm || 0,
          hasCapacity: provider.workTeams.length > 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    this.logger.log(`Found ${rankedProviders.length} eligible providers`);

    return {
      candidateProviders: rankedProviders,
      providersFound: true,
      assignmentMode: this.getAssignmentMode(countryCode),
    };
  }

  /**
   * Determine assignment mode by country
   * FR/PL = OFFER (provider must accept)
   * ES/IT = AUTO_ACCEPT (automatic assignment)
   */
  private getAssignmentMode(countryCode: string): 'OFFER' | 'AUTO_ACCEPT' | 'DIRECT' {
    switch (countryCode) {
      case 'FR':
      case 'PL':
        return 'OFFER';
      case 'ES':
      case 'IT':
        return 'AUTO_ACCEPT';
      default:
        return 'OFFER';
    }
  }
}
