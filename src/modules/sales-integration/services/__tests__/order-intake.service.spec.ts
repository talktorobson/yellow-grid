import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderIntakeService } from '../order-intake.service';
import { KafkaService } from '../../../../common/kafka/kafka.service';
import { RedisService } from '../../../../common/redis/redis.service';
import {
  OrderIntakeRequestDto,
  SalesSystem,
  OrderType,
  Priority,
  ContactMethod,
  ConfidenceLevel,
} from '../../dto';
import { IntegrationContext } from '../../interfaces';

describe('OrderIntakeService', () => {
  let service: OrderIntakeService;
  let kafkaService: jest.Mocked<KafkaService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockKafkaService = {
      send: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue(true),
    };

    const mockRedisService = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderIntakeService,
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrderIntakeService>(OrderIntakeService);
    kafkaService = module.get(KafkaService) as jest.Mocked<KafkaService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should process valid order intake request', async () => {
      const request: OrderIntakeRequestDto = {
        externalOrderId: 'PX-TEST-001',
        salesSystem: SalesSystem.PYXIS,
        orderType: OrderType.INSTALLATION,
        priority: Priority.MEDIUM,
        externalReferences: {
          salesOrderId: 'SO-PYXIS-2025-001',
          projectId: 'PROJ-001',
          leadId: 'LEAD-001',
        },
        customer: {
          customerId: 'CUST-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+33612345678',
          preferredContactMethod: ContactMethod.EMAIL,
        },
        serviceAddress: {
          street: '123 Main St',
          city: 'Paris',
          state: 'Île-de-France',
          postalCode: '75001',
          country: 'FR',
        },
        serviceItems: [
          {
            itemId: 'ITEM-001',
            productId: 'PROD-001',
            productName: 'Kitchen Installation',
            quantity: 1,
            unitPrice: {
              amount: '1500.00',
              currency: 'EUR',
            },
            requiresInstallation: true,
          },
        ],
        totalAmount: {
          subtotal: '1500.00',
          tax: '300.00',
          total: '1800.00',
          currency: 'EUR',
        },
      };

      const context: IntegrationContext = {
        correlationId: 'corr-test-001',
        tenantId: 'test-tenant',
        timestamp: new Date(),
      };

      const response = await service.execute(request, context);

      expect(response).toBeDefined();
      expect(response.externalOrderId).toBe('PX-TEST-001');
      expect(response.status).toBe('RECEIVED');
      expect(response.correlationId).toBe('corr-test-001');
      expect(response.orderId).toBeTruthy();

      // Verify Kafka event was published
      expect(kafkaService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'sales.order.intake',
          messages: expect.arrayContaining([
            expect.objectContaining({
              key: response.orderId,
            }),
          ]),
        }),
      );

      // Verify Redis cache was set
      expect(redisService.setex).toHaveBeenCalled();
    });

    it('should return cached response for duplicate request (idempotency)', async () => {
      const cachedResponse = {
        orderId: 'SO-CACHED-001',
        externalOrderId: 'PX-TEST-001',
        status: 'RECEIVED',
        correlationId: 'corr-test-001',
        receivedAt: new Date().toISOString(),
      };

      redisService.get.mockResolvedValue(cachedResponse);

      const request: OrderIntakeRequestDto = {
        externalOrderId: 'PX-TEST-001',
        salesSystem: SalesSystem.PYXIS,
        orderType: OrderType.INSTALLATION,
        priority: Priority.MEDIUM,
        externalReferences: {
          salesOrderId: 'SO-PYXIS-2025-001',
        },
        customer: {
          customerId: 'CUST-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+33612345678',
          preferredContactMethod: ContactMethod.EMAIL,
        },
        serviceAddress: {
          street: '123 Main St',
          city: 'Paris',
          state: 'Île-de-France',
          postalCode: '75001',
          country: 'FR',
        },
        serviceItems: [
          {
            itemId: 'ITEM-001',
            productId: 'PROD-001',
            productName: 'Kitchen Installation',
            quantity: 1,
            unitPrice: {
              amount: '1500.00',
              currency: 'EUR',
            },
            requiresInstallation: true,
          },
        ],
        totalAmount: {
          subtotal: '1500.00',
          tax: '300.00',
          total: '1800.00',
          currency: 'EUR',
        },
      };

      const context: IntegrationContext = {
        correlationId: 'corr-test-001',
        tenantId: 'test-tenant',
        timestamp: new Date(),
      };

      const response = await service.execute(request, context);

      expect(response).toEqual(cachedResponse);
      expect(kafkaService.send).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should validate valid request', () => {
      const request: OrderIntakeRequestDto = {
        externalOrderId: 'PX-TEST-001',
        salesSystem: SalesSystem.PYXIS,
        orderType: OrderType.INSTALLATION,
        priority: Priority.MEDIUM,
        externalReferences: {
          salesOrderId: 'SO-PYXIS-2025-001',
        },
        customer: {
          customerId: 'CUST-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+33612345678',
          preferredContactMethod: ContactMethod.EMAIL,
        },
        serviceAddress: {
          street: '123 Main St',
          city: 'Paris',
          state: 'Île-de-France',
          postalCode: '75001',
          country: 'FR',
        },
        serviceItems: [
          {
            itemId: 'ITEM-001',
            productId: 'PROD-001',
            productName: 'Kitchen Installation',
            quantity: 1,
            unitPrice: {
              amount: '1500.00',
              currency: 'EUR',
            },
            requiresInstallation: true,
          },
        ],
        totalAmount: {
          subtotal: '1500.00',
          tax: '300.00',
          total: '1800.00',
          currency: 'EUR',
        },
      };

      const result = service.validate(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing external order ID', () => {
      const request: any = {
        salesSystem: SalesSystem.PYXIS,
        orderType: OrderType.INSTALLATION,
        priority: Priority.MEDIUM,
        externalReferences: {},
        customer: {},
        serviceAddress: {},
        serviceItems: [],
        totalAmount: {},
      };

      const result = service.validate(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for invalid email', () => {
      const request: any = {
        externalOrderId: 'PX-TEST-001',
        salesSystem: SalesSystem.PYXIS,
        orderType: OrderType.INSTALLATION,
        priority: Priority.MEDIUM,
        externalReferences: {
          salesOrderId: 'SO-001',
        },
        customer: {
          customerId: 'CUST-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          phone: '+33612345678',
          preferredContactMethod: ContactMethod.EMAIL,
        },
        serviceAddress: {},
        serviceItems: [{}],
        totalAmount: {},
      };

      const result = service.validate(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'customer.email')).toBe(
        true,
      );
    });

    it('should fail validation for incorrect total amount', () => {
      const request: any = {
        externalOrderId: 'PX-TEST-001',
        salesSystem: SalesSystem.PYXIS,
        orderType: OrderType.INSTALLATION,
        priority: Priority.MEDIUM,
        externalReferences: {
          salesOrderId: 'SO-001',
        },
        customer: {
          customerId: 'CUST-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+33612345678',
          preferredContactMethod: ContactMethod.EMAIL,
        },
        serviceAddress: {},
        serviceItems: [
          {
            itemId: 'ITEM-001',
            productId: 'PROD-001',
            productName: 'Test',
            quantity: 1,
            unitPrice: { amount: '100', currency: 'EUR' },
            requiresInstallation: true,
          },
        ],
        totalAmount: {
          subtotal: '1000.00',
          tax: '200.00',
          total: '1500.00', // Incorrect: should be 1200.00
          currency: 'EUR',
        },
      };

      const result = service.validate(request);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'totalAmount')).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Kafka is connected', async () => {
      kafkaService.ping.mockResolvedValue(true);

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details?.kafka).toBe('connected');
    });

    it('should return unhealthy status when Kafka is disconnected', async () => {
      kafkaService.ping.mockResolvedValue(false);

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details?.kafka).toBe('disconnected');
    });
  });
});
