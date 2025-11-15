# Project & Service Order Domain Model - AHS Field Service Execution Platform

## Document Purpose
This document defines the complete domain model for Projects, Service Orders, Journeys, Dependencies, and their associated state machines. It serves as the authoritative specification for all project and service order management business logic.

---

## 1. Service Order Aggregate

### 1.1 Service Order Entity (Aggregate Root)

**Identity:**
```typescript
class ServiceOrderId extends ValueObject {
  readonly value: string // UUID format

  static create(value?: string): Result<ServiceOrderId> {
    const id = value || uuidv4()
    if (!isValidUUID(id)) {
      return Result.fail('Invalid Service Order ID format')
    }
    return Result.ok(new ServiceOrderId(id))
  }
}
```

**Service Order Aggregate Root:**
```typescript
class ServiceOrder extends AggregateRoot<ServiceOrderId> {
  private _id: ServiceOrderId
  private _projectId?: ProjectId
  private _customerInfo: CustomerInfo
  private _serviceType: ServiceType
  private _requiredSkills: Skill[]
  private _location: Location
  private _schedulingWindow: SchedulingWindow
  private _estimatedDuration: Duration
  private _priority: Priority
  private _state: ServiceOrderState
  private _scheduledSlot?: ScheduledSlot
  private _assignedProviderId?: ProviderId
  private _dependencies: ServiceOrderDependency[]
  private _buffers: Buffer[]
  private _metadata: ServiceOrderMetadata

  // Getters
  get id(): ServiceOrderId { return this._id }
  get projectId(): ProjectId | undefined { return this._projectId }
  get customerInfo(): CustomerInfo { return this._customerInfo }
  get requiredSkills(): ReadonlyArray<Skill> { return this._requiredSkills }
  get state(): ServiceOrderState { return this._state }
  get scheduledSlot(): ScheduledSlot | undefined { return this._scheduledSlot }
  get assignedProviderId(): ProviderId | undefined { return this._assignedProviderId }
  get dependencies(): ReadonlyArray<ServiceOrderDependency> { return this._dependencies }

  // Business Methods
  schedule(slot: TimeSlot, buffers: Buffer[]): Result<void> {
    // Invariant: Cannot schedule outside scheduling window
    if (!this._schedulingWindow.contains(slot)) {
      return Result.fail('Scheduled slot must be within scheduling window')
    }

    // Invariant: Cannot reschedule after dispatched
    if (this._state === ServiceOrderState.Dispatched ||
        this._state === ServiceOrderState.InProgress ||
        this._state === ServiceOrderState.Completed) {
      return Result.fail(`Cannot reschedule order in ${this._state} state`)
    }

    // Invariant: All dependencies must be satisfied
    const unsatisfiedDeps = this.getUnsatisfiedDependencies()
    if (unsatisfiedDeps.length > 0) {
      return Result.fail(
        `Cannot schedule with unsatisfied dependencies: ${unsatisfiedDeps.map(d => d.dependsOnOrderId.value).join(', ')}`
      )
    }

    this._scheduledSlot = ScheduledSlot.create({
      timeSlot: slot,
      buffersApplied: buffers
    }).value

    this._buffers = buffers

    // Transition state
    const stateResult = this.transitionState(ServiceOrderState.Scheduled, 'Slot allocated')
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderScheduled(
      this._id,
      this._scheduledSlot,
      buffers,
      DateTime.now()
    ))

    return Result.ok()
  }

  assignProvider(providerId: ProviderId): Result<void> {
    // Invariant: Must be scheduled first
    if (!this._scheduledSlot) {
      return Result.fail('Cannot assign provider before scheduling')
    }

    // Invariant: Cannot reassign after dispatched
    if (this._state === ServiceOrderState.Dispatched ||
        this._state === ServiceOrderState.InProgress) {
      return Result.fail(`Cannot reassign provider in ${this._state} state`)
    }

    this._assignedProviderId = providerId

    const stateResult = this.transitionState(ServiceOrderState.Assigned, 'Provider assigned')
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderProviderAssigned(
      this._id,
      providerId,
      DateTime.now()
    ))

    return Result.ok()
  }

  dispatch(): Result<void> {
    // Invariant: Must have assigned provider
    if (!this._assignedProviderId) {
      return Result.fail('Cannot dispatch without assigned provider')
    }

    // Invariant: Must be in Assigned state
    if (this._state !== ServiceOrderState.Assigned) {
      return Result.fail(`Cannot dispatch from ${this._state} state`)
    }

    const stateResult = this.transitionState(ServiceOrderState.Dispatched, 'Provider dispatched')
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderDispatched(
      this._id,
      this._assignedProviderId,
      DateTime.now()
    ))

    return Result.ok()
  }

  start(): Result<void> {
    if (this._state !== ServiceOrderState.Dispatched) {
      return Result.fail(`Cannot start from ${this._state} state`)
    }

    const stateResult = this.transitionState(ServiceOrderState.InProgress, 'Work started')
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderStarted(
      this._id,
      this._assignedProviderId!,
      DateTime.now()
    ))

    return Result.ok()
  }

  complete(actualDuration: Duration, qualityScore?: number): Result<void> {
    if (this._state !== ServiceOrderState.InProgress) {
      return Result.fail(`Cannot complete from ${this._state} state`)
    }

    const stateResult = this.transitionState(ServiceOrderState.Completed, 'Work completed')
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderCompleted(
      this._id,
      this._assignedProviderId!,
      DateTime.now(),
      actualDuration,
      qualityScore
    ))

    return Result.ok()
  }

  verify(): Result<void> {
    if (this._state !== ServiceOrderState.Completed) {
      return Result.fail(`Cannot verify from ${this._state} state`)
    }

    const stateResult = this.transitionState(ServiceOrderState.Verified, 'Quality verified')
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderVerified(
      this._id,
      DateTime.now()
    ))

    return Result.ok()
  }

  cancel(reason: string, requiresApproval: boolean = false): Result<void> {
    // Invariant: Cannot cancel after InProgress without manager approval
    if (this._state === ServiceOrderState.InProgress && !requiresApproval) {
      return Result.fail('Cannot cancel in-progress order without manager approval')
    }

    // Invariant: Cannot cancel terminal states
    if (this._state === ServiceOrderState.Completed ||
        this._state === ServiceOrderState.Verified ||
        this._state === ServiceOrderState.Cancelled) {
      return Result.fail(`Cannot cancel order in ${this._state} state`)
    }

    const previousState = this._state
    const stateResult = this.transitionState(ServiceOrderState.Cancelled, reason)
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderCancelled(
      this._id,
      previousState,
      reason,
      DateTime.now()
    ))

    return Result.ok()
  }

  putOnHold(reason: string): Result<void> {
    if (this._state !== ServiceOrderState.InProgress) {
      return Result.fail(`Cannot put on hold from ${this._state} state`)
    }

    const stateResult = this.transitionState(ServiceOrderState.OnHold, reason)
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderPutOnHold(
      this._id,
      reason,
      DateTime.now()
    ))

    return Result.ok()
  }

  resume(): Result<void> {
    if (this._state !== ServiceOrderState.OnHold) {
      return Result.fail(`Cannot resume from ${this._state} state`)
    }

    const stateResult = this.transitionState(ServiceOrderState.InProgress, 'Work resumed')
    if (stateResult.isFailure) {
      return stateResult
    }

    this.addDomainEvent(new ServiceOrderResumed(
      this._id,
      DateTime.now()
    ))

    return Result.ok()
  }

  addDependency(dependency: ServiceOrderDependency): Result<void> {
    // Invariant: Dependencies must be acyclic
    if (this.wouldCreateCycle(dependency)) {
      return Result.fail('Adding dependency would create a cycle')
    }

    // Invariant: Cannot depend on self
    if (dependency.dependsOnOrderId.equals(this._id)) {
      return Result.fail('Service order cannot depend on itself')
    }

    this._dependencies.push(dependency)

    this.addDomainEvent(new ServiceOrderDependencyAdded(
      this._id,
      dependency.dependsOnOrderId,
      dependency.type
    ))

    return Result.ok()
  }

  // Private helpers
  private transitionState(newState: ServiceOrderState, reason: string): Result<void> {
    const transition = ServiceOrderStateTransitions[this._state]?.[newState]
    if (!transition) {
      return Result.fail(`Invalid state transition: ${this._state} -> ${newState}`)
    }

    if (transition.condition && !transition.condition(this)) {
      return Result.fail(`Transition condition not met: ${transition.description}`)
    }

    const previousState = this._state
    this._state = newState

    this.addDomainEvent(new ServiceOrderStateChanged(
      this._id,
      previousState,
      newState,
      reason,
      DateTime.now()
    ))

    return Result.ok()
  }

  private getUnsatisfiedDependencies(): ServiceOrderDependency[] {
    // This would check against a repository or domain service
    // For now, return empty array (implementation detail)
    return []
  }

  private wouldCreateCycle(newDependency: ServiceOrderDependency): boolean {
    // Implement cycle detection algorithm (DFS or topological sort)
    // For now, return false (implementation detail)
    return false
  }
}
```

---

## 2. Service Order State Machine

### 2.1 Service Order States

```typescript
enum ServiceOrderState {
  Created = 'Created',
  Scheduled = 'Scheduled',
  Assigned = 'Assigned',
  Dispatched = 'Dispatched',
  InProgress = 'InProgress',
  OnHold = 'OnHold',
  Completed = 'Completed',
  Verified = 'Verified',
  Cancelled = 'Cancelled'
}
```

### 2.2 State Transition Rules

```typescript
interface StateTransitionRule {
  condition?: (order: ServiceOrder) => boolean
  description: string
  requiresApproval?: boolean
}

const ServiceOrderStateTransitions: Record<
  ServiceOrderState,
  Partial<Record<ServiceOrderState, StateTransitionRule>>
> = {
  [ServiceOrderState.Created]: {
    [ServiceOrderState.Scheduled]: {
      condition: (order) => order.schedulingWindow.isValid(),
      description: 'Slot allocated within scheduling window'
    },
    [ServiceOrderState.Cancelled]: {
      description: 'Order cancelled before scheduling'
    }
  },

  [ServiceOrderState.Scheduled]: {
    [ServiceOrderState.Assigned]: {
      condition: (order) => order.scheduledSlot !== undefined,
      description: 'Provider matched and assigned'
    },
    [ServiceOrderState.Cancelled]: {
      description: 'Order cancelled after scheduling'
    }
  },

  [ServiceOrderState.Assigned]: {
    [ServiceOrderState.Dispatched]: {
      condition: (order) => order.assignedProviderId !== undefined,
      description: 'Provider confirmed assignment'
    },
    [ServiceOrderState.Scheduled]: {
      description: 'Provider declined, back to scheduling'
    },
    [ServiceOrderState.Cancelled]: {
      description: 'Order cancelled after assignment'
    }
  },

  [ServiceOrderState.Dispatched]: {
    [ServiceOrderState.InProgress]: {
      description: 'Provider started work'
    },
    [ServiceOrderState.Assigned]: {
      description: 'Provider became unavailable, need reassignment'
    },
    [ServiceOrderState.Cancelled]: {
      requiresApproval: true,
      description: 'Order cancelled after dispatch (requires approval)'
    }
  },

  [ServiceOrderState.InProgress]: {
    [ServiceOrderState.Completed]: {
      description: 'Work finished successfully'
    },
    [ServiceOrderState.OnHold]: {
      description: 'Work temporarily suspended'
    },
    [ServiceOrderState.Cancelled]: {
      requiresApproval: true,
      description: 'Order cancelled during work (requires manager approval)'
    }
  },

  [ServiceOrderState.OnHold]: {
    [ServiceOrderState.InProgress]: {
      description: 'Work resumed after hold'
    },
    [ServiceOrderState.Cancelled]: {
      description: 'Order cancelled while on hold'
    }
  },

  [ServiceOrderState.Completed]: {
    [ServiceOrderState.Verified]: {
      description: 'Quality check passed'
    }
  },

  [ServiceOrderState.Verified]: {
    // Terminal state - no transitions out
  },

  [ServiceOrderState.Cancelled]: {
    // Terminal state - no transitions out
  }
}
```

### 2.3 State Business Rules

```typescript
class ServiceOrderStateRules {
  static canReschedule(state: ServiceOrderState): boolean {
    return [
      ServiceOrderState.Created,
      ServiceOrderState.Scheduled,
      ServiceOrderState.Assigned
    ].includes(state)
  }

  static canReassignProvider(state: ServiceOrderState): boolean {
    return [
      ServiceOrderState.Scheduled,
      ServiceOrderState.Assigned
    ].includes(state)
  }

  static requiresApprovalToCancel(state: ServiceOrderState): boolean {
    return [
      ServiceOrderState.Dispatched,
      ServiceOrderState.InProgress
    ].includes(state)
  }

  static isTerminalState(state: ServiceOrderState): boolean {
    return [
      ServiceOrderState.Verified,
      ServiceOrderState.Cancelled
    ].includes(state)
  }

  static canModifyDetails(state: ServiceOrderState): boolean {
    return [
      ServiceOrderState.Created,
      ServiceOrderState.Scheduled
    ].includes(state)
  }

  static maxOnHoldDuration = Duration.days(7)

  static validateOnHoldDuration(
    putOnHoldAt: DateTime,
    currentTime: DateTime
  ): ValidationResult {
    const duration = Duration.between(putOnHoldAt, currentTime)

    if (duration.isGreaterThan(this.maxOnHoldDuration)) {
      return ValidationResult.fail(
        `Order has been on hold for ${duration.toDays()} days, exceeding max of ${this.maxOnHoldDuration.toDays()} days`
      )
    }

    return ValidationResult.ok()
  }
}
```

---

## 3. Service Order Dependencies

### 3.1 Service Order Dependency Value Object

```typescript
enum DependencyType {
  FinishToStart = 'FinishToStart', // Predecessor must finish before successor starts
  StartToStart = 'StartToStart',   // Both must start at same time
  FinishToFinish = 'FinishToFinish', // Both must finish at same time
  StartToFinish = 'StartToFinish'  // Successor must finish when predecessor starts
}

class ServiceOrderDependency extends ValueObject {
  readonly id: string
  readonly serviceOrderId: ServiceOrderId // The dependent order
  readonly dependsOnOrderId: ServiceOrderId // The prerequisite order
  readonly type: DependencyType
  readonly lagTime: Duration // Optional delay between orders
  readonly metadata: DependencyMetadata

  isSatisfied(
    dependentOrderState: ServiceOrderState,
    prerequisiteOrderState: ServiceOrderState
  ): boolean {
    switch (this.type) {
      case DependencyType.FinishToStart:
        return [
          ServiceOrderState.Completed,
          ServiceOrderState.Verified
        ].includes(prerequisiteOrderState)

      case DependencyType.StartToStart:
        return [
          ServiceOrderState.InProgress,
          ServiceOrderState.Completed,
          ServiceOrderState.Verified
        ].includes(prerequisiteOrderState)

      case DependencyType.FinishToFinish:
        return [
          ServiceOrderState.Completed,
          ServiceOrderState.Verified
        ].includes(prerequisiteOrderState)

      case DependencyType.StartToFinish:
        return [
          ServiceOrderState.InProgress,
          ServiceOrderState.Completed,
          ServiceOrderState.Verified
        ].includes(prerequisiteOrderState)

      default:
        return false
    }
  }

  calculateEarliestStartTime(prerequisiteScheduledSlot: ScheduledSlot): DateTime {
    const prerequisiteEnd = prerequisiteScheduledSlot.timeSlot.endTime

    switch (this.type) {
      case DependencyType.FinishToStart:
        return prerequisiteEnd.add(this.lagTime)

      case DependencyType.StartToStart:
        return prerequisiteScheduledSlot.timeSlot.startTime.add(this.lagTime)

      case DependencyType.FinishToFinish:
        // Depends on duration of dependent order
        return prerequisiteEnd.add(this.lagTime)

      case DependencyType.StartToFinish:
        return prerequisiteScheduledSlot.timeSlot.startTime.add(this.lagTime)

      default:
        return prerequisiteEnd
    }
  }

  static create(props: {
    serviceOrderId: ServiceOrderId
    dependsOnOrderId: ServiceOrderId
    type: DependencyType
    lagTime?: Duration
    metadata?: DependencyMetadata
  }): Result<ServiceOrderDependency> {
    if (props.serviceOrderId.equals(props.dependsOnOrderId)) {
      return Result.fail('Service order cannot depend on itself')
    }

    return Result.ok(new ServiceOrderDependency({
      id: uuidv4(),
      ...props,
      lagTime: props.lagTime || Duration.zero()
    }))
  }
}

interface DependencyMetadata {
  reason: string
  createdBy: string
  createdAt: DateTime
}
```

### 3.2 Dependency Validation Service

```typescript
class DependencyValidationService {
  async validateDependencies(
    order: ServiceOrder,
    orderRepo: ServiceOrderRepository
  ): Promise<ValidationResult> {
    const dependencies = order.dependencies

    // Check for cycles
    const cycleResult = await this.detectCycles(order.id, dependencies, orderRepo)
    if (cycleResult.isFailure) {
      return cycleResult
    }

    // Validate all dependencies are satisfiable
    for (const dep of dependencies) {
      const prerequisite = await orderRepo.findById(dep.dependsOnOrderId)

      if (!prerequisite) {
        return ValidationResult.fail(
          `Prerequisite order ${dep.dependsOnOrderId.value} not found`
        )
      }

      if (!dep.isSatisfied(order.state, prerequisite.state)) {
        return ValidationResult.fail(
          `Dependency on ${dep.dependsOnOrderId.value} not satisfied`
        )
      }
    }

    return ValidationResult.ok()
  }

  private async detectCycles(
    orderId: ServiceOrderId,
    dependencies: ServiceOrderDependency[],
    orderRepo: ServiceOrderRepository,
    visited: Set<string> = new Set()
  ): Promise<ValidationResult> {
    if (visited.has(orderId.value)) {
      return ValidationResult.fail('Circular dependency detected')
    }

    visited.add(orderId.value)

    for (const dep of dependencies) {
      const prerequisite = await orderRepo.findById(dep.dependsOnOrderId)
      if (prerequisite) {
        const result = await this.detectCycles(
          prerequisite.id,
          prerequisite.dependencies,
          orderRepo,
          new Set(visited)
        )
        if (result.isFailure) {
          return result
        }
      }
    }

    return ValidationResult.ok()
  }

  async calculateDependencyChain(
    order: ServiceOrder,
    orderRepo: ServiceOrderRepository
  ): Promise<ServiceOrder[]> {
    const chain: ServiceOrder[] = []
    const visited = new Set<string>()

    await this.buildChain(order, orderRepo, chain, visited)

    return chain
  }

  private async buildChain(
    order: ServiceOrder,
    orderRepo: ServiceOrderRepository,
    chain: ServiceOrder[],
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(order.id.value)) {
      return
    }

    visited.add(order.id.value)

    for (const dep of order.dependencies) {
      const prerequisite = await orderRepo.findById(dep.dependsOnOrderId)
      if (prerequisite) {
        await this.buildChain(prerequisite, orderRepo, chain, visited)
      }
    }

    chain.push(order)
  }
}
```

---

## 4. Project Aggregate

### 4.1 Project Entity (Aggregate Root)

```typescript
class ProjectId extends ValueObject {
  readonly value: string

  static create(value?: string): Result<ProjectId> {
    const id = value || uuidv4()
    if (!isValidUUID(id)) {
      return Result.fail('Invalid Project ID format')
    }
    return Result.ok(new ProjectId(id))
  }
}

class Project extends AggregateRoot<ProjectId> {
  private _id: ProjectId
  private _name: string
  private _customerInfo: CustomerInfo
  private _serviceOrderIds: ServiceOrderId[]
  private _status: ProjectStatus
  private _timeline: ProjectTimeline
  private _metadata: ProjectMetadata

  // Getters
  get id(): ProjectId { return this._id }
  get name(): string { return this._name }
  get customerInfo(): CustomerInfo { return this._customerInfo }
  get serviceOrderIds(): ReadonlyArray<ServiceOrderId> { return this._serviceOrderIds }
  get status(): ProjectStatus { return this._status }
  get timeline(): ProjectTimeline { return this._timeline }

  // Business Methods
  addServiceOrder(serviceOrderId: ServiceOrderId): Result<void> {
    // Invariant: Cannot add to completed/cancelled project
    if (this._status === ProjectStatus.Completed ||
        this._status === ProjectStatus.Cancelled) {
      return Result.fail(`Cannot add service order to ${this._status} project`)
    }

    // Invariant: No duplicate service orders
    if (this._serviceOrderIds.some(id => id.equals(serviceOrderId))) {
      return Result.fail('Service order already exists in project')
    }

    this._serviceOrderIds.push(serviceOrderId)

    this.addDomainEvent(new ServiceOrderAddedToProject(
      this._id,
      serviceOrderId,
      DateTime.now()
    ))

    return Result.ok()
  }

  removeServiceOrder(serviceOrderId: ServiceOrderId): Result<void> {
    // Invariant: At least one service order required
    if (this._serviceOrderIds.length <= 1) {
      return Result.fail('Project must have at least one service order')
    }

    const index = this._serviceOrderIds.findIndex(id => id.equals(serviceOrderId))
    if (index === -1) {
      return Result.fail('Service order not found in project')
    }

    this._serviceOrderIds.splice(index, 1)

    this.addDomainEvent(new ServiceOrderRemovedFromProject(
      this._id,
      serviceOrderId,
      DateTime.now()
    ))

    return Result.ok()
  }

  updateStatus(
    newStatus: ProjectStatus,
    serviceOrders: ServiceOrder[]
  ): Result<void> {
    // Validate status transition
    const transition = ProjectStatusTransitions[this._status]?.[newStatus]
    if (!transition) {
      return Result.fail(`Invalid status transition: ${this._status} -> ${newStatus}`)
    }

    // Check if condition is met
    if (transition.condition && !transition.condition(this, serviceOrders)) {
      return Result.fail(`Transition condition not met: ${transition.description}`)
    }

    const previousStatus = this._status
    this._status = newStatus

    this.addDomainEvent(new ProjectStatusChanged(
      this._id,
      previousStatus,
      newStatus,
      DateTime.now()
    ))

    return Result.ok()
  }

  calculateProgress(serviceOrders: ServiceOrder[]): ProjectProgress {
    const total = serviceOrders.length
    const completed = serviceOrders.filter(o =>
      o.state === ServiceOrderState.Completed ||
      o.state === ServiceOrderState.Verified
    ).length
    const inProgress = serviceOrders.filter(o =>
      o.state === ServiceOrderState.InProgress ||
      o.state === ServiceOrderState.Dispatched
    ).length
    const scheduled = serviceOrders.filter(o =>
      o.state === ServiceOrderState.Scheduled ||
      o.state === ServiceOrderState.Assigned
    ).length

    return {
      totalOrders: total,
      completedOrders: completed,
      inProgressOrders: inProgress,
      scheduledOrders: scheduled,
      percentageComplete: (completed / total) * 100
    }
  }

  static create(props: {
    id?: ProjectId
    name: string
    customerInfo: CustomerInfo
    initialServiceOrderIds: ServiceOrderId[]
    timeline: ProjectTimeline
    metadata?: ProjectMetadata
  }): Result<Project> {
    // Invariant: At least one service order required
    if (props.initialServiceOrderIds.length === 0) {
      return Result.fail('Project must have at least one service order')
    }

    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Project name cannot be empty')
    }

    const id = props.id || ProjectId.create().value

    const project = new Project({
      id,
      name: props.name,
      customerInfo: props.customerInfo,
      serviceOrderIds: props.initialServiceOrderIds,
      status: ProjectStatus.Planning,
      timeline: props.timeline,
      metadata: props.metadata || {}
    })

    project.addDomainEvent(new ProjectCreated(
      id,
      props.name,
      props.customerInfo.customerId,
      DateTime.now()
    ))

    return Result.ok(project)
  }
}
```

### 4.2 Project Status State Machine

```typescript
enum ProjectStatus {
  Planning = 'Planning',
  Scheduled = 'Scheduled',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

interface ProjectStatusTransitionRule {
  condition?: (project: Project, orders: ServiceOrder[]) => boolean
  description: string
}

const ProjectStatusTransitions: Record<
  ProjectStatus,
  Partial<Record<ProjectStatus, ProjectStatusTransitionRule>>
> = {
  [ProjectStatus.Planning]: {
    [ProjectStatus.Scheduled]: {
      condition: (project, orders) => orders.every(o =>
        o.state === ServiceOrderState.Scheduled ||
        o.state === ServiceOrderState.Assigned
      ),
      description: 'All service orders scheduled'
    },
    [ProjectStatus.Cancelled]: {
      description: 'Project cancelled during planning'
    }
  },

  [ProjectStatus.Scheduled]: {
    [ProjectStatus.InProgress]: {
      condition: (project, orders) => orders.some(o =>
        o.state === ServiceOrderState.InProgress
      ),
      description: 'At least one service order started'
    },
    [ProjectStatus.Cancelled]: {
      description: 'Project cancelled after scheduling'
    }
  },

  [ProjectStatus.InProgress]: {
    [ProjectStatus.Completed]: {
      condition: (project, orders) => orders.every(o =>
        o.state === ServiceOrderState.Completed ||
        o.state === ServiceOrderState.Verified
      ),
      description: 'All service orders completed'
    },
    [ProjectStatus.Cancelled]: {
      description: 'Project cancelled while in progress'
    }
  },

  [ProjectStatus.Completed]: {
    // Terminal state
  },

  [ProjectStatus.Cancelled]: {
    // Terminal state
  }
}
```

---

## 5. Journey Domain Model

### 5.1 Journey Value Object

```typescript
class JourneyId extends ValueObject {
  readonly value: string

  static create(value?: string): Result<JourneyId> {
    const id = value || uuidv4()
    return Result.ok(new JourneyId(id))
  }
}

class Journey extends ValueObject {
  readonly id: JourneyId
  readonly customerId: CustomerId
  readonly projectId?: ProjectId
  readonly serviceOrderIds: ServiceOrderId[]
  readonly startDate: DateTime
  readonly expectedEndDate: DateTime
  readonly actualEndDate?: DateTime
  readonly touchpoints: Touchpoint[]
  readonly metadata: JourneyMetadata

  getActiveTouchpoints(): Touchpoint[] {
    return this.touchpoints.filter(t => t.isActive())
  }

  calculateSatisfactionScore(): number {
    const touchpointScores = this.touchpoints
      .filter(t => t.satisfactionScore !== undefined)
      .map(t => t.satisfactionScore!)

    if (touchpointScores.length === 0) {
      return 0
    }

    return touchpointScores.reduce((sum, score) => sum + score, 0) / touchpointScores.length
  }

  isComplete(): boolean {
    return this.actualEndDate !== undefined &&
           this.touchpoints.every(t => t.isCompleted())
  }

  static create(props: {
    customerId: CustomerId
    projectId?: ProjectId
    serviceOrderIds: ServiceOrderId[]
    startDate: DateTime
    expectedEndDate: DateTime
    metadata?: JourneyMetadata
  }): Result<Journey> {
    if (props.serviceOrderIds.length === 0) {
      return Result.fail('Journey must have at least one service order')
    }

    if (props.startDate.isAfterOrEqual(props.expectedEndDate)) {
      return Result.fail('Start date must be before expected end date')
    }

    return Result.ok(new Journey({
      id: JourneyId.create().value,
      ...props,
      touchpoints: [],
      metadata: props.metadata || {}
    }))
  }
}

interface JourneyMetadata {
  description: string
  customerExpectations: string[]
  specialRequirements: string[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 5.2 Touchpoint Value Object

```typescript
enum TouchpointType {
  InitialContact = 'InitialContact',
  Scheduling = 'Scheduling',
  PreServiceReminder = 'PreServiceReminder',
  ServiceExecution = 'ServiceExecution',
  PostServiceFollowup = 'PostServiceFollowup',
  QualityCheck = 'QualityCheck',
  FeedbackCollection = 'FeedbackCollection'
}

class Touchpoint extends ValueObject {
  readonly id: string
  readonly type: TouchpointType
  readonly scheduledAt: DateTime
  readonly completedAt?: DateTime
  readonly channel: TouchpointChannel // 'Phone' | 'Email' | 'SMS' | 'App'
  readonly satisfactionScore?: number // 1-5
  readonly notes: string
  readonly metadata: TouchpointMetadata

  isActive(): boolean {
    return this.completedAt === undefined
  }

  isCompleted(): boolean {
    return this.completedAt !== undefined
  }

  isOverdue(): boolean {
    return this.isActive() && DateTime.now().isAfter(this.scheduledAt)
  }

  static create(props: {
    type: TouchpointType
    scheduledAt: DateTime
    channel: TouchpointChannel
    notes?: string
    metadata?: TouchpointMetadata
  }): Result<Touchpoint> {
    return Result.ok(new Touchpoint({
      id: uuidv4(),
      ...props,
      notes: props.notes || '',
      metadata: props.metadata || {}
    }))
  }
}

type TouchpointChannel = 'Phone' | 'Email' | 'SMS' | 'App' | 'InPerson'

interface TouchpointMetadata {
  assignedTo?: string
  priority: 'Low' | 'Medium' | 'High'
  automated: boolean
  createdAt: DateTime
}
```

---

## 6. Value Objects

### 6.1 Customer Info

```typescript
class CustomerId extends ValueObject {
  readonly value: string

  static create(value: string): Result<CustomerId> {
    if (!value || value.trim().length === 0) {
      return Result.fail('Customer ID cannot be empty')
    }
    return Result.ok(new CustomerId(value))
  }
}

class CustomerInfo extends ValueObject {
  readonly customerId: CustomerId
  readonly name: string
  readonly email: Email
  readonly phone: Phone
  readonly address: Address
  readonly preferences: CustomerPreferences

  static create(props: {
    customerId: CustomerId
    name: string
    email: Email
    phone: Phone
    address: Address
    preferences?: CustomerPreferences
  }): Result<CustomerInfo> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('Customer name cannot be empty')
    }

    return Result.ok(new CustomerInfo({
      ...props,
      preferences: props.preferences || {}
    }))
  }
}

interface CustomerPreferences {
  preferredContactMethod: 'Phone' | 'Email' | 'SMS'
  preferredTimeWindows: TimeWindow[]
  specialInstructions: string
}
```

### 6.2 Scheduling Window

```typescript
class SchedulingWindow extends ValueObject {
  readonly startDate: DateTime
  readonly endDate: DateTime
  readonly preferredSlots: TimeSlot[]
  readonly blackoutDates: DateTime[]

  contains(slot: TimeSlot): boolean {
    return slot.startTime.isAfterOrEqual(this.startDate) &&
           slot.endTime.isBeforeOrEqual(this.endDate) &&
           !this.isBlackoutDate(slot.startTime)
  }

  isValid(): boolean {
    return this.startDate.isBefore(this.endDate) &&
           this.startDate.isAfter(DateTime.now())
  }

  getDurationInDays(): number {
    return Duration.between(this.startDate, this.endDate).toDays()
  }

  private isBlackoutDate(date: DateTime): boolean {
    return this.blackoutDates.some(blackout =>
      blackout.toDateString() === date.toDateString()
    )
  }

  static create(props: {
    startDate: DateTime
    endDate: DateTime
    preferredSlots?: TimeSlot[]
    blackoutDates?: DateTime[]
  }): Result<SchedulingWindow> {
    if (props.startDate.isAfterOrEqual(props.endDate)) {
      return Result.fail('Start date must be before end date')
    }

    if (props.startDate.isBefore(DateTime.now())) {
      return Result.fail('Start date cannot be in the past')
    }

    return Result.ok(new SchedulingWindow({
      ...props,
      preferredSlots: props.preferredSlots || [],
      blackoutDates: props.blackoutDates || []
    }))
  }
}
```

### 6.3 Scheduled Slot

```typescript
class ScheduledSlot extends ValueObject {
  readonly timeSlot: TimeSlot
  readonly buffersApplied: Buffer[]
  readonly confirmedAt: DateTime
  readonly metadata: ScheduledSlotMetadata

  getEffectiveStartTime(): DateTime {
    const travelBuffer = this.buffersApplied.find(b => b.type === BufferType.Travel)
    const prepBuffer = this.buffersApplied.find(b => b.type === BufferType.Prep)

    let effectiveStart = this.timeSlot.startTime

    if (travelBuffer) {
      effectiveStart = effectiveStart.subtract(travelBuffer.duration)
    }

    if (prepBuffer) {
      effectiveStart = effectiveStart.subtract(prepBuffer.duration)
    }

    return effectiveStart
  }

  getEffectiveEndTime(): DateTime {
    const postBuffer = this.buffersApplied.find(b => b.type === BufferType.Post)

    let effectiveEnd = this.timeSlot.endTime

    if (postBuffer) {
      effectiveEnd = effectiveEnd.add(postBuffer.duration)
    }

    return effectiveEnd
  }

  getTotalDuration(): Duration {
    const start = this.getEffectiveStartTime()
    const end = this.getEffectiveEndTime()
    return Duration.between(start, end)
  }

  static create(props: {
    timeSlot: TimeSlot
    buffersApplied: Buffer[]
    metadata?: ScheduledSlotMetadata
  }): Result<ScheduledSlot> {
    return Result.ok(new ScheduledSlot({
      ...props,
      confirmedAt: DateTime.now(),
      metadata: props.metadata || {}
    }))
  }
}

interface ScheduledSlotMetadata {
  scheduledBy: string
  notes: string
}
```

---

## 7. Domain Events

```typescript
// Service Order Events
class ServiceOrderCreated extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly projectId: ProjectId | undefined,
    public readonly customerId: CustomerId,
    public readonly requiredSkills: SkillId[],
    public readonly schedulingWindow: SchedulingWindow,
    public readonly createdAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderScheduled extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly scheduledSlot: ScheduledSlot,
    public readonly buffersApplied: Buffer[],
    public readonly scheduledAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderProviderAssigned extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly providerId: ProviderId,
    public readonly assignedAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderDispatched extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly providerId: ProviderId,
    public readonly dispatchedAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderStarted extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly providerId: ProviderId,
    public readonly startedAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderCompleted extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly providerId: ProviderId,
    public readonly completedAt: DateTime,
    public readonly actualDuration: Duration,
    public readonly qualityScore?: number
  ) {
    super()
  }
}

class ServiceOrderVerified extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly verifiedAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderCancelled extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly previousState: ServiceOrderState,
    public readonly reason: string,
    public readonly cancelledAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderPutOnHold extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly reason: string,
    public readonly putOnHoldAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderResumed extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly resumedAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderStateChanged extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly previousState: ServiceOrderState,
    public readonly newState: ServiceOrderState,
    public readonly reason: string,
    public readonly changedAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderDependencyAdded extends DomainEvent {
  constructor(
    public readonly serviceOrderId: ServiceOrderId,
    public readonly dependsOnOrderId: ServiceOrderId,
    public readonly dependencyType: DependencyType
  ) {
    super()
  }
}

// Project Events
class ProjectCreated extends DomainEvent {
  constructor(
    public readonly projectId: ProjectId,
    public readonly name: string,
    public readonly customerId: CustomerId,
    public readonly createdAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderAddedToProject extends DomainEvent {
  constructor(
    public readonly projectId: ProjectId,
    public readonly serviceOrderId: ServiceOrderId,
    public readonly addedAt: DateTime
  ) {
    super()
  }
}

class ServiceOrderRemovedFromProject extends DomainEvent {
  constructor(
    public readonly projectId: ProjectId,
    public readonly serviceOrderId: ServiceOrderId,
    public readonly removedAt: DateTime
  ) {
    super()
  }
}

class ProjectStatusChanged extends DomainEvent {
  constructor(
    public readonly projectId: ProjectId,
    public readonly previousStatus: ProjectStatus,
    public readonly newStatus: ProjectStatus,
    public readonly changedAt: DateTime
  ) {
    super()
  }
}
```

---

## 8. Repository Interfaces

```typescript
interface ServiceOrderRepository {
  findById(id: ServiceOrderId): Promise<ServiceOrder | null>
  findByProject(projectId: ProjectId): Promise<ServiceOrder[]>
  findByCustomer(customerId: CustomerId): Promise<ServiceOrder[]>
  findByState(state: ServiceOrderState): Promise<ServiceOrder[]>
  findScheduledInWindow(window: TimeWindow): Promise<ServiceOrder[]>
  findByProvider(providerId: ProviderId): Promise<ServiceOrder[]>
  findDependentOrders(orderId: ServiceOrderId): Promise<ServiceOrder[]>
  save(order: ServiceOrder): Promise<void>
  delete(id: ServiceOrderId): Promise<void>
}

interface ProjectRepository {
  findById(id: ProjectId): Promise<Project | null>
  findByCustomer(customerId: CustomerId): Promise<Project[]>
  findByStatus(status: ProjectStatus): Promise<Project[]>
  save(project: Project): Promise<void>
  delete(id: ProjectId): Promise<void>
}

interface JourneyRepository {
  findById(id: JourneyId): Promise<Journey | null>
  findByCustomer(customerId: CustomerId): Promise<Journey[]>
  findByProject(projectId: ProjectId): Promise<Journey | null>
  findActiveJourneys(): Promise<Journey[]>
  save(journey: Journey): Promise<void>
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
  - `/product-docs/domain/02-provider-capacity-domain.md`
  - `/product-docs/prd/ahs-field-service-prd.md`
