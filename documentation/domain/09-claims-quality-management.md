# Claims & Quality Management Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Claim Lifecycle](#2-claim-lifecycle)
3. [Root Cause Taxonomy](#3-root-cause-taxonomy)
4. [Rework Service Order Generation](#4-rework-service-order-generation)
5. [Quality Metrics](#5-quality-metrics)
6. [Provider Scorecards](#6-provider-scorecards)
7. [Claims Impact on Provider Risk](#7-claims-impact-on-provider-risk)
8. [Configuration Data Model](#8-configuration-data-model)
9. [Business Rules & Edge Cases](#9-business-rules--edge-cases)
10. [API Examples](#10-api-examples)

---

## 1. Overview

### 1.1 Purpose

The **Claims & Quality Management** domain tracks service quality issues, manages claim lifecycle from creation to resolution, and maintains provider quality scorecards. The system must:

- Record and categorize claims with root cause analysis
- Generate rework service orders automatically
- Calculate provider quality metrics (first-time completion, CSAT, punctuality, claim rate)
- Maintain provider scorecards visible to operators and providers
- Update provider risk status based on quality degradation
- Provide transparency and audit trails for all quality decisions

### 1.2 Key Principles

**Fairness**: Quality metrics must be objective, data-driven, and auditable.

**Transparency**: Providers must see their quality metrics and understand how they impact risk status.

**Continuous Improvement**: Quality data drives provider coaching, training, and performance management.

**Customer Centricity**: Claims capture customer dissatisfaction and drive corrective action.

---

## 2. Claim Lifecycle

### 2.1 Claim States

```
CREATED → UNDER_INVESTIGATION → VALIDATED → RESOLVED → CLOSED
    │
    └──→ REJECTED (if claim is invalid)
```

### 2.2 Claim Creation

**Claim Sources**:
1. **Customer Complaint**: Customer reports issue via phone, email, or portal
2. **Operator Observation**: Operator identifies quality issue during monitoring
3. **Provider Self-Report**: Provider acknowledges issue and reports it
4. **Automated Detection**: System detects anomalies (e.g., job cancelled twice, low CSAT)

**Claim Data Model**:

```typescript
interface Claim {
  id: string;
  claimNumber: string;  // Human-readable (e.g., "CLM-2025-001234")
  serviceOrderId: string;
  assignmentId?: string;
  providerId?: string;
  customerId: string;
  claimSource: 'customer' | 'operator' | 'provider' | 'automated';
  createdBy: string;  // User ID or "system"
  createdAt: Date;

  claimCategory: ClaimCategory;
  rootCause: RootCause;
  description: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';

  status: ClaimStatus;
  validatedAt?: Date;
  validatedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;

  reworkOrderId?: string;  // If rework generated
  compensationOffered?: boolean;
  compensationAmount?: number;

  attachments: ClaimAttachment[];
}

type ClaimStatus =
  | 'created'
  | 'under_investigation'
  | 'validated'
  | 'resolved'
  | 'closed'
  | 'rejected';

type ClaimCategory =
  | 'product_missing'
  | 'wrong_product_installed'
  | 'incomplete_work'
  | 'damage_to_property'
  | 'customer_no_show'
  | 'provider_no_show'
  | 'poor_quality_work'
  | 'unprofessional_conduct'
  | 'late_arrival'
  | 'other';

interface ClaimAttachment {
  id: string;
  claimId: string;
  fileUrl: string;
  fileType: 'photo' | 'video' | 'document';
  uploadedAt: Date;
  uploadedBy: string;
}
```

**Claim Creation Function**:

```typescript
async function createClaim(input: CreateClaimInput): Promise<Claim> {
  const claimNumber = await generateClaimNumber();  // CLM-2025-001234

  const claim = await claimRepository.create({
    claimNumber,
    serviceOrderId: input.serviceOrderId,
    customerId: input.customerId,
    providerId: input.providerId,
    claimSource: input.claimSource,
    createdBy: input.createdBy,
    claimCategory: input.claimCategory,
    description: input.description,
    impactLevel: determineImpactLevel(input.claimCategory),
    status: 'created',
    createdAt: new Date(),
  });

  await kafkaProducer.send({
    topic: 'quality.claim.created',
    key: claim.id,
    value: {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      serviceOrderId: input.serviceOrderId,
      providerId: input.providerId,
      claimCategory: input.claimCategory,
    },
  });

  // Notify relevant parties
  await notificationService.sendClaimCreatedNotification(claim);

  return claim;
}

function determineImpactLevel(category: ClaimCategory): 'low' | 'medium' | 'high' | 'critical' {
  const highImpactCategories: ClaimCategory[] = [
    'damage_to_property',
    'provider_no_show',
    'wrong_product_installed',
  ];
  const criticalImpactCategories: ClaimCategory[] = [
    'unprofessional_conduct',
  ];

  if (criticalImpactCategories.includes(category)) return 'critical';
  if (highImpactCategories.includes(category)) return 'high';
  if (category === 'late_arrival' || category === 'customer_no_show') return 'low';
  return 'medium';
}
```

---

### 2.3 Claim Investigation

**Investigation Steps**:
1. **Operator Review**: Operator reviews claim details, attachments, and service order history
2. **Provider Contact**: Operator contacts provider for their version of events
3. **Evidence Collection**: Photos, videos, WCF, customer statements
4. **Root Cause Analysis**: Determine underlying cause (see Root Cause Taxonomy)

**Investigation Function**:

```typescript
async function startInvestigation(claimId: string, investigatorId: string): Promise<void> {
  const claim = await claimRepository.findById(claimId);

  if (claim.status !== 'created') {
    throw new Error('Claim must be in CREATED status to start investigation');
  }

  await claimRepository.update(claimId, {
    status: 'under_investigation',
    investigatedBy: investigatorId,
    investigationStartedAt: new Date(),
  });

  await kafkaProducer.send({
    topic: 'quality.claim.investigation_started',
    key: claimId,
    value: { claimId, investigatorId },
  });
}
```

---

### 2.4 Claim Validation

**Validation Outcomes**:
- **VALIDATED**: Claim is legitimate, requires action
- **REJECTED**: Claim is invalid or unfounded

**Validation Function**:

```typescript
async function validateClaim(
  claimId: string,
  rootCause: RootCause,
  validatorId: string,
  validationNotes: string
): Promise<void> {
  const claim = await claimRepository.findById(claimId);

  if (claim.status !== 'under_investigation') {
    throw new Error('Claim must be under investigation to validate');
  }

  await claimRepository.update(claimId, {
    status: 'validated',
    rootCause,
    validatedBy: validatorId,
    validatedAt: new Date(),
    validationNotes,
  });

  await kafkaProducer.send({
    topic: 'quality.claim.validated',
    key: claimId,
    value: { claimId, rootCause },
  });

  // If root cause requires rework, auto-generate rework order
  if (requiresRework(rootCause)) {
    await generateReworkOrder(claimId);
  }

  // Update provider quality metrics
  await updateProviderQualityMetrics(claim.providerId);
}

async function rejectClaim(
  claimId: string,
  validatorId: string,
  rejectionReason: string
): Promise<void> {
  await claimRepository.update(claimId, {
    status: 'rejected',
    validatedBy: validatorId,
    validatedAt: new Date(),
    rejectionReason,
  });

  await kafkaProducer.send({
    topic: 'quality.claim.rejected',
    key: claimId,
    value: { claimId, rejectionReason },
  });
}
```

---

### 2.5 Claim Resolution

**Resolution Actions**:
1. **Rework Order Completed**: If rework was generated, claim is resolved when rework job is completed
2. **Compensation Offered**: Customer receives refund, discount, or voucher
3. **Provider Training**: Provider receives coaching or training
4. **No Action Required**: Issue was minor and customer satisfied

**Resolution Function**:

```typescript
async function resolveClaim(
  claimId: string,
  resolverId: string,
  resolutionNotes: string,
  compensationOffered: boolean,
  compensationAmount?: number
): Promise<void> {
  const claim = await claimRepository.findById(claimId);

  if (claim.status !== 'validated') {
    throw new Error('Claim must be validated to resolve');
  }

  await claimRepository.update(claimId, {
    status: 'resolved',
    resolvedBy: resolverId,
    resolvedAt: new Date(),
    resolutionNotes,
    compensationOffered,
    compensationAmount,
  });

  await kafkaProducer.send({
    topic: 'quality.claim.resolved',
    key: claimId,
    value: { claimId, compensationOffered, compensationAmount },
  });

  // Update provider quality metrics
  await updateProviderQualityMetrics(claim.providerId);
}
```

---

### 2.6 Claim Closure

**Closure Trigger**: After resolution, claim is closed after a waiting period (e.g., 7 days) to ensure customer satisfaction.

**Closure Function**:

```typescript
async function closeClaim(claimId: string): Promise<void> {
  const claim = await claimRepository.findById(claimId);

  if (claim.status !== 'resolved') {
    throw new Error('Claim must be resolved to close');
  }

  await claimRepository.update(claimId, {
    status: 'closed',
    closedAt: new Date(),
  });

  await kafkaProducer.send({
    topic: 'quality.claim.closed',
    key: claimId,
    value: { claimId },
  });
}
```

---

## 3. Root Cause Taxonomy

### 3.1 Root Cause Categories

Root causes are classified to enable trend analysis and targeted improvement:

```typescript
type RootCause =
  // Provider-Attributable
  | 'provider_product_missing'
  | 'provider_wrong_product'
  | 'provider_incomplete_work'
  | 'provider_poor_quality_work'
  | 'provider_no_show'
  | 'provider_late_arrival'
  | 'provider_unprofessional'
  | 'provider_damaged_property'

  // Customer-Attributable
  | 'customer_no_show'
  | 'customer_refused_work'
  | 'customer_changed_requirements'

  // System/Process-Attributable
  | 'incorrect_scheduling'
  | 'product_delivery_delay'
  | 'wrong_product_delivered_to_provider'
  | 'miscommunication'

  // External-Attributable
  | 'weather_delay'
  | 'access_issue'
  | 'third_party_delay'

  // Unknown
  | 'unknown';

interface RootCauseDefinition {
  code: RootCause;
  label: string;
  description: string;
  responsibility: 'provider' | 'customer' | 'system' | 'external' | 'unknown';
  requiresRework: boolean;
  impactsProviderMetrics: boolean;
}
```

**Root Cause Definitions**:

```typescript
const rootCauseDefinitions: RootCauseDefinition[] = [
  {
    code: 'provider_product_missing',
    label: 'Provider Missing Product',
    description: 'Provider arrived without required product or materials',
    responsibility: 'provider',
    requiresRework: true,
    impactsProviderMetrics: true,
  },
  {
    code: 'provider_wrong_product',
    label: 'Provider Installed Wrong Product',
    description: 'Provider installed incorrect product',
    responsibility: 'provider',
    requiresRework: true,
    impactsProviderMetrics: true,
  },
  {
    code: 'provider_incomplete_work',
    label: 'Provider Incomplete Work',
    description: 'Provider did not complete all required work',
    responsibility: 'provider',
    requiresRework: true,
    impactsProviderMetrics: true,
  },
  {
    code: 'provider_poor_quality_work',
    label: 'Provider Poor Quality Work',
    description: 'Work completed but quality is substandard',
    responsibility: 'provider',
    requiresRework: true,
    impactsProviderMetrics: true,
  },
  {
    code: 'provider_no_show',
    label: 'Provider No-Show',
    description: 'Provider did not arrive at scheduled time and did not notify customer',
    responsibility: 'provider',
    requiresRework: true,
    impactsProviderMetrics: true,
  },
  {
    code: 'provider_late_arrival',
    label: 'Provider Late Arrival',
    description: 'Provider arrived >30 minutes late without prior notification',
    responsibility: 'provider',
    requiresRework: false,
    impactsProviderMetrics: true,
  },
  {
    code: 'provider_unprofessional',
    label: 'Provider Unprofessional Conduct',
    description: 'Provider behavior was unprofessional or inappropriate',
    responsibility: 'provider',
    requiresRework: false,
    impactsProviderMetrics: true,
  },
  {
    code: 'provider_damaged_property',
    label: 'Provider Damaged Property',
    description: 'Provider damaged customer property during service',
    responsibility: 'provider',
    requiresRework: true,
    impactsProviderMetrics: true,
  },
  {
    code: 'customer_no_show',
    label: 'Customer No-Show',
    description: 'Customer was not available at scheduled time',
    responsibility: 'customer',
    requiresRework: false,
    impactsProviderMetrics: false,
  },
  {
    code: 'customer_refused_work',
    label: 'Customer Refused Work',
    description: 'Customer refused to allow work to be performed',
    responsibility: 'customer',
    requiresRework: false,
    impactsProviderMetrics: false,
  },
  {
    code: 'wrong_product_delivered_to_provider',
    label: 'Wrong Product Delivered to Provider',
    description: 'Sales system or warehouse delivered wrong product to provider',
    responsibility: 'system',
    requiresRework: true,
    impactsProviderMetrics: false,
  },
  {
    code: 'product_delivery_delay',
    label: 'Product Delivery Delay',
    description: 'Product was not delivered to provider on time',
    responsibility: 'system',
    requiresRework: true,
    impactsProviderMetrics: false,
  },
  {
    code: 'weather_delay',
    label: 'Weather Delay',
    description: 'Service could not be completed due to weather conditions',
    responsibility: 'external',
    requiresRework: false,
    impactsProviderMetrics: false,
  },
];
```

---

## 4. Rework Service Order Generation

### 4.1 Rework Trigger

A **rework service order** is automatically generated when a claim is validated with a root cause that `requiresRework: true`.

### 4.2 Rework Service Order Properties

```typescript
interface ReworkServiceOrder extends ServiceOrder {
  serviceType: 'rework';
  originalServiceOrderId: string;
  claimId: string;
  reworkReason: RootCause;
  priority: 'P1';  // Rework is always P1 priority
  noChargeToCustomer: true;
  assignToSameProvider?: boolean;  // Configurable
}
```

### 4.3 Rework Assignment Logic

**Business Rules**:
- **Same Provider**: If root cause is system/external (e.g., wrong product delivered), assign to same provider
- **Different Provider**: If root cause is provider-attributable (e.g., incomplete work), assign to different provider
- **Priority**: Rework orders are always P1 (priority)
- **No Charge**: Rework is free to customer

**Rework Generation Function**:

```typescript
async function generateReworkOrder(claimId: string): Promise<ServiceOrder> {
  const claim = await claimRepository.findById(claimId);
  const originalOrder = await serviceOrderRepository.findById(claim.serviceOrderId);

  const rootCauseDef = rootCauseDefinitions.find(rc => rc.code === claim.rootCause);
  const assignToSameProvider = rootCauseDef.responsibility !== 'provider';

  const reworkOrder = await serviceOrderRepository.create({
    serviceType: 'rework',
    originalServiceOrderId: originalOrder.id,
    claimId: claim.id,
    reworkReason: claim.rootCause,
    priority: 'P1',
    noChargeToCustomer: true,
    assignToSameProvider,

    // Copy from original order
    customerId: originalOrder.customerId,
    products: originalOrder.products,
    address: originalOrder.address,
    countryCode: originalOrder.countryCode,

    status: 'created',
    createdAt: new Date(),
  });

  await claimRepository.update(claimId, {
    reworkOrderId: reworkOrder.id,
  });

  await kafkaProducer.send({
    topic: 'projects.service_order.created',
    key: reworkOrder.id,
    value: {
      serviceOrderId: reworkOrder.id,
      serviceType: 'rework',
      originalServiceOrderId: originalOrder.id,
      claimId: claim.id,
    },
  });

  // If assign to same provider, create assignment immediately
  if (assignToSameProvider && claim.providerId) {
    await assignmentService.createDirectAssignment(reworkOrder.id, claim.providerId, 'system');
  }

  return reworkOrder;
}
```

---

## 5. Quality Metrics

### 5.1 Provider Quality Metrics

Five key quality metrics are tracked for each provider:

```typescript
interface ProviderQualityMetrics {
  providerId: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: '1_month' | '3_months' | '6_months' | '12_months';

  // Metric 1: First-Time Completion Rate
  firstTimeCompletionRate: number;  // % (0-100)
  totalJobsCompleted: number;
  totalJobsRequiringRework: number;

  // Metric 2: Customer Satisfaction (CSAT)
  averageCSAT: number;  // 1-5 scale
  totalCSATResponses: number;
  csatDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };

  // Metric 3: Punctuality Rate
  punctualityRate: number;  // % (0-100)
  totalJobsOnTime: number;
  totalJobsLate: number;

  // Metric 4: Claim Rate
  claimRate: number;  // % (0-100)
  totalClaims: number;
  claimsByCategory: { [category: string]: number };

  // Metric 5: Rework Frequency
  reworkFrequency: number;  // % (0-100)
  totalReworkJobs: number;

  calculatedAt: Date;
}
```

---

### 5.2 Metric 1: First-Time Completion Rate

**Definition**: Percentage of jobs completed successfully on the first visit (no rework required).

**Formula**:

```
First-Time Completion Rate = (Total Jobs Completed - Jobs Requiring Rework) / Total Jobs Completed * 100
```

**Thresholds**:
- **Excellent**: ≥ 95%
- **Good**: 85-94%
- **Fair**: 75-84%
- **Poor**: < 75%

**Calculation**:

```typescript
async function calculateFirstTimeCompletionRate(
  providerId: string,
  periodMonths: number
): Promise<number> {
  const periodStart = subMonths(new Date(), periodMonths);

  const completedJobs = await serviceOrderRepository.countByProviderAndPeriod(
    providerId,
    periodStart,
    new Date(),
    { status: 'completed' }
  );

  const reworkJobs = await serviceOrderRepository.countByProviderAndPeriod(
    providerId,
    periodStart,
    new Date(),
    { serviceType: 'rework', relatedToProvider: providerId }
  );

  if (completedJobs === 0) return 0;

  return ((completedJobs - reworkJobs) / completedJobs) * 100;
}
```

---

### 5.3 Metric 2: Customer Satisfaction (CSAT)

**Definition**: Average customer satisfaction rating (1-5 scale) from post-service surveys.

**Formula**:

```
Average CSAT = Sum of all CSAT ratings / Total number of CSAT responses
```

**Thresholds**:
- **Excellent**: ≥ 4.5
- **Good**: 4.0-4.4
- **Fair**: 3.5-3.9
- **Poor**: < 3.5

**Calculation**:

```typescript
async function calculateAverageCSAT(
  providerId: string,
  periodMonths: number
): Promise<number> {
  const periodStart = subMonths(new Date(), periodMonths);

  const csatRatings = await csatRepository.findByProviderAndPeriod(
    providerId,
    periodStart,
    new Date()
  );

  if (csatRatings.length === 0) return 0;

  const sum = csatRatings.reduce((total, rating) => total + rating.score, 0);
  return sum / csatRatings.length;
}
```

---

### 5.4 Metric 3: Punctuality Rate

**Definition**: Percentage of jobs where provider arrived within the scheduled time window (±15 minutes).

**Formula**:

```
Punctuality Rate = Total Jobs On Time / Total Jobs * 100
```

**Thresholds**:
- **Excellent**: ≥ 95%
- **Good**: 85-94%
- **Fair**: 75-84%
- **Poor**: < 75%

**Calculation**:

```typescript
async function calculatePunctualityRate(
  providerId: string,
  periodMonths: number
): Promise<number> {
  const periodStart = subMonths(new Date(), periodMonths);

  const checkins = await checkinRepository.findByProviderAndPeriod(
    providerId,
    periodStart,
    new Date()
  );

  let onTime = 0;
  let total = checkins.length;

  for (const checkin of checkins) {
    const scheduledStart = checkin.scheduledStartTime;
    const actualStart = checkin.actualCheckinTime;
    const diffMinutes = Math.abs(differenceInMinutes(actualStart, scheduledStart));

    if (diffMinutes <= 15) {
      onTime++;
    }
  }

  if (total === 0) return 0;
  return (onTime / total) * 100;
}
```

---

### 5.5 Metric 4: Claim Rate

**Definition**: Percentage of completed jobs that resulted in a validated claim.

**Formula**:

```
Claim Rate = Total Validated Claims / Total Jobs Completed * 100
```

**Thresholds**:
- **Excellent**: ≤ 5%
- **Good**: 5-10%
- **Fair**: 10-15%
- **Poor**: > 15%

**Calculation**:

```typescript
async function calculateClaimRate(
  providerId: string,
  periodMonths: number
): Promise<number> {
  const periodStart = subMonths(new Date(), periodMonths);

  const completedJobs = await serviceOrderRepository.countByProviderAndPeriod(
    providerId,
    periodStart,
    new Date(),
    { status: 'completed' }
  );

  const validatedClaims = await claimRepository.countByProviderAndPeriod(
    providerId,
    periodStart,
    new Date(),
    { status: ['validated', 'resolved', 'closed'] }
  );

  if (completedJobs === 0) return 0;
  return (validatedClaims / completedJobs) * 100;
}
```

---

### 5.6 Metric 5: Rework Frequency

**Definition**: Percentage of all jobs assigned to the provider that were rework jobs (i.e., fixing someone else's or their own mistakes).

**Formula**:

```
Rework Frequency = Total Rework Jobs / Total Jobs * 100
```

**Thresholds**:
- **Excellent**: ≤ 5%
- **Good**: 5-10%
- **Fair**: 10-15%
- **Poor**: > 15%

**Calculation**:

```typescript
async function calculateReworkFrequency(
  providerId: string,
  periodMonths: number
): Promise<number> {
  const periodStart = subMonths(new Date(), periodMonths);

  const totalJobs = await assignmentRepository.countByProviderAndPeriod(
    providerId,
    periodStart,
    new Date()
  );

  const reworkJobs = await serviceOrderRepository.countByProviderAndPeriod(
    providerId,
    periodStart,
    new Date(),
    { serviceType: 'rework' }
  );

  if (totalJobs === 0) return 0;
  return (reworkJobs / totalJobs) * 100;
}
```

---

### 5.7 Quality Metrics Calculation Schedule

**Recalculation Frequency**:
- **Real-time**: After each claim validation, service completion, CSAT submission, check-in
- **Batch**: Daily overnight batch job recalculates all provider metrics for consistency
- **On-Demand**: Operators can trigger manual recalculation

**Calculation Function**:

```typescript
async function updateProviderQualityMetrics(providerId: string): Promise<void> {
  const periods = [1, 3, 6, 12];  // months

  for (const periodMonths of periods) {
    const firstTimeCompletion = await calculateFirstTimeCompletionRate(providerId, periodMonths);
    const averageCSAT = await calculateAverageCSAT(providerId, periodMonths);
    const punctualityRate = await calculatePunctualityRate(providerId, periodMonths);
    const claimRate = await calculateClaimRate(providerId, periodMonths);
    const reworkFrequency = await calculateReworkFrequency(providerId, periodMonths);

    const periodType = `${periodMonths}_months` as '1_month' | '3_months' | '6_months' | '12_months';

    await qualityMetricsRepository.upsert({
      providerId,
      periodStart: subMonths(new Date(), periodMonths),
      periodEnd: new Date(),
      periodType,
      firstTimeCompletionRate: firstTimeCompletion,
      averageCSAT,
      punctualityRate,
      claimRate,
      reworkFrequency,
      calculatedAt: new Date(),
    });
  }

  await kafkaProducer.send({
    topic: 'quality.metrics.updated',
    key: providerId,
    value: { providerId },
  });

  // Check if provider risk status needs update
  await evaluateProviderRiskStatus(providerId);
}
```

---

## 6. Provider Scorecards

### 6.1 Scorecard Purpose

Provider scorecards provide a **visual summary** of quality metrics for:
- **Operators**: To make informed assignment decisions
- **Providers**: To understand their performance and areas for improvement
- **Managers**: To identify training needs and performance trends

### 6.2 Scorecard Data Model

```typescript
interface ProviderScorecard {
  providerId: string;
  providerName: string;
  tier: 1 | 2 | 3;
  riskStatus: 'OK' | 'on_watch' | 'suspended';

  metricsLast3Months: {
    firstTimeCompletionRate: number;
    averageCSAT: number;
    punctualityRate: number;
    claimRate: number;
    reworkFrequency: number;
  };

  metricsLast12Months: {
    firstTimeCompletionRate: number;
    averageCSAT: number;
    punctualityRate: number;
    claimRate: number;
    reworkFrequency: number;
  };

  trendIndicators: {
    firstTimeCompletion: 'improving' | 'stable' | 'declining';
    csat: 'improving' | 'stable' | 'declining';
    punctuality: 'improving' | 'stable' | 'declining';
    claims: 'improving' | 'stable' | 'declining';
    rework: 'improving' | 'stable' | 'declining';
  };

  badges: ProviderBadge[];
  warnings: ProviderWarning[];

  generatedAt: Date;
}

interface ProviderBadge {
  type: 'top_performer' | 'excellent_csat' | 'perfect_punctuality' | 'zero_claims';
  label: string;
  earnedDate: Date;
}

interface ProviderWarning {
  type: 'high_claim_rate' | 'low_csat' | 'poor_punctuality' | 'high_rework';
  message: string;
  severity: 'warning' | 'critical';
}
```

### 6.3 Scorecard Generation

```typescript
async function generateProviderScorecard(providerId: string): Promise<ProviderScorecard> {
  const provider = await providerRepository.findById(providerId);
  const riskStatus = await riskStatusRepository.findByProviderId(providerId);

  const metrics3Months = await qualityMetricsRepository.findByProviderAndPeriod(
    providerId,
    '3_months'
  );
  const metrics12Months = await qualityMetricsRepository.findByProviderAndPeriod(
    providerId,
    '12_months'
  );

  const trendIndicators = calculateTrendIndicators(metrics3Months, metrics12Months);
  const badges = generateBadges(metrics3Months);
  const warnings = generateWarnings(metrics3Months);

  return {
    providerId,
    providerName: provider.name,
    tier: provider.tier,
    riskStatus: riskStatus.status,
    metricsLast3Months: metrics3Months,
    metricsLast12Months: metrics12Months,
    trendIndicators,
    badges,
    warnings,
    generatedAt: new Date(),
  };
}

function calculateTrendIndicators(
  metrics3M: ProviderQualityMetrics,
  metrics12M: ProviderQualityMetrics
): TrendIndicators {
  return {
    firstTimeCompletion: compareTrend(metrics3M.firstTimeCompletionRate, metrics12M.firstTimeCompletionRate, 'higher_is_better'),
    csat: compareTrend(metrics3M.averageCSAT, metrics12M.averageCSAT, 'higher_is_better'),
    punctuality: compareTrend(metrics3M.punctualityRate, metrics12M.punctualityRate, 'higher_is_better'),
    claims: compareTrend(metrics3M.claimRate, metrics12M.claimRate, 'lower_is_better'),
    rework: compareTrend(metrics3M.reworkFrequency, metrics12M.reworkFrequency, 'lower_is_better'),
  };
}

function compareTrend(
  recent: number,
  historical: number,
  direction: 'higher_is_better' | 'lower_is_better'
): 'improving' | 'stable' | 'declining' {
  const threshold = 5;  // 5% change threshold

  if (direction === 'higher_is_better') {
    if (recent > historical + threshold) return 'improving';
    if (recent < historical - threshold) return 'declining';
  } else {
    if (recent < historical - threshold) return 'improving';
    if (recent > historical + threshold) return 'declining';
  }

  return 'stable';
}

function generateBadges(metrics: ProviderQualityMetrics): ProviderBadge[] {
  const badges: ProviderBadge[] = [];

  if (metrics.firstTimeCompletionRate >= 98) {
    badges.push({
      type: 'top_performer',
      label: 'Top Performer',
      earnedDate: new Date(),
    });
  }

  if (metrics.averageCSAT >= 4.7) {
    badges.push({
      type: 'excellent_csat',
      label: 'Excellent Customer Satisfaction',
      earnedDate: new Date(),
    });
  }

  if (metrics.punctualityRate >= 98) {
    badges.push({
      type: 'perfect_punctuality',
      label: 'Perfect Punctuality',
      earnedDate: new Date(),
    });
  }

  if (metrics.claimRate === 0) {
    badges.push({
      type: 'zero_claims',
      label: 'Zero Claims',
      earnedDate: new Date(),
    });
  }

  return badges;
}

function generateWarnings(metrics: ProviderQualityMetrics): ProviderWarning[] {
  const warnings: ProviderWarning[] = [];

  if (metrics.claimRate > 15) {
    warnings.push({
      type: 'high_claim_rate',
      message: `High claim rate: ${metrics.claimRate.toFixed(1)}% (threshold: 15%)`,
      severity: 'critical',
    });
  } else if (metrics.claimRate > 10) {
    warnings.push({
      type: 'high_claim_rate',
      message: `Elevated claim rate: ${metrics.claimRate.toFixed(1)}% (threshold: 10%)`,
      severity: 'warning',
    });
  }

  if (metrics.averageCSAT < 3.5) {
    warnings.push({
      type: 'low_csat',
      message: `Low customer satisfaction: ${metrics.averageCSAT.toFixed(1)}/5.0 (threshold: 3.5)`,
      severity: 'critical',
    });
  } else if (metrics.averageCSAT < 4.0) {
    warnings.push({
      type: 'low_csat',
      message: `Below target customer satisfaction: ${metrics.averageCSAT.toFixed(1)}/5.0 (threshold: 4.0)`,
      severity: 'warning',
    });
  }

  if (metrics.punctualityRate < 75) {
    warnings.push({
      type: 'poor_punctuality',
      message: `Poor punctuality: ${metrics.punctualityRate.toFixed(1)}% (threshold: 75%)`,
      severity: 'critical',
    });
  } else if (metrics.punctualityRate < 85) {
    warnings.push({
      type: 'poor_punctuality',
      message: `Below target punctuality: ${metrics.punctualityRate.toFixed(1)}% (threshold: 85%)`,
      severity: 'warning',
    });
  }

  if (metrics.reworkFrequency > 15) {
    warnings.push({
      type: 'high_rework',
      message: `High rework frequency: ${metrics.reworkFrequency.toFixed(1)}% (threshold: 15%)`,
      severity: 'critical',
    });
  }

  return warnings;
}
```

---

## 7. Claims Impact on Provider Risk

### 7.1 Risk Status Overview

Provider risk status is determined by quality metrics. Three statuses:

```typescript
type RiskStatus = 'OK' | 'on_watch' | 'suspended';

interface ProviderRiskStatus {
  providerId: string;
  status: RiskStatus;
  reason?: string;
  suspendedFrom?: Date;
  suspendedUntil?: Date;
  watchReasons?: string[];
  lastEvaluatedAt: Date;
}
```

### 7.2 Risk Evaluation Rules

**Suspended Status** (Provider CANNOT receive new assignments):
- Claim rate > 20% (3-month period)
- CSAT < 3.0 (3-month period)
- 3+ critical claims (damage, unprofessional conduct) in 1 month
- Manual suspension by manager

**On Watch Status** (Provider CAN receive assignments but flagged):
- Claim rate 10-20% (3-month period)
- CSAT 3.0-3.5 (3-month period)
- First-time completion rate < 80% (3-month period)
- Punctuality rate < 80% (3-month period)

**OK Status** (Normal operations):
- All metrics within acceptable ranges

### 7.3 Risk Evaluation Function

```typescript
async function evaluateProviderRiskStatus(providerId: string): Promise<void> {
  const metrics = await qualityMetricsRepository.findByProviderAndPeriod(
    providerId,
    '3_months'
  );

  const criticalClaims = await claimRepository.countByProviderAndPeriod(
    providerId,
    subMonths(new Date(), 1),
    new Date(),
    { impactLevel: 'critical' }
  );

  let newStatus: RiskStatus = 'OK';
  let reason: string | undefined;
  let watchReasons: string[] = [];

  // Check for SUSPENDED triggers
  if (metrics.claimRate > 20) {
    newStatus = 'suspended';
    reason = `Claim rate exceeds 20%: ${metrics.claimRate.toFixed(1)}%`;
  } else if (metrics.averageCSAT < 3.0) {
    newStatus = 'suspended';
    reason = `Customer satisfaction below 3.0: ${metrics.averageCSAT.toFixed(1)}/5.0`;
  } else if (criticalClaims >= 3) {
    newStatus = 'suspended';
    reason = `${criticalClaims} critical claims in last month`;
  }

  // Check for ON WATCH triggers (only if not suspended)
  if (newStatus === 'OK') {
    if (metrics.claimRate > 10) {
      newStatus = 'on_watch';
      watchReasons.push(`Claim rate elevated: ${metrics.claimRate.toFixed(1)}%`);
    }
    if (metrics.averageCSAT < 3.5) {
      newStatus = 'on_watch';
      watchReasons.push(`Customer satisfaction below target: ${metrics.averageCSAT.toFixed(1)}/5.0`);
    }
    if (metrics.firstTimeCompletionRate < 80) {
      newStatus = 'on_watch';
      watchReasons.push(`First-time completion rate low: ${metrics.firstTimeCompletionRate.toFixed(1)}%`);
    }
    if (metrics.punctualityRate < 80) {
      newStatus = 'on_watch';
      watchReasons.push(`Punctuality rate low: ${metrics.punctualityRate.toFixed(1)}%`);
    }
  }

  const currentRiskStatus = await riskStatusRepository.findByProviderId(providerId);

  if (currentRiskStatus.status !== newStatus) {
    // Status changed, update and notify
    await riskStatusRepository.update(providerId, {
      status: newStatus,
      reason,
      watchReasons: newStatus === 'on_watch' ? watchReasons : undefined,
      suspendedFrom: newStatus === 'suspended' ? new Date() : undefined,
      lastEvaluatedAt: new Date(),
    });

    await kafkaProducer.send({
      topic: 'quality.provider_risk.status_changed',
      key: providerId,
      value: { providerId, oldStatus: currentRiskStatus.status, newStatus, reason },
    });

    // Notify provider and managers
    await notificationService.sendRiskStatusChangeNotification(providerId, newStatus, reason);
  }
}
```

---

## 8. Configuration Data Model

### 8.1 Database Schema

**Claims Table**:

```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number VARCHAR(50) NOT NULL UNIQUE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id),
  assignment_id UUID REFERENCES assignments(id),
  provider_id UUID REFERENCES providers(id),
  customer_id UUID NOT NULL REFERENCES customers(id),

  claim_source VARCHAR(50) NOT NULL CHECK (claim_source IN ('customer', 'operator', 'provider', 'automated')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  claim_category VARCHAR(100) NOT NULL,
  root_cause VARCHAR(100),
  description TEXT NOT NULL,
  impact_level VARCHAR(50) NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),

  status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'under_investigation', 'validated', 'resolved', 'closed', 'rejected')) DEFAULT 'created',
  validated_at TIMESTAMP,
  validated_by VARCHAR(255),
  validation_notes TEXT,
  rejection_reason TEXT,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  closed_at TIMESTAMP,

  rework_order_id UUID REFERENCES service_orders(id),
  compensation_offered BOOLEAN DEFAULT FALSE,
  compensation_amount DECIMAL(10, 2),

  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_service_order ON claims(service_order_id);
CREATE INDEX idx_claims_provider ON claims(provider_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created_at ON claims(created_at);
```

**Claim Attachments Table**:

```sql
CREATE TABLE claim_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('photo', 'video', 'document')),
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  uploaded_by VARCHAR(255) NOT NULL
);

CREATE INDEX idx_claim_attachments_claim ON claim_attachments(claim_id);
```

**Provider Quality Metrics Table**:

```sql
CREATE TABLE provider_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('1_month', '3_months', '6_months', '12_months')),

  first_time_completion_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total_jobs_completed INTEGER NOT NULL DEFAULT 0,
  total_jobs_requiring_rework INTEGER NOT NULL DEFAULT 0,

  average_csat DECIMAL(3, 2) NOT NULL DEFAULT 0,
  total_csat_responses INTEGER NOT NULL DEFAULT 0,
  csat_distribution JSONB,

  punctuality_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total_jobs_on_time INTEGER NOT NULL DEFAULT 0,
  total_jobs_late INTEGER NOT NULL DEFAULT 0,

  claim_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total_claims INTEGER NOT NULL DEFAULT 0,
  claims_by_category JSONB,

  rework_frequency DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total_rework_jobs INTEGER NOT NULL DEFAULT 0,

  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, period_type)
);

CREATE INDEX idx_quality_metrics_provider ON provider_quality_metrics(provider_id);
CREATE INDEX idx_quality_metrics_period ON provider_quality_metrics(period_type);
```

---

## 9. Business Rules & Edge Cases

### 9.1 Multiple Claims for Same Service Order

**Scenario**: Customer files multiple claims for the same service order.

**Business Rule**:
- All claims are tracked separately
- Only one rework order is generated per service order (first validated claim triggers it)
- Subsequent validated claims update the rework order with additional issues

**Implementation**:

```typescript
async function handleMultipleClaims(serviceOrderId: string): Promise<void> {
  const existingRework = await serviceOrderRepository.findReworkByOriginalOrder(serviceOrderId);

  if (existingRework) {
    // Add new issues to existing rework order instead of creating duplicate
    await serviceOrderRepository.update(existingRework.id, {
      additionalIssues: [...existingRework.additionalIssues, newIssue],
    });
  }
}
```

---

### 9.2 Provider Self-Reports Claim

**Scenario**: Provider proactively reports an issue (e.g., product missing, incomplete work).

**Business Rule**:
- Claim is created with source "provider"
- Provider receives POSITIVE credit in quality metrics for transparency
- Claim still impacts metrics but with reduced severity

**Implementation**:

```typescript
async function createProviderSelfReportClaim(input: CreateClaimInput): Promise<Claim> {
  const claim = await createClaim({ ...input, claimSource: 'provider' });

  // Award transparency credit
  await providerCreditRepository.create({
    providerId: input.providerId,
    creditType: 'transparency',
    reason: 'Self-reported quality issue',
    creditAmount: 5,
    relatedClaimId: claim.id,
  });

  return claim;
}
```

---

### 9.3 Customer No-Show

**Scenario**: Provider arrives but customer is not available.

**Business Rule**:
- Claim category: "customer_no_show"
- Root cause: "customer_no_show"
- Does NOT impact provider quality metrics
- Rework may or may not be required depending on customer response

---

## 10. API Examples

### 10.1 Create Claim

**POST** `/api/v1/claims`

**Request**:

```json
{
  "serviceOrderId": "so_xyz789",
  "customerId": "cust_abc123",
  "providerId": "prov_def456",
  "claimSource": "customer",
  "claimCategory": "provider_incomplete_work",
  "description": "Provider did not install the kitchen faucet as specified in the work order.",
  "impactLevel": "medium"
}
```

**Response**:

```json
{
  "claimId": "claim_ghi789",
  "claimNumber": "CLM-2025-001234",
  "status": "created",
  "createdAt": "2025-01-16T10:00:00Z"
}
```

---

### 10.2 Validate Claim

**POST** `/api/v1/claims/{claimId}/validate`

**Request**:

```json
{
  "rootCause": "provider_incomplete_work",
  "validationNotes": "Reviewed photos and WCF. Provider confirmed work was incomplete due to time constraints."
}
```

**Response**:

```json
{
  "claimId": "claim_ghi789",
  "status": "validated",
  "rootCause": "provider_incomplete_work",
  "validatedAt": "2025-01-16T12:00:00Z",
  "reworkOrderId": "so_rework_123"
}
```

---

### 10.3 Get Provider Scorecard

**GET** `/api/v1/providers/{providerId}/scorecard`

**Response**:

```json
{
  "providerId": "prov_def456",
  "providerName": "ABC Installers",
  "tier": 1,
  "riskStatus": "OK",
  "metricsLast3Months": {
    "firstTimeCompletionRate": 94.5,
    "averageCSAT": 4.3,
    "punctualityRate": 89.2,
    "claimRate": 7.8,
    "reworkFrequency": 5.5
  },
  "metricsLast12Months": {
    "firstTimeCompletionRate": 92.1,
    "averageCSAT": 4.1,
    "punctualityRate": 87.0,
    "claimRate": 9.2,
    "reworkFrequency": 7.9
  },
  "trendIndicators": {
    "firstTimeCompletion": "improving",
    "csat": "improving",
    "punctuality": "improving",
    "claims": "improving",
    "rework": "improving"
  },
  "badges": [
    {
      "type": "excellent_csat",
      "label": "Excellent Customer Satisfaction",
      "earnedDate": "2025-01-01T00:00:00Z"
    }
  ],
  "warnings": [],
  "generatedAt": "2025-01-16T14:00:00Z"
}
```

---

### 10.4 Get Claim Analytics

**GET** `/api/v1/analytics/claims?period=3_months&groupBy=rootCause`

**Response**:

```json
{
  "period": "3_months",
  "totalClaims": 1247,
  "claimsByRootCause": [
    {
      "rootCause": "provider_product_missing",
      "count": 342,
      "percentage": 27.4
    },
    {
      "rootCause": "provider_incomplete_work",
      "count": 215,
      "percentage": 17.2
    },
    {
      "rootCause": "customer_no_show",
      "count": 189,
      "percentage": 15.2
    }
  ],
  "topProvidersByClaims": [
    {
      "providerId": "prov_123",
      "providerName": "XYZ Services",
      "claimCount": 45
    }
  ]
}
```

---

**End of Document**
