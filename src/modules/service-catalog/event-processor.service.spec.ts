import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogEventProcessor } from './event-processor.service';
import { ServiceCatalogEventLogService } from './event-log.service';
import { ServiceCatalogSyncService } from './sync.service';
import { EventProcessingStatus } from '@prisma/client';

describe('ServiceCatalogEventProcessor', () => {
  let processor: ServiceCatalogEventProcessor;
  let eventLogService: ServiceCatalogEventLogService;
  let syncService: ServiceCatalogSyncService;

  const mockEventLogService = {
    findByEventId: jest.fn(),
    create: jest.fn(),
    markAsCompleted: jest.fn(),
    markAsFailed: jest.fn(),
    markForRetry: jest.fn(),
    getFailedEvents: jest.fn(),
  };

  const mockSyncService = {
    handleServiceCreated: jest.fn(),
    handleServiceUpdated: jest.fn(),
    handleServiceDeprecated: jest.fn(),
  };

  const mockEvent = {
    eventId: 'evt_12345',
    eventType: 'service.created' as const,
    source: 'PYXIS',
    eventTimestamp: new Date().toISOString(),
    data: {
      externalServiceCode: 'PYX_ES_HVAC_001',
      type: 'installation',
      category: 'hvac',
      countryCode: 'ES',
      businessUnit: 'LM',
      name: { es: 'Instalación HVAC' },
      description: { es: 'Instalación completa de sistema HVAC' },
      scopeIncluded: [],
      scopeExcluded: [],
      worksiteRequirements: [],
      productPrerequisites: [],
      estimatedDuration: 60,
    },
  };

  const mockService = {
    id: 'svc-uuid-1',
    externalServiceCode: 'PYX_ES_HVAC_001',
    fsmServiceCode: 'ES_HVAC_12345',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogEventProcessor,
        { provide: ServiceCatalogEventLogService, useValue: mockEventLogService },
        { provide: ServiceCatalogSyncService, useValue: mockSyncService },
      ],
    }).compile();

    processor = module.get<ServiceCatalogEventProcessor>(
      ServiceCatalogEventProcessor,
    );
    eventLogService = module.get<ServiceCatalogEventLogService>(
      ServiceCatalogEventLogService,
    );
    syncService = module.get<ServiceCatalogSyncService>(
      ServiceCatalogSyncService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  // ============================================================================
  // IDEMPOTENCY CHECKS
  // ============================================================================

  describe('Idempotency', () => {
    it('should skip already processed events', async () => {
      const processedLog = {
        id: 'log-uuid-1',
        eventId: 'evt_12345',
        processingStatus: EventProcessingStatus.COMPLETED,
      };
      mockEventLogService.findByEventId.mockResolvedValue(processedLog);

      const result = await processor.processEvent(mockEvent);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toBe('Already processed');
      expect(mockEventLogService.create).not.toHaveBeenCalled();
      expect(mockSyncService.handleServiceCreated).not.toHaveBeenCalled();
    });

    it('should process new events', async () => {
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockResolvedValue({
        id: 'log-uuid-new',
        eventId: 'evt_12345',
      });
      mockSyncService.handleServiceCreated.mockResolvedValue(mockService);
      mockEventLogService.markAsCompleted.mockResolvedValue({});

      const result = await processor.processEvent(mockEvent);

      expect(result.success).toBe(true);
      expect(result.action).not.toBe('skipped');
      expect(mockEventLogService.findByEventId).toHaveBeenCalledWith('evt_12345');
      expect(mockEventLogService.create).toHaveBeenCalledWith({
        eventId: 'evt_12345',
        eventType: 'service.created',
        externalSource: 'PYXIS',
        externalServiceCode: 'PYX_ES_HVAC_001',
        payload: mockEvent,
      });
    });
  });

  // ============================================================================
  // EVENT TYPE ROUTING
  // ============================================================================

  describe('Event type routing', () => {
    beforeEach(() => {
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockResolvedValue({
        id: 'log-uuid-new',
        eventId: 'evt_12345',
      });
      mockEventLogService.markAsCompleted.mockResolvedValue({});
    });

    it('should handle service.created events', async () => {
      mockSyncService.handleServiceCreated.mockResolvedValue(mockService);

      const result = await processor.processEvent(mockEvent);

      expect(result.success).toBe(true);
      expect(mockSyncService.handleServiceCreated).toHaveBeenCalledWith(
        mockEvent.data,
      );
      expect(mockEventLogService.markAsCompleted).toHaveBeenCalledWith(
        'evt_12345',
      );
    });

    it('should handle service.updated events', async () => {
      const updateEvent = {
        ...mockEvent,
        eventType: 'service.updated' as const,
      };
      mockSyncService.handleServiceUpdated.mockResolvedValue(mockService);

      const result = await processor.processEvent(updateEvent);

      expect(result.success).toBe(true);
      expect(mockSyncService.handleServiceUpdated).toHaveBeenCalledWith(
        updateEvent.data,
      );
      expect(mockEventLogService.markAsCompleted).toHaveBeenCalledWith(
        'evt_12345',
      );
    });

    it('should handle service.deprecated events', async () => {
      const deprecateEvent = {
        ...mockEvent,
        eventType: 'service.deprecated' as const,
      };
      mockSyncService.handleServiceDeprecated.mockResolvedValue(mockService);

      const result = await processor.processEvent(deprecateEvent);

      expect(result.success).toBe(true);
      expect(mockSyncService.handleServiceDeprecated).toHaveBeenCalledWith(
        deprecateEvent.data,
      );
      expect(mockEventLogService.markAsCompleted).toHaveBeenCalledWith(
        'evt_12345',
      );
    });

    it('should reject unknown event types', async () => {
      const unknownEvent = {
        ...mockEvent,
        eventType: 'service.unknown',
      } as any; // Cast to bypass TypeScript check for testing invalid event

      const result = await processor.processEvent(unknownEvent);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Unknown event type');
      expect(mockSyncService.handleServiceCreated).not.toHaveBeenCalled();
      expect(mockEventLogService.markAsFailed).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error handling', () => {
    beforeEach(() => {
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockResolvedValue({
        id: 'log-uuid-new',
        eventId: 'evt_12345',
      });
    });

    it('should mark event as failed on processing error', async () => {
      const error = new Error('Database connection lost');
      mockSyncService.handleServiceCreated.mockRejectedValue(error);
      mockEventLogService.markAsFailed.mockResolvedValue({});

      const result = await processor.processEvent(mockEvent);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Database connection lost');
      expect(mockEventLogService.markAsFailed).toHaveBeenCalledWith(
        'evt_12345',
        error,
      );
      expect(mockEventLogService.markAsCompleted).not.toHaveBeenCalled();
    });

    it('should handle log creation failures gracefully', async () => {
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockRejectedValue(
        new Error('Log table locked'),
      );

      const result = await processor.processEvent(mockEvent);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Log table locked');
    });
  });

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  describe('Batch processing', () => {
    const events = [
      { ...mockEvent, eventId: 'evt_001' },
      { ...mockEvent, eventId: 'evt_002' },
      { ...mockEvent, eventId: 'evt_003' },
    ];

    it('should process multiple events in parallel', async () => {
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockResolvedValue({ id: 'log-uuid' });
      mockSyncService.handleServiceCreated.mockResolvedValue(mockService);
      mockEventLogService.markAsCompleted.mockResolvedValue({});

      const result = await processor.processEventBatch(events);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should track failures in batch processing', async () => {
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockResolvedValue({ id: 'log-uuid' });
      mockSyncService.handleServiceCreated
        .mockResolvedValueOnce(mockService) // evt_001 succeeds
        .mockRejectedValueOnce(new Error('Fail')) // evt_002 fails
        .mockResolvedValueOnce(mockService); // evt_003 succeeds
      mockEventLogService.markAsCompleted.mockResolvedValue({});
      mockEventLogService.markAsFailed.mockResolvedValue({});

      const result = await processor.processEventBatch(events);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should track skipped events in batch', async () => {
      mockEventLogService.findByEventId
        .mockResolvedValueOnce(null) // evt_001 new
        .mockResolvedValueOnce({
          // evt_002 already processed
          eventId: 'evt_002',
          processingStatus: EventProcessingStatus.COMPLETED,
        })
        .mockResolvedValueOnce(null); // evt_003 new
      mockEventLogService.create.mockResolvedValue({ id: 'log-uuid' });
      mockSyncService.handleServiceCreated.mockResolvedValue(mockService);
      mockEventLogService.markAsCompleted.mockResolvedValue({});

      const result = await processor.processEventBatch(events);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3); // Skipped events count as successful
      expect(result.failed).toBe(0);
      // Check that one event was skipped
      const skippedResults = result.results.filter(r => r.action === 'skipped');
      expect(skippedResults.length).toBe(1);
    });

    it('should return empty result for empty batch', async () => {
      const result = await processor.processEventBatch([]);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  // ============================================================================
  // RETRY FAILED EVENTS
  // ============================================================================

  describe('Retry failed events', () => {
    it('should retry failed events successfully', async () => {
      const failedEvents = [
        {
          id: 'log-1',
          eventId: 'evt_failed_1',
          eventType: 'service.created',
          externalSource: 'PYXIS',
          externalServiceCode: 'PYX_001',
          payload: mockEvent,
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: 1,
        },
        {
          id: 'log-2',
          eventId: 'evt_failed_2',
          eventType: 'service.updated',
          externalSource: 'PYXIS',
          externalServiceCode: 'PYX_002',
          payload: { ...mockEvent, eventType: 'service.updated' as const },
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: 2,
        },
      ];
      mockEventLogService.getFailedEvents.mockResolvedValue(failedEvents);
      mockEventLogService.markForRetry.mockResolvedValue({});
      // Mock findByEventId to return null on retry (event has been reset to PENDING)
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockResolvedValue({ id: 'log-uuid' });
      mockSyncService.handleServiceCreated.mockResolvedValue(mockService);
      mockSyncService.handleServiceUpdated.mockResolvedValue(mockService);
      mockEventLogService.markAsCompleted.mockResolvedValue({});

      const retriedCount = await processor.retryFailedEvents(10);

      expect(retriedCount).toBe(2);
      expect(mockEventLogService.getFailedEvents).toHaveBeenCalledWith(10);
      expect(mockSyncService.handleServiceCreated).toHaveBeenCalled();
      expect(mockSyncService.handleServiceUpdated).toHaveBeenCalled();
    });

    it('should handle retry failures gracefully', async () => {
      const failedEvents = [
        {
          id: 'log-1',
          eventId: 'evt_failed_1',
          eventType: 'service.created',
          externalSource: 'PYXIS',
          externalServiceCode: 'PYX_001',
          payload: mockEvent,
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: 1,
        },
      ];
      mockEventLogService.getFailedEvents.mockResolvedValue(failedEvents);
      mockEventLogService.markForRetry.mockResolvedValue({});
      // Mock findByEventId to return null (retry attempt)
      mockEventLogService.findByEventId.mockResolvedValue(null);
      mockEventLogService.create.mockResolvedValue({ id: 'log-uuid' });
      mockSyncService.handleServiceCreated.mockRejectedValue(
        new Error('Still failing'),
      );
      mockEventLogService.markAsFailed.mockResolvedValue({});

      const retriedCount = await processor.retryFailedEvents(10);

      expect(retriedCount).toBe(0); // No successful retries
      // Note: markAsFailed is called inside the catch, but processEvent's error is caught by retryFailedEvents try/catch
      // So we can't easily verify markAsFailed was called without more complex mocking
    });

    it('should return 0 when no failed events exist', async () => {
      mockEventLogService.getFailedEvents.mockResolvedValue([]);

      const retriedCount = await processor.retryFailedEvents(10);

      expect(retriedCount).toBe(0);
    });
  });
});
