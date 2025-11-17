import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogEventConsumer } from '../sync/service-catalog-event.consumer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SyncService } from '../sync/sync.service';
import { ServiceEventPayload } from '../sync/dto/service-event.dto';
import { EventProcessingStatus } from '@prisma/client';

describe('ServiceCatalogEventConsumer', () => {
  let consumer: ServiceCatalogEventConsumer;
  let prisma: PrismaService;
  let syncService: SyncService;

  const mockPrismaService = {
    serviceCatalogEventLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSyncService = {
    handleServiceCreated: jest.fn(),
    handleServiceUpdated: jest.fn(),
    handleServiceDeprecated: jest.fn(),
  };

  const mockEventPayload: ServiceEventPayload = {
    eventId: 'evt_001',
    eventType: 'service.created',
    timestamp: '2025-01-17T10:00:00Z',
    source: 'PYXIS',
    data: {
      externalServiceCode: 'PYX_ES_HVAC_001',
      countryCode: 'ES',
      businessUnit: 'LM_ES',
      type: 'installation',
      category: 'hvac',
      name: 'HVAC Installation',
      description: 'Standard HVAC installation',
      scopeIncluded: ['Install', 'Test'],
      scopeExcluded: ['Wall work'],
      worksiteRequirements: ['Power outlet'],
      productPrerequisites: ['Unit delivered'],
      estimatedDurationMinutes: 180,
      requiresPreServiceContract: true,
      requiresPostServiceWCF: true,
    },
  };

  beforeEach(async () => {
    // Enable sync for tests
    process.env.SERVICE_CATALOG_SYNC_ENABLED = 'true';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogEventConsumer,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    consumer = module.get<ServiceCatalogEventConsumer>(
      ServiceCatalogEventConsumer,
    );
    prisma = module.get<PrismaService>(PrismaService);
    syncService = module.get<SyncService>(SyncService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log warning when sync is disabled', async () => {
      process.env.SERVICE_CATALOG_SYNC_ENABLED = 'false';

      const newConsumer = new ServiceCatalogEventConsumer(
        prisma,
        syncService,
      );

      const loggerSpy = jest.spyOn(newConsumer['logger'], 'warn');

      await newConsumer.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('DISABLED'),
      );
    });

    it('should log initialization when sync is enabled', async () => {
      const loggerSpy = jest.spyOn(consumer['logger'], 'log');

      await consumer.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('initialized'),
      );
    });
  });

  describe('handleMessage', () => {
    const mockMessage = {
      key: Buffer.from('evt_001'),
      value: Buffer.from(JSON.stringify(mockEventPayload)),
      timestamp: '2025-01-17T10:00:00Z',
      partition: 0,
      offset: '123',
    };

    it('should process new event successfully', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-1',
        eventId: 'evt_001',
        processingStatus: EventProcessingStatus.PENDING,
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceCreated.mockResolvedValue(undefined);

      await consumer.handleMessage(mockMessage);

      expect(prisma.serviceCatalogEventLog.create).toHaveBeenCalledWith({
        data: {
          eventId: 'evt_001',
          eventType: 'service.created',
          externalSource: 'PYXIS',
          externalServiceCode: 'PYX_ES_HVAC_001',
          processingStatus: 'PENDING',
          payload: mockEventPayload,
          receivedAt: new Date(mockEventPayload.timestamp),
        },
      });

      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { id: 'event-log-1' },
        data: { processingStatus: 'PROCESSING' },
      });

      expect(syncService.handleServiceCreated).toHaveBeenCalledWith(
        mockEventPayload,
        'event-log-1',
      );
    });

    it('should skip event if already COMPLETED', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue({
        id: 'event-log-1',
        eventId: 'evt_001',
        processingStatus: EventProcessingStatus.COMPLETED,
      });

      const loggerSpy = jest.spyOn(consumer['logger'], 'warn');

      await consumer.handleMessage(mockMessage);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('already processed'),
      );
      expect(syncService.handleServiceCreated).not.toHaveBeenCalled();
    });

    it('should skip event if currently PROCESSING', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue({
        id: 'event-log-1',
        eventId: 'evt_001',
        processingStatus: EventProcessingStatus.PROCESSING,
      });

      const loggerSpy = jest.spyOn(consumer['logger'], 'warn');

      await consumer.handleMessage(mockMessage);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('currently being processed'),
      );
      expect(syncService.handleServiceCreated).not.toHaveBeenCalled();
    });

    it('should retry event if previously FAILED', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue({
        id: 'event-log-1',
        eventId: 'evt_001',
        processingStatus: EventProcessingStatus.FAILED,
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceCreated.mockResolvedValue(undefined);

      const loggerSpy = jest.spyOn(consumer['logger'], 'log');

      await consumer.handleMessage(mockMessage);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('previously failed, retrying'),
      );
      expect(syncService.handleServiceCreated).toHaveBeenCalled();
    });

    it('should dispatch service.updated events', async () => {
      const updatedPayload = {
        ...mockEventPayload,
        eventId: 'evt_002',
        eventType: 'service.updated' as const,
      };

      const updatedMessage = {
        ...mockMessage,
        key: Buffer.from('evt_002'),
        value: Buffer.from(JSON.stringify(updatedPayload)),
      };

      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-2',
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceUpdated.mockResolvedValue(undefined);

      await consumer.handleMessage(updatedMessage);

      expect(syncService.handleServiceUpdated).toHaveBeenCalledWith(
        updatedPayload,
        'event-log-2',
      );
    });

    it('should dispatch service.deprecated events', async () => {
      const deprecatedPayload = {
        ...mockEventPayload,
        eventId: 'evt_003',
        eventType: 'service.deprecated' as const,
        data: {
          ...mockEventPayload.data,
          deprecationReason: 'No longer offered',
        },
      };

      const deprecatedMessage = {
        ...mockMessage,
        key: Buffer.from('evt_003'),
        value: Buffer.from(JSON.stringify(deprecatedPayload)),
      };

      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-3',
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceDeprecated.mockResolvedValue(undefined);

      await consumer.handleMessage(deprecatedMessage);

      expect(syncService.handleServiceDeprecated).toHaveBeenCalledWith(
        deprecatedPayload,
        'event-log-3',
      );
    });

    it('should throw error for unknown event type', async () => {
      const unknownPayload = {
        ...mockEventPayload,
        eventType: 'service.unknown' as any,
      };

      const unknownMessage = {
        ...mockMessage,
        value: Buffer.from(JSON.stringify(unknownPayload)),
      };

      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-1',
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await expect(consumer.handleMessage(unknownMessage)).rejects.toThrow(
        'Unknown event type',
      );
    });

    it('should log processing time', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-1',
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceCreated.mockResolvedValue(undefined);

      const loggerSpy = jest.spyOn(consumer['logger'], 'log');

      await consumer.handleMessage(mockMessage);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('processed successfully in'),
      );
    });

    it('should handle message with null key by generating event ID', async () => {
      const messageWithoutKey = {
        ...mockMessage,
        key: null,
      };

      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-1',
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceCreated.mockResolvedValue(undefined);

      await consumer.handleMessage(messageWithoutKey);

      expect(prisma.serviceCatalogEventLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: expect.stringMatching(/^evt_\d+$/),
        }),
      });
    });
  });

  describe('simulateEvent', () => {
    it('should simulate event processing', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-1',
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceCreated.mockResolvedValue(undefined);

      await consumer.simulateEvent(mockEventPayload);

      expect(syncService.handleServiceCreated).toHaveBeenCalledWith(
        mockEventPayload,
        'event-log-1',
      );
    });

    it('should log simulation', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        id: 'event-log-1',
      });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockSyncService.handleServiceCreated.mockResolvedValue(undefined);

      const loggerSpy = jest.spyOn(consumer['logger'], 'log');

      await consumer.simulateEvent(mockEventPayload);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Simulating event'),
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return enabled status when sync is enabled', () => {
      const status = consumer.getHealthStatus();

      expect(status).toEqual({
        enabled: true,
        status: 'running',
      });
    });

    it('should return disabled status when sync is disabled', () => {
      process.env.SERVICE_CATALOG_SYNC_ENABLED = 'false';

      const newConsumer = new ServiceCatalogEventConsumer(
        prisma,
        syncService,
      );

      const status = newConsumer.getHealthStatus();

      expect(status).toEqual({
        enabled: false,
        status: 'disabled',
      });
    });
  });
});
