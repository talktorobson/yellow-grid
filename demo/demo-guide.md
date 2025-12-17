# Yellow Grid Platform - Complete Demo Guide

**Version**: 4.0
**Last Updated**: 2025-12-02
**Live Demo URL**: https://135.181.96.93
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Portal Access & Login URLs](#2-portal-access--login-urls)
3. [User Credentials Matrix](#3-user-credentials-matrix)
4. [Complete Workflow Demonstrations](#4-complete-workflow-demonstrations)
5. [High-Level Test Scenarios (HLTs)](#5-high-level-test-scenarios-hlts)
6. [User Experience Walkthroughs](#6-user-experience-walkthroughs)
7. [Data Overview](#7-data-overview)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Quick Start

### 🚀 Fastest Way to Demo

1. Go to **https://135.181.96.93/login**
2. Select your portal (Control Tower, Provider, Seller, etc.)
3. Click a country flag for instant login
4. Password for ALL users: **`Admin123!`**

### Portal Selector

The main login page shows all available portals with branded experiences:

```
https://135.181.96.93/login
```

---

## 2. Portal Access & Login URLs

Each portal has its own **branded login page** with role-specific theming.

### Direct Portal Login URLs

| Portal | Login URL | Description |
|--------|-----------|-------------|
| 🏠 **Control Tower** | `/login/operator` | Service operations hub |
| 🏢 **Provider Portal** | `/login/provider` | Provider business management |
| 👤 **PSM Portal** | `/login/psm` | Provider success management |
| 🛒 **Seller Portal** | `/login/seller` | Retail sales enablement |
| 📚 **Catalog Manager** | `/login/catalog` | Service catalog administration |
| ⚙️ **Admin Portal** | `/login/admin` | Platform administration |
| 🔧 **Technician Portal** | `/login/technician` | Field service execution |

### Full URLs

| Portal | Full URL |
|--------|----------|
| Portal Selector | `https://135.181.96.93/login` |
| Control Tower | `https://135.181.96.93/login/operator` |
| Provider Portal | `https://135.181.96.93/login/provider` |
| PSM Portal | `https://135.181.96.93/login/psm` |
| Seller Portal | `https://135.181.96.93/login/seller` |
| Catalog Manager | `https://135.181.96.93/login/catalog` |
| Admin Portal | `https://135.181.96.93/login/admin` |
| Technician Portal | `https://135.181.96.93/login/technician` |

---

## 4. User Credentials Matrix

### 🔑 Universal Password

**ALL users share the same password:**

```
Admin123!
```

### Email Pattern

```
{role}.{country}@adeo.com
```

### Complete User Matrix

| Role | France 🇫🇷 | Spain 🇪🇸 | Italy 🇮🇹 | Portugal 🇵🇹 |
|------|------------|-----------|-----------|--------------|
| **Admin** | admin.fr@adeo.com | admin.es@adeo.com | admin.it@adeo.com | admin.pt@adeo.com |
| **Operator** | operator.fr@adeo.com | operator.es@adeo.com | operator.it@adeo.com | operator.pt@adeo.com |
| **PSM** | psm.fr@adeo.com | psm.es@adeo.com | psm.it@adeo.com | psm.pt@adeo.com |
| **Seller** | seller.fr@adeo.com | seller.es@adeo.com | seller.it@adeo.com | seller.pt@adeo.com |
| **Catalog** | catalog.fr@adeo.com | catalog.es@adeo.com | catalog.it@adeo.com | catalog.pt@adeo.com |
| **Provider** | provider.fr@adeo.com | provider.es@adeo.com | provider.it@adeo.com | provider.pt@adeo.com |
| **Work Team** | workteam.fr@adeo.com | workteam.es@adeo.com | workteam.it@adeo.com | workteam.pt@adeo.com |

### Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│                    YELLOW GRID DEMO CREDENTIALS                     │
├─────────────────────────────────────────────────────────────────────┤
│  Password (all users): Admin123!                                    │
│                                                                     │
│  Email format: {role}.{country}@store.test                           │
│                                                                     │
│  Roles: admin, operator, psm, seller, catalog, provider, workteam  │
│  Countries: fr, es, it, pt                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Examples:                                                          │
│    operator.fr@store.test  - French operator                         │
│    seller.es@store.test    - Spanish seller                          │
│    admin.it@store.test     - Italian admin                           │
│    provider.pt@store.test  - Portuguese provider                     │
└─────────────────────────────────────────────────────────────────────┘
```

### User Accounts Reference

| Email | Password | Role |
|-------|----------|------|
| operator@store.test | Admin123! | OPERATOR |
| admin.fr@store.test | Admin123! | ADMIN |
| seller.es@store.test | Admin123! | SELLER |
| provider.it@store.test | Admin123! | PROVIDER |

---

## 4. Complete Workflow Demonstrations

### 8.1 🔧 Technical Visit (TV) → Installation Flow

This is the **core business workflow** demonstrating how a customer purchase leads to service delivery.

#### Step-by-Step Demo

**Phase 1: Order Creation & Scheduling**

```
1. LOGIN
   → URL: https://135.181.96.93/login
   → Email: operator@adeo.com
   → Password: Admin123!

2. VIEW SERVICE ORDERS
   → Navigate to: /service-orders
   → Note: 60 demo orders pre-seeded (FR, ES, IT, PT)
   → Filter by: Status, Country, Service Type

3. SELECT A TV ORDER
   → Click on any order with type "CONFIRMATION_TV" or "QUOTATION_TV"
   → View order details: customer info, service type, scheduled date

4. CHECK CALENDAR
   → Navigate to: /calendar
   → Observe scheduled interventions across providers
   → Customer names visible (e.g., "Marie Dupont", "Jean-Pierre Martin")
```

**Phase 2: Assignment & Dispatch**

```
5. ASSIGN PROVIDER
   → From Service Order detail, click "Assign"
   → View candidate providers with:
     - Distance from customer
     - Availability
     - Skills match
     - Performance rating
   → Select provider → Confirm assignment

6. DISPATCH WORK TEAM
   → Order transitions: Scheduled → Assigned → Dispatched
   → Provider notified of new job
   → Work team receives mobile notification
```

**Phase 3: Execution & Completion**

```
7. FIELD EXECUTION (Mobile App)
   → Work team arrives at customer site
   → Check-in with GPS
   → Execute service checklist
   → Capture before/after photos
   → Customer signs WCF (Work Completion Form)
   → Check-out

8. POST-SERVICE
   → Order state: InProgress → Completed
   → WCF submitted and verified
   → Invoice generated
   → Customer evaluation request sent
```

#### TV Outcomes (Business Rules)

| Outcome | Definition | Next Step |
|---------|------------|-----------|
| **YES** | Customer confirms installation | Schedule Installation Order |
| **YES-BUT** | Customer confirms with changes | Create Quotation + Re-scope |
| **NO** | Customer declines | Cancel dependent orders |

---

### 8.2 📝 Quotation Workflow

Demonstrates the sales quotation process after a Technical Visit.

```
1. VIEW QUOTATION TV ORDERS
   → /service-orders → Filter: serviceType = QUOTATION_TV
   → Select completed TV order

2. REVIEW TV REPORT
   → Seller Portal: /seller/reports
   → View technical findings
   → Assess additional work needed

3. CREATE QUOTATION
   → /seller/quotations
   → Add line items from TV recommendations
   → Apply pricing rules
   → Generate customer quotation

4. QUOTATION LIFECYCLE
   → DRAFT → SENT → VIEWED → ACCEPTED/DECLINED
   → If accepted: Convert to Installation Order
```

#### Quotation Flow Diagram

```
┌─────────────────┐      ┌──────────────┐      ┌───────────────┐
│  Technical      │ ───▶ │   Create     │ ───▶ │   Customer    │
│  Visit Report   │      │   Quotation  │      │   Review      │
└─────────────────┘      └──────────────┘      └───────────────┘
                                                      │
                              ┌────────────────┬──────┴─────────┐
                              ▼                ▼                ▼
                        ┌─────────┐      ┌─────────┐      ┌──────────┐
                        │ Accept  │      │ Decline │      │ Negotiate│
                        └────┬────┘      └─────────┘      └────┬─────┘
                             │                                  │
                             ▼                                  │
                    ┌─────────────────┐                         │
                    │   Installation  │◀────────────────────────┘
                    │      Order      │
                    └─────────────────┘
```

---

### 8.3 🔨 Installation Workflow

Complete installation service delivery.

```
1. INSTALLATION ORDER PREREQUISITES
   → Pre-service contract signed (e-signature)
   → Products delivered to customer
   → Customer confirmation received

2. SCHEDULING
   → /calendar → View provider availability
   → Match required skills to available teams
   → Apply buffer logic for:
     - Delivery time (48h buffer)
     - TV completion (24h buffer)

3. EXECUTION
   → Check-in at customer site
   → Complete installation checklist:
     ✓ Verify product condition
     ✓ Site preparation
     ✓ Installation steps (service-specific)
     ✓ Testing & verification
     ✓ Customer walkthrough
     ✓ Documentation

4. POST-INSTALLATION
   → WCF completion and signature
   → Before/after photos uploaded
   → Customer evaluation
   → Warranty period begins (typically 2 years)
```

---

### 8.4 🛠️ Maintenance/Rework Workflow

Handle post-installation issues and maintenance requests.

```
1. ISSUE IDENTIFICATION
   → Customer reports issue via:
     - Customer Portal
     - Store contact
     - Phone call → Operator creates ticket

2. CREATE MAINTENANCE ORDER
   → /service-orders → New Maintenance Order
   → Link to original installation
   → Define issue scope

3. DISPATCH & RESOLUTION
   → Prioritize based on:
     - Warranty status
     - Issue severity
     - Customer impact
   → Assign qualified technician
   → Execute repair/maintenance

4. CLOSE & DOCUMENT
   → Document resolution
   → Update warranty records
   → Customer sign-off
```

---

### 8.5 📄 Contract Lifecycle Workflow

Demonstrates e-signature and contract management.

```
1. PRE-SERVICE CONTRACT
   → /service-orders/:id → Contracts tab
   → View contract template (Adobe Sign integration)
   → Send for customer signature
   → Track: PENDING → SENT → SIGNED

2. WORK COMPLETION FORM (WCF)
   → Post-service document
   → Technician fills completion details
   → Customer reviews and signs on-site
   → WCF states: DRAFT → PENDING_SIGNATURE → SIGNED → VERIFIED

3. CONTRACT VERIFICATION
   → Operator reviews completed WCF
   → Verify work quality
   → Approve or request corrections
```

---

## 5. High-Level Test Scenarios (HLTs)

### HLT-001: Complete Service Order Lifecycle

**Objective**: Verify full order flow from creation to completion

| Step | Action | Expected Result | Verification |
|------|--------|-----------------|--------------|
| 1 | Login as Operator | Dashboard displays | ✅ |
| 2 | Navigate to Service Orders | List of 60 orders shown | ✅ |
| 3 | Select order, view details | Customer info, service type visible | ✅ |
| 4 | Check calendar | Scheduled slots display correctly | ✅ |
| 5 | View provider list | Providers with ratings shown | ✅ |

**Demo Steps**:
```
1. https://135.181.96.93/login → operator@adeo.com / Admin123!
2. Click "Service Orders" in sidebar
3. Verify 60 orders displayed with customer names
4. Click on order "ORD-FR-001" (or any)
5. Navigate to Calendar → verify display
```

---

### HLT-002: Provider Management

**Objective**: Verify provider data and capabilities

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /providers | Provider list displayed |
| 2 | View provider details | Company info, work teams visible |
| 3 | Check provider calendar | Availability shown |
| 4 | View performance metrics | KPIs displayed |

**Demo Steps**:
```
1. Navigate to /providers
2. Click "View Details" on "Services Pro Paris"
3. Review: address, contact, work teams, specialties
4. Check calendar tab for availability
```

---

### HLT-003: Calendar & Scheduling

**Objective**: Verify calendar functionality

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /calendar | Calendar view loads |
| 2 | View different modes | Day/Week/Month views work |
| 3 | Click on event | Order details shown |
| 4 | Filter by provider | View updates correctly |

**Demo Steps**:
```
1. Navigate to /calendar
2. Toggle between Day/Week/Month views
3. Click on scheduled intervention
4. Verify customer name and order info
```

---

### HLT-004: Assignment Management

**Objective**: Verify assignment workflow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /assignments | Assignment list loads |
| 2 | View assignment details | Provider and order info visible |
| 3 | Check assignment states | PENDING/CONFIRMED/DECLINED shown |

---

### HLT-005: Multi-Country Support

**Objective**: Verify multi-tenant data isolation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin-fr@adeo.com | French data displayed |
| 2 | View service orders | French customers visible |
| 3 | Login as admin-es@adeo.com | Spanish data displayed |
| 4 | Verify data isolation | Only country-specific data shown |

**Demo Steps**:
```
1. Login: admin-fr@adeo.com / Admin123!
2. View orders → French customers (Marie Dupont, etc.)
3. Logout, login: admin-es@adeo.com / Admin123!
4. View orders → Spanish customers (Carlos García, etc.)
```

---

### HLT-006: Task Management

**Objective**: Verify task queue functionality

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /tasks | Task list loads |
| 2 | Filter by priority | Tasks filtered correctly |
| 3 | View task details | Full information displayed |

---

### HLT-007: Analytics & Reporting

**Objective**: Verify analytics dashboards

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /analytics | Dashboard loads |
| 2 | View KPIs | Metrics displayed |
| 3 | Navigate to /performance | Performance metrics shown |

---

### HLT-008: Admin Portal

**Objective**: Verify administrative functions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin | Admin portal accessible |
| 2 | Navigate to /admin/users | User list displayed |
| 3 | Navigate to /admin/roles | Role management available |
| 4 | Navigate to /admin/audit | Audit log visible |

**Demo Steps**:
```
1. Login: admin-fr@adeo.com / Admin123!
2. Navigate to /admin/dashboard
3. Click "Users" → view user list
4. Click "Roles" → view role definitions
5. Click "Audit Log" → view system activity
```

---

## 6. User Experience Walkthroughs

### 8.1 🏠 Operator Cockpit (Control Tower)

**Access**: Login as `operator@adeo.com`

**Tour**:
```
Dashboard (/dashboard)
├── KPI Cards
│   ├── Active Orders
│   ├── Today's Interventions
│   ├── Pending Contracts
│   └── Critical Issues
│
├── Recent Activity Feed
│
└── Quick Actions
    ├── View Calendar
    ├── Manage Assignments
    └── Process Tasks
```

**Key Pages**:

| Page | Route | Actions |
|------|-------|---------|
| Dashboard | `/dashboard` | Overview, KPIs, quick actions |
| Service Orders | `/service-orders` | List, filter, search, view details |
| Calendar | `/calendar` | Visual scheduling, drag-drop |
| Providers | `/providers` | Provider list, details, teams |
| Assignments | `/assignments` | Assignment management |
| Tasks | `/tasks` | Task queue, prioritization |
| Analytics | `/analytics` | Performance dashboards |

---

### 8.2 🏢 Provider Portal

**Access**: Navigate to `/provider/dashboard` (Provider role required)

**Tour**:
```
Provider Dashboard (/provider/dashboard)
├── Job Statistics
│   ├── Pending Jobs
│   ├── In Progress
│   └── Completed This Month
│
├── Recent Jobs Feed
│
└── Quick Links
    ├── Calendar
    ├── Teams
    └── Financial
```

**Key Pages**:

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/provider/dashboard` | KPIs, recent jobs |
| Jobs | `/provider/jobs` | All jobs, accept/decline |
| Calendar | `/provider/calendar` | Team scheduling |
| Teams | `/provider/teams` | Work team management |
| Financial | `/provider/financial` | Invoices, payments |
| Performance | `/provider/performance` | Ratings, metrics |
| Messages | `/provider/messages` | Communication center |
| Settings | `/provider/settings` | Company profile |

---

### 8.3 👤 PSM Portal (Provider Success Manager)

**Access**: Navigate to `/psm/dashboard`

**Tour**:
```
PSM Dashboard (/psm/dashboard)
├── Provider Pipeline
│   ├── New Leads
│   ├── In Onboarding
│   └── Active Providers
│
├── Coverage Map
│
└── Verification Queue
```

**Key Pages**:

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/psm/dashboard` | Overview, KPIs |
| Pipeline | `/psm/pipeline` | Provider onboarding funnel |
| Providers | `/psm/providers` | Provider list, status |
| Coverage | `/psm/coverage` | Geographic coverage map |
| Verification | `/psm/verification` | Document verification |

---

### 8.4 🛒 Seller Portal

**Access**: Navigate to `/seller/dashboard`

**Tour**:
```
Seller Dashboard (/seller/dashboard)
├── Pending Tasks
│   ├── TV Reports to Review
│   ├── Quotations Draft
│   └── Customer Follow-ups
│
├── Availability Checker
│
└── Quotation Pipeline
```

**Key Pages**:

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/seller/dashboard` | Sales overview |
| Availability | `/seller/availability` | Check slot availability |
| Projects | `/seller/projects` | Customer projects |
| Reports | `/seller/reports` | TV reports review |
| Quotations | `/seller/quotations` | Quote creation/management |

---

### 8.5 ⚙️ Admin Portal

**Access**: Login as `admin-fr@adeo.com`

**Tour**:
```
Admin Dashboard (/admin/dashboard)
├── System Health
│   ├── API Status
│   ├── Active Users
│   └── Recent Errors
│
├── User Management
│
└── Configuration
```

**Key Pages**:

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/admin/dashboard` | System overview |
| Users | `/admin/users` | User management |
| Roles | `/admin/roles` | Role/permission config |
| Config | `/admin/config` | System settings |
| Audit | `/admin/audit` | Audit log viewer |

---

### 8.6 📚 Catalog (Offer Manager)

**Access**: Navigate to `/catalog/services`

**Tour**:
```
Service Catalog (/catalog/services)
├── Service List
│   ├── HVAC Services
│   ├── Plumbing Services
│   ├── Kitchen Services
│   └── ...
│
├── Pricing Rules
│
└── Checklists
```

**Key Pages**:

| Page | Route | Purpose |
|------|-------|---------|
| Services | `/catalog/services` | Service catalog |
| Service Detail | `/catalog/services/:id` | Service configuration |
| Pricing | `/catalog/pricing` | Pricing management |
| Checklists | `/catalog/checklists` | Service checklists |

---

### 8.7 👥 Customer Portal

**Access**: Token-based (simulated via `/customer/:token`)

**Note**: Customer portal uses deep-link authentication. In production, customers receive a unique link via SMS/email.

**Tour**:
```
Customer Service View (/customer/:token)
├── Service Status Timeline
│   ├── Order Created
│   ├── Scheduled
│   ├── Provider Assigned
│   └── Current Status
│
├── Appointment Details
│   ├── Date & Time
│   ├── Provider Info
│   └── Contact Options
│
├── Documents
│   ├── Contract (sign)
│   ├── Photos (view)
│   └── WCF (sign)
│
└── Actions
    ├── Request Reschedule
    ├── Contact Support
    └── Rate Service
```

---

## 7. Data Overview

### 8.1 Demo Data Summary

| Entity | Count | Notes |
|--------|-------|-------|
| **Countries** | 5 | FR, ES, IT, PT, PL |
| **Stores** | 10 | Leroy Merlin locations |
| **Providers** | 12+ | Multi-country providers |
| **Service Orders** | 60 | Pre-seeded with realistic data |
| **Users** | 5 | Admin (4 countries) + Operator |
| **Services** | 7+ | HVAC, Plumbing, Kitchen, etc. |

### 8.2 Sample Customers (French Data)

| Customer | City | Sample Order |
|----------|------|--------------|
| Marie Dupont | Paris | ORD-FR-001 |
| Jean-Pierre Martin | Lyon | ORD-FR-002 |
| Sophie Bernard | Bordeaux | ORD-FR-003 |
| Pierre Durand | Marseille | ORD-FR-004 |
| Isabelle Moreau | Nice | ORD-FR-005 |
| François Leroy | Toulouse | ORD-FR-006 |
| Nathalie Petit | Nantes | ORD-FR-007 |
| Laurent Roux | Paris | ORD-FR-008 |

### 8.3 Sample Providers (French Data)

| Provider | City | Specialties |
|----------|------|-------------|
| Services Pro Paris | Paris | HVAC, Electrical |
| TechniService Marseille | Marseille | Plumbing, HVAC |
| InstallPlus Lyon | Lyon | Kitchen, Bathroom |
| ProHabitat Bordeaux | Bordeaux | Full service |

### 8.4 Service Types

| Type | Code | Description |
|------|------|-------------|
| Installation | `INSTALLATION` | Standard product installation |
| Confirmation TV | `CONFIRMATION_TV` | Technical visit to confirm scope |
| Quotation TV | `QUOTATION_TV` | Technical visit for quotation |
| Maintenance | `MAINTENANCE` | Post-installation maintenance |
| Rework | `REWORK` | Correction of previous work |
| Complex | `COMPLEX` | Multi-day complex installations |

### 8.5 Service Order States

```
Created → Scheduled → Assigned → Dispatched → InProgress → Completed → Verified
                                                    ↓
                                                 OnHold
                                                    ↓
                                              (Resume/Cancel)
```

| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| `Created` | Initial state | → Scheduled, Cancelled |
| `Scheduled` | Time slot allocated | → Assigned, Cancelled |
| `Assigned` | Provider matched | → Dispatched, Scheduled, Cancelled |
| `Dispatched` | Provider confirmed | → InProgress, Assigned, Cancelled* |
| `InProgress` | Work started | → Completed, OnHold, Cancelled* |
| `OnHold` | Temporarily suspended | → InProgress, Cancelled |
| `Completed` | Work finished | → Verified |
| `Verified` | Quality verified | (Terminal) |
| `Cancelled` | Order cancelled | (Terminal) |

*Requires manager approval

---

## 8. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Cannot login | Check credentials: operator@adeo.com / Admin123! |
| Page not loading | Try hard refresh: Ctrl+F5 or Cmd+Shift+R |
| No data displayed | Wait for data load, check network tab |
| 404 errors | Ensure correct URL, check browser console |
| SSL certificate warning | Click "Advanced" → "Proceed" (demo uses self-signed cert) |

### Demo Reset

If demo data becomes corrupted, contact admin to re-seed:

```bash
# On server
./deploy/reset-demo.sh
```

### Browser Requirements

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

### Support

For demo issues, check:
1. Browser console for JavaScript errors
2. Network tab for API failures
3. Verify you're using the correct credentials

---

## Appendix A: API Endpoints Reference

For developers testing API integrations:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/login` | POST | Authentication |
| `/api/v1/auth/me` | GET | Current user info |
| `/api/v1/service-orders` | GET | List service orders |
| `/api/v1/service-orders/:id` | GET | Order details |
| `/api/v1/providers` | GET | List providers |
| `/api/v1/providers/:id` | GET | Provider details |
| `/api/v1/assignments` | GET | List assignments |
| `/api/v1/dashboard/stats` | GET | Dashboard KPIs |

---

## Appendix B: E2E Test Coverage

The platform includes 126 automated E2E tests:

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| Dashboard | 5 | Page load, stats, navigation |
| Service Orders | 8 | List, filter, details |
| Providers | 8 | List, details, CRUD |
| Calendar | 5 | Views, interactions |
| Assignments | 4 | List, management |
| Navigation | 48 | All portal routes |
| API Endpoints | 15 | Core API tests |
| Responsive | 6 | Mobile/tablet/desktop |
| Performance | 8 | Load times |

Run E2E tests:
```bash
node e2e-tests.cjs
node e2e-navigation-tests.cjs
```

---

## Appendix C: Quick Demo Script (5 minutes)

For quick stakeholder demonstrations:

```
MINUTE 1: Login & Dashboard
- https://135.181.96.93
- Login: operator@adeo.com / Admin123!
- Show dashboard KPIs

MINUTE 2: Service Orders
- Navigate to /service-orders
- Show 60 orders with French customers
- Click on order, show details

MINUTE 3: Calendar View
- Navigate to /calendar
- Show week view with scheduled interventions
- Highlight customer names

MINUTE 4: Provider Management
- Navigate to /providers
- Click "View Details" on a provider
- Show work teams, specialties

MINUTE 5: Multi-Country
- Navigate to /admin/dashboard
- Show system overview
- Mention ES, IT, PT data availability
```

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.0 | 2025-12-02 | Platform Team | Complete rewrite with HLTs and workflows |
| 2.0 | 2025-11-27 | Platform Team | Added multi-experience portals |
| 1.0 | 2025-11-15 | Platform Team | Initial demo guide |

---

**End of Demo Guide**
