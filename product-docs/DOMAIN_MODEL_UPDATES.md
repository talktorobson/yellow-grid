# Domain Model Updates - Feature Additions

**Version**: 1.0
**Date**: 2025-01-16
**Purpose**: Document updates to domain model for new features

---

## Service Order Entity Updates

### New Attributes

Add the following attributes to the `ServiceOrder` aggregate root:

```typescript
class ServiceOrder extends AggregateRoot<ServiceOrderId> {
  // ... existing attributes ...

  // ====== EXTERNAL SALES SYSTEM REFERENCES ======
  private _externalSalesOrderId?: string // External sales order ID from Pyxis/Tempo/SAP
  private _externalProjectId?: string    // External project ID from sales system
  private _externalLeadId?: string       // External lead/opportunity ID
  private _externalSystemSource?: string // 'PYXIS' | 'TEMPO' | 'SAP' | etc.

  // ====== SALES POTENTIAL ASSESSMENT (TV/Quotation only) ======
  private _salesPotential: SalesPotential     // 'LOW' | 'MEDIUM' | 'HIGH'
  private _salesPotentialScore?: number       // 0-100
  private _salesPotentialUpdatedAt?: DateTime
  private _salesPreEstimationId?: string      // Link to pre-estimation from sales system
  private _salesPreEstimationValue?: Money
  private _salesmanNotes?: string             // Notes from salesman (for NLP analysis)

  // ====== RISK ASSESSMENT ======
  private _riskLevel: RiskLevel              // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  private _riskScore?: number                // 0-100
  private _riskAssessedAt?: DateTime
  private _riskFactors: RiskFactor[]         // Array of contributing risk factors
  private _riskAcknowledgedBy?: UserId
  private _riskAcknowledgedAt?: DateTime

  // Getters
  get externalSalesOrderId(): string | undefined { return this._externalSalesOrderId }
  get externalProjectId(): string | undefined { return this._externalProjectId }
  get externalLeadId(): string | undefined { return this._externalLeadId }
  get externalSystemSource(): string | undefined { return this._externalSystemSource }

  get salesPotential(): SalesPotential { return this._salesPotential }
  get salesPotentialScore(): number | undefined { return this._salesPotentialScore }
  get salesPreEstimationId(): string | undefined { return this._salesPreEstimationId }
  get salesmanNotes(): string | undefined { return this._salesmanNotes }

  get riskLevel(): RiskLevel { return this._riskLevel }
  get riskScore(): number | undefined { return this._riskScore }
  get riskFactors(): ReadonlyArray<RiskFactor> { return this._riskFactors }
  get isRiskAcknowledged(): boolean {
    return this._riskAcknowledgedBy !== undefined
  }

  // Business Methods

  /**
   * Update sales potential assessment (AI-triggered)
   */
  updateSalesPotential(
    potential: SalesPotential,
    score: number,
    assessedAt: DateTime
  ): Result<void> {
    // Only TV and QUOTATION service types have sales potential
    if (!['TV', 'QUOTATION'].includes(this._serviceType)) {
      return Result.fail('Sales potential only applies to TV/Quotation service orders')
    }

    if (score < 0 || score > 100) {
      return Result.fail('Sales potential score must be between 0 and 100')
    }

    this._salesPotential = potential
    this._salesPotentialScore = score
    this._salesPotentialUpdatedAt = assessedAt

    this.addDomainEvent(new SalesPotentialAssessed(
      this._id,
      potential,
      score,
      assessedAt
    ))

    return Result.ok()
  }

  /**
   * Link pre-estimation from sales system
   */
  linkPreEstimation(
    preEstimationId: string,
    value: Money
  ): Result<void> {
    this._salesPreEstimationId = preEstimationId
    this._salesPreEstimationValue = value

    // Trigger automatic sales potential reassessment
    this.addDomainEvent(new PreEstimationLinked(
      this._id,
      preEstimationId,
      value
    ))

    return Result.ok()
  }

  /**
   * Update salesman notes (triggers sales potential reassessment)
   */
  updateSalesmanNotes(notes: string): Result<void> {
    this._salesmanNotes = notes

    // Trigger automatic sales potential reassessment
    this.addDomainEvent(new SalesmanNotesUpdated(
      this._id,
      notes
    ))

    return Result.ok()
  }

  /**
   * Update risk assessment (AI-triggered)
   */
  updateRiskAssessment(
    riskLevel: RiskLevel,
    riskScore: number,
    riskFactors: RiskFactor[],
    assessedAt: DateTime
  ): Result<void> {
    if (riskScore < 0 || riskScore > 100) {
      return Result.fail('Risk score must be between 0 and 100')
    }

    const previousRiskLevel = this._riskLevel

    this._riskLevel = riskLevel
    this._riskScore = riskScore
    this._riskFactors = riskFactors
    this._riskAssessedAt = assessedAt

    // Reset acknowledgment if risk increased
    if (this.riskLevelIncreased(previousRiskLevel, riskLevel)) {
      this._riskAcknowledgedBy = undefined
      this._riskAcknowledgedAt = undefined
    }

    this.addDomainEvent(new RiskAssessed(
      this._id,
      riskLevel,
      riskScore,
      riskFactors,
      assessedAt
    ))

    // Create task if HIGH or CRITICAL
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      this.addDomainEvent(new HighRiskDetected(
        this._id,
        riskLevel,
        riskFactors
      ))
    }

    return Result.ok()
  }

  /**
   * Acknowledge risk (operator confirms they've reviewed)
   */
  acknowledgeRisk(
    acknowledgedBy: UserId,
    acknowledgedAt: DateTime
  ): Result<void> {
    if (this._riskLevel === 'LOW') {
      return Result.fail('Cannot acknowledge LOW risk service orders')
    }

    this._riskAcknowledgedBy = acknowledgedBy
    this._riskAcknowledgedAt = acknowledgedAt

    this.addDomainEvent(new RiskAcknowledged(
      this._id,
      acknowledgedBy,
      acknowledgedAt
    ))

    return Result.ok()
  }

  private riskLevelIncreased(
    previous: RiskLevel,
    current: RiskLevel
  ): boolean {
    const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    return levels.indexOf(current) > levels.indexOf(previous)
  }
}
```

### New Value Objects

```typescript
/**
 * Sales Potential Value Object
 */
type SalesPotential = 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Risk Level Value Object
 */
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * Risk Factor Value Object
 */
interface RiskFactor {
  factor: string                  // e.g., 'MULTIPLE_RESCHEDULES'
  description: string             // Human-readable description
  weight: number                  // 0.0-1.0 (contribution to risk score)
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

/**
 * External Reference Value Object
 */
class ExternalReference extends ValueObject {
  readonly salesOrderId?: string
  readonly projectId?: string
  readonly leadId?: string
  readonly systemSource: string // 'PYXIS' | 'TEMPO' | 'SAP'

  static create(props: {
    salesOrderId?: string
    projectId?: string
    leadId?: string
    systemSource: string
  }): Result<ExternalReference> {
    if (!props.systemSource) {
      return Result.fail('External system source is required')
    }

    if (!props.salesOrderId && !props.projectId && !props.leadId) {
      return Result.fail('At least one external reference ID is required')
    }

    return Result.ok(new ExternalReference(props))
  }
}
```

### New Domain Events

```typescript
/**
 * Sales Potential Assessed
 */
class SalesPotentialAssessed extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly potential: SalesPotential,
    public readonly score: number,
    public readonly assessedAt: DateTime
  ) {
    super()
  }
}

/**
 * Pre-Estimation Linked
 */
class PreEstimationLinked extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly preEstimationId: string,
    public readonly estimatedValue: Money
  ) {
    super()
  }
}

/**
 * Salesman Notes Updated
 */
class SalesmanNotesUpdated extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly notes: string
  ) {
    super()
  }
}

/**
 * Risk Assessed
 */
class RiskAssessed extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly riskLevel: RiskLevel,
    public readonly riskScore: number,
    public readonly riskFactors: RiskFactor[],
    public readonly assessedAt: DateTime
  ) {
    super()
  }
}

/**
 * High Risk Detected
 */
class HighRiskDetected extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly riskLevel: RiskLevel,
    public readonly riskFactors: RiskFactor[]
  ) {
    super()
  }
}

/**
 * Risk Acknowledged
 */
class RiskAcknowledged extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly acknowledgedBy: UserId,
    public readonly acknowledgedAt: DateTime
  ) {
    super()
  }
}
```

---

## Project Entity Updates

### New Attributes

Add the following attribute to the `Project` aggregate root:

```typescript
class Project extends AggregateRoot<ProjectId> {
  // ... existing attributes ...

  // ====== PROJECT OWNERSHIP ("Pilote du Chantier") ======
  private _responsibleOperatorId?: UserId
  private _assignmentMode: ProjectAssignmentMode // 'AUTO' | 'MANUAL'
  private _assignedAt?: DateTime
  private _assignedBy?: string // User ID or 'SYSTEM'

  // Getters
  get responsibleOperatorId(): UserId | undefined {
    return this._responsibleOperatorId
  }

  get assignmentMode(): ProjectAssignmentMode {
    return this._assignmentMode
  }

  get hasResponsibleOperator(): boolean {
    return this._responsibleOperatorId !== undefined
  }

  // Business Methods

  /**
   * Assign responsible operator (manual or automatic)
   */
  assignResponsibleOperator(
    operatorId: UserId,
    assignedBy: string, // User ID or 'SYSTEM'
    assignedAt: DateTime
  ): Result<void> {
    const previousOperatorId = this._responsibleOperatorId

    this._responsibleOperatorId = operatorId
    this._assignedBy = assignedBy
    this._assignedAt = assignedAt

    this.addDomainEvent(new ProjectOwnershipChanged(
      this._id,
      previousOperatorId,
      operatorId,
      assignedBy,
      assignedAt
    ))

    return Result.ok()
  }

  /**
   * Calculate total workload (sum of service order durations)
   */
  calculateWorkload(serviceOrders: ServiceOrder[]): Duration {
    const totalMinutes = serviceOrders
      .filter(so => !['CANCELLED', 'COMPLETED', 'CLOSED'].includes(so.state))
      .reduce((sum, so) => sum + so.estimatedDuration.minutes, 0)

    return Duration.fromMinutes(totalMinutes)
  }
}
```

### New Value Objects

```typescript
/**
 * Project Assignment Mode
 */
type ProjectAssignmentMode = 'AUTO' | 'MANUAL'
```

### New Domain Events

```typescript
/**
 * Project Ownership Changed
 */
class ProjectOwnershipChanged extends DomainEvent {
  constructor(
    public readonly projectId: ProjectId,
    public readonly previousOperatorId: UserId | undefined,
    public readonly newOperatorId: UserId,
    public readonly changedBy: string, // User ID or 'SYSTEM'
    public readonly changedAt: DateTime
  ) {
    super()
  }
}
```

---

## Business Rules

### External References

**BR-EXT-001**: Service orders MUST store external references for bidirectional traceability with sales systems.

**BR-EXT-002**: External references MUST include system source to handle multi-sales-system reality.

**BR-EXT-003**: External references enable: traceability, commission linking, pre-estimation matching, support, analytics.

### Project Ownership

**BR-PO-001**: Each project MUST have exactly one responsible operator at all times.

**BR-PO-002**: Operator assignment mode (AUTO/MANUAL) is configurable per country.

**BR-PO-003**: Auto-assignment uses workload balancing (sum of total hours across assigned projects).

**BR-PO-004**: Project ownership determines notification and alert routing.

**BR-PO-005**: Operators can take ownership via single or batch operations.

### Sales Potential

**BR-SP-001**: Only TV/Quotation service orders have sales potential assessment.

**BR-SP-002**: Sales potential levels: LOW (default), MEDIUM, HIGH.

**BR-SP-003**: AI automatically assesses potential on creation, salesman notes update, or pre-estimation link.

**BR-SP-004**: Assessment uses: salesman notes (NLP), customer context, pre-estimation value, product categories.

**BR-SP-005**: High-potential TVs are prioritized in dashboards and assignment.

### Risk Assessment

**BR-RA-001**: All service orders have risk level: LOW (default), MEDIUM, HIGH, CRITICAL.

**BR-RA-002**: AI assesses risk daily (midnight) for SOs starting in 2 days OR in progress.

**BR-RA-003**: Risk factors: claims, reschedules, incomplete checkouts, payment issues, provider quality, customer complaints, age, dependencies.

**BR-RA-004**: HIGH/CRITICAL risk creates operator task and sends alert.

**BR-RA-005**: HIGH/CRITICAL risk requires operator acknowledgment before check-in.

---

## Event Handlers

### Sales Potential Assessment Triggers

```typescript
// Trigger 1: On service order created (TV/Quotation only)
eventBus.subscribe(ServiceOrderCreated, async (event) => {
  const serviceOrder = await repo.findById(event.serviceOrderId)
  if (['TV', 'QUOTATION'].includes(serviceOrder.serviceType)) {
    await salesPotentialService.assess(serviceOrder)
  }
})

// Trigger 2: On salesman notes updated
eventBus.subscribe(SalesmanNotesUpdated, async (event) => {
  const serviceOrder = await repo.findById(event.serviceOrderId)
  await salesPotentialService.assess(serviceOrder)
})

// Trigger 3: On pre-estimation linked
eventBus.subscribe(PreEstimationLinked, async (event) => {
  const serviceOrder = await repo.findById(event.serviceOrderId)
  await salesPotentialService.assess(serviceOrder)
})
```

### Risk Assessment Triggers

```typescript
// Trigger 1: Daily batch job (midnight)
cron.schedule('0 0 * * *', async () => {
  const twoDaysFromNow = DateTime.now().plus({ days: 2 })
  const serviceOrders = await repo.find({
    $or: [
      { status: 'IN_PROGRESS' },
      { scheduledDate: { $lte: twoDaysFromNow }, status: { $in: ['SCHEDULED', 'ASSIGNED'] } }
    ]
  })

  for (const so of serviceOrders) {
    await riskAssessmentService.assess(so, 'BATCH_JOB')
  }
})

// Trigger 2: On claim filed
eventBus.subscribe(ClaimFiled, async (event) => {
  const serviceOrder = await repo.findById(event.serviceOrderId)
  await riskAssessmentService.assess(serviceOrder, 'EVENT_CLAIM_FILED')
})

// Trigger 3: On service order rescheduled (3rd+ reschedule)
eventBus.subscribe(ServiceOrderRescheduled, async (event) => {
  const rescheduleCount = await repo.getRescheduleCount(event.serviceOrderId)
  if (rescheduleCount >= 3) {
    const serviceOrder = await repo.findById(event.serviceOrderId)
    await riskAssessmentService.assess(serviceOrder, 'EVENT_MULTIPLE_RESCHEDULES')
  }
})

// Trigger 4: On checkout incomplete
eventBus.subscribe(CheckoutCompleted, async (event) => {
  if (event.status === 'INCOMPLETE') {
    const serviceOrder = await repo.findById(event.serviceOrderId)
    await riskAssessmentService.assess(serviceOrder, 'EVENT_CHECKOUT_INCOMPLETE')
  }
})

// Trigger 5: On payment failed
eventBus.subscribe(PaymentFailed, async (event) => {
  const serviceOrders = await repo.findBySalesOrderId(event.salesOrderId)
  for (const so of serviceOrders) {
    await riskAssessmentService.assess(so, 'EVENT_PAYMENT_FAILED')
  }
})
```

### High Risk Handling

```typescript
// When HIGH or CRITICAL risk detected, create task
eventBus.subscribe(HighRiskDetected, async (event) => {
  const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId)
  const project = await projectRepo.findById(serviceOrder.projectId)

  await taskService.createTask({
    type: 'SERVICE_ORDER_RISK_REVIEW',
    priority: event.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    serviceOrderId: event.serviceOrderId,
    assignedTo: project.responsibleOperatorId,
    context: {
      riskLevel: event.riskLevel,
      riskFactors: event.riskFactors
    }
  })
})
```

---

**End of Domain Model Updates Document**
