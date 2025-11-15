# Domain Model Overview

## Purpose

Defines the core domain models, entities, value objects, and aggregates for the AHS Field Service Execution Platform using Domain-Driven Design (DDD) principles.

## Ubiquitous Language

### Core Concepts

| Term | Definition | Context |
|------|------------|---------|
| **Provider** | Parent company or independent contractor offering field services | Provider & Capacity |
| **Work Team** | Specific crew or technician group under a provider | Provider & Capacity |
| **Project** | Parent entity grouping related service orders for a customer | Orchestration |
| **Service Order** | Single service request (installation, TV, maintenance, rework) | Orchestration |
| **Technical Visit (TV)** | Assessment visit before or after sale | Orchestration |
| **Confirmation TV** | TV required to validate if standard package can be delivered | Orchestration |
| **Work Closing Form (WCF)** | Post-service attestation document signed by customer | Contracts |
| **P1 Service** | Priority/focus service for a provider (core competency) | Provider & Capacity |
| **P2 Service** | Standard/acceptable service for a provider | Provider & Capacity |
| **Opt-Out** | Service type that provider refuses to perform | Provider & Capacity |
| **Buffer** | Minimum time delay before/after service (global, static, commute) | Scheduling |
| **Assignment Run** | Single execution of provider candidate filtering and scoring | Assignment |
| **Offer** | Formal job proposal sent to provider for acceptance | Assignment |
| **Funnel** | Audit trail showing candidate filtering stages | Assignment |

## Aggregates & Bounded Contexts

### 1. Provider & Capacity Context

**Aggregate Root**: `Provider`

```typescript
class Provider {
  id: UUID;
  name: string;
  type: 'company' | 'independent';
  capabilities: ProviderCapabilities;
  zones: InterventionZone[];
  workTeams: WorkTeam[];
  servicePreferences: ServicePreference[];
  status: ProviderStatus;
  tier: 1 | 2 | 3;
}

class WorkTeam {
  id: UUID;
  providerId: UUID;
  name: string;
  baseLocation: GeoPoint;
  calendar: Calendar;
  capacity: CapacityRules;
  zones: InterventionZone[];  // Can override provider zones
}
```

**Invariants**:
- Work team zones must be subset of provider zones
- At least one service must be P1 or P2 (cannot opt-out of everything)
- Calendar working hours must be valid (start < end)

### 2. Orchestration Context

**Aggregate Root**: `Project`

```typescript
class Project {
  id: UUID;
  customer: CustomerInfo;
  serviceOrders: ServiceOrder[];
  journey: Journey;
  status: 'active' | 'frozen' | 'completed' | 'cancelled';
  
  // Domain methods
  addServiceOrder(order: ServiceOrder): void;
  freeze(reason: string): void;
  canSchedule(orderId: UUID): boolean;
}

class ServiceOrder {
  id: UUID;
  projectId: UUID;
  type: ServiceType;
  status: ServiceOrderStatus;
  dependencies: Dependency[];
  scheduledSlot: TimeSlot | null;
  assignment: Assignment | null;
  
  // Domain methods
  isBlocked(): boolean;
  canBeAssigned(): boolean;
  transitionTo(newStatus: ServiceOrderStatus): void;
}
```

**State Machine**: See detailed state machine diagrams in `03-project-service-order-domain.md`

### 3. Assignment Context

**Aggregate Root**: `AssignmentRun`

```typescript
class AssignmentRun {
  id: UUID;
  serviceOrderId: UUID;
  initiatedAt: Date;
  mode: 'direct' | 'offer' | 'broadcast';
  
  funnel: FilteringFunnel;
  scoredCandidates: ScoredCandidate[];
  selectedProvider: ProviderId | null;
  offers: Offer[];
  
  // Domain methods
  filterCandidates(providers: Provider[]): FilteringFunnel;
  scoreCandidates(candidates: Provider[]): ScoredCandidate[];
  createOffer(providerId: UUID): Offer;
}
```

## Domain Events

Events are the primary integration mechanism between bounded contexts.

### Event Naming Convention

```
{context}.{entity}.{past_tense_action}

Examples:
- projects.service_order.created
- assignments.offer.accepted
- execution.checkout.completed
```

### Core Domain Events

```typescript
// Orchestration events
interface ServiceOrderCreated {
  eventId: UUID;
  eventType: 'projects.service_order.created';
  timestamp: Date;
  payload: {
    serviceOrderId: UUID;
    projectId: UUID;
    serviceType: string;
    countryCode: string;
    buCode: string;
  };
}

interface ServiceOrderBlocked {
  eventId: UUID;
  eventType: 'projects.service_order.blocked';
  timestamp: Date;
  payload: {
    serviceOrderId: UUID;
    blockingReason: string;
    blockedByOrderId?: UUID;
  };
}

// Assignment events
interface OfferAccepted {
  eventId: UUID;
  eventType: 'assignments.offer.accepted';
  timestamp: Date;
  payload: {
    offerId: UUID;
    serviceOrderId: UUID;
    providerId: UUID;
    teamId: UUID;
    acceptedDate: Date;
  };
}

// Execution events
interface CheckoutCompleted {
  eventId: UUID;
  eventType: 'execution.checkout.completed';
  timestamp: Date;
  payload: {
    executionId: UUID;
    serviceOrderId: UUID;
    completedAt: Date;
    completed: boolean;
    incompletionReason?: string;
  };
}
```

## Value Objects

Value objects are immutable and defined by their attributes, not identity.

```typescript
class TimeSlot {
  constructor(
    public readonly date: Date,
    public readonly startTime: Time,
    public readonly endTime: Time
  ) {
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }
  }
  
  overlaps(other: TimeSlot): boolean {
    // Implementation
  }
}

class GeoPoint {
  constructor(
    public readonly lat: number,
    public readonly lng: number
  ) {
    if (lat < -90 || lat > 90) throw new Error('Invalid latitude');
    if (lng < -180 || lng > 180) throw new Error('Invalid longitude');
  }
  
  distanceTo(other: GeoPoint): number {
    // Haversine formula
  }
}

class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: CurrencyCode
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }
  
  equals(other: Money): boolean {
    return this.amount === other.amount && 
           this.currency === other.currency;
  }
}
```

## Repository Patterns

```typescript
interface ProviderRepository {
  findById(id: UUID): Promise<Provider | null>;
  findByZone(postalCode: string, countryCode: string): Promise<Provider[]>;
  findEligibleForService(criteria: EligibilityCriteria): Promise<Provider[]>;
  save(provider: Provider): Promise<void>;
}

interface ServiceOrderRepository {
  findById(id: UUID): Promise<ServiceOrder | null>;
  findByProject(projectId: UUID): Promise<ServiceOrder[]>;
  findUnassigned(country: string): Promise<ServiceOrder[]>;
  save(order: ServiceOrder): Promise<void>;
}
```

## Domain Services

Domain services encapsulate business logic that doesn't naturally fit into an entity.

```typescript
class BufferCalculationService {
  calculateEarliestDate(
    orderCreatedDate: Date,
    productDeliveryDate: Date | null,
    serviceType: string,
    country: string
  ): Date {
    const globalBuffer = this.getGlobalBuffer(country, serviceType);
    const staticBuffer = productDeliveryDate 
      ? this.getStaticBuffer(country, serviceType)
      : 0;
    
    // Stack buffers and calculate
    // ...
  }
}

class ProviderScoringService {
  scoreCandidate(
    provider: Provider,
    serviceOrder: ServiceOrder,
    context: ScoringContext
  ): ScoredCandidate {
    const scores = {
      p1Match: this.calculateP1Score(provider, serviceOrder),
      tier: this.calculateTierScore(provider),
      distance: this.calculateDistanceScore(provider, serviceOrder),
      quality: this.calculateQualityScore(provider),
      continuity: this.calculateContinuityScore(provider, context),
    };
    
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    
    return {
      providerId: provider.id,
      totalScore,
      breakdown: scores,
      rationale: this.generateRationale(scores)
    };
  }
}
```

## Validation Rules

### Cross-Aggregate Validation

Some validations require coordination across aggregates:

```typescript
class AssignmentValidator {
  async validateAssignment(
    serviceOrder: ServiceOrder,
    provider: Provider,
    team: WorkTeam
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Zone validation
    if (!this.isInZone(serviceOrder.address, team.zones)) {
      errors.push('Service address outside team zones');
    }
    
    // Service type validation
    const pref = team.getServicePreference(serviceOrder.serviceType);
    if (pref === 'OPT_OUT') {
      errors.push('Team has opted out of this service type');
    }
    
    // Capability validation
    if (serviceOrder.type === 'installation' && !team.canPerformInstallation) {
      errors.push('Team cannot perform installations');
    }
    
    // Document validation
    const requiredDocs = await this.getRequiredDocuments(serviceOrder.serviceType);
    const missingDocs = this.checkMissingDocuments(provider, requiredDocs);
    if (missingDocs.length > 0) {
      errors.push(`Missing documents: ${missingDocs.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

## Anti-Corruption Layer

When integrating with external systems (Pyxis, Oracle), use ACL pattern:

```typescript
class SalesOrderAdapter {
  async fromSalesOrder(salesOrder: PyxisOrder): Promise<Project> {
    // Transform external model to domain model
    const project = new Project({
      customerId: salesOrder.customer.id,
      customerName: salesOrder.customer.name,
      // ...
    });
    
    for (const line of salesOrder.lines) {
      const serviceOrder = this.createServiceOrder(line);
      project.addServiceOrder(serviceOrder);
    }
    
    return project;
  }
}
```

## Next Steps

- Review specific domain models in subsequent domain documents
- Understand state machines in `03-project-service-order-domain.md`
- Study business rules in scheduling and assignment docs

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
