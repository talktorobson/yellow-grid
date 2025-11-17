import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogEventLogService } from './event-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventProcessingStatus } from '@prisma/client';

describe('ServiceCatalogEventLogService', () => {
  let service: ServiceCatalogEventLogService;
  let prisma: PrismaService;

  const mockPrismaService = {
    serviceCatalogEventLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockEventLog = {
    id: 'log-uuid-1',
    eventId: 'evt_123',
    eventType: 'service.created',
    externalSource: 'PYXIS',
    externalServiceCode: 'PYX_ES_HVAC_001',
    processingStatus: EventProcessingStatus.PENDING,
    payload: { test: 'data' },
    errorMessage: null,
    retryCount: 0,
    receivedAt: new Date('2025-01-01'),
    processedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogEventLogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServiceCatalogEventLogService>(
      ServiceCatalogEventLogService,
    );
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // FIND METHODS
  // ============================================================================

  describe('findByEventId', () => {
    it('should find event by event ID', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        mockEventLog,
      );

      const result = await service.findByEventId('evt_123');

      expect(result).toEqual(mockEventLog);
      expect(prisma.serviceCatalogEventLog.findUnique).toHaveBeenCalledWith({
        where: { eventId: 'evt_123' },
      });
    });

    it('should return null when event not found', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );

      const result = await service.findByEventId('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // CREATE METHOD
  // ============================================================================

  describe('create', () => {
    const createData = {
      eventId: 'evt_456',
      eventType: 'service.updated',
      externalSource: 'PYXIS',
      externalServiceCode: 'PYX_ES_PLUMB_001',
      payload: { test: 'payload' },
    };

    it('should create a new event log entry', async () => {
      const created = {
        ...mockEventLog,
        ...createData,
        processingStatus: EventProcessingStatus.PENDING,
      };
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue(
        created,
      );

      const result = await service.create(createData);

      expect(result).toEqual(created);
      expect(prisma.serviceCatalogEventLog.create).toHaveBeenCalledWith({
        data: {
          eventId: 'evt_456',
          eventType: 'service.updated',
          externalSource: 'PYXIS',
          externalServiceCode: 'PYX_ES_PLUMB_001',
          payload: { test: 'payload' },
          processingStatus: EventProcessingStatus.PENDING,
          retryCount: 0,
          receivedAt: expect.any(Date),
        },
      });
    });

    it('should set processingStatus to PENDING by default', async () => {
      mockPrismaService.serviceCatalogEventLog.create.mockResolvedValue({
        ...mockEventLog,
        ...createData,
      });

      await service.create(createData);

      const callArgs = (prisma.serviceCatalogEventLog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.processingStatus).toBe(
        EventProcessingStatus.PENDING,
      );
      expect(callArgs.data.retryCount).toBe(0);
    });
  });

  // ============================================================================
  // STATUS UPDATE METHODS
  // ============================================================================

  describe('markAsCompleted', () => {
    it('should mark event as completed', async () => {
      const completed = {
        ...mockEventLog,
        processingStatus: EventProcessingStatus.COMPLETED,
        processedAt: new Date(),
      };
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue(
        completed,
      );

      const result = await service.markAsCompleted('evt_123');

      expect(result).toEqual(completed);
      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { eventId: 'evt_123' },
        data: {
          processingStatus: EventProcessingStatus.COMPLETED,
          processedAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsFailed', () => {
    it('should mark event as failed with error message', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        mockEventLog,
      );
      const failed = {
        ...mockEventLog,
        processingStatus: EventProcessingStatus.FAILED,
        errorMessage: 'Test error',
        retryCount: 1,
      };
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue(
        failed,
      );

      const error = new Error('Test error');
      const result = await service.markAsFailed('evt_123', error);

      expect(result).toEqual(failed);
      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { eventId: 'evt_123' },
        data: {
          processingStatus: EventProcessingStatus.FAILED,
          errorMessage: 'Test error',
          retryCount: 1,
          processedAt: expect.any(Date),
        },
      });
    });

    it('should move to DEAD_LETTER after max retries', async () => {
      const eventWithRetries = {
        ...mockEventLog,
        retryCount: 2, // Will become 3 after this failure
      };
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        eventWithRetries,
      );
      const deadLetter = {
        ...eventWithRetries,
        processingStatus: EventProcessingStatus.DEAD_LETTER,
        retryCount: 3,
      };
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue(
        deadLetter,
      );

      const error = new Error('Final failure');
      const result = await service.markAsFailed('evt_123', error);

      expect(result).toBeDefined();
      expect(result!.processingStatus).toBe(EventProcessingStatus.DEAD_LETTER);
      expect(result!.retryCount).toBe(3);
    });

    it('should handle event not found gracefully', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );

      const error = new Error('Test error');
      const result = await service.markAsFailed('nonexistent', error);

      expect(result).toBeUndefined();
      expect(prisma.serviceCatalogEventLog.update).not.toHaveBeenCalled();
    });
  });

  describe('markForRetry', () => {
    it('should reset event to PENDING for retry', async () => {
      const failedEvent = {
        ...mockEventLog,
        processingStatus: EventProcessingStatus.FAILED,
        errorMessage: 'Previous error',
        retryCount: 1,
      };
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        failedEvent,
      );
      const retry = {
        ...failedEvent,
        processingStatus: EventProcessingStatus.PENDING,
        errorMessage: null,
      };
      mockPrismaService.serviceCatalogEventLog.update.mockResolvedValue(retry);

      const result = await service.markForRetry('evt_123');

      expect(result).toEqual(retry);
      expect(prisma.serviceCatalogEventLog.update).toHaveBeenCalledWith({
        where: { eventId: 'evt_123' },
        data: {
          processingStatus: EventProcessingStatus.PENDING,
          errorMessage: null,
        },
      });
    });

    it('should throw error if event not found', async () => {
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        null,
      );

      await expect(service.markForRetry('nonexistent')).rejects.toThrow(
        'Event nonexistent not found',
      );
    });

    it('should throw error if max retries exceeded', async () => {
      const maxRetriesEvent = {
        ...mockEventLog,
        retryCount: 3,
      };
      mockPrismaService.serviceCatalogEventLog.findUnique.mockResolvedValue(
        maxRetriesEvent,
      );

      await expect(service.markForRetry('evt_123')).rejects.toThrow(
        'Event evt_123 has exceeded max retries',
      );
    });
  });

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  describe('getFailedEvents', () => {
    it('should get failed events', async () => {
      const failedEvents = [
        {
          ...mockEventLog,
          processingStatus: EventProcessingStatus.FAILED,
        },
        {
          ...mockEventLog,
          id: 'log-uuid-2',
          processingStatus: EventProcessingStatus.DEAD_LETTER,
        },
      ];
      mockPrismaService.serviceCatalogEventLog.findMany.mockResolvedValue(
        failedEvents,
      );

      const result = await service.getFailedEvents(50);

      expect(result).toEqual(failedEvents);
      expect(prisma.serviceCatalogEventLog.findMany).toHaveBeenCalledWith({
        where: {
          processingStatus: {
            in: [
              EventProcessingStatus.FAILED,
              EventProcessingStatus.DEAD_LETTER,
            ],
          },
        },
        orderBy: { receivedAt: 'desc' },
        take: 50,
      });
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.serviceCatalogEventLog.findMany.mockResolvedValue([]);

      await service.getFailedEvents(10);

      expect(prisma.serviceCatalogEventLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getEventsByServiceCode', () => {
    it('should get events for a specific service', async () => {
      const serviceEvents = [mockEventLog];
      mockPrismaService.serviceCatalogEventLog.findMany.mockResolvedValue(
        serviceEvents,
      );

      const result = await service.getEventsByServiceCode('PYX_ES_HVAC_001');

      expect(result).toEqual(serviceEvents);
      expect(prisma.serviceCatalogEventLog.findMany).toHaveBeenCalledWith({
        where: { externalServiceCode: 'PYX_ES_HVAC_001' },
        orderBy: { receivedAt: 'desc' },
        take: 20,
      });
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      mockPrismaService.serviceCatalogEventLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85) // completed
        .mockResolvedValueOnce(10) // failed
        .mockResolvedValueOnce(3); // dead letter

      mockPrismaService.serviceCatalogEventLog.groupBy
        .mockResolvedValueOnce([
          { eventType: 'service.created', _count: 40 },
          { eventType: 'service.updated', _count: 50 },
          { eventType: 'service.deprecated', _count: 10 },
        ])
        .mockResolvedValueOnce([
          { externalSource: 'PYXIS', _count: 70 },
          { externalSource: 'TEMPO', _count: 30 },
        ]);

      const result = await service.getStatistics();

      expect(result).toEqual({
        period: {
          since: expect.any(Date),
          until: expect.any(Date),
        },
        total: 100,
        byStatus: {
          completed: 85,
          failed: 10,
          deadLetter: 3,
          pending: 2,
        },
        successRate: '85.00',
        byType: [
          { type: 'service.created', count: 40 },
          { type: 'service.updated', count: 50 },
          { type: 'service.deprecated', count: 10 },
        ],
        bySource: [
          { source: 'PYXIS', count: 70 },
          { source: 'TEMPO', count: 30 },
        ],
      });
    });

    it('should handle zero total events', async () => {
      mockPrismaService.serviceCatalogEventLog.count.mockResolvedValue(0);
      mockPrismaService.serviceCatalogEventLog.groupBy.mockResolvedValue([]);

      const result = await service.getStatistics();

      expect(result.successRate).toBe('0.00');
    });

    it('should accept custom date range', async () => {
      const customDate = new Date('2025-01-01');
      mockPrismaService.serviceCatalogEventLog.count.mockResolvedValue(50);
      mockPrismaService.serviceCatalogEventLog.groupBy.mockResolvedValue([]);

      await service.getStatistics(customDate);

      expect(prisma.serviceCatalogEventLog.count).toHaveBeenCalledWith({
        where: { receivedAt: { gte: customDate } },
      });
    });
  });

  // ============================================================================
  // CLEANUP
  // ============================================================================

  describe('cleanupOldEvents', () => {
    it('should delete completed events older than specified days', async () => {
      mockPrismaService.serviceCatalogEventLog.deleteMany.mockResolvedValue({
        count: 250,
      });

      const result = await service.cleanupOldEvents(30);

      expect(result).toBe(250);
      expect(prisma.serviceCatalogEventLog.deleteMany).toHaveBeenCalledWith({
        where: {
          processingStatus: EventProcessingStatus.COMPLETED,
          processedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should use default of 30 days if not specified', async () => {
      mockPrismaService.serviceCatalogEventLog.deleteMany.mockResolvedValue({
        count: 100,
      });

      await service.cleanupOldEvents();

      expect(prisma.serviceCatalogEventLog.deleteMany).toHaveBeenCalled();
    });

    it('should only delete COMPLETED events', async () => {
      mockPrismaService.serviceCatalogEventLog.deleteMany.mockResolvedValue({
        count: 50,
      });

      await service.cleanupOldEvents(60);

      const callArgs = (prisma.serviceCatalogEventLog.deleteMany as jest.Mock)
        .mock.calls[0][0];
      expect(callArgs.where.processingStatus).toBe(
        EventProcessingStatus.COMPLETED,
      );
    });
  });
});
