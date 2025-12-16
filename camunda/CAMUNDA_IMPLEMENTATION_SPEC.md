# Camunda 8 Implementation Specification

**Version**: 3.0  
**Last Updated**: December 16, 2025  
**Status**: Production-Ready  
**Environment**: VPS 135.181.96.93

---

## Overview

Yellow Grid Platform uses Camunda 8 (Zeebe 8.5.0) for workflow orchestration across the service order lifecycle. This document provides comprehensive technical specifications for all implemented workflows, workers, and integration patterns.

## Architecture

### Technology Stack

- **Zeebe**: 8.5.0 (Workflow engine)
- **Operate**: 8.5.0 (Process monitoring UI)
- **Tasklist**: 8.5.0 (Human task management)
- **Elasticsearch**: 8.15.0 (Process data storage)
- **Camunda 8 JS SDK**: @camunda8/sdk
- **Backend**: NestJS with TypeScript

### Deployment

```
┌─────────────────────────────────────────────────────────┐
│  NestJS Application (port 3000)                         │
│  ├── CamundaModule (Zeebe workers)                      │
│  ├── CamundaService (Process management)                │
│  ├── CamundaController (HTTP API)                       │
│  └── OperateService (Monitoring API)                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓ gRPC (port 26500)
┌─────────────────────────────────────────────────────────┐
│  Zeebe Broker (Docker container)                        │
│  ├── Process deployment                                 │
│  ├── Process instance execution                         │
│  ├── Message correlation                                │
│  └── Job distribution to workers                        │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Elasticsearch (port 9200)                              │
│  └── Process data indexing                              │
└─────────────────────────────────────────────────────────┘
```

---

## Workflows (BPMN Processes)

### 1. Service Order Lifecycle (v2)

**Process ID**: `ServiceOrderLifecycle`  
**File**: `camunda/processes/service-order-lifecycle.bpmn`

**Description**: Main orchestration process for service orders from creation to completion.

**Key Activities**:
1. Validate service order
2. Assign provider (call sub-process)
3. Schedule appointment
4. Execute service
5. Complete WCF
6. Process payment
7. Close order

**Variables**:
```typescript
{
  serviceOrderId: string;
  customerId: string;
  urgency: 'URGENT' | 'STANDARD' | 'LOW';
  serviceType: string;
  postalCode: string;
  countryCode: string;
  businessUnit: string;
}
```

### 2. Provider Assignment (v3) ⭐ NEW

**Process ID**: `ProviderAssignment`  
**File**: `camunda/processes/provider-assignment.bpmn`  
**Version**: v3 (December 16, 2025)

**Description**: Sub-process for finding, ranking, and assigning providers with escalation support.

**Flow Diagram**:
```
Start → FindProviders → RankProviders → [Providers?]
                                            ├─ Yes → AutoAssign → [Assigned?]
                                            │                      ├─ Yes → END (Assigned)
                                            │                      └─ No → SendOffer → AwaitResponse
                                            │                                             ├─ Accept → END (Assigned)
                                            │                                             ├─ Reject → END (Declined)
                                            │                                             └─ Timeout (4h) → EscalateTimeout
                                            │                                                                    ├─ Reassigned → END (Assigned)
                                            │                                                                    └─ ManualReview → END (ManualReview)
                                            └─ No → END (NoProvider)
```

**Service Tasks**:
| Task ID | Task Type | Worker | Input | Output |
|---------|-----------|--------|-------|--------|
| Task_FindProviders | `find-providers` | FindProvidersWorker | serviceType, postalCode, countryCode, businessUnit | candidateProviders[], providersFound |
| Task_RankProviders | `rank-providers` | RankProvidersWorker | candidateProviders[], urgency | rankedProviders[], topProvider |
| Task_AutoAssign | `auto-assign-provider` | AutoAssignProviderWorker | rankedProviders[], serviceOrderId, urgency, requestedStartDate | autoAssigned, assignmentId, scheduledDate, scheduledSlot |
| Task_SendOffer | `send-offer` | SendOfferWorker | providerId, serviceOrderId | assignmentId, offerId, offerSentAt, offerExpiresAt |
| Task_EscalateTimeout | `escalate-offer-timeout` | EscalateOfferTimeoutWorker | assignmentId, serviceOrderId, providerId, escalationRound | escalated, escalationAction, escalationReason |

**Message Events**:
| Message Name | Correlation Key | Triggered By | Purpose |
|-------------|----------------|--------------|---------|
| OfferAccepted | `offerId` (assignmentId) | POST /api/v1/camunda/offer/accept | Provider accepts offer |
| OfferRejected | `offerId` (assignmentId) | POST /api/v1/camunda/offer/reject | Provider rejects offer |

**Timer Events**:
| Event | Duration | Action |
|-------|----------|--------|
| Event_OfferTimeout | PT4H (4 hours) | Triggers escalation flow |

**Escalation Logic** (NEW in v3):
- **Round 1-3**: Attempt reassignment to next available provider
- **After Round 3**: Route to manual review (operator intervention required)
- **No providers available**: Immediate manual review
- **Max escalation rounds**: 3 (configurable in worker)

**End Events**:
| End Event | Condition | Next Action |
|-----------|-----------|-------------|
| EndEvent_Assigned | Provider assigned (auto or accepted offer) | Continue to booking |
| EndEvent_NoProvider | No providers found | Manual operator assignment |
| EndEvent_OfferDeclined | Offer explicitly rejected | Manual operator assignment |
| EndEvent_ManualReview | Escalation max rounds reached | Operator review required |

---

## Workers

All workers extend `BaseWorker<TInput, TOutput>` with automatic retry logic, error handling, and logging.

### Base Worker Features

**File**: `src/camunda/workers/base.worker.ts`

**Features**:
- ✅ Automatic retry for transient failures
- ✅ BpmnError throwing for business errors
- ✅ Structured logging with correlation IDs
- ✅ Configurable timeout (default: 30s)
- ✅ Idempotency support
- ✅ Graceful shutdown

**Retry Logic** (Enhanced December 2025):
```typescript
// Network errors (9 codes)
ECONNRESET, ETIMEDOUT, ECONNREFUSED, ENETUNREACH, ENETDOWN,
EHOSTDOWN, EHOSTUNREACH, EPIPE, EAI_AGAIN

// HTTP statuses (6 codes)
408 (Timeout), 429 (Too Many Requests), 500, 502, 503, 504

// Prisma errors (3 codes)
P2024 (Connection pool timeout)
P1001 (Connection error)
P1002 (Connection timeout)

// Database errors
Deadlock detection, Lock timeout, Connection pool exhaustion
```

**Retry Configuration**:
- Max retries: 3
- Backoff multiplier: 2 (exponential)
- Max backoff: 60000ms (1 minute)

### Worker Catalog (10 Workers)

#### 1. ValidateOrderWorker
**Task Type**: `validate-order`  
**Category**: Validation  
**File**: `src/camunda/workers/validation/validate-order.worker.ts`

**Purpose**: Validates service order data before processing.

**Input**:
```typescript
{
  serviceOrderId: string;
}
```

**Output**:
```typescript
{
  validationStatus: 'VALID' | 'INVALID';
  validationErrors: string[];
  order: {
    customerId: string;
    storeId: string;
    serviceType: string;
    postalCode: string;
    countryCode: string;
    urgency: string;
  };
}
```

**Validation Checks**:
- ✅ Service order exists
- ✅ Customer exists
- ✅ Store exists and active
- ✅ Service type exists and active
- ✅ Postal code format valid
- ✅ At least one provider covers postal code

**Business Errors**:
- `VALIDATION_FAILED`: Critical validation errors (throws BpmnError)

---

#### 2. FindProvidersWorker
**Task Type**: `find-providers`  
**Category**: Assignment  
**File**: `src/camunda/workers/assignment/find-providers.worker.ts`

**Purpose**: Finds providers that can service the postal code.

**Input**:
```typescript
{
  serviceType: string;
  postalCode: string;
  countryCode: string;
  businessUnit: string;
}
```

**Output**:
```typescript
{
  candidateProviders: Array<{
    id: string;
    name: string;
    score: number;
    zoneType: 'PRIMARY' | 'SECONDARY' | 'OVERFLOW';
  }>;
  providersFound: boolean;
}
```

**Algorithm**:
1. Query InterventionZone for postal code coverage
2. Filter by service priority configuration (P1, P2, OPT_OUT)
3. Return providers with zone type priority

---

#### 3. RankProvidersWorker
**Task Type**: `rank-providers`  
**Category**: Assignment  
**File**: `src/camunda/workers/assignment/rank-providers.worker.ts`

**Purpose**: Ranks providers by performance score and business rules.

**Input**:
```typescript
{
  candidateProviders: Provider[];
  urgency: string;
}
```

**Output**:
```typescript
{
  rankedProviders: Array<{
    id: string;
    name: string;
    score: number;
    rank: number;
  }>;
  topProvider: {
    id: string;
    name: string;
    score: number;
  };
}
```

**Ranking Factors**:
- Performance score (0-100)
- Zone type (PRIMARY > SECONDARY > OVERFLOW)
- Provider type (P1 > P2)
- Availability
- Workload balance

---

#### 4. AutoAssignProviderWorker ⭐ UPDATED
**Task Type**: `auto-assign-provider`  
**Category**: Assignment  
**File**: `src/camunda/workers/assignment/auto-assign-provider.worker.ts`  
**Updated**: December 16, 2025

**Purpose**: Auto-assigns providers based on country rules and urgency.

**Input**:
```typescript
{
  rankedProviders: Provider[];
  serviceOrderId: string;
  urgency: 'URGENT' | 'STANDARD' | 'LOW';
  requestedStartDate: string; // ISO 8601
  requestedEndDate: string;   // ISO 8601
}
```

**Output**:
```typescript
{
  autoAssigned: boolean;
  assignmentId?: string;
  providerId?: string;
  providerName?: string;
  assignmentReason?: string;
  scheduledDate: string;      // NEW: ISO 8601 date
  scheduledSlot: string;      // NEW: 'MORNING' | 'AFTERNOON' | 'EVENING'
}
```

**Auto-Assignment Rules** (AHS Country-Specific):
| Country | Rule | Condition |
|---------|------|-----------|
| IT | Always auto-accept | All providers use AUTO_ACCEPT mode |
| ES, FR, PT | Auto-assign urgent only | urgency=URGENT AND providerScore>80 AND P1 service config |
| All | P1 priority service | Service has P1=Always Accept config |

**Scheduling Data Computation** (NEW):
```typescript
// Derive slot from requested start date hour
hour < 12:00  → MORNING
hour < 17:00  → AFTERNOON
hour >= 17:00 → EVENING
```

**Assignment States**:
- `ACCEPTED`: Auto-assigned (no offer needed)
- `OFFERED`: Manual offer required (non-urgent or low score)

---

#### 5. SendOfferWorker ⭐ UPDATED
**Task Type**: `send-offer`  
**Category**: Assignment  
**File**: `src/camunda/workers/assignment/send-offer.worker.ts`  
**Updated**: December 16, 2025

**Purpose**: Creates offer assignment and sends notification to provider.

**Input**:
```typescript
{
  providerId: string;
  serviceOrderId: string;
  providerRank?: number;
  providerScore?: number;
  offerExpirationHours?: number; // Default: 4
}
```

**Output**:
```typescript
{
  assignmentId: string;
  offerId: string;            // NEW: For message correlation (same as assignmentId)
  offerSentAt: string;        // ISO 8601
  offerExpiresAt: string;     // ISO 8601
}
```

**Notification Events**:
- Emits `assignment.offered` event
- Notification service sends email/SMS to provider

**Idempotency**: Checks for existing PENDING/OFFERED assignment before creating new one.

---

#### 6. CheckAvailabilityWorker ✅ FIXED
**Task Type**: `check-availability`  
**Category**: Booking  
**File**: `src/camunda/workers/booking/check-availability.worker.ts`  
**Status**: Now receives scheduling data from auto-assign

**Purpose**: Checks provider/team availability for requested time slot.

**Input**:
```typescript
{
  providerId: string;
  workTeamId?: string;
  scheduledDate: string;      // From auto-assign output
  scheduledSlot: string;      // From auto-assign output
  serviceOrderId: string;
}
```

**Output**:
```typescript
{
  available: boolean;
  conflicts: Array<{
    type: 'BOOKING' | 'CALENDAR_BLOCK';
    startDate: string;
    endDate: string;
  }>;
}
```

---

#### 7. ReserveSlotWorker
**Task Type**: `reserve-slot`  
**Category**: Booking  
**File**: `src/camunda/workers/booking/reserve-slot.worker.ts`

**Purpose**: Creates confirmed booking for the service order.

**Input**:
```typescript
{
  serviceOrderId: string;
  providerId: string;
  workTeamId?: string;
  scheduledDate: string;
  scheduledSlot: string;
}
```

**Output**:
```typescript
{
  bookingId: string;
  bookingStatus: 'CONFIRMED' | 'TENTATIVE';
}
```

---

#### 8. GoCheckWorker
**Task Type**: `go-check`  
**Category**: Execution  
**File**: `src/camunda/workers/execution/go-check.worker.ts`

**Purpose**: Pre-execution validation (GO_OK / GO_NOK).

**Input**:
```typescript
{
  serviceOrderId: string;
}
```

**Output**:
```typescript
{
  goCheckStatus: 'GO_OK' | 'GO_NOK_DELIVERY' | 'GO_NOK_CUSTOMER' | 'GO_NOK_OTHER';
  goCheckReason?: string;
}
```

---

#### 9. SendNotificationWorker
**Task Type**: `send-notification`  
**Category**: Notification  
**File**: `src/camunda/workers/notification/send-notification.worker.ts`

**Purpose**: Sends notifications via email/SMS/push.

**Input**:
```typescript
{
  notificationType: string;
  recipientUserId: string;
  templateData: Record<string, any>;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
}
```

**Output**:
```typescript
{
  notificationId: string;
  sent: boolean;
}
```

---

#### 10. EscalateOfferTimeoutWorker ⭐ NEW
**Task Type**: `escalate-offer-timeout`  
**Category**: Escalation  
**File**: `src/camunda/workers/escalation/escalate-offer-timeout.worker.ts`  
**Added**: December 16, 2025

**Purpose**: Handles offer timeout with automated reassignment and escalation.

**Input**:
```typescript
{
  assignmentId: string;
  serviceOrderId: string;
  providerId: string;
  escalationRound?: number; // Default: 1
}
```

**Output**:
```typescript
{
  escalated: boolean;
  escalationAction: 'REASSIGNED' | 'MANUAL_REVIEW';
  newAssignmentId?: string;
  notificationSent: boolean;
  escalationReason: string;
}
```

**Algorithm**:
1. Check escalation round (max 3)
2. Mark expired assignment as EXPIRED
3. If round < 3: Find next available provider
   - If found: Create new OFFERED assignment, emit notification
   - If not found: Route to manual review
4. If round >= 3: Route to manual review
5. Update service order state to CREATED
6. Emit escalation events

**Escalation Events**:
- `escalation.manual_review_required`: Max rounds reached
- `escalation.no_providers`: No alternative providers
- `offer.sent`: New offer created after reassignment

**Business Rules**:
- MAX_ESCALATION_ROUNDS = 3 (configurable)
- Excludes original provider from reassignment
- Updates service order state to CREATED for operator visibility
- Creates internal notes for audit trail

---

## HTTP API Endpoints

**Controller**: `src/camunda/camunda.controller.ts`

### Process Management

#### Start Service Order Workflow
```
POST /api/v1/camunda/start-service-order
```

**Request**:
```json
{
  "serviceOrderId": "uuid",
  "customerId": "uuid",
  "urgency": "URGENT"
}
```

**Response**:
```json
{
  "data": {
    "processInstanceKey": "2251799813685249"
  },
  "meta": {
    "timestamp": "2025-12-16T10:00:00Z"
  }
}
```

### Offer Management ⭐ NEW

#### Accept Offer
```
POST /api/v1/camunda/offer/accept
```

**Request**:
```json
{
  "assignmentId": "uuid",
  "scheduledDate": "2025-12-20T09:00:00Z",
  "scheduledSlot": "MORNING"
}
```

**Response**:
```json
{
  "data": {
    "messagePublished": true,
    "correlationKey": "uuid"
  }
}
```

**Message Correlation**: Publishes `OfferAccepted` message with `correlationKey = assignmentId`

---

#### Reject Offer
```
POST /api/v1/camunda/offer/reject
```

**Request**:
```json
{
  "assignmentId": "uuid",
  "rejectionReason": "Provider unavailable"
}
```

**Response**:
```json
{
  "data": {
    "messagePublished": true,
    "correlationKey": "uuid"
  }
}
```

**Message Correlation**: Publishes `OfferRejected` message with `correlationKey = assignmentId`

---

### Health Check

```
GET /api/v1/camunda/health
```

**Response**:
```json
{
  "data": {
    "status": "connected",
    "workers": [
      "validate-order",
      "find-providers",
      "rank-providers",
      "auto-assign-provider",
      "send-offer",
      "check-availability",
      "reserve-slot",
      "go-check",
      "send-notification",
      "escalate-offer-timeout"
    ]
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Zeebe Connection
ZEEBE_ADDRESS=zeebe:26500
CAMUNDA_SECURE_CONNECTION=false  # true for TLS

# Operate API (optional)
OPERATE_API_URL=http://localhost:8081
OPERATE_API_USERNAME=demo
OPERATE_API_PASSWORD=demo

# Worker Configuration
ZEEBE_WORKER_MAX_JOBS_TO_ACTIVATE=10
ZEEBE_WORKER_POLL_INTERVAL=100ms
ZEEBE_WORKER_REQUEST_TIMEOUT=30s
```

### Docker Compose

**File**: `camunda/docker-compose.camunda.yml`

**Services**:
- Zeebe (port 26500)
- Operate (port 8081)
- Tasklist (port 8082)
- Elasticsearch (port 9200)

**Volumes**:
- zeebe-data
- elastic-data
- operate-data

---

## Testing

### E2E Test Script

**File**: `test/e2e-camunda-workflow-v4.sh`

**Coverage**:
- ✅ Order validation
- ✅ Provider search and ranking
- ✅ Auto-assignment for URGENT orders
- ✅ Offer creation for STANDARD/LOW orders
- ✅ All 10 workers executed successfully

**Run Tests**:
```bash
./test/e2e-camunda-workflow-v4.sh
```

### Unit Tests

**Coverage**: 44 passing tests

**Test Files**:
- `validate-order.worker.spec.ts`: Validation logic
- `find-providers.worker.spec.ts`: Provider search
- `auto-assign-provider.worker.spec.ts`: Auto-assignment rules
- `base.worker.spec.ts`: Retry logic and error handling

**Run Tests**:
```bash
npm test -- --testPathPattern="camunda" --runInBand
```

---

## Monitoring & Operations

### Camunda Operate

**URL**: http://localhost:8081 (local) or SSH tunnel to VPS  
**Credentials**: demo/demo

**Features**:
- Process instance monitoring
- Variable inspection
- Incident management
- Process analytics

### Logging

**Log Levels**:
- INFO: Normal execution flow
- WARN: Business rule violations, retryable errors
- ERROR: Critical failures, BpmnErrors

**Correlation IDs**: All logs include correlation IDs for tracing

### Metrics

**Tracked Metrics**:
- Worker execution time
- Process instance duration
- Assignment success rate
- Escalation frequency

---

## Best Practices

### BPMN Modeling

1. **Service Tasks**: Use meaningful task types matching worker names
2. **Error Handling**: Define error end events for business errors
3. **Timeouts**: Set reasonable timeouts for human tasks and timers
4. **Variables**: Use structured variable names (camelCase)
5. **Gateways**: Always provide default flows

### Worker Development

1. **Idempotency**: Check for existing records before creating
2. **Transactions**: Use Prisma transactions for multi-step operations
3. **Validation**: Validate all inputs before processing
4. **Logging**: Log entry/exit and all decision points
5. **Error Handling**: Throw BpmnError for business errors, let base worker handle technical errors

### Message Correlation

1. **Correlation Keys**: Use stable, unique identifiers (e.g., assignmentId)
2. **Timeouts**: Set appropriate timeout durations
3. **Error Handling**: Handle correlation failures gracefully

---

## Deployment Checklist

- [ ] Update BPMN version in process definitions
- [ ] Test locally with docker-compose
- [ ] Run E2E tests
- [ ] Deploy to staging environment
- [ ] Verify all workers registered
- [ ] Check Operate UI for process instances
- [ ] Monitor logs for errors
- [ ] Update documentation
- [ ] Deploy to production
- [ ] Post-deployment smoke tests

---

## Support & Resources

- **Internal Docs**: `/camunda/README.md`
- **Worker Catalog**: `/src/camunda/workers/`
- **BPMN Files**: `/camunda/processes/`
- **E2E Tests**: `/test/e2e-camunda-workflow-v4.sh`
- **Camunda 8 Docs**: https://docs.camunda.io/
- **BPMN 2.0 Spec**: https://www.omg.org/spec/BPMN/2.0/

---

**Document Maintained By**: Engineering Team  
**Review Frequency**: Monthly or after major releases
