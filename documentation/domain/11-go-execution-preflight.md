# Go Execution Pre-Flight Check Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pre-Flight Check Algorithm](#2-pre-flight-check-algorithm)
3. [Payment Status Integration](#3-payment-status-integration)
4. [Product Delivery Status Integration](#4-product-delivery-status-integration)
5. [Alert & Task Management](#5-alert--task-management)
6. [Check-In Block Enforcement](#6-check-in-block-enforcement)
7. [Manual Override (Derogation)](#7-manual-override-derogation)
8. [Configuration & Business Rules](#8-configuration--business-rules)
9. [Data Model](#9-data-model)
10. [API Examples](#10-api-examples)

---

## 1. Overview

### 1.1 Purpose

The **Go Execution Pre-Flight Check** system ensures that all prerequisites for service execution are met before allowing providers to start work. This prevents costly dispatches to jobs where payment is incomplete or products are not delivered.

**Critical Prerequisites**:
1. **Customer Payment**: Fully paid or payment authorized
2. **Product Delivery**: All products delivered to provider or worksite

**Business Impact**:
- Prevents provider wasted trips (cost savings)
- Reduces customer dissatisfaction (no service without products)
- Protects revenue (ensures payment before service)

### 1.2 Key Principles

**Prevention First**: Block execution at check-in, not after dispatch.

**Automation**: System automatically checks prerequisites on eve of service.

**Operator Control**: Operators can manually override with justification (derogation).

**Transparency**: Clear communication to providers and operators on blocking reasons.

---

## 2. Pre-Flight Check Algorithm

### 2.1 Check Execution Timing

**Definition**: "Eve of Service" = **D-1 at 18:00 local time**

Example:
- Service scheduled: **2025-01-20 at 09:00**
- Pre-flight check runs: **2025-01-19 at 18:00**

**Why D-1 at 18:00**:
- Allows time for operator intervention before service day
- Providers receive notification with sufficient notice
- Avoids last-minute cancellations

### 2.2 Check Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ TRIGGER: D-1 at 18:00 for all service orders scheduled D+0 │
│ Background job scans for service orders in next 24h        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ CHECK 1: Payment Status                                    │
│ Query sales system for payment status                      │
│ Expected: FULLY_PAID or PAYMENT_AUTHORIZED                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ CHECK 2: Product Delivery Status                           │
│ Query supply chain system for delivery status              │
│ Expected: FULLY_DELIVERED                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ DECISION: Go Execution Status                              │
│ OK: Both checks pass                                        │
│ NOT_OK: One or both checks fail                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ ACTION:                                                     │
│ - If OK: Allow check-in                                    │
│ - If NOT_OK: Block check-in + Alert operator + Create task │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Pre-Flight Check Function

```typescript
interface PreFlightCheckInput {
  serviceOrderId: string;
  scheduledDate: Date;
  providerId: string;
  customerId: string;
  products: Product[];
}

interface PreFlightCheckResult {
  serviceOrderId: string;
  checkedAt: Date;
  goExecutionStatus: GoExecutionStatus;
  paymentCheck: PaymentCheckResult;
  deliveryCheck: DeliveryCheckResult;
  blockingReasons: string[];
  allowCheckIn: boolean;
  operatorActionRequired: boolean;
}

enum GoExecutionStatus {
  OK = 'OK',
  NOT_OK_PAYMENT = 'NOT_OK_PAYMENT',
  NOT_OK_DELIVERY = 'NOT_OK_DELIVERY',
  NOT_OK_BOTH = 'NOT_OK_BOTH',
  MANUALLY_OVERRIDDEN = 'MANUALLY_OVERRIDDEN'
}

async function executePreFlightCheck(
  input: PreFlightCheckInput
): Promise<PreFlightCheckResult> {
  const checkedAt = new Date();

  // Check 1: Payment Status
  const paymentCheck = await checkPaymentStatus(input.serviceOrderId);

  // Check 2: Product Delivery Status
  const deliveryCheck = await checkProductDeliveryStatus(input.serviceOrderId, input.products);

  // Determine Go Execution status
  const paymentOK = paymentCheck.status === PaymentStatus.FULLY_PAID ||
                    paymentCheck.status === PaymentStatus.PAYMENT_AUTHORIZED;
  const deliveryOK = deliveryCheck.status === DeliveryStatus.FULLY_DELIVERED;

  let goExecutionStatus: GoExecutionStatus;
  const blockingReasons: string[] = [];

  if (paymentOK && deliveryOK) {
    goExecutionStatus = GoExecutionStatus.OK;
  } else if (!paymentOK && !deliveryOK) {
    goExecutionStatus = GoExecutionStatus.NOT_OK_BOTH;
    blockingReasons.push('Payment incomplete', 'Products not delivered');
  } else if (!paymentOK) {
    goExecutionStatus = GoExecutionStatus.NOT_OK_PAYMENT;
    blockingReasons.push('Payment incomplete');
  } else {
    goExecutionStatus = GoExecutionStatus.NOT_OK_DELIVERY;
    blockingReasons.push('Products not delivered');
  }

  const result: PreFlightCheckResult = {
    serviceOrderId: input.serviceOrderId,
    checkedAt,
    goExecutionStatus,
    paymentCheck,
    deliveryCheck,
    blockingReasons,
    allowCheckIn: goExecutionStatus === GoExecutionStatus.OK,
    operatorActionRequired: goExecutionStatus !== GoExecutionStatus.OK
  };

  // Store result
  await preFlightCheckRepository.create(result);

  // Take action based on result
  if (goExecutionStatus !== GoExecutionStatus.OK) {
    await handlePreFlightFailure(result);
  }

  return result;
}
```

---

## 3. Payment Status Integration

### 3.1 Payment Status Values

```typescript
enum PaymentStatus {
  NOT_PAID = 'NOT_PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  FULLY_PAID = 'FULLY_PAID',
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED', // Pre-authorization (hold on card)
  PAYMENT_IN_PROCESS = 'PAYMENT_IN_PROCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUNDED = 'REFUNDED'
}

interface PaymentCheckResult {
  serviceOrderId: string;
  status: PaymentStatus;
  totalAmount: Money;
  paidAmount: Money;
  outstandingAmount: Money;
  paymentMethod?: string;
  lastUpdated: Date;
  salesSystemSource: string; // "pyxis", "tempo", "sap"
  passesCheck: boolean;
  failureReason?: string;
}
```

### 3.2 Payment Check Function

```typescript
async function checkPaymentStatus(
  serviceOrderId: string
): Promise<PaymentCheckResult> {
  const serviceOrder = await serviceOrderRepository.findById(serviceOrderId);

  // Query sales system for payment status via Kafka or REST API
  const paymentInfo = await salesSystemClient.getPaymentStatus({
    salesOrderId: serviceOrder.externalOrderId,
    sourceSystem: serviceOrder.sourceSystem
  });

  const passesCheck =
    paymentInfo.status === PaymentStatus.FULLY_PAID ||
    paymentInfo.status === PaymentStatus.PAYMENT_AUTHORIZED;

  let failureReason: string | undefined;
  if (!passesCheck) {
    if (paymentInfo.status === PaymentStatus.NOT_PAID) {
      failureReason = `Payment not received (€${paymentInfo.outstandingAmount.toFixed(2)} outstanding)`;
    } else if (paymentInfo.status === PaymentStatus.PARTIALLY_PAID) {
      failureReason = `Partial payment only (€${paymentInfo.paidAmount.toFixed(2)} of €${paymentInfo.totalAmount.toFixed(2)} paid)`;
    } else if (paymentInfo.status === PaymentStatus.PAYMENT_FAILED) {
      failureReason = `Payment failed (method: ${paymentInfo.paymentMethod})`;
    } else {
      failureReason = `Payment status: ${paymentInfo.status}`;
    }
  }

  return {
    serviceOrderId,
    status: paymentInfo.status,
    totalAmount: paymentInfo.totalAmount,
    paidAmount: paymentInfo.paidAmount,
    outstandingAmount: paymentInfo.outstandingAmount,
    paymentMethod: paymentInfo.paymentMethod,
    lastUpdated: paymentInfo.lastUpdated,
    salesSystemSource: serviceOrder.sourceSystem,
    passesCheck,
    failureReason
  };
}
```

### 3.3 Payment Status Event (Kafka)

**Topic**: `sales.payment.status_updated`

**Schema**:

```json
{
  "type": "record",
  "name": "PaymentStatusUpdated",
  "namespace": "com.ahs.fsm.events.sales",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "sales_order_id", "type": "string" },
    { "name": "sales_system", "type": { "type": "enum", "symbols": ["PYXIS", "TEMPO", "SAP"] }},
    { "name": "payment_status", "type": { "type": "enum", "symbols": ["NOT_PAID", "PARTIALLY_PAID", "FULLY_PAID", "PAYMENT_AUTHORIZED", "PAYMENT_IN_PROCESS", "PAYMENT_FAILED", "REFUNDED"] }},
    { "name": "total_amount", "type": "double" },
    { "name": "paid_amount", "type": "double" },
    { "name": "outstanding_amount", "type": "double" },
    { "name": "currency", "type": "string" },
    { "name": "payment_method", "type": ["null", "string"], "default": null },
    { "name": "payment_date", "type": ["null", "long"], "logicalType": "timestamp-millis", "default": null }
  ]
}
```

---

## 4. Product Delivery Status Integration

### 4.1 Delivery Status Values

```typescript
enum DeliveryStatus {
  NOT_DELIVERED = 'NOT_DELIVERED',
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  FULLY_DELIVERED = 'FULLY_DELIVERED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  RETURNED = 'RETURNED'
}

interface DeliveryCheckResult {
  serviceOrderId: string;
  status: DeliveryStatus;
  products: ProductDeliveryStatus[];
  deliveryLocation: 'PROVIDER' | 'WORKSITE' | 'WAREHOUSE';
  deliveryDate?: Date;
  trackingNumber?: string;
  supplyChainSource: string;
  passesCheck: boolean;
  failureReason?: string;
}

interface ProductDeliveryStatus {
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityDelivered: number;
  deliveryStatus: DeliveryStatus;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
}
```

### 4.2 Product Delivery Check Function

```typescript
async function checkProductDeliveryStatus(
  serviceOrderId: string,
  products: Product[]
): Promise<DeliveryCheckResult> {
  const serviceOrder = await serviceOrderRepository.findById(serviceOrderId);

  // Query supply chain system for delivery status via Kafka or REST API
  const deliveryInfo = await supplyChainClient.getDeliveryStatus({
    salesOrderId: serviceOrder.externalOrderId,
    sourceSystem: serviceOrder.sourceSystem,
    productIds: products.map(p => p.productId)
  });

  // Check each product
  const productStatuses: ProductDeliveryStatus[] = products.map(product => {
    const deliveryStatus = deliveryInfo.products.find(p => p.productId === product.productId);
    return {
      productId: product.productId,
      productName: product.name,
      quantityOrdered: product.quantity,
      quantityDelivered: deliveryStatus?.quantityDelivered || 0,
      deliveryStatus: deliveryStatus?.status || DeliveryStatus.NOT_DELIVERED,
      expectedDeliveryDate: deliveryStatus?.expectedDeliveryDate,
      actualDeliveryDate: deliveryStatus?.actualDeliveryDate
    };
  });

  // All products must be fully delivered
  const allDelivered = productStatuses.every(
    p => p.deliveryStatus === DeliveryStatus.FULLY_DELIVERED
  );

  const passesCheck = allDelivered;

  let failureReason: string | undefined;
  if (!passesCheck) {
    const notDelivered = productStatuses.filter(
      p => p.deliveryStatus !== DeliveryStatus.FULLY_DELIVERED
    );
    failureReason = `${notDelivered.length} product(s) not delivered: ${notDelivered.map(p => p.productName).join(', ')}`;
  }

  return {
    serviceOrderId,
    status: allDelivered ? DeliveryStatus.FULLY_DELIVERED :
            productStatuses.some(p => p.quantityDelivered > 0) ? DeliveryStatus.PARTIALLY_DELIVERED :
            DeliveryStatus.NOT_DELIVERED,
    products: productStatuses,
    deliveryLocation: deliveryInfo.deliveryLocation,
    deliveryDate: deliveryInfo.deliveryDate,
    trackingNumber: deliveryInfo.trackingNumber,
    supplyChainSource: deliveryInfo.source,
    passesCheck,
    failureReason
  };
}
```

### 4.3 Product Delivery Event (Kafka)

**Topic**: `supply_chain.delivery.status_updated`

**Schema**:

```json
{
  "type": "record",
  "name": "DeliveryStatusUpdated",
  "namespace": "com.ahs.fsm.events.supply_chain",
  "fields": [
    { "name": "event_id", "type": "string" },
    { "name": "event_timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "sales_order_id", "type": "string" },
    { "name": "sales_system", "type": { "type": "enum", "symbols": ["PYXIS", "TEMPO", "SAP"] }},
    { "name": "delivery_status", "type": { "type": "enum", "symbols": ["NOT_DELIVERED", "PARTIALLY_DELIVERED", "FULLY_DELIVERED", "IN_TRANSIT", "DELIVERY_FAILED", "RETURNED"] }},
    { "name": "delivery_location", "type": { "type": "enum", "symbols": ["PROVIDER", "WORKSITE", "WAREHOUSE"] }},
    { "name": "delivery_date", "type": ["null", "long"], "logicalType": "timestamp-millis", "default": null },
    { "name": "tracking_number", "type": ["null", "string"], "default": null },
    { "name": "products", "type": {
      "type": "array",
      "items": {
        "type": "record",
        "name": "ProductDelivery",
        "fields": [
          { "name": "product_id", "type": "string" },
          { "name": "product_name", "type": "string" },
          { "name": "quantity_ordered", "type": "int" },
          { "name": "quantity_delivered", "type": "int" },
          { "name": "delivery_status", "type": "string" },
          { "name": "expected_delivery_date", "type": ["null", "long"], "logicalType": "timestamp-millis", "default": null }
        ]
      }
    }}
  ]
}
```

---

## 5. Alert & Task Management

### 5.1 Pre-Flight Failure Handling

```typescript
async function handlePreFlightFailure(
  checkResult: PreFlightCheckResult
): Promise<void> {
  const serviceOrder = await serviceOrderRepository.findById(checkResult.serviceOrderId);

  // Update service order status
  await serviceOrderRepository.update(checkResult.serviceOrderId, {
    goExecutionStatus: checkResult.goExecutionStatus,
    goExecutionBlockedAt: checkResult.checkedAt,
    goExecutionBlockingReasons: checkResult.blockingReasons
  });

  // Create alert
  const alert = await createPreFlightAlert(checkResult, serviceOrder);

  // Create task for operator
  const task = await createPreFlightTask(checkResult, serviceOrder);

  // Send Kafka event
  await kafkaProducer.send({
    topic: 'execution.preflight.check_failed',
    key: checkResult.serviceOrderId,
    value: {
      serviceOrderId: checkResult.serviceOrderId,
      goExecutionStatus: checkResult.goExecutionStatus,
      blockingReasons: checkResult.blockingReasons,
      alertId: alert.id,
      taskId: task.id,
      scheduledDate: serviceOrder.scheduledSlot?.timeSlot.startTime
    }
  });

  // Notify provider (warning)
  await notificationService.sendPreFlightWarningToProvider(
    serviceOrder.providerId,
    checkResult
  );

  // Notify operator (urgent)
  await notificationService.sendPreFlightAlertToOperator(
    checkResult,
    task.assignedTo
  );
}
```

### 5.2 Alert Creation

```typescript
interface PreFlightAlert {
  id: string;
  serviceOrderId: string;
  alertType: 'GO_EXECUTION_BLOCKED';
  severity: 'CRITICAL';
  title: string;
  message: string;
  blockingReasons: string[];
  paymentStatus?: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  scheduledDate: Date;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

async function createPreFlightAlert(
  checkResult: PreFlightCheckResult,
  serviceOrder: ServiceOrder
): Promise<PreFlightAlert> {
  const title = `Go Execution Blocked: ${serviceOrder.id}`;
  const message = `Service order scheduled for ${formatDate(serviceOrder.scheduledSlot.timeSlot.startTime)} cannot proceed. Reasons: ${checkResult.blockingReasons.join(', ')}`;

  const alert = await alertRepository.create({
    serviceOrderId: checkResult.serviceOrderId,
    alertType: 'GO_EXECUTION_BLOCKED',
    severity: 'CRITICAL',
    title,
    message,
    blockingReasons: checkResult.blockingReasons,
    paymentStatus: checkResult.paymentCheck.status,
    deliveryStatus: checkResult.deliveryCheck.status,
    scheduledDate: serviceOrder.scheduledSlot.timeSlot.startTime,
    createdAt: new Date(),
    acknowledged: false
  });

  return alert;
}
```

### 5.3 Task Creation

```typescript
interface PreFlightTask {
  id: string;
  taskType: 'PRE_FLIGHT_FAILURE';
  serviceOrderId: string;
  title: string;
  description: string;
  priority: 'URGENT';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  blockingReasons: string[];
  suggestedActions: string[];
  assignedTo?: string;
  createdAt: Date;
  dueDate: Date; // Before service scheduled time
  completedAt?: Date;
  completedBy?: string;
  resolution?: string;
}

async function createPreFlightTask(
  checkResult: PreFlightCheckResult,
  serviceOrder: ServiceOrder
): Promise<PreFlightTask> {
  const suggestedActions: string[] = [];

  if (checkResult.goExecutionStatus === GoExecutionStatus.NOT_OK_PAYMENT ||
      checkResult.goExecutionStatus === GoExecutionStatus.NOT_OK_BOTH) {
    suggestedActions.push('Contact customer for payment');
    suggestedActions.push('Reschedule service order to later date');
    suggestedActions.push('Manually authorize Go Execution (derogation)');
  }

  if (checkResult.goExecutionStatus === GoExecutionStatus.NOT_OK_DELIVERY ||
      checkResult.goExecutionStatus === GoExecutionStatus.NOT_OK_BOTH) {
    suggestedActions.push('Contact supply chain for delivery ETA');
    suggestedActions.push('Reschedule service order to after delivery');
    suggestedActions.push('Manually authorize Go Execution (derogation)');
  }

  const task = await taskRepository.create({
    taskType: 'PRE_FLIGHT_FAILURE',
    serviceOrderId: checkResult.serviceOrderId,
    title: `Resolve Go Execution Block: ${serviceOrder.id}`,
    description: `Service order cannot proceed due to: ${checkResult.blockingReasons.join(', ')}. Take action before ${formatDateTime(serviceOrder.scheduledSlot.timeSlot.startTime)}.`,
    priority: 'URGENT',
    status: 'open',
    blockingReasons: checkResult.blockingReasons,
    suggestedActions,
    assignedTo: await getOperatorForServiceOrder(serviceOrder),
    createdAt: new Date(),
    dueDate: subHours(serviceOrder.scheduledSlot.timeSlot.startTime, 2) // 2 hours before service
  });

  return task;
}
```

---

## 6. Check-In Block Enforcement

### 6.1 Check-In Authorization Check

```typescript
interface CheckInAuthorizationRequest {
  serviceOrderId: string;
  providerId: string;
  crewId: string;
  location: GeoLocation;
  timestamp: Date;
}

interface CheckInAuthorizationResult {
  authorized: boolean;
  blockReason?: string;
  goExecutionStatus: GoExecutionStatus;
  requiresManualOverride: boolean;
  overrideRequestUrl?: string;
}

async function authorizeCheckIn(
  request: CheckInAuthorizationRequest
): Promise<CheckInAuthorizationResult> {
  const serviceOrder = await serviceOrderRepository.findById(request.serviceOrderId);

  // Check if Go Execution status is OK or manually overridden
  const goExecutionOK =
    serviceOrder.goExecutionStatus === GoExecutionStatus.OK ||
    serviceOrder.goExecutionStatus === GoExecutionStatus.MANUALLY_OVERRIDDEN;

  if (goExecutionOK) {
    return {
      authorized: true,
      goExecutionStatus: serviceOrder.goExecutionStatus,
      requiresManualOverride: false
    };
  }

  // Block check-in
  let blockReason: string;
  if (serviceOrder.goExecutionStatus === GoExecutionStatus.NOT_OK_PAYMENT) {
    blockReason = 'Payment incomplete. Cannot start service.';
  } else if (serviceOrder.goExecutionStatus === GoExecutionStatus.NOT_OK_DELIVERY) {
    blockReason = 'Products not delivered. Cannot start service.';
  } else {
    blockReason = 'Payment incomplete and products not delivered. Cannot start service.';
  }

  return {
    authorized: false,
    blockReason,
    goExecutionStatus: serviceOrder.goExecutionStatus,
    requiresManualOverride: true,
    overrideRequestUrl: `/api/v1/service-orders/${request.serviceOrderId}/request-override`
  };
}
```

### 6.2 Mobile App UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Provider Mobile App: Check-In Button Pressed                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Call API: POST /api/v1/check-in/authorize                  │
│ { serviceOrderId, providerId, crewId, location }           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────┴──────┐
                    │             │
            Authorized?         Not Authorized
                    │             │
                    ▼             ▼
        ┌───────────────┐   ┌────────────────────────────┐
        │ Allow Check-In│   │ Show Block Screen          │
        │ Proceed Normal│   │ "Cannot start service"     │
        └───────────────┘   │ Reason: Payment incomplete │
                            │ "Contact operator for help"│
                            │ [Contact Operator Button]  │
                            └────────────────────────────┘
```

---

## 7. Manual Override (Derogation)

### 7.1 Override Request

```typescript
interface ManualOverrideRequest {
  serviceOrderId: string;
  requestedBy: string; // Operator or Provider user ID
  requestedAt: Date;
  justification: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ManualOverride {
  id: string;
  serviceOrderId: string;
  requestedBy: string;
  requestedAt: Date;
  justification: string;
  urgencyLevel: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

async function requestManualOverride(
  request: ManualOverrideRequest
): Promise<ManualOverride> {
  const override = await manualOverrideRepository.create({
    ...request,
    status: 'pending'
  });

  // Notify supervisor for approval
  await notificationService.sendOverrideRequestToSupervisor(override);

  return override;
}
```

### 7.2 Override Approval

```typescript
async function approveManualOverride(
  overrideId: string,
  approverUserId: string,
  approvalNotes?: string
): Promise<void> {
  const override = await manualOverrideRepository.findById(overrideId);

  // Update override status
  await manualOverrideRepository.update(overrideId, {
    status: 'approved',
    approvedBy: approverUserId,
    approvedAt: new Date()
  });

  // Update service order Go Execution status
  await serviceOrderRepository.update(override.serviceOrderId, {
    goExecutionStatus: GoExecutionStatus.MANUALLY_OVERRIDDEN,
    goExecutionOverrideId: overrideId,
    goExecutionOverriddenAt: new Date(),
    goExecutionOverriddenBy: approverUserId
  });

  // Send Kafka event
  await kafkaProducer.send({
    topic: 'execution.preflight.manually_overridden',
    key: override.serviceOrderId,
    value: {
      serviceOrderId: override.serviceOrderId,
      overrideId,
      approvedBy: approverUserId,
      justification: override.justification
    }
  });

  // Notify provider (check-in now allowed)
  await notificationService.sendOverrideApprovedToProvider(override);

  // Notify requester
  await notificationService.sendOverrideApprovedToRequester(override);
}
```

### 7.3 Override Rejection

```typescript
async function rejectManualOverride(
  overrideId: string,
  rejectorUserId: string,
  rejectionReason: string
): Promise<void> {
  const override = await manualOverrideRepository.findById(overrideId);

  // Update override status
  await manualOverrideRepository.update(overrideId, {
    status: 'rejected',
    rejectedBy: rejectorUserId,
    rejectedAt: new Date(),
    rejectionReason
  });

  // Notify requester
  await notificationService.sendOverrideRejectedToRequester(override, rejectionReason);
}
```

---

## 8. Configuration & Business Rules

### 8.1 Pre-Flight Check Configuration

```typescript
interface PreFlightCheckConfig {
  enabled: boolean;
  checkTimingHours: number; // Hours before service (default: 14 hours = D-1 at 18:00 for 08:00 service)
  requirePaymentCheck: boolean;
  requireDeliveryCheck: boolean;

  paymentCheckRules: {
    acceptedStatuses: PaymentStatus[];
  };

  deliveryCheckRules: {
    acceptedStatuses: DeliveryStatus[];
    allowPartialDelivery: boolean; // If true, PARTIALLY_DELIVERED passes check
  };

  alertSettings: {
    notifyOperator: boolean;
    notifyProvider: boolean;
    notifyCustomer: boolean;
  };

  overrideSettings: {
    requireApproval: boolean;
    approverRoles: string[]; // e.g., ["SUPERVISOR", "MANAGER"]
    maxPendingOverrides: number;
  };
}

const defaultConfig: PreFlightCheckConfig = {
  enabled: true,
  checkTimingHours: 14, // D-1 at 18:00 for next day 08:00 service
  requirePaymentCheck: true,
  requireDeliveryCheck: true,

  paymentCheckRules: {
    acceptedStatuses: [PaymentStatus.FULLY_PAID, PaymentStatus.PAYMENT_AUTHORIZED]
  },

  deliveryCheckRules: {
    acceptedStatuses: [DeliveryStatus.FULLY_DELIVERED],
    allowPartialDelivery: false
  },

  alertSettings: {
    notifyOperator: true,
    notifyProvider: true,
    notifyCustomer: false
  },

  overrideSettings: {
    requireApproval: true,
    approverRoles: ['SUPERVISOR', 'MANAGER'],
    maxPendingOverrides: 5
  }
};
```

---

## 9. Data Model

### 9.1 Database Schema

**Pre-Flight Check Results Table**:

```sql
CREATE TABLE preflight_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  go_execution_status VARCHAR(50) NOT NULL CHECK (go_execution_status IN ('OK', 'NOT_OK_PAYMENT', 'NOT_OK_DELIVERY', 'NOT_OK_BOTH', 'MANUALLY_OVERRIDDEN')),

  payment_status VARCHAR(50),
  payment_passed BOOLEAN NOT NULL,
  payment_failure_reason TEXT,

  delivery_status VARCHAR(50),
  delivery_passed BOOLEAN NOT NULL,
  delivery_failure_reason TEXT,

  blocking_reasons TEXT[],
  allow_checkin BOOLEAN NOT NULL,
  operator_action_required BOOLEAN NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_preflight_service_order ON preflight_check_results(service_order_id);
CREATE INDEX idx_preflight_status ON preflight_check_results(go_execution_status);
CREATE INDEX idx_preflight_checked_at ON preflight_check_results(checked_at);
```

**Manual Overrides Table**:

```sql
CREATE TABLE manual_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  justification TEXT NOT NULL,
  urgency_level VARCHAR(20) NOT NULL CHECK (urgency_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejected_by VARCHAR(255),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_override_service_order ON manual_overrides(service_order_id);
CREATE INDEX idx_override_status ON manual_overrides(status);
CREATE INDEX idx_override_requested_at ON manual_overrides(requested_at);
```

**Service Orders Table Update**:

```sql
ALTER TABLE service_orders ADD COLUMN go_execution_status VARCHAR(50);
ALTER TABLE service_orders ADD COLUMN go_execution_blocked_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN go_execution_blocking_reasons TEXT[];
ALTER TABLE service_orders ADD COLUMN go_execution_override_id UUID REFERENCES manual_overrides(id);
ALTER TABLE service_orders ADD COLUMN go_execution_overridden_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN go_execution_overridden_by VARCHAR(255);

CREATE INDEX idx_so_go_execution_status ON service_orders(go_execution_status);
```

---

## 10. API Examples

### 10.1 Execute Pre-Flight Check (Background Job)

**POST** `/api/v1/preflight/check`

**Request**:

```json
{
  "serviceOrderIds": ["so_abc123", "so_xyz789"],
  "forceRecheck": false
}
```

**Response**:

```json
{
  "checksExecuted": 2,
  "results": [
    {
      "serviceOrderId": "so_abc123",
      "goExecutionStatus": "OK",
      "paymentCheck": {
        "status": "FULLY_PAID",
        "passesCheck": true
      },
      "deliveryCheck": {
        "status": "FULLY_DELIVERED",
        "passesCheck": true
      },
      "allowCheckIn": true,
      "operatorActionRequired": false
    },
    {
      "serviceOrderId": "so_xyz789",
      "goExecutionStatus": "NOT_OK_DELIVERY",
      "paymentCheck": {
        "status": "FULLY_PAID",
        "passesCheck": true
      },
      "deliveryCheck": {
        "status": "PARTIALLY_DELIVERED",
        "passesCheck": false,
        "failureReason": "2 product(s) not delivered: Kitchen Cabinet, Countertop"
      },
      "blockingReasons": ["Products not delivered"],
      "allowCheckIn": false,
      "operatorActionRequired": true,
      "alertId": "alert_def456",
      "taskId": "task_ghi789"
    }
  ]
}
```

### 10.2 Authorize Check-In

**POST** `/api/v1/check-in/authorize`

**Request**:

```json
{
  "serviceOrderId": "so_xyz789",
  "providerId": "prov_123",
  "crewId": "crew_456",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "timestamp": "2025-01-20T08:55:00Z"
}
```

**Response (Blocked)**:

```json
{
  "authorized": false,
  "blockReason": "Products not delivered. Cannot start service.",
  "goExecutionStatus": "NOT_OK_DELIVERY",
  "requiresManualOverride": true,
  "overrideRequestUrl": "/api/v1/service-orders/so_xyz789/request-override",
  "operatorContact": {
    "phone": "+33 1 23 45 67 89",
    "email": "ops-team@yellowgrid.com"
  }
}
```

**Response (Authorized)**:

```json
{
  "authorized": true,
  "goExecutionStatus": "OK",
  "requiresManualOverride": false,
  "checkInId": "checkin_jkl012",
  "message": "Check-in authorized. Proceed with service."
}
```

### 10.3 Request Manual Override

**POST** `/api/v1/service-orders/{serviceOrderId}/request-override`

**Request**:

```json
{
  "requestedBy": "operator_user_123",
  "justification": "Customer confirmed payment will be processed today. Product delivery expected in 2 hours.",
  "urgencyLevel": "HIGH"
}
```

**Response**:

```json
{
  "overrideId": "override_mno345",
  "serviceOrderId": "so_xyz789",
  "status": "pending",
  "requestedAt": "2025-01-20T07:00:00Z",
  "message": "Override request submitted for supervisor approval.",
  "expectedResponseTime": "Within 30 minutes"
}
```

### 10.4 Approve Manual Override

**POST** `/api/v1/overrides/{overrideId}/approve`

**Request**:

```json
{
  "approverUserId": "supervisor_456",
  "approvalNotes": "Approved due to confirmed payment and imminent delivery."
}
```

**Response**:

```json
{
  "overrideId": "override_mno345",
  "status": "approved",
  "approvedBy": "supervisor_456",
  "approvedAt": "2025-01-20T07:15:00Z",
  "serviceOrder": {
    "id": "so_xyz789",
    "goExecutionStatus": "MANUALLY_OVERRIDDEN",
    "checkInAllowed": true
  },
  "message": "Override approved. Provider can now check in."
}
```

---

## Appendix A: Metrics & KPIs

### Operational Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Pre-Flight Check Success Rate** | ≥ 95% | % of checks that pass (OK status) |
| **Payment Block Rate** | < 3% | % of orders blocked due to payment |
| **Delivery Block Rate** | < 2% | % of orders blocked due to delivery |
| **Manual Override Rate** | < 1% | % of orders requiring manual override |
| **Average Override Approval Time** | < 30 min | Time from request to approval |
| **Prevented Provider Trips** | Track | # of trips prevented by pre-flight checks |

### Business Impact Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Cost Savings from Prevented Trips** | €50k/month | Estimated savings from avoiding wasted provider dispatches |
| **Customer Satisfaction (CSAT)** | ≥ 4.5/5 | Customer rating when service proceeds without issues |
| **Provider Satisfaction** | ≥ 4.0/5 | Provider rating of pre-flight check usefulness |

---

**End of Document**
