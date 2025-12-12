import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AssignmentState } from '@prisma/client';

/**
 * Input variables for send-offer task
 */
interface SendOfferInput {
  serviceOrderId: string;
  providerId: string;
  providerName: string;
  scheduledDate: string;
  scheduledSlot: string;
  serviceType: string;
  customerName: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  offerExpirationHours?: number;
}

/**
 * Output variables from send-offer task
 */
interface SendOfferOutput {
  assignmentId: string;
  offerSentAt: string;
  offerExpiresAt: string;
}

/**
 * Send Offer Worker
 * 
 * Task Type: send-offer
 * 
 * Creates an assignment record and sends offer notification to provider.
 * Used in OFFER mode (FR/PL countries).
 */
@Injectable()
export class SendOfferWorker extends BaseWorker<SendOfferInput, SendOfferOutput> {
  protected readonly logger = new Logger(SendOfferWorker.name);
  readonly taskType = 'send-offer';
  readonly timeout = 30000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<SendOfferInput>): Promise<SendOfferOutput> {
    const {
      serviceOrderId,
      providerId,
      providerName,
      scheduledDate,
      offerExpirationHours = 4,
    } = job.variables;

    // Verify service order exists
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
    });

    if (!serviceOrder) {
      throw new BpmnError('BPMN_ORDER_NOT_FOUND', `Service order ${serviceOrderId} not found`);
    }

    // Calculate expiration
    const offerSentAt = new Date();
    const offerExpiresAt = new Date(offerSentAt.getTime() + offerExpirationHours * 60 * 60 * 1000);

    // Create assignment record
    const assignment = await this.prisma.assignment.create({
      data: {
        serviceOrderId,
        providerId,
        state: AssignmentState.OFFERED,
        offeredAt: offerSentAt,
        expiresAt: offerExpiresAt,
        stateChangedAt: offerSentAt,
      },
    });

    // Update service order state
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        assignedProviderId: providerId,
        // state will be updated by workflow
      },
    });

    this.logger.log(
      `Sent offer to ${providerName} for order ${serviceOrderId}. ` +
      `Expires at ${offerExpiresAt.toISOString()}`
    );

    // TODO: Send actual notification (email, push, SMS)
    // This would integrate with notification service

    return {
      assignmentId: assignment.id,
      offerSentAt: offerSentAt.toISOString(),
      offerExpiresAt: offerExpiresAt.toISOString(),
    };
  }
}
