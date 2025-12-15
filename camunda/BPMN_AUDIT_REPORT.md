# Camunda 8 BPMN Audit Report

**Date**: December 2025  
**Status**: ✅ FULLY WIRED - Camunda integration complete with event-driven architecture

## Summary

The BPMN files were missing the `<bpmndi:BPMNDiagram>` section which contains visual coordinates for all process elements. This section is required for Camunda Modeler to render and edit the diagrams. Additionally, the Camunda integration was not wired to the application - workflows were never started.

## Issues Found & Fixed

| Issue | Severity | Status |
|-------|----------|--------|
| Process ID mismatch (code vs BPMN) | Critical | ✅ Fixed |
| Missing BPMNDiagram section | High | ✅ Fixed |
| Missing validate-order worker | Medium | ✅ Created |
| Missing auto-assign-provider worker | Medium | ✅ Created |
| CamundaService not wired to app | Critical | ✅ Fixed |
| Circular dependency risk | High | ✅ Avoided |

## Architecture: Event-Driven Integration

To avoid circular dependencies between `CamundaModule` and `ServiceOrdersModule`, we use NestJS EventEmitter for loose coupling:

```
┌─────────────────────┐         EventEmitter         ┌─────────────────────┐
│ ServiceOrdersModule │ ──────────────────────────▶  │   CamundaModule     │
│                     │  service-order.created       │                     │
│ - ServiceOrdersSvc  │  service-order.offer-accepted│ - CamundaEventList  │
│ - AssignmentsSvc    │  service-order.offer-rejected│ - CamundaService    │
└─────────────────────┘                              └─────────────────────┘
         │                                                     │
         ▼                                                     ▼
    Database (Prisma)                                   Zeebe (BPMN Engine)
```

### Event Flow

1. **Order Creation** → `ServiceOrdersService.create()` → emits `service-order.created`
2. **CamundaEventListener** → receives event → calls `CamundaService.startServiceOrderWorkflow()`
3. **Offer Accepted** → `AssignmentsService.acceptAssignment()` → emits `service-order.offer-accepted`
4. **CamundaEventListener** → receives event → calls `CamundaService.publishMessage('OfferAccepted')`

## BPMN Files

### 1. Service Order Lifecycle (`service-order-lifecycle.bpmn`)

**Process ID**: `ServiceOrderLifecycle`

**Flow**:
1. **Start Event** - Order Created
2. **Validate Order** (service task: `validate-order`)
3. **Provider Assignment** (call activity → `ProviderAssignment` subprocess)
4. **Check Availability** (service task: `check-availability`)
5. **Reserve Slot** (service task: `reserve-slot`)
6. **Wait Timer** - Until 48h before scheduled date
7. **GO Check** (service task: `go-check`)
8. **GO Decision Gateway**:
   - GO_OK → Notify Ready for Execution → End (Completed)
   - GO_NOK → End (Blocked)

### 2. Provider Assignment (`provider-assignment.bpmn`)

**Process ID**: `ProviderAssignment`

**Flow**:
1. **Start Event** - Start Assignment
2. **Find Eligible Providers** (service task: `find-providers`)
3. **Rank Providers** (service task: `rank-providers`)
4. **Providers Available Gateway**:
   - Yes → Auto-Assign Provider (service task: `auto-assign-provider`)
   - No → End (No Provider Available)
5. **Auto-Assigned Gateway**:
   - Yes → End (Provider Assigned)
   - No → Send Offer to Provider (service task: `send-offer`)
6. **Event-Based Gateway** (await response):
   - Offer Accepted (message) → End (Assigned)
   - Offer Rejected (message) → End (Declined)
   - Timeout (4h timer) → End (Declined)

## Zeebe Workers

All workers are now registered in `CamundaService`:

| Worker | Task Type | Status | Location |
|--------|-----------|--------|----------|
| ValidateOrderWorker | `validate-order` | ✅ New | `workers/validation/` |
| FindProvidersWorker | `find-providers` | ✅ Stub | `workers/assignment/` |
| RankProvidersWorker | `rank-providers` | ✅ Stub | `workers/assignment/` |
| AutoAssignProviderWorker | `auto-assign-provider` | ✅ New | `workers/assignment/` |
| SendOfferWorker | `send-offer` | ✅ Stub | `workers/assignment/` |
| CheckAvailabilityWorker | `check-availability` | ✅ Stub | `workers/booking/` |
| ReserveSlotWorker | `reserve-slot` | ✅ Stub | `workers/booking/` |
| GoCheckWorker | `go-check` | ✅ Stub | `workers/execution/` |
| SendNotificationWorker | `send-notification` | ✅ Stub | `workers/notification/` |

## Remaining Work

### Medium Priority
- [ ] Store processInstanceKey for cancellation support
- [ ] Add BPMN error handling (compensation, boundary events)
- [ ] Add logging and metrics for workflow execution
- [ ] Add unit tests for CamundaEventListener

### Low Priority
- [ ] Implement retry strategies for worker failures
- [ ] Add Operate dashboard monitoring
- [ ] Implement Tasklist for human tasks
- [ ] Replace worker stubs with real DB logic

## Testing the BPMN Files

```bash
# Open in Camunda Modeler
open camunda/processes/service-order-lifecycle.bpmn
open camunda/processes/provider-assignment.bpmn

# Or on Linux
camunda-modeler camunda/processes/service-order-lifecycle.bpmn
```

## Starting Camunda Locally

```bash
# Start Camunda 8 stack
docker-compose -f deploy/docker-compose.camunda.yml up -d

# Enable Camunda in .env
CAMUNDA_ENABLED=true
ZEEBE_ADDRESS=localhost:26500

# Start the app
npm run start:dev
```
