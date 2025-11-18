# Event-Driven Architecture

## Purpose

This document defines the event-driven architecture for the AHS Field Service Execution Platform, including Kafka topics, event schemas, consumer groups, messaging patterns, and best practices for asynchronous communication.

## Event-Driven Architecture Overview

### Why Event-Driven?

**Benefits**:
- **Loose coupling**: Services don't need direct knowledge of each other
- **Scalability**: Async processing allows independent scaling
- **Audit trail**: All state changes captured as events
- **Extensibility**: New consumers can be added without changing producers
- **Resilience**: Retry and replay capabilities
- **Temporal decoupling**: Producers and consumers don't need to be online simultaneously

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │Orchestr.  │  │Assignment │  │Execution  │  │Contracts  │   │
│  │ Service   │  │  Service  │  │  Service  │  │  Service  │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│        │              │              │              │           │
│        └──────────────┴──────────────┴──────────────┘           │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                      KAFKA MESSAGE BUS                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Topics: projects.*, assignments.*, execution.*, etc.       │ │
│  │  Partitions: By country_code + entity_id                    │ │
│  │  Replication: 3x replicas across availability zones         │ │
│  │  Retention: 7-30 days (configurable per topic)              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                         CONSUMERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │Assignment │  │Execution  │  │Communicat.│  │Analytics  │   │
│  │ Service   │  │  Service  │  │  Service  │  │  Service  │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              INTEGRATION ADAPTERS                           │ │
│  │  ERP Adapter | Sales Adapter | E-Signature Adapter         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kafka Configuration

### Cluster Setup

**Infrastructure**:
- **Self-Hosted Kafka**: Strimzi Operator on GKE
- **Brokers**: 6 brokers (3 per zone, 2 zones minimum) across availability zones
- **Coordination**: KRaft mode (Kafka 3.6+, no Zookeeper)

**Key settings**:

```properties
# Broker settings
num.partitions=6
default.replication.factor=3
min.insync.replicas=2
log.retention.hours=168  # 7 days default

# Producer settings
acks=all  # Wait for all replicas
compression.type=snappy
max.in.flight.requests.per.connection=5
enable.idempotence=true

# Consumer settings
auto.offset.reset=earliest
enable.auto.commit=false  # Manual commit for exactly-once
max.poll.records=100
```

### Schema Registry

**Confluent Schema Registry**:
- **Purpose**: Enforce event schema contracts
- **Format**: Avro (efficient serialization, schema evolution)
- **Compatibility**: BACKWARD (new consumers can read old events)

**Configuration**:

```typescript
// Schema Registry client
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

const registry = new SchemaRegistry({
  host: process.env.SCHEMA_REGISTRY_URL,
  auth: {
    username: process.env.SCHEMA_REGISTRY_KEY,
    password: process.env.SCHEMA_REGISTRY_SECRET,
  },
});
```

---

## Topic Naming Convention

**Pattern**: `{domain}.{entity}.{event_type}`

**Examples**:
- `projects.service_order.created`
- `projects.service_order.status_changed`
- `assignments.offer.created`
- `assignments.assignment.confirmed`
- `execution.checkin.completed`
- `contracts.wcf.signed`

**Integration topics**:
- `integration.sales.order_received`
- `integration.erp.payment_ready`
- `integration.esign.contract_signed`

---

## Topic Catalog

### Domain: Projects & Orders

#### `projects.project.created`

**Purpose**: Notify when a new project is created

**Schema**:

```json
{
  "type": "record",
  "name": "ProjectCreated",
  "namespace": "com.ahs.fsm.events.projects",
  "fields": [
    { "name": "event_id", "type": "string", "doc": "Unique event ID (UUID)" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "project_id", "type": "string" },
    { "name": "customer_id", "type": "string" },
    { "name": "country_code", "type": "string" },
    { "name": "bu_code", "type": "string" },
    { "name": "project_type", "type": "string" },
    { "name": "address", "type": {
      "type": "record",
      "name": "Address",
      "fields": [
        { "name": "street", "type": "string" },
        { "name": "city", "type": "string" },
        { "name": "postal_code", "type": "string" },
        { "name": "country", "type": "string" }
      ]
    }}
  ]
}
```

**Partition key**: `{country_code}_{project_id}`

**Consumers**:
- Analytics Service (indexing)

---

#### `projects.service_order.created`

**Purpose**: Notify when a new service order is created

**Schema**:

```json
{
  "type": "record",
  "name": "ServiceOrderCreated",
  "namespace": "com.ahs.fsm.events.projects",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "service_order_id", "type": "string" },
    { "name": "project_id", "type": "string" },
    { "name": "service_type", "type": "string" },
    { "name": "country_code", "type": "string" },
    { "name": "bu_code", "type": "string" },
    { "name": "estimated_duration_min", "type": "int" },
    { "name": "requires_confirmation_tv", "type": "boolean" },
    { "name": "depends_on_order_id", "type": ["null", "string"], "default": null }
  ]
}
```

**Partition key**: `{country_code}_{service_order_id}`

**Consumers**:
- Assignment Service (auto-assignment if configured)
- Communication Service (notify customer)
- Analytics Service

---

#### `projects.service_order.status_changed`

**Purpose**: Track all status transitions

**Schema**:

```json
{
  "type": "record",
  "name": "ServiceOrderStatusChanged",
  "namespace": "com.ahs.fsm.events.projects",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "service_order_id", "type": "string" },
    { "name": "old_status", "type": "string" },
    { "name": "new_status", "type": "string" },
    { "name": "changed_by", "type": ["null", "string"], "default": null },
    { "name": "reason", "type": ["null", "string"], "default": null }
  ]
}
```

**Partition key**: `{country_code}_{service_order_id}`

**Consumers**:
- Execution Service (update mobile job list)
- Communication Service (status notifications)
- Analytics Service

---

#### `projects.service_order.closed`

**Purpose**: Service fully completed, triggers warranty and payment readiness

**Schema**:

```json
{
  "type": "record",
  "name": "ServiceOrderClosed",
  "namespace": "com.ahs.fsm.events.projects",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "service_order_id", "type": "string" },
    { "name": "project_id", "type": "string" },
    { "name": "provider_id", "type": "string" },
    { "name": "team_id", "type": "string" },
    { "name": "customer_amount", "type": {
      "type": "record",
      "name": "Amount",
      "fields": [
        { "name": "value", "type": "double" },
        { "name": "currency", "type": "string" }
      ]
    }},
    { "name": "provider_amount", "type": "Amount" },
    { "name": "wcf_accepted", "type": "boolean" },
    { "name": "warranty_start_date", "type": "string", "logicalType": "date" }
  ]
}
```

**Partition key**: `{country_code}_{service_order_id}`

**Consumers**:
- ERP Adapter (payment readiness signal)
- Communication Service (CSAT survey trigger)
- Analytics Service

---

#### `projects.tv_outcome.recorded`

**Purpose**: Technical visit outcome (YES / YES_BUT / NO) recorded

**Schema**:

```json
{
  "type": "record",
  "name": "TvOutcomeRecorded",
  "namespace": "com.ahs.fsm.events.projects",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "tv_service_order_id", "type": "string" },
    { "name": "linked_installation_order_id", "type": ["null", "string"] },
    { "name": "outcome", "type": { "type": "enum", "name": "TvOutcome", "symbols": ["YES", "YES_BUT", "NO"] }},
    { "name": "modifications", "type": ["null", {
      "type": "array",
      "items": {
        "type": "record",
        "name": "Modification",
        "fields": [
          { "name": "description", "type": "string" },
          { "name": "extra_duration_min", "type": ["null", "int"] }
        ]
      }
    }], "default": null },
    { "name": "recorded_by", "type": "string" }
  ]
}
```

**Partition key**: `{country_code}_{tv_service_order_id}`

**Consumers**:
- Orchestration Service (unblock/cancel installation)
- Sales Adapter (send modification for repricing if YES_BUT, or cancel if NO)
- Assignment Service (re-assign installation if needed)

---

#### `projects.task.created`

**Purpose**: Task automatically or manually created for operators

**Schema**:

```json
{
  "type": "record",
  "name": "TaskCreated",
  "namespace": "com.ahs.fsm.events.projects",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "task_id", "type": "string" },
    { "name": "task_type", "type": "string" },
    { "name": "service_order_id", "type": ["null", "string"] },
    { "name": "priority", "type": "string" },
    { "name": "assigned_to", "type": ["null", "string"] }
  ]
}
```

**Partition key**: `{country_code}_{task_id}`

**Consumers**:
- Communication Service (notify assigned operator)
- Analytics Service

---

### Domain: Assignments

#### `assignments.offer.created`

**Purpose**: Offer sent to provider/team

**Schema**:

```json
{
  "type": "record",
  "name": "OfferCreated",
  "namespace": "com.ahs.fsm.events.assignments",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "offer_id", "type": "string" },
    { "name": "service_order_id", "type": "string" },
    { "name": "provider_id", "type": "string" },
    { "name": "team_id", "type": "string" },
    { "name": "offered_date", "type": "string", "logicalType": "date" },
    { "name": "offered_time_start", "type": "string" },
    { "name": "offered_time_end", "type": "string" },
    { "name": "expires_at", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "auto_accepted", "type": "boolean" }
  ]
}
```

**Partition key**: `{provider_id}_{service_order_id}`

**Consumers**:
- Communication Service (notify provider)
- Analytics Service

---

#### `assignments.assignment.confirmed`

**Purpose**: Assignment finalized (provider accepted or auto-assigned)

**Schema**:

```json
{
  "type": "record",
  "name": "AssignmentConfirmed",
  "namespace": "com.ahs.fsm.events.assignments",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "service_order_id", "type": "string" },
    { "name": "provider_id", "type": "string" },
    { "name": "team_id", "type": "string" },
    { "name": "confirmed_date", "type": "string", "logicalType": "date" },
    { "name": "confirmed_time_start", "type": "string" },
    { "name": "confirmed_time_end", "type": "string" }
  ]
}
```

**Partition key**: `{provider_id}_{service_order_id}`

**Consumers**:
- Orchestration Service (update service order status)
- Execution Service (create execution record)
- Communication Service (notify customer)
- Sales Adapter (confirm schedule)
- Analytics Service

---

#### `assignments.date_negotiation.failed`

**Purpose**: Provider-customer negotiation failed after 3 rounds

**Schema**:

```json
{
  "type": "record",
  "name": "DateNegotiationFailed",
  "namespace": "com.ahs.fsm.events.assignments",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "offer_id", "type": "string" },
    { "name": "service_order_id", "type": "string" },
    { "name": "rounds_completed", "type": "int" }
  ]
}
```

**Partition key**: `{country_code}_{service_order_id}`

**Consumers**:
- Orchestration Service (create operator task)
- Communication Service (alert operator)

---

### Domain: Execution

#### `execution.checkin.completed`

**Purpose**: Technician checked in on-site

**Schema**:

```json
{
  "type": "record",
  "name": "CheckinCompleted",
  "namespace": "com.ahs.fsm.events.execution",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "execution_id", "type": "string" },
    { "name": "service_order_id", "type": "string" },
    { "name": "team_id", "type": "string" },
    { "name": "checked_in_at", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "gps", "type": {
      "type": "record",
      "name": "GpsCoordinates",
      "fields": [
        { "name": "lat", "type": "double" },
        { "name": "lng", "type": "double" }
      ]
    }}
  ]
}
```

**Partition key**: `{team_id}_{service_order_id}`

**Consumers**:
- Orchestration Service (update status to in_progress)
- Communication Service ("Tech on the way" notification)
- Analytics Service

---

#### `execution.checkout.completed`

**Purpose**: Technician checked out (work completed or incomplete)

**Schema**:

```json
{
  "type": "record",
  "name": "CheckoutCompleted",
  "namespace": "com.ahs.fsm.events.execution",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "execution_id", "type": "string" },
    { "name": "service_order_id", "type": "string" },
    { "name": "team_id", "type": "string" },
    { "name": "checked_out_at", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "completed", "type": "boolean" },
    { "name": "incompletion_reason", "type": ["null", "string"] }
  ]
}
```

**Partition key**: `{team_id}_{service_order_id}`

**Consumers**:
- Orchestration Service (update status; create task if incomplete)
- Contracts Service (auto-create WCF)
- Analytics Service

---

### Domain: Contracts

#### `contracts.contract.signed`

**Purpose**: Pre-service contract signed by customer

**Schema**:

```json
{
  "type": "record",
  "name": "ContractSigned",
  "namespace": "com.ahs.fsm.events.contracts",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "contract_id", "type": "string" },
    { "name": "project_id", "type": "string" },
    { "name": "service_order_ids", "type": { "type": "array", "items": "string" }},
    { "name": "signed_at", "type": "long", "logicalType": "timestamp-millis" }
  ]
}
```

**Partition key**: `{country_code}_{project_id}`

**Consumers**:
- Orchestration Service (unblock service orders if contract was blocking)
- Analytics Service

---

#### `contracts.wcf.signed`

**Purpose**: Work Closing Form signed by customer

**Schema**:

```json
{
  "type": "record",
  "name": "WcfSigned",
  "namespace": "com.ahs.fsm.events.contracts",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "wcf_id", "type": "string" },
    { "name": "service_order_id", "type": "string" },
    { "name": "execution_id", "type": "string" },
    { "name": "customer_accepted", "type": "boolean" },
    { "name": "signed_at", "type": "long", "logicalType": "timestamp-millis" }
  ]
}
```

**Partition key**: `{country_code}_{service_order_id}`

**Consumers**:
- Orchestration Service (close order if accepted; create task if contested)
- Communication Service (trigger CSAT if accepted)
- Analytics Service

---

### Domain: Integration

#### `integration.sales.order_received`

**Purpose**: Service order received from Pyxis/Tempo

**Schema**:

```json
{
  "type": "record",
  "name": "SalesOrderReceived",
  "namespace": "com.ahs.fsm.events.integration",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "sales_order_id", "type": "string" },
    { "name": "customer_id", "type": "string" },
    { "name": "country_code", "type": "string" },
    { "name": "services", "type": { "type": "array", "items": {
      "type": "record",
      "name": "Service",
      "fields": [
        { "name": "service_type", "type": "string" },
        { "name": "requires_confirmation_tv", "type": "boolean" }
      ]
    }}}
  ]
}
```

**Partition key**: `{country_code}_{sales_order_id}`

**Consumers**:
- Orchestration Service (create project + service orders)

---

#### `integration.erp.payment_ready`

**Purpose**: Service order ready for provider payment

**Schema**:

```json
{
  "type": "record",
  "name": "PaymentReady",
  "namespace": "com.ahs.fsm.events.integration",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "service_order_id", "type": "string" },
    { "name": "provider_id", "type": "string" },
    { "name": "amount", "type": {
      "type": "record",
      "name": "PaymentAmount",
      "fields": [
        { "name": "value", "type": "double" },
        { "name": "currency", "type": "string" }
      ]
    }},
    { "name": "completion_date", "type": "string", "logicalType": "date" }
  ]
}
```

**Partition key**: `{provider_id}_{service_order_id}`

**Consumers**:
- ERP Adapter (send to Oracle for payment processing)

---

### Domain: Sales Integration (Multi-Sales-System)

#### `sales.pyxis.order.created`

**Purpose**: Service order received from Pyxis sales system

**Schema**:

```json
{
  "type": "record",
  "name": "PyxisOrderCreated",
  "namespace": "com.ahs.fsm.events.sales",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "pyxis_order_id", "type": "string", "doc": "External Pyxis order ID" },
    { "name": "sales_channel", "type": { "type": "enum", "name": "SalesChannel", "symbols": ["STORE", "WEB", "CALL_CENTER", "MOBILE", "PARTNER"] }},
    { "name": "country_code", "type": "string" },
    { "name": "bu_code", "type": "string" },
    { "name": "store_id", "type": ["null", "string"] },
    { "name": "customer", "type": {
      "type": "record",
      "name": "CustomerInfo",
      "fields": [
        { "name": "customer_id", "type": "string" },
        { "name": "name", "type": "string" },
        { "name": "email", "type": "string" },
        { "name": "phone", "type": "string" }
      ]
    }},
    { "name": "products", "type": { "type": "array", "items": {
      "type": "record",
      "name": "Product",
      "fields": [
        { "name": "product_id", "type": "string" },
        { "name": "quantity", "type": "int" },
        { "name": "service_type", "type": "string" }
      ]
    }}},
    { "name": "address", "type": {
      "type": "record",
      "name": "DeliveryAddress",
      "fields": [
        { "name": "street", "type": "string" },
        { "name": "city", "type": "string" },
        { "name": "postal_code", "type": "string" },
        { "name": "country", "type": "string" }
      ]
    }},
    { "name": "raw_payload", "type": "string", "doc": "Original Pyxis payload as JSON string" }
  ]
}
```

**Partition key**: `{country_code}_{pyxis_order_id}`

**Consumers**:
- Integration Adapters Service (normalize to FSM domain model)

---

#### `sales.tempo.service.requested`

**Purpose**: Service request received from Tempo sales system

**Schema**:

```json
{
  "type": "record",
  "name": "TempoServiceRequested",
  "namespace": "com.ahs.fsm.events.sales",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "tempo_request_id", "type": "string", "doc": "External Tempo request ID" },
    { "name": "sales_channel", "type": "SalesChannel" },
    { "name": "country_code", "type": "string" },
    { "name": "bu_code", "type": "string" },
    { "name": "customer", "type": "CustomerInfo" },
    { "name": "service_type", "type": "string" },
    { "name": "address", "type": "DeliveryAddress" },
    { "name": "raw_payload", "type": "string", "doc": "Original Tempo payload as JSON string" }
  ]
}
```

**Partition key**: `{country_code}_{tempo_request_id}`

**Consumers**:
- Integration Adapters Service (normalize to FSM domain model)

---

#### `integration.sales.order.normalized`

**Purpose**: Sales order successfully normalized to FSM domain model

**Schema**:

```json
{
  "type": "record",
  "name": "SalesOrderNormalized",
  "namespace": "com.ahs.fsm.events.integration",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "source_system", "type": { "type": "enum", "name": "SourceSystem", "symbols": ["PYXIS", "TEMPO", "SAP", "CUSTOM"] }},
    { "name": "external_order_id", "type": "string" },
    { "name": "fsm_service_order_id", "type": "string", "doc": "Created FSM service order ID" },
    { "name": "sales_channel", "type": "SalesChannel" },
    { "name": "country_code", "type": "string" },
    { "name": "transformation_version", "type": "string", "doc": "Adapter version used for transformation" }
  ]
}
```

**Partition key**: `{source_system}_{external_order_id}`

**Consumers**:
- Analytics Service (track integration metrics)
- Monitoring Service (adapter health)

---

#### `integration.sales.order.failed`

**Purpose**: Sales order normalization/processing failed

**Schema**:

```json
{
  "type": "record",
  "name": "SalesOrderFailed",
  "namespace": "com.ahs.fsm.events.integration",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "source_system", "type": "SourceSystem" },
    { "name": "external_order_id", "type": "string" },
    { "name": "error_code", "type": "string" },
    { "name": "error_message", "type": "string" },
    { "name": "raw_payload", "type": "string", "doc": "Original payload for debugging" },
    { "name": "retry_count", "type": "int", "default": 0 }
  ]
}
```

**Partition key**: `{source_system}_{external_order_id}`

**Consumers**:
- Integration Adapters Service (retry mechanism)
- Monitoring Service (alert on failures)
- Analytics Service (failure analysis)

---

#### `fsm.order.status_updated`

**Purpose**: Send service order status update back to sales system

**Schema**:

```json
{
  "type": "record",
  "name": "FsmOrderStatusUpdated",
  "namespace": "com.ahs.fsm.events.integration",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "source_system", "type": "SourceSystem" },
    { "name": "external_order_id", "type": "string" },
    { "name": "fsm_service_order_id", "type": "string" },
    { "name": "status", "type": { "type": "enum", "name": "OrderStatus", "symbols": ["CREATED", "SCHEDULED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] }},
    { "name": "scheduled_date", "type": ["null", "string"], "logicalType": "date", "default": null },
    { "name": "provider_name", "type": ["null", "string"], "default": null }
  ]
}
```

**Partition key**: `{source_system}_{external_order_id}`

**Consumers**:
- Integration Adapters Service (send to Pyxis/Tempo/SAP)

---

#### `fsm.tv.outcome_recorded`

**Purpose**: Send Technical Visit outcome back to sales system

**Schema**:

```json
{
  "type": "record",
  "name": "FsmTvOutcomeRecorded",
  "namespace": "com.ahs.fsm.events.integration",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "source_system", "type": "SourceSystem" },
    { "name": "external_order_id", "type": "string" },
    { "name": "tv_outcome", "type": { "type": "enum", "name": "TvOutcome", "symbols": ["YES", "YES_BUT", "NO"] }},
    { "name": "modifications", "type": ["null", {
      "type": "array",
      "items": {
        "type": "record",
        "name": "ScopeModification",
        "fields": [
          { "name": "description", "type": "string" },
          { "name": "requires_repricing", "type": "boolean" }
        ]
      }
    }], "default": null },
    { "name": "cancellation_reason", "type": ["null", "string"], "default": null }
  ]
}
```

**Partition key**: `{source_system}_{external_order_id}`

**Consumers**:
- Integration Adapters Service (send to Pyxis/Tempo for repricing or cancellation)

---

## Consumer Groups

### Pattern

**Consumer group naming**: `{service-name}-{topic-pattern}-{purpose}`

**Examples**:
- `assignment-service-projects-service-orders-auto-assign`
- `communication-service-all-events-notifications`
- `analytics-service-all-events-indexing`

### Consumer Group Configuration

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'assignment-service',
  brokers: [process.env.KAFKA_BROKERS],
});

const consumer = kafka.consumer({
  groupId: 'assignment-service-projects-service-orders-auto-assign',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxWaitTimeInMs: 5000,
  rebalanceTimeout: 60000,
});

await consumer.connect();

await consumer.subscribe({
  topics: ['projects.service_order.created', 'projects.service_order.ready_for_assignment'],
  fromBeginning: false,
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    // Process event
    await handleServiceOrderEvent(event);

    // Manual commit for exactly-once
    await consumer.commitOffsets([
      { topic, partition, offset: (parseInt(message.offset) + 1).toString() }
    ]);
  },
});
```

### Consumer Groups Matrix

| Consumer Group | Topics Subscribed | Purpose |
|----------------|-------------------|---------|
| `assignment-service-projects-orders-v1` | `projects.service_order.created`, `projects.service_order.ready_for_assignment` | Auto-assignment triggers |
| `assignment-service-execution-tv-outcomes-v1` | `execution.tv_outcome.recorded` | Re-assign installation after TV |
| `execution-service-assignments-confirmed-v1` | `assignments.assignment.confirmed` | Create execution records |
| `communication-service-all-events-v1` | `projects.*`, `assignments.*`, `execution.*`, `contracts.*` | Send notifications |
| `orchestration-service-assignments-confirmed-v1` | `assignments.assignment.confirmed` | Update order status |
| `orchestration-service-contracts-signed-v1` | `contracts.contract.signed`, `contracts.wcf.signed` | Unblock orders, close orders |
| `analytics-service-all-events-v1` | `*.*.*` | Index for search and dashboards |
| `erp-adapter-projects-closed-v1` | `projects.service_order.closed` | Send payment-ready signal |
| `sales-adapter-tv-outcomes-v1` | `projects.tv_outcome.recorded` | Handle modifications or cancellations |
| **Sales Integration Consumer Groups** | | |
| `integration-adapters-sales-pyxis-orders-v1` | `sales.pyxis.order.created`, `sales.pyxis.order.updated`, `sales.pyxis.order.cancelled` | Process incoming Pyxis orders |
| `integration-adapters-sales-tempo-services-v1` | `sales.tempo.service.requested`, `sales.tempo.service.updated`, `sales.tempo.service.cancelled` | Process incoming Tempo service requests |
| `integration-adapters-sales-sap-orders-v1` | `sales.sap.order.created` | Process incoming SAP orders (future) |
| `integration-adapters-sales-channels-v1` | `sales.channel.store.order`, `sales.channel.web.order`, `sales.channel.callcenter.order` | Process multi-channel orders |
| `integration-adapters-fsm-status-updates-v1` | `fsm.order.status_updated`, `fsm.order.assigned`, `fsm.order.scheduled`, `fsm.order.completed` | Send status updates to sales systems |
| `integration-adapters-fsm-tv-outcomes-v1` | `fsm.tv.outcome_recorded`, `fsm.tv.modifications_required` | Send TV outcomes to sales systems |
| `integration-adapters-sales-failures-v1` | `integration.sales.order.failed`, `integration.sales.status.failed` | Retry failed integrations |
| `monitoring-service-sales-integration-v1` | `integration.sales.*` | Monitor sales integration health |
| `analytics-service-sales-integration-v1` | `sales.*.*`, `fsm.*`, `integration.sales.*` | Track integration metrics and performance |

---

## Event Processing Patterns

### 1. Event Sourcing (Partial)

**Use case**: Audit-critical entities (service orders, assignments)

**Pattern**: Store all state-changing events, derive state from event history

**Example**:

```typescript
// Store events in service_order_history table
async function handleStatusChange(event: ServiceOrderStatusChanged) {
  await db.service_order_history.create({
    data: {
      service_order_id: event.service_order_id,
      event_type: 'status_changed',
      old_value: { status: event.old_status },
      new_value: { status: event.new_status },
      changed_at: new Date(event.event_timestamp),
      changed_by: event.changed_by,
    },
  });

  // Also update current state
  await db.service_orders.update({
    where: { id: event.service_order_id },
    data: { status: event.new_status, updated_at: new Date() },
  });
}
```

---

### 2. Saga Pattern (Distributed Transactions)

**Use case**: Multi-step workflows (TV → Installation)

**Pattern**: Choreography-based saga (event-driven)

**Example**: Confirmation TV Flow

```
1. Orchestration Service publishes: projects.service_order.created (TV + Installation)
   → Installation order created with status=blocked

2. Execution Service publishes: execution.tv_outcome.recorded (outcome=YES)

3. Orchestration Service consumes event:
   → Updates installation order: status=ready_for_assignment
   → Publishes: projects.service_order.unblocked

4. Assignment Service consumes: projects.service_order.unblocked
   → Triggers assignment
```

**Compensation** (if TV outcome=NO):

```
Orchestration Service:
  → Cancels installation order
  → Publishes: projects.service_order.cancelled

Sales Adapter consumes:
  → Sends cancellation event to Pyxis (trigger refund)
```

---

### 3. CQRS (Command Query Responsibility Segregation)

**Use case**: Analytics and search (read-heavy)

**Pattern**: Separate write model (PostgreSQL) from read model (OpenSearch)

**Example**:

```typescript
// Write side: Orchestration Service
async function createServiceOrder(command: CreateServiceOrderCommand) {
  const order = await db.service_orders.create({ data: command });

  // Publish event
  await kafka.publish('projects.service_order.created', {
    event_id: uuid(),
    event_timestamp: Date.now(),
    service_order_id: order.id,
    // ...
  });

  return order;
}

// Read side: Analytics Service (consumer)
async function indexServiceOrder(event: ServiceOrderCreated) {
  await opensearch.index({
    index: 'service_orders',
    id: event.service_order_id,
    body: {
      id: event.service_order_id,
      project_id: event.project_id,
      service_type: event.service_type,
      // ...
      indexed_at: new Date(),
    },
  });
}
```

---

### 4. Idempotency

**Challenge**: Events may be delivered multiple times

**Solution**: Idempotency keys and deduplication

**Example**:

```typescript
async function handleEvent(event: DomainEvent) {
  // Check if already processed
  const existing = await db.processed_events.findUnique({
    where: { event_id: event.event_id },
  });

  if (existing) {
    console.log(`Event ${event.event_id} already processed, skipping`);
    return;
  }

  // Process event in transaction
  await db.$transaction(async (tx) => {
    // Business logic
    await processBusinessLogic(event, tx);

    // Record event as processed
    await tx.processed_events.create({
      data: {
        event_id: event.event_id,
        event_type: event.constructor.name,
        processed_at: new Date(),
      },
    });
  });
}
```

**Deduplication table**:

```sql
CREATE TABLE processed_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cleanup old entries (7 days retention)
CREATE INDEX idx_processed_events_processed_at ON processed_events(processed_at);
```

---

### 5. Dead Letter Queue (DLQ)

**Challenge**: Some events fail processing despite retries

**Solution**: Move failed events to DLQ topic for manual investigation

**Pattern**:

```typescript
const MAX_RETRIES = 3;

async function handleEvent(event: DomainEvent, retryCount = 0) {
  try {
    await processEvent(event);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      // Retry with exponential backoff
      await sleep(Math.pow(2, retryCount) * 1000);
      await handleEvent(event, retryCount + 1);
    } else {
      // Send to DLQ
      await kafka.publish('dlq.failed_events', {
        original_topic: event.topic,
        original_event: event,
        error: error.message,
        failed_at: Date.now(),
      });
    }
  }
}
```

**DLQ monitoring**:
- Alert ops team when DLQ receives events
- Dashboard showing DLQ size and failure reasons
- Manual replay tool for DLQ events after fixing issues

---

## Event Monitoring & Observability

### Metrics to Track

**Per topic**:
- Messages in/out per second
- Consumer lag (messages behind)
- Partition distribution

**Per consumer group**:
- Processing latency (p50, p95, p99)
- Error rate
- Retry count
- DLQ rate

**Example with Prometheus**:

```typescript
import { Counter, Histogram } from 'prom-client';

const eventsProcessed = new Counter({
  name: 'kafka_events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['topic', 'status'],
});

const processingDuration = new Histogram({
  name: 'kafka_event_processing_duration_seconds',
  help: 'Event processing duration',
  labelNames: ['topic'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

async function handleEvent(event: DomainEvent) {
  const end = processingDuration.startTimer({ topic: event.topic });

  try {
    await processEvent(event);
    eventsProcessed.inc({ topic: event.topic, status: 'success' });
  } catch (error) {
    eventsProcessed.inc({ topic: event.topic, status: 'error' });
    throw error;
  } finally {
    end();
  }
}
```

### Grafana Dashboards

**Kafka Overview**:
- Topic throughput (messages/sec)
- Consumer lag by group
- Partition distribution
- Disk usage

**Event Processing**:
- Events processed per minute (by topic)
- Processing latency (p95, p99)
- Error rate
- DLQ size

---

## Best Practices

### Event Design

1. **Immutable events**: Never modify event schema in breaking ways
2. **Small events**: Keep event size < 1MB (ideally < 100KB)
3. **Self-contained**: Include all necessary data to process (avoid lookups when possible)
4. **Metadata**: Always include event_id, event_timestamp, correlation_id

### Schema Evolution

**Backward compatible changes** (allowed):
- Adding optional fields
- Adding enum values (at end)

**Breaking changes** (create new version):
- Removing fields
- Changing field types
- Renaming fields

**Versioning**:

```json
{
  "name": "ServiceOrderCreated",
  "namespace": "com.ahs.fsm.events.projects.v2",  // Version in namespace
  "fields": [
    { "name": "event_version", "type": "int", "default": 2 },
    // ...
  ]
}
```

### Error Handling

1. **Transient errors**: Retry with exponential backoff (network issues, DB locks)
2. **Permanent errors**: Send to DLQ immediately (schema mismatch, business rule violation)
3. **Poison pills**: Implement message skip after N failures to avoid blocking partition

### Performance

1. **Batching**: Process multiple events in single transaction
2. **Parallel processing**: Use multiple partitions
3. **Compression**: Enable snappy compression
4. **Async where possible**: Don't block producer on consumer processing

---

## References

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
**Owner**: Platform Architecture Team
**Reviewers**: CTO, Engineering Leads
