# Priority Roadmap - Next 3 Sprints

**Created**: 2025-11-19
**Based On**: Comprehensive UI audit and realistic status assessment
**Philosophy**: **Finish what we started before starting new features**

---

## 🎯 Guiding Principles

1. **Complete > Start**: Finish 30-80% complete features before adding new ones
2. **Fix > Build**: Fix failing tests and bugs before new development
3. **Core > Advanced**: Prioritize core FSM over AI/advanced features
4. **User Value > Tech Debt**: Balance must-have features with quality
5. **MVP First**: Get to production-ready state, then enhance

---

## 📊 Current State Snapshot

### What's Working ✅
- Backend API: 90-95% complete
- Web App (Core FSM): 85% complete
- Mobile App (Field Operations): 75-80% complete

### What's Broken/Incomplete 🟡
- WCF Wizard (Mobile): 30% complete ⚠️ **HIGH PRIORITY**
- Web Tests: 14 failing ⚠️ **BLOCKING**
- Mobile Inventory: 0% complete
- Mobile Schedule Tab: 0% complete
- Analytics Dashboard: 30% complete (placeholders)

### What's Not Started ❌
- AI Assistant (Phase 5+)
- Customer Chat (Phase 5+)
- Contract Bundling UI
- Compliance Tracking

---

## 🚀 Sprint 1: Stabilize & Fix (2 weeks)

**Theme**: "Get to Production-Ready"
**Goal**: Fix all blocking issues, complete in-progress features
**Success Criteria**: All tests passing, WCF wizard complete

### Week 1: Test Fixes & WCF Foundation

#### 1.1 Fix Failing Web Tests 🔴 CRITICAL
**Owner**: Frontend Lead
**Effort**: 3 days
**Priority**: P0 (Blocking)

**Tasks**:
- [ ] Investigate 14 failing tests (list them out)
- [ ] Fix test setup/mocking issues
- [ ] Update component tests for recent changes
- [ ] Add missing test cases for new features
- [ ] Verify all 40+ tests passing

**Acceptance Criteria**:
- ✅ 0 failing tests
- ✅ All existing tests passing
- ✅ CI/CD pipeline green

**Files to Check**:
```
/web/src/pages/service-orders/__tests__/
/web/src/pages/assignments/__tests__/
/web/src/pages/providers/__tests__/
/web/src/components/calendar/__tests__/
```

#### 1.2 Complete WCF Wizard (Mobile) - Part 1 🟠 HIGH
**Owner**: Mobile Lead
**Effort**: 2 days
**Priority**: P0 (MVP Blocking)

**Current State**: 30% (basic structure exists)
**Target**: 70% (functional wizard)

**Tasks**:
- [ ] Design multi-step wizard UI (5 steps)
- [ ] Implement Step 1: Labor summary (hours, tasks)
- [ ] Implement Step 2: Materials used (from inventory)
- [ ] Add form validation per step
- [ ] Add progress indicator
- [ ] Persist partial state to WatermelonDB

**Acceptance Criteria**:
- ✅ Wizard shows 5 clear steps
- ✅ Can navigate forward/backward
- ✅ Data persists if app closes
- ✅ Validation prevents invalid progression

**Files to Create/Update**:
```
/mobile/src/screens/executions/WCFWizardScreen.tsx
/mobile/src/components/wcf/WCFStepLabor.tsx
/mobile/src/components/wcf/WCFStepMaterials.tsx
/mobile/src/components/wcf/WCFStepExtras.tsx
/mobile/src/components/wcf/WCFStepIssues.tsx
/mobile/src/components/wcf/WCFStepReview.tsx
/mobile/src/store/wcf.store.ts
```

### Week 2: WCF Completion & Dashboard

#### 1.3 Complete WCF Wizard (Mobile) - Part 2 🟠 HIGH
**Owner**: Mobile Lead
**Effort**: 3 days
**Priority**: P0 (MVP Blocking)

**Target**: 100% complete

**Tasks**:
- [ ] Implement Step 3: Extra costs/changes (requires approval)
- [ ] Implement Step 4: Issues/problems encountered
- [ ] Implement Step 5: Review & submit
- [ ] Add photo attachments to each step
- [ ] Implement offline queue for WCF submission
- [ ] Add retry logic for failed submissions
- [ ] Write tests for WCF workflow

**Acceptance Criteria**:
- ✅ Complete 5-step wizard functional
- ✅ Can attach photos to each section
- ✅ Offline submission queues properly
- ✅ Successful sync to backend
- ✅ 80%+ test coverage

#### 1.4 Fix Web Dashboard Placeholders 🟡 MEDIUM
**Owner**: Frontend Developer
**Effort**: 2 days
**Priority**: P1 (Nice to have)

**Current State**: Dashboard shows "-" placeholders
**Target**: Real data from API

**Tasks**:
- [ ] Connect dashboard metrics to backend API
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Display real counts (service orders, assignments, providers, tasks)
- [ ] Add "Last updated" timestamp
- [ ] Add refresh button

**Acceptance Criteria**:
- ✅ No "-" placeholders
- ✅ Real data from API
- ✅ Loading/error states
- ✅ Auto-refresh every 60 seconds

**Files to Update**:
```
/web/src/pages/DashboardPage.tsx
/web/src/services/dashboard-service.ts
/web/src/types/dashboard.types.ts
```

### Sprint 1 Deliverables

**By End of Sprint 1**:
- ✅ All web tests passing (0 failures)
- ✅ WCF wizard 100% complete (mobile)
- ✅ Dashboard showing real data (web)
- ✅ All critical bugs fixed
- ✅ Deployment to staging environment

**Metrics**:
- Web test pass rate: 0% → 100%
- Mobile WCF feature: 30% → 100%
- Web dashboard: 30% → 80%
- **Overall mobile app: 50% → 65%**

---

## 🚀 Sprint 2: Mobile Feature Completion (2 weeks)

**Theme**: "Mobile App Feature Parity"
**Goal**: Add missing core mobile features (Schedule, Inventory)
**Success Criteria**: Mobile app at 85%+ completion

### Week 3: Schedule Tab (Mobile)

#### 2.1 Implement Schedule Tab 🟡 MEDIUM
**Owner**: Mobile Developer
**Effort**: 4 days
**Priority**: P1 (High value)

**Current State**: 0%
**Target**: 100%

**Tasks**:
- [ ] Create ScheduleScreen component
- [ ] Implement calendar list view (today + 6 days)
- [ ] Fetch service orders by date range
- [ ] Add status badges (scheduled, completed, issue)
- [ ] Calculate distance estimates (using device location)
- [ ] Add filters (All, Scheduled, Completed, Issue)
- [ ] Implement tap-to-detail navigation
- [ ] Add pull-to-refresh
- [ ] Cache data offline

**Acceptance Criteria**:
- ✅ 7-day calendar view
- ✅ Service orders grouped by day
- ✅ Distance estimates shown
- ✅ Filters working
- ✅ Offline-first (cached data)
- ✅ Tests written

**Files to Create**:
```
/mobile/src/screens/schedule/ScheduleScreen.tsx
/mobile/src/components/schedule/DaySection.tsx
/mobile/src/components/schedule/ServiceOrderRow.tsx
/mobile/src/hooks/useSchedule.ts
/mobile/src/utils/distance-calculator.ts
```

#### 2.2 Add Schedule Tab to Navigation 🟡 MEDIUM
**Owner**: Mobile Developer
**Effort**: 1 day
**Priority**: P1

**Tasks**:
- [ ] Update bottom tab navigator
- [ ] Add schedule icon
- [ ] Wire up routes
- [ ] Test navigation flow

### Week 4: Inventory Management (Mobile)

#### 2.3 Implement Inventory Management 🟡 MEDIUM
**Owner**: Mobile Developer
**Effort**: 5 days
**Priority**: P1 (High value for technicians)

**Current State**: 0%
**Target**: 80% (core features)

**Tasks**:
- [ ] Create InventoryScreen component
- [ ] Implement two tabs: Reserved / On-hand
- [ ] Fetch inventory data from backend
- [ ] Display van stock levels
- [ ] Show reserved parts per assignment
- [ ] Implement "Consume item" action
- [ ] Implement "Request more" action
- [ ] Implement "Transfer to teammate" action
- [ ] Add offline queue for inventory actions
- [ ] Update WatermelonDB schema for inventory
- [ ] Write tests

**Acceptance Criteria**:
- ✅ Two views (Reserved, On-hand)
- ✅ Real-time stock levels
- ✅ Can consume items offline
- ✅ Actions queue when offline
- ✅ Sync to backend when online
- ✅ Tests passing

**Files to Create**:
```
/mobile/src/screens/inventory/InventoryScreen.tsx
/mobile/src/components/inventory/InventoryItem.tsx
/mobile/src/components/inventory/ReservedTab.tsx
/mobile/src/components/inventory/OnHandTab.tsx
/mobile/src/database/models/InventoryItem.ts
/mobile/src/hooks/useInventory.ts
/mobile/src/services/inventory.service.ts
```

**Backend Dependency**:
- Requires `/crew/inventory` API endpoints
- Check if backend inventory module exists
- If not, create inventory endpoints first (2 days)

### Sprint 2 Deliverables

**By End of Sprint 2**:
- ✅ Schedule tab complete (mobile)
- ✅ Inventory management complete (mobile)
- ✅ All new features tested
- ✅ Offline sync for new features

**Metrics**:
- Mobile app: 65% → 85%
- Feature count: 7 → 9 screens
- User stories complete: +6

---

## 🚀 Sprint 3: Web Enhancements & Polish (2 weeks)

**Theme**: "Production Readiness"
**Goal**: Polish web app, add missing features, prepare for MVP launch
**Success Criteria**: Full MVP feature set complete

### Week 5: Analytics & Notifications

#### 3.1 Implement Advanced Analytics Dashboard 🟡 MEDIUM
**Owner**: Full-stack Developer
**Effort**: 3 days
**Priority**: P1 (Business value)

**Current State**: 30% (basic placeholders)
**Target**: 80% (functional dashboard)

**Tasks**:
- [ ] Design analytics dashboard layout
- [ ] Implement KPI cards (with real data):
  - Service orders by status
  - Assignment success rate
  - Provider utilization
  - Average completion time
- [ ] Add trend charts (last 30 days)
- [ ] Add filters (date range, country, BU)
- [ ] Implement drill-down to details
- [ ] Add export to CSV/PDF
- [ ] Write tests

**Acceptance Criteria**:
- ✅ 6+ KPI cards with real data
- ✅ Trend visualization
- ✅ Date range filtering
- ✅ Export functionality
- ✅ Responsive design

**Files to Create/Update**:
```
/web/src/pages/analytics/AnalyticsPage.tsx
/web/src/components/analytics/KPICard.tsx
/web/src/components/analytics/TrendChart.tsx
/web/src/services/analytics-service.ts
```

#### 3.2 Complete Notification System 🟡 MEDIUM
**Owner**: Full-stack Developer
**Effort**: 2 days
**Priority**: P1 (User experience)

**Current State**: 50% (infrastructure only)
**Target**: 90% (functional notifications)

**Tasks**:
- [ ] Implement notification center UI (web)
- [ ] Add notification badge to header
- [ ] Show unread count
- [ ] Implement notification list
- [ ] Add mark as read functionality
- [ ] Add push notification deep linking (mobile)
- [ ] Test notification flow end-to-end

**Acceptance Criteria**:
- ✅ Notification center working (web)
- ✅ Unread badge showing
- ✅ Deep linking working (mobile)
- ✅ Notifications persist across sessions

### Week 6: Polish & Launch Prep

#### 3.3 Add Missing Web Features 🟡 MEDIUM
**Owner**: Frontend Developer
**Effort**: 3 days
**Priority**: P2 (Nice to have)

**Tasks**:
- [ ] Add advanced filters to service orders
- [ ] Add bulk actions (select multiple, batch assign)
- [ ] Add export functionality (CSV, Excel)
- [ ] Improve error messages
- [ ] Add loading skeletons
- [ ] Improve responsive design
- [ ] Add keyboard shortcuts for power users

**Acceptance Criteria**:
- ✅ Advanced filters working
- ✅ Bulk actions functional
- ✅ Export working
- ✅ Better UX polish

#### 3.4 E2E Testing & Bug Fixes 🔴 CRITICAL
**Owner**: QA + All Developers
**Effort**: 2 days
**Priority**: P0 (Launch blocker)

**Tasks**:
- [ ] Write E2E tests for critical flows:
  - Login → View SO → Assign → Accept
  - Check-in → Capture Photo → Check-out
  - Create assignment → Accept → Complete
- [ ] Run full regression testing
- [ ] Fix all P0/P1 bugs
- [ ] Performance testing (load 1000+ SOs)
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)

**Acceptance Criteria**:
- ✅ 5+ E2E tests passing
- ✅ No P0/P1 bugs
- ✅ Performance acceptable
- ✅ Security issues addressed

#### 3.5 Documentation & Launch Prep 📚
**Owner**: Tech Lead + PM
**Effort**: 1 day
**Priority**: P1 (Launch requirement)

**Tasks**:
- [ ] Update user guides
- [ ] Create operator training materials
- [ ] Create technician training materials
- [ ] Document deployment process
- [ ] Create runbooks for common issues
- [ ] Prepare launch checklist
- [ ] Plan rollout strategy

### Sprint 3 Deliverables

**By End of Sprint 3**:
- ✅ Analytics dashboard complete
- ✅ Notifications fully functional
- ✅ Web app polished and production-ready
- ✅ E2E tests passing
- ✅ All critical bugs fixed
- ✅ **MVP READY FOR LAUNCH** 🚀

**Metrics**:
- Web app: 85% → 95%
- Mobile app: 85% (unchanged, polishing)
- Overall platform: 68% → 90% (MVP scope)
- Test coverage: 60-70% → 80%+
- Bug count: TBD → 0 P0/P1 bugs

---

## 📊 3-Sprint Summary

| Sprint | Theme | Duration | Key Deliverables | Progress |
|--------|-------|----------|------------------|----------|
| **Sprint 1** | Stabilize & Fix | 2 weeks | Tests passing, WCF complete, Dashboard live | 50% → 65% |
| **Sprint 2** | Mobile Features | 2 weeks | Schedule tab, Inventory management | 65% → 85% |
| **Sprint 3** | Production Ready | 2 weeks | Analytics, Notifications, Polish, E2E tests | 85% → 90% |

**Total Duration**: 6 weeks
**Starting Point**: 68% overall (realistic)
**Ending Point**: 90% MVP complete
**Outcome**: **Production-ready MVP** 🎯

---

## 🚫 What We're NOT Doing (Yet)

These features are **deprioritized** until after MVP launch:

### Phase 5+ Features (Post-MVP)
- ❌ AI Assistant Cockpit (0% → still 0%)
- ❌ Customer Communication Drawer (0% → still 0%)
- ❌ Contract Bundling UI (0% → still 0%)
- ❌ In-App Messaging (Mobile) (0% → still 0%)
- ❌ Compliance Tracking (0% → still 0%)
- ❌ Voice Notes (0% → still 0%)
- ❌ Advanced ML Features (0% → still 0%)

### Why Defer?

1. **Focus**: Complete core FSM before advanced features
2. **Dependencies**: AI features require infrastructure not built yet
3. **Value**: Core features deliver 90% of user value
4. **Risk**: Spreading too thin delays MVP launch
5. **Iteration**: Get feedback on MVP first, then enhance

**Timeline for deferred features**: 3-6 months post-MVP launch

---

## 🎯 Success Metrics

### By End of 3 Sprints

**Functionality**:
- ✅ Web app: 95% complete (MVP scope)
- ✅ Mobile app: 85% complete (MVP scope)
- ✅ Backend: 95% complete (unchanged)
- ✅ 0 failing tests
- ✅ 80%+ test coverage

**Quality**:
- ✅ 0 P0/P1 bugs
- ✅ All E2E tests passing
- ✅ Performance acceptable (<500ms API response)
- ✅ Security audit passed
- ✅ Accessibility compliance (AA)

**Documentation**:
- ✅ User guides complete
- ✅ Training materials ready
- ✅ Deployment runbooks documented
- ✅ API docs up to date

**Readiness**:
- ✅ Staging environment stable
- ✅ Production environment provisioned
- ✅ CI/CD pipeline functional
- ✅ Monitoring/alerting configured
- ✅ **READY FOR MVP LAUNCH** 🚀

---

## 📋 Sprint Dependencies & Risks

### Critical Dependencies

| Feature | Depends On | Risk | Mitigation |
|---------|-----------|------|------------|
| WCF Wizard | Backend WCF API | Medium | Verify API exists, stub if needed |
| Inventory | Backend inventory endpoints | High | Check backend first, build if missing |
| Analytics | Backend analytics API | Medium | Can use aggregated queries if needed |
| Notifications | Push notification service | Low | Infrastructure exists |

### Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Backend inventory API missing | High | Medium | Allocate backend dev for 2 days |
| WCF wizard complexity | Medium | High | Break into smaller PRs, iterate |
| Test fixes take longer | Medium | Medium | Allocate overflow time |
| Performance issues | High | Low | Load testing in Sprint 3 |
| Team capacity | High | Medium | Focus on priorities, defer nice-to-haves |

---

## 🔄 Review & Adjust

**Weekly Check-ins**:
- Monday: Sprint planning / retrospective
- Wednesday: Mid-sprint review
- Friday: Demo + adjust next week

**Decision Points**:
- End of Sprint 1: Go/no-go for Sprint 2?
- End of Sprint 2: Are we on track for MVP launch?
- End of Sprint 3: Launch or delay?

**Flexibility**:
- If ahead of schedule: Add polish or tackle deferred features
- If behind schedule: Cut scope (analytics, advanced filters)
- Always prioritize: Tests passing, WCF complete, bug fixes

---

## 🎯 After MVP Launch

**Phase 4** (Months 3-4):
- Customer feedback iteration
- Bug fixes & performance optimization
- Mobile in-app messaging
- Contract bundling UI
- Advanced analytics

**Phase 5** (Months 5-6):
- AI infrastructure buildout
- ML model training & deployment
- Customer communication platform integration
- Begin AI cockpit development

**Phase 6** (Months 7-12):
- AI Assistant Cockpit
- Advanced automation
- Predictive analytics
- Advanced ML features

---

## 📞 Questions or Changes?

**Roadmap Owner**: Tech Lead + Product Manager
**Last Updated**: 2025-11-19
**Next Review**: Start of Sprint 1
**Approval Required From**: Engineering Lead, Product Manager

**Contact**: #engineering or #product-roadmap

---

**Philosophy**: Ship fast, iterate faster. MVP first, perfection later. ✅
