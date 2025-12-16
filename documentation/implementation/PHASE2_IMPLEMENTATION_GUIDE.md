# Phase 2 Implementation Guide

**Created**: 2025-11-17
**Status**: Schema Complete - Ready for Module Implementation
**Phase**: Phase 2 - Scheduling & Assignment (Weeks 5-10)

---

## 🎯 Current Status

### ✅ Completed (2025-11-17)

1. **Database Schema Design** (100% Complete)
   - Added 10 new models (807 lines) to `prisma/schema.prisma`
   - All relations configured correctly
   - Comprehensive indexes for performance
   - Multi-tenancy support integrated

2. **Package Configuration**
   - Updated `package.json` with Prisma seed configuration
   - Created migration helper script (`scripts/migrate-phase2.sh`)

---

## 📋 Schema Models Added

### Project & Service Order Module

**Project Model**:
- Project entity with Pilote du Chantier (project ownership)
- Auto/Manual assignment modes for project pilots
- External sales system references (Pyxis/Tempo/SAP)
- Status tracking: CREATED, IN_PROGRESS, COMPLETED, CANCELLED

**ServiceOrder Model** (Core Entity):
- Complete lifecycle state machine (8 states)
- Service type and priority (P1/P2)
- Scheduling window and slot management
- External sales references (v2.0)
- Sales potential assessment (LOW/MEDIUM/HIGH) for TV/Quotation
- Risk assessment (LOW/MEDIUM/HIGH/CRITICAL)
- Multi-tenancy (country + business unit)

**ServiceOrderDependency Model**:
- Dependency types: REQUIRES_COMPLETION, REQUIRES_VALIDATION
- Static buffer days between dependent services

**ServiceOrderBuffer Model**:
- Buffer types: GLOBAL, STATIC, COMMUTE, HOLIDAY
- Transparency with reason tracking
- Configuration reference linking

**ServiceOrderRiskFactor Model**:
- Risk factor types: CLAIM_HISTORY, RESCHEDULE_FREQUENCY, PAYMENT_ISSUES, etc.
- Risk score contribution tracking
- Detection metadata

### Assignment & Dispatch Module

**Assignment Model**:
- Assignment modes: DIRECT, OFFER, BROADCAST, AUTO_ACCEPT
- Funnel execution tracking
- Provider ranking and scoring
- State machine: PENDING, OFFERED, ACCEPTED, DECLINED, CANCELLED, EXPIRED
- Date negotiation support (up to 3 rounds)

**AssignmentFunnelExecution Model**:
- Complete funnel audit trail
- Provider evaluation metrics
- Execution time tracking
- Funnel step transparency

### Calendar & Booking Module

**Booking Model**:
- Redis bitmap-based slot management (15-min granularity, 96 slots/day)
- Booking types: SERVICE_ORDER, EXTERNAL_BLOCK, STORE_CLOSURE
- Pre-booking with TTL expiration
- Status: PRE_BOOKED, CONFIRMED, CANCELLED, EXPIRED
- Idempotency support with hold references

### Configuration Modules

**BufferConfig Model**:
- Country and business unit scoping
- Service type and category filtering
- Product-specific buffers
- Validity period tracking

**Holiday Model**:
- National and regional holidays
- Country-specific calendar
- Used for buffer calculations

---

## 🚀 Migration Instructions

Run the migration using the helper script:

```bash
# Navigate to project root
cd /Users/20015403/Documents/PROJECTS/personal/yellow-grid

# Run the Phase 2 migration script
./scripts/migrate-phase2.sh
```

**Or manually**:

```bash
# 1. Create migration
npx prisma migrate dev --name add-phase-2-modules

# 2. Generate Prisma Client
npx prisma generate

# 3. (Optional) Run seed
npx prisma db seed
```

---

## 📦 Module Implementation Plan

### 1. Service Order Module (Week 5-6)

**Location**: `src/modules/service-orders/`

**Components**:
- `service-orders.module.ts` - Module definition
- `service-orders.controller.ts` - REST API endpoints
- `service-orders.service.ts` - Business logic
- `service-order-state.service.ts` - State machine logic
- DTOs:
  - `create-service-order.dto.ts`
  - `update-service-order.dto.ts`
  - `schedule-service-order.dto.ts`
  - `service-order-response.dto.ts`

**State Machine Implementation**:
```typescript
enum ServiceOrderState {
  CREATED → SCHEDULED → ASSIGNED → ACCEPTED →
  IN_PROGRESS → COMPLETED → VALIDATED → CLOSED
  (CANCELLED can occur from any state)
}
```

**Key Endpoints**:
- `POST /api/v1/service-orders` - Create service order
- `GET /api/v1/service-orders` - List with filters (state, priority, date range)
- `GET /api/v1/service-orders/:id` - Get by ID
- `PATCH /api/v1/service-orders/:id` - Update
- `POST /api/v1/service-orders/:id/schedule` - Schedule with slot
- `POST /api/v1/service-orders/:id/assign` - Assign to provider
- `POST /api/v1/service-orders/:id/cancel` - Cancel order
- `GET /api/v1/service-orders/:id/dependencies` - Get dependencies
- `POST /api/v1/service-orders/:id/dependencies` - Add dependency

**Business Rules**:
- Cannot schedule outside scheduling window
- Cannot reschedule after dispatched
- All dependencies must be satisfied before scheduling
- Must be scheduled before assignment
- Cannot reassign after dispatched

---

### 2. Buffer Logic Service (Week 6-7)

**Location**: `src/modules/buffers/`

**Components**:
- `buffers.module.ts`
- `buffer-calculator.service.ts` - Main buffer calculation logic
- `global-buffer.service.ts` - Advance notice buffer
- `static-buffer.service.ts` - Product-specific buffer
- `commute-buffer.service.ts` - Travel time buffer
- `holiday.service.ts` - Holiday calendar integration
- `buffer-config.service.ts` - Configuration management

**Buffer Calculation Flow**:
```
1. Load applicable buffer configs (country, BU, service type, product)
2. Calculate global buffer (advance notice)
3. Calculate static buffer (product preparation)
4. Calculate commute buffer (if multiple jobs)
5. Load holidays and adjust for non-working days
6. Stack buffers according to business rules
7. Return earliest available date
```

**Key Methods**:
```typescript
interface BufferCalculatorService {
  calculateEarliestDate(input: BufferCalculationInput): Promise<Date>
  getApplicableBuffers(serviceOrder: ServiceOrder): Promise<Buffer[]>
  stackBuffers(buffers: Buffer[]): number // Total buffer in hours
  isWorkingDay(date: Date, country: string): Promise<boolean>
  getNextWorkingDay(date: Date, country: string): Promise<Date>
}
```

**Holiday Integration**:
- Use Nager.Date API for public holidays
- Cache holiday data (Redis, 1-year TTL)
- Support regional holidays

---

### 3. Redis Calendar/Booking Service (Week 7-8) ⚠️ **CRITICAL**

**Location**: `src/modules/calendar/`

**Components**:
- `calendar.module.ts`
- `calendar-bitmap.service.ts` - Redis bitmap operations
- `slot-calculator.service.ts` - Slot index calculations
- `has-start.service.ts` - HasStart algorithm
- `atomic-booking.service.ts` - Lua scripts for race-free booking
- `pre-booking.service.ts` - Temporary slot holds with TTL
- `booking.service.ts` - Booking lifecycle management
- `idempotency.service.ts` - Prevent duplicate bookings

**Redis Bitmap Design**:
```
Key format: "calendar:{workTeamId}:{YYYY-MM-DD}"
Bitmap: 96 bits (0-95) for 15-min slots from 00:00-23:59

Example:
- 08:00 = slot 32 (8 * 4)
- 08:15 = slot 33
- 17:00 = slot 68 (17 * 4)

Slot 0 = 00:00-00:15
Slot 95 = 23:45-00:00
```

**HasStart Algorithm**:
```typescript
function hasStart(
  workTeam: WorkTeam,
  date: Date,
  durationMinutes: number
): Promise<boolean> {
  const shifts = workTeam.shifts // [{start: "08:00", end: "17:00"}]
  const slotsNeeded = Math.ceil(durationMinutes / 15)

  for (const shift of shifts) {
    const startSlot = timeToSlot(shift.start)
    const endSlot = timeToSlot(shift.end)

    // Check if job can start and finish within this shift
    if (startSlot + slotsNeeded <= endSlot) {
      // Check Redis bitmap for availability
      const bitmap = await redis.getBitmap(`calendar:${workTeam.id}:${date}`)
      const isAvailable = checkConsecutiveSlots(bitmap, startSlot, slotsNeeded)

      if (isAvailable) return true
    }
  }

  return false
}
```

**Atomic Booking with Lua**:
```lua
-- Lua script for race-free slot booking
local key = KEYS[1]
local startSlot = tonumber(ARGV[1])
local endSlot = tonumber(ARGV[2])

-- Check all slots are available (0)
for i = startSlot, endSlot do
  if redis.call('GETBIT', key, i) == 1 then
    return 0  -- Slot occupied
  end
end

-- Mark all slots as occupied (1)
for i = startSlot, endSlot do
  redis.call('SETBIT', key, i, 1)
end

return 1  -- Success
```

**Pre-Booking Lifecycle**:
- Customer searches for slots → Create PRE_BOOKED with 48h TTL
- Customer confirms → Transition to CONFIRMED, remove TTL
- TTL expires → Cron job marks as EXPIRED, releases slots
- Customer cancels → Mark as CANCELLED, release slots

**Endpoints**:
- `GET /api/v1/calendar/availability` - Search available slots
- `POST /api/v1/calendar/bookings` - Create pre-booking (hold)
- `POST /api/v1/calendar/bookings/:id/confirm` - Confirm pre-booking
- `DELETE /api/v1/calendar/bookings/:id` - Cancel booking
- `GET /api/v1/calendar/bookings/:id` - Get booking details

---

### 4. Provider Filtering & Scoring (Week 8-9)

**Location**: `src/modules/assignment/providers/`

**Components**:
- `provider-filter.service.ts` - Eligibility filtering
- `provider-scoring.service.ts` - Scoring algorithm
- `assignment-funnel.service.ts` - Complete funnel execution
- `funnel-audit.service.ts` - Transparency tracking

**Filtering Funnel Steps**:
```typescript
1. Geographic Zone Coverage
   - Check if provider's postal codes include job location

2. Service Type Participation
   - Check provider participates in service type (P1/P2)
   - Check no opt-out for this service

3. Required Certifications
   - Verify provider has all required certifications

4. Risk Status
   - Exclude SUSPENDED providers
   - Flag ON_WATCH providers (but don't exclude)

5. Capacity Constraints
   - Check max daily jobs not exceeded
   - Check max weekly hours not exceeded

6. Calendar Availability
   - Check available slots on requested date (Redis bitmap)
```

**Scoring Algorithm**:
```typescript
interface ProviderScore {
  capacityScore: number    // 0-40 points (lower utilization = higher score)
  distanceScore: number    // 0-30 points (closer = higher score)
  historyScore: number     // 0-20 points (better performance = higher score)
  continuityBonus: number  // 0-10 points (same provider as previous jobs)
  totalScore: number       // 0-100 points
}

function scoreProvider(provider: Provider, context: ScoringContext): ProviderScore {
  // Capacity score (40 points)
  const utilizationRate = provider.currentJobs / provider.maxDailyJobs
  const capacityScore = (1 - utilizationRate) * 40

  // Distance score (30 points)
  const distanceKm = calculateDistance(provider.address, context.jobAddress)
  const distanceScore = Math.max(0, 30 - (distanceKm * 0.5))

  // History score (20 points)
  const avgRating = provider.avgCustomerRating // 0-5
  const completionRate = provider.completedJobs / provider.totalJobs
  const historyScore = (avgRating / 5 * 10) + (completionRate * 10)

  // Continuity bonus (10 points)
  const continuityBonus = context.previousProvider === provider.id ? 10 : 0

  return {
    capacityScore,
    distanceScore,
    historyScore,
    continuityBonus,
    totalScore: capacityScore + distanceScore + historyScore + continuityBonus
  }
}
```

**Funnel Transparency**:
```typescript
interface FunnelAuditStep {
  stepNumber: number
  stepName: string
  providersIn: number
  providersOut: number
  filteredProviders: FilteredProvider[]
  executionTimeMs: number
}

interface FilteredProvider {
  providerId: string
  providerName: string
  filterReason: string // "Zone mismatch", "Missing certification: GAS_INSTALLER"
  filterCategory: 'zone' | 'service_type' | 'certification' | 'risk' | 'capacity' | 'availability'
}
```

---

### 5. Assignment Service (Week 9-10)

**Location**: `src/modules/assignment/`

**Components**:
- `assignment.module.ts`
- `assignment.service.ts` - Main assignment logic
- `assignment-modes.service.ts` - Mode-specific logic (DIRECT, OFFER, BROADCAST, AUTO_ACCEPT)
- `date-negotiation.service.ts` - 3-round negotiation
- `unassigned-jobs.service.ts` - Handle unassigned jobs with escalation

**Assignment Modes**:

**1. DIRECT Assignment**:
```typescript
// Operator manually selects specific provider
POST /api/v1/assignments
{
  "serviceOrderId": "...",
  "providerId": "...",
  "mode": "DIRECT"
}
// → Immediately assigns without funnel execution
```

**2. OFFER Mode** (Default in FR):
```typescript
// System executes funnel, sends offer to top N providers
POST /api/v1/assignments/execute-funnel
{
  "serviceOrderId": "...",
  "mode": "OFFER",
  "topN": 3
}
// → Creates 3 assignments with state=OFFERED
// → Sends notifications to providers
// → First to accept wins
```

**3. BROADCAST Mode**:
```typescript
// Send to all eligible providers simultaneously
POST /api/v1/assignments/execute-funnel
{
  "serviceOrderId": "...",
  "mode": "BROADCAST"
}
// → Creates assignments for ALL eligible providers
// → First to accept wins
```

**4. AUTO_ACCEPT Mode** (ES/IT only):
```typescript
// System auto-assigns to top provider
POST /api/v1/assignments/execute-funnel
{
  "serviceOrderId": "...",
  "mode": "AUTO_ACCEPT"
}
// → Creates assignment with state=ACCEPTED (skip OFFERED)
// → Notifies provider (informational only)
```

**Date Negotiation Flow**:
```
Round 1: Operator proposes date → Provider accepts/rejects/counter-proposes
Round 2: Operator accepts counter-proposal or proposes new date
Round 3: Final round, if rejected → escalate to manual resolution
```

---

## 🧪 Testing Strategy

### Unit Tests (70+ tests target)

**Service Order Module** (15 tests):
- State transitions (valid/invalid)
- Dependency validation
- Scheduling window validation
- Buffer application

**Buffer Logic** (12 tests):
- Global buffer calculation
- Static buffer lookup
- Holiday detection
- Buffer stacking rules

**Calendar/Booking** (18 tests):
- Slot index calculation
- HasStart algorithm
- Atomic booking (race conditions)
- Pre-booking TTL expiration

**Provider Filtering** (15 tests):
- Each filter step independently
- Filter reason accuracy
- Funnel execution time

**Provider Scoring** (12 tests):
- Capacity score calculation
- Distance score calculation
- History score calculation
- Continuity bonus

### Integration Tests (25+ tests target)

**End-to-End Workflows**:
- Create service order → Calculate buffers → Search slots → Book slot → Assign provider
- Provider filtering funnel (500 providers → top 3)
- Pre-booking expiration (TTL testing)
- Date negotiation (3 rounds)
- Double-booking prevention (race condition testing)

---

## 📊 Success Criteria (Phase 2)

- ✅ Can search available time slots with buffers applied correctly
- ✅ Can pre-book slots (prevents double-booking)
- ✅ Can assign service orders to providers via all modes (direct, offer, broadcast, auto-accept)
- ✅ Assignment funnel shows why providers passed/failed filters
- ✅ Country-specific rules working (ES/IT auto-accept)
- ✅ Buffer logic validated for complex scenarios (holidays, linked SOs)
- ✅ **Test Coverage**: >80% overall, >90% for critical paths

---

## 🚨 Critical Path Items

### Week 6 (CRITICAL):
- **Calendar Bitmap Service** must be prototyped early
- Validate Redis performance with 10k bookings
- Lua script testing for atomic operations

### Week 7 (HIGH PRIORITY):
- **HasStart Algorithm** implementation and testing
- Buffer stacking rules validation with stakeholders

### Week 8 (IMPORTANT):
- Assignment funnel performance testing (target: <500ms p95)
- Provider scoring weights tuning with business

---

## 📝 Configuration Required

### Environment Variables
```env
# Redis (for calendar bitmaps)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Holiday API
HOLIDAY_API_URL=https://date.nager.at/api/v3
HOLIDAY_CACHE_TTL=31536000  # 1 year in seconds

# Assignment
ASSIGNMENT_FUNNEL_TIMEOUT_MS=5000
PRE_BOOKING_TTL_HOURS=48
MAX_NEGOTIATION_ROUNDS=3
```

### Database Seed Data
```typescript
// Buffer configurations
await prisma.bufferConfig.createMany({
  data: [
    {
      countryCode: 'FR',
      bufferType: 'GLOBAL',
      serviceType: 'INSTALLATION',
      bufferDays: 3,
      reason: 'Minimum advance notice for installation services'
    },
    // ... more buffer configs
  ]
})

// Holidays for 2025
await prisma.holiday.createMany({
  data: [
    { countryCode: 'FR', date: '2025-01-01', name: 'New Year\'s Day', isNational: true },
    { countryCode: 'FR', date: '2025-05-01', name: 'Labour Day', isNational: true },
    // ... more holidays
  ]
})
```

---

## 📞 Next Actions

### Immediate (Today):
1. ✅ Run migration: `./scripts/migrate-phase2.sh`
2. ✅ Generate Prisma Client: `npx prisma generate`
3. ✅ Verify schema in Prisma Studio: `npx prisma studio`

### Week 5 (Starting Tomorrow):
1. Create Service Order module structure
2. Implement basic CRUD operations
3. Implement state machine logic
4. Write unit tests (target: 15 tests)

### Week 6:
1. Implement Buffer Logic service
2. Integrate Holiday API
3. Implement Calendar Bitmap service (CRITICAL)
4. Write unit tests (target: 30 tests)

### Week 7:
1. Implement HasStart algorithm
2. Implement Atomic Booking with Lua
3. Implement Pre-Booking lifecycle
4. Write integration tests (target: 10 tests)

### Week 8:
1. Implement Provider Filtering funnel
2. Implement Provider Scoring algorithm
3. Write unit tests (target: 27 tests)

### Week 9-10:
1. Implement Assignment modes
2. Implement Date Negotiation
3. Write integration tests (target: 15 tests)
4. Performance testing and optimization

---

**Last Updated**: 2025-11-17
**Document Owner**: Engineering Lead
**Review Frequency**: Weekly

---

## 🎯 Key Takeaways

1. **Schema is complete** - All 10 models defined with proper relations
2. **Migration ready** - Run `./scripts/migrate-phase2.sh` to apply
3. **Redis is CRITICAL** - Calendar bitmap service is the most complex component
4. **Test coverage essential** - Aim for >80% to ensure reliability
5. **Performance matters** - Funnel execution must be <500ms p95

Let's build Phase 2! 🚀
