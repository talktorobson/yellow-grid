# Service & Provider Referential - Implementation Guide

**Version**: 1.0.0
**Created**: 2025-01-17
**Status**: Design Phase Complete, Implementation Starting
**Implementation Duration**: 10 weeks (Weeks 5-14)

---

## 📋 Executive Summary

The **Service & Provider Referential** module implements a comprehensive system for managing service catalogs and provider capabilities in the Yellow Grid FSM platform. This module is **foundational** for assignment transparency (the platform's key differentiator) and enables accurate provider matching based on structured, validated capabilities.

### Key Features

1. **Client-Owned Service Catalog**
   - Synchronized from external sales systems (Pyxis, Tempo, SAP)
   - Real-time Kafka event stream + daily reconciliation
   - Automatic drift detection and correction

2. **Postal Code-Based Pricing**
   - 3-level geographic hierarchy (Country → Province → City → Postal Code)
   - Regional price variations (Madrid ≠ Barcelona)
   - Pricing inheritance with fallback to country defaults

3. **Provider Specialty Management**
   - Structured capabilities (replacing JSON blobs)
   - Certification tracking with expiry monitoring
   - Performance metrics per specialty

4. **Event-Driven Sync Architecture**
   - Idempotent event processing (Kafka)
   - Daily reconciliation for drift detection
   - Automated error handling and retry

---

## 🎯 Business Value

### Problems Solved

❌ **Before**: Skills stored as unstructured JSON arrays
✅ **After**: Structured specialty model with certifications and performance tracking

❌ **Before**: Manual service code mapping between systems
✅ **After**: Automated sync from client systems (Pyxis/Tempo/SAP)

❌ **Before**: Flat pricing across regions
✅ **After**: Postal code-level pricing granularity

❌ **Before**: Assignment filtering on hardcoded logic
✅ **After**: Service-specific skill requirements drive matching

### ROI Estimate

- **Implementation Cost**: 10 weeks × 2 engineers = 20 person-weeks
- **Annual Savings**:
  - Reduced manual service code management: ~$20K/year
  - Improved provider matching accuracy (+15%): ~$50K/year in reduced failed assignments
  - Regional pricing optimization: ~$30K/year
- **Payback Period**: ~6 months

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│         EXTERNAL SALES SYSTEM (Pyxis/Tempo/SAP)             │
│                                                              │
│  Service Catalog Master Database                            │
└────────┬──────────────────────────────────┬────────────────┘
         │                                   │
         │ (Real-time)                      │ (Daily 3 AM)
         │ Kafka Events                     │ Flat File Export
         ▼                                   ▼
┌──────────────────────┐         ┌─────────────────────────┐
│ Kafka Topic:         │         │ GCS Bucket:             │
│ service-catalog      │         │ services_ES_YYYYMMDD.csv│
│                      │         │ services_FR_YYYYMMDD.csv│
│ Events:              │         └──────────┬──────────────┘
│ - service.created    │                    │
│ - service.updated    │                    │
│ - service.deprecated │                    │
└──────────┬───────────┘                    │
           │                                 │
           ▼                                 ▼
┌───────────────────────┐      ┌────────────────────────────┐
│ Kafka Event Consumer  │      │ Reconciliation Job         │
│ (Real-time)           │      │ (Scheduled Cron)           │
└───────────┬───────────┘      └────────────┬───────────────┘
            │                                │
            └────────────┬───────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ service_catalog table         │
         │ (FSM Source of Truth)         │
         └───────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ Assignment Filtering          │
         │ (Uses service_skill_requirements)
         └───────────────────────────────┘
```

---

## 📚 Documentation Index

### Domain Specification
**📄 `/product-docs/domain/11-service-provider-referential.md`** (1,100 lines)

Complete domain model covering:
- Geographic Master Data (Country, Province, City, PostalCode)
- Service Catalog (classification, scope, prerequisites)
- Regional Pricing (postal code-based, multipliers)
- Service Skill Requirements
- Provider Specialty Model
- Contract Template Abstraction
- Event-Driven Sync (event log, reconciliation)
- Business Rules (30+ rules documented)
- Domain Events
- Repository Interfaces

**Key Sections:**
- Section 2: Geographic Master Data (3-level hierarchy)
- Section 3: Service Catalog Domain (6 service types, 10 categories)
- Section 4: Regional Pricing Model (postal code inheritance)
- Section 6: Provider Specialty Model (structured capabilities)
- Section 9: Business Rules (BR-SC-001 through BR-SYNC-003)

---

### Integration Architecture
**📄 `/product-docs/integration/09-service-catalog-sync.md`** (600 lines)

Sync architecture covering:
- Real-Time Event Sync (Kafka consumer)
- Daily Reconciliation (CSV import)
- Error Handling & Retry Logic
- Monitoring & Alerts
- Operational Runbooks

**Key Sections:**
- Section 1.2: Kafka Event Consumer Implementation (TypeScript)
- Section 1.3: Sync Service (create, update, deprecate)
- Section 2.2: Daily Reconciliation Job (CSV parsing, drift detection)
- Section 3: Error Handling (retry strategy, dead letter queue)
- Section 4: Operational Runbooks (troubleshooting guides)

---

### API Specifications
**📄 `/product-docs/api/10-service-catalog-api.md`** (PENDING)

Will cover:
- Service Catalog APIs (CRUD, pricing lookup)
- Provider Specialty APIs (assign, revoke, performance)
- Admin/Monitoring APIs (sync status, event logs)
- Request/Response schemas (OpenAPI)

---

## 🗄️ Database Schema

### New Tables (9 tables, ~45 columns)

**Geographic Master Data:**
- `countries` (4 rows: ES, FR, IT, PL)
- `provinces` (~100 rows)
- `cities` (~5,000 rows)
- `postal_codes` (~68,000 rows)

**Service Catalog:**
- `service_catalog` (100-500 services per country)
- `service_pricing` (pricing variants by postal code)
- `service_skill_requirements` (skill mappings)

**Provider Specialties:**
- `provider_specialties` (15-20 core specialties)
- `specialty_service_mappings` (many-to-many)
- `provider_specialty_assignments` (provider capabilities)

**Contract Templates:**
- `contract_templates` (Adobe Sign abstraction)

**Sync Infrastructure:**
- `service_catalog_event_log` (Kafka event tracking)
- `service_catalog_reconciliation` (daily job history)

### Modified Tables

**`work_teams`:**
- ❌ Remove: `skills JSON` (migrate to `provider_specialty_assignments`)
- ❌ Remove: `service_types JSON` (incorrect usage)

**`service_orders` (future):**
- ✅ Add: `service_id UUID` (FK to `service_catalog`)
- ✅ Add: `agreed_provider_rate Decimal`
- ✅ Add: `agreed_currency String`

---

## 🛠️ Implementation Plan

### Phase 1: Foundation (Weeks 5-6) - 2 weeks
**Goal**: Database schema and seed data

**Deliverables:**
- [ ] Prisma models for all 9 new tables
- [ ] Database migrations
- [ ] Geographic data seeding (68K postal codes)
- [ ] Sample service catalog seeding (50 services)
- [ ] 15-20 provider specialties seeded

**Success Criteria:**
- ✅ All tables created with proper indexes
- ✅ Postal code lookup working (<50ms)
- ✅ Sample services queryable

---

### Phase 2: Core Services (Weeks 7-8) - 2 weeks
**Goal**: Business logic implementation

**Deliverables:**
- [ ] Service Catalog Service (CRUD, pricing lookup)
- [ ] Provider Specialty Service (assign, revoke, tracking)
- [ ] Geographic Service (postal code resolution)
- [ ] Pricing lookup with inheritance

**Success Criteria:**
- ✅ Service creation/update working
- ✅ Pricing lookup handles postal code → country fallback
- ✅ Specialty assignment validates certifications

---

### Phase 3: Event-Driven Sync (Weeks 9-11) - 3 weeks
**Goal**: Kafka integration and reconciliation

**Deliverables:**
- [ ] Kafka Event Consumer (service.created, .updated, .deprecated)
- [ ] Sync Service (idempotency, breaking change detection)
- [ ] Daily Reconciliation Job (CSV import, drift correction)
- [ ] Error handling & retry logic
- [ ] Monitoring dashboard

**Success Criteria:**
- ✅ Events processed in <100ms (p95)
- ✅ <1% event processing failure rate
- ✅ Daily reconciliation detects and fixes drift
- ✅ Alerting on high drift rate (>5%)

---

### Phase 4: API Layer (Weeks 12-13) - 2 weeks
**Goal**: REST API exposure

**Deliverables:**
- [ ] Service Catalog APIs (11 endpoints)
- [ ] Provider Specialty APIs (5 endpoints)
- [ ] Admin/Monitoring APIs (3 endpoints)
- [ ] OpenAPI documentation
- [ ] API tests

**Success Criteria:**
- ✅ All endpoints return <500ms (p95)
- ✅ RBAC enforced (country managers can price, operators can view)
- ✅ Swagger UI accessible

---

### Phase 5: Testing & Validation (Week 14) - 1 week
**Goal**: Quality assurance

**Deliverables:**
- [ ] Unit tests (>85% coverage)
- [ ] Integration tests (E2E sync flow)
- [ ] Performance tests (load testing)
- [ ] UAT with operators/country managers

**Success Criteria:**
- ✅ >85% test coverage
- ✅ Pricing lookup <50ms (p99)
- ✅ Assignment filtering uses new model
- ✅ User acceptance sign-off

---

## ⚙️ Configuration

### Environment Variables

```bash
# Kafka Configuration
KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092
KAFKA_SSL=true
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=yellow-grid-fsm
KAFKA_SASL_PASSWORD=<secret>

# Google Cloud Storage (for reconciliation)
GCS_BUCKET=yellow-grid-service-catalog
GCS_PROJECT_ID=yellow-grid-prod

# Sync Configuration
SERVICE_CATALOG_SYNC_ENABLED=true
SERVICE_CATALOG_RECONCILIATION_SCHEDULE=0 3 * * *  # Daily at 3 AM
SERVICE_CATALOG_MAX_RETRY_ATTEMPTS=3
SERVICE_CATALOG_DRIFT_ALERT_THRESHOLD=0.05  # 5%
```

---

## 📊 Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event processing latency (p95) | <100ms | Prometheus |
| Event processing failure rate | <1% | Kafka lag monitoring |
| Reconciliation drift rate | <5% | Daily job logs |
| Pricing lookup latency (p99) | <50ms | APM |
| Service catalog query latency (p95) | <200ms | APM |
| Test coverage | >85% | Jest coverage report |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Service catalog completeness | 100% | Count of synced services |
| Provider specialty assignment rate | 100% | All providers have ≥1 specialty |
| Assignment accuracy improvement | +15% | Before/after comparison |
| Manual service code management time | -80% | Operator surveys |

---

## 🚨 Risks & Mitigation

### High Priority Risks

**1. Kafka Event Schema Changes**
- **Risk**: Client changes event structure, breaks parser
- **Probability**: Medium
- **Impact**: High (sync stops working)
- **Mitigation**:
  - Version all event schemas
  - Fail gracefully on unknown fields
  - Automated alerts on parsing errors

**2. Postal Code Data Quality**
- **Risk**: Missing/incorrect postal codes
- **Probability**: High
- **Impact**: Medium (pricing lookup fails)
- **Mitigation**:
  - Validate during import
  - Flag missing codes in admin UI
  - Fallback to country/BU default

**3. Sync Drift Accumulation**
- **Risk**: Events missed, data diverges
- **Probability**: Medium
- **Impact**: High (incorrect service data)
- **Mitigation**:
  - Daily reconciliation job
  - Automated alerts at >5% drift
  - Manual reconciliation trigger

**4. Performance Degradation**
- **Risk**: Large catalogs slow queries
- **Probability**: Medium
- **Impact**: High (assignment filtering slow)
- **Mitigation**:
  - Aggressive indexing
  - Redis caching for hot data
  - Materialized views if needed

---

## 🔗 Integration Points

### Upstream Dependencies

**External Sales Systems:**
- Pyxis (Spain, France)
- Tempo (Italy)
- SAP (Poland)

**Must Provide:**
- Kafka topic `service-catalog` with events
- Daily CSV export to GCS bucket (format specified)

### Downstream Dependencies

**Assignment Module (Phase 2):**
- Uses `ServiceSkillRequirement` for filtering
- Uses `ProviderSpecialtyAssignment` for matching
- Replaces JSON-based skill logic

**Service Order Module (Phase 2):**
- References `ServiceCatalog` via FK
- Captures pricing snapshot at booking
- Validates prerequisites from catalog

---

## 📞 Team Contacts

**Module Owner**: Integration Team Lead
**Backend Lead**: Backend Team A Lead
**Kafka Expert**: Platform Infrastructure Team
**Data Migration**: Database Team

**Slack Channel**: #yellow-grid-service-referential
**Stand-up**: Daily @ 10:00 AM
**Sprint Planning**: Every 2 weeks (Monday)
**Retrospective**: Every 2 weeks (Friday)

---

## 📖 References

**Related Documentation:**
- `/product-docs/domain/02-provider-capacity-domain.md` (Provider model)
- `/product-docs/domain/03-project-service-order-domain.md` (Service order integration)
- `/product-docs/architecture/01-architecture-overview.md` (System architecture)
- `/product-docs/infrastructure/03-kafka-architecture.md` (Kafka setup)

**External Resources:**
- Kafka Consumer Best Practices: https://kafka.apache.org/documentation/
- Prisma Schema Reference: https://www.prisma.io/docs/reference
- PostgreSQL Indexing Guide: https://www.postgresql.org/docs/current/indexes.html

---

## ✅ Next Actions

### Immediate (Week 5)
1. **Kickoff meeting** with Integration + Backend teams
2. **Create Prisma schema** for all 9 tables
3. **Generate migrations** and test locally
4. **Request sample data** from Pyxis team (CSV export)

### Short-Term (Weeks 6-8)
5. **Seed geographic data** (68K postal codes)
6. **Implement core services** (catalog, pricing, specialty)
7. **Build Kafka consumer** (event handling)

### Medium-Term (Weeks 9-14)
8. **Daily reconciliation job** (CSV import, drift detection)
9. **API layer** (REST endpoints)
10. **Testing & UAT** (quality assurance)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-17
**Next Review**: 2025-02-14 (monthly)
**Status**: ✅ Design Complete, 🟡 Implementation Starting
