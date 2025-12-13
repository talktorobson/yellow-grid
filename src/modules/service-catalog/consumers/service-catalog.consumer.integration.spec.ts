import { Test, TestingModule } from '@nestjs/testing';
import { ServiceCatalogEventConsumer } from './service-catalog.consumer';
import { ServiceCatalogSyncService } from '../services/service-catalog-sync.service';
import { ServiceCatalogEventLogService } from '../services/service-catalog-event-log.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EachMessagePayload } from 'kafkajs';
import { ServiceCatalogEventType } from '../dto/kafka-event.dto';
import { EventProcessingStatus } from '@prisma/client';
import { AppModule } from '@/app.module';

/**
 * Integration tests for ServiceCatalogEventConsumer
 * Tests event processing with real database operations
 */
describe('ServiceCatalogEventConsumer (Integration)', () => {
  let consumer: ServiceCatalogEventConsumer;
  let syncService: ServiceCatalogSyncService;
  let eventLogService: ServiceCatalogEventLogService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        ServiceCatalogEventConsumer,
        ServiceCatalogSyncService,
        ServiceCatalogEventLogService,
      ],
    }).compile();

    consumer = module.get<ServiceCatalogEventConsumer>(ServiceCatalogEventConsumer);
    syncService = module.get<ServiceCatalogSyncService>(ServiceCatalogSyncService);
    eventLogService = module.get<ServiceCatalogEventLogService>(ServiceCatalogEventLogService);
    prisma = module.get<PrismaService>(PrismaService);

    // Cleanup leftovers from previous runs
    await prisma.serviceCatalog.deleteMany({
      where: {
        externalServiceCode: {
          startsWith: 'KAFKA_TEST_',
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup: delete test data
    await prisma.serviceCatalog.deleteMany({
      where: {
        externalServiceCode: {
          startsWith: 'KAFKA_TEST_',
        },
      },
    });
    await prisma.serviceCatalogEventLog.deleteMany({
      where: {
        eventId: {
          startsWith: 'test-event-',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('handleMessage - service.created', () => {
    it('should process service.created event successfully', async () => {
      const eventId = `test-event-created-${Date.now()}`;
      const messagePayload: any = {
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from(eventId),
          value: Buffer.from(
            JSON.stringify({
              eventId,
              eventType: ServiceCatalogEventType.SERVICE_CREATED,
              timestamp: new Date().toISOString(),
              source: 'PYXIS',
              data: {
                externalServiceCode: 'KAFKA_TEST_CREATE_001',
                countryCode: 'ES',
                businessUnit: 'LM_ES',
                type: 'INSTALLATION',
                category: 'HVAC',
                name: 'Air Conditioning Installation',
                description: 'Instalación completa de AC',
                scopeIncluded: ['Instalación', 'Pruebas'],
                scopeExcluded: ['Modificaciones estructurales'],
                worksiteRequirements: ['Toma eléctrica'],
                productPrerequisites: ['Unidad AC entregada'],
                estimatedDuration: 180,
                requiresPreServiceContract: true,
                requiresPostServiceWCF: true,
                contractTemplateCode: 'tpl-123',
              },
            }),
          ),
          timestamp: Date.now().toString(),
          offset: '0',
          headers: {},
          attributes: 0,
          size: 0,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      // Process the message using the private handleMessage method
      await (consumer as any).handleMessage(messagePayload);

      // Verify event log was created
      const eventLog = await prisma.serviceCatalogEventLog.findUnique({
        where: { eventId },
      });

      expect(eventLog).not.toBeNull();
      expect(eventLog!.eventType).toBe(ServiceCatalogEventType.SERVICE_CREATED);
      expect(eventLog!.processingStatus).toBe(EventProcessingStatus.COMPLETED);
      expect(eventLog!.externalSource).toBe('PYXIS');

      // Verify service was created
      const service = await prisma.serviceCatalog.findUnique({
        where: { externalServiceCode: 'KAFKA_TEST_CREATE_001' },
      });

      expect(service).not.toBeNull();
      expect(service!.name).toBe('Air Conditioning Installation'); // English fallback
      expect(service!.countryCode).toBe('ES');
      expect(service!.estimatedDurationMinutes).toBe(180);
      expect(service!.scopeIncluded).toEqual(['Instalación', 'Pruebas']);
    });

    it('should be idempotent - skip duplicate event', async () => {
      const eventId = `test-event-duplicate-${Date.now()}`;

      // First event
      const messagePayload: any = {
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from(eventId),
          value: Buffer.from(
            JSON.stringify({
              eventId,
              eventType: ServiceCatalogEventType.SERVICE_CREATED,
              timestamp: new Date().toISOString(),
              source: 'PYXIS',
              data: {
                externalServiceCode: 'KAFKA_TEST_DUPLICATE_001',
                countryCode: 'FR',
                businessUnit: 'LM_FR',
                type: 'MAINTENANCE',
                category: 'PLUMBING',
                name: 'Plumbing Maintenance',
                estimatedDurationMinutes: 90,
                scopeIncluded: [],
                scopeExcluded: [],
                worksiteRequirements: [],
                productPrerequisites: [],
                requiresPreServiceContract: false,
                requiresPostServiceWCF: false,
              },
            }),
          ),
          timestamp: Date.now().toString(),
          offset: '0',
          headers: {},
          attributes: 0,
          size: 0,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      // Process first time
      await (consumer as any).handleMessage(messagePayload);

      // Verify service created
      const serviceCount1 = await prisma.serviceCatalog.count({
        where: { externalServiceCode: 'KAFKA_TEST_DUPLICATE_001' },
      });
      expect(serviceCount1).toBe(1);

      // Process second time (same event ID)
      await (consumer as any).handleMessage(messagePayload);

      // Verify no duplicate service created
      const serviceCount2 = await prisma.serviceCatalog.count({
        where: { externalServiceCode: 'KAFKA_TEST_DUPLICATE_001' },
      });
      expect(serviceCount2).toBe(1); // Still only 1

      // Verify event log shows only one completed event
      const eventLogs = await prisma.serviceCatalogEventLog.findMany({
        where: { eventId },
      });
      expect(eventLogs.length).toBe(1);
      expect(eventLogs[0].processingStatus).toBe(EventProcessingStatus.COMPLETED);
    });
  });

  describe('handleMessage - service.updated', () => {
    let existingServiceId: string;

    beforeAll(async () => {
      // Cleanup
      await prisma.serviceCatalog.deleteMany({
        where: {
          OR: [
            { externalServiceCode: 'KAFKA_TEST_UPDATE_001' },
            { fsmServiceCode: 'FR_ELEC_CONS_001' },
          ],
        },
      });

      // Create a service to update
      const service = await prisma.serviceCatalog.create({
        data: {
          externalServiceCode: 'KAFKA_TEST_UPDATE_001',
          fsmServiceCode: 'FR_ELEC_CONS_001',
          externalSource: 'TEMPO',
          countryCode: 'FR',
          businessUnit: 'LM_FR',
          serviceType: 'INSTALLATION',
          serviceCategory: 'ELECTRICAL',
          name: 'Original Electrical Service',
          estimatedDurationMinutes: 120,
          status: 'ACTIVE',
          syncChecksum: 'original-checksum',
          scopeIncluded: [],
          scopeExcluded: [],
          worksiteRequirements: [],
          productPrerequisites: [],
        },
      });
      existingServiceId = service.id;
    });

    it('should process service.updated event successfully', async () => {
      const eventId = `test-event-updated-${Date.now()}`;
      const messagePayload: any = {
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from(eventId),
          value: Buffer.from(
            JSON.stringify({
              eventId,
              eventType: ServiceCatalogEventType.SERVICE_UPDATED,
              timestamp: new Date().toISOString(),
              source: 'TEMPO',
              data: {
                externalServiceCode: 'KAFKA_TEST_UPDATE_001',
                countryCode: 'FR',
                businessUnit: 'LM_FR',
                type: 'INSTALLATION',
                category: 'ELECTRICAL',
                name: 'Updated Electrical Service',
                description: 'Now includes outdoor work',
                estimatedDuration: 180, // Updated
                scopeIncluded: ['New scope item'], // Updated
                scopeExcluded: [],
                worksiteRequirements: [],
                productPrerequisites: [],
                requiresPreServiceContract: false,
                requiresPostServiceWCF: false,
              },
            }),
          ),
          timestamp: Date.now().toString(),
          offset: '0',
          headers: {},
          attributes: 0,
          size: 0,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await (consumer as any).handleMessage(messagePayload);

      // Verify event log
      const eventLog = await prisma.serviceCatalogEventLog.findUnique({
        where: { eventId },
      });

      expect(eventLog).not.toBeNull();
      expect(eventLog!.processingStatus).toBe(EventProcessingStatus.COMPLETED);

      // Verify service was updated
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: existingServiceId },
      });

      expect(service).not.toBeNull();
      expect(service!.name).toBe('Updated Electrical Service');
      expect(service!.description).toBe('Now includes outdoor work');
      expect(service!.estimatedDurationMinutes).toBe(180);
      expect(service!.scopeIncluded).toEqual(['New scope item']);
    });
  });

  describe('handleMessage - service.deprecated', () => {
    let serviceToDeprecate: string;

    beforeAll(async () => {
      // Create a service to deprecate
      const service = await prisma.serviceCatalog.create({
        data: {
          externalServiceCode: 'KAFKA_TEST_DEPRECATE_001',
          fsmServiceCode: 'IT_KITCHEN_222222',
          externalSource: 'PYXIS',
          countryCode: 'IT',
          businessUnit: 'LM_IT',
          serviceType: 'INSTALLATION',
          serviceCategory: 'KITCHEN',
          name: 'Kitchen Service to Deprecate',
          estimatedDurationMinutes: 240,
          status: 'ACTIVE',
          syncChecksum: 'checksum',
          scopeIncluded: [],
          scopeExcluded: [],
          worksiteRequirements: [],
          productPrerequisites: [],
        },
      });
      serviceToDeprecate = service.id;
    });

    it('should process service.deprecated event successfully', async () => {
      const eventId = `test-event-deprecated-${Date.now()}`;
      const messagePayload: any = {
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from(eventId),
          value: Buffer.from(
            JSON.stringify({
              eventId,
              eventType: ServiceCatalogEventType.SERVICE_DEPRECATED,
              timestamp: new Date().toISOString(),
              source: 'PYXIS',
              data: {
                externalServiceCode: 'KAFKA_TEST_DEPRECATE_001',
                countryCode: 'IT',
                businessUnit: 'LM_IT',
                type: 'INSTALLATION',
                category: 'KITCHEN',
                name: 'Kitchen Service to Deprecate',
                estimatedDurationMinutes: 240,
                scopeIncluded: [],
                scopeExcluded: [],
                worksiteRequirements: [],
                productPrerequisites: [],
                requiresPreServiceContract: false,
                requiresPostServiceWCF: false,
              },
            }),
          ),
          timestamp: Date.now().toString(),
          offset: '0',
          headers: {},
          attributes: 0,
          size: 0,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await (consumer as any).handleMessage(messagePayload);

      // Verify event log
      const eventLog = await prisma.serviceCatalogEventLog.findUnique({
        where: { eventId },
      });

      expect(eventLog).not.toBeNull();
      expect(eventLog!.processingStatus).toBe(EventProcessingStatus.COMPLETED);

      // Verify service was deprecated
      const service = await prisma.serviceCatalog.findUnique({
        where: { id: serviceToDeprecate },
      });

      expect(service).not.toBeNull();
      expect(service!.status).toBe('DEPRECATED');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const eventId = `test-event-malformed-${Date.now()}`;
      const messagePayload: any = {
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('MALFORMED'),
          value: Buffer.from('{ invalid json '),
          timestamp: Date.now().toString(),
          offset: '0',
          headers: {},
          attributes: 0,
          size: 0,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      // Should not throw - error should be logged
      await expect((consumer as any).handleMessage(messagePayload)).resolves.not.toThrow();
    });

    it('should handle missing required fields in event', async () => {
      const eventId = `test-event-invalid-${Date.now()}`;
      const messagePayload: any = {
        topic: 'service-catalog',
        partition: 0,
        message: {
          key: Buffer.from('INVALID'),
          value: Buffer.from(
            JSON.stringify({
              eventId,
              eventType: ServiceCatalogEventType.SERVICE_CREATED,
              // Missing 'data' field
            }),
          ),
          timestamp: Date.now().toString(),
          offset: '0',
          headers: {},
          attributes: 0,
          size: 0,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      // Should not throw - validation error should be logged
      await expect((consumer as any).handleMessage(messagePayload)).resolves.not.toThrow();
    });

    it('should track failed events and retry', async () => {
      const eventId = `test-event-retry-${Date.now()}`;

      // Create a failed event log
      await prisma.serviceCatalogEventLog.create({
        data: {
          eventId,
          eventType: ServiceCatalogEventType.SERVICE_CREATED,
          externalSource: 'PYXIS',
          payload: '{}',
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: 1,
          errorMessage: 'Test error',
          externalServiceCode: 'TEST_RETRY_001',
        },
      });

      // Find retryable events
      const retryable = await eventLogService.findRetryable(100);

      expect(retryable.length).toBeGreaterThanOrEqual(1);
      expect(retryable.some((e) => e.eventId === eventId)).toBe(true);
    });

    it('should move to dead letter queue after max retries', async () => {
      const eventId = `test-event-dlq-${Date.now()}`;

      // Create an event with max retries
      await prisma.serviceCatalogEventLog.create({
        data: {
          eventId,
          eventType: ServiceCatalogEventType.SERVICE_CREATED,
          externalSource: 'PYXIS',
          payload: '{}',
          processingStatus: EventProcessingStatus.FAILED,
          retryCount: 3, // Max retries
          errorMessage: 'Persistent error',
          externalServiceCode: 'TEST_DLQ_001',
        },
      });

      // Attempt to mark as failed (should move to DLQ)
      await eventLogService.markAsFailed(eventId, new Error('Still failing'));

      const eventLog = await prisma.serviceCatalogEventLog.findUnique({
        where: { eventId },
      });

      expect(eventLog!.processingStatus).toBe(EventProcessingStatus.DEAD_LETTER);
    });
  });

  describe('Event statistics', () => {
    beforeAll(async () => {
      // Create some event logs for statistics
      const baseTime = new Date();
      await prisma.serviceCatalogEventLog.createMany({
        data: [
          {
            eventId: `stats-event-1-${Date.now()}`,
            eventType: ServiceCatalogEventType.SERVICE_CREATED,
            externalSource: 'PYXIS',
            payload: '{}',
            processingStatus: EventProcessingStatus.COMPLETED,
            retryCount: 0,
            processedAt: baseTime,
            externalServiceCode: 'STATS_001',
          },
          {
            eventId: `stats-event-2-${Date.now()}`,
            eventType: ServiceCatalogEventType.SERVICE_UPDATED,
            externalSource: 'TEMPO',
            payload: '{}',
            processingStatus: EventProcessingStatus.COMPLETED,
            retryCount: 0,
            processedAt: baseTime,
            externalServiceCode: 'STATS_002',
          },
          {
            eventId: `stats-event-3-${Date.now()}`,
            eventType: ServiceCatalogEventType.SERVICE_CREATED,
            externalSource: 'PYXIS',
            payload: '{}',
            processingStatus: EventProcessingStatus.FAILED,
            retryCount: 1,
            errorMessage: 'Test error',
            externalServiceCode: 'STATS_003',
          },
        ],
      });
    });

    it('should return event processing statistics', async () => {
      const stats = await eventLogService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.completed).toBeGreaterThanOrEqual(2);
      expect(stats.failed).toBeGreaterThanOrEqual(1);
    });

    it('should return statistics since specific date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const stats = await eventLogService.getStatistics(yesterday);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(3);
    });
  });
});
