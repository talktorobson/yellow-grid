# Service Boundaries

## Purpose

This document defines the bounded contexts and service boundaries for the AHS Field Service Execution Platform, following Domain-Driven Design (DDD) principles.

## Service Architecture

The platform is organized into **8 core domain services** plus **1 configuration service** and **1 integration adapters service** (10 services total).

```
┌─────────────────────────────────────────────────────────────────┐
│                      DOMAIN SERVICES                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Identity &  │  │  Provider &  │  │Orchestration │
│    Access    │  │   Capacity   │  │  & Control   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Scheduling  │  │  Assignment  │  │  Execution   │
│      &       │  │      &       │  │      &       │
│ Availability │  │   Dispatch   │  │    Mobile    │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Communication │  │  Contracts,  │  │Configuration │
│      &       │  │  Documents   │  │   Service    │
│Notifications │  │   & Media    │  │              │
└──────────────┘  └──────────────┘  └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRATION ADAPTERS                           │
│  (Stateless, Event-Driven)                                      │
│  Sales | ERP | E-Signature | Master Data | SMS/Email | PingID  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   CROSS-CUTTING SERVICES                         │
│  Analytics & Search (read-only, eventually consistent)          │
└─────────────────────────────────────────────────────────────────┘
```

## Core Domain Services

### 1. Identity & Access Service

**Bounded Context**: User identity, authentication, authorization, and access control.

**Responsibilities**:
- Integrate with PingID SSO (SAML/OIDC)
- Manage internal users (operators, managers, admins)
- Manage external users (provider admins, technicians, customers)
- Issue and validate JWT tokens
- RBAC: roles, permissions, scopes (country, BU, store, provider)
- Provide authorization APIs: "Can user X perform action Y on resource Z?"

**Key Entities**:
- User
- Role
- Permission
- Scope (country, BU, store, provider)
- Session

**APIs**:
```
POST   /api/v1/auth/login              # Initiate SSO login
POST   /api/v1/auth/callback           # SSO callback
POST   /api/v1/auth/refresh            # Refresh JWT token
POST   /api/v1/auth/logout             # Logout
GET    /api/v1/users                   # List users
GET    /api/v1/users/:id               # Get user
POST   /api/v1/users                   # Create user
PUT    /api/v1/users/:id               # Update user
GET    /api/v1/roles                   # List roles
POST   /api/v1/authz/check             # Check permission
```

**Events Published**:
```
identity.user.created
identity.user.updated
identity.user.disabled
identity.session.started
identity.session.ended
```

**Database Schema**: `identity_access`

**Dependencies**:
- **External**: PingID SSO
- **Internal**: None (foundational service)

---

### 2. Provider & Capacity Service

**Bounded Context**: Provider/work-team management, zones, skills, calendars, capacity, compliance.

**Responsibilities**:
- Manage provider hierarchy (provider → work teams)
- Provider profiles (TV-only, install-only, full-scope)
- Intervention zones (postal codes, regions, radius)
- Service catalog participation (P1/P2, opt-out lists)
- Product/brand eligibility
- Working calendars (hours, holidays, store closures, external blocks)
- Capacity constraints (jobs/day, hours/week, drive time/radius)
- Seasonal overlays
- Risk & compliance status (OK, On Watch, Suspended)
- Mandatory documents & certifications (with expiry tracking)

**Key Entities**:
- Provider
- WorkTeam
- Zone
- ServicePreference (P1/P2, opt-out)
- Calendar
- CapacityRule
- Document
- Certification

**APIs**:
```
GET    /api/v1/providers               # List providers
GET    /api/v1/providers/:id           # Get provider
POST   /api/v1/providers               # Create provider
PUT    /api/v1/providers/:id           # Update provider
GET    /api/v1/providers/:id/teams     # List work teams
POST   /api/v1/providers/:id/teams     # Create work team
PUT    /api/v1/teams/:id               # Update work team
GET    /api/v1/teams/:id/calendar      # Get team calendar
PUT    /api/v1/teams/:id/calendar      # Update calendar
GET    /api/v1/teams/:id/capacity      # Get capacity rules
PUT    /api/v1/teams/:id/capacity      # Update capacity
GET    /api/v1/providers/:id/documents # List documents
POST   /api/v1/providers/:id/documents # Upload document
```

**Events Published**:
```
providers.provider.created
providers.provider.updated
providers.provider.status_changed
providers.team.created
providers.team.updated
providers.calendar.updated
providers.capacity.updated
providers.document.expiring
providers.document.expired
```

**Database Schema**: `providers_capacity`

**Dependencies**:
- **Identity & Access**: For user authorization checks

---

### 3. Orchestration & Control Service

**Bounded Context**: Projects, service orders, journeys, dependencies, tasks, control tower.

**Responsibilities**:
- Manage projects (parent of service orders)
- Manage service orders (installations, TVs, maintenance, reworks)
- Journey templates and orchestration (TV → Installation, multi-step flows)
- Dependency management (blocking/unblocking based on outcomes)
- State machine for service order lifecycle
- Confirmation TV flow logic
- Task generation (automatic + manual)
- Control tower data aggregation
- Project freeze/unfreeze
- Split/merge visits

**Key Entities**:
- Project
- ServiceOrder
- JourneyTemplate
- JourneyStep
- Dependency
- Task
- StatusTransition

**APIs**:
```
GET    /api/v1/projects                # List projects
GET    /api/v1/projects/:id            # Get project
POST   /api/v1/projects                # Create project
GET    /api/v1/projects/:id/orders     # List service orders
POST   /api/v1/projects/:id/orders     # Create service order
GET    /api/v1/orders/:id              # Get service order
PUT    /api/v1/orders/:id              # Update service order
POST   /api/v1/orders/:id/transition   # Trigger status transition
GET    /api/v1/orders/:id/dependencies # Get dependencies
POST   /api/v1/orders/:id/freeze       # Freeze order
POST   /api/v1/orders/:id/unfreeze     # Unfreeze order
GET    /api/v1/tasks                   # List tasks
GET    /api/v1/tasks/:id               # Get task
POST   /api/v1/tasks                   # Create manual task
PUT    /api/v1/tasks/:id               # Update task
GET    /api/v1/control-tower/summary  # Control tower summary
GET    /api/v1/control-tower/calendar # Calendar view data
GET    /api/v1/control-tower/gantt    # Gantt view data
```

**Events Published**:
```
projects.project.created
projects.service_order.created
projects.service_order.status_changed
projects.service_order.blocked
projects.service_order.unblocked
projects.service_order.closed
projects.tv_outcome.recorded
projects.task.created
projects.task.completed
projects.warranty.started
```

**Events Consumed**:
```
assignments.assignment.confirmed
execution.checkout.completed
contracts.wcf.signed
```

**Database Schema**: `projects_orders`

**Dependencies**:
- **Provider & Capacity**: To validate provider assignments
- **Configuration**: To load journey templates
- **Identity & Access**: For authorization

---

### 4. Scheduling & Availability Service

**Bounded Context**: Slot calculation, buffer logic, availability queries.

**Responsibilities**:
- Calculate available time slots for service orders
- Apply buffer logic (global, static/product-based, commute)
- Stack buffers (combine multiple buffer types)
- Respect calendars (working days, holidays, closures)
- Respect capacity constraints (from Provider & Capacity service)
- Apply slot granularity (AM/PM vs hourly based on horizon)
- Provide slot search APIs for Pyxis/Tempo and operators
- Cache hot availability data (Redis)

**Key Entities**:
- AvailabilityQuery (input)
- Slot (output)
- BufferRule (from Configuration service)

**APIs**:
```
POST   /api/v1/scheduling/availability # Search available slots
  Body: {
    serviceType: string,
    providerId?: string,
    teamId?: string,
    zone?: string,
    countryCode: string,
    buCode: string,
    dateRange: { start: string, end: string },
    productDeliveryDate?: string,
    multiPerson?: boolean
  }
  Response: {
    slots: [
      {
        providerId: string,
        teamId: string,
        date: string,
        timeWindow: { start: string, end: string },
        capacity: number
      }
    ]
  }

GET    /api/v1/scheduling/buffers       # Get buffer rules (debug)
```

**Events Published**:
```
scheduling.availability.queried (for analytics)
```

**Events Consumed**: None (stateless query service)

**Database Schema**: None (stateless; loads config from Configuration service)

**Dependencies**:
- **Provider & Capacity**: To query calendars and capacity
- **Configuration**: To load buffer rules
- **Redis**: For caching hot slots

---

### 5. Assignment & Dispatch Service

**Bounded Context**: Provider candidate filtering, scoring, offers, assignment.

**Responsibilities**:
- Filter candidate providers/teams (hard filters)
- Score and rank candidates (P1/P2, tier, distance, quality, continuity)
- Maintain assignment transparency (funnel, scores, rationale)
- Manage assignment modes (direct, offer+accept, broadcast, auto-accept)
- Handle offer lifecycle (created → accepted/refused/timeout)
- Support provider-customer date negotiation (up to 3 rounds)
- Track assignment runs for audit
- Emit alerts for unassigned jobs

**Key Entities**:
- AssignmentRun (audit trail)
- CandidateFilter
- ScoredCandidate
- Offer
- OfferResponse
- NegotiationRound

**APIs**:
```
POST   /api/v1/assignments/distribute   # Distribute service order
  Body: {
    serviceOrderId: string,
    mode: 'direct' | 'offer' | 'broadcast',
    preferredProviderId?: string
  }
  Response: {
    runId: string,
    assignedProvider?: { id, teamId },
    offersCreated?: [...],
    funnel: { /* transparency data */ }
  }

GET    /api/v1/assignments/runs/:id     # Get assignment run (audit)
GET    /api/v1/offers                    # List offers
GET    /api/v1/offers/:id                # Get offer
PUT    /api/v1/offers/:id/accept         # Provider accepts offer
PUT    /api/v1/offers/:id/refuse         # Provider refuses offer
PUT    /api/v1/offers/:id/propose-date   # Provider proposes new date
GET    /api/v1/assignments/unassigned    # Unassigned jobs (control tower)
```

**Events Published**:
```
assignments.run.started
assignments.run.completed
assignments.offer.created
assignments.offer.accepted
assignments.offer.refused
assignments.offer.expired
assignments.assignment.confirmed
assignments.date_negotiation.started
assignments.date_negotiation.round_completed
assignments.date_negotiation.failed
```

**Events Consumed**:
```
projects.service_order.created
projects.service_order.ready_for_assignment
execution.tv_outcome.recorded
```

**Database Schema**: `assignments`

**Dependencies**:
- **Provider & Capacity**: For candidate data, zones, skills, P1/P2
- **Scheduling**: To validate date/time proposals
- **Configuration**: For assignment scoring rules
- **Orchestration**: To update service order status

---

### 6. Execution & Mobile Service

**Bounded Context**: Field operations, job execution, mobile app interactions.

**Responsibilities**:
- Provide job lists for technicians/teams
- Handle check-in (GPS + timestamp)
- Handle check-out (GPS + timestamp + notes + media)
- Support "special check-out" for incomplete jobs
- Capture checklists per service type
- Record extra work/materials (with approval flow)
- On-site reschedule requests
- Technical visit outcome recording (YES / YES, BUT / NO)
- Offline sync (mobile SQLite → server)
- Media upload queue management

**Key Entities**:
- Execution (per service order)
- CheckIn
- CheckOut
- Checklist
- ChecklistItem
- ExtraWork
- MediaItem
- TVOutcome

**APIs**:
```
GET    /api/v1/mobile/jobs              # Get jobs for team/tech
  Query: { teamId, date, status }

GET    /api/v1/mobile/jobs/:id          # Get job details

POST   /api/v1/executions/:id/checkin   # Check in
  Body: { timestamp, gps: { lat, lng } }

POST   /api/v1/executions/:id/checkout  # Check out
  Body: {
    timestamp,
    gps: { lat, lng },
    notes: string,
    completed: boolean,
    incompletionReason?: string,
    checklistResponses: [...]
  }

POST   /api/v1/executions/:id/media     # Upload media
  Body: FormData (multipart)

POST   /api/v1/executions/:id/extra-work # Record extra work
  Body: { description, materials, estimatedTime }

POST   /api/v1/executions/:id/tv-outcome # Record TV outcome
  Body: {
    outcome: 'YES' | 'YES_BUT' | 'NO',
    modifications?: [...],
    notes: string
  }

POST   /api/v1/mobile/sync              # Bulk sync (offline → online)
  Body: {
    checkins: [...],
    checkouts: [...],
    media: [...]
  }
```

**Events Published**:
```
execution.checkin.completed
execution.checkout.completed
execution.checkout.incomplete
execution.extra_work.requested
execution.tv_outcome.recorded
execution.media.uploaded
```

**Events Consumed**:
```
assignments.assignment.confirmed
projects.service_order.status_changed
```

**Database Schema**: `execution`

**Dependencies**:
- **Orchestration**: To update service order status
- **Contracts & Documents**: To store media
- **Object Storage**: Direct upload for media

---

### 7. Communication & Notifications Service

**Bounded Context**: Customer-provider intermediation, notifications, messaging rules.

**Responsibilities**:
- Masked communication (phone/SMS)
- In-app chat (customer ↔ provider ↔ AHS)
- Pre-built communication flows (pre-visit Q&A, "tech on the way", delays, CSAT/NPS)
- Contact rules enforcement (time windows, blackout periods)
- Notification templates (email, SMS, push)
- Escalation handling
- Multi-language template management

**Key Entities**:
- Conversation
- Message
- NotificationTemplate
- ContactRule
- CommunicationFlow

**APIs**:
```
GET    /api/v1/conversations            # List conversations
GET    /api/v1/conversations/:id        # Get conversation
POST   /api/v1/conversations            # Start conversation
POST   /api/v1/conversations/:id/messages # Send message
POST   /api/v1/conversations/:id/escalate # Escalate to AHS support

POST   /api/v1/notifications/send       # Send notification
  Body: {
    type: 'sms' | 'email' | 'push',
    templateId: string,
    recipientId: string,
    variables: { ... }
  }

GET    /api/v1/templates                # List templates
POST   /api/v1/templates                # Create template
```

**Events Published**:
```
communications.conversation.started
communications.message.sent
communications.message.delivered
communications.conversation.escalated
communications.notification.sent
communications.notification.failed
```

**Events Consumed**:
```
assignments.assignment.confirmed       # "You've been assigned" notification
execution.checkin.completed            # "Tech on the way"
execution.checkout.completed           # "Service complete" + CSAT trigger
contracts.contract.sent                # "Sign your contract"
contracts.wcf.ready                    # "Review work closing form"
```

**Database Schema**: `communications`

**Dependencies**:
- **SMS Gateway**: Twilio / Enterprise SMS Service
- **Email Provider**: SendGrid / Enterprise Email Service
- **Push Notifications**: Firebase Cloud Messaging
- **Configuration**: For templates and contact rules

---

### 8. Contracts, Documents & Media Service

**Bounded Context**: Contract lifecycle, WCF, document/media storage.

**Responsibilities**:
- Generate pre-service contracts from templates
- Trigger e-signature workflow (via external provider)
- Track contract status (draft → sent → signed → expired)
- Generate Work Closing Forms (WCF)
- Capture customer signatures on WCF
- Store and version contracts/WCFs (PDF)
- Store uploaded documents (blueprints, permits, reports)
- Store media (photos, videos, audio) from executions
- Provide access control and retrieval APIs
- Manage document lifecycle (archival, deletion)

**Key Entities**:
- Contract
- WCF (Work Closing Form)
- Document
- Media
- Signature
- Template (contract/WCF templates)

**APIs**:
```
GET    /api/v1/contracts                # List contracts
GET    /api/v1/contracts/:id            # Get contract
POST   /api/v1/contracts                # Create contract
  Body: {
    projectId: string,
    serviceOrderIds: [string],
    templateId: string
  }

POST   /api/v1/contracts/:id/send       # Send for signature
PUT    /api/v1/contracts/:id/sign       # Record manual signature
GET    /api/v1/contracts/:id/pdf        # Download PDF

POST   /api/v1/wcf                      # Create WCF
  Body: {
    executionId: string,
    summary: string,
    workDone: [...]
  }

POST   /api/v1/wcf/:id/sign             # Customer signs WCF
  Body: { signature: base64, accepted: boolean, remarks?: string }

GET    /api/v1/projects/:id/documents   # List project documents
POST   /api/v1/projects/:id/documents   # Upload document
GET    /api/v1/documents/:id            # Get document metadata
GET    /api/v1/documents/:id/download   # Download file

GET    /api/v1/executions/:id/media     # List media for execution
POST   /api/v1/media                    # Upload media
GET    /api/v1/media/:id                # Get media URL (pre-signed)
```

**Events Published**:
```
contracts.contract.created
contracts.contract.sent
contracts.contract.signed
contracts.contract.expired
contracts.wcf.created
contracts.wcf.signed
contracts.wcf.accepted
contracts.wcf.contested
documents.document.uploaded
documents.media.uploaded
```

**Events Consumed**:
```
projects.service_order.created         # Auto-create contract if configured
execution.checkout.completed           # Auto-create WCF
```

**Database Schema**: `documents`

**Dependencies**:
- **E-Signature Provider**: DocuSign / Adobe Sign
- **Object Storage**: Google Cloud Storage (GCS)
- **Configuration**: For contract/WCF templates

---

### 9. Configuration Service

**Bounded Context**: System configuration, business rules, country/BU parameters.

**Responsibilities**:
- Store and serve configuration parameters
- Hierarchical configuration (EU → Country → BU → Store)
- Versioning (track changes over time)
- Effective dating (rules apply from specific date)
- Simulation mode (preview impact of changes)
- Manage buffer rules, P1/P2 acceptance rules, journey templates, contact windows, offer expiry durations

**Key Entities**:
- ConfigParameter
- ConfigVersion
- BufferRule
- ServiceAcceptanceRule
- JourneyTemplate
- ContactWindow

**APIs**:
```
GET    /api/v1/config/buffers           # Get buffer rules
  Query: { countryCode, buCode, serviceType, effectiveDate }

GET    /api/v1/config/acceptance-rules  # Get P1/P2 rules
GET    /api/v1/config/journey-templates # Get journey templates
GET    /api/v1/config/contact-windows   # Get contact windows
GET    /api/v1/config/offer-expiry      # Get offer expiry durations

POST   /api/v1/config/buffers           # Create/update buffer rule
PUT    /api/v1/config/buffers/:id       # Update buffer rule
POST   /api/v1/config/simulate          # Simulate rule change
  Body: {
    ruleType: 'buffer' | 'acceptance',
    changes: { ... },
    effectiveDate: string,
    scope: { countryCode, buCode }
  }

GET    /api/v1/config/versions          # List config versions
GET    /api/v1/config/history           # Config change history
```

**Events Published**:
```
config.parameter.created
config.parameter.updated
config.parameter.effective
config.simulation.run
```

**Events Consumed**: None

**Database Schema**: `config_rules`

**Dependencies**: None (foundational service)

---

## Cross-Cutting Services

### Analytics & Search Service

**Bounded Context**: Search, reporting, dashboards, analytics.

**Responsibilities**:
- Index entities in OpenSearch (projects, orders, providers, customers)
- Smart search API
- Operational dashboards (today's jobs, capacity vs demand)
- Strategic dashboards (provider scorecards, quality metrics)
- Rule impact simulation (historical analysis)
- KPI calculation

**Note**: This is a **read-only, eventually consistent** service. It consumes events from all other services.

**APIs**:
```
GET    /api/v1/search                   # Smart search
  Query: { q: string, type: 'project' | 'order' | 'provider' | 'customer' }

GET    /api/v1/dashboards/operational   # Operational dashboard data
GET    /api/v1/dashboards/strategic     # Strategic dashboard data
GET    /api/v1/scorecards/providers/:id # Provider scorecard
POST   /api/v1/simulations/rule-impact  # Simulate rule change impact
```

**Events Consumed**: All domain events (for indexing and analytics)

**Database**: OpenSearch + Postgres read replica

---

## Integration Adapters

### 10. Integration Adapters Service

**Bounded Context**: Multi-sales-system integration, external system adapters, data transformation.

**Responsibilities**:
- Normalize incoming service orders from multiple sales systems (Pyxis, Tempo, SAP, custom)
- Transform FSM domain events to sales system formats
- Support multiple sales channels (store, web, call center, mobile, partner)
- Provide adapter registry for dynamic adapter selection
- Handle ERP integration (Oracle) for payment processing
- Manage e-signature provider integration (Adobe Sign)
- Sync master data (products, services, stores, pricing)
- Communication gateway adapters (SMS/Email/Push)
- PingID SSO integration adapter
- Cache sales system configurations (Redis)
- Monitor adapter health and performance (Datadog)

**Key Entities**:
- SalesSystem
- SalesAdapter
- ServiceOrderMapping
- ExternalOrderPayload
- SalesChannel
- AdapterConfiguration
- TransformationRule

**Sales System Adapters**:

**Pyxis Adapter**:
- Receive installation orders via Kafka (`sales.pyxis.order.created`)
- Normalize to FSM domain model
- Provide slot availability API (REST)
- Send status updates back to Pyxis via Kafka (`fsm.order.status_updated`)
- Handle TV modification flows

**Tempo Adapter**:
- Receive service requests via Kafka (`sales.tempo.service.requested`)
- Normalize to FSM domain model
- Support multi-step service flows
- Send completion confirmations via Kafka (`fsm.service.completed`)

**SAP Adapter** (future):
- Receive enterprise service orders
- Complex product configuration mapping
- Multi-country support
- Custom pricing rules integration

**APIs**:
```
# Sales Integration
POST   /api/v1/adapters/sales/pyxis/orders      # Receive Pyxis order (fallback to REST)
POST   /api/v1/adapters/sales/tempo/services    # Receive Tempo service (fallback to REST)
GET    /api/v1/adapters/sales/availability      # Unified availability API
POST   /api/v1/adapters/sales/:system/status    # Send status update

# ERP Integration
POST   /api/v1/adapters/erp/completion          # Send completion to Oracle
POST   /api/v1/adapters/erp/invoice             # Trigger invoice generation

# E-Signature Integration
POST   /api/v1/adapters/esign/send              # Send contract for signature
POST   /api/v1/adapters/esign/webhook           # Receive signature callback

# Master Data Sync
GET    /api/v1/adapters/master-data/products    # Fetch products
GET    /api/v1/adapters/master-data/stores      # Fetch stores
POST   /api/v1/adapters/master-data/sync        # Trigger full sync

# Communication Gateways
POST   /api/v1/adapters/comms/sms/send          # Send SMS (Enterprise Messaging Service)
POST   /api/v1/adapters/comms/email/send        # Send Email
POST   /api/v1/adapters/comms/push/send         # Send Push notification
POST   /api/v1/adapters/comms/webhook           # Delivery receipt callback

# Adapter Management
GET    /api/v1/adapters/registry                # List registered adapters
GET    /api/v1/adapters/health                  # Health check all adapters
GET    /api/v1/adapters/config/:system          # Get adapter configuration
PUT    /api/v1/adapters/config/:system          # Update adapter configuration
```

**Events Published**:
```
# Sales Integration Events
integration.sales.order.received
integration.sales.order.normalized
integration.sales.order.failed
integration.sales.status.sent
integration.sales.tv_modifications.sent

# ERP Events
integration.erp.completion.sent
integration.erp.invoice.triggered
integration.erp.payment.confirmed

# E-Signature Events
integration.esign.contract.sent
integration.esign.signature.received
integration.esign.signature.failed

# Master Data Events
integration.masterdata.products.synced
integration.masterdata.stores.synced
integration.masterdata.sync.failed

# Communication Events
integration.comms.sms.sent
integration.comms.sms.delivered
integration.comms.sms.failed
integration.comms.email.sent
integration.comms.email.delivered
integration.comms.push.sent
```

**Events Consumed**:
```
# From Orchestration Service
projects.service_order.created
projects.service_order.status_changed
projects.tv_outcome.recorded
projects.service_order.cancelled

# From Execution Service
execution.checkout.completed

# From Contracts Service
contracts.contract.signed
contracts.wcf.signed

# External System Events (Kafka)
sales.pyxis.order.created
sales.tempo.service.requested
sales.*.order.cancelled
esign.signature.completed
esign.signature.declined
comms.sms.delivery_receipt
comms.email.delivery_receipt
```

**Database Schema**: `integrations` (adapter configs, mappings, audit logs)

**Dependencies**:
- **Orchestration & Control**: To create/update service orders
- **Scheduling**: To provide availability data
- **Configuration**: For adapter configurations and transformation rules
- **Kafka**: For event streaming (REQUIRED)
- **Redis**: For caching sales system configurations
- **External Systems**:
  - Pyxis/Tempo sales systems
  - Oracle ERP
  - Adobe Sign e-signature
  - Enterprise Messaging Service (SMS/Email)
  - Master Data Management (MDM) system
  - PingID SSO

**Architecture Pattern**:
```typescript
// Adapter Registry Pattern
@Injectable()
export class SalesAdapterRegistry {
  private adapters = new Map<string, ISalesAdapter>();

  constructor(
    private readonly pyxisAdapter: PyxisAdapter,
    private readonly tempoAdapter: TempoAdapter,
    private readonly sapAdapter: SapAdapter,
  ) {
    this.adapters.set('pyxis', this.pyxisAdapter);
    this.adapters.set('tempo', this.tempoAdapter);
    this.adapters.set('sap', this.sapAdapter);
  }

  async processOrder(sourceSystem: string, externalOrder: any): Promise<ServiceOrder> {
    const adapter = this.getAdapter(sourceSystem);
    const normalized = await adapter.transformOrder(externalOrder);
    await this.orderRepository.create(normalized);
    await this.kafkaProducer.send({
      topic: 'projects.service_order.created',
      key: normalized.id,
      value: normalized,
    });
    return normalized;
  }
}

// Sales Adapter Interface
export interface ISalesAdapter {
  transformOrder(externalOrder: any): Promise<ServiceOrder>;
  sendOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<void>;
  requestCancellation(orderId: string, reason: string): Promise<void>;
  sendTVModifications(orderId: string, modifications: Modification[]): Promise<void>;
}
```

**Kafka Topics**:
```
# Input Topics (from sales systems)
sales.pyxis.order.created
sales.tempo.service.requested
sales.{system}.order.updated
sales.{system}.order.cancelled

# Output Topics (to sales systems)
fsm.order.status_updated
fsm.order.assigned
fsm.order.completed
fsm.tv.outcome_recorded
fsm.tv.modifications_required
```

**Monitoring & Observability** (Datadog):
```
Metrics:
- integration.adapter.{system}.orders.received (counter)
- integration.adapter.{system}.orders.normalized (counter)
- integration.adapter.{system}.orders.failed (counter)
- integration.adapter.{system}.transformation.duration (histogram)
- integration.adapter.{system}.api.latency (histogram)
- integration.adapter.{system}.health (gauge)

Alerts:
- Adapter transformation failure rate > 5%
- Sales system API latency > 2s (p95)
- Kafka consumer lag > 1000 messages
- Adapter health check failing
```

---

### Other Integration Adapters

These are **stateless, event-driven services** that bridge between domain services and external systems.

**Implementation Note**: The adapters below are part of the Integration Adapters Service (Service 10) described above, but are listed separately for clarity.

### ERP Adapter (Oracle)
- **Inbound**: None (one-way)
- **Outbound**: Send service completion status, amounts, provider IDs for payment processing

### E-Signature Adapter (Adobe Sign)
- **Inbound**: Webhook callbacks from e-signature provider
- **Outbound**: Send contracts/WCFs for signature

### Master Data Adapter
- **Inbound**: Sync products, services, stores, pricing
- **Outbound**: None (read-only)

### Communication Gateways (SMS/Email/Push)
- **Inbound**: Delivery receipts
- **Outbound**: Send notifications via Enterprise Messaging Service

---

## Service Interaction Patterns

### Synchronous (API Calls)
Use for:
- Real-time queries (availability slots, provider details)
- User-initiated actions (create order, assign provider)
- Authorization checks

**Pattern**:
```typescript
// Scheduling service calls Provider & Capacity service
const calendar = await providerService.getTeamCalendar(teamId);
const capacity = await providerService.getTeamCapacity(teamId);
```

### Asynchronous (Events)
Use for:
- State changes (order created, assignment confirmed)
- Cross-service workflows (TV outcome → unblock installation)
- Audit trail
- Analytics

**Pattern**:
```typescript
// Orchestration service publishes event
await kafka.publish('projects.service_order.created', {
  id: order.id,
  projectId: order.projectId,
  serviceType: order.serviceType,
  // ...
});

// Assignment service consumes event
@EventPattern('projects.service_order.created')
async handleOrderCreated(event: ServiceOrderCreatedEvent) {
  // Trigger auto-assignment if configured
}
```

### Backend for Frontend (BFF)
Use for:
- Aggregating data from multiple services for UI
- Client-specific optimizations

**Pattern**:
```typescript
// Operator BFF aggregates control tower data
class ControlTowerBFF {
  async getDashboard(userId: string) {
    const [unassignedJobs, todayJobs, alerts, capacity] = await Promise.all([
      orchestrationService.getUnassignedJobs(),
      executionService.getTodayJobs(),
      orchestrationService.getAlerts(),
      providerService.getCapacitySummary()
    ]);

    return { unassignedJobs, todayJobs, alerts, capacity };
  }
}
```

## Service Deployment Model

### Phase 1: Modular Monolith
All services run in a single Node.js process, separated by NestJS modules.

```
src/
├── modules/
│   ├── identity-access/
│   ├── provider-capacity/
│   ├── orchestration-control/
│   ├── scheduling/
│   ├── assignment-dispatch/
│   ├── execution-mobile/
│   ├── communication/
│   ├── contracts-documents/
│   └── configuration/
├── main.ts
```

### Phase 2: Selective Extraction
Extract high-load or independently evolving services.

```
Separate deployments:
- scheduling-service (independent scaling)
- assignment-service (CPU-intensive scoring)
- mobile-bff (different release cycle)

Monolith remains:
- identity-access
- provider-capacity
- orchestration-control
- execution
- communication
- contracts-documents
- configuration
```

## Service Size Guidelines

| Service | Estimated LoC | Complexity | Extraction Priority |
|---------|--------------|------------|---------------------|
| Identity & Access | 5k-8k | Low | Low (foundational) |
| Provider & Capacity | 10k-15k | Medium | Medium |
| Orchestration & Control | 15k-20k | High | Low (core orchestrator) |
| Scheduling | 8k-12k | High | **High** (CPU-intensive) |
| Assignment & Dispatch | 10k-15k | High | **High** (scoring logic) |
| Execution & Mobile | 12k-18k | Medium | Medium |
| Communication | 6k-10k | Low | Low |
| Contracts & Documents | 8k-12k | Low | Low |
| Configuration | 5k-8k | Low | Low (foundational) |

## Next Steps

1. Review domain-specific documents in `/domain` folder
2. Study API specifications in `/api` folder
3. Understand event schemas in `/integration/02-event-schema-registry.md`
4. Review data architecture in `./04-data-architecture.md`

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
**Owner**: Platform Architecture Team
