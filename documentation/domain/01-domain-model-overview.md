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
| **Sales System** | External system that originates service orders (Pyxis, Tempo, SAP) | Sales Integration |
| **Sales Adapter** | Integration component that normalizes sales system payloads to FSM domain model | Sales Integration |
| **Sales Channel** | How customer initiated order (store, web, call center, mobile, partner) | Sales Integration |
| **External Order ID** | Unique identifier in the originating sales system | Sales Integration |
| **Order Mapping** | Bidirectional reference between external and FSM order IDs | Sales Integration |

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

### 4. Sales Integration Context

**Aggregate Root**: `SalesSystemAdapter`

**Purpose**: Multi-sales-system integration layer that normalizes incoming orders from heterogeneous sales systems (Pyxis, Tempo, SAP) into the FSM domain model while maintaining sales-system-agnostic core domain logic.

**Core Entities**:

```typescript
class SalesSystem {
  id: UUID;
  name: string;  // "Pyxis", "Tempo", "SAP"
  code: string;  // "pyxis", "tempo", "sap"
  apiBaseUrl: string;
  supportedCountries: string[];
  supportedChannels: SalesChannel[];
  configuration: SalesSystemConfig;
  dataMapping: DataMappingRules;
  status: 'active' | 'maintenance' | 'deprecated';
}

class SalesChannel {
  channel: 'store' | 'web' | 'call_center' | 'mobile' | 'partner';
  description: string;
  requiresAdditionalData: boolean;
}

class ServiceOrderMapping {
  id: UUID;
  salesSystemId: UUID;
  externalOrderId: string;  // ID in sales system
  fsmServiceOrderId: UUID;  // ID in FSM system
  salesChannel: SalesChannel;
  rawPayload: JSON;  // Original order data
  normalizedAt: Date;
  transformationVersion: string;

  // Bidirectional mapping for status updates
  getExternalOrderId(): string;
  getFsmServiceOrderId(): UUID;
}

class SalesAdapter {
  salesSystemId: UUID;

  // Transform external order to FSM model
  transformOrder(externalOrder: ExternalOrderPayload): ServiceOrder;

  // Send FSM status back to sales system
  sendOrderStatusUpdate(orderId: UUID, status: OrderStatus): Promise<void>;
  requestCancellation(orderId: UUID, reason: string): Promise<void>;
  sendTVModifications(orderId: UUID, modifications: Modification[]): Promise<void>;

  // Validate external payload
  validatePayload(payload: any): ValidationResult;
}
```

**Sales-System-Agnostic Domain Model**:

The core FSM domain (Project, ServiceOrder, Assignment, Execution) remains **completely independent** of sales systems. The Integration Adapters Context is responsible for:

1. **Normalization**: Transform Pyxis/Tempo/SAP payloads into standard FSM ServiceOrder
2. **Abstraction**: Hide sales system specifics from core domain
3. **Bidirectional Mapping**: Track external order IDs for status updates
4. **Channel Awareness**: Preserve sales channel information (store, web, call center, etc.)
5. **Failure Handling**: Retry logic, error tracking, DLQ management

**Adapter Pattern**:

```typescript
interface ISalesAdapter {
  transformOrder(externalOrder: any): Promise<ServiceOrder>;
  sendOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<void>;
  requestCancellation(orderId: string, reason: string): Promise<void>;
  sendTVModifications(orderId: string, modifications: Modification[]): Promise<void>;
}

class PyxisAdapter implements ISalesAdapter {
  async transformOrder(pyxisOrder: PyxisOrderPayload): Promise<ServiceOrder> {
    // Normalize Pyxis-specific structure to FSM domain model
    return {
      id: uuid(),
      sourceSystem: 'pyxis',
      externalOrderId: pyxisOrder.order_id,
      salesChannel: this.mapChannel(pyxisOrder.channel),
      customer: {
        id: pyxisOrder.customer.customer_id,
        name: `${pyxisOrder.customer.first_name} ${pyxisOrder.customer.last_name}`,
        email: pyxisOrder.customer.email,
        phone: pyxisOrder.customer.phone,
      },
      products: pyxisOrder.line_items.map(item => ({
        productId: item.product_code,
        name: item.product_name,
        quantity: item.quantity,
        serviceType: this.mapServiceType(item.service_code),
      })),
      address: {
        street: pyxisOrder.delivery_address.street,
        city: pyxisOrder.delivery_address.city,
        postalCode: pyxisOrder.delivery_address.postal_code,
        country: pyxisOrder.delivery_address.country_code,
      },
      countryCode: pyxisOrder.store.country_code,
      buCode: pyxisOrder.store.business_unit,
      rawPayload: JSON.stringify(pyxisOrder),
      createdAt: new Date(),
    };
  }

  async sendOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<void> {
    // Send status back to Pyxis via Kafka or REST API
    await this.kafkaProducer.send({
      topic: 'fsm.order.status_updated',
      key: orderId,
      value: {
        order_id: orderId,
        status: this.mapStatusToPyxis(status),
        updated_at: new Date().toISOString(),
      },
    });
  }
}

class TempoAdapter implements ISalesAdapter {
  async transformOrder(tempoRequest: TempoServiceRequest): Promise<ServiceOrder> {
    // Normalize Tempo-specific structure to FSM domain model
    return {
      id: uuid(),
      sourceSystem: 'tempo',
      externalOrderId: tempoRequest.request_id,
      salesChannel: this.mapChannel(tempoRequest.origin_channel),
      // ... similar normalization logic
    };
  }
}

class SalesAdapterRegistry {
  private adapters = new Map<string, ISalesAdapter>();

  constructor(
    private readonly pyxisAdapter: PyxisAdapter,
    private readonly tempoAdapter: TempoAdapter,
    private readonly sapAdapter: SapAdapter,
  ) {
    this.adapters.set('pyxis', this.pyxisAdapter);
    this.adapters.set('tempo', this.tempoAdapter);
    this.adapters.set('sap', this.sapAdapter);
  }

  async processOrder(sourceSystem: string, externalOrder: any): Promise<ServiceOrder> {
    const adapter = this.getAdapter(sourceSystem);
    const normalized = await adapter.transformOrder(externalOrder);

    // Store mapping for bidirectional reference
    await this.mappingRepository.create({
      salesSystemId: this.getSalesSystemId(sourceSystem),
      externalOrderId: externalOrder.order_id || externalOrder.request_id,
      fsmServiceOrderId: normalized.id,
      salesChannel: normalized.salesChannel,
      rawPayload: JSON.stringify(externalOrder),
      normalizedAt: new Date(),
    });

    // Publish to FSM domain
    await this.kafkaProducer.send({
      topic: 'projects.service_order.created',
      key: normalized.id,
      value: normalized,
    });

    return normalized;
  }

  private getAdapter(sourceSystem: string): ISalesAdapter {
    const adapter = this.adapters.get(sourceSystem.toLowerCase());
    if (!adapter) {
      throw new Error(`No adapter found for sales system: ${sourceSystem}`);
    }
    return adapter;
  }
}
```

**Invariants**:
- Each ServiceOrder must have exactly one source system
- External order IDs must be unique within a sales system
- Sales channel must be one of the predefined values
- Raw payload must be stored for audit and debugging
- Transformation must be idempotent (same input → same output)

**Integration Events**:

```typescript
// Inbound from sales systems
interface SalesOrderReceived {
  eventId: UUID;
  eventType: 'sales.pyxis.order.created' | 'sales.tempo.service.requested';
  timestamp: Date;
  payload: {
    salesSystemId: UUID;
    externalOrderId: string;
    salesChannel: SalesChannel;
    rawPayload: JSON;
  };
}

// Internal normalization events
interface SalesOrderNormalized {
  eventId: UUID;
  eventType: 'integration.sales.order.normalized';
  timestamp: Date;
  payload: {
    sourceSystem: 'pyxis' | 'tempo' | 'sap';
    externalOrderId: string;
    fsmServiceOrderId: UUID;
    transformationVersion: string;
  };
}

interface SalesOrderFailed {
  eventId: UUID;
  eventType: 'integration.sales.order.failed';
  timestamp: Date;
  payload: {
    sourceSystem: string;
    externalOrderId: string;
    errorCode: string;
    errorMessage: string;
    rawPayload: JSON;
    retryCount: number;
  };
}

// Outbound to sales systems
interface FsmOrderStatusUpdated {
  eventId: UUID;
  eventType: 'fsm.order.status_updated';
  timestamp: Date;
  payload: {
    sourceSystem: string;
    externalOrderId: string;
    fsmServiceOrderId: UUID;
    status: OrderStatus;
    scheduledDate?: Date;
    providerName?: string;
  };
}
```

**Multi-Channel Support**:

Sales channels represent how the customer initiated the order:
- **Store**: Order placed at physical retail location
- **Web**: Order placed via e-commerce website
- **Call Center**: Order placed via phone with agent
- **Mobile**: Order placed via mobile app
- **Partner**: Order placed by third-party partner

This information is preserved throughout the service order lifecycle for analytics and customer communication preferences.

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
