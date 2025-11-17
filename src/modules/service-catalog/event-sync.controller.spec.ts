import { Test, TestingModule } from '@nestjs/testing';
import { EventSyncController } from './event-sync.controller';
import { ServiceCatalogEventLogService } from './event-log.service';
import { ServiceCatalogEventProcessor } from './event-processor.service';
import { EventProcessingStatus } from '@prisma/client';

describe('EventSyncController', () => {
  let controller: EventSyncController;
  let eventLogService: ServiceCatalogEventLogService;
  let eventProcessor: ServiceCatalogEventProcessor;

  const mockEventLogService = {
    findByEventId: jest.fn(),
    getStatistics: jest.fn(),
    getFailedEvents: jest.fn(),
    cleanupOldEvents: jest.fn(),
  };

  const mockEventProcessor = {
    processEvent: jest.fn(),
    processEventBatch: jest.fn(),
    retryFailedEvents: jest.fn(),
  };

  const mockEvent = {
    eventId: 'evt_12345',
    eventType: 'service.created',
    source: 'PYXIS',
    data: {
      externalServiceCode: 'PYX_ES_HVAC_001',
      type: 'installation',
      category: 'hvac',
      countryCode: 'ES',
      businessUnit: 'LM',
      name: { es: 'Instalación HVAC' },
      description: { es: 'Sistema HVAC completo' },
      scopeIncluded: [],
      scopeExcluded: [],
      worksiteRequirements: [],
      productPrerequisites: [],
      estimatedDuration: 120,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventSyncController],
      providers: [
        {
          provide: ServiceCatalogEventLogService,
          useValue: mockEventLogService,
        },
        {
          provide: ServiceCatalogEventProcessor,
          useValue: mockEventProcessor,
        },
      ],
    }).compile();

    controller = module.get<EventSyncController>(EventSyncController);
    eventLogService = module.get<ServiceCatalogEventLogService>(
      ServiceCatalogEventLogService,
    );
    eventProcessor = module.get<ServiceCatalogEventProcessor>(
      ServiceCatalogEventProcessor,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================================
  // EVENT PROCESSING ENDPOINTS
  // ============================================================================

  describe('POST /events - Process single event', () => {
    it('should process a single event successfully', async () => {
      const expectedResult = {
        success: true,
        eventId: 'evt_12345',
        action: 'created',
        serviceId: 'svc-uuid-1',
        serviceFsmCode: 'ES_HVAC_12345',
      };

      mockEventProcessor.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.processEvent(mockEvent);

      expect(result).toEqual(expectedResult);
      expect(mockEventProcessor.processEvent).toHaveBeenCalledWith(mockEvent);
      expect(mockEventProcessor.processEvent).toHaveBeenCalledTimes(1);
    });

    it('should handle processing errors', async () => {
      const expectedResult = {
        success: false,
        eventId: 'evt_12345',
        action: 'failed',
        reason: 'Database connection lost',
      };

      mockEventProcessor.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.processEvent(mockEvent);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Database connection lost');
    });

    it('should skip duplicate events', async () => {
      const expectedResult = {
        success: true,
        eventId: 'evt_12345',
        action: 'skipped',
        reason: 'Already processed',
      };

      mockEventProcessor.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.processEvent(mockEvent);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
    });
  });

  describe('POST /events/batch - Process batch of events', () => {
    it('should process multiple events successfully', async () => {
      const events = [
        { ...mockEvent, eventId: 'evt_001' },
        { ...mockEvent, eventId: 'evt_002' },
        { ...mockEvent, eventId: 'evt_003' },
      ];

      const expectedResult = {
        total: 3,
        successful: 3,
        failed: 0,
        results: [
          { success: true, eventId: 'evt_001', action: 'created' },
          { success: true, eventId: 'evt_002', action: 'created' },
          { success: true, eventId: 'evt_003', action: 'created' },
        ],
      };

      mockEventProcessor.processEventBatch.mockResolvedValue(expectedResult);

      const result = await controller.processEventBatch(events);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockEventProcessor.processEventBatch).toHaveBeenCalledWith(events);
    });

    it('should handle partial batch failures', async () => {
      const events = [
        { ...mockEvent, eventId: 'evt_001' },
        { ...mockEvent, eventId: 'evt_002' },
      ];

      const expectedResult = {
        total: 2,
        successful: 1,
        failed: 1,
        results: [
          { success: true, eventId: 'evt_001', action: 'created' },
          { success: false, eventId: 'evt_002', action: 'failed', reason: 'Error' },
        ],
      };

      mockEventProcessor.processEventBatch.mockResolvedValue(expectedResult);

      const result = await controller.processEventBatch(events);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should handle empty batch', async () => {
      const expectedResult = {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };

      mockEventProcessor.processEventBatch.mockResolvedValue(expectedResult);

      const result = await controller.processEventBatch([]);

      expect(result.total).toBe(0);
    });
  });

  // ============================================================================
  // STATISTICS ENDPOINTS
  // ============================================================================

  describe('GET /statistics - Get event statistics', () => {
    it('should return statistics without date filter', async () => {
      const expectedStats = {
        period: {
          since: new Date('2025-01-10'),
          until: new Date('2025-01-17'),
        },
        total: 1250,
        byStatus: {
          completed: 1200,
          failed: 40,
          deadLetter: 10,
          pending: 0,
        },
        successRate: '96.00',
        byType: [
          { type: 'service.created', count: 500 },
          { type: 'service.updated', count: 600 },
          { type: 'service.deprecated', count: 150 },
        ],
        bySource: [
          { source: 'PYXIS', count: 800 },
          { source: 'TEMPO', count: 450 },
        ],
      };

      mockEventLogService.getStatistics.mockResolvedValue(expectedStats);

      const result = await controller.getStatistics();

      expect(result).toEqual(expectedStats);
      expect(mockEventLogService.getStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should return statistics with date filter', async () => {
      const sinceDate = '2025-01-01T00:00:00.000Z';
      const expectedStats = {
        period: {
          since: new Date(sinceDate),
          until: new Date('2025-01-17'),
        },
        total: 500,
        byStatus: {
          completed: 480,
          failed: 15,
          deadLetter: 5,
          pending: 0,
        },
        successRate: '96.00',
        byType: [],
        bySource: [],
      };

      mockEventLogService.getStatistics.mockResolvedValue(expectedStats);

      const result = await controller.getStatistics(sinceDate);

      expect(result.total).toBe(500);
      expect(mockEventLogService.getStatistics).toHaveBeenCalledWith(
        new Date(sinceDate),
      );
    });
  });

  // ============================================================================
  // FAILED EVENTS ENDPOINTS
  // ============================================================================

  describe('GET /failed-events - Get failed events', () => {
    it('should return failed events with default limit', async () => {
      const failedEvents = [
        {
          id: 'log-1',
          eventId: 'evt_failed_1',
          eventType: 'service.created',
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: 2,
          errorMessage: 'Connection timeout',
        },
        {
          id: 'log-2',
          eventId: 'evt_failed_2',
          eventType: 'service.updated',
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: 1,
          errorMessage: 'Validation error',
        },
      ];

      mockEventLogService.getFailedEvents.mockResolvedValue(failedEvents);

      const result = await controller.getFailedEvents();

      expect(result).toEqual(failedEvents);
      expect(result.length).toBe(2);
      expect(mockEventLogService.getFailedEvents).toHaveBeenCalledWith(50);
    });

    it('should return failed events with custom limit', async () => {
      const failedEvents = [
        {
          id: 'log-1',
          eventId: 'evt_failed_1',
          processingStatus: EventProcessingStatus.FAILED,
        },
      ];

      mockEventLogService.getFailedEvents.mockResolvedValue(failedEvents);

      const result = await controller.getFailedEvents(10);

      expect(mockEventLogService.getFailedEvents).toHaveBeenCalledWith(10);
    });

    it('should handle no failed events', async () => {
      mockEventLogService.getFailedEvents.mockResolvedValue([]);

      const result = await controller.getFailedEvents();

      expect(result).toEqual([]);
    });
  });

  describe('POST /retry-failed - Retry failed events', () => {
    it('should retry failed events with default max retries', async () => {
      mockEventProcessor.retryFailedEvents.mockResolvedValue(5);

      const result = await controller.retryFailedEvents();

      expect(result.retriedCount).toBe(5);
      expect(result.message).toContain('5 events');
      expect(mockEventProcessor.retryFailedEvents).toHaveBeenCalledWith(10);
    });

    it('should retry failed events with custom max retries', async () => {
      mockEventProcessor.retryFailedEvents.mockResolvedValue(3);

      const result = await controller.retryFailedEvents(20);

      expect(result.retriedCount).toBe(3);
      expect(mockEventProcessor.retryFailedEvents).toHaveBeenCalledWith(20);
    });

    it('should handle no events retried', async () => {
      mockEventProcessor.retryFailedEvents.mockResolvedValue(0);

      const result = await controller.retryFailedEvents();

      expect(result.retriedCount).toBe(0);
      expect(result.message).toContain('0 events');
    });
  });

  // ============================================================================
  // HOUSEKEEPING ENDPOINTS
  // ============================================================================

  describe('POST /cleanup - Cleanup old events', () => {
    it('should cleanup old events with default retention', async () => {
      mockEventLogService.cleanupOldEvents.mockResolvedValue(150);

      const result = await controller.cleanupOldEvents();

      expect(result.deletedCount).toBe(150);
      expect(result.message).toContain('150 old event logs');
      expect(result.message).toContain('30 days');
      expect(mockEventLogService.cleanupOldEvents).toHaveBeenCalledWith(30);
    });

    it('should cleanup old events with custom retention', async () => {
      mockEventLogService.cleanupOldEvents.mockResolvedValue(75);

      const result = await controller.cleanupOldEvents(60);

      expect(result.deletedCount).toBe(75);
      expect(result.message).toContain('60 days');
      expect(mockEventLogService.cleanupOldEvents).toHaveBeenCalledWith(60);
    });

    it('should handle no events to cleanup', async () => {
      mockEventLogService.cleanupOldEvents.mockResolvedValue(0);

      const result = await controller.cleanupOldEvents();

      expect(result.deletedCount).toBe(0);
    });
  });

  // ============================================================================
  // EVENT DETAILS ENDPOINT
  // ============================================================================

  describe('GET /events/:eventId - Get event by ID', () => {
    it('should return event details', async () => {
      const eventLog = {
        id: 'log-uuid-1',
        eventId: 'evt_12345',
        eventType: 'service.created',
        externalSource: 'PYXIS',
        externalServiceCode: 'PYX_ES_HVAC_001',
        processingStatus: EventProcessingStatus.COMPLETED,
        retryCount: 0,
        payload: mockEvent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventLogService.findByEventId.mockResolvedValue(eventLog);

      const result = await controller.getEventById('evt_12345');

      expect(result).toEqual(eventLog);
      expect(result).toBeDefined();
      expect(result!.eventId).toBe('evt_12345');
      expect(mockEventLogService.findByEventId).toHaveBeenCalledWith('evt_12345');
    });

    it('should return null for non-existent event', async () => {
      mockEventLogService.findByEventId.mockResolvedValue(null);

      const result = await controller.getEventById('evt_nonexistent');

      expect(result).toBeNull();
    });
  });
});
