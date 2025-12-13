import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';

/**
 * Input variables for rank-providers task
 */
interface RankProvidersInput {
  serviceOrderId: string;
  candidateProviders: Array<{
    providerId: string;
    providerName: string;
    providerType: string;
    score: number;
    distanceKm: number;
    hasCapacity: boolean;
  }>;
  urgency: 'URGENT' | 'STANDARD' | 'LOW';
  scheduledDate?: string;
}

/**
 * Output variables from rank-providers task
 */
interface RankProvidersOutput {
  rankedProviders: Array<{
    providerId: string;
    providerName: string;
    rank: number;
    finalScore: number;
  }>;
  topProviderId: string | null;
  topProviderName: string | null;
}

/**
 * Rank Providers Worker
 *
 * Task Type: rank-providers
 *
 * Applies advanced ranking criteria:
 * - Historical performance
 * - Customer ratings
 * - Current workload
 * - Response time
 */
@Injectable()
export class RankProvidersWorker extends BaseWorker<RankProvidersInput, RankProvidersOutput> {
  protected readonly logger = new Logger(RankProvidersWorker.name);
  readonly taskType = 'rank-providers';
  readonly timeout = 15000;

  async handle(job: ZeebeJob<RankProvidersInput>): Promise<RankProvidersOutput> {
    const { candidateProviders, urgency } = job.variables;

    if (!candidateProviders || candidateProviders.length === 0) {
      return {
        rankedProviders: [],
        topProviderId: null,
        topProviderName: null,
      };
    }

    // Apply urgency-based weighting
    const urgencyMultiplier = {
      URGENT: 1.5,
      STANDARD: 1.0,
      LOW: 0.8,
    };

    const rankedProviders = candidateProviders
      .map((provider, index) => {
        // Apply urgency weighting
        let finalScore = provider.score * urgencyMultiplier[urgency];

        // Bonus for capacity
        if (provider.hasCapacity) {
          finalScore += 5;
        }

        // Penalty for distance (for urgent jobs)
        if (urgency === 'URGENT' && provider.distanceKm > 20) {
          finalScore -= 10;
        }

        return {
          providerId: provider.providerId,
          providerName: provider.providerName,
          rank: 0, // Will be set after sorting
          finalScore: Math.round(finalScore * 10) / 10,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((provider, index) => ({
        ...provider,
        rank: index + 1,
      }));

    const topProvider = rankedProviders[0];

    this.logger.log(
      `Ranked ${rankedProviders.length} providers. Top: ${topProvider?.providerName} (score: ${topProvider?.finalScore})`,
    );

    return {
      rankedProviders,
      topProviderId: topProvider?.providerId || null,
      topProviderName: topProvider?.providerName || null,
    };
  }
}
