# CLAUDE.md - AI Assistant Guide

**Last Updated**: 2025-01-16
**Project**: Yellow Grid Platform
**Status**: Documentation Complete (v2.0) - Pre-Development

---

## 🎯 Quick Start for AI Assistants

This is the **Yellow Grid Platform**, a comprehensive Field Service Management (FSM) system for multi-country operations.

### Critical Context
- **Current State**: Complete engineering documentation (69 files, ~45,000 lines)
- **Version**: 2.0 (includes AI/ML features)
- **Implementation Status**: Pre-development (documentation 100% complete, code not started)
- **Team Size**: Expected 10-14 engineers
- **Timeline**: 28-week implementation roadmap
- **Architecture Philosophy**: Start simple (modular monolith), scale smart (microservices when needed)

---

## 📁 Repository Structure

```
yellow-grid/
├── README.md                          # Entry point
├── CLAUDE.md                          # This file - AI assistant guide
├── AGENTS.md                          # Repository guidelines
├── IMPORTANT_REPOSITORY_STRUCTURE.md  # Mockup vs Product separation
├── DOCUMENTATION_CONSOLIDATION_PLAN.md # Latest consolidation details
│
├── business-requirements/             # Source business requirements (READ-ONLY)
│   ├── README.md
│   ├── Yellow Grid Platform - PRD.md
│   └── [Source documents: Word, PDF, images]
│
├── product-docs/                      # ⭐ COMPLETE ENGINEERING SPECS (69 files)
│   ├── README.md                      # Master documentation index
│   ├── 00-ENGINEERING_KIT_SUMMARY.md  # High-level project summary
│   ├── DOCUMENTATION_STATUS.md        # Current status (SIMPLIFIED)
│   ├── IMPLEMENTATION_GUIDE.md        # 28-week roadmap
│   │
│   ├── architecture/ (11 docs)        # System design & technical decisions
│   ├── domain/ (13 docs)              # Business domain models & logic
│   ├── api/ (9 docs)                  # REST API specifications
│   ├── integration/ (8 docs)          # External system integrations
│   ├── security/ (6 docs)             # Security, RBAC, GDPR
│   ├── infrastructure/ (8 docs)       # Database, Kafka, ML, deployment
│   ├── operations/ (6 docs)           # Monitoring, logging, incidents
│   ├── testing/ (6 docs)              # Testing strategies & standards
│   ├── development/ (9 docs)          # Dev workflows, coding standards
│   └── implementation-artifacts/      # TypeScript models, OpenAPI, SQL, Avro
│
├── roadshow-mockup/                   # Demo ONLY (NOT for production)
└── src/generated/                     # Generated code from OpenAPI specs
```

---

## 🚨 IMPORTANT: Documentation Changes (v2.0 - Jan 2025)

### What Changed
✅ **DELETED** 6 obsolete analysis files (~5,400 lines):
- COMPREHENSIVE_SPEC_REVIEW_2025-01-15.md
- PRD_V2_GAP_ANALYSIS.md
- DOCUMENTATION_CONSOLIDATION_SUMMARY.md
- FEATURE_ADDITIONS_ANALYSIS.md
- UX_FLOW_GAP_ANALYSIS.md
- DOMAIN_MODEL_UPDATES.md

✅ **SIMPLIFIED** DOCUMENTATION_STATUS.md (540 → 225 lines)

✅ **REORGANIZED** business-to-product-docs → business-requirements/

✅ **UPDATED** All navigation files (README.md, ENGINEERING_KIT_SUMMARY.md)

### Why
These were working documents used during documentation development. All their content has been **implemented** in the actual specifications. They added noise, not value.

**Principle**: Keep only authoritative specifications, not analysis reports.

---

## 🏗️ System Architecture Overview

### Architectural Approach
**Start as Modular Monolith** → Extract to Microservices only when needed

### Core Domain Services (9 services)

1. **Identity & Access** - Authentication, RBAC, JWT
2. **Configuration** - System config, feature flags
3. **Provider & Capacity** - Provider hierarchy, teams, calendars
4. **Orchestration & Control** - Projects, service orders, journeys
5. **Scheduling & Availability** - Buffer logic, slot calculation
6. **Assignment & Dispatch** - Candidate filtering, scoring
7. **Execution & Mobile** - Check-in/out, checklists
8. **Communication & Notifications** - SMS, email, push
9. **Contracts, Documents & Media** - E-signature, WCF, storage

**Note**: Can be simplified to 6 services (see architecture/08-architecture-simplification-options.md)

### Technology Stack

**Backend**: TypeScript + Node.js 20 LTS + NestJS + Prisma
**Database**: PostgreSQL 15+ (multi-schema with RLS)
**Messaging**: Apache Kafka (Confluent Cloud / AWS MSK) or PostgreSQL Outbox Pattern
**Frontend**: React (web), React Native (mobile)
**Infrastructure**: Docker + Kubernetes (AWS EKS / Azure AKS)
**Observability**: OpenTelemetry + Prometheus + Grafana
**ML**: Python + FastAPI (model serving) + XGBoost + Random Forest

---

## 📚 Documentation Navigation

### For New AI Assistants - Read These First

**Phase 1 - Understanding the System** (30 min):
1. `product-docs/00-ENGINEERING_KIT_SUMMARY.md` - High-level overview
2. `product-docs/README.md` - Master index
3. `product-docs/architecture/01-architecture-overview.md` - System design

**Phase 2 - Domain Knowledge** (As needed):
- `product-docs/domain/01-domain-model-overview.md` - DDD principles
- Specific domain files for the feature you're working on

**Phase 3 - API Contracts** (As needed):
- `product-docs/api/01-api-design-principles.md` - REST standards
- Specific API files for the endpoints you're implementing

### Quick Reference by Task

| Task | Read This |
|------|-----------|
| **Understanding architecture** | architecture/01-architecture-overview.md |
| **Provider management** | domain/02-provider-capacity-domain.md |
| **Service orders** | domain/03-project-service-order-domain.md |
| **Scheduling logic** | domain/04-scheduling-buffer-logic.md |
| **Assignment transparency** | domain/05-assignment-dispatch-logic.md |
| **Mobile operations** | domain/06-execution-field-operations.md |
| **Contract lifecycle** | domain/07-contract-document-lifecycle.md |
| **Task management** | domain/08-task-management.md |
| **AI features** | domain/10-ai-context-linking.md, infrastructure/08-ml-infrastructure.md |
| **Database schemas** | infrastructure/02-database-design.md |
| **Kafka events** | integration/02-event-schema-registry.md |
| **Security & RBAC** | security/02-rbac-model.md |
| **Testing approach** | testing/01-testing-strategy.md |

---

## 🆕 v2.0 Features (Added January 2025)

### 1. External Sales System References
- Bidirectional traceability (FSM ↔ Pyxis/Tempo/SAP)
- Commission linking, pre-estimation matching
- See: domain/03-project-service-order-domain.md, integration/03-sales-integration.md

### 2. Project Ownership ("Pilote du Chantier")
- Responsible operator per project
- AUTO/MANUAL assignment modes by country
- Workload balancing algorithm
- See: domain/03-project-service-order-domain.md

### 3. AI-Powered Sales Potential Assessment
- XGBoost ML model (15 features, 3-class output)
- Prioritize high-conversion Technical Visits
- SHAP explainability
- See: domain/10-ai-context-linking.md, infrastructure/08-ml-infrastructure.md

### 4. AI-Powered Risk Assessment
- Random Forest ML model (20 features, 4-class output)
- Proactive risk identification
- Automated task creation for high-risk SOs
- See: domain/10-ai-context-linking.md, infrastructure/08-ml-infrastructure.md

### 5. Complete ML Infrastructure
- Model serving (FastAPI), feature store (Redis), model registry (S3)
- Training pipelines (Airflow), monitoring
- See: infrastructure/08-ml-infrastructure.md

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
- Pre-installation assessment
- Three outcomes: YES / YES-BUT / NO
- Can block/unblock installation orders
- Integration with sales for scope changes

**2. Assignment Transparency** (⭐ UNIQUE DIFFERENTIATOR):
- Complete funnel audit trail
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

### Naming Conventions

**REST API**:
- Plural collections: `/api/v1/providers`
- Singular instances: `/api/v1/providers/{providerId}`
- Query params: snake_case (e.g., `?country_code=FR`)

**Kafka Events**:
- Format: `{domain}.{entity}.{action}`
- Examples: `projects.service_order.created`, `assignment.offer.accepted`

**Database**:
- Tables: snake_case (e.g., `service_orders`, `work_teams`)
- Columns: snake_case (e.g., `country_code`, `created_at`)

### Code Style
- TypeScript strict mode enabled
- 2-space indentation
- ESLint + Prettier enforced
- No `any` types (use `unknown` if needed)
- Explicit return types on functions

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

---

## 🔐 Security Considerations

### Authentication & Authorization
- **Auth**: JWT tokens (PingID SSO integration)
- **RBAC**: Fine-grained role-based access control
- **Permissions**: Resource-level permissions
- **Multi-tenancy**: Tenant isolation at app layer (or DB RLS)

### Security Checklist (for code reviews)
- [ ] Input validation (all API endpoints)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (sanitize user inputs)
- [ ] Rate limiting (per user/IP)
- [ ] Secrets in environment variables (never in code)
- [ ] Sensitive data logging (mask PII)
- [ ] Authorization checks (verify user permissions)

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
```

### Commit Message Format (Conventional Commits)
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, perf, test, chore

**Examples**:
```bash
feat(assignment): add provider scoring transparency
fix(scheduling): correct buffer stacking for holidays
docs(api): update scheduling API examples
```

---

## ⚠️ Common Pitfalls & Best Practices

### Do's ✅

**Architecture**:
- ✅ Start with modular monolith
- ✅ Keep clear module boundaries
- ✅ Use application-level tenant filtering
- ✅ Defer optimizations until proven needed

**Code Quality**:
- ✅ Write tests alongside code (TDD)
- ✅ Use TypeScript strict mode
- ✅ Validate all API inputs
- ✅ Handle errors explicitly
- ✅ Log with correlation IDs

**API Design**:
- ✅ Follow OpenAPI specs in product-docs/api/
- ✅ Version APIs (/api/v1/...)
- ✅ Use proper HTTP status codes
- ✅ Paginate list endpoints
- ✅ Include `_links` for HATEOAS

**Security**:
- ✅ Validate and sanitize all inputs
- ✅ Use parameterized queries (Prisma)
- ✅ Store secrets in environment variables
- ✅ Implement rate limiting
- ✅ Log security events

### Don'ts ❌

**Architecture**:
- ❌ Don't create microservices from day 1
- ❌ Don't add Kafka if simple events suffice
- ❌ Don't add OpenSearch prematurely
- ❌ Don't partition tables before 20M+ rows

**Code Quality**:
- ❌ Don't use `any` type in TypeScript
- ❌ Don't skip error handling
- ❌ Don't log sensitive data
- ❌ Don't commit secrets
- ❌ Don't bypass validation

**Testing**:
- ❌ Don't skip tests ("will add later" = never)
- ❌ Don't write flaky tests
- ❌ Don't test implementation details
- ❌ Don't share state between tests

---

## 🎯 AI Assistant Task Guidelines

### When Implementing Features

1. **Read Relevant Docs First**:
   - Check product-docs/domain/ for business rules
   - Check product-docs/api/ for API contracts
   - Check product-docs/architecture/ for patterns

2. **Follow the Spec**:
   - Implement exactly as documented
   - Don't deviate without explicit approval
   - Ask for clarification if spec is unclear

3. **Consider Simplifications**:
   - Review architecture/08-architecture-simplification-options.md
   - Prefer simple solutions over complex ones
   - Start with PostgreSQL-based solutions before adding infrastructure

4. **Write Tests**:
   - Unit tests for business logic
   - Integration tests for API endpoints
   - Follow patterns in product-docs/testing/

5. **Update Documentation**:
   - Update API specs if changes are made
   - Update domain docs if business logic changes
   - Keep DOCUMENTATION_STATUS.md current

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
   - Example: "See product-docs/domain/02-provider-capacity-domain.md:45-67"

2. **Consider Context**:
   - Project is pre-implementation (no code yet)
   - Specifications are comprehensive and authoritative
   - Simplification recommendations are worth considering

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
- ✅ Complete architecture documentation (11 files)
- ✅ Complete domain models (13 files)
- ✅ Complete API specifications (9 files)
- ✅ Complete integration specs (8 files)
- ✅ Complete security documentation (6 files)
- ✅ Complete infrastructure docs (8 files)
- ✅ Complete operations guides (6 files)
- ✅ Complete testing strategy (6 files)
- ✅ Complete development workflows (9 files)
- ✅ **Total: 69 files, ~45,000 lines, 100% complete**
- ⚠️ **No code implementation yet** (pre-development phase)

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
- **MTTR**: < 30 minutes

### Business Metrics
- Assignment success rate: > 95%
- Provider acceptance rate: > 85%
- Customer satisfaction (CSAT): > 4.5/5
- First-time-fix rate: > 90%

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

---

## 📞 Additional Resources

### Documentation Index
- **Master Index**: product-docs/README.md
- **Implementation Guide**: product-docs/IMPLEMENTATION_GUIDE.md
- **Status Tracker**: product-docs/DOCUMENTATION_STATUS.md
- **Consolidation Plan**: DOCUMENTATION_CONSOLIDATION_PLAN.md (latest changes)

### External References
- NestJS: https://docs.nestjs.com/
- Prisma: https://www.prisma.io/docs
- Kafka: https://kafka.apache.org/documentation/
- PostgreSQL: https://www.postgresql.org/docs/

---

## ✨ Philosophy

**Start Simple. Scale Smart. Build for Change.**

- Begin with the simplest solution that works
- Add complexity only when proven necessary
- Keep clear boundaries even in a monolith
- Test everything, deploy frequently, monitor constantly
- Document decisions, learn from mistakes, iterate rapidly

---

**Document Version**: 2.0.1
**Created**: 2025-01-15
**Updated**: 2025-01-16 (Documentation consolidation)
**Maintained By**: Development Team + AI Assistants
**Review Frequency**: Monthly or when major changes occur
