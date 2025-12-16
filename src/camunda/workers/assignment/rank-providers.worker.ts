import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for rank-providers task
 */
interface RankProvidersInput {
  serviceOrderId: string;
  candidateProviders: Array<{
    providerId: string;
    providerName: string;
    providerType: string;
    workTeamId?: string | null;
    zoneType?: string;
    maxCommuteMinutes?: number | null;
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
    workTeamId: string | null;
    rank: number;
    finalScore: number;
    scoreBreakdown: {
      baseScore: number;
      performanceScore: number;
      capacityScore: number;
      zoneScore: number;
      urgencyMultiplier: number;
    };
  }>;
  topProviderId: string | null;
  topProviderName: string | null;
  topWorkTeamId: string | null;
}

/**
 * Rank Providers Worker
 *
 * Task Type: rank-providers
 *
 * Applies advanced ranking criteria:
 * - Historical performance (completed jobs, quality scores)
 * - Capacity utilization
 * - Zone type priority (PRIMARY > SECONDARY > OVERFLOW)
 * - Urgency-based weighting
 */
@Injectable()
export class RankProvidersWorker extends BaseWorker<RankProvidersInput, RankProvidersOutput> {
  protected readonly logger = new Logger(RankProvidersWorker.name);
  readonly taskType = 'rank-providers';
  readonly timeout = 15000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<RankProvidersInput>): Promise<RankProvidersOutput> {
    const { serviceOrderId, candidateProviders, urgency } = job.variables;

    this.logger.log(`Ranking ${candidateProviders?.length || 0} providers for order ${serviceOrderId}`);

    if (!candidateProviders || candidateProviders.length === 0) {
      return {
        rankedProviders: [],
        topProviderId: null,
        topProviderName: null,
        topWorkTeamId: null,
      };
    }

    // Fetch historical performance data for all providers
    const providerIds = candidateProviders.map((p) => p.providerId);
    const workTeamIds = candidateProviders
      .filter((p) => p.workTeamId)
      .map((p) => p.workTeamId as string);

    // Get assignment stats for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [providerAssignments, workTeamSpecialties] = await Promise.all([
      // Assignment history per provider
      this.prisma.assignment.groupBy({
        by: ['providerId'],
        where: {
          providerId: { in: providerIds },
          createdAt: { gte: ninetyDaysAgo },
        },
        _count: { id: true },
        _avg: { providerScore: true },
      }),
      // Work team specialty data for quality scores
      workTeamIds.length > 0
        ? this.prisma.providerSpecialtyAssignment.findMany({
            where: {
              workTeamId: { in: workTeamIds },
              isActive: true,
            },
            select: {
              workTeamId: true,
              avgQualityScore: true,
              totalJobsCompleted: true,
            },
          })
        : [],
    ]);

    // Build lookup maps
    const providerStatsMap = new Map<string, { count: number; avgScore: number | null }>(
      providerAssignments.map((pa) => [
        pa.providerId,
        { count: pa._count.id, avgScore: pa._avg.providerScore ? Number(pa._avg.providerScore) : null },
      ]),
    );

    const workTeamQualityMap = new Map<string, { avgQuality: number; totalJobs: number }>();
    for (const wts of workTeamSpecialties) {
      const existing = workTeamQualityMap.get(wts.workTeamId);
      const quality = wts.avgQualityScore ? Number(wts.avgQualityScore) : 0;
      const jobs = wts.totalJobsCompleted || 0;
      if (existing) {
        // Aggregate across specialties
        workTeamQualityMap.set(wts.workTeamId, {
          avgQuality: (existing.avgQuality + quality) / 2,
          totalJobs: existing.totalJobs + jobs,
        });
      } else {
        workTeamQualityMap.set(wts.workTeamId, { avgQuality: quality, totalJobs: jobs });
      }
    }

    // Urgency multiplier
    const urgencyMultiplier: Record<string, number> = {
      URGENT: 1.3,
      STANDARD: 1,
      LOW: 0.9,
    };

    // Zone type scores (PRIMARY preferred)
    const zoneScores = {
      PRIMARY: 20,
      SECONDARY: 10,
      OVERFLOW: 0,
    };

    // Calculate scores for each provider
    const scoredProviders = candidateProviders.map((provider) => {
      const baseScore = 50; // Base score for being eligible

      // Performance score: based on historical quality and volume
      let performanceScore = 0;
      const providerStats = providerStatsMap.get(provider.providerId);
      if (providerStats && providerStats.avgScore !== null) {
        // Normalize avg score (0-100) to 0-20 points
        const avgScore = providerStats.avgScore;
        performanceScore += (avgScore / 100) * 20;
      }
      if (provider.workTeamId) {
        const teamQuality = workTeamQualityMap.get(provider.workTeamId);
        if (teamQuality) {
          // Quality score (0-5) -> 0-15 points
          performanceScore += (teamQuality.avgQuality / 5) * 15;
        }
      }

      // Capacity score: bonus for having capacity
      const capacityScore = provider.hasCapacity ? 15 : 0;

      // Zone score: prefer primary zones
      const zoneScore = zoneScores[provider.zoneType as keyof typeof zoneScores] ?? 0;

      // Calculate final weighted score
      const rawScore = baseScore + performanceScore + capacityScore + zoneScore;
      const multiplier = urgencyMultiplier[urgency] ?? 1;
      const finalScore = Math.round(rawScore * multiplier * 10) / 10;

      return {
        providerId: provider.providerId,
        providerName: provider.providerName,
        workTeamId: provider.workTeamId || null,
        rank: 0,
        finalScore,
        scoreBreakdown: {
          baseScore,
          performanceScore: Math.round(performanceScore * 10) / 10,
          capacityScore,
          zoneScore,
          urgencyMultiplier: multiplier,
        },
      };
    });

    // Sort by final score descending and assign ranks
    const sortedProviders = [...scoredProviders].sort((a, b) => b.finalScore - a.finalScore);
    const rankedProviders = sortedProviders.map((provider, index) => ({
        ...provider,
        rank: index + 1,
      }));

    const topProvider = rankedProviders[0];

    this.logger.log(
      `Ranked ${rankedProviders.length} providers. Top: ${topProvider?.providerName} (score: ${topProvider?.finalScore})`,
    );

    // Persist funnel execution for audit
    if (serviceOrderId) {
      await this.prisma.assignmentFunnelExecution.create({
        data: {
          serviceOrderId,
          requestedDate: new Date(),
          requestedSlot: null,
          totalProvidersEvaluated: candidateProviders.length,
          eligibleProviders: rankedProviders.length,
          funnelSteps: rankedProviders.map((rp) => ({
            step: 'ranking',
            providerId: rp.providerId,
            rank: rp.rank,
            score: rp.finalScore,
            breakdown: rp.scoreBreakdown,
          })),
          executionTimeMs: 0,
          executedBy: 'camunda-worker',
        },
      });
    }

    return {
      rankedProviders,
      topProviderId: topProvider?.providerId || null,
      topProviderName: topProvider?.providerName || null,
      topWorkTeamId: topProvider?.workTeamId || null,
    };
  }
}
