import { ValidateOrderWorker } from './validate-order.worker';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BpmnError } from '../base.worker';

describe('ValidateOrderWorker', () => {
  let worker: ValidateOrderWorker;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      serviceOrder: {
        findUnique: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
      serviceCatalog: {
        findFirst: jest.fn(),
      },
      interventionZone: {
        findMany: jest.fn(),
      },
    };

    worker = new ValidateOrderWorker(mockPrisma as unknown as PrismaService);
  });

  describe('handle', () => {
    const validInput = {
      serviceOrderId: 'so-123',
      customerId: 'cust-123',
      storeId: 'store-123',
      urgency: 'STANDARD' as const,
      postalCode: '28001',
      serviceTypeCode: 'SVC_ES_001',
    };

    it('validates order successfully with all valid data', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        serviceAddress: {},
        customerInfo: { name: 'John Doe', email: 'john@example.com' },
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: true,
        name: 'Madrid Store',
      });

      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        fsmServiceCode: 'SVC_ES_001',
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['28001', '28002', '28003'],
        },
      ]);

      const result = await worker.handle({
        variables: validInput,
      } as any);

      expect(result.isValid).toBe(true);
      expect(result.urgencyLevel).toBe('STANDARD');
      expect(result.normalizedPostalCode).toBe('28001');
      expect(result.validatedAt).toBeDefined();
    });

    it('throws BpmnError when service order ID is missing', async () => {
      await expect(
        worker.handle({
          variables: { ...validInput, serviceOrderId: '' },
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when customer ID is missing', async () => {
      await expect(
        worker.handle({
          variables: { ...validInput, customerId: '' },
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when store ID is missing', async () => {
      await expect(
        worker.handle({
          variables: { ...validInput, storeId: '' },
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError with invalid urgency level', async () => {
      await expect(
        worker.handle({
          variables: { ...validInput, urgency: 'INVALID' as any },
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError with invalid postal code format', async () => {
      await expect(
        worker.handle({
          variables: { ...validInput, postalCode: '12' }, // Too short
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('normalizes postal codes correctly', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: { name: 'John Doe' },
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: true,
        name: 'Store',
      });

      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        fsmServiceCode: 'SVC_ES_001',
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['28001'],
        },
      ]);

      const result = await worker.handle({
        variables: { ...validInput, postalCode: '28 001' },
      } as any);

      expect(result.normalizedPostalCode).toBe('28001');
    });

    it('throws BpmnError when service order not found', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue(null);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when service order is cancelled', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CANCELLED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: { name: 'John Doe' },
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: true,
        name: 'Store',
      });

      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        fsmServiceCode: 'SVC_ES_001',
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when customer info is missing', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: {},
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: true,
        name: 'Store',
      });

      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        fsmServiceCode: 'SVC_ES_001',
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when store not found', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: { name: 'John Doe' },
      });

      mockPrisma.store.findUnique.mockResolvedValue(null);
      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({ id: 'svc-123' });
      mockPrisma.interventionZone.findMany.mockResolvedValue([]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when store is inactive', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: { name: 'John Doe' },
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: false,
        name: 'Inactive Store',
      });

      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({ id: 'svc-123' });
      mockPrisma.interventionZone.findMany.mockResolvedValue([]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when service type not found', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: { name: 'John Doe' },
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: true,
        name: 'Store',
      });

      mockPrisma.serviceCatalog.findFirst.mockResolvedValue(null);
      mockPrisma.interventionZone.findMany.mockResolvedValue([]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('throws BpmnError when no provider coverage for postal code', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: { name: 'John Doe' },
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: true,
        name: 'Store',
      });

      mockPrisma.serviceCatalog.findFirst.mockResolvedValue({
        id: 'svc-123',
        fsmServiceCode: 'SVC_ES_001',
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          id: 'zone-1',
          postalCodes: ['99999'], // Different postal code
        },
      ]);

      await expect(
        worker.handle({
          variables: validInput,
        } as any),
      ).rejects.toThrow(BpmnError);
    });

    it('defaults urgency to STANDARD when not provided', async () => {
      mockPrisma.serviceOrder.findUnique.mockResolvedValue({
        id: 'so-123',
        state: 'CREATED',
        countryCode: 'ES',
        businessUnit: 'LM',
        customerInfo: { name: 'John Doe', email: 'john@example.com' },
      });

      mockPrisma.store.findUnique.mockResolvedValue({
        id: 'store-123',
        isActive: true,
        name: 'Store',
      });

      mockPrisma.interventionZone.findMany.mockResolvedValue([
        {
          postalCodes: ['28001'],
        },
      ]);

      const result = await worker.handle({
        variables: {
          ...validInput,
          urgency: undefined,
          serviceTypeCode: undefined,
        },
      } as any);

      expect(result.urgencyLevel).toBe('STANDARD');
    });
  });
});
