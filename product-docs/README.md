# AHS Field Service Execution Platform - Engineering Documentation

## Overview

This documentation kit provides comprehensive specifications for building the AHS Field Service Execution Platform. It covers architecture, domain models, APIs, integrations, security, infrastructure, and operational aspects.

## Documentation Structure

### 📐 Architecture
High-level system design, technical decisions, and architectural patterns.

- [Architecture Overview](./architecture/01-architecture-overview.md)
- [Technical Stack](./architecture/02-technical-stack.md)
- [Service Boundaries](./architecture/03-service-boundaries.md)
- [Data Architecture](./architecture/04-data-architecture.md)
- [Event-Driven Architecture](./architecture/05-event-driven-architecture.md)
- [Multi-Tenancy Strategy](./architecture/06-multi-tenancy-strategy.md)
- [Scalability & Resilience](./architecture/07-scalability-resilience.md)
- [Architecture Simplification Options](./architecture/08-architecture-simplification-options.md)
- [Enterprise Stack Requirements](./architecture/09-enterprise-stack-requirements.md) ⚠️ **Authoritative**
- [Architecture Updates Summary](./architecture/10-architecture-updates-summary.md)
- [Simplification Quick Reference](./architecture/11-simplification-quick-reference.md)

### 🏗️ Domain
Business domain models, entities, and business logic specifications.

- [Domain Model Overview](./domain/01-domain-model-overview.md)
- [Provider & Capacity Domain](./domain/02-provider-capacity-domain.md)
- [Project & Service Order Domain](./domain/03-project-service-order-domain.md)
- [Scheduling & Buffer Logic](./domain/04-scheduling-buffer-logic.md)
- [Assignment & Dispatch Logic](./domain/05-assignment-dispatch-logic.md)
- [Execution & Field Operations](./domain/06-execution-field-operations.md)
- [Contract & Document Lifecycle](./domain/07-contract-document-lifecycle.md)
- [Communication Rules](./domain/08-communication-rules.md)
- [Claims & Quality Management](./domain/09-claims-quality-management.md)

### 🔌 API Specifications
REST API contracts, service interfaces, and integration points.

- [API Design Principles](./api/01-api-design-principles.md)
- [Authentication & Authorization](./api/02-authentication-authorization.md)
- [Provider & Capacity API](./api/03-provider-capacity-api.md)
- [Scheduling API](./api/04-scheduling-api.md)
- [Assignment & Dispatch API](./api/05-assignment-dispatch-api.md)
- [Execution & Mobile API](./api/06-execution-mobile-api.md)
- [Control Tower API](./api/07-control-tower-api.md)
- [Document & Media API](./api/08-document-media-api.md)
- [Configuration API](./api/09-configuration-api.md)

### 🔗 Integration
External system integrations, adapters, and messaging specifications.

- [Integration Architecture](./integration/01-integration-architecture.md)
- [Event Schema Registry](./integration/02-event-schema-registry.md)
- [Pyxis/Tempo Sales Integration](./integration/03-sales-integration.md)
- [Oracle ERP Integration](./integration/04-erp-integration.md)
- [E-Signature Integration](./integration/05-e-signature-integration.md)
- [Communication Gateways](./integration/06-communication-gateways.md)
- [Master Data Integration](./integration/07-master-data-integration.md)

### 🔐 Security & Compliance
Security architecture, RBAC, GDPR compliance, and audit specifications.

- [Security Architecture](./security/01-security-architecture.md)
- [RBAC Model](./security/02-rbac-model.md)
- [Data Privacy & GDPR](./security/03-data-privacy-gdpr.md)
- [Audit & Traceability](./security/04-audit-traceability.md)
- [Secrets Management](./security/05-secrets-management.md)
- [API Security](./security/06-api-security.md)

### 🏗️ Infrastructure
Deployment, infrastructure, database, and operational specifications.

- [Infrastructure Overview](./infrastructure/01-infrastructure-overview.md)
- [Database Design](./infrastructure/02-database-design.md)
- [Kafka Topics & Partitioning](./infrastructure/03-kafka-topics.md)
- [Object Storage Strategy](./infrastructure/04-object-storage.md)
- [Caching Strategy](./infrastructure/05-caching-strategy.md)
- [Deployment Architecture](./infrastructure/06-deployment-architecture.md)
- [Scaling Strategy](./infrastructure/07-scaling-strategy.md)

### 📊 Operations
Monitoring, observability, incident response, and maintenance.

- [Observability Strategy](./operations/01-observability-strategy.md)
- [Monitoring & Alerting](./operations/02-monitoring-alerting.md)
- [Logging Standards](./operations/03-logging-standards.md)
- [Incident Response](./operations/04-incident-response.md)
- [Runbooks](./operations/05-runbooks.md)
- [Disaster Recovery](./operations/06-disaster-recovery.md)

### 🧪 Testing
Testing strategies, test plans, and quality assurance specifications.

- [Testing Strategy](./testing/01-testing-strategy.md)
- [Unit Testing Standards](./testing/02-unit-testing-standards.md)
- [Integration Testing](./testing/03-integration-testing.md)
- [E2E Testing](./testing/04-e2e-testing.md)
- [Performance Testing](./testing/05-performance-testing.md)
- [Test Data Management](./testing/06-test-data-management.md)

### 💻 Development
Development workflows, coding standards, and contribution guidelines.

- [Development Workflow](./development/01-development-workflow.md)
- [Coding Standards](./development/02-coding-standards.md)
- [Git Workflow](./development/03-git-workflow.md)
- [Code Review Guidelines](./development/04-code-review-guidelines.md)
- [Local Development Setup](./development/05-local-development-setup.md)
- [CI/CD Pipeline](./development/06-cicd-pipeline.md)

## Quick Start

### For New Engineers
1. Read [Architecture Overview](./architecture/01-architecture-overview.md)
2. Review [Domain Model Overview](./domain/01-domain-model-overview.md)
3. Set up your [Local Development Environment](./development/05-local-development-setup.md)
4. Follow [Development Workflow](./development/01-development-workflow.md)

### For Backend Developers
1. [Service Boundaries](./architecture/03-service-boundaries.md)
2. [API Design Principles](./api/01-api-design-principles.md)
3. [Event-Driven Architecture](./architecture/05-event-driven-architecture.md)
4. [Database Design](./infrastructure/02-database-design.md)

### For Frontend Developers
1. [API Design Principles](./api/01-api-design-principles.md)
2. [Authentication & Authorization](./api/02-authentication-authorization.md)
3. Relevant API specifications for your features

### For DevOps/SRE
1. [Infrastructure Overview](./infrastructure/01-infrastructure-overview.md)
2. [Deployment Architecture](./infrastructure/06-deployment-architecture.md)
3. [Observability Strategy](./operations/01-observability-strategy.md)
4. [Incident Response](./operations/04-incident-response.md)

### For QA Engineers
1. [Testing Strategy](./testing/01-testing-strategy.md)
2. [Test Data Management](./testing/06-test-data-management.md)
3. Domain-specific test scenarios in each domain document

## Contributing to Documentation

Documentation is living and should be updated as the system evolves:

1. **Keep it current**: Update docs when making architectural changes
2. **Be specific**: Provide concrete examples and code snippets
3. **Explain decisions**: Document the "why" behind choices
4. **Version appropriately**: Use semantic versioning for major changes
5. **Review together**: Documentation changes go through same PR process as code

## Version History

- **v1.1.0** (2025-01-15): Documentation consolidation and enterprise stack alignment
  - Added enterprise stack requirements (mandatory technologies)
  - Consolidated all documentation into product-docs/
  - Added architecture update history and decision matrices
  - Updated database design with multi-sales-system support
  - Completed PRD v2 gap analysis

- **v1.0.0** (2025-01-14): Initial engineering documentation kit
  - Complete architecture specifications
  - Domain models and API contracts
  - Security and compliance documentation
  - Infrastructure and operations guides

## Glossary

- **AHS**: Adeo Home Services
- **BU**: Business Unit (e.g., Leroy Merlin, Brico Depot)
- **FSM**: Field Service Management
- **PRD**: Product Requirements Document
- **RBAC**: Role-Based Access Control
- **SSO**: Single Sign-On
- **TV**: Technical Visit
- **WCF**: Work Closing Form
- **P1/P2**: Provider service priority levels (Priority/Standard)
- **BFF**: Backend For Frontend

## License

Internal documentation for AHS Field Service Execution Platform.
© 2025 Adeo. All rights reserved.
