# CLAUDE.md - AI Assistant Guide

**Last Updated**: 2026-01-28
**Project**: Yellow Grid Platform
**Status**: Phase 5 Complete - Production Deployed

---

## Quick Start for AI Assistants

This is the **Yellow Grid Platform**, a comprehensive Field Service Management (FSM) system for multi-country operations.

### Critical Context
- **Current State**: Production-ready Modular Monolith (Deployed to VPS)
- **Implementation Status**: Backend 100%, Web 95%, Mobile 50%
- **Team Size**: 1 engineer (Solo development with AI assistance)
- **Timeline**: ~24 weeks completed
- **Architecture Philosophy**: Modular Monolith (NestJS) with Event-Driven Architecture (Kafka)
- **Deployment**: Remote VPS (135.181.96.93) via `./deploy/deploy-remote.sh`
- **Live Demo**: https://135.181.96.93 (Web) | https://135.181.96.93/mobile/ (Mobile)

### Implementation Statistics
| Component | Files | Lines of Code | Status |
|-----------|-------|---------------|--------|
| Backend | 276 | ~53,500 | 100% Complete |
| Web App | 171 | ~6,000 | 95% Complete |
| Mobile App | 50+ | ~3,000 | 50% Complete |
| Database Schema | 75 models | ~3,200 | 100% Complete |
| E2E Tests | 126 tests | ~1,700 | Active |
| Documentation | 69 files | ~45,000 | 100% Complete |

---

## Repository Structure

```
yellow-grid/
├── README.md                          # Entry point
├── CLAUDE.md                          # This file - AI assistant guide
├── AGENTS.md                          # Repository guidelines (key reference!)
│
├── src/                               # PRODUCTION BACKEND (NestJS)
│   ├── modules/                       # 19 feature modules (52 services, 28 controllers)
│   ├── common/                        # Shared infrastructure & utilities
│   ├── camunda/                       # Workflow orchestration (10 workers)
│   └── main.ts                        # Application entry point
│
├── web/                               # WEB APP (React + Vite)
│   └── src/
│       ├── components/                # 18 component categories
│       ├── pages/                     # 17 page groups (8 portals)
│       ├── services/                  # 18 API service files
│       └── hooks/                     # Custom React hooks
│
├── mobile/                            # MOBILE APP (React Native + Expo)
│   └── src/
│       ├── screens/                   # 11 screen categories
│       ├── components/                # UI components
│       ├── database/                  # WatermelonDB models (offline-first)
│       └── store/                     # State management
│
├── camunda/                           # WORKFLOW DEFINITIONS
│   ├── processes/                     # BPMN workflow files
│   ├── decisions/                     # DMN decision tables
│   └── forms/                         # Workflow forms
│
├── deploy/                            # DEPLOYMENT SCRIPTS
│   ├── deploy-remote.sh               # Automated VPS deployment
│   ├── docker-compose.yml             # Production stack
│   └── Caddyfile                      # Reverse proxy config
│
├── prisma/                            # DATABASE
│   ├── schema.prisma                  # 75 models (~3,200 lines)
│   ├── migrations/                    # 13 versioned migrations
│   └── seed.ts                        # Demo data seeding
│
├── test/                              # Integration & E2E tests
├── e2e-tests.cjs                      # 78 functional E2E tests
├── e2e-navigation-tests.cjs           # 48 navigation E2E tests
│
├── documentation/                     # ENGINEERING SPECS
│   ├── README.md                      # Master documentation index
│   ├── architecture/ (11 docs)        # System design & technical decisions
│   ├── domain/ (13 docs)              # Business domain models & logic
│   ├── api/ (9 docs)                  # REST API specifications
│   └── implementation/                # Implementation tracking
│
├── dev.sh                             # Development CLI tool
├── docker-compose.dev.yml             # Local development stack
└── business-requirements/             # Source requirements (READ-ONLY)
```

---

## Development Commands

### Quick Reference (`./dev.sh`)

```bash
# Local Development
./dev.sh start       # Start postgres, redis, and API in watch mode
./dev.sh stop        # Stop local dev environment
./dev.sh web         # Start web app dev server

# Database
./dev.sh db reset    # Reset local database
./dev.sh db seed     # Seed with demo data
./dev.sh db studio   # Open Prisma Studio

# Testing
./dev.sh test        # Run unit tests
./dev.sh test unit   # Run with coverage
./dev.sh test e2e    # Run E2E tests
./dev.sh lint        # Run lint and type check

# Staging VPS
./dev.sh deploy      # Push to main (triggers CI/CD)
./dev.sh status      # Check staging VPS status
./dev.sh logs [svc]  # Tail logs (api, frontend, postgres)
./dev.sh ssh         # SSH into staging VPS
./dev.sh reset-demo  # Reset demo data on staging
```

### NPM Scripts

```bash
npm run start:dev      # Development with watch
npm run build          # Production build
npm test               # Unit tests
npm run test:e2e       # E2E tests
npm run lint           # ESLint fix
npm run prisma:migrate # Database migrations
npm run prisma:studio  # Prisma Studio
npm run docker:up      # Start containers
npm run staging:status # Check VPS status
```

---

## Remote Server (VPS) Quick Reference

### Connection Details
- **IP**: `135.181.96.93`
- **SSH**: `ssh -i deploy/vps_key root@135.181.96.93`
- **HTTPS**: Self-signed certificate - use `curl -sk` (skip verification)
- **Deploy Directory**: `/root/yellow-grid`

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Operator | `operator.fr@adeo.com` | `Admin123!` |
| Admin (FR) | `admin.fr@adeo.com` | `Admin123!` |
| Admin (ES) | `admin.es@adeo.com` | `Admin123!` |
| PSM | `psm.fr@adeo.com` | `Admin123!` |
| Seller | `seller.fr@adeo.com` | `Admin123!` |

### API Access Examples

```bash
# Health check
curl -sk "https://135.181.96.93/api/v1/health"

# Login and get token
TOKEN=$(curl -sk "https://135.181.96.93/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"operator.fr@adeo.com","password":"Admin123!"}' | jq -r '.data.accessToken')

# Authenticated request
curl -sk "https://135.181.96.93/api/v1/service-orders?take=5" \
  -H "Authorization: Bearer $TOKEN"
```

### Docker Commands (via SSH)

```bash
# View containers
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose ps"

# View API logs
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose logs api --tail 50"

# Restart API
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose restart api"
```

---

## Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime |
| TypeScript | 5.3 | Language |
| NestJS | 10.3 | Framework |
| Prisma | 6.19 | ORM |
| PostgreSQL | 15+ | Database |
| Redis | 7 | Caching |
| Kafka | 2.2 | Messaging |
| Camunda 8 | Zeebe 8.5 | Workflow Engine |
| JWT | Passport.js | Authentication |

### Frontend (Web)
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI Framework |
| Vite | 5.0 | Build Tool |
| TailwindCSS | 3.4 | Styling |
| Zustand | 4.5 | State Management |
| React Query | 5.17 | Server State |
| React Hook Form | 7.49 | Forms |
| Playwright | 1.57 | E2E Testing |

### Mobile
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81 | Framework |
| Expo | 54 | Dev Platform |
| WatermelonDB | 0.28 | Offline Database |
| Zustand | 5.0 | State Management |

---

## Backend Modules (19 Implemented)

| Module | Services | Controllers | Description |
|--------|----------|-------------|-------------|
| Auth | 1 | 1 | JWT, RBAC, role management |
| Users | 1 | 1 | CRUD, profile management |
| Providers | 3 | 2 | Provider hierarchy, zones, calendars |
| Service Orders | 4 | 2 | Core FSM, state machine, assignments |
| Scheduling | 2 | 1 | Buffer logic, slot calculation |
| Execution | 2 | 1 | Check-in/out, WCF completion |
| Contracts | 2 | 1 | E-signature (DocuSign, Adobe Sign) |
| Technical Visits | 1 | 1 | Pre-installation assessments |
| Tasks | 1 | 1 | Task management with audit logs |
| Notifications | 3 | 1 | SMS (Twilio), email (SendGrid), push |
| Dashboard | 1 | 1 | Analytics & KPIs |
| Performance | 1 | 1 | Metrics & reporting |
| Sales Integration | 2 | 1 | External system sync |
| Simulator | 1 | 1 | Sales system simulation |
| Chat | 2 | 1 | 4-party messaging system |
| Customer Portal | 1 | 1 | Customer-facing interface |
| Config | 1 | 1 | System & country configuration |
| Camunda | 10 workers | - | Workflow orchestration |
| Common | 5 | - | Shared infrastructure |

**Total**: 52 services, 28 controllers, 161+ REST endpoints

---

## Web Application (8 Portals)

| Portal | Pages | Description |
|--------|-------|-------------|
| Service Operator | 12 | Control tower, assignments, scheduling |
| Provider Portal | 11 | Work orders, calendar, team management |
| PSM Portal | 8 | Provider service management |
| Seller Portal | 8 | Sales integration, technical visits |
| Admin Portal | 7 | System configuration, user management |
| Catalog Manager | 5 | Offer/product catalog management |
| Customer Portal | 7 | Customer self-service |
| Support Portal | 5 | Internal support tools |

**Features**: AI Chat Assistant with streaming, 7 specialized modal dialogs, responsive design

---

## Database Schema (Key Entities)

### Provider Hierarchy

```
Provider (legal entity)
├── ProviderWorkingSchedule (1:1)     # Working days, shifts, capacity
├── InterventionZone[] (1:N)          # Geographic coverage (PRIMARY/SECONDARY/OVERFLOW)
├── ServicePriorityConfig[] (1:N)     # Service preferences (P1/P2/OPT_OUT)
├── ProviderStoreAssignment[] (N:M)   # Store coverage
└── WorkTeam[] (1:N)                  # Field units (ATOMIC - no individual tracking)
    ├── WorkTeamZoneAssignment[] (N:M)  # Zone assignments
    ├── WorkTeamCalendar (1:1)          # Calendar with inheritance
    │   ├── PlannedAbsence[]            # Vacation, sick leave
    │   └── DedicatedWorkingDay[]       # Extra capacity days
    └── WorkTeamCertification[] (1:N)   # Team-level certifications
```

### Legal Note: Work Teams vs Technicians
The platform operates at the **Work Team level** only. Individual technicians are NOT tracked to avoid co-employer liability under EU/French labor law. See `documentation/design/LEGAL_BOUNDARY_WORKTEAM_VS_TECHNICIAN.md`.

### Key Enums
```typescript
ProviderTypeEnum: P1, P2                  // Provider hierarchy type
ServicePriorityType: P1, P2, OPT_OUT      // Service preferences per specialty
ServiceUrgency: URGENT, STANDARD, LOW     // Service order response time
RiskLevel: NONE, LOW, MEDIUM, HIGH, CRITICAL
ZoneType: PRIMARY, SECONDARY, OVERFLOW
WorkTeamStatus: ACTIVE, INACTIVE, ON_VACATION, SUSPENDED
AbsenceType: VACATION, SICK_LEAVE, TRAINING, MAINTENANCE, STORE_CLOSURE, OTHER
```

### Chat System (4-Party Communication)
- **ServiceOrderConversation**: One conversation per service order
- **ConversationParticipant**: CUSTOMER, OPERATOR, WORK_TEAM, PROVIDER_MANAGER, SYSTEM
- **ServiceOrderMessage**: TEXT/IMAGE/FILE/SYSTEM types with status (SENT/DELIVERED/READ)

---

## Workflow Orchestration (Camunda 8)

### Implemented Workers (10)
1. **ValidateServiceOrder** - Order validation
2. **CheckProviderAvailability** - Availability checks
3. **CalculateAssignmentScore** - Provider scoring
4. **SendAssignmentOffer** - Offer dispatch
5. **ProcessOfferResponse** - Response handling
6. **NotifyCustomer** - Customer notifications
7. **ScheduleAppointment** - Appointment booking
8. **ExecuteServiceOrder** - Execution tracking
9. **GenerateWCF** - Work Closing Form
10. **HandleEscalation** - Escalation logic

### BPMN Processes
- Service Order Assignment
- Technical Visit Flow
- Contract Lifecycle
- Escalation Management

---

## Testing

### Test Coverage
| Type | Count | Tool |
|------|-------|------|
| Unit Tests | 45 files | Jest |
| E2E Functional | 78 tests | Playwright |
| E2E Navigation | 48 tests | Playwright |
| Integration | 14 files | Jest + Testcontainers |

### Running Tests
```bash
# Unit tests
npm test -- --runInBand

# E2E tests (functional)
node e2e-tests.cjs

# E2E tests (navigation)
node e2e-navigation-tests.cjs

# With coverage
npm run test:cov
```

---

## Key Business Concepts

### Multi-Tenancy Hierarchy
```
Country (ES, FR, IT, PL, PT)
  └── Business Unit (Leroy Merlin, Brico Depot)
      └── Store (individual locations)
```

### Service Order Lifecycle
```
CREATED → SCHEDULED → ASSIGNED → ACCEPTED → IN_PROGRESS →
COMPLETED → VALIDATED → CLOSED
```

### Service Types
- **URGENT**: 24-72h response time (maps to P1 provider assignment)
- **STANDARD**: 3-7 days response time (maps to P2 provider assignment)
- **LOW**: Flexible scheduling
- **NO P3** (explicitly excluded from scope)

### Critical Workflows

**1. Technical Visit (TV) Flow**:
- Pre-installation assessment
- Three outcomes: YES / YES-BUT / NO
- Can block/unblock installation orders
- Integration with sales for scope changes

**2. Assignment Transparency** (UNIQUE DIFFERENTIATOR):
- Complete funnel audit trail
- Scoring breakdown with rationale
- Multiple modes: direct, offer, broadcast
- Country-specific auto-accept (ES/IT)

**3. Contract Lifecycle**:
- Pre-service contract generation & e-signature
- Post-service Work Closing Form (WCF)
- Customer acceptance/refusal workflow
- Warranty period tracking

---

## Development Conventions

### Code Style
- TypeScript strict mode enabled
- 2-space indentation
- ESLint + Prettier enforced
- No `any` types (use `unknown` if needed)
- Explicit return types on functions

### Naming Conventions

**REST API**:
- Plural collections: `/api/v1/providers`
- Singular instances: `/api/v1/providers/{providerId}`
- Query params: snake_case (e.g., `?country_code=FR`)

**Kafka Events**:
- Format: `{domain}.{entity}.{action}`
- Examples: `sales.order.created`, `assignment.offer.accepted`

**Database**:
- Tables: snake_case (e.g., `service_orders`, `work_teams`)
- Columns: snake_case (e.g., `country_code`, `created_at`)

### API Response Format
All endpoints return:
```typescript
{
  data: T,           // Response payload
  meta: {            // Pagination, etc.
    total?: number,
    page?: number,
    limit?: number
  }
}
```

---

## Security

### Authentication & Authorization
- **Auth**: JWT tokens (Passport.js)
- **RBAC**: Fine-grained role-based access control
- **Multi-tenancy**: Application-level with nestjs-cls

### Security Checklist
- [ ] Input validation (class-validator)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (sanitize inputs)
- [ ] Rate limiting (express-rate-limit, @nestjs/throttler)
- [ ] Secrets in environment variables
- [ ] Helmet middleware enabled
- [ ] CORS configured

---

## AI Assistant Guidelines

### When Implementing Features

1. **Read Relevant Docs First**:
   - Check `documentation/domain/` for business rules
   - Check `documentation/api/` for API contracts
   - Check existing module implementations for patterns

2. **Follow Existing Patterns**:
   - NestJS module structure (module, service, controller, dto)
   - Use DTOs with class-validator for all inputs
   - Follow the established response format

3. **Write Tests**:
   - Unit tests alongside code (`*.spec.ts`)
   - E2E tests for critical flows
   - Aim for 80%+ coverage

4. **Update Documentation**:
   - Update IMPLEMENTATION_TRACKING.md when completing tasks
   - Update API specs if changes are made

### When Reviewing Code

1. **Check Against Specs**:
   - Verify implementation matches API specs
   - Verify business rules match domain docs

2. **Review Quality**:
   - TypeScript strict compliance
   - Tests present and passing
   - Error handling is proper
   - Logging includes context

3. **Check Security**:
   - Input validation present
   - Authorization checks correct
   - No secrets in code

### When Answering Questions

1. **Cite Documentation**:
   - Reference specific files: `documentation/domain/02-provider-capacity-domain.md:45-67`

2. **Consider Context**:
   - This is a production codebase with real deployment
   - 161+ endpoints are implemented
   - Check existing code for patterns

3. **Be Specific**:
   - Provide concrete examples from the codebase
   - Reference actual file locations

---

## Documentation Navigation

### For New AI Assistants - Read These First

**Phase 1 - Understanding the System** (30 min):
1. `documentation/00-ENGINEERING_KIT_SUMMARY.md` - High-level overview
2. `documentation/README.md` - Master index
3. `documentation/architecture/01-architecture-overview.md` - System design

**Phase 2 - Domain Knowledge** (As needed):
- `documentation/domain/01-domain-model-overview.md` - DDD principles
- Specific domain files for the feature you're working on

**Phase 3 - API Contracts** (As needed):
- `documentation/api/01-api-design-principles.md` - REST standards
- Specific API files for the endpoints you're implementing

### Quick Reference by Task

| Task | Read This |
|------|-----------|
| Understanding architecture | architecture/01-architecture-overview.md |
| Provider management | domain/02-provider-capacity-domain.md |
| Service orders | domain/03-project-service-order-domain.md |
| Scheduling logic | domain/04-scheduling-buffer-logic.md |
| Assignment transparency | domain/05-assignment-dispatch-logic.md |
| Mobile operations | domain/06-execution-field-operations.md |
| Contract lifecycle | domain/07-contract-document-lifecycle.md |
| Database schemas | infrastructure/02-database-design.md |
| Kafka events | integration/02-event-schema-registry.md |
| Security & RBAC | security/02-rbac-model.md |
| Testing approach | testing/01-testing-strategy.md |

---

## Key File Locations

### Backend (src/)
- `src/main.ts` - Application entry point
- `src/app.module.ts` - Root module
- `src/modules/service-orders/` - Core FSM logic
- `src/modules/scheduling/` - Slot calculation & buffers
- `src/modules/assignments/` - Dispatch logic
- `src/modules/contracts/` - E-signature integration
- `src/modules/chat/` - 4-party messaging
- `src/camunda/` - Workflow workers

### Frontend (web/)
- `web/src/pages/` - 17 page groups
- `web/src/components/` - 18 component categories
- `web/src/services/` - 18 API client services

### Database
- `prisma/schema.prisma` - 75 models
- `prisma/migrations/` - 13 migrations
- `prisma/seed.ts` - Demo data

### Testing
- `test/` - Integration tests
- `e2e-tests.cjs` - 78 functional tests
- `e2e-navigation-tests.cjs` - 48 navigation tests

### Deployment
- `deploy/deploy-remote.sh` - VPS deployment
- `deploy/docker-compose.yml` - Production stack
- `docker-compose.dev.yml` - Development stack

---

## Common Pitfalls

### Do's
- Start with modular monolith (already done)
- Keep clear module boundaries
- Use application-level tenant filtering (nestjs-cls)
- Write tests alongside code
- Use TypeScript strict mode
- Validate all API inputs
- Handle errors explicitly
- Log with correlation IDs

### Don'ts
- Don't create microservices from day 1
- Don't use `any` type in TypeScript
- Don't skip error handling
- Don't log sensitive data
- Don't commit secrets
- Don't bypass validation
- Don't skip tests

---

## Glossary

| Term | Meaning |
|------|---------|
| FSM | Field Service Management |
| TV | Technical Visit (pre-installation assessment) |
| WCF | Work Closing Form (post-service documentation) |
| P1/P2 | Provider types / Service urgency levels |
| RLS | Row-Level Security (PostgreSQL feature) |
| RBAC | Role-Based Access Control |
| DDD | Domain-Driven Design |
| BFF | Backend For Frontend |

---

## Philosophy

**Start Simple. Scale Smart. Build for Change.**

- Begin with the simplest solution that works
- Add complexity only when proven necessary
- Keep clear boundaries even in a monolith
- Test everything, deploy frequently, monitor constantly
- Document decisions, learn from mistakes, iterate rapidly

---

**Document Version**: 3.0.0
**Created**: 2025-01-15
**Updated**: 2026-01-28
**Maintained By**: Development Team + AI Assistants
**Review Frequency**: Monthly or when major changes occur
