# Camunda 8 Implementation Plan - Yellow Grid Platform

## Executive Summary

This document outlines the implementation of Camunda 8 as the main workflow orchestrator for the Yellow Grid Field Service Execution Platform. Camunda 8 will replace the current in-memory state machine with a durable, observable, and scalable workflow engine.

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Yellow Grid Platform                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────┐   │
│  │   Web App   │     │ Mobile App  │     │     NestJS API         │   │
│  │   (React)   │     │   (Expo)    │     │   (REST + WebSocket)   │   │
│  └──────┬──────┘     └──────┬──────┘     └───────────┬─────────────┘   │
│         │                   │                        │                   │
│         └───────────────────┴────────────────────────┘                   │
│                              │                                           │
│                    ┌─────────▼─────────┐                                 │
│                    │   Camunda 8 SDK   │                                 │
│                    │  (Zeebe Workers)  │                                 │
│                    └─────────┬─────────┘                                 │
│                              │                                           │
├──────────────────────────────┼───────────────────────────────────────────┤
│                              │          Camunda 8 Platform               │
│  ┌─────────────┐    ┌────────▼────────┐    ┌─────────────┐              │
│  │   Operate   │◄───│     Zeebe       │───►│  Tasklist   │              │
│  │  (Debug)    │    │ (Workflow Eng)  │    │ (Human Tasks)│             │
│  └─────────────┘    └────────┬────────┘    └─────────────┘              │
│                              │                                           │
│                    ┌─────────▼─────────┐                                 │
│                    │   Elasticsearch   │                                 │
│                    │   (History/Search)│                                 │
│                    └───────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Directory Structure

```
yellow-grid/
├── camunda/
│   ├── docker-compose.camunda.yml     # Camunda 8 self-managed stack
│   ├── .env.camunda                   # Camunda environment config
│   │
│   ├── processes/                     # BPMN Process Models (Source of Truth)
│   │   ├── service-order-lifecycle.bpmn
│   │   ├── provider-assignment.bpmn
│   │   ├── booking-management.bpmn
│   │   ├── contract-generation.bpmn
│   │   ├── wcf-workflow.bpmn
│   │   └── payment-processing.bpmn
│   │
│   ├── decisions/                     # DMN Decision Tables
│   │   ├── provider-ranking.dmn
│   │   ├── urgency-scoring.dmn
│   │   ├── assignment-mode.dmn        # P1/P2, country-specific rules
│   │   └── sla-calculation.dmn
│   │
│   ├── forms/                         # Camunda Forms (Human Tasks)
│   │   ├── manual-assignment.form
│   │   ├── wcf-signature.form
│   │   └── escalation-review.form
│   │
│   ├── contracts/                     # Variable Contracts (JSON Schema)
│   │   ├── service-order.schema.json
│   │   ├── assignment.schema.json
│   │   ├── booking.schema.json
│   │   └── provider.schema.json
│   │
│   └── connectors/                    # Outbound Connectors Config
│       ├── kafka-connector.json
│       ├── email-connector.json
│       └── sms-connector.json
│
├── src/
│   ├── camunda/                       # Camunda Integration Module
│   │   ├── camunda.module.ts
│   │   ├── camunda.service.ts         # SDK initialization & deployment
│   │   ├── camunda.config.ts          # Environment configuration
│   │   │
│   │   ├── workers/                   # Zeebe Job Workers
│   │   │   ├── base.worker.ts         # Abstract worker with error handling
│   │   │   ├── service-order/
│   │   │   │   ├── create-order.worker.ts
│   │   │   │   ├── validate-order.worker.ts
│   │   │   │   └── schedule-order.worker.ts
│   │   │   ├── assignment/
│   │   │   │   ├── find-providers.worker.ts
│   │   │   │   ├── rank-providers.worker.ts
│   │   │   │   ├── send-offer.worker.ts
│   │   │   │   └── confirm-assignment.worker.ts
│   │   │   ├── booking/
│   │   │   │   ├── check-availability.worker.ts
│   │   │   │   ├── reserve-slot.worker.ts
│   │   │   │   └── confirm-booking.worker.ts
│   │   │   ├── execution/
│   │   │   │   ├── go-check.worker.ts
│   │   │   │   ├── dispatch.worker.ts
│   │   │   │   └── complete-service.worker.ts
│   │   │   └── notification/
│   │   │       ├── send-email.worker.ts
│   │   │       ├── send-sms.worker.ts
│   │   │       └── send-push.worker.ts
│   │   │
│   │   ├── dto/                       # Variable DTOs (Type-Safe)
│   │   │   ├── service-order.dto.ts
│   │   │   ├── assignment.dto.ts
│   │   │   ├── booking.dto.ts
│   │   │   └── provider.dto.ts
│   │   │
│   │   ├── mappers/                   # Variable Mappers
│   │   │   ├── service-order.mapper.ts
│   │   │   └── assignment.mapper.ts
│   │   │
│   │   └── operate/                   # Operate API Integration
│   │       ├── operate.service.ts     # Incident management
│   │       └── incident.handler.ts    # Auto-remediation
│   │
│   └── modules/
│       └── service-orders/
│           └── service-orders.service.ts  # Modified to use Camunda
```

## 3. Docker Compose - Local Development Stack

```yaml
# camunda/docker-compose.camunda.yml
version: '3.8'

services:
  zeebe:
    image: camunda/zeebe:8.5.0
    container_name: yellow-grid-zeebe
    environment:
      - ZEEBE_BROKER_EXPORTERS_ELASTICSEARCH_CLASSNAME=io.camunda.zeebe.exporter.ElasticsearchExporter
      - ZEEBE_BROKER_EXPORTERS_ELASTICSEARCH_ARGS_URL=http://elasticsearch:9200
      - ZEEBE_BROKER_EXPORTERS_ELASTICSEARCH_ARGS_BULK_SIZE=1
    ports:
      - "26500:26500"  # gRPC
      - "9600:9600"    # Monitoring
    depends_on:
      - elasticsearch
    volumes:
      - zeebe-data:/usr/local/zeebe/data
    networks:
      - camunda-network

  operate:
    image: camunda/operate:8.5.0
    container_name: yellow-grid-operate
    environment:
      - CAMUNDA_OPERATE_ZEEBE_GATEWAYADDRESS=zeebe:26500
      - CAMUNDA_OPERATE_ELASTICSEARCH_URL=http://elasticsearch:9200
      - CAMUNDA_OPERATE_ZEEBEELASTICSEARCH_URL=http://elasticsearch:9200
      - SPRING_PROFILES_ACTIVE=dev-data
    ports:
      - "8081:8080"
    depends_on:
      - zeebe
      - elasticsearch
    networks:
      - camunda-network

  tasklist:
    image: camunda/tasklist:8.5.0
    container_name: yellow-grid-tasklist
    environment:
      - CAMUNDA_TASKLIST_ZEEBE_GATEWAYADDRESS=zeebe:26500
      - CAMUNDA_TASKLIST_ELASTICSEARCH_URL=http://elasticsearch:9200
      - CAMUNDA_TASKLIST_ZEEBEELASTICSEARCH_URL=http://elasticsearch:9200
    ports:
      - "8082:8080"
    depends_on:
      - zeebe
      - elasticsearch
    networks:
      - camunda-network

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.9.0
    container_name: yellow-grid-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - camunda-network

volumes:
  zeebe-data:
  elasticsearch-data:

networks:
  camunda-network:
    driver: bridge
```

## 4. Core BPMN Processes

### 4.1 Service Order Lifecycle (Main Orchestrator)

Based on your existing state machine in [STATE_MACHINES_COMPREHENSIVE_ANALYSIS.md](product-docs/architecture/STATE_MACHINES_COMPREHENSIVE_ANALYSIS.md):

```
CREATED → SCHEDULING_PENDING → SCHEDULED → CONTRACT_GENERATION → 
CONTRACT_AWAITING_SIGNATURE → ASSIGNMENT_PENDING → OFFER_SENT → 
OFFER_ACCEPTED → ASSIGNED → GO_EXECUTION_CHECK → DISPATCHED → 
IN_PROGRESS → COMPLETED → WCF_GENERATION → WCF_SIGNED → 
PRO_FORMA_INVOICE → PAYMENT_RECEIVED → CLOSED
```

### 4.2 Key Sub-Processes

| Process | Purpose | Triggers |
|---------|---------|----------|
| `provider-assignment.bpmn` | Find, rank, offer to providers | ASSIGNMENT_PENDING state |
| `date-negotiation.bpmn` | 3-round date negotiation | Provider proposes alternative |
| `go-execution-check.bpmn` | Payment + Delivery validation | 24-48h before scheduled |
| `wcf-workflow.bpmn` | WCF generation & signature | Service COMPLETED |
| `payment-processing.bpmn` | Invoice & payment tracking | WCF signed |

## 5. Variable Contracts (JSON Schema)

### 5.1 Service Order Variables

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "service-order.schema.json",
  "title": "ServiceOrderVariables",
  "type": "object",
  "required": ["serviceOrderId", "storeId", "customerId", "urgency"],
  "properties": {
    "serviceOrderId": {
      "type": "string",
      "format": "uuid",
      "description": "Unique service order identifier"
    },
    "projectId": {
      "type": "string",
      "format": "uuid"
    },
    "storeId": {
      "type": "string",
      "format": "uuid"
    },
    "customerId": {
      "type": "string",
      "format": "uuid"
    },
    "urgency": {
      "type": "string",
      "enum": ["URGENT", "STANDARD", "LOW"],
      "description": "SLA urgency level"
    },
    "serviceType": {
      "type": "string",
      "description": "Service specialty code"
    },
    "scheduledDate": {
      "type": "string",
      "format": "date-time"
    },
    "scheduledSlot": {
      "type": "string",
      "enum": ["MORNING", "AFTERNOON", "EVENING"]
    },
    "assignedProviderId": {
      "type": "string",
      "format": "uuid"
    },
    "assignedWorkTeamId": {
      "type": "string",
      "format": "uuid"
    },
    "countryCode": {
      "type": "string",
      "enum": ["FR", "ES", "IT", "PT", "PL"]
    },
    "postalCode": {
      "type": "string"
    }
  }
}
```

### 5.2 Assignment Variables

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "assignment.schema.json",
  "title": "AssignmentVariables",
  "type": "object",
  "properties": {
    "assignmentMode": {
      "type": "string",
      "enum": ["OFFER", "AUTO_ACCEPT", "DIRECT"],
      "description": "Country-specific assignment mode"
    },
    "candidateProviders": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "providerId": { "type": "string" },
          "score": { "type": "number" },
          "distance": { "type": "number" },
          "availability": { "type": "boolean" }
        }
      }
    },
    "offerExpiresAt": {
      "type": "string",
      "format": "date-time"
    },
    "dateNegotiationRound": {
      "type": "integer",
      "minimum": 0,
      "maximum": 3
    },
    "proposedDates": {
      "type": "array",
      "items": { "type": "string", "format": "date-time" }
    }
  }
}
```

## 6. Worker Implementation Pattern

### 6.1 Base Worker (Best Practices)

```typescript
// src/camunda/workers/base.worker.ts
import { Injectable, Logger } from '@nestjs/common';
import { ZBClient, ICustomHeaders, IInputVariables, IOutputVariables, ZBWorkerTaskHandler } from 'zeebe-node';
import { LosslessDto } from '@camunda8/sdk';

export abstract class BaseWorker<TInput extends LosslessDto, TOutput> {
  protected abstract readonly logger: Logger;
  protected abstract readonly taskType: string;
  
  // Idempotency key for deduplication
  protected getIdempotencyKey(job: any): string {
    return `${job.processInstanceKey}-${job.key}`;
  }

  // Retry configuration
  protected readonly retries = 3;
  protected readonly timeout = 30000; // 30 seconds

  abstract handle(job: any): Promise<TOutput>;

  createHandler(): ZBWorkerTaskHandler {
    return async (job) => {
      const startTime = Date.now();
      const idempotencyKey = this.getIdempotencyKey(job);
      
      this.logger.log(`[${this.taskType}] Starting job ${job.key} (idempotency: ${idempotencyKey})`);
      
      try {
        const result = await this.handle(job);
        
        this.logger.log(`[${this.taskType}] Completed job ${job.key} in ${Date.now() - startTime}ms`);
        
        return job.complete(result);
      } catch (error) {
        this.logger.error(`[${this.taskType}] Failed job ${job.key}: ${error.message}`);
        
        // Determine if retryable
        if (this.isRetryableError(error)) {
          return job.fail({
            errorMessage: error.message,
            retries: job.retries - 1,
            retryBackOff: this.calculateBackoff(job.retries),
          });
        }
        
        // Non-retryable: throw BPMN error
        return job.error(error.code || 'WORKER_ERROR', error.message);
      }
    };
  }

  protected isRetryableError(error: any): boolean {
    // Network errors, timeouts, temporary failures
    return ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
  }

  protected calculateBackoff(retriesLeft: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.pow(2, this.retries - retriesLeft) * 1000;
  }
}
```

### 6.2 Example: Find Providers Worker

```typescript
// src/camunda/workers/assignment/find-providers.worker.ts
import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker } from '../base.worker';
import { ProvidersService } from '../../../modules/providers/providers.service';
import { LosslessDto, Int64String } from '@camunda8/sdk';

// Input DTO - typed from JSON Schema
class FindProvidersInput extends LosslessDto {
  serviceOrderId!: string;
  serviceType!: string;
  postalCode!: string;
  countryCode!: string;
  scheduledDate!: string;
  urgency!: 'URGENT' | 'STANDARD' | 'LOW';
}

// Output DTO
class FindProvidersOutput extends LosslessDto {
  candidateProviders!: Array<{
    providerId: string;
    score: number;
    distance: number;
    availability: boolean;
  }>;
  providersFound!: boolean;
}

@Injectable()
export class FindProvidersWorker extends BaseWorker<FindProvidersInput, FindProvidersOutput> {
  protected readonly logger = new Logger(FindProvidersWorker.name);
  protected readonly taskType = 'find-providers';

  constructor(private readonly providersService: ProvidersService) {
    super();
  }

  async handle(job: any): Promise<FindProvidersOutput> {
    const input = job.variables as FindProvidersInput;
    
    // Business logic: find eligible providers
    const providers = await this.providersService.findEligibleProviders({
      serviceType: input.serviceType,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      date: new Date(input.scheduledDate),
    });

    // Rank providers using DMN or business rules
    const rankedProviders = providers.map(p => ({
      providerId: p.id,
      score: p.matchScore,
      distance: p.distanceKm,
      availability: p.hasCapacity,
    }));

    return {
      candidateProviders: rankedProviders,
      providersFound: rankedProviders.length > 0,
    };
  }
}
```

## 7. NestJS Integration

### 7.1 Camunda Module

```typescript
// src/camunda/camunda.module.ts
import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Camunda8 } from '@camunda8/sdk';
import { CamundaService } from './camunda.service';

// Workers
import { FindProvidersWorker } from './workers/assignment/find-providers.worker';
import { RankProvidersWorker } from './workers/assignment/rank-providers.worker';
import { SendOfferWorker } from './workers/assignment/send-offer.worker';
import { CheckAvailabilityWorker } from './workers/booking/check-availability.worker';
import { GoCheckWorker } from './workers/execution/go-check.worker';
// ... more workers

@Module({
  providers: [
    CamundaService,
    FindProvidersWorker,
    RankProvidersWorker,
    SendOfferWorker,
    CheckAvailabilityWorker,
    GoCheckWorker,
  ],
  exports: [CamundaService],
})
export class CamundaModule implements OnModuleInit, OnModuleDestroy {
  private client: Camunda8;

  constructor(
    private readonly configService: ConfigService,
    private readonly camundaService: CamundaService,
    // Inject workers
    private readonly findProvidersWorker: FindProvidersWorker,
    // ... more workers
  ) {}

  async onModuleInit() {
    // Initialize SDK
    this.client = new Camunda8({
      ZEEBE_ADDRESS: this.configService.get('ZEEBE_ADDRESS'),
      ZEEBE_CLIENT_ID: this.configService.get('ZEEBE_CLIENT_ID'),
      ZEEBE_CLIENT_SECRET: this.configService.get('ZEEBE_CLIENT_SECRET'),
      CAMUNDA_SECURE_CONNECTION: this.configService.get('CAMUNDA_SECURE_CONNECTION') === 'true',
    });

    const zeebe = this.client.getZeebeGrpcApiClient();

    // Deploy processes on startup
    await this.camundaService.deployProcesses(zeebe);

    // Register workers
    zeebe.createWorker({
      taskType: 'find-providers',
      taskHandler: this.findProvidersWorker.createHandler(),
      timeout: 30000,
    });

    // ... register more workers
  }

  async onModuleDestroy() {
    await this.client.getZeebeGrpcApiClient().close();
  }
}
```

### 7.2 Starting Process Instances

```typescript
// src/camunda/camunda.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Camunda8 } from '@camunda8/sdk';

@Injectable()
export class CamundaService {
  private readonly logger = new Logger(CamundaService.name);
  private zeebe: any;

  setZeebeClient(zeebe: any) {
    this.zeebe = zeebe;
  }

  async deployProcesses(zeebe: any) {
    this.zeebe = zeebe;
    
    const processes = [
      'camunda/processes/service-order-lifecycle.bpmn',
      'camunda/processes/provider-assignment.bpmn',
      'camunda/processes/booking-management.bpmn',
    ];

    for (const process of processes) {
      const result = await zeebe.deployResource({ processFilename: process });
      this.logger.log(`Deployed: ${result.deployments[0].process.bpmnProcessId}`);
    }
  }

  /**
   * Start a new service order workflow
   */
  async startServiceOrderWorkflow(serviceOrderId: string, variables: any) {
    const result = await this.zeebe.createProcessInstance({
      bpmnProcessId: 'service-order-lifecycle',
      variables: {
        serviceOrderId,
        ...variables,
      },
    });

    this.logger.log(`Started process instance: ${result.processInstanceKey}`);
    return result.processInstanceKey;
  }

  /**
   * Send a message to a running process (e.g., provider accepted offer)
   */
  async publishMessage(messageName: string, correlationKey: string, variables: any) {
    await this.zeebe.publishMessage({
      name: messageName,
      correlationKey,
      variables,
      timeToLive: 3600000, // 1 hour
    });
  }
}
```

## 8. Operate Integration (Debugging)

### 8.1 Operate Service for Incident Management

```typescript
// src/camunda/operate/operate.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Camunda8 } from '@camunda8/sdk';

@Injectable()
export class OperateService {
  private readonly logger = new Logger(OperateService.name);
  private operate: any;

  constructor() {
    const client = new Camunda8();
    this.operate = client.getOperateApiClient();
  }

  /**
   * Get all active incidents for a process instance
   */
  async getIncidents(processInstanceKey: string) {
    return this.operate.searchIncidents({
      filter: { processInstanceKey },
    });
  }

  /**
   * Get process instance details for debugging
   */
  async getProcessInstance(processInstanceKey: string) {
    return this.operate.getProcessInstance(processInstanceKey);
  }

  /**
   * Get variable history for a process instance
   */
  async getVariables(processInstanceKey: string) {
    return this.operate.searchVariables({
      filter: { processInstanceKey },
    });
  }

  /**
   * Feed incident data back to the agent for auto-remediation
   */
  async analyzeIncident(incidentKey: string): Promise<{
    rootCause: string;
    suggestedFix: string;
    affectedWorker: string;
  }> {
    const incident = await this.operate.getIncident(incidentKey);
    
    // Common incident patterns
    if (incident.errorMessage?.includes('variable')) {
      return {
        rootCause: 'Variable type mismatch or missing required field',
        suggestedFix: 'Check variable contract schema and worker input DTO',
        affectedWorker: incident.jobType,
      };
    }

    if (incident.errorMessage?.includes('timeout')) {
      return {
        rootCause: 'Worker timeout exceeded',
        suggestedFix: 'Increase worker timeout or optimize handler',
        affectedWorker: incident.jobType,
      };
    }

    return {
      rootCause: incident.errorMessage,
      suggestedFix: 'Review worker logs and Operate dashboard',
      affectedWorker: incident.jobType,
    };
  }
}
```

## 9. Environment Configuration

```bash
# .env.camunda (Development)
ZEEBE_ADDRESS=localhost:26500
CAMUNDA_SECURE_CONNECTION=false
CAMUNDA_OPERATE_BASE_URL=http://localhost:8081
CAMUNDA_TASKLIST_BASE_URL=http://localhost:8082

# .env.camunda.production
ZEEBE_ADDRESS=zeebe:26500
ZEEBE_CLIENT_ID=yellow-grid-api
ZEEBE_CLIENT_SECRET=${ZEEBE_CLIENT_SECRET}
CAMUNDA_SECURE_CONNECTION=true
CAMUNDA_OAUTH_URL=http://keycloak:8080/auth/realms/camunda/protocol/openid-connect/token
CAMUNDA_OPERATE_BASE_URL=http://operate:8080
CAMUNDA_TASKLIST_BASE_URL=http://tasklist:8080
```

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up local Camunda 8 Docker stack
- [ ] Create directory structure
- [ ] Install @camunda8/sdk
- [ ] Implement CamundaModule with worker registration
- [ ] Create base worker pattern with error handling

### Phase 2: Service Order Lifecycle (Week 3-4)
- [ ] Design `service-order-lifecycle.bpmn` in Camunda Modeler
- [ ] Implement core workers: create, validate, schedule
- [ ] Define variable contracts (JSON Schema)
- [ ] Create variable DTOs and mappers
- [ ] Migrate existing state machine service calls

### Phase 3: Assignment Workflow (Week 5-6)
- [ ] Design `provider-assignment.bpmn` (call activity)
- [ ] Design `provider-ranking.dmn` decision table
- [ ] Implement assignment workers: find, rank, offer, confirm
- [ ] Handle date negotiation sub-process (3-round limit)
- [ ] Country-specific rules (FR=Offer, ES=AutoAccept)

### Phase 4: Execution & WCF (Week 7-8)
- [ ] Design `go-execution-check.bpmn`
- [ ] Design `wcf-workflow.bpmn`
- [ ] Implement execution workers: go-check, dispatch, complete
- [ ] Implement WCF workers: generate, send, sign
- [ ] Handle payment processing

### Phase 5: Operate Integration & Monitoring (Week 9-10)
- [ ] Build Operate API integration
- [ ] Create incident analysis service
- [ ] Set up alerting for failed processes
- [ ] Create admin dashboard for workflow monitoring
- [ ] Document debugging procedures

## 11. Testing Strategy

### 11.1 Unit Tests (Workers)
```typescript
describe('FindProvidersWorker', () => {
  it('should return ranked providers for valid input', async () => {
    const mockJob = {
      variables: {
        serviceOrderId: 'uuid',
        serviceType: 'PLUMBING',
        postalCode: '75001',
        countryCode: 'FR',
      },
      complete: jest.fn(),
    };
    
    await worker.handle(mockJob);
    
    expect(mockJob.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        providersFound: true,
        candidateProviders: expect.any(Array),
      })
    );
  });
});
```

### 11.2 Integration Tests (Process)
```typescript
describe('Service Order Lifecycle', () => {
  it('should complete happy path from CREATED to CLOSED', async () => {
    const processInstance = await zeebe.createProcessInstanceWithResult({
      bpmnProcessId: 'service-order-lifecycle',
      variables: { /* test data */ },
    });
    
    expect(processInstance.variables.state).toBe('CLOSED');
  });
});
```

## 12. Tools Needed

### Required
- **Camunda Modeler** (Desktop): Design BPMN/DMN/Forms - [Download](https://camunda.com/download/modeler/)
- **Docker Desktop**: Run local Camunda 8 stack
- **@camunda8/sdk**: Node.js SDK for workers

### Optional but Recommended
- **VS Code Extensions**:
  - BPMN Editor (for quick previews)
  - DMN Editor
- **Operate Dashboard**: http://localhost:8081 (debugging)
- **Tasklist**: http://localhost:8082 (human tasks)

## 13. Answers to Your Questions

### Do you need a "workflow IDE"?
**Yes - Camunda Modeler (Desktop App)**. This is the standard tool for creating BPMN, DMN, and Forms. It's free and integrates well with git. Treat your `.bpmn` files as source code.

### Do you need an "agentic coding loop"?
**Yes**, and here's how to structure it:

1. **Read BPMN/DMN/Forms from Modeler**:
   - Store in `camunda/processes/`, `camunda/decisions/`, `camunda/forms/`
   - Parse BPMN XML to extract task types (generates worker stubs)

2. **Generate/maintain workers + connectors + infra**:
   - Use the base worker pattern above
   - Workers should be thin (delegate to existing services)
   - Variable DTOs ensure type safety

3. **Debug incidents via Operate**:
   - OperateService for programmatic access
   - `analyzeIncident()` provides root cause analysis
   - Can be exposed as MCP tools in VS Code

### MCP Tools for Camunda (Future)
```typescript
// Example MCP tool definitions
const camundaMcpTools = {
  'camunda:getIncidents': async (processInstanceKey) => {
    return operateService.getIncidents(processInstanceKey);
  },
  'camunda:getVariables': async (processInstanceKey) => {
    return operateService.getVariables(processInstanceKey);
  },
  'camunda:suggestFix': async (incidentKey) => {
    return operateService.analyzeIncident(incidentKey);
  },
};
```

## Next Steps

1. **Download Camunda Modeler** from [camunda.com/download/modeler](https://camunda.com/download/modeler/)
2. **Run the local stack**: `docker compose -f camunda/docker-compose.camunda.yml up -d`
3. **Create your first BPMN**: Start with a simplified service order flow
4. **Implement first worker**: `find-providers` is a good starting point
5. **Test end-to-end**: Use Operate to monitor execution
