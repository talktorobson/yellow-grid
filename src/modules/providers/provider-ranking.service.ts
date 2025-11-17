import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface CandidateFilterInput {
  serviceId: string;
  countryCode: string;
  businessUnit: string;
  postalCode?: string;
  requiredDurationMinutes: number;
  limit?: number;
  serviceOrderId?: string;
  requestedDate?: Date;
  requestedSlot?: string;
  executedBy?: string;
}

export interface CandidateScore {
  workTeamId: string;
  providerId: string;
  score: number;
  reasons: string[];
  capacityScore: number;
  qualityScore: number;
  distanceScore: number;
}

export interface FunnelAuditEntry {
  step: string;
  workTeamId: string;
  providerId: string;
  passed: boolean;
  reasons: string[];
}

export interface RankingResult {
  rankings: CandidateScore[];
  funnel: FunnelAuditEntry[];
}

@Injectable()
export class ProviderRankingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rank providers/work teams for a service order based on eligibility and scoring.
   * Eligibility: matching country/BU, active, has required specialties, capacity > 0.
   * Scoring: weighted by capacity utilization, distance, historical quality.
   */
  async rankCandidates(input: CandidateFilterInput): Promise<RankingResult> {
    const {
      serviceId,
      countryCode,
      businessUnit,
      postalCode,
      requiredDurationMinutes,
      limit = 10,
      serviceOrderId,
      requestedDate,
      requestedSlot,
      executedBy = 'system',
    } = input;

    const funnel: FunnelAuditEntry[] = [];
    const startedAt = Date.now();

    // 1) Fetch required specialties for the service
    const requiredSpecialties = await this.prisma.serviceSkillRequirement.findMany({
      where: { serviceId, isRequired: true },
      select: { specialtyId: true },
    });
    const requiredIds = requiredSpecialties.map((r) => r.specialtyId);

    // 2) Fetch candidate work teams with specialties and capacity
    const candidates = await this.prisma.workTeam.findMany({
      where: {
        provider: {
          countryCode,
          businessUnit,
          status: 'ACTIVE',
        },
      },
      include: {
        specialtyAssignments: {
          where: { isActive: true },
          select: {
            specialtyId: true,
            experienceLevel: true,
            avgQualityScore: true,
            totalJobsCompleted: true,
          },
        },
      },
    });

    const scored: CandidateScore[] = [];

    for (const candidate of candidates) {
      const reasons: string[] = [];

      // Eligibility: specialties
      const specialtyIds = candidate.specialtyAssignments.map((sa) => sa.specialtyId);
      const hasAllRequired = requiredIds.every((id) => specialtyIds.includes(id));
      if (!hasAllRequired) {
        reasons.push('missing_required_specialties');
        funnel.push({
          step: 'eligibility.specialties',
          workTeamId: candidate.id,
          providerId: candidate.providerId,
          passed: false,
          reasons,
        });
        continue;
      }

      // Eligibility: postal code (simple exact match list)
      if (postalCode) {
        const postalList = Array.isArray(candidate.postalCodes) ? (candidate.postalCodes as string[]) : [];
        if (!postalList.includes(postalCode)) {
          reasons.push('postal_code_not_covered');
          funnel.push({
            step: 'eligibility.postal_code',
            workTeamId: candidate.id,
            providerId: candidate.providerId,
            passed: false,
            reasons,
          });
          continue;
        }
      }

      funnel.push({
        step: 'eligibility',
        workTeamId: candidate.id,
        providerId: candidate.providerId,
        passed: true,
        reasons: ['eligible'],
      });

      // Capacity heuristic: fewer completed jobs means more availability; normalized
      const avgCompleted =
        candidate.specialtyAssignments.reduce((sum, sa) => sum + (sa.totalJobsCompleted ?? 0), 0) || 0;
      const capacityScore = candidate.maxDailyJobs > 0 ? 1 - Math.min(avgCompleted / candidate.maxDailyJobs, 1) : 0.5;

      // Quality heuristic
      const qualityScores = candidate.specialtyAssignments
        .map((sa) => (sa.avgQualityScore ? Number(sa.avgQualityScore as Decimal) : null))
        .filter((v) => v !== null) as number[];
      const avgQuality = qualityScores.length ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 3;
      const qualityScore = avgQuality / 5; // normalize 0-1

      // Distance heuristic placeholder (no geo service yet); neutral weight if missing
      const distanceScore = 0.5;

      // Final weighted score
      const score = capacityScore * 0.4 + qualityScore * 0.4 + distanceScore * 0.2;
      reasons.push('eligible');

      scored.push({
        workTeamId: candidate.id,
        providerId: candidate.providerId,
        score,
        reasons,
        capacityScore,
        qualityScore,
        distanceScore,
      });
    }

    const rankings = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Persist funnel execution if serviceOrderId provided
    if (serviceOrderId) {
      const executionTimeMs = Date.now() - startedAt;
      await this.prisma.assignmentFunnelExecution.create({
        data: {
          serviceOrderId,
          requestedDate: requestedDate ?? new Date(),
          requestedSlot: requestedSlot ?? null,
          totalProvidersEvaluated: candidates.length,
          eligibleProviders: rankings.length,
          funnelSteps: funnel as unknown as any,
          executionTimeMs,
          executedBy,
        },
      });
    }

    return { rankings, funnel };
  }
}
