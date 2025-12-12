# Camunda 8 - Yellow Grid Workflow Engine

This directory contains the Camunda 8 workflow orchestration for the Yellow Grid Field Service Execution Platform.

## Quick Start

### 1. Start the Local Stack

```bash
# From project root
cd camunda
docker compose -f docker-compose.camunda.yml up -d
```

### 2. Access the UIs

| Service | URL | Description |
|---------|-----|-------------|
| **Operate** | http://localhost:8081 | Process monitoring, debugging, incidents |
| **Tasklist** | http://localhost:8082 | Human task management |
| **Zeebe** | localhost:26500 | gRPC API (for workers) |
| **Elasticsearch** | http://localhost:9200 | Data store |

### 3. Stop the Stack

```bash
docker compose -f docker-compose.camunda.yml down

# To also remove data volumes:
docker compose -f docker-compose.camunda.yml down -v
```

## Directory Structure

```
camunda/
├── docker-compose.camunda.yml  # Local development stack
├── .env.camunda.example        # Environment template
├── README.md                   # This file
│
├── processes/                  # BPMN Process Models (Source of Truth)
│   ├── service-order-lifecycle.bpmn   # Main orchestration
│   ├── provider-assignment.bpmn       # Assignment sub-process
│   ├── date-negotiation.bpmn          # 3-round negotiation
│   ├── go-execution-check.bpmn        # Pre-execution validation
│   ├── wcf-workflow.bpmn              # Work Completion Form
│   └── payment-processing.bpmn        # Invoice & payment
│
├── decisions/                  # DMN Decision Tables
│   ├── provider-ranking.dmn           # Provider scoring rules
│   ├── assignment-mode.dmn            # Country-specific rules
│   ├── urgency-sla.dmn                # SLA calculation
│   └── escalation-rules.dmn           # When to escalate
│
├── forms/                      # Camunda Forms (for Tasklist)
│   ├── manual-assignment.form         # Operator assigns provider
│   ├── escalation-review.form         # Review escalated issues
│   └── wcf-signature.form             # Customer signs WCF
│
├── contracts/                  # Variable Contracts (JSON Schema)
│   ├── service-order.schema.json      # Service order variables
│   ├── assignment.schema.json         # Assignment variables
│   ├── booking.schema.json            # Booking variables
│   └── execution.schema.json          # Execution variables
│
└── connectors/                 # Outbound Connector Configs
    ├── kafka.json                      # Event publishing
    ├── email.json                      # Email notifications
    └── sms.json                        # SMS notifications
```

## Modeling Workflow

### Design in Camunda Modeler

1. Download [Camunda Modeler](https://camunda.com/download/modeler/)
2. Open BPMN files from `processes/` directory
3. Design your workflow using BPMN 2.0 elements
4. Save and commit to git

### Key BPMN Elements Used

| Element | Use Case |
|---------|----------|
| **Service Task** | Automated work (handled by Zeebe workers) |
| **User Task** | Human tasks (handled via Tasklist) |
| **Exclusive Gateway** | Decision points (conditions) |
| **Call Activity** | Sub-process invocation |
| **Message Event** | External triggers (API calls) |
| **Timer Event** | Timeouts and delays |
| **Error Event** | Exception handling |

## Worker Development

Workers are implemented in `src/camunda/workers/`. Each worker:

1. Subscribes to a task type (matches BPMN service task)
2. Receives job with input variables
3. Executes business logic
4. Completes job with output variables

### Example Worker

```typescript
// src/camunda/workers/assignment/find-providers.worker.ts
import { Injectable } from '@nestjs/common';
import { BaseWorker } from '../base.worker';

@Injectable()
export class FindProvidersWorker extends BaseWorker {
  readonly taskType = 'find-providers';

  async handle(job: any) {
    const { serviceType, postalCode, countryCode } = job.variables;
    
    const providers = await this.providersService.findEligible({
      serviceType,
      postalCode,
      countryCode,
    });

    return {
      candidateProviders: providers,
      providersFound: providers.length > 0,
    };
  }
}
```

## Variable Contracts

Always define variable contracts in `contracts/` using JSON Schema:

- Provides type safety for workers
- Documents expected input/output
- Enables validation
- Helps debugging in Operate

## Debugging with Operate

1. Open http://localhost:8081
2. View running instances under "Processes"
3. Click instance to see:
   - Current state (active tokens)
   - Variable values
   - Audit log
4. Check "Incidents" for failures
   - View error message
   - See variable snapshot
   - Retry or resolve

## Common Operations

### Deploy a Process

```bash
# Via zbctl CLI
zbctl deploy processes/service-order-lifecycle.bpmn

# Or programmatically in NestJS
await zeebe.deployResource({
  processFilename: 'camunda/processes/service-order-lifecycle.bpmn'
});
```

### Start a Process Instance

```typescript
const instance = await zeebe.createProcessInstance({
  bpmnProcessId: 'service-order-lifecycle',
  variables: {
    serviceOrderId: 'uuid-here',
    customerId: 'uuid-here',
    urgency: 'STANDARD',
    // ...
  },
});
```

### Send a Message (Correlation)

```typescript
// When provider accepts offer
await zeebe.publishMessage({
  name: 'OfferAccepted',
  correlationKey: serviceOrderId,
  variables: {
    acceptedAt: new Date().toISOString(),
  },
});
```

## Production Deployment

For production, use the full Camunda 8 Self-Managed setup with:
- Identity (authentication)
- Optimize (analytics)
- Horizontal scaling
- TLS/mTLS

See [Camunda 8 Self-Managed Docs](https://docs.camunda.io/docs/self-managed/about-self-managed/).

## Resources

- [Camunda 8 Documentation](https://docs.camunda.io/)
- [BPMN 2.0 Reference](https://docs.camunda.io/docs/components/modeler/bpmn/)
- [Camunda 8 JS SDK](https://github.com/camunda/camunda-8-js-sdk)
- [Zeebe Best Practices](https://docs.camunda.io/docs/components/best-practices/)
