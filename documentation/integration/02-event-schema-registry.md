# Event Schema Registry

## Overview

This document defines the complete event schema registry for the Field Service Management system. All events are defined using Apache Avro for schema evolution and type safety.

## Schema Registry Architecture

### Schema Versioning

```typescript
interface SchemaVersion {
  namespace: string;
  name: string;
  version: number;
  schema: AvroSchema;
  compatibility: 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';
  createdAt: Date;
  deprecatedAt?: Date;
}
```

### Compatibility Rules

- **BACKWARD**: New schema can read old data (add optional fields, remove fields)
- **FORWARD**: Old schema can read new data (add fields with defaults, remove optional fields)
- **FULL**: Both backward and forward compatible
- **NONE**: Breaking changes allowed

## Domain Event Categories

### 1. Order Events
### 2. Appointment Events
### 3. Technician Events
### 4. Payment Events
### 5. Document Events
### 6. Communication Events
### 7. Master Data Events

### 8. Chat Events

---

## Order Domain Events

### OrderCreated

```json
{
  "namespace": "com.fsm.events.order",
  "type": "record",
  "name": "OrderCreated",
  "version": 2,
  "fields": [
    {
      "name": "eventId",
      "type": "string",
      "doc": "Unique event identifier (UUID v4)"
    },
    {
      "name": "correlationId",
      "type": "string",
      "doc": "Correlation ID for request tracing"
    },
    {
      "name": "timestamp",
      "type": {
        "type": "long",
        "logicalType": "timestamp-millis"
      },
      "doc": "Event timestamp in milliseconds since epoch"
    },
    {
      "name": "orderId",
      "type": "string",
      "doc": "Unique order identifier"
    },
    {
      "name": "tenantId",
      "type": "string",
      "doc": "Tenant identifier for multi-tenancy"
    },
    {
      "name": "customerId",
      "type": "string",
      "doc": "Customer identifier"
    },
    {
      "name": "orderType",
      "type": {
        "type": "enum",
        "name": "OrderType",
        "symbols": ["INSTALLATION", "REPAIR", "MAINTENANCE", "UPGRADE", "INSPECTION"]
      }
    },
    {
      "name": "priority",
      "type": {
        "type": "enum",
        "name": "Priority",
        "symbols": ["LOW", "MEDIUM", "HIGH", "URGENT", "EMERGENCY"]
      },
      "default": "MEDIUM"
    },
    {
      "name": "serviceAddress",
      "type": {
        "type": "record",
        "name": "ServiceAddress",
        "fields": [
          {"name": "street", "type": "string"},
          {"name": "city", "type": "string"},
          {"name": "state", "type": "string"},
          {"name": "postalCode", "type": "string"},
          {"name": "country", "type": "string"},
          {"name": "latitude", "type": ["null", "double"], "default": null},
          {"name": "longitude", "type": ["null", "double"], "default": null}
        ]
      }
    },
    {
      "name": "serviceItems",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "ServiceItem",
          "fields": [
            {"name": "itemId", "type": "string"},
            {"name": "productId", "type": "string"},
            {"name": "productName", "type": "string"},
            {"name": "quantity", "type": "int"},
            {"name": "unitPrice", "type": {
              "type": "record",
              "name": "Money",
              "fields": [
                {"name": "amount", "type": "string"},
                {"name": "currency", "type": "string"}
              ]
            }}
          ]
        }
      }
    },
    {
      "name": "totalAmount",
      "type": "Money"
    },
    {
      "name": "schedulingPreferences",
      "type": {
        "type": "record",
        "name": "SchedulingPreferences",
        "fields": [
          {"name": "preferredDate", "type": ["null", {"type": "int", "logicalType": "date"}], "default": null},
          {"name": "timeWindowStart", "type": ["null", "string"], "default": null},
          {"name": "timeWindowEnd", "type": ["null", "string"], "default": null},
          {"name": "technicianPreference", "type": ["null", "string"], "default": null}
        ]
      }
    },
    {
      "name": "metadata",
      "type": {
        "type": "map",
        "values": "string"
      },
      "default": {}
    }
  ]
}
```

### OrderUpdated

```json
{
  "namespace": "com.fsm.events.order",
  "type": "record",
  "name": "OrderUpdated",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "changes",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "FieldChange",
          "fields": [
            {"name": "field", "type": "string"},
            {"name": "oldValue", "type": ["null", "string"]},
            {"name": "newValue", "type": ["null", "string"]}
          ]
        }
      }
    },
    {"name": "updatedBy", "type": "string"},
    {"name": "reason", "type": ["null", "string"], "default": null}
  ]
}
```

### OrderStatusChanged

```json
{
  "namespace": "com.fsm.events.order",
  "type": "record",
  "name": "OrderStatusChanged",
  "version": 2,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "previousStatus",
      "type": {
        "type": "enum",
        "name": "OrderStatus",
        "symbols": [
          "DRAFT",
          "PENDING_APPROVAL",
          "APPROVED",
          "SCHEDULED",
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED",
          "ON_HOLD"
        ]
      }
    },
    {"name": "newStatus", "type": "OrderStatus"},
    {"name": "reason", "type": ["null", "string"], "default": null},
    {"name": "changedBy", "type": "string"},
    {
      "name": "statusMetadata",
      "type": {
        "type": "map",
        "values": "string"
      },
      "default": {}
    }
  ]
}
```

### OrderCancelled

```json
{
  "namespace": "com.fsm.events.order",
  "type": "record",
  "name": "OrderCancelled",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "cancellationReason",
      "type": {
        "type": "enum",
        "name": "CancellationReason",
        "symbols": [
          "CUSTOMER_REQUEST",
          "RESOURCE_UNAVAILABLE",
          "DUPLICATE_ORDER",
          "BILLING_ISSUE",
          "OUT_OF_SERVICE_AREA",
          "OTHER"
        ]
      }
    },
    {"name": "cancellationDetails", "type": ["null", "string"], "default": null},
    {"name": "cancelledBy", "type": "string"},
    {"name": "refundRequired", "type": "boolean", "default": false}
  ]
}
```

---

## Appointment Domain Events

### AppointmentScheduled

```json
{
  "namespace": "com.fsm.events.appointment",
  "type": "record",
  "name": "AppointmentScheduled",
  "version": 2,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "appointmentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "technicianId", "type": "string"},
    {
      "name": "scheduledStart",
      "type": {"type": "long", "logicalType": "timestamp-millis"}
    },
    {
      "name": "scheduledEnd",
      "type": {"type": "long", "logicalType": "timestamp-millis"}
    },
    {
      "name": "duration",
      "type": "int",
      "doc": "Duration in minutes"
    },
    {
      "name": "slotInfo",
      "type": {
        "type": "record",
        "name": "SlotInfo",
        "fields": [
          {"name": "slotId", "type": "string"},
          {"name": "slotType", "type": {"type": "enum", "name": "SlotType", "symbols": ["MORNING", "AFTERNOON", "EVENING", "FULL_DAY", "EMERGENCY"]}},
          {"name": "capacityUsed", "type": "int"},
          {"name": "capacityTotal", "type": "int"}
        ]
      }
    },
    {
      "name": "travelInfo",
      "type": {
        "type": "record",
        "name": "TravelInfo",
        "fields": [
          {"name": "estimatedTravelTime", "type": "int", "doc": "Travel time in minutes"},
          {"name": "travelDistance", "type": "double", "doc": "Distance in kilometers"},
          {"name": "previousAppointmentId", "type": ["null", "string"], "default": null}
        ]
      }
    },
    {
      "name": "notifications",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "NotificationSchedule",
          "fields": [
            {"name": "type", "type": {"type": "enum", "name": "NotificationType", "symbols": ["SMS", "EMAIL", "PUSH"]}},
            {"name": "scheduledTime", "type": {"type": "long", "logicalType": "timestamp-millis"}},
            {"name": "sent", "type": "boolean", "default": false}
          ]
        }
      },
      "default": []
    }
  ]
}
```

### AppointmentRescheduled

```json
{
  "namespace": "com.fsm.events.appointment",
  "type": "record",
  "name": "AppointmentRescheduled",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "appointmentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "previousSchedule",
      "type": {
        "type": "record",
        "name": "Schedule",
        "fields": [
          {"name": "start", "type": {"type": "long", "logicalType": "timestamp-millis"}},
          {"name": "end", "type": {"type": "long", "logicalType": "timestamp-millis"}},
          {"name": "technicianId", "type": "string"}
        ]
      }
    },
    {
      "name": "newSchedule",
      "type": "Schedule"
    },
    {
      "name": "reschedulingReason",
      "type": {
        "type": "enum",
        "name": "ReschedulingReason",
        "symbols": [
          "CUSTOMER_REQUEST",
          "TECHNICIAN_UNAVAILABLE",
          "WEATHER",
          "EMERGENCY_PRIORITY",
          "PARTS_DELAY",
          "OPTIMIZATION",
          "OTHER"
        ]
      }
    },
    {"name": "rescheduledBy", "type": "string"},
    {"name": "notifyCustomer", "type": "boolean", "default": true}
  ]
}
```

### AppointmentCompleted

```json
{
  "namespace": "com.fsm.events.appointment",
  "type": "record",
  "name": "AppointmentCompleted",
  "version": 2,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "appointmentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "technicianId", "type": "string"},
    {
      "name": "actualStart",
      "type": {"type": "long", "logicalType": "timestamp-millis"}
    },
    {
      "name": "actualEnd",
      "type": {"type": "long", "logicalType": "timestamp-millis"}
    },
    {
      "name": "workPerformed",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "WorkItem",
          "fields": [
            {"name": "itemId", "type": "string"},
            {"name": "description", "type": "string"},
            {"name": "duration", "type": "int", "doc": "Duration in minutes"},
            {"name": "outcome", "type": {"type": "enum", "name": "WorkOutcome", "symbols": ["COMPLETED", "PARTIALLY_COMPLETED", "NOT_COMPLETED"]}}
          ]
        }
      }
    },
    {
      "name": "partsUsed",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "PartUsage",
          "fields": [
            {"name": "partId", "type": "string"},
            {"name": "partName", "type": "string"},
            {"name": "quantity", "type": "int"},
            {"name": "serialNumbers", "type": {"type": "array", "items": "string"}, "default": []}
          ]
        }
      },
      "default": []
    },
    {
      "name": "photos",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "Photo",
          "fields": [
            {"name": "photoId", "type": "string"},
            {"name": "url", "type": "string"},
            {"name": "caption", "type": ["null", "string"], "default": null},
            {"name": "takenAt", "type": {"type": "long", "logicalType": "timestamp-millis"}}
          ]
        }
      },
      "default": []
    },
    {
      "name": "customerSignature",
      "type": ["null", {
        "type": "record",
        "name": "Signature",
        "fields": [
          {"name": "signatureId", "type": "string"},
          {"name": "signatureUrl", "type": "string"},
          {"name": "signedAt", "type": {"type": "long", "logicalType": "timestamp-millis"}},
          {"name": "signedBy", "type": "string"}
        ]
      }],
      "default": null
    },
    {"name": "notes", "type": ["null", "string"], "default": null},
    {"name": "requiresFollowUp", "type": "boolean", "default": false},
    {"name": "followUpReason", "type": ["null", "string"], "default": null}
  ]
}
```

### AppointmentCancelled

```json
{
  "namespace": "com.fsm.events.appointment",
  "type": "record",
  "name": "AppointmentCancelled",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "appointmentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "cancellationReason",
      "type": {
        "type": "enum",
        "name": "AppointmentCancellationReason",
        "symbols": [
          "ORDER_CANCELLED",
          "CUSTOMER_NO_SHOW",
          "TECHNICIAN_UNAVAILABLE",
          "WEATHER",
          "EMERGENCY",
          "DUPLICATE",
          "OTHER"
        ]
      }
    },
    {"name": "cancellationDetails", "type": ["null", "string"], "default": null},
    {"name": "cancelledBy", "type": "string"},
    {"name": "notifyCustomer", "type": "boolean", "default": true},
    {"name": "rescheduleRequired", "type": "boolean", "default": false}
  ]
}
```

---

## Technician Domain Events

### TechnicianAssigned

```json
{
  "namespace": "com.fsm.events.technician",
  "type": "record",
  "name": "TechnicianAssigned",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "assignmentId", "type": "string"},
    {"name": "technicianId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "appointmentId", "type": ["null", "string"], "default": null},
    {"name": "tenantId", "type": "string"},
    {
      "name": "assignmentType",
      "type": {
        "type": "enum",
        "name": "AssignmentType",
        "symbols": ["PRIMARY", "BACKUP", "TEAM_MEMBER", "SUPERVISOR"]
      }
    },
    {
      "name": "skillsMatched",
      "type": {
        "type": "array",
        "items": "string"
      }
    },
    {"name": "assignedBy", "type": "string"},
    {"name": "notifyTechnician", "type": "boolean", "default": true}
  ]
}
```

### TechnicianLocationUpdated

```json
{
  "namespace": "com.fsm.events.technician",
  "type": "record",
  "name": "TechnicianLocationUpdated",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "technicianId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "location",
      "type": {
        "type": "record",
        "name": "GeoLocation",
        "fields": [
          {"name": "latitude", "type": "double"},
          {"name": "longitude", "type": "double"},
          {"name": "accuracy", "type": "double", "doc": "Accuracy in meters"},
          {"name": "altitude", "type": ["null", "double"], "default": null},
          {"name": "speed", "type": ["null", "double"], "default": null, "doc": "Speed in m/s"},
          {"name": "heading", "type": ["null", "double"], "default": null, "doc": "Heading in degrees"}
        ]
      }
    },
    {"name": "currentAppointmentId", "type": ["null", "string"], "default": null},
    {
      "name": "status",
      "type": {
        "type": "enum",
        "name": "TechnicianStatus",
        "symbols": ["AVAILABLE", "EN_ROUTE", "ON_SITE", "ON_BREAK", "OFFLINE"]
      }
    }
  ]
}
```

### TechnicianAvailabilityChanged

```json
{
  "namespace": "com.fsm.events.technician",
  "type": "record",
  "name": "TechnicianAvailabilityChanged",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "technicianId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "previousStatus",
      "type": "TechnicianStatus"
    },
    {
      "name": "newStatus",
      "type": "TechnicianStatus"
    },
    {
      "name": "reason",
      "type": ["null", "string"],
      "default": null
    },
    {
      "name": "effectiveFrom",
      "type": {"type": "long", "logicalType": "timestamp-millis"}
    },
    {
      "name": "effectiveUntil",
      "type": ["null", {"type": "long", "logicalType": "timestamp-millis"}],
      "default": null
    }
  ]
}
```

---

## Payment Domain Events

### PaymentInitiated

```json
{
  "namespace": "com.fsm.events.payment",
  "type": "record",
  "name": "PaymentInitiated",
  "version": 2,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "paymentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {
      "name": "amount",
      "type": {
        "type": "record",
        "name": "PaymentAmount",
        "fields": [
          {"name": "subtotal", "type": "string"},
          {"name": "tax", "type": "string"},
          {"name": "total", "type": "string"},
          {"name": "currency", "type": "string"}
        ]
      }
    },
    {
      "name": "paymentMethod",
      "type": {
        "type": "enum",
        "name": "PaymentMethod",
        "symbols": ["CREDIT_CARD", "DEBIT_CARD", "ACH", "WIRE_TRANSFER", "CASH", "CHECK", "FINANCING"]
      }
    },
    {
      "name": "paymentMethodDetails",
      "type": {
        "type": "record",
        "name": "PaymentMethodDetails",
        "fields": [
          {"name": "last4", "type": ["null", "string"], "default": null},
          {"name": "brand", "type": ["null", "string"], "default": null},
          {"name": "expiryMonth", "type": ["null", "int"], "default": null},
          {"name": "expiryYear", "type": ["null", "int"], "default": null}
        ]
      }
    },
    {
      "name": "paymentGateway",
      "type": "string",
      "doc": "Payment processor identifier (e.g., 'stripe', 'adyen')"
    },
    {"name": "initiatedBy", "type": "string"},
    {"name": "idempotencyKey", "type": "string"}
  ]
}
```

### PaymentCompleted

```json
{
  "namespace": "com.fsm.events.payment",
  "type": "record",
  "name": "PaymentCompleted",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "paymentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "transactionId", "type": "string", "doc": "Payment gateway transaction ID"},
    {"name": "amount", "type": "PaymentAmount"},
    {
      "name": "processingFee",
      "type": {
        "type": "record",
        "name": "Fee",
        "fields": [
          {"name": "amount", "type": "string"},
          {"name": "currency", "type": "string"}
        ]
      }
    },
    {"name": "netAmount", "type": "Fee"},
    {
      "name": "settledAt",
      "type": ["null", {"type": "long", "logicalType": "timestamp-millis"}],
      "default": null
    },
    {"name": "receiptUrl", "type": ["null", "string"], "default": null},
    {"name": "readyForERP", "type": "boolean", "default": true}
  ]
}
```

### PaymentFailed

```json
{
  "namespace": "com.fsm.events.payment",
  "type": "record",
  "name": "PaymentFailed",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "paymentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "amount", "type": "PaymentAmount"},
    {
      "name": "failureReason",
      "type": {
        "type": "enum",
        "name": "PaymentFailureReason",
        "symbols": [
          "INSUFFICIENT_FUNDS",
          "CARD_DECLINED",
          "EXPIRED_CARD",
          "INVALID_CARD",
          "FRAUD_DETECTED",
          "NETWORK_ERROR",
          "PROCESSING_ERROR",
          "CANCELLED",
          "OTHER"
        ]
      }
    },
    {"name": "failureMessage", "type": "string"},
    {"name": "errorCode", "type": ["null", "string"], "default": null},
    {"name": "retryable", "type": "boolean", "default": false},
    {"name": "retryCount", "type": "int", "default": 0}
  ]
}
```

### PaymentRefunded

```json
{
  "namespace": "com.fsm.events.payment",
  "type": "record",
  "name": "PaymentRefunded",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "refundId", "type": "string"},
    {"name": "paymentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "refundAmount",
      "type": "Fee"
    },
    {
      "name": "refundType",
      "type": {
        "type": "enum",
        "name": "RefundType",
        "symbols": ["FULL", "PARTIAL"]
      }
    },
    {"name": "refundReason", "type": "string"},
    {"name": "transactionId", "type": "string"},
    {"name": "refundedBy", "type": "string"},
    {"name": "readyForERP", "type": "boolean", "default": true}
  ]
}
```

---

## Document Domain Events

### DocumentRequested

```json
{
  "namespace": "com.fsm.events.document",
  "type": "record",
  "name": "DocumentRequested",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "documentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "documentType",
      "type": {
        "type": "enum",
        "name": "DocumentType",
        "symbols": ["CONTRACT", "SERVICE_AGREEMENT", "WORK_ORDER", "INVOICE", "RECEIPT", "WAIVER", "COMPLIANCE_FORM"]
      }
    },
    {
      "name": "signers",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "Signer",
          "fields": [
            {"name": "signerId", "type": "string"},
            {"name": "name", "type": "string"},
            {"name": "email", "type": "string"},
            {"name": "role", "type": {"type": "enum", "name": "SignerRole", "symbols": ["CUSTOMER", "TECHNICIAN", "SUPERVISOR", "WITNESS"]}},
            {"name": "signingOrder", "type": "int"}
          ]
        }
      }
    },
    {
      "name": "eSignatureProvider",
      "type": {
        "type": "enum",
        "name": "ESignatureProvider",
        "symbols": ["DOCUSIGN", "ADOBE_SIGN", "HELLOSIGN", "PANDADOC"]
      }
    },
    {"name": "requestedBy", "type": "string"},
    {"name": "expiresAt", "type": ["null", {"type": "long", "logicalType": "timestamp-millis"}], "default": null}
  ]
}
```

### DocumentSigned

```json
{
  "namespace": "com.fsm.events.document",
  "type": "record",
  "name": "DocumentSigned",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "documentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "documentType", "type": "DocumentType"},
    {
      "name": "signatureDetails",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "SignatureDetail",
          "fields": [
            {"name": "signerId", "type": "string"},
            {"name": "signerName", "type": "string"},
            {"name": "signedAt", "type": {"type": "long", "logicalType": "timestamp-millis"}},
            {"name": "ipAddress", "type": "string"},
            {"name": "signatureId", "type": "string"}
          ]
        }
      }
    },
    {"name": "documentUrl", "type": "string"},
    {"name": "certificateUrl", "type": ["null", "string"], "default": null},
    {"name": "allSignaturesComplete", "type": "boolean"}
  ]
}
```

### DocumentExpired

```json
{
  "namespace": "com.fsm.events.document",
  "type": "record",
  "name": "DocumentExpired",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "documentId", "type": "string"},
    {"name": "orderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "documentType", "type": "DocumentType"},
    {"name": "requestedAt", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "expiryTime", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {
      "name": "pendingSigners",
      "type": {
        "type": "array",
        "items": "string"
      }
    },
    {"name": "autoResend", "type": "boolean", "default": false}
  ]
}
```

---

## Communication Domain Events

### NotificationSent

```json
{
  "namespace": "com.fsm.events.communication",
  "type": "record",
  "name": "NotificationSent",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "notificationId", "type": "string"},
    {"name": "recipientId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "channel",
      "type": {
        "type": "enum",
        "name": "CommunicationChannel",
        "symbols": ["SMS", "EMAIL", "PUSH", "IN_APP"]
      }
    },
    {"name": "notificationType", "type": "string", "doc": "e.g., 'appointment_reminder', 'order_confirmation'"},
    {"name": "recipientAddress", "type": "string", "doc": "Phone number, email, or device token"},
    {"name": "messageId", "type": "string", "doc": "External gateway message ID"},
    {
      "name": "metadata",
      "type": {
        "type": "map",
        "values": "string"
      },
      "default": {}
    }
  ]
}
```

### NotificationDelivered

```json
{
  "namespace": "com.fsm.events.communication",
  "type": "record",
  "name": "NotificationDelivered",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "notificationId", "type": "string"},
    {"name": "messageId", "type": "string"},
    {"name": "channel", "type": "CommunicationChannel"},
    {"name": "deliveredAt", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "deliveryAttempts", "type": "int"}
  ]
}
```

### NotificationFailed

```json
{
  "namespace": "com.fsm.events.communication",
  "type": "record",
  "name": "NotificationFailed",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "notificationId", "type": "string"},
    {"name": "messageId", "type": ["null", "string"], "default": null},
    {"name": "channel", "type": "CommunicationChannel"},
    {
      "name": "failureReason",
      "type": {
        "type": "enum",
        "name": "NotificationFailureReason",
        "symbols": ["INVALID_RECIPIENT", "NETWORK_ERROR", "RATE_LIMIT", "BLOCKED", "EXPIRED", "GATEWAY_ERROR", "OTHER"]
      }
    },
    {"name": "failureMessage", "type": "string"},
    {"name": "deliveryAttempts", "type": "int"},
    {"name": "willRetry", "type": "boolean"}
  ]
}
```

---

## Chat Domain Events

Chat events enable real-time messaging for 4-party service order conversations (Customer, Operator, Work Team, Provider Manager).

### ConversationCreated

```json
{
  "namespace": "com.fsm.events.chat",
  "type": "record",
  "name": "ConversationCreated",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "conversationId", "type": "string"},
    {"name": "serviceOrderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "initiator",
      "type": {
        "type": "record",
        "name": "ParticipantInfo",
        "fields": [
          {"name": "participantId", "type": "string"},
          {"name": "participantType", "type": {"type": "enum", "name": "ParticipantType", "symbols": ["CUSTOMER", "OPERATOR", "WORK_TEAM", "PROVIDER_MANAGER", "SYSTEM"]}},
          {"name": "displayName", "type": "string"},
          {"name": "userId", "type": ["null", "string"], "default": null},
          {"name": "workTeamId", "type": ["null", "string"], "default": null},
          {"name": "customerId", "type": ["null", "string"], "default": null}
        ]
      }
    },
    {
      "name": "initialParticipants",
      "type": {
        "type": "array",
        "items": "ParticipantInfo"
      }
    },
    {"name": "createdBy", "type": "string"}
  ]
}
```

### MessageSent

```json
{
  "namespace": "com.fsm.events.chat",
  "type": "record",
  "name": "MessageSent",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "messageId", "type": "string"},
    {"name": "conversationId", "type": "string"},
    {"name": "serviceOrderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "sender",
      "type": "ParticipantInfo"
    },
    {
      "name": "messageType",
      "type": {
        "type": "enum",
        "name": "MessageType",
        "symbols": ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "LOCATION", "SYSTEM"]
      }
    },
    {
      "name": "content",
      "type": {
        "type": "record",
        "name": "MessageContent",
        "fields": [
          {"name": "text", "type": ["null", "string"], "default": null},
          {"name": "mediaUrl", "type": ["null", "string"], "default": null},
          {"name": "mediaType", "type": ["null", "string"], "default": null},
          {"name": "mediaThumbnailUrl", "type": ["null", "string"], "default": null},
          {"name": "mediaSize", "type": ["null", "long"], "default": null},
          {"name": "fileName", "type": ["null", "string"], "default": null}
        ]
      }
    },
    {"name": "replyToMessageId", "type": ["null", "string"], "default": null},
    {
      "name": "mentions",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "Mention",
          "fields": [
            {"name": "participantId", "type": "string"},
            {"name": "participantType", "type": "ParticipantType"},
            {"name": "displayName", "type": "string"}
          ]
        }
      },
      "default": []
    },
    {
      "name": "metadata",
      "type": {
        "type": "map",
        "values": "string"
      },
      "default": {}
    }
  ]
}
```

### MessageDelivered

```json
{
  "namespace": "com.fsm.events.chat",
  "type": "record",
  "name": "MessageDelivered",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "messageId", "type": "string"},
    {"name": "conversationId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "deliveredTo",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "DeliveryReceipt",
          "fields": [
            {"name": "participantId", "type": "string"},
            {"name": "participantType", "type": "ParticipantType"},
            {"name": "deliveredAt", "type": {"type": "long", "logicalType": "timestamp-millis"}}
          ]
        }
      }
    }
  ]
}
```

### MessageRead

```json
{
  "namespace": "com.fsm.events.chat",
  "type": "record",
  "name": "MessageRead",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "messageId", "type": "string"},
    {"name": "conversationId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "readBy",
      "type": {
        "type": "record",
        "name": "ReadReceipt",
        "fields": [
          {"name": "participantId", "type": "string"},
          {"name": "participantType", "type": "ParticipantType"},
          {"name": "readAt", "type": {"type": "long", "logicalType": "timestamp-millis"}}
        ]
      }
    },
    {"name": "unreadCountRemaining", "type": "int", "doc": "Remaining unread messages for this participant"}
  ]
}
```

### ParticipantJoined

```json
{
  "namespace": "com.fsm.events.chat",
  "type": "record",
  "name": "ParticipantJoined",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "conversationId", "type": "string"},
    {"name": "serviceOrderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "participant",
      "type": "ParticipantInfo"
    },
    {"name": "addedBy", "type": ["null", "string"], "default": null, "doc": "User ID who added this participant, null if auto-joined"},
    {
      "name": "joinReason",
      "type": {
        "type": "enum",
        "name": "JoinReason",
        "symbols": ["INITIAL_CREATION", "TECHNICIAN_ASSIGNED", "MANAGER_REQUEST", "MANUAL_ADD", "ESCALATION"]
      }
    }
  ]
}
```

### ParticipantLeft

```json
{
  "namespace": "com.fsm.events.chat",
  "type": "record",
  "name": "ParticipantLeft",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "conversationId", "type": "string"},
    {"name": "serviceOrderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "participant",
      "type": "ParticipantInfo"
    },
    {"name": "removedBy", "type": ["null", "string"], "default": null, "doc": "User ID who removed this participant, null if self-left"},
    {
      "name": "leaveReason",
      "type": {
        "type": "enum",
        "name": "LeaveReason",
        "symbols": ["SELF_LEFT", "REMOVED_BY_OWNER", "SERVICE_ORDER_CLOSED", "TECHNICIAN_UNASSIGNED", "ACCOUNT_DEACTIVATED"]
      }
    }
  ]
}
```

### ConversationClosed

```json
{
  "namespace": "com.fsm.events.chat",
  "type": "record",
  "name": "ConversationClosed",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "conversationId", "type": "string"},
    {"name": "serviceOrderId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "closedBy", "type": "string"},
    {
      "name": "closeReason",
      "type": {
        "type": "enum",
        "name": "CloseReason",
        "symbols": ["SERVICE_ORDER_COMPLETED", "SERVICE_ORDER_CANCELLED", "MANUAL_CLOSE", "INACTIVITY_TIMEOUT"]
      }
    },
    {
      "name": "statistics",
      "type": {
        "type": "record",
        "name": "ConversationStatistics",
        "fields": [
          {"name": "totalMessages", "type": "int"},
          {"name": "totalParticipants", "type": "int"},
          {"name": "durationMinutes", "type": "int"},
          {"name": "firstMessageAt", "type": {"type": "long", "logicalType": "timestamp-millis"}},
          {"name": "lastMessageAt", "type": {"type": "long", "logicalType": "timestamp-millis"}}
        ]
      }
    },
    {"name": "archiveRetentionDays", "type": "int", "default": 90}
  ]
}
```

---

## Master Data Events

### ProductDataSynced

```json
{
  "namespace": "com.fsm.events.masterdata",
  "type": "record",
  "name": "ProductDataSynced",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "syncId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "products",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "Product",
          "fields": [
            {"name": "productId", "type": "string"},
            {"name": "sku", "type": "string"},
            {"name": "name", "type": "string"},
            {"name": "category", "type": "string"},
            {"name": "price", "type": "Fee"},
            {"name": "isActive", "type": "boolean"},
            {"name": "lastModified", "type": {"type": "long", "logicalType": "timestamp-millis"}}
          ]
        }
      }
    },
    {"name": "source", "type": "string", "doc": "Source system (e.g., 'ERP', 'PIM')"},
    {"name": "recordsProcessed", "type": "int"},
    {"name": "recordsFailed", "type": "int"}
  ]
}
```

### ServiceDataSynced

```json
{
  "namespace": "com.fsm.events.masterdata",
  "type": "record",
  "name": "ServiceDataSynced",
  "version": 1,
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "correlationId", "type": "string"},
    {"name": "timestamp", "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "syncId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {
      "name": "services",
      "type": {
        "type": "array",
        "items": {
          "type": "record",
          "name": "Service",
          "fields": [
            {"name": "serviceId", "type": "string"},
            {"name": "serviceCode", "type": "string"},
            {"name": "name", "type": "string"},
            {"name": "duration", "type": "int", "doc": "Standard duration in minutes"},
            {"name": "price", "type": "Fee"},
            {"name": "requiredSkills", "type": {"type": "array", "items": "string"}},
            {"name": "isActive", "type": "boolean"}
          ]
        }
      }
    },
    {"name": "source", "type": "string"},
    {"name": "recordsProcessed", "type": "int"},
    {"name": "recordsFailed", "type": "int"}
  ]
}
```

---

## Event Publishing Best Practices

### Event Envelope

All events are wrapped in a standard envelope:

```typescript
interface EventEnvelope<T> {
  envelope: {
    version: string;
    eventType: string;
    eventVersion: number;
    source: string;
    timestamp: Date;
  };
  payload: T;
}
```

### Event Publisher

```typescript
class EventPublisher {
  constructor(
    private kafkaProducer: KafkaProducer,
    private schemaRegistry: SchemaRegistry
  ) {}

  async publish<T>(
    topic: string,
    event: T,
    options: {
      key: string;
      correlationId: string;
      headers?: Record<string, string>;
    }
  ): Promise<void> {
    // Validate against schema
    const schema = await this.schemaRegistry.getLatestSchema(topic);
    await schema.validate(event);

    // Encode with Avro
    const encoded = await schema.encode(event);

    await this.kafkaProducer.send({
      topic,
      messages: [{
        key: options.key,
        value: encoded,
        headers: {
          'correlation-id': options.correlationId,
          'event-type': event.constructor.name,
          ...options.headers
        }
      }]
    });
  }
}
```

## Next Steps

- [Sales Integration](./03-sales-integration.md)
- [ERP Integration](./04-erp-integration.md)
- [E-Signature Integration](./05-e-signature-integration.md)
