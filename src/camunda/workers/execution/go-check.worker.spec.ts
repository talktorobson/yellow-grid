import { GoCheckWorker } from './go-check.worker';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('GoCheckWorker', () => {
  let worker: GoCheckWorker;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      serviceOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      serviceOrderLineItem: {
        findMany: jest.fn(),
      },
    };

    worker = new GoCheckWorker(mockPrisma as unknown as PrismaService);
  });

  describe('handle', () => {
    const validInput = {
      serviceOrderId: 'so-123',
    };

    it('returns GO_OK when payment and delivery confirmed', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PAID',
        paymentMethod: 'CREDIT_CARD',
        productDeliveryStatus: 'DELIVERED',
        allProductsDelivered: true,
        deliveryBlocksExecution: true,
        totalAmountCustomer: 150.0,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([
        {
          deliveryStatus: 'DELIVERED',
          deliveryReference: 'TRK-001',
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.goStatus).toBe('GO_OK');
      expect(result.paymentConfirmed).toBe(true);
      expect(result.deliveryConfirmed).toBe(true);
      expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
        where: { id: 'so-123' },
        data: { state: 'SCHEDULED' },
      });
    });

    it('returns GO_NOK_DELIVERY when only payment confirmed', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PAID',
        productDeliveryStatus: 'PENDING',
        allProductsDelivered: false,
        deliveryBlocksExecution: true,
        totalAmountCustomer: 150.0,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([
        {
          deliveryStatus: 'PENDING',
          deliveryReference: null,
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.goStatus).toBe('GO_NOK_DELIVERY');
      expect(result.paymentConfirmed).toBe(true);
      expect(result.deliveryConfirmed).toBe(false);
      expect(result.blockedReason).toBeDefined();
    });

    it('returns GO_NOK_PAYMENT when only delivery confirmed', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PENDING',
        productDeliveryStatus: 'DELIVERED',
        allProductsDelivered: true,
        deliveryBlocksExecution: false,
        totalAmountCustomer: 150.0,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.goStatus).toBe('GO_NOK_PAYMENT');
      expect(result.paymentConfirmed).toBe(false);
      expect(result.deliveryConfirmed).toBe(true);
    });

    it('returns GO_NOK_BOTH when neither confirmed', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PENDING',
        productDeliveryStatus: 'PENDING',
        allProductsDelivered: false,
        deliveryBlocksExecution: true,
        totalAmountCustomer: 150.0,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([
        {
          deliveryStatus: 'PENDING',
          deliveryReference: null,
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.goStatus).toBe('GO_NOK_BOTH');
      expect(result.paymentConfirmed).toBe(false);
      expect(result.deliveryConfirmed).toBe(false);
    });

    it('auto-confirms delivery when not blocking execution', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PAID',
        productDeliveryStatus: 'PENDING',
        allProductsDelivered: false,
        deliveryBlocksExecution: false, // Delivery doesn't block
        totalAmountCustomer: 150.0,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.goStatus).toBe('GO_OK');
      expect(result.deliveryConfirmed).toBe(true);
      expect(result.deliveryDetails?.status).toBe('NOT_REQUIRED');
    });

    it('recognizes various payment statuses', async () => {
      const paymentStatuses = ['PAID', 'COMPLETED', 'CONFIRMED', 'SETTLED'];

      for (const status of paymentStatuses) {
        mockPrisma.serviceOrder.findUnique.mockResolvedValue({
          id: 'so-123',
          paymentStatus: status,
          productDeliveryStatus: 'DELIVERED',
          allProductsDelivered: true,
          deliveryBlocksExecution: false,
          totalAmountCustomer: 150.0,
        });

        mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([]);

        const result = await worker.handle({
          variables: validInput,
        } as any);

        expect(result.paymentConfirmed).toBe(true);
      }
    });

    it('recognizes various delivery statuses', async () => {
      const deliveryStatuses = ['DELIVERED', 'RECEIVED', 'COMPLETED'];

      for (const status of deliveryStatuses) {
        mockPrisma.serviceOrder.findUnique.mockResolvedValue({
          id: 'so-123',
          paymentStatus: 'PAID',
          productDeliveryStatus: status,
          allProductsDelivered: true,
          deliveryBlocksExecution: true,
          totalAmountCustomer: 150.0,
        });

        mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([
          {
            deliveryStatus: status,
            deliveryReference: 'TRK-001',
          },
        ]);

        const result = await worker.handle({
          variables: validInput,
        } as any);

        expect(result.deliveryConfirmed).toBe(true);
      }
    });

    it('returns error when service order not found', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);
      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.goStatus).toBe('GO_NOK_BOTH');
      expect(result.blockedReason).toBe('Service order not found');
    });

    it('includes payment details in response', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PAID',
        paymentMethod: 'CREDIT_CARD',
        productDeliveryStatus: 'DELIVERED',
        allProductsDelivered: true,
        deliveryBlocksExecution: false,
        totalAmountCustomer: 250.5,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.paymentDetails).toEqual({
        status: 'PAID',
        amount: 250.5,
        method: 'CREDIT_CARD',
      });
    });

    it('handles service-only orders (no products)', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PAID',
        productDeliveryStatus: null,
        allProductsDelivered: false,
        deliveryBlocksExecution: true,
        totalAmountCustomer: 100.0,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      // Service-only orders auto-confirm delivery
      expect(result.deliveryConfirmed).toBe(true);
    });

    it('checks all line items for delivery status', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        paymentStatus: 'PAID',
        productDeliveryStatus: 'DELIVERED',
        allProductsDelivered: false, // Flag says not delivered
        deliveryBlocksExecution: true,
        totalAmountCustomer: 150.0,
      });

      mockPrisma.serviceOrderLineItem.findMany.mockResolvedValue([
        {
          deliveryStatus: 'DELIVERED',
          deliveryReference: 'TRK-001',
        },
        {
          deliveryStatus: 'PENDING', // One item still pending
          deliveryReference: null,
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.deliveryConfirmed).toBe(false);
    });
  });
});
