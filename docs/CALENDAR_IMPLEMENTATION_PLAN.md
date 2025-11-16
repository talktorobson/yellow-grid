# AHS Calendar - TypeScript Implementation Plan (Embedded Module)

**Document Version**: 1.0
**Date**: 2025-01-16
**Strategy**: Embed AHS Calendar as Module in Yellow Grid Platform
**Status**: Implementation Ready
**Total Effort**: 10-16 weeks (Team of 2-3 engineers)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Structure](#2-module-structure)
3. [Data Model & Migrations](#3-data-model--migrations)
4. [Redis Implementation](#4-redis-implementation)
5. [Core Algorithms (TypeScript)](#5-core-algorithms-typescript)
6. [API Endpoints](#6-api-endpoints)
7. [Nager.Date Integration](#7-nagerdate-integration)
8. [Event Publishing](#8-event-publishing)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)
11. [Migration from Current System](#11-migration-from-current-system)

---

## 1. Architecture Overview

### 1.1 Embedded Module Approach

```
yellow-grid/
├── src/
│   ├── assignment/           # Existing: Assignment funnel
│   ├── scheduling/           # Existing: Scheduling logic
│   │
│   ├── calendar/             # NEW: AHS Calendar Module
│   │   ├── availability/
│   │   │   ├── availability.service.ts
│   │   │   ├── availability.controller.ts
│   │   │   └── slot-aggregator.ts
│   │   │
│   │   ├── booking/
│   │   │   ├── booking.service.ts
│   │   │   ├── booking.controller.ts
│   │   │   ├── pre-booking.manager.ts
│   │   │   └── atomic-placement.ts
│   │   │
│   │   ├── engine/
│   │   │   ├── bitmap.service.ts          # Redis bitmap ops
│   │   │   ├── slot-calculator.ts         # 15-min slot math
│   │   │   ├── has-start.algorithm.ts     # Core availability
│   │   │   └── buffer.calculator.ts        # Travel buffers
│   │   │
│   │   ├── holiday/
│   │   │   ├── holiday.service.ts
│   │   │   ├── nager-date.client.ts
│   │   │   ├── holiday-sync.cron.ts
│   │   │   └── holiday-override.service.ts
│   │   │
│   │   ├── config/
│   │   │   ├── calendar-config.service.ts
│   │   │   ├── calendar-config.controller.ts
│   │   │   └── draft-publish.workflow.ts
│   │   │
│   │   ├── events/
│   │   │   ├── calendar-event.publisher.ts
│   │   │   └── event-outbox.service.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── booking.entity.ts
│   │   │   ├── holiday.entity.ts
│   │   │   ├── calendar-config.entity.ts
│   │   │   └── idempotency.entity.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── availability.dto.ts
│   │   │   ├── booking.dto.ts
│   │   │   └── calendar-config.dto.ts
│   │   │
│   │   └── calendar.module.ts
│   │
│   └── ...
│
├── prisma/
│   ├── migrations/
│   │   └── 20250116_add_calendar_tables/
│   │       └── migration.sql
│   └── schema.prisma
│
└── ...
```

### 1.2 Integration Points

```
┌────────────────────────────────────────────────────────────┐
│                   YELLOW GRID PLATFORM                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐         ┌─────────────────┐         │
│  │   Assignment    │         │   Scheduling    │         │
│  │     Module      │────────▶│     Module      │         │
│  │  (Existing)     │         │   (Existing)    │         │
│  └─────────────────┘         └─────────────────┘         │
│           │                           │                   │
│           │ eligibleTeams[]          │ date/slot         │
│           │ durationMinutes          │                   │
│           ▼                           ▼                   │
│  ┌──────────────────────────────────────────────┐        │
│  │         CALENDAR MODULE (NEW)                │        │
│  │                                              │        │
│  │  AvailabilityService  ←→  BitmapService     │        │
│  │          │                      │            │        │
│  │          ▼                      ▼            │        │
│  │  BookingService  ←→  AtomicPlacement        │        │
│  │          │                      │            │        │
│  │          ▼                      ▼            │        │
│  │  HolidayService  ←→  NagerDateClient        │        │
│  └──────────────────────────────────────────────┘        │
│           │                           │                   │
│           ▼                           ▼                   │
│  ┌────────────────┐         ┌────────────────┐          │
│  │   PostgreSQL   │         │     Redis      │          │
│  │   (Prisma)     │         │   (ioredis)    │          │
│  └────────────────┘         └────────────────┘          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Module Structure

### 2.1 Calendar Module (NestJS)

**File**: `src/calendar/calendar.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { KafkaModule } from '../kafka/kafka.module';

import { AvailabilityController } from './availability/availability.controller';
import { AvailabilityService } from './availability/availability.service';
import { SlotAggregator } from './availability/slot-aggregator';

import { BookingController } from './booking/booking.controller';
import { BookingService } from './booking/booking.service';
import { PreBookingManager } from './booking/pre-booking.manager';
import { AtomicPlacement } from './booking/atomic-placement';

import { BitmapService } from './engine/bitmap.service';
import { SlotCalculator } from './engine/slot-calculator';
import { HasStartAlgorithm } from './engine/has-start.algorithm';
import { BufferCalculator } from './engine/buffer.calculator';

import { HolidayService } from './holiday/holiday.service';
import { NagerDateClient } from './holiday/nager-date.client';
import { HolidaySyncCron } from './holiday/holiday-sync.cron';
import { HolidayOverrideService } from './holiday/holiday-override.service';

import { CalendarConfigController } from './config/calendar-config.controller';
import { CalendarConfigService } from './config/calendar-config.service';
import { DraftPublishWorkflow } from './config/draft-publish.workflow';

import { CalendarEventPublisher } from './events/calendar-event.publisher';
import { EventOutboxService } from './events/event-outbox.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RedisModule,
    PrismaModule,
    KafkaModule,
  ],
  controllers: [
    AvailabilityController,
    BookingController,
    CalendarConfigController,
  ],
  providers: [
    // Availability
    AvailabilityService,
    SlotAggregator,

    // Booking
    BookingService,
    PreBookingManager,
    AtomicPlacement,

    // Engine
    BitmapService,
    SlotCalculator,
    HasStartAlgorithm,
    BufferCalculator,

    // Holiday
    HolidayService,
    NagerDateClient,
    HolidaySyncCron,
    HolidayOverrideService,

    // Config
    CalendarConfigService,
    DraftPublishWorkflow,

    // Events
    CalendarEventPublisher,
    EventOutboxService,
  ],
  exports: [
    AvailabilityService,
    BookingService,
    HolidayService,
    CalendarConfigService,
  ],
})
export class CalendarModule {}
```

---

## 3. Data Model & Migrations

### 3.1 Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
// ============================================================================
// CALENDAR MODULE ENTITIES
// ============================================================================

model Booking {
  id                String         @id @default(uuid()) @map("booking_id")
  status            BookingStatus

  // Customer
  customerId        String?        @map("customer_id")
  customerName      String?        @map("customer_name")
  customerEmail     String?        @map("customer_email")
  customerPhone     String?        @map("customer_phone")
  customerPostalCode String        @map("customer_postal_code")

  // Provider & Worker
  providerId        Int?           @map("provider_id")
  providerName      String?        @map("provider_name")
  workerId          Int?           @map("worker_id")
  workerName        String?        @map("worker_name")

  // Scheduling
  date              DateTime       @db.Date
  shift             String         @db.VarChar(10) // M, A, E (or AM, PM, EV)
  durationMinutes   Int            @map("duration_minutes")
  maySpanDays       Boolean        @default(false) @map("may_span_days")

  // Service
  serviceExecutionId String?       @map("service_execution_id")
  services          Json?          // Array of {serviceCode, serviceQuantity}

  // Pre-booking
  expiresAt         DateTime?      @map("expires_at")

  // Metadata
  bu                String         @db.VarChar(20)
  timezone          String         @db.VarChar(50)
  createdBy         String         @map("created_by")

  // Applied buffers
  travelBufferStart Int?           @map("travel_buffer_start")
  travelBufferEnd   Int?           @map("travel_buffer_end")

  // Audit
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt @map("updated_at")

  @@index([workerId, date])
  @@index([providerId, date])
  @@index([status, expiresAt])
  @@index([serviceExecutionId])
  @@map("bookings")
}

enum BookingStatus {
  PRE_BOOKED
  CONFIRMED
  EXPIRED
  CANCELLED
}

// ============================================================================

model Holiday {
  country        String   @db.VarChar(3)
  region         String?  @db.VarChar(10)
  date           DateTime @db.Date
  name           String   @db.VarChar(255)
  sourceVersion  String   @map("source_version") @db.VarChar(50)

  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@id([country, region, date])
  @@index([country, date])
  @@map("holidays")
}

model HolidayOverride {
  id             String          @id @default(uuid())
  country        String          @db.VarChar(3)
  region         String?         @db.VarChar(10)
  date           DateTime        @db.Date
  overrideType   OverrideType    @map("override_type")
  name           String?         @db.VarChar(255)
  note           String?         @db.Text

  effectiveFrom  DateTime?       @map("effective_from") @db.Date
  effectiveTo    DateTime?       @map("effective_to") @db.Date

  createdBy      String          @map("created_by")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  @@index([country, region, date])
  @@map("holiday_overrides")
}

enum OverrideType {
  add
  remove
}

// ============================================================================

model CalendarConfig {
  bu                String   @id @db.VarChar(20)
  version           Int      @default(1)

  timezone          String   @db.VarChar(50)
  workingDays       Json     // ["MON", "TUE", "WED", "THU", "FRI"]
  shifts            Json     // [{code:"M",startLocal:"08:00",endLocal:"13:00",enabled:true}]
  lunch             Json?    // {startLocal:"13:00",endLocal:"14:00"}

  // Buffers
  buffers           Json     // {globalBufferNonWorkingDays:2,staticBufferNonWorkingDays:1,travelBufferMinutes:30}

  crossDayAllowed   Boolean  @default(true) @map("cross_day_allowed")
  region            String?  @db.VarChar(10)

  // Audit
  createdBy         String   @map("created_by")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("calendar_configs")
}

model CalendarConfigDraft {
  draftId    String        @id @default(uuid()) @map("draft_id")
  bu         String        @db.VarChar(20)
  configJson Json          @map("config_json")
  status     DraftStatus
  version    Int           @default(1) // For optimistic locking

  validationErrors Json?   @map("validation_errors")

  createdBy  String        @map("created_by")
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")

  @@unique([bu]) // Only one draft per BU
  @@map("calendar_config_drafts")
}

enum DraftStatus {
  DRAFT
  VALIDATING
  VALIDATED
  REJECTED
}

// ============================================================================

model Idempotency {
  key            String   @id @db.VarChar(100)
  requestHash    String   @map("request_hash") @db.VarChar(64)
  responseJson   Json     @map("response_json")
  status         String   @db.VarChar(20)
  expiresAt      DateTime @map("expires_at")

  createdAt      DateTime @default(now()) @map("created_at")

  @@index([expiresAt])
  @@map("idempotency")
}

model EventOutbox {
  id            String   @id @default(uuid())
  aggregateType String   @map("aggregate_type") @db.VarChar(50)
  aggregateId   String   @map("aggregate_id") @db.VarChar(100)
  eventType     String   @map("event_type") @db.VarChar(100)
  payload       Json
  status        String   @db.VarChar(20) // PENDING, PUBLISHED, FAILED

  createdAt     DateTime @default(now()) @map("created_at")
  publishedAt   DateTime? @map("published_at")

  @@index([status, createdAt])
  @@map("event_outbox")
}

model CustomerHoldCounter {
  customerId   String   @id @map("customer_id")
  activeHolds  Int      @default(0) @map("active_holds")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("customer_hold_counters")
}
```

### 3.2 Migration SQL

**File**: `prisma/migrations/20250116_add_calendar_tables/migration.sql`

```sql
-- ============================================================================
-- CALENDAR MODULE TABLES
-- ============================================================================

-- Bookings
CREATE TABLE bookings (
  booking_id UUID PRIMARY KEY,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PRE_BOOKED', 'CONFIRMED', 'EXPIRED', 'CANCELLED')),

  -- Customer
  customer_id VARCHAR(100),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_postal_code VARCHAR(20) NOT NULL,

  -- Provider & Worker
  provider_id INTEGER,
  provider_name VARCHAR(120),
  worker_id INTEGER,
  worker_name VARCHAR(120),

  -- Scheduling
  date DATE NOT NULL,
  shift VARCHAR(10) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  may_span_days BOOLEAN DEFAULT FALSE,

  -- Service
  service_execution_id VARCHAR(64),
  services JSONB,

  -- Pre-booking
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  bu VARCHAR(20) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  created_by VARCHAR(100) NOT NULL,

  -- Applied buffers
  travel_buffer_start INTEGER,
  travel_buffer_end INTEGER,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_worker_date ON bookings(worker_id, date);
CREATE INDEX idx_bookings_provider_date ON bookings(provider_id, date);
CREATE INDEX idx_bookings_status_expires ON bookings(status, expires_at);
CREATE INDEX idx_bookings_service_execution ON bookings(service_execution_id);

-- ============================================================================

-- Holidays
CREATE TABLE holidays (
  country VARCHAR(3) NOT NULL,
  region VARCHAR(10),
  date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  source_version VARCHAR(50) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (country, region, date)
);

CREATE INDEX idx_holidays_country_date ON holidays(country, date);

-- Holiday Overrides
CREATE TABLE holiday_overrides (
  id UUID PRIMARY KEY,
  country VARCHAR(3) NOT NULL,
  region VARCHAR(10),
  date DATE NOT NULL,
  override_type VARCHAR(10) NOT NULL CHECK (override_type IN ('add', 'remove')),
  name VARCHAR(255),
  note TEXT,

  effective_from DATE,
  effective_to DATE,

  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_holiday_overrides_country_region ON holiday_overrides(country, region, date);

-- ============================================================================

-- Calendar Configs
CREATE TABLE calendar_configs (
  bu VARCHAR(20) PRIMARY KEY,
  version INTEGER DEFAULT 1,

  timezone VARCHAR(50) NOT NULL,
  working_days JSONB NOT NULL,
  shifts JSONB NOT NULL,
  lunch JSONB,

  buffers JSONB NOT NULL,

  cross_day_allowed BOOLEAN DEFAULT TRUE,
  region VARCHAR(10),

  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar Config Drafts
CREATE TABLE calendar_config_drafts (
  draft_id UUID PRIMARY KEY,
  bu VARCHAR(20) NOT NULL,
  config_json JSONB NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'VALIDATING', 'VALIDATED', 'REJECTED')),
  version INTEGER DEFAULT 1,

  validation_errors JSONB,

  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(bu)
);

-- ============================================================================

-- Idempotency
CREATE TABLE idempotency (
  key VARCHAR(100) PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL,
  response_json JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_idempotency_expires ON idempotency(expires_at);

-- Event Outbox
CREATE TABLE event_outbox (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_event_outbox_status ON event_outbox(status, created_at);

-- Customer Hold Counter
CREATE TABLE customer_hold_counters (
  customer_id VARCHAR(100) PRIMARY KEY,
  active_holds INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Redis Implementation

### 4.1 Bitmap Service

**File**: `src/calendar/engine/bitmap.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class BitmapService {
  private readonly SLOTS_PER_DAY = 96; // 24 hours * 4 (15-min slots)

  constructor(private readonly redis: RedisService) {}

  /**
   * Get or create bitmap for work team on specific date
   * Key format: wt:{workerId}:day:{YYYYMMDD}
   */
  async getBitmap(workerId: number, date: string): Promise<Buffer> {
    const key = this.getBitmapKey(workerId, date);
    const bitmap = await this.redis.getBuffer(key);

    if (!bitmap) {
      // Create empty bitmap (12 bytes = 96 bits)
      return Buffer.alloc(12, 0);
    }

    return bitmap;
  }

  /**
   * Set bitmap for work team on specific date
   */
  async setBitmap(workerId: number, date: string, bitmap: Buffer): Promise<void> {
    const key = this.getBitmapKey(workerId, date);
    await this.redis.set(key, bitmap);
    // Set TTL to 90 days (auto-cleanup old bitmaps)
    await this.redis.expire(key, 90 * 24 * 60 * 60);
  }

  /**
   * Get bit value at specific slot index (0-95)
   */
  getBit(bitmap: Buffer, slotIndex: number): number {
    if (slotIndex < 0 || slotIndex >= this.SLOTS_PER_DAY) {
      throw new Error(`Slot index ${slotIndex} out of range (0-95)`);
    }

    const byteIndex = Math.floor(slotIndex / 8);
    const bitIndex = 7 - (slotIndex % 8); // Big-endian bit ordering

    const byte = bitmap[byteIndex];
    return (byte >> bitIndex) & 1;
  }

  /**
   * Set bit value at specific slot index (0-95)
   */
  setBit(bitmap: Buffer, slotIndex: number, value: 0 | 1): Buffer {
    if (slotIndex < 0 || slotIndex >= this.SLOTS_PER_DAY) {
      throw new Error(`Slot index ${slotIndex} out of range (0-95)`);
    }

    // Clone buffer to avoid mutation
    const newBitmap = Buffer.from(bitmap);

    const byteIndex = Math.floor(slotIndex / 8);
    const bitIndex = 7 - (slotIndex % 8);

    if (value === 1) {
      newBitmap[byteIndex] |= (1 << bitIndex); // Set bit
    } else {
      newBitmap[byteIndex] &= ~(1 << bitIndex); // Clear bit
    }

    return newBitmap;
  }

  /**
   * Set multiple bits (for booking a range of slots)
   */
  setBits(bitmap: Buffer, startSlot: number, endSlot: number, value: 0 | 1): Buffer {
    let newBitmap = Buffer.from(bitmap);

    for (let i = startSlot; i < endSlot; i++) {
      newBitmap = this.setBit(newBitmap, i, value);
    }

    return newBitmap;
  }

  /**
   * Check if all bits in range are free (0)
   */
  areSlotsFree(bitmap: Buffer, startSlot: number, endSlot: number): boolean {
    for (let i = startSlot; i < endSlot; i++) {
      if (this.getBit(bitmap, i) === 1) {
        return false; // Found busy slot
      }
    }
    return true; // All slots free
  }

  /**
   * Find first continuous free range of slots
   */
  findFreeRange(bitmap: Buffer, neededSlots: number, startFrom: number = 0): number | null {
    let run = 0;
    let candidateStart = -1;

    for (let i = startFrom; i < this.SLOTS_PER_DAY; i++) {
      if (this.getBit(bitmap, i) === 0) {
        if (run === 0) {
          candidateStart = i;
        }
        run++;

        if (run === neededSlots) {
          return candidateStart; // Found continuous free range
        }
      } else {
        run = 0; // Reset counter on busy slot
        candidateStart = -1;
      }
    }

    return null; // No continuous free range found
  }

  private getBitmapKey(workerId: number, date: string): string {
    return `wt:${workerId}:day:${date}`;
  }
}
```

---

### 4.2 Slot Calculator

**File**: `src/calendar/engine/slot-calculator.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

@Injectable()
export class SlotCalculator {
  private readonly SLOT_MINUTES = 15;
  private readonly SLOTS_PER_DAY = 96;

  /**
   * Calculate number of 15-min slots needed for duration
   * Rounds UP (61 min → 75 min = 5 slots)
   */
  slotsForDuration(durationMinutes: number): number {
    return Math.ceil(durationMinutes / this.SLOT_MINUTES);
  }

  /**
   * Convert local time to slot index (0-95)
   * Example: "08:00" → 32, "13:45" → 55
   */
  timeToSlotIndex(timeLocal: string, timezone: string): number {
    const dt = DateTime.fromISO(`2025-01-01T${timeLocal}`, { zone: timezone });
    const minutesSinceMidnight = dt.hour * 60 + dt.minute;
    return Math.floor(minutesSinceMidnight / this.SLOT_MINUTES);
  }

  /**
   * Convert slot index to local time
   * Example: 32 → "08:00", 55 → "13:45"
   */
  slotIndexToTime(slotIndex: number): string {
    const totalMinutes = slotIndex * this.SLOT_MINUTES;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get shift window indices (start and end slot index)
   */
  getShiftIndices(shift: { startLocal: string; endLocal: string }, timezone: string): { startIdx: number; endIdx: number } {
    const startIdx = this.timeToSlotIndex(shift.startLocal, timezone);
    const endIdx = this.timeToSlotIndex(shift.endLocal, timezone);
    return { startIdx, endIdx };
  }

  /**
   * Format date as YYYYMMDD for Redis keys
   */
  formatDateKey(date: Date | DateTime): string {
    const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
    return dt.toFormat('yyyyMMdd');
  }

  /**
   * Add days to date
   */
  addDays(date: DateTime, days: number): DateTime {
    return date.plus({ days });
  }

  /**
   * Calculate spanned slots across multiple days
   */
  calculateSpannedSlots(
    startDate: DateTime,
    startSlotIndex: number,
    totalSlots: number
  ): Array<{ date: string; startSlot: number; endSlot: number }> {
    const spans: Array<{ date: string; startSlot: number; endSlot: number }> = [];
    let remainingSlots = totalSlots;
    let currentSlot = startSlotIndex;
    let currentDate = startDate;

    while (remainingSlots > 0) {
      const slotsInDay = Math.min(this.SLOTS_PER_DAY - currentSlot, remainingSlots);

      spans.push({
        date: this.formatDateKey(currentDate),
        startSlot: currentSlot,
        endSlot: currentSlot + slotsInDay,
      });

      remainingSlots -= slotsInDay;

      if (remainingSlots > 0) {
        currentDate = this.addDays(currentDate, 1);
        currentSlot = 0; // Start of next day
      }
    }

    return spans;
  }
}
```

---

## 5. Core Algorithms (TypeScript)

### 5.1 HasStart Algorithm

**File**: `src/calendar/engine/has-start.algorithm.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { BitmapService } from './bitmap.service';
import { SlotCalculator } from './slot-calculator';

interface HasStartInput {
  workerId: number;
  date: string; // YYYYMMDD
  shiftStartIdx: number;
  shiftEndIdx: number;
  neededSlots: number;
  travelBufferSlots: number;
  crossDayAllowed: boolean;
}

interface HasStartResult {
  feasible: boolean;
  startSlot?: number;
  maySpanDays: boolean;
  spannedDays?: string[];
}

@Injectable()
export class HasStartAlgorithm {
  constructor(
    private readonly bitmapService: BitmapService,
    private readonly slotCalculator: SlotCalculator
  ) {}

  /**
   * Core algorithm: Can job START in this shift and run for needed duration?
   */
  async hasStart(input: HasStartInput): Promise<HasStartResult> {
    const { workerId, date, shiftStartIdx, shiftEndIdx, neededSlots, travelBufferSlots, crossDayAllowed } = input;

    // Load bitmap for current day
    const bitmap = await this.bitmapService.getBitmap(workerId, date);

    // Search for continuous free slots starting within shift window
    for (let startIdx = shiftStartIdx; startIdx < shiftEndIdx; startIdx++) {
      const result = await this.checkStartSlot({
        workerId,
        startDate: date,
        startSlot: startIdx,
        neededSlots,
        travelBufferSlots,
        crossDayAllowed,
        bitmap,
      });

      if (result.feasible) {
        return result;
      }
    }

    return { feasible: false, maySpanDays: false };
  }

  private async checkStartSlot(params: {
    workerId: number;
    startDate: string;
    startSlot: number;
    neededSlots: number;
    travelBufferSlots: number;
    crossDayAllowed: boolean;
    bitmap: Buffer;
  }): Promise<HasStartResult> {
    const { workerId, startDate, startSlot, neededSlots, travelBufferSlots, crossDayAllowed } = params;

    // Calculate spanned slots (may cross days)
    const spans = this.slotCalculator.calculateSpannedSlots(
      this.slotCalculator.addDays(this.parseDate(startDate), 0),
      startSlot,
      neededSlots
    );

    // If crosses days but not allowed → not feasible
    if (spans.length > 1 && !crossDayAllowed) {
      return { feasible: false, maySpanDays: false };
    }

    // Check if all spanned slots are free (including travel buffers)
    for (const span of spans) {
      const bitmap = span.date === startDate ? params.bitmap : await this.bitmapService.getBitmap(workerId, span.date);

      // Apply travel buffer before start slot (only on first day)
      const effectiveStart = span === spans[0] ? Math.max(0, span.startSlot - travelBufferSlots) : span.startSlot;

      // Apply travel buffer after end slot (only on last day)
      const effectiveEnd = span === spans[spans.length - 1] ? Math.min(96, span.endSlot + travelBufferSlots) : span.endSlot;

      // Check if all slots are free
      if (!this.bitmapService.areSlotsFree(bitmap, effectiveStart, effectiveEnd)) {
        return { feasible: false, maySpanDays: false };
      }
    }

    // All checks passed → feasible
    return {
      feasible: true,
      startSlot,
      maySpanDays: spans.length > 1,
      spannedDays: spans.map((s) => s.date),
    };
  }

  private parseDate(yyyymmdd: string): any {
    const year = parseInt(yyyymmdd.substring(0, 4));
    const month = parseInt(yyyymmdd.substring(4, 6));
    const day = parseInt(yyyymmdd.substring(6, 8));
    return { year, month, day };
  }
}
```

---

### 5.2 Atomic Placement (Redis Lua)

**File**: `src/calendar/booking/atomic-placement.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { SlotCalculator } from '../engine/slot-calculator';

interface PlacementInput {
  workerId: number;
  startDate: string; // YYYYMMDD
  startSlot: number;
  durationMinutes: number;
  travelBufferSlots: number;
  crossDayAllowed: boolean;
}

interface PlacementResult {
  success: boolean;
  error?: 'CAPACITY_CHANGED' | 'SLOT_NOT_BOOKABLE';
  slotsSet?: number;
}

@Injectable()
export class AtomicPlacement {
  constructor(
    private readonly redis: RedisService,
    private readonly slotCalculator: SlotCalculator
  ) {}

  /**
   * Atomic check-and-set using Redis Lua script
   */
  async atomicBookSlots(input: PlacementInput): Promise<PlacementResult> {
    const spans = this.slotCalculator.calculateSpannedSlots(
      this.parseDate(input.startDate),
      input.startSlot,
      this.slotCalculator.slotsForDuration(input.durationMinutes)
    );

    // Build Lua script arguments
    const keys: string[] = [];
    const args: (string | number)[] = [];

    for (const span of spans) {
      keys.push(`wt:${input.workerId}:day:${span.date}`);
      args.push(span.startSlot, span.endSlot, input.travelBufferSlots);
    }

    // Execute Lua script
    const luaScript = this.buildLuaScript(spans.length);
    const result = await this.redis.eval(luaScript, keys.length, ...keys, ...args);

    if (result === 'OK') {
      return { success: true, slotsSet: spans.reduce((sum, s) => sum + (s.endSlot - s.startSlot), 0) };
    } else {
      return { success: false, error: 'CAPACITY_CHANGED' };
    }
  }

  private buildLuaScript(numDays: number): string {
    return `
      -- Atomic booking placement across ${numDays} day(s)
      -- KEYS: wt:{id}:day:{YYYYMMDD} for each day
      -- ARGS: startSlot, endSlot, travelBuffer (repeated for each day)

      local function getBit(bitmap, slotIndex)
        local byteIndex = math.floor(slotIndex / 8)
        local bitIndex = 7 - (slotIndex % 8)
        local byte = string.byte(bitmap, byteIndex + 1)
        return bit.band(bit.rshift(byte, bitIndex), 1)
      end

      local function setBit(bitmap, slotIndex, value)
        local byteIndex = math.floor(slotIndex / 8)
        local bitIndex = 7 - (slotIndex % 8)
        local byte = string.byte(bitmap, byteIndex + 1)

        if value == 1 then
          byte = bit.bor(byte, bit.lshift(1, bitIndex))
        else
          byte = bit.band(byte, bit.bnot(bit.lshift(1, bitIndex)))
        end

        return string.sub(bitmap, 1, byteIndex) .. string.char(byte) .. string.sub(bitmap, byteIndex + 2)
      end

      -- Check all slots are free
      for dayIdx = 1, ${numDays} do
        local key = KEYS[dayIdx]
        local argOffset = (dayIdx - 1) * 3
        local startSlot = tonumber(ARGV[argOffset + 1])
        local endSlot = tonumber(ARGV[argOffset + 2])
        local travelBuffer = tonumber(ARGV[argOffset + 3])

        local bitmap = redis.call('GET', key)
        if not bitmap then
          bitmap = string.rep('\\0', 12) -- Empty bitmap (96 bits = 12 bytes)
        end

        -- Check with travel buffer
        local effectiveStart = math.max(0, startSlot - travelBuffer)
        local effectiveEnd = math.min(95, endSlot + travelBuffer - 1)

        for slot = effectiveStart, effectiveEnd do
          if getBit(bitmap, slot) == 1 then
            return redis.error_reply('CAPACITY_CHANGED at slot ' .. slot)
          end
        end
      end

      -- All slots free → set them to busy
      for dayIdx = 1, ${numDays} do
        local key = KEYS[dayIdx]
        local argOffset = (dayIdx - 1) * 3
        local startSlot = tonumber(ARGV[argOffset + 1])
        local endSlot = tonumber(ARGV[argOffset + 2])
        local travelBuffer = tonumber(ARGV[argOffset + 3])

        local bitmap = redis.call('GET', key)
        if not bitmap then
          bitmap = string.rep('\\0', 12)
        end

        local effectiveStart = math.max(0, startSlot - travelBuffer)
        local effectiveEnd = math.min(95, endSlot + travelBuffer - 1)

        for slot = effectiveStart, effectiveEnd do
          bitmap = setBit(bitmap, slot, 1)
        end

        redis.call('SET', key, bitmap)
        redis.call('EXPIRE', key, 7776000) -- 90 days TTL
      end

      return 'OK'
    `;
  }

  private parseDate(yyyymmdd: string): any {
    // Similar to HasStartAlgorithm
    const year = parseInt(yyyymmdd.substring(0, 4));
    const month = parseInt(yyyymmdd.substring(4, 6));
    const day = parseInt(yyyymmdd.substring(6, 8));
    return { year, month, day };
  }
}
```

---

## 6. API Endpoints

### 6.1 Availability Controller

**File**: `src/calendar/availability/availability.controller.ts`

```typescript
import { Controller, Post, Body, Query } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('calendar')
@Controller('api/v1/calendar/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * POST /api/v1/calendar/availability/check
   * Check availability for multiple workers across date range
   */
  @Post('check')
  @ApiOperation({ summary: 'Check availability for workers' })
  @ApiResponse({ status: 200, description: 'Availability results' })
  async checkAvailability(@Body() request: CheckAvailabilityRequest) {
    return this.availabilityService.checkAvailability(request);
  }

  /**
   * POST /api/v1/calendar/availability/aggregate
   * Aggregate availability at shift level (M, A, E)
   */
  @Post('aggregate')
  @ApiOperation({ summary: 'Get shift-level availability' })
  async getShiftAvailability(@Body() request: ShiftAvailabilityRequest) {
    return this.availabilityService.getShiftAvailability(request);
  }
}

interface CheckAvailabilityRequest {
  workerIds: number[];
  dateRangeStart: string; // ISO date
  dateRangeEnd: string;
  durationMinutes: number;
  shift: string; // M, A, E
  bu: string;
}

interface ShiftAvailabilityRequest {
  workerIds: number[];
  dateRangeStart: string;
  dateRangeEnd: string;
  bu: string;
}
```

**File**: `src/calendar/availability/availability.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { HasStartAlgorithm } from '../engine/has-start.algorithm';
import { SlotCalculator } from '../engine/slot-calculator';
import { HolidayService } from '../holiday/holiday.service';
import { CalendarConfigService } from '../config/calendar-config.service';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly hasStartAlgorithm: HasStartAlgorithm,
    private readonly slotCalculator: SlotCalculator,
    private readonly holidayService: HolidayService,
    private readonly configService: CalendarConfigService
  ) {}

  async checkAvailability(request: CheckAvailabilityRequest) {
    const config = await this.configService.getConfig(request.bu);
    const holidays = await this.holidayService.getHolidays(
      config.region,
      request.dateRangeStart,
      request.dateRangeEnd
    );

    const results = [];

    for (const workerId of request.workerIds) {
      let currentDate = DateTime.fromISO(request.dateRangeStart, { zone: config.timezone });
      const endDate = DateTime.fromISO(request.dateRangeEnd, { zone: config.timezone });

      const availableDates = [];

      while (currentDate <= endDate) {
        const dateStr = this.slotCalculator.formatDateKey(currentDate);

        // Skip holidays
        if (this.isHoliday(currentDate, holidays)) {
          currentDate = currentDate.plus({ days: 1 });
          continue;
        }

        // Skip non-working days
        if (!this.isWorkingDay(currentDate, config.workingDays)) {
          currentDate = currentDate.plus({ days: 1 });
          continue;
        }

        // Get shift config
        const shiftConfig = config.shifts.find((s) => s.code === request.shift);
        if (!shiftConfig || !shiftConfig.enabled) {
          currentDate = currentDate.plus({ days: 1 });
          continue;
        }

        const { startIdx, endIdx } = this.slotCalculator.getShiftIndices(shiftConfig, config.timezone);

        // Check if worker has availability
        const result = await this.hasStartAlgorithm.hasStart({
          workerId,
          date: dateStr,
          shiftStartIdx: startIdx,
          shiftEndIdx: endIdx,
          neededSlots: this.slotCalculator.slotsForDuration(request.durationMinutes),
          travelBufferSlots: this.slotCalculator.slotsForDuration(config.buffers.travelBufferMinutes),
          crossDayAllowed: config.crossDayAllowed,
        });

        if (result.feasible) {
          availableDates.push({
            date: currentDate.toISODate(),
            shift: request.shift,
            startSlot: result.startSlot,
            maySpanDays: result.maySpanDays,
          });
        }

        currentDate = currentDate.plus({ days: 1 });
      }

      results.push({
        workerId,
        availableDates,
        totalDays: availableDates.length,
      });
    }

    return { results };
  }

  private isHoliday(date: DateTime, holidays: any[]): boolean {
    const dateStr = date.toISODate();
    return holidays.some((h) => h.date === dateStr);
  }

  private isWorkingDay(date: DateTime, workingDays: string[]): boolean {
    const dayOfWeek = date.toFormat('ccc').toUpperCase(); // MON, TUE, ...
    return workingDays.includes(dayOfWeek);
  }

  async getShiftAvailability(request: ShiftAvailabilityRequest) {
    // Shift-level aggregation (implementation similar to checkAvailability)
    // Returns {date, shift, availableWorkers: number}
    // Used for calendar heatmaps
    return { shifts: [] };
  }
}
```

---

### 6.2 Booking Controller

**File**: `src/calendar/booking/booking.controller.ts`

```typescript
import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { BookingService } from './booking.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('calendar')
@Controller('api/v1/calendar/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * POST /api/v1/calendar/bookings/pre-book
   * Create pre-booking (hold) with 48h TTL
   */
  @Post('pre-book')
  @ApiOperation({ summary: 'Create pre-booking (hold)' })
  @ApiResponse({ status: 201, description: 'Pre-booking created' })
  async preBook(
    @Body() request: PreBookRequest,
    @Headers('idempotency-key') idempotencyKey: string
  ) {
    return this.bookingService.preBook(request, idempotencyKey);
  }

  /**
   * POST /api/v1/calendar/bookings/{bookingId}/confirm
   * Confirm pre-booking → status = CONFIRMED
   */
  @Post(':bookingId/confirm')
  @ApiOperation({ summary: 'Confirm pre-booking' })
  async confirmBooking(@Param('bookingId') bookingId: string) {
    return this.bookingService.confirmBooking(bookingId);
  }

  /**
   * POST /api/v1/calendar/bookings/{bookingId}/cancel
   * Cancel booking → release slots
   */
  @Post(':bookingId/cancel')
  @ApiOperation({ summary: 'Cancel booking' })
  async cancelBooking(@Param('bookingId') bookingId: string) {
    return this.bookingService.cancelBooking(bookingId);
  }
}

interface PreBookRequest {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPostalCode: string;

  workerId: number;
  providerId: number;

  date: string; // ISO date
  shift: string;
  durationMinutes: number;

  serviceExecutionId?: string;
  services?: Array<{ serviceCode: string; serviceQuantity: number }>;

  bu: string;
}
```

**File**: `src/calendar/booking/booking.service.ts`

```typescript
import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AtomicPlacement } from './atomic-placement';
import { PreBookingManager } from './pre-booking.manager';
import { CalendarEventPublisher } from '../events/calendar-event.publisher';
import { CalendarConfigService } from '../config/calendar-config.service';
import { SlotCalculator } from '../engine/slot-calculator';
import { DateTime } from 'luxon';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly atomicPlacement: AtomicPlacement,
    private readonly preBookingManager: PreBookingManager,
    private readonly eventPublisher: CalendarEventPublisher,
    private readonly configService: CalendarConfigService,
    private readonly slotCalculator: SlotCalculator
  ) {}

  async preBook(request: PreBookRequest, idempotencyKey: string) {
    // Check idempotency
    const existing = await this.checkIdempotency(idempotencyKey);
    if (existing) return existing;

    // Check customer hold limit
    await this.preBookingManager.checkHoldLimit(request.customerId);

    const config = await this.configService.getConfig(request.bu);
    const dateStr = this.slotCalculator.formatDateKey(DateTime.fromISO(request.date));

    // Get shift config
    const shiftConfig = config.shifts.find((s) => s.code === request.shift);
    const { startIdx } = this.slotCalculator.getShiftIndices(shiftConfig, config.timezone);

    // Atomic booking placement
    const placement = await this.atomicPlacement.atomicBookSlots({
      workerId: request.workerId,
      startDate: dateStr,
      startSlot: startIdx,
      durationMinutes: request.durationMinutes,
      travelBufferSlots: this.slotCalculator.slotsForDuration(config.buffers.travelBufferMinutes),
      crossDayAllowed: config.crossDayAllowed,
    });

    if (!placement.success) {
      throw new ConflictException('Capacity changed during booking');
    }

    // Create booking record
    const booking = await this.prisma.booking.create({
      data: {
        status: 'PRE_BOOKED',
        customerId: request.customerId,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPostalCode: request.customerPostalCode,
        workerId: request.workerId,
        providerId: request.providerId,
        date: DateTime.fromISO(request.date).toJSDate(),
        shift: request.shift,
        durationMinutes: request.durationMinutes,
        serviceExecutionId: request.serviceExecutionId,
        services: request.services,
        bu: request.bu,
        timezone: config.timezone,
        expiresAt: DateTime.now().plus({ hours: 48 }).toJSDate(), // 48h TTL
        createdBy: 'system', // Replace with actual user
      },
    });

    // Increment customer hold counter
    await this.preBookingManager.incrementHoldCounter(request.customerId);

    // Publish event
    await this.eventPublisher.publishBookingPreBooked(booking);

    // Store idempotency
    await this.storeIdempotency(idempotencyKey, booking);

    return { bookingId: booking.id, expiresAt: booking.expiresAt };
  }

  async confirmBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking || booking.status !== 'PRE_BOOKED') {
      throw new ConflictException('Booking not in PRE_BOOKED state');
    }

    // Update status
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', expiresAt: null },
    });

    // Decrement customer hold counter
    await this.preBookingManager.decrementHoldCounter(booking.customerId);

    // Publish event
    await this.eventPublisher.publishBookingConfirmed(updated);

    return { bookingId: updated.id, status: updated.status };
  }

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      throw new ConflictException('Booking not found');
    }

    // Release slots in Redis (set bits to 0)
    await this.releaseSlots(booking);

    // Update status
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    // Decrement hold counter if was pre-booked
    if (booking.status === 'PRE_BOOKED') {
      await this.preBookingManager.decrementHoldCounter(booking.customerId);
    }

    // Publish event
    await this.eventPublisher.publishBookingCancelled(updated);

    return { bookingId: updated.id, status: updated.status };
  }

  private async releaseSlots(booking: any) {
    // TODO: Implement Redis bitmap release logic
    // Similar to atomicBookSlots but sets bits to 0
  }

  private async checkIdempotency(key: string): Promise<any | null> {
    const record = await this.prisma.idempotency.findUnique({ where: { key } });
    if (record && DateTime.fromJSDate(record.expiresAt) > DateTime.now()) {
      return record.responseJson;
    }
    return null;
  }

  private async storeIdempotency(key: string, response: any) {
    await this.prisma.idempotency.create({
      data: {
        key,
        requestHash: 'todo', // Hash request body
        responseJson: response,
        status: 'SUCCESS',
        expiresAt: DateTime.now().plus({ hours: 24 }).toJSDate(),
      },
    });
  }
}
```

---

### 6.3 Calendar Config Controller

**File**: `src/calendar/config/calendar-config.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CalendarConfigService } from './calendar-config.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('calendar')
@Controller('api/v1/calendar/config')
export class CalendarConfigController {
  constructor(private readonly configService: CalendarConfigService) {}

  @Get(':bu')
  async getConfig(@Param('bu') bu: string) {
    return this.configService.getConfig(bu);
  }

  @Post(':bu/draft')
  async createDraft(@Param('bu') bu: string, @Body() config: any) {
    return this.configService.createDraft(bu, config);
  }

  @Post(':bu/draft/publish')
  async publishDraft(@Param('bu') bu: string) {
    return this.configService.publishDraft(bu);
  }
}
```

---

## 7. Nager.Date Integration

### 7.1 Nager.Date Client

**File**: `src/calendar/holiday/nager-date.client.ts`

```typescript
import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DateTime } from 'luxon';

interface NagerHoliday {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  counties?: string[] | null;
  types: string[];
}

@Injectable()
export class NagerDateClient {
  private readonly BASE_URL = 'https://date.nager.at/api/v3';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get public holidays for country and year
   */
  async getPublicHolidays(countryCode: string, year: number): Promise<NagerHoliday[]> {
    const url = `${this.BASE_URL}/PublicHolidays/${year}/${countryCode}`;

    try {
      const response = await firstValueFrom(this.httpService.get<NagerHoliday[]>(url));
      return response.data;
    } catch (error) {
      throw new HttpException(`Failed to fetch holidays from Nager.Date: ${error.message}`, 500);
    }
  }

  /**
   * Get next public holidays for country
   */
  async getNextPublicHolidays(countryCode: string): Promise<NagerHoliday[]> {
    const url = `${this.BASE_URL}/NextPublicHolidays/${countryCode}`;

    try {
      const response = await firstValueFrom(this.httpService.get<NagerHoliday[]>(url));
      return response.data;
    } catch (error) {
      throw new HttpException(`Failed to fetch next holidays: ${error.message}`, 500);
    }
  }

  /**
   * Check if specific date is public holiday
   */
  async isPublicHoliday(countryCode: string, date: DateTime): Promise<boolean> {
    const year = date.year;
    const holidays = await this.getPublicHolidays(countryCode, year);
    const dateStr = date.toISODate();

    return holidays.some((h) => h.date === dateStr);
  }
}
```

---

### 7.2 Holiday Sync Cron Job

**File**: `src/calendar/holiday/holiday-sync.cron.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NagerDateClient } from './nager-date.client';
import { PrismaService } from '../../prisma/prisma.service';
import { DateTime } from 'luxon';

@Injectable()
export class HolidaySyncCron {
  private readonly logger = new Logger(HolidaySyncCron.name);
  private readonly SUPPORTED_COUNTRIES = ['ES', 'FR', 'IT', 'PL', 'PT', 'RO'];

  constructor(
    private readonly nagerClient: NagerDateClient,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Daily sync at 02:00 local time
   * Fetches holidays for current year + next year
   */
  @Cron('0 2 * * *', { timeZone: 'Europe/Paris' })
  async syncHolidays() {
    this.logger.log('Starting holiday sync job...');

    const currentYear = DateTime.now().year;
    const nextYear = currentYear + 1;

    for (const country of this.SUPPORTED_COUNTRIES) {
      try {
        // Fetch current year + next year
        const currentYearHolidays = await this.nagerClient.getPublicHolidays(country, currentYear);
        const nextYearHolidays = await this.nagerClient.getPublicHolidays(country, nextYear);

        const allHolidays = [...currentYearHolidays, ...nextYearHolidays];

        // Upsert holidays
        for (const holiday of allHolidays) {
          await this.prisma.holiday.upsert({
            where: {
              country_region_date: {
                country,
                region: null, // National holidays
                date: DateTime.fromISO(holiday.date).toJSDate(),
              },
            },
            update: {
              name: holiday.localName || holiday.name,
              sourceVersion: `nager-${currentYear}-${nextYear}`,
            },
            create: {
              country,
              region: null,
              date: DateTime.fromISO(holiday.date).toJSDate(),
              name: holiday.localName || holiday.name,
              sourceVersion: `nager-${currentYear}-${nextYear}`,
            },
          });
        }

        this.logger.log(`Synced ${allHolidays.length} holidays for ${country}`);
      } catch (error) {
        this.logger.error(`Failed to sync holidays for ${country}: ${error.message}`);
      }
    }

    this.logger.log('Holiday sync job completed');
  }

  /**
   * Manual trigger for initial sync
   */
  async syncNow() {
    await this.syncHolidays();
  }
}
```

---

### 7.3 Holiday Service

**File**: `src/calendar/holiday/holiday.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DateTime } from 'luxon';

@Injectable()
export class HolidayService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get holidays for date range (includes overrides)
   */
  async getHolidays(country: string, region: string | null, startDate: string, endDate: string) {
    const start = DateTime.fromISO(startDate).toJSDate();
    const end = DateTime.fromISO(endDate).toJSDate();

    // Get base holidays
    const baseHolidays = await this.prisma.holiday.findMany({
      where: {
        country,
        region: region || null,
        date: { gte: start, lte: end },
      },
    });

    // Get overrides
    const overrides = await this.prisma.holidayOverride.findMany({
      where: {
        country,
        region: region || null,
        date: { gte: start, lte: end },
      },
    });

    // Apply overrides
    const removed = new Set(overrides.filter((o) => o.overrideType === 'remove').map((o) => o.date.toISOString()));
    const added = overrides
      .filter((o) => o.overrideType === 'add')
      .map((o) => ({
        country: o.country,
        region: o.region,
        date: o.date.toISOString(),
        name: o.name,
      }));

    const final = [
      ...baseHolidays.filter((h) => !removed.has(h.date.toISOString())),
      ...added,
    ];

    return final;
  }

  /**
   * Check if date is holiday
   */
  async isHoliday(country: string, region: string | null, date: DateTime): Promise<boolean> {
    const holidays = await this.getHolidays(country, region, date.toISODate(), date.toISODate());
    return holidays.length > 0;
  }
}
```

---

## 8. Event Publishing

### 8.1 Calendar Event Publisher

**File**: `src/calendar/events/calendar-event.publisher.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventOutboxService } from './event-outbox.service';

@Injectable()
export class CalendarEventPublisher {
  constructor(private readonly outbox: EventOutboxService) {}

  async publishBookingPreBooked(booking: any) {
    await this.outbox.publish({
      aggregateType: 'booking',
      aggregateId: booking.id,
      eventType: 'calendar.booking.prebooked',
      payload: {
        bookingId: booking.id,
        customerId: booking.customerId,
        workerId: booking.workerId,
        date: booking.date,
        shift: booking.shift,
        expiresAt: booking.expiresAt,
      },
    });
  }

  async publishBookingConfirmed(booking: any) {
    await this.outbox.publish({
      aggregateType: 'booking',
      aggregateId: booking.id,
      eventType: 'calendar.booking.confirmed',
      payload: {
        bookingId: booking.id,
        workerId: booking.workerId,
        date: booking.date,
      },
    });
  }

  async publishBookingCancelled(booking: any) {
    await this.outbox.publish({
      aggregateType: 'booking',
      aggregateId: booking.id,
      eventType: 'calendar.booking.cancelled',
      payload: {
        bookingId: booking.id,
        workerId: booking.workerId,
        date: booking.date,
      },
    });
  }

  async publishBookingExpired(booking: any) {
    await this.outbox.publish({
      aggregateType: 'booking',
      aggregateId: booking.id,
      eventType: 'calendar.booking.expired',
      payload: {
        bookingId: booking.id,
        customerId: booking.customerId,
      },
    });
  }
}
```

---

### 8.2 Event Outbox Service

**File**: `src/calendar/events/event-outbox.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KafkaService } from '../../kafka/kafka.service';

interface OutboxEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
}

@Injectable()
export class EventOutboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService
  ) {}

  /**
   * Store event in outbox (transactional)
   */
  async publish(event: OutboxEvent) {
    await this.prisma.eventOutbox.create({
      data: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
        status: 'PENDING',
      },
    });
  }

  /**
   * Process pending events (cron every 10 seconds)
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox() {
    const pending = await this.prisma.eventOutbox.findMany({
      where: { status: 'PENDING' },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of pending) {
      try {
        // Publish to Kafka
        await this.kafka.publish({
          topic: this.getTopicForEventType(event.eventType),
          key: event.aggregateId,
          value: event.payload,
        });

        // Mark as published
        await this.prisma.eventOutbox.update({
          where: { id: event.id },
          data: { status: 'PUBLISHED', publishedAt: new Date() },
        });
      } catch (error) {
        // Mark as failed
        await this.prisma.eventOutbox.update({
          where: { id: event.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }

  private getTopicForEventType(eventType: string): string {
    // calendar.booking.prebooked → calendar.booking.events
    const parts = eventType.split('.');
    return `${parts[0]}.${parts[1]}.events`;
  }
}
```

---

## 9. Implementation Phases

### Phase 1: Core Calendar Engine (4-6 weeks)

**Week 1-2: Foundation**
- [ ] Set up NestJS module structure
- [ ] Create Prisma entities and migrations
- [ ] Implement Redis bitmap service
- [ ] Implement slot calculator
- [ ] Unit tests for bitmap operations (100% coverage)

**Week 3-4: Core Algorithms**
- [ ] Implement HasStart algorithm
- [ ] Implement AtomicPlacement (Lua scripts)
- [ ] Implement buffer calculator
- [ ] Integration tests for availability checking
- [ ] Performance tests (p95 < 500ms)

**Week 5-6: API & Booking**
- [ ] AvailabilityController + Service
- [ ] BookingController + Service
- [ ] Pre-booking manager with hold limits
- [ ] Idempotency service
- [ ] API integration tests

**Deliverables**:
- ✅ Calendar module with availability + booking APIs
- ✅ Redis bitmap engine operational
- ✅ 80%+ test coverage
- ✅ API documentation (OpenAPI)

---

### Phase 2: Holidays & Configuration (4-6 weeks)

**Week 7-8: Nager.Date Integration**
- [ ] Nager.Date HTTP client
- [ ] Holiday sync cron job (daily 02:00)
- [ ] Holiday override service
- [ ] HolidayService with override logic
- [ ] Unit tests for holiday logic

**Week 9-10: Calendar Configuration**
- [ ] CalendarConfigService (CRUD)
- [ ] Draft-Publish workflow
- [ ] Configuration validation
- [ ] Config version management
- [ ] Integration tests

**Week 11-12: Event Publishing**
- [ ] CalendarEventPublisher
- [ ] Event outbox service
- [ ] Kafka topic setup (calendar.booking.events)
- [ ] Outbox poller cron job
- [ ] Event schema validation

**Deliverables**:
- ✅ Holiday management with Nager.Date
- ✅ Configuration management UI-ready
- ✅ Event-driven architecture with outbox pattern
- ✅ 80%+ test coverage

---

### Phase 3: Optimization & Production (2-4 weeks)

**Week 13-14: Performance Optimization**
- [ ] Redis connection pooling
- [ ] Bitmap caching strategy
- [ ] Database query optimization (indexes)
- [ ] Load testing (1000 concurrent requests)
- [ ] Performance monitoring (OpenTelemetry)

**Week 15-16: Migration & Deployment**
- [ ] Data migration from current scheduling system
- [ ] Deployment scripts (Docker, Kubernetes)
- [ ] Rollback plan
- [ ] Production readiness review
- [ ] Documentation finalization

**Deliverables**:
- ✅ Production-ready calendar module
- ✅ Performance benchmarks met (p95 < 500ms)
- ✅ Migration plan tested
- ✅ Operational runbooks

---

## 10. Testing Strategy

### 10.1 Unit Tests (60% of tests)

**Target Coverage**: 90%+

**Files to Test**:
- `bitmap.service.ts` - Bit manipulation logic
- `slot-calculator.ts` - Time calculations
- `has-start.algorithm.ts` - Availability logic
- `pre-booking.manager.ts` - Hold limits
- `nager-date.client.ts` - HTTP client

**Example Test**:
```typescript
// bitmap.service.spec.ts
describe('BitmapService', () => {
  it('should set bit correctly', () => {
    const bitmap = Buffer.alloc(12, 0);
    const updated = service.setBit(bitmap, 0, 1);
    expect(service.getBit(updated, 0)).toBe(1);
  });

  it('should find free range', () => {
    const bitmap = Buffer.alloc(12, 0);
    const start = service.findFreeRange(bitmap, 4);
    expect(start).toBe(0);
  });
});
```

---

### 10.2 Integration Tests (30% of tests)

**Target Coverage**: 80%+

**Scenarios**:
- Availability check across date range
- Pre-booking with atomic placement
- Booking confirmation workflow
- Booking cancellation with slot release
- Holiday sync from Nager.Date
- Event outbox processing

**Example Test**:
```typescript
// booking.service.integration.spec.ts
describe('BookingService (Integration)', () => {
  it('should create pre-booking and reserve slots', async () => {
    const result = await bookingService.preBook({
      customerId: 'cust_123',
      workerId: 1,
      date: '2025-01-20',
      shift: 'M',
      durationMinutes: 120,
      bu: 'LM_ES',
    }, 'idempotency-key-1');

    expect(result.bookingId).toBeDefined();

    // Verify slots are busy in Redis
    const bitmap = await bitmapService.getBitmap(1, '20250120');
    expect(bitmapService.getBit(bitmap, 32)).toBe(1); // 08:00
  });
});
```

---

### 10.3 End-to-End Tests (10% of tests)

**Scenarios**:
- Full booking lifecycle (pre-book → confirm → cancel)
- Multi-day job with cross-day spanning
- Holiday blocking availability
- Idempotency key preventing duplicates
- Event publishing to Kafka

---

### 10.4 Performance Tests

**Load Testing**:
- 1000 concurrent availability checks
- 500 concurrent pre-bookings
- p95 latency < 500ms for availability
- p95 latency < 1s for booking

**Tools**: k6, Artillery

---

## 11. Migration from Current System

### 11.1 Current State Analysis

**Yellow Grid v1 Scheduling**:
- Basic availability checks (no 15-min granularity)
- No pre-booking (race conditions possible)
- Buffer logic exists but simplified
- Holiday management manual

**Migration Challenges**:
- Existing bookings need Redis bitmap backfill
- Calendar configs need creation for each BU
- Holiday data needs initial sync from Nager.Date

---

### 11.2 Migration Plan

**Phase 1: Parallel Run (2 weeks)**
- Deploy AHS Calendar module alongside existing scheduling
- Route 10% of traffic to new calendar
- Compare results (availability, bookings)
- Monitor performance metrics

**Phase 2: Gradual Rollout (4 weeks)**
- Week 1: 25% traffic
- Week 2: 50% traffic
- Week 3: 75% traffic
- Week 4: 100% traffic

**Phase 3: Decommission Old System (2 weeks)**
- Verify all bookings migrated
- Archive old scheduling code
- Update documentation

---

### 11.3 Data Migration

**Backfill Redis Bitmaps**:
```typescript
async function backfillBitmaps() {
  const existingBookings = await prisma.booking.findMany({
    where: { status: 'CONFIRMED' },
  });

  for (const booking of existingBookings) {
    const dateStr = slotCalculator.formatDateKey(booking.date);
    const bitmap = await bitmapService.getBitmap(booking.workerId, dateStr);

    const startSlot = slotCalculator.timeToSlotIndex(booking.startTime, booking.timezone);
    const neededSlots = slotCalculator.slotsForDuration(booking.durationMinutes);

    const updated = bitmapService.setBits(bitmap, startSlot, startSlot + neededSlots, 1);
    await bitmapService.setBitmap(booking.workerId, dateStr, updated);
  }
}
```

---

## 12. Success Metrics

### 12.1 Performance Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Availability API (p95) | < 500ms | < 1s |
| Booking API (p95) | < 1s | < 2s |
| Pre-booking TTL accuracy | ±1 min | ±5 min |
| Holiday sync latency | < 10s | < 30s |
| Event publishing delay | < 5s | < 30s |

### 12.2 Business Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Double-booking rate | 0% | < 0.01% |
| Pre-booking expiry rate | < 30% | < 50% |
| Calendar uptime | 99.9% | 99.5% |
| Holiday accuracy | 100% | 99.9% |

---

## 13. Operational Runbooks

### 13.1 Incident Response

**Scenario**: Double-booking detected

**Steps**:
1. Check Redis bitmap for affected worker + date
2. Review booking records in PostgreSQL
3. Identify root cause (Lua script bug, race condition)
4. Cancel conflicting booking
5. Notify customer + provider
6. Create post-mortem

**Scenario**: Pre-bookings not expiring

**Steps**:
1. Check cron job status (expiry poller)
2. Review EventOutbox for expired events
3. Manually trigger expiry for stuck bookings
4. Restart cron service if needed

---

### 13.2 Monitoring & Alerts

**Critical Alerts**:
- Double-booking detected → PagerDuty
- Redis connection lost → PagerDuty
- Event outbox backlog > 1000 → Slack
- Nager.Date API failure → Slack

**Dashboards** (Grafana):
- Booking volume by shift (M/A/E)
- Availability check latency (p50, p95, p99)
- Pre-booking confirmation rate
- Holiday sync status

---

## 14. Documentation Deliverables

- ✅ **This Implementation Plan** (complete technical spec)
- [ ] **API Documentation** (OpenAPI spec)
- [ ] **Developer Guide** (local setup, testing)
- [ ] **Operator Guide** (monitoring, troubleshooting)
- [ ] **Migration Guide** (v1 → v2 transition)
- [ ] **Architecture Decision Records** (ADRs for key choices)

---

## 15. Summary

### Total Effort Estimate

| Phase | Duration | Team Size | Total Weeks |
|-------|----------|-----------|-------------|
| Phase 1: Core Engine | 4-6 weeks | 2-3 engineers | 6 weeks |
| Phase 2: Holidays & Config | 4-6 weeks | 2-3 engineers | 6 weeks |
| Phase 3: Optimization | 2-4 weeks | 2 engineers | 4 weeks |
| **Total** | **10-16 weeks** | **2-3 engineers** | **16 weeks** |

### Key Success Factors

1. **Start with Phase 1** - Get core bitmap engine working first
2. **Test rigorously** - 80%+ coverage, performance tests
3. **Parallel run** - Validate against existing system before full rollout
4. **Monitor closely** - Track double-bookings, latency, expiry rates
5. **Document everything** - API specs, runbooks, migration guides

---

**Document Status**: Complete
**Version**: 1.0
**Last Updated**: 2025-01-16
**Author**: Engineering Team
**Review Status**: Ready for Implementation

---

This implementation plan provides a complete roadmap for embedding the AHS Calendar as a TypeScript module in the Yellow Grid Platform. The plan prioritizes critical features (pre-booking, atomic placement, 15-min granularity) while maintaining compatibility with existing systems through a phased migration approach.