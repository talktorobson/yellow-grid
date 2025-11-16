# Sales System Adapters

## Purpose

This document specifies the multi-sales-system integration architecture for the AHS Field Service Execution Platform, including adapter patterns, data transformation rules, Kafka integration, monitoring, and implementation guidelines for normalizing orders from heterogeneous sales systems (Pyxis, Tempo, SAP) into the sales-system-agnostic FSM domain model.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Sales Systems](#sales-systems)
4. [Adapter Pattern](#adapter-pattern)
5. [Data Transformation](#data-transformation)
6. [Kafka Integration](#kafka-integration)
7. [Error Handling & Retry Logic](#error-handling--retry-logic)
8. [Monitoring & Observability](#monitoring--observability)
9. [Implementation Guide](#implementation-guide)
10. [Testing Strategy](#testing-strategy)

---

## Overview

### Multi-Sales-System Challenge

The AHS Field Service Execution Platform must integrate with multiple sales systems across different countries and business units:

- **Pyxis**: Primary sales system for installation services
- **Tempo**: Service request system for maintenance and repairs
- **SAP**: Enterprise resource planning system (future integration)
- **Custom**: Country-specific or BU-specific sales systems

Each sales system has:
- Different data models and field names
- Different API protocols (REST, Kafka, SOAP)
- Different product codes and service type mappings
- Different customer data structures
- Different business rule validations

### Solution: Adapter Pattern with Normalization Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    SALES SYSTEMS                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Pyxis   │    │  Tempo   │    │   SAP    │              │
│  │ (Kafka)  │    │ (Kafka)  │    │  (REST)  │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                      │
└───────┼───────────────┼───────────────┼──────────────────────┘
        │               │               │
┌───────▼───────────────▼───────────────▼──────────────────────┐
│             INTEGRATION ADAPTERS SERVICE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pyxis      │  │    Tempo     │  │     SAP      │      │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                  │
│                  ┌─────────▼────────┐                        │
│                  │ Adapter Registry │                        │
│                  │  (Dynamic Route) │                        │
│                  └─────────┬────────┘                        │
│                            │                                  │
│                  ┌─────────▼────────┐                        │
│                  │   Normalization  │                        │
│                  │      Engine      │                        │
│                  └─────────┬────────┘                        │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             │ Normalized FSM ServiceOrder
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                FSM DOMAIN SERVICES                             │
│      (Sales-System-Agnostic Core Business Logic)              │
│                                                                │
│  Orchestration → Scheduling → Assignment → Execution          │
└────────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. Sales-System-Agnostic Core

**The FSM core domain MUST remain completely independent of sales systems.**

- No Pyxis/Tempo/SAP-specific logic in Orchestration, Scheduling, Assignment, or Execution services
- No external order IDs in core domain models (only FSM UUIDs)
- No sales-channel-specific business rules in core services

**Responsibility**: Integration Adapters Service owns all sales-system knowledge.

### 2. Adapter Registry Pattern

Dynamic adapter selection based on source system:

```typescript
class SalesAdapterRegistry {
  private adapters: Map<string, ISalesAdapter>;

  getAdapter(sourceSystem: string): ISalesAdapter {
    const adapter = this.adapters.get(sourceSystem.toLowerCase());
    if (!adapter) {
      throw new AdapterNotFoundError(sourceSystem);
    }
    return adapter;
  }
}
```

### 3. Bidirectional Mapping

Track both external and internal order IDs for status updates:

```typescript
interface ServiceOrderMapping {
  id: UUID;
  salesSystemId: UUID;
  externalOrderId: string;   // Pyxis order ID, Tempo request ID, etc.
  fsmServiceOrderId: UUID;    // Internal FSM ID
  salesChannel: SalesChannel;
  rawPayload: JSON;
  normalizedAt: Date;
}
```

### 4. Idempotent Transformation

Same input → Same output (deterministic normalization):

```typescript
// Pyxis order with ID "PYX-12345" ALWAYS normalizes to same FSM structure
transformOrder(pyxisOrder): ServiceOrder {
  // Deterministic UUID generation from external ID
  const fsmId = deterministicUUID(`pyxis-${pyxisOrder.order_id}`);
  // ... rest of normalization
}
```

### 5. Raw Payload Preservation

Always store original payload for debugging, audit, and potential re-processing:

```sql
CREATE TABLE service_order_mappings (
  id UUID PRIMARY KEY,
  sales_system_id UUID NOT NULL,
  external_order_id VARCHAR(255) NOT NULL,
  fsm_service_order_id UUID NOT NULL,
  sales_channel VARCHAR(50),
  raw_payload JSONB NOT NULL,  -- Original Pyxis/Tempo/SAP data
  normalized_at TIMESTAMP NOT NULL,
  transformation_version VARCHAR(50) NOT NULL,
  UNIQUE(sales_system_id, external_order_id)
);
```

---

## Sales Systems

### Pyxis

**Type**: Installation Order Management System
**Protocol**: Apache Kafka (primary), REST API (fallback)
**Countries**: ES, FR, IT, PL
**Sales Channels**: Store, Web, Call Center

**Inbound Topics**:
- `sales.pyxis.order.created`
- `sales.pyxis.order.updated`
- `sales.pyxis.order.cancelled`

**Outbound Topics**:
- `fsm.order.status_updated`
- `fsm.order.assigned`
- `fsm.order.scheduled`
- `fsm.order.completed`
- `fsm.tv.outcome_recorded`
- `fsm.tv.modifications_required`

**Payload Structure**:

```json
{
  "order_id": "PYX-FR-20250116-001",
  "created_at": "2025-01-16T10:00:00Z",
  "channel": "STORE",
  "store": {
    "store_id": "LM-FR-PARIS-001",
    "country_code": "FR",
    "business_unit": "LEROY_MERLIN"
  },
  "customer": {
    "customer_id": "CUST-FR-123456",
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean.dupont@example.fr",
    "phone": "+33612345678"
  },
  "delivery_address": {
    "street": "123 Rue de Rivoli",
    "city": "Paris",
    "postal_code": "75001",
    "country_code": "FR"
  },
  "line_items": [
    {
      "line_number": 1,
      "product_code": "PROD-FR-INSTALL-KITCHEN",
      "product_name": "Kitchen Installation Service",
      "quantity": 1,
      "service_code": "INSTALL_KITCHEN",
      "estimated_duration_minutes": 240
    }
  ],
  "total_amount": {
    "value": 299.99,
    "currency": "EUR"
  },
  "delivery_date": "2025-01-20"
}
```

### Tempo

**Type**: Service Request Management System
**Protocol**: Apache Kafka (primary), REST API (fallback)
**Countries**: ES, IT
**Sales Channels**: Web, Mobile, Partner

**Inbound Topics**:
- `sales.tempo.service.requested`
- `sales.tempo.service.updated`
- `sales.tempo.service.cancelled`

**Outbound Topics**:
- `fsm.service.status_updated`
- `fsm.service.completed`

**Payload Structure**:

```json
{
  "request_id": "TEMPO-ES-20250116-001",
  "request_type": "MAINTENANCE",
  "created_timestamp": "2025-01-16T10:00:00Z",
  "origin_channel": "WEB",
  "country": "ES",
  "business_unit": "BRICO_DEPOT",
  "client": {
    "client_ref": "CLI-ES-789",
    "full_name": "María García",
    "contact_email": "maria.garcia@example.es",
    "contact_phone": "+34912345678"
  },
  "service_address": {
    "address_line_1": "Calle Mayor 10",
    "city_name": "Madrid",
    "zip_code": "28013",
    "country_iso": "ES"
  },
  "service_details": {
    "service_category": "PLUMBING_REPAIR",
    "description": "Leaking faucet repair",
    "urgency": "STANDARD"
  },
  "estimated_cost": {
    "amount": 85.00,
    "currency_code": "EUR"
  }
}
```

### SAP (Future)

**Type**: Enterprise Resource Planning
**Protocol**: REST API with OAuth 2.0
**Countries**: All (enterprise-level integration)
**Sales Channels**: All

**Payload Structure**: TBD (enterprise SAP order structure)

---

## Adapter Pattern

### ISalesAdapter Interface

```typescript
export interface ISalesAdapter {
  /**
   * Transform external order payload to FSM ServiceOrder domain model
   * MUST be idempotent (same input → same output)
   */
  transformOrder(externalOrder: any): Promise<ServiceOrder>;

  /**
   * Send FSM service order status update back to sales system
   */
  sendOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<void>;

  /**
   * Send cancellation request to sales system
   */
  requestCancellation(orderId: string, reason: string): Promise<void>;

  /**
   * Send Technical Visit outcome and modifications to sales system
   * Used for repricing when outcome is YES_BUT
   */
  sendTVModifications(
    orderId: string,
    outcome: 'YES' | 'YES_BUT' | 'NO',
    modifications: Modification[]
  ): Promise<void>;

  /**
   * Validate external payload before transformation
   * Returns validation errors if any
   */
  validatePayload(payload: any): ValidationResult;
}
```

### Pyxis Adapter Implementation

```typescript
@Injectable()
export class PyxisAdapter implements ISalesAdapter {
  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async transformOrder(pyxisOrder: PyxisOrderPayload): Promise<ServiceOrder> {
    this.logger.log(`Transforming Pyxis order: ${pyxisOrder.order_id}`);

    // Validate payload first
    const validation = this.validatePayload(pyxisOrder);
    if (!validation.isValid) {
      throw new PayloadValidationError(validation.errors);
    }

    // Map Pyxis structure to FSM domain model
    const serviceOrder: ServiceOrder = {
      id: this.generateDeterministicId('pyxis', pyxisOrder.order_id),
      sourceSystem: 'pyxis',
      externalOrderId: pyxisOrder.order_id,
      salesChannel: this.mapSalesChannel(pyxisOrder.channel),

      customer: {
        id: pyxisOrder.customer.customer_id,
        name: `${pyxisOrder.customer.first_name} ${pyxisOrder.customer.last_name}`,
        email: pyxisOrder.customer.email,
        phone: pyxisOrder.customer.phone,
      },

      products: pyxisOrder.line_items.map(item => ({
        productId: item.product_code,
        name: item.product_name,
        quantity: item.quantity,
        serviceType: this.mapServiceType(item.service_code),
        estimatedDurationMinutes: item.estimated_duration_minutes,
      })),

      address: {
        street: pyxisOrder.delivery_address.street,
        city: pyxisOrder.delivery_address.city,
        postalCode: pyxisOrder.delivery_address.postal_code,
        country: pyxisOrder.delivery_address.country_code,
      },

      countryCode: pyxisOrder.store.country_code,
      buCode: pyxisOrder.store.business_unit,
      storeId: pyxisOrder.store.store_id,

      amount: {
        value: pyxisOrder.total_amount.value,
        currency: pyxisOrder.total_amount.currency,
      },

      deliveryDate: pyxisOrder.delivery_date
        ? new Date(pyxisOrder.delivery_date)
        : null,

      rawPayload: JSON.stringify(pyxisOrder),
      createdAt: new Date(pyxisOrder.created_at),
      updatedAt: new Date(),
    };

    this.logger.log(`Pyxis order ${pyxisOrder.order_id} normalized to FSM ID: ${serviceOrder.id}`);

    return serviceOrder;
  }

  async sendOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<void> {
    this.logger.log(`Sending status update to Pyxis for order: ${orderId}, status: ${status}`);

    const pyxisStatus = this.mapStatusToPyxis(status);

    await this.kafkaProducer.send({
      topic: 'fsm.order.status_updated',
      key: orderId,
      value: {
        order_id: orderId,
        status: pyxisStatus,
        status_updated_at: new Date().toISOString(),
        source_system: 'fsm',
      },
    });

    this.logger.log(`Status update sent to Pyxis for order: ${orderId}`);
  }

  async requestCancellation(orderId: string, reason: string): Promise<void> {
    this.logger.log(`Requesting cancellation in Pyxis for order: ${orderId}`);

    await this.kafkaProducer.send({
      topic: 'fsm.order.cancelled',
      key: orderId,
      value: {
        order_id: orderId,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        source_system: 'fsm',
      },
    });
  }

  async sendTVModifications(
    orderId: string,
    outcome: 'YES' | 'YES_BUT' | 'NO',
    modifications: Modification[]
  ): Promise<void> {
    this.logger.log(`Sending TV outcome to Pyxis: ${orderId}, outcome: ${outcome}`);

    await this.kafkaProducer.send({
      topic: 'fsm.tv.outcome_recorded',
      key: orderId,
      value: {
        order_id: orderId,
        tv_outcome: outcome,
        modifications: modifications.map(mod => ({
          description: mod.description,
          requires_repricing: mod.requiresRepricing,
          extra_duration_minutes: mod.extraDurationMinutes,
        })),
        recorded_at: new Date().toISOString(),
      },
    });
  }

  validatePayload(payload: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!payload.order_id) errors.push('Missing order_id');
    if (!payload.customer) errors.push('Missing customer');
    if (!payload.delivery_address) errors.push('Missing delivery_address');
    if (!payload.line_items || payload.line_items.length === 0) {
      errors.push('Missing or empty line_items');
    }

    // Customer validation
    if (payload.customer) {
      if (!payload.customer.email) errors.push('Missing customer.email');
      if (!payload.customer.phone) errors.push('Missing customer.phone');
    }

    // Address validation
    if (payload.delivery_address) {
      if (!payload.delivery_address.postal_code) errors.push('Missing delivery_address.postal_code');
      if (!payload.delivery_address.country_code) errors.push('Missing delivery_address.country_code');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Helper methods

  private generateDeterministicId(sourceSystem: string, externalId: string): UUID {
    // Use UUID v5 (namespace-based) for deterministic IDs
    const namespace = 'c6e5e2f0-8b3a-4f9d-9c7e-1a2b3c4d5e6f'; // FSM namespace
    return uuidv5(`${sourceSystem}:${externalId}`, namespace);
  }

  private mapSalesChannel(pyxisChannel: string): SalesChannel {
    const channelMap: Record<string, SalesChannel> = {
      'STORE': 'store',
      'WEB': 'web',
      'CALL_CENTER': 'call_center',
      'MOBILE': 'mobile',
    };
    return channelMap[pyxisChannel] || 'store';
  }

  private mapServiceType(pyxisServiceCode: string): string {
    // TODO: Load from configuration service
    const serviceTypeMap: Record<string, string> = {
      'INSTALL_KITCHEN': 'installation',
      'INSTALL_BATHROOM': 'installation',
      'INSTALL_FLOORING': 'installation',
      'TV_KITCHEN': 'technical_visit',
      // ... more mappings
    };
    return serviceTypeMap[pyxisServiceCode] || 'installation';
  }

  private mapStatusToPyxis(fsmStatus: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      'CREATED': 'PENDING',
      'SCHEDULED': 'SCHEDULED',
      'ASSIGNED': 'ASSIGNED',
      'IN_PROGRESS': 'IN_PROGRESS',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED',
    };
    return statusMap[fsmStatus];
  }
}
```

### Tempo Adapter Implementation

```typescript
@Injectable()
export class TempoAdapter implements ISalesAdapter {
  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    private readonly logger: Logger,
  ) {}

  async transformOrder(tempoRequest: TempoServiceRequest): Promise<ServiceOrder> {
    this.logger.log(`Transforming Tempo service request: ${tempoRequest.request_id}`);

    // Validate
    const validation = this.validatePayload(tempoRequest);
    if (!validation.isValid) {
      throw new PayloadValidationError(validation.errors);
    }

    // Map Tempo structure to FSM domain model
    const serviceOrder: ServiceOrder = {
      id: this.generateDeterministicId('tempo', tempoRequest.request_id),
      sourceSystem: 'tempo',
      externalOrderId: tempoRequest.request_id,
      salesChannel: this.mapSalesChannel(tempoRequest.origin_channel),

      customer: {
        id: tempoRequest.client.client_ref,
        name: tempoRequest.client.full_name,
        email: tempoRequest.client.contact_email,
        phone: tempoRequest.client.contact_phone,
      },

      products: [{
        productId: tempoRequest.service_details.service_category,
        name: tempoRequest.service_details.description,
        quantity: 1,
        serviceType: 'maintenance', // Tempo is always maintenance/repair
        estimatedDurationMinutes: 120, // Default for Tempo
      }],

      address: {
        street: tempoRequest.service_address.address_line_1,
        city: tempoRequest.service_address.city_name,
        postalCode: tempoRequest.service_address.zip_code,
        country: tempoRequest.service_address.country_iso,
      },

      countryCode: tempoRequest.country,
      buCode: tempoRequest.business_unit,
      storeId: null, // Tempo doesn't have store concept

      amount: {
        value: tempoRequest.estimated_cost.amount,
        currency: tempoRequest.estimated_cost.currency_code,
      },

      urgency: tempoRequest.service_details.urgency === 'URGENT' ? 'P1' : 'P2',

      rawPayload: JSON.stringify(tempoRequest),
      createdAt: new Date(tempoRequest.created_timestamp),
      updatedAt: new Date(),
    };

    return serviceOrder;
  }

  async sendOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<void> {
    const tempoStatus = this.mapStatusToTempo(status);

    await this.kafkaProducer.send({
      topic: 'fsm.service.status_updated',
      key: orderId,
      value: {
        request_id: orderId,
        service_status: tempoStatus,
        updated_timestamp: new Date().toISOString(),
      },
    });
  }

  async requestCancellation(orderId: string, reason: string): Promise<void> {
    await this.kafkaProducer.send({
      topic: 'fsm.service.cancelled',
      key: orderId,
      value: {
        request_id: orderId,
        cancellation_reason: reason,
        cancelled_timestamp: new Date().toISOString(),
      },
    });
  }

  async sendTVModifications(
    orderId: string,
    outcome: string,
    modifications: Modification[]
  ): Promise<void> {
    // Tempo doesn't have TV concept - this is a no-op
    this.logger.warn(`Tempo doesn't support TV modifications for: ${orderId}`);
  }

  validatePayload(payload: any): ValidationResult {
    const errors: string[] = [];

    if (!payload.request_id) errors.push('Missing request_id');
    if (!payload.client) errors.push('Missing client');
    if (!payload.service_address) errors.push('Missing service_address');
    if (!payload.service_details) errors.push('Missing service_details');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private generateDeterministicId(sourceSystem: string, externalId: string): UUID {
    const namespace = 'c6e5e2f0-8b3a-4f9d-9c7e-1a2b3c4d5e6f';
    return uuidv5(`${sourceSystem}:${externalId}`, namespace);
  }

  private mapSalesChannel(tempoChannel: string): SalesChannel {
    const channelMap: Record<string, SalesChannel> = {
      'WEB': 'web',
      'MOBILE': 'mobile',
      'PARTNER': 'partner',
    };
    return channelMap[tempoChannel] || 'web';
  }

  private mapStatusToTempo(fsmStatus: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      'CREATED': 'RECEIVED',
      'SCHEDULED': 'SCHEDULED',
      'ASSIGNED': 'ASSIGNED_TECHNICIAN',
      'IN_PROGRESS': 'IN_PROGRESS',
      'COMPLETED': 'CLOSED',
      'CANCELLED': 'CANCELLED',
    };
    return statusMap[fsmStatus];
  }
}
```

### Adapter Registry

```typescript
@Injectable()
export class SalesAdapterRegistry {
  private adapters = new Map<string, ISalesAdapter>();

  constructor(
    private readonly pyxisAdapter: PyxisAdapter,
    private readonly tempoAdapter: TempoAdapter,
    private readonly sapAdapter: SapAdapter,
    private readonly mappingRepository: ServiceOrderMappingRepository,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly logger: Logger,
  ) {
    // Register adapters
    this.adapters.set('pyxis', this.pyxisAdapter);
    this.adapters.set('tempo', this.tempoAdapter);
    this.adapters.set('sap', this.sapAdapter);
  }

  async processOrder(sourceSystem: string, externalOrder: any): Promise<ServiceOrder> {
    const startTime = Date.now();
    this.logger.log(`Processing order from ${sourceSystem}: ${externalOrder.order_id || externalOrder.request_id}`);

    try {
      // Get appropriate adapter
      const adapter = this.getAdapter(sourceSystem);

      // Transform to FSM domain model
      const normalized = await adapter.transformOrder(externalOrder);

      // Store bidirectional mapping
      await this.mappingRepository.create({
        salesSystemId: this.getSalesSystemId(sourceSystem),
        externalOrderId: normalized.externalOrderId,
        fsmServiceOrderId: normalized.id,
        salesChannel: normalized.salesChannel,
        rawPayload: normalized.rawPayload,
        normalizedAt: new Date(),
        transformationVersion: '1.0.0',
      });

      // Publish normalized order to FSM domain
      await this.kafkaProducer.send({
        topic: 'projects.service_order.created',
        key: normalized.id,
        value: normalized,
      });

      // Publish integration success event
      await this.kafkaProducer.send({
        topic: 'integration.sales.order.normalized',
        key: normalized.externalOrderId,
        value: {
          sourceSystem,
          externalOrderId: normalized.externalOrderId,
          fsmServiceOrderId: normalized.id,
          transformationVersion: '1.0.0',
          processingTimeMs: Date.now() - startTime,
        },
      });

      this.logger.log(
        `Order processed successfully: ${sourceSystem}:${normalized.externalOrderId} → FSM:${normalized.id} (${Date.now() - startTime}ms)`
      );

      return normalized;

    } catch (error) {
      this.logger.error(`Failed to process order from ${sourceSystem}:`, error);

      // Publish integration failure event
      await this.kafkaProducer.send({
        topic: 'integration.sales.order.failed',
        key: externalOrder.order_id || externalOrder.request_id,
        value: {
          sourceSystem,
          externalOrderId: externalOrder.order_id || externalOrder.request_id,
          errorCode: error.code || 'TRANSFORMATION_ERROR',
          errorMessage: error.message,
          rawPayload: JSON.stringify(externalOrder),
          retryCount: 0,
          failedAt: new Date().toISOString(),
        },
      });

      throw error;
    }
  }

  private getAdapter(sourceSystem: string): ISalesAdapter {
    const adapter = this.adapters.get(sourceSystem.toLowerCase());
    if (!adapter) {
      throw new AdapterNotFoundError(
        `No adapter found for sales system: ${sourceSystem}`
      );
    }
    return adapter;
  }

  private getSalesSystemId(sourceSystem: string): UUID {
    // TODO: Load from database
    const systemIds: Record<string, UUID> = {
      'pyxis': '550e8400-e29b-41d4-a716-446655440001',
      'tempo': '550e8400-e29b-41d4-a716-446655440002',
      'sap': '550e8400-e29b-41d4-a716-446655440003',
    };
    return systemIds[sourceSystem.toLowerCase()];
  }
}
```

---

## Data Transformation

### Transformation Rules

**Product Code Mapping**:

```typescript
// Configuration stored in database, cached in Redis
interface ProductMapping {
  salesSystem: string;
  externalProductCode: string;
  fsmProductId: UUID;
  fsmServiceType: string;
  estimatedDurationMinutes: number;
}

// Example:
{
  salesSystem: 'pyxis',
  externalProductCode: 'INSTALL_KITCHEN_FR',
  fsmProductId: 'prod-12345',
  fsmServiceType: 'installation',
  estimatedDurationMinutes: 240
}
```

**Service Type Mapping**:

```typescript
const SERVICE_TYPE_MAP = {
  pyxis: {
    'INSTALL_*': 'installation',
    'TV_*': 'technical_visit',
    'REWORK_*': 'rework',
  },
  tempo: {
    'MAINTENANCE': 'maintenance',
    'REPAIR': 'repair',
    'EMERGENCY': 'emergency_repair',
  },
};
```

**Status Mapping**:

FSM → Pyxis:
- `CREATED` → `PENDING`
- `SCHEDULED` → `SCHEDULED`
- `ASSIGNED` → `ASSIGNED`
- `IN_PROGRESS` → `IN_PROGRESS`
- `COMPLETED` → `COMPLETED`
- `CANCELLED` → `CANCELLED`

FSM → Tempo:
- `CREATED` → `RECEIVED`
- `SCHEDULED` → `SCHEDULED`
- `ASSIGNED` → `ASSIGNED_TECHNICIAN`
- `IN_PROGRESS` → `IN_PROGRESS`
- `COMPLETED` → `CLOSED`
- `CANCELLED` → `CANCELLED`

---

## Kafka Integration

### Inbound Topics (from Sales Systems)

**Pyxis**:
- `sales.pyxis.order.created` (24 partitions)
- `sales.pyxis.order.updated` (24 partitions)
- `sales.pyxis.order.cancelled` (12 partitions)

**Tempo**:
- `sales.tempo.service.requested` (24 partitions)
- `sales.tempo.service.updated` (24 partitions)
- `sales.tempo.service.cancelled` (12 partitions)

**Partition Key**: `{country_code}_{external_order_id}`

### Outbound Topics (to Sales Systems)

**Status Updates**:
- `fsm.order.status_updated` (24 partitions)
- `fsm.order.assigned` (24 partitions)
- `fsm.order.scheduled` (24 partitions)
- `fsm.order.completed` (24 partitions)

**Technical Visit**:
- `fsm.tv.outcome_recorded` (12 partitions)
- `fsm.tv.modifications_required` (12 partitions)

**Partition Key**: `{source_system}_{external_order_id}`

### Internal Integration Topics

**Processing Events**:
- `integration.sales.order.received` (24 partitions)
- `integration.sales.order.normalized` (24 partitions)
- `integration.sales.order.failed` (12 partitions)
- `integration.sales.status.sent` (24 partitions)
- `integration.sales.status.failed` (12 partitions)

### Consumer Groups

```typescript
// Inbound order processing
const PYXIS_CONSUMER_GROUP = 'integration-adapters-sales-pyxis-orders-v1';
const TEMPO_CONSUMER_GROUP = 'integration-adapters-sales-tempo-services-v1';

// Outbound status updates
const STATUS_UPDATE_CONSUMER_GROUP = 'integration-adapters-fsm-status-updates-v1';

// Failure retry
const RETRY_CONSUMER_GROUP = 'integration-adapters-sales-failures-v1';
```

---

## Error Handling & Retry Logic

### Error Categories

**1. Transient Errors (Retry)**:
- Network timeouts
- Kafka broker unavailable
- Database connection errors
- Rate limiting (429 responses)

**2. Permanent Errors (DLQ)**:
- Invalid payload structure
- Missing required fields
- Unknown product codes
- Business rule violations

### Retry Strategy

```typescript
class RetryPolicy {
  maxRetries = 3;
  baseDelayMs = 1000;
  maxDelayMs = 30000;
  backoffMultiplier = 2;

  calculateDelay(attemptNumber: number): number {
    return Math.min(
      this.baseDelayMs * Math.pow(this.backoffMultiplier, attemptNumber),
      this.maxDelayMs
    );
  }
}

// Usage
async processWithRetry(order: any, retryCount = 0): Promise<void> {
  try {
    await this.processOrder(order.sourceSystem, order.payload);
  } catch (error) {
    if (this.isTransientError(error) && retryCount < this.retryPolicy.maxRetries) {
      const delay = this.retryPolicy.calculateDelay(retryCount);
      await sleep(delay);
      return this.processWithRetry(order, retryCount + 1);
    } else {
      // Send to DLQ
      await this.sendToDLQ(order, error);
    }
  }
}
```

### Dead Letter Queue

```typescript
async sendToDLQ(order: any, error: Error): Promise<void> {
  await this.kafkaProducer.send({
    topic: 'integration.sales.order.failed',
    key: order.externalOrderId,
    value: {
      sourceSystem: order.sourceSystem,
      externalOrderId: order.externalOrderId,
      errorCode: error.code,
      errorMessage: error.message,
      rawPayload: JSON.stringify(order.payload),
      retryCount: order.retryCount || 0,
      failedAt: new Date().toISOString(),
      stackTrace: error.stack,
    },
  });

  // Alert operations team
  await this.alertingService.sendAlert({
    severity: 'high',
    title: 'Sales Order Processing Failed',
    message: `Order ${order.externalOrderId} from ${order.sourceSystem} sent to DLQ`,
    details: { error: error.message },
  });
}
```

---

## Monitoring & Observability

### Datadog Metrics

```typescript
// Order processing metrics
datadogMetrics.increment('integration.adapter.orders.received', {
  source_system: 'pyxis',
  sales_channel: 'store',
});

datadogMetrics.increment('integration.adapter.orders.normalized', {
  source_system: 'pyxis',
});

datadogMetrics.increment('integration.adapter.orders.failed', {
  source_system: 'pyxis',
  error_type: 'validation_error',
});

datadogMetrics.histogram('integration.adapter.transformation.duration',
  durationMs, {
  source_system: 'pyxis',
});

// Kafka consumer lag
datadogMetrics.gauge('integration.adapter.kafka.consumer_lag', lagCount, {
  consumer_group: 'integration-adapters-sales-pyxis-orders-v1',
  topic: 'sales.pyxis.order.created',
});

// Adapter health
datadogMetrics.gauge('integration.adapter.health', healthScore, {
  adapter: 'pyxis',
});
```

### Datadog Alerts

```yaml
# High failure rate
- alert: SalesIntegrationHighFailureRate
  condition: |
    avg(last_5m):
      sum:integration.adapter.orders.failed{source_system:*}
      / sum:integration.adapter.orders.received{source_system:*}
      > 0.05  # 5% failure rate
  message: |
    Sales integration failure rate above 5% for {{source_system.name}}
  severity: high

# High consumer lag
- alert: SalesIntegrationHighConsumerLag
  condition: |
    avg(last_5m):
      integration.adapter.kafka.consumer_lag{consumer_group:*}
      > 1000
  message: |
    High Kafka consumer lag for {{consumer_group.name}}: {{value}} messages
  severity: medium

# Adapter health degraded
- alert: SalesAdapterHealthDegraded
  condition: |
    avg(last_5m):
      integration.adapter.health{adapter:*}
      < 0.8  # Health score below 80%
  message: |
    Sales adapter {{adapter.name}} health degraded: {{value}}%
  severity: high
```

### Grafana Dashboards

**Sales Integration Overview**:
- Orders received per minute (by source system)
- Orders normalized successfully
- Orders failed (with error breakdown)
- Transformation duration (p50, p95, p99)
- Kafka consumer lag

**Adapter Performance**:
- Pyxis adapter throughput
- Tempo adapter throughput
- SAP adapter throughput (future)
- Error rates by adapter
- Average transformation time by adapter

**Integration Health**:
- Overall adapter health scores
- DLQ size over time
- Retry counts by error type
- Status update delivery success rate

---

## Implementation Guide

### NestJS Module Structure

```typescript
// integration-adapters.module.ts
@Module({
  imports: [
    ConfigModule,
    KafkaModule,
    PrismaModule,
  ],
  providers: [
    PyxisAdapter,
    TempoAdapter,
    SapAdapter,
    SalesAdapterRegistry,
    ServiceOrderMappingRepository,
    SalesOrderConsumerService,
    StatusUpdateProducerService,
  ],
  controllers: [
    SalesAdapterHealthController,
  ],
  exports: [SalesAdapterRegistry],
})
export class IntegrationAdaptersModule {}
```

### Kafka Consumer Service

```typescript
@Injectable()
export class SalesOrderConsumerService implements OnModuleInit {
  constructor(
    private readonly adapterRegistry: SalesAdapterRegistry,
    private readonly kafkaConsumer: KafkaConsumerService,
  ) {}

  async onModuleInit() {
    // Subscribe to Pyxis topics
    await this.kafkaConsumer.subscribe({
      topics: [
        'sales.pyxis.order.created',
        'sales.pyxis.order.updated',
        'sales.pyxis.order.cancelled',
      ],
      groupId: 'integration-adapters-sales-pyxis-orders-v1',
    });

    // Subscribe to Tempo topics
    await this.kafkaConsumer.subscribe({
      topics: [
        'sales.tempo.service.requested',
        'sales.tempo.service.updated',
        'sales.tempo.service.cancelled',
      ],
      groupId: 'integration-adapters-sales-tempo-services-v1',
    });

    // Process messages
    await this.kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.handleMessage(topic, message);
      },
    });
  }

  private async handleMessage(topic: string, message: any): Promise<void> {
    const sourceSystem = this.extractSourceSystem(topic);
    const order = JSON.parse(message.value.toString());

    await this.adapterRegistry.processOrder(sourceSystem, order);
  }

  private extractSourceSystem(topic: string): string {
    // Extract 'pyxis' from 'sales.pyxis.order.created'
    const parts = topic.split('.');
    return parts[1];
  }
}
```

### Health Check Endpoint

```typescript
@Controller('health/adapters')
export class SalesAdapterHealthController {
  constructor(private readonly adapterRegistry: SalesAdapterRegistry) {}

  @Get()
  async getAdapterHealth(): Promise<AdapterHealthResponse> {
    const adapters = ['pyxis', 'tempo', 'sap'];
    const health = await Promise.all(
      adapters.map(async (adapter) => ({
        adapter,
        healthy: await this.checkAdapterHealth(adapter),
        lastSuccessfulTransformation: await this.getLastSuccess(adapter),
      }))
    );

    return {
      overall: health.every(h => h.healthy) ? 'healthy' : 'degraded',
      adapters: health,
    };
  }

  private async checkAdapterHealth(adapter: string): Promise<boolean> {
    // Check if adapter can successfully process a test payload
    try {
      const testPayload = this.getTestPayload(adapter);
      await this.adapterRegistry.getAdapter(adapter).validatePayload(testPayload);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

Test each adapter's transformation logic independently:

```typescript
describe('PyxisAdapter', () => {
  let adapter: PyxisAdapter;

  beforeEach(() => {
    adapter = new PyxisAdapter(mockKafkaProducer, mockConfig, mockLogger);
  });

  describe('transformOrder', () => {
    it('should transform valid Pyxis order to FSM ServiceOrder', async () => {
      const pyxisOrder = {
        order_id: 'PYX-FR-001',
        customer: {
          customer_id: 'CUST-001',
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean@example.fr',
          phone: '+33612345678',
        },
        // ... rest of payload
      };

      const result = await adapter.transformOrder(pyxisOrder);

      expect(result.sourceSystem).toBe('pyxis');
      expect(result.externalOrderId).toBe('PYX-FR-001');
      expect(result.customer.name).toBe('Jean Dupont');
      expect(result.customer.email).toBe('jean@example.fr');
    });

    it('should throw PayloadValidationError for missing required fields', async () => {
      const invalidOrder = {
        order_id: 'PYX-FR-001',
        // Missing customer
      };

      await expect(adapter.transformOrder(invalidOrder)).rejects.toThrow(
        PayloadValidationError
      );
    });

    it('should be idempotent (same input → same output)', async () => {
      const pyxisOrder = { /* valid order */ };

      const result1 = await adapter.transformOrder(pyxisOrder);
      const result2 = await adapter.transformOrder(pyxisOrder);

      expect(result1.id).toBe(result2.id);
      expect(result1).toEqual(result2);
    });
  });

  describe('validatePayload', () => {
    it('should return valid for correct payload', () => {
      const validPayload = { /* complete payload */ };
      const result = adapter.validatePayload(validPayload);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid payload', () => {
      const invalidPayload = { order_id: 'PYX-001' }; // Missing fields

      const result = adapter.validatePayload(invalidPayload);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing customer');
    });
  });
});
```

### Integration Tests

Test Kafka integration end-to-end:

```typescript
describe('SalesOrderConsumer Integration', () => {
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;

  beforeAll(async () => {
    // Set up test Kafka instance
    kafka = new Kafka({ brokers: ['localhost:9092'] });
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'test-group' });

    await producer.connect();
    await consumer.connect();
  });

  afterAll(async () => {
    await producer.disconnect();
    await consumer.disconnect();
  });

  it('should process Pyxis order from Kafka topic', async () => {
    const pyxisOrder = { /* valid order */ };

    // Produce message
    await producer.send({
      topic: 'sales.pyxis.order.created',
      messages: [{ value: JSON.stringify(pyxisOrder) }],
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify normalized order was created
    const mapping = await mappingRepository.findByExternalId('PYX-FR-001');
    expect(mapping).toBeDefined();
    expect(mapping.fsmServiceOrderId).toBeDefined();
  });
});
```

### Contract Tests

Test that FSM domain services can consume normalized orders:

```typescript
describe('Normalized ServiceOrder Contract', () => {
  it('should match FSM domain model schema', async () => {
    const pyxisOrder = { /* valid Pyxis order */ };
    const normalized = await pyxisAdapter.transformOrder(pyxisOrder);

    // Verify it matches FSM domain model
    expect(normalized).toHaveProperty('id');
    expect(normalized).toHaveProperty('sourceSystem');
    expect(normalized).toHaveProperty('customer');
    expect(normalized).toHaveProperty('products');
    expect(normalized).toHaveProperty('address');
    expect(normalized.customer).toHaveProperty('email');
    expect(normalized.products[0]).toHaveProperty('serviceType');
  });
});
```

---

## Summary

The Sales System Adapters architecture provides:

✅ **Sales-system-agnostic core**: FSM domain completely independent of Pyxis/Tempo/SAP
✅ **Adapter pattern**: Pluggable adapters for easy addition of new sales systems
✅ **Idempotent transformation**: Same input always produces same output
✅ **Bidirectional mapping**: Track both external and internal order IDs
✅ **Multi-channel support**: Preserve sales channel information (store, web, call center, etc.)
✅ **Robust error handling**: Retry transient errors, DLQ for permanent failures
✅ **Comprehensive monitoring**: Datadog metrics and alerts for adapter health
✅ **Event-driven integration**: Kafka for asynchronous, scalable communication
✅ **Raw payload preservation**: Keep original data for audit and debugging

**Implementation Timeline**: 6-8 weeks for Pyxis + Tempo adapters, 2-3 weeks for SAP adapter (future)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-16
**Owner**: Integration Team
**Reviewers**: Architecture Team, FSM Product Team
