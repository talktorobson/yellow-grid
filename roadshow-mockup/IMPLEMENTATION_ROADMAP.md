# Yellow Grid Roadshow Mockup - Implementation Roadmap

**Created**: 2025-11-16
**Current Status**: ~5% Complete (Infrastructure + Planning)
**Target**: Fully Functional Demo in 6-8 Weeks

---

## 📊 Executive Summary

### Current State
```
✅ COMPLETE (100%):
   - Prisma database schema (11 models, production-grade)
   - Docker Compose infrastructure (PostgreSQL, Redis, Adminer)
   - Comprehensive documentation (README with 5 demo scenarios)
   - Standalone HTML demo (2,571 lines)

⚠️ PARTIAL (30%):
   - NestJS backend skeleton (broken - imports non-existent modules)
   - Basic health endpoints

❌ NOT STARTED (0%):
   - Backend API implementation (auth, providers, service orders, assignments, executions)
   - Web frontend (Control Tower)
   - Mobile app
   - Seed data for demo scenarios
```

### What We're Building
A **fully functional demo** showcasing Yellow Grid's unique value propositions:

**🌟 PRIMARY DIFFERENTIATOR**: Assignment Transparency
- Complete funnel visibility (500 providers → 18 eligible → top 5 ranked)
- Detailed scoring breakdown with rationale
- Every filter stage explained
- Full audit trail

**Plus 4 Additional Demo Scenarios**:
1. Technical Visit Flow (TV → Installation dependency)
2. Multi-Country Operations (ES, FR, IT, PL with different rules)
3. Provider Mobile Experience (job lifecycle)
4. Control Tower Real-Time Visibility

---

## 🎯 Implementation Strategy

### Prioritization: Impact vs. Effort

```
P0 (CRITICAL - Must Have):
├── Assignment Transparency Backend ⭐ PRIMARY DIFFERENTIATOR
├── Assignment Transparency UI ⭐ SHOWCASE FEATURE
├── Service Orders CRUD
├── Basic Provider Management
├── Seed Data (5 scenarios)
└── Auth & Users

P1 (HIGH - Should Have):
├── Technical Visit Flow
├── Control Tower Dashboard
├── Provider List & Details
├── Multi-Country Selector
└── Basic Analytics

P2 (MEDIUM - Nice to Have):
├── Mobile App (or use HTML demo)
├── Calendar/Gantt View
├── Advanced Analytics
└── Real-time Updates (WebSockets)

P3 (LOW - Skip for Demo):
├── Kafka Events
├── Full RBAC
├── Advanced Caching
└── Performance Optimization
```

---

## 📅 6-Week Implementation Timeline

### **Week 1: Foundation & Backend Core** 🔧

**Days 1-2: Fix Broken Backend**
- [ ] Remove broken module imports from `app.module.ts`
- [ ] Create basic module structure (6 modules)
- [ ] Get app compiling and running
- [ ] Run Prisma migrations
- [ ] Verify health endpoints work

**Days 3-5: Core Modules - Part 1**
- [ ] **AuthModule**: Login, JWT, basic users (simplified, no PingID)
- [ ] **ProvidersModule**: Provider CRUD, work teams, zones
- [ ] **ServiceOrdersModule**: Create, read, update service orders

**Deliverable**: Backend compiles, API responds, database connected

---

### **Week 2: Assignment Transparency** ⭐ CRITICAL

**Days 1-3: Assignment Funnel Logic**
- [ ] Implement 6-stage filtering funnel:
  1. Geographic zone coverage
  2. Service type participation (P1/P2)
  3. Required certifications
  4. Risk status (OK/On Watch/Suspended)
  5. Capacity constraints (jobs, hours)
  6. Calendar availability
- [ ] Implement scoring algorithm (5 factors, weighted)
- [ ] Generate funnel audit trail (JSONB storage)

**Days 4-5: Assignment API Endpoints**
```typescript
POST   /api/v1/assignments/calculate-candidates  // Execute funnel
POST   /api/v1/assignments/create                // Create assignment
GET    /api/v1/assignments/:id/funnel            // Get transparency data
GET    /api/v1/assignments/:id/logs              // Get audit trail
POST   /api/v1/assignments/:id/accept            // Provider accepts
POST   /api/v1/assignments/:id/refuse            // Provider refuses
```

**Deliverable**: Assignment transparency backend fully functional

---

### **Week 3: Remaining Backend + Seed Data** 📊

**Days 1-2: Execution Module**
- [ ] Check-in/check-out endpoints
- [ ] Photo upload (S3 or local storage)
- [ ] Customer ratings
- [ ] Execution status tracking

**Days 3-5: Seed Data Creation**
- [ ] Create seeder script (`src/database/seeders/index.ts`)
- [ ] Seed demo users (operators, technicians)
- [ ] Seed providers & work teams (40+ providers across 4 countries)
- [ ] Seed service orders for 5 demo scenarios
- [ ] Seed assignments with transparency logs
- [ ] Seed executions (completed jobs)

**Demo Scenario Data**:
```
Scenario 1: Assignment Transparency (FR)
  - Customer: Jean Dupont, Paris
  - Service Order: Kitchen installation (P1)
  - Funnel: 47 providers → 12 zone-eligible → 5 certified → 3 available → 1 selected
  - Detailed scoring breakdown

Scenario 2: Technical Visit Flow (ES)
  - Customer: María González, Madrid
  - TV scheduled → YES-BUT outcome → Installation unblocked

Scenario 3: Multi-Country (Dashboard)
  - France: 234 orders
  - Spain: 156 orders
  - Italy: 98 orders
  - Poland: 67 orders

Scenario 4: Mobile Experience (IT)
  - Technician: Marco Rossi
  - 3 jobs today (1 completed, 1 in-progress, 1 scheduled)

Scenario 5: Control Tower Real-Time
  - Operator: Marie Dubois (FR)
  - 20+ orders visible in Gantt view
```

**Deliverable**: Backend complete with realistic demo data

---

### **Week 4-5: Web Frontend (Control Tower)** 🖥️

**Week 4: Core Pages**

**Day 1: Project Setup**
- [ ] Create React + Vite + TypeScript project
- [ ] Setup TailwindCSS
- [ ] Setup React Router
- [ ] Setup React Query (API state)
- [ ] Setup Recharts (analytics)
- [ ] Create API client

**Days 2-3: Core Pages**
- [ ] Login page
- [ ] Dashboard (KPIs, charts, recent activity)
- [ ] Service Orders List (table with filters)
- [ ] Service Order Details (full info + timeline)

**Days 4-5: Assignment Transparency UI** ⭐ KEY SHOWCASE
- [ ] Funnel visualization (stages with numbers)
- [ ] Filtered providers list with reasons
- [ ] Scoring breakdown (horizontal bar charts)
- [ ] Selected provider highlight
- [ ] Assignment logs/audit trail

**Week 5: Additional Pages**

**Days 1-2: Provider Management**
- [ ] Provider list with filters
- [ ] Provider details modal
- [ ] Work teams section
- [ ] Metrics cards (CSAT, first-time-fix)

**Days 3: Analytics Dashboard**
- [ ] Country comparison charts
- [ ] Provider performance scorecards
- [ ] Quality metrics
- [ ] Capacity heatmap (optional)

**Days 4-5: Polish**
- [ ] Navigation bar with country selector
- [ ] Breadcrumbs
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design

**Deliverable**: Fully functional Control Tower web app

---

### **Week 6: Mobile/HTML Demo + Final Polish** 📱✨

**Option A: React Native Mobile (5 days)**
- [ ] Expo setup
- [ ] Authentication
- [ ] Job list
- [ ] Check-in/check-out flow
- [ ] Photo capture
- [ ] Customer signature (canvas)

**Option B: Enhanced HTML Demo (2 days)** ⚡ RECOMMENDED
- [ ] Connect existing HTML demo to backend API
- [ ] Replace mock data with real API calls
- [ ] Better styling (Tailwind)
- [ ] Interactive elements

**Final Polish (Remaining Days)**
- [ ] Yellow Grid branding (logo, colors)
- [ ] Consistent UI/UX
- [ ] Demo script testing (3+ run-throughs)
- [ ] Video recording (backup for live demo)
- [ ] Deployment (Railway/Render for backend, Vercel for frontend)

**Deliverable**: Demo-ready application with polish

---

## 🎯 Demo Scenario Implementation Details

### Scenario 1: Assignment Transparency ⭐

**Backend Implementation**:
```typescript
// Funnel execution with full audit trail
{
  totalProviders: 47,
  stages: [
    {
      stage: "zone_filter",
      passed: 18,
      filtered: 29,
      reasons: [
        { providerId: "...", reason: "Outside service zone 75008" }
      ]
    },
    {
      stage: "service_type_filter",
      passed: 12,
      filtered: 6,
      reasons: [
        { providerId: "...", reason: "Only TV-capable, not installation" },
        { providerId: "...", reason: "Opted out of P1 priority" }
      ]
    },
    {
      stage: "certification_filter",
      passed: 8,
      filtered: 4,
      reasons: [
        { providerId: "...", reason: "Missing: KITCHEN_INSTALL_CERT" }
      ]
    },
    {
      stage: "risk_filter",
      passed: 5,
      filtered: 3,
      reasons: [
        { providerId: "...", reason: "Suspended: High claim rate >15%" }
      ]
    },
    {
      stage: "capacity_filter",
      passed: 3,
      filtered: 2,
      reasons: [
        { providerId: "...", reason: "Daily job limit: 4/4 (fully booked)" }
      ]
    },
    {
      stage: "availability_filter",
      passed: 3,
      filtered: 0
    }
  ],
  rankedProviders: [
    {
      providerId: "prov_123",
      providerName: "InstallPro France",
      rank: 1,
      totalScore: 92.5,
      scoreBreakdown: {
        priorityScore: 30,  // P1 job
        tierScore: 25,      // Tier 1 provider
        distanceScore: 20,  // 8.5 km
        qualityScore: 12.5, // CSAT 4.8, FTC 95%
        continuityScore: 5  // Preferred provider
      },
      distanceKm: 8.5
    },
    {
      providerId: "prov_456",
      providerName: "QuickFix Services",
      rank: 2,
      totalScore: 85.0,
      scoreBreakdown: {
        priorityScore: 30,
        tierScore: 18,  // Tier 2
        distanceScore: 20,
        qualityScore: 12,
        continuityScore: 5
      },
      distanceKm: 9.2
    }
  ]
}
```

**UI Wireframe** (Assignment Transparency):
```
┌──────────────────────────────────────────────────────────┐
│ Assignment Transparency - Jean Dupont Kitchen Install   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Funnel Stages:                                          │
│                                                          │
│  ALL PROVIDERS (47) ──────────────────────▶ [47]        │
│         ↓                                                │
│  ✓ Zone Coverage ────────────────────────▶ [18] ❌29    │
│         ↓                                                │
│  ✓ Service Type (P1 Installation) ───────▶ [12] ❌6     │
│         ↓                                                │
│  ✓ Certifications (Kitchen Install) ─────▶ [8]  ❌4     │
│         ↓                                                │
│  ✓ Risk Status (OK/On Watch) ────────────▶ [5]  ❌3     │
│         ↓                                                │
│  ✓ Capacity (Jobs & Hours) ──────────────▶ [3]  ❌2     │
│         ↓                                                │
│  ✓ Calendar Availability ────────────────▶ [3]  ❌0     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Top Ranked Providers:                                  │
│                                                          │
│  🥇 #1 InstallPro France (92.5 pts) [SELECTED]          │
│     ├─ Priority: 30 pts ████████████████████████████    │
│     ├─ Provider Tier: 25 pts ████████████████████████   │
│     ├─ Distance (8.5km): 20 pts ████████████████████    │
│     ├─ Quality (CSAT 4.8): 12.5 pts █████████████       │
│     └─ Continuity: 5 pts █████                          │
│                                                          │
│  🥈 #2 QuickFix Services (85.0 pts)                     │
│     ├─ Priority: 30 pts ████████████████████████████    │
│     ├─ Provider Tier: 18 pts ███████████████████        │
│     ├─ Distance (9.2km): 20 pts ████████████████████    │
│     ├─ Quality (CSAT 4.5): 12 pts ████████████          │
│     └─ Continuity: 5 pts █████                          │
│                                                          │
│  🥉 #3 HomeServices Plus (78.0 pts)                     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Filtered Out Providers (44):                           │
│                                                          │
│  ❌ ProRepair SA                                         │
│     Reason: Outside service zone 75008                  │
│                                                          │
│  ❌ TechPlus Ltd                                         │
│     Reason: Only TV-capable, not installation           │
│                                                          │
│  ❌ ServiFast                                            │
│     Reason: Suspended - High claim rate >15%            │
│                                                          │
│  [Show all 44...]                                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technical Implementation Notes

### Backend Architecture (Simplified for Demo)

```
apps/backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── strategies/jwt.strategy.ts
│   │
│   ├── providers/
│   │   ├── providers.controller.ts
│   │   ├── providers.service.ts
│   │   ├── providers.module.ts
│   │   └── dto/
│   │
│   ├── service-orders/
│   │   ├── service-orders.controller.ts
│   │   ├── service-orders.service.ts
│   │   ├── service-orders.module.ts
│   │   └── dto/
│   │
│   ├── assignments/  ⭐ CRITICAL MODULE
│   │   ├── assignments.controller.ts
│   │   ├── assignments.service.ts
│   │   ├── assignments.module.ts
│   │   ├── funnel/
│   │   │   ├── funnel.service.ts
│   │   │   ├── filters/  (6 filter classes)
│   │   │   └── scoring.service.ts
│   │   └── dto/
│   │
│   ├── executions/
│   │   ├── executions.controller.ts
│   │   ├── executions.service.ts
│   │   ├── executions.module.ts
│   │   └── dto/
│   │
│   └── analytics/
│       ├── analytics.controller.ts
│       ├── analytics.service.ts
│       └── analytics.module.ts
│
├── database/
│   ├── prisma.service.ts
│   ├── prisma.module.ts
│   └── seeders/
│       ├── index.ts
│       ├── users.seeder.ts
│       ├── providers.seeder.ts
│       ├── service-orders.seeder.ts
│       └── assignments.seeder.ts
│
├── app.module.ts
└── main.ts
```

### Frontend Architecture

```
apps/web/src/
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ServiceOrdersPage.tsx
│   ├── ServiceOrderDetailsPage.tsx
│   ├── AssignmentTransparencyPage.tsx  ⭐ KEY PAGE
│   ├── ProvidersPage.tsx
│   └── AnalyticsPage.tsx
│
├── components/
│   ├── Layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── CountrySelector.tsx
│   │
│   ├── ServiceOrders/
│   │   ├── ServiceOrderTable.tsx
│   │   ├── ServiceOrderCard.tsx
│   │   └── StatusBadge.tsx
│   │
│   ├── Assignments/  ⭐ CRITICAL COMPONENTS
│   │   ├── FunnelVisualization.tsx
│   │   ├── FunnelStage.tsx
│   │   ├── RankedProviderList.tsx
│   │   ├── ScoringBreakdown.tsx
│   │   └── FilteredProvidersList.tsx
│   │
│   └── common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Table.tsx
│       └── LoadingSpinner.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useServiceOrders.ts
│   ├── useAssignments.ts
│   └── useProviders.ts
│
├── services/
│   └── api.ts  (Axios client)
│
└── App.tsx
```

---

## 📊 Success Metrics

### Technical Completion

- [ ] Backend APIs functional (all core endpoints respond)
- [ ] Web app loads without errors
- [ ] Seed data populates correctly (5 scenarios)
- [ ] Assignment transparency shows complete funnel
- [ ] Demo can run end-to-end (< 20 minutes)

### Demo Quality

- [ ] Assignment transparency visually impressive
- [ ] Multi-country operations clearly demonstrated
- [ ] TV flow shows dependency logic
- [ ] Mobile/provider experience shown (app or HTML)
- [ ] Analytics dashboard populated with meaningful data

### Presentation Ready

- [ ] Demo script tested 3+ times
- [ ] Video backup recorded (in case live demo fails)
- [ ] All 5 scenarios work flawlessly
- [ ] UI is polished and branded
- [ ] Can handle Q&A confidently

---

## 🚨 Risk Mitigation

| Risk | Probability | Mitigation |
|------|-------------|------------|
| **Time overrun** | Medium | Use HTML demo instead of React Native mobile |
| **Scope creep** | High | Stick strictly to P0/P1 features only |
| **Demo bugs during presentation** | Medium | Record video backup, test 3+ times |
| **Assignment transparency too complex to implement** | Low | Simplify to 4 filters if needed (remove certifications, risk) |
| **Seed data incomplete** | Low | Start seed data in Week 3 to allow buffer time |

---

## 🎯 Immediate Next Steps

### This Week (Week 1)

**Day 1 (Today)**:
1. Fix broken backend module imports
2. Create basic module structure
3. Get app compiling

**Days 2-3**:
4. Implement AuthModule (basic JWT)
5. Implement ProvidersModule (CRUD)
6. Implement ServiceOrdersModule (CRUD)

**Days 4-5**:
7. Start AssignmentsModule foundation
8. Begin funnel filter implementation

### Week 2 Focus

**Monday-Wednesday**:
- Complete all 6 funnel filters
- Implement scoring algorithm
- Generate audit trail (JSONB)

**Thursday-Friday**:
- Assignment API endpoints
- Test funnel with real data
- Verify transparency logs

---

## 📖 Resources

**Product Documentation**:
- `/documentation/domain/05-assignment-dispatch-logic.md` - Complete assignment spec
- `/documentation/domain/03-project-service-order-domain.md` - Service order lifecycle
- `/documentation/api/05-assignment-dispatch-api.md` - API contracts

**Mockup Files**:
- `roadshow-mockup/README.md` - Demo scenarios
- `roadshow-mockup/apps/backend/prisma/schema.prisma` - Database schema
- `roadshow-mockup/IMPLEMENTATION_PLAN.md` - Detailed feature breakdown

**Technology Docs**:
- NestJS: https://docs.nestjs.com/
- Prisma: https://www.prisma.io/docs
- React Query: https://tanstack.com/query/latest
- TailwindCSS: https://tailwindcss.com/docs

---

## ✅ Phase Completion Checklist

### Phase 1: Foundation ✅
- [ ] Backend compiles and runs
- [ ] Database migrations complete
- [ ] Health endpoints working
- [ ] Prisma Client generated

### Phase 2: Backend APIs
- [ ] AuthModule functional
- [ ] ProvidersModule functional
- [ ] ServiceOrdersModule functional
- [ ] **AssignmentsModule functional** ⭐
- [ ] ExecutionsModule functional

### Phase 3: Frontend
- [ ] Project setup complete
- [ ] Login page working
- [ ] Dashboard showing data
- [ ] Service orders list/details working
- [ ] **Assignment transparency UI complete** ⭐
- [ ] Provider management working
- [ ] Analytics dashboard working

### Phase 4: Seed Data
- [ ] Users seeded
- [ ] Providers seeded (40+)
- [ ] Service orders seeded (500+)
- [ ] Assignments seeded with transparency
- [ ] Executions seeded
- [ ] All 5 scenarios testable

### Phase 5: Mobile/HTML
- [ ] Mobile app OR enhanced HTML demo
- [ ] Job list functional
- [ ] Check-in/check-out flow

### Phase 6: Polish
- [ ] Branding applied
- [ ] UI polished
- [ ] Demo script tested 3+ times
- [ ] Video backup recorded
- [ ] Deployment complete

---

**Let's build an impressive demo! 🚀**

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Owner**: Development Team
