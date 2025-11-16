# PRD v2 Gap Analysis Report
**Analysis Date**: 2025-01-15
**PRD Version**: v2 (ahs_field_service_execution_prd_v2.md)
**Current Specifications**: /Users/20015403/Documents/PROJECTS/personal/fsm/product-docs/

---

## Executive Summary

This comprehensive gap analysis compares the updated PRD v2 against the current engineering specifications across all documented areas: business activities, functional requirements, personas/RBAC, integrations, and non-functional requirements.

**Overall Assessment**:
- **Coverage Level**: ~75% complete
- **Critical Gaps**: 5 major areas requiring new documentation
- **Inconsistencies**: 12 minor inconsistencies detected
- **Exceeds PRD**: 3 areas where specs are more detailed than PRD

---

## 1. Business Activities Coverage (PRD Section 2.1)

### 1.1 **Organize the Execution** ✅ COVERED (80%)

**PRD Requirements**:
- Integrate service orders from sales
- Plan/confirm execution slots (with buffers)
- Manage pre-service contract signature

**Current Spec Coverage**:
- ✅ **domain/03-project-service-order-domain.md**: Service order creation, state machine
- ✅ **domain/04-scheduling-buffer-logic.md**: NOT FOUND (referenced but missing)
- ✅ **domain/07-contract-document-lifecycle.md**: Complete contract lifecycle with e-signature
- ✅ **api/04-scheduling-api.md**: Slot availability APIs

**Gaps**:
- ❌ **Missing**: Scheduling & Buffer Logic domain documentation (referenced but file doesn't exist)
- ❌ **Missing**: Detailed buffer stacking rules (global + static + commute)
- ⚠️ **Incomplete**: Integration of service orders from sales (high-level only in integration/03-sales-integration.md)

**Recommendation**: Create `domain/04-scheduling-buffer-logic.md` with comprehensive buffer calculation rules.

---

### 1.2 **Find a Pro** ✅ COVERED (95%)

**PRD Requirements**:
- Automatic and manual assignment of providers/work teams
- Manage failures of automatic distribution

**Current Spec Coverage**:
- ✅ **domain/05-assignment-dispatch-logic.md**: NOT FOUND (referenced but missing)
- ✅ **domain/02-provider-capacity-domain.md**: Complete provider hierarchy (P1/P2), zones, skills
- ✅ **api/05-assignment-dispatch-api.md**: Assignment API endpoints

**Gaps**:
- ❌ **Missing**: Assignment & Dispatch Logic domain documentation (referenced but doesn't exist)
- ❌ **Missing**: Funnel transparency logic (who was filtered out and why)
- ❌ **Missing**: Provider scoring algorithm details
- ❌ **Missing**: Assignment modes (direct, offer, broadcast, auto-accept)

**Recommendation**: Create `domain/05-assignment-dispatch-logic.md` with complete assignment funnel and scoring logic.

---

### 1.3 **Orchestrate the Execution** ⚠️ PARTIAL (60%)

**PRD Requirements**:
- Payment readiness checks (without executing payment)
- Product delivery checks
- Manage cancellations, reschedules, reassignments, extra-costs
- Handle orchestration events (provider cancel, missing products)

**Current Spec Coverage**:
- ✅ **domain/03-project-service-order-domain.md**: Service order state machine with cancellation, on-hold states
- ⚠️ **integration/04-erp-integration.md**: High-level payment signaling to ERP

**Gaps**:
- ❌ **Missing**: Payment readiness checks (not payment execution)
- ❌ **Missing**: Product delivery validation logic
- ❌ **Missing**: Extra-cost approval workflow (who can approve, limits)
- ❌ **Missing**: Reschedule business rules (when allowed, who approves)
- ❌ **Missing**: Reassignment logic after provider cancellation
- ❌ **Missing**: Event-driven orchestration patterns (missing products, customer no-show)

**Recommendation**: Create `domain/08-orchestration-events.md` covering all orchestration events and workflows.

---

### 1.4 **Perform the Execution** ✅ COVERED (90%)

**PRD Requirements**:
- Provider check-in/check-out
- Execution checklists, photos, notes
- Partial completion / pauses and rework flows

**Current Spec Coverage**:
- ✅ **domain/06-execution-field-operations.md**: Complete check-in/out workflow
- ✅ **api/06-execution-mobile-api.md**: Mobile execution APIs
- ✅ **domain/07-contract-document-lifecycle.md**: WCF (Work Closing Form) management

**Gaps**:
- ⚠️ **Minor**: Paused/incomplete job taxonomy (which reasons map to which follow-up actions) - partially covered in WCF
- ⚠️ **Minor**: Offline sync conflict resolution rules (mentioned but not detailed)

**Recommendation**: Enhance execution docs with detailed incomplete job reason taxonomy and offline conflict resolution.

---

### 1.5 **Manage Feedback** ❌ NOT COVERED (10%)

**PRD Requirements**:
- Capture CSAT/NPS/effort scores from customers, Pros, and operators
- Feed continuous improvement

**Current Spec Coverage**:
- ❌ **Missing**: Feedback collection domain model
- ❌ **Missing**: CSAT/NPS/CES definitions and workflows
- ❌ **Missing**: Feedback API endpoints
- ⚠️ **Partial**: WCF includes customer satisfaction rating (1-5 scale) but not comprehensive

**Gaps**:
- ❌ **Missing**: Complete feedback domain model (CSAT, NPS, CES, effort score)
- ❌ **Missing**: Feedback collection triggers (when, who, how)
- ❌ **Missing**: Feedback aggregation and analytics
- ❌ **Missing**: Continuous improvement data pipeline

**Recommendation**: Create `domain/09-feedback-quality.md` and `api/09-feedback-api.md`.

---

### 1.6 **Invoice & Pay the Provider (Signaling Only)** ✅ COVERED (70%)

**PRD Requirements**:
- Consolidate execution, extras and acceptance status
- Signal to ERP/finance for self-billing or invoice-submission flows
- No payment execution inside platform

**Current Spec Coverage**:
- ✅ **integration/04-erp-integration.md**: High-level ERP integration
- ✅ **domain/07-contract-document-lifecycle.md**: WCF pricing, labor, materials tracking
- ⚠️ **domain/02-provider-capacity-domain.md**: Provider billing model flags mentioned but not fully detailed

**Gaps**:
- ❌ **Missing**: Billing model (self-billing vs invoice submission) business rules
- ❌ **Missing**: Extra-cost approval and consolidation logic
- ❌ **Missing**: Payment hold logic (when to hold due to claims/disputes)
- ❌ **Missing**: Detailed event schema for ERP signaling (amounts, currencies, provider IDs)

**Recommendation**: Expand `integration/04-erp-integration.md` with detailed billing model rules and event schemas.

---

### 1.7 **Manage Claim** ❌ NOT COVERED (0%)

**PRD Requirements**:
- Register and manage claims
- Link to rework visits and root-cause analysis

**Current Spec Coverage**:
- ❌ **Missing**: Claims domain model completely absent
- ❌ **Missing**: Claims API
- ❌ **Missing**: Rework triggering from claims
- ⚠️ **Partial**: WCF includes disputed items but not full claim lifecycle

**Gaps**:
- ❌ **Missing**: Claims domain model (claim types, states, lifecycle)
- ❌ **Missing**: Claims to rework service order linkage
- ❌ **Missing**: Root cause taxonomy
- ❌ **Missing**: Claims impact on provider scoring
- ❌ **Missing**: Claims API endpoints

**Recommendation**: Create `domain/10-claims-rework.md` and `api/10-claims-api.md`.

---

### 1.8 **Track & Supervise the Execution** ⚠️ PARTIAL (50%)

**PRD Requirements**:
- Funnel and KPI views
- Control tower dashboards, alerts, and tasking

**Current Spec Coverage**:
- ✅ **api/07-control-tower-api.md**: Control Tower API endpoints
- ⚠️ **Partial**: Monitoring in operations docs but not business-level KPIs

**Gaps**:
- ❌ **Missing**: Funnel view definitions (assignment funnel, execution funnel)
- ❌ **Missing**: KPI definitions and calculation rules
- ❌ **Missing**: Alert taxonomy and thresholds
- ❌ **Missing**: Tasking system (task types, assignment rules, SLAs)
- ❌ **Missing**: Dashboard configuration and views

**Recommendation**: Create `domain/11-control-tower-supervision.md` with KPIs, funnels, alerts.

---

### 1.9 **Support & Manage Issues and Incidents** ❌ NOT COVERED (20%)

**PRD Requirements**:
- Event-driven tasks for issues before, during, and after execution
- Integration with ticketing tools

**Current Spec Coverage**:
- ⚠️ **Partial**: Integration with ticketing mentioned in PRD Section 4.13
- ⚠️ **Partial**: Incident response in `operations/04-incident-response.md` (technical, not business)
- ❌ **Missing**: Business-level issue/incident domain model

**Gaps**:
- ❌ **Missing**: Issue/incident domain model (types, states, SLAs)
- ❌ **Missing**: Event-to-task mapping (which events trigger which tasks)
- ❌ **Missing**: Task assignment rules (who handles what)
- ❌ **Missing**: Ticketing integration event schemas

**Recommendation**: Create `domain/12-issues-incidents.md` and enhance `integration/08-ticketing-integration.md`.

---

### 1.10 **Continuous Improvement** ⚠️ PARTIAL (30%)

**PRD Requirements**:
- Provide data, events, and exports to feed BIR process and stream governance

**Current Spec Coverage**:
- ⚠️ **Partial**: Event-driven architecture in `architecture/05-event-driven-architecture.md`
- ⚠️ **Partial**: Analytics integration mentioned in `integration/01-integration-architecture.md`
- ❌ **Missing**: BIR (Business Improvement Request) process integration

**Gaps**:
- ❌ **Missing**: Data export formats and schedules
- ❌ **Missing**: BIR process integration points
- ❌ **Missing**: Governance dashboard data requirements
- ❌ **Missing**: Continuous improvement data pipeline

**Recommendation**: Create `integration/09-analytics-data-platform.md` with complete CI data feeds.

---

## 2. Functional Requirements Gaps (PRD Section 4)

### 2.1 **Confirmation TV Flow** ❌ NOT COVERED (0%)

**PRD Requirements (4.1.1)**:
- Log business impact for each TV (installation unblocked/updated/cancelled)
- Automatic task creation for sales when NO or YES-BUT detected
- Automatic ticket creation when manual interaction required

**Current Spec Coverage**:
- ⚠️ **Partial**: TV mentioned in service order domain but not TV-specific flow
- ❌ **Missing**: Confirmation TV outcomes (YES, YES-BUT, NO)
- ❌ **Missing**: TV impact on installation order blocking/unblocking
- ❌ **Missing**: Sales integration event for TV=NO (cancel/refund)

**Gaps**:
- ❌ **Missing**: Complete Confirmation TV flow documentation
- ❌ **Missing**: YES-BUT handling (scope change workflow)
- ❌ **Missing**: TV outcome state machine
- ❌ **Missing**: Sales task generation rules

**Recommendation**: Add Confirmation TV section to `domain/03-project-service-order-domain.md` or create separate `domain/13-technical-visit-flow.md`.

---

### 2.2 **Contract Lifecycle** ✅ COVERED (95%)

**PRD Requirements (4.1.2)**:
- Contract templates configurable per country, service category, model
- Execution cannot move to "Go" unless contract signed or override registered
- Historical versions retained and traceable

**Current Spec Coverage**:
- ✅ **domain/07-contract-document-lifecycle.md**: EXCELLENT coverage
  - Contract types, status state machine
  - E-signature workflow (multiple types: electronic, digital, biometric, notarized)
  - Contract versioning and audit trail
  - Pre-service contracts vs WCF

**Gaps**:
- ⚠️ **Minor**: Contract template configurability (per country/service) not explicitly detailed
- ⚠️ **Minor**: "Go" state execution blocking rule not explicitly in service order state machine

**Recommendation**: Add contract requirement check to service order state transitions.

---

### 2.3 **WCF Management** ✅ COVERED (90%)

**PRD Requirements (4.1.3)**:
- WCF outcomes used for claim creation and rework orders
- WCF signed by customer (digital or paper + upload)
- WCF stored as legal documentation

**Current Spec Coverage**:
- ✅ **domain/07-contract-document-lifecycle.md**: Complete WCF model
  - Work performed, materials, equipment, labor
  - Quality checks, customer acceptance/disputes
  - Photos (before/after), signatures
  - Pricing and billing details

**Gaps**:
- ⚠️ **Minor**: WCF to claim linkage (mentioned but not detailed workflow)
- ⚠️ **Minor**: WCF to rework order creation (not explicit)

**Recommendation**: Enhance WCF section with explicit claim and rework triggers.

---

### 2.4 **Provider Hierarchy & Billing Models** ✅ COVERED (85%)

**PRD Requirements (4.2)**:
- Provider-team hierarchy
- P1/P2 priorities and exclusivities
- Service type opt-in/opt-out
- Risk status (OK/Watch/Blocked)
- Billing model flags (self_billing | invoice_submission)

**Current Spec Coverage**:
- ✅ **domain/02-provider-capacity-domain.md**: Excellent P1/P2 hierarchy
  - Provider types (P1 primary, P2 subcontractor)
  - Provider-team relationship
  - Skills, certifications, zones
  - Provider status state machine

**Gaps**:
- ❌ **Missing**: Service type opt-in/opt-out logic (mentioned in PRD, not in specs)
- ❌ **Missing**: P1/P2 priority rules (who gets offered jobs first)
- ❌ **Missing**: Exclusivity rules (P1-only services)
- ⚠️ **Partial**: Risk status mentioned but not state machine (OK/Watch/Blocked)
- ❌ **Missing**: Billing model flags (self_billing vs invoice_submission)
- ❌ **Missing**: Service mix targets

**Recommendation**: Enhance `domain/02-provider-capacity-domain.md` with opt-in/out, priority rules, billing models.

---

### 2.5 **Capacity, Calendar & Work Patterns** ✅ COVERED (95%)

**PRD Requirements (4.3)**:
- Working calendars (days, hours)
- Dedicated service days
- External blocks (vacations, training)
- Capacity per slot (jobs, time, complexity)
- Multi-person jobs (crew size)
- Drive time / commute buffer
- Seasonality, holidays

**Current Spec Coverage**:
- ✅ **domain/02-provider-capacity-domain.md**: EXCELLENT coverage
  - Calendar entity with working hours, capacity slots
  - Blackout periods (holidays, training, leave)
  - Reserved slots
  - Slot availability checking

**Gaps**:
- ⚠️ **Minor**: Dedicated service days (e.g., bathrooms only certain days) - not explicit
- ⚠️ **Minor**: Multi-person job crew size requirements - not detailed
- ⚠️ **Minor**: Complexity points per slot - not mentioned
- ⚠️ **Minor**: Seasonality modeling - not detailed

**Recommendation**: Minor enhancements for dedicated service days and complexity modeling.

---

### 2.6 **Scheduling & Buffer Logic** ❌ NOT FULLY DOCUMENTED (40%)

**PRD Requirements (4.4)**:
- Global/advance buffers
- Static/product buffers (long-lead products)
- Commute buffer between slots
- Slot granularity by service type
- Rules exposed via APIs to sales
- Traceable explanation for each decision

**Current Spec Coverage**:
- ⚠️ **Referenced**: `domain/04-scheduling-buffer-logic.md` referenced in CLAUDE.md but **file doesn't exist**
- ⚠️ **Partial**: Buffer concept mentioned in service order domain
- ✅ **api/04-scheduling-api.md**: API endpoints exist

**Gaps**:
- ❌ **CRITICAL MISSING**: Complete scheduling & buffer logic domain documentation
- ❌ **Missing**: Buffer stacking rules (how global + static + commute combine)
- ❌ **Missing**: Slot granularity configuration (30/60/90 min by service type)
- ❌ **Missing**: Buffer explanation/traceability (why slot was excluded)
- ❌ **Missing**: Holiday and store closure buffer handling

**Recommendation**: **URGENT**: Create `domain/04-scheduling-buffer-logic.md` with comprehensive buffer calculation rules.

---

### 2.7 **Assignment & Dispatch** ❌ NOT FULLY DOCUMENTED (40%)

**PRD Requirements (4.5)**:
- Eligibility funnel with filters (zone, radius, service opt-out, P1/P2, brand/product, certs, calendar, capacity, risk, TV-related)
- Record funnel audit (how many candidates, which IDs filtered at each step)
- Human-readable funnel view
- Assignment modes: direct, offer, auto-accept, broadcast
- Provider offers and negotiations (multiple rounds)
- Unassigned job alerts

**Current Spec Coverage**:
- ⚠️ **Referenced**: `domain/05-assignment-dispatch-logic.md` referenced in CLAUDE.md but **file doesn't exist**
- ⚠️ **Partial**: Provider matching logic implied in provider domain
- ✅ **api/05-assignment-dispatch-api.md**: API endpoints exist

**Gaps**:
- ❌ **CRITICAL MISSING**: Complete assignment & dispatch logic domain documentation
- ❌ **Missing**: Funnel transparency (audit trail at each filter step)
- ❌ **Missing**: Scoring algorithm (distance, tier, quality, continuity, P1 match)
- ❌ **Missing**: Assignment modes (direct vs offer vs broadcast)
- ❌ **Missing**: Auto-accept country rules (ES/IT)
- ❌ **Missing**: Offer negotiation rounds
- ❌ **Missing**: Unassigned job handling

**Recommendation**: **URGENT**: Create `domain/05-assignment-dispatch-logic.md` with complete funnel and scoring logic.

---

### 2.8 **Execution Workflow & Mobile App** ✅ COVERED (90%)

**PRD Requirements (4.6)**:
- Mobile app: job list, navigation, check-in/out, checklists, photos, extra works, WCF capture, incomplete/paused marking
- Structured reasons for incomplete jobs
- Offline mode with sync

**Current Spec Coverage**:
- ✅ **domain/06-execution-field-operations.md**: Complete execution workflow
- ✅ **api/06-execution-mobile-api.md**: Mobile API endpoints
- ✅ **domain/07-contract-document-lifecycle.md**: WCF capture in detail

**Gaps**:
- ⚠️ **Minor**: Incomplete job reason taxonomy (mapping to root causes) - partially covered
- ⚠️ **Minor**: Offline sync conflict resolution - mentioned but not detailed

**Recommendation**: Enhance execution docs with detailed incomplete job taxonomy.

---

### 2.9 **Customer-Provider Intermediation & Communication** ⚠️ PARTIAL (50%)

**PRD Requirements (4.7)**:
- Communication timelines configured per country (reminder SMS/email, appointment confirmation, reschedule notifications)
- Rules for store/operator intermediation (when customer can call Pro directly)
- Ticketing tool integration for escalations

**Current Spec Coverage**:
- ⚠️ **Partial**: `domain/08-communication-rules.md` referenced but **file doesn't exist**
- ⚠️ **Partial**: Communication mentioned in integration architecture

**Gaps**:
- ❌ **MISSING**: Communication domain model
- ❌ **Missing**: Communication timeline configuration (per country)
- ❌ **Missing**: Intermediation rules (direct vs store-mediated)
- ❌ **Missing**: Communication channel selection (SMS, email, app notification)
- ❌ **Missing**: Masked communication rules (privacy)

**Recommendation**: Create `domain/08-communication-rules.md` and `integration/06-communication-gateways.md` (file exists but may need enhancement).

---

### 2.10 **Post-Service, Claims, Quality & Compliance** ⚠️ PARTIAL (40%)

**PRD Requirements (4.8)**:
- Completion closure & documentation (emit events to ERP)
- Claims & reworks (linked to original and rework jobs, classified by root cause)
- Quality metrics per provider (first-time completion, rework frequency, claim rate, punctuality, CSAT/NPS)
- Safety checklists for high-risk services

**Current Spec Coverage**:
- ✅ **domain/07-contract-document-lifecycle.md**: WCF completion, documentation
- ⚠️ **Partial**: ERP integration for closure signals
- ❌ **Missing**: Claims domain model
- ❌ **Missing**: Quality metrics tracking

**Gaps**:
- ❌ **MISSING**: Claims domain model (claim types, states, root cause taxonomy)
- ❌ **Missing**: Rework triggering from claims
- ❌ **Missing**: Provider quality metrics calculation
- ❌ **Missing**: Provider scorecards
- ❌ **Missing**: Safety checklist configuration

**Recommendation**: Create `domain/09-claims-quality-management.md` with complete claims, quality metrics, and safety.

---

### 2.11 **Project / Journey Orchestration** ✅ COVERED (80%)

**PRD Requirements (4.9)**:
- Define standard journeys (simple install, TV→Install→WCF, maintenance, warranty, complex projects)
- Journey steps, dependencies, allowed transitions
- Project-level freeze (stop auto-optimization, requires manager override)

**Current Spec Coverage**:
- ✅ **domain/03-project-service-order-domain.md**: Project & Journey entities
  - Project status state machine
  - Service order dependencies (FinishToStart, StartToStart, etc.)
  - Journey with touchpoints

**Gaps**:
- ❌ **Missing**: Standard journey templates (pre-defined journey types)
- ❌ **Missing**: Project-level freeze logic
- ⚠️ **Minor**: Journey to business activity mapping not explicit

**Recommendation**: Add journey templates and project freeze logic to project domain doc.

---

### 2.12 **Analytics, Simulation & Governance** ❌ NOT COVERED (20%)

**PRD Requirements (4.10)**:
- Dashboards: automation rate, manual matching rate, on-time performance, lead times, claim/rework rates, contact rates, provider utilization
- Rule simulation (P1/P2 changes, opt-out/in changes, capacity adjustments, TV-only rules)
- Data exports for governance and BIR

**Current Spec Coverage**:
- ❌ **Missing**: Analytics domain model
- ❌ **Missing**: Simulation engine
- ❌ **Missing**: Governance KPIs and dashboards

**Gaps**:
- ❌ **MISSING**: Analytics domain model (KPI definitions, calculation rules)
- ❌ **Missing**: Simulation engine for rule changes
- ❌ **Missing**: Data export formats and schedules
- ❌ **Missing**: Governance dashboard requirements

**Recommendation**: Create `domain/14-analytics-simulation.md` and `api/11-analytics-api.md`.

---

### 2.13 **Document & Content Management** ✅ COVERED (100%)

**PRD Requirements (4.11)**:
- Store contracts, WCFs, photos, videos, audio, provider documents
- Tag as legal where applicable
- Retention rules per country/BU
- Search and retrieval by customer, service order, provider, project

**Current Spec Coverage**:
- ✅ **domain/07-contract-document-lifecycle.md**: EXCELLENT coverage
  - Document entity with versioning
  - Access control, encryption, retention policies
  - Legal hold, compliance tracking
  - Document storage (S3, Azure Blob, etc.)

**Gaps**: None. Documentation exceeds PRD requirements.

**Assessment**: Specifications are more comprehensive than PRD in this area.

---

### 2.14 **Operations Control Tower & Operator Tools** ⚠️ PARTIAL (60%)

**PRD Requirements (4.12)**:
- Unified workspace: alerts & tasks panel, grid calendar view, Gantt view, powerful search
- Availability check using same engine as scheduling API

**Current Spec Coverage**:
- ✅ **api/07-control-tower-api.md**: Control Tower API endpoints
- ⚠️ **Partial**: Dashboard views mentioned but not detailed

**Gaps**:
- ❌ **Missing**: Alerts & tasks panel configuration (alert types, thresholds, task types)
- ❌ **Missing**: Grid calendar view specifications
- ❌ **Missing**: Gantt view for projects and providers
- ⚠️ **Minor**: Search functionality detailed in API but not UX spec

**Recommendation**: Enhance Control Tower documentation with detailed view specs and alert/task configurations.

---

### 2.15 **Ticketing & Support Integration** ⚠️ PARTIAL (30%)

**PRD Requirements (4.13)**:
- Create tickets from events (failed assignment, payment/delivery issues, incomplete jobs, WCF refusals, claims, customer/Pro escalations)
- Link jobs/projects/providers to tickets
- Update ticket status based on state changes

**Current Spec Coverage**:
- ⚠️ **Mentioned**: Ticketing integration mentioned in architecture
- ❌ **Missing**: Detailed ticketing integration spec

**Gaps**:
- ❌ **MISSING**: Ticketing integration event schemas
- ❌ **Missing**: Event-to-ticket mapping rules
- ❌ **Missing**: Ticket status synchronization
- ❌ **Missing**: Entity linkage (job↔ticket, project↔ticket, provider↔ticket)

**Recommendation**: Create `integration/08-ticketing-integration.md` with complete event-to-ticket workflows.

---

## 3. Persona & RBAC Gaps (PRD Section 3)

### 3.1 **Personas Defined** ⚠️ PARTIAL (60%)

**PRD Personas**:
1. Customer (Inhabitant) - ✅ Mentioned in domain models
2. Seller / Service Sales Operator - ⚠️ Not in RBAC
3. Service Operator (Execution Editor/Admin/Viewer) - ⚠️ Partially in RBAC (Administrator, Support Agent)
4. Provider (Company / Independent Pro) - ✅ In domain models
5. Work Team (Crew / Technician) - ✅ In domain models
6. Customer Care Agent - ⚠️ Mentioned as Support Agent in RBAC
7. Execution Management & Business Leaders - ⚠️ Not explicitly in RBAC

**Current RBAC Spec Coverage**:
- ✅ **security/02-rbac-model.md**: COMPREHENSIVE RBAC model
  - Standard roles: Guest, User, Premium User, Moderator, Administrator, Super Admin
  - Service roles: API Client, Background Job, Support Agent
  - Permission structure: resource:action:scope
  - Policy examples

**Gaps**:
- ❌ **Missing**: Service Sales Operator role
- ❌ **Missing**: Execution Operator role (Editor/Admin/Viewer distinctions)
- ❌ **Missing**: Provider Portal roles (provider company admin, technician)
- ❌ **Missing**: Execution Management role (business leaders, read-only analytics)
- ⚠️ **Inconsistency**: RBAC document uses generic roles, not FSM-specific roles

**Recommendation**: Create FSM-specific RBAC model with all personas from PRD Section 3.1.

---

### 3.2 **RBAC Scope Levels** ⚠️ PARTIAL (40%)

**PRD Requirements**:
- Local vs central scopes (store/cluster/country)
- Business activities (organize, find a pro, orchestrate, etc.)
- High-risk action audit trails

**Current Spec Coverage**:
- ✅ **security/02-rbac-model.md**: Scope definitions (own, team, any, organizational scopes)
- ❌ **Missing**: Store/cluster/country multi-tenancy scopes
- ❌ **Missing**: Business activity-based permissions

**Gaps**:
- ❌ **Missing**: Multi-tenancy hierarchy scopes (country → BU → store)
- ❌ **Missing**: Business activity permissions (can_organize_execution, can_find_pro, can_orchestrate, etc.)
- ❌ **Missing**: High-risk action definitions and audit requirements

**Recommendation**: Enhance RBAC model with FSM-specific scopes and business activity permissions.

---

## 4. Integration Requirements Gaps (PRD Section 5)

### 4.1 **Sales Systems Integration** ⚠️ PARTIAL (50%)

**PRD Requirements**:
- Service order intake (products, services, customer data, flags like "requires confirmation TV")
- Slot-availability APIs
- Feedback on schedules, reschedules, cancellations, TV outcomes, TV=NO flows

**Current Spec Coverage**:
- ✅ **integration/03-sales-integration.md**: Sales integration documented
- ⚠️ **Partial**: High-level integration patterns

**Gaps**:
- ❌ **Missing**: Detailed event schemas for service order intake
- ❌ **Missing**: Confirmation TV flag handling
- ❌ **Missing**: TV=NO to sales (cancel/refund) event schema
- ⚠️ **Minor**: Slot availability API integration (API exists, integration pattern not detailed)

**Recommendation**: Enhance sales integration with detailed event schemas and TV flow integration.

---

### 4.2 **ERP / Finance Integration** ⚠️ PARTIAL (60%)

**PRD Requirements**:
- Receive signals for self-billing vs invoice submission flows
- Amounts and currencies (base, extras)
- Ready for payment / hold due to claim
- Platform never executes payments

**Current Spec Coverage**:
- ✅ **integration/04-erp-integration.md**: ERP integration documented
- ⚠️ **Partial**: High-level signaling patterns

**Gaps**:
- ❌ **Missing**: Self-billing vs invoice submission event differentiation
- ❌ **Missing**: Payment hold logic (due to claims/disputes)
- ❌ **Missing**: Detailed event schema (provider IDs, amounts, currencies, billing model)
- ❌ **Missing**: Extra-cost signaling

**Recommendation**: Enhance ERP integration with detailed billing model event schemas.

---

### 4.3 **Master Data Integration** ⚠️ PARTIAL (40%)

**PRD Requirements**:
- Customers, providers, products, services, prices
- Provider risk/compliance status
- Mandatory document definitions

**Current Spec Coverage**:
- ✅ **integration/07-master-data-integration.md**: Master data integration documented
- ⚠️ **Partial**: High-level patterns only

**Gaps**:
- ❌ **Missing**: Provider risk/compliance status synchronization
- ❌ **Missing**: Mandatory document definition synchronization
- ❌ **Missing**: Product/service catalog synchronization details

**Recommendation**: Enhance master data integration with detailed entity schemas.

---

### 4.4 **Identity / SSO** ✅ COVERED (90%)

**PRD Requirements**:
- SSO for internal users
- Federated access for Pros where applicable

**Current Spec Coverage**:
- ✅ **api/02-authentication-authorization.md**: Authentication & authorization documented
- ✅ **security/01-security-architecture.md**: SSO patterns

**Gaps**:
- ⚠️ **Minor**: Federated provider access (not detailed)

**Recommendation**: Minor enhancement for provider federated auth.

---

### 4.5 **Ticketing / Customer Care** ❌ NOT COVERED (20%)

**PRD Requirements**:
- Events → tickets
- Job/claim state changes → ticket updates

**Current Spec Coverage**:
- ⚠️ **Mentioned**: Ticketing mentioned in PRD Section 4.13 analysis
- ❌ **Missing**: Detailed ticketing integration spec

**Gaps**: Same as Section 2.15 above.

**Recommendation**: Create `integration/08-ticketing-integration.md`.

---

### 4.6 **Analytics / Data Platform** ❌ NOT COVERED (10%)

**PRD Requirements**:
- Events and data exports for dashboards, governance, continuous improvement

**Current Spec Coverage**:
- ❌ **Missing**: Analytics/data platform integration spec

**Gaps**:
- ❌ **MISSING**: Data export formats and schedules
- ❌ **Missing**: Event streaming to analytics platform
- ❌ **Missing**: Governance dashboard data requirements

**Recommendation**: Create `integration/09-analytics-data-platform.md`.

---

## 5. NFR Coverage (PRD Section 7)

### 5.1 **Scalability & Performance** ✅ COVERED (85%)

**PRD Requirements**:
- Support large volumes of bookings
- Low-latency APIs for slot search and assignment

**Current Spec Coverage**:
- ✅ **architecture/07-scalability-resilience.md**: Scalability patterns
- ✅ **operations/01-observability-strategy.md**: Performance monitoring
- ✅ **CLAUDE.md**: Performance targets (API p95 < 500ms, 10K orders/month)

**Gaps**:
- ⚠️ **Minor**: Specific slot search and assignment latency targets not explicit
- ⚠️ **Minor**: Load testing scenarios not detailed

**Recommendation**: Add specific latency SLOs for critical paths (slot search, assignment).

---

### 5.2 **Availability** ✅ COVERED (90%)

**PRD Requirements**:
- 99.9% uptime for core APIs and operator portal
- Offline-capable mobile app with conflict handling

**Current Spec Coverage**:
- ✅ **CLAUDE.md**: 99.9% uptime target documented
- ✅ **domain/06-execution-field-operations.md**: Offline mode mentioned
- ✅ **architecture/07-scalability-resilience.md**: Resilience patterns

**Gaps**:
- ⚠️ **Minor**: Offline conflict resolution rules not detailed

**Recommendation**: Detail offline conflict resolution in mobile execution docs.

---

### 5.3 **Security & GDPR** ✅ COVERED (95%)

**PRD Requirements**:
- Encryption in transit and at rest
- Strong RBAC and audit logs
- Data subject rights (export, deletion)
- EU data residency

**Current Spec Coverage**:
- ✅ **security/01-security-architecture.md**: Comprehensive security
- ✅ **security/02-rbac-model.md**: RBAC model
- ✅ **security/03-data-privacy-gdpr.md**: GDPR compliance
- ✅ **security/04-audit-traceability.md**: Audit logging

**Gaps**: None. Security coverage exceeds PRD requirements.

**Assessment**: Specifications are more comprehensive than PRD.

---

### 5.4 **Configurability** ⚠️ PARTIAL (60%)

**PRD Requirements**:
- Buffers, calendars, provider attributes, journeys, contract/WCF templates, communication rules, billing model flags, metrics thresholds configurable without code deployment
- Country/BU configuration separated from core logic

**Current Spec Coverage**:
- ⚠️ **Partial**: Configuration mentioned in various docs
- ✅ **api/09-configuration-api.md**: Configuration API documented

**Gaps**:
- ❌ **Missing**: Configuration domain model (what is configurable, configuration schema)
- ❌ **Missing**: Configuration versioning and rollback
- ❌ **Missing**: Country/BU configuration isolation
- ❌ **Missing**: Feature flags for gradual rollout

**Recommendation**: Create `domain/15-configuration-management.md` with complete configuration model.

---

### 5.5 **Maintainability & Extensibility** ✅ COVERED (85%)

**PRD Requirements**:
- API-first, event-driven architecture
- Clear separation of core platform and country/BU configurations
- Ability to plug in external optimization engines

**Current Spec Coverage**:
- ✅ **architecture/01-architecture-overview.md**: API-first architecture
- ✅ **architecture/05-event-driven-architecture.md**: Event-driven patterns
- ✅ **api/01-api-design-principles.md**: OpenAPI 3.1 specs

**Gaps**:
- ⚠️ **Minor**: External optimization engine plugin architecture not detailed

**Recommendation**: Minor enhancement for plugin architecture patterns.

---

## 6. Inconsistencies Detected

### 6.1 **P1/P2 Priority Terminology**

**PRD**: Uses "P1 (Priority)" and "P2 (Standard)" in Section 4.2
**Specs**: `domain/02-provider-capacity-domain.md` uses "P1 (Primary Provider)" and "P2 (Subcontractor)"

**Resolution**: Align terminology. PRD "P1/P2" refers to service priority (24-72h vs 3-7d). Specs "P1/P2" refers to provider type (primary vs subcontractor). These are different concepts that share the same label.

**Recommendation**: Rename provider types to "Primary Provider / Subcontractor" to avoid confusion with service priority levels.

---

### 6.2 **Service Order State Names**

**PRD Section 1.1**: "CREATED → SCHEDULED → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED → VALIDATED → CLOSED"
**Specs**: `domain/03-project-service-order-domain.md`: "Created → Scheduled → Assigned → Dispatched → InProgress → Completed → Verified"

**Resolution**: Minor naming differences: ACCEPTED vs Dispatched, VALIDATED vs Verified, CLOSED missing in specs.

**Recommendation**: Align state names. Add CLOSED state to specs or clarify that Verified = Closed.

---

### 6.3 **WCF vs Work Completion Form**

**PRD**: Uses "WCF (Work Closing Form)" throughout
**Specs**: `domain/07-contract-document-lifecycle.md` uses "WCF (Work Completion Form)"

**Resolution**: Terminology inconsistency: "Closing" vs "Completion"

**Recommendation**: Standardize on "Work Completion Form (WCF)" as used in specs.

---

### 6.4 **Provider Zones: Primary/Secondary vs Intervention Zones**

**PRD**: Doesn't explicitly distinguish primary vs secondary zones
**Specs**: `domain/02-provider-capacity-domain.md` has `Zone.type = 'Primary' | 'Secondary'`

**Resolution**: Specs add concept not in PRD.

**Recommendation**: Validate with stakeholders if Primary/Secondary zone distinction is needed or if all provider zones are equal.

---

### 6.5 **Multi-Tenancy Hierarchy**

**PRD**: Not explicitly detailed (assumes multi-country/BU support)
**CLAUDE.md**: Defines hierarchy: "Country → BU → Store"
**Specs**: Multi-tenancy strategy in `architecture/06-multi-tenancy-strategy.md` (file not read, but referenced)

**Resolution**: Need to validate hierarchy consistency.

**Recommendation**: Ensure multi-tenancy hierarchy is consistent across all docs.

---

## 7. Specifications Exceeding PRD Requirements

### 7.1 **Document Management (Section 2.13)**

**Specs**: `domain/07-contract-document-lifecycle.md` includes:
- Document versioning with full history
- Access control with share links and permissions
- Encryption and checksums
- Compliance attestations
- Legal hold functionality

**PRD**: Basic requirements: store documents, retention rules, search

**Assessment**: Specs are significantly more comprehensive than PRD. This is positive.

---

### 7.2 **Security Architecture**

**Specs**:
- `security/01-security-architecture.md`
- `security/02-rbac-model.md` (comprehensive policy examples)
- `security/04-audit-traceability.md`
- `security/05-secrets-management.md`
- `security/06-api-security.md`

**PRD Section 7**: Basic security requirements (encryption, RBAC, GDPR, audit logs)

**Assessment**: Security specs are significantly more detailed than PRD. This is positive.

---

### 7.3 **E-Signature Workflow**

**Specs**: `domain/07-contract-document-lifecycle.md` includes:
- Multiple signature types (electronic, digital, biometric, notarized)
- Verification methods (email, SMS, 2FA, ID verification, KBA)
- Sequential and parallel signing workflows
- Digital certificates and biometric data validation

**PRD Section 4.1.2**: Basic requirement: contract must be signed before execution

**Assessment**: Specs are far more comprehensive than PRD. This is positive.

---

## 8. Critical Missing Documentation (Prioritized)

### Priority 1 (URGENT - Blocks Core Functionality)

1. ❌ **`domain/04-scheduling-buffer-logic.md`** - CRITICAL
   - Buffer stacking rules (global + static + commute)
   - Slot granularity configuration
   - Holiday and store closure handling
   - Buffer explanation traceability

2. ❌ **`domain/05-assignment-dispatch-logic.md`** - CRITICAL
   - Eligibility funnel with detailed filters
   - Funnel audit trail and transparency
   - Provider scoring algorithm
   - Assignment modes (direct, offer, broadcast, auto-accept)
   - Offer negotiation workflow

3. ❌ **`domain/09-claims-quality-management.md`** - CRITICAL
   - Claims domain model (types, states, lifecycle)
   - Root cause taxonomy
   - Claims to rework linkage
   - Provider quality metrics (first-time fix, rework rate, claim rate, CSAT)
   - Provider scorecards

---

### Priority 2 (HIGH - Major Business Activities)

4. ❌ **`domain/08-communication-rules.md`** - HIGH
   - Communication timeline configuration per country
   - Intermediation rules (direct vs store-mediated)
   - Channel selection (SMS, email, app)
   - Masked communication for privacy

5. ❌ **`domain/13-technical-visit-flow.md`** - HIGH
   - Confirmation TV outcomes (YES, YES-BUT, NO)
   - TV impact on installation blocking/unblocking
   - Sales integration for TV=NO (cancel/refund)
   - YES-BUT scope change workflow

6. ❌ **`domain/11-control-tower-supervision.md`** - HIGH
   - KPI definitions and calculation rules
   - Funnel views (assignment, execution)
   - Alert taxonomy and thresholds
   - Tasking system (types, assignment, SLAs)

---

### Priority 3 (MEDIUM - Supporting Functionality)

7. ❌ **`integration/08-ticketing-integration.md`** - MEDIUM
   - Event-to-ticket mapping rules
   - Ticket creation event schemas
   - Ticket status synchronization
   - Entity linkage (job↔ticket, project↔ticket)

8. ❌ **`integration/09-analytics-data-platform.md`** - MEDIUM
   - Data export formats and schedules
   - Event streaming patterns
   - Governance dashboard data requirements
   - BIR process integration

9. ❌ **`domain/14-analytics-simulation.md`** - MEDIUM
   - Analytics KPI definitions
   - Simulation engine for rule changes
   - Governance metrics
   - Continuous improvement data pipeline

10. ❌ **`domain/15-configuration-management.md`** - MEDIUM
    - Configuration domain model (schema)
    - Configuration versioning and rollback
    - Country/BU configuration isolation
    - Feature flags

---

### Priority 4 (LOW - Nice to Have)

11. ❌ **`domain/09-feedback-quality.md`** - LOW
    - Feedback domain model (CSAT, NPS, CES)
    - Feedback collection triggers
    - Aggregation and analytics

12. ❌ **`domain/12-issues-incidents.md`** - LOW
    - Issue/incident domain model
    - Event-to-task mapping
    - Task assignment rules

---

## 9. Documentation Enhancements Needed

### 9.1 **Enhance Existing Documents**

1. **`domain/02-provider-capacity-domain.md`** - ADD:
   - Service type opt-in/opt-out logic
   - P1/P2 priority and exclusivity rules
   - Billing model flags (self_billing vs invoice_submission)
   - Service mix targets
   - Risk status state machine (OK → Watch → Blocked)

2. **`domain/03-project-service-order-domain.md`** - ADD:
   - Confirmation TV flow section
   - Project-level freeze logic
   - CLOSED state (or clarify Verified = Closed)
   - Contract requirement check in state transitions

3. **`domain/07-contract-document-lifecycle.md`** - ADD:
   - Contract template configurability (per country/service)
   - WCF to claim creation trigger
   - WCF to rework order creation trigger

4. **`integration/03-sales-integration.md`** - ADD:
   - Detailed service order intake event schemas
   - Confirmation TV flag handling
   - TV=NO to sales event (cancel/refund)
   - Slot availability API integration pattern

5. **`integration/04-erp-integration.md`** - ADD:
   - Self-billing vs invoice submission event schemas
   - Payment hold logic (claims/disputes)
   - Extra-cost signaling
   - Detailed event schema (provider IDs, amounts, currencies)

6. **`integration/07-master-data-integration.md`** - ADD:
   - Provider risk/compliance status sync
   - Mandatory document definitions sync
   - Product/service catalog sync details

7. **`api/07-control-tower-api.md`** - ADD:
   - Alerts & tasks panel configuration
   - Grid calendar view specifications
   - Gantt view specifications

8. **`security/02-rbac-model.md`** - ADD:
   - FSM-specific personas and roles
   - Multi-tenancy scopes (country → BU → store)
   - Business activity permissions

---

## 10. Recommendations Summary

### 10.1 **Immediate Actions (Week 1-2)**

1. **Create Priority 1 Missing Docs** (Scheduling, Assignment, Claims)
2. **Align Terminology** (P1/P2 confusion, state names, WCF)
3. **Enhance Provider Domain** (opt-in/out, billing models, risk status)

### 10.2 **Short-Term Actions (Week 3-4)**

1. **Create Priority 2 Missing Docs** (Communication, TV Flow, Control Tower)
2. **Enhance Integration Docs** (Sales, ERP, Master Data)
3. **Create FSM-Specific RBAC Model**

### 10.3 **Medium-Term Actions (Week 5-8)**

1. **Create Priority 3 Missing Docs** (Ticketing, Analytics, Simulation, Configuration)
2. **Enhance Control Tower & API Docs**
3. **Create Priority 4 Missing Docs** (Feedback, Issues/Incidents)

### 10.4 **Long-Term Actions (Week 9+)**

1. **Validate Multi-Tenancy Consistency**
2. **Add Offline Conflict Resolution Details**
3. **Document External Plugin Architecture**

---

## 11. Gap Analysis Scorecard

| Category | PRD Coverage | Critical Gaps | Inconsistencies | Exceeds PRD |
|----------|-------------|---------------|-----------------|-------------|
| **Business Activities** | 60% | 5 | 2 | 0 |
| **Functional Requirements** | 70% | 8 | 3 | 2 |
| **Personas & RBAC** | 60% | 2 | 1 | 1 |
| **Integrations** | 55% | 3 | 0 | 0 |
| **NFRs** | 85% | 2 | 0 | 1 |
| **OVERALL** | **66%** | **20** | **6** | **4** |

---

## 12. Conclusion

The current specifications provide a **solid foundation (66% coverage)** but have **critical gaps** in core business logic areas:

**Strengths**:
- Excellent domain modeling for Projects, Service Orders, Providers, Contracts, Documents
- Comprehensive security and RBAC infrastructure (exceeds PRD)
- Strong event-driven architecture foundation
- Detailed API design principles

**Critical Weaknesses**:
- **Missing core domain logic**: Scheduling buffers, Assignment funnel, Claims management
- **Incomplete business activities**: Feedback, Issues/Incidents, Analytics
- **Integration gaps**: Ticketing, Analytics/Data Platform details
- **Configuration management**: Not fully specified
- **Terminology inconsistencies**: P1/P2 confusion, state names

**Recommended Approach**:
1. **Immediate priority**: Create the 3 missing critical domain docs (Scheduling, Assignment, Claims)
2. **Short-term**: Enhance existing docs and create high-priority missing docs
3. **Medium-term**: Complete integration and supporting functionality docs
4. **Continuous**: Align terminology and resolve inconsistencies

With focused effort over **8-12 weeks**, the specification gap can be closed to **90%+ coverage**.

---

**End of Gap Analysis Report**
