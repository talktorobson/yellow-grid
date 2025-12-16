# Implementation Artifacts - v2.0 Features

**Generated**: 2025-01-16
**Last Updated**: 2025-11-16
**Purpose**: Ready-to-use code artifacts for v2.0 feature implementation
**Status**: Phase 1 Complete (Migrations, OpenAPI, Avro, NestJS, Domain Models)

---

## 📋 Overview

This directory contains **production-ready implementation artifacts** generated from the v2.0 specifications. These artifacts bridge the gap between documentation and code, providing developers with ready-to-use:

- ✅ SQL database migrations (forward + rollback)
- ✅ OpenAPI REST API specifications (3.1)
- ✅ Avro event schemas for Kafka
- ✅ NestJS scaffolding (TypeScript services + DTOs)
- ✅ Domain model classes (TypeScript value objects + events)

---

## 📁 Directory Structure

```
implementation-artifacts/
├── README.md (this file)
├── migrations/
│   ├── 001_add_v2_0_features.sql (forward migration)
│   └── 001_add_v2_0_features_rollback.sql (rollback migration)
├── openapi/
│   └── v2-0-features-api.yaml (OpenAPI 3.1 spec for v2.0 endpoints)
├── avro-schemas/
│   └── v2-0-domain-events.avsc (Avro schemas for Kafka events)
└── domain-models/ (TypeScript domain classes - TODO)
    ├── entities/
    ├── value-objects/
    └── events/

../src/generated/v2-features/ (NestJS scaffolding - auto-generated)
├── api/
│   ├── externalReferences.service.ts
│   ├── projectOwnership.service.ts
│   ├── riskAssessment.service.ts
│   └── salesPotential.service.ts
├── model/
│   ├── *.ts (34 TypeScript DTOs)
│   └── models.ts (barrel export)
├── api.module.ts (NestJS module)
├── configuration.ts (API configuration)
└── package.json (dependencies)
```

---

## 🗄️ Database Migrations

### `migrations/001_add_v2_0_features.sql`

**Purpose**: Add all v2.0 schema changes to PostgreSQL database

**What it includes**:
- ✅ 20 new columns across `service_orders` and `projects` tables
- ✅ 6 new tables (external references, ownership history, pre-estimations, assessments, workload view)
- ✅ 27 performance indexes
- ✅ 1 materialized view (`operator_workload`)
- ✅ RLS (Row-Level Security) policies for multi-tenancy
- ✅ Check constraints for data validation
- ✅ Triggers for `updated_at` timestamps
- ✅ Function to refresh materialized view
- ✅ Comments for documentation

**How to use**:
```bash
# Connect to PostgreSQL
psql -U postgres -d fsm_platform

# Run migration
\i migrations/001_add_v2_0_features.sql

# Verify migration
SELECT * FROM pg_tables WHERE schemaname = 'public'
  AND tablename IN ('external_reference_mappings', 'project_ownership_history',
                   'sales_pre_estimations', 'sales_potential_assessments', 'risk_assessments');
```

**Rollback**:
```bash
# Rollback if needed (WARNING: deletes all v2.0 data)
\i migrations/001_add_v2_0_features_rollback.sql
```

**Features Added**:
1. **External Sales References** (4 columns + 1 table)
2. **Project Ownership** (4 columns + 1 table + 1 materialized view)
3. **Sales Potential Assessment** (7 columns + 2 tables)
4. **Risk Assessment** (6 columns + 1 table)

---

## 🌐 OpenAPI Specification

### `openapi/v2-0-features-api.yaml`

**Purpose**: REST API contract for v2.0 features (OpenAPI 3.1 compliant)

**What it includes**:
- ✅ 20+ API endpoints across 4 feature domains
- ✅ Complete request/response schemas
- ✅ Authentication (Bearer JWT)
- ✅ Error responses (400, 401, 403, 404, 503)
- ✅ Pagination support
- ✅ HATEOAS links

**Endpoint Categories**:

**1. External References** (3 endpoints)
- `GET /service-orders/{id}/external-references` - Get external references
- `PUT /service-orders/{id}/external-references` - Update external references
- `GET /service-orders/by-external-reference` - Lookup by external ID

**2. Project Ownership** (4 endpoints)
- `GET /projects/{id}/ownership` - Get project ownership
- `PUT /projects/{id}/ownership` - Assign responsible operator
- `GET /projects/{id}/ownership/history` - Get ownership audit trail
- `GET /operators/{id}/workload` - Get operator workload metrics
- `POST /projects/batch/assign-ownership` - Batch assign operators

**3. Sales Potential** (3 endpoints)
- `GET /service-orders/{id}/sales-potential` - Get assessment
- `POST /service-orders/{id}/sales-potential` - Trigger assessment
- `GET /service-orders/{id}/sales-potential/history` - Get assessment history
- `PUT /service-orders/{id}/salesman-notes` - Update notes (triggers reassessment)

**4. Risk Assessment** (5 endpoints)
- `GET /service-orders/{id}/risk-assessment` - Get assessment
- `POST /service-orders/{id}/risk-assessment` - Trigger assessment
- `POST /service-orders/{id}/risk-assessment/acknowledge` - Acknowledge risk
- `GET /service-orders/{id}/risk-assessment/history` - Get assessment history
- `GET /service-orders/high-risk` - List high-risk service orders

**How to use**:
```bash
# Generate client SDK (TypeScript)
npx @openapitools/openapi-generator-cli generate \
  -i openapi/v2-0-features-api.yaml \
  -g typescript-axios \
  -o src/generated/api-client

# Generate server stubs (NestJS)
npx @openapitools/openapi-generator-cli generate \
  -i openapi/v2-0-features-api.yaml \
  -g nodejs-express-server \
  -o src/generated/server-stubs

# Validate OpenAPI spec
npx @stoplight/spectral-cli lint openapi/v2-0-features-api.yaml

# Generate API documentation
npx redoc-cli bundle openapi/v2-0-features-api.yaml -o api-docs.html
```

---

## 📡 Avro Event Schemas

### `avro-schemas/v2-0-domain-events.avsc`

**Purpose**: Kafka event schemas for v2.0 domain events (Avro format)

**What it includes**:
- ✅ 8 domain event schemas
- ✅ Nested record types (Money, RiskFactor, EventMetadata)
- ✅ Enums (SalesPotential, RiskLevel, AssignmentMode, SalesSystem)
- ✅ Logical types (timestamp-millis)
- ✅ Documentation fields
- ✅ Default values

**Event Schemas**:

**1. Sales Potential Events**
- `SalesPotentialAssessed` - AI assessment completed
- `PreEstimationLinked` - Pre-estimation from sales system linked
- `SalesmanNotesUpdated` - Salesman notes updated

**2. Risk Assessment Events**
- `RiskAssessed` - AI assessment completed
- `HighRiskDetected` - HIGH/CRITICAL risk detected (triggers task)
- `RiskAcknowledged` - Operator acknowledged risk

**3. Project Ownership Events**
- `ProjectOwnershipChanged` - Responsible operator assigned/changed

**4. External Reference Events**
- `ExternalReferencesUpdated` - External sales references updated

**How to use**:
```bash
# Register schemas with Confluent Schema Registry
kafka-avro-console-producer \
  --broker-list localhost:9092 \
  --topic projects.sales_potential.assessed \
  --property value.schema="$(cat avro-schemas/v2-0-domain-events.avsc | jq -c '.schemas[0]')"

# Generate Java classes from Avro schema
avro-tools compile schema avro-schemas/v2-0-domain-events.avsc src/main/java

# Generate TypeScript types from Avro schema
npx avro-typescript avro-schemas/v2-0-domain-events.avsc --output src/types/events.ts
```

**Kafka Topics** (recommended):
- `projects.sales_potential.assessed`
- `projects.pre_estimation.linked`
- `projects.salesman_notes.updated`
- `projects.risk.assessed`
- `projects.risk.high_risk_detected`
- `projects.risk.acknowledged`
- `projects.ownership.changed`
- `projects.external_references.updated`

---

## 🏗️ NestJS Scaffolding

### `../src/generated/v2-features/`

**Purpose**: Auto-generated NestJS services and DTOs from OpenAPI specification

**What it includes**:
- ✅ 4 injectable NestJS services (ExternalReferences, ProjectOwnership, RiskAssessment, SalesPotential)
- ✅ 4 service interfaces for type safety
- ✅ 34 TypeScript DTOs with full type definitions
- ✅ NestJS module (`api.module.ts`)
- ✅ Configuration management
- ✅ JWT Bearer authentication support
- ✅ Observable-based HTTP client (RxJS)

**Generated Services**:

**1. ExternalReferencesService** (3 methods)
- `getExternalReferences()` - Get external sales system references
- `updateExternalReferences()` - Update external references
- `lookupServiceOrderByExternalReference()` - Lookup service order by external ID

**2. ProjectOwnershipService** (5 methods)
- `getProjectOwnership()` - Get project ownership details
- `assignProjectOwnership()` - Assign responsible operator
- `getProjectOwnershipHistory()` - Get ownership audit trail
- `getOperatorWorkload()` - Get operator workload metrics
- `batchAssignOwnership()` - Batch assign operators to multiple projects

**3. RiskAssessmentService** (5 methods)
- `getRiskAssessment()` - Get current risk assessment
- `assessRisk()` - Trigger AI risk assessment
- `acknowledgeRisk()` - Acknowledge HIGH/CRITICAL risk
- `getRiskAssessmentHistory()` - Get assessment history
- `getHighRiskServiceOrders()` - List high-risk service orders

**4. SalesPotentialService** (4 methods)
- `getSalesPotential()` - Get sales potential assessment
- `assessSalesPotential()` - Trigger AI assessment
- `getSalesPotentialHistory()` - Get assessment history
- `updateSalesmanNotes()` - Update salesman notes

**Key DTOs** (34 total):
- Request DTOs: `AssignProjectOwnershipRequest`, `UpdateExternalReferencesRequest`, `AcknowledgeRiskRequest`, etc.
- Response DTOs: `RiskAssessmentResponse`, `SalesPotentialResponse`, `ProjectOwnershipResponse`, etc.
- Nested DTOs: `RiskAssessmentResponseRiskFactorsInner`, `HighRiskServiceOrdersResponseSummary`, etc.

**How to use**:

**Step 1: Install dependencies**
```bash
cd src/generated/v2-features
npm install
```

**Step 2: Import into your NestJS app**
```typescript
// app.module.ts
import { ApiModule } from './generated/v2-features/api.module';
import { Configuration } from './generated/v2-features/configuration';

@Module({
  imports: [
    ApiModule.forRoot(() => new Configuration({
      basePath: 'https://api.fsm.ahs.com/v1',
      accessToken: async () => {
        // Your JWT token logic here
        return 'your-jwt-token';
      }
    })),
    // ... other modules
  ],
})
export class AppModule {}
```

**Step 3: Use services in your controllers**
```typescript
// risk-assessment.controller.ts
import { RiskAssessmentService } from './generated/v2-features/api/riskAssessment.service';

@Controller('risk')
export class RiskAssessmentController {
  constructor(
    private readonly riskService: RiskAssessmentService
  ) {}

  @Get(':serviceOrderId')
  async getRiskAssessment(@Param('serviceOrderId') id: string) {
    return this.riskService.getRiskAssessment(id).toPromise();
  }

  @Post(':serviceOrderId/acknowledge')
  async acknowledgeRisk(
    @Param('serviceOrderId') id: string,
    @Body() request: AcknowledgeRiskRequest
  ) {
    return this.riskService.acknowledgeRisk(id, request).toPromise();
  }
}
```

**Step 4: Customize business logic**
The generated services are HTTP clients. Create your own business logic services:

```typescript
// risk-assessment-business.service.ts
import { Injectable } from '@nestjs/common';
import { RiskAssessmentService } from './generated/v2-features/api/riskAssessment.service';
import { PrismaService } from './prisma.service';
import { EventEmitter } from './event-emitter.service';

@Injectable()
export class RiskAssessmentBusinessService {
  constructor(
    private readonly apiClient: RiskAssessmentService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter
  ) {}

  async acknowledgeRisk(serviceOrderId: string, userId: string, notes: string) {
    // 1. Call generated API client
    const result = await this.apiClient.acknowledgeRisk(
      serviceOrderId,
      { acknowledgedBy: userId, notes }
    ).toPromise();

    // 2. Update database
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        risk_acknowledged_by: userId,
        risk_acknowledged_at: new Date(),
      }
    });

    // 3. Emit domain event
    await this.eventEmitter.emit('projects.risk.acknowledged', {
      eventId: uuidv4(),
      serviceOrderId,
      acknowledgedBy: userId,
      acknowledgedAt: Date.now(),
      notes,
    });

    return result;
  }
}
```

**Generated Files Structure**:
```
src/generated/v2-features/
├── api/
│   ├── api.ts                                    # Barrel export
│   ├── externalReferences.service.ts             # Injectable service
│   ├── externalReferences.serviceInterface.ts    # TypeScript interface
│   ├── projectOwnership.service.ts
│   ├── projectOwnership.serviceInterface.ts
│   ├── riskAssessment.service.ts
│   ├── riskAssessment.serviceInterface.ts
│   ├── salesPotential.service.ts
│   └── salesPotential.serviceInterface.ts
├── model/
│   ├── acknowledgeRiskRequest.ts
│   ├── riskAssessmentResponse.ts
│   ├── riskAssessmentResponseRiskFactorsInner.ts
│   ├── ... (31 more DTOs)
│   └── models.ts                                  # Barrel export
├── api.module.ts                                  # NestJS module
├── configuration.ts                               # Configuration class
├── index.ts                                       # Main barrel export
├── package.json                                   # Dependencies
├── tsconfig.json                                  # TypeScript config
└── README.md                                      # Generator documentation
```

**Key Features**:
- **Type Safety**: Full TypeScript types for all requests/responses
- **Observable-based**: Uses RxJS Observables (convert with `.toPromise()`)
- **JWT Authentication**: Automatic Bearer token injection
- **Configurable**: Base path and auth token configurable
- **Modular**: Can be imported as NestJS module
- **OpenAPI Aligned**: 100% matches the OpenAPI spec

**Regenerate after spec changes**:
```bash
# If you update the OpenAPI spec, regenerate the code:
npx @openapitools/openapi-generator-cli generate \
  -i documentation/implementation-artifacts/openapi/v2-0-features-api.yaml \
  -g typescript-nestjs \
  -o src/generated/v2-features \
  --additional-properties=npmName=@fsm/v2-features-api,supportsES6=true,withInterfaces=true

# WARNING: This will overwrite all files in src/generated/v2-features/
# Do NOT manually edit generated files - they will be overwritten
```

**Best Practices**:
1. ✅ **Do NOT edit generated files** - regenerate from spec instead
2. ✅ **Wrap generated services** - create business logic services that use the generated clients
3. ✅ **Use DTOs for validation** - import DTOs in your controllers
4. ✅ **Configure authentication** - provide JWT token via Configuration
5. ✅ **Handle errors** - wrap API calls in try/catch or RxJS error operators
6. ✅ **Convert Observables** - use `.toPromise()` or `.pipe()` with RxJS operators

---

## 🎯 TypeScript Domain Models

### `domain-models/`

**Purpose**: Domain-Driven Design (DDD) models following value objects and domain events patterns

**What it includes**:
- ✅ 4 immutable value objects (ExternalReference, RiskFactor, SalesPotential, RiskAssessment)
- ✅ 9 domain event classes (base + 8 specific events)
- ✅ Full TypeScript strict mode with comprehensive validation
- ✅ Business logic encapsulation
- ✅ Database mapping helpers
- ✅ Kafka/Avro serialization

**Value Objects**:

**1. ExternalReference**
- Represents references to external sales systems (Pyxis, Tempo, SAP)
- Validates at least one external ID present
- Immutable with value-based equality

**2. RiskFactor**
- Individual risk factor from AI assessment
- Weight (0-1), severity (LOW/MEDIUM/HIGH/CRITICAL)
- Used within RiskAssessment

**3. SalesPotential**
- AI-assessed sales potential (LOW/MEDIUM/HIGH)
- Score (0-100) with confidence
- Auto-determines level from score
- Checks for staleness (>7 days)

**4. RiskAssessment**
- Complete risk assessment with factors
- Acknowledgment tracking for HIGH/CRITICAL
- Immutable acknowledgment (returns new instance)
- Business rule: HIGH/CRITICAL blocks check-in until acknowledged

**Domain Events** (all extend DomainEvent base class):

1. **SalesPotentialAssessed** → `projects.sales_potential.assessed`
2. **RiskAssessedEvent** → `projects.risk.assessed`
3. **HighRiskDetected** → `projects.risk.high_risk_detected` (only HIGH/CRITICAL)
4. **RiskAcknowledged** → `projects.risk.acknowledged`
5. **ProjectOwnershipChanged** → `projects.ownership.changed`
6. **ExternalReferencesUpdated** → `projects.external_references.updated`
7. **PreEstimationLinked** → `projects.pre_estimation.linked`
8. **SalesmanNotesUpdated** → `projects.salesman_notes.updated`

**How to use**:

**Step 1: Install dependencies**
```bash
cd documentation/implementation-artifacts/domain-models
npm install
npm run build
```

**Step 2: Import value objects**
```typescript
import {
  RiskAssessment,
  RiskLevel,
  RiskFactor,
  RiskSeverity,
  SalesPotential,
  PotentialLevel
} from '@fsm/domain-models/value-objects';
```

**Step 3: Use in your services**
```typescript
@Injectable()
export class RiskAssessmentService {
  async assessRisk(serviceOrderId: string, mlResponse: any): Promise<void> {
    // 1. Create value object from ML response
    const riskFactors = mlResponse.factors.map(f =>
      RiskFactor.create({
        factor: f.factor,
        description: f.description,
        weight: f.weight,
        severity: f.severity as RiskSeverity
      })
    );

    const assessment = RiskAssessment.fromScore(
      mlResponse.score,
      mlResponse.confidence,
      riskFactors,
      'SYSTEM',
      mlResponse.modelVersion
    );

    // 2. Check business rules
    if (assessment.requiresAcknowledgment()) {
      console.log('HIGH or CRITICAL risk - requires operator acknowledgment');
    }

    // 3. Persist to database
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        risk_level: assessment.riskLevel,
        risk_score: assessment.riskScore,
        risk_confidence: assessment.confidence,
        risk_factors: assessment.riskFactors.map(f => f.toObject()),
        risk_assessed_at: assessment.assessedAt
      }
    });

    // 4. Emit domain events
    const event = new RiskAssessedEvent({
      serviceOrderId,
      riskLevel: assessment.riskLevel,
      riskScore: assessment.riskScore,
      confidence: assessment.confidence,
      riskFactors: assessment.riskFactors,
      triggeredBy: 'SYSTEM',
      modelVersion: assessment.modelVersion,
      metadata: { /* correlationId, causationId, etc. */ }
    });

    await this.kafkaService.publish(
      event.getTopicName(),
      event.toAvro()
    );

    // 5. If high risk, emit additional event
    if (assessment.isHighRisk()) {
      const highRiskEvent = new HighRiskDetected({
        serviceOrderId,
        riskLevel: assessment.riskLevel,
        riskFactors: assessment.riskFactors,
        projectId: project.id,
        responsibleOperatorId: project.responsibleOperatorId,
        metadata: { /* ... */ }
      });

      await this.kafkaService.publish(
        highRiskEvent.getTopicName(),
        highRiskEvent.toAvro()
      );
    }
  }

  async acknowledgeRisk(serviceOrderId: string, operatorId: string, notes?: string): Promise<void> {
    // 1. Load from database
    const row = await this.prisma.serviceOrder.findUnique({ where: { id: serviceOrderId } });
    const assessment = RiskAssessment.fromDatabase(row);

    // 2. Validate business rule
    if (!assessment.requiresAcknowledgment()) {
      throw new Error('Only HIGH or CRITICAL risk requires acknowledgment');
    }

    // 3. Acknowledge (returns new immutable instance)
    const acknowledged = assessment.acknowledge(operatorId, notes);

    // 4. Persist
    await this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: {
        risk_acknowledged_by: acknowledged.acknowledgedBy,
        risk_acknowledged_at: acknowledged.acknowledgedAt,
        risk_acknowledgment_notes: acknowledged.acknowledgmentNotes
      }
    });

    // 5. Emit event
    const event = new RiskAcknowledged({
      serviceOrderId,
      acknowledgedBy: operatorId,
      acknowledgedAt: Date.now(),
      notes,
      metadata: { /* ... */ }
    });

    await this.kafkaService.publish(event.getTopicName(), event.toAvro());
  }
}
```

**Step 4: Use in check-in validation**
```typescript
@Injectable()
export class CheckInService {
  async validateCheckIn(serviceOrderId: string): Promise<void> {
    // Load risk assessment
    const row = await this.prisma.serviceOrder.findUnique({ where: { id: serviceOrderId } });
    const assessment = RiskAssessment.fromDatabase(row);

    // Business rule: HIGH/CRITICAL risk must be acknowledged before check-in
    if (assessment.blocksOperations()) {
      throw new ForbiddenException(
        'HIGH or CRITICAL risk must be acknowledged before check-in'
      );
    }

    // Proceed with check-in...
  }
}
```

**Key Features**:
- **Immutability**: Value objects never change after creation
- **Validation**: All business rules validated in constructors/factory methods
- **Type Safety**: Full TypeScript strict mode
- **Business Logic**: Encapsulated in domain objects (e.g., `requiresAcknowledgment()`)
- **Database Mapping**: `.toObject()` and `.fromDatabase()` helpers
- **Event Serialization**: `.toAvro()` for Kafka publishing

**Best Practices**:
1. ✅ **Create via factory methods** - Use `.create()`, `.fromScore()`, `.fromDatabase()`
2. ✅ **Never mutate** - Value objects are immutable (acknowledgment returns new instance)
3. ✅ **Encapsulate business logic** - Use methods like `.requiresAcknowledgment()`, `.isHighRisk()`
4. ✅ **Validate early** - Factory methods validate on creation
5. ✅ **Use value equality** - Compare with `.equals()`, not `===`
6. ✅ **Emit domain events** - Publish events for all state changes
7. ✅ **Type-safe enums** - Use provided enums (RiskLevel, PotentialLevel, RiskSeverity)

**File Structure**:
```
domain-models/
├── value-objects/
│   ├── ExternalReference.ts (SalesSystem enum, validation)
│   ├── RiskFactor.ts (RiskSeverity enum, weight validation)
│   ├── SalesPotential.ts (PotentialLevel enum, score alignment)
│   ├── RiskAssessment.ts (RiskLevel enum, acknowledgment logic)
│   └── index.ts (barrel export)
├── events/
│   ├── DomainEvent.ts (abstract base class)
│   ├── SalesPotentialAssessed.ts
│   ├── RiskAssessedEvent.ts
│   ├── HighRiskDetected.ts
│   ├── RiskAcknowledged.ts
│   ├── ProjectOwnershipChanged.ts
│   ├── ExternalReferencesUpdated.ts
│   ├── PreEstimationLinked.ts
│   ├── SalesmanNotesUpdated.ts
│   └── index.ts (barrel export)
├── README.md (comprehensive documentation)
├── package.json
└── tsconfig.json
```

**See**: `domain-models/README.md` for detailed documentation with examples.

---

## 🚀 Quick Start Guide

### 1. Apply Database Migrations

```bash
# Backup database first!
pg_dump -U postgres fsm_platform > backup_before_v2.sql

# Apply v2.0 migration
psql -U postgres -d fsm_platform -f migrations/001_add_v2_0_features.sql

# Verify tables created
psql -U postgres -d fsm_platform -c "\dt"
```

### 2. Deploy API Endpoints

```bash
# Generate NestJS controllers from OpenAPI spec
npm run generate:api

# Or manually implement controllers using spec as reference
# See openapi/v2-0-features-api.yaml for endpoint definitions
```

### 3. Set Up Kafka Event Streaming

```bash
# Register Avro schemas
./scripts/register-avro-schemas.sh

# Start Kafka consumers for v2.0 events
npm run kafka:consumers:start
```

### 4. Initialize ML Models

```bash
# See infrastructure/08-ml-infrastructure.md for ML setup
# Deploy Sales Potential Scorer and Risk Assessment Scorer
```

---

## 📊 Verification Checklist

After deploying artifacts, verify:

**Database**:
- [ ] All 20 new columns exist on `service_orders` and `projects`
- [ ] All 6 new tables created
- [ ] All 27 indexes created
- [ ] Materialized view `operator_workload` exists
- [ ] RLS policies active (if using RLS)
- [ ] Check constraints validated

**API**:
- [ ] All v2.0 endpoints return 200 OK for valid requests
- [ ] JWT authentication working
- [ ] RBAC permissions enforced
- [ ] Error responses follow standard format
- [ ] Pagination working for list endpoints

**Events**:
- [ ] Kafka topics created
- [ ] Avro schemas registered in Schema Registry
- [ ] Event consumers processing messages
- [ ] Event metadata (correlationId, causationId) populated

**ML Models**:
- [ ] Sales Potential Scorer endpoint responding (< 50ms latency)
- [ ] Risk Assessment Scorer endpoint responding (< 100ms latency)
- [ ] Feature store (Redis) caching features
- [ ] Model registry (S3) accessible

---

## 🔧 Integration with Existing System

These artifacts integrate with the existing FSM platform as follows:

**Database Integration**:
- Migration adds columns to existing `service_orders` and `projects` tables
- New tables reference existing tables via foreign keys
- Materialized view joins with existing data

**API Integration**:
- New endpoints follow existing REST API conventions (see `api/01-api-design-principles.md`)
- Use same JWT authentication as existing endpoints
- Use same RBAC permissions model
- Return same error response format

**Event Integration**:
- New events follow existing Kafka naming conventions
- Use same Avro schema structure as existing events
- Include same metadata fields (correlationId, causationId, etc.)
- Compatible with existing event consumers

---

## 📝 Development Workflow

**Recommended workflow for implementing v2.0 features**:

1. **Review Specifications**
   - Read `domain/03-project-service-order-domain.md` (v2.0)
   - Read `infrastructure/02-database-design.md` (v2.0)
   - Read `domain/10-ai-context-linking.md` (v2.0)
   - Read `infrastructure/08-ml-infrastructure.md` (v2.0)

2. **Apply Database Migration**
   - Run `001_add_v2_0_features.sql`
   - Verify with SQL queries

3. **Implement API Endpoints**
   - Use `v2-0-features-api.yaml` as contract
   - Generate NestJS controllers/DTOs
   - Implement business logic in services

4. **Implement Domain Logic**
   - Create TypeScript domain model classes
   - Implement business methods (updateSalesPotential, acknowledgeRisk, etc.)
   - Emit domain events

5. **Set Up Event Streaming**
   - Register Avro schemas
   - Implement event producers
   - Implement event consumers

6. **Deploy ML Models**
   - Set up ML infrastructure (see `infrastructure/08-ml-infrastructure.md`)
   - Deploy FastAPI model serving services
   - Configure feature store (Redis)

7. **Test End-to-End**
   - Unit tests for domain logic
   - Integration tests for API endpoints
   - E2E tests for complete workflows

---

## 🎯 Next Steps

**Remaining artifacts to generate**:

1. **NestJS Scaffolding** ✅ **COMPLETE**
   - ✅ Services for v2.0 endpoints (auto-generated from OpenAPI)
   - ✅ DTOs for request/response validation (34 TypeScript interfaces)
   - ✅ NestJS module with dependency injection
   - ⏸️ Controllers (wrap generated services with business logic)
   - ⏸️ Guards for RBAC permissions (to be added manually)

2. **TypeScript Domain Models** ✅ **COMPLETE**
   - ✅ Value objects (ExternalReference, RiskFactor, SalesPotential, RiskAssessment)
   - ✅ Domain events (9 events: base + 8 specific events)
   - ✅ Business logic encapsulation (validation, immutability, equality)
   - ✅ Database mapping helpers (`.toObject()`, `.fromDatabase()`)
   - ✅ Kafka/Avro serialization (`.toAvro()`, `.getTopicName()`)
   - ⏸️ Entity classes (ServiceOrder, Project - to be added when needed)

3. **Test Fixtures** (TODO)
   - Test data factories for new entities
   - Mock data for ML models
   - Integration test scenarios

4. **Deployment Scripts** (TODO)
   - Kubernetes manifests for ML services
   - Helm charts for v2.0 features
   - CI/CD pipeline updates

---

## 📞 Support

For questions about implementation artifacts:
- **Database**: Refer to `infrastructure/02-database-design.md`
- **API**: Refer to `api/` documentation folder
- **Events**: Refer to `integration/02-event-schema-registry.md`
- **ML**: Refer to `infrastructure/08-ml-infrastructure.md`

---

**Last Updated**: 2025-01-16
**Version**: 2.0.0
**Maintained By**: Platform Architecture Team
