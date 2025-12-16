# Architecture Overview

## Purpose

This document provides a high-level overview of the AHS Field Service Execution Platform architecture, explaining the key design decisions, architectural patterns, and system organization.

## Vision

Build a **simple, modular, scalable, and resilient** field service management platform that:

- Starts as a **modular monolith** for rapid development and low operational complexity
- Has **clear service boundaries** enabling future extraction into microservices
- Uses **event-driven architecture** for loose coupling and extensibility
- Supports **multi-country, multi-currency, multi-language** operations
- Scales to **10,000+ bookings/month** with **1,000+ concurrent users**
- Achieves **99.9% uptime** with robust resilience patterns

## Architectural Principles

### 1. Start Simple, Scale Smart
- Begin with modular monolith (single deployment unit)
- Extract services only when clear scaling or organizational needs arise
- Avoid premature distribution complexity

### 2. Clear Boundaries, Loose Coupling
- Define services by business domain boundaries
- Communicate via events (Kafka) and well-defined APIs
- Each service owns its data (no shared databases)

### 3. Event-Driven Core
- Domain events as primary integration mechanism
- Async processing for non-critical paths
- Event sourcing for audit-critical operations

### 4. API-First Design
- All functionality exposed via REST APIs
- OpenAPI specifications before implementation
- Backend-for-Frontend (BFF) pattern for diverse clients

### 5. Security by Design
- Authentication at edge (API Gateway)
- Authorization at service level (fine-grained RBAC)
- Data encryption at rest and in transit
- GDPR compliance built-in

### 6. Observability First
- Distributed tracing from day 1
- Structured logging with correlation IDs
- Business and technical metrics
- Proactive alerting on SLAs

### 7. Resilience as Default
- Circuit breakers for external dependencies
- Retry with exponential backoff
- Idempotent operations
- Graceful degradation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXPERIENCE LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Operator   │  │   Provider   │  │   Customer   │              │
│  │   Web App    │  │  Mobile App  │  │    Portal    │              │
│  │   (React)    │  │   (RN/Flutter)│  │  (Next.js)   │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                       │
│         └──────────────────┴──────────────────┘                      │
│                            │                                          │
└────────────────────────────┼──────────────────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────────────────┐
│                            ▼                                          │
│                    ┌────────────────┐                                │
│                    │  API Gateway   │                                │
│                    │  (Kong/Traefik)│                                │
│                    │                │                                │
│                    │ • Auth (JWT)   │                                │
│                    │ • Rate Limit   │                                │
│                    │ • Routing      │                                │
│                    │ • Validation   │                                │
│                    └────────┬───────┘                                │
│                             │                                          │
├─────────────────────────────┼──────────────────────────────────────────┤
│                   DOMAIN & API LAYER                                 │
├─────────────────────────────┼──────────────────────────────────────────┤
│                             │                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   MODULAR MONOLITH                           │    │
│  │              (Later: Microservices if needed)                │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │                                                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │    │
│  │  │  Identity &  │  │  Provider &  │  │ Orchestration│      │    │
│  │  │    Access    │  │   Capacity   │  │  & Control   │      │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │    │
│  │                                                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │    │
│  │  │  Scheduling  │  │  Assignment  │  │  Execution   │      │    │
│  │  │      &       │  │      &       │  │      &       │      │    │
│  │  │ Availability │  │   Dispatch   │  │    Mobile    │      │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │    │
│  │                                                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │    │
│  │  │Communication │  │  Contracts,  │  │ Configuration│      │    │
│  │  │      &       │  │  Documents   │  │   Service    │      │    │
│  │  │Notifications │  │   & Media    │  │              │      │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │    │
│  │                                                               │    │
│  └───────────────────────────┬───────────────────────────────────┘    │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
┌──────────────────────────────┼────────────────────────────────────────┐
│                   FOUNDATION & INTEGRATION LAYER                     │
├──────────────────────────────┼────────────────────────────────────────┤
│                              │                                        │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                    Message Bus (Kafka)                    │       │
│  │  • Domain Events  • Integration Events  • Audit Trail    │       │
│  └──────────────────────────────────────────────────────────┘       │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  PostgreSQL │  │ OpenSearch  │  │   Redis     │                 │
│  │   (Primary  │  │   (Search   │  │   (Cache)   │                 │
│  │     DB)     │  │   & Index)  │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │       Object Storage (Google Cloud Storage / GCS)      │        │
│  │  • Contracts  • WCF  • Photos  • Videos  • Documents   │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    INTEGRATION ADAPTERS                       │   │
│  │  (Stateless, Event-Driven, Idempotent)                       │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│  │  │  Sales  │  │   ERP   │  │E-Sign   │  │ Master  │        │   │
│  │  │ (Pyxis) │  │(Oracle) │  │Provider │  │  Data   │        │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │
│  │                                                               │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │   │
│  │  │   SMS   │  │  Email  │  │ PingID  │                      │   │
│  │  │ Gateway │  │Provider │  │   SSO   │                      │   │
│  │  └─────────┘  └─────────┘  └─────────┘                      │   │
│  │                                                               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Layered Architecture

### Experience Layer
**Purpose**: User-facing applications and interfaces

**Components**:
- **Operator Web App**: React SPA for AHS service operators
  - Control tower dashboards
  - Calendar and Gantt views
  - Provider and capacity management
  - Task and alert management

- **Provider Mobile App**: React Native for field technicians
  - Job list and navigation
  - Check-in/checkout
  - Checklists and media capture
  - Offline-first with sync

- **Customer Portal**: Next.js for customer self-service
  - Appointment viewing
  - Rescheduling
  - Contract signing
  - Document upload

**Key Characteristics**:
- Thin clients (business logic in backend)
- Backend-for-Frontend (BFF) pattern
- State management via TanStack Query / React Query
- Progressive Web App (PWA) capabilities

### Domain & API Layer
**Purpose**: Core business logic and service orchestration

**Services** (see [Service Boundaries](./03-service-boundaries.md) for details):
1. Identity & Access
2. Provider & Capacity
3. Orchestration & Control
4. Scheduling & Availability
5. Assignment & Dispatch
6. Execution & Mobile
7. Communication & Notifications
8. Contracts, Documents & Media
9. Configuration Service

**Key Characteristics**:
- Domain-Driven Design (DDD) principles
- Clear bounded contexts
- RESTful APIs with OpenAPI specs
- Event publishing to Kafka
- Service-to-service communication via APIs + events

### Foundation & Integration Layer
**Purpose**: Data persistence, messaging, and external integrations

**Data Stores**:
- **PostgreSQL**: Primary relational database
  - Separate schemas per service
  - Partitioning for high-volume tables
  - Row-level security for multi-tenancy

- **OpenSearch**: Search and analytics
  - Full-text search across entities
  - Operational dashboards
  - Provider scorecards

- **Redis**: Caching and session storage
  - Hot availability slots
  - Session tokens
  - Rate limiting counters

- **Object Storage**: Documents and media
  - Contracts and WCFs (PDF)
  - Photos, videos, audio
  - Blueprints and permits

**Messaging**:
- **Kafka**: Event streaming platform
  - Domain events (internal)
  - Integration events (external)
  - Audit trail
  - Schema registry for contracts

**Integration Adapters**:
- Thin, stateless services
- Event-driven (consume from / produce to Kafka)
- Idempotent operations
- Circuit breaker pattern

## Deployment Model

### Phase 1: Modular Monolith (Months 1-12)
```
┌─────────────────────────────────────┐
│      Single Application Pod         │
│                                     │
│  ┌────────────────────────────┐   │
│  │   All 9 Services           │   │
│  │   (Separate modules)       │   │
│  └────────────────────────────┘   │
│                                     │
│  Shared: DB Pool, Config, Logging  │
└─────────────────────────────────────┘
```

**Advantages**:
- Simple deployment
- Low operational overhead
- Easy local development
- Fast inter-service communication (in-process)

**Challenges**:
- Vertical scaling only
- Single failure domain
- Requires discipline for module boundaries

### Phase 2: Selective Extraction (Months 13-18)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Scheduling  │  │  Assignment  │  │ Mobile BFF   │
│   Service    │  │   Service    │  │   Service    │
│ (Independent)│  │(Independent) │  │(Independent) │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
        ┌─────────────────────────────────────┐
        │   Core Monolith (Remaining Svc)     │
        │  • Identity  • Provider             │
        │  • Orchestration  • Execution       │
        │  • Communication  • Documents       │
        │  • Configuration                    │
        └─────────────────────────────────────┘
```

**Extract first**:
- **Scheduling**: High CPU, independent scaling needs
- **Assignment**: CPU-intensive scoring algorithms
- **Mobile BFF**: Different release cycle than core

### Phase 3: Full Microservices (If Needed, 18+ months)
Only if organizational or technical needs require it.

## Cross-Cutting Concerns

### Multi-Tenancy
- Tenant = Country + BU + (optionally) Store
- Tenant context in JWT claims
- Row-level security in Postgres
- Tenant-aware configuration
- See [Multi-Tenancy Strategy](./06-multi-tenancy-strategy.md)

### Observability
- **Tracing**: OpenTelemetry + Grafana Tempo
- **Metrics**: Prometheus + Grafana
- **Logging**: Structured JSON + Loki
- **Alerting**: Based on SLOs
- See [Observability Strategy](../operations/01-observability-strategy.md)

### Resilience
- Circuit breakers (external dependencies)
- Retry with exponential backoff
- Bulkheads (connection pools)
- Timeouts on all external calls
- Idempotency keys
- See [Scalability & Resilience](./07-scalability-resilience.md)

### Security
- JWT-based authentication (PingID SSO)
- RBAC with scope-based authorization
- API rate limiting
- Secrets in vault (not env vars)
- GDPR compliance (anonymization, data residency)
- See [Security Architecture](../security/01-security-architecture.md)

### Configuration
- Hierarchical (EU → Country → BU → Store)
- Versioned and effective-dated
- Hot-reloadable (no restarts)
- Simulation mode for testing changes
- See [Configuration Service](../domain/04-scheduling-buffer-logic.md)

## Data Flow Example: Service Order Lifecycle

```
1. Sales System (Pyxis) → Sales Adapter
   ↓ (Kafka: sales.service_order.created)

2. Orchestration Service
   - Creates Project + Service Orders
   - Determines journey template
   - Publishes: service_order.created

3. Scheduling Service
   ↓ (API call from Pyxis for slot search)
   - Applies buffers
   - Checks provider capacity
   - Returns available slots

4. Customer selects slot → Pyxis confirms
   ↓ (Kafka: sales.service_order.scheduled)

5. Orchestration Service
   - Updates service order status
   - Publishes: service_order.ready_for_assignment

6. Assignment Service (event consumer)
   - Filters candidates
   - Scores providers
   - Creates offers
   - Publishes: assignment.offer_created

7. Provider accepts via mobile app
   ↓ (API: PUT /offers/{id}/accept)
   - Assignment Service confirms
   - Publishes: assignment.confirmed

8. Execution day: Technician checks in
   ↓ (Mobile API: POST /executions/{id}/checkin)
   - Execution Service records timestamp
   - Publishes: execution.started

9. Technician completes work, checks out
   ↓ (Mobile API: POST /executions/{id}/checkout)
   - Captures photos, notes
   - Creates WCF
   - Publishes: execution.completed

10. Customer signs WCF
    ↓ (Customer Portal API)
    - Contract Service stores signature
    - Publishes: wcf.accepted

11. Orchestration Service
    - Closes service order
    - Starts warranty period
    - Publishes: service_order.closed

12. ERP Adapter (event consumer)
    - Sends status to Oracle
    - Flags as ready for provider payment
```

## Technology Choices

See [Technical Stack](./02-technical-stack.md) for detailed rationale.

**Core Platform**:
- TypeScript + Node.js (NestJS framework)
- PostgreSQL 15+ (Cloud SQL)
- Kafka (Strimzi on GKE)
- Redis (Valkey / Memorystore)
- OpenSearch

**Frontend**:
- React + TypeScript
- React Native (mobile)
- Next.js (customer portal)

**Infrastructure**:
- Google Kubernetes Engine (GKE Autopilot)
- Terraform for IaC (GCP provider)
- GitHub Actions for CI/CD

## Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| **Availability** | 99.9% uptime | Monthly uptime percentage |
| **Performance** | < 500ms API p95 latency | APM metrics |
| **Scalability** | 10k bookings/month initially, 50k within 2 years | Load testing |
| **Throughput** | 100 req/sec sustained | Load testing |
| **Concurrent Users** | 1,000 operators + providers | Active sessions |
| **Data Residency** | EU data stays in EU | Infrastructure setup |
| **RPO** | < 1 hour (data loss) | Backup frequency |
| **RTO** | < 4 hours (recovery time) | DR drills |

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Modular monolith first | Faster development, lower ops overhead, clear extraction path | 2025-01-14 |
| Event-driven architecture | Loose coupling, audit trail, async processing | 2025-01-14 |
| PostgreSQL for primary DB | Rich features (JSONB, RLS, partitioning), battle-tested | 2025-01-14 |
| Kafka for messaging | Industry standard, durability, schema registry support | 2025-01-14 |
| TypeScript/Node.js | Developer productivity, ecosystem, hiring | 2025-01-14 |
| React Native for mobile | Code sharing, faster iteration, OTA updates | 2025-01-14 |
| OpenAPI-first | Clear contracts, auto-generated docs, client SDKs | 2025-01-14 |
| Managed Kubernetes | Balance of control and operational simplicity | 2025-01-14 |

## Next Steps

1. Review [Technical Stack](./02-technical-stack.md) for technology details
2. Understand [Service Boundaries](./03-service-boundaries.md)
3. Study [Data Architecture](./04-data-architecture.md)
4. Review domain-specific documentation in `/domain`

## References

- [PRD: AHS Field Service Execution Platform](/Users/20015403/Downloads/ahs_field_service_execution_prd.md)
- [Architecture Review Discussion](../../docs/architecture-review.md)
- [C4 Model](https://c4model.com/) for architecture diagrams
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
**Owner**: Platform Architecture Team
**Reviewers**: CTO, Engineering Leads
