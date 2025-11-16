# TypeScript Domain Models - v2.0 Features

**Generated**: 2025-11-16
**Purpose**: Domain-Driven Design (DDD) models for v2.0 features
**Pattern**: Value Objects + Domain Events + Immutability

---

## 📋 Overview

This directory contains **TypeScript domain models** following Domain-Driven Design (DDD) principles:

- **Value Objects**: Immutable objects compared by value (ExternalReference, RiskFactor, SalesPotential, RiskAssessment)
- **Domain Events**: Events that represent significant business state changes
- **Type Safety**: Full TypeScript strict mode with comprehensive validation
- **Business Logic**: Encapsulated business rules and invariants

---

## 📁 Directory Structure

```
domain-models/
├── README.md (this file)
├── package.json
├── tsconfig.json
├── value-objects/
│   ├── ExternalReference.ts
│   ├── RiskFactor.ts
│   ├── SalesPotential.ts
│   ├── RiskAssessment.ts
│   └── index.ts
├── events/
│   ├── DomainEvent.ts (base class)
│   ├── SalesPotentialAssessed.ts
│   ├── RiskAssessedEvent.ts
│   ├── HighRiskDetected.ts
│   ├── RiskAcknowledged.ts
│   ├── ProjectOwnershipChanged.ts
│   ├── ExternalReferencesUpdated.ts
│   ├── PreEstimationLinked.ts
│   ├── SalesmanNotesUpdated.ts
│   └── index.ts
└── entities/ (TODO)
    ├── ServiceOrder.ts
    └── Project.ts
```

---

## 🎯 Value Objects

### ExternalReference

Represents references to external sales systems (Pyxis, Tempo, SAP).

**Usage**:
```typescript
import { ExternalReference, SalesSystem } from './value-objects';

// Create new reference
const reference = ExternalReference.create({
  externalSalesOrderId: 'PYXIS-12345',
  externalProjectId: 'PYXIS-PRJ-789',
  systemSource: SalesSystem.PYXIS
});

// Validation: At least one external ID required
try {
  ExternalReference.create({ systemSource: SalesSystem.PYXIS });
} catch (error) {
  // Error: ExternalReference must have at least one external ID
}

// Check references
if (reference.hasSalesOrderId()) {
  console.log(`Sales Order: ${reference.externalSalesOrderId}`);
}

// Value equality
const ref2 = ExternalReference.create({ ...props });
console.log(reference.equals(ref2)); // true

// Database persistence
const dbData = reference.toObject();
const restored = ExternalReference.fromDatabase(row);
```

**Business Rules**:
- At least one external ID (sales order, project, or lead) must be provided
- System source must be valid (PYXIS, TEMPO, or SAP)
- Immutable after creation

---

### RiskFactor

Individual risk factor identified by AI Risk Assessment model.

**Usage**:
```typescript
import { RiskFactor, RiskSeverity } from './value-objects';

// Create risk factor
const factor = RiskFactor.create({
  factor: 'COMPLEX_INSTALLATION',
  description: 'Installation requires specialized equipment and skills',
  weight: 0.35, // 35% contribution to overall score
  severity: RiskSeverity.HIGH
});

// Validation: Weight must be 0-1
try {
  RiskFactor.create({ ...props, weight: 1.5 });
} catch (error) {
  // Error: Risk factor weight must be between 0 and 1
}

// Check severity
if (factor.isHighSeverity()) {
  console.log('High-severity risk factor detected');
}

// Get numeric severity (1-4)
const score = factor.getSeverityScore(); // 3 for HIGH

// Database persistence
const dbArray = [factor1, factor2].map(f => f.toObject());
const restored = RiskFactor.fromDatabaseArray(dbArray);
```

**Business Rules**:
- Factor name and description cannot be empty
- Weight must be between 0 and 1
- Severity must be LOW, MEDIUM, HIGH, or CRITICAL

---

### SalesPotential

AI-assessed sales potential for TV/Quotation service orders.

**Usage**:
```typescript
import { SalesPotential, PotentialLevel } from './value-objects';

// Create from score (auto-determine level)
const potential = SalesPotential.fromScore(
  75, // score
  85, // confidence
  'xgboost-v1.2.3' // model version
);
// potential.potential === PotentialLevel.HIGH (67-100)

// Create manually (validates alignment)
const potential2 = SalesPotential.create({
  potential: PotentialLevel.MEDIUM,
  score: 50,
  confidence: 90,
  assessedAt: new Date(),
  modelVersion: 'xgboost-v1.2.3'
});

// Validation: Level must match score
try {
  SalesPotential.create({
    potential: PotentialLevel.HIGH,
    score: 20, // LOW score
    confidence: 80,
    assessedAt: new Date()
  });
} catch (error) {
  // Error: Potential level HIGH does not match score 20 (expected LOW)
}

// Business checks
if (potential.isHighPotential()) {
  console.log('High sales potential!');
}

if (potential.isConfident()) {
  console.log('Model is >80% confident');
}

if (potential.needsReview()) {
  console.log('Low confidence (<60%), needs manual review');
}

if (potential.isStale()) {
  console.log('Assessment is >7 days old, should reassess');
}

// Database persistence
const restored = SalesPotential.fromDatabase({
  sales_potential: 'HIGH',
  sales_potential_score: 75,
  sales_potential_confidence: 85,
  sales_potential_updated_at: new Date(),
  sales_potential_model_version: 'xgboost-v1.2.3'
});
```

**Business Rules**:
- Score must be 0-100
- Confidence must be 0-100
- Potential level must align with score:
  - LOW: 0-33
  - MEDIUM: 34-66
  - HIGH: 67-100

---

### RiskAssessment

AI-assessed risk level for service orders with acknowledgment tracking.

**Usage**:
```typescript
import { RiskAssessment, RiskLevel } from './value-objects';
import { RiskFactor, RiskSeverity } from './value-objects';

// Create from score
const riskFactors = [
  RiskFactor.create({
    factor: 'FRAGILE_ITEMS',
    description: 'Customer has fragile items',
    weight: 0.4,
    severity: RiskSeverity.HIGH
  }),
  RiskFactor.create({
    factor: 'DIFFICULT_ACCESS',
    description: 'No elevator, 5th floor',
    weight: 0.3,
    severity: RiskSeverity.MEDIUM
  })
];

const assessment = RiskAssessment.fromScore(
  78, // score -> CRITICAL (76-100)
  92, // confidence
  riskFactors,
  'SYSTEM',
  'random-forest-v2.1.0'
);

// Check if requires acknowledgment
if (assessment.requiresAcknowledgment()) {
  console.log('HIGH or CRITICAL risk requires operator acknowledgment');
}

// Check if blocks operations
if (assessment.blocksOperations()) {
  console.log('Cannot check-in until risk is acknowledged');
}

// Get critical factors
const criticalFactors = assessment.getCriticalFactors();

// Acknowledge risk (returns new RiskAssessment - immutable)
const acknowledged = assessment.acknowledge(
  'operator-uuid-123',
  'Discussed with customer, will take extra precautions'
);

// Validation: Can only acknowledge HIGH/CRITICAL
try {
  const lowRisk = RiskAssessment.fromScore(15, 90, [], 'SYSTEM');
  lowRisk.acknowledge('operator-123');
} catch (error) {
  // Error: Only HIGH or CRITICAL risk requires acknowledgment
}

// Database persistence
const restored = RiskAssessment.fromDatabase({
  risk_level: 'CRITICAL',
  risk_score: 78,
  risk_confidence: 92,
  risk_factors: JSON.stringify(riskFactors.map(f => f.toObject())),
  risk_assessed_at: new Date(),
  risk_triggered_by: 'SYSTEM',
  risk_model_version: 'random-forest-v2.1.0',
  risk_acknowledged_by: 'operator-uuid-123',
  risk_acknowledged_at: new Date(),
  risk_acknowledgment_notes: 'Discussed with customer'
});
```

**Business Rules**:
- Score must be 0-100
- Risk level must align with score:
  - LOW: 0-25
  - MEDIUM: 26-50
  - HIGH: 51-75
  - CRITICAL: 76-100
- HIGH/CRITICAL risk requires acknowledgment before check-in
- Acknowledged risks must have acknowledgedBy and acknowledgedAt
- Immutable - acknowledgment returns new instance

---

## 📡 Domain Events

### Base: DomainEvent

All domain events extend this abstract base class.

**Common Fields**:
- `eventId` (string): Unique event identifier (UUID)
- `eventType` (string): Event type name
- `timestamp` (number): Milliseconds since epoch
- `metadata` (EventMetadata): Correlation, causation, user, country, BU

**Methods**:
- `toAvro()`: Serialize to Avro format for Kafka
- `getTopicName()`: Get Kafka topic name
- `getDate()`: Convert timestamp to Date
- `getAgeMs()`: Get event age in milliseconds

---

### SalesPotentialAssessed

Emitted when AI assesses sales potential for TV/Quotation.

**Kafka Topic**: `projects.sales_potential.assessed`

**Usage**:
```typescript
import { SalesPotentialAssessed, PotentialLevel } from './events';

const event = new SalesPotentialAssessed({
  serviceOrderId: 'so-uuid-123',
  potential: PotentialLevel.HIGH,
  score: 85,
  confidence: 92,
  reasoning: [
    'Customer has high budget',
    'Multiple rooms renovation',
    'Premium product selection'
  ],
  modelVersion: 'xgboost-v1.2.3',
  metadata: {
    correlationId: 'corr-123',
    causationId: 'cause-456',
    userId: 'user-789',
    countryCode: 'FR',
    businessUnit: 'LEROY_MERLIN'
  }
});

// Publish to Kafka
await kafkaProducer.send({
  topic: event.getTopicName(),
  messages: [{
    key: event.serviceOrderId,
    value: event.toAvro()
  }]
});
```

---

### RiskAssessedEvent

Emitted when AI assesses risk for service order.

**Kafka Topic**: `projects.risk.assessed`

**Usage**:
```typescript
import { RiskAssessedEvent, RiskLevel } from './events';
import { RiskFactor, RiskSeverity } from './value-objects';

const event = new RiskAssessedEvent({
  serviceOrderId: 'so-uuid-123',
  riskLevel: RiskLevel.HIGH,
  riskScore: 65,
  confidence: 88,
  riskFactors: [
    RiskFactor.create({
      factor: 'COMPLEX_INSTALLATION',
      description: 'Requires specialized skills',
      weight: 0.45,
      severity: RiskSeverity.HIGH
    })
  ],
  triggeredBy: 'SYSTEM',
  modelVersion: 'random-forest-v2.1.0',
  metadata: { /* ... */ }
});
```

---

### HighRiskDetected

Emitted when HIGH/CRITICAL risk is detected (triggers task creation).

**Kafka Topic**: `projects.risk.high_risk_detected`

**Validation**: Only HIGH or CRITICAL risk can create this event.

**Usage**:
```typescript
import { HighRiskDetected, RiskLevel } from './events';

const event = new HighRiskDetected({
  serviceOrderId: 'so-uuid-123',
  riskLevel: RiskLevel.CRITICAL,
  riskFactors: [...],
  projectId: 'project-uuid-456',
  responsibleOperatorId: 'operator-uuid-789',
  metadata: { /* ... */ }
});

// Validation: Only HIGH/CRITICAL
try {
  new HighRiskDetected({ riskLevel: RiskLevel.MEDIUM, ... });
} catch (error) {
  // Error: HighRiskDetected event can only be created for HIGH or CRITICAL risk
}
```

---

### RiskAcknowledged

Emitted when operator acknowledges HIGH/CRITICAL risk.

**Kafka Topic**: `projects.risk.acknowledged`

**Usage**:
```typescript
import { RiskAcknowledged } from './events';

const event = new RiskAcknowledged({
  serviceOrderId: 'so-uuid-123',
  acknowledgedBy: 'operator-uuid-789',
  acknowledgedAt: Date.now(),
  notes: 'Discussed safety measures with customer',
  metadata: { /* ... */ }
});
```

---

### ProjectOwnershipChanged

Emitted when project ownership (Pilote du Chantier) changes.

**Kafka Topic**: `projects.ownership.changed`

**Usage**:
```typescript
import { ProjectOwnershipChanged, AssignmentMode } from './events';

const event = new ProjectOwnershipChanged({
  projectId: 'project-uuid-123',
  previousOperatorId: 'operator-uuid-456', // undefined for initial assignment
  newOperatorId: 'operator-uuid-789',
  changedBy: 'SYSTEM', // or user ID
  assignmentMode: AssignmentMode.AUTO,
  reason: 'Workload balancing',
  metadata: { /* ... */ }
});

// Check assignment type
if (event.isInitialAssignment()) {
  console.log('First-time assignment');
}

if (event.isAutoAssigned()) {
  console.log('Auto-assigned by system');
}
```

---

### ExternalReferencesUpdated

Emitted when external sales system references are updated.

**Kafka Topic**: `projects.external_references.updated`

**Validation**: At least one external ID must be provided.

**Usage**:
```typescript
import { ExternalReferencesUpdated } from './events';
import { SalesSystem } from './value-objects';

const event = new ExternalReferencesUpdated({
  serviceOrderId: 'so-uuid-123',
  externalSalesOrderId: 'PYXIS-12345',
  externalProjectId: 'PYXIS-PRJ-789',
  externalSystemSource: SalesSystem.PYXIS,
  updatedBy: 'user-uuid-456',
  metadata: { /* ... */ }
});
```

---

### PreEstimationLinked

Emitted when pre-estimation from sales system is linked.

**Kafka Topic**: `projects.pre_estimation.linked`

**Usage**:
```typescript
import { PreEstimationLinked } from './events';
import { SalesSystem } from './value-objects';

const event = new PreEstimationLinked({
  serviceOrderId: 'so-uuid-123',
  preEstimationId: 'EST-456',
  estimatedValue: {
    amount: 15000.50,
    currency: 'EUR'
  },
  salesSystemSource: SalesSystem.TEMPO,
  metadata: { /* ... */ }
});
```

---

### SalesmanNotesUpdated

Emitted when salesman notes are updated (triggers reassessment).

**Kafka Topic**: `projects.salesman_notes.updated`

**Usage**:
```typescript
import { SalesmanNotesUpdated } from './events';

const event = new SalesmanNotesUpdated({
  serviceOrderId: 'so-uuid-123',
  notes: 'Customer interested in premium kitchen package',
  updatedBy: 'salesman-uuid-456',
  metadata: { /* ... */ }
});
```

---

## 🚀 Installation & Setup

```bash
cd product-docs/implementation-artifacts/domain-models
npm install
npm run build
```

---

## 📦 Usage in Your Application

### Import Value Objects

```typescript
import {
  ExternalReference,
  SalesSystem,
  RiskFactor,
  RiskSeverity,
  SalesPotential,
  PotentialLevel,
  RiskAssessment,
  RiskLevel
} from '@fsm/domain-models/value-objects';
```

### Import Domain Events

```typescript
import {
  SalesPotentialAssessed,
  RiskAssessedEvent,
  HighRiskDetected,
  RiskAcknowledged,
  ProjectOwnershipChanged,
  AssignmentMode
} from '@fsm/domain-models/events';
```

### Example: Service with Value Objects

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RiskAssessment, RiskLevel } from '@fsm/domain-models/value-objects';
import { RiskAssessedEvent, HighRiskDetected } from '@fsm/domain-models/events';
import { KafkaService } from './kafka.service';

@Injectable()
export class RiskAssessmentService {
  constructor(
    private prisma: PrismaService,
    private kafka: KafkaService
  ) {}

  async assessRisk(serviceOrderId: string, mlResponse: any): Promise<RiskAssessment> {
    // 1. Create value object from ML model response
    const assessment = RiskAssessment.fromScore(
      mlResponse.score,
      mlResponse.confidence,
      mlResponse.factors.map(f => RiskFactor.create(f)),
      'SYSTEM',
      mlResponse.modelVersion
    );

    // 2. Persist to database
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        risk_level: assessment.riskLevel,
        risk_score: assessment.riskScore,
        risk_confidence: assessment.confidence,
        risk_factors: assessment.riskFactors.map(f => f.toObject()),
        risk_assessed_at: assessment.assessedAt,
        risk_triggered_by: assessment.triggeredBy,
        risk_model_version: assessment.modelVersion
      }
    });

    // 3. Emit domain events
    const metadata = await this.getEventMetadata(serviceOrderId);

    // Always emit RiskAssessed
    await this.kafka.publish(new RiskAssessedEvent({
      serviceOrderId,
      riskLevel: assessment.riskLevel,
      riskScore: assessment.riskScore,
      confidence: assessment.confidence,
      riskFactors: assessment.riskFactors,
      triggeredBy: assessment.triggeredBy,
      modelVersion: assessment.modelVersion,
      metadata
    }));

    // Emit HighRiskDetected if HIGH or CRITICAL
    if (assessment.isHighRisk()) {
      const project = await this.prisma.project.findFirst({
        where: { service_orders: { some: { id: serviceOrderId } } }
      });

      await this.kafka.publish(new HighRiskDetected({
        serviceOrderId,
        riskLevel: assessment.riskLevel,
        riskFactors: assessment.riskFactors,
        projectId: project.id,
        responsibleOperatorId: project.responsible_operator_id,
        metadata
      }));
    }

    return assessment;
  }

  async acknowledgeRisk(
    serviceOrderId: string,
    operatorId: string,
    notes?: string
  ): Promise<void> {
    // 1. Load current assessment from database
    const row = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId }
    });
    const assessment = RiskAssessment.fromDatabase(row);

    // 2. Acknowledge (returns new immutable instance)
    const acknowledged = assessment.acknowledge(operatorId, notes);

    // 3. Persist
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        risk_acknowledged_by: acknowledged.acknowledgedBy,
        risk_acknowledged_at: acknowledged.acknowledgedAt,
        risk_acknowledgment_notes: acknowledged.acknowledgmentNotes
      }
    });

    // 4. Emit event
    const metadata = await this.getEventMetadata(serviceOrderId);
    await this.kafka.publish(new RiskAcknowledged({
      serviceOrderId,
      acknowledgedBy: operatorId,
      acknowledgedAt: Date.now(),
      notes,
      metadata
    }));
  }
}
```

---

## ✅ Best Practices

### Value Objects

1. ✅ **Immutability**: Never modify value objects after creation
2. ✅ **Validation**: Validate in factory methods (`.create()`, `.fromScore()`)
3. ✅ **Equality**: Use `.equals()` for comparison, not `===`
4. ✅ **Business Logic**: Encapsulate in value object methods
5. ✅ **Database Mapping**: Use `.toObject()` and `.fromDatabase()`

### Domain Events

1. ✅ **Single Purpose**: One event = one business fact
2. ✅ **Immutability**: Events are facts, never change them
3. ✅ **Metadata**: Always include correlationId and causationId
4. ✅ **Topic Naming**: Use event's `.getTopicName()` method
5. ✅ **Avro Format**: Use `.toAvro()` for Kafka publishing

### Error Handling

```typescript
// Wrap value object creation in try/catch
try {
  const assessment = RiskAssessment.create(props);
} catch (error) {
  logger.error('Invalid risk assessment', { error, props });
  throw new BadRequestException(error.message);
}

// Use validation methods before operations
if (assessment.requiresAcknowledgment() && !assessment.isAcknowledged) {
  throw new ForbiddenException('Risk must be acknowledged before check-in');
}
```

---

## 🧪 Testing

Value objects and events are pure TypeScript classes - easy to test:

```typescript
import { RiskAssessment, RiskLevel } from '@fsm/domain-models/value-objects';
import { RiskFactor, RiskSeverity } from '@fsm/domain-models/value-objects';

describe('RiskAssessment', () => {
  it('should create from score', () => {
    const factors = [
      RiskFactor.create({
        factor: 'TEST',
        description: 'Test factor',
        weight: 0.5,
        severity: RiskSeverity.HIGH
      })
    ];

    const assessment = RiskAssessment.fromScore(78, 90, factors, 'SYSTEM');

    expect(assessment.riskLevel).toBe(RiskLevel.CRITICAL);
    expect(assessment.riskScore).toBe(78);
    expect(assessment.requiresAcknowledgment()).toBe(true);
  });

  it('should not allow acknowledgment of low risk', () => {
    const assessment = RiskAssessment.fromScore(15, 90, [], 'SYSTEM');

    expect(() => assessment.acknowledge('operator-123')).toThrow(
      'Only HIGH or CRITICAL risk requires acknowledgment'
    );
  });

  it('should create acknowledged instance', () => {
    const assessment = RiskAssessment.fromScore(78, 90, [], 'SYSTEM');
    const acknowledged = assessment.acknowledge('operator-123', 'Test notes');

    expect(acknowledged.isAcknowledged).toBe(true);
    expect(acknowledged.acknowledgedBy).toBe('operator-123');
    expect(acknowledged.acknowledgmentNotes).toBe('Test notes');
    // Original remains unchanged (immutability)
    expect(assessment.isAcknowledged).toBe(false);
  });
});
```

---

## 📚 References

- **DDD Patterns**: `product-docs/domain/01-domain-model-overview.md`
- **Event-Driven Architecture**: `product-docs/architecture/05-event-driven-architecture.md`
- **Avro Schemas**: `implementation-artifacts/avro-schemas/v2-0-domain-events.avsc`
- **Database Schema**: `implementation-artifacts/migrations/001_add_v2_0_features.sql`
- **API Contracts**: `implementation-artifacts/openapi/v2-0-features-api.yaml`

---

**Last Updated**: 2025-11-16
**Version**: 2.0.0
**Maintained By**: Platform Architecture Team
