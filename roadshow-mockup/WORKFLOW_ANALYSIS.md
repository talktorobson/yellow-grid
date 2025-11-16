# Yellow Grid Workflow Analysis & Implementation Gap

**Created**: 2025-11-16
**Status**: Critical Analysis - Major Schema Updates Required
**Priority**: HIGH - Core workflow differs significantly from initial implementation

---

## 🚨 Critical Finding

The detailed workflow description reveals **significant gaps** in the current implementation. The system is **much more complex** than initially modeled.

---

## 📋 Complete Workflow Breakdown

### Step 1: Sales System Integration (Kafka)
**What Happens**:
- Service already sold (store, web, phone)
- Yellow Grid receives service order via Kafka
- Contains: sales order details + service specifics (date, address, instructions)

**Current State**: ❌ Not modeled
**Required**:
- Kafka consumer for sales system events
- `ServiceOrder.salesOrderId` (external reference)
- Integration with Pyxis/Tempo/SAP

---

### Step 2: Project Association (AUTOMATED) ⭐ CRITICAL MISSING
**What Happens**:
- Check if customer has ongoing project → add to existing
- If no project → create new project first, then add SO
- **ALL service orders MUST be in a project**
- AI links related SOs (e.g., TV for kitchen → Installation of kitchen)

**Current State**: ❌ **PROJECT MODEL MISSING ENTIRELY!**
**Required**:
```typescript
model Project {
  id                    String    @id
  customerId            String    // Can have multiple contacts
  worksiteAddress       Address   // Single address for project
  responsibleOperatorId String?   // Pilote du Chantier ⭐
  assignmentMode        String    // AUTO or MANUAL (country rule)
  status                String
  totalEstimatedHours   Float     // Sum of all SOs
  createdAt             DateTime

  serviceOrders         ServiceOrder[]
  contacts              ProjectContact[] // Multiple (husband, wife, etc.)
}

model ProjectContact {
  id         String
  projectId  String
  name       String
  email      String
  phone      String
  isPrimary  Boolean
}
```

**Business Logic**:
- Automatic project linking (check customer, address, timeframe)
- AI-powered SO linking (NLP on descriptions)
- Workload balancing for operator assignment (sum of project hours)

---

### Step 3: Service Operator Actions
**What Happens**:
Operator sees new SO with context:
- Project details
- Scheduled date
- Linked SOs
- Payment status
- Product delivery status

**Operator Can**:
- Reschedule (check provider availability)
- Add notes/documents
- **Group SOs into single contract bundle**
- Select contract template
- Send contract (CTA)
- Print contract for manual signature
- Skip contract (derogation)

**Automation**: If no action after 2h → auto-send contract

**Current State**: ⚠️ Partially modeled
**Missing**:
```typescript
model Contract {
  id              String    @id
  projectId       String    // Contract can be for whole project
  serviceOrderIds String[]  // Or bundle specific SOs
  templateId      String
  status          String    // PENDING, SENT, SIGNED, SKIPPED
  sentAt          DateTime?
  signedAt        DateTime?
  signatureType   String?   // DIGITAL, MANUAL, SKIPPED
  pdfUrl          String?
  createdBy       String    // Operator who created

  serviceOrders   ServiceOrder[]
}

// ServiceOrder needs:
contractId         String?
contractStatus     String?  // OK, NOK (for status tags)
```

---

### Step 4: Contract Signature → Auto-Assignment
**What Happens**:
- Customer signs (digital/manual) or contract skipped
- Triggers automatic matching & dispatching
- Based on: availability, eligibility, scorecard

**Current State**: ⚠️ Assignment logic skeleton exists
**Missing**:
- Contract trigger integration
- Full 6-stage funnel implementation

---

### Step 5: Provider Acceptance Flow ⭐ COMPLEX
**What Happens**:

**Provider has 4h to respond**:

**Option A: Accept with original date**
→ Selects crew → Job assigned

**Option B: Accept with new date**
→ Proposes alternative
→ Customer must accept
→ **Up to 3 rounds** of date negotiation
→ If no agreement → Alert + Task to operator

**Option C: Refuse or No Response**
→ After 4h expires
→ Second round matching
→ This provider now ineligible

**Country-Specific (ES, IT)**:
→ Direct assignment with auto-acceptance
→ Provider cannot refuse

**Current State**: ⚠️ Partially modeled (Assignment with modes)
**Missing**:
```typescript
model DateNegotiation {
  id             String    @id
  assignmentId   String
  round          Int       // 1, 2, or 3 (max)
  proposedDate   DateTime
  proposedBy     String    // 'provider' or 'customer'
  status         String    // PENDING, ACCEPTED, REJECTED
  createdAt      DateTime
  respondedAt    DateTime?

  assignment     Assignment @relation(...)
}

// Assignment needs:
offerExpiresAt        DateTime?  // 4h timeout
dateNegotiationRound  Int?       // Current round (max 3)
originalDate          DateTime?  // To compare against
```

**Business Logic**:
- 4h timeout enforcement (background job)
- Date negotiation workflow (max 3 rounds)
- Automatic task creation on failure
- Provider ineligibility tracking

---

### Step 6: Go Execution Check ⭐ CRITICAL
**What Happens**:
**On eve of service execution**, system monitors:
- Customer payment status (from sales system)
- Product delivery status (from supply chain)

**If NOT OK**:
- Alert + Task Management created
- "Go Execution NOK" status with reason
- **System blocks crew check-in**

**Operator Can**:
- Reschedule (wait for payment/product)
- Manual authorization (derogation) to allow start

**Current State**: ❌ Not modeled
**Required**:
```typescript
// ServiceOrder needs:
paymentStatus         String?  // From sales system
productDeliveryStatus String?  // From supply chain
goExecStatus          String?  // OK, NOK (for status tags)
goExecBlockReason     String?  // Why blocked
goExecOverride        Boolean  // Operator derogation
goExecOverrideBy      String?  // Which operator
goExecOverrideAt      DateTime?

// Execution needs:
blockedReason         String?  // Can't check in if Go Exec NOK
canCheckIn            Boolean  @default(false)
```

**Integration**:
- Kafka consumer from sales system (payment status)
- Kafka consumer from supply chain (delivery status)
- Scheduled job (check on eve of execution date)

---

### Step 7-9: Execution (Check-In → Work → Check-Out)
**What Happens**:
- Check-in (requires Go Exec OK)
- Upload pictures, notes, audio
- Checklist tracking
- Check-out (complete or incomplete)
- If incomplete → Alert + Task for operator

**Current State**: ✅ Execution model exists
**Missing**:
- `canCheckIn` validation
- `checklistItems` (JSON)
- `checklistCompletion` (percentage)
- `completionStatus` (COMPLETE, INCOMPLETE)
- `incompleteReason`
- Audio upload support

---

### Step 10: WCF (Work Closing Form) & Payment ⭐ CRITICAL
**What Happens**:

**WCF sent to customer** (email + SMS):

**Customer Signs - No Reserves**:
→ Service fully accepted
→ Status: Provider payment authorized
→ Pro forma invoice sent to provider

**Customer Signs - With Reserves OR Doesn't Sign**:
→ Alert + Task to operator
→ Potentially: Rework SO created

**Provider Invoice Flow**:
→ Provider signs or contests invoice
→ If signed → Kafka message triggers payment (external system)
→ Payment system feedback → SO status updated to "Provider Paid"

**Current State**: ❌ Not modeled
**Required**:
```typescript
model WorkClosingForm {
  id             String    @id
  serviceOrderId String    @unique
  sentAt         DateTime
  signedAt       DateTime?
  signatureType  String?   // DIGITAL, MANUAL
  hasReserves    Boolean   @default(false)
  reserves       String?   @db.Text
  status         String    // PENDING, SIGNED_OK, SIGNED_RESERVES, REFUSED
  pdfUrl         String?

  serviceOrder   ServiceOrder @relation(...)
}

model ProviderInvoice {
  id             String    @id
  serviceOrderId String
  providerId     String
  amount         Decimal
  currency       String
  status         String    // PENDING, SIGNED, CONTESTED, PAID
  proFormaUrl    String?
  sentAt         DateTime
  signedAt       DateTime?
  paidAt         DateTime?
  paymentRef     String?   // From external payment system

  serviceOrder   ServiceOrder @relation(...)
  provider       Provider @relation(...)
}

// ServiceOrder needs:
wcfId                String?
wcfStatus            String?  // OK, NOK (for status tags)
providerPaymentStatus String? // PENDING, AUTHORIZED, PAID
providerInvoiceId    String?
```

---

## 🆕 New Requirements

### 1. Pilote du Chantier (Project Ownership) ⭐
**What**: Each project has ONE responsible operator

**Assignment Modes**:
- **Automatic**: Workload balancing (sum of project hours across all assigned projects)
- **Manual**: Operator assigns on project creation
- **Country-specific rule** determines mode

**Operator Can**:
- Take ownership of projects (single or batch after filter)
- Only receive notifications for THEIR projects

**Schema Impact**:
```typescript
model Project {
  responsibleOperatorId String?
  assignmentMode        String  // AUTO or MANUAL
  totalEstimatedHours   Float   // For workload balancing
}

// User (Operator) needs:
model User {
  // Add relation
  ownedProjects Project[] @relation("ProjectOwner")
}
```

**Business Logic**:
- Workload balancing algorithm (find operator with lowest total hours)
- Notification filtering (only send to project owner)
- Batch ownership transfer
- Ownership change audit trail

---

### 2. TV Potential (Sales Potential Assessment) ⭐
**What**: AI assessment of Technical Visit potential

**Applies To**: ServiceType = TECHNICAL_VISIT or QUOTATION

**Assessment Based On**:
- Salesman notes (NLP analysis)
- Customer context (existing projects, ongoing SOs)
- Link to high-value pre-estimation from sales system

**Default**: LOW
**Values**: LOW, MEDIUM, HIGH

**Schema Impact**:
```typescript
// ServiceOrder needs:
salesPotential           String?  // LOW, MEDIUM, HIGH
salesPotentialScore      Float?   // 0-100 (from AI model)
salesPotentialUpdatedAt  DateTime?
salesPreEstimationId     String?  // External ref
salesPreEstimationValue  Decimal? // Money value
salesmanNotes            String?  @db.Text // For NLP
```

**AI Model**:
- Input: salesman notes (text), customer history, pre-estimation value
- Output: LOW/MEDIUM/HIGH + confidence score
- Trigger: When SO created, when notes updated

---

### 3. Service Order Risk Assessment ⭐
**What**: AI assessment of execution risk

**Default**: LOW
**Values**: LOW, MEDIUM, HIGH, CRITICAL

**Risk Factors**:
- Recent claims/rework in same project
- Multiple reschedules on this SO
- Checked out incomplete
- Provider quality issues
- Payment delays

**Assessment Triggers**:
- **Periodic**: Daily batch for all started and not yet finished SOs
- **Next 2 days**: SOs starting soon
- **Event-triggered**: On status change, claim created, etc.

**Schema Impact**:
```typescript
// ServiceOrder needs:
riskLevel           String?   // LOW, MEDIUM, HIGH, CRITICAL
riskScore           Float?    // 0-100 (from AI model)
riskAssessedAt      DateTime?
riskFactors         Json?     // Array of {factor, weight, description}
riskAcknowledgedBy  String?   // Operator who acknowledged
riskAcknowledgedAt  DateTime?
```

**AI Model**:
- Input: SO history, project history, provider metrics, payment status
- Output: LOW/MEDIUM/HIGH/CRITICAL + risk factors breakdown
- Scheduled job: Daily at 00:00, check SOs for next 2 days + in-progress

---

### 4. Service Order Status Tags (Complex Logic)
**What**: Visual tags showing SO progress

**Three Tags** (ONLY ONE SHOWS AT A TIME):

**1. Contract (OK/NOK)** - Before assignment
- Shows: When SO created until provider assigned
- OK: Contract signed or skipped
- NOK: Contract not sent or not signed

**2. Go Exec (OK/NOK)** - After assigned, before execution
- Shows: When provider assigned until check-in
- OK: Payment OK + Product OK (or operator override)
- NOK: Payment NOK or Product NOK

**3. WCF (OK/NOK)** - After execution
- Shows: After check-out
- OK: WCF signed with no reserves
- NOK: WCF signed with reserves or not signed

**Schema Impact**:
```typescript
// ServiceOrder already has these:
contractStatus  String?  // OK, NOK
goExecStatus    String?  // OK, NOK
wcfStatus       String?  // OK, NOK

// UI Logic:
// Show tag based on SO status:
// - CREATED → ASSIGNED: Show Contract tag
// - ASSIGNED → IN_PROGRESS: Show Go Exec tag
// - COMPLETED+: Show WCF tag
```

---

### 5. Calendar Rules
**What**: Scheduling constraints

**Rules**:
- ❌ Remove Sunday from calendar (no service execution)
- ⚠️ Saturday: Mornings ONLY for service execution
- Provider expands to Crews (A/B/C) in calendar grid

**Schema Impact**:
- Calendar generation logic (exclude Sundays)
- Time slot validation (Saturday: 08:00-12:00 only)
- UI: Calendar grid shows Work Teams as rows

---

## 🗄️ Required Schema Updates

### New Models (6):
1. **Project** - Container for service orders ⭐ CRITICAL
2. **ProjectContact** - Multiple contacts per project
3. **Contract** - Contract lifecycle
4. **WorkClosingForm** - WCF lifecycle
5. **ProviderInvoice** - Invoice & payment
6. **DateNegotiation** - Provider-customer date negotiation
7. **TaskManagement** - Operator tasks
8. **Alert** - System alerts

### ServiceOrder Updates (17 new fields):
```prisma
model ServiceOrder {
  // Existing fields...

  // Project association ⭐ CRITICAL
  projectId             String?

  // Sales integration
  salesOrderId          String?  // External sales order ID

  // Sales Potential (AI)
  salesPotential        String?  // LOW, MEDIUM, HIGH
  salesPotentialScore   Float?
  salesPotentialUpdatedAt DateTime?
  salesPreEstimationId  String?
  salesPreEstimationValue Decimal?
  salesmanNotes         String?  @db.Text

  // Risk Assessment (AI)
  riskLevel             String?  // LOW, MEDIUM, HIGH, CRITICAL
  riskScore             Float?
  riskAssessedAt        DateTime?
  riskFactors           Json?
  riskAcknowledgedBy    String?
  riskAcknowledgedAt    DateTime?

  // Status Tags
  contractId            String?
  contractStatus        String?  // OK, NOK
  goExecStatus          String?  // OK, NOK
  goExecBlockReason     String?
  goExecOverride        Boolean  @default(false)
  goExecOverrideBy      String?
  goExecOverrideAt      DateTime?
  wcfId                 String?
  wcfStatus             String?  // OK, NOK

  // Go Execution checks
  paymentStatus         String?  // From sales system
  productDeliveryStatus String?  // From supply chain

  // Provider payment
  providerPaymentStatus String?  // PENDING, AUTHORIZED, PAID
  providerInvoiceId     String?

  // Relations
  project               Project? @relation(...)
  contract              Contract? @relation(...)
  wcf                   WorkClosingForm? @relation(...)
  providerInvoice       ProviderInvoice? @relation(...)
  tasks                 TaskManagement[]
  alerts                Alert[]
}
```

### Assignment Updates:
```prisma
model Assignment {
  // Existing fields...

  // Provider acceptance flow
  offerExpiresAt        DateTime?  // 4h timeout
  dateNegotiationRound  Int?       // Current round (max 3)
  originalDate          DateTime?  // To compare

  // Relations
  dateNegotiations      DateNegotiation[]
}
```

### Execution Updates:
```prisma
model Execution {
  // Existing fields...

  // Checklist
  checklistItems        Json?     // Array of checklist items
  checklistCompletion   Float?    // Percentage

  // Completion status
  completionStatus      String?   // COMPLETE, INCOMPLETE
  incompleteReason      String?   @db.Text

  // Blocking
  blockedReason         String?
  canCheckIn            Boolean   @default(false)

  // Audio support
  audioRecordings       Json?     // Array of audio URLs
}
```

### Provider Updates:
```prisma
model Provider {
  // Existing fields...

  // Scoring
  tier                  Int       @default(2)  // 1, 2, 3

  // Risk status
  riskStatus            String    @default("OK")  // OK, ON_WATCH, SUSPENDED
  riskReason            String?
  suspendedUntil        DateTime?

  // Certifications (or separate table)
  certifications        Json?     // Array of {code, name, expiresAt}

  // Relations
  invoices              ProviderInvoice[]
}
```

---

## 📊 Complexity Assessment

### Original Implementation Plan: ~15% complete
**Reality Check**: More like ~8% complete

**Why**:
- Missing PROJECT model entirely (foundational!)
- Missing 50% of ServiceOrder fields
- Missing 6 new models (Contract, WCF, Invoice, etc.)
- Missing complex workflows (date negotiation, Go Exec, WCF)
- Missing AI integrations (2 models: TV Potential, Risk Assessment)
- Missing Kafka integrations (3 systems: sales, supply chain, payment)

---

## 🎯 Revised Implementation Priority

### Phase 0: Schema Rebuild (1 week) ⭐ URGENT
**Priority**: P0 - Must complete before continuing

**Tasks**:
1. Create PROJECT model
2. Update ServiceOrder with all new fields
3. Create CONTRACT model
4. Create WCF model
5. Create DateNegotiation model
6. Create TaskManagement model
7. Create Alert model
8. Create ProviderInvoice model
9. Update Assignment model
10. Update Execution model
11. Update Provider model
12. Generate Prisma migrations
13. Update all services to use new models

**Estimated**: 40-60 hours

---

### Phase 1: Core Workflow (2-3 weeks)
1. **Project Auto-Association** (3 days)
   - Customer matching logic
   - Project creation automation
   - AI-powered SO linking

2. **Pilote du Chantier** (2 days)
   - Workload balancing algorithm
   - Auto-assignment logic
   - Ownership transfer

3. **Contract Workflow** (3 days)
   - Contract bundling
   - Template system
   - Signature workflows
   - Auto-send after 2h

4. **Provider Acceptance Flow** (4 days)
   - 4h timeout enforcement
   - Date negotiation (3 rounds)
   - Task creation on failure
   - Country-specific rules (ES/IT auto-accept)

5. **Go Execution Checks** (3 days)
   - Payment status integration
   - Product delivery integration
   - Eve-of-execution scheduler
   - Operator override (derogation)

6. **WCF Workflow** (3 days)
   - WCF generation
   - Signature capture
   - Reserve handling
   - Provider invoice generation

---

### Phase 2: AI & Integration (2 weeks)
1. **TV Potential Assessment** (4 days)
   - NLP model for salesman notes
   - Context analysis
   - Scoring algorithm

2. **Risk Assessment** (4 days)
   - Risk factor analysis
   - Daily batch job
   - Event-triggered assessment

3. **Kafka Integrations** (4 days)
   - Sales system consumer
   - Supply chain consumer
   - Payment system producer/consumer

---

### Phase 3: Assignment Transparency (1 week)
*As originally planned*

---

## 🚨 Impact on Demo

**Original Demo Plan**: 6 weeks
**Revised Demo Plan**: 10-12 weeks (with schema rebuild)

**Critical Path**:
1. Schema rebuild (1 week)
2. Project + Contract workflows (2 weeks)
3. Provider acceptance + Go Exec (1 week)
4. WCF workflow (1 week)
5. Assignment Transparency (1 week)
6. Frontend (2-3 weeks)
7. Polish (1 week)

---

## 💡 Recommendation

### Option A: Full Implementation (10-12 weeks)
Build everything as described in the detailed workflow.

**Pros**: Complete, impressive, production-ready
**Cons**: Long timeline, complex, requires AI models

### Option B: Simplified Demo (6-8 weeks) ⭐ RECOMMENDED
Focus on visual showcase, mock complex parts:

**Include**:
- ✅ Project model (critical for data integrity)
- ✅ Contract workflow (visual, important)
- ✅ Assignment Transparency (PRIMARY DIFFERENTIATOR)
- ✅ Basic Go Exec visualization
- ✅ WCF flow visualization
- ⚠️ Mock AI assessments (hardcoded HIGH/LOW)
- ⚠️ Mock Kafka integrations (seed data with statuses)

**Exclude/Simplify**:
- ❌ Real AI models (use hardcoded assessments in seed data)
- ❌ Real Kafka integration (use seed data)
- ❌ Complex date negotiation (show in UI but hardcode outcomes)
- ❌ 4h timeout enforcement (hardcode time-based status)

**Timeline**: 6-8 weeks
**Result**: Visually complete demo with mocked complex logic

### Option C: Assignment Transparency Only (Original Plan)
Stick to original 6-week plan, ignore new requirements.

**Pros**: Fast, focused on differentiator
**Cons**: Missing critical workflows, won't match real product

---

## 🎯 Next Steps

**Immediate (Today)**:
1. Review this gap analysis
2. Decide on approach (A, B, or C)
3. If B: Define which workflows to fully build vs. mock

**This Week**:
1. Update Prisma schema with required changes
2. Create migration plan
3. Update service contracts

**Next Week**:
1. Implement PROJECT model and logic
2. Build contract workflow
3. Update frontend plans

---

**This analysis changes everything. We need to decide the approach before continuing.**

---

**Document Version**: 1.0
**Created**: 2025-11-16
**Severity**: CRITICAL - Major scope change identified
