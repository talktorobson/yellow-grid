import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogEventConsumer } from './service-catalog.consumer';
import { ServiceCatalogSyncService } from '../services/service-catalog-sync.service';
import { ServiceCatalogEventLogService } from '../services/service-catalog-event-log.service';
import { ServiceCatalogEventType } from '../dto/kafka-event.dto';

describe('ServiceCatalogEventConsumer', () => {
  let consumer: ServiceCatalogEventConsumer;
  let syncService: jest.Mocked<ServiceCatalogSyncService>;
  let eventLogService: jest.Mocked<ServiceCatalogEventLogService>;

  const mockEventLog = {
    id: 'evt-log-123',
    eventId: 'evt_20250117_123456_abc123',
    eventType: 'service.created',
    eventSource: 'PYXIS',
    eventTimestamp: new Date('2025-01-17T10:30:00Z'),
    externalServiceCode: 'PYX_ES_HVAC_00123',
    processingStatus: 'PENDING' as const,
    processingAttempts: 0,
    receivedAt: new Date(),
    processedAt: null,
    lastAttemptAt: null,
    errorMessage: null,
    errorDetails: null,
    payload: {},
    serviceId: null,
  };

  beforeEach(async () => {
    // Set environment variables for testing
    process.env.KAFKA_ENABLED = 'false'; // Disable actual Kafka connection
    process.env.KAFKA_BROKERS = 'localhost:9092';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogEventConsumer,
        {
          provide: ServiceCatalogSyncService,
          useValue: {
            handleServiceCreated: jest.fn(),
            handleServiceUpdated: jest.fn(),
            handleServiceDeprecated: jest.fn(),
          },
        },
        {
          provide: ServiceCatalogEventLogService,
          useValue: {
            findByEventId: jest.fn(),
            create: jest.fn(),
            markAsProcessed: jest.fn(),
            markAsFailed: jest.fn(),
            markAsSkipped: jest.fn(),
          },
        },
      ],
    }).compile();

    consumer = module.get<ServiceCatalogEventConsumer>(ServiceCatalogEventConsumer);
    syncService = module.get(ServiceCatalogSyncService);
    eventLogService = module.get(ServiceCatalogEventLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleMessage', () => {
    it('should process service.created event successfully', async () => {
      const payload = {
        eventId: 'evt_20250117_123456_abc123',
        eventType: 'service.created',
        eventTimestamp: '2025-01-17T10:30:00Z',
        source: 'PYXIS',
        version: '2.0',
        data: {
          externalServiceCode: 'PYX_ES_HVAC_00123',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          type: 'installation',
          category: 'hvac',
          name: { es: 'Instalación AC', en: 'AC Installation' },
          description: { es: 'Descripción', en: 'Description' },
        },
      };

      eventLogService.findByEventId.mockResolvedValue(null);
      eventLogService.create.mockResolvedValue(mockEventLog);
      syncService.handleServiceCreated.mockResolvedValue();
      eventLogService.markAsProcessed.mockResolvedValue();

      // Simulate message handling
      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_20250117_123456_abc123'),
          value: Buffer.from(JSON.stringify(payload)),
        },
      });

      expect(eventLogService.findByEventId).toHaveBeenCalledWith('evt_20250117_123456_abc123');
      expect(eventLogService.create).toHaveBeenCalled();
      expect(syncService.handleServiceCreated).toHaveBeenCalledWith(
        payload.data,
        mockEventLog.id
      );
      expect(eventLogService.markAsProcessed).toHaveBeenCalledWith(mockEventLog.id);
    });

    it('should process service.updated event successfully', async () => {
      const payload = {
        eventId: 'evt_update_123',
        eventType: 'service.updated',
        eventTimestamp: '2025-01-17T11:00:00Z',
        source: 'PYXIS',
        data: {
          externalServiceCode: 'PYX_ES_HVAC_00123',
          countryCode: 'ES',
          businessUnit: 'LM_ES',
          type: 'installation',
          category: 'hvac',
          name: { es: 'Instalación AC Actualizada', en: 'AC Installation Updated' },
          description: { es: 'Nueva descripción', en: 'New description' },
        },
      };

      const updateEventLog = { ...mockEventLog, id: 'evt-log-update', eventId: 'evt_update_123' };

      eventLogService.findByEventId.mockResolvedValue(null);
      eventLogService.create.mockResolvedValue(updateEventLog);
      syncService.handleServiceUpdated.mockResolvedValue();
      eventLogService.markAsProcessed.mockResolvedValue();

      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_update_123'),
          value: Buffer.from(JSON.stringify(payload)),
        },
      });

      expect(syncService.handleServiceUpdated).toHaveBeenCalledWith(
        payload.data,
        updateEventLog.id
      );
      expect(eventLogService.markAsProcessed).toHaveBeenCalled();
    });

    it('should process service.deprecated event successfully', async () => {
      const payload = {
        eventId: 'evt_deprecate_123',
        eventType: 'service.deprecated',
        eventTimestamp: '2025-01-17T12:00:00Z',
        source: 'PYXIS',
        data: {
          externalServiceCode: 'PYX_ES_HVAC_00123',
          reason: 'Service discontinued',
          replacementServiceCode: 'PYX_ES_HVAC_00456',
        },
      };

      const deprecateEventLog = {
        ...mockEventLog,
        id: 'evt-log-deprecate',
        eventId: 'evt_deprecate_123',
      };

      eventLogService.findByEventId.mockResolvedValue(null);
      eventLogService.create.mockResolvedValue(deprecateEventLog);
      syncService.handleServiceDeprecated.mockResolvedValue();
      eventLogService.markAsProcessed.mockResolvedValue();

      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_deprecate_123'),
          value: Buffer.from(JSON.stringify(payload)),
        },
      });

      expect(syncService.handleServiceDeprecated).toHaveBeenCalledWith(
        payload.data,
        deprecateEventLog.id
      );
      expect(eventLogService.markAsProcessed).toHaveBeenCalled();
    });

    it('should skip already processed events (idempotency)', async () => {
      const payload = {
        eventId: 'evt_already_processed',
        eventType: 'service.created',
        eventTimestamp: '2025-01-17T10:30:00Z',
        source: 'PYXIS',
        data: { externalServiceCode: 'PYX_ES_HVAC_00123' },
      };

      const processedEventLog = {
        ...mockEventLog,
        eventId: 'evt_already_processed',
        processingStatus: 'PROCESSED' as const,
        processedAt: new Date(),
      };

      eventLogService.findByEventId.mockResolvedValue(processedEventLog);

      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_already_processed'),
          value: Buffer.from(JSON.stringify(payload)),
        },
      });

      expect(eventLogService.findByEventId).toHaveBeenCalledWith('evt_already_processed');
      expect(eventLogService.create).not.toHaveBeenCalled();
      expect(syncService.handleServiceCreated).not.toHaveBeenCalled();
    });

    it('should skip events in dead letter queue', async () => {
      const payload = {
        eventId: 'evt_dead_letter',
        eventType: 'service.created',
        eventTimestamp: '2025-01-17T10:30:00Z',
        source: 'PYXIS',
        data: { externalServiceCode: 'PYX_ES_HVAC_00123' },
      };

      const deadLetterEventLog = {
        ...mockEventLog,
        eventId: 'evt_dead_letter',
        processingStatus: 'DEAD_LETTER' as const,
        processingAttempts: 3,
      };

      eventLogService.findByEventId.mockResolvedValue(deadLetterEventLog);

      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_dead_letter'),
          value: Buffer.from(JSON.stringify(payload)),
        },
      });

      expect(syncService.handleServiceCreated).not.toHaveBeenCalled();
    });

    it('should handle unknown event types gracefully', async () => {
      const payload = {
        eventId: 'evt_unknown',
        eventType: 'service.unknown_type',
        eventTimestamp: '2025-01-17T10:30:00Z',
        source: 'PYXIS',
        data: { externalServiceCode: 'PYX_ES_HVAC_00123' },
      };

      const unknownEventLog = { ...mockEventLog, id: 'evt-log-unknown', eventId: 'evt_unknown' };

      eventLogService.findByEventId.mockResolvedValue(null);
      eventLogService.create.mockResolvedValue(unknownEventLog);
      eventLogService.markAsSkipped.mockResolvedValue();

      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_unknown'),
          value: Buffer.from(JSON.stringify(payload)),
        },
      });

      expect(eventLogService.markAsSkipped).toHaveBeenCalledWith(
        unknownEventLog.id,
        'Unknown event type: service.unknown_type'
      );
    });

    it('should handle processing errors and mark as failed', async () => {
      const payload = {
        eventId: 'evt_error',
        eventType: 'service.created',
        eventTimestamp: '2025-01-17T10:30:00Z',
        source: 'PYXIS',
        data: { externalServiceCode: 'PYX_ES_HVAC_00123' },
      };

      const errorEventLog = { ...mockEventLog, id: 'evt-log-error', eventId: 'evt_error' };

      eventLogService.findByEventId.mockResolvedValue(null);
      eventLogService.create.mockResolvedValue(errorEventLog);
      syncService.handleServiceCreated.mockRejectedValue(new Error('Database error'));
      eventLogService.markAsFailed.mockResolvedValue();

      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_error'),
          value: Buffer.from(JSON.stringify(payload)),
        },
      });

      expect(eventLogService.markAsFailed).toHaveBeenCalledWith(
        'evt_error',
        expect.objectContaining({ message: 'Database error' })
      );
    });

    it('should handle invalid JSON gracefully', async () => {
      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_invalid_json'),
          value: Buffer.from('invalid json {{{'),
        },
      });

      // Should not throw, should log error and return
      expect(eventLogService.create).not.toHaveBeenCalled();
    });

    it('should handle empty messages gracefully', async () => {
      await (consumer as any).handleMessage({
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('evt_empty'),
          value: null,
        },
      });

      // Should not throw, should log warning and return
      expect(eventLogService.create).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return consumer status', () => {
      const status = consumer.getStatus();

      expect(status).toEqual({
        connected: false, // false because KAFKA_ENABLED=false
        topic: 'service-catalog',
        groupId: 'service-catalog-consumer-group',
      });
    });
  });
});
