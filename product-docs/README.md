# Yellow Grid Platform - Engineering Documentation

**Version**: 2.0
**Last Updated**: 2025-01-16
**Status**: Production-Ready

---

## Overview

This documentation kit provides **complete engineering specifications** for building the Yellow Grid Platform - a comprehensive Field Service Management (FSM) system for multi-country operations.

**What's Included**:
- ✅ Complete architecture specifications (11 documents)
- ✅ Comprehensive domain models (13 documents)
- ✅ Complete API contracts (9 documents)
- ✅ Integration specifications (8 documents)
- ✅ Security & GDPR compliance (6 documents)
- ✅ Infrastructure & deployment (8 documents)
- ✅ Operations & observability (6 documents)
- ✅ Testing strategies (6 documents)
- ✅ Development workflows (9 documents)
- ✅ AI/ML infrastructure (v2.0)

**Total**: 69 documents, ~45,000 lines of production-ready specifications

---

## Quick Start

| Role | Start Here |
|------|-----------|
| **New Engineer** | [00-ENGINEERING_KIT_SUMMARY.md](./00-ENGINEERING_KIT_SUMMARY.md) |
| **Tech Lead** | [architecture/01-architecture-overview.md](./architecture/01-architecture-overview.md) |
| **Backend Dev** | [architecture/03-service-boundaries.md](./architecture/03-service-boundaries.md) |
| **Frontend Dev** | [api/01-api-design-principles.md](./api/01-api-design-principles.md) |
| **DevOps/SRE** | [infrastructure/01-infrastructure-overview.md](./infrastructure/01-infrastructure-overview.md) |
| **QA Engineer** | [testing/01-testing-strategy.md](./testing/01-testing-strategy.md) |

---

## Documentation Structure

### 📐 Architecture (11 documents)

System design, technical decisions, and architectural patterns.

1. [Architecture Overview](./architecture/01-architecture-overview.md) - Complete system architecture
2. [Technical Stack](./architecture/02-technical-stack.md) - Technology choices & rationale
3. [Service Boundaries](./architecture/03-service-boundaries.md) - 9 domain services
4. [Data Architecture](./architecture/04-data-architecture.md) - Multi-schema PostgreSQL
5. [Event-Driven Architecture](./architecture/05-event-driven-architecture.md) - Kafka patterns
6. [Multi-Tenancy Strategy](./architecture/06-multi-tenancy-strategy.md) - Tenant isolation
7. [Scalability & Resilience](./architecture/07-scalability-resilience.md) - Scale & HA patterns
8. [Architecture Simplification Options](./architecture/08-architecture-simplification-options.md) - Alternative approaches
9. [Enterprise Stack Requirements](./architecture/09-enterprise-stack-requirements.md) - ⚠️ **AUTHORITATIVE**
10. [Architecture Updates Summary](./architecture/10-architecture-updates-summary.md) - Decision history
11. [Simplification Quick Reference](./architecture/11-simplification-quick-reference.md) - Quick guide

### 🏗️ Domain Models (13 documents)

Business domain models, entities, and business logic specifications.

1. [Domain Model Overview](./domain/01-domain-model-overview.md) - DDD principles
2. [Provider & Capacity Domain](./domain/02-provider-capacity-domain.md) - Provider hierarchy
3. [Project & Service Order Domain](./domain/03-project-service-order-domain.md) - Service order lifecycle (v2.0)
4. [Scheduling & Buffer Logic](./domain/04-scheduling-buffer-logic.md) - Slot calculation & buffers
5. [Assignment & Dispatch Logic](./domain/05-assignment-dispatch-logic.md) - Assignment funnel & scoring
6. [Execution & Field Operations](./domain/06-execution-field-operations.md) - Check-in/out, checklists
7. [Contract & Document Lifecycle](./domain/07-contract-document-lifecycle.md) - Contracts & WCF
8. [Task Management](./domain/08-task-management.md) - Task types, SLA, escalation
9. [Claims & Quality Management](./domain/09-claims-quality-management.md) - Claims & quality metrics
10. [AI Context Linking](./domain/10-ai-context-linking.md) - AI similarity scoring (v2.0)
11. [Go Execution Preflight](./domain/11-go-execution-preflight.md) - Pre-flight checks
12. [Provider Payment Lifecycle](./domain/12-provider-payment-lifecycle.md) - WCF reserves & invoicing
13. [Notification & Communication Rules](./domain/13-notification-communication-rules.md) - SMS, email, push

### 🔌 API Specifications (9 documents)

REST API contracts, service interfaces, and integration points.

1. [API Design Principles](./api/01-api-design-principles.md) - REST standards, error handling
2. [Authentication & Authorization](./api/02-authentication-authorization.md) - JWT, SSO, RBAC
3. [Provider & Capacity API](./api/03-provider-capacity-api.md) - Provider CRUD, calendars
4. [Scheduling API](./api/04-scheduling-api.md) - Slot availability, buffer application
5. [Assignment & Dispatch API](./api/05-assignment-dispatch-api.md) - Assignment endpoints
6. [Execution & Mobile API](./api/06-execution-mobile-api.md) - Mobile operations
7. [Control Tower API](./api/07-control-tower-api.md) - Operator dashboard APIs
8. [Document & Media API](./api/08-document-media-api.md) - Document management
9. [Operator Cockpit API](./api/09-operator-cockpit-api.md) - Context view, availability check (v2.0)

### 🔗 Integration (8 documents)

External system integrations, adapters, and messaging specifications.

1. [Integration Architecture](./integration/01-integration-architecture.md) - Integration patterns
2. [Event Schema Registry](./integration/02-event-schema-registry.md) - Kafka event schemas (Avro)
3. [Sales Integration](./integration/03-sales-integration.md) - Pyxis/Tempo/SAP integration (v2.0)
4. [ERP Integration](./integration/04-erp-integration.md) - Oracle ERP
5. [E-Signature Integration](./integration/05-e-signature-integration.md) - Adobe Sign, DocuSign
6. [Communication Gateways](./integration/06-communication-gateways.md) - Twilio, SendGrid, FCM
7. [Master Data Integration](./integration/07-master-data-integration.md) - Customer, product, store data
8. [Sales System Adapters](./integration/08-sales-system-adapters.md) - Multi-sales-system support (v2.0)

### 🔐 Security & Compliance (6 documents)

Security architecture, RBAC, GDPR compliance, and audit specifications.

1. [Security Architecture](./security/01-security-architecture.md) - Defense in depth, zero trust
2. [RBAC Model](./security/02-rbac-model.md) - Roles, permissions, scope-based auth
3. [Data Privacy & GDPR](./security/03-data-privacy-gdpr.md) - GDPR compliance, data residency
4. [Audit & Traceability](./security/04-audit-traceability.md) - Audit logging, correlation IDs
5. [Secrets Management](./security/05-secrets-management.md) - HashiCorp Vault, rotation
6. [API Security](./security/06-api-security.md) - Rate limiting, OWASP top 10

### 🏗️ Infrastructure (8 documents)

Deployment, infrastructure, database, and operational specifications.

1. [Infrastructure Overview](./infrastructure/01-infrastructure-overview.md) - Cloud architecture
2. [Database Design](./infrastructure/02-database-design.md) - Complete schemas, migrations (v2.0)
3. [Kafka Topics & Partitioning](./infrastructure/03-kafka-topics.md) - Topic design, partitioning
4. [Object Storage Strategy](./infrastructure/04-object-storage.md) - S3/Azure Blob, CDN
5. [Caching Strategy](./infrastructure/05-caching-strategy.md) - Redis/Valkey patterns
6. [Deployment Architecture](./infrastructure/06-deployment-architecture.md) - Kubernetes, Helm
7. [Scaling Strategy](./infrastructure/07-scaling-strategy.md) - Auto-scaling, capacity planning
8. [ML Infrastructure](./infrastructure/08-ml-infrastructure.md) - Model serving, training, registry (v2.0)

### 📊 Operations (6 documents)

Monitoring, observability, incident response, and maintenance.

1. [Observability Strategy](./operations/01-observability-strategy.md) - OpenTelemetry, distributed tracing
2. [Monitoring & Alerting](./operations/02-monitoring-alerting.md) - Prometheus, Grafana
3. [Logging Standards](./operations/03-logging-standards.md) - Structured logging, aggregation
4. [Incident Response](./operations/04-incident-response.md) - On-call procedures, escalation
5. [Runbooks](./operations/05-runbooks.md) - Operational procedures, troubleshooting
6. [Disaster Recovery](./operations/06-disaster-recovery.md) - Backup, RTO/RPO, failover

### 🧪 Testing (6 documents)

Testing strategies, test plans, and quality assurance specifications.

1. [Testing Strategy](./testing/01-testing-strategy.md) - Test pyramid, coverage targets
2. [Unit Testing Standards](./testing/02-unit-testing-standards.md) - Jest, mocking patterns
3. [Integration Testing](./testing/03-integration-testing.md) - API testing, test containers
4. [E2E Testing](./testing/04-e2e-testing.md) - Playwright, critical user journeys
5. [Performance Testing](./testing/05-performance-testing.md) - Load testing, benchmarks
6. [Test Data Management](./testing/06-test-data-management.md) - Test factories, seed data

### 💻 Development (9 documents)

Development workflows, coding standards, and contribution guidelines.

1. [Development Workflow](./development/01-development-workflow.md) - Feature lifecycle, git workflow
2. [Coding Standards](./development/02-coding-standards.md) - TypeScript style guide
3. [Git Workflow](./development/03-git-workflow.md) - Branching strategy, commit conventions
4. [Code Review Guidelines](./development/04-code-review-guidelines.md) - Review checklist
5. [Local Development Setup](./development/05-local-development-setup.md) - Docker Compose, seed scripts
6. [CI/CD Pipeline](./development/06-cicd-pipeline.md) - GitHub Actions, quality gates
7. [Service Operator AI Cockpit](./development/07-service-operator-ai-cockpit.md) - Operator cockpit development
8. [Customer Experience Portal](./development/08-customer-experience-portal.md) - Customer portal development
9. [Crew Field App](./development/09-crew-field-app.md) - Mobile app development

---

## Implementation Artifacts

Ready-to-use implementation files:

- **[Domain Models](./implementation-artifacts/domain-models/)** - TypeScript domain events & value objects
- **[OpenAPI Specs](./implementation-artifacts/openapi/)** - v2.0 features API specification
- **[Database Migrations](./implementation-artifacts/migrations/)** - SQL migrations for v2.0 features
- **[Avro Schemas](./implementation-artifacts/avro-schemas/)** - Kafka event schemas

---

## v2.0 Highlights

### New Features (2025-01-16)

**External Sales System References**
- Bidirectional traceability between FSM and sales systems (Pyxis, Tempo, SAP)
- Commission linking, pre-estimation matching, support troubleshooting

**Project Ownership ("Pilote du Chantier")**
- Responsible operator assignment per project
- Workload balancing with AUTO/MANUAL modes
- Targeted notification routing

**AI-Powered Sales Potential Assessment**
- XGBoost ML model for TV/Quotation conversion prediction
- 15 features, 3-class output (LOW/MEDIUM/HIGH)
- SHAP explainability for transparency

**AI-Powered Risk Assessment**
- Random Forest ML model for service order risk prediction
- 20 features, 4-class output (LOW/MEDIUM/HIGH/CRITICAL)
- Automated task creation for high-risk service orders

**Complete ML Infrastructure**
- Model serving (FastAPI), feature store (Redis), model registry (S3)
- Training pipelines (Airflow), monitoring & observability

---

## Project Resources

| Resource | Description |
|----------|-------------|
| [00-ENGINEERING_KIT_SUMMARY.md](./00-ENGINEERING_KIT_SUMMARY.md) | High-level project overview |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | 28-week implementation roadmap |
| [DOCUMENTATION_STATUS.md](./DOCUMENTATION_STATUS.md) | Current documentation status |

---

## Contributing to Documentation

Documentation is living and should be updated as the system evolves:

1. **Keep it current** - Update docs when making architectural changes
2. **Be specific** - Provide concrete examples and code snippets
3. **Explain decisions** - Document the "why" behind choices
4. **Version appropriately** - Use semantic versioning for major changes
5. **Review together** - Documentation changes go through same PR process as code

---

## Glossary

- **AHS**: Adeo Home Services
- **BU**: Business Unit (e.g., Leroy Merlin, Brico Depot)
- **FSM**: Field Service Management
- **PRD**: Product Requirements Document
- **RBAC**: Role-Based Access Control
- **SSO**: Single Sign-On (PingID integration)
- **TV**: Technical Visit (pre-installation assessment)
- **WCF**: Work Closing Form (post-service documentation)
- **P1/P2**: Service priority levels (Priority/Standard, no P3)
- **BFF**: Backend For Frontend
- **CQRS**: Command Query Responsibility Segregation

---

## Version History

| Version | Date | Major Changes |
|---------|------|---------------|
| 2.0 | 2025-01-16 | v2.0 features (external refs, project ownership, AI assessments, ML infrastructure) |
| 1.1 | 2025-01-15 | Documentation consolidation, enterprise stack alignment |
| 1.0 | 2025-01-14 | Initial complete engineering documentation |

---

## License

Internal documentation for Yellow Grid Platform.
© 2025. All rights reserved.
