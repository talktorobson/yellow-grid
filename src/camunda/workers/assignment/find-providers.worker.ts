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
    score: number;
    distanceKm: number;
    hasCapacity: boolean;
  }>;
  providersFound: number;
  assignmentMode: 'OFFER' | 'AUTO_ACCEPT';
}

/**
 * Find Providers Worker (Stub)
 *
 * Task Type: find-providers
 *
 * Finds eligible providers based on:
 * - Service type
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
    const { serviceTypeCode, postalCode, countryCode, urgency } = job.variables;

    // Simplified stub for infrastructure testing
    // TODO: Implement full provider finding logic with intervention zones
    this.logger.log(`Finding providers for ${serviceTypeCode} in ${postalCode}, ${countryCode}`);

    // Return mock providers for testing
    const candidateProviders = [
      {
        providerId: 'mock-provider-1',
        providerName: 'Test Provider 1',
        providerType: 'P1' as const,
        score: 90,
        distanceKm: 5,
        hasCapacity: true,
      },
      {
        providerId: 'mock-provider-2',
        providerName: 'Test Provider 2',
        providerType: 'P2' as const,
        score: 75,
        distanceKm: 10,
        hasCapacity: true,
      },
    ];

    this.logger.log(`Found ${candidateProviders.length} mock providers`);

    // Determine assignment mode based on country
    const assignmentMode = ['ES', 'IT'].includes(countryCode) ? 'AUTO_ACCEPT' : 'OFFER';

    return {
      candidateProviders,
      providersFound: candidateProviders.length,
      assignmentMode,
    };
  }
}
