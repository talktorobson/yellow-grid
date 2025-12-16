# Future Features & Advanced Specifications

**Last Updated**: 2025-11-19
**Status**: Planning & Vision Documents

---

## Purpose

This directory contains **specifications for features that are NOT currently implemented** in the Yellow Grid Platform. These documents represent:

1. **Future roadmap items** (Phase 5+)
2. **Advanced features** beyond MVP scope
3. **Vision documents** for stakeholder/investor presentations
4. **Partially implemented features** requiring significant additional work

---

## ⚠️ Important Notice

**These specifications should NOT be confused with current implementation status.**

If you're looking for documentation of **actually implemented features**, refer to:
- `/documentation/api/` - API specifications (mostly implemented)
- `/documentation/domain/` - Domain models (mostly implemented)
- `/documentation/implementation/IMPLEMENTATION_TRACKING.md` - Current implementation status
- `/web/` - Production web app (85% complete for core FSM)
- `/mobile/` - Production mobile app (50% complete)

---

## Documents in This Directory

### 1. Service Operator AI Cockpit (`service-operator-ai-cockpit.md`)

**Status**: ❌ **0% Implemented**
**Priority**: Phase 5+ (Post-MVP)

**What it describes**:
- AI-powered operator assistant with natural language interface
- Context-aware workload triage (contracts, assignments, execution, WCF)
- Integrated customer communication drawer (WhatsApp, SMS, email)
- KPI highlights and next-actions timeline
- Advanced action board with quick actions

**What EXISTS today**:
- Traditional operator web interface (`/web/`)
- Service orders, assignments, providers, calendar, tasks pages
- No AI assistant, no customer chat, no context switching

**Why it's here**:
This appears to be a **vision document** prepared for presentations or long-term planning. The infrastructure for AI/ML features, customer communication platform, and backend assistant APIs do not currently exist.

**Dependencies**:
- AI/ML infrastructure (see `/documentation/infrastructure/08-ml-infrastructure.md`)
- Customer communication platform integration
- Backend `/assistants/service-ops` API endpoints
- WebSocket/SSE real-time connection infrastructure

---

### 2. Crew Field App - Advanced Features (`crew-field-app-advanced.md`)

**Status**: 🟡 **~50% Implemented**
**Priority**: Phase 3-4 (Mixed - some in progress, some future)

**What it describes**:
- Complete mobile field technician application
- Schedule calendar with multi-day view
- Materials & inventory management
- In-app messaging with project context
- Compliance & certifications tracking
- WCF multi-step wizard
- Voice notes with transcription

**What EXISTS today** (`/mobile/`):
- ✅ Service orders list and details
- ✅ Check-in/out with GPS
- ✅ Media capture and offline storage
- ✅ Basic WCF structure (~30%)
- ✅ Offline-first architecture (WatermelonDB)

**What's MISSING**:
- ❌ Schedule tab
- ❌ Inventory management
- ❌ In-app chat
- ❌ Compliance tracking
- ❌ Complete WCF wizard (only 30% done)

**Why it's here**:
While the core mobile app exists, several advanced features described in the original specification are not implemented. This document clarifies which parts are future work vs current reality.

---

## How to Use These Documents

### For Developers

1. **DO NOT** assume these features are implemented when starting new work
2. **DO** refer to `/documentation/implementation/IMPLEMENTATION_TRACKING.md` for actual status
3. **DO** check with product/engineering leads before building features from these specs
4. **DO** validate that required backend APIs exist before building UI

### For Product Managers

1. **DO** use these for long-term roadmap planning
2. **DO** set clear expectations with stakeholders about what's implemented vs planned
3. **DO** prioritize features based on business value and dependencies
4. **DO** move specs back to main `/development/` directory once implementation begins

### For Stakeholders

1. **DO NOT** assume these features are available in current product demos
2. **DO** ask for implementation status before including in presentations
3. **DO** refer to `/roadshow-mockup/` for demo-only features
4. **DO** consult with engineering for realistic timelines

---

## Migration Path

When a feature in this directory is prioritized for development:

1. **Create implementation ticket** with detailed scope and dependencies
2. **Validate backend API readiness** (or create API specs first)
3. **Update spec with implementation status** (mark sections as in-progress)
4. **Move spec back to main directory** once >50% implemented
5. **Update `/documentation/implementation/IMPLEMENTATION_TRACKING.md`** with progress

---

## Related Documentation

- **Current Implementation**: `/documentation/implementation/IMPLEMENTATION_TRACKING.md`
- **API Specifications**: `/documentation/api/`
- **Domain Models**: `/documentation/domain/`
- **Architecture**: `/documentation/architecture/`
- **UI Audit**: `UI_IMPLEMENTATION_AUDIT_2025-11-19.md` (root directory)

---

## Questions?

If you're unsure whether a feature is implemented or planned:

1. Check `/documentation/implementation/IMPLEMENTATION_TRACKING.md` first
2. Look for actual code in `/web/src/` or `/mobile/src/`
3. Ask in #engineering channel
4. Don't rely on documentation alone - verify in codebase

---

**Remember**: Documentation can be aspirational. Code is truth. ✅
