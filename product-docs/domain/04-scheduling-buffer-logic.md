# Scheduling & Buffer Logic

## Purpose

This document defines the comprehensive scheduling and buffer calculation logic for the AHS Field Service Execution Platform, including buffer types, stacking rules, slot granularity, calendar integration, and transparency mechanisms for explaining scheduling decisions to users.

## Table of Contents

1. [Overview](#overview)
2. [Buffer Types](#buffer-types)
3. [Buffer Calculation Logic](#buffer-calculation-logic)
4. [Slot Availability Algorithm](#slot-availability-algorithm)
5. [Calendar Integration](#calendar-integration)
6. [Slot Granularity Rules](#slot-granularity-rules)
7. [Multi-Person Job Scheduling](#multi-person-job-scheduling)
8. [Buffer Transparency](#buffer-transparency)
9. [Configuration Data Model](#configuration-data-model)
10. [Edge Cases & Special Scenarios](#edge-cases--special-scenarios)
11. [API Examples](#api-examples)

---

## Overview

### Scheduling Challenge

The Field Service Execution Platform must calculate available time slots for service orders while respecting multiple constraints:

- **Provider Availability**: Work team calendars (working days, hours, holidays, closures)
- **Capacity Constraints**: Maximum jobs per day, hours per week
- **Buffer Requirements**: Minimum delays before/after services
- **Product Requirements**: Product-specific preparation time
- **Customer Preferences**: Requested delivery dates
- **Multi-person Jobs**: Services requiring 2+ technicians

### Scheduling Principles

1. **Conservative Scheduling**: Better to show fewer slots than to create scheduling conflicts
2. **Transparency**: Always explain why slots are/aren't available
3. **Performance**: Slot search must complete in < 500ms (p95)
4. **Configurability**: Buffers configurable by country, BU, product, service type
5. **Determinism**: Same inputs → same available slots (repeatable results)

### High-Level Flow

```
Customer Request
      ↓
[1. Load Product & Service Config]
      ↓
[2. Calculate Buffers]
   → Global/Advance Buffer
   → Static/Product Buffer
   → Commute Buffer (if applicable)
      ↓
[3. Load Provider Calendars]
   → Working days/hours
   → Holidays
   → Store closures
   → External blocks
      ↓
[4. Load Provider Capacity]
   → Jobs already scheduled
   → Capacity constraints
      ↓
[5. Generate Available Slots]
   → Apply slot granularity (AM/PM or hourly)
   → Filter by buffers
   → Filter by capacity
      ↓
[6. Return Slots with Transparency]
   → Available slots
   → Reasons for unavailability
```

---

## Buffer Types

### 1. Global Buffer (Advance Notice)

**Purpose**: Minimum delay between order creation and service execution

**Rationale**:
- Provider needs time to prepare
- Customer needs time to be available
- Prevents same-day scheduling chaos

**Configuration**:
```typescript
interface GlobalBufferConfig {
  countryCode: string;
  buCode: string;
  serviceType: 'installation' | 'tv' | 'maintenance' | 'rework';
  bufferDays: number;           // Minimum days in advance
  bufferHours?: number;          // Additional hours (optional)
  effectiveFrom: Date;
  effectiveTo?: Date;
}
```

**Example**:
```json
{
  "countryCode": "FR",
  "buCode": "LEROY_MERLIN",
  "serviceType": "installation",
  "bufferDays": 3,
  "bufferHours": 0,
  "effectiveFrom": "2025-01-01T00:00:00Z"
}
```

**Business Rule**: Service can only be scheduled if `scheduledDate >= orderCreatedDate + globalBuffer`

**Country-Specific Defaults**:
| Country | Installation | TV | Maintenance | Rework |
|---------|-------------|-----|-------------|---------|
| FR | 3 days | 2 days | 1 day | 1 day |
| ES | 3 days | 2 days | 1 day | 1 day |
| IT | 4 days | 3 days | 2 days | 1 day |
| PL | 5 days | 3 days | 2 days | 2 days |

---

### 2. Static Buffer (Product-Specific Preparation)

**Purpose**: Time required to prepare materials/tools for specific products

**Rationale**:
- Some products require custom cutting, preparation
- Complex installations need parts staging
- Delivery timing may dictate earliest installation date

**Configuration**:
```typescript
interface StaticBufferConfig {
  productId: string;
  productCategory: string;
  bufferDays: number;
  bufferHours?: number;
  reason: string;               // For transparency
  countryCode?: string;          // Optional country override
  effectiveFrom: Date;
}
```

**Example**:
```json
{
  "productId": "KITCHEN-CUSTOM-FR",
  "productCategory": "kitchen_installation",
  "bufferDays": 7,
  "bufferHours": 0,
  "reason": "Custom kitchen requires 7 days for fabrication and preparation",
  "countryCode": "FR",
  "effectiveFrom": "2025-01-01T00:00:00Z"
}
```

**Business Rule**: Service can only be scheduled if `scheduledDate >= productDeliveryDate + staticBuffer`

**Common Product Buffers**:
| Product Category | Buffer | Reason |
|-----------------|--------|--------|
| Standard Flooring | 2 days | Acclimation time |
| Custom Kitchen | 7 days | Fabrication + staging |
| Bathroom Installation | 3 days | Plumbing parts prep |
| Appliance Installation | 1 day | Delivery coordination |
| Door/Window Installation | 2 days | Custom sizing |

---

### 3. Commute Buffer (Travel Time)

**Purpose**: Time required to travel between consecutive jobs

**Rationale**:
- Prevents overlapping appointments
- Accounts for traffic, distance
- Ensures technicians arrive on time

**Calculation Method**:

```typescript
interface CommuteBufferCalculation {
  method: 'distance' | 'travel_time' | 'fixed';

  // Distance-based (simple)
  distanceKm?: number;
  speedKmPerHour?: number;      // Avg: 40 km/h in cities, 60 km/h rural

  // Travel time API (accurate)
  originAddress?: Address;
  destinationAddress?: Address;
  travelTimeMinutes?: number;   // From Google Maps API / Mapbox

  // Fixed buffer
  fixedMinutes?: number;
}
```

**Business Rule**:
```
Job A scheduled at: 2025-01-20 09:00-11:00 (2 hours)
Commute buffer: 30 minutes (calculated from Job A location to Job B location)

Earliest Job B start time: 11:00 + 30 min = 11:30
```

**Calculation Examples**:

**Example 1: Distance-Based**
```typescript
// Job A: Paris 16th arrondissement
// Job B: Paris 8th arrondissement
// Distance: 5 km
// Average speed: 30 km/h (city traffic)

commuteBuffer = (5 km / 30 km/h) * 60 min = 10 minutes
```

**Example 2: API-Based (Preferred)**
```typescript
// Call Google Maps Distance Matrix API
const response = await mapsAPI.getDistanceMatrix({
  origins: ['48.8566,2.3522'], // Job A coordinates
  destinations: ['48.8738,2.2950'], // Job B coordinates
  mode: 'driving',
  departureTime: 'now', // Real-time traffic
});

commuteBuffer = response.duration.value / 60; // Convert seconds to minutes
// Example result: 18 minutes (accounting for real-time traffic)
```

**Fallback Strategy**:
1. Try real-time travel time API (Google Maps, Mapbox)
2. If API unavailable, use distance-based calculation
3. If distance unknown, use fixed buffer (45 minutes default)

**Configuration**:
```typescript
interface CommuteBufferConfig {
  countryCode: string;
  calculationMethod: 'api' | 'distance' | 'fixed';
  apiProvider?: 'google_maps' | 'mapbox';
  avgSpeedKmPerHour?: number;
  fixedBufferMinutes?: number;
  maxCommuteMinutes?: number;   // Cap at 90 minutes
}
```

---

### 4. Holiday & Closure Buffer

**Purpose**: Block scheduling on non-working days

**Types**:
- **Public Holidays**: National/regional holidays (no work)
- **Store Closures**: Store closed for inventory, renovations
- **Provider Blocks**: Provider-specific unavailability (vacation, training)

**Business Rule**: Services cannot be scheduled on days marked as holidays or closures

**Data Model**:
```typescript
interface HolidayCalendar {
  id: UUID;
  countryCode: string;
  year: number;
  holidays: Holiday[];
}

interface Holiday {
  date: Date;
  name: string;
  type: 'national' | 'regional' | 'religious';
  affectedRegions?: string[];   // If regional
}

interface StoreClosure {
  id: UUID;
  storeId: UUID;
  startDate: Date;
  endDate: Date;
  reason: string;
}

interface ProviderBlock {
  id: UUID;
  providerId: UUID;
  teamId?: UUID;                // Optional: specific team
  startDate: Date;
  endDate: Date;
  reason: 'vacation' | 'training' | 'maintenance' | 'other';
  isRecurring: boolean;
  recurrencePattern?: string;   // e.g., "every Monday"
}
```

---

## Buffer Calculation Logic

### Buffer Stacking Algorithm

When multiple buffers apply, they must be combined correctly:

**Rule 1: Global and Static buffers are cumulative**

```typescript
// Example: Kitchen installation in France
const orderCreatedDate = new Date('2025-01-15');
const productDeliveryDate = new Date('2025-01-20');

const globalBuffer = 3; // days
const staticBuffer = 7; // days (custom kitchen)

// Earliest possible date calculation
const globalConstraint = addDays(orderCreatedDate, globalBuffer);
// globalConstraint = 2025-01-18

const staticConstraint = addDays(productDeliveryDate, staticBuffer);
// staticConstraint = 2025-01-27

// Take the LATER of the two constraints
const earliestScheduleDate = max(globalConstraint, staticConstraint);
// earliestScheduleDate = 2025-01-27
```

**Rule 2: Commute buffer only applies between same-day jobs**

```typescript
// Job A: 2025-01-20 09:00-11:00 at Address A
// Job B: wants to schedule at Address B

const jobAEndTime = new Date('2025-01-20T11:00:00Z');
const commuteBuffer = calculateCommuteTime(addressA, addressB); // 30 min

// If Job B is same day as Job A
if (isSameDay(jobADate, jobBDate)) {
  const earliestJobBStart = addMinutes(jobAEndTime, commuteBuffer);
  // earliestJobBStart = 11:30
}
// If Job B is different day, commute buffer doesn't apply
```

**Rule 3: Holidays/closures are absolute blocks**

```typescript
// Even if all buffers allow scheduling on 2025-12-25 (Christmas)
// Holiday block overrides and prevents scheduling

const candidateDate = new Date('2025-12-25');
const isHoliday = holidays.some(h => isSameDay(h.date, candidateDate));

if (isHoliday) {
  // Cannot schedule, move to next working day
  candidateDate = getNextWorkingDay(candidateDate, holidays);
}
```

### Complete Buffer Calculation Function

```typescript
interface BufferCalculationInput {
  orderCreatedDate: Date;
  productDeliveryDate?: Date;
  requestedDate?: Date;
  serviceType: string;
  productId: string;
  countryCode: string;
  buCode: string;
  providerId: UUID;
  teamId?: UUID;
  previousJobOnSameDay?: {
    endTime: Date;
    location: Address;
  };
  targetLocation: Address;
}

interface BufferCalculationResult {
  earliestPossibleDate: Date;
  bufferBreakdown: {
    globalBufferDays: number;
    staticBufferDays: number;
    commuteBufferMinutes?: number;
    totalBufferDays: number;
  };
  blockingFactors: string[];
  explanation: string;
}

async function calculateEarliestScheduleDate(
  input: BufferCalculationInput
): Promise<BufferCalculationResult> {
  const blockingFactors: string[] = [];

  // 1. Load global buffer
  const globalBufferConfig = await bufferConfigService.getGlobalBuffer(
    input.countryCode,
    input.buCode,
    input.serviceType
  );

  const globalConstraint = addDays(
    input.orderCreatedDate,
    globalBufferConfig.bufferDays
  );

  blockingFactors.push(
    `Global buffer: ${globalBufferConfig.bufferDays} days (order created + ${globalBufferConfig.bufferDays}d)`
  );

  // 2. Load static/product buffer
  let staticConstraint = input.orderCreatedDate;
  let staticBufferDays = 0;

  const staticBufferConfig = await bufferConfigService.getStaticBuffer(
    input.productId,
    input.countryCode
  );

  if (staticBufferConfig && input.productDeliveryDate) {
    staticBufferDays = staticBufferConfig.bufferDays;
    staticConstraint = addDays(
      input.productDeliveryDate,
      staticBufferDays
    );

    blockingFactors.push(
      `Static buffer: ${staticBufferDays} days (${staticBufferConfig.reason})`
    );
  }

  // 3. Take maximum of global and static constraints
  let earliestDate = max(globalConstraint, staticConstraint);

  // 4. Check holidays and closures
  const holidays = await calendarService.getHolidays(
    input.countryCode,
    earliestDate.getFullYear()
  );

  const storeClosures = await calendarService.getStoreClosures(
    input.buCode,
    earliestDate
  );

  const providerBlocks = await calendarService.getProviderBlocks(
    input.providerId,
    input.teamId,
    earliestDate
  );

  // Move to next working day if needed
  while (
    isHoliday(earliestDate, holidays) ||
    isStoreClosed(earliestDate, storeClosures) ||
    isProviderBlocked(earliestDate, providerBlocks)
  ) {
    if (isHoliday(earliestDate, holidays)) {
      const holiday = holidays.find(h => isSameDay(h.date, earliestDate));
      blockingFactors.push(`Holiday: ${holiday.name} on ${formatDate(earliestDate)}`);
    }

    earliestDate = addDays(earliestDate, 1);
  }

  // 5. Apply commute buffer if same-day job exists
  let commuteBufferMinutes = 0;

  if (input.previousJobOnSameDay) {
    commuteBufferMinutes = await calculateCommuteTime(
      input.previousJobOnSameDay.location,
      input.targetLocation
    );

    const earliestTimeWithCommute = addMinutes(
      input.previousJobOnSameDay.endTime,
      commuteBufferMinutes
    );

    if (isSameDay(earliestDate, input.previousJobOnSameDay.endTime)) {
      // Merge commute constraint with date constraint
      earliestDate = max(earliestDate, earliestTimeWithCommute);

      blockingFactors.push(
        `Commute buffer: ${commuteBufferMinutes} minutes (from previous job)`
      );
    }
  }

  // 6. Build explanation
  const explanation = `Earliest schedule date is ${formatDate(earliestDate)}. ` +
    `Factors: ${blockingFactors.join('; ')}`;

  return {
    earliestPossibleDate: earliestDate,
    bufferBreakdown: {
      globalBufferDays: globalBufferConfig.bufferDays,
      staticBufferDays,
      commuteBufferMinutes,
      totalBufferDays: differenceInDays(earliestDate, input.orderCreatedDate),
    },
    blockingFactors,
    explanation,
  };
}
```

---

## Slot Availability Algorithm

### Slot Generation Process

Once the earliest possible date is determined, generate available time slots:

```typescript
interface SlotSearchInput {
  earliestDate: Date;
  latestDate: Date;              // Search window (typically +30 days)
  serviceType: string;
  estimatedDurationMinutes: number;
  providerId?: UUID;             // Optional: specific provider
  teamId?: UUID;                 // Optional: specific team
  zone?: string;                 // Optional: geographic zone
  countryCode: string;
  buCode: string;
  multiPerson?: boolean;         // Requires 2+ technicians
}

interface Slot {
  providerId: UUID;
  teamId: UUID;
  date: Date;
  timeWindow: {
    start: string;               // e.g., "09:00" or "AM"
    end: string;                 // e.g., "12:00" or "PM"
  };
  granularity: 'hourly' | 'half_day';
  capacity: number;              // How many jobs can fit this slot
  confidence: number;            // 0-100 (accounting for uncertainties)
}

async function searchAvailableSlots(
  input: SlotSearchInput
): Promise<Slot[]> {
  const slots: Slot[] = [];

  // 1. Get eligible providers/teams
  const eligibleTeams = await getEligibleTeams(
    input.providerId,
    input.teamId,
    input.zone,
    input.serviceType
  );

  // 2. For each team, scan calendar from earliestDate to latestDate
  for (const team of eligibleTeams) {
    const calendar = await calendarService.getTeamCalendar(team.id);
    const capacity = await capacityService.getTeamCapacity(team.id);
    const existingJobs = await schedulingService.getScheduledJobs(
      team.id,
      input.earliestDate,
      input.latestDate
    );

    let currentDate = input.earliestDate;

    while (currentDate <= input.latestDate) {
      // Skip non-working days
      if (!isWorkingDay(currentDate, calendar)) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Determine slot granularity (AM/PM or hourly)
      const granularity = determineSlotGranularity(
        currentDate,
        input.earliestDate
      );

      if (granularity === 'half_day') {
        // Generate AM and PM slots
        const amSlot = await checkSlotAvailability(
          team,
          currentDate,
          { start: '08:00', end: '12:00' },
          input.estimatedDurationMinutes,
          existingJobs,
          capacity
        );

        if (amSlot.available) {
          slots.push({
            providerId: team.providerId,
            teamId: team.id,
            date: currentDate,
            timeWindow: { start: 'AM', end: 'AM' },
            granularity: 'half_day',
            capacity: amSlot.remainingCapacity,
            confidence: amSlot.confidence,
          });
        }

        const pmSlot = await checkSlotAvailability(
          team,
          currentDate,
          { start: '13:00', end: '17:00' },
          input.estimatedDurationMinutes,
          existingJobs,
          capacity
        );

        if (pmSlot.available) {
          slots.push({
            providerId: team.providerId,
            teamId: team.id,
            date: currentDate,
            timeWindow: { start: 'PM', end: 'PM' },
            granularity: 'half_day',
            capacity: pmSlot.remainingCapacity,
            confidence: pmSlot.confidence,
          });
        }

      } else {
        // Generate hourly slots
        const workingHours = calendar.workingHours[currentDate.getDay()];

        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          const slotStart = setHour(currentDate, hour);
          const slotEnd = addHours(slotStart, 1);

          const hourlySlot = await checkSlotAvailability(
            team,
            currentDate,
            {
              start: format(slotStart, 'HH:mm'),
              end: format(slotEnd, 'HH:mm')
            },
            input.estimatedDurationMinutes,
            existingJobs,
            capacity
          );

          if (hourlySlot.available) {
            slots.push({
              providerId: team.providerId,
              teamId: team.id,
              date: currentDate,
              timeWindow: {
                start: format(slotStart, 'HH:mm'),
                end: format(slotEnd, 'HH:mm'),
              },
              granularity: 'hourly',
              capacity: hourlySlot.remainingCapacity,
              confidence: hourlySlot.confidence,
            });
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }
  }

  // 3. Sort by date, then by confidence
  return slots.sort((a, b) => {
    if (a.date !== b.date) return a.date - b.date;
    return b.confidence - a.confidence;
  });
}
```

### Capacity Check Algorithm

```typescript
interface CapacityCheckResult {
  available: boolean;
  remainingCapacity: number;
  confidence: number;
  blockingReasons?: string[];
}

async function checkSlotAvailability(
  team: WorkTeam,
  date: Date,
  timeWindow: { start: string; end: string },
  estimatedDurationMinutes: number,
  existingJobs: ScheduledJob[],
  capacityRules: CapacityRules
): Promise<CapacityCheckResult> {
  const blockingReasons: string[] = [];

  // 1. Check max jobs per day
  const jobsOnThisDay = existingJobs.filter(job =>
    isSameDay(job.scheduledDate, date)
  );

  if (jobsOnThisDay.length >= capacityRules.maxJobsPerDay) {
    return {
      available: false,
      remainingCapacity: 0,
      confidence: 0,
      blockingReasons: [`Max jobs per day reached (${capacityRules.maxJobsPerDay})`],
    };
  }

  // 2. Check max hours per week
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  const jobsThisWeek = existingJobs.filter(job =>
    job.scheduledDate >= weekStart && job.scheduledDate <= weekEnd
  );

  const hoursThisWeek = jobsThisWeek.reduce(
    (sum, job) => sum + (job.estimatedDurationMinutes / 60),
    0
  );

  if (hoursThisWeek + (estimatedDurationMinutes / 60) > capacityRules.maxHoursPerWeek) {
    return {
      available: false,
      remainingCapacity: 0,
      confidence: 0,
      blockingReasons: [`Max hours per week would be exceeded`],
    };
  }

  // 3. Check time window conflicts
  const jobsInTimeWindow = existingJobs.filter(job => {
    if (!isSameDay(job.scheduledDate, date)) return false;

    return timesOverlap(
      job.timeWindow,
      timeWindow
    );
  });

  if (jobsInTimeWindow.length > 0) {
    return {
      available: false,
      remainingCapacity: 0,
      confidence: 0,
      blockingReasons: [`Conflict with existing job in this time window`],
    };
  }

  // 4. Calculate confidence score
  let confidence = 100;

  // Reduce confidence if close to capacity limits
  const capacityUtilization = jobsOnThisDay.length / capacityRules.maxJobsPerDay;
  if (capacityUtilization > 0.8) {
    confidence -= 20; // 80%+ utilization reduces confidence
  }

  // Reduce confidence for far future dates (uncertainty increases)
  const daysInFuture = differenceInDays(date, new Date());
  if (daysInFuture > 14) {
    confidence -= Math.min(30, (daysInFuture - 14) * 2);
  }

  return {
    available: true,
    remainingCapacity: capacityRules.maxJobsPerDay - jobsOnThisDay.length,
    confidence,
  };
}
```

---

## Calendar Integration

### Working Days & Hours

```typescript
interface WorkingCalendar {
  teamId: UUID;
  effectiveFrom: Date;
  effectiveTo?: Date;
  workingDays: {
    monday: WorkingHours;
    tuesday: WorkingHours;
    wednesday: WorkingHours;
    thursday: WorkingHours;
    friday: WorkingHours;
    saturday: WorkingHours | null;
    sunday: WorkingHours | null;
  };
  timeZone: string;
}

interface WorkingHours {
  enabled: boolean;
  morningStart: string;    // e.g., "08:00"
  morningEnd: string;      // e.g., "12:00"
  afternoonStart: string;  // e.g., "13:00"
  afternoonEnd: string;    // e.g., "17:00"
}
```

**Example**:
```json
{
  "teamId": "team-123",
  "effectiveFrom": "2025-01-01",
  "workingDays": {
    "monday": {
      "enabled": true,
      "morningStart": "08:00",
      "morningEnd": "12:00",
      "afternoonStart": "13:00",
      "afternoonEnd": "17:00"
    },
    "saturday": {
      "enabled": true,
      "morningStart": "09:00",
      "morningEnd": "12:00",
      "afternoonStart": null,
      "afternoonEnd": null
    },
    "sunday": null
  },
  "timeZone": "Europe/Paris"
}
```

### Holiday Calendar

```typescript
// France 2025 Public Holidays Example
const holidays2025FR: Holiday[] = [
  { date: '2025-01-01', name: 'New Year\'s Day', type: 'national' },
  { date: '2025-04-21', name: 'Easter Monday', type: 'national' },
  { date: '2025-05-01', name: 'Labour Day', type: 'national' },
  { date: '2025-05-08', name: 'Victory in Europe Day', type: 'national' },
  { date: '2025-05-29', name: 'Ascension Day', type: 'national' },
  { date: '2025-06-09', name: 'Whit Monday', type: 'national' },
  { date: '2025-07-14', name: 'Bastille Day', type: 'national' },
  { date: '2025-08-15', name: 'Assumption of Mary', type: 'national' },
  { date: '2025-11-01', name: 'All Saints\' Day', type: 'national' },
  { date: '2025-11-11', name: 'Armistice Day', type: 'national' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'national' },
];
```

### Store Closures

```typescript
interface StoreClosure {
  id: UUID;
  storeId: UUID;
  startDate: Date;
  endDate: Date;
  reason: 'inventory' | 'renovation' | 'emergency' | 'other';
  affectsScheduling: boolean; // If false, only store ops affected, not FSM
}

// Example: Store closed for inventory
{
  "storeId": "LM-FR-PARIS-001",
  "startDate": "2025-02-15",
  "endDate": "2025-02-17",
  "reason": "inventory",
  "affectsScheduling": false  // Technicians can still work
}
```

---

## Slot Granularity Rules

### AM/PM Slots (Far Future)

**When**: > 14 days in the future

**Rationale**:
- Far future = more uncertainty
- Avoid committing to specific hours too early
- Easier to manage changes

**Slots**:
- **AM**: 08:00-12:00
- **PM**: 13:00-17:00

### Hourly Slots (Near Future)

**When**: ≤ 14 days in the future

**Rationale**:
- Near future = more certainty
- Customer expects specific time commitment
- Better provider schedule optimization

**Slots**: Every hour within working hours
- 08:00-09:00
- 09:00-10:00
- 10:00-11:00
- ... etc.

### Granularity Decision Logic

```typescript
function determineSlotGranularity(
  slotDate: Date,
  searchStartDate: Date
): 'half_day' | 'hourly' {
  const daysInFuture = differenceInDays(slotDate, searchStartDate);

  if (daysInFuture > 14) {
    return 'half_day'; // AM/PM slots
  } else {
    return 'hourly';   // Specific hour slots
  }
}
```

---

## Multi-Person Job Scheduling

### Challenge

Some services require 2+ technicians working simultaneously:
- Heavy appliance installation (2 people)
- Complex bathroom renovation (2-3 people)
- Multi-room flooring (2 people for speed)

### Scheduling Logic

```typescript
interface MultiPersonJobRequirements {
  minimumPeople: number;
  maximumPeople: number;
  requireSameProvider: boolean;  // Must be from same provider?
  skillsRequired: string[];
}

async function searchMultiPersonSlots(
  requirements: MultiPersonJobRequirements,
  searchInput: SlotSearchInput
): Promise<MultiPersonSlot[]> {
  const slots: MultiPersonSlot[] = [];

  // Find teams that can work together
  const eligibleTeams = await getEligibleTeams(searchInput);

  // Group teams by provider if required
  const teamGroups = requirements.requireSameProvider
    ? groupBy(eligibleTeams, 'providerId')
    : [eligibleTeams]; // All teams in one group

  for (const group of teamGroups) {
    // Find overlapping availability across multiple teams
    const overlappingSlots = await findOverlappingAvailability(
      group,
      searchInput,
      requirements.minimumPeople
    );

    slots.push(...overlappingSlots);
  }

  return slots;
}

async function findOverlappingAvailability(
  teams: WorkTeam[],
  searchInput: SlotSearchInput,
  minimumPeople: number
): Promise<MultiPersonSlot[]> {
  const multiSlots: MultiPersonSlot[] = [];

  // Get availability for each team
  const teamAvailabilities = await Promise.all(
    teams.map(team =>
      searchAvailableSlots({
        ...searchInput,
        teamId: team.id,
      })
    )
  );

  // Find time slots where >= minimumPeople teams are available
  const allDates = Array.from(
    new Set(
      teamAvailabilities.flat().map(slot => slot.date.toISOString())
    )
  ).map(d => new Date(d));

  for (const date of allDates) {
    const availableOnDate = teamAvailabilities.map(
      slots => slots.filter(s => isSameDay(s.date, date))
    );

    // Find overlapping time windows
    const overlapping = findOverlappingTimeWindows(
      availableOnDate,
      minimumPeople
    );

    multiSlots.push(...overlapping.map(overlap => ({
      date,
      teams: overlap.teams,
      timeWindow: overlap.timeWindow,
      totalPeople: overlap.teams.length,
    })));
  }

  return multiSlots;
}
```

---

## Buffer Transparency

### Why Transparency Matters

Users (customers, operators, providers) need to understand why:
- Certain dates are available
- Certain dates are NOT available
- What buffer applies and why

### Transparency Response Structure

```typescript
interface AvailabilityResponse {
  availableSlots: Slot[];
  unavailableReasons: UnavailableReason[];
  bufferExplanation: BufferExplanation;
}

interface UnavailableReason {
  date: Date;
  reason: string;
  category: 'buffer' | 'holiday' | 'capacity' | 'closure';
  details: string;
}

interface BufferExplanation {
  earliestPossibleDate: Date;
  buffers: {
    global: {
      days: number;
      reason: string;
    };
    static?: {
      days: number;
      reason: string;
    };
    commute?: {
      minutes: number;
      reason: string;
    };
  };
  totalBufferDays: number;
  summary: string;
}
```

### Example Transparency Response

```json
{
  "availableSlots": [
    {
      "date": "2025-01-28",
      "timeWindow": { "start": "AM", "end": "AM" },
      "providerId": "prov-123",
      "teamId": "team-456"
    }
  ],
  "unavailableReasons": [
    {
      "date": "2025-01-18",
      "reason": "Global buffer: minimum 3 days advance notice",
      "category": "buffer",
      "details": "Order created on 2025-01-15, earliest scheduling is 2025-01-18"
    },
    {
      "date": "2025-01-20",
      "reason": "Product buffer: custom kitchen requires 7 days preparation",
      "category": "buffer",
      "details": "Product delivery on 2025-01-20, installation can start 2025-01-27"
    },
    {
      "date": "2025-01-25",
      "reason": "Provider capacity: maximum jobs per day reached",
      "category": "capacity",
      "details": "Team already has 4 jobs scheduled (max allowed)"
    },
    {
      "date": "2025-12-25",
      "reason": "Holiday: Christmas Day",
      "category": "holiday",
      "details": "National holiday in France"
    }
  ],
  "bufferExplanation": {
    "earliestPossibleDate": "2025-01-27",
    "buffers": {
      "global": {
        "days": 3,
        "reason": "Minimum advance notice for installation services in France"
      },
      "static": {
        "days": 7,
        "reason": "Custom kitchen requires fabrication and preparation time"
      }
    },
    "totalBufferDays": 12,
    "summary": "Earliest scheduling is 2025-01-27. This accounts for 3 days global buffer (minimum advance notice) and 7 days static buffer (custom kitchen preparation time)."
  }
}
```

---

## Configuration Data Model

### Database Schema

```sql
-- Global/Advance Buffers
CREATE TABLE buffer_global_configs (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  bu_code VARCHAR(50) NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  buffer_days INTEGER NOT NULL,
  buffer_hours INTEGER DEFAULT 0,
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(country_code, bu_code, service_type, effective_from)
);

-- Static/Product Buffers
CREATE TABLE buffer_static_configs (
  id UUID PRIMARY KEY,
  product_id VARCHAR(100),
  product_category VARCHAR(100),
  country_code VARCHAR(2),
  buffer_days INTEGER NOT NULL,
  buffer_hours INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Commute Buffer Settings
CREATE TABLE buffer_commute_configs (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  calculation_method VARCHAR(20) NOT NULL, -- 'api', 'distance', 'fixed'
  api_provider VARCHAR(50),                -- 'google_maps', 'mapbox'
  avg_speed_km_per_hour INTEGER,
  fixed_buffer_minutes INTEGER,
  max_commute_minutes INTEGER DEFAULT 90,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(country_code)
);

-- Holiday Calendar
CREATE TABLE holidays (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,            -- 'national', 'regional', 'religious'
  affected_regions TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(country_code, date)
);

-- Store Closures
CREATE TABLE store_closures (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(100) NOT NULL,
  affects_scheduling BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Provider Blocks
CREATE TABLE provider_blocks (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id),
  team_id UUID REFERENCES work_teams(id),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reason VARCHAR(100) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_buffer_global_lookup ON buffer_global_configs(country_code, bu_code, service_type);
CREATE INDEX idx_buffer_static_product ON buffer_static_configs(product_id);
CREATE INDEX idx_holidays_country_date ON holidays(country_code, date);
CREATE INDEX idx_store_closures_date_range ON store_closures(store_id, start_date, end_date);
CREATE INDEX idx_provider_blocks_date_range ON provider_blocks(provider_id, start_date, end_date);
```

### Configuration Versioning

```typescript
interface BufferConfigVersion {
  id: UUID;
  configType: 'global' | 'static' | 'commute';
  configId: UUID;
  effectiveFrom: Date;
  effectiveTo?: Date;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  changedBy: UUID;
  reason: string;
}

// When updating buffer configuration
async function updateBufferConfig(
  configId: UUID,
  newConfig: Partial<BufferConfig>,
  effectiveFrom: Date,
  changedBy: UUID,
  reason: string
): Promise<void> {
  // 1. End-date current config
  await db.bufferConfigs.update({
    where: { id: configId },
    data: { effectiveTo: subDays(effectiveFrom, 1) }
  });

  // 2. Create new config version
  await db.bufferConfigs.create({
    data: {
      ...newConfig,
      effectiveFrom,
      changedBy,
    }
  });

  // 3. Log change in version history
  await db.bufferConfigVersions.create({
    data: {
      configId,
      effectiveFrom,
      changes: detectChanges(oldConfig, newConfig),
      changedBy,
      reason,
    }
  });
}
```

---

## Edge Cases & Special Scenarios

### 1. Same-Day Service

**Scenario**: Customer orders at 10:00, wants service today

**Business Rule**:
- Global buffer still applies (minimum 3 days in most countries)
- Exception: Emergency services (rework, urgent repairs) may allow same-day

**Implementation**:
```typescript
if (requestedDate === orderCreatedDate && serviceType !== 'emergency') {
  throw new BusinessRuleViolation(
    `Same-day scheduling not allowed for ${serviceType}. ` +
    `Minimum ${globalBuffer} days advance notice required.`
  );
}
```

### 2. Past Date Request

**Scenario**: API receives scheduling request for date in the past

**Business Rule**: Reject with clear error

**Implementation**:
```typescript
if (requestedDate < new Date()) {
  throw new ValidationError(
    `Cannot schedule in the past. Requested date: ${requestedDate}, Current date: ${new Date()}`
  );
}
```

### 3. Product Delivery After Requested Date

**Scenario**: Customer wants installation on Jan 25, but product delivers Jan 30

**Business Rule**: Show earliest available date (Jan 30 + static buffer)

**Response**:
```json
{
  "availableSlots": [],
  "error": {
    "code": "PRODUCT_NOT_DELIVERED",
    "message": "Product delivery date (2025-01-30) is after requested installation date (2025-01-25)",
    "earliestPossibleDate": "2025-02-06",
    "explanation": "Product delivery on 2025-01-30 + 7 days static buffer = 2025-02-06"
  }
}
```

### 4. No Available Providers

**Scenario**: All providers in zone are at capacity

**Business Rule**: Return empty slots with transparency

**Response**:
```json
{
  "availableSlots": [],
  "unavailableReasons": [
    {
      "dateRange": { "start": "2025-01-27", "end": "2025-02-10" },
      "reason": "All providers in zone PARIS-16 at maximum capacity",
      "category": "capacity",
      "details": "3 providers available in zone, all at max jobs per day (4) for entire search window"
    }
  ],
  "suggestedActions": [
    "Expand search to nearby zones (PARIS-17, PARIS-15)",
    "Extend search window beyond 2025-02-10",
    "Contact support for priority scheduling"
  ]
}
```

### 5. Weekend vs. Weekday Scheduling

**Scenario**: Some teams work weekends, others don't

**Business Rule**: Only show slots for teams with weekend availability enabled

**Implementation**:
```typescript
function isWorkingDay(date: Date, calendar: WorkingCalendar): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];

  const workingHours = calendar.workingDays[dayName];

  return workingHours !== null && workingHours.enabled === true;
}
```

---

## API Examples

### Search Available Slots

**Request**:
```http
POST /api/v1/scheduling/availability
Content-Type: application/json

{
  "serviceType": "installation",
  "productId": "KITCHEN-CUSTOM-FR",
  "productDeliveryDate": "2025-01-20",
  "zone": "PARIS-16",
  "countryCode": "FR",
  "buCode": "LEROY_MERLIN",
  "dateRange": {
    "start": "2025-01-15",
    "end": "2025-02-15"
  },
  "estimatedDurationMinutes": 240,
  "multiPerson": false
}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "availableSlots": [
    {
      "providerId": "prov-123",
      "providerName": "InstallPro Services",
      "teamId": "team-456",
      "teamName": "Team Alpha",
      "date": "2025-01-28",
      "timeWindow": { "start": "AM", "end": "AM" },
      "granularity": "half_day",
      "capacity": 2,
      "confidence": 95
    },
    {
      "providerId": "prov-123",
      "providerName": "InstallPro Services",
      "teamId": "team-456",
      "teamName": "Team Alpha",
      "date": "2025-01-28",
      "timeWindow": { "start": "PM", "end": "PM" },
      "granularity": "half_day",
      "capacity": 3,
      "confidence": 95
    },
    {
      "providerId": "prov-789",
      "providerName": "Quality Install Co",
      "teamId": "team-101",
      "teamName": "Team Beta",
      "date": "2025-01-29",
      "timeWindow": { "start": "09:00", "end": "10:00" },
      "granularity": "hourly",
      "capacity": 1,
      "confidence": 90
    }
  ],
  "bufferExplanation": {
    "earliestPossibleDate": "2025-01-27",
    "buffers": {
      "global": {
        "days": 3,
        "reason": "Minimum advance notice for installation services in France"
      },
      "static": {
        "days": 7,
        "reason": "Custom kitchen requires fabrication and preparation time"
      }
    },
    "totalBufferDays": 12,
    "summary": "Earliest scheduling is 2025-01-27 (product delivery 2025-01-20 + 7 days preparation)."
  },
  "searchMetadata": {
    "searchDurationMs": 245,
    "providersEvaluated": 5,
    "slotsEvaluated": 120,
    "slotsReturned": 3
  }
}
```

---

## Summary

The Scheduling & Buffer Logic provides:

✅ **Comprehensive Buffer System**: Global, static, commute, and holiday buffers
✅ **Intelligent Slot Generation**: AM/PM for far future, hourly for near future
✅ **Calendar Integration**: Working days, holidays, store closures, provider blocks
✅ **Capacity Management**: Max jobs per day, max hours per week
✅ **Multi-Person Support**: Coordinated scheduling for jobs requiring 2+ technicians
✅ **Full Transparency**: Detailed explanations for why dates are/aren't available
✅ **Configurable Rules**: Country, BU, and product-specific buffer configurations
✅ **Performance**: < 500ms slot search (p95) with caching
✅ **Edge Case Handling**: Same-day requests, past dates, no availability scenarios

**Implementation Timeline**: 3-4 weeks for complete scheduling service with all buffer logic

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-16
**Owner**: Scheduling Team
**Reviewers**: Product Team, Engineering Leads
