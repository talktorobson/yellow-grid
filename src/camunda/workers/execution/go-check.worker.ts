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
 * - Verify payment status from ServiceOrder.paymentStatus
 * - Verify product delivery status from ServiceOrder.productDeliveryStatus
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
    const { serviceOrderId } = job.variables;

    this.logger.log(`GO check for service order: ${serviceOrderId}`);

    // Get service order with payment and delivery status
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
        productDeliveryStatus: true,
        allProductsDelivered: true,
        deliveryBlocksExecution: true,
        totalAmountCustomer: true,
      },
      // Note: lineItems need to be queried separately due to Prisma select limitations
    });

    if (!serviceOrder) {
      return {
        goStatus: 'GO_NOK_BOTH',
        paymentConfirmed: false,
        deliveryConfirmed: false,
        blockedReason: 'Service order not found',
      };
    }

    // Get line items separately for delivery status
    const lineItems = await this.prisma.serviceOrderLineItem.findMany({
      where: { serviceOrderId },
      select: {
        deliveryStatus: true,
        deliveryReference: true,
      },
    });

    // Check payment status from database
    const paymentConfirmed = this.checkPaymentStatus(serviceOrder.paymentStatus);

    // Check delivery status from database
    const { deliveryConfirmed, deliveryDetails } = this.checkDeliveryStatus(
      serviceOrder.productDeliveryStatus,
      serviceOrder.allProductsDelivered,
      serviceOrder.deliveryBlocksExecution,
      lineItems,
    );

    // Determine GO status
    let goStatus: GoCheckOutput['goStatus'];
    let blockedReason: string | undefined;

    if (paymentConfirmed && deliveryConfirmed) {
      goStatus = 'GO_OK';
      this.logger.log(`GO_OK for service order ${serviceOrderId}`);

      // Update service order state to SCHEDULED (ready for execution)
      await this.prisma.serviceOrder.update({
        where: { id: serviceOrderId },
        data: { state: 'SCHEDULED' },
      });
    } else if (paymentConfirmed) {
      goStatus = 'GO_NOK_DELIVERY';
      blockedReason = `Delivery status: ${serviceOrder.productDeliveryStatus || 'PENDING'}`;
      this.logger.warn(`GO_NOK_DELIVERY for service order ${serviceOrderId}`);
    } else if (deliveryConfirmed) {
      goStatus = 'GO_NOK_PAYMENT';
      blockedReason = `Payment status: ${serviceOrder.paymentStatus || 'PENDING'}`;
      this.logger.warn(`GO_NOK_PAYMENT for service order ${serviceOrderId}`);
    } else {
      goStatus = 'GO_NOK_BOTH';
      blockedReason = `Payment: ${serviceOrder.paymentStatus || 'PENDING'}, Delivery: ${serviceOrder.productDeliveryStatus || 'PENDING'}`;
      this.logger.warn(`GO_NOK_BOTH for service order ${serviceOrderId}: ${blockedReason}`);
    }

    return {
      goStatus,
      paymentConfirmed,
      deliveryConfirmed,
      paymentDetails: {
        status: serviceOrder.paymentStatus || 'PENDING',
        amount: serviceOrder.totalAmountCustomer ? Number(serviceOrder.totalAmountCustomer) : undefined,
        method: serviceOrder.paymentMethod || undefined,
      },
      deliveryDetails,
      blockedReason,
    };
  }

  /**
   * Check payment status from ServiceOrder
   */
  private checkPaymentStatus(status: string | null): boolean {
    const paidStatuses = new Set(['PAID', 'COMPLETED', 'CONFIRMED', 'SETTLED']);
    return status ? paidStatuses.has(status.toUpperCase()) : false;
  }

  /**
   * Check delivery status from ServiceOrder and line items
   */
  private checkDeliveryStatus(
    orderDeliveryStatus: string | null,
    allProductsDelivered: boolean,
    deliveryBlocksExecution: boolean,
    lineItems: Array<{ deliveryStatus: unknown; deliveryReference: string | null }>,
  ): { deliveryConfirmed: boolean; deliveryDetails: GoCheckOutput['deliveryDetails'] } {
    // If delivery doesn't block execution, auto-confirm
    if (!deliveryBlocksExecution) {
      return {
        deliveryConfirmed: true,
        deliveryDetails: { status: 'NOT_REQUIRED' },
      };
    }

    // Check if all products are delivered
    if (allProductsDelivered) {
      return {
        deliveryConfirmed: true,
        deliveryDetails: { status: 'DELIVERED' },
      };
    }

    const deliveredStatuses = new Set(['DELIVERED', 'RECEIVED', 'COMPLETED']);

    // Check order-level delivery status
    const orderDelivered = orderDeliveryStatus
      ? deliveredStatuses.has(orderDeliveryStatus.toUpperCase())
      : false;

    // Check if all line items are delivered
    const itemsWithDelivery = lineItems.filter((li) => li.deliveryStatus);
    const allItemsDelivered = itemsWithDelivery.every((li) =>
      deliveredStatuses.has((String(li.deliveryStatus) || '').toUpperCase()),
    );

    // Service-only orders (no products) are automatically delivery-confirmed
    const isServiceOnly = lineItems.length === 0 || itemsWithDelivery.length === 0;
    const deliveryConfirmed = isServiceOnly || (orderDelivered && allItemsDelivered);

    // Get first delivery reference from line items
    const trackingNumber = lineItems.find((li) => li.deliveryReference)?.deliveryReference;

    return {
      deliveryConfirmed,
      deliveryDetails: {
        status: orderDeliveryStatus || (isServiceOnly ? 'NOT_REQUIRED' : 'PENDING'),
        trackingNumber: trackingNumber || undefined,
      },
    };
  }
}
