# CLAUDE.md - AI Assistant Guide

**Last Updated**: 2025-01-15
**Project**: AHS Field Service Execution Platform
**Status**: Documentation Phase (Pre-Development)

---

## 🎯 Quick Start for AI Assistants

This is the **AHS Field Service Execution Platform**, a comprehensive field service management system for multi-country operations. The project is currently in the **documentation and planning phase** with no code implementation yet.

### Critical Context
- **Current State**: Comprehensive engineering documentation (40+ files, ~39,400 lines)
- **Implementation Status**: Pre-development (documentation complete, code not started)
- **Team Size**: Expected 10-14 engineers
- **Timeline**: 28-week implementation roadmap planned
- **Architecture Philosophy**: Start simple (modular monolith), scale smart (microservices when needed)

---

## 📁 Repository Structure

```
/home/user/fsm/
├── product-docs/              # Complete engineering documentation (40+ files)
│   ├── README.md              # Master documentation index
│   ├── IMPLEMENTATION_GUIDE.md # 28-week roadmap
│   ├── DOCUMENTATION_STATUS.md # Completion tracker
│   ├── architecture/          # System design & technical decisions (5 docs)
│   ├── domain/                # Business domain models & logic (9 docs)
│   ├── api/                   # REST API specifications (8 docs)
│   ├── integration/           # External system integrations (7 docs)
│   ├── security/              # Security, RBAC, GDPR (6 docs)
│   ├── infrastructure/        # Database, Kafka, deployment (7 docs)
│   ├── operations/            # Monitoring, logging, incidents (6 docs)
│   ├── testing/               # Testing strategies & standards (6 docs)
│   └── development/           # Dev workflows, coding standards (6 docs)
├── docs/                      # Architecture simplification analysis
│   ├── architecture-simplification-analysis.md
│   └── simplification-quick-reference.md
├── ARCHITECTURE_SIMPLIFICATION.md  # Key simplification recommendations
├── ENGINEERING_KIT_SUMMARY.md     # High-level project summary
├── DOCUMENTATION_FIXES.md         # Documentation improvement notes
└── AGENTS.md                      # Repository guidelines for AI agents
```

---

## 🏗️ System Architecture Overview

### Architectural Approach
**Start as Modular Monolith** → Extract to Microservices only when needed

### Core Domain Services (9 services, can be simplified to 6)

**Original 9 Services**:
1. **Identity & Access** - Authentication, RBAC, JWT, user management
2. **Configuration** - System config, feature flags, business rules
3. **Provider & Capacity** - Provider hierarchy, teams, calendars, zones
4. **Orchestration & Control** - Projects, service orders, journeys, tasks
5. **Scheduling & Availability** - Buffer logic, slot calculation, capacity
6. **Assignment & Dispatch** - Candidate filtering, scoring, offers
7. **Execution & Mobile** - Check-in/out, checklists, offline sync
8. **Communication & Notifications** - SMS, email, masked communication
9. **Contracts, Documents & Media** - E-signature, WCF, storage

**Simplified 6 Services** (see ARCHITECTURE_SIMPLIFICATION.md):
1. **Platform Service** (Identity + Configuration merged)
2. **Provider & Capacity**
3. **Orchestration & Control**
4. **Dispatch Service** (Scheduling + Assignment merged)
5. **Execution & Mobile**
6. **Customer Interaction** (Communication + Contracts merged)

### Technology Stack

**Backend**:
- Language: TypeScript
- Framework: NestJS
- Runtime: Node.js 20 LTS
- ORM: Prisma
- Validation: class-validator, class-transformer

**Database**:
- Primary: PostgreSQL 15+ (multi-schema with RLS, or simplified single schema)
- Caching: Redis/Valkey
- Search: PostgreSQL Full-Text Search (or OpenSearch for advanced needs)

**Messaging & Events**:
- Primary: Apache Kafka (Confluent Cloud / AWS MSK)
- Alternative: PostgreSQL Outbox Pattern (simpler, see ARCHITECTURE_SIMPLIFICATION.md)
- Schema: Avro with Schema Registry

**Frontend**:
- Web: React + TypeScript
- Mobile: React Native
- State: Redux/Zustand
- API: REST (OpenAPI 3.1)

**Infrastructure**:
- Container: Docker
- Orchestration: Kubernetes (AWS EKS / Azure AKS)
- CI/CD: GitHub Actions
- Cloud: AWS or Azure

**Observability**:
- Tracing: OpenTelemetry (or simplified correlation IDs)
- Metrics: Prometheus + Grafana
- Logging: Structured JSON logs
- APM: Datadog/New Relic

---

## 📋 Key Business Domain Concepts

### Multi-Tenancy Hierarchy
```
Country (ES, FR, IT, PL)
  └── Business Unit (Leroy Merlin, Brico Depot)
      └── Store (individual locations)
```

### Service Order Lifecycle
```
CREATED → SCHEDULED → ASSIGNED → ACCEPTED → IN_PROGRESS →
COMPLETED → VALIDATED → CLOSED
```

### Provider Hierarchy
```
Provider (legal entity)
  └── Work Teams (field units)
      └── Technicians (individuals)
```

### Service Types
- **P1 (Priority)**: 24-72h response time
- **P2 (Standard)**: 3-7 days response time
- **NO P3** (explicitly excluded from scope)

### Critical Workflows

**1. Technical Visit (TV) Flow**:
- Pre-installation assessment visit
- Three outcomes: YES / YES-BUT / NO
- Can block/unblock subsequent installation orders
- Integration with sales for scope changes

**2. Assignment Transparency**:
- Funnel audit trail (who was filtered out and why)
- Scoring breakdown with rationale
- Multiple assignment modes: direct, offer, broadcast
- Country-specific auto-accept (ES/IT)

**3. Contract Lifecycle**:
- Pre-service contract generation & e-signature
- Post-service Work Closing Form (WCF)
- Customer acceptance/refusal workflow
- Warranty period tracking

---

## 🔧 Development Conventions

### File & Code Organization

**NestJS Module Structure** (when implementation starts):
```
src/
├── modules/
│   ├── platform/           # Identity + Configuration
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── __tests__/
│   │   ├── rbac/
│   │   └── config/
│   ├── providers/          # Provider & Capacity
│   ├── orchestration/      # Projects, Orders, Journeys
│   ├── dispatch/           # Scheduling + Assignment
│   ├── execution/          # Execution & Mobile
│   └── customer/           # Communication + Contracts
├── common/                 # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
├── config/                 # Configuration
├── database/               # Prisma schema, migrations
└── main.ts
```

### Naming Conventions

**Files**:
- Modules: `*.module.ts`
- Services: `*.service.ts`
- Controllers: `*.controller.ts`
- DTOs: `*.dto.ts`
- Entities: `*.entity.ts`
- Tests: `*.spec.ts`

**REST API**:
- Plural collections: `/api/v1/providers`
- Singular instances: `/api/v1/providers/{providerId}`
- Nested resources: `/api/v1/providers/{providerId}/work-teams`
- Query params: snake_case (e.g., `?country_code=FR`)

**Kafka Events**:
- Format: `{domain}.{entity}.{action}`
- Examples:
  - `projects.service_order.created`
  - `assignment.offer.accepted`
  - `execution.checkin.completed`

**Database**:
- Tables: snake_case (e.g., `service_orders`, `work_teams`)
- Columns: snake_case (e.g., `country_code`, `created_at`)
- Indexes: `idx_{table}_{column}`
- Foreign keys: `fk_{table}_{ref_table}`

### Code Style

**TypeScript**:
- Strict mode enabled
- 2-space indentation
- ESLint + Prettier enforced
- No `any` types (use `unknown` if needed)
- Explicit return types on functions

**Imports Order**:
1. External modules (e.g., `@nestjs/common`)
2. Internal modules (e.g., `@/common/decorators`)
3. Relative imports

---

## 🧪 Testing Standards

### Coverage Requirements
- **Overall**: ≥80% coverage
- **Critical flows**: ≥90% coverage
- **State machines**: ≥95% coverage

### Test Pyramid
```
      E2E (10%)
    /         \
  Integration (30%)
 /                 \
Unit Tests (60%)
```

### Test Commands (when implemented)
```bash
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # E2E tests
npm run test               # All tests
npm run test:coverage      # Coverage report
npm run test:watch         # Watch mode
```

### Test File Locations
- Unit: `src/**/__tests__/*.spec.ts` or `src/**/*.spec.ts`
- Integration: `test/integration/**/*.test.ts`
- E2E: `test/e2e/**/*.e2e-spec.ts`

---

## 🔐 Security Considerations

### Authentication & Authorization
- **Auth**: JWT tokens (PingID SSO integration)
- **RBAC**: Fine-grained role-based access control
- **Permissions**: Resource-level permissions
- **Multi-tenancy**: Tenant isolation at app layer (or DB RLS)

### Security Checklist (for code reviews)
- [ ] Input validation (all API endpoints)
- [ ] SQL injection prevention (use Prisma parameterized queries)
- [ ] XSS prevention (sanitize user inputs)
- [ ] CSRF protection (SameSite cookies)
- [ ] Rate limiting (per user/IP)
- [ ] Secrets in environment variables (never in code)
- [ ] Sensitive data logging (mask PII)
- [ ] API authentication (JWT on all protected endpoints)
- [ ] Authorization checks (verify user permissions)
- [ ] Audit logging (sensitive operations)

### GDPR Compliance
- **Data Residency**: Country-specific data storage
- **Right to be Forgotten**: Delete/anonymize user data
- **Data Portability**: Export user data in standard format
- **Consent Management**: Track and enforce user consent
- **Audit Trail**: Log all data access and modifications

---

## 📝 Git Workflow & Commit Conventions

### Branch Strategy
```
main (production)
  ↑
develop (integration)
  ↑
feature/TICKET-ID-short-description
hotfix/TICKET-ID-critical-fix
```

### Commit Message Format
Follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting changes
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Build tasks, configs, etc.

**Examples**:
```bash
feat(assignment): add provider scoring transparency
fix(scheduling): correct buffer stacking for holidays
docs(api): update scheduling API examples
refactor(providers): extract scoring logic to separate service
```

### Pull Request Requirements
- **Approvals**: 1 approval (2 for critical changes: DB migrations, auth, API contracts)
- **CI**: All tests pass, lint passes, build succeeds
- **Coverage**: No coverage decrease
- **Documentation**: Update relevant docs if needed

---

## 📚 Documentation Navigation

### Essential Reads for New AI Assistants

**Phase 1 - Understanding the System** (Read First):
1. `ENGINEERING_KIT_SUMMARY.md` - High-level overview
2. `product-docs/README.md` - Master index
3. `product-docs/architecture/01-architecture-overview.md` - System design
4. `product-docs/architecture/03-service-boundaries.md` - Domain services
5. `ARCHITECTURE_SIMPLIFICATION.md` - Simplification recommendations

**Phase 2 - Domain Knowledge**:
1. `product-docs/domain/01-domain-model-overview.md` - DDD principles
2. `product-docs/domain/02-provider-capacity-domain.md` - Provider hierarchy
3. `product-docs/domain/03-project-service-order-domain.md` - Service orders
4. `product-docs/domain/05-assignment-dispatch-logic.md` - Assignment logic
5. `product-docs/domain/06-execution-field-operations.md` - Mobile operations

**Phase 3 - API Contracts**:
1. `product-docs/api/01-api-design-principles.md` - REST standards
2. `product-docs/api/02-authentication-authorization.md` - Auth & RBAC
3. Specific API docs in `product-docs/api/` as needed

**Phase 4 - Implementation Details**:
1. `product-docs/development/01-development-workflow.md` - Dev lifecycle
2. `product-docs/testing/01-testing-strategy.md` - Testing approach
3. `product-docs/infrastructure/02-database-design.md` - Database schemas
4. `product-docs/operations/01-observability-strategy.md` - Monitoring

### Quick Reference Files

**When working on...**:
- **Authentication**: `product-docs/api/02-authentication-authorization.md`
- **Provider Management**: `product-docs/domain/02-provider-capacity-domain.md`, `product-docs/api/03-provider-capacity-api.md`
- **Service Orders**: `product-docs/domain/03-project-service-order-domain.md`
- **Scheduling**: `product-docs/domain/04-scheduling-buffer-logic.md`, `product-docs/api/04-scheduling-api.md`
- **Assignment**: `product-docs/domain/05-assignment-dispatch-logic.md`, `product-docs/api/05-assignment-dispatch-api.md`
- **Mobile App**: `product-docs/domain/06-execution-field-operations.md`, `product-docs/api/06-execution-mobile-api.md`
- **Contracts**: `product-docs/domain/07-contract-document-lifecycle.md`, `product-docs/api/08-document-media-api.md`
- **Database**: `product-docs/infrastructure/02-database-design.md`
- **Events**: `product-docs/architecture/05-event-driven-architecture.md`, `product-docs/integration/02-event-schema-registry.md`
- **Testing**: `product-docs/testing/01-testing-strategy.md`
- **Deployment**: `product-docs/infrastructure/06-deployment-architecture.md`

---

## 🚀 Implementation Roadmap

### Current Status: Pre-Development (Documentation Complete)

### 28-Week Implementation Plan

**Phase 1: Foundation (Weeks 1-4)**
- Infrastructure setup (AWS/Azure, Postgres, Kafka/Outbox)
- Core services (Identity, Configuration, Provider basics)
- Event infrastructure
- Observability foundation

**Phase 2: Core Business Logic (Weeks 5-12)**
- Orchestration & Projects
- Scheduling & Buffer Logic
- Assignment & Dispatch
- Execution & Mobile
- Contracts & Documents

**Phase 3: Communication & UX (Weeks 13-16)**
- Notification system
- Operator Web App (Control Tower)

**Phase 4: Mobile App & Advanced (Weeks 17-24)**
- React Native mobile app
- Offline sync
- Advanced scheduling
- Analytics

**Phase 5: Integration & Production (Weeks 25-28)**
- Sales integration (Pyxis/Tempo)
- ERP integration (Oracle)
- Security hardening
- Performance optimization
- Production launch

**Phase 6: Scale (Week 29+)**
- Pilot rollout
- Multi-country expansion

---

## ⚠️ Common Pitfalls & Best Practices

### Do's ✅

**Architecture**:
- ✅ Start with modular monolith (simpler, faster development)
- ✅ Keep clear module boundaries even in monolith
- ✅ Use application-level tenant filtering (simpler than RLS)
- ✅ Defer optimizations (partitioning, caching) until proven needed

**Code Quality**:
- ✅ Write tests alongside code (TDD approach)
- ✅ Use TypeScript strict mode
- ✅ Validate all API inputs (class-validator)
- ✅ Handle errors explicitly (no silent failures)
- ✅ Log with correlation IDs for traceability

**API Design**:
- ✅ Follow OpenAPI specs in `product-docs/api/`
- ✅ Version APIs (`/api/v1/...`)
- ✅ Use proper HTTP status codes
- ✅ Paginate list endpoints
- ✅ Include `_links` for HATEOAS

**Security**:
- ✅ Validate and sanitize all inputs
- ✅ Use parameterized queries (Prisma prevents SQL injection)
- ✅ Store secrets in environment variables
- ✅ Implement rate limiting
- ✅ Log security events (auth failures, permission denials)

**Testing**:
- ✅ Aim for 80%+ coverage
- ✅ Test critical paths first
- ✅ Use test data factories
- ✅ Clean up test data after tests

### Don'ts ❌

**Architecture**:
- ❌ Don't create microservices from day 1 (adds complexity)
- ❌ Don't add Kafka if simple events suffice (use Outbox pattern)
- ❌ Don't add OpenSearch prematurely (PostgreSQL FTS is sufficient)
- ❌ Don't partition tables before 20M+ rows
- ❌ Don't add circuit breakers until proven necessary

**Code Quality**:
- ❌ Don't use `any` type in TypeScript
- ❌ Don't skip error handling
- ❌ Don't log sensitive data (passwords, tokens, PII)
- ❌ Don't commit secrets or credentials
- ❌ Don't bypass validation

**API Design**:
- ❌ Don't break API contracts without versioning
- ❌ Don't return raw database errors to clients
- ❌ Don't use unbounded list queries (always paginate)
- ❌ Don't mix authentication and authorization logic

**Testing**:
- ❌ Don't skip tests ("will add later" = never)
- ❌ Don't write flaky tests (fix or delete)
- ❌ Don't test implementation details (test behavior)
- ❌ Don't share state between tests

---

## 🎯 AI Assistant Task Guidelines

### When Implementing Features

1. **Read Relevant Docs First**:
   - Check `product-docs/domain/` for business rules
   - Check `product-docs/api/` for API contracts
   - Check `product-docs/architecture/` for patterns

2. **Follow the Spec**:
   - Implement exactly as documented
   - Don't deviate without explicit approval
   - Ask for clarification if spec is unclear

3. **Consider Simplifications**:
   - Review `ARCHITECTURE_SIMPLIFICATION.md` for recommendations
   - Prefer simple solutions over complex ones
   - Start with PostgreSQL-based solutions before adding new infrastructure

4. **Write Tests**:
   - Unit tests for business logic
   - Integration tests for API endpoints
   - Follow patterns in `product-docs/testing/`

5. **Update Documentation**:
   - Update API specs if changes are made
   - Update domain docs if business logic changes
   - Keep `DOCUMENTATION_STATUS.md` current

### When Reviewing Code

1. **Check Against Specs**:
   - Verify implementation matches API specs
   - Verify business rules match domain docs
   - Verify security follows security docs

2. **Review Quality**:
   - Code follows TypeScript/NestJS conventions
   - Tests are comprehensive (80%+ coverage)
   - Error handling is proper
   - Logging includes correlation IDs

3. **Check Security**:
   - Input validation present
   - Authorization checks correct
   - No secrets in code
   - Sensitive data not logged

### When Answering Questions

1. **Cite Documentation**:
   - Reference specific files and sections
   - Example: "See `product-docs/domain/02-provider-capacity-domain.md:45-67`"

2. **Consider Context**:
   - Project is pre-implementation (no code yet)
   - Specifications are comprehensive and authoritative
   - Simplification recommendations in `ARCHITECTURE_SIMPLIFICATION.md` are worth considering

3. **Be Specific**:
   - Provide concrete examples
   - Reference actual file structures
   - Link to relevant documentation

---

## 🔄 Documentation Maintenance

### When to Update This File

- Major architecture decisions change
- New services or modules are added
- Technology stack changes
- Conventions or standards are updated
- New critical documentation is added

### Documentation Status

This repository has:
- ✅ Complete architecture documentation (5 files)
- ✅ Complete domain models (9 files)
- ✅ Complete API specifications (8 files)
- ✅ Complete integration specs (7 files)
- ✅ Complete security documentation (6 files)
- ✅ Complete infrastructure docs (7 files)
- ✅ Complete operations guides (6 files)
- ✅ Complete testing strategy (6 files)
- ✅ Complete development workflows (6 files)
- ⚠️ **No code implementation yet** (pre-development phase)

### Known Documentation Gaps

See `DOCUMENTATION_FIXES.md` for detailed improvement notes. Key items:
1. Some development guides need expansion
2. Technical stack doc could be split for easier maintenance
3. Test environment setup needs more detail

---

## 📊 Key Metrics & NFRs

### Performance Targets
- **API Latency (p95)**: < 500ms
- **Availability**: 99.9% uptime
- **Throughput**: 10,000 service orders/month initially
- **Concurrent Users**: 1,000 operators + providers

### Quality Targets
- **Test Coverage**: > 80% overall, > 90% for critical paths
- **Build Time**: < 10 minutes
- **Deployment Time**: < 15 minutes
- **Mean Time to Recovery (MTTR)**: < 30 minutes

### Business Metrics
- Assignment success rate: > 95%
- Provider acceptance rate: > 85%
- Customer satisfaction (CSAT): > 4.5/5
- First-time-fix rate: > 90%

---

## 🆘 When You Need Help

### Unclear Requirements?
- Check `product-docs/domain/` for business rules
- Check `product-docs/api/` for API contracts
- Ask the user for clarification with specific questions

### Technical Decisions?
- Review `product-docs/architecture/` for patterns
- Review `ARCHITECTURE_SIMPLIFICATION.md` for recommendations
- Consider simpler solutions first (Postgres over OpenSearch, Outbox over Kafka, etc.)

### Security Concerns?
- Review `product-docs/security/` for guidelines
- Check GDPR requirements in `product-docs/security/03-data-privacy-gdpr.md`
- When in doubt, ask the user

### Testing Questions?
- Check `product-docs/testing/01-testing-strategy.md`
- Follow test pyramid (60% unit, 30% integration, 10% E2E)
- Aim for 80%+ coverage

---

## 📖 Glossary

**AHS**: Adeo Home Services
**BU**: Business Unit (e.g., Leroy Merlin, Brico Depot)
**FSM**: Field Service Management
**TV**: Technical Visit (pre-installation assessment)
**WCF**: Work Closing Form (post-service documentation)
**P1/P2**: Service priority levels (Priority/Standard, no P3)
**RLS**: Row-Level Security (PostgreSQL feature)
**RBAC**: Role-Based Access Control
**SSO**: Single Sign-On (PingID integration)
**DDD**: Domain-Driven Design
**BFF**: Backend For Frontend
**CQRS**: Command Query Responsibility Segregation
**NFR**: Non-Functional Requirement

---

## 📞 Additional Resources

### Documentation Index
- **Master Index**: `product-docs/README.md`
- **Implementation Guide**: `product-docs/IMPLEMENTATION_GUIDE.md`
- **Status Tracker**: `product-docs/DOCUMENTATION_STATUS.md`
- **Simplification Guide**: `ARCHITECTURE_SIMPLIFICATION.md`
- **Engineering Kit Summary**: `ENGINEERING_KIT_SUMMARY.md`

### External References
- NestJS: https://docs.nestjs.com/
- Prisma: https://www.prisma.io/docs
- Kafka: https://kafka.apache.org/documentation/
- PostgreSQL: https://www.postgresql.org/docs/

### Repository Links
- Git branch: `claude/create-codebase-documentation-01VrzYM4ZnreM77qUeVekEgW`
- No main branch specified yet (pre-development)

---

## ✨ Philosophy

**Start Simple. Scale Smart. Build for Change.**

- Begin with the simplest solution that works
- Add complexity only when proven necessary
- Keep clear boundaries even in a monolith
- Test everything, deploy frequently, monitor constantly
- Document decisions, learn from mistakes, iterate rapidly

---

**Document Version**: 1.0.0
**Created**: 2025-01-15
**Maintained By**: Development Team + AI Assistants
**Review Frequency**: Monthly or when major changes occur
