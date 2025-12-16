# AI Context Linking & Service Order Association

**Document Version**: 2.0
**Last Updated**: 2025-01-16
**Owner**: Product & Engineering
**Status**: Specification

> **v2.0 Update**: Added Sales Potential Scorer and Risk Assessment Scorer AI models

---

## Table of Contents

1. [Overview](#1-overview)
2. [AI Context Matching Algorithm](#2-ai-context-matching-algorithm)
3. [Service Order Similarity Scoring](#3-service-order-similarity-scoring)
4. [Auto-Linking Logic](#4-auto-linking-logic)
5. [Human-in-the-Loop Review](#5-human-in-the-loop-review)
6. [Link Types & Semantics](#6-link-types--semantics)
7. [Context Extraction](#7-context-extraction)
8. [Configuration & Tuning](#8-configuration--tuning)
9. [Data Model](#9-data-model)
10. [API Examples](#10-api-examples)
11. [Sales Potential Scorer (v2.0)](#11-sales-potential-scorer-v20)
12. [Risk Assessment Scorer (v2.0)](#12-risk-assessment-scorer-v20)

---

## 1. Overview

### 1.1 Purpose

The **AI Context Linking** system automatically identifies and links related service orders within a project using machine learning and natural language processing. This reduces manual operator work and ensures logical dependencies are captured.

**Example Use Cases**:
- A **Technical Visit (TV)** for a kitchen installation quote is linked to the subsequent **kitchen installation** service order
- A **bathroom installation** is linked to a **bathroom TV installation** for the same customer
- A **rework order** is automatically linked to the original failed installation

### 1.2 Key Principles

**Automation First**: System auto-links with high confidence matches (≥80%).

**Human Validation**: Medium confidence matches (50-79%) require operator review.

**Explainability**: Every link suggestion includes reasoning for transparency.

**Learning**: System improves over time based on operator feedback (accept/reject).

---

## 2. AI Context Matching Algorithm

### 2.1 Matching Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Service Order Ingestion                            │
│ New SO arrives → Extract features                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Candidate Selection                                │
│ Find SOs in same project or for same customer (last 6mo)   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Feature Extraction                                 │
│ Extract: service type, products, address, dates, text      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Similarity Scoring                                 │
│ Calculate weighted similarity score (0-100)                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Link Decision                                      │
│ Auto-link (≥80), Review (50-79), Ignore (<50)              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Dependency Type Classification                     │
│ Hard dependency (FinishToStart) or Soft association        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Candidate Selection

**Business Rules**:
- Only consider service orders within the **same project**
- If no project match, consider service orders for **same customer** in last **6 months**
- Exclude terminal states: `CANCELLED`, `VERIFIED`

**Implementation**:

```typescript
interface CandidateSelectionCriteria {
  projectId?: string;
  customerId: string;
  lookbackPeriodDays: number; // Default: 180 days
  excludeStatuses: ServiceOrderState[];
  maxCandidates: number; // Default: 50
}

async function selectLinkingCandidates(
  newServiceOrder: ServiceOrder,
  criteria: CandidateSelectionCriteria
): Promise<ServiceOrder[]> {
  let candidates: ServiceOrder[] = [];

  // Priority 1: Same project
  if (newServiceOrder.projectId) {
    candidates = await serviceOrderRepository.findByProject(
      newServiceOrder.projectId,
      { excludeStatuses: criteria.excludeStatuses }
    );
  }

  // Priority 2: Same customer (if no project or project is new)
  if (candidates.length === 0) {
    const lookbackDate = subDays(new Date(), criteria.lookbackPeriodDays);
    candidates = await serviceOrderRepository.findByCustomer(
      newServiceOrder.customerId,
      {
        createdAfter: lookbackDate,
        excludeStatuses: criteria.excludeStatuses,
        limit: criteria.maxCandidates
      }
    );
  }

  // Exclude self
  candidates = candidates.filter(c => c.id !== newServiceOrder.id);

  return candidates;
}
```

---

## 3. Service Order Similarity Scoring

### 3.1 Feature Extraction

**Features Extracted from Each Service Order**:

```typescript
interface ServiceOrderFeatures {
  // Structured features
  serviceType: string; // "installation", "tv", "maintenance", "rework"
  priority: string; // "P1", "P2"
  productCategories: string[]; // ["kitchen", "appliances"]
  productIds: string[];
  addressHash: string; // Normalized address hash
  scheduledDate?: Date;

  // Text features (for NLP)
  productDescriptions: string[];
  customerInstructions?: string;
  specialRequirements?: string;
  salesOrderNotes?: string;

  // Metadata
  salesChannel: string; // "store", "web", "phone"
  countryCode: string;
  businessUnit: string;
}

async function extractFeatures(order: ServiceOrder): Promise<ServiceOrderFeatures> {
  return {
    serviceType: order.serviceType,
    priority: order.priority,
    productCategories: order.products.map(p => p.category),
    productIds: order.products.map(p => p.productId),
    addressHash: hashAddress(order.address),
    scheduledDate: order.scheduledSlot?.timeSlot.startTime,
    productDescriptions: order.products.map(p => p.name + ' ' + p.description),
    customerInstructions: order.customerInfo.preferences.specialInstructions,
    salesChannel: order.sourceSystem,
    countryCode: order.countryCode,
    businessUnit: order.businessUnit
  };
}
```

### 3.2 Similarity Calculation

**Weighted Similarity Components**:

| Component | Weight | Description |
|-----------|--------|-------------|
| **Product Category Match** | 35% | Same product category (e.g., both "kitchen") |
| **Service Type Relationship** | 25% | Known relationships (TV → Installation) |
| **Address Match** | 20% | Same worksite address |
| **Temporal Proximity** | 10% | Scheduled within 30 days of each other |
| **Text Semantic Similarity** | 10% | NLP similarity of descriptions/notes |

**Similarity Function**:

```typescript
interface SimilarityScore {
  totalScore: number; // 0-100
  componentScores: {
    productCategoryScore: number;
    serviceTypeScore: number;
    addressScore: number;
    temporalScore: number;
    textSemanticScore: number;
  };
  reasoning: string[];
}

async function calculateSimilarity(
  orderA: ServiceOrder,
  orderB: ServiceOrder
): Promise<SimilarityScore> {
  const featuresA = await extractFeatures(orderA);
  const featuresB = await extractFeatures(orderB);

  const reasoning: string[] = [];

  // 1. Product Category Match (35%)
  const productCategoryScore = calculateProductCategoryScore(featuresA, featuresB, reasoning);

  // 2. Service Type Relationship (25%)
  const serviceTypeScore = calculateServiceTypeScore(featuresA, featuresB, reasoning);

  // 3. Address Match (20%)
  const addressScore = calculateAddressScore(featuresA, featuresB, reasoning);

  // 4. Temporal Proximity (10%)
  const temporalScore = calculateTemporalScore(featuresA, featuresB, reasoning);

  // 5. Text Semantic Similarity (10%)
  const textSemanticScore = await calculateTextSemanticScore(featuresA, featuresB, reasoning);

  // Weighted total
  const totalScore =
    productCategoryScore * 0.35 +
    serviceTypeScore * 0.25 +
    addressScore * 0.20 +
    temporalScore * 0.10 +
    textSemanticScore * 0.10;

  return {
    totalScore: Math.round(totalScore),
    componentScores: {
      productCategoryScore,
      serviceTypeScore,
      addressScore,
      temporalScore,
      textSemanticScore
    },
    reasoning
  };
}
```

### 3.3 Product Category Matching

```typescript
function calculateProductCategoryScore(
  featuresA: ServiceOrderFeatures,
  featuresB: ServiceOrderFeatures,
  reasoning: string[]
): number {
  const categoriesA = new Set(featuresA.productCategories);
  const categoriesB = new Set(featuresB.productCategories);

  // Calculate Jaccard similarity
  const intersection = new Set([...categoriesA].filter(x => categoriesB.has(x)));
  const union = new Set([...categoriesA, ...categoriesB]);

  const jaccardScore = intersection.size / union.size;
  const score = jaccardScore * 100;

  if (score >= 80) {
    reasoning.push(`Strong product category overlap: ${Array.from(intersection).join(', ')}`);
  } else if (score >= 50) {
    reasoning.push(`Moderate product category overlap: ${Array.from(intersection).join(', ')}`);
  }

  return score;
}
```

### 3.4 Service Type Relationship Scoring

**Known Service Type Relationships**:

```typescript
const serviceTypeRelationships: Record<string, { relatedType: string; score: number; reason: string }[]> = {
  'tv': [
    { relatedType: 'installation', score: 95, reason: 'TV typically precedes installation' },
    { relatedType: 'rework', score: 80, reason: 'Rework may follow failed TV' }
  ],
  'installation': [
    { relatedType: 'tv', score: 95, reason: 'Installation typically follows TV' },
    { relatedType: 'rework', score: 85, reason: 'Rework may follow failed installation' },
    { relatedType: 'maintenance', score: 50, reason: 'Maintenance may follow installation' }
  ],
  'rework': [
    { relatedType: 'installation', score: 90, reason: 'Rework fixes failed installation' },
    { relatedType: 'tv', score: 85, reason: 'Rework fixes failed TV' }
  ],
  'maintenance': [
    { relatedType: 'installation', score: 60, reason: 'Maintenance follows past installation' }
  ]
};

function calculateServiceTypeScore(
  featuresA: ServiceOrderFeatures,
  featuresB: ServiceOrderFeatures,
  reasoning: string[]
): number {
  const typeA = featuresA.serviceType;
  const typeB = featuresB.serviceType;

  // Check for known relationships
  const relationships = serviceTypeRelationships[typeA] || [];
  const match = relationships.find(r => r.relatedType === typeB);

  if (match) {
    reasoning.push(match.reason);
    return match.score;
  }

  // Same service type = moderate score
  if (typeA === typeB) {
    reasoning.push(`Both are ${typeA} service orders`);
    return 50;
  }

  // No relationship
  return 0;
}
```

### 3.5 Address Matching

```typescript
function calculateAddressScore(
  featuresA: ServiceOrderFeatures,
  featuresB: ServiceOrderFeatures,
  reasoning: string[]
): number {
  if (featuresA.addressHash === featuresB.addressHash) {
    reasoning.push('Same worksite address');
    return 100;
  }

  // Could add fuzzy address matching here (e.g., same building, different unit)
  return 0;
}
```

### 3.6 Temporal Proximity

```typescript
function calculateTemporalScore(
  featuresA: ServiceOrderFeatures,
  featuresB: ServiceOrderFeatures,
  reasoning: string[]
): number {
  if (!featuresA.scheduledDate || !featuresB.scheduledDate) {
    return 50; // Neutral score if dates not available
  }

  const daysDiff = Math.abs(
    differenceInDays(featuresA.scheduledDate, featuresB.scheduledDate)
  );

  let score = 0;
  if (daysDiff <= 7) {
    score = 100;
    reasoning.push(`Scheduled within 1 week (${daysDiff} days apart)`);
  } else if (daysDiff <= 14) {
    score = 80;
    reasoning.push(`Scheduled within 2 weeks (${daysDiff} days apart)`);
  } else if (daysDiff <= 30) {
    score = 60;
    reasoning.push(`Scheduled within 1 month (${daysDiff} days apart)`);
  } else if (daysDiff <= 60) {
    score = 40;
    reasoning.push(`Scheduled within 2 months (${daysDiff} days apart)`);
  } else {
    score = 20;
    reasoning.push(`Scheduled ${daysDiff} days apart`);
  }

  return score;
}
```

### 3.7 Text Semantic Similarity (NLP)

```typescript
async function calculateTextSemanticScore(
  featuresA: ServiceOrderFeatures,
  featuresB: ServiceOrderFeatures,
  reasoning: string[]
): Promise<number> {
  // Combine text fields
  const textA = [
    ...featuresA.productDescriptions,
    featuresA.customerInstructions || '',
    featuresA.specialRequirements || ''
  ].join(' ');

  const textB = [
    ...featuresB.productDescriptions,
    featuresB.customerInstructions || '',
    featuresB.specialRequirements || ''
  ].join(' ');

  if (!textA || !textB) {
    return 50; // Neutral if no text available
  }

  // Use embedding-based similarity (e.g., OpenAI embeddings, sentence-transformers)
  const embeddingA = await getTextEmbedding(textA);
  const embeddingB = await getTextEmbedding(textB);

  const cosineSimilarity = calculateCosineSimilarity(embeddingA, embeddingB);
  const score = cosineSimilarity * 100;

  if (score >= 70) {
    reasoning.push(`High text semantic similarity (${score.toFixed(1)}%)`);
  } else if (score >= 50) {
    reasoning.push(`Moderate text semantic similarity (${score.toFixed(1)}%)`);
  }

  return score;
}

async function getTextEmbedding(text: string): Promise<number[]> {
  // Implementation using OpenAI API or Hugging Face Sentence Transformers
  // Example with OpenAI:
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
```

---

## 4. Auto-Linking Logic

### 4.1 Link Decision Thresholds

```typescript
enum LinkDecision {
  AUTO_LINK = 'AUTO_LINK',       // Score ≥ 80
  SUGGEST_REVIEW = 'SUGGEST_REVIEW', // Score 50-79
  IGNORE = 'IGNORE'              // Score < 50
}

interface LinkRecommendation {
  sourceOrderId: string;
  targetOrderId: string;
  similarityScore: SimilarityScore;
  decision: LinkDecision;
  suggestedLinkType: LinkType;
  suggestedDependencyType?: DependencyType;
  confidence: number; // 0-100
  reasoning: string[];
}

function determineLinkDecision(
  similarityScore: SimilarityScore
): LinkDecision {
  if (similarityScore.totalScore >= 80) {
    return LinkDecision.AUTO_LINK;
  } else if (similarityScore.totalScore >= 50) {
    return LinkDecision.SUGGEST_REVIEW;
  } else {
    return LinkDecision.IGNORE;
  }
}
```

### 4.2 Auto-Link Execution

```typescript
async function executeLinking(
  newServiceOrder: ServiceOrder
): Promise<LinkRecommendation[]> {
  // Step 1: Select candidates
  const candidates = await selectLinkingCandidates(newServiceOrder, {
    customerId: newServiceOrder.customerId,
    projectId: newServiceOrder.projectId,
    lookbackPeriodDays: 180,
    excludeStatuses: [ServiceOrderState.Cancelled, ServiceOrderState.Verified],
    maxCandidates: 50
  });

  const recommendations: LinkRecommendation[] = [];

  // Step 2: Calculate similarity for each candidate
  for (const candidate of candidates) {
    const similarityScore = await calculateSimilarity(newServiceOrder, candidate);
    const decision = determineLinkDecision(similarityScore);

    if (decision === LinkDecision.IGNORE) {
      continue; // Skip low-confidence matches
    }

    const linkType = determineLinkType(newServiceOrder, candidate, similarityScore);
    const dependencyType = determineDependencyType(newServiceOrder, candidate);

    const recommendation: LinkRecommendation = {
      sourceOrderId: newServiceOrder.id,
      targetOrderId: candidate.id,
      similarityScore,
      decision,
      suggestedLinkType: linkType,
      suggestedDependencyType: dependencyType,
      confidence: similarityScore.totalScore,
      reasoning: similarityScore.reasoning
    };

    recommendations.push(recommendation);

    // Step 3: Auto-link if high confidence
    if (decision === LinkDecision.AUTO_LINK) {
      await createServiceOrderLink(recommendation);
    } else {
      // Queue for operator review
      await queueForReview(recommendation);
    }
  }

  return recommendations;
}
```

---

## 5. Human-in-the-Loop Review

### 5.1 Review Queue

```typescript
interface LinkReviewTask {
  id: string;
  recommendation: LinkRecommendation;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  modifiedLinkType?: LinkType;
  modifiedDependencyType?: DependencyType;
}

async function queueForReview(
  recommendation: LinkRecommendation
): Promise<LinkReviewTask> {
  const task = await linkReviewRepository.create({
    recommendation,
    status: 'pending',
    createdAt: new Date()
  });

  await kafkaProducer.send({
    topic: 'ai.link_suggestion.created',
    key: task.id,
    value: {
      taskId: task.id,
      sourceOrderId: recommendation.sourceOrderId,
      targetOrderId: recommendation.targetOrderId,
      confidence: recommendation.confidence
    }
  });

  return task;
}
```

### 5.2 Operator Review Actions

```typescript
async function approveLink(
  taskId: string,
  operatorId: string
): Promise<void> {
  const task = await linkReviewRepository.findById(taskId);

  await createServiceOrderLink(task.recommendation);

  await linkReviewRepository.update(taskId, {
    status: 'approved',
    reviewedBy: operatorId,
    reviewedAt: new Date()
  });

  // Learn from approval
  await recordFeedback(task.recommendation, 'approved', operatorId);
}

async function rejectLink(
  taskId: string,
  operatorId: string,
  reason: string
): Promise<void> {
  const task = await linkReviewRepository.findById(taskId);

  await linkReviewRepository.update(taskId, {
    status: 'rejected',
    reviewedBy: operatorId,
    reviewedAt: new Date(),
    reviewNotes: reason
  });

  // Learn from rejection
  await recordFeedback(task.recommendation, 'rejected', operatorId);
}

async function modifyAndApproveLink(
  taskId: string,
  operatorId: string,
  modifiedLinkType: LinkType,
  modifiedDependencyType?: DependencyType
): Promise<void> {
  const task = await linkReviewRepository.findById(taskId);

  const modifiedRecommendation = {
    ...task.recommendation,
    suggestedLinkType: modifiedLinkType,
    suggestedDependencyType: modifiedDependencyType
  };

  await createServiceOrderLink(modifiedRecommendation);

  await linkReviewRepository.update(taskId, {
    status: 'modified',
    reviewedBy: operatorId,
    reviewedAt: new Date(),
    modifiedLinkType,
    modifiedDependencyType
  });

  // Learn from modification
  await recordFeedback(modifiedRecommendation, 'modified', operatorId);
}
```

### 5.3 Learning from Feedback

```typescript
interface LinkFeedback {
  id: string;
  recommendation: LinkRecommendation;
  outcome: 'approved' | 'rejected' | 'modified';
  reviewedBy: string;
  reviewedAt: Date;
  features: {
    productCategoryMatch: boolean;
    serviceTypeMatch: string;
    addressMatch: boolean;
    temporalProximityDays: number;
    textSimilarity: number;
  };
}

async function recordFeedback(
  recommendation: LinkRecommendation,
  outcome: 'approved' | 'rejected' | 'modified',
  operatorId: string
): Promise<void> {
  const feedback = await feedbackRepository.create({
    recommendation,
    outcome,
    reviewedBy: operatorId,
    reviewedAt: new Date(),
    features: extractFeedbackFeatures(recommendation)
  });

  // Periodically retrain model based on feedback
  await triggerModelRetraining();
}

async function triggerModelRetraining(): Promise<void> {
  const feedbackCount = await feedbackRepository.countSince(subDays(new Date(), 30));

  if (feedbackCount >= 100) {
    // Queue retraining job
    await kafkaProducer.send({
      topic: 'ai.model_retraining.requested',
      key: 'link_suggestion_model',
      value: { modelType: 'link_suggestion', feedbackCount }
    });
  }
}
```

---

## 6. Link Types & Semantics

### 6.1 Link Type Enum

```typescript
enum LinkType {
  HARD_DEPENDENCY = 'HARD_DEPENDENCY',   // Must complete prerequisite first
  SOFT_ASSOCIATION = 'SOFT_ASSOCIATION', // Related but not blocking
  REWORK_OF = 'REWORK_OF',               // Rework of failed order
  FOLLOW_UP = 'FOLLOW_UP'                // Follow-up maintenance/inspection
}
```

### 6.2 Link Type Determination

```typescript
function determineLinkType(
  orderA: ServiceOrder,
  orderB: ServiceOrder,
  similarity: SimilarityScore
): LinkType {
  // Rework is always REWORK_OF
  if (orderA.serviceType === 'rework' && orderB.serviceType !== 'rework') {
    return LinkType.REWORK_OF;
  }
  if (orderB.serviceType === 'rework' && orderA.serviceType !== 'rework') {
    return LinkType.REWORK_OF;
  }

  // TV → Installation is HARD_DEPENDENCY
  if (orderA.serviceType === 'tv' && orderB.serviceType === 'installation') {
    return LinkType.HARD_DEPENDENCY;
  }
  if (orderB.serviceType === 'tv' && orderA.serviceType === 'installation') {
    return LinkType.HARD_DEPENDENCY;
  }

  // Maintenance following installation is FOLLOW_UP
  if (orderA.serviceType === 'maintenance' && orderB.serviceType === 'installation') {
    return LinkType.FOLLOW_UP;
  }
  if (orderB.serviceType === 'maintenance' && orderA.serviceType === 'installation') {
    return LinkType.FOLLOW_UP;
  }

  // Default: SOFT_ASSOCIATION
  return LinkType.SOFT_ASSOCIATION;
}
```

### 6.3 Dependency Type Determination

```typescript
function determineDependencyType(
  orderA: ServiceOrder,
  orderB: ServiceOrder
): DependencyType | undefined {
  // Only hard dependencies have dependency types
  const linkType = determineLinkType(orderA, orderB, /* similarity */);
  if (linkType !== LinkType.HARD_DEPENDENCY) {
    return undefined;
  }

  // TV must finish before Installation starts
  if (orderA.serviceType === 'tv' && orderB.serviceType === 'installation') {
    return DependencyType.FinishToStart;
  }
  if (orderB.serviceType === 'tv' && orderA.serviceType === 'installation') {
    return DependencyType.FinishToStart;
  }

  // Default for hard dependencies
  return DependencyType.FinishToStart;
}
```

---

## 7. Context Extraction

### 7.1 Product Context

```typescript
interface ProductContext {
  category: string; // "kitchen", "bathroom", "bedroom"
  subcategory?: string; // "cabinets", "appliances"
  brand?: string;
  model?: string;
  keywords: string[]; // Extracted keywords from description
}

function extractProductContext(product: Product): ProductContext {
  return {
    category: product.category,
    subcategory: product.subcategory,
    brand: product.brand,
    model: product.model,
    keywords: extractKeywords(product.name + ' ' + product.description)
  };
}

function extractKeywords(text: string): string[] {
  // NLP keyword extraction
  // Remove stop words, extract noun phrases
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at']);
  const words = text.toLowerCase().split(/\s+/);
  return words.filter(w => !stopWords.has(w) && w.length > 3);
}
```

### 7.2 Customer Context

```typescript
interface CustomerContext {
  customerId: string;
  projectCount: number;
  averageOrderValue: number;
  preferredServiceTypes: string[];
  historicalProducts: string[];
}

async function extractCustomerContext(customerId: string): Promise<CustomerContext> {
  const orders = await serviceOrderRepository.findByCustomer(customerId);

  return {
    customerId,
    projectCount: new Set(orders.map(o => o.projectId)).size,
    averageOrderValue: calculateAverage(orders.map(o => o.totalAmount)),
    preferredServiceTypes: getMostFrequent(orders.map(o => o.serviceType)),
    historicalProducts: [...new Set(orders.flatMap(o => o.products.map(p => p.category)))]
  };
}
```

---

## 8. Configuration & Tuning

### 8.1 Model Configuration

```typescript
interface LinkingModelConfig {
  // Similarity weights
  weights: {
    productCategory: number; // 0-1 (default: 0.35)
    serviceType: number;     // 0-1 (default: 0.25)
    address: number;         // 0-1 (default: 0.20)
    temporal: number;        // 0-1 (default: 0.10)
    textSemantic: number;    // 0-1 (default: 0.10)
  };

  // Decision thresholds
  thresholds: {
    autoLink: number;        // Default: 80
    suggestReview: number;   // Default: 50
  };

  // Candidate selection
  candidateSelection: {
    lookbackPeriodDays: number; // Default: 180
    maxCandidates: number;      // Default: 50
  };

  // NLP settings
  nlp: {
    embeddingModel: string;  // "text-embedding-3-small"
    minTextLength: number;   // Default: 10
  };

  // Learning
  learning: {
    retrainingFeedbackThreshold: number; // Default: 100
    retrainingIntervalDays: number;      // Default: 30
  };
}

const defaultConfig: LinkingModelConfig = {
  weights: {
    productCategory: 0.35,
    serviceType: 0.25,
    address: 0.20,
    temporal: 0.10,
    textSemantic: 0.10
  },
  thresholds: {
    autoLink: 80,
    suggestReview: 50
  },
  candidateSelection: {
    lookbackPeriodDays: 180,
    maxCandidates: 50
  },
  nlp: {
    embeddingModel: 'text-embedding-3-small',
    minTextLength: 10
  },
  learning: {
    retrainingFeedbackThreshold: 100,
    retrainingIntervalDays: 30
  }
};
```

### 8.2 A/B Testing Framework

```typescript
interface ABTestConfig {
  testName: string;
  variantA: Partial<LinkingModelConfig>;
  variantB: Partial<LinkingModelConfig>;
  trafficSplit: number; // 0-1 (0.5 = 50/50 split)
  startDate: Date;
  endDate: Date;
  metrics: string[]; // ["precision", "recall", "operator_acceptance_rate"]
}

async function runABTest(config: ABTestConfig): Promise<void> {
  // Assign service orders to variants based on hash
  const variant = Math.random() < config.trafficSplit ? 'A' : 'B';
  const modelConfig = variant === 'A' ? config.variantA : config.variantB;

  // Track metrics per variant
  await metricsRepository.record({
    testName: config.testName,
    variant,
    timestamp: new Date()
  });
}
```

---

## 9. Data Model

### 9.1 Database Schema

**Service Order Links Table**:

```sql
CREATE TABLE service_order_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  target_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('HARD_DEPENDENCY', 'SOFT_ASSOCIATION', 'REWORK_OF', 'FOLLOW_UP')),
  dependency_type VARCHAR(50) CHECK (dependency_type IN ('FinishToStart', 'StartToStart', 'FinishToFinish', 'StartToFinish')),

  similarity_score DECIMAL(5, 2) NOT NULL, -- 0-100
  confidence DECIMAL(5, 2) NOT NULL,       -- 0-100
  reasoning JSONB NOT NULL,                -- Array of reasoning strings

  created_by VARCHAR(50) NOT NULL, -- "AI" or operator user ID
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,

  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'archived', 'rejected')) DEFAULT 'active',

  UNIQUE(source_order_id, target_order_id)
);

CREATE INDEX idx_so_links_source ON service_order_links(source_order_id);
CREATE INDEX idx_so_links_target ON service_order_links(target_order_id);
CREATE INDEX idx_so_links_type ON service_order_links(link_type);
CREATE INDEX idx_so_links_created_by ON service_order_links(created_by);
```

**Link Review Tasks Table**:

```sql
CREATE TABLE link_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_order_id UUID NOT NULL REFERENCES service_orders(id),
  target_order_id UUID NOT NULL REFERENCES service_orders(id),

  recommendation JSONB NOT NULL, -- LinkRecommendation object

  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'modified')) DEFAULT 'pending',
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  modified_link_type VARCHAR(50),
  modified_dependency_type VARCHAR(50),

  assigned_to VARCHAR(255)
);

CREATE INDEX idx_link_review_status ON link_review_tasks(status);
CREATE INDEX idx_link_review_assigned ON link_review_tasks(assigned_to);
CREATE INDEX idx_link_review_created ON link_review_tasks(created_at);
```

**Link Feedback Table**:

```sql
CREATE TABLE link_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation JSONB NOT NULL,
  outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('approved', 'rejected', 'modified')),
  reviewed_by VARCHAR(255) NOT NULL,
  reviewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  features JSONB NOT NULL -- Feature vector for retraining
);

CREATE INDEX idx_link_feedback_outcome ON link_feedback(outcome);
CREATE INDEX idx_link_feedback_reviewed_at ON link_feedback(reviewed_at);
```

---

## 10. API Examples

### 10.1 Trigger AI Linking

**POST** `/api/v1/service-orders/{serviceOrderId}/ai-link`

**Request**:

```json
{
  "mode": "auto",
  "maxCandidates": 50
}
```

**Response**:

```json
{
  "serviceOrderId": "so_abc123",
  "recommendations": [
    {
      "targetOrderId": "so_xyz789",
      "similarityScore": {
        "totalScore": 92,
        "componentScores": {
          "productCategoryScore": 100,
          "serviceTypeScore": 95,
          "addressScore": 100,
          "temporalScore": 80,
          "textSemanticScore": 75
        },
        "reasoning": [
          "Strong product category overlap: kitchen",
          "TV typically precedes installation",
          "Same worksite address",
          "Scheduled within 2 weeks (10 days apart)",
          "High text semantic similarity (75.3%)"
        ]
      },
      "decision": "AUTO_LINK",
      "suggestedLinkType": "HARD_DEPENDENCY",
      "suggestedDependencyType": "FinishToStart",
      "confidence": 92,
      "autoLinked": true
    },
    {
      "targetOrderId": "so_def456",
      "similarityScore": {
        "totalScore": 65,
        "reasoning": [
          "Moderate product category overlap: kitchen, appliances",
          "Same worksite address",
          "Scheduled within 1 month (25 days apart)"
        ]
      },
      "decision": "SUGGEST_REVIEW",
      "suggestedLinkType": "SOFT_ASSOCIATION",
      "confidence": 65,
      "reviewTaskId": "task_ghi789"
    }
  ],
  "autoLinkedCount": 1,
  "queuedForReviewCount": 1
}
```

### 10.2 Get Link Review Queue

**GET** `/api/v1/link-review-tasks?status=pending&limit=20`

**Response**:

```json
{
  "tasks": [
    {
      "taskId": "task_ghi789",
      "sourceOrder": {
        "id": "so_abc123",
        "serviceType": "installation",
        "products": ["Kitchen cabinets", "Countertop"]
      },
      "targetOrder": {
        "id": "so_def456",
        "serviceType": "installation",
        "products": ["Kitchen appliances", "Dishwasher"]
      },
      "recommendation": {
        "confidence": 65,
        "suggestedLinkType": "SOFT_ASSOCIATION",
        "reasoning": [
          "Moderate product category overlap: kitchen, appliances",
          "Same worksite address"
        ]
      },
      "priority": "medium",
      "createdAt": "2025-01-16T10:00:00Z"
    }
  ],
  "totalCount": 15,
  "page": 1,
  "pageSize": 20
}
```

### 10.3 Approve Link

**POST** `/api/v1/link-review-tasks/{taskId}/approve`

**Response**:

```json
{
  "taskId": "task_ghi789",
  "status": "approved",
  "linkCreated": {
    "linkId": "link_jkl012",
    "sourceOrderId": "so_abc123",
    "targetOrderId": "so_def456",
    "linkType": "SOFT_ASSOCIATION"
  },
  "reviewedBy": "operator_user_123",
  "reviewedAt": "2025-01-16T14:30:00Z"
}
```

---

## Appendix A: Metrics & KPIs

### Model Performance Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Precision** | ≥ 85% | Of auto-linked orders, % that are correct |
| **Recall** | ≥ 70% | Of all linkable orders, % that are found |
| **Operator Acceptance Rate** | ≥ 80% | % of suggestions approved by operators |
| **Average Confidence** | ≥ 75 | Average confidence score of auto-links |
| **Review Queue Time** | < 24h | Average time for operator to review suggestion |

### Business Impact Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Manual Linking Reduction** | 60% | % reduction in manual operator linking work |
| **Link Discovery Rate** | 30% | % of new orders auto-linked |
| **Project Cohesion Score** | ≥ 4/5 | Operator rating of project organization |

---

## 11. Sales Potential Scorer (v2.0)

### 11.1 Overview

The **Sales Potential Scorer** is an AI/ML model that automatically assesses the commercial potential of **Technical Visit (TV)** and **Quotation** service orders. It analyzes salesman notes, customer context, pre-estimation values, and product categories to predict the likelihood of conversion to a full installation order.

**Business Purpose**:
- Prioritize high-potential TVs for faster assignment and execution
- Help sales teams focus on most promising leads
- Optimize resource allocation based on conversion probability
- Provide data-driven insights for sales forecasting

**Scoring Output**:
- **Sales Potential**: LOW / MEDIUM / HIGH
- **Confidence Score**: 0-100
- **Reasoning**: Explainable factors contributing to the score

### 11.2 Model Architecture

**Algorithm**: XGBoost (Gradient Boosting Classifier)

**Why XGBoost?**
- Excellent performance on structured/tabular data
- Built-in feature importance for explainability
- Handles missing values naturally
- Fast inference (< 50ms per prediction)
- Robust to outliers

**Model Pipeline**:

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Feature Extraction                                 │
│ Extract 15 features from service order + context           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: NLP Processing                                     │
│ Analyze salesman notes with text embeddings                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: XGBoost Prediction                                 │
│ Classify as LOW / MEDIUM / HIGH + confidence score         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Explainability                                     │
│ SHAP values → reasoning for operator transparency          │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Feature Engineering

**15 Features Extracted**:

```typescript
interface SalesPotentialFeatures {
  // 1. Pre-Estimation Features (40% weight)
  preEstimationValue: number | null;        // EUR amount
  preEstimationConfidence: number | null;   // 0-100
  hasPreEstimation: boolean;

  // 2. Product Features (25% weight)
  productCategoryCount: number;             // Number of different categories
  avgProductPrice: number;                  // Average product price
  hasHighValueProducts: boolean;            // Any product > €5000
  productCategories: string[];              // ["KITCHEN", "APPLIANCES"]

  // 3. Customer Features (20% weight)
  customerHistoricalOrders: number;         // Past orders count
  customerAvgOrderValue: number;            // Historical average spend
  customerProjectCount: number;             // Past projects count
  isReturningCustomer: boolean;

  // 4. Salesman Notes NLP (10% weight)
  salesmanNotesEmbedding: number[];         // 384-dim vector (text-embedding-3-small)
  salesmanNotesLength: number;              // Character count
  salesmanSentiment: number;                // -1 to +1 (positive/negative)

  // 5. Contextual Features (5% weight)
  salesChannel: string;                     // "store", "web", "phone"
}

async function extractSalesPotentialFeatures(
  serviceOrder: ServiceOrder
): Promise<SalesPotentialFeatures> {
  // Fetch pre-estimation if available
  const preEstimation = serviceOrder.salesPreEstimationId
    ? await salesPreEstimationRepo.findById(serviceOrder.salesPreEstimationId)
    : null;

  // Fetch customer history
  const customerHistory = await serviceOrderRepo.findByCustomer(
    serviceOrder.customerId,
    { excludeStatus: ['CANCELLED'] }
  );

  // NLP analysis of salesman notes
  const notesEmbedding = serviceOrder.salesmanNotes
    ? await getTextEmbedding(serviceOrder.salesmanNotes)
    : null;

  const sentiment = serviceOrder.salesmanNotes
    ? await analyzeSentiment(serviceOrder.salesmanNotes)
    : 0;

  // Product analysis
  const products = serviceOrder.products;
  const productCategories = [...new Set(products.map(p => p.category))];
  const avgProductPrice = products.reduce((sum, p) => sum + p.unitPrice, 0) / products.length;
  const hasHighValueProducts = products.some(p => p.unitPrice > 5000);

  return {
    // Pre-estimation
    preEstimationValue: preEstimation?.estimatedValue || null,
    preEstimationConfidence: preEstimation?.confidenceLevel === 'HIGH' ? 100 :
                             preEstimation?.confidenceLevel === 'MEDIUM' ? 70 : 50,
    hasPreEstimation: preEstimation !== null,

    // Products
    productCategoryCount: productCategories.length,
    avgProductPrice,
    hasHighValueProducts,
    productCategories,

    // Customer
    customerHistoricalOrders: customerHistory.length,
    customerAvgOrderValue: customerHistory.reduce((sum, o) => sum + o.totalAmount, 0) /
                          (customerHistory.length || 1),
    customerProjectCount: new Set(customerHistory.map(o => o.projectId)).size,
    isReturningCustomer: customerHistory.length > 0,

    // Salesman notes
    salesmanNotesEmbedding: notesEmbedding || [],
    salesmanNotesLength: serviceOrder.salesmanNotes?.length || 0,
    salesmanSentiment: sentiment,

    // Context
    salesChannel: serviceOrder.sourceSystem
  };
}
```

### 11.4 Training Pipeline

```typescript
interface TrainingConfig {
  algorithm: 'xgboost';
  hyperparameters: {
    n_estimators: number;      // 100
    max_depth: number;          // 6
    learning_rate: number;      // 0.1
    subsample: number;          // 0.8
    colsample_bytree: number;   // 0.8
    objective: string;          // 'multi:softprob' (3-class)
    eval_metric: string;        // 'mlogloss'
  };

  trainingData: {
    minSamples: number;         // 1000+ labeled examples
    classBalance: {
      LOW: number;              // 50%
      MEDIUM: number;           // 30%
      HIGH: number;             // 20%
    };
  };

  validation: {
    method: 'k-fold';
    folds: number;              // 5
    stratified: boolean;        // true
  };
}

// Training script (Python with XGBoost)
class SalesPotentialTrainer {
  async train(): Promise<ModelArtifact> {
    // 1. Load historical TV/Quotation orders with outcomes
    const trainingData = await this.loadTrainingData();

    // 2. Feature engineering
    const X = trainingData.map(order => this.extractFeatures(order));
    const y = trainingData.map(order => this.getLabel(order)); // LOW/MEDIUM/HIGH

    // 3. Train XGBoost model
    const model = new XGBoostClassifier({
      n_estimators: 100,
      max_depth: 6,
      learning_rate: 0.1,
      objective: 'multi:softprob',
      eval_metric: 'mlogloss'
    });

    model.fit(X, y);

    // 4. Validate
    const scores = await this.crossValidate(model, X, y);

    // 5. Export model
    return this.exportModel(model, scores);
  }

  private getLabel(order: ServiceOrder): string {
    // Label based on actual outcome
    if (order.convertedToInstallation && order.actualRevenue > 10000) {
      return 'HIGH';
    } else if (order.convertedToInstallation && order.actualRevenue > 3000) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }
}
```

### 11.5 Inference & Scoring

```typescript
interface SalesPotentialPrediction {
  potential: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;              // 0-100
  confidence: number;         // 0-100
  reasoning: string[];
  featureImportance: {
    feature: string;
    contribution: number;     // SHAP value
  }[];
}

class SalesPotentialScorer {
  private model: XGBoostModel;

  async score(serviceOrder: ServiceOrder): Promise<SalesPotentialPrediction> {
    // 1. Extract features
    const features = await extractSalesPotentialFeatures(serviceOrder);

    // 2. Run inference
    const prediction = await this.model.predict(features);
    // prediction = { probabilities: [0.2, 0.3, 0.5], predicted_class: 'HIGH' }

    // 3. Calculate confidence
    const maxProba = Math.max(...prediction.probabilities);
    const confidence = Math.round(maxProba * 100);

    // 4. Map to potential level
    const potential = prediction.predicted_class as 'LOW' | 'MEDIUM' | 'HIGH';
    const score = this.potentialToScore(potential, maxProba);

    // 5. Explainability with SHAP
    const shapValues = await this.model.explainPrediction(features);
    const featureImportance = this.getTopFeatures(shapValues, 5);
    const reasoning = this.generateReasoning(featureImportance, features);

    return {
      potential,
      score,
      confidence,
      reasoning,
      featureImportance
    };
  }

  private potentialToScore(potential: string, probability: number): number {
    const baseScores = { LOW: 25, MEDIUM: 60, HIGH: 85 };
    const base = baseScores[potential];
    return Math.round(base + (probability - 0.5) * 30); // Adjust ±15 based on confidence
  }

  private generateReasoning(
    featureImportance: { feature: string; contribution: number }[],
    features: SalesPotentialFeatures
  ): string[] {
    const reasoning: string[] = [];

    for (const { feature, contribution } of featureImportance) {
      if (feature === 'preEstimationValue' && features.preEstimationValue) {
        reasoning.push(
          `High pre-estimation value: €${features.preEstimationValue.toLocaleString()} (+${Math.abs(contribution).toFixed(1)} score)`
        );
      } else if (feature === 'hasHighValueProducts' && features.hasHighValueProducts) {
        reasoning.push(
          `Contains high-value products (>€5000) (+${Math.abs(contribution).toFixed(1)} score)`
        );
      } else if (feature === 'salesmanSentiment' && features.salesmanSentiment > 0.5) {
        reasoning.push(
          `Positive salesman sentiment in notes (+${Math.abs(contribution).toFixed(1)} score)`
        );
      } else if (feature === 'isReturningCustomer' && features.isReturningCustomer) {
        reasoning.push(
          `Returning customer with ${features.customerHistoricalOrders} past orders (+${Math.abs(contribution).toFixed(1)} score)`
        );
      }
    }

    return reasoning;
  }
}
```

### 11.6 Triggering Logic

**When Sales Potential Assessment Runs**:

1. **On TV/Quotation Creation** (service type filter)
2. **On Salesman Notes Update** (operator adds/edits notes)
3. **On Pre-Estimation Link** (sales system sends pre-estimation)

**Event Handler**:

```typescript
// Trigger 1: Service Order Created
eventBus.subscribe('projects.service_order.created', async (event) => {
  const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId);

  if (['TV', 'QUOTATION'].includes(serviceOrder.serviceType)) {
    const scorer = new SalesPotentialScorer();
    const prediction = await scorer.score(serviceOrder);

    await serviceOrder.updateSalesPotential(
      prediction.potential,
      prediction.score,
      new DateTime()
    );

    await serviceOrderRepo.save(serviceOrder);
  }
});

// Trigger 2: Salesman Notes Updated
eventBus.subscribe('projects.salesman_notes.updated', async (event) => {
  const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId);

  const scorer = new SalesPotentialScorer();
  const prediction = await scorer.score(serviceOrder);

  await serviceOrder.updateSalesPotential(
    prediction.potential,
    prediction.score,
    new DateTime()
  );

  await serviceOrderRepo.save(serviceOrder);
});

// Trigger 3: Pre-Estimation Linked
eventBus.subscribe('sales.pre_estimation.linked', async (event) => {
  const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId);

  const scorer = new SalesPotentialScorer();
  const prediction = await scorer.score(serviceOrder);

  await serviceOrder.updateSalesPotential(
    prediction.potential,
    prediction.score,
    new DateTime()
  );

  await serviceOrderRepo.save(serviceOrder);
});
```

### 11.7 Model Performance Metrics

**Target Metrics**:

| Metric | Target | Description |
|--------|--------|-------------|
| **Accuracy** | ≥ 75% | Overall 3-class classification accuracy |
| **Precision (HIGH)** | ≥ 80% | Of predicted HIGH, % actually HIGH |
| **Recall (HIGH)** | ≥ 70% | Of actual HIGH, % correctly identified |
| **F1-Score** | ≥ 0.75 | Harmonic mean of precision/recall |
| **Inference Latency** | < 50ms | Prediction time per service order |

**Monitoring**:
- Weekly model performance reports
- Monthly retraining with new labeled data (500+ samples)
- A/B testing of model versions before deployment

---

## 12. Risk Assessment Scorer (v2.0)

### 12.1 Overview

The **Risk Assessment Scorer** is an AI/ML model that proactively identifies service orders at risk of failure, delays, or customer dissatisfaction. It analyzes historical patterns, provider quality metrics, customer behavior, and operational signals to predict risk levels.

**Business Purpose**:
- Early warning system for high-risk service orders
- Proactive intervention before issues escalate
- Reduce rework, cancellations, and customer complaints
- Improve first-time-fix rate and customer satisfaction

**Scoring Output**:
- **Risk Level**: LOW / MEDIUM / HIGH / CRITICAL
- **Risk Score**: 0-100
- **Risk Factors**: Array of contributing factors with severity
- **Recommended Actions**: Operator guidance

### 12.2 Model Architecture

**Algorithm**: Random Forest Classifier

**Why Random Forest?**
- Robust to class imbalance (most orders are LOW risk)
- Handles non-linear relationships well
- Feature importance for explainability
- Less prone to overfitting than single decision trees
- Performs well with mixed data types

**Model Pipeline**:

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Feature Extraction                                 │
│ Extract 20+ features from service order history            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Risk Factor Detection                              │
│ Identify known risk signals (claims, reschedules, etc.)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Random Forest Prediction                           │
│ Classify as LOW / MEDIUM / HIGH / CRITICAL + score         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Risk Factor Ranking                                │
│ Rank contributing factors by severity                      │
└─────────────────────────────────────────────────────────────┘
```

### 12.3 Feature Engineering

**20 Features Extracted**:

```typescript
interface RiskAssessmentFeatures {
  // 1. Claim History (25% weight)
  claimCount: number;                       // Total claims on this order
  claimSeverityMax: number;                 // 1-5 scale
  hasOpenClaims: boolean;
  claimRecencyDays: number | null;          // Days since last claim

  // 2. Reschedule History (20% weight)
  rescheduleCount: number;                  // Total reschedules
  consecutiveReschedules: number;           // Back-to-back reschedules
  rescheduleRecencyDays: number | null;     // Days since last reschedule
  rescheduleInitiator: string | null;       // "provider", "customer", "system"

  // 3. Provider Quality (20% weight)
  providerQualityScore: number;             // 0-100 (historical performance)
  providerFirstTimeFixRate: number;         // 0-1
  providerComplaintRate: number;            // Complaints per 100 orders
  providerCancellationRate: number;         // Cancellations per 100 orders

  // 4. Service Order Complexity (15% weight)
  productCount: number;
  estimatedDurationMinutes: number;
  isMultiProviderRequired: boolean;
  hasDependencies: boolean;                 // Linked to other orders
  serviceTypeRiskScore: number;             // Pre-defined risk by type

  // 5. Customer History (10% weight)
  customerComplaintCount: number;           // Past complaints
  customerCancellationRate: number;         // % of orders cancelled
  customerAvgRating: number;                // 1-5 stars

  // 6. Checkout & Payment (5% weight)
  hasIncompleteCheckout: boolean;           // Previous checkout incomplete
  hasPaymentIssues: boolean;                // Past payment failures

  // 7. Temporal Factors (5% weight)
  daysUntilScheduled: number;               // Days until scheduled date
  isRushOrder: boolean;                     // Scheduled within 48h
  orderAge: number;                         // Days since order created
}

async function extractRiskAssessmentFeatures(
  serviceOrder: ServiceOrder
): Promise<RiskAssessmentFeatures> {
  // Fetch claim history
  const claims = await claimRepo.findByServiceOrder(serviceOrder.id);
  const hasOpenClaims = claims.some(c => c.status === 'OPEN');
  const claimRecency = claims.length > 0
    ? differenceInDays(new Date(), claims[0].createdAt)
    : null;

  // Fetch reschedule history
  const reschedules = await rescheduleRepo.findByServiceOrder(serviceOrder.id);
  const lastReschedule = reschedules[0];

  // Fetch provider metrics
  const provider = await providerRepo.findById(serviceOrder.assignedProviderId);
  const providerMetrics = await providerMetricsRepo.findById(provider.id);

  // Fetch customer history
  const customerOrders = await serviceOrderRepo.findByCustomer(serviceOrder.customerId);
  const customerComplaints = await complaintRepo.findByCustomer(serviceOrder.customerId);
  const customerCancellations = customerOrders.filter(o => o.status === 'CANCELLED').length;

  // Fetch checkout history
  const checkouts = await checkoutRepo.findByServiceOrder(serviceOrder.id);
  const hasIncompleteCheckout = checkouts.some(c => c.status === 'INCOMPLETE');

  // Fetch payment history
  const payments = await paymentRepo.findByCustomer(serviceOrder.customerId);
  const hasPaymentIssues = payments.some(p => p.status === 'FAILED');

  // Calculate temporal factors
  const daysUntilScheduled = serviceOrder.scheduledSlot
    ? differenceInDays(serviceOrder.scheduledSlot.timeSlot.startTime, new Date())
    : 999;
  const orderAge = differenceInDays(new Date(), serviceOrder.createdAt);

  return {
    // Claims
    claimCount: claims.length,
    claimSeverityMax: Math.max(...claims.map(c => c.severity), 0),
    hasOpenClaims,
    claimRecencyDays: claimRecency,

    // Reschedules
    rescheduleCount: reschedules.length,
    consecutiveReschedules: this.countConsecutiveReschedules(reschedules),
    rescheduleRecencyDays: lastReschedule
      ? differenceInDays(new Date(), lastReschedule.createdAt)
      : null,
    rescheduleInitiator: lastReschedule?.initiatedBy || null,

    // Provider
    providerQualityScore: providerMetrics.overallQualityScore,
    providerFirstTimeFixRate: providerMetrics.firstTimeFixRate,
    providerComplaintRate: providerMetrics.complaintRate,
    providerCancellationRate: providerMetrics.cancellationRate,

    // Complexity
    productCount: serviceOrder.products.length,
    estimatedDurationMinutes: serviceOrder.estimatedDuration.minutes,
    isMultiProviderRequired: serviceOrder.products.length > 5,
    hasDependencies: serviceOrder.linkedOrders.length > 0,
    serviceTypeRiskScore: this.getServiceTypeRiskScore(serviceOrder.serviceType),

    // Customer
    customerComplaintCount: customerComplaints.length,
    customerCancellationRate: customerCancellations / customerOrders.length,
    customerAvgRating: this.calculateAvgRating(customerOrders),

    // Checkout & Payment
    hasIncompleteCheckout,
    hasPaymentIssues,

    // Temporal
    daysUntilScheduled,
    isRushOrder: daysUntilScheduled <= 2,
    orderAge
  };
}
```

### 12.4 Training Pipeline

```typescript
interface RiskTrainingConfig {
  algorithm: 'random_forest';
  hyperparameters: {
    n_estimators: number;       // 200
    max_depth: number;           // 10
    min_samples_split: number;   // 10
    min_samples_leaf: number;    // 5
    class_weight: 'balanced';    // Handle class imbalance
    random_state: number;        // 42 (reproducibility)
  };

  trainingData: {
    minSamples: number;          // 5000+ labeled examples
    classBalance: {
      LOW: number;               // 70%
      MEDIUM: number;            // 20%
      HIGH: number;              // 8%
      CRITICAL: number;          // 2%
    };
    samplingStrategy: 'SMOTE';   // Synthetic Minority Over-sampling
  };
}

// Training script (Python with scikit-learn)
class RiskAssessmentTrainer {
  async train(): Promise<ModelArtifact> {
    // 1. Load historical service orders with outcomes
    const trainingData = await this.loadTrainingData();

    // 2. Feature engineering
    const X = trainingData.map(order => this.extractFeatures(order));
    const y = trainingData.map(order => this.getLabel(order)); // LOW/MEDIUM/HIGH/CRITICAL

    // 3. Handle class imbalance with SMOTE
    const { X_resampled, y_resampled } = await this.smoteResample(X, y);

    // 4. Train Random Forest model
    const model = new RandomForestClassifier({
      n_estimators: 200,
      max_depth: 10,
      min_samples_split: 10,
      class_weight: 'balanced',
      random_state: 42
    });

    model.fit(X_resampled, y_resampled);

    // 5. Validate
    const scores = await this.crossValidate(model, X_resampled, y_resampled);

    // 6. Export model
    return this.exportModel(model, scores);
  }

  private getLabel(order: ServiceOrder): string {
    // Label based on actual outcome
    const hadCriticalIssue = order.claims.some(c => c.severity >= 4) ||
                            order.customerSatisfaction <= 2;
    const hadHighIssue = order.claims.some(c => c.severity === 3) ||
                        order.rescheduleCount >= 3 ||
                        order.customerSatisfaction === 3;
    const hadMediumIssue = order.claims.length > 0 ||
                          order.rescheduleCount >= 2;

    if (hadCriticalIssue) return 'CRITICAL';
    if (hadHighIssue) return 'HIGH';
    if (hadMediumIssue) return 'MEDIUM';
    return 'LOW';
  }
}
```

### 12.5 Inference & Scoring

```typescript
interface RiskAssessmentPrediction {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;          // 0-100
  confidence: number;         // 0-100
  riskFactors: RiskFactor[];
  recommendedActions: string[];
}

interface RiskFactor {
  factor: string;              // "MULTIPLE_RESCHEDULES"
  description: string;         // Human-readable description
  weight: number;              // 0.0-1.0 (contribution to risk score)
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class RiskAssessmentScorer {
  private model: RandomForestModel;

  async score(serviceOrder: ServiceOrder, triggeredBy: string): Promise<RiskAssessmentPrediction> {
    // 1. Extract features
    const features = await extractRiskAssessmentFeatures(serviceOrder);

    // 2. Run inference
    const prediction = await this.model.predict(features);
    // prediction = { probabilities: [0.6, 0.25, 0.1, 0.05], predicted_class: 'LOW' }

    // 3. Calculate confidence
    const maxProba = Math.max(...prediction.probabilities);
    const confidence = Math.round(maxProba * 100);

    // 4. Map to risk level
    const riskLevel = prediction.predicted_class as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    const riskScore = this.riskToScore(riskLevel, prediction.probabilities);

    // 5. Identify risk factors
    const riskFactors = await this.identifyRiskFactors(features, prediction);

    // 6. Generate recommended actions
    const recommendedActions = this.generateActions(riskLevel, riskFactors);

    return {
      riskLevel,
      riskScore,
      confidence,
      riskFactors,
      recommendedActions
    };
  }

  private riskToScore(
    riskLevel: string,
    probabilities: number[]
  ): number {
    // Map 4-class probabilities to 0-100 score
    const levelScores = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    const weightedScore = probabilities.reduce(
      (sum, prob, idx) => sum + prob * (idx * 33.33),
      0
    );
    return Math.round(weightedScore);
  }

  private async identifyRiskFactors(
    features: RiskAssessmentFeatures,
    prediction: any
  ): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Use feature importance from Random Forest
    const featureImportance = await this.model.getFeatureImportance();

    // Identify top contributing factors
    if (features.claimCount >= 2) {
      factors.push({
        factor: 'MULTIPLE_CLAIMS',
        description: `${features.claimCount} claims filed on this service order`,
        weight: featureImportance['claimCount'],
        severity: features.claimCount >= 3 ? 'CRITICAL' : 'HIGH'
      });
    }

    if (features.rescheduleCount >= 3) {
      factors.push({
        factor: 'MULTIPLE_RESCHEDULES',
        description: `Rescheduled ${features.rescheduleCount} times`,
        weight: featureImportance['rescheduleCount'],
        severity: features.rescheduleCount >= 4 ? 'CRITICAL' : 'HIGH'
      });
    }

    if (features.providerQualityScore < 60) {
      factors.push({
        factor: 'LOW_PROVIDER_QUALITY',
        description: `Provider quality score: ${features.providerQualityScore}/100`,
        weight: featureImportance['providerQualityScore'],
        severity: features.providerQualityScore < 40 ? 'CRITICAL' : 'HIGH'
      });
    }

    if (features.hasIncompleteCheckout) {
      factors.push({
        factor: 'INCOMPLETE_CHECKOUT',
        description: 'Previous checkout incomplete or missing signatures',
        weight: featureImportance['hasIncompleteCheckout'],
        severity: 'MEDIUM'
      });
    }

    if (features.hasPaymentIssues) {
      factors.push({
        factor: 'PAYMENT_ISSUES',
        description: 'Customer has past payment failures',
        weight: featureImportance['hasPaymentIssues'],
        severity: 'MEDIUM'
      });
    }

    if (features.customerComplaintCount >= 2) {
      factors.push({
        factor: 'CUSTOMER_COMPLAINTS',
        description: `Customer has ${features.customerComplaintCount} past complaints`,
        weight: featureImportance['customerComplaintCount'],
        severity: features.customerComplaintCount >= 3 ? 'HIGH' : 'MEDIUM'
      });
    }

    // Sort by weight (most important first)
    factors.sort((a, b) => b.weight - a.weight);

    return factors;
  }

  private generateActions(
    riskLevel: string,
    riskFactors: RiskFactor[]
  ): string[] {
    const actions: string[] = [];

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      actions.push('⚠️ URGENT: Review service order before check-in');
      actions.push('Contact customer to confirm appointment and requirements');
    }

    if (riskFactors.some(f => f.factor === 'MULTIPLE_RESCHEDULES')) {
      actions.push('Verify availability and address customer scheduling constraints');
    }

    if (riskFactors.some(f => f.factor === 'LOW_PROVIDER_QUALITY')) {
      actions.push('Consider reassigning to higher-rated provider if possible');
    }

    if (riskFactors.some(f => f.factor === 'INCOMPLETE_CHECKOUT')) {
      actions.push('Ensure Work Closing Form is completed thoroughly');
    }

    if (riskFactors.some(f => f.factor === 'CUSTOMER_COMPLAINTS')) {
      actions.push('Flag for senior technician or supervisor oversight');
    }

    return actions;
  }
}
```

### 12.6 Triggering Logic

**When Risk Assessment Runs**:

1. **Daily Batch Job** (midnight, for orders starting in 2 days OR in progress)
2. **Event-Triggered** (claim filed, reschedule, incomplete checkout, payment failed)

**Batch Job (Cron)**:

```typescript
// Daily risk assessment at midnight
cron.schedule('0 0 * * *', async () => {
  const twoDaysFromNow = DateTime.now().plus({ days: 2 });

  const serviceOrders = await serviceOrderRepo.find({
    $or: [
      { status: 'IN_PROGRESS' },
      {
        scheduledDate: { $lte: twoDaysFromNow },
        status: { $in: ['SCHEDULED', 'ASSIGNED'] }
      }
    ]
  });

  const scorer = new RiskAssessmentScorer();

  for (const so of serviceOrders) {
    const prediction = await scorer.score(so, 'BATCH_JOB');

    await so.updateRiskAssessment(
      prediction.riskLevel,
      prediction.riskScore,
      prediction.riskFactors,
      DateTime.now()
    );

    await serviceOrderRepo.save(so);
  }
});
```

**Event Handlers**:

```typescript
// Trigger 1: Claim Filed
eventBus.subscribe('support.claim.filed', async (event) => {
  const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId);

  const scorer = new RiskAssessmentScorer();
  const prediction = await scorer.score(serviceOrder, 'EVENT_CLAIM_FILED');

  await serviceOrder.updateRiskAssessment(
    prediction.riskLevel,
    prediction.riskScore,
    prediction.riskFactors,
    DateTime.now()
  );

  await serviceOrderRepo.save(serviceOrder);
});

// Trigger 2: Service Order Rescheduled (3rd+ reschedule)
eventBus.subscribe('scheduling.service_order.rescheduled', async (event) => {
  const rescheduleCount = await rescheduleRepo.countByServiceOrder(event.serviceOrderId);

  if (rescheduleCount >= 3) {
    const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId);

    const scorer = new RiskAssessmentScorer();
    const prediction = await scorer.score(serviceOrder, 'EVENT_MULTIPLE_RESCHEDULES');

    await serviceOrder.updateRiskAssessment(
      prediction.riskLevel,
      prediction.riskScore,
      prediction.riskFactors,
      DateTime.now()
    );

    await serviceOrderRepo.save(serviceOrder);
  }
});

// Trigger 3: Checkout Incomplete
eventBus.subscribe('execution.checkout.completed', async (event) => {
  if (event.status === 'INCOMPLETE') {
    const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId);

    const scorer = new RiskAssessmentScorer();
    const prediction = await scorer.score(serviceOrder, 'EVENT_CHECKOUT_INCOMPLETE');

    await serviceOrder.updateRiskAssessment(
      prediction.riskLevel,
      prediction.riskScore,
      prediction.riskFactors,
      DateTime.now()
    );

    await serviceOrderRepo.save(serviceOrder);
  }
});

// Trigger 4: Payment Failed
eventBus.subscribe('payments.payment.failed', async (event) => {
  const serviceOrders = await serviceOrderRepo.findBySalesOrderId(event.salesOrderId);

  const scorer = new RiskAssessmentScorer();

  for (const so of serviceOrders) {
    const prediction = await scorer.score(so, 'EVENT_PAYMENT_FAILED');

    await so.updateRiskAssessment(
      prediction.riskLevel,
      prediction.riskScore,
      prediction.riskFactors,
      DateTime.now()
    );

    await serviceOrderRepo.save(so);
  }
});
```

### 12.7 High Risk Handling

**When HIGH or CRITICAL risk is detected**:

```typescript
// Automatically create operator task for review
eventBus.subscribe('projects.risk.assessed', async (event) => {
  if (event.riskLevel === 'HIGH' || event.riskLevel === 'CRITICAL') {
    const serviceOrder = await serviceOrderRepo.findById(event.serviceOrderId);
    const project = await projectRepo.findById(serviceOrder.projectId);

    await taskService.createTask({
      type: 'SERVICE_ORDER_RISK_REVIEW',
      priority: event.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      serviceOrderId: event.serviceOrderId,
      assignedTo: project.responsibleOperatorId,
      dueDate: DateTime.now().plus({ hours: 4 }), // 4-hour SLA
      context: {
        riskLevel: event.riskLevel,
        riskScore: event.riskScore,
        riskFactors: event.riskFactors,
        recommendedActions: event.recommendedActions
      }
    });

    // Send alert notification
    await notificationService.send({
      recipientId: project.responsibleOperatorId,
      type: 'RISK_ALERT',
      priority: event.riskLevel,
      title: `${event.riskLevel} Risk Detected`,
      message: `Service Order ${serviceOrder.orderNumber} has ${event.riskLevel.toLowerCase()} risk`,
      actionUrl: `/service-orders/${serviceOrder.id}/risk-review`
    });
  }
});
```

**Operator Acknowledgment Required**:

```typescript
// Before check-in, operator must acknowledge HIGH/CRITICAL risk
async function performCheckIn(
  serviceOrderId: string,
  operatorId: string
): Promise<Result<void>> {
  const serviceOrder = await serviceOrderRepo.findById(serviceOrderId);

  if (['HIGH', 'CRITICAL'].includes(serviceOrder.riskLevel)) {
    if (!serviceOrder.isRiskAcknowledged) {
      return Result.fail(
        'Service order has HIGH/CRITICAL risk. Must acknowledge risk before check-in.'
      );
    }
  }

  // Proceed with check-in
  return await checkInService.execute(serviceOrderId, operatorId);
}
```

### 12.8 Model Performance Metrics

**Target Metrics**:

| Metric | Target | Description |
|--------|--------|-------------|
| **Accuracy** | ≥ 70% | Overall 4-class classification accuracy |
| **Precision (CRITICAL)** | ≥ 85% | Of predicted CRITICAL, % actually CRITICAL |
| **Recall (CRITICAL)** | ≥ 75% | Of actual CRITICAL, % correctly identified |
| **False Positive Rate** | < 10% | % of LOW risk incorrectly flagged as HIGH/CRITICAL |
| **Inference Latency** | < 100ms | Prediction time per service order |

**Monitoring**:
- Daily risk assessment reports
- Weekly false positive/negative analysis
- Monthly retraining with new labeled data (1000+ samples)
- Quarterly model performance review

---

**End of Document**
