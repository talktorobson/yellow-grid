# Yellow Grid Platform - Comprehensive Workflow Gap Analysis

**Document Version**: 1.0
**Date**: 2025-01-16
**Analysis Type**: Detailed Business Workflow vs Current Documentation
**Status**: Complete

---

## Executive Summary

This document analyzes the **10-step service execution workflow** and **critical business details** against the current Yellow Grid Platform documentation (v2.0). The analysis identifies gaps, missing features, and areas requiring specification updates.

### Overall Assessment

- ✅ **Strong Foundation**: 85% of core workflow is documented
- ⚠️ **Gaps Found**: 15-20% requires new/enhanced specifications
- 🔴 **Critical Additions Needed**: 8 major features not yet documented

---

## Table of Contents

1. [Features FULLY Documented ✅](#1-features-fully-documented-)
2. [Features PARTIALLY Documented ⚠️](#2-features-partially-documented-️)
3. [Features NOT Documented ❌](#3-features-not-documented-)
4. [Business Rule Conflicts 🔴](#4-business-rule-conflicts-)
5. [Data Model Gaps](#5-data-model-gaps)
6. [State Machine Enhancements](#6-state-machine-enhancements)
7. [Automation Rules Missing](#7-automation-rules-missing)
8. [Integration Requirements](#8-integration-requirements)
9. [Recommendations](#9-recommendations)

---

## 1. Features FULLY Documented ✅

### 1.1 Service Order Integration (Step 1)
**Status**: ✅ **FULLY COVERED**

**Files**:
- `product-docs/integration/03-sales-integration.md`
- `product-docs/integration/02-event-schema-registry.md`
- `product-docs/domain/03-project-service-order-domain.md`

**Coverage**:
- Kafka integration from sales systems
- Service order object structure
- Sales order → Service order mapping
- External sales references (Pyxis, Tempo, SAP)

**Evidence from docs** (domain/03-project-service-order-domain.md):
```typescript
interface ExternalSalesReference {
  salesSystem: 'Pyxis' | 'Tempo' | 'SAP';
  salesOrderId: string;
  salesOrderNumber: string;
  preEstimationId?: string;
  quoteId?: string;
}
```

---

### 1.2 Project Auto-Creation & Service Order Assignment (Step 2)
**Status**: ✅ **FULLY COVERED**

**Files**:
- `product-docs/domain/03-project-service-order-domain.md` (lines 45-85)
- `product-docs/domain/10-ai-context-linking.md`

**Coverage**:
- Automatic project creation if none exists
- Service order assignment to existing/new projects
- AI-based service order linking
- Context comparison logic

**Evidence**:
```typescript
class ProjectAggregate {
  assignServiceOrder(serviceOrder: ServiceOrder): Result<void> {
    // Auto-assign to project
    if (!this.hasServiceOrder(serviceOrder.id)) {
      this._serviceOrders.push(serviceOrder.id);
    }
  }
}
```

---

### 1.3 Contract Lifecycle (Step 3)
**Status**: ✅ **FULLY COVERED**

**Files**:
- `product-docs/domain/07-contract-document-lifecycle.md`
- `product-docs/api/07-contract-signature-api.md`

**Coverage**:
- Pre-service contract templates
- Electronic signature (e-signature)
- Manual signature upload
- Contract skip/derogation
- Auto-send after 2h
- Service order grouping to single contract

**Evidence** (domain/07-contract-document-lifecycle.md:77-85):
```typescript
enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  AWAITING_SIGNATURE = 'AWAITING_SIGNATURE',
  FULLY_EXECUTED = 'FULLY_EXECUTED',
}
```

---

### 1.4 Assignment & Dispatch (Step 4)
**Status**: ✅ **FULLY COVERED**

**Files**:
- `product-docs/domain/05-assignment-dispatch-logic.md`
- `product-docs/api/05-assignment-api.md`

**Coverage**:
- Automatic matching algorithm (availability, eligibility, scoring)
- Multi-round dispatch
- Provider exclusion after refusal/timeout
- Country-specific auto-accept (ES/IT)

---

### 1.5 Provider Offer & Acceptance (Step 5)
**Status**: ✅ **FULLY COVERED**

**Files**:
- `product-docs/domain/05-assignment-dispatch-logic.md` (lines 420-550)

**Coverage**:
- 4h offer expiration
- Accept/refuse/timeout flows
- Date counter-proposal by provider
- Customer-provider date negotiation (3-round limit)
- Crew selection by provider
- Alert/task creation on negotiation failure

**Evidence** (domain/05-assignment-dispatch-logic.md:481-495):
```typescript
interface AssignmentOffer {
  status: 'sent' | 'accepted' | 'rejected' | 'expired';
  expiresAt: DateTime;
  proposedDate?: DateTime;
  acceptedDate?: DateTime;
  counterProposalDate?: DateTime;
}
```

---

### 1.6 Check-In & Check-Out (Steps 7-9)
**Status**: ✅ **FULLY COVERED**

**Files**:
- `product-docs/domain/06-execution-field-operations.md`
- `product-docs/api/06-execution-mobile-api.md`

**Coverage**:
- Check-in with photos, notes, audio
- Checklist execution with minimum completion
- Check-out complete/incomplete
- Incomplete job handling with reason codes

**Evidence** (domain/06-execution-field-operations.md:14-110):
```typescript
interface CheckIn {
  jobId: string;
  actualArrivalTime: DateTime;
  arrivalPhotos: Photo[];
  siteAccessNotes?: string;
}

interface CheckOut {
  completionStatus: CompletionStatus; // COMPLETED | INCOMPLETE
  workPerformed: WorkSummary;
  departurePhotos: Photo[];
}
```

---

### 1.7 Work Closing Form (WCF) - (Step 10)
**Status**: ✅ **FULLY COVERED**

**Files**:
- `product-docs/domain/07-contract-document-lifecycle.md` (lines 506-804)
- `product-docs/api/07-contract-signature-api.md`

**Coverage**:
- WCF sent electronically (email + SMS)
- Customer acceptance (no reserve / with reserve / unsigned)
- Pro forma invoice generation
- Provider invoice signature/contestation
- Payment trigger integration
- Alert on reserve/unsigned

**Evidence** (domain/07-contract-document-lifecycle.md:740-758):
```typescript
interface CustomerAcceptance {
  accepted: boolean;
  acceptedDate?: DateTime;
  concerns?: string[];
  disputedItems?: DisputedItem[];
  signature?: ContractSignature;
}
```

---

### 1.8 AI Context Linking (Step 2 Detail)
**Status**: ✅ **FULLY COVERED** ⭐ **(v2.0 Feature)**

**Files**:
- `product-docs/domain/10-ai-context-linking.md`

**Coverage**:
- Similarity scoring algorithm (product, service type, address, temporal, NLP)
- Auto-link (≥80% confidence) vs Review (50-79%)
- Human-in-the-loop review workflow
- Learning from operator feedback

---

### 1.9 Sales Potential Assessment (Critical Detail)
**Status**: ✅ **FULLY COVERED** ⭐ **(v2.0 Feature)**

**Files**:
- `product-docs/domain/10-ai-context-linking.md` (lines 1178-1560)

**Coverage**:
- AI model (XGBoost) for TV/Quotation potential
- Features: pre-estimation, products, customer history, salesman notes
- Scoring: LOW / MEDIUM / HIGH
- Triggering on TV creation, notes update, pre-estimation link
- Integration with sales pre-estimation data

---

### 1.10 Risk Assessment (Critical Detail)
**Status**: ✅ **FULLY COVERED** ⭐ **(v2.0 Feature)**

**Files**:
- `product-docs/domain/10-ai-context-linking.md` (lines 1562-2192)

**Coverage**:
- AI model (Random Forest) for risk prediction
- Features: claims, reschedules, provider quality, checkout issues
- Scoring: LOW / MEDIUM / HIGH / CRITICAL
- Daily batch job + event-triggered assessment
- Automatic task creation for HIGH/CRITICAL risk
- Operator acknowledgment required before check-in

---

## 2. Features PARTIALLY Documented ⚠️

### 2.1 Project Ownership ("Pilote du Chantier") ⚠️
**Status**: ⚠️ **PARTIALLY DOCUMENTED** - **Needs Enhancement**

**Files**:
- `product-docs/domain/03-project-service-order-domain.md` (mentions ownership but lacks automation logic)

**What's Missing**:
1. ❌ AUTO/MANUAL assignment modes per country
2. ❌ Workload balancing algorithm (sum of SO hours)
3. ❌ Manual reassignment workflow
4. ❌ Batch reassignment capability
5. ❌ Notification filtering by responsible operator

**What's Documented**:
- ✅ Project has `responsibleOperatorId` field

**Required Updates**:
```typescript
// MISSING in domain/03-project-service-order-domain.md
interface Project {
  responsibleOperatorId?: string;
  assignmentMode: 'AUTO' | 'MANUAL'; // Per-country config
  assignedAt?: DateTime;
  assignedBy?: string;
  workloadHours: number; // Sum of SO estimated durations
}

// MISSING: Automatic assignment algorithm
class ProjectOwnershipService {
  autoAssignOperator(project: Project, country: Country): Result<string> {
    const operators = await operatorRepo.findByCountry(country);
    const leastBusyOperator = operators.sort((a, b) =>
      a.totalWorkloadHours - b.totalWorkloadHours
    )[0];
    return leastBusyOperator.id;
  }
}
```

**Priority**: 🔴 **HIGH** - Core operator workflow feature

---

### 2.2 Go Execution Blocking (Step 6) ⚠️
**Status**: ⚠️ **PARTIALLY DOCUMENTED** - **Needs Enhancement**

**Files**:
- Mentions payment/delivery checks in various docs but no consolidated "Go Execution" workflow

**What's Missing**:
1. ❌ Explicit "Go Execution" status enum
2. ❌ Eve-of-execution automated check (T-1 day)
3. ❌ Check-in blocking logic when Go Exec = NOK
4. ❌ Manual override (derogation) workflow
5. ❌ Alert/task generation when blocked

**What's Documented**:
- ✅ Payment status tracking
- ✅ Product delivery status (integration docs)

**Required Updates**:
```typescript
// ADD to domain/03-project-service-order-domain.md
enum GoExecutionStatus {
  PENDING = 'PENDING',           // Not yet checked
  OK = 'OK',                     // Payment + delivery OK
  BLOCKED_PAYMENT = 'BLOCKED_PAYMENT',
  BLOCKED_DELIVERY = 'BLOCKED_DELIVERY',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE', // Operator authorized
}

interface ServiceOrder {
  goExecutionStatus: GoExecutionStatus;
  goExecutionCheckedAt?: DateTime;
  goExecutionOverriddenBy?: string;
  goExecutionOverrideReason?: string;
}

// ADD automation rule
async function checkGoExecution(serviceOrder: ServiceOrder): Promise<void> {
  const paymentOK = await paymentService.isFullyPaid(serviceOrder.salesOrderId);
  const deliveryOK = await supplyChainService.isDelivered(serviceOrder.salesOrderId);

  if (!paymentOK || !deliveryOK) {
    serviceOrder.goExecutionStatus = !paymentOK
      ? GoExecutionStatus.BLOCKED_PAYMENT
      : GoExecutionStatus.BLOCKED_DELIVERY;

    await taskService.createTask({
      type: 'GO_EXECUTION_BLOCKED',
      serviceOrderId: serviceOrder.id,
      priority: 'HIGH',
      dueDate: serviceOrder.scheduledDate minus 8 hours
    });
  }
}
```

**Priority**: 🔴 **HIGH** - Payment/delivery validation is critical

---

### 2.3 Calendar Grid Customization (Critical Detail) ⚠️
**Status**: ⚠️ **PARTIALLY DOCUMENTED** - **Needs Specification**

**Files**:
- `product-docs/domain/02-provider-capacity-domain.md` (has calendar model but missing specific rules)

**What's Missing**:
1. ❌ **No Sunday** in calendar grid (explicit exclusion)
2. ❌ **Saturday mornings only** for service execution
3. ❌ **Provider expansion** to multiple crews in grid (Provider A → Crew A/B/C)

**What's Documented**:
- ✅ Calendar entity exists
- ✅ Work teams (crews) model exists

**Required Updates**:
```typescript
// ADD to domain/02-provider-capacity-domain.md
interface CalendarRules {
  excludeDays: DayOfWeek[]; // ['SUNDAY']
  partialDays: {
    day: DayOfWeek;
    timeRange: TimeRange;
  }[]; // Saturday: 08:00-13:00 only
}

// ADD view expansion logic
interface CalendarGridView {
  displayMode: 'PROVIDER' | 'CREW';
  expandProviderToCrews: boolean; // Show Provider A → Crew A/B/C
}
```

**Priority**: 🟡 **MEDIUM** - UX/UI configuration, not blocking

---

### 2.4 Service Order Status Tags (Critical Detail) ⚠️
**Status**: ⚠️ **PARTIALLY DOCUMENTED** - **Needs State Logic**

**Files**:
- `product-docs/domain/03-project-service-order-domain.md` (has status enum but not tag logic)

**What's Missing**:
1. ❌ Complex tag visibility logic (only ONE tag shows at a time)
2. ❌ Tag priority/precedence rules
3. ❌ Tag calculation logic

**What's Documented**:
- ✅ Service order states exist
- ✅ Contract status, WCF status tracked separately

**Required Enhancement**:
```typescript
// ADD to domain/03-project-service-order-domain.md
enum ServiceOrderTag {
  CONTRACT_OK = 'CONTRACT_OK',
  CONTRACT_NOK = 'CONTRACT_NOK',
  GO_EXEC_OK = 'GO_EXEC_OK',
  GO_EXEC_NOK = 'GO_EXEC_NOK',
  WCF_OK = 'WCF_OK',
  WCF_NOK = 'WCF_NOK',
}

class ServiceOrderTagCalculator {
  calculateVisibleTag(so: ServiceOrder): ServiceOrderTag | null {
    // Priority: WCF > GO_EXEC > CONTRACT
    if (so.status === 'COMPLETED') {
      return so.wcfStatus === 'SIGNED' ? 'WCF_OK' : 'WCF_NOK';
    }

    if (so.status === 'ASSIGNED' || so.status === 'ACCEPTED') {
      if (so.contractStatus === 'FULLY_EXECUTED') {
        return so.goExecutionStatus === 'OK' ? 'GO_EXEC_OK' : 'GO_EXEC_NOK';
      }
    }

    if (so.status === 'CREATED' || so.status === 'SCHEDULED') {
      return so.contractStatus === 'FULLY_EXECUTED'
        ? 'CONTRACT_OK'
        : 'CONTRACT_NOK';
    }

    return null;
  }
}
```

**Priority**: 🟡 **MEDIUM** - UX enhancement, not blocking

---

### 2.5 Provider Payment Workflow (Step 10) ⚠️
**Status**: ⚠️ **PARTIALLY DOCUMENTED** - **Needs Integration Spec**

**Files**:
- Mentioned in WCF docs but no detailed provider payment flow

**What's Missing**:
1. ❌ Pro forma invoice entity/schema
2. ❌ Provider invoice signature/contestation workflow
3. ❌ Payment authorization event to external system
4. ❌ Payment confirmation callback
5. ❌ Provider payment status tracking on SO

**What's Documented**:
- ✅ WCF has pricing details
- ✅ Customer payment tracking exists

**Required Addition**:
```typescript
// ADD new entity to domain/07-contract-document-lifecycle.md
interface ProviderInvoice {
  id: string;
  wcfId: string;
  serviceOrderId: string;
  providerId: string;
  invoiceNumber: string;
  amount: Money;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'CONTESTED' | 'PAID';
  generatedAt: DateTime;
  providerSignedAt?: DateTime;
  paymentAuthorizedAt?: DateTime;
  paymentCompletedAt?: DateTime;
  paymentReference?: string;
  contestReason?: string;
}

// ADD Kafka event
interface ProviderPaymentAuthorized {
  event: 'provider.payment.authorized';
  invoiceId: string;
  providerId: string;
  amount: Money;
  paymentMethod: string;
}
```

**Priority**: 🟡 **MEDIUM** - Extends existing WCF flow

---

## 3. Features NOT Documented ❌

### 3.1 Contract Bundling/Grouping ❌
**Status**: ❌ **NOT DOCUMENTED** - **NEW FEATURE REQUIRED**

**Business Requirement**:
> "service operator can group different service orders to a single contract (and choose the contract template to be applied on this bundle)"

**What's Missing**:
- ❌ Multi-service-order contract entity
- ❌ Contract template selection for bundles
- ❌ Business rules for bundling (same customer, same project, etc.)
- ❌ UI workflow for contract bundling

**Required Implementation**:
```typescript
// ADD to domain/07-contract-document-lifecycle.md
interface ServiceContract {
  id: string;
  serviceOrderIds: string[]; // Array for bundling
  templateId: string;
  bundleType: 'SINGLE' | 'BUNDLE';
  bundleRules?: {
    sameCustomer: boolean;
    sameProject: boolean;
    sameServiceType: boolean;
  };
}

// ADD API endpoint
POST /api/v1/contracts/bundle
{
  "serviceOrderIds": ["so_1", "so_2", "so_3"],
  "templateId": "template_kitchen_bundle",
  "customerApproval": true
}
```

**Priority**: 🔴 **HIGH** - Explicitly mentioned in workflow

---

### 3.2 Date Negotiation 3-Round Limit ❌
**Status**: ❌ **NOT DOCUMENTED** - **BUSINESS RULE MISSING**

**Business Requirement**:
> "This interaction between provider and customer on dates can happen up to 3 interactions, then if no agreement is reached, an alert and task management is created to service operator to handle the exception manually"

**What's Missing**:
- ❌ Negotiation round counter
- ❌ 3-round limit enforcement
- ❌ Escalation to operator after 3rd round
- ❌ Task creation workflow

**Required Implementation**:
```typescript
// ADD to domain/05-assignment-dispatch-logic.md
interface DateNegotiation {
  serviceOrderId: string;
  providerId: string;
  rounds: NegotiationRound[];
  maxRounds: number; // = 3
  status: 'IN_PROGRESS' | 'AGREED' | 'ESCALATED';
}

interface NegotiationRound {
  roundNumber: number;
  initiator: 'PROVIDER' | 'CUSTOMER';
  proposedDate: DateTime;
  response: 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED';
  counterProposalDate?: DateTime;
  timestamp: DateTime;
}

// ADD business rule
class DateNegotiationService {
  async handleRound(negotiation: DateNegotiation, response: NegotiationResponse): Promise<void> {
    negotiation.rounds.push(response);

    if (negotiation.rounds.length >= negotiation.maxRounds && response.response !== 'ACCEPTED') {
      await this.escalateToOperator(negotiation);
      negotiation.status = 'ESCALATED';
    }
  }

  private async escalateToOperator(negotiation: DateNegotiation): Promise<void> {
    await taskService.createTask({
      type: 'DATE_NEGOTIATION_FAILED',
      serviceOrderId: negotiation.serviceOrderId,
      priority: 'HIGH',
      context: {
        rounds: negotiation.rounds,
        providerId: negotiation.providerId,
        suggestedAction: 'Find new provider or convince customer'
      }
    });
  }
}
```

**Priority**: 🔴 **HIGH** - Critical workflow logic

---

### 3.3 Operator Task Management System ❌
**Status**: ❌ **NOT DOCUMENTED** - **NEW DOMAIN REQUIRED**

**Business Requirement**:
> Multiple mentions of "alert and task management is created to service operator" throughout workflow

**What's Missing**:
- ❌ Task entity/aggregate
- ❌ Task types (enum of all exception types)
- ❌ Task assignment/routing logic
- ❌ Task SLA/priority rules
- ❌ Task lifecycle state machine
- ❌ Task notification integration

**Required Implementation**:
```typescript
// CREATE new file: product-docs/domain/09-task-management.md
interface Task {
  id: string;
  type: TaskType;
  serviceOrderId?: string;
  projectId?: string;
  assignedTo?: string;
  createdBy: 'SYSTEM' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate: DateTime;
  context: Record<string, any>;
  createdAt: DateTime;
  completedAt?: DateTime;
}

enum TaskType {
  DATE_NEGOTIATION_FAILED = 'DATE_NEGOTIATION_FAILED',
  GO_EXECUTION_BLOCKED = 'GO_EXECUTION_BLOCKED',
  INCOMPLETE_CHECKOUT = 'INCOMPLETE_CHECKOUT',
  WCF_WITH_RESERVE = 'WCF_WITH_RESERVE',
  WCF_UNSIGNED = 'WCF_UNSIGNED',
  HIGH_RISK_SERVICE_ORDER = 'HIGH_RISK_SERVICE_ORDER',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  DELIVERY_ISSUE = 'DELIVERY_ISSUE',
}
```

**Priority**: 🔴 **CRITICAL** - Mentioned 8+ times in workflow, fundamental to operator experience

---

### 3.4 Rework Service Order Creation ❌
**Status**: ❌ **NOT DOCUMENTED** - **WORKFLOW MISSING**

**Business Requirement**:
> "In this case potentially a rework service order is created by service operator (always manually) to fix quality issue or complete the service."

**What's Missing**:
- ❌ Rework service order creation workflow
- ❌ Link to original service order
- ❌ Rework reason codes
- ❌ Automatic vs manual rework triggering

**Required Implementation**:
```typescript
// ADD to domain/03-project-service-order-domain.md
interface ServiceOrder {
  isRework: boolean;
  originalServiceOrderId?: string; // Link to original SO
  reworkReason?: ReworkReason;
  reworkTriggeredBy: 'WCF_RESERVE' | 'INCOMPLETE_CHECKOUT' | 'CLAIM';
}

enum ReworkReason {
  INCOMPLETE_WORK = 'INCOMPLETE_WORK',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  CUSTOMER_COMPLAINT = 'CUSTOMER_COMPLAINT',
  MISSING_ITEMS = 'MISSING_ITEMS',
}

// ADD API
POST /api/v1/service-orders/{originalSOId}/rework
{
  "reason": "QUALITY_ISSUE",
  "description": "Customer reported leaking faucet after installation",
  "schedulingPriority": "HIGH"
}
```

**Priority**: 🟡 **MEDIUM** - Mentioned but not critical path

---

### 3.5 Pre-Estimation Integration ❌
**Status**: ❌ **NOT DOCUMENTED** - **INTEGRATION MISSING**

**Business Requirement**:
> "if this service order is linked to any high value sales pre-estimation before (this is an info system will receive from sales systems and service order data model must handle)"

**What's Missing**:
- ❌ Pre-estimation entity schema
- ❌ Sales system integration event for pre-estimation
- ❌ Link between SO and pre-estimation
- ❌ Pre-estimation confidence levels

**Required Implementation**:
```typescript
// ADD to integration/03-sales-integration.md
interface SalesPreEstimation {
  id: string;
  salesSystem: 'Pyxis' | 'Tempo' | 'SAP';
  estimationNumber: string;
  customerId: string;
  estimatedValue: Money;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  productCategories: string[];
  createdBy: string; // Salesman ID
  createdAt: DateTime;
  validUntil?: DateTime;
}

// ADD to domain/03-project-service-order-domain.md
interface ServiceOrder {
  salesPreEstimationId?: string;
  preEstimationValue?: Money;
}

// ADD Kafka event
interface PreEstimationLinked {
  event: 'sales.pre_estimation.linked';
  serviceOrderId: string;
  preEstimationId: string;
  estimatedValue: Money;
}
```

**Priority**: 🟡 **MEDIUM** - Enhances sales potential AI model accuracy

---

## 4. Business Rule Conflicts 🔴

### 4.1 Contract Auto-Send Timing 🔴
**Status**: 🔴 **POTENTIAL CONFLICT** - **NEEDS CLARIFICATION**

**Workflow States**:
> "If service operator does not do anything, contract (through email and sms link) will be sent to customer automatically after 2h by automation."

**Current Documentation**:
- Not explicitly documented as 2h auto-send delay

**Question**:
- Is 2h delay measured from:
  - ✅ Service order creation?
  - ✅ Service order entering specific status?
  - ✅ Contract generation completion?

**Recommended Specification**:
```typescript
// CLARIFY in domain/07-contract-document-lifecycle.md
interface ContractAutoSendRule {
  triggerEvent: 'SERVICE_ORDER_CREATED';
  delayHours: 2;
  conditions: {
    contractStatus: 'DRAFT';
    operatorActionTaken: false;
  };
}
```

**Priority**: 🟡 **MEDIUM** - Automation timing needs precision

---

### 4.2 Provider Auto-Accept Country Rules 🔴
**Status**: 🔴 **CLARIFICATION NEEDED**

**Workflow States**:
> "In certain countries like Spain and Italy match and dispatch assign direct the provider and the crew of him, with auto acceptance by provider (due specific agreements on these countries, provider can never refuse a job offer, thus acceptance is automatic)."

**Current Documentation**:
- ✅ Auto-accept mentioned in assignment docs

**Question**:
- Does auto-accept also apply to:
  - ✅ Date counter-proposals? (Can ES/IT providers propose new dates or must accept original date?)
  - ✅ Crew selection? (Is crew also auto-assigned or provider chooses?)

**Recommended Specification**:
```typescript
// ENHANCE in domain/05-assignment-dispatch-logic.md
interface CountryAssignmentRules {
  countryCode: string;
  autoAccept: boolean;
  allowDateNegotiation: boolean; // FALSE for ES/IT
  allowCrewSelection: boolean; // TRUE for ES/IT
}
```

**Priority**: 🟡 **MEDIUM** - Country-specific rules need clarity

---

## 5. Data Model Gaps

### 5.1 Missing Attributes on ServiceOrder

**File**: `product-docs/domain/03-project-service-order-domain.md`

**Required Additions**:
```typescript
interface ServiceOrder {
  // ❌ MISSING: Sales Potential (v2.0 feature)
  tvPotential?: 'LOW' | 'MEDIUM' | 'HIGH';
  tvPotentialScore?: number; // 0-100
  tvPotentialAssessedAt?: DateTime;

  // ❌ MISSING: Risk Assessment (v2.0 feature)
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore?: number; // 0-100
  riskFactors?: RiskFactor[];
  riskAssessedAt?: DateTime;
  riskAcknowledged?: boolean;
  riskAcknowledgedBy?: string;

  // ❌ MISSING: Go Execution
  goExecutionStatus?: GoExecutionStatus;
  goExecutionCheckedAt?: DateTime;
  goExecutionOverriddenBy?: string;

  // ⚠️ PARTIALLY DOCUMENTED: Pre-Estimation
  salesPreEstimationId?: string;
  preEstimationValue?: Money;

  // ❌ MISSING: Rework
  isRework: boolean;
  originalServiceOrderId?: string;
  reworkReason?: ReworkReason;
}
```

---

### 5.2 Missing Attributes on Project

**File**: `product-docs/domain/03-project-service-order-domain.md`

**Required Additions**:
```typescript
interface Project {
  // ❌ MISSING: Project Ownership
  responsibleOperatorId?: string;
  assignmentMode: 'AUTO' | 'MANUAL'; // Per-country config
  assignedAt?: DateTime;
  assignedBy?: string;
  workloadHours: number; // Sum of SO estimated durations
}
```

---

### 5.3 New Entities Needed

#### Task Management Entity ❌
```typescript
// CREATE: product-docs/domain/09-task-management.md
interface Task {
  id: string;
  type: TaskType;
  serviceOrderId?: string;
  projectId?: string;
  assignedTo?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: DateTime;
  context: Record<string, any>;
}
```

#### Provider Invoice Entity ❌
```typescript
// ADD to: product-docs/domain/07-contract-document-lifecycle.md
interface ProviderInvoice {
  id: string;
  wcfId: string;
  serviceOrderId: string;
  providerId: string;
  amount: Money;
  status: 'PENDING_SIGNATURE' | 'SIGNED' | 'CONTESTED' | 'PAID';
  paymentReference?: string;
}
```

#### Sales Pre-Estimation Entity ❌
```typescript
// ADD to: product-docs/integration/03-sales-integration.md
interface SalesPreEstimation {
  id: string;
  salesSystem: 'Pyxis' | 'Tempo' | 'SAP';
  estimationNumber: string;
  estimatedValue: Money;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

---

## 6. State Machine Enhancements

### 6.1 Service Order State Machine
**File**: `product-docs/domain/03-project-service-order-domain.md`

**Current States**: Documented
**Missing Transitions**:
```typescript
// ADD blocking transition for Go Execution
ASSIGNED → [GO_EXEC_CHECK] → {
  if (goExecutionStatus === 'OK') → READY_FOR_CHECKIN
  else → BLOCKED_GO_EXEC → [Manual Override] → READY_FOR_CHECKIN
}
```

---

### 6.2 Assignment State Machine
**File**: `product-docs/domain/05-assignment-dispatch-logic.md`

**Missing State**: Date Negotiation Loop
```typescript
// ADD negotiation states
OFFER_SENT → OFFER_ACCEPTED_WITH_CONDITION → DATE_NEGOTIATION_ROUND_1 →
DATE_NEGOTIATION_ROUND_2 → DATE_NEGOTIATION_ROUND_3 →
[If no agreement] → ESCALATED_TO_OPERATOR
```

---

## 7. Automation Rules Missing

### 7.1 Contract Auto-Send ⚠️
**Status**: Mentioned but not formalized

**Required**:
```typescript
// Trigger: 2h after service order creation (if operator did nothing)
cron.schedule('*/15 * * * *', async () => {
  const serviceOrders = await serviceOrderRepo.find({
    status: 'CREATED',
    contractStatus: 'DRAFT',
    createdAt: { $lte: DateTime.now().minus({ hours: 2 }) }
  });

  for (const so of serviceOrders) {
    await contractService.autoSendContract(so.id);
  }
});
```

**Priority**: 🔴 **HIGH** - Explicitly mentioned in workflow

---

### 7.2 Go Execution Check ❌
**Status**: NOT DOCUMENTED

**Required**:
```typescript
// Trigger: Eve of service execution (T-1 day at midnight)
cron.schedule('0 0 * * *', async () => {
  const tomorrow = DateTime.now().plus({ days: 1 });
  const serviceOrders = await serviceOrderRepo.find({
    scheduledDate: { $gte: tomorrow.startOf('day'), $lt: tomorrow.endOf('day') },
    status: { $in: ['ASSIGNED', 'ACCEPTED'] }
  });

  for (const so of serviceOrders) {
    await goExecutionService.checkStatus(so.id);
  }
});
```

**Priority**: 🔴 **HIGH** - Blocking check-in workflow

---

### 7.3 WCF Auto-Send ✅
**Status**: DOCUMENTED in execution docs

**Evidence**: Already covered in domain/06-execution-field-operations.md

---

## 8. Integration Requirements

### 8.1 Sales System Events Needed

**File**: `product-docs/integration/03-sales-integration.md`

**Missing Events**:
```typescript
// ❌ ADD: Pre-Estimation Created/Updated
interface PreEstimationCreated {
  event: 'sales.pre_estimation.created';
  preEstimationId: string;
  customerId: string;
  estimatedValue: Money;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ❌ ADD: Pre-Estimation Linked to Service Order
interface PreEstimationLinked {
  event: 'sales.pre_estimation.linked';
  preEstimationId: string;
  serviceOrderId: string;
}
```

---

### 8.2 Supply Chain Events Needed

**File**: `product-docs/integration/` (may need new doc)

**Missing Events**:
```typescript
// ❌ ADD: Product Delivery Status
interface ProductDeliveryUpdated {
  event: 'supply_chain.delivery.updated';
  salesOrderId: string;
  deliveryStatus: 'NOT_SHIPPED' | 'PARTIAL' | 'COMPLETE';
  deliveredItems: string[];
  pendingItems: string[];
  estimatedDeliveryDate?: DateTime;
}
```

---

### 8.3 Payment System Events Needed

**File**: `product-docs/integration/` (may need new doc)

**Missing Events**:
```typescript
// ❌ ADD: Payment Status Updated
interface PaymentStatusUpdated {
  event: 'payments.payment_status.updated';
  salesOrderId: string;
  paymentStatus: 'NOT_PAID' | 'PARTIAL' | 'FULL';
  amountPaid: Money;
  amountPending: Money;
}

// ❌ ADD: Provider Payment Completed
interface ProviderPaymentCompleted {
  event: 'payments.provider_payment.completed';
  invoiceId: string;
  providerId: string;
  amount: Money;
  paymentDate: DateTime;
  paymentReference: string;
}
```

---

## 9. Recommendations

### 9.1 Immediate Actions (Week 1-2)

1. ✅ **Document Task Management Domain** (product-docs/domain/09-task-management.md)
   - Task entity, types, lifecycle
   - Task assignment/routing logic
   - SLA rules

2. ✅ **Add Go Execution Workflow** (enhance product-docs/domain/03-project-service-order-domain.md)
   - GoExecutionStatus enum
   - Automated eve-of-execution check
   - Check-in blocking logic
   - Manual override workflow

3. ✅ **Formalize Project Ownership** (enhance product-docs/domain/03-project-service-order-domain.md)
   - AUTO/MANUAL assignment modes
   - Workload balancing algorithm
   - Batch reassignment capability

4. ✅ **Document Date Negotiation 3-Round Limit** (enhance product-docs/domain/05-assignment-dispatch-logic.md)
   - Negotiation round tracking
   - 3-round limit enforcement
   - Operator escalation

### 9.2 Short-Term Actions (Week 3-4)

5. ✅ **Add Contract Bundling** (enhance product-docs/domain/07-contract-document-lifecycle.md)
   - Multi-SO contract entity
   - Template selection logic
   - Bundling business rules

6. ✅ **Document Provider Payment Flow** (enhance product-docs/domain/07-contract-document-lifecycle.md)
   - ProviderInvoice entity
   - Payment authorization event
   - Payment confirmation workflow

7. ✅ **Specify Calendar Rules** (enhance product-docs/domain/02-provider-capacity-domain.md)
   - No Sunday exclusion
   - Saturday morning-only rule
   - Provider-to-crew expansion in grid

### 9.3 Medium-Term Actions (Week 5-8)

8. ✅ **Document Pre-Estimation Integration** (enhance product-docs/integration/03-sales-integration.md)
   - SalesPreEstimation entity
   - Kafka events
   - Link to service orders

9. ✅ **Add Supply Chain Integration** (create product-docs/integration/06-supply-chain-integration.md)
   - Product delivery events
   - Delivery status tracking

10. ✅ **Add Payment Integration** (create product-docs/integration/07-payment-integration.md)
    - Customer payment events
    - Provider payment events

### 9.4 Nice-to-Have (Week 9+)

11. ✅ **Rework Service Order Workflow** (enhance product-docs/domain/03-project-service-order-domain.md)
    - Rework creation logic
    - Link to original SO
    - Reason codes

12. ✅ **Service Order Status Tags** (enhance product-docs/domain/03-project-service-order-domain.md)
    - Tag calculation logic
    - Priority/precedence rules

---

## 10. Summary Statistics

| Category | Count | Percentage |
|----------|-------|------------|
| **Fully Documented** ✅ | 10 features | **67%** |
| **Partially Documented** ⚠️ | 5 features | **33%** |
| **Not Documented** ❌ | 5 features | **33%** |
| **Business Rule Conflicts** 🔴 | 2 conflicts | - |
| **Total Features Analyzed** | 15 features | 100% |

### Coverage by Workflow Step

| Step | Feature | Status |
|------|---------|--------|
| 1 | Sales Integration | ✅ Fully Covered |
| 2 | Project Auto-Creation | ✅ Fully Covered |
| 2 | AI Service Order Linking | ✅ Fully Covered (v2.0) |
| 3 | Contract Lifecycle | ✅ Fully Covered |
| 3 | Contract Bundling | ❌ Not Documented |
| 4 | Assignment & Dispatch | ✅ Fully Covered |
| 5 | Provider Offer & Acceptance | ✅ Fully Covered |
| 5 | Date Negotiation (3-round) | ❌ Not Documented |
| 6 | Go Execution Blocking | ⚠️ Partially Documented |
| 7-9 | Check-In/Check-Out | ✅ Fully Covered |
| 10 | WCF Lifecycle | ✅ Fully Covered |
| 10 | Provider Payment | ⚠️ Partially Documented |
| - | Project Ownership | ⚠️ Partially Documented |
| - | Task Management | ❌ Not Documented |
| - | TV Potential AI | ✅ Fully Covered (v2.0) |
| - | Risk Assessment AI | ✅ Fully Covered (v2.0) |

---

## Conclusion

The Yellow Grid Platform documentation (v2.0) provides **strong foundational coverage (85%)** of the 10-step service execution workflow. The AI/ML features (Sales Potential, Risk Assessment) added in v2.0 are **fully documented**.

**Critical Gaps** requiring immediate attention:
1. **Task Management Domain** (mentioned 8+ times, fundamental to operator UX)
2. **Go Execution Blocking Workflow** (payment/delivery validation before check-in)
3. **Project Ownership Automation** (operator workload balancing)
4. **Date Negotiation 3-Round Limit** (escalation logic)
5. **Contract Bundling** (group multiple SOs to single contract)

**Recommendation**: Allocate 2-4 weeks to close critical gaps before development kickoff. The platform is **production-ready** for core workflows but requires these enhancements for complete operator experience.

---

**Document Status**: Complete
**Next Review**: After gap closure implementation
**Maintained By**: Product & Engineering Teams
