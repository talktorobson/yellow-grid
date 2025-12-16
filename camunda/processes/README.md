# Camunda Processes

This directory contains BPMN 2.0 process models.

## Deployed Processes

| File | Process ID | Version | Description |
|------|-----------|---------|-------------|
| `service-order-lifecycle.bpmn` | ServiceOrderLifecycle | v2 | Main service order orchestration |
| `provider-assignment.bpmn` | ProviderAssignment | **v3** | Provider assignment with escalation |
| `date-negotiation.bpmn` | DateNegotiation | v1 | 3-round date negotiation |
| `go-execution-check.bpmn` | GoExecutionCheck | v1 | Pre-execution validation |
| `wcf-workflow.bpmn` | WCFWorkflow | v1 | Work Completion Form flow |
| `contract-lifecycle.bpmn` | ContractLifecycle | v1 | Contract bundle sending and signature |
| `task-escalation.bpmn` | TaskManagementEscalation | v1 | SLA monitoring and escalation |

## Recent Updates (v3 - December 2025)

### Provider Assignment v3

**New Features**:
- ✅ **Escalation Flow**: Automated reassignment on offer timeout (4-hour timer)
- ✅ **3-Round Escalation**: Attempts reassignment up to 3 times before manual review
- ✅ **Manual Review Routing**: After max escalation rounds, routes to MANUAL_REVIEW end event
- ✅ **Message Correlation**: Offer acceptance/rejection via message events

**BPMN Changes**:
- Added `Task_EscalateTimeout` service task (task type: `escalate-offer-timeout`)
- Added `Gateway_EscalationResult` exclusive gateway
- Added `EndEvent_ManualReview` for cases requiring operator intervention
- Timeout flow now routes through escalation instead of direct to declined

**Flow**:
```
Event_OfferTimeout (4h) → Task_EscalateTimeout → Gateway_EscalationResult
                                                          ↓
                                                   [Reassigned] → EndEvent_Assigned
                                                   [ManualReview] → EndEvent_ManualReview
```

## Message Events

| Message Name | Correlation Key | Purpose |
|-------------|----------------|----------|
| OfferAccepted | `offerId` (assignmentId) | Provider accepts service offer |
| OfferRejected | `offerId` (assignmentId) | Provider rejects service offer |
| CustomerAcceptsDate | `negotiationId` | Customer accepts proposed date |
| CustomerCounterProposes | `negotiationId` | Customer counter-proposes date |
| ProviderAcceptsDate | `negotiationId` | Provider accepts customer date |
| ProviderCounterProposes | `negotiationId` | Provider counter-proposes date |
| ManualOverrideApproved | `serviceOrderId` | Operator approves GO execution override |
| WCFSignedOK | `wcfId` | Customer signs WCF without reserves |
| WCFSignedWithReserves | `wcfId` | Customer signs WCF with quality reserves |
| WCFRefused | `wcfId` | Customer refuses to sign WCF |
| ReservesResolved | `wcfId` | Operator resolves WCF reserves |
| ContractSigned | `contractId` | Customer signs contract bundle |
| ContractRefused | `contractId` | Customer refuses contract |

## Editing

Use [Camunda Modeler](https://camunda.com/download/modeler/) to edit these files.
