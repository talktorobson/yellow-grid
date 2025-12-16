# Sales Pre-Estimation Integration Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Specification
**Gap Filled**: Link Service Orders to Sales Pre-Estimations for AI Sales Potential Scoring

---

## Overview

Sales systems (Pyxis, Tempo, SAP) generate **pre-estimations** (also called quotes or simulations) when salespeople assess customer project costs. These pre-estimations contain valuable signals about sales potential that enhance the AI Sales Potential Scorer for Technical Visit (TV) service orders.

---

## Business Value

### For Sales Potential AI Model

**High-Value Pre-Estimation → High Sales Potential TV**

If a TV service order is linked to a high-value pre-estimation (e.g., €15,000 kitchen project), the AI model scores it as HIGH potential for conversion to full installation.

**Confidence Levels**:
- Pre-estimation value > €10,000 → HIGH potential
- Pre-estimation value €3,000-€10,000 → MEDIUM potential
- Pre-estimation value < €3,000 → LOW potential
- No pre-estimation → Use other features (salesman notes, customer history)

---

## Data Model

### Pre-Estimation Entity

```typescript
interface SalesPreEstimation {
  // Identity
  id: string;
  estimationNumber: string; // External ID from sales system
  salesSystem: SalesSystem;

  // Customer
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;

  // Salesman
  salesmanId: string;
  salesmanName: string;
  salesmanNotes?: string;

  // Estimation Details
  productCategories: string[]; // ['kitchen', 'appliances']
  estimatedValue: Money;
  confidenceLevel: ConfidenceLevel;
  validUntil?: DateTime;

  // Status
  status: PreEstimationStatus;
  convertedToServiceOrder: boolean;
  linkedServiceOrderIds: string[];

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  convertedAt?: DateTime;
}

enum SalesSystem {
  PYXIS = 'PYXIS',
  TEMPO = 'TEMPO',
  SAP = 'SAP',
}

enum ConfidenceLevel {
  LOW = 'LOW',       // Rough estimate, many unknowns
  MEDIUM = 'MEDIUM', // Standard estimate
  HIGH = 'HIGH',     // Detailed estimate with customer commitment
}

enum PreEstimationStatus {
  DRAFT = 'DRAFT',
  SENT_TO_CUSTOMER = 'SENT_TO_CUSTOMER',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED', // Converted to actual sale
}
```

---

## Integration Flow

### Step 1: Sales System Sends Pre-Estimation

**Trigger**: Salesman creates pre-estimation in Pyxis/Tempo/SAP

**Event**: `sales.pre_estimation.created`

```typescript
interface PreEstimationCreatedEvent {
  event: 'sales.pre_estimation.created';
  eventId: string;
  timestamp: DateTime;

  preEstimation: {
    id: string;
    estimationNumber: string;
    salesSystem: 'PYXIS' | 'TEMPO' | 'SAP';

    customer: {
      customerId: string;
      name: string;
      email: string;
      phone: string;
    };

    salesman: {
      salesmanId: string;
      name: string;
      notes: string; // "Customer very interested in modern kitchen design"
    };

    estimation: {
      productCategories: string[];
      estimatedValue: {
        amount: number;
        currency: string;
      };
      confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      validUntil: string; // ISO 8601 date
    };

    status: 'DRAFT' | 'SENT_TO_CUSTOMER' | 'ACCEPTED';
    createdAt: string; // ISO 8601
  };
}
```

**Yellow Grid Handler**:
```typescript
eventBus.subscribe('sales.pre_estimation.created', async (event) => {
  // Store pre-estimation
  const preEstimation = await preEstimationRepo.create({
    id: event.preEstimation.id,
    estimationNumber: event.preEstimation.estimationNumber,
    salesSystem: event.preEstimation.salesSystem,
    customerId: event.preEstimation.customer.customerId,
    estimatedValue: Money.from(event.preEstimation.estimation.estimatedValue),
    confidenceLevel: event.preEstimation.estimation.confidenceLevel,
    status: event.preEstimation.status,
    productCategories: event.preEstimation.estimation.productCategories,
    salesmanNotes: event.preEstimation.salesman.notes,
    createdAt: DateTime.fromISO(event.preEstimation.createdAt)
  });

  await preEstimationRepo.save(preEstimation);
});
```

### Step 2: Link Pre-Estimation to Service Order

**Trigger**: Service order created from sales order that references pre-estimation

**Event**: `sales.pre_estimation.linked`

```typescript
interface PreEstimationLinkedEvent {
  event: 'sales.pre_estimation.linked';
  eventId: string;
  timestamp: DateTime;

  preEstimationId: string;
  serviceOrderId: string;
  linkType: 'AUTOMATIC' | 'MANUAL';
}
```

**Automatic Linking**:
```typescript
// When SO is created from sales order
async function handleServiceOrderCreated(event: ServiceOrderCreatedEvent): Promise<void> {
  const so = await serviceOrderRepo.findById(event.serviceOrderId);

  // Check if sales order has pre-estimation reference
  if (so.externalSalesOrderId) {
    const preEstimation = await preEstimationRepo.findBySalesOrder(
      so.externalSalesOrderId,
      so.externalSystemSource
    );

    if (preEstimation) {
      // Link pre-estimation to SO
      so.salesPreEstimationId = preEstimation.id;
      so.preEstimationValue = preEstimation.estimatedValue;

      await serviceOrderRepo.save(so);

      // Update pre-estimation
      preEstimation.linkedServiceOrderIds.push(so.id);
      preEstimation.convertedToServiceOrder = true;
      preEstimation.convertedAt = DateTime.now();

      await preEstimationRepo.save(preEstimation);

      // Trigger AI sales potential scoring
      await eventBus.publish({
        event: 'sales.pre_estimation.linked',
        preEstimationId: preEstimation.id,
        serviceOrderId: so.id,
        linkType: 'AUTOMATIC'
      });
    }
  }
}
```

### Step 3: AI Sales Potential Scoring Uses Pre-Estimation

```typescript
// AI model uses pre-estimation as feature
async function extractSalesPotentialFeatures(
  serviceOrder: ServiceOrder
): Promise<SalesPotentialFeatures> {
  // ... other features ...

  // Pre-estimation features (HIGH WEIGHT: 40%)
  const preEstimation = serviceOrder.salesPreEstimationId
    ? await preEstimationRepo.findById(serviceOrder.salesPreEstimationId)
    : null;

  return {
    // ... other features ...

    // Pre-estimation features
    preEstimationValue: preEstimation?.estimatedValue.amount || null,
    preEstimationConfidence: preEstimation?.confidenceLevel === 'HIGH' ? 100 :
                             preEstimation?.confidenceLevel === 'MEDIUM' ? 70 : 50,
    hasPreEstimation: preEstimation !== null,

    // ... customer features, etc. ...
  };
}
```

---

## Service Order Data Model Updates

```typescript
// ADD to domain/03-project-service-order-domain.md
interface ServiceOrder {
  // ... existing fields ...

  // Sales Pre-Estimation Link (v2.0)
  salesPreEstimationId?: string;
  preEstimationValue?: Money;
  preEstimationLinkedAt?: DateTime;
}
```

---

## Database Schema

```sql
-- New table for pre-estimations
CREATE TABLE app.sales_pre_estimations (
  id VARCHAR(100) PRIMARY KEY, -- External ID from sales system
  estimation_number VARCHAR(50) UNIQUE NOT NULL,
  sales_system VARCHAR(20) NOT NULL CHECK (sales_system IN ('PYXIS', 'TEMPO', 'SAP')),

  -- Customer
  customer_id UUID NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Salesman
  salesman_id VARCHAR(100),
  salesman_name VARCHAR(255),
  salesman_notes TEXT,

  -- Estimation
  product_categories JSONB, -- Array of category strings
  estimated_value_amount DECIMAL(12, 2) NOT NULL,
  estimated_value_currency CHAR(3) NOT NULL,
  confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
  valid_until DATE,

  -- Status
  status VARCHAR(30) NOT NULL,
  converted_to_service_order BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Junction table for pre-estimation to SO links
CREATE TABLE app.pre_estimation_service_orders (
  pre_estimation_id VARCHAR(100) NOT NULL REFERENCES app.sales_pre_estimations(id),
  service_order_id UUID NOT NULL REFERENCES app.service_orders(id),
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  link_type VARCHAR(20) NOT NULL CHECK (link_type IN ('AUTOMATIC', 'MANUAL')),

  PRIMARY KEY (pre_estimation_id, service_order_id)
);

-- Add columns to service_orders table
ALTER TABLE app.service_orders
ADD COLUMN sales_pre_estimation_id VARCHAR(100) REFERENCES app.sales_pre_estimations(id),
ADD COLUMN pre_estimation_value_amount DECIMAL(12, 2),
ADD COLUMN pre_estimation_value_currency CHAR(3),
ADD COLUMN pre_estimation_linked_at TIMESTAMP WITH TIME ZONE;

-- Indexes
CREATE INDEX idx_pre_estimations_customer ON app.sales_pre_estimations(customer_id);
CREATE INDEX idx_pre_estimations_status ON app.sales_pre_estimations(status);
CREATE INDEX idx_pre_estimations_sales_system ON app.sales_pre_estimations(sales_system);
CREATE INDEX idx_service_orders_pre_estimation ON app.service_orders(sales_pre_estimation_id);
```

---

## API Endpoints

### 1. Get Pre-Estimations for Customer

**GET** `/api/v1/customers/{customerId}/pre-estimations`

**Response**:
```json
{
  "preEstimations": [
    {
      "id": "est_pyxis_12345",
      "estimationNumber": "QUO-2025-00123",
      "salesSystem": "PYXIS",
      "estimatedValue": { "amount": 15000, "currency": "EUR" },
      "confidenceLevel": "HIGH",
      "status": "ACCEPTED",
      "productCategories": ["kitchen", "appliances"],
      "convertedToServiceOrder": true,
      "linkedServiceOrderIds": ["so_abc123"],
      "createdAt": "2025-01-10T10:00:00Z"
    }
  ]
}
```

### 2. Link Pre-Estimation to Service Order (Manual)

**POST** `/api/v1/service-orders/{serviceOrderId}/link-pre-estimation`

**Request**:
```json
{
  "preEstimationId": "est_pyxis_12345"
}
```

**Response**:
```json
{
  "serviceOrderId": "so_abc123",
  "preEstimationId": "est_pyxis_12345",
  "preEstimationValue": { "amount": 15000, "currency": "EUR" },
  "linkedAt": "2025-01-16T14:00:00Z",
  "salesPotentialUpdated": true,
  "newSalesPotential": "HIGH"
}
```

---

## Kafka Event Schemas

### Pre-Estimation Created

**Topic**: `sales.pre_estimation.created`

```json
{
  "event": "sales.pre_estimation.created",
  "eventId": "evt_123",
  "timestamp": "2025-01-16T10:00:00Z",
  "preEstimation": {
    "id": "est_pyxis_12345",
    "estimationNumber": "QUO-2025-00123",
    "salesSystem": "PYXIS",
    "customer": {
      "customerId": "cust_456",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "estimation": {
      "productCategories": ["kitchen", "appliances"],
      "estimatedValue": { "amount": 15000, "currency": "EUR" },
      "confidenceLevel": "HIGH"
    },
    "status": "SENT_TO_CUSTOMER",
    "createdAt": "2025-01-16T10:00:00Z"
  }
}
```

### Pre-Estimation Linked

**Topic**: `sales.pre_estimation.linked`

```json
{
  "event": "sales.pre_estimation.linked",
  "eventId": "evt_456",
  "timestamp": "2025-01-16T14:00:00Z",
  "preEstimationId": "est_pyxis_12345",
  "serviceOrderId": "so_abc123",
  "linkType": "AUTOMATIC"
}
```

---

## Business Rules

| Rule | Description |
|------|-------------|
| **Automatic Linking** | When SO created from sales order with pre-estimation reference |
| **Manual Linking** | Operator can manually link pre-estimation to SO |
| **One-to-Many** | One pre-estimation can link to multiple SOs (e.g., TV → Installation) |
| **AI Trigger** | Linking pre-estimation triggers AI sales potential re-scoring |
| **Expiry** | Pre-estimations expire after `validUntil` date |
| **Conversion Tracking** | Pre-estimation marked CONVERTED when linked to SO |

---

**Document Status**: Complete
**Implementation Priority**: MEDIUM (enhances AI model accuracy)
**Estimated Effort**: 2 weeks
**Dependencies**: Kafka integration with sales systems, AI Sales Potential Scorer
