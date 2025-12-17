# BPMN Implementation Walkthrough

## Summary

Implemented **3 new BPMN processes** for Camunda orchestration in the Yellow Grid FSM platform, bringing the total to **5 deployed processes**.

---

## Processes Created

### 1. [date-negotiation.bpmn](file:///Users/20015403/Documents/PROJECTS/personal/yellow-grid/camunda/processes/date-negotiation.bpmn)
**Process ID**: `DateNegotiation`

| Element | Description |
|---------|-------------|
| 3-round negotiation | Customer ↔ Provider back-and-forth |
| Timer: 48h | Customer response timeout |
| Timer: 24h | Provider response timeout |
| Messages | Accept, Counter-propose (4 total) |
| Escalation | After round 3 → Operator task |

---

### 2. [go-execution-check.bpmn](file:///Users/20015403/Documents/PROJECTS/personal/yellow-grid/camunda/processes/go-execution-check.bpmn)
**Process ID**: `GoExecutionCheck`

| Element | Description |
|---------|-------------|
| Payment check | Query sales system (Pyxis/Tempo) |
| Delivery check | Query supply chain |
| Block check-in | GO_NOK → Alert + Task |
| Manual override | Operator can approve derogation |
| D-day recheck | Loops back for re-verification |

---

### 3. [wcf-workflow.bpmn](file:///Users/20015403/Documents/PROJECTS/personal/yellow-grid/camunda/processes/wcf-workflow.bpmn)
**Process ID**: `WCFWorkflow`

| Element | Description |
|---------|-------------|
| Timer: 7 days | WCF signature expiry |
| Signed OK | → Trigger provider invoice |
| Signed with reserves | → Create operator task |
| Refused/Expired | → Create follow-up task |

---

## Files Changed

| File | Action |
|------|--------|
| `camunda/processes/date-negotiation.bpmn` | ✅ Created |
| `camunda/processes/go-execution-check.bpmn` | ✅ Created |
| `camunda/processes/wcf-workflow.bpmn` | ✅ Created |
| `camunda/processes/README.md` | ✅ Updated (added message events) |

---

## Implemented Workers

The following 11 workers have been implemented and registered in `CamundaModule`:

| Process | Worker Type | Implementation |
|---------|-------------|----------------|
| **DateNegotiation** | `record-date-proposal` | Writes to `DateNegotiation` table |
| | `finalize-date-agreement` | Updates `Assignment.state` to `ACCEPTED` |
| | `auto-confirm-date` | Confirms provider proposal on timeout |
| | `escalate-date-negotiation` | Creates `UNASSIGNED_JOB` High Priority Task |
| **GoExecution** | `check-payment-status` | Mock (random success) |
| | `check-delivery-status` | Mock (random success) |
| | `block-checkin` | Sets `ServiceOrder.executionBlocked = true` |
| | `apply-go-override` | Sets `ServiceOrder.executionBlocked = false` |
| **WCFWorkflow** | `generate-wcf` | Creates `WorkCompletionForm` (Draft) |
| | `send-wcf` | Updates status to `PENDING_SIGNATURE`, emits event |
| | `trigger-invoice` | Updates `ServiceOrder` to `COMPLETED`, logs mock invoice |
| **ContractLifecycle** | `validate-contract-bundle` | Validates SO states in local DB |
| | `send-contract` | Updates `Contract.status`, emits event |
| | `activate-contract` | Updates `Contract.status` to `ACTIVE` |
| **TaskEscalation** | `create-task` | Generic worker to create `Task` entity |
| | `assign-task` | Auto-assigns to operator, calc SLA duration |
| | `escalate-task` | Increments escalation level |
| | `notify-escalation` | Emits notification event for manager |

## Schema Changes

### `DateNegotiation` Model
- Added new model to track negotiation rounds.
- Added relation to `Assignment`.

### `ServiceOrder` Model
- Added `executionBlocked` (Boolean) and `executionBlockedReason` (String) fields.
- Used by `block-checkin` and `apply-go-override` workers.

## Files Changed

| File | Action |
|------|--------|
| `camunda/processes/date-negotiation.bpmn` | ✅ Created |
| `camunda/processes/go-execution-check.bpmn` | ✅ Created |
| `camunda/processes/wcf-workflow.bpmn` | ✅ Created |
| `camunda/processes/contract-lifecycle.bpmn` | ✅ Created |
| `camunda/processes/task-escalation.bpmn` | ✅ Created |
| `src/camunda/workers/negotiation/*.ts` | ✅ Created (4 files) |
| `src/camunda/workers/execution/*.ts` | ✅ Created (4 files) |
| `src/camunda/workers/wcf/*.ts` | ✅ Created (3 files) |
| `src/camunda/workers/contract/*.ts` | ✅ Created (3 files) |
| `src/camunda/workers/task/*.ts` | ✅ Created (4 files) |
| `src/camunda/camunda.module.ts` | ✅ Updated (Registration) |
| `prisma/schema.prisma` | ✅ Updated (Models) |

## Next Steps

1. **Verify Infrastructure**: Ensure Zeebe is fully healthy (`docker compose logs dev-zeebe`).
2. **Deploy**: Restart application (`npm run start`) to auto-deploy processes.
3. **Test**: Run `npx ts-node scripts/test-date-negotiation.ts` to verify flow.

> **Note**: Automated deployment was attempted but local Zeebe instance was unreachable (`ECONNREFUSED`). Ensure Docker resources are sufficient.
119:
120: ## VPS Deployment & Verification
121:
122: ### Deployment Steps
123: 1. **Code Transfer**: Synced project files including `src/`, `camunda/`, `scripts/` to VPS.
124: 2. **Infrastructure Update**: Rebuilt Docker API image to include latest code and BPMN fixes.
125: 3. **Database Migration**: Ran `prisma migrate deploy` successfully on VPS.
126: 4. **Service Restart**: Restarted services (`api`, `zeebe`, `postgres`, `redis`).
127:
128: ### Verification Results
129: - **BPMN Deployment**: Successfully deployed `DateNegotiation` (v1) and all other workflows.
130:   - *XML Syntax Issue Resolved*: Fixed nested quotes in `zeebe:input` attributes by removing problematic mappings or ensuring correct XML escaping.
131: - **Process Instantiation**: Verified by running `test-date-negotiation.ts` on the VPS.
132:   - Created Process Instance ID: `2251799813914040`
133:   - Definition Key: `2251799813913920`
134:   - Status: **ACTIVE**

## Sales System Simulator (Demo Tool)

The platform includes a built-in simulator to generate mock traffic for demonstration.

### Usage
**POST** `/api/v1/simulator/sales/trigger`

| Parameter | Type | Description |
|-----------|------|-------------|
| `scenario` | String | See below. |
| `count` | Number | Number of events to generate. |

### Scenarios
- **STANDARD_INSTALLATION**: Regular Pyxis order.
- **EMERGENCY_REPAIR**: High priority Tempo order.
- **UPDATE_DELIVERY_DATE**: Simulates an `UpdateDeliveryDate` event for an existing order.

---

## Direct Intake Integration

You can also use the integration endpoint directly with **Adeo-compliant JSON payloads**.

**POST** `/api/v1/integrations/sales/orders/intake`

Supports polymorphic payloads:
1. **Order Intake**: Standard order creation structure (root keys: `order`, `items`, `system`, etc.).
2. **Update Delivery**: Update structure (root keys: `eventType`, `maxDeliveryDate`, etc.).

See `sales_simulator_design.md` for full schema details and payload examples.



