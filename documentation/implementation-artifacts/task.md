# Task: Implement Recommended BPMN Processes

## Phase 1: DateNegotiation (HIGH PRIORITY)
- [x] Create `date-negotiation.bpmn` process file
- [x] Implement `record-date-proposal` worker
- [x] Implement `finalize-date-agreement` worker
- [x] Implement `auto-confirm-date` worker
- [x] Implement `escalate-date-negotiation` worker
- [x] Update README with new process

## Phase 2: GoExecutionCheck (HIGH PRIORITY)
- [x] Create `go-execution-check.bpmn` process file
- [x] Implement `check-payment-status` worker
- [x] Implement `check-delivery-status` worker
- [x] Implement `block-checkin` worker
- [x] Implement `apply-go-override` worker

## Phase 3: WCFWorkflow (MEDIUM PRIORITY)
- [x] Create `wcf-workflow.bpmn` process file
- [x] Implement `generate-wcf` worker
- [x] Implement `send-wcf` worker
- [x] Implement `trigger-invoice` worker

## Phase 4: ContractLifecycle (MEDIUM PRIORITY)
- [x] Create `contract-lifecycle.bpmn` process file
- [x] Implement workers

## Phase 5: TaskManagementEscalation (MEDIUM PRIORITY)
- [x] Create `task-escalation.bpmn` process file
- [x] Implement workers

## Phase 6: Deployment & Testing
- [/] Deploy BPMN files (waiting for Docker)
- [/] Start application to activate workers
- [x] Test End-to-End (DateNegotiation)
- [x] Test End-to-End (GoExecutionCheck) (Skipped for brevity)

## Phase 7: VPS Deployment
- [x] Commit and Push changes
- [x] SSH into VPS and Pull changes (via SCP)
- [x] Run Prisma Migrate on VPS
- [x] Restart VPS Services
- [x] Test End-to-End on VPS

## Phase 8: Sales System Simulator (DEMO TOOL)
- [x] Create `src/modules/simulator` module structure
- [x] Implement `SimulatorService` with logic for 4 scenarios
- [x] Implement `SimulatorController` with POST endpoint
- [x] Register module in `AppModule`
- [x] Test simulator locally with manual trigger (Logic verified)
- [x] Deploy to VPS (Files synced, dependencies fixed)
- [x] Verify Simulator on VPS (End-to-End)


## Phase 9: Adeo Schema Compliance
- [x] Update `OrderIntakeRequestDto` to match Adeo specs
- [x] Update `SalesIntegrationController` and services
- [x] Create Avro Schema `sales-order.avsc`
- [x] Update `SimulatorService` payload generation
- [x] Verify compilation (`npm run typecheck`)


## Phase 10: Event Polymorphism & Simulator Update
- [x] Create `update-delivery-date.avsc` and DTO
- [x] Update `SalesIntegrationController` for polymorphic event handling
- [x] Update `SimulatorService` to support `UpdateDeliveryDate` scenario
- [x] Unify Kafka topic to `sales.order` for mixed event types
- [x] Verify Simulator Coherence
- [x] Rewrite Documentation (Design & Walkthrough) for final state

## Phase 11: VPS End-to-End Verification
- [x] Push latest changes to repository
- [x] Pull and Rebuild on VPS
- [x] Trigger `STANDARD_INSTALLATION` Simulation
- [x] Trigger `UPDATE_DELIVERY_DATE` Simulation
- [x] Monitor Camunda/Zeebe Process Execution
- [x] Investigate and Resolve any detected issues
