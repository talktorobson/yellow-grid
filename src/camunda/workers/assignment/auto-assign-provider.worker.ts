import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for auto-assign-provider task
 */
interface AutoAssignInput {
  serviceOrderId: string;
  countryCode: string;
  urgency: 'URGENT' | 'STANDARD' | 'LOW';
  rankedProviders: Array<{
    providerId: string;
    providerName: string;
    workTeamId?: string | null;
    rank: number;
    finalScore: number;
  }>;
  // Scheduling preferences from workflow
  requestedStartDate?: string;
  requestedEndDate?: string;
}

/**
 * Output variables from auto-assign-provider task
 */
interface AutoAssignOutput {
  autoAssigned: boolean;
  assignmentId?: string;
  assignedProviderId?: string;
  assignedWorkTeamId?: string;
  assignmentReason?: string;
  assignedAt?: string;
  autoAssignFailReason?: string;
  nextProviderId?: string;
  nextProviderRank?: number;
  // Scheduling data for check-availability
  scheduledDate?: string;
  scheduledSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING';
}

/**
 * Auto-Assign Provider Worker
 *
 * Task Type: auto-assign-provider
 *
 * Attempts to automatically assign a provider based on:
 * - Country rules (ES, IT use AUTO_ACCEPT mode)
 * - P1 priority service config (always accept)
 * - High-ranked providers with capacity
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
    const { serviceOrderId, countryCode, rankedProviders, urgency, requestedStartDate } = job.variables;

    this.logger.log(`Auto-assign attempt for order: ${serviceOrderId}`);

    // Compute scheduling data from requested start date
    const schedulingData = this.computeSchedulingData(requestedStartDate);

    // No providers available
    if (!rankedProviders || rankedProviders.length === 0) {
      this.logger.log(`No providers available for order ${serviceOrderId}`);
      return {
        autoAssigned: false,
        autoAssignFailReason: 'No eligible providers found',
        ...schedulingData,
      };
    }

    // ES and IT countries use AUTO_ACCEPT mode - auto-assign to top provider
    const autoAcceptCountries = ['ES', 'IT'];
    const isAutoAcceptMode = autoAcceptCountries.includes(countryCode);

    // Get service order for context
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: { id: true, serviceId: true, businessUnit: true, requestedStartDate: true },
    });

    if (!serviceOrder) {
      this.logger.error(`Service order not found: ${serviceOrderId}`);
      return {
        autoAssigned: false,
        autoAssignFailReason: 'Service order not found',
      };
    }

    // Check each provider for P1 service priority or auto-accept eligibility
    for (const provider of rankedProviders) {
      // Check if provider has P1 service priority for this service type
      // ServicePriorityConfig relates to ProviderSpecialty, which maps to ServiceCatalog via SpecialtyServiceMapping
      const servicePriorityConfig = serviceOrder.serviceId
        ? await this.prisma.servicePriorityConfig.findFirst({
            where: {
              providerId: provider.providerId,
              specialty: {
                serviceMappings: {
                  some: {
                    serviceId: serviceOrder.serviceId,
                  },
                },
              },
              priority: 'P1',
              validFrom: { lte: new Date() },
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            },
          })
        : null;

      const isP1Priority = servicePriorityConfig !== null;
      const canAutoAssign = isP1Priority || isAutoAcceptMode;

      if (canAutoAssign) {
        // Create assignment record with ACCEPTED state
        const assignment = await this.prisma.$transaction(async (tx) => {
          // Create assignment
          const newAssignment = await tx.assignment.create({
            data: {
              serviceOrderId,
              providerId: provider.providerId,
              workTeamId: provider.workTeamId,
              assignmentMode: isAutoAcceptMode ? 'AUTO_ACCEPT' : 'DIRECT',
              assignmentMethod: 'AUTO',
              providerRank: provider.rank,
              providerScore: provider.finalScore,
              scoreBreakdown: Prisma.DbNull,
              state: 'ACCEPTED',
              stateChangedAt: new Date(),
              acceptedAt: new Date(),
              createdBy: 'camunda-auto-assign',
            },
          });

          // Update service order with assigned provider
          await tx.serviceOrder.update({
            where: { id: serviceOrderId },
            data: {
              assignedProviderId: provider.providerId,
              state: 'ASSIGNED',
            },
          });

          return newAssignment;
        });

        const reason = isP1Priority
          ? 'P1 priority service config - auto-assigned'
          : `${countryCode} country uses AUTO_ACCEPT mode`;

        this.logger.log(
          `Auto-assigned order ${serviceOrderId} to provider ${provider.providerName} (${reason})`,
        );

        return {
          autoAssigned: true,
          assignmentId: assignment.id,
          assignedProviderId: provider.providerId,
          assignedWorkTeamId: provider.workTeamId || undefined,
          assignmentReason: reason,
          assignedAt: new Date().toISOString(),
          ...schedulingData,
        };
      }
    }

    // Check for URGENT orders with high-score providers (special handling)
    if (urgency === 'URGENT') {
      const topProvider = rankedProviders[0];
      if (topProvider.finalScore >= 90) {
        // Create assignment with ACCEPTED state for urgent high-score match
        const assignment = await this.prisma.$transaction(async (tx) => {
          const newAssignment = await tx.assignment.create({
            data: {
              serviceOrderId,
              providerId: topProvider.providerId,
              workTeamId: topProvider.workTeamId,
              assignmentMode: 'DIRECT',
              assignmentMethod: 'AUTO',
              providerRank: topProvider.rank,
              providerScore: topProvider.finalScore,
              state: 'ACCEPTED',
              stateChangedAt: new Date(),
              acceptedAt: new Date(),
              createdBy: 'camunda-urgent-auto-assign',
            },
          });

          await tx.serviceOrder.update({
            where: { id: serviceOrderId },
            data: {
              assignedProviderId: topProvider.providerId,
              state: 'ASSIGNED',
            },
          });

          return newAssignment;
        });

        this.logger.log(
          `Auto-assigned URGENT order ${serviceOrderId} to high-score provider ${topProvider.providerName}`,
        );

        return {
          autoAssigned: true,
          assignmentId: assignment.id,
          assignedProviderId: topProvider.providerId,
          assignedWorkTeamId: topProvider.workTeamId || undefined,
          assignmentReason: 'Urgent order with high-score provider - auto-assigned',
          assignedAt: new Date().toISOString(),
          ...schedulingData,
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
      ...schedulingData,
    };
  }

  /**
   * Compute scheduling data from requested start date
   */
  private computeSchedulingData(requestedStartDate?: string): {
    scheduledDate?: string;
    scheduledSlot?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  } {
    if (!requestedStartDate) {
      // Default to tomorrow morning
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        scheduledDate: tomorrow.toISOString().split('T')[0],
        scheduledSlot: 'MORNING',
      };
    }

    const date = new Date(requestedStartDate);
    const hour = date.getHours();

    let slot: 'MORNING' | 'AFTERNOON' | 'EVENING';
    if (hour < 12) {
      slot = 'MORNING';
    } else if (hour < 17) {
      slot = 'AFTERNOON';
    } else {
      slot = 'EVENING';
    }

    return {
      scheduledDate: date.toISOString().split('T')[0],
      scheduledSlot: slot,
    };
  }
}
