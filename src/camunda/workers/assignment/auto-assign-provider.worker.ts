import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for auto-assign-provider task
 */
interface AutoAssignInput {
  serviceOrderId: string;
  urgency: 'URGENT' | 'STANDARD' | 'LOW';
  rankedProviders: Array<{
    providerId: string;
    workTeamId?: string;
    score: number;
    providerType: 'P1' | 'P2';
    servicePriority: 'P1' | 'P2' | 'OPT_OUT';
    hasCapacity: boolean;
  }>;
}

/**
 * Output variables from auto-assign-provider task
 */
interface AutoAssignOutput {
  autoAssigned: boolean;
  assignedProviderId?: string;
  assignedWorkTeamId?: string;
  assignmentReason?: string;
  assignedAt?: string;
  autoAssignFailReason?: string;
  nextProviderId?: string;
  nextProviderRank?: number;
}

/**
 * Auto-Assign Provider Worker
 *
 * Task Type: auto-assign-provider
 *
 * Attempts to automatically assign a provider based on:
 * - P1 priority providers (always accept)
 * - High-ranked providers with capacity
 * - Provider preferences and bundling rules
 */
@Injectable()
export class AutoAssignProviderWorker extends BaseWorker<AutoAssignInput, AutoAssignOutput> {
  protected readonly logger = new Logger(AutoAssignProviderWorker.name);
  readonly taskType = 'auto-assign-provider';
  readonly timeout = 20000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<AutoAssignInput>): Promise<AutoAssignOutput> {
    const { serviceOrderId, rankedProviders, urgency } = job.variables;

    this.logger.log(`Auto-assign attempt for order: ${serviceOrderId}`);

    // No providers available
    if (!rankedProviders || rankedProviders.length === 0) {
      this.logger.log(`No providers available for order ${serviceOrderId}`);
      return {
        autoAssigned: false,
        autoAssignFailReason: 'No eligible providers found',
      };
    }

    // Find first P1 service priority provider with capacity
    // P1 service priority means "always accept" - auto-assign eligible
    const p1Provider = rankedProviders.find((p) => p.servicePriority === 'P1' && p.hasCapacity);

    if (p1Provider) {
      // TODO: Implement real assignment logic:
      // - Reserve capacity slot
      // - Create assignment record
      // - Update service order status

      this.logger.log(
        `Auto-assigned order ${serviceOrderId} to P1 provider ${p1Provider.providerId}`,
      );
      return {
        autoAssigned: true,
        assignedProviderId: p1Provider.providerId,
        assignedWorkTeamId: p1Provider.workTeamId,
        assignmentReason: 'P1 priority provider with capacity - auto-assigned',
        assignedAt: new Date().toISOString(),
      };
    }

    // Check for URGENT orders - may have different auto-assign rules
    if (urgency === 'URGENT') {
      const topProvider = rankedProviders[0];
      if (topProvider.hasCapacity && topProvider.score >= 90) {
        this.logger.log(
          `Auto-assigned URGENT order ${serviceOrderId} to high-score provider ${topProvider.providerId}`,
        );
        return {
          autoAssigned: true,
          assignedProviderId: topProvider.providerId,
          assignedWorkTeamId: topProvider.workTeamId,
          assignmentReason: 'Urgent order with high-score available provider',
          assignedAt: new Date().toISOString(),
        };
      }
    }

    // Auto-assign not possible, will need to send offer
    this.logger.log(`Auto-assign not possible for order ${serviceOrderId} - offer required`);
    return {
      autoAssigned: false,
      autoAssignFailReason: 'No auto-assign eligible providers - offer required',
      nextProviderId: rankedProviders[0]?.providerId,
      nextProviderRank: 1,
    };
  }
}
