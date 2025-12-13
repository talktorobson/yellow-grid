import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob } from '../base.worker';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Input variables for go-check task
 */
interface GoCheckInput {
  serviceOrderId: string;
  scheduledDate: string;
  customerId: string;
  projectId?: string;
}

/**
 * Output variables from go-check task
 */
interface GoCheckOutput {
  goStatus: 'GO_OK' | 'GO_NOK_PAYMENT' | 'GO_NOK_DELIVERY' | 'GO_NOK_BOTH';
  paymentConfirmed: boolean;
  deliveryConfirmed: boolean;
  paymentDetails?: {
    status: string;
    amount?: number;
    method?: string;
  };
  deliveryDetails?: {
    status: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  };
  blockedReason?: string;
}

/**
 * Go Check Worker
 *
 * Task Type: go-check
 *
 * Pre-execution validation (24-48h before scheduled date):
 * - Verify payment status
 * - Verify product delivery status
 *
 * Returns GO_OK if ready, or specific NOK status if blocked.
 */
@Injectable()
export class GoCheckWorker extends BaseWorker<GoCheckInput, GoCheckOutput> {
  protected readonly logger = new Logger(GoCheckWorker.name);
  readonly taskType = 'go-check';
  readonly timeout = 30000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async handle(job: ZeebeJob<GoCheckInput>): Promise<GoCheckOutput> {
    const { serviceOrderId, projectId } = job.variables;

    // Get service order with related data
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: {
        project: projectId ? true : false,
      },
    });

    if (!serviceOrder) {
      return {
        goStatus: 'GO_NOK_BOTH',
        paymentConfirmed: false,
        deliveryConfirmed: false,
        blockedReason: 'Service order not found',
      };
    }

    // Check payment status
    // In a real implementation, this would call payment service or check invoice status
    const paymentConfirmed = await this.checkPaymentStatus(serviceOrderId);

    // Check delivery status
    // In a real implementation, this would call logistics/delivery tracking
    const deliveryConfirmed = await this.checkDeliveryStatus(serviceOrderId);

    // Determine GO status
    let goStatus: GoCheckOutput['goStatus'];
    let blockedReason: string | undefined;

    if (paymentConfirmed && deliveryConfirmed) {
      goStatus = 'GO_OK';
      this.logger.log(`GO_OK for service order ${serviceOrderId}`);
    } else if (!paymentConfirmed && !deliveryConfirmed) {
      goStatus = 'GO_NOK_BOTH';
      blockedReason = 'Payment and delivery both pending';
      this.logger.warn(`GO_NOK_BOTH for service order ${serviceOrderId}`);
    } else if (!paymentConfirmed) {
      goStatus = 'GO_NOK_PAYMENT';
      blockedReason = 'Payment pending';
      this.logger.warn(`GO_NOK_PAYMENT for service order ${serviceOrderId}`);
    } else {
      goStatus = 'GO_NOK_DELIVERY';
      blockedReason = 'Delivery pending';
      this.logger.warn(`GO_NOK_DELIVERY for service order ${serviceOrderId}`);
    }

    return {
      goStatus,
      paymentConfirmed,
      deliveryConfirmed,
      paymentDetails: {
        status: paymentConfirmed ? 'PAID' : 'PENDING',
      },
      deliveryDetails: {
        status: deliveryConfirmed ? 'DELIVERED' : 'IN_TRANSIT',
      },
      blockedReason,
    };
  }

  /**
   * Check payment status for service order
   * TODO: Integrate with actual payment service
   */
  private async checkPaymentStatus(serviceOrderId: string): Promise<boolean> {
    // Placeholder: Check if there's a paid invoice
    // In production, this would query payment gateway or ERP

    // For demo: randomly return true 80% of the time
    return Math.random() > 0.2;
  }

  /**
   * Check delivery status for service order
   * TODO: Integrate with logistics/delivery tracking
   */
  private async checkDeliveryStatus(serviceOrderId: string): Promise<boolean> {
    // Placeholder: Check if products are delivered
    // In production, this would query logistics API

    // For demo: randomly return true 85% of the time
    return Math.random() > 0.15;
  }
}
