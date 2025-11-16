# Operator Cockpit API Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [Service Order Context View](#2-service-order-context-view)
3. [Provider Availability Check](#3-provider-availability-check)
4. [Service Order Rescheduling](#4-service-order-rescheduling)
5. [Document & Notes Management](#5-document--notes-management)
6. [Contract Bundling & Management](#6-contract-bundling--management)
7. [Contract Auto-Send Configuration](#7-contract-auto-send-configuration)
8. [Dashboard & Analytics](#8-dashboard--analytics)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Error Handling](#10-error-handling)

---

## 1. Overview

### 1.1 Purpose

The **Operator Cockpit API** provides the central control interface for service operators to manage service orders, check provider availability, reschedule jobs, bundle contracts, and handle exceptions. This API is the backbone of the operator web application.

### 1.2 Base URL

```
Production: https://api.yellowgrid.com/v1
Staging: https://api-staging.yellowgrid.com/v1
Development: http://localhost:3000/api/v1
```

### 1.3 Authentication

All endpoints require JWT authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

### 1.4 Rate Limiting

- **Standard endpoints**: 1000 requests/minute per user
- **Search/query endpoints**: 500 requests/minute per user
- **Heavy operations** (availability check): 100 requests/minute per user

---

## 2. Service Order Context View

### 2.1 Get Service Order Context

**GET** `/cockpit/service-orders/{serviceOrderId}/context`

Returns comprehensive context for a service order including project, linked orders, payment status, product delivery, documents, and more.

**Response**: `200 OK`

```json
{
  "serviceOrder": {
    "id": "so_abc123",
    "serviceOrderNumber": "SO-2025-001234",
    "serviceType": "installation",
    "priority": "P2",
    "status": "SCHEDULED",
    "createdAt": "2025-01-15T10:00:00Z",
    "scheduledDate": "2025-01-25T09:00:00Z",
    "scheduledSlot": "AM",
    "estimatedDuration": "3 hours",

    "customer": {
      "id": "cust_xyz789",
      "name": "Jean Dupont",
      "email": "jean.dupont@example.com",
      "phone": "+33 6 12 34 56 78",
      "address": {
        "street": "123 Rue de la Paix",
        "city": "Paris",
        "postalCode": "75001",
        "country": "FR"
      }
    },

    "products": [
      {
        "productId": "prod_kitchen_001",
        "name": "Kitchen Cabinet Set",
        "category": "kitchen",
        "quantity": 1,
        "deliveryStatus": "FULLY_DELIVERED",
        "deliveryDate": "2025-01-18T14:30:00Z"
      }
    ]
  },

  "project": {
    "id": "proj_def456",
    "name": "Dupont Kitchen Renovation",
    "status": "IN_PROGRESS",
    "createdAt": "2025-01-10T09:00:00Z",
    "serviceOrderCount": 3,
    "contacts": [
      {
        "name": "Jean Dupont",
        "email": "jean.dupont@example.com",
        "phone": "+33 6 12 34 56 78",
        "role": "PRIMARY"
      },
      {
        "name": "Marie Dupont",
        "email": "marie.dupont@example.com",
        "phone": "+33 6 98 76 54 32",
        "role": "SECONDARY"
      }
    ]
  },

  "linkedServiceOrders": [
    {
      "id": "so_tv_001",
      "serviceType": "tv",
      "status": "COMPLETED",
      "linkType": "HARD_DEPENDENCY",
      "linkReason": "TV must complete before installation",
      "completedAt": "2025-01-12T15:00:00Z",
      "tvOutcome": "YES"
    }
  ],

  "assignment": {
    "providerId": "prov_123",
    "providerName": "ABC Installers",
    "assignedAt": "2025-01-16T14:00:00Z",
    "assignmentMode": "OFFER",
    "offerAcceptedAt": "2025-01-16T16:30:00Z",
    "crew": {
      "crewId": "crew_456",
      "crewName": "Team Alpha",
      "technicianCount": 2
    }
  },

  "paymentStatus": {
    "status": "FULLY_PAID",
    "totalAmount": 1500.00,
    "paidAmount": 1500.00,
    "currency": "EUR",
    "paidAt": "2025-01-14T12:00:00Z",
    "paymentMethod": "CREDIT_CARD",
    "salesSystem": "pyxis"
  },

  "productDeliveryStatus": {
    "overallStatus": "FULLY_DELIVERED",
    "deliveryLocation": "PROVIDER",
    "deliveryDate": "2025-01-18T14:30:00Z",
    "products": [
      {
        "productId": "prod_kitchen_001",
        "quantityOrdered": 1,
        "quantityDelivered": 1,
        "status": "FULLY_DELIVERED"
      }
    ]
  },

  "goExecutionStatus": {
    "status": "OK",
    "checkedAt": "2025-01-24T18:00:00Z",
    "paymentOK": true,
    "deliveryOK": true,
    "checkInAllowed": true
  },

  "contract": {
    "contractId": "contract_789",
    "contractNumber": "CTR-2025-005678",
    "status": "FULLY_EXECUTED",
    "signedAt": "2025-01-16T10:00:00Z",
    "templateType": "INSTALLATION"
  },

  "documents": [
    {
      "documentId": "doc_001",
      "type": "NOTE",
      "title": "Customer prefers morning appointments",
      "createdBy": "operator_user_123",
      "createdAt": "2025-01-15T14:00:00Z"
    },
    {
      "documentId": "doc_002",
      "type": "PHOTO",
      "title": "Kitchen layout before installation",
      "fileUrl": "https://storage.example.com/photo_002.jpg",
      "uploadedBy": "operator_user_123",
      "uploadedAt": "2025-01-15T14:30:00Z"
    }
  ],

  "alerts": [
    {
      "alertId": "alert_001",
      "type": "PAYMENT_PENDING",
      "severity": "MEDIUM",
      "message": "Payment confirmed after initial check",
      "createdAt": "2025-01-14T10:00:00Z",
      "resolvedAt": "2025-01-14T12:00:00Z"
    }
  ],

  "timeline": [
    {
      "timestamp": "2025-01-15T10:00:00Z",
      "event": "SERVICE_ORDER_CREATED",
      "description": "Service order created from Pyxis"
    },
    {
      "timestamp": "2025-01-15T10:05:00Z",
      "event": "PROJECT_ASSIGNED",
      "description": "Added to project 'Dupont Kitchen Renovation'"
    },
    {
      "timestamp": "2025-01-16T09:00:00Z",
      "event": "CONTRACT_SENT",
      "description": "Contract sent to customer"
    },
    {
      "timestamp": "2025-01-16T10:00:00Z",
      "event": "CONTRACT_SIGNED",
      "description": "Customer signed contract"
    },
    {
      "timestamp": "2025-01-16T14:00:00Z",
      "event": "PROVIDER_ASSIGNED",
      "description": "Assigned to ABC Installers"
    }
  ]
}
```

---

## 3. Provider Availability Check

### 3.1 Check Provider Availability

**POST** `/cockpit/availability/check`

Triggers real-time availability search for providers based on service order requirements.

**Request Body**:

```json
{
  "serviceOrderId": "so_abc123",
  "requestedDate": "2025-01-25",
  "requestedSlot": "AM",
  "alternativeDates": [
    "2025-01-26",
    "2025-01-27"
  ],
  "filters": {
    "maxDistanceKm": 50,
    "minQualityScore": 4.0,
    "providerTiers": [1, 2],
    "excludeProviderIds": []
  }
}
```

**Response**: `200 OK`

```json
{
  "searchId": "search_xyz789",
  "searchedAt": "2025-01-16T15:00:00Z",
  "requestedDate": "2025-01-25",
  "requestedSlot": "AM",

  "availableSlots": [
    {
      "date": "2025-01-25",
      "slot": "AM",
      "availableProviders": [
        {
          "providerId": "prov_123",
          "providerName": "ABC Installers",
          "tier": 1,
          "distanceKm": 12.5,
          "qualityScore": 4.7,
          "qualityMetrics": {
            "firstTimeCompletionRate": 96.5,
            "averageCSAT": 4.7,
            "punctualityRate": 94.2
          },
          "crewsAvailable": [
            {
              "crewId": "crew_456",
              "crewName": "Team Alpha",
              "technicianCount": 2
            }
          ],
          "recommendationScore": 92.5,
          "recommendationRank": 1
        },
        {
          "providerId": "prov_789",
          "providerName": "XYZ Services",
          "tier": 1,
          "distanceKm": 18.3,
          "qualityScore": 4.5,
          "qualityMetrics": {
            "firstTimeCompletionRate": 94.1,
            "averageCSAT": 4.5,
            "punctualityRate": 92.8
          },
          "crewsAvailable": [
            {
              "crewId": "crew_789",
              "crewName": "Team Beta",
              "technicianCount": 2
            }
          ],
          "recommendationScore": 88.3,
          "recommendationRank": 2
        }
      ]
    },
    {
      "date": "2025-01-26",
      "slot": "AM",
      "availableProviders": [ /* ... */ ]
    }
  ],

  "unavailableReasons": {
    "2025-01-25": {
      "PM": "No providers available in PM slot - all at capacity"
    }
  }
}
```

---

## 4. Service Order Rescheduling

### 4.1 Reschedule Service Order

**POST** `/cockpit/service-orders/{serviceOrderId}/reschedule`

Reschedules a service order to a new date/slot with optional provider reassignment.

**Request Body**:

```json
{
  "newDate": "2025-01-27",
  "newSlot": "AM",
  "reason": "Customer requested different date",
  "reassignProvider": false,
  "notifyCustomer": true,
  "notifyProvider": true
}
```

**Response**: `200 OK`

```json
{
  "serviceOrderId": "so_abc123",
  "previousSchedule": {
    "date": "2025-01-25",
    "slot": "AM"
  },
  "newSchedule": {
    "date": "2025-01-27",
    "slot": "AM",
    "confirmedAt": "2025-01-16T15:30:00Z"
  },
  "rescheduledBy": "operator_user_123",
  "rescheduledAt": "2025-01-16T15:30:00Z",
  "reason": "Customer requested different date",
  "notifications": {
    "customerNotified": true,
    "providerNotified": true
  },
  "message": "Service order successfully rescheduled"
}
```

**Error Response**: `400 Bad Request`

```json
{
  "error": "RESCHEDULE_FAILED",
  "message": "Cannot reschedule service order in DISPATCHED status",
  "details": {
    "currentStatus": "DISPATCHED",
    "allowedStatuses": ["CREATED", "SCHEDULED", "ASSIGNED"]
  }
}
```

---

## 5. Document & Notes Management

### 5.1 Upload Document

**POST** `/cockpit/service-orders/{serviceOrderId}/documents`

**Request**: `multipart/form-data`

```
Fields:
- file: (binary file)
- documentType: "NOTE" | "PHOTO" | "PDF" | "CONTRACT" | "INVOICE" | "OTHER"
- title: string
- description: string (optional)
```

**Response**: `201 Created`

```json
{
  "documentId": "doc_003",
  "serviceOrderId": "so_abc123",
  "type": "PHOTO",
  "title": "Site access photo",
  "fileUrl": "https://storage.yellowgrid.com/docs/doc_003.jpg",
  "fileSize": 2048576,
  "mimeType": "image/jpeg",
  "uploadedBy": "operator_user_123",
  "uploadedAt": "2025-01-16T16:00:00Z"
}
```

### 5.2 Add Note

**POST** `/cockpit/service-orders/{serviceOrderId}/notes`

**Request Body**:

```json
{
  "noteType": "GENERAL" | "CUSTOMER_PREFERENCE" | "TECHNICAL" | "SAFETY",
  "title": "Customer access instructions",
  "content": "Use side door. Dog in backyard - keep gate closed.",
  "priority": "MEDIUM",
  "visibility": "ALL" | "OPERATORS_ONLY" | "PROVIDERS_ONLY"
}
```

**Response**: `201 Created`

```json
{
  "noteId": "note_004",
  "serviceOrderId": "so_abc123",
  "noteType": "CUSTOMER_PREFERENCE",
  "title": "Customer access instructions",
  "content": "Use side door. Dog in backyard - keep gate closed.",
  "priority": "MEDIUM",
  "visibility": "ALL",
  "createdBy": "operator_user_123",
  "createdAt": "2025-01-16T16:05:00Z"
}
```

### 5.3 Get All Documents & Notes

**GET** `/cockpit/service-orders/{serviceOrderId}/documents-and-notes`

**Response**: `200 OK`

```json
{
  "serviceOrderId": "so_abc123",
  "documents": [ /* array of documents */ ],
  "notes": [ /* array of notes */ ],
  "totalCount": 15
}
```

---

## 6. Contract Bundling & Management

### 6.1 Create Contract Bundle

**POST** `/cockpit/contracts/bundles`

Groups multiple service orders into a single contract.

**Request Body**:

```json
{
  "name": "Dupont Complete Kitchen Project",
  "serviceOrderIds": [
    "so_abc123",
    "so_def456",
    "so_ghi789"
  ],
  "contractTemplate": "BUNDLE_INSTALLATION",
  "customerId": "cust_xyz789",
  "sendImmediately": false
}
```

**Response**: `201 Created`

```json
{
  "bundleId": "bundle_001",
  "contractId": "contract_bundle_001",
  "contractNumber": "CTR-BUNDLE-2025-001",
  "name": "Dupont Complete Kitchen Project",
  "serviceOrderIds": [
    "so_abc123",
    "so_def456",
    "so_ghi789"
  ],
  "contractTemplate": "BUNDLE_INSTALLATION",
  "status": "DRAFT",
  "createdBy": "operator_user_123",
  "createdAt": "2025-01-16T16:30:00Z",
  "pdfUrl": "https://storage.yellowgrid.com/contracts/contract_bundle_001.pdf",
  "signatureUrl": "https://sign.yellowgrid.com/contract_bundle_001",
  "message": "Contract bundle created successfully. Ready to send to customer."
}
```

### 6.2 Send Contract Bundle to Customer

**POST** `/cockpit/contracts/bundles/{bundleId}/send`

**Request Body**:

```json
{
  "deliveryChannels": ["EMAIL", "SMS"],
  "customMessage": "Please review and sign the contract for your kitchen project.",
  "reminderSchedule": "STANDARD"
}
```

**Response**: `200 OK`

```json
{
  "bundleId": "bundle_001",
  "contractId": "contract_bundle_001",
  "status": "SENT",
  "sentAt": "2025-01-16T16:35:00Z",
  "sentTo": {
    "email": "jean.dupont@example.com",
    "phone": "+33 6 12 34 56 78"
  },
  "expiresAt": "2025-01-23T16:35:00Z",
  "reminderSchedule": [
    { "sendAt": "2025-01-19T10:00:00Z", "channel": "EMAIL" },
    { "sendAt": "2025-01-22T10:00:00Z", "channel": "SMS" }
  ]
}
```

### 6.3 Get Contract Bundle Status

**GET** `/cockpit/contracts/bundles/{bundleId}`

**Response**: `200 OK`

```json
{
  "bundleId": "bundle_001",
  "contractId": "contract_bundle_001",
  "contractNumber": "CTR-BUNDLE-2025-001",
  "status": "AWAITING_SIGNATURE",
  "serviceOrderCount": 3,
  "sentAt": "2025-01-16T16:35:00Z",
  "viewedAt": "2025-01-17T09:15:00Z",
  "expiresAt": "2025-01-23T16:35:00Z",
  "signatures": [],
  "nextReminderAt": "2025-01-19T10:00:00Z"
}
```

---

## 7. Contract Auto-Send Configuration

### 7.1 Enable/Disable Auto-Send for Service Order

**POST** `/cockpit/service-orders/{serviceOrderId}/contract/auto-send`

**Request Body**:

```json
{
  "enabled": true,
  "delayHours": 2,
  "contractTemplate": "STANDARD_INSTALLATION"
}
```

**Response**: `200 OK`

```json
{
  "serviceOrderId": "so_abc123",
  "autoSendEnabled": true,
  "delayHours": 2,
  "scheduledSendAt": "2025-01-16T18:00:00Z",
  "contractTemplate": "STANDARD_INSTALLATION",
  "message": "Contract will be auto-sent in 2 hours if not manually sent"
}
```

### 7.2 Cancel Auto-Send

**DELETE** `/cockpit/service-orders/{serviceOrderId}/contract/auto-send`

**Response**: `200 OK`

```json
{
  "serviceOrderId": "so_abc123",
  "autoSendCancelled": true,
  "message": "Auto-send cancelled successfully"
}
```

### 7.3 Send Contract Immediately (Override Auto-Send)

**POST** `/cockpit/service-orders/{serviceOrderId}/contract/send`

**Request Body**:

```json
{
  "contractTemplate": "STANDARD_INSTALLATION",
  "deliveryChannels": ["EMAIL", "SMS"],
  "cancelAutoSend": true
}
```

**Response**: `200 OK`

```json
{
  "contractId": "contract_890",
  "contractNumber": "CTR-2025-005679",
  "status": "SENT",
  "sentAt": "2025-01-16T16:00:00Z",
  "autoSendCancelled": true,
  "message": "Contract sent successfully to customer"
}
```

---

## 8. Dashboard & Analytics

### 8.1 Get Operator Dashboard

**GET** `/cockpit/dashboard`

**Query Parameters**:
- `dateRange`: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | custom range
- `countryCode`: Filter by country (optional)
- `businessUnit`: Filter by BU (optional)

**Response**: `200 OK`

```json
{
  "period": {
    "startDate": "2025-01-16T00:00:00Z",
    "endDate": "2025-01-16T23:59:59Z",
    "type": "TODAY"
  },

  "serviceOrders": {
    "total": 245,
    "byStatus": {
      "CREATED": 12,
      "SCHEDULED": 85,
      "ASSIGNED": 45,
      "DISPATCHED": 32,
      "IN_PROGRESS": 28,
      "COMPLETED": 38,
      "VERIFIED": 5
    },
    "byPriority": {
      "P1": 45,
      "P2": 200
    }
  },

  "assignments": {
    "pendingAssignment": 12,
    "offersAwaitingResponse": 15,
    "assignedToday": 32
  },

  "alerts": {
    "critical": 3,
    "high": 8,
    "medium": 15,
    "low": 22
  },

  "tasks": {
    "openTasks": 28,
    "overdueTasks": 5,
    "completedToday": 18
  },

  "contracts": {
    "awaitingSignature": 24,
    "signedToday": 15,
    "expiringSoon": 6
  },

  "goExecution": {
    "blockedOrders": 8,
    "paymentIssues": 3,
    "deliveryIssues": 5
  }
}
```

### 8.2 Get Service Order List

**GET** `/cockpit/service-orders`

**Query Parameters**:
- `status`: Filter by status
- `priority`: Filter by priority
- `assignedToProvider`: Filter by provider ID
- `scheduledDateFrom`: Date range start
- `scheduledDateTo`: Date range end
- `search`: Search by order number, customer name, address
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 50, max: 100)
- `sortBy`: Sort field (default: scheduledDate)
- `sortOrder`: "ASC" | "DESC"

**Response**: `200 OK`

```json
{
  "serviceOrders": [
    {
      "id": "so_abc123",
      "serviceOrderNumber": "SO-2025-001234",
      "serviceType": "installation",
      "priority": "P2",
      "status": "SCHEDULED",
      "scheduledDate": "2025-01-25T09:00:00Z",
      "customerName": "Jean Dupont",
      "address": "123 Rue de la Paix, Paris",
      "providerName": "ABC Installers",
      "alerts": ["PAYMENT_CONFIRMED"],
      "hasNotes": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalItems": 245,
    "totalPages": 5
  },
  "filters": {
    "status": "SCHEDULED"
  }
}
```

---

## 9. Authentication & Authorization

### 9.1 Required Permissions

Each endpoint requires specific permissions:

| Endpoint | Permission Required |
|----------|---------------------|
| GET `/cockpit/service-orders/*` | `service_orders:read` |
| POST `/cockpit/service-orders/*/reschedule` | `service_orders:reschedule` |
| POST `/cockpit/service-orders/*/documents` | `service_orders:manage_documents` |
| POST `/cockpit/contracts/bundles` | `contracts:create_bundle` |
| POST `/cockpit/availability/check` | `providers:check_availability` |
| GET `/cockpit/dashboard` | `dashboard:view` |

### 9.2 JWT Token Payload

```json
{
  "userId": "operator_user_123",
  "email": "operator@yellowgrid.com",
  "role": "OPERATOR",
  "permissions": [
    "service_orders:read",
    "service_orders:reschedule",
    "service_orders:manage_documents",
    "contracts:create_bundle",
    "providers:check_availability",
    "dashboard:view"
  ],
  "countryCode": "FR",
  "businessUnit": "LEROY_MERLIN",
  "exp": 1737033600
}
```

---

## 10. Error Handling

### 10.1 Standard Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2025-01-16T16:00:00Z",
  "requestId": "req_xyz789"
}
```

### 10.2 Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | User lacks required permission |
| `NOT_FOUND` | 404 | Service order not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RESCHEDULE_FAILED` | 400 | Cannot reschedule in current state |
| `AVAILABILITY_CHECK_FAILED` | 500 | Provider availability check failed |
| `CONTRACT_BUNDLE_ERROR` | 400 | Contract bundling error |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

**End of Document**
