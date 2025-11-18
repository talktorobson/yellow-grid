# Service Catalog Sync Architecture

**Version**: 1.0.0
**Last Updated**: 2025-01-17
**Status**: Design Complete
**Owner**: Integration Team

---

## Overview

The Service Catalog Sync system implements **dual-mode synchronization** between external sales systems (Pyxis, Tempo, SAP) and the Yellow Grid FSM platform:

1. **Real-time Event Sync**: Kafka event stream for immediate updates
2. **Daily Reconciliation**: Flat file comparison for drift detection

**Key Characteristics:**
- **Client-owned catalog**: External systems are source of truth
- **Idempotent processing**: Duplicate events handled gracefully
- **Automatic drift correction**: Daily reconciliation fixes inconsistencies
- **Manual review workflow**: Breaking changes require operator approval

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│         EXTERNAL SALES SYSTEM (Pyxis/Tempo/SAP)             │
│                                                              │
│  Service Catalog Master Database                            │
└────────┬──────────────────────────────────┬────────────────┘
         │                                   │
         │ (Real-time)                      │ (Daily 3 AM)
         │ Kafka Events                     │ Flat File Export
         ▼                                   ▼
┌──────────────────────┐         ┌─────────────────────────┐
│ Kafka Topic:         │         │ GCS Bucket:             │
│ service-catalog      │         │ services_ES_YYYYMMDD.csv│
│                      │         │ services_FR_YYYYMMDD.csv│
│ Events:              │         └──────────┬──────────────┘
│ - service.created    │                    │
│ - service.updated    │                    │
│ - service.deprecated │                    │
└──────────┬───────────┘                    │
           │                                 │
           ▼                                 ▼
┌───────────────────────┐      ┌────────────────────────────┐
│ Kafka Event Consumer  │      │ Reconciliation Job         │
│ (Real-time)           │      │ (Scheduled Cron)           │
│                       │      │                            │
│ 1. Receive event      │      │ 1. Download CSV from GCS   │
│ 2. Log to DB          │      │ 2. Parse services          │
│ 3. Check idempotency  │      │ 3. Compare checksums       │
│ 4. Process update     │      │ 4. Detect drift            │
│ 5. Emit internal event│      │ 5. Auto-correct or alert   │
└───────────┬───────────┘      └────────────┬───────────────┘
            │                                │
            └────────────┬───────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ service_catalog table         │
         │ (FSM Source of Truth)         │
         └───────────────────────────────┘
```

---

## 1. Real-Time Event Sync

### 1.1 Kafka Event Schema

**Topic**: `service-catalog`
**Partition Key**: `externalServiceCode`
**Retention**: 7 days

**Event Types:**
- `service.created`
- `service.updated`
- `service.deprecated`

**Event Payload Example:**

```json
{
  "eventId": "evt_20250117_123456_abc123",
  "eventType": "service.created",
  "eventTimestamp": "2025-01-17T10:30:00Z",
  "source": "PYXIS",
  "version": "2.0",
  "data": {
    "externalServiceCode": "PYX_ES_HVAC_00123",
    "countryCode": "ES",
    "businessUnit": "LM_ES",
    "type": "installation",
    "category": "hvac",
    "name": {
      "es": "Instalación de Aire Acondicionado",
      "en": "Air Conditioning Installation"
    },
    "description": {
      "es": "Instalación completa de sistema de aire acondicionado residencial",
      "en": "Complete residential air conditioning system installation"
    },
    "shortDescription": {
      "es": "Instalación AC",
      "en": "AC Installation"
    },
    "scopeIncluded": [
      "Removal of old unit",
      "Installation of new unit",
      "System testing",
      "Customer walkthrough"
    ],
    "scopeExcluded": [
      "Wall modifications",
      "Electrical panel upgrades",
      "Ductwork installation"
    ],
    "worksiteRequirements": [
      "Electrical outlet within 2 meters",
      "Wall bracket pre-installed",
      "Clear access to installation location"
    ],
    "productPrerequisites": [
      "AC unit delivered to site",
      "Installation kit included",
      "All accessories present"
    ],
    "contractType": "pre_service",
    "estimatedDuration": 180,
    "complexity": "MEDIUM",
    "requiresTechnicalVisit": true,
    "effectiveFrom": "2025-02-01T00:00:00Z",
    "effectiveTo": null
  }
}
```

### 1.2 Event Consumer Implementation

```typescript
// src/modules/service-catalog/consumers/service-catalog.consumer.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ServiceCatalogSyncService } from '../services/service-catalog-sync.service';
import { ServiceCatalogEventLogService } from '../services/service-catalog-event-log.service';

@Injectable()
export class ServiceCatalogEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceCatalogEventConsumer.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private readonly syncService: ServiceCatalogSyncService,
    private readonly eventLogService: ServiceCatalogEventLogService,
  ) {
    this.kafka = new Kafka({
      clientId: 'yellow-grid-fsm',
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL_MECHANISM ? {
        mechanism: process.env.KAFKA_SASL_MECHANISM as any,
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
      } : undefined,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'service-catalog-consumer-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: 'service-catalog',
        fromBeginning: false, // Only new messages
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('✅ Service Catalog Event Consumer started successfully');
    } catch (error) {
      this.logger.error('❌ Failed to start Service Catalog Event Consumer', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.log('Service Catalog Event Consumer disconnected');
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload) {
    const eventId = message.key?.toString() || `unknown_${Date.now()}`;
    const rawPayload = message.value?.toString();

    if (!rawPayload) {
      this.logger.warn(`Empty message received: ${eventId}`);
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      this.logger.error(`Invalid JSON in message ${eventId}`, error);
      return;
    }

    this.logger.log(
      `📩 Received event: ${payload.eventType} | Service: ${payload.data?.externalServiceCode} | Event ID: ${eventId}`
    );

    try {
      // Step 1: Check idempotency (already processed?)
      const existingLog = await this.eventLogService.findByEventId(eventId);

      if (existingLog) {
        this.logger.warn(`⚠️  Event ${eventId} already processed, skipping`);
        return;
      }

      // Step 2: Log event to database
      const eventLog = await this.eventLogService.create({
        eventId,
        eventType: payload.eventType,
        eventSource: payload.source || 'UNKNOWN',
        eventTimestamp: new Date(payload.eventTimestamp),
        externalServiceCode: payload.data.externalServiceCode,
        payload,
        processingStatus: 'PENDING',
      });

      // Step 3: Process based on event type
      switch (payload.eventType) {
        case 'service.created':
          await this.syncService.handleServiceCreated(payload.data, eventLog.id);
          break;

        case 'service.updated':
          await this.syncService.handleServiceUpdated(payload.data, eventLog.id);
          break;

        case 'service.deprecated':
          await this.syncService.handleServiceDeprecated(payload.data, eventLog.id);
          break;

        default:
          this.logger.warn(`❓ Unknown event type: ${payload.eventType}`);
          await this.eventLogService.markAsSkipped(eventLog.id, 'Unknown event type');
          return;
      }

      // Step 4: Mark as processed
      await this.eventLogService.markAsProcessed(eventLog.id);
      this.logger.log(`✅ Event ${eventId} processed successfully`);

    } catch (error) {
      this.logger.error(`❌ Error processing event ${eventId}:`, error);

      // Update event log with error
      await this.eventLogService.markAsFailed(eventId, error);

      // TODO: Implement retry logic with exponential backoff
      // TODO: Dead letter queue for permanently failed events
      // TODO: Alert operators on critical failures
    }
  }
}
```

### 1.3 Sync Service

```typescript
// src/modules/service-catalog/services/service-catalog-sync.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ServiceStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ServiceCatalogSyncService {
  private readonly logger = new Logger(ServiceCatalogSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleServiceCreated(data: any, eventLogId: string): Promise<void> {
    this.logger.log(`Creating service: ${data.externalServiceCode}`);

    // Check if already exists (race condition protection)
    const existing = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (existing) {
      this.logger.warn(
        `Service ${data.externalServiceCode} already exists, treating as update`
      );
      return this.handleServiceUpdated(data, eventLogId);
    }

    // Create service
    const service = await this.prisma.serviceCatalog.create({
      data: {
        externalServiceCode: data.externalServiceCode,
        externalSystemSource: data.source || 'PYXIS',
        fsmServiceCode: this.generateFsmCode(data),

        serviceType: this.mapServiceType(data.type),
        serviceCategory: this.mapServiceCategory(data.category),

        nameI18n: data.name,
        descriptionI18n: data.description,
        shortDescriptionI18n: data.shortDescription,

        scopeIncluded: data.scopeIncluded,
        scopeExcluded: data.scopeExcluded,
        worksiteRequirements: data.worksiteRequirements,
        productPrerequisites: data.productPrerequisites,

        contractTemplateId: await this.resolveContractTemplate(
          data.contractType,
          data.countryCode
        ),

        estimatedDurationMinutes: data.estimatedDuration,
        estimatedComplexity: data.complexity,
        requiresTechnicalVisit: data.requiresTechnicalVisit || false,

        countryCode: data.countryCode,
        businessUnit: data.businessUnit,

        status: ServiceStatus.ACTIVE,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,

        lastSyncedAt: new Date(),
        syncVersion: data.version,
        syncChecksum: this.computeChecksum(data),

        createdBy: 'SYNC_JOB',
        updatedBy: 'SYNC_JOB',
      },
    });

    // Update event log with service ID
    await this.prisma.serviceCatalogEventLog.update({
      where: { id: eventLogId },
      data: { serviceId: service.id },
    });

    this.logger.log(`✅ Service created: ${service.fsmServiceCode} (${service.id})`);
  }

  async handleServiceUpdated(data: any, eventLogId: string): Promise<void> {
    this.logger.log(`Updating service: ${data.externalServiceCode}`);

    const existing = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (!existing) {
      this.logger.warn(
        `Service ${data.externalServiceCode} not found, creating new`
      );
      return this.handleServiceCreated(data, eventLogId);
    }

    // Check for breaking changes
    const hasBreakingChanges = this.detectBreakingChanges(existing, data);

    if (hasBreakingChanges) {
      this.logger.warn(
        `⚠️  Breaking changes detected for ${data.externalServiceCode}`
      );
      // TODO: Create pending change record for manual review
    }

    // Update service
    const updated = await this.prisma.serviceCatalog.update({
      where: { id: existing.id },
      data: {
        nameI18n: data.name,
        descriptionI18n: data.description,
        shortDescriptionI18n: data.shortDescription,

        scopeIncluded: data.scopeIncluded,
        scopeExcluded: data.scopeExcluded,
        worksiteRequirements: data.worksiteRequirements,
        productPrerequisites: data.productPrerequisites,

        estimatedDurationMinutes: data.estimatedDuration,
        estimatedComplexity: data.complexity,

        lastSyncedAt: new Date(),
        syncVersion: data.version,
        syncChecksum: this.computeChecksum(data),

        updatedBy: 'SYNC_JOB',
      },
    });

    await this.prisma.serviceCatalogEventLog.update({
      where: { id: eventLogId },
      data: { serviceId: updated.id },
    });

    this.logger.log(`✅ Service updated: ${updated.fsmServiceCode}`);
  }

  async handleServiceDeprecated(data: any, eventLogId: string): Promise<void> {
    this.logger.log(`Deprecating service: ${data.externalServiceCode}`);

    const service = await this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: data.externalServiceCode },
    });

    if (!service) {
      this.logger.error(
        `Cannot deprecate: service ${data.externalServiceCode} not found`
      );
      throw new Error('Service not found');
    }

    // Check active orders count
    const activeOrdersCount = await this.prisma.serviceOrder.count({
      where: {
        serviceId: service.id,
        status: {
          in: ['CREATED', 'SCHEDULED', 'ASSIGNED', 'DISPATCHED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeOrdersCount > 0) {
      this.logger.warn(
        `⚠️  Service ${data.externalServiceCode} has ${activeOrdersCount} active orders`
      );
      // Don't block deprecation, but log for operator awareness
      // TODO: Send notification to operators
    }

    // Deprecate service
    const deprecated = await this.prisma.serviceCatalog.update({
      where: { id: service.id },
      data: {
        status: ServiceStatus.DEPRECATED,
        effectiveTo: new Date(),
        deprecatedReason: data.reason || 'Deprecated by external system',
        replacementServiceId: data.replacementServiceCode
          ? (await this.findServiceByExternalCode(data.replacementServiceCode))?.id
          : null,

        lastSyncedAt: new Date(),
        updatedBy: 'SYNC_JOB',
      },
    });

    await this.prisma.serviceCatalogEventLog.update({
      where: { id: eventLogId },
      data: { serviceId: deprecated.id },
    });

    this.logger.log(
      `✅ Service deprecated: ${deprecated.fsmServiceCode}, active orders: ${activeOrdersCount}`
    );
  }

  // Helper methods
  private generateFsmCode(data: any): string {
    const category = this.mapServiceCategory(data.category).substring(0, 4).toUpperCase();
    const sequence = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return `${data.countryCode}_${category}_${sequence}`;
  }

  private mapServiceType(clientType: string): string {
    const mapping: Record<string, string> = {
      installation: 'INSTALLATION',
      confirmation_visit: 'CONFIRMATION_TV',
      quotation_visit: 'QUOTATION_TV',
      maintenance: 'MAINTENANCE',
      rework: 'REWORK',
      complex: 'COMPLEX',
    };
    return mapping[clientType] || 'INSTALLATION';
  }

  private mapServiceCategory(clientCategory: string): string {
    const mapping: Record<string, string> = {
      hvac: 'HVAC',
      plumbing: 'PLUMBING',
      electrical: 'ELECTRICAL',
      appliance: 'APPLIANCE_REPAIR',
      kitchen: 'KITCHEN_INSTALLATION',
      bathroom: 'BATHROOM_INSTALLATION',
      flooring: 'FLOORING',
      painting: 'PAINTING',
      maintenance: 'GENERAL_MAINTENANCE',
    };
    return mapping[clientCategory] || 'OTHER';
  }

  private async resolveContractTemplate(
    contractType: string,
    countryCode: string
  ): Promise<string | null> {
    const template = await this.prisma.contractTemplate.findFirst({
      where: {
        contractType: contractType === 'pre_service' ? 'PRE_SERVICE' : 'POST_SERVICE',
        countryCode,
        isActive: true,
        isLatestVersion: true,
      },
    });
    return template?.id || null;
  }

  private computeChecksum(data: any): string {
    const relevantFields = {
      name: data.name,
      description: data.description,
      scopeIncluded: data.scopeIncluded,
      scopeExcluded: data.scopeExcluded,
      requirements: data.worksiteRequirements,
      prerequisites: data.productPrerequisites,
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(relevantFields))
      .digest('hex');
  }

  private detectBreakingChanges(existing: any, incoming: any): boolean {
    // Breaking changes:
    // 1. Scope reduced (items removed from scopeIncluded)
    // 2. Requirements added (new worksiteRequirements)
    // 3. Prerequisites added (new productPrerequisites)

    const existingScopeSet = new Set(existing.scopeIncluded || []);
    const incomingScopeSet = new Set(incoming.scopeIncluded || []);

    // Check if any existing scope items were removed
    for (const item of existingScopeSet) {
      if (!incomingScopeSet.has(item)) {
        return true; // Breaking: scope reduced
      }
    }

    // Simplified check - expand in production
    return false;
  }

  private async findServiceByExternalCode(externalCode: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: { externalServiceCode: externalCode },
    });
  }
}
```

---

## 2. Daily Reconciliation

### 2.1 Flat File Format (CSV)

**File Naming**: `services_{COUNTRY_CODE}_{YYYYMMDD}.csv`
**Example**: `services_ES_20250117.csv`

**CSV Columns:**
```csv
external_service_code,country_code,business_unit,type,category,name_es,name_fr,name_it,name_pl,description_es,scope_included,scope_excluded,worksite_requirements,product_prerequisites,contract_type,estimated_duration,complexity,requires_tv,effective_from,effective_to,version
PYX_ES_HVAC_00123,ES,LM_ES,installation,hvac,"Instalación AC","Installation AC","Installazione AC","Instalacja AC","Descripción completa","[""Remove old unit""]","[""Wall modifications""]","[""Electrical outlet""]","[""AC unit delivered""]",pre_service,180,MEDIUM,true,2025-02-01,,2.0
```

### 2.2 Reconciliation Job

```typescript
// src/modules/service-catalog/jobs/reconciliation.job.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Storage } from '@google-cloud/storage';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import * as crypto from 'crypto';

@Injectable()
export class ServiceCatalogReconciliationJob {
  private readonly logger = new Logger(ServiceCatalogReconciliationJob.name);
  private storage: Storage;
  private bucketName: string;

  constructor(private readonly prisma: PrismaService) {
    this.storage = new Storage();  // Uses Workload Identity for authentication
    this.bucketName = process.env.GCS_BUCKET || 'fsm-service-catalog';
  }

  @Cron('0 3 * * *') // Daily at 3 AM
  async runReconciliation() {
    this.logger.log('🔄 Starting daily service catalog reconciliation');

    const reconciliation = await this.prisma.serviceCatalogReconciliation.create({
      data: {
        startedAt: new Date(),
        status: 'IN_PROGRESS',
        sourceSystem: 'PYXIS',
        triggeredBy: 'SCHEDULED_JOB',
        servicesFetched: 0,
        servicesMatched: 0,
        servicesDrifted: 0,
        servicesCreated: 0,
        servicesUpdated: 0,
        servicesFailed: 0,
      },
    });

    try {
      const countries = ['ES', 'FR', 'IT', 'PL'];
      let totalStats = {
        fetched: 0,
        matched: 0,
        drifted: 0,
        updated: 0,
        failed: 0,
      };

      for (const country of countries) {
        const stats = await this.reconcileCountry(country);
        totalStats.fetched += stats.fetched;
        totalStats.matched += stats.matched;
        totalStats.drifted += stats.drifted;
        totalStats.updated += stats.updated;
        totalStats.failed += stats.failed;
      }

      // Mark as complete
      await this.prisma.serviceCatalogReconciliation.update({
        where: { id: reconciliation.id },
        data: {
          completedAt: new Date(),
          status: totalStats.drifted > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS',
          servicesFetched: totalStats.fetched,
          servicesMatched: totalStats.matched,
          servicesDrifted: totalStats.drifted,
          servicesUpdated: totalStats.updated,
          servicesFailed: totalStats.failed,
        },
      });

      this.logger.log(
        `✅ Reconciliation complete: ${totalStats.matched} matched, ${totalStats.drifted} drifted, ${totalStats.updated} updated`
      );

      // Alert if high drift rate
      const driftPercentage = (totalStats.drifted / totalStats.matched) * 100;
      if (driftPercentage > 5) {
        this.logger.warn(
          `⚠️  High drift rate detected: ${driftPercentage.toFixed(2)}%`
        );
        // TODO: Send alert to operators
      }
    } catch (error) {
      this.logger.error('❌ Reconciliation failed:', error);

      await this.prisma.serviceCatalogReconciliation.update({
        where: { id: reconciliation.id },
        data: {
          completedAt: new Date(),
          status: 'FAILED',
          errorMessage: error.message,
          errorDetails: { stack: error.stack },
        },
      });
    }
  }

  private async reconcileCountry(countryCode: string) {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileKey = `service-catalog/services_${countryCode}_${today}.csv`;

    this.logger.log(`📥 Downloading ${fileKey}`);

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileKey);

    const [contents] = await file.download();
    const services = await this.parseCSV(Readable.from(contents));

    let stats = { fetched: 0, matched: 0, drifted: 0, updated: 0, failed: 0 };
    stats.fetched = services.length;

    for (const svc of services) {
      try {
        const existing = await this.prisma.serviceCatalog.findUnique({
          where: { externalServiceCode: svc.external_service_code },
        });

        if (!existing) {
          this.logger.warn(
            `Service ${svc.external_service_code} exists in file but not in DB`
          );
          stats.failed++;
          continue;
        }

        stats.matched++;

        // Compute checksum from file data
        const fileChecksum = this.computeChecksumFromCSV(svc);

        if (existing.syncChecksum !== fileChecksum) {
          this.logger.warn(
            `🔍 Checksum mismatch for ${svc.external_service_code}, correcting`
          );
          stats.drifted++;

          // Update from file (file is source of truth)
          await this.prisma.serviceCatalog.update({
            where: { id: existing.id },
            data: {
              nameI18n: this.parseI18nNames(svc),
              descriptionI18n: this.parseI18nDescriptions(svc),
              syncChecksum: fileChecksum,
              lastSyncedAt: new Date(),
              updatedBy: 'RECONCILIATION_JOB',
            },
          });
          stats.updated++;
        }
      } catch (error) {
        this.logger.error(
          `Error reconciling service ${svc.external_service_code}:`,
          error
        );
        stats.failed++;
      }
    }

    return stats;
  }

  private parseCSV(stream: Readable): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private computeChecksumFromCSV(svc: any): string {
    const relevantFields = {
      name: this.parseI18nNames(svc),
      description: this.parseI18nDescriptions(svc),
      scopeIncluded: this.parseJsonArray(svc.scope_included),
      scopeExcluded: this.parseJsonArray(svc.scope_excluded),
      requirements: this.parseJsonArray(svc.worksite_requirements),
      prerequisites: this.parseJsonArray(svc.product_prerequisites),
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(relevantFields))
      .digest('hex');
  }

  private parseI18nNames(svc: any) {
    return {
      es: svc.name_es,
      fr: svc.name_fr,
      it: svc.name_it,
      pl: svc.name_pl,
    };
  }

  private parseI18nDescriptions(svc: any) {
    return {
      es: svc.description_es,
      fr: svc.description_fr || '',
      it: svc.description_it || '',
      pl: svc.description_pl || '',
    };
  }

  private parseJsonArray(str: string): string[] {
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  }
}
```

---

## 3. Error Handling & Retry Logic

### 3.1 Retry Strategy

**Event Processing Failures:**
- Max retries: 3 attempts
- Backoff: Exponential (2s, 4s, 8s)
- Dead Letter Queue: After 3 failures

```typescript
class EventRetryService {
  async retryFailedEvents() {
    const failedEvents = await this.eventLogRepository.findRetryable(100);

    for (const event of failedEvents) {
      if (event.processingAttempts >= 3) {
        // Move to dead letter queue
        await this.moveToDeadLetterQueue(event);
        continue;
      }

      // Exponential backoff
      const backoffMs = Math.pow(2, event.processingAttempts) * 1000;
      await this.sleep(backoffMs);

      try {
        await this.syncService.reprocessEvent(event);
        await this.eventLogRepository.markAsProcessed(event.id);
      } catch (error) {
        await this.eventLogRepository.incrementAttempts(event.id, error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 3.2 Monitoring & Alerts

**Metrics to Track:**
- Event processing latency (p50, p95, p99)
- Failed event rate (%)
- Consumer lag (number of unprocessed messages)
- Reconciliation drift rate (%)
- Checksum mismatch count

**Alerting Rules:**
```yaml
alerts:
  - name: high_event_failure_rate
    condition: failed_events_percent > 5
    severity: WARNING
    notification: slack, email

  - name: consumer_lag_high
    condition: consumer_lag > 1000
    severity: CRITICAL
    notification: slack, pagerduty

  - name: reconciliation_high_drift
    condition: drift_percentage > 10
    severity: WARNING
    notification: slack, email

  - name: reconciliation_failed
    condition: reconciliation_status == FAILED
    severity: CRITICAL
    notification: slack, email, pagerduty
```

---

## 4. Operational Runbooks

### 4.1 Event Consumer Down

**Symptoms:**
- Consumer lag increasing
- No new events processed
- Kafka consumer group shows no active members

**Resolution:**
1. Check application logs for crash errors
2. Verify Kafka connectivity (`telnet <broker> 9092`)
3. Check consumer group status: `kafka-consumer-groups --describe --group service-catalog-consumer-group`
4. Restart application pod: `kubectl rollout restart deployment/fsm-backend`
5. Monitor lag recovery

### 4.2 High Drift Rate

**Symptoms:**
- Reconciliation shows >10% drift
- Many checksum mismatches

**Resolution:**
1. Check if external system had bulk update
2. Review reconciliation logs for patterns
3. Verify Kafka events were processed (check event_log table)
4. If Kafka consumer was down, manually trigger reconciliation: `POST /api/v1/admin/service-catalog/reconcile`

### 4.3 Breaking Change Detected

**Symptoms:**
- Event log shows breaking change flag
- Manual review required notification

**Resolution:**
1. Open admin UI: `/admin/service-catalog/pending-changes`
2. Review proposed changes
3. Check impact (active orders count)
4. Approve or reject change
5. If rejected, contact external system team

---

## Document Control

- **Version**: 1.0.0
- **Last Updated**: 2025-01-17
- **Owner**: Integration Team
- **Review Cycle**: Quarterly
- **Related Documents**:
  - `/product-docs/domain/11-service-provider-referential.md`
  - `/product-docs/api/10-service-catalog-api.md`
  - `/product-docs/infrastructure/03-kafka-architecture.md`
