import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Input variables for send-offer task
 */
interface SendOfferInput {
  serviceOrderId: string;
  // These come from rank-providers output
  topProviderId?: string;
  topProviderName?: string;
  topWorkTeamId?: string | null;
  // These are aliases for backwards compatibility
  providerId?: string;
  providerName?: string;
  workTeamId?: string | null;
  providerRank?: number;
  providerScore?: number;
  scheduledDate?: string;
  offerExpirationHours?: number;
}

/**
 * Output variables from send-offer task
 */
interface SendOfferOutput {
  assignmentId: string;
  offerId: string; // For message correlation
  offerSentAt: string;
  offerExpiresAt: string;
}

/**
 * Send Offer Worker
 *
 * Task Type: send-offer
 *
 * Sends an assignment offer to a provider and creates an Assignment record.
 * - Creates Assignment with OFFERED state
 * - Calculates offer expiration time
 * - Emits notification event for provider
 */
@Injectable()
export class SendOfferWorker extends BaseWorker<SendOfferInput, SendOfferOutput> {
  protected readonly logger = new Logger(SendOfferWorker.name);
  readonly taskType = 'send-offer';
  readonly timeout = 15000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async handle(job: ZeebeJob<SendOfferInput>): Promise<SendOfferOutput> {
    const {
      serviceOrderId,
      // Use topProviderId from rank-providers, fallback to providerId for backwards compatibility
      topProviderId,
      topProviderName,
      topWorkTeamId,
      providerId,
      providerName,
      workTeamId,
      providerRank,
      providerScore,
      offerExpirationHours = 4,
    } = job.variables;

    // Resolve the actual provider ID and name
    const resolvedProviderId = topProviderId || providerId;
    const resolvedProviderName = topProviderName || providerName;
    const resolvedWorkTeamId = topWorkTeamId || workTeamId;

    if (!resolvedProviderId) {
      throw new BpmnError('NO_PROVIDER', 'No provider ID available for sending offer');
    }

    this.logger.log(
      `Sending offer to provider ${resolvedProviderName} (${resolvedProviderId}) for order ${serviceOrderId}`,
    );

    // Verify service order exists and is in valid state
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: { id: true, state: true, countryCode: true, businessUnit: true },
    });

    if (!serviceOrder) {
      throw new BpmnError('SERVICE_ORDER_NOT_FOUND', `Service order not found: ${serviceOrderId}`);
    }

    if (serviceOrder.state === 'CANCELLED') {
      throw new BpmnError('SERVICE_ORDER_CANCELLED', 'Service order has been cancelled');
    }

    // Verify provider exists and is active
    const provider = await this.prisma.provider.findUnique({
      where: { id: resolvedProviderId },
      select: { id: true, status: true, email: true, name: true },
    });

    if (!provider) {
      throw new BpmnError('PROVIDER_NOT_FOUND', `Provider not found: ${resolvedProviderId}`);
    }

    if (provider.status !== 'ACTIVE') {
      throw new BpmnError('PROVIDER_INACTIVE', `Provider is not active: ${resolvedProviderName}`);
    }

    // Check for existing pending/offered assignment for this order+provider
    const existingAssignment = await this.prisma.assignment.findFirst({
      where: {
        serviceOrderId,
        providerId: resolvedProviderId,
        state: { in: ['PENDING', 'OFFERED'] },
      },
    });

    if (existingAssignment) {
      this.logger.warn(
        `Assignment already exists for order ${serviceOrderId} and provider ${resolvedProviderId}`,
      );
      return {
        assignmentId: existingAssignment.id,
        offerId: existingAssignment.id,
        offerSentAt: existingAssignment.createdAt.toISOString(),
        offerExpiresAt: new Date(
          existingAssignment.createdAt.getTime() + offerExpirationHours * 60 * 60 * 1000,
        ).toISOString(),
      };
    }

    const offerSentAt = new Date();
    const offerExpiresAt = new Date(offerSentAt.getTime() + offerExpirationHours * 60 * 60 * 1000);

    // Create assignment with OFFERED state
    const assignment = await this.prisma.$transaction(async (tx) => {
      const newAssignment = await tx.assignment.create({
        data: {
          serviceOrderId,
          providerId: resolvedProviderId,
          workTeamId: resolvedWorkTeamId || null,
          assignmentMode: 'OFFER',
          assignmentMethod: 'OFFER',
          providerRank: providerRank || null,
          providerScore: providerScore || null,
          state: 'OFFERED',
          stateChangedAt: offerSentAt,
          createdBy: 'camunda-send-offer',
        },
      });

      // Note: Service order remains in CREATED state until offer is accepted
      // State transitions: CREATED -> ASSIGNED (when accepted) -> SCHEDULED -> etc.

      return newAssignment;
    });

    // Emit event for notification system
    this.eventEmitter.emit('offer.sent', {
      assignmentId: assignment.id,
      serviceOrderId,
      providerId: resolvedProviderId,
      providerEmail: provider.email,
      providerName: provider.name,
      offerExpiresAt,
      countryCode: serviceOrder.countryCode,
      businessUnit: serviceOrder.businessUnit,
    });

    this.logger.log(
      `Offer sent to ${resolvedProviderName}. Assignment ID: ${assignment.id}, expires: ${offerExpiresAt.toISOString()}`,
    );

    return {
      assignmentId: assignment.id,
      offerId: assignment.id, // offerId for message correlation
      offerSentAt: offerSentAt.toISOString(),
      offerExpiresAt: offerExpiresAt.toISOString(),
    };
  }
}
