import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for send-offer task
 */
interface SendOfferInput {
  serviceOrderId: string;
  providerId: string;
  providerName: string;
  scheduledDate?: string;
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
 * Send Offer Worker (Stub)
 *
 * Task Type: send-offer
 *
 * Sends an assignment offer to a provider and waits for acceptance.
 * Creates an Assignment record with OFFERED state.
 */
@Injectable()
export class SendOfferWorker extends BaseWorker<SendOfferInput, SendOfferOutput> {
  protected readonly logger = new Logger(SendOfferWorker.name);
  readonly taskType = 'send-offer';
  readonly timeout = 15000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<SendOfferInput>): Promise<SendOfferOutput> {
    const { serviceOrderId, providerId, providerName, offerExpirationHours = 4 } = job.variables;

    // Simplified stub for infrastructure testing
    // TODO: Implement full assignment creation logic
    this.logger.log(
      `Sending offer to provider ${providerName} (${providerId}) for order ${serviceOrderId}`,
    );

    const offerSentAt = new Date();
    const offerExpiresAt = new Date(offerSentAt.getTime() + offerExpirationHours * 60 * 60 * 1000);

    return {
      assignmentId: `assignment-${Date.now()}`,
      offerSentAt: offerSentAt.toISOString(),
      offerExpiresAt: offerExpiresAt.toISOString(),
    };
  }
}
