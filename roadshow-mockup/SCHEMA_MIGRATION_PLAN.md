# Schema Migration Plan - v1 to v2 Complete

**Created**: 2025-11-16
**Type**: Major Schema Overhaul
**Impact**: Breaking Changes - Full Rebuild Required

---

## 📊 Summary of Changes

### New Models Added (8):
1. **ProjectContact** - Multiple contacts per project
2. **Contract** - Contract lifecycle management
3. **WorkClosingForm (WCF)** - Post-service acceptance
4. **ProviderInvoice** - Provider payment tracking
5. **DateNegotiation** - Provider-customer date negotiation (max 3 rounds)
6. **TaskManagement** - Operator task queue
7. **Alert** - System alerts and notifications
8. **(Country rules updated)** - Added country-specific configuration

### Models Significantly Updated:
1. **Project** (12 new fields)
   - `responsibleOperatorId` - Pilote du Chantier ⭐
   - `assignmentMode` - AUTO or MANUAL
   - `totalEstimatedHours` - For workload balancing
   - `worksiteStreet/City/Postal/Country` - Worksite address

2. **ServiceOrder** (30+ new fields!)
   - Sales integration (5 fields)
   - TV Potential assessment (6 fields) ⭐
   - Risk assessment (6 fields) ⭐
   - Contract workflow (4 fields)
   - Go Execution checks (6 fields) ⭐
   - WCF tracking (4 fields)
   - Provider payment (2 fields)

3. **Assignment** (3 new fields)
   - `offerExpiresAt` - 4h timeout
   - `dateNegotiationRound` - Current negotiation round
   - `originalDate` - For negotiation reference

4. **Execution** (7 new fields)
   - `checklistItems` - Checklist tracking
   - `checklistCompletion` - Percentage
   - `completionStatus` - COMPLETE/INCOMPLETE/FAILED
   - `incompleteReason` - Why incomplete
   - `blockedReason` - Go Exec block reason
   - `canCheckIn` - Check-in authorization flag
   - `audioRecordings` - Audio URLs

5. **Provider** (6 new fields)
   - `tier` - 1, 2, or 3 (for scoring)
   - `riskStatus` - OK/ON_WATCH/SUSPENDED
   - `riskReason` - Why suspended/watched
   - `suspendedFrom/Until` - Suspension period
   - `certifications` - JSON array

6. **Country** (4 new fields)
   - `providerAutoAccept` - ES, IT = true
   - `projectOwnershipMode` - AUTO or MANUAL
   - `contractAutoSendHours` - Auto-send delay
   - `offerTimeoutHours` - Provider timeout

---

## 🔄 Migration Strategy

### Option 1: Clean Slate (RECOMMENDED for Demo)
**Why**: Too many breaking changes, easier to start fresh

**Steps**:
1. Backup current database (if any data exists)
2. Drop all tables
3. Apply new schema
4. Run comprehensive seed data

**Command**:
```bash
# Backup (if needed)
pg_dump yellowgrid_dev > backup_v1.sql

# Reset database
npx prisma migrate reset --force

# Apply new schema
npx prisma migrate dev --name v2-complete-workflow

# Generate client
npx prisma generate

# Seed with comprehensive demo data
npm run seed
```

### Option 2: Incremental Migration
**Why**: If you have production data to preserve

**NOT RECOMMENDED** for this project because:
- This is a demo mockup
- No production data exists
- Too many breaking changes

---

## 🆕 New Features Enabled

### 1. Project Ownership (Pilote du Chantier)
**Schema Support**:
- `Project.responsibleOperatorId` - Links to User (operator)
- `Project.assignmentMode` - AUTO or MANUAL
- `Project.totalEstimatedHours` - For workload balancing
- `User.ownedProjects` - Relation to owned projects

**Business Logic Required**:
- Workload balancing algorithm
- Auto-assignment on project creation
- Batch ownership transfer
- Notification filtering (only project owner)

### 2. Sales Integration
**Schema Support**:
- `ServiceOrder.salesOrderId` - External ref
- `ServiceOrder.salesProjectId` - External project
- `ServiceOrder.salesSystemSource` - Which system

**Integration Required**:
- Kafka consumer for sales system events
- Order intake workflow

### 3. TV Potential Assessment (AI)
**Schema Support**:
- `ServiceOrder.salesPotential` - LOW/MEDIUM/HIGH
- `ServiceOrder.salesPotentialScore` - 0-100
- `ServiceOrder.salesmanNotes` - For NLP
- `ServiceOrder.salesPreEstimationId/Value` - Link to pre-estimation

**AI Model Required**:
- NLP on salesman notes
- Customer context analysis
- Pre-estimation value weighting
- Output: LOW/MEDIUM/HIGH + score

### 4. Risk Assessment (AI)
**Schema Support**:
- `ServiceOrder.riskLevel` - LOW/MEDIUM/HIGH/CRITICAL
- `ServiceOrder.riskScore` - 0-100
- `ServiceOrder.riskFactors` - JSON breakdown
- `ServiceOrder.riskAcknowledgedBy/At` - Operator acknowledgment

**AI Model Required**:
- Input: SO history, claims, reschedules, provider quality
- Daily batch job (00:00)
- Event-triggered on status changes

### 5. Contract Workflow
**Schema Support**:
- `Contract` model - Full lifecycle
- `ServiceOrder.contractId/Status` - Links
- `Project.contracts` - Relation

**Features**:
- Bundle multiple SOs into one contract
- Template system
- Digital/manual/skip signature
- Auto-send after 2h (configurable per country)

### 6. Provider Acceptance Flow
**Schema Support**:
- `Assignment.offerExpiresAt` - 4h timeout
- `Assignment.dateNegotiationRound` - Current round
- `DateNegotiation` model - Full negotiation history
- `Assignment.status` includes DATE_NEGOTIATION

**Features**:
- 4h timeout enforcement (background job)
- Up to 3 rounds of date negotiation
- Task creation on failure
- Country-specific auto-accept (ES, IT)

### 7. Go Execution Checks
**Schema Support**:
- `ServiceOrder.goExecStatus` - OK/NOK
- `ServiceOrder.goExecBlockReason` - Why blocked
- `ServiceOrder.goExecOverride/By/At` - Operator derogation
- `ServiceOrder.paymentStatus` - From sales system
- `ServiceOrder.productDeliveryStatus` - From supply chain
- `Execution.blockedReason` - Block reason
- `Execution.canCheckIn` - Authorization flag

**Features**:
- Eve-of-execution scheduler (check payment + delivery)
- Block check-in if NOK
- Operator override (derogation)
- Alert + Task creation

### 8. WCF Workflow
**Schema Support**:
- `WorkClosingForm` model - Full lifecycle
- `ServiceOrder.wcfId/Status` - Links
- `ProviderInvoice` model - Payment tracking

**Features**:
- WCF generation after check-out
- Customer acceptance (OK/reserves/refused)
- Provider invoice generation
- Payment trigger to external system (Kafka)

### 9. Task Management & Alerts
**Schema Support**:
- `TaskManagement` model - Operator tasks
- `Alert` model - System alerts

**Task Types**:
- MANUAL_ASSIGNMENT (no providers)
- DATE_NEGOTIATION_FAILED (3 rounds)
- GO_EXEC_NOK (payment/delivery)
- WCF_RESERVES/REFUSED
- INCOMPLETE_JOB

---

## 📝 Updated Enums

### New Enums:
- `AssignmentModeConfig` - AUTO, MANUAL
- `SalesPotential` - LOW, MEDIUM, HIGH
- `RiskLevel` - LOW, MEDIUM, HIGH, CRITICAL
- `StatusTagType` - CONTRACT, GO_EXEC, WCF
- `ContractStatus` - PENDING, SENT, SIGNED, REFUSED, SKIPPED
- `SignatureType` - DIGITAL, MANUAL, SKIPPED
- `WCFStatus` - PENDING, SENT, SIGNED_OK, SIGNED_WITH_RESERVES, REFUSED
- `InvoiceStatus` - PENDING, SIGNED, CONTESTED, PAID
- `CompletionStatus` - COMPLETE, INCOMPLETE, FAILED
- `TaskPriority` - LOW, MEDIUM, HIGH, URGENT
- `TaskStatus` - PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `TaskType` - (8 different task types)
- `AlertSeverity` - INFO, WARNING, ERROR, CRITICAL
- `AlertType` - (7 different alert types)
- `ProviderRiskStatus` - OK, ON_WATCH, SUSPENDED

### Updated Enums:
- `ServiceOrderStatus` - Added: CONTRACT_PENDING, CONTRACT_SENT, CONTRACT_SIGNED, GO_EXEC_NOK, WCF_PENDING, WCF_SIGNED, BLOCKED, REWORK_NEEDED
- `ServiceType` - Added: TECHNICAL_VISIT, QUOTATION
- `TVOutcome` - Now: PENDING, YES, YES_BUT, NO
- `AssignmentStatus` - Added: DATE_NEGOTIATION
- `ExecutionStatus` - Added: BLOCKED, INCOMPLETE

---

## 🔢 Field Count by Model

| Model | v1 Fields | v2 Fields | New Fields |
|-------|-----------|-----------|------------|
| Project | 12 | 24 | +12 |
| ServiceOrder | 25 | 60+ | +35 |
| Assignment | 12 | 15 | +3 |
| Execution | 15 | 22 | +7 |
| Provider | 12 | 18 | +6 |
| Country | 8 | 12 | +4 |
| **NEW: ProjectContact** | 0 | 7 | +7 |
| **NEW: Contract** | 0 | 12 | +12 |
| **NEW: WorkClosingForm** | 0 | 11 | +11 |
| **NEW: ProviderInvoice** | 0 | 13 | +13 |
| **NEW: DateNegotiation** | 0 | 8 | +8 |
| **NEW: TaskManagement** | 0 | 14 | +14 |
| **NEW: Alert** | 0 | 12 | +12 |

**Total New Fields**: ~150+

---

## 🚨 Breaking Changes

### 1. ServiceOrder.projectId now REQUIRED
**Impact**: All service orders MUST be in a project
**Migration**: Create default project for orphaned SOs

### 2. Many new required fields
**Impact**: Can't create SOs without proper data
**Migration**: Use sensible defaults in seed data

### 3. Status enum values changed
**Impact**: Existing statuses may not map
**Migration**: Map old to new statuses

### 4. New mandatory relations
**Impact**: Foreign key constraints
**Migration**: Ensure referential integrity

---

## ✅ Testing Plan

### Phase 1: Schema Validation
- [ ] Prisma validates schema syntax
- [ ] All relations are bidirectional
- [ ] Indexes are appropriate
- [ ] Enums are complete

### Phase 2: Migration Execution
- [ ] Migration runs without errors
- [ ] All tables created
- [ ] All indexes created
- [ ] Foreign keys enforced

### Phase 3: Seed Data
- [ ] Users seed successfully
- [ ] Countries with rules
- [ ] Projects with contacts
- [ ] Service orders with all new fields
- [ ] Contracts created
- [ ] Assignments with negotiations
- [ ] Executions with checklists
- [ ] Tasks and alerts

### Phase 4: Service Layer
- [ ] All services compile
- [ ] CRUD operations work
- [ ] Relations load properly
- [ ] Prisma Client generated correctly

---

## 📅 Timeline Estimate

**Schema Migration**: 1 day
**Service Updates**: 3-5 days
**Seed Data Creation**: 3-4 days
**Testing & Fixes**: 2-3 days

**Total**: 1-2 weeks for complete migration

---

## 🔄 Rollback Plan

If migration fails:

1. **Restore from backup**:
   ```bash
   psql yellowgrid_dev < backup_v1.sql
   ```

2. **Revert Prisma schema**:
   ```bash
   git checkout HEAD~1 -- prisma/schema.prisma
   ```

3. **Regenerate client**:
   ```bash
   npx prisma generate
   ```

---

## 📚 Next Steps

1. **Review schema** - Ensure all requirements captured
2. **Apply migration** - Run Prisma migrate
3. **Update services** - Modify service layer for new fields
4. **Create seeders** - Comprehensive demo data
5. **Test thoroughly** - All workflows end-to-end

---

**This is a MAJOR update. Proceed carefully!**

**Document Version**: 1.0
**Created**: 2025-11-16
**Status**: Ready for Review & Execution
