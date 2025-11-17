# Yellow Grid - Technical Architecture

**Roadshow Mockup v1.0.0**

---

## 🏗️ System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   React Web App  │              │  React Native    │        │
│  │   (Port 5173)    │              │   Mobile App     │        │
│  │                  │              │   (Future)       │        │
│  │  - Vite          │              │                  │        │
│  │  - TypeScript    │              │  - Provider UI   │        │
│  │  - Tailwind CSS  │              │  - Technician UI │        │
│  │  - React Router  │              │                  │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
│           │                                 │                   │
│           └─────────────────┬───────────────┘                   │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ HTTP/REST
                              │ (Axios)
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                         API TIER                                 │
├─────────────────────────────┼───────────────────────────────────┤
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           NestJS API Server (Port 3001)                   │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           7 Feature Modules (49+ Endpoints)       │   │  │
│  │  ├──────────────────────────────────────────────────┤   │  │
│  │  │  - Providers API (14 endpoints)                   │   │  │
│  │  │  - Service Orders API (13 endpoints)              │   │  │
│  │  │  - Assignments API (10 endpoints)                 │   │  │
│  │  │  - Executions API (14 endpoints)                  │   │  │
│  │  │  - Projects API (5 endpoints)                     │   │  │
│  │  │  - Contracts API (6 endpoints)                    │   │  │
│  │  │  - WCF API (6 endpoints)                          │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           Cross-Cutting Concerns                   │   │  │
│  │  ├──────────────────────────────────────────────────┤   │  │
│  │  │  - Validation (class-validator)                   │   │  │
│  │  │  - Transformation (class-transformer)             │   │  │
│  │  │  - Error Handling (Global Exception Filter)       │   │  │
│  │  │  - Logging (Winston)                              │   │  │
│  │  │  - OpenAPI/Swagger Documentation                  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                     │
│                           │ Prisma ORM                          │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                      DATA TIER                                   │
├───────────────────────────┼─────────────────────────────────────┤
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         PostgreSQL 15+ Database                           │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │              Core Tables (24)                      │   │  │
│  │  ├──────────────────────────────────────────────────┤   │  │
│  │  │  - countries, business_units, stores              │   │  │
│  │  │  - providers, work_teams                          │   │  │
│  │  │  - projects, service_orders                       │   │  │
│  │  │  - assignments, date_negotiations                 │   │  │
│  │  │  - executions, checklist_items                    │   │  │
│  │  │  - contracts, contract_signatures                 │   │  │
│  │  │  - wcf, wcf_media                                 │   │  │
│  │  │  - tasks, alerts                                  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Architecture

### Backend Module Structure (NestJS)

```
apps/backend/src/
│
├── main.ts                          # Application entry point
│
├── modules/                          # Feature modules
│   │
│   ├── providers/                    # Provider & Capacity Management
│   │   ├── providers.controller.ts  # 14 REST endpoints
│   │   ├── providers.service.ts     # Business logic (600+ lines)
│   │   └── dto/                     # Data Transfer Objects
│   │       ├── create-provider.dto.ts
│   │       ├── update-tier.dto.ts
│   │       ├── suspend-provider.dto.ts
│   │       └── certification.dto.ts
│   │
│   ├── service-orders/               # Service Order Orchestration
│   │   ├── service-orders.controller.ts  # 13 REST endpoints
│   │   ├── service-orders.service.ts     # Business logic (800+ lines)
│   │   └── dto/
│   │       ├── create-service-order.dto.ts
│   │       ├── sales-potential.dto.ts    # AI assessment
│   │       ├── risk-assessment.dto.ts    # AI assessment
│   │       └── go-exec-status.dto.ts     # Blocking logic
│   │
│   ├── assignments/                  # Assignment & Dispatch
│   │   ├── assignments.controller.ts     # 10 REST endpoints
│   │   ├── assignments.service.ts        # Business logic (676 lines)
│   │   └── dto/
│   │       ├── create-assignment.dto.ts
│   │       ├── accept-assignment.dto.ts
│   │       ├── refuse-assignment.dto.ts
│   │       └── negotiate-date.dto.ts     # Date negotiation
│   │
│   ├── executions/                   # Field Execution
│   │   ├── executions.controller.ts      # 14 REST endpoints
│   │   ├── executions.service.ts         # Business logic (722 lines)
│   │   └── dto/
│   │       ├── check-in.dto.ts           # GPS tracking
│   │       ├── check-out.dto.ts
│   │       ├── checklist.dto.ts          # Interactive checklists
│   │       ├── completion.dto.ts
│   │       └── customer-feedback.dto.ts
│   │
│   ├── projects/                     # Project Management
│   │   ├── projects.controller.ts        # 5 REST endpoints
│   │   ├── projects.service.ts
│   │   └── dto/
│   │
│   ├── contracts/                    # Contract Lifecycle
│   │   ├── contracts.controller.ts       # 6 REST endpoints
│   │   ├── contracts.service.ts
│   │   └── dto/
│   │
│   └── wcf/                          # Work Closing Forms
│       ├── wcf.controller.ts             # 6 REST endpoints
│       ├── wcf.service.ts
│       └── dto/
│
├── common/                           # Shared utilities
│   ├── types/
│   │   └── schema.types.ts          # Shared TypeScript types
│   ├── filters/
│   │   └── http-exception.filter.ts # Global error handling
│   └── pipes/
│       └── validation.pipe.ts       # Input validation
│
└── prisma/                           # Database layer
    ├── schema.prisma                # Database schema (24 tables)
    └── seed.ts                      # Demo data (1,143 lines)
```

---

## 🗄️ Database Schema

### Entity Relationship Overview

```
┌─────────────────┐
│    Country      │
│  - code (PK)    │
│  - name         │
│  - timezone     │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐      1:N      ┌─────────────────┐
│  Business Unit  │◄──────────────│     Store       │
│  - id (PK)      │               │  - id (PK)      │
│  - name         │               │  - name         │
└─────────────────┘               └─────────────────┘

┌─────────────────┐
│    Provider     │
│  - id (PK)      │
│  - name         │
│  - tier (1/2/3) │──┐
│  - riskStatus   │  │
│  - rating       │  │
└────────┬────────┘  │
         │           │
         │ 1:N       │ JSON Array
         ▼           │
┌─────────────────┐  │
│   Work Team     │  │
│  - id (PK)      │  ▼
│  - providerId   │  certifications[]
│  - name         │  {code, name, expiresAt}
│  - active       │
└────────┬────────┘
         │
         │
         │
         │
┌────────┴────────┐
│    Project      │
│  - id (PK)      │
│  - externalId   │
│  - customerName │──┐
│  - worksiteCity │  │
└────────┬────────┘  │
         │           │
         │ 1:N       │
         ▼           │
┌─────────────────┐  │
│  Service Order  │  │
│  - id (PK)      │  │
│  - projectId    │──┘
│  - serviceType  │
│  - status       │
│  - scheduledDate│
│                 │
│  AI Features:   │
│  - salesPotential (LOW/MED/HIGH)
│  - salesPotentialScore (0-1)
│  - salesPreEstimationValue
│  - riskLevel (LOW/MED/HIGH/CRITICAL)
│  - riskScore (0-1)
│  - riskFactors (JSON)
│                 │
│  Go Exec:       │
│  - goExecStatus (OK/NOK/DEROGATION)
│  - goExecBlockReason
│  - paymentStatus
│  - productDeliveryStatus
│  - contractStatus
│  - wcfStatus    │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐
│   Assignment    │
│  - id (PK)      │
│  - serviceOrderId
│  - providerId   │
│  - workTeamId   │
│  - status       │
│  - assignmentMode
│                 │
│  Date Neg:      │
│  - originalDate │──┐
│  - dateNegotiationRound
│  - offerExpiresAt (4h timeout)
└────────┬────────┘  │
         │           │ 1:N
         │           ▼
         │      ┌──────────────────┐
         │      │ Date Negotiation │
         │      │  - id (PK)       │
         │      │  - assignmentId  │
         │      │  - round (1/2/3) │
         │      │  - proposedDate  │
         │      │  - proposedBy    │
         │      │    (PROVIDER/    │
         │      │     CUSTOMER)    │
         │      │  - notes         │
         │      └──────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐
│   Execution     │
│  - id (PK)      │
│  - serviceOrderId
│  - workTeamId   │
│  - status       │
│                 │
│  Check-in/out:  │
│  - checkInAt    │
│  - checkInLat   │
│  - checkInLon   │
│  - checkOutAt   │
│  - checkOutLat  │
│  - checkOutLon  │
│  - actualHours  │
│                 │
│  Completion:    │
│  - completionStatus (COMPLETE/INCOMPLETE/FAILED)
│  - incompleteReason
│                 │
│  Blocking:      │
│  - blockedReason│
│  - canCheckIn   │
│                 │
│  Media:         │
│  - photos[] (JSON) {url, type, caption}
│  - audioRecordings[] (JSON) {url, duration}
│                 │
│  Customer:      │
│  - customerRating (1-5)
│  - customerFeedback
│  - customerSignature
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│ Checklist Item  │
│  - id (PK)      │
│  - executionId  │
│  - label        │
│  - required     │
│  - completed    │
│  - completedAt  │
└─────────────────┘

┌─────────────────┐
│    Contract     │
│  - id (PK)      │
│  - serviceOrderId
│  - assignmentId │
│  - status       │
│  - contractPdfUrl
│  - sentAt       │
│  - signedAt     │
└─────────────────┘

┌─────────────────┐
│      WCF        │
│  - id (PK)      │
│  - serviceOrderId
│  - assignmentId │
│  - executionId  │
│  - status       │
│  - wcfPdfUrl    │
│  - sentAt       │
│  - signedAt     │
└─────────────────┘

┌─────────────────┐
│      Task       │
│  - id (PK)      │
│  - serviceOrderId
│  - title        │
│  - priority     │
│  - status       │
│  - dueDate      │
└─────────────────┘

┌─────────────────┐
│     Alert       │
│  - id (PK)      │
│  - serviceOrderId
│  - severity     │
│  - message      │
│  - acknowledgedAt
└─────────────────┘
```

---

## 🔄 Key Workflows

### 1. Service Order Lifecycle

```
┌─────────────┐
│   CREATED   │
└──────┬──────┘
       │
       │ AI Assessment
       ▼
┌─────────────┐
│ AI Analyzed │ ──► Sales Potential: LOW/MEDIUM/HIGH
│             │ ──► Risk Level: LOW/MEDIUM/HIGH/CRITICAL
└──────┬──────┘
       │
       │ Scheduling
       ▼
┌─────────────┐
│  SCHEDULED  │
└──────┬──────┘
       │
       │ Assignment
       ▼
┌─────────────┐
│  ASSIGNED   │
└──────┬──────┘
       │
       │ Provider Acceptance
       ▼
┌─────────────┐
│  ACCEPTED   │
└──────┬──────┘
       │
       │ Go Exec Validation
       ▼
┌─────────────┐     NOK
│   Go Exec   │────────────► BLOCKED
│  Validation │
└──────┬──────┘
       │ OK
       │
       │ Check-in
       ▼
┌─────────────┐
│ IN_PROGRESS │
└──────┬──────┘
       │
       │ Check-out
       ▼
┌─────────────┐
│  COMPLETED  │
└──────┬──────┘
       │
       │ Validation
       ▼
┌─────────────┐
│  VALIDATED  │
└──────┬──────┘
       │
       │ WCF Signed
       ▼
┌─────────────┐
│   CLOSED    │
└─────────────┘
```

### 2. Assignment Workflow with Date Negotiation

```
Provider Selected
       │
       ▼
┌──────────────┐
│   PENDING    │
└──────┬───────┘
       │
       │ ┌───────────────────────────┐
       │ │ 4h Timeout?               │
       │ │ ├─ Yes → Mark as TIMEOUT  │
       │ │ └─ No → Continue          │
       │ └───────────────────────────┘
       │
       ├────────────────┬────────────────┐
       │                │                │
       ▼                ▼                ▼
┌──────────┐    ┌──────────────┐   ┌──────────┐
│ ACCEPTED │    │ DATE_NEGOTIAT│   │ REFUSED  │
└──────────┘    └──────┬───────┘   └──────────┘
                       │
                       │ Round 1
                       ▼
                ┌─────────────┐
                │ Provider    │
                │ Proposes    │
                │ New Date    │
                └──────┬──────┘
                       │
                       ├─────────────┬─────────────┐
                       │             │             │
                       ▼             ▼             ▼
                ┌──────────┐  ┌────────────┐  ┌─────────┐
                │ Customer │  │  Round 2   │  │ Accept  │
                │ Refuses  │  │            │  └─────────┘
                └────┬─────┘  └─────┬──────┘
                     │              │
                     │              │ Round 2
                     │              ▼
                     │       ┌─────────────┐
                     │       │ Customer    │
                     │       │ Counter-    │
                     │       │ Proposes    │
                     │       └──────┬──────┘
                     │              │
                     │              ├─────────────┬─────────────┐
                     │              │             │             │
                     │              ▼             ▼             ▼
                     │       ┌──────────┐  ┌────────────┐  ┌─────────┐
                     │       │ Provider │  │  Round 3   │  │ Accept  │
                     │       │ Refuses  │  │            │  └─────────┘
                     │       └────┬─────┘  └─────┬──────┘
                     │            │              │
                     ▼            ▼              ▼
              ┌──────────────────────────────────────┐
              │    MAX 3 ROUNDS REACHED              │
              │    Manual Operator Intervention      │
              └──────────────────────────────────────┘
```

### 3. Execution Workflow with GPS & Checklist

```
Assignment Accepted
       │
       ▼
┌──────────────┐
│   PENDING    │  ──► canCheckIn = false if blockedReason exists
└──────┬───────┘
       │
       │ Check Go Exec Status
       ▼
┌──────────────┐
│ Go Exec OK?  │
├──────┬───────┤
│ NO   │  YES  │
└──┬───┴───┬───┘
   │       │
   ▼       ▼
BLOCKED   Check-in
          (GPS Coordinates)
             │
             ▼
      ┌──────────────┐
      │  CHECKED_IN  │
      └──────┬───────┘
             │
             │ Start Work
             ▼
      ┌──────────────┐
      │ IN_PROGRESS  │  ──► Interactive Checklist
      │              │      - Toggle items
      │              │      - Progress bar
      │              │      - Validation
      └──────┬───────┘
             │
             │ Complete Work
             ▼
      Check-out
      (GPS Coordinates + Hours)
             │
             ▼
      ┌──────────────┐
      │  COMPLETED   │
      └──────┬───────┘
             │
             │ Record Completion
             ▼
      ┌──────────────────────┐
      │ Completion Status:   │
      │ - COMPLETE           │
      │ - INCOMPLETE         │
      │ - FAILED             │
      └──────┬───────────────┘
             │
             │ Customer Feedback
             ▼
      ┌──────────────┐
      │   Rating     │
      │   Comments   │
      │   Signature  │
      └──────────────┘
```

### 4. Provider Risk Management Workflow

```
┌──────────────┐
│     OK       │  ◄─── Normal operations
└──────┬───────┘
       │
       │ Issue detected
       ▼
┌──────────────┐
│  ON_WATCH    │  ◄─── Flagged for monitoring
│              │      - Reason required
│              │      - Still active
└──────┬───────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
       ▼              ▼              ▼
 Clear Watch    More Issues    Suspend
       │              │              │
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│    OK    │   │SUSPENDED │   │SUSPENDED │
└──────────┘   │          │   │          │
               │ - Reason │   │ - Reason │
               │ - From   │   │ - From   │
               │ - Until  │   │ - Until  │
               └────┬─────┘   └────┬─────┘
                    │              │
                    │              │
                    │ Lift         │
                    │ Suspension   │
                    ▼              │
               ┌──────────┐        │
               │    OK    │◄───────┘
               └──────────┘
```

---

## 🔌 API Architecture

### REST API Design Principles

1. **Resource-Based URLs**:
   - Collections: `/api/v1/providers` (plural)
   - Single Resource: `/api/v1/providers/{id}` (singular)
   - Sub-resources: `/api/v1/providers/{id}/certifications`

2. **HTTP Methods**:
   - `GET` - Retrieve resources
   - `POST` - Create resources or trigger actions
   - `PUT` - Update entire resource
   - `PATCH` - Partial update
   - `DELETE` - Remove resource

3. **Status Codes**:
   - `200 OK` - Successful GET/PUT/PATCH
   - `201 Created` - Successful POST
   - `204 No Content` - Successful DELETE
   - `400 Bad Request` - Validation error
   - `401 Unauthorized` - Authentication required
   - `403 Forbidden` - Insufficient permissions
   - `404 Not Found` - Resource doesn't exist
   - `500 Internal Server Error` - Server error

4. **Response Format**:
```json
{
  "id": "uuid",
  "name": "Provider Name",
  "tier": 1,
  "riskStatus": "OK",
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2024-12-05T15:30:00Z"
}
```

### API Endpoint Categories

#### Providers API (14 endpoints)
```
GET    /api/v1/providers
GET    /api/v1/providers/:id
GET    /api/v1/providers/statistics
PUT    /api/v1/providers/:id/tier
GET    /api/v1/providers/tier/:tier
POST   /api/v1/providers/:id/suspend
POST   /api/v1/providers/:id/unsuspend
POST   /api/v1/providers/:id/on-watch
POST   /api/v1/providers/:id/clear-watch
GET    /api/v1/providers/suspended
GET    /api/v1/providers/on-watch
POST   /api/v1/providers/:id/certifications
DELETE /api/v1/providers/:id/certifications/:code
GET    /api/v1/providers/certifications/expiring
```

#### Service Orders API (13 endpoints)
```
GET    /api/v1/service-orders
POST   /api/v1/service-orders
GET    /api/v1/service-orders/:id
PUT    /api/v1/service-orders/:id
DELETE /api/v1/service-orders/:id
GET    /api/v1/service-orders/statistics
POST   /api/v1/service-orders/:id/assess-sales-potential    # AI
POST   /api/v1/service-orders/:id/assess-risk               # AI
POST   /api/v1/service-orders/:id/go-exec-status            # Blocking
GET    /api/v1/service-orders/:id/blocking-reasons
POST   /api/v1/service-orders/:id/schedule
POST   /api/v1/service-orders/:id/cancel
GET    /api/v1/service-orders/priority/:priority
```

#### Assignments API (10 endpoints)
```
GET    /api/v1/assignments
POST   /api/v1/assignments
GET    /api/v1/assignments/:id
POST   /api/v1/assignments/:id/accept                       # Provider accepts
POST   /api/v1/assignments/:id/refuse                       # Provider refuses
POST   /api/v1/assignments/:id/negotiate-date               # Date negotiation
POST   /api/v1/assignments/:id/accept-counter-proposal      # Customer accepts
POST   /api/v1/assignments/:id/refuse-counter-proposal      # Customer refuses
POST   /api/v1/assignments/:id/mark-timeout                 # 4h timeout
GET    /api/v1/assignments/expired
```

#### Executions API (14 endpoints)
```
GET    /api/v1/executions
POST   /api/v1/executions
GET    /api/v1/executions/:id
GET    /api/v1/executions/statistics
GET    /api/v1/executions/blocked
POST   /api/v1/executions/:id/check-in                      # GPS
POST   /api/v1/executions/:id/check-out                     # GPS + Hours
PUT    /api/v1/executions/:id/checklist                     # Update checklist
POST   /api/v1/executions/:id/checklist/complete            # Complete item
POST   /api/v1/executions/:id/completion                    # Record completion
POST   /api/v1/executions/:id/photos                        # Upload photo
POST   /api/v1/executions/:id/audio                         # Upload audio
POST   /api/v1/executions/:id/customer-feedback             # Rating + Comments
POST   /api/v1/executions/:id/block                         # Block execution
POST   /api/v1/executions/:id/unblock                       # Unblock execution
```

---

## 🛡️ Security Architecture

### Authentication (Future)
- **SSO Integration**: PingID
- **Token Type**: JWT
- **Storage**: HttpOnly cookies
- **Refresh Strategy**: Sliding window

### Authorization (Future)
- **Model**: Role-Based Access Control (RBAC)
- **Roles**: Admin, Operator, Provider, Technician
- **Permissions**: Resource-level (e.g., `service-orders:read`)

### Data Protection
- **Input Validation**: class-validator on all DTOs
- **SQL Injection**: Prevented by Prisma parameterized queries
- **XSS**: Sanitization on frontend
- **CORS**: Configured for allowed origins
- **Rate Limiting**: Future implementation

---

## 📊 Data Flow Examples

### Example 1: AI Sales Potential Assessment

```
1. User clicks "Assess Sales Potential" button
       │
       ▼
2. Frontend calls API
   POST /api/v1/service-orders/:id/assess-sales-potential
   Body: {
     salesPotential: "HIGH",
     salesPotentialScore: 0.87,
     salesPreEstimationValue: 15000,
     salesmanNotes: "Strong interest..."
   }
       │
       ▼
3. NestJS Controller validates DTO
   ServiceOrdersController.assessSalesPotential()
       │
       ▼
4. Service layer updates database
   ServiceOrdersService.assessSalesPotential()
   Prisma.serviceOrder.update({
     data: { salesPotential, salesPotentialScore, ... }
   })
       │
       ▼
5. Database returns updated record
       │
       ▼
6. API returns response
   Status: 200 OK
   Body: { id, salesPotential: "HIGH", salesPotentialScore: 0.87, ... }
       │
       ▼
7. Frontend updates UI
   Shows updated badge, score, and value
```

### Example 2: Interactive Checklist Toggle

```
1. User clicks checkbox to toggle item
       │
       ▼
2. Frontend optimistically updates UI (instant feedback)
   checklist[itemId].completed = !checklist[itemId].completed
       │
       ▼
3. Frontend calls API
   PUT /api/v1/executions/:id/checklist
   Body: {
     items: [
       { id: "1", label: "Verify identity", required: true, completed: true },
       { id: "2", label: "Check site", required: true, completed: true },
       ...
     ]
   }
       │
       ▼
4. NestJS validates and updates
   ExecutionsService.updateChecklist()
   Prisma.checklistItem.updateMany()
       │
       ▼
5. Calculate completion percentage
   completed / total * 100
       │
       ▼
6. API returns updated execution with new completion %
       │
       ▼
7. Frontend confirms optimistic update or reverts on error
```

---

## 🚀 Performance Considerations

### Database Indexing
- Primary keys: All `id` fields
- Foreign keys: All `*Id` fields
- Query optimization: `countryCode`, `status`, `tier`, `riskStatus`

### Caching Strategy (Future)
- **Provider tiers**: Redis cache, TTL 1 hour
- **Statistics**: Redis cache, TTL 5 minutes
- **Certifications**: Redis cache, invalidate on update

### Pagination
- Default page size: 20
- Max page size: 100
- Cursor-based pagination for large datasets

---

## 🔮 Future Enhancements

### Real ML Integration
- XGBoost model serving (FastAPI)
- Feature engineering pipelines
- Model versioning and A/B testing

### Real-time Features
- WebSocket for live updates
- Push notifications
- Collaborative editing

### Advanced Features
- File upload (S3 integration)
- PDF generation (contracts, WCF)
- E-signature integration
- Analytics dashboards

---

**For more details**: See main product documentation in `/product-docs/`
