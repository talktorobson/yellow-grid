# Provider Capacity Domain Model - AHS Field Service Execution Platform

## Document Purpose
This document defines the complete domain model for Provider Capacity management, including provider hierarchies (P1/P2), geographic zones, skills, certifications, calendars, and capacity calculation logic. This serves as the authoritative specification for all provider-related business logic.

---

## 1. Provider Aggregate

### 1.1 Provider Entity (Aggregate Root)

**Identity:**
```typescript
class ProviderId extends ValueObject {
  readonly value: string // UUID format

  static create(value?: string): Result<ProviderId> {
    const id = value || uuidv4()
    if (!isValidUUID(id)) {
      return Result.fail('Invalid Provider ID format')
    }
    return Result.ok(new ProviderId(id))
  }
}
```

**Provider Aggregate Root:**
```typescript
class Provider extends AggregateRoot<ProviderId> {
  private _id: ProviderId
  private _type: ProviderType // 'P1' | 'P2'
  private _profile: ProviderProfile
  private _primaryP1Id?: ProviderId // Required for P2
  private _zones: Zone[]
  private _skills: Skill[]
  private _certifications: Certification[]
  private _calendar: Calendar
  private _performanceMetrics: PerformanceMetrics
  private _status: ProviderStatus
  private _metadata: ProviderMetadata

  // Getters
  get id(): ProviderId { return this._id }
  get type(): ProviderType { return this._type }
  get profile(): ProviderProfile { return this._profile }
  get primaryZone(): Zone { return this._zones.find(z => z.isPrimary) }
  get zones(): ReadonlyArray<Zone> { return this._zones }
  get skills(): ReadonlyArray<Skill> { return this._skills }
  get certifications(): ReadonlyArray<Certification> {
    return this._certifications.filter(c => !c.isExpired())
  }
  get calendar(): Calendar { return this._calendar }
  get status(): ProviderStatus { return this._status }

  // Business Methods
  assignZone(zone: Zone): Result<void> {
    // Invariant: P1 must have at least one primary zone
    if (this._type === 'P1' && !this.hasPrimaryZone() && !zone.isPrimary) {
      return Result.fail('P1 provider must have a primary zone')
    }

    // Check for zone conflicts
    if (this._zones.some(z => z.id.equals(zone.id))) {
      return Result.fail('Provider already assigned to this zone')
    }

    this._zones.push(zone)
    this.addDomainEvent(new ProviderZoneAssigned(this._id, zone.id, zone.type))
    return Result.ok()
  }

  addSkill(skill: Skill, certification: Certification): Result<void> {
    // Invariant: Skills must have valid certifications
    if (!certification.coversSkill(skill)) {
      return Result.fail('Certification does not cover required skill')
    }

    if (certification.isExpired()) {
      return Result.fail('Cannot add skill with expired certification')
    }

    this._skills.push(skill)
    this._certifications.push(certification)
    this.addDomainEvent(new ProviderSkillAdded(this._id, skill.id, certification.id))
    return Result.ok()
  }

  updateCapacity(slots: CapacitySlot[]): Result<void> {
    // Invariant: Capacity slots cannot overlap
    if (this.hasOverlappingSlots(slots)) {
      return Result.fail('Capacity slots cannot overlap')
    }

    const result = this._calendar.updateCapacity(slots)
    if (result.isFailure) {
      return result
    }

    this.addDomainEvent(new ProviderCapacityUpdated(this._id, slots))
    return Result.ok()
  }

  reserveSlot(slot: TimeSlot): Result<void> {
    return this._calendar.reserveSlot(slot)
  }

  releaseSlot(slot: TimeSlot): Result<void> {
    return this._calendar.releaseSlot(slot)
  }

  hasSkills(requiredSkills: Skill[]): boolean {
    return requiredSkills.every(reqSkill =>
      this._skills.some(skill => skill.id.equals(reqSkill.id))
    )
  }

  isAvailableInZone(zoneId: ZoneId): boolean {
    return this._zones.some(z => z.id.equals(zoneId))
  }

  isAvailableAt(timeSlot: TimeSlot): boolean {
    return this._calendar.isAvailableAt(timeSlot)
  }

  transitionStatus(newStatus: ProviderStatus, reason: string): Result<void> {
    const transition = ProviderStatusTransitions[this._status][newStatus]
    if (!transition) {
      return Result.fail(`Invalid status transition: ${this._status} -> ${newStatus}`)
    }

    const previousStatus = this._status
    this._status = newStatus
    this.addDomainEvent(
      new ProviderStatusChanged(this._id, previousStatus, newStatus, reason)
    )
    return Result.ok()
  }

  // Private helpers
  private hasPrimaryZone(): boolean {
    return this._zones.some(z => z.isPrimary)
  }

  private hasOverlappingSlots(slots: CapacitySlot[]): boolean {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].overlaps(slots[j])) {
          return true
        }
      }
    }
    return false
  }
}
```

---

## 2. Provider Type Hierarchy

### 2.1 Provider Type Value Object

```typescript
type ProviderTypeEnum = 'P1' | 'P2'

class ProviderType extends ValueObject {
  readonly value: ProviderTypeEnum

  get isP1(): boolean { return this.value === 'P1' }
  get isP2(): boolean { return this.value === 'P2' }

  static P1 = new ProviderType('P1')
  static P2 = new ProviderType('P2')

  private constructor(value: ProviderTypeEnum) {
    super()
    this.value = value
  }
}
```

### 2.2 P1 (Primary Provider) Business Rules

**Characteristics:**
- Direct customer relationship
- Primary responsibility for service execution
- Can manage P2 subcontractors
- Must have at least one primary zone
- Higher scoring priority in candidate selection

**Invariants:**
```typescript
class P1ValidationRules {
  static mustHavePrimaryZone(provider: Provider): ValidationResult {
    if (provider.type.isP1 && !provider.primaryZone) {
      return ValidationResult.fail('P1 provider must have a primary zone')
    }
    return ValidationResult.ok()
  }

  static cannotBeSubcontractorOfP2(p1: Provider, p2: Provider): ValidationResult {
    if (p1.type.isP1 && p2.type.isP2) {
      return ValidationResult.fail('P1 cannot be subcontractor of P2')
    }
    return ValidationResult.ok()
  }
}
```

### 2.3 P2 (Subcontractor) Business Rules

**Characteristics:**
- Works under P1 supervision
- No direct customer relationship
- Must be associated with active P1
- Can operate in P1's zones
- Lower scoring priority (considered if P1 unavailable)

**Invariants:**
```typescript
class P2ValidationRules {
  static mustHaveActiveP1(p2: Provider): ValidationResult {
    if (p2.type.isP2 && !p2.primaryP1Id) {
      return ValidationResult.fail('P2 must be associated with active P1')
    }
    return ValidationResult.ok()
  }

  static p1MustBeActive(p2: Provider, p1: Provider): ValidationResult {
    if (p2.type.isP2 && p1.status !== ProviderStatus.Active) {
      return ValidationResult.fail('Associated P1 must be in Active status')
    }
    return ValidationResult.ok()
  }

  static canOperateInP1Zones(p2: Provider, p1: Provider): ValidationResult {
    const p2ZoneIds = p2.zones.map(z => z.id.value)
    const p1ZoneIds = p1.zones.map(z => z.id.value)

    const invalidZones = p2ZoneIds.filter(zoneId => !p1ZoneIds.includes(zoneId))

    if (invalidZones.length > 0) {
      return ValidationResult.fail(
        `P2 cannot operate in zones not covered by P1: ${invalidZones.join(', ')}`
      )
    }
    return ValidationResult.ok()
  }
}
```

---

## 3. Zone Domain Model

### 3.1 Zone Entity

```typescript
class ZoneId extends ValueObject {
  readonly value: string

  static create(value: string): Result<ZoneId> {
    if (!value || value.trim().length === 0) {
      return Result.fail('Zone ID cannot be empty')
    }
    return Result.ok(new ZoneId(value))
  }
}

class Zone extends ValueObject {
  readonly id: ZoneId
  readonly name: string
  readonly type: ZoneType // 'Primary' | 'Secondary'
  readonly boundary: Polygon // GeoJSON polygon
  readonly metadata: ZoneMetadata

  get isPrimary(): boolean { return this.type === 'Primary' }
  get isSecondary(): boolean { return this.type === 'Secondary' }

  containsLocation(location: Location): boolean {
    return this.boundary.contains(location.coordinates)
  }

  overlaps(other: Zone): boolean {
    return this.boundary.intersects(other.boundary)
  }

  static create(props: {
    id: ZoneId
    name: string
    type: ZoneType
    boundary: Polygon
    metadata?: ZoneMetadata
  }): Result<Zone> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Zone name cannot be empty')
    }

    if (!props.boundary || !props.boundary.isValid()) {
      return Result.fail('Zone boundary must be valid GeoJSON polygon')
    }

    return Result.ok(new Zone(props))
  }
}

type ZoneType = 'Primary' | 'Secondary'

interface ZoneMetadata {
  population?: number
  serviceLevel: 'Standard' | 'Premium' | 'VIP'
  averageServiceDuration: Duration
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 3.2 Zone Assignment Rules

```typescript
class ZoneAssignmentRules {
  static validatePrimaryZone(provider: Provider, zone: Zone): ValidationResult {
    if (provider.type.isP1 && zone.type !== 'Primary') {
      return ValidationResult.fail('P1 primary zone must be of type Primary')
    }
    return ValidationResult.ok()
  }

  static maxZonesPerProvider(provider: Provider, newZone: Zone): ValidationResult {
    const MAX_ZONES_P1 = 10
    const MAX_ZONES_P2 = 5

    const maxZones = provider.type.isP1 ? MAX_ZONES_P1 : MAX_ZONES_P2

    if (provider.zones.length >= maxZones) {
      return ValidationResult.fail(
        `Provider cannot be assigned more than ${maxZones} zones`
      )
    }
    return ValidationResult.ok()
  }

  static noOverlappingPrimaryZones(provider: Provider, zone: Zone): ValidationResult {
    if (zone.isPrimary && provider.primaryZone) {
      if (zone.overlaps(provider.primaryZone)) {
        return ValidationResult.fail('Primary zones cannot overlap')
      }
    }
    return ValidationResult.ok()
  }
}
```

---

## 4. Skill Domain Model

### 4.1 Skill Value Object

```typescript
class SkillId extends ValueObject {
  readonly value: string

  static create(value: string): Result<SkillId> {
    if (!value || value.trim().length === 0) {
      return Result.fail('Skill ID cannot be empty')
    }
    return Result.ok(new SkillId(value))
  }
}

class Skill extends ValueObject {
  readonly id: SkillId
  readonly name: string
  readonly category: SkillCategory
  readonly level: SkillLevel // 'Basic' | 'Intermediate' | 'Advanced' | 'Expert'
  readonly requiresCertification: boolean
  readonly metadata: SkillMetadata

  isEquivalentTo(other: Skill): boolean {
    return this.id.equals(other.id) ||
           (this.category === other.category && this.level >= other.level)
  }

  canSubstituteFor(required: Skill): boolean {
    return this.category === required.category && this.level >= required.level
  }

  static create(props: {
    id: SkillId
    name: string
    category: SkillCategory
    level: SkillLevel
    requiresCertification: boolean
    metadata?: SkillMetadata
  }): Result<Skill> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Skill name cannot be empty')
    }

    return Result.ok(new Skill(props))
  }
}

type SkillCategory =
  | 'HVAC'
  | 'Plumbing'
  | 'Electrical'
  | 'Appliance_Repair'
  | 'General_Maintenance'

type SkillLevel = 'Basic' | 'Intermediate' | 'Advanced' | 'Expert'

interface SkillMetadata {
  description: string
  averageTimeToComplete: Duration
  trainingRequired: boolean
  createdAt: DateTime
}
```

### 4.2 Skill Matrix

```typescript
class SkillMatrix {
  private skills: Map<SkillId, Skill[]> // Skill -> Equivalent/Substitutable skills

  findEquivalentSkills(skill: Skill): Skill[] {
    return this.skills.get(skill.id) || []
  }

  canProviderFulfill(
    providerSkills: Skill[],
    requiredSkills: Skill[]
  ): ValidationResult {
    const missingSkills: Skill[] = []

    for (const required of requiredSkills) {
      const hasSkill = providerSkills.some(
        providerSkill => providerSkill.canSubstituteFor(required)
      )

      if (!hasSkill) {
        missingSkills.push(required)
      }
    }

    if (missingSkills.length > 0) {
      return ValidationResult.fail(
        `Provider missing required skills: ${missingSkills.map(s => s.name).join(', ')}`
      )
    }

    return ValidationResult.ok()
  }
}
```

---

## 5. Certification Domain Model

### 5.1 Certification Value Object

```typescript
class CertificationId extends ValueObject {
  readonly value: string

  static create(value: string): Result<CertificationId> {
    if (!value || value.trim().length === 0) {
      return Result.fail('Certification ID cannot be empty')
    }
    return Result.ok(new CertificationId(value))
  }
}

class Certification extends ValueObject {
  readonly id: CertificationId
  readonly name: string
  readonly issuingAuthority: string
  readonly skillsCovered: SkillId[]
  readonly issueDate: DateTime
  readonly expirationDate: DateTime
  readonly certificateNumber: string
  readonly metadata: CertificationMetadata

  isExpired(): boolean {
    return DateTime.now().isAfter(this.expirationDate)
  }

  expiresWithin(duration: Duration): boolean {
    const threshold = DateTime.now().add(duration)
    return this.expirationDate.isBefore(threshold)
  }

  coversSkill(skill: Skill): boolean {
    return this.skillsCovered.some(id => id.equals(skill.id))
  }

  isValid(): boolean {
    return !this.isExpired() &&
           this.issueDate.isBefore(this.expirationDate) &&
           this.skillsCovered.length > 0
  }

  static create(props: {
    id: CertificationId
    name: string
    issuingAuthority: string
    skillsCovered: SkillId[]
    issueDate: DateTime
    expirationDate: DateTime
    certificateNumber: string
    metadata?: CertificationMetadata
  }): Result<Certification> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Certification name cannot be empty')
    }

    if (props.skillsCovered.length === 0) {
      return Result.fail('Certification must cover at least one skill')
    }

    if (props.issueDate.isAfter(props.expirationDate)) {
      return Result.fail('Issue date cannot be after expiration date')
    }

    return Result.ok(new Certification(props))
  }
}

interface CertificationMetadata {
  verificationUrl?: string
  documentPath?: string
  renewalRequired: boolean
  gracePeriodDays: number
  createdAt: DateTime
}
```

### 5.2 Certification Expiration Management

```typescript
class CertificationExpirationService {
  private readonly EXPIRATION_WARNING_DAYS = 30
  private readonly GRACE_PERIOD_DAYS = 7

  checkExpirations(certifications: Certification[]): CertificationStatus {
    const now = DateTime.now()

    const expired = certifications.filter(c => c.isExpired())
    const expiringSoon = certifications.filter(c =>
      c.expiresWithin(Duration.days(this.EXPIRATION_WARNING_DAYS)) && !c.isExpired()
    )
    const valid = certifications.filter(c =>
      !c.isExpired() && !c.expiresWithin(Duration.days(this.EXPIRATION_WARNING_DAYS))
    )

    return {
      expired,
      expiringSoon,
      valid,
      requiresAction: expired.length > 0 || expiringSoon.length > 0
    }
  }

  deactivateSkillsForExpiredCertifications(
    provider: Provider
  ): Result<SkillId[]> {
    const expiredCertifications = provider.certifications.filter(c => c.isExpired())
    const affectedSkills: SkillId[] = []

    for (const cert of expiredCertifications) {
      affectedSkills.push(...cert.skillsCovered)
    }

    if (affectedSkills.length > 0) {
      provider.addDomainEvent(
        new ProviderCertificationExpired(provider.id, affectedSkills)
      )
    }

    return Result.ok(affectedSkills)
  }
}

interface CertificationStatus {
  expired: Certification[]
  expiringSoon: Certification[]
  valid: Certification[]
  requiresAction: boolean
}
```

---

## 6. Calendar & Capacity Domain Model

### 6.1 Calendar Entity

```typescript
class Calendar extends Entity<CalendarId> {
  private _id: CalendarId
  private _providerId: ProviderId
  private _workingHours: WorkingHours[]
  private _capacitySlots: CapacitySlot[]
  private _blackoutPeriods: BlackoutPeriod[]
  private _reservedSlots: ReservedSlot[]

  get workingHours(): ReadonlyArray<WorkingHours> { return this._workingHours }
  get capacitySlots(): ReadonlyArray<CapacitySlot> { return this._capacitySlots }
  get blackoutPeriods(): ReadonlyArray<BlackoutPeriod> { return this._blackoutPeriods }

  isAvailableAt(timeSlot: TimeSlot): boolean {
    // Check if within working hours
    if (!this.isWithinWorkingHours(timeSlot)) {
      return false
    }

    // Check if not in blackout period
    if (this.isInBlackoutPeriod(timeSlot)) {
      return false
    }

    // Check if not already reserved
    if (this.isReserved(timeSlot)) {
      return false
    }

    // Check if capacity slot exists
    return this.hasCapacitySlot(timeSlot)
  }

  getAvailableSlots(window: TimeWindow): CapacitySlot[] {
    return this._capacitySlots
      .filter(slot =>
        slot.isWithinWindow(window) &&
        !slot.isReserved &&
        !this.isInBlackoutPeriod(slot)
      )
      .sort((a, b) => a.startTime.compareTo(b.startTime))
  }

  updateCapacity(slots: CapacitySlot[]): Result<void> {
    // Validate no overlaps
    if (this.hasOverlappingSlots(slots)) {
      return Result.fail('Capacity slots cannot overlap')
    }

    // Validate within working hours
    for (const slot of slots) {
      if (!this.isWithinWorkingHours(slot)) {
        return Result.fail(`Slot ${slot.id} is outside working hours`)
      }
    }

    this._capacitySlots = slots
    return Result.ok()
  }

  reserveSlot(slot: TimeSlot): Result<void> {
    if (!this.isAvailableAt(slot)) {
      return Result.fail('Slot is not available for reservation')
    }

    const capacitySlot = this.findCapacitySlot(slot)
    if (!capacitySlot) {
      return Result.fail('No capacity slot found for requested time')
    }

    const reservation = ReservedSlot.create({
      slotId: capacitySlot.id,
      timeSlot: slot,
      reservedAt: DateTime.now()
    })

    this._reservedSlots.push(reservation.value)
    return Result.ok()
  }

  releaseSlot(slot: TimeSlot): Result<void> {
    const reservation = this._reservedSlots.find(r => r.timeSlot.equals(slot))
    if (!reservation) {
      return Result.fail('No reservation found for slot')
    }

    this._reservedSlots = this._reservedSlots.filter(r => r !== reservation)
    return Result.ok()
  }

  addBlackoutPeriod(period: BlackoutPeriod): Result<void> {
    // Check for overlapping blackout periods
    const overlaps = this._blackoutPeriods.some(bp => bp.overlaps(period))
    if (overlaps) {
      return Result.fail('Blackout period overlaps with existing period')
    }

    this._blackoutPeriods.push(period)
    return Result.ok()
  }

  // Private helpers
  private isWithinWorkingHours(slot: TimeSlot): boolean {
    const dayOfWeek = slot.startTime.dayOfWeek
    const workingHours = this._workingHours.find(wh => wh.dayOfWeek === dayOfWeek)

    if (!workingHours) {
      return false
    }

    return slot.startTime.isAfterOrEqual(workingHours.startTime) &&
           slot.endTime.isBeforeOrEqual(workingHours.endTime)
  }

  private isInBlackoutPeriod(slot: TimeSlot): boolean {
    return this._blackoutPeriods.some(bp => bp.contains(slot))
  }

  private isReserved(slot: TimeSlot): boolean {
    return this._reservedSlots.some(rs => rs.overlaps(slot))
  }

  private hasCapacitySlot(slot: TimeSlot): boolean {
    return this._capacitySlots.some(cs => cs.contains(slot))
  }

  private findCapacitySlot(slot: TimeSlot): CapacitySlot | null {
    return this._capacitySlots.find(cs => cs.contains(slot)) || null
  }

  private hasOverlappingSlots(slots: CapacitySlot[]): boolean {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].overlaps(slots[j])) {
          return true
        }
      }
    }
    return false
  }
}
```

### 6.2 Capacity Slot Value Object

```typescript
class CapacitySlot extends ValueObject {
  readonly id: string
  readonly startTime: DateTime
  readonly endTime: DateTime
  readonly isReserved: boolean
  readonly metadata: CapacitySlotMetadata

  get duration(): Duration {
    return Duration.between(this.startTime, this.endTime)
  }

  isWithinWindow(window: TimeWindow): boolean {
    return this.startTime.isAfterOrEqual(window.startDate) &&
           this.endTime.isBeforeOrEqual(window.endDate)
  }

  contains(slot: TimeSlot): boolean {
    return this.startTime.isBeforeOrEqual(slot.startTime) &&
           this.endTime.isAfterOrEqual(slot.endTime)
  }

  overlaps(other: CapacitySlot | TimeSlot): boolean {
    return this.startTime.isBefore(other.endTime) &&
           this.endTime.isAfter(other.startTime)
  }

  static create(props: {
    startTime: DateTime
    endTime: DateTime
    isReserved?: boolean
    metadata?: CapacitySlotMetadata
  }): Result<CapacitySlot> {
    if (props.startTime.isAfterOrEqual(props.endTime)) {
      return Result.fail('Start time must be before end time')
    }

    const duration = Duration.between(props.startTime, props.endTime)
    if (duration.toMinutes() < 15) {
      return Result.fail('Capacity slot must be at least 15 minutes')
    }

    return Result.ok(new CapacitySlot({
      id: uuidv4(),
      ...props,
      isReserved: props.isReserved || false
    }))
  }
}

interface CapacitySlotMetadata {
  type: 'Standard' | 'Emergency' | 'Overtime'
  costMultiplier: number
  priority: number
}
```

### 6.3 Working Hours Value Object

```typescript
class WorkingHours extends ValueObject {
  readonly dayOfWeek: DayOfWeek // 0-6 (Sunday-Saturday)
  readonly startTime: TimeOfDay // 'HH:MM' format
  readonly endTime: TimeOfDay
  readonly breakPeriods: BreakPeriod[]

  isWorkingTime(time: DateTime): boolean {
    if (time.dayOfWeek !== this.dayOfWeek) {
      return false
    }

    const timeOfDay = TimeOfDay.fromDateTime(time)

    if (timeOfDay.isBefore(this.startTime) || timeOfDay.isAfter(this.endTime)) {
      return false
    }

    // Check if time falls within break period
    for (const breakPeriod of this.breakPeriods) {
      if (breakPeriod.contains(timeOfDay)) {
        return false
      }
    }

    return true
  }

  getWorkingDuration(): Duration {
    let totalMinutes = Duration.between(this.startTime, this.endTime).toMinutes()

    for (const breakPeriod of this.breakPeriods) {
      totalMinutes -= breakPeriod.duration.toMinutes()
    }

    return Duration.minutes(totalMinutes)
  }

  static create(props: {
    dayOfWeek: DayOfWeek
    startTime: TimeOfDay
    endTime: TimeOfDay
    breakPeriods?: BreakPeriod[]
  }): Result<WorkingHours> {
    if (props.startTime.isAfterOrEqual(props.endTime)) {
      return Result.fail('Start time must be before end time')
    }

    // Validate 24-hour limit
    const duration = Duration.between(props.startTime, props.endTime)
    if (duration.toHours() > 24) {
      return Result.fail('Working hours cannot exceed 24 hours')
    }

    return Result.ok(new WorkingHours({
      ...props,
      breakPeriods: props.breakPeriods || []
    }))
  }
}

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

class BreakPeriod extends ValueObject {
  readonly startTime: TimeOfDay
  readonly endTime: TimeOfDay

  get duration(): Duration {
    return Duration.between(this.startTime, this.endTime)
  }

  contains(time: TimeOfDay): boolean {
    return time.isAfterOrEqual(this.startTime) && time.isBefore(this.endTime)
  }
}
```

### 6.4 Blackout Period Value Object

```typescript
class BlackoutPeriod extends ValueObject {
  readonly id: string
  readonly startDate: DateTime
  readonly endDate: DateTime
  readonly reason: BlackoutReason
  readonly description: string

  contains(slot: TimeSlot): boolean {
    return slot.startTime.isAfterOrEqual(this.startDate) &&
           slot.endTime.isBeforeOrEqual(this.endDate)
  }

  overlaps(other: BlackoutPeriod | TimeSlot): boolean {
    return this.startDate.isBefore(other.endTime) &&
           this.endDate.isAfter(other.startTime)
  }

  static create(props: {
    startDate: DateTime
    endDate: DateTime
    reason: BlackoutReason
    description: string
  }): Result<BlackoutPeriod> {
    if (props.startDate.isAfterOrEqual(props.endDate)) {
      return Result.fail('Start date must be before end date')
    }

    return Result.ok(new BlackoutPeriod({
      id: uuidv4(),
      ...props
    }))
  }
}

type BlackoutReason =
  | 'Holiday'
  | 'Training'
  | 'Maintenance'
  | 'Personal_Leave'
  | 'Emergency'
```

---

## 7. Performance Metrics

### 7.1 Performance Metrics Value Object

```typescript
class PerformanceMetrics extends ValueObject {
  readonly completionRate: number // 0-100
  readonly averageResponseTime: Duration
  readonly customerRating: number // 0-5
  readonly onTimeArrivalRate: number // 0-100
  readonly firstTimeFixRate: number // 0-100
  readonly totalJobsCompleted: number
  readonly cancellationRate: number // 0-100
  readonly calculatedAt: DateTime

  isEligibleForPremiumJobs(): boolean {
    return this.completionRate >= 95 &&
           this.customerRating >= 4.5 &&
           this.onTimeArrivalRate >= 90 &&
           this.firstTimeFixRate >= 85
  }

  getPerformanceScore(): number {
    // Weighted scoring algorithm
    return (
      this.completionRate * 0.3 +
      (this.customerRating / 5) * 100 * 0.25 +
      this.onTimeArrivalRate * 0.25 +
      this.firstTimeFixRate * 0.2
    )
  }

  static create(props: {
    completionRate: number
    averageResponseTime: Duration
    customerRating: number
    onTimeArrivalRate: number
    firstTimeFixRate: number
    totalJobsCompleted: number
    cancellationRate: number
  }): Result<PerformanceMetrics> {
    // Validation
    if (props.completionRate < 0 || props.completionRate > 100) {
      return Result.fail('Completion rate must be between 0 and 100')
    }

    if (props.customerRating < 0 || props.customerRating > 5) {
      return Result.fail('Customer rating must be between 0 and 5')
    }

    return Result.ok(new PerformanceMetrics({
      ...props,
      calculatedAt: DateTime.now()
    }))
  }
}
```

---

## 8. Provider State Machine

### 8.1 Provider Status Enum

```typescript
enum ProviderStatus {
  Registered = 'Registered',
  Active = 'Active',
  Busy = 'Busy',
  Unavailable = 'Unavailable',
  Suspended = 'Suspended',
  Deactivated = 'Deactivated'
}
```

### 8.2 Provider Status Transitions

```typescript
const ProviderStatusTransitions: Record<ProviderStatus, Partial<Record<ProviderStatus, TransitionRule>>> = {
  [ProviderStatus.Registered]: {
    [ProviderStatus.Active]: {
      condition: (provider: Provider) => provider.hasCompletedOnboarding(),
      description: 'Onboarding completed, provider ready for assignments'
    }
  },

  [ProviderStatus.Active]: {
    [ProviderStatus.Busy]: {
      condition: (provider: Provider) => provider.hasActiveAssignment(),
      description: 'Provider dispatched to assignment'
    },
    [ProviderStatus.Unavailable]: {
      condition: () => true,
      description: 'Provider requested time off or unavailable'
    },
    [ProviderStatus.Suspended]: {
      condition: (provider: Provider) => provider.hasPolicyViolation(),
      description: 'Provider suspended due to policy violation'
    },
    [ProviderStatus.Deactivated]: {
      condition: () => true,
      description: 'Provider contract terminated'
    }
  },

  [ProviderStatus.Busy]: {
    [ProviderStatus.Active]: {
      condition: (provider: Provider) => !provider.hasActiveAssignment(),
      description: 'Assignment completed, provider available again'
    }
  },

  [ProviderStatus.Unavailable]: {
    [ProviderStatus.Active]: {
      condition: () => true,
      description: 'Provider returned to work'
    }
  },

  [ProviderStatus.Suspended]: {
    [ProviderStatus.Active]: {
      condition: (provider: Provider) => provider.isReinstated(),
      description: 'Provider reinstated after suspension review'
    },
    [ProviderStatus.Deactivated]: {
      condition: () => true,
      description: 'Suspension escalated to deactivation'
    }
  },

  [ProviderStatus.Deactivated]: {
    // Terminal state - no transitions out
  }
}

interface TransitionRule {
  condition: (provider: Provider) => boolean
  description: string
}
```

---

## 9. Domain Events

```typescript
// Provider Registration Events
class ProviderRegistered extends DomainEvent {
  constructor(
    public readonly providerId: ProviderId,
    public readonly providerType: ProviderType,
    public readonly registeredAt: DateTime
  ) {
    super()
  }
}

// Provider Capacity Events
class ProviderCapacityUpdated extends DomainEvent {
  constructor(
    public readonly providerId: ProviderId,
    public readonly capacityChanges: CapacitySlot[],
    public readonly updatedAt: DateTime
  ) {
    super()
  }
}

// Provider Certification Events
class ProviderCertificationExpired extends DomainEvent {
  constructor(
    public readonly providerId: ProviderId,
    public readonly skillsImpacted: SkillId[],
    public readonly expiredAt: DateTime
  ) {
    super()
  }
}

// Provider Zone Events
class ProviderZoneAssigned extends DomainEvent {
  constructor(
    public readonly providerId: ProviderId,
    public readonly zoneId: ZoneId,
    public readonly assignmentType: 'Primary' | 'Secondary',
    public readonly effectiveFrom: DateTime
  ) {
    super()
  }
}

// Provider Status Events
class ProviderStatusChanged extends DomainEvent {
  constructor(
    public readonly providerId: ProviderId,
    public readonly previousStatus: ProviderStatus,
    public readonly newStatus: ProviderStatus,
    public readonly reason: string,
    public readonly changedAt: DateTime
  ) {
    super()
  }
}

// Provider Skill Events
class ProviderSkillAdded extends DomainEvent {
  constructor(
    public readonly providerId: ProviderId,
    public readonly skillId: SkillId,
    public readonly certificationId: CertificationId,
    public readonly addedAt: DateTime = DateTime.now()
  ) {
    super()
  }
}
```

---

## 10. Repository Interfaces

```typescript
interface ProviderRepository {
  findById(id: ProviderId): Promise<Provider | null>
  findByType(type: ProviderType): Promise<Provider[]>
  findByZone(zoneId: ZoneId, type?: ProviderType): Promise<Provider[]>
  findBySkills(skills: SkillId[]): Promise<Provider[]>
  findAvailableInWindow(
    window: TimeWindow,
    skills: SkillId[],
    zoneId: ZoneId
  ): Promise<Provider[]>
  findByStatus(status: ProviderStatus): Promise<Provider[]>
  save(provider: Provider): Promise<void>
  delete(id: ProviderId): Promise<void>
}

interface ZoneRepository {
  findById(id: ZoneId): Promise<Zone | null>
  findByLocation(location: Location): Promise<Zone[]>
  findAll(): Promise<Zone[]>
  save(zone: Zone): Promise<void>
}

interface SkillRepository {
  findById(id: SkillId): Promise<Skill | null>
  findByCategory(category: SkillCategory): Promise<Skill[]>
  findAll(): Promise<Skill[]>
}
```

---

## 11. Example Usage

```typescript
// Example: Create P1 provider with zone and skills
async function createP1Provider(
  providerRepo: ProviderRepository,
  zoneRepo: ZoneRepository
): Promise<Result<Provider>> {
  // Create provider
  const providerId = ProviderId.create().value
  const provider = Provider.create({
    id: providerId,
    type: ProviderType.P1,
    profile: ProviderProfile.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    }).value,
    status: ProviderStatus.Registered
  }).value

  // Assign primary zone
  const zone = await zoneRepo.findById(ZoneId.create('ZONE_001').value)
  if (!zone) {
    return Result.fail('Zone not found')
  }

  const zoneResult = provider.assignZone(zone)
  if (zoneResult.isFailure) {
    return Result.fail(zoneResult.error)
  }

  // Add skills with certifications
  const hvacSkill = Skill.create({
    id: SkillId.create('SKILL_HVAC').value,
    name: 'HVAC Installation',
    category: 'HVAC',
    level: 'Advanced',
    requiresCertification: true
  }).value

  const hvacCert = Certification.create({
    id: CertificationId.create('CERT_HVAC_001').value,
    name: 'HVAC Technician Certification',
    issuingAuthority: 'HVAC Institute',
    skillsCovered: [hvacSkill.id],
    issueDate: DateTime.now().subtract(Duration.years(1)),
    expirationDate: DateTime.now().add(Duration.years(2)),
    certificateNumber: 'HVAC-12345'
  }).value

  const skillResult = provider.addSkill(hvacSkill, hvacCert)
  if (skillResult.isFailure) {
    return Result.fail(skillResult.error)
  }

  // Update capacity
  const slots = [
    CapacitySlot.create({
      startTime: DateTime.parse('2025-01-15T09:00:00'),
      endTime: DateTime.parse('2025-01-15T12:00:00')
    }).value,
    CapacitySlot.create({
      startTime: DateTime.parse('2025-01-15T13:00:00'),
      endTime: DateTime.parse('2025-01-15T17:00:00')
    }).value
  ]

  const capacityResult = provider.updateCapacity(slots)
  if (capacityResult.isFailure) {
    return Result.fail(capacityResult.error)
  }

  // Transition to Active
  const statusResult = provider.transitionStatus(
    ProviderStatus.Active,
    'Onboarding completed'
  )
  if (statusResult.isFailure) {
    return Result.fail(statusResult.error)
  }

  // Save provider
  await providerRepo.save(provider)

  return Result.ok(provider)
}
```

---

## Document Control

- **Version**: 1.0.0
- **Last Updated**: 2025-11-14
- **Owner**: Platform Architecture Team
- **Review Cycle**: Quarterly
- **Related Documents**:
  - `/product-docs/domain/01-domain-model-overview.md`
  - `/product-docs/prd/ahs-field-service-prd.md`
