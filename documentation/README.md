# Yellow Grid Platform - Engineering Documentation

**Version**: 3.0
**Last Updated**: 2025-12-02
**Status**: Production-Ready | **Phase 5 Complete** | **94% Implementation** | **126 E2E Tests**

---

## Overview

This documentation kit provides **complete engineering specifications** for building the Yellow Grid Platform - a comprehensive Field Service Management (FSM) system for multi-country operations.

**Live Demo**: https://135.181.96.93

### Current Implementation Stats
- **Backend**: 276 files, 53,539 lines TypeScript (NestJS + Prisma)
- **Frontend**: 161 files, 5,969 lines TypeScript/React (Vite)
- **Database**: 72 models, 3,229 lines Prisma schema
- **API Endpoints**: 195+ REST endpoints
- **E2E Tests**: 126 tests passing

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
- ✅ **Web UX Implementation** (Phase 4.5) - AI Chat, Modals, Service Journey

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

### 📐 Architecture
*System design, technical decisions, and architectural patterns.*
[View Architecture Docs](./architecture/)

### 🏗️ Domain Models
*Business domain models, entities, and business logic specifications.*
[View Domain Docs](./domain/)

### 🔌 API Specifications
*REST API contracts, service interfaces, and integration points.*
[View API Docs](./api/)

### 🔗 Integration
*External system integrations, adapters, and messaging specifications.*
[View Integration Docs](./integration/)

### 🔐 Security & Compliance
*Security architecture, RBAC, GDPR compliance, and audit specifications.*
[View Security Docs](./security/)

### 🏗️ Infrastructure
*Deployment, infrastructure, database, and operational specifications.*
[View Infrastructure Docs](./infrastructure/)

### 📊 Operations
*Monitoring, observability, incident response, and maintenance.*
[View Operations Docs](./operations/)

### 🧪 Testing
*Testing strategies, test plans, and quality assurance specifications.*
[View Testing Docs](./testing/)

### 💻 Development
*Development workflows, coding standards, and contribution guidelines.*
[View Development Docs](./development/)

### 🚀 Implementation & Features
*Specific implementation plans, detailed feature specifications, and migration guides.*
- **[Implementation Plans](./implementation/)**
- **[Feature Specifications](./features/)**
- **[Design Documents](./design/)**
- **[AI/ML Governance](./ai-ml/)**
- **[Migrations](./migrations/)**

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
| 3.1 | 2025-12-16 | Consolidated documentation structure |
| 3.0 | 2025-12-02 | Phase 5 complete, 8 user portals, realistic demo data, 94% implementation |
| 2.5 | 2025-11-27 | Phase 4.5 Web UX complete, AI Chat, 7 modals, 126 E2E tests |
| 2.0 | 2025-01-16 | v2.0 features (external refs, project ownership, AI assessments, ML infrastructure) |
| 1.1 | 2025-01-15 | Documentation consolidation, enterprise stack alignment |
| 1.0 | 2025-01-14 | Initial complete engineering documentation |

---

## License

Internal documentation for Yellow Grid Platform.
© 2025. All rights reserved.

