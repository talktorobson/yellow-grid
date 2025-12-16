# Yellow Grid Platform - User Experience Architecture

**Version**: 2.0
**Date**: 2025-12-02
**Status**: ✅ Phase 5 Complete - All Portals Implemented
**Author**: Platform Architecture Team

**Live Demo**: <https://135.181.96.93>

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Persona Matrix](#user-persona-matrix)
3. [Experience Architecture Overview](#experience-architecture-overview)
4. [Detailed User Journeys](#detailed-user-journeys)
5. [Current State Gap Analysis](#current-state-gap-analysis)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Technical Architecture](#technical-architecture)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

Yellow Grid is a Field Service Management (FSM) platform connecting retailers, service providers, and customers. This document defines the **8 distinct user experiences** required to support the complete ecosystem.

### The Ecosystem at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          YELLOW GRID ECOSYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐                  │
│  │   RETAILER    │     │   YELLOW GRID │     │   PROVIDER    │                  │
│  │  (Leroy M.)   │────▶│   PLATFORM    │◀────│    (SME)      │                  │
│  └───────────────┘     └───────────────┘     └───────────────┘                  │
│         │                      │                      │                          │
│         │                      │                      │                          │
│  ┌──────▼──────┐        ┌─────▼─────┐         ┌─────▼─────┐                     │
│  │   Seller    │        │  Operator │         │Work Team  │                     │
│  │   Portal    │        │  Cockpit  │         │Mobile App │                     │
│  └─────────────┘        └───────────┘         └───────────┘                     │
│         │                      │                      │                          │
│         └──────────────────────┼──────────────────────┘                          │
│                                │                                                 │
│                         ┌──────▼──────┐                                          │
│                         │  Customer   │                                          │
│                         │   Portal    │                                          │
│                         └─────────────┘                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### User Categories

| # | User Type | Platform | Primary Function | Estimated Daily Users |
|---|-----------|----------|-----------------|----------------------|
| 1 | PSM | Web | Recruit & onboard providers | 5-20 |
| 2 | Provider | Web + Mobile | Manage business & operations | 100-500 |
| 3 | Work Team | Mobile | Execute field services | 500-2000 |
| 4 | Customer | Web Portal | Track & interact with service | 1000-5000 |
| 5 | Service Operator | Web | Control tower operations | 50-200 |
| 6 | Seller | Web | Availability & quote management | 200-1000 |
| 7 | Offer Manager | Web | Service catalog management | 5-20 |
| 8 | Admin | Web | Platform administration | 2-10 |

---

## User Persona Matrix

### 1. PSM (Provider Success Manager)

**Mission**: Recruit, qualify, and onboard service providers to ensure platform coverage.

**Key Activities**:
- Identify potential providers in underserved areas
- Manage provider application pipeline
- Verify provider credentials and documents
- Set up provider competencies and zones
- Track provider onboarding progress
- Monitor recruited provider performance

**Experience Type**: CRM-like pipeline management

**Primary Workflows**:
```
1. RECRUITMENT PIPELINE
   Lead Discovery → First Contact → Qualification Call → 
   Application Sent → Documents Received → Verification → 
   Competence Setup → Zone Setup → Contract → Training → Go Live

2. PROVIDER HEALTH MONITORING
   Dashboard → Provider List → Provider Detail → 
   Performance Metrics → Issues → Actions

3. COVERAGE MANAGEMENT
   Geographic Gaps → Provider Search → Assignment → 
   Capacity Check → Approval
```

**Key Screens**:
- PSM Dashboard (KPIs: leads, pipeline, activated providers)
- Provider Pipeline Board (Kanban)
- Lead/Provider Detail
- Document Verification Center
- Geographic Coverage Map
- Provider Performance Dashboard

---

### 2. Provider (Company/SME)

**Mission**: Manage service business and receive/execute jobs through Yellow Grid.

**Two Distinct Experiences**:

#### 2A. Provider Onboarding Portal (Prospect)

**Key Activities**:
- Complete company registration
- Upload required documents
- Declare competencies and certifications
- Set up work teams
- Define service areas
- Configure availability
- Review and sign contract

**Experience Type**: Guided wizard + document portal

**Primary Workflows**:
```
1. REGISTRATION
   Invitation/Self-Apply → Company Info → 
   Legal Documents → Insurance → Competencies → 
   Work Teams → Coverage Zones → Schedule → 
   Contract Review → E-Signature → Pending Approval → Active

2. DOCUMENT MANAGEMENT
   Required Documents List → Upload → 
   Verification Status → Expiry Alerts
```

**Key Screens**:
- Registration Wizard (multi-step)
- Document Upload Center
- Competency Declaration
- Work Team Setup
- Zone Selection Map
- Schedule Configuration
- Contract Review & Signature

#### 2B. Provider Cockpit (Active Provider)

**Key Activities**:
- Monitor incoming job offers
- Accept/decline assignments
- Manage work team schedules
- Track revenue and payments
- Handle invoicing and WCF
- View performance metrics
- Manage absences and availability

**Experience Type**: Business dashboard + operations center

**Primary Workflows**:
```
1. JOB MANAGEMENT
   Dashboard → New Jobs → Job Detail → Accept/Decline → 
   Assign Work Team → Confirm Schedule

2. FINANCIAL TRACKING
   Financial Dashboard → Pending Invoices → 
   WCF Status → Payment Status → Generate Invoice

3. TEAM MANAGEMENT
   Work Teams → Calendar → Absences → 
   Certifications → Performance

4. CAPACITY MANAGEMENT
   Calendar → Availability → Zone Adjustments → 
   Special Days
```

**Key Screens**:
- Provider Dashboard (jobs, revenue, ratings)
- Job Pipeline (incoming, assigned, in-progress, completed)
- Job Detail View
- Financial Center (invoices, payments, WCF)
- Work Team Management
- Calendar & Availability
- Performance Analytics
- Settings & Profile

---

### 3. Work Team (Field Technician)

**Mission**: Execute services efficiently and document work quality.

**Platform**: Mobile App ONLY

**Key Activities**:
- View daily agenda
- Navigate to job sites
- Check-in/check-out
- Document work (photos, notes)
- Complete service checklists
- Submit technical reports
- Capture customer signatures
- Submit WCF

**Experience Type**: Task-focused mobile app

**Primary Workflows**:
```
1. DAILY WORK
   Login → Today's Jobs → Job Detail → Navigate → 
   Check-In → Execute → Document → Checklist → 
   Customer Sign → Check-Out → Submit

2. JOB EXECUTION
   Arrive → Photos Before → Service Tasks → 
   Photos After → Notes → Checklist → WCF → Signature

3. COMMUNICATION
   Notifications → Messages → Contact Customer → 
   Contact Operator
```

**Key Screens**:
- Today's Agenda
- Job Detail
- Navigation Integration
- Check-in/Check-out
- Photo Capture
- Service Checklist
- Notes & Report
- WCF Form
- Signature Pad
- Notification Center

---

### 4. Customer Portal

**Mission**: Track service progress and interact with service delivery.

**Platform**: Web Portal (Deep-link authenticated)

**Access**: Email/SMS/WhatsApp with authenticated deep-link

**Key Activities**:
- Track service status
- View scheduled dates
- Request reschedule
- Sign contract
- Confirm product delivery
- View service photos
- Chat with provider/operator
- Report issues/incidents
- Sign WCF
- Evaluate service

**Experience Type**: Self-service portal

**Primary Workflows**:
```
1. PRE-SERVICE
   Access Portal → View Status → Confirm Details → 
   Sign Contract → Confirm Product Arrived

2. SERVICE DAY
   View Schedule → Track Technician → 
   View Updates → Receive Notifications

3. POST-SERVICE
   View Photos → Review Work → Sign WCF → 
   Evaluate Service → Access Documents

4. ISSUE MANAGEMENT
   Report Issue → Track Resolution → 
   Communicate → Resolution Confirmation
```

**Key Screens**:
- Service Status Timeline
- Schedule View
- Reschedule Request
- Contract Signature
- Product Delivery Confirmation
- Photo Gallery
- Chat Interface
- Issue Report Form
- WCF Signature
- Service Evaluation

---

### 5. Service Operator (Control Tower)

**Mission**: Orchestrate operations, resolve exceptions, ensure SLA compliance.

**Platform**: Web (Operator Cockpit)

**Status**: ✅ MOSTLY BUILT (current web app)

**Key Activities**:
- Monitor all service orders
- Handle exceptions and escalations
- Manage assignments
- Mediate provider-customer issues
- Process WCF approvals
- Track KPIs and SLAs
- Manage task queues

**Experience Type**: Control center dashboard

**Primary Workflows**:
```
1. DAILY OPERATIONS
   Dashboard → Critical Actions → Exceptions → 
   Resolution → Next

2. SERVICE ORDER MANAGEMENT
   Service Orders List → Filters → Detail → 
   Actions (Assign, Reschedule, Cancel) → Status Update

3. EXCEPTION HANDLING
   Alerts → Issue Detail → Investigation → 
   Customer Contact → Provider Contact → Resolution

4. PERFORMANCE MONITORING
   Analytics → KPIs → Trends → Drill-down → 
   Action Items
```

**Key Screens**:
- ✅ Control Tower Dashboard (KPIs, critical actions)
- ✅ Operations Grid (provider/day matrix)
- ✅ Service Orders List & Detail
- ✅ Assignment Management
- ✅ Calendar View
- ✅ Provider Management
- ✅ Task Management
- ✅ Analytics Dashboard
- 🔄 AI Chat Assistant
- 🔄 Communication Hub

---

### 6. Seller (Retail Sales Staff)

**Mission**: Check availability, sell services, and manage quotation workflow.

**Platform**: Web

**Key Activities**:
- Check provider availability
- Reserve time slots
- View customer project status
- Access technical visit reports
- Create quotations from TV reports
- Track quotation status
- Communicate with customers/providers

**Experience Type**: Sales enablement portal

**Primary Workflows**:
```
1. AVAILABILITY CHECK
   Enter Details (Date, Zone, Service) → 
   View Available Slots → Reserve → Confirm

2. PROJECT TRACKING
   Customer Search → Project List → Project Detail → 
   Service Orders → Status

3. QUOTATION WORKFLOW
   TV Reports Queue → Review Report → 
   Create Quotation → Send to Customer → 
   Track Response → Convert to Sale

4. COMMUNICATION
   Customer Messages → Provider Messages → 
   Response → Follow-up
```

**Key Screens**:
- Seller Dashboard (pending tasks, quotation pipeline)
- Availability Checker
- Customer Project View
- Technical Visit Reports
- Quotation Builder
- Quotation Pipeline
- Communication Center
- Task List

---

### 7. Offer Manager

**Mission**: Define and maintain the service catalog.

**Platform**: Web

**Key Activities**:
- Create service definitions
- Define skill requirements
- Configure checklists
- Set pricing and rates
- Manage service prerequisites
- Link services to departments
- Handle service lifecycle

**Experience Type**: Admin/catalog management

**Primary Workflows**:
```
1. SERVICE CREATION
   New Service → Basic Info → Requirements → 
   Checklist → Pricing → Prerequisites → 
   Department Link → Publish

2. SERVICE MAINTENANCE
   Service Catalog → Search → Edit → 
   Version → Publish

3. PRICING MANAGEMENT
   Pricing Rules → Geographic Variants → 
   Seasonal Adjustments → Approval
```

**Key Screens**:
- Service Catalog Dashboard
- Service Creation Wizard
- Checklist Builder
- Pricing Configuration
- Skill Requirements Editor
- Service Lifecycle Management
- Department Mapping
- Reporting & Analytics

---

### 8. Admin

**Mission**: Platform administration, user management, system configuration.

**Platform**: Web

**Key Activities**:
- Manage users and roles
- Configure permissions
- Monitor platform health
- Access comprehensive analytics
- Manage business unit configuration
- Audit and compliance

**Experience Type**: System administration

**Primary Workflows**:
```
1. USER MANAGEMENT
   Users List → Create/Edit → Role Assignment → 
   Permission Configuration → Save

2. SYSTEM CONFIGURATION
   Settings → Business Units → Countries → 
   Calendar Config → Save

3. MONITORING
   System Health → Logs → Alerts → 
   Resolution

4. ANALYTICS
   Platform Metrics → User Activity → 
   Business KPIs → Export
```

**Key Screens**:
- Admin Dashboard
- User Management
- Role & Permission Configuration
- Business Unit Configuration
- System Settings
- Audit Logs
- Platform Analytics
- Multi-tenant Management

---

## Current State Gap Analysis

### Legend
- ✅ Implemented
- 🔄 Partial
- ❌ Not Implemented

### Gap Analysis by User

| User | Experience | Current State | Gap |
|------|-----------|---------------|-----|
| **1. PSM** | | | |
| | Dashboard | ❌ | Full implementation needed |
| | Pipeline Board | ❌ | Kanban board for provider recruitment |
| | Document Verification | ❌ | Document review workflow |
| | Coverage Map | ❌ | Geographic gap visualization |
| **2A. Provider Onboarding** | | | |
| | Registration Wizard | ❌ | Multi-step onboarding |
| | Document Portal | ❌ | Secure document upload |
| | Contract Signature | 🔄 | E-signature integration exists |
| **2B. Provider Cockpit** | | | |
| | Dashboard | ❌ | Provider-specific view |
| | Job Management | ❌ | Accept/decline workflow |
| | Financial Center | ❌ | Invoice & payment tracking |
| | Calendar | 🔄 | Exists but operator-focused |
| **3. Work Team (Mobile)** | | | |
| | Today's Agenda | 🔄 | 50% - exists in mobile app |
| | Check-in/out | 🔄 | 50% - basic implementation |
| | Photo Capture | 🔄 | 50% - basic implementation |
| | Checklist | ❌ | Service completion checklist |
| | WCF Submission | ❌ | Mobile WCF form |
| **4. Customer Portal** | | | |
| | Full Portal | ❌ | Complete new development |
| | Deep-link Auth | ❌ | Token-based access |
| | Status Tracking | ❌ | Service timeline view |
| | Chat | ❌ | Customer communication |
| **5. Service Operator** | | | |
| | Dashboard | ✅ | Control Tower implemented |
| | Operations Grid | ✅ | Weekly grid view |
| | Service Orders | ✅ | CRUD + detail views |
| | Assignments | ✅ | Assignment management |
| | AI Assistant | 🔄 | Backend ready, UI partial |
| **6. Seller** | | | |
| | Dashboard | ❌ | Seller-specific view |
| | Availability Checker | ❌ | Slot search interface |
| | TV Reports | ❌ | Report viewer |
| | Quotation Builder | ❌ | Quote generation |
| **7. Offer Manager** | | | |
| | Service Catalog | 🔄 | Backend exists, no UI |
| | Checklist Builder | ❌ | No implementation |
| | Pricing Config | 🔄 | Backend partial |
| **8. Admin** | | | |
| | User Management | 🔄 | Basic CRUD exists |
| | Role Management | 🔄 | Backend complete |
| | System Config | ❌ | No admin UI |
| | Audit Logs | ❌ | Backend exists, no UI |

### Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Implemented | 5 | 12% |
| 🔄 Partial | 12 | 28% |
| ❌ Not Implemented | 25 | 60% |

---

## Implementation Roadmap

### Phase 1: Foundation & Role-Based Architecture (2 weeks)

**Goal**: Establish multi-experience architecture

**Deliverables**:
1. Role-based routing system
2. Experience-specific layouts
3. Unified authentication for all user types
4. Permission-based UI rendering

**Technical Work**:
- [ ] Update `App.tsx` with role-based routing
- [ ] Create experience-specific layouts (OperatorLayout, ProviderLayout, etc.)
- [ ] Extend AuthContext with experience detection
- [ ] Build permission-based component wrappers

### Phase 2: Customer Portal (3 weeks)

**Goal**: Launch customer self-service portal

**Priority**: HIGH (direct business impact)

**Deliverables**:
1. Deep-link authentication system
2. Service status timeline
3. Contract signature
4. Reschedule request
5. WCF signature
6. Service evaluation
7. Photo gallery
8. Basic chat

**Technical Work**:
- [ ] Customer authentication (token-based deep-links)
- [ ] New route: `/customer/:token`
- [ ] Status tracking components
- [ ] Signature capture (existing modal)
- [ ] Rating/review system

### Phase 3: Provider Experience (4 weeks)

**Goal**: Complete provider onboarding + active cockpit

**Priority**: HIGH (critical for platform growth)

**Deliverables**:
- **3A: Onboarding Portal (2 weeks)**
  1. Registration wizard
  2. Document upload system
  3. Competency selection
  4. Zone picker
  5. Schedule setup
  6. Contract signature

- **3B: Provider Cockpit (2 weeks)**
  1. Provider dashboard
  2. Job pipeline
  3. Financial center
  4. Team management
  5. Calendar (adapted)
  6. Performance metrics

### Phase 4: PSM Experience (2 weeks)

**Goal**: Provider recruitment and onboarding management

**Priority**: MEDIUM

**Deliverables**:
1. PSM dashboard
2. Provider pipeline board
3. Document verification center
4. Coverage gap map
5. Provider health monitoring

### Phase 5: Seller Portal (2 weeks)

**Goal**: Sales enablement for retail staff

**Priority**: MEDIUM

**Deliverables**:
1. Seller dashboard
2. Availability checker
3. Customer project view
4. TV report viewer
5. Quotation builder
6. Quotation pipeline

### Phase 6: Offer Manager Portal (1 week)

**Goal**: Service catalog administration

**Priority**: LOW (backend exists)

**Deliverables**:
1. Service catalog UI
2. Checklist builder
3. Pricing configuration
4. Service lifecycle management

### Phase 7: Admin Portal (1 week)

**Goal**: Platform administration

**Priority**: LOW (basic exists)

**Deliverables**:
1. Enhanced user management
2. Role/permission UI
3. System configuration
4. Audit log viewer
5. Analytics dashboard

### Phase 8: Mobile App Completion (4 weeks)

**Goal**: Complete work team mobile experience

**Priority**: HIGH (parallel with web)

**Deliverables**:
1. Complete check-in/out flow
2. Photo capture enhancement
3. Service checklist
4. WCF submission
5. Technical report
6. Notification system

---

## Timeline Summary

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Foundation | 2 weeks | Week 1 | Week 2 |
| Phase 2: Customer Portal | 3 weeks | Week 3 | Week 5 |
| Phase 3: Provider Experience | 4 weeks | Week 6 | Week 9 |
| Phase 4: PSM Experience | 2 weeks | Week 10 | Week 11 |
| Phase 5: Seller Portal | 2 weeks | Week 12 | Week 13 |
| Phase 6: Offer Manager | 1 week | Week 14 | Week 14 |
| Phase 7: Admin Portal | 1 week | Week 15 | Week 15 |
| Phase 8: Mobile Completion | 4 weeks | Week 1-8 | Parallel |

**Total Duration**: ~15 weeks (sequential web) + parallel mobile

---

## Technical Architecture

### Role-Based Routing Structure

```typescript
// App.tsx structure
<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/customer/:accessToken" element={<CustomerPortal />} />
  
  {/* Provider Onboarding (semi-public) */}
  <Route path="/provider/register" element={<ProviderRegistration />} />
  <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
  
  {/* Protected - Role-Based */}
  <Route element={<ProtectedRoute />}>
    {/* Operator Experience */}
    <Route path="/operator/*" element={<OperatorLayout />}>
      <Route index element={<Navigate to="dashboard" />} />
      <Route path="dashboard" element={<OperatorDashboard />} />
      <Route path="operations-grid" element={<OperationsGrid />} />
      <Route path="service-orders/*" element={<ServiceOrderRoutes />} />
      {/* ... */}
    </Route>
    
    {/* Provider Experience */}
    <Route path="/provider/*" element={<ProviderLayout />}>
      <Route index element={<Navigate to="dashboard" />} />
      <Route path="dashboard" element={<ProviderDashboard />} />
      <Route path="jobs/*" element={<JobRoutes />} />
      <Route path="financial" element={<FinancialCenter />} />
      <Route path="teams/*" element={<TeamRoutes />} />
      {/* ... */}
    </Route>
    
    {/* PSM Experience */}
    <Route path="/psm/*" element={<PSMLayout />}>
      <Route index element={<Navigate to="dashboard" />} />
      <Route path="dashboard" element={<PSMDashboard />} />
      <Route path="pipeline" element={<ProviderPipeline />} />
      <Route path="coverage" element={<CoverageMap />} />
      {/* ... */}
    </Route>
    
    {/* Seller Experience */}
    <Route path="/seller/*" element={<SellerLayout />}>
      <Route index element={<Navigate to="dashboard" />} />
      <Route path="availability" element={<AvailabilityChecker />} />
      <Route path="quotations" element={<QuotationPipeline />} />
      {/* ... */}
    </Route>
    
    {/* Offer Manager Experience */}
    <Route path="/catalog/*" element={<CatalogLayout />}>
      <Route index element={<Navigate to="services" />} />
      <Route path="services/*" element={<ServiceCatalogRoutes />} />
      {/* ... */}
    </Route>
    
    {/* Admin Experience */}
    <Route path="/admin/*" element={<AdminLayout />}>
      <Route index element={<Navigate to="dashboard" />} />
      <Route path="users/*" element={<UserManagementRoutes />} />
      <Route path="roles" element={<RoleManagement />} />
      <Route path="config" element={<SystemConfig />} />
      {/* ... */}
    </Route>
  </Route>
</Routes>
```

### Experience Layout Components

```
web/src/
├── layouts/
│   ├── OperatorLayout.tsx      # Control Tower
│   ├── ProviderLayout.tsx      # Provider Cockpit
│   ├── CustomerLayout.tsx      # Customer Portal
│   ├── PSMLayout.tsx           # PSM Dashboard
│   ├── SellerLayout.tsx        # Seller Portal
│   ├── CatalogLayout.tsx       # Offer Manager
│   └── AdminLayout.tsx         # Admin Portal
├── experiences/
│   ├── operator/               # Service Operator screens
│   ├── provider/               # Provider screens
│   ├── customer/               # Customer portal screens
│   ├── psm/                    # PSM screens
│   ├── seller/                 # Seller screens
│   ├── catalog/                # Offer Manager screens
│   └── admin/                  # Admin screens
└── components/
    └── shared/                 # Cross-experience components
```

### Backend API Alignment

Existing endpoints support most experiences:

| Experience | Primary API Modules |
|------------|-------------------|
| Operator | service-orders, providers, assignments, scheduling |
| Provider | providers, service-orders, execution, contracts |
| Customer | service-orders (limited), contracts, execution |
| PSM | providers, users |
| Seller | scheduling, service-orders, technical-visits |
| Offer Manager | service-catalog |
| Admin | users, config |

**New APIs Needed**:
- `POST /api/v1/customer/access-token` - Generate customer portal access
- `GET /api/v1/customer/:token/service-order` - Get service order for customer
- `POST /api/v1/provider/register` - Provider self-registration
- `GET /api/v1/seller/availability` - Availability search endpoint
- `POST /api/v1/seller/quotations` - Create quotation from TV

---

## Success Metrics

### Platform-Level KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Adoption Rate | >80% | Active users / Total users per role |
| Task Completion Rate | >90% | Completed tasks / Started tasks |
| Average Response Time | <2s | API + UI render time |
| User Satisfaction (CSAT) | >4.2/5 | Post-interaction surveys |
| Support Ticket Reduction | -50% | After portal launch |

### Experience-Specific Metrics

| Experience | KPI | Target |
|------------|-----|--------|
| Customer Portal | Self-service rate | >70% tasks without operator |
| Provider Cockpit | Job acceptance rate | >90% |
| Work Team Mobile | Check-in compliance | >95% |
| Seller Portal | Quote conversion | >40% |
| PSM | Time to provider activation | <14 days |
| Operator | Cases handled per hour | +30% with AI |

---

## Appendix A: Database Support

The current Prisma schema (70+ models) supports all experiences:

### Key Models by Experience

| Experience | Primary Models |
|------------|---------------|
| All | User, Role, Permission |
| Operator | ServiceOrder, Assignment, Task, Provider, WorkTeam |
| Provider | Provider, WorkTeam, Technician, Assignment, ServiceOrder |
| Customer | ServiceOrder, Contract, WorkCompletionForm |
| Work Team | ServiceOrder, Assignment, CheckInOut, Media |
| PSM | Provider, ProviderWorkingSchedule, InterventionZone |
| Seller | ServiceOrder, TechnicalVisit (new), Booking |
| Offer Manager | ServiceCatalog, ServicePricing, ServiceSkillRequirement |
| Admin | User, Role, Permission, SystemConfig |

---

## Appendix B: Component Reuse Matrix

| Component | Operator | Provider | Customer | PSM | Seller | Offer | Admin |
|-----------|----------|----------|----------|-----|--------|-------|-------|
| ServiceOrderCard | ✅ | ✅ | ✅ | - | ✅ | - | - |
| Calendar | ✅ | ✅ | - | - | ✅ | - | - |
| StatusBadge | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| KPICard | ✅ | ✅ | - | ✅ | ✅ | - | ✅ |
| DataTable | ✅ | ✅ | - | ✅ | ✅ | ✅ | ✅ |
| Timeline | ✅ | ✅ | ✅ | - | - | - | - |
| SignaturePad | ✅ | ✅ | ✅ | - | - | - | - |
| PhotoGallery | ✅ | ✅ | ✅ | - | - | - | - |
| Chat | ✅ | ✅ | ✅ | - | ✅ | - | - |
| MapView | ✅ | ✅ | - | ✅ | - | - | - |

---

## Next Steps

1. **Immediate**: Create Phase 1 foundation (role-based routing)
2. **Week 1-2**: Build shared layout components
3. **Week 3-5**: Launch Customer Portal MVP
4. **Week 6-9**: Complete Provider Experience
5. **Week 10+**: Iterate on remaining experiences

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-27 | Platform Team | Initial comprehensive design |
