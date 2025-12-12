# Camunda 8 Agentic Workflow Guide

This document describes how to use the AI-assisted "agentic coding loop" for developing and debugging Camunda workflows in Yellow Grid.

## Quick Start

### 1. Start Local Camunda Stack

```bash
cd camunda
docker compose -f docker-compose.camunda.yml up -d
```

**Services Available:**
- **Zeebe Gateway**: `localhost:26500` (gRPC for workers)
- **Operate**: `http://localhost:8081` (Process monitoring)
- **Tasklist**: `http://localhost:8082` (Human tasks)
- **Connectors**: `http://localhost:8085` (Outbound connectors)

### 2. Open Operate Dashboard

Navigate to `http://localhost:8081` in your browser. This shows:
- Running process instances
- Incidents (failed workers)
- Process definitions
- Variable state

### 3. Start NestJS with Camunda Enabled

```bash
CAMUNDA_ENABLED=true npm run start:dev
```

This will:
- Connect to Zeebe
- Deploy BPMN processes from `camunda/processes/`
- Register all workers

---

## Agentic Coding Loop

### The Loop

```
┌─────────────────────────────────────────────────────────────┐
│  1. DESIGN: Open BPMN in Camunda Modeler                    │
│             ↓                                                │
│  2. SAVE: Export to camunda/processes/*.bpmn                │
│             ↓                                                │
│  3. DEPLOY: Auto-deployed on NestJS startup                 │
│             ↓                                                │
│  4. TEST: Start a process instance via API                  │
│             ↓                                                │
│  5. OBSERVE: Check Operate for flow & incidents             │
│             ↓                                                │
│  6. DEBUG: Read incident details → fix worker code          │
│             ↓                                                │
│  7. RETRY: Resolve incident in Operate                      │
│             ↓                                                │
│  (Loop back to step 1 or 4)                                 │
└─────────────────────────────────────────────────────────────┘
```

### AI Agent Capabilities

When working with AI (Claude/Copilot), you can:

1. **"Read the BPMN file and show me the flow"**
   - AI reads `camunda/processes/*.bpmn` and explains the structure

2. **"Check Operate for incidents on service order X"**
   - AI uses OperateService to query incidents

3. **"Generate a worker for task type X"**
   - AI creates worker class following BaseWorker pattern

4. **"The go-check worker is failing, debug it"**
   - AI reads Operate incident → reads worker code → proposes fix

5. **"Add a timer boundary event to the send-offer task"**
   - AI modifies BPMN XML (basic) or explains what to change in Modeler

---

## API Endpoints for Testing

### Start a Workflow Instance

```bash
# Via curl (when API endpoint is implemented)
curl -X POST http://localhost:3000/api/v1/camunda/workflows/service-order \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceOrderId": "test-123",
    "urgency": "STANDARD",
    "countryCode": "FR",
    "serviceTypeCode": "PLUMBING",
    "postalCode": "75001"
  }'
```

### Send a Message (e.g., offer accepted)

```bash
curl -X POST http://localhost:3000/api/v1/camunda/messages/offer_accepted \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "correlationKey": "assignment-123",
    "variables": {
      "acceptedAt": "2025-01-15T10:30:00Z"
    }
  }'
```

---

## Worker Development Pattern

### 1. Define Task Type in BPMN

In Camunda Modeler, set the task type on a Service Task:
```xml
<zeebe:taskDefinition type="my-new-task" />
```

### 2. Create Worker Class

```typescript
// src/camunda/workers/domain/my-new-task.worker.ts
import { Injectable, Logger } from '@nestjs/common';
import { BaseWorker, ZeebeJob, BpmnError } from '../base.worker';

interface MyTaskInput {
  serviceOrderId: string;
  // ... other input variables
}

interface MyTaskOutput {
  result: string;
  // ... output variables
}

@Injectable()
export class MyNewTaskWorker extends BaseWorker<MyTaskInput, MyTaskOutput> {
  protected readonly logger = new Logger(MyNewTaskWorker.name);
  readonly taskType = 'my-new-task';
  readonly timeout = 30000;

  constructor(private readonly someService: SomeService) {
    super();
  }

  async handle(job: ZeebeJob<MyTaskInput>): Promise<MyTaskOutput> {
    const { serviceOrderId } = job.variables;
    
    // Business logic here
    const result = await this.someService.doSomething(serviceOrderId);
    
    if (!result) {
      throw new BpmnError('BPMN_NOT_FOUND', 'Resource not found');
    }
    
    return {
      result: 'success',
    };
  }
}
```

### 3. Register in Module

Add to `src/camunda/camunda.module.ts`:
```typescript
import { MyNewTaskWorker } from './workers/domain/my-new-task.worker';

@Module({
  providers: [
    // ...
    MyNewTaskWorker,
  ],
})
```

### 4. Register in Service

Add to `src/camunda/camunda.service.ts`:
```typescript
constructor(
  // ...
  private readonly myNewTaskWorker: MyNewTaskWorker,
) {}

private registerWorkers(): void {
  const workers = [
    // ...
    this.myNewTaskWorker,
  ];
  // ...
}
```

---

## Debugging Incidents

### Via Operate UI

1. Open `http://localhost:8081`
2. Click on "Incidents" in sidebar
3. Click incident to see:
   - Process instance
   - Failed flow node
   - Error message
   - Variables at time of failure

### Via AI Agent

Ask the agent to check incidents:

```
"Check Operate for any active incidents and tell me what's failing"
```

The agent will use `OperateService.getActiveIncidents()` and report:
- Number of incidents
- Error types
- Affected process instances
- Suggested fixes

### Resolving Incidents

After fixing worker code:

1. **In Operate**: Click "Retry" on the incident
2. **Via API**: 
   ```bash
   curl -X POST http://localhost:8081/api/process-instances/{key}/retry
   ```

---

## Variable Contracts

All process variables should follow the schemas in `camunda/contracts/`:

- `service-order.schema.json` - Main service order variables
- `assignment.schema.json` - Provider assignment variables

Workers should validate input against these schemas (optional but recommended).

---

## Common Issues & Solutions

### Issue: Worker not picking up tasks

**Cause**: Worker not registered or wrong task type
**Fix**: Check `taskType` matches BPMN, check worker is in providers array

### Issue: Process stuck waiting for message

**Cause**: Wrong correlation key
**Fix**: Ensure `correlationKey` in message matches the process variable

### Issue: Timer not firing

**Cause**: ISO 8601 duration format wrong
**Fix**: Use `PT4H` for 4 hours, `P1D` for 1 day, etc.

### Issue: Variable not available in worker

**Cause**: Variable scope or not propagated from sub-process
**Fix**: Set `propagateAllChildVariables="true"` on call activity

---

## File Structure

```
camunda/
├── docker-compose.camunda.yml    # Local Camunda stack
├── .env.camunda.example          # Environment template
├── contracts/
│   ├── service-order.schema.json # Variable contracts
│   └── assignment.schema.json
├── processes/
│   ├── service-order-lifecycle.bpmn
│   └── provider-assignment.bpmn
├── decisions/                    # DMN files (TODO)
├── forms/                        # Camunda Forms (TODO)
└── connectors/                   # Custom connectors (TODO)

src/camunda/
├── camunda.module.ts             # NestJS module
├── camunda.config.ts             # Configuration
├── camunda.service.ts            # Main service
├── operate/
│   └── operate.service.ts        # Operate API client
└── workers/
    ├── base.worker.ts            # Abstract base class
    ├── assignment/
    │   ├── find-providers.worker.ts
    │   ├── rank-providers.worker.ts
    │   └── send-offer.worker.ts
    ├── booking/
    │   ├── check-availability.worker.ts
    │   └── reserve-slot.worker.ts
    ├── execution/
    │   └── go-check.worker.ts
    └── notification/
        └── send-notification.worker.ts
```

---

## Next Steps

1. **Download Camunda Modeler**: https://camunda.com/download/modeler/
2. **Design full BPMN**: Open templates, add visual flow
3. **Add DMN decisions**: Provider ranking, SLA calculation
4. **Create Forms**: Human task forms for operator UI
5. **Integration tests**: Test full workflows end-to-end
