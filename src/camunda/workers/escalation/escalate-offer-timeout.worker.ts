import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Input variables for escalate-offer-timeout task
 */
interface EscalateOfferTimeoutInput {
  serviceOrderId: string;
  assignmentId?: string;
  offerId?: string;
  providerId?: string;
  providerName?: string;
  offerSentAt?: string;
  offerExpiresAt?: string;
  escalationRound?: number;
}

/**
 * Output variables from escalate-offer-timeout task
 */
interface EscalateOfferTimeoutOutput {
  escalated: boolean;
  escalationAction: 'REASSIGN' | 'MANUAL_REVIEW' | 'CANCELLED';
  newAssignmentId?: string;
  newProviderId?: string;
  notificationSent: boolean;
  escalationReason: string;
}

/**
 * Escalate Offer Timeout Worker
 *
 * Task Type: escalate-offer-timeout
 *
 * Handles offer timeout escalation:
 * - Marks expired assignment as EXPIRED
 * - Attempts to reassign to next provider
 * - Sends notifications to operators
 * - After max escalations, routes to manual review
 */
@Injectable()
export class EscalateOfferTimeoutWorker extends BaseWorker<
  EscalateOfferTimeoutInput,
  EscalateOfferTimeoutOutput
> {
  protected readonly logger = new Logger(EscalateOfferTimeoutWorker.name);
  readonly taskType = 'escalate-offer-timeout';
  readonly timeout = 30000;

  private readonly MAX_ESCALATION_ROUNDS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async handle(job: ZeebeJob<EscalateOfferTimeoutInput>): Promise<EscalateOfferTimeoutOutput> {
    const {
      serviceOrderId,
      assignmentId,
      offerId,
      providerId,
      providerName,
      escalationRound = 1,
    } = job.variables;

    const actualAssignmentId = assignmentId || offerId;

    this.logger.log(
      `Escalating offer timeout for order ${serviceOrderId}, round ${escalationRound}`,
    );

    // Mark expired assignment
    if (actualAssignmentId) {
      await this.prisma.assignment.update({
        where: { id: actualAssignmentId },
        data: {
          state: 'EXPIRED',
          stateChangedAt: new Date(),
        },
      });
      this.logger.log(`Marked assignment ${actualAssignmentId} as EXPIRED`);
    }

    // Get service order context
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: {
        id: true,
        state: true,
        countryCode: true,
        businessUnit: true,
        urgency: true,
        serviceId: true,
      },
    });

    if (!serviceOrder) {
      this.logger.error(`Service order not found: ${serviceOrderId}`);
      return {
        escalated: true,
        escalationAction: 'MANUAL_REVIEW',
        notificationSent: false,
        escalationReason: 'Service order not found',
      };
    }

    // Check if we've exceeded max escalation rounds
    if (escalationRound >= this.MAX_ESCALATION_ROUNDS) {
      this.logger.warn(
        `Max escalation rounds (${this.MAX_ESCALATION_ROUNDS}) reached for order ${serviceOrderId}`,
      );

      // Update order state to require manual review (CREATED means needs attention)
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { state: 'CREATED' },
      });

      // Send notification to operators
      this.eventEmitter.emit('escalation.manual_review_required', {
        serviceOrderId,
        reason: `Offer expired ${escalationRound} times without response`,
        countryCode: serviceOrder.countryCode,
        urgency: serviceOrder.urgency,
      });

      return {
        escalated: true,
        escalationAction: 'MANUAL_REVIEW',
        notificationSent: true,
        escalationReason: `Max escalation rounds (${this.MAX_ESCALATION_ROUNDS}) reached`,
      };
    }

    // Try to find next available provider
    const nextProvider = await this.findNextAvailableProvider(
      serviceOrderId,
      providerId,
      serviceOrder.countryCode,
      serviceOrder.businessUnit,
    );

    if (!nextProvider) {
      this.logger.warn(`No alternative providers available for order ${serviceOrderId}`);

      // Update order state (CREATED means needs attention/manual assignment)
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { state: 'CREATED' },
      });

      // Notify operators
      this.eventEmitter.emit('escalation.no_providers', {
        serviceOrderId,
        reason: 'No alternative providers available after offer timeout',
        countryCode: serviceOrder.countryCode,
        urgency: serviceOrder.urgency,
      });

      return {
        escalated: true,
        escalationAction: 'MANUAL_REVIEW',
        notificationSent: true,
        escalationReason: 'No alternative providers available',
      };
    }

    // Create new assignment offer
    const newAssignment = await this.prisma.assignment.create({
      data: {
        serviceOrderId,
        providerId: nextProvider.id,
        workTeamId: null,
        assignmentMode: 'OFFER',
        assignmentMethod: 'ESCALATION',
        providerRank: escalationRound + 1,
        state: 'OFFERED',
        stateChangedAt: new Date(),
        createdBy: 'camunda-escalation',
      },
    });

    // Notify new provider
    this.eventEmitter.emit('offer.sent', {
      assignmentId: newAssignment.id,
      serviceOrderId,
      providerId: nextProvider.id,
      providerEmail: nextProvider.email,
      providerName: nextProvider.name,
      offerExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      countryCode: serviceOrder.countryCode,
      businessUnit: serviceOrder.businessUnit,
      isEscalation: true,
      escalationRound: escalationRound + 1,
    });

    this.logger.log(
      `Escalated to provider ${nextProvider.name} (round ${escalationRound + 1})`,
    );

    return {
      escalated: true,
      escalationAction: 'REASSIGN',
      newAssignmentId: newAssignment.id,
      newProviderId: nextProvider.id,
      notificationSent: true,
      escalationReason: `Reassigned to ${nextProvider.name} after offer timeout`,
    };
  }

  private async findNextAvailableProvider(
    serviceOrderId: string,
    excludeProviderId: string | undefined,
    countryCode: string,
    businessUnit: string,
  ): Promise<{ id: string; name: string; email: string | null } | null> {
    // Get providers who already declined or timed out on this order
    const previousAssignments = await this.prisma.assignment.findMany({
      where: { serviceOrderId },
      select: { providerId: true },
    });
    const excludedIds = previousAssignments.map((a) => a.providerId);
    if (excludeProviderId) {
      excludedIds.push(excludeProviderId);
    }

    // Find next available provider
    const provider = await this.prisma.provider.findFirst({
      where: {
        countryCode,
        businessUnit,
        status: 'ACTIVE',
        id: { notIn: excludedIds },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true },
    });

    return provider;
  }
}
