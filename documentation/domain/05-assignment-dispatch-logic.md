# Assignment & Dispatch Logic Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Assignment Funnel Architecture](#2-assignment-funnel-architecture)
3. [Eligibility Filters](#3-eligibility-filters)
4. [Scoring Algorithm](#4-scoring-algorithm)
5. [Assignment Modes](#5-assignment-modes)
6. [Provider-Customer Date Negotiation](#6-provider-customer-date-negotiation)
7. [Unassigned Job Handling](#7-unassigned-job-handling)
8. [Funnel Transparency & Audit Trail](#8-funnel-transparency--audit-trail)
9. [Configuration Data Model](#9-configuration-data-model)
10. [Edge Cases & Business Rules](#10-edge-cases--business-rules)
11. [API Examples](#11-api-examples)

---

## 1. Overview

### 1.1 Purpose

The **Assignment & Dispatch** domain is responsible for matching service orders to eligible providers through a transparent, auditable, and optimized funnel process. The system must:

- Filter providers by eligibility criteria (zone, service type, capacity, risk, certifications)
- Score and rank eligible candidates using weighted factors
- Execute assignment based on country-specific modes (direct, offer, auto-accept, broadcast)
- Track and audit every step of the assignment funnel
- Handle provider-customer date negotiations (up to 3 rounds)
- Manage unassigned jobs with escalation and alerts

### 1.2 Key Principles

**Transparency First**: Every assignment decision must be auditable with complete reasoning.

**Fairness**: Scoring must be objective, consistent, and explainable.

**Efficiency**: Minimize time-to-assignment while respecting business constraints.

**Flexibility**: Support multiple assignment modes per country requirements.

---

## 2. Assignment Funnel Architecture

### 2.1 Funnel Overview

The assignment funnel is a **step-by-step filtering process** that narrows down the pool of all providers to a ranked list of eligible candidates.

```
┌─────────────────────────────────────────────────────────────┐
│                    ALL PROVIDERS (e.g., 500)                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER 1: Geographic Zone Coverage                         │
│ Result: 120 providers covering job zone                    │
│ Filtered Out: 380 (zone mismatch)                          │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER 2: Service Type Participation (P1/P2/Opt-Out)       │
│ Result: 95 providers participating in service type         │
│ Filtered Out: 25 (service type mismatch/opt-out)           │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER 3: Required Certifications                          │
│ Result: 80 providers with required certs                   │
│ Filtered Out: 15 (missing certifications)                  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER 4: Risk Status (OK, On Watch, Suspended)            │
│ Result: 72 providers (risk status OK or On Watch)          │
│ Filtered Out: 8 (suspended)                                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER 5: Capacity Constraints (Max Jobs, Hours)           │
│ Result: 45 providers with available capacity               │
│ Filtered Out: 27 (capacity exceeded)                       │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ FILTER 6: Calendar Availability (Requested Date)           │
│ Result: 18 providers available on requested date           │
│ Filtered Out: 27 (unavailable on date)                     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ SCORING & RANKING                                           │
│ Result: 18 providers ranked by score (1st: 92.5 pts)       │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ ASSIGNMENT EXECUTION (Mode: Offer)                         │
│ Top 3 providers offered simultaneously                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Funnel Execution Trigger

Assignment funnel is triggered when:

1. **Service Order Scheduled**: Operator schedules a service order with date/time slot
2. **Automatic Assignment**: System reaches assignment trigger event (e.g., order created + buffer elapsed)
3. **Manual Re-Assignment**: Operator manually triggers re-assignment (e.g., provider rejected offer)
4. **Broadcast Assignment**: Operator initiates broadcast to multiple providers

### 2.3 Funnel Execution Flow

```typescript
interface AssignmentFunnelInput {
  serviceOrderId: string;
  requestedDate: Date;
  requestedSlot: 'AM' | 'PM' | string;  // "AM", "PM", or "09:00-11:00"
  serviceType: 'installation' | 'tv' | 'maintenance' | 'rework';
  priority: 'P1' | 'P2';
  jobAddress: Address;
  requiredCertifications: string[];
  estimatedDurationHours: number;
  assignmentMode?: 'direct' | 'offer' | 'auto_accept' | 'broadcast';
  preferredProviderId?: string;  // For customer continuity
}

interface AssignmentFunnelResult {
  eligibleProviders: RankedProvider[];
  totalProvidersEvaluated: number;
  funnelSteps: FunnelStepAudit[];
  assignmentRecommendation: AssignmentRecommendation;
  executedAt: Date;
}

interface FunnelStepAudit {
  stepNumber: number;
  stepName: string;
  providersIn: number;
  providersOut: number;
  filteredProviders: FilteredProvider[];
  executionTimeMs: number;
}

interface FilteredProvider {
  providerId: string;
  providerName: string;
  filterReason: string;
  filterCategory: 'zone' | 'service_type' | 'certification' | 'risk' | 'capacity' | 'availability';
}

interface RankedProvider {
  providerId: string;
  providerName: string;
  rank: number;
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  distanceKm: number;
  estimatedTravelTimeMinutes: number;
}
```

**Funnel Execution Function**:

```typescript
async function executeAssignmentFunnel(
  input: AssignmentFunnelInput
): Promise<AssignmentFunnelResult> {
  const funnelSteps: FunnelStepAudit[] = [];
  let candidates = await getAllActiveProviders(input.serviceOrder.countryCode);

  // Step 1: Geographic Zone Filter
  const step1Start = Date.now();
  const zoneFilterResult = await filterByZone(candidates, input.jobAddress);
  candidates = zoneFilterResult.eligible;
  funnelSteps.push({
    stepNumber: 1,
    stepName: 'Geographic Zone Coverage',
    providersIn: zoneFilterResult.total,
    providersOut: zoneFilterResult.total - zoneFilterResult.eligible.length,
    filteredProviders: zoneFilterResult.filtered,
    executionTimeMs: Date.now() - step1Start,
  });

  // Step 2: Service Type Filter
  const step2Start = Date.now();
  const serviceTypeResult = await filterByServiceType(candidates, input.serviceType, input.priority);
  candidates = serviceTypeResult.eligible;
  funnelSteps.push({
    stepNumber: 2,
    stepName: 'Service Type Participation',
    providersIn: serviceTypeResult.total,
    providersOut: serviceTypeResult.total - serviceTypeResult.eligible.length,
    filteredProviders: serviceTypeResult.filtered,
    executionTimeMs: Date.now() - step2Start,
  });

  // Step 3: Certification Filter
  const step3Start = Date.now();
  const certResult = await filterByCertifications(candidates, input.requiredCertifications);
  candidates = certResult.eligible;
  funnelSteps.push({
    stepNumber: 3,
    stepName: 'Required Certifications',
    providersIn: certResult.total,
    providersOut: certResult.total - certResult.eligible.length,
    filteredProviders: certResult.filtered,
    executionTimeMs: Date.now() - step3Start,
  });

  // Step 4: Risk Status Filter
  const step4Start = Date.now();
  const riskResult = await filterByRiskStatus(candidates);
  candidates = riskResult.eligible;
  funnelSteps.push({
    stepNumber: 4,
    stepName: 'Risk Status',
    providersIn: riskResult.total,
    providersOut: riskResult.total - riskResult.eligible.length,
    filteredProviders: riskResult.filtered,
    executionTimeMs: Date.now() - step4Start,
  });

  // Step 5: Capacity Filter
  const step5Start = Date.now();
  const capacityResult = await filterByCapacity(candidates, input.requestedDate, input.estimatedDurationHours);
  candidates = capacityResult.eligible;
  funnelSteps.push({
    stepNumber: 5,
    stepName: 'Capacity Constraints',
    providersIn: capacityResult.total,
    providersOut: capacityResult.total - capacityResult.eligible.length,
    filteredProviders: capacityResult.filtered,
    executionTimeMs: Date.now() - step5Start,
  });

  // Step 6: Calendar Availability Filter
  const step6Start = Date.now();
  const availabilityResult = await filterByCalendarAvailability(
    candidates,
    input.requestedDate,
    input.requestedSlot
  );
  candidates = availabilityResult.eligible;
  funnelSteps.push({
    stepNumber: 6,
    stepName: 'Calendar Availability',
    providersIn: availabilityResult.total,
    providersOut: availabilityResult.total - availabilityResult.eligible.length,
    filteredProviders: availabilityResult.filtered,
    executionTimeMs: Date.now() - step6Start,
  });

  // Scoring & Ranking
  const rankedProviders = await scoreAndRankProviders(
    candidates,
    input
  );

  // Generate Assignment Recommendation
  const recommendation = await generateAssignmentRecommendation(
    rankedProviders,
    input
  );

  return {
    eligibleProviders: rankedProviders,
    totalProvidersEvaluated: funnelSteps[0]?.providersIn || 0,
    funnelSteps,
    assignmentRecommendation: recommendation,
    executedAt: new Date(),
  };
}
```

---

## 3. Eligibility Filters

### 3.1 Filter 1: Geographic Zone Coverage

**Purpose**: Ensure provider operates in the job's geographic zone.

**Logic**:
- Each provider has a list of covered zones (postcodes, districts, or custom polygons)
- Job address is mapped to a zone
- Provider is eligible if zone is in their coverage list

**Implementation**:

```typescript
interface ProviderZoneCoverage {
  providerId: string;
  coveredZones: Zone[];
}

interface Zone {
  zoneId: string;
  zoneName: string;
  zoneType: 'postcode' | 'district' | 'polygon';
  postcodes?: string[];
  polygon?: GeoJSON;  // For custom boundaries
}

async function filterByZone(
  providers: Provider[],
  jobAddress: Address
): Promise<FilterResult> {
  const jobZone = await geocodingService.getZoneForAddress(jobAddress);

  const eligible: Provider[] = [];
  const filtered: FilteredProvider[] = [];

  for (const provider of providers) {
    const coverage = await providerZoneRepository.findByProviderId(provider.id);
    const coversZone = coverage.coveredZones.some(z => z.zoneId === jobZone.zoneId);

    if (coversZone) {
      eligible.push(provider);
    } else {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Provider does not cover zone ${jobZone.zoneName} (job zone)`,
        filterCategory: 'zone',
      });
    }
  }

  return { eligible, filtered, total: providers.length };
}
```

**Filter Reason Examples**:
- "Provider does not cover zone 28001 (job zone)"
- "Provider coverage limited to zones [28002, 28003], job in 28001"

---

### 3.2 Filter 2: Service Type Participation

**Purpose**: Ensure provider participates in the specific service type and priority level.

**Business Rules**:
- Providers can opt-in/opt-out of service types: installation, TV, maintenance, rework
- Providers can opt-in/opt-out of priority levels: P1, P2
- Some providers only handle P2 (standard), not P1 (priority)

**Implementation**:

```typescript
interface ProviderServiceTypeConfig {
  providerId: string;
  serviceType: 'installation' | 'tv' | 'maintenance' | 'rework';
  participates: boolean;
  acceptsP1: boolean;
  acceptsP2: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

async function filterByServiceType(
  providers: Provider[],
  serviceType: string,
  priority: 'P1' | 'P2'
): Promise<FilterResult> {
  const eligible: Provider[] = [];
  const filtered: FilteredProvider[] = [];

  for (const provider of providers) {
    const config = await providerServiceTypeRepository.findActiveConfig(
      provider.id,
      serviceType
    );

    if (!config || !config.participates) {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Provider does not participate in ${serviceType} service type`,
        filterCategory: 'service_type',
      });
      continue;
    }

    const acceptsPriority = priority === 'P1' ? config.acceptsP1 : config.acceptsP2;
    if (!acceptsPriority) {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Provider does not accept ${priority} priority for ${serviceType}`,
        filterCategory: 'service_type',
      });
      continue;
    }

    eligible.push(provider);
  }

  return { eligible, filtered, total: providers.length };
}
```

**Filter Reason Examples**:
- "Provider does not participate in installation service type"
- "Provider does not accept P1 priority for installation"
- "Provider opted-out of TV service type"

---

### 3.3 Filter 3: Required Certifications

**Purpose**: Ensure provider holds all required certifications for the job.

**Business Rules**:
- Products may require specific certifications (e.g., "Gas Installation Certified", "Electrical Qualified")
- Provider must hold ALL required certifications (AND logic, not OR)
- Certifications have expiration dates

**Implementation**:

```typescript
interface ProviderCertification {
  providerId: string;
  certificationCode: string;
  certificationName: string;
  issuedDate: Date;
  expiresDate?: Date;
  status: 'active' | 'expired' | 'suspended';
}

interface ProductCertificationRequirement {
  productId: string;
  requiredCertifications: string[];  // Certification codes
}

async function filterByCertifications(
  providers: Provider[],
  requiredCertifications: string[]
): Promise<FilterResult> {
  if (!requiredCertifications || requiredCertifications.length === 0) {
    // No certifications required, all providers pass
    return { eligible: providers, filtered: [], total: providers.length };
  }

  const eligible: Provider[] = [];
  const filtered: FilteredProvider[] = [];

  for (const provider of providers) {
    const providerCerts = await certificationRepository.findActiveByProviderId(provider.id);
    const certCodes = providerCerts.map(c => c.certificationCode);

    const missingCerts = requiredCertifications.filter(req => !certCodes.includes(req));

    if (missingCerts.length === 0) {
      eligible.push(provider);
    } else {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Missing required certifications: ${missingCerts.join(', ')}`,
        filterCategory: 'certification',
      });
    }
  }

  return { eligible, filtered, total: providers.length };
}
```

**Filter Reason Examples**:
- "Missing required certifications: GAS_INSTALL, ELECTRICAL_LEVEL_2"
- "Certification ELECTRICAL_LEVEL_2 expired on 2024-12-15"

---

### 3.4 Filter 4: Risk Status

**Purpose**: Exclude providers who are suspended or high-risk.

**Risk Statuses**:
- **OK**: Normal operations, no restrictions
- **On Watch**: Provider has quality issues but can still receive assignments (with warnings)
- **Suspended**: Provider cannot receive new assignments (filtered out)

**Business Rules**:
- Suspended providers are **always** filtered out
- On Watch providers are **included** but flagged in assignment UI
- Risk status is determined by claims, quality metrics, and manual overrides

**Implementation**:

```typescript
interface ProviderRiskStatus {
  providerId: string;
  status: 'OK' | 'on_watch' | 'suspended';
  reason?: string;
  suspendedFrom?: Date;
  suspendedUntil?: Date;
  watchReasons?: string[];
}

async function filterByRiskStatus(
  providers: Provider[]
): Promise<FilterResult> {
  const eligible: Provider[] = [];
  const filtered: FilteredProvider[] = [];

  for (const provider of providers) {
    const riskStatus = await riskStatusRepository.findByProviderId(provider.id);

    if (riskStatus.status === 'suspended') {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Provider suspended: ${riskStatus.reason}`,
        filterCategory: 'risk',
      });
    } else {
      // OK or on_watch both pass, but on_watch is flagged
      eligible.push(provider);
    }
  }

  return { eligible, filtered, total: providers.length };
}
```

**Filter Reason Examples**:
- "Provider suspended: High claim rate (>15%) for last 3 months"
- "Provider suspended: Manual suspension by admin (contract violation)"

---

### 3.5 Filter 5: Capacity Constraints

**Purpose**: Ensure provider has available capacity (jobs, hours) for the requested date.

**Capacity Types**:
1. **Daily Job Limit**: Max jobs per day (e.g., 4 jobs/day)
2. **Weekly Job Limit**: Max jobs per week (e.g., 20 jobs/week)
3. **Daily Hours Limit**: Max working hours per day (e.g., 8 hours/day)
4. **Weekly Hours Limit**: Max working hours per week (e.g., 40 hours/week)

**Business Rules**:
- Provider is eligible if adding this job does NOT exceed any capacity limit
- Limits are configurable per provider and can vary by service type
- Committed jobs (assigned, accepted) count against capacity
- Offered jobs (not yet accepted) count against capacity with 50% weight

**Implementation**:

```typescript
interface ProviderCapacityConfig {
  providerId: string;
  maxJobsPerDay: number;
  maxJobsPerWeek: number;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
}

interface CapacityUsage {
  providerId: string;
  date: Date;
  committedJobs: number;
  offeredJobs: number;
  committedHours: number;
  offeredHours: number;
}

async function filterByCapacity(
  providers: Provider[],
  requestedDate: Date,
  estimatedDurationHours: number
): Promise<FilterResult> {
  const eligible: Provider[] = [];
  const filtered: FilteredProvider[] = [];

  const weekStart = startOfWeek(requestedDate);
  const weekEnd = endOfWeek(requestedDate);

  for (const provider of providers) {
    const config = await capacityConfigRepository.findByProviderId(provider.id);
    const dailyUsage = await capacityUsageRepository.findByProviderAndDate(provider.id, requestedDate);
    const weeklyUsage = await capacityUsageRepository.findByProviderAndDateRange(
      provider.id,
      weekStart,
      weekEnd
    );

    // Calculate effective usage (committed + 50% of offered)
    const effectiveDailyJobs = dailyUsage.committedJobs + (dailyUsage.offeredJobs * 0.5);
    const effectiveDailyHours = dailyUsage.committedHours + (dailyUsage.offeredHours * 0.5);
    const effectiveWeeklyJobs = weeklyUsage.reduce((sum, day) =>
      sum + day.committedJobs + (day.offeredJobs * 0.5), 0);
    const effectiveWeeklyHours = weeklyUsage.reduce((sum, day) =>
      sum + day.committedHours + (day.offeredHours * 0.5), 0);

    // Check if adding this job would exceed limits
    const wouldExceedDailyJobs = (effectiveDailyJobs + 1) > config.maxJobsPerDay;
    const wouldExceedDailyHours = (effectiveDailyHours + estimatedDurationHours) > config.maxHoursPerDay;
    const wouldExceedWeeklyJobs = (effectiveWeeklyJobs + 1) > config.maxJobsPerWeek;
    const wouldExceedWeeklyHours = (effectiveWeeklyHours + estimatedDurationHours) > config.maxHoursPerWeek;

    if (wouldExceedDailyJobs || wouldExceedDailyHours || wouldExceedWeeklyJobs || wouldExceedWeeklyHours) {
      const reasons: string[] = [];
      if (wouldExceedDailyJobs) {
        reasons.push(`Daily job limit: ${effectiveDailyJobs.toFixed(1)}/${config.maxJobsPerDay}`);
      }
      if (wouldExceedDailyHours) {
        reasons.push(`Daily hours limit: ${effectiveDailyHours.toFixed(1)}h/${config.maxHoursPerDay}h`);
      }
      if (wouldExceedWeeklyJobs) {
        reasons.push(`Weekly job limit: ${effectiveWeeklyJobs.toFixed(1)}/${config.maxJobsPerWeek}`);
      }
      if (wouldExceedWeeklyHours) {
        reasons.push(`Weekly hours limit: ${effectiveWeeklyHours.toFixed(1)}h/${config.maxHoursPerWeek}h`);
      }

      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Capacity exceeded: ${reasons.join('; ')}`,
        filterCategory: 'capacity',
      });
    } else {
      eligible.push(provider);
    }
  }

  return { eligible, filtered, total: providers.length };
}
```

**Filter Reason Examples**:
- "Capacity exceeded: Daily job limit: 4.0/4"
- "Capacity exceeded: Weekly hours limit: 38.5h/40h (adding 3h job would exceed)"
- "Capacity exceeded: Daily job limit: 3.5/4; Daily hours limit: 7.5h/8h"

---

### 3.6 Filter 6: Calendar Availability

**Purpose**: Ensure provider is available on the requested date and time slot.

**Business Rules**:
- Provider must have working hours configured for the requested date
- Provider must not have a calendar exception (holiday, absence, closure)
- Provider must not have a conflicting job in the requested time slot
- If slot is "AM" or "PM", provider must be available for the entire half-day
- If slot is hourly (e.g., "09:00-11:00"), provider must be available for those exact hours

**Implementation**:

```typescript
interface ProviderWorkingHours {
  providerId: string;
  dayOfWeek: number;  // 0 = Sunday, 6 = Saturday
  startTime: string;  // "08:00"
  endTime: string;    // "18:00"
  isWorkingDay: boolean;
}

interface ProviderCalendarException {
  providerId: string;
  exceptionDate: Date;
  exceptionType: 'holiday' | 'absence' | 'closure';
  allDay: boolean;
  startTime?: string;
  endTime?: string;
}

async function filterByCalendarAvailability(
  providers: Provider[],
  requestedDate: Date,
  requestedSlot: 'AM' | 'PM' | string  // "AM", "PM", or "09:00-11:00"
): Promise<FilterResult> {
  const eligible: Provider[] = [];
  const filtered: FilteredProvider[] = [];

  for (const provider of providers) {
    // Check working hours
    const dayOfWeek = requestedDate.getDay();
    const workingHours = await workingHoursRepository.findByProviderAndDay(provider.id, dayOfWeek);

    if (!workingHours || !workingHours.isWorkingDay) {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Not a working day for provider (${getDayName(dayOfWeek)})`,
        filterCategory: 'availability',
      });
      continue;
    }

    // Check calendar exceptions
    const exception = await calendarExceptionRepository.findByProviderAndDate(provider.id, requestedDate);
    if (exception) {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Calendar exception: ${exception.exceptionType} on ${formatDate(requestedDate)}`,
        filterCategory: 'availability',
      });
      continue;
    }

    // Check for conflicting jobs
    const existingJobs = await assignmentRepository.findByProviderAndDate(provider.id, requestedDate);
    const hasConflict = existingJobs.some(job => {
      return slotsOverlap(job.timeSlot, requestedSlot);
    });

    if (hasConflict) {
      filtered.push({
        providerId: provider.id,
        providerName: provider.name,
        filterReason: `Conflicting job already scheduled on ${formatDate(requestedDate)} ${requestedSlot}`,
        filterCategory: 'availability',
      });
      continue;
    }

    eligible.push(provider);
  }

  return { eligible, filtered, total: providers.length };
}

function slotsOverlap(slot1: string, slot2: string): boolean {
  // Handle AM/PM slots
  if (slot1 === 'AM' && (slot2 === 'AM' || slot2.startsWith('08:') || slot2.startsWith('09:') || slot2.startsWith('10:') || slot2.startsWith('11:'))) {
    return true;
  }
  if (slot1 === 'PM' && (slot2 === 'PM' || slot2.startsWith('12:') || slot2.startsWith('13:') || slot2.startsWith('14:') || slot2.startsWith('15:') || slot2.startsWith('16:') || slot2.startsWith('17:'))) {
    return true;
  }

  // Handle hourly slots (parse time ranges and check overlap)
  // Implementation details omitted for brevity
  return false;
}
```

**Filter Reason Examples**:
- "Not a working day for provider (Sunday)"
- "Calendar exception: holiday on 2025-12-25"
- "Conflicting job already scheduled on 2025-01-20 AM"

---

## 4. Scoring Algorithm

### 4.1 Scoring Purpose

After filtering, eligible providers are **scored and ranked** to determine the best match for the job. Scoring is based on weighted factors that balance business priorities.

### 4.2 Scoring Factors

| **Factor**                   | **Weight** | **Description**                                      |
|------------------------------|------------|------------------------------------------------------|
| Service Priority (P1 vs P2)  | 30%        | P1 jobs scored higher than P2                        |
| Provider Tier (1, 2, 3)      | 25%        | Tier 1 providers scored highest                      |
| Distance to Job Site         | 20%        | Closer providers scored higher                       |
| Historical Quality Metrics   | 15%        | First-time completion, CSAT, punctuality             |
| Customer Continuity          | 10%        | Same provider for repeat customer                    |

### 4.3 Scoring Function

```typescript
interface ScoringInput {
  provider: Provider;
  serviceOrder: ServiceOrder;
  priority: 'P1' | 'P2';
  distanceKm: number;
  qualityMetrics: ProviderQualityMetrics;
  isPreferredProvider: boolean;  // Customer continuity
}

interface ScoreBreakdown {
  priorityScore: number;      // 0-30 points
  tierScore: number;          // 0-25 points
  distanceScore: number;      // 0-20 points
  qualityScore: number;       // 0-15 points
  continuityScore: number;    // 0-10 points
  totalScore: number;         // 0-100 points
}

async function scoreProvider(input: ScoringInput): Promise<ScoreBreakdown> {
  // 1. Priority Score (30 points)
  const priorityScore = input.priority === 'P1' ? 30 : 20;

  // 2. Provider Tier Score (25 points)
  const tierScoreMap = { 1: 25, 2: 18, 3: 10 };
  const tierScore = tierScoreMap[input.provider.tier] || 10;

  // 3. Distance Score (20 points)
  // Closer = higher score
  // 0-10 km = 20 points
  // 10-30 km = 15 points
  // 30-50 km = 10 points
  // >50 km = 5 points
  let distanceScore = 20;
  if (input.distanceKm > 10 && input.distanceKm <= 30) {
    distanceScore = 15;
  } else if (input.distanceKm > 30 && input.distanceKm <= 50) {
    distanceScore = 10;
  } else if (input.distanceKm > 50) {
    distanceScore = 5;
  }

  // 4. Quality Score (15 points)
  // Based on 3-month rolling metrics
  const qualityScore = calculateQualityScore(input.qualityMetrics);

  // 5. Continuity Score (10 points)
  const continuityScore = input.isPreferredProvider ? 10 : 0;

  // Total Score
  const totalScore = priorityScore + tierScore + distanceScore + qualityScore + continuityScore;

  return {
    priorityScore,
    tierScore,
    distanceScore,
    qualityScore,
    continuityScore,
    totalScore,
  };
}

function calculateQualityScore(metrics: ProviderQualityMetrics): number {
  // First-time completion rate: 0-5 points (5 points if >=95%)
  const ftcScore = metrics.firstTimeCompletionRate >= 0.95 ? 5 :
                   metrics.firstTimeCompletionRate >= 0.85 ? 4 :
                   metrics.firstTimeCompletionRate >= 0.75 ? 3 : 2;

  // CSAT: 0-5 points (5 points if >=4.5/5)
  const csatScore = metrics.averageCSAT >= 4.5 ? 5 :
                    metrics.averageCSAT >= 4.0 ? 4 :
                    metrics.averageCSAT >= 3.5 ? 3 : 2;

  // Punctuality rate: 0-5 points (5 points if >=95%)
  const punctualityScore = metrics.punctualityRate >= 0.95 ? 5 :
                           metrics.punctualityRate >= 0.85 ? 4 :
                           metrics.punctualityRate >= 0.75 ? 3 : 2;

  return ftcScore + csatScore + punctualityScore;  // Max 15 points
}
```

### 4.4 Ranking

After scoring, providers are sorted in **descending order** by total score:

```typescript
async function scoreAndRankProviders(
  eligibleProviders: Provider[],
  input: AssignmentFunnelInput
): Promise<RankedProvider[]> {
  const scoredProviders: RankedProvider[] = [];

  for (const provider of eligibleProviders) {
    const distanceKm = await calculateDistance(input.jobAddress, provider.address);
    const qualityMetrics = await qualityMetricsRepository.getRecentMetrics(provider.id, 3);  // 3 months
    const isPreferred = input.preferredProviderId === provider.id;

    const scoreBreakdown = await scoreProvider({
      provider,
      serviceOrder: input.serviceOrder,
      priority: input.priority,
      distanceKm,
      qualityMetrics,
      isPreferredProvider: isPreferred,
    });

    scoredProviders.push({
      providerId: provider.id,
      providerName: provider.name,
      rank: 0,  // Will be set after sorting
      totalScore: scoreBreakdown.totalScore,
      scoreBreakdown,
      distanceKm,
      estimatedTravelTimeMinutes: Math.ceil(distanceKm / 40 * 60),  // Assume 40 km/h average
    });
  }

  // Sort by score descending
  scoredProviders.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  scoredProviders.forEach((provider, index) => {
    provider.rank = index + 1;
  });

  return scoredProviders;
}
```

**Example Ranked List**:

| Rank | Provider       | Score | Priority | Tier | Distance | Quality | Continuity |
|------|----------------|-------|----------|------|----------|---------|------------|
| 1    | ABC Installers | 92.5  | 30       | 25   | 20       | 12.5    | 5          |
| 2    | XYZ Services   | 88.0  | 30       | 18   | 20       | 15.0    | 5          |
| 3    | Quick Fix Ltd  | 80.0  | 20       | 25   | 15       | 10.0    | 10         |

---

## 5. Assignment Modes

### 5.1 Assignment Modes Overview

After ranking providers, the system executes assignment based on the **assignment mode**:

| **Mode**         | **Description**                                           | **Countries** |
|------------------|-----------------------------------------------------------|---------------|
| **Direct**       | Assign to top-ranked provider immediately                 | All           |
| **Offer**        | Send offer to top provider, wait for accept/reject        | FR, PL        |
| **Auto-Accept**  | Send offer with automatic acceptance after timeout        | ES, IT        |
| **Broadcast**    | Send offer to multiple providers simultaneously           | All (manual)  |

### 5.2 Mode 1: Direct Assignment

**When Used**: Operator explicitly selects a provider from the ranked list.

**Flow**:

```
Operator → Selects Provider → Direct Assignment → Service Order Assigned
```

**Implementation**:

```typescript
async function executeDirectAssignment(
  serviceOrderId: string,
  providerId: string,
  assignedBy: string  // Operator user ID
): Promise<Assignment> {
  const assignment = await assignmentRepository.create({
    serviceOrderId,
    providerId,
    assignedAt: new Date(),
    assignedBy,
    status: 'assigned',
    assignmentMode: 'direct',
  });

  await kafkaProducer.send({
    topic: 'assignment.assignment.created',
    key: assignment.id,
    value: {
      assignmentId: assignment.id,
      serviceOrderId,
      providerId,
      assignmentMode: 'direct',
      assignedAt: new Date(),
    },
  });

  // Send notification to provider
  await notificationService.sendAssignmentNotification(providerId, serviceOrderId);

  return assignment;
}
```

---

### 5.3 Mode 2: Offer (FR, PL)

**When Used**: In France and Poland, providers must explicitly accept or reject offers.

**Flow**:

```
System → Sends Offer → Provider Accepts/Rejects → Assignment Created (if accepted)
```

**Timeout**: If provider does not respond within **24 hours**, offer expires and next provider is offered.

**Implementation**:

```typescript
interface OfferConfig {
  timeoutHours: number;  // 24 hours default
  maxOffersSimultaneous: number;  // 1 for sequential offers
}

async function executeOfferAssignment(
  serviceOrderId: string,
  rankedProviders: RankedProvider[],
  config: OfferConfig
): Promise<void> {
  const topProvider = rankedProviders[0];

  const offer = await offerRepository.create({
    serviceOrderId,
    providerId: topProvider.providerId,
    offeredAt: new Date(),
    expiresAt: addHours(new Date(), config.timeoutHours),
    status: 'pending',
    offerMode: 'offer',
  });

  await kafkaProducer.send({
    topic: 'assignment.offer.sent',
    key: offer.id,
    value: {
      offerId: offer.id,
      serviceOrderId,
      providerId: topProvider.providerId,
      expiresAt: offer.expiresAt,
    },
  });

  // Send notification to provider (email, SMS, mobile app push)
  await notificationService.sendOfferNotification(topProvider.providerId, offer.id);

  // Schedule timeout job to expire offer if not accepted
  await jobScheduler.schedule({
    jobType: 'expire_offer',
    runAt: offer.expiresAt,
    payload: { offerId: offer.id },
  });
}

async function handleOfferAccepted(offerId: string): Promise<Assignment> {
  const offer = await offerRepository.findById(offerId);

  if (offer.status !== 'pending') {
    throw new Error('Offer already processed');
  }

  // Update offer status
  await offerRepository.update(offerId, { status: 'accepted', acceptedAt: new Date() });

  // Create assignment
  const assignment = await assignmentRepository.create({
    serviceOrderId: offer.serviceOrderId,
    providerId: offer.providerId,
    assignedAt: new Date(),
    assignedBy: 'provider_acceptance',
    status: 'assigned',
    assignmentMode: 'offer',
    sourceOfferId: offerId,
  });

  await kafkaProducer.send({
    topic: 'assignment.offer.accepted',
    key: offerId,
    value: { offerId, assignmentId: assignment.id },
  });

  return assignment;
}

async function handleOfferRejected(offerId: string, reason?: string): Promise<void> {
  const offer = await offerRepository.findById(offerId);

  // Update offer status
  await offerRepository.update(offerId, {
    status: 'rejected',
    rejectedAt: new Date(),
    rejectionReason: reason,
  });

  await kafkaProducer.send({
    topic: 'assignment.offer.rejected',
    key: offerId,
    value: { offerId, reason },
  });

  // Offer next provider in ranked list
  const rankedProviders = await getRankedProvidersForOrder(offer.serviceOrderId);
  const nextProvider = rankedProviders.find(p => p.rank === 2);  // Next in line

  if (nextProvider) {
    await executeOfferAssignment(offer.serviceOrderId, [nextProvider], config);
  } else {
    // No more providers, escalate to operator
    await escalateUnassignedJob(offer.serviceOrderId, 'all_offers_rejected');
  }
}
```

---

### 5.4 Mode 3: Auto-Accept (ES, IT)

**When Used**: In Spain and Italy, offers are automatically accepted if provider does not reject within timeout.

**Flow**:

```
System → Sends Offer → Provider Rejects (explicit) OR Timeout → Auto-Accept → Assignment Created
```

**Timeout**: If provider does not explicitly reject within **4 hours**, offer is auto-accepted.

**Implementation**:

```typescript
async function executeAutoAcceptAssignment(
  serviceOrderId: string,
  rankedProviders: RankedProvider[]
): Promise<void> {
  const topProvider = rankedProviders[0];

  const offer = await offerRepository.create({
    serviceOrderId,
    providerId: topProvider.providerId,
    offeredAt: new Date(),
    expiresAt: addHours(new Date(), 4),  // 4-hour auto-accept timeout
    status: 'pending',
    offerMode: 'auto_accept',
  });

  await kafkaProducer.send({
    topic: 'assignment.offer.sent',
    key: offer.id,
    value: {
      offerId: offer.id,
      serviceOrderId,
      providerId: topProvider.providerId,
      expiresAt: offer.expiresAt,
      autoAccept: true,
    },
  });

  // Send notification to provider
  await notificationService.sendAutoAcceptOfferNotification(topProvider.providerId, offer.id);

  // Schedule auto-accept job
  await jobScheduler.schedule({
    jobType: 'auto_accept_offer',
    runAt: offer.expiresAt,
    payload: { offerId: offer.id },
  });
}

async function handleOfferAutoAccept(offerId: string): Promise<Assignment> {
  const offer = await offerRepository.findById(offerId);

  if (offer.status !== 'pending') {
    // Provider already rejected or accepted explicitly
    return;
  }

  // Update offer status
  await offerRepository.update(offerId, {
    status: 'auto_accepted',
    autoAcceptedAt: new Date(),
  });

  // Create assignment
  const assignment = await assignmentRepository.create({
    serviceOrderId: offer.serviceOrderId,
    providerId: offer.providerId,
    assignedAt: new Date(),
    assignedBy: 'auto_accept',
    status: 'assigned',
    assignmentMode: 'auto_accept',
    sourceOfferId: offerId,
  });

  await kafkaProducer.send({
    topic: 'assignment.offer.auto_accepted',
    key: offerId,
    value: { offerId, assignmentId: assignment.id },
  });

  return assignment;
}
```

---

### 5.5 Mode 4: Broadcast (All Countries, Manual)

**When Used**: Operator manually initiates broadcast to multiple providers (e.g., urgent P1 job, no single provider available).

**Flow**:

```
Operator → Initiates Broadcast → Offers Sent to Top N Providers → First to Accept Wins
```

**Configuration**: Broadcast to top 3-5 providers simultaneously.

**Implementation**:

```typescript
interface BroadcastConfig {
  maxProviders: number;  // 3-5 providers
  firstAcceptanceWins: boolean;  // true
  timeoutHours: number;  // 24 hours
}

async function executeBroadcastAssignment(
  serviceOrderId: string,
  rankedProviders: RankedProvider[],
  config: BroadcastConfig
): Promise<void> {
  const providersToOffer = rankedProviders.slice(0, config.maxProviders);

  const broadcast = await broadcastRepository.create({
    serviceOrderId,
    initiatedAt: new Date(),
    expiresAt: addHours(new Date(), config.timeoutHours),
    status: 'active',
    maxProviders: config.maxProviders,
  });

  for (const provider of providersToOffer) {
    const offer = await offerRepository.create({
      serviceOrderId,
      providerId: provider.providerId,
      offeredAt: new Date(),
      expiresAt: broadcast.expiresAt,
      status: 'pending',
      offerMode: 'broadcast',
      broadcastId: broadcast.id,
    });

    await kafkaProducer.send({
      topic: 'assignment.offer.sent',
      key: offer.id,
      value: { offerId: offer.id, serviceOrderId, providerId: provider.providerId, broadcastId: broadcast.id },
    });

    await notificationService.sendBroadcastOfferNotification(provider.providerId, offer.id);
  }

  // Schedule broadcast expiration
  await jobScheduler.schedule({
    jobType: 'expire_broadcast',
    runAt: broadcast.expiresAt,
    payload: { broadcastId: broadcast.id },
  });
}

async function handleBroadcastOfferAccepted(offerId: string): Promise<Assignment> {
  const offer = await offerRepository.findById(offerId);
  const broadcast = await broadcastRepository.findById(offer.broadcastId);

  if (broadcast.status !== 'active') {
    throw new Error('Broadcast already closed (another provider accepted)');
  }

  // Close broadcast (first acceptance wins)
  await broadcastRepository.update(broadcast.id, {
    status: 'closed',
    closedAt: new Date(),
    winningOfferId: offerId,
  });

  // Reject all other pending offers in this broadcast
  const otherOffers = await offerRepository.findByBroadcastId(broadcast.id);
  for (const otherOffer of otherOffers) {
    if (otherOffer.id !== offerId && otherOffer.status === 'pending') {
      await offerRepository.update(otherOffer.id, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: 'Another provider accepted broadcast offer',
      });
      await notificationService.sendOfferClosedNotification(otherOffer.providerId, otherOffer.id);
    }
  }

  // Create assignment
  const assignment = await assignmentRepository.create({
    serviceOrderId: offer.serviceOrderId,
    providerId: offer.providerId,
    assignedAt: new Date(),
    assignedBy: 'broadcast_acceptance',
    status: 'assigned',
    assignmentMode: 'broadcast',
    sourceOfferId: offerId,
  });

  await kafkaProducer.send({
    topic: 'assignment.broadcast.accepted',
    key: broadcast.id,
    value: { broadcastId: broadcast.id, offerId, assignmentId: assignment.id },
  });

  return assignment;
}
```

---

## 6. Provider-Customer Date Negotiation

### 6.1 Negotiation Overview

If a provider cannot honor the originally requested date, they can propose **alternative dates** to the customer. The customer can accept or reject up to **3 rounds** of negotiation.

### 6.2 Negotiation Flow

```
1. Provider proposes alternative date (Round 1)
   ↓
2. Customer accepts OR rejects
   ↓ (if rejects)
3. Provider proposes 2nd alternative date (Round 2)
   ↓
4. Customer accepts OR rejects
   ↓ (if rejects)
5. Provider proposes 3rd alternative date (Round 3)
   ↓
6. Customer accepts OR rejects
   ↓ (if rejects after Round 3)
7. Assignment cancelled, job returned to pool
```

### 6.3 Implementation

```typescript
interface DateNegotiation {
  id: string;
  assignmentId: string;
  round: 1 | 2 | 3;
  originalDate: Date;
  proposedDate: Date;
  proposedBy: 'provider' | 'customer';
  status: 'pending' | 'accepted' | 'rejected';
  proposedAt: Date;
  respondedAt?: Date;
}

async function providerProposeAlternativeDate(
  assignmentId: string,
  proposedDate: Date
): Promise<DateNegotiation> {
  const assignment = await assignmentRepository.findById(assignmentId);
  const existingNegotiations = await negotiationRepository.findByAssignmentId(assignmentId);

  if (existingNegotiations.length >= 3) {
    throw new Error('Maximum 3 negotiation rounds reached');
  }

  const negotiation = await negotiationRepository.create({
    assignmentId,
    round: (existingNegotiations.length + 1) as 1 | 2 | 3,
    originalDate: assignment.scheduledDate,
    proposedDate,
    proposedBy: 'provider',
    status: 'pending',
    proposedAt: new Date(),
  });

  await kafkaProducer.send({
    topic: 'assignment.date.negotiation_proposed',
    key: negotiation.id,
    value: { negotiationId: negotiation.id, assignmentId, proposedDate, round: negotiation.round },
  });

  // Notify customer
  await notificationService.sendDateNegotiationNotification(assignment.customerId, negotiation.id);

  return negotiation;
}

async function customerRespondToNegotiation(
  negotiationId: string,
  accepted: boolean
): Promise<void> {
  const negotiation = await negotiationRepository.findById(negotiationId);

  if (negotiation.status !== 'pending') {
    throw new Error('Negotiation already responded to');
  }

  await negotiationRepository.update(negotiationId, {
    status: accepted ? 'accepted' : 'rejected',
    respondedAt: new Date(),
  });

  if (accepted) {
    // Update assignment with new date
    await assignmentRepository.update(negotiation.assignmentId, {
      scheduledDate: negotiation.proposedDate,
      dateModifiedAt: new Date(),
    });

    await kafkaProducer.send({
      topic: 'assignment.date.negotiation_accepted',
      key: negotiationId,
      value: { negotiationId, newDate: negotiation.proposedDate },
    });
  } else {
    await kafkaProducer.send({
      topic: 'assignment.date.negotiation_rejected',
      key: negotiationId,
      value: { negotiationId, round: negotiation.round },
    });

    // If round 3 rejected, cancel assignment
    if (negotiation.round === 3) {
      await cancelAssignmentDueToNegotiationFailure(negotiation.assignmentId);
    }
  }
}

async function cancelAssignmentDueToNegotiationFailure(assignmentId: string): Promise<void> {
  const assignment = await assignmentRepository.findById(assignmentId);

  await assignmentRepository.update(assignmentId, {
    status: 'cancelled',
    cancellationReason: 'Date negotiation failed after 3 rounds',
    cancelledAt: new Date(),
  });

  await kafkaProducer.send({
    topic: 'assignment.assignment.cancelled',
    key: assignmentId,
    value: { assignmentId, reason: 'Date negotiation failed after 3 rounds' },
  });

  // Return job to unassigned pool, escalate to operator
  await escalateUnassignedJob(assignment.serviceOrderId, 'date_negotiation_failed');
}
```

---

## 7. Unassigned Job Handling

### 7.1 Unassigned Job Scenarios

A service order may remain unassigned if:

1. **No eligible providers** after funnel filters
2. **All providers rejected offers**
3. **Date negotiation failed** (3 rounds exhausted)
4. **Broadcast timeout** (no acceptances)
5. **Provider cancelled** after assignment

### 7.2 Escalation Logic

```typescript
async function escalateUnassignedJob(
  serviceOrderId: string,
  reason: string
): Promise<void> {
  const escalation = await escalationRepository.create({
    serviceOrderId,
    reason,
    escalatedAt: new Date(),
    status: 'open',
    assignedTo: null,  // Operator will be assigned by supervisor
  });

  await kafkaProducer.send({
    topic: 'assignment.escalation.created',
    key: escalation.id,
    value: { escalationId: escalation.id, serviceOrderId, reason },
  });

  // Send alert to operator team
  await notificationService.sendEscalationAlert(escalation.id, reason);

  // Update service order status
  await serviceOrderRepository.update(serviceOrderId, {
    status: 'escalated',
    escalationId: escalation.id,
  });
}
```

### 7.3 Operator Actions

Operators can:

1. **Manually assign** to a provider (bypassing filters with justification)
2. **Adjust service order** (change date, relax requirements)
3. **Contact providers** to negotiate manual acceptance
4. **Cancel service order** if no solution found

---

## 8. Funnel Transparency & Audit Trail

### 8.1 Complete Audit Trail

Every assignment funnel execution is **fully auditable** with:

- All providers evaluated (IDs, names)
- Each filter step with reasons for exclusion
- Scoring breakdown for all eligible providers
- Assignment decision (mode, provider selected, timestamp)

### 8.2 Audit Data Structure

```typescript
interface AssignmentFunnelAudit {
  id: string;
  serviceOrderId: string;
  executedAt: Date;
  executedBy: string;  // "system" or operator user ID
  totalProvidersEvaluated: number;
  eligibleProvidersCount: number;
  funnelSteps: FunnelStepAudit[];
  rankedProviders: RankedProvider[];
  assignmentDecision: AssignmentDecision;
  executionTimeMs: number;
}

interface AssignmentDecision {
  assignmentMode: 'direct' | 'offer' | 'auto_accept' | 'broadcast';
  selectedProviderId?: string;
  selectedProviders?: string[];  // For broadcast
  decisionReason: string;
  decisionTimestamp: Date;
}
```

### 8.3 Transparency API Response

**Example Funnel Audit Response**:

```json
{
  "funnelExecutionId": "funnel_abc123",
  "serviceOrderId": "so_xyz789",
  "executedAt": "2025-01-16T14:30:00Z",
  "totalProvidersEvaluated": 500,
  "eligibleProvidersCount": 18,
  "funnelSteps": [
    {
      "stepNumber": 1,
      "stepName": "Geographic Zone Coverage",
      "providersIn": 500,
      "providersOut": 380,
      "filteredProviders": [
        {
          "providerId": "prov_123",
          "providerName": "ABC Installers",
          "filterReason": "Provider does not cover zone 28001 (job zone)",
          "filterCategory": "zone"
        }
      ],
      "executionTimeMs": 45
    },
    {
      "stepNumber": 2,
      "stepName": "Service Type Participation",
      "providersIn": 120,
      "providersOut": 25,
      "filteredProviders": [
        {
          "providerId": "prov_456",
          "providerName": "XYZ Services",
          "filterReason": "Provider does not accept P1 priority for installation",
          "filterCategory": "service_type"
        }
      ],
      "executionTimeMs": 32
    }
  ],
  "rankedProviders": [
    {
      "providerId": "prov_789",
      "providerName": "Top Provider Ltd",
      "rank": 1,
      "totalScore": 92.5,
      "scoreBreakdown": {
        "priorityScore": 30,
        "tierScore": 25,
        "distanceScore": 20,
        "qualityScore": 12.5,
        "continuityScore": 5
      },
      "distanceKm": 8.5,
      "estimatedTravelTimeMinutes": 13
    }
  ],
  "assignmentDecision": {
    "assignmentMode": "offer",
    "selectedProviderId": "prov_789",
    "decisionReason": "Top-ranked provider selected for offer",
    "decisionTimestamp": "2025-01-16T14:30:15Z"
  },
  "executionTimeMs": 234
}
```

---

## 9. Configuration Data Model

### 9.1 Database Schema

**Provider Zone Coverage**:

```sql
CREATE TABLE provider_zone_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id),
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, zone_id)
);
```

**Provider Service Type Config**:

```sql
CREATE TABLE provider_service_type_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('installation', 'tv', 'maintenance', 'rework')),
  participates BOOLEAN NOT NULL DEFAULT TRUE,
  accepts_p1 BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_p2 BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, service_type)
);
```

**Provider Certifications**:

```sql
CREATE TABLE provider_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  certification_code VARCHAR(100) NOT NULL,
  certification_name VARCHAR(255) NOT NULL,
  issued_date DATE NOT NULL,
  expires_date DATE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'expired', 'suspended')) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, certification_code)
);
```

**Provider Risk Status**:

```sql
CREATE TABLE provider_risk_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('OK', 'on_watch', 'suspended')) DEFAULT 'OK',
  reason TEXT,
  suspended_from TIMESTAMP,
  suspended_until TIMESTAMP,
  watch_reasons TEXT[],
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),
  UNIQUE(provider_id)
);
```

**Provider Capacity Config**:

```sql
CREATE TABLE provider_capacity_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  max_jobs_per_day INTEGER NOT NULL DEFAULT 4,
  max_jobs_per_week INTEGER NOT NULL DEFAULT 20,
  max_hours_per_day DECIMAL(5, 2) NOT NULL DEFAULT 8.0,
  max_hours_per_week DECIMAL(5, 2) NOT NULL DEFAULT 40.0,
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id)
);
```

**Assignment Funnel Audit**:

```sql
CREATE TABLE assignment_funnel_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id),
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  executed_by VARCHAR(255),
  total_providers_evaluated INTEGER NOT NULL,
  eligible_providers_count INTEGER NOT NULL,
  funnel_steps JSONB NOT NULL,  -- Array of funnel step details
  ranked_providers JSONB NOT NULL,  -- Array of ranked providers
  assignment_decision JSONB NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funnel_audit_service_order ON assignment_funnel_audit(service_order_id);
CREATE INDEX idx_funnel_audit_executed_at ON assignment_funnel_audit(executed_at);
```

**Offers & Negotiations**:

```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  offered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'auto_accepted', 'expired')) DEFAULT 'pending',
  offer_mode VARCHAR(50) NOT NULL CHECK (offer_mode IN ('offer', 'auto_accept', 'broadcast')),
  broadcast_id UUID REFERENCES broadcasts(id),
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  auto_accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offers_service_order ON offers(service_order_id);
CREATE INDEX idx_offers_provider ON offers(provider_id);
CREATE INDEX idx_offers_status ON offers(status);

CREATE TABLE date_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  round INTEGER NOT NULL CHECK (round IN (1, 2, 3)),
  original_date DATE NOT NULL,
  proposed_date DATE NOT NULL,
  proposed_by VARCHAR(50) NOT NULL CHECK (proposed_by IN ('provider', 'customer')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  proposed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, round)
);
```

---

## 10. Edge Cases & Business Rules

### 10.1 No Eligible Providers

**Scenario**: All providers filtered out.

**Action**:
- Log funnel audit with 0 eligible providers
- Escalate to operator immediately
- Operator can relax constraints (e.g., expand zone, accept lower tier provider)

**Example**:

```json
{
  "eligibleProvidersCount": 0,
  "escalationReason": "No eligible providers after funnel filters",
  "suggestedActions": [
    "Expand geographic zone coverage",
    "Relax certification requirements",
    "Adjust requested date to increase availability"
  ]
}
```

---

### 10.2 Tied Scores

**Scenario**: Two providers have identical scores.

**Tiebreaker Rules**:
1. **Distance** (closer provider wins)
2. **Quality Metrics** (higher FTC rate wins)
3. **Provider ID** (alphabetically first, for determinism)

**Implementation**:

```typescript
function sortWithTiebreaker(providers: RankedProvider[]): RankedProvider[] {
  return providers.sort((a, b) => {
    if (a.totalScore !== b.totalScore) {
      return b.totalScore - a.totalScore;  // Higher score first
    }
    // Tiebreaker 1: Distance
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;  // Closer first
    }
    // Tiebreaker 2: Quality (FTC rate)
    if (a.scoreBreakdown.qualityScore !== b.scoreBreakdown.qualityScore) {
      return b.scoreBreakdown.qualityScore - a.scoreBreakdown.qualityScore;
    }
    // Tiebreaker 3: Provider ID (determinism)
    return a.providerId.localeCompare(b.providerId);
  });
}
```

---

### 10.3 Provider Rejects All Dates

**Scenario**: Provider rejects original date + 3 alternative proposals.

**Action**:
- Assignment cancelled
- Job returned to pool
- Next provider in ranked list is offered
- If no more providers, escalate to operator

---

### 10.4 Same-Day Assignment

**Scenario**: Service order must be assigned for same day (e.g., urgent P1).

**Business Rules**:
- Global buffer can be overridden by operator for P1 jobs
- Only providers within 30-minute travel time are eligible
- Capacity constraints still apply
- Commute buffer from previous job is critical

**Implementation**:

```typescript
async function sameDayAssignment(serviceOrderId: string): Promise<void> {
  const input = await buildFunnelInput(serviceOrderId);

  // Override: Only providers within 30 min travel time
  input.maxTravelTimeMinutes = 30;

  // Override: Relax global buffer for P1
  if (input.priority === 'P1') {
    input.ignoreGlobalBuffer = true;
  }

  const funnelResult = await executeAssignmentFunnel(input);

  if (funnelResult.eligibleProvidersCount === 0) {
    await escalateUnassignedJob(serviceOrderId, 'No providers available for same-day assignment');
  } else {
    await executeBroadcastAssignment(serviceOrderId, funnelResult.eligibleProviders, {
      maxProviders: 5,
      firstAcceptanceWins: true,
      timeoutHours: 1,  // 1-hour timeout for same-day urgency
    });
  }
}
```

---

## 11. API Examples

### 11.1 Execute Assignment Funnel

**POST** `/api/v1/assignments/funnel`

**Request**:

```json
{
  "serviceOrderId": "so_xyz789",
  "requestedDate": "2025-01-25",
  "requestedSlot": "AM",
  "assignmentMode": "offer"
}
```

**Response**:

```json
{
  "funnelExecutionId": "funnel_abc123",
  "executedAt": "2025-01-16T14:30:00Z",
  "totalProvidersEvaluated": 500,
  "eligibleProvidersCount": 18,
  "funnelSteps": [
    {
      "stepNumber": 1,
      "stepName": "Geographic Zone Coverage",
      "providersIn": 500,
      "providersOut": 380
    }
  ],
  "rankedProviders": [
    {
      "providerId": "prov_789",
      "providerName": "Top Provider Ltd",
      "rank": 1,
      "totalScore": 92.5,
      "scoreBreakdown": {
        "priorityScore": 30,
        "tierScore": 25,
        "distanceScore": 20,
        "qualityScore": 12.5,
        "continuityScore": 5
      }
    }
  ],
  "assignmentRecommendation": {
    "recommendedMode": "offer",
    "recommendedProviderId": "prov_789",
    "reasoning": "Top-ranked provider with high quality metrics and close proximity"
  }
}
```

---

### 11.2 Send Offer

**POST** `/api/v1/assignments/offers`

**Request**:

```json
{
  "serviceOrderId": "so_xyz789",
  "providerId": "prov_789",
  "offerMode": "offer",
  "timeoutHours": 24
}
```

**Response**:

```json
{
  "offerId": "offer_def456",
  "serviceOrderId": "so_xyz789",
  "providerId": "prov_789",
  "offeredAt": "2025-01-16T14:35:00Z",
  "expiresAt": "2025-01-17T14:35:00Z",
  "status": "pending",
  "offerMode": "offer"
}
```

---

### 11.3 Provider Accept Offer

**POST** `/api/v1/assignments/offers/{offerId}/accept`

**Response**:

```json
{
  "offerId": "offer_def456",
  "status": "accepted",
  "acceptedAt": "2025-01-16T15:00:00Z",
  "assignmentId": "assign_ghi789",
  "message": "Offer accepted successfully. Assignment created."
}
```

---

### 11.4 View Funnel Transparency

**GET** `/api/v1/assignments/funnel/{funnelExecutionId}`

**Response**: Full funnel audit (see section 8.3)

---

## Appendix A: Glossary

| **Term**                | **Definition**                                                                 |
|-------------------------|--------------------------------------------------------------------------------|
| **Assignment Funnel**   | Step-by-step filtering process to match service orders to providers           |
| **Eligibility Filter**  | A criterion that excludes providers from assignment consideration              |
| **Scoring Algorithm**   | Weighted ranking system to prioritize eligible providers                       |
| **Offer**               | Invitation sent to provider to accept a service order assignment               |
| **Broadcast**           | Simultaneous offers to multiple providers, first acceptance wins               |
| **Auto-Accept**         | Offer mode where provider is auto-assigned if they don't explicitly reject     |
| **Date Negotiation**    | Provider-customer back-and-forth to agree on alternative service dates         |
| **Escalation**          | Unassigned job flagged for operator manual intervention                        |
| **Risk Status**         | Provider quality classification: OK, On Watch, Suspended                       |
| **Capacity Constraint** | Provider limits on jobs/hours per day/week                                     |

---

## Appendix B: Country-Specific Rules

| **Country** | **Assignment Mode** | **Timeout** | **Auto-Accept** | **Notes**                                  |
|-------------|---------------------|-------------|-----------------|-------------------------------------------|
| **ES**      | Auto-Accept         | 4 hours     | Yes             | Provider must explicitly reject or auto-accepted |
| **IT**      | Auto-Accept         | 4 hours     | Yes             | Provider must explicitly reject or auto-accepted |
| **FR**      | Offer               | 24 hours    | No              | Provider must explicitly accept            |
| **PL**      | Offer               | 24 hours    | No              | Provider must explicitly accept            |

---

**End of Document**
