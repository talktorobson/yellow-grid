import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../sync/sync.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ServiceCatalogService } from '../service-catalog.service';
import { ServiceEventPayload } from '../sync/dto/service-event.dto';
import { EventProcessingStatus, ServiceType, ServiceCategory } from '@prisma/client';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: PrismaService;
  let serviceCatalogService: ServiceCatalogService;

  const mockPrismaService = {
    serviceCatalog: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    contractTemplate: {
      findUnique: jest.fn(),
    },
    serviceCatalogEventLog: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockServiceCatalogService = {
    create: jest.fn(),
    findByExternalCode: jest.fn(),
    update: jest.fn(),
    deprecate: jest.fn(),
    computeChecksum: jest.fn(),
    detectBreakingChanges: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ServiceCatalogService,
          useValue: mockServiceCatalogService,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
    serviceCatalogService = module.get<ServiceCatalogService>(ServiceCatalogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleServiceCreated', () => {
    const eventPayload: ServiceEventPayload = {
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

    it('should create new service when not exists', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([]); // For FSM code generation
      mockServiceCatalogService.create.mockResolvedValue({ id: 'service-1' });
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await service.handleServiceCreated(eventPayload, 'event-log-1');

      expect(serviceCatalogService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          externalServiceCode: 'PYX_ES_HVAC_001',
          fsmServiceCode: expect.stringMatching(/SVC_ES_HVAC_\d{3}/),
          externalSource: 'PYXIS',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          serviceType: ServiceType.INSTALLATION,
          serviceCategory: ServiceCategory.HVAC,
          name: 'HVAC Installation',
          createdBy: 'SYNC_PYXIS',
        }),
      );

      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { id: 'event-log-1' },
        data: {
          processingStatus: EventProcessingStatus.COMPLETED,
          errorMessage: null,
          processedAt: expect.any(Date),
        },
      });
    });

    it('should treat as update when service already exists', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue({
        id: 'existing-service',
      });
      mockServiceCatalogService.findByExternalCode.mockResolvedValue({
        id: 'existing-service',
        syncChecksum: 'old-checksum',
      });
      mockServiceCatalogService.detectBreakingChanges.mockReturnValue(false);
      mockServiceCatalogService.computeChecksum.mockReturnValue('new-checksum');
      mockServiceCatalogService.update.mockResolvedValue({});
      mockPrismaService.serviceCatalog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await service.handleServiceCreated(eventPayload, 'event-log-1');

      expect(serviceCatalogService.update).toHaveBeenCalled();
      expect(serviceCatalogService.create).not.toHaveBeenCalled();
    });

    it('should update event log to FAILED on error', async () => {
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockServiceCatalogService.create.mockRejectedValue(
        new Error('Database error'),
      );
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await expect(
        service.handleServiceCreated(eventPayload, 'event-log-1'),
      ).rejects.toThrow('Database error');

      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { id: 'event-log-1' },
        data: {
          processingStatus: EventProcessingStatus.FAILED,
          errorMessage: 'Database error',
          processedAt: expect.any(Date),
        },
      });
    });
  });

  describe('handleServiceUpdated', () => {
    const eventPayload: ServiceEventPayload = {
      eventId: 'evt_002',
      eventType: 'service.updated',
      timestamp: '2025-01-17T11:00:00Z',
      source: 'PYXIS',
      data: {
        externalServiceCode: 'PYX_ES_HVAC_001',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        type: 'installation',
        category: 'hvac',
        name: 'Updated HVAC Installation',
        scopeIncluded: ['Install', 'Test', 'Clean'],
        scopeExcluded: ['Wall work'],
        worksiteRequirements: ['Power outlet'],
        productPrerequisites: ['Unit delivered'],
        estimatedDurationMinutes: 180,
        requiresPreServiceContract: true,
        requiresPostServiceWCF: true,
      },
    };

    const existingService = {
      id: 'service-1',
      externalServiceCode: 'PYX_ES_HVAC_001',
      syncChecksum: 'old-checksum',
      scopeIncluded: ['Install', 'Test'],
      scopeExcluded: ['Wall work'],
      worksiteRequirements: ['Power outlet'],
      productPrerequisites: ['Unit delivered'],
    };

    it('should update service when checksum changed', async () => {
      mockServiceCatalogService.findByExternalCode.mockResolvedValue(existingService);
      mockServiceCatalogService.detectBreakingChanges.mockReturnValue(false);
      mockServiceCatalogService.computeChecksum.mockReturnValue('new-checksum');
      mockServiceCatalogService.update.mockResolvedValue({});
      mockPrismaService.serviceCatalog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await service.handleServiceUpdated(eventPayload, 'event-log-1');

      expect(serviceCatalogService.update).toHaveBeenCalledWith(
        'service-1',
        expect.objectContaining({
          name: 'Updated HVAC Installation',
        }),
        'SYNC_PYXIS',
      );

      expect(prisma.serviceCatalog.update).toHaveBeenCalledWith({
        where: { id: 'service-1' },
        data: {
          syncChecksum: 'new-checksum',
          lastSyncedAt: expect.any(Date),
        },
      });
    });

    it('should skip update when checksum unchanged', async () => {
      mockServiceCatalogService.findByExternalCode.mockResolvedValue({
        ...existingService,
        syncChecksum: 'same-checksum',
      });
      mockServiceCatalogService.computeChecksum.mockReturnValue('same-checksum');
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await service.handleServiceUpdated(eventPayload, 'event-log-1');

      expect(serviceCatalogService.update).not.toHaveBeenCalled();
      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { id: 'event-log-1' },
        data: {
          processingStatus: EventProcessingStatus.COMPLETED,
          errorMessage: null,
          processedAt: expect.any(Date),
        },
      });
    });

    it('should log warning for breaking changes', async () => {
      mockServiceCatalogService.findByExternalCode.mockResolvedValue(existingService);
      mockServiceCatalogService.detectBreakingChanges.mockReturnValue(true);
      mockServiceCatalogService.computeChecksum.mockReturnValue('new-checksum');
      mockServiceCatalogService.update.mockResolvedValue({});
      mockPrismaService.serviceCatalog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.handleServiceUpdated(eventPayload, 'event-log-1');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Breaking changes detected'),
      );
      expect(serviceCatalogService.detectBreakingChanges).toHaveBeenCalled();
    });
  });

  describe('handleServiceDeprecated', () => {
    const eventPayload: ServiceEventPayload = {
      eventId: 'evt_003',
      eventType: 'service.deprecated',
      timestamp: '2025-01-17T12:00:00Z',
      source: 'PYXIS',
      data: {
        externalServiceCode: 'PYX_ES_HVAC_001',
        countryCode: 'ES',
        businessUnit: 'LM_ES',
        type: 'installation',
        category: 'hvac',
        name: 'HVAC Installation',
        scopeIncluded: [],
        scopeExcluded: [],
        worksiteRequirements: [],
        productPrerequisites: [],
        estimatedDurationMinutes: 180,
        requiresPreServiceContract: true,
        requiresPostServiceWCF: true,
        deprecationReason: 'No longer offered',
      },
    };

    it('should deprecate service', async () => {
      mockServiceCatalogService.findByExternalCode.mockResolvedValue({
        id: 'service-1',
      });
      mockServiceCatalogService.deprecate.mockResolvedValue({});
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await service.handleServiceDeprecated(eventPayload, 'event-log-1');

      expect(serviceCatalogService.deprecate).toHaveBeenCalledWith(
        'service-1',
        'No longer offered',
        'SYNC_PYXIS',
      );

      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { id: 'event-log-1' },
        data: {
          processingStatus: EventProcessingStatus.COMPLETED,
          errorMessage: null,
          processedAt: expect.any(Date),
        },
      });
    });

    it('should use default reason if not provided', async () => {
      const payloadWithoutReason = {
        ...eventPayload,
        data: { ...eventPayload.data, deprecationReason: undefined },
      };

      mockServiceCatalogService.findByExternalCode.mockResolvedValue({
        id: 'service-1',
      });
      mockServiceCatalogService.deprecate.mockResolvedValue({});
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});

      await service.handleServiceDeprecated(payloadWithoutReason, 'event-log-1');

      expect(serviceCatalogService.deprecate).toHaveBeenCalledWith(
        'service-1',
        'Deprecated by external system',
        'SYNC_PYXIS',
      );
    });
  });

  describe('retryFailedEvents', () => {
    const failedEvents = [
      {
        id: 'event-log-1',
        eventId: 'evt_001',
        retryCount: 0,
        payload: {
          eventId: 'evt_001',
          eventType: 'service.created',
          source: 'PYXIS',
          data: { externalServiceCode: 'PYX_ES_HVAC_001' },
        },
      },
      {
        id: 'event-log-2',
        eventId: 'evt_002',
        retryCount: 1,
        payload: {
          eventId: 'evt_002',
          eventType: 'service.updated',
          source: 'PYXIS',
          data: { externalServiceCode: 'PYX_ES_HVAC_002' },
        },
      },
    ];

    it('should retry failed events and return count', async () => {
      mockPrismaService.serviceCatalogEventLog.findMany.mockResolvedValue(failedEvents);
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalog.findUnique.mockResolvedValue(null);
      mockPrismaService.serviceCatalog.findMany.mockResolvedValue([]);
      mockServiceCatalogService.create.mockResolvedValue({});

      const retriedCount = await service.retryFailedEvents(3);

      expect(retriedCount).toBe(2);
      expect(prisma.serviceCatalogEventLog.findMany).toHaveBeenCalledWith({
        where: {
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: { lt: 3 },
        },
        take: 100,
      });
    });

    it('should move to DEAD_LETTER after max retries', async () => {
      const maxRetriesEvent = {
        id: 'event-log-1',
        eventId: 'evt_001',
        retryCount: 2,
        payload: {
          eventId: 'evt_001',
          eventType: 'service.created',
          source: 'PYXIS',
          data: { externalServiceCode: 'PYX_ES_HVAC_001' },
        },
      };

      mockPrismaService.serviceCatalogEventLog.findMany.mockResolvedValue([maxRetriesEvent]);
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue({});
      mockPrismaService.serviceCatalog.findUnique.mockRejectedValue(
        new Error('Persistent error'),
      );

      await service.retryFailedEvents(3);

      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { id: 'event-log-1' },
        data: {
          processingStatus: EventProcessingStatus.DEAD_LETTER,
          errorMessage: expect.stringContaining('Max retries (3) exceeded'),
        },
      });
    });
  });

  describe('getSyncStatistics', () => {
    it('should return sync statistics', async () => {
      mockPrismaService.serviceCatalogEventLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // completed
        .mockResolvedValueOnce(10)  // failed
        .mockResolvedValueOnce(5)   // pending
        .mockResolvedValueOnce(5);  // processing

      const result = await service.getSyncStatistics('PYXIS');

      expect(result).toEqual({
        total: 100,
        completed: 80,
        failed: 10,
        pending: 5,
        processing: 5,
        successRate: '80.00',
        failureRate: '10.00',
      });
    });

    it('should handle zero events', async () => {
      mockPrismaService.serviceCatalogEventLog.count.mockResolvedValue(0);

      const result = await service.getSyncStatistics('PYXIS');

      expect(result.successRate).toBe('0.00');
      expect(result.failureRate).toBe('0.00');
    });
  });
});
