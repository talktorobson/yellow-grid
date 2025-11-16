# Feature Additions Analysis

**Version**: 1.0
**Date**: 2025-01-16
**Status**: Analysis Complete
**Purpose**: Comprehensive analysis of 3 critical features and their system-wide impact

---

## Table of Contents

1. [Overview](#overview)
2. [Feature 1: Project Ownership (Pilote du Chantier)](#feature-1-project-ownership-pilote-du-chantier)
3. [Feature 2: TV/Quotation Sales Potential Assessment](#feature-2-tvquotation-sales-potential-assessment)
4. [Feature 3: Service Order Risk Assessment](#feature-3-service-order-risk-assessment)
5. [Cross-Cutting Concerns](#cross-cutting-concerns)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Files to Update](#files-to-update)

---

## 1. Overview

### New Features Summary

Three critical features must be integrated into the platform:

| Feature | Domain | AI/ML Required | Priority |
|---------|--------|----------------|----------|
| **Project Ownership** | Project Management | No | HIGH |
| **Sales Potential Assessment** | AI/Analytics | Yes | MEDIUM |
| **Risk Assessment** | AI/Analytics | Yes | HIGH |

### Business Impact

**Project Ownership**:
- Operators focus on their project portfolio
- Balanced workload distribution
- Targeted notifications and alerts
- Clear accountability

**Sales Potential Assessment**:
- Prioritize high-potential Technical Visits
- Sales team feedback loop
- Conversion tracking and optimization
- Marketing ROI insights

**Risk Assessment**:
- Proactive issue identification
- Risk mitigation before escalation
- Improved customer satisfaction
- Reduced claims and rework

---

## 1.1. External Sales System References

### Business Requirements

**BR-EXT-001**: Service orders MUST store external references to sales systems for bidirectional traceability:
- **external_sales_order_id**: Original sales order ID from Pyxis/Tempo/SAP
- **external_project_id**: Sales system's project/customer order grouping ID
- **external_lead_id**: Original lead/opportunity ID that generated the sale

**BR-EXT-002**: External references MUST include the source system identifier to handle multi-sales-system reality:
- France: Pyxis
- Spain: Tempo
- Italy: SAP
- Poland: (varies)

**BR-EXT-003**: External references enable:
- Bidirectional traceability (sales ↔ FSM)
- Customer journey tracking (lead → sale → service → completion)
- Sales commission linking
- Pre-estimation matching
- Support troubleshooting
- Analytics and conversion funnel analysis

### Data Model Changes

**Service Orders Table**:
```sql
ALTER TABLE service_orders ADD COLUMN external_sales_order_id VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN external_project_id VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN external_lead_id VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN external_system_source VARCHAR(50); -- 'PYXIS', 'TEMPO', 'SAP', etc.

-- Composite index for external reference lookups
CREATE INDEX idx_so_external_sales_order ON service_orders(external_system_source, external_sales_order_id)
  WHERE external_sales_order_id IS NOT NULL;
CREATE INDEX idx_so_external_project ON service_orders(external_system_source, external_project_id)
  WHERE external_project_id IS NOT NULL;
CREATE INDEX idx_so_external_lead ON service_orders(external_system_source, external_lead_id)
  WHERE external_lead_id IS NOT NULL;
```

**External Reference Mapping Table** (for complex scenarios):
```sql
CREATE TABLE external_reference_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsm_entity_type VARCHAR(50) NOT NULL, -- 'SERVICE_ORDER', 'PROJECT', 'CUSTOMER'
  fsm_entity_id UUID NOT NULL,
  external_system_source VARCHAR(50) NOT NULL,
  external_reference_type VARCHAR(50) NOT NULL, -- 'SALES_ORDER', 'PROJECT', 'LEAD', 'CUSTOMER', 'PRODUCT'
  external_reference_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_external_ref_fsm_entity ON external_reference_mappings(fsm_entity_type, fsm_entity_id);
CREATE INDEX idx_external_ref_external ON external_reference_mappings(
  external_system_source,
  external_reference_type,
  external_reference_id
);
```

### Kafka Integration

**Event from Sales Systems** (enhanced with external references):
```json
{
  "topic": "sales.service_order.created",
  "key": "so_pyxis_12345",
  "value": {
    "event_id": "evt_abc123",
    "event_timestamp": 1705410000000,
    "sales_system_source": "PYXIS",
    "external_sales_order_id": "SO-PYXIS-2025-12345",
    "external_project_id": "PROJ-PYXIS-67890",
    "external_lead_id": "LEAD-PYXIS-11111",
    "customer": {
      "external_customer_id": "CUST-PYXIS-22222",
      "name": "Jean Dupont",
      "email": "jean.dupont@example.com"
    },
    "service_type": "INSTALLATION",
    "products": [...],
    "salesman_id": "SALES-PYXIS-333",
    "salesman_notes": "Customer ready to proceed..."
  }
}
```

**Event Handler**:
```typescript
async function handleSalesServiceOrderCreated(event: SalesServiceOrderCreatedEvent): Promise<void> {
  // Create FSM service order
  const serviceOrder = await serviceOrderService.create({
    // ... service order data
    externalSalesOrderId: event.external_sales_order_id,
    externalProjectId: event.external_project_id,
    externalLeadId: event.external_lead_id,
    externalSystemSource: event.sales_system_source
  });

  // Store detailed external reference mappings
  await externalReferenceMappingRepository.createMultiple([
    {
      fsmEntityType: 'SERVICE_ORDER',
      fsmEntityId: serviceOrder.id,
      externalSystemSource: event.sales_system_source,
      externalReferenceType: 'SALES_ORDER',
      externalReferenceId: event.external_sales_order_id
    },
    {
      fsmEntityType: 'SERVICE_ORDER',
      fsmEntityId: serviceOrder.id,
      externalSystemSource: event.sales_system_source,
      externalReferenceType: 'PROJECT',
      externalReferenceId: event.external_project_id
    },
    {
      fsmEntityType: 'SERVICE_ORDER',
      fsmEntityId: serviceOrder.id,
      externalSystemSource: event.sales_system_source,
      externalReferenceType: 'LEAD',
      externalReferenceId: event.external_lead_id
    }
  ]);
}
```

### API Endpoints

**1. Lookup Service Order by External Reference**
```http
GET /api/v1/service-orders/by-external-reference?system=PYXIS&type=SALES_ORDER&id=SO-PYXIS-2025-12345

Response:
{
  "serviceOrderId": "so_abc123",
  "orderNumber": "SO-2025-001",
  "externalReferences": {
    "salesOrderId": "SO-PYXIS-2025-12345",
    "projectId": "PROJ-PYXIS-67890",
    "leadId": "LEAD-PYXIS-11111",
    "systemSource": "PYXIS"
  },
  "status": "SCHEDULED",
  "scheduledDate": "2025-01-25T09:00:00Z"
}
```

**2. Get External References for Service Order**
```http
GET /api/v1/service-orders/{serviceOrderId}/external-references

Response:
{
  "serviceOrderId": "so_abc123",
  "primaryReferences": {
    "salesOrderId": "SO-PYXIS-2025-12345",
    "projectId": "PROJ-PYXIS-67890",
    "leadId": "LEAD-PYXIS-11111",
    "systemSource": "PYXIS"
  },
  "additionalReferences": [
    {
      "referenceType": "CUSTOMER",
      "referenceId": "CUST-PYXIS-22222",
      "systemSource": "PYXIS"
    }
  ]
}
```

**3. Webhook for Sales Systems (Status Updates)**

Sales systems can subscribe to FSM events via webhook to get real-time status updates:

```http
POST https://pyxis.adeo.com/webhooks/fsm/service-order-status

Payload (sent by FSM):
{
  "event_type": "SERVICE_ORDER_STATUS_CHANGED",
  "event_id": "evt_xyz789",
  "event_timestamp": 1705410000000,
  "fsm_service_order_id": "so_abc123",
  "external_sales_order_id": "SO-PYXIS-2025-12345",
  "external_project_id": "PROJ-PYXIS-67890",
  "previous_status": "SCHEDULED",
  "new_status": "COMPLETED",
  "completed_at": 1705410000000,
  "provider_id": "prov_123",
  "provider_name": "ABC Installers",
  "customer_satisfaction": 5.0
}
```

### Business Value

**For Sales Teams**:
- Real-time visibility into service execution status
- Link service completion to sales commission
- Track lead-to-completion conversion rates
- Customer service: Quickly lookup service status from sales order ID

**For Operators**:
- Access sales context (salesman notes, customer history)
- View pre-estimation linked to service order
- Understand customer's original intent/expectations

**For Analytics**:
- End-to-end funnel analysis (lead → sale → service → satisfaction)
- Identify conversion bottlenecks
- Calculate ROI of marketing campaigns
- Sales team performance tracking

---

## 2. Feature 1: Project Ownership (Pilote du Chantier)

### Business Requirements

**BR-PO-001**: Each project MUST have exactly one responsible operator ("pilote du chantier") at all times.

**BR-PO-002**: Operator assignment can be:
- **Automatic**: Based on workload balancing (sum of total estimated hours across all assigned projects)
- **Manual**: Operator selects project on creation or reassigns later
- Assignment mode is configurable per country

**BR-PO-003**: Operators can take ownership of projects:
- **Single project**: Take ownership of one project
- **Batch**: Apply filter, select multiple projects, take ownership

**BR-PO-004**: Project ownership determines notification routing:
- Customer messages → responsible operator
- Provider messages → responsible operator
- Alerts → responsible operator
- Tasks → responsible operator (if project-related)

**BR-PO-005**: Workload calculation:
```typescript
operatorWorkload = SUM(
  project.serviceOrders
    .filter(so => so.status NOT IN ['CANCELLED', 'COMPLETED', 'CLOSED'])
    .map(so => so.estimatedDuration)
)
```

### Data Model Changes

**Projects Table**:
```sql
ALTER TABLE projects ADD COLUMN responsible_operator_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN assignment_mode VARCHAR(20) CHECK (assignment_mode IN ('AUTO', 'MANUAL'));
ALTER TABLE projects ADD COLUMN assigned_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN assigned_by VARCHAR(100); -- User ID or 'SYSTEM'

CREATE INDEX idx_projects_responsible_operator ON projects(responsible_operator_id);
```

**Operator Workload View** (Materialized for performance):
```sql
CREATE MATERIALIZED VIEW operator_workload AS
SELECT
  p.responsible_operator_id AS operator_id,
  COUNT(DISTINCT p.id) AS total_projects,
  COUNT(so.id) AS total_service_orders,
  SUM(so.estimated_duration_minutes) AS total_workload_minutes,
  SUM(so.estimated_duration_minutes) / 60.0 AS total_workload_hours
FROM projects p
LEFT JOIN service_orders so ON so.project_id = p.id
WHERE so.status NOT IN ('CANCELLED', 'COMPLETED', 'CLOSED')
  AND p.status NOT IN ('CANCELLED', 'COMPLETED')
GROUP BY p.responsible_operator_id;

CREATE UNIQUE INDEX idx_operator_workload_operator ON operator_workload(operator_id);

-- Refresh strategy: Every 5 minutes or on project/service order state change
```

**Project Ownership Audit Table**:
```sql
CREATE TABLE project_ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  previous_operator_id UUID REFERENCES users(id),
  new_operator_id UUID REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by VARCHAR(100) NOT NULL, -- User ID or 'SYSTEM'
  reason VARCHAR(255)
);

CREATE INDEX idx_ownership_history_project ON project_ownership_history(project_id);
CREATE INDEX idx_ownership_history_operator ON project_ownership_history(new_operator_id);
```

### API Endpoints

**1. Get Operator Workload**
```http
GET /api/v1/operators/{operatorId}/workload

Response:
{
  "operatorId": "op_123",
  "totalProjects": 12,
  "totalServiceOrders": 47,
  "totalWorkloadMinutes": 2820,
  "totalWorkloadHours": 47.0,
  "averageProjectHours": 3.92,
  "projectBreakdown": [
    {
      "projectId": "proj_abc",
      "projectName": "Dupont Kitchen",
      "serviceOrderCount": 5,
      "totalHours": 8.5,
      "urgentCount": 2
    }
  ]
}
```

**2. Assign Project Operator (Single)**
```http
POST /api/v1/projects/{projectId}/assign-operator

Request:
{
  "operatorId": "op_123",
  "reason": "Taking ownership to focus on high-value customer"
}

Response:
{
  "projectId": "proj_abc",
  "responsibleOperatorId": "op_123",
  "assignedAt": "2025-01-16T10:30:00Z",
  "assignedBy": "op_456",
  "previousOperatorId": "op_789"
}
```

**3. Batch Assign Projects**
```http
POST /api/v1/projects/batch-assign

Request:
{
  "projectIds": ["proj_001", "proj_002", "proj_003"],
  "operatorId": "op_123",
  "reason": "Reassigning due to operator absence"
}

Response:
{
  "successCount": 3,
  "failureCount": 0,
  "results": [
    {
      "projectId": "proj_001",
      "status": "SUCCESS",
      "assignedAt": "2025-01-16T10:35:00Z"
    }
  ]
}
```

**4. Get My Projects (Operator Portfolio)**
```http
GET /api/v1/operators/me/projects?status=ACTIVE&sortBy=urgency

Response:
{
  "data": [
    {
      "projectId": "proj_abc",
      "projectName": "Dupont Kitchen Renovation",
      "customerName": "Jean Dupont",
      "totalServiceOrders": 5,
      "completedServiceOrders": 2,
      "urgentServiceOrders": 1,
      "totalEstimatedHours": 12.5,
      "nextAppointment": "2025-01-20T09:00:00Z",
      "alertCount": 2,
      "unreadMessages": 3
    }
  ],
  "pagination": { "page": 1, "totalItems": 12 }
}
```

**5. Auto-Assign Project to Best Available Operator**
```http
POST /api/v1/projects/{projectId}/auto-assign

Request:
{
  "considerWorkload": true,
  "considerExpertise": true,
  "maxWorkloadHours": 60 // Don't assign if operator already has 60+ hours
}

Response:
{
  "projectId": "proj_abc",
  "responsibleOperatorId": "op_123",
  "assignmentReason": "Lowest workload (32.5 hours), has kitchen expertise",
  "assignmentScore": 87.5,
  "alternativeCandidates": [
    {
      "operatorId": "op_456",
      "score": 82.0,
      "reason": "Medium workload (45 hours), general expertise"
    }
  ]
}
```

### Auto-Assignment Algorithm

```typescript
interface OperatorAssignmentScore {
  operatorId: string;
  score: number; // 0-100
  breakdown: {
    workloadScore: number; // 0-40 points (lower workload = higher score)
    expertiseScore: number; // 0-30 points (relevant skills/experience)
    availabilityScore: number; // 0-15 points (online, not overloaded)
    geographicScore: number; // 0-10 points (manages same region)
    performanceScore: number; // 0-5 points (past project success rate)
  };
  currentWorkloadHours: number;
}

async function findBestOperatorForProject(
  project: Project,
  constraints: AssignmentConstraints
): Promise<OperatorAssignmentScore> {
  // Get all eligible operators
  const operators = await operatorRepository.findByCountryAndBU(
    project.countryCode,
    project.businessUnit
  );

  // Score each operator
  const scores: OperatorAssignmentScore[] = [];

  for (const operator of operators) {
    const workload = await getOperatorWorkload(operator.id);

    // Skip if over max workload
    if (constraints.maxWorkloadHours && workload.totalHours > constraints.maxWorkloadHours) {
      continue;
    }

    // 1. Workload Score (40 points max) - Lower workload = higher score
    // Linear scale: 0 hours = 40 points, 60 hours = 0 points
    const workloadScore = Math.max(0, 40 - (workload.totalHours / 60) * 40);

    // 2. Expertise Score (30 points max)
    const projectSkills = project.serviceOrders.flatMap(so => so.requiredSkills);
    const matchingSkills = operator.skills.filter(s => projectSkills.includes(s));
    const expertiseScore = Math.min(30, matchingSkills.length * 10);

    // 3. Availability Score (15 points max)
    const isOnline = operator.status === 'ONLINE';
    const isNotBusy = workload.totalProjects < 15;
    const availabilityScore = (isOnline ? 10 : 0) + (isNotBusy ? 5 : 0);

    // 4. Geographic Score (10 points max)
    const managesRegion = operator.managedRegions.includes(project.region);
    const geographicScore = managesRegion ? 10 : 0;

    // 5. Performance Score (5 points max)
    const successRate = await getOperatorProjectSuccessRate(operator.id);
    const performanceScore = (successRate / 100) * 5;

    const totalScore =
      workloadScore +
      expertiseScore +
      availabilityScore +
      geographicScore +
      performanceScore;

    scores.push({
      operatorId: operator.id,
      score: totalScore,
      breakdown: {
        workloadScore,
        expertiseScore,
        availabilityScore,
        geographicScore,
        performanceScore
      },
      currentWorkloadHours: workload.totalHours
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores[0]; // Return best match
}
```

### Country-Specific Assignment Rules

```typescript
interface CountryAssignmentRule {
  countryCode: string;
  defaultMode: 'AUTO' | 'MANUAL';
  autoAssignmentEnabled: boolean;
  maxWorkloadHours: number;
  requireExpertiseMatch: boolean;
}

const assignmentRules: Record<string, CountryAssignmentRule> = {
  'FR': {
    countryCode: 'FR',
    defaultMode: 'AUTO',
    autoAssignmentEnabled: true,
    maxWorkloadHours: 60,
    requireExpertiseMatch: false
  },
  'ES': {
    countryCode: 'ES',
    defaultMode: 'MANUAL',
    autoAssignmentEnabled: false,
    maxWorkloadHours: 50,
    requireExpertiseMatch: true
  },
  'IT': {
    countryCode: 'IT',
    defaultMode: 'AUTO',
    autoAssignmentEnabled: true,
    maxWorkloadHours: 55,
    requireExpertiseMatch: false
  },
  'PL': {
    countryCode: 'PL',
    defaultMode: 'MANUAL',
    autoAssignmentEnabled: false,
    maxWorkloadHours: 45,
    requireExpertiseMatch: true
  }
};
```

### Notification Filtering

**Updated Notification Routing Logic**:

```typescript
async function routeNotificationForProject(
  projectId: string,
  notification: Notification
): Promise<string[]> {
  const project = await projectRepository.findById(projectId);

  // Route to responsible operator
  const recipients: string[] = [project.responsibleOperatorId];

  // For critical notifications, also notify team lead
  if (notification.priority === 'CRITICAL') {
    const operator = await userRepository.findById(project.responsibleOperatorId);
    if (operator.managerId) {
      recipients.push(operator.managerId);
    }
  }

  return recipients;
}

async function filterTasksForOperator(operatorId: string): Promise<Task[]> {
  // Get all projects managed by this operator
  const projects = await projectRepository.findByResponsibleOperator(operatorId);
  const projectIds = projects.map(p => p.id);

  // Get tasks for these projects
  const tasks = await taskRepository.findByProjects(projectIds);

  // Also get tasks directly assigned to operator (non-project tasks)
  const directTasks = await taskRepository.findByAssignedTo(operatorId);

  return [...tasks, ...directTasks];
}
```

---

## 3. Feature 2: TV/Quotation Sales Potential Assessment

### Business Requirements

**BR-SP-001**: Only service orders with `serviceType` in ['TV', 'QUOTATION'] have sales potential assessment.

**BR-SP-002**: Sales potential has 3 levels:
- **LOW** (default): No indicators of high sales potential
- **MEDIUM**: Some indicators (e.g., customer has 1-2 existing projects, medium pre-estimation)
- **HIGH**: Strong indicators (high pre-estimation, multiple projects, positive salesman notes)

**BR-SP-003**: Sales potential is calculated automatically:
- **On creation**: When TV/Quotation service order is created
- **On update**: When salesman notes are updated
- **On pre-estimation link**: When pre-estimation data received from sales system

**BR-SP-004**: Sales potential assessment uses AI/ML model with inputs:
1. **Salesman notes** (NLP text analysis for positive sentiment, keywords like "high interest", "ready to buy")
2. **Customer context** (number of existing projects, total historical spend)
3. **Pre-estimation value** (if linked to pre-estimation from sales system)
4. **Product categories** (high-margin products increase potential)
5. **Service order metadata** (urgency, customer tier)

**BR-SP-005**: High-potential TVs are prioritized in operator dashboard and assignment.

### Data Model Changes

**Service Orders Table**:
```sql
ALTER TABLE service_orders ADD COLUMN sales_potential VARCHAR(20) DEFAULT 'LOW' CHECK (sales_potential IN ('LOW', 'MEDIUM', 'HIGH'));
ALTER TABLE service_orders ADD COLUMN sales_potential_score DECIMAL(5,2); -- 0.00-100.00
ALTER TABLE service_orders ADD COLUMN sales_potential_updated_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN sales_pre_estimation_id VARCHAR(100); -- ID from sales system
ALTER TABLE service_orders ADD COLUMN sales_pre_estimation_value DECIMAL(12,2);
ALTER TABLE service_orders ADD COLUMN sales_pre_estimation_currency VARCHAR(3);

CREATE INDEX idx_so_sales_potential ON service_orders(sales_potential) WHERE service_type IN ('TV', 'QUOTATION');
CREATE INDEX idx_so_pre_estimation ON service_orders(sales_pre_estimation_id) WHERE sales_pre_estimation_id IS NOT NULL;
```

**Sales Pre-Estimations Table** (stores data from sales systems):
```sql
CREATE TABLE sales_pre_estimations (
  id VARCHAR(100) PRIMARY KEY, -- ID from sales system (Pyxis, Tempo, SAP)
  sales_system_id VARCHAR(50) NOT NULL, -- 'PYXIS', 'TEMPO', 'SAP'
  customer_id UUID NOT NULL REFERENCES customers(id),
  estimated_value DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  product_categories TEXT[] NOT NULL,
  created_at TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  salesman_id VARCHAR(100),
  salesman_notes TEXT,
  confidence_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH'
  metadata JSONB
);

CREATE INDEX idx_pre_estimation_customer ON sales_pre_estimations(customer_id);
CREATE INDEX idx_pre_estimation_value ON sales_pre_estimations(estimated_value DESC);
```

**Sales Potential Assessment History**:
```sql
CREATE TABLE sales_potential_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  assessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  potential_level VARCHAR(20) NOT NULL,
  potential_score DECIMAL(5,2) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  input_features JSONB NOT NULL,
  contributing_factors JSONB NOT NULL
);

CREATE INDEX idx_potential_assessments_so ON sales_potential_assessments(service_order_id);
```

### AI/ML Model: Sales Potential Scorer

**Model Architecture**:
- **Type**: Gradient Boosting Classifier (XGBoost)
- **Inputs**: 15 features (numeric + text embeddings)
- **Output**: Potential score (0-100) + classification (LOW/MEDIUM/HIGH)
- **Training Data**: Historical TV/Quotation conversions

**Features**:

```typescript
interface SalesPotentialFeatures {
  // Text Features (NLP)
  salesmanNotesEmbedding: number[]; // 384-dim vector from text-embedding-3-small
  salesmanNotesSentimentScore: number; // -1.0 to 1.0
  salesmanNotesLength: number;
  hasPositiveKeywords: boolean; // "interested", "ready", "motivated", etc.

  // Customer Context
  customerExistingProjects: number;
  customerHistoricalSpend: number; // Last 12 months
  customerTier: number; // 1 (platinum) to 4 (bronze)
  customerLifetimeValue: number;

  // Pre-Estimation
  hasPreEstimation: boolean;
  preEstimationValue: number;
  preEstimationConfidence: number; // 0-100

  // Product Context
  productCategoryMargin: number; // Average margin % for categories
  productCount: number;

  // Service Order Metadata
  urgencyLevel: number; // 1 (low) to 5 (critical)
  customerRequestedDate: boolean; // True if customer specified date
}
```

**Scoring Algorithm**:

```typescript
async function assessSalesPotential(
  serviceOrder: ServiceOrder
): Promise<SalesPotentialAssessment> {
  // Only assess TV/Quotation service orders
  if (!['TV', 'QUOTATION'].includes(serviceOrder.serviceType)) {
    return {
      potentialLevel: 'N/A',
      potentialScore: 0,
      reason: 'Sales potential assessment only applies to TV/Quotation service orders'
    };
  }

  // Extract features
  const features = await extractSalesPotentialFeatures(serviceOrder);

  // Call ML model
  const prediction = await mlService.predict('sales-potential-scorer', features);

  // Map score to level
  let potentialLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (prediction.score >= 70) {
    potentialLevel = 'HIGH';
  } else if (prediction.score >= 40) {
    potentialLevel = 'MEDIUM';
  } else {
    potentialLevel = 'LOW';
  }

  // Identify contributing factors
  const contributingFactors = await identifyContributingFactors(features, prediction);

  // Save assessment
  await salesPotentialAssessmentRepository.create({
    serviceOrderId: serviceOrder.id,
    assessedAt: new Date(),
    potentialLevel,
    potentialScore: prediction.score,
    modelVersion: prediction.modelVersion,
    inputFeatures: features,
    contributingFactors
  });

  // Update service order
  await serviceOrderRepository.update(serviceOrder.id, {
    salesPotential: potentialLevel,
    salesPotentialScore: prediction.score,
    salesPotentialUpdatedAt: new Date()
  });

  return {
    potentialLevel,
    potentialScore: prediction.score,
    contributingFactors
  };
}

async function extractSalesPotentialFeatures(
  serviceOrder: ServiceOrder
): Promise<SalesPotentialFeatures> {
  // 1. Salesman notes NLP
  const salesmanNotes = serviceOrder.salesmanNotes || '';
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: salesmanNotes
  });
  const sentimentScore = await nlpService.analyzeSentiment(salesmanNotes);
  const hasPositiveKeywords = /interested|ready|motivated|committed|eager/i.test(salesmanNotes);

  // 2. Customer context
  const customer = await customerRepository.findById(serviceOrder.customerId);
  const existingProjects = await projectRepository.countByCustomer(customer.id, {
    statuses: ['ACTIVE', 'IN_PROGRESS']
  });
  const historicalSpend = await getCustomerSpend(customer.id, { last12Months: true });
  const lifetimeValue = await getCustomerLifetimeValue(customer.id);

  // 3. Pre-estimation
  let hasPreEstimation = false;
  let preEstimationValue = 0;
  let preEstimationConfidence = 0;

  if (serviceOrder.salesPreEstimationId) {
    const preEstimation = await salesPreEstimationRepository.findById(
      serviceOrder.salesPreEstimationId
    );
    if (preEstimation) {
      hasPreEstimation = true;
      preEstimationValue = preEstimation.estimatedValue;
      preEstimationConfidence = mapConfidenceLevelToScore(preEstimation.confidenceLevel);
    }
  }

  // 4. Product context
  const products = serviceOrder.products || [];
  const productCategoryMargin = await calculateAverageMargin(
    products.map(p => p.category)
  );

  return {
    salesmanNotesEmbedding: embedding.data[0].embedding,
    salesmanNotesSentimentScore: sentimentScore,
    salesmanNotesLength: salesmanNotes.length,
    hasPositiveKeywords,
    customerExistingProjects: existingProjects,
    customerHistoricalSpend: historicalSpend,
    customerTier: customer.tier,
    customerLifetimeValue: lifetimeValue,
    hasPreEstimation,
    preEstimationValue,
    preEstimationConfidence,
    productCategoryMargin,
    productCount: products.length,
    urgencyLevel: mapPriorityToUrgency(serviceOrder.priority),
    customerRequestedDate: serviceOrder.customerRequestedDate !== undefined
  };
}

function identifyContributingFactors(
  features: SalesPotentialFeatures,
  prediction: any
): string[] {
  const factors: string[] = [];

  if (features.hasPreEstimation && features.preEstimationValue > 5000) {
    factors.push(`High pre-estimation value: €${features.preEstimationValue.toFixed(2)}`);
  }

  if (features.customerExistingProjects > 0) {
    factors.push(`Customer has ${features.customerExistingProjects} active project(s)`);
  }

  if (features.customerTier === 1) {
    factors.push('Platinum tier customer');
  }

  if (features.salesmanNotesSentimentScore > 0.5) {
    factors.push('Positive salesman notes sentiment');
  }

  if (features.hasPositiveKeywords) {
    factors.push('Salesman notes contain positive keywords (interested, ready, etc.)');
  }

  if (features.productCategoryMargin > 30) {
    factors.push(`High-margin product categories (${features.productCategoryMargin.toFixed(1)}%)`);
  }

  return factors;
}
```

### Sales Integration (Pre-Estimation Data)

**Kafka Event from Sales Systems**:

```json
{
  "topic": "sales.pre_estimation.created",
  "key": "pre_est_123",
  "value": {
    "event_id": "evt_abc123",
    "event_timestamp": 1705410000000,
    "pre_estimation_id": "pre_est_123",
    "sales_system_id": "PYXIS",
    "customer_id": "cust_xyz789",
    "estimated_value": 12500.00,
    "currency": "EUR",
    "product_categories": ["KITCHEN", "FLOORING", "BATHROOM"],
    "salesman_id": "sales_456",
    "salesman_notes": "Customer very interested in complete kitchen renovation. Budget confirmed. Ready to proceed after technical visit.",
    "confidence_level": "HIGH",
    "created_at": 1705410000000,
    "valid_until": 1707915600000
  }
}
```

**Event Handler**:

```typescript
async function handlePreEstimationCreated(event: PreEstimationCreatedEvent): Promise<void> {
  // 1. Store pre-estimation
  await salesPreEstimationRepository.create({
    id: event.pre_estimation_id,
    salesSystemId: event.sales_system_id,
    customerId: event.customer_id,
    estimatedValue: event.estimated_value,
    currency: event.currency,
    productCategories: event.product_categories,
    salesmanId: event.salesman_id,
    salesmanNotes: event.salesman_notes,
    confidenceLevel: event.confidence_level,
    createdAt: new Date(event.created_at),
    validUntil: new Date(event.valid_until)
  });

  // 2. Find related service orders (TV/Quotation for this customer)
  const relatedServiceOrders = await serviceOrderRepository.find({
    customerId: event.customer_id,
    serviceType: ['TV', 'QUOTATION'],
    status: ['CREATED', 'SCHEDULED', 'ASSIGNED'],
    createdAfter: new Date(event.created_at - 7 * 24 * 60 * 60 * 1000) // Within 7 days before
  });

  // 3. Link pre-estimation to service orders and reassess potential
  for (const serviceOrder of relatedServiceOrders) {
    await serviceOrderRepository.update(serviceOrder.id, {
      salesPreEstimationId: event.pre_estimation_id,
      salesPreEstimationValue: event.estimated_value,
      salesPreEstimationCurrency: event.currency
    });

    // Trigger potential reassessment
    await assessSalesPotential(serviceOrder);
  }
}
```

### API Endpoints

**1. Get Sales Potential Assessment**
```http
GET /api/v1/service-orders/{serviceOrderId}/sales-potential

Response:
{
  "serviceOrderId": "so_tv_001",
  "potentialLevel": "HIGH",
  "potentialScore": 87.5,
  "assessedAt": "2025-01-16T14:30:00Z",
  "contributingFactors": [
    "High pre-estimation value: €12,500.00",
    "Customer has 2 active project(s)",
    "Positive salesman notes sentiment",
    "High-margin product categories (35.2%)"
  ],
  "preEstimation": {
    "id": "pre_est_123",
    "value": 12500.00,
    "currency": "EUR",
    "confidenceLevel": "HIGH"
  }
}
```

**2. Recalculate Sales Potential (Manual Trigger)**
```http
POST /api/v1/service-orders/{serviceOrderId}/recalculate-sales-potential

Response:
{
  "serviceOrderId": "so_tv_001",
  "previousPotential": "MEDIUM",
  "newPotential": "HIGH",
  "scoreChange": 15.5,
  "reason": "Pre-estimation linked: €12,500.00"
}
```

**3. Get High-Potential TVs (Dashboard)**
```http
GET /api/v1/service-orders?serviceType=TV&salesPotential=HIGH&status=SCHEDULED

Response:
{
  "data": [
    {
      "id": "so_tv_001",
      "customerName": "Jean Dupont",
      "scheduledDate": "2025-01-25T09:00:00Z",
      "salesPotential": "HIGH",
      "salesPotentialScore": 87.5,
      "preEstimationValue": 12500.00,
      "assignedOperator": "op_123"
    }
  ]
}
```

---

## 4. Feature 3: Service Order Risk Assessment

### Business Requirements

**BR-RA-001**: All service orders have a risk level:
- **LOW** (default): No risk indicators
- **MEDIUM**: Some risk indicators (1-2 reschedules, minor payment delays)
- **HIGH**: Multiple risk indicators (3+ reschedules, recent claim, payment issues)
- **CRITICAL**: Severe risk indicators (customer complaint, lawsuit threat, safety concern)

**BR-RA-002**: Risk assessment runs automatically:
- **Daily batch**: At midnight for all service orders starting in next 2 days OR in progress
- **Event-triggered**: When critical events occur (claim filed, checkout incomplete, payment failed, multiple reschedules)

**BR-RA-003**: Risk factors considered:
1. **Recent claims/rework** in same project
2. **Multiple reschedules** (3+ reschedules = high risk)
3. **Previous incomplete checkout**
4. **Payment issues** (late payment, payment failed)
5. **Provider quality issues** (low CSAT, reserves, complaints)
6. **Customer complaints** (recent negative feedback)
7. **Service order age** (created > 30 days ago but not started)
8. **Dependencies blocked** (waiting on other service orders)

**BR-RA-004**: High/Critical risk service orders:
- Create operator task for review
- Send alert to responsible operator
- Flag in dashboard with red indicator
- Require acknowledgment before check-in

**BR-RA-005**: Risk assessment includes explanation of contributing factors.

### Data Model Changes

**Service Orders Table**:
```sql
ALTER TABLE service_orders ADD COLUMN risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
ALTER TABLE service_orders ADD COLUMN risk_score DECIMAL(5,2); -- 0.00-100.00
ALTER TABLE service_orders ADD COLUMN risk_assessed_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN risk_factors JSONB; -- Array of risk factor descriptions
ALTER TABLE service_orders ADD COLUMN risk_acknowledged_by UUID REFERENCES users(id);
ALTER TABLE service_orders ADD COLUMN risk_acknowledged_at TIMESTAMP;

CREATE INDEX idx_so_risk_level ON service_orders(risk_level) WHERE risk_level IN ('HIGH', 'CRITICAL');
CREATE INDEX idx_so_risk_assessed_at ON service_orders(risk_assessed_at);
```

**Risk Assessment History**:
```sql
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  assessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  risk_level VARCHAR(20) NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  input_features JSONB NOT NULL,
  risk_factors JSONB NOT NULL, -- Array of contributing factors with weights
  triggered_by VARCHAR(50) NOT NULL -- 'BATCH_JOB' | 'EVENT_CLAIM_FILED' | 'EVENT_RESCHEDULE' etc.
);

CREATE INDEX idx_risk_assessments_so ON risk_assessments(service_order_id);
CREATE INDEX idx_risk_assessments_level ON risk_assessments(risk_level, assessed_at);
```

### AI/ML Model: Risk Scorer

**Model Architecture**:
- **Type**: Random Forest Classifier
- **Inputs**: 20 features (numeric + categorical)
- **Output**: Risk score (0-100) + classification (LOW/MEDIUM/HIGH/CRITICAL)
- **Training Data**: Historical service orders with known outcomes (claims, cancellations, customer complaints)

**Features**:

```typescript
interface RiskAssessmentFeatures {
  // Reschedule History
  totalReschedules: number;
  rescheduleRate: number; // Reschedules per day since creation
  lastRescheduleDate: Date | null;

  // Claims & Quality
  hasRecentClaimInProject: boolean;
  hasRecentReworkInProject: boolean;
  previousIncompleteCheckout: boolean;
  providerCSATScore: number; // 1-5
  providerReserveCount: number; // WCF reserves in last 30 days

  // Payment Issues
  paymentStatus: string; // 'NOT_PAID', 'PARTIALLY_PAID', 'FULLY_PAID', 'PAYMENT_FAILED'
  paymentDelayDays: number;

  // Customer Sentiment
  customerComplaintCount: number; // Last 90 days
  customerCSATScore: number; // 1-5

  // Service Order Age
  ageInDays: number;
  daysUntilScheduled: number;

  // Dependencies
  blockedDependencyCount: number;
  criticalDependencyBlocked: boolean;

  // Project Context
  projectClaimCount: number;
  projectServiceOrderCount: number;
  projectCompletionRate: number; // % of SOs completed

  // Provider Performance
  providerOnTimeRate: number; // % of on-time completions
  providerFirstTimeFixRate: number; // % completed without rework
}
```

**Risk Scoring Algorithm**:

```typescript
async function assessServiceOrderRisk(
  serviceOrder: ServiceOrder,
  triggeredBy: string
): Promise<RiskAssessment> {
  // Extract features
  const features = await extractRiskFeatures(serviceOrder);

  // Call ML model
  const prediction = await mlService.predict('risk-scorer', features);

  // Map score to risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (prediction.score >= 80) {
    riskLevel = 'CRITICAL';
  } else if (prediction.score >= 60) {
    riskLevel = 'HIGH';
  } else if (prediction.score >= 30) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  // Identify risk factors
  const riskFactors = await identifyRiskFactors(features, prediction);

  // Save assessment
  await riskAssessmentRepository.create({
    serviceOrderId: serviceOrder.id,
    assessedAt: new Date(),
    riskLevel,
    riskScore: prediction.score,
    modelVersion: prediction.modelVersion,
    inputFeatures: features,
    riskFactors,
    triggeredBy
  });

  // Update service order
  await serviceOrderRepository.update(serviceOrder.id, {
    riskLevel,
    riskScore: prediction.score,
    riskAssessedAt: new Date(),
    riskFactors
  });

  // Create task if HIGH or CRITICAL
  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    await createRiskReviewTask(serviceOrder, riskLevel, riskFactors);
  }

  // Send alert to responsible operator
  if (riskLevel !== 'LOW') {
    await sendRiskAlert(serviceOrder, riskLevel, riskFactors);
  }

  return {
    riskLevel,
    riskScore: prediction.score,
    riskFactors
  };
}

async function extractRiskFeatures(
  serviceOrder: ServiceOrder
): Promise<RiskAssessmentFeatures> {
  const project = await projectRepository.findById(serviceOrder.projectId);
  const provider = await providerRepository.findById(serviceOrder.assignedProviderId);

  // 1. Reschedule history
  const reschedules = await serviceOrderRepository.getRescheduleHistory(serviceOrder.id);
  const totalReschedules = reschedules.length;
  const ageInDays = daysBetween(serviceOrder.createdAt, new Date());
  const rescheduleRate = ageInDays > 0 ? totalReschedules / ageInDays : 0;

  // 2. Claims & quality
  const projectClaims = await claimRepository.findByProject(project.id, {
    last30Days: true
  });
  const hasRecentClaimInProject = projectClaims.length > 0;
  const hasRecentReworkInProject = await serviceOrderRepository.hasRecentRework(
    project.id,
    { last30Days: true }
  );
  const previousCheckouts = await checkoutRepository.findByServiceOrder(serviceOrder.id);
  const previousIncompleteCheckout = previousCheckouts.some(c => c.status === 'INCOMPLETE');

  // 3. Provider performance
  const providerMetrics = await providerRepository.getQualityMetrics(provider.id);

  // 4. Payment
  const paymentStatus = serviceOrder.paymentStatus;
  const paymentDelayDays = calculatePaymentDelay(serviceOrder);

  // 5. Customer sentiment
  const customerComplaints = await complaintRepository.countByCustomer(
    serviceOrder.customerId,
    { last90Days: true }
  );

  // 6. Dependencies
  const dependencies = await serviceOrderRepository.getDependencies(serviceOrder.id);
  const blockedDependencies = dependencies.filter(d => d.status === 'BLOCKED');

  // 7. Project context
  const projectServiceOrders = await serviceOrderRepository.findByProject(project.id);
  const completedSOs = projectServiceOrders.filter(so => so.status === 'COMPLETED');

  return {
    totalReschedules,
    rescheduleRate,
    lastRescheduleDate: reschedules[0]?.rescheduledAt || null,
    hasRecentClaimInProject,
    hasRecentReworkInProject,
    previousIncompleteCheckout,
    providerCSATScore: providerMetrics.averageCSAT,
    providerReserveCount: providerMetrics.reserveCount,
    paymentStatus,
    paymentDelayDays,
    customerComplaintCount: customerComplaints,
    customerCSATScore: await getCustomerAverageCSAT(serviceOrder.customerId),
    ageInDays,
    daysUntilScheduled: serviceOrder.scheduledDate
      ? daysBetween(new Date(), serviceOrder.scheduledDate)
      : 999,
    blockedDependencyCount: blockedDependencies.length,
    criticalDependencyBlocked: blockedDependencies.some(d => d.type === 'HARD_DEPENDENCY'),
    projectClaimCount: projectClaims.length,
    projectServiceOrderCount: projectServiceOrders.length,
    projectCompletionRate: completedSOs.length / projectServiceOrders.length,
    providerOnTimeRate: providerMetrics.onTimeRate,
    providerFirstTimeFixRate: providerMetrics.firstTimeFixRate
  };
}

function identifyRiskFactors(
  features: RiskAssessmentFeatures,
  prediction: any
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (features.totalReschedules >= 3) {
    factors.push({
      factor: 'MULTIPLE_RESCHEDULES',
      description: `Service order rescheduled ${features.totalReschedules} times`,
      weight: 0.25,
      severity: 'HIGH'
    });
  }

  if (features.hasRecentClaimInProject) {
    factors.push({
      factor: 'RECENT_CLAIM_IN_PROJECT',
      description: `Project has recent claim (last 30 days)`,
      weight: 0.20,
      severity: 'HIGH'
    });
  }

  if (features.previousIncompleteCheckout) {
    factors.push({
      factor: 'PREVIOUS_INCOMPLETE_CHECKOUT',
      description: 'Previous checkout was incomplete',
      weight: 0.15,
      severity: 'MEDIUM'
    });
  }

  if (features.paymentStatus === 'PAYMENT_FAILED') {
    factors.push({
      factor: 'PAYMENT_FAILED',
      description: 'Customer payment failed',
      weight: 0.20,
      severity: 'HIGH'
    });
  }

  if (features.providerCSATScore < 3.0) {
    factors.push({
      factor: 'LOW_PROVIDER_QUALITY',
      description: `Provider has low CSAT score: ${features.providerCSATScore.toFixed(1)}`,
      weight: 0.10,
      severity: 'MEDIUM'
    });
  }

  if (features.customerComplaintCount > 0) {
    factors.push({
      factor: 'CUSTOMER_COMPLAINTS',
      description: `Customer has ${features.customerComplaintCount} complaint(s) in last 90 days`,
      weight: 0.15,
      severity: 'HIGH'
    });
  }

  if (features.criticalDependencyBlocked) {
    factors.push({
      factor: 'CRITICAL_DEPENDENCY_BLOCKED',
      description: 'Critical dependency is blocked',
      weight: 0.10,
      severity: 'MEDIUM'
    });
  }

  return factors;
}

async function createRiskReviewTask(
  serviceOrder: ServiceOrder,
  riskLevel: string,
  riskFactors: RiskFactor[]
): Promise<void> {
  const project = await projectRepository.findById(serviceOrder.projectId);

  await taskService.createTask({
    type: 'SERVICE_ORDER_RISK_REVIEW',
    priority: riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    serviceOrderId: serviceOrder.id,
    assignedTo: project.responsibleOperatorId,
    context: {
      riskLevel,
      riskFactors,
      serviceOrderNumber: serviceOrder.orderNumber,
      customerName: serviceOrder.customerInfo.name,
      scheduledDate: serviceOrder.scheduledDate
    },
    title: `${riskLevel} Risk: ${serviceOrder.orderNumber} - ${serviceOrder.customerInfo.name}`,
    description: `Service order has ${riskLevel.toLowerCase()} risk. Review risk factors and take appropriate action.`
  });
}
```

### Batch Risk Assessment Job

**Scheduled Job** (runs daily at midnight):

```typescript
async function dailyRiskAssessmentJob(): Promise<void> {
  console.log('[RiskAssessment] Starting daily batch risk assessment');

  // Find service orders to assess:
  // 1. Started but not finished (IN_PROGRESS)
  // 2. Scheduled to start in next 2 days
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  const serviceOrders = await serviceOrderRepository.find({
    $or: [
      { status: 'IN_PROGRESS' },
      {
        scheduledDate: { $lte: twoDaysFromNow },
        status: { $in: ['SCHEDULED', 'ASSIGNED'] }
      }
    ]
  });

  console.log(`[RiskAssessment] Found ${serviceOrders.length} service orders to assess`);

  let assessedCount = 0;
  let highRiskCount = 0;

  for (const serviceOrder of serviceOrders) {
    try {
      const assessment = await assessServiceOrderRisk(serviceOrder, 'BATCH_JOB');
      assessedCount++;

      if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
        highRiskCount++;
      }
    } catch (error) {
      console.error(`[RiskAssessment] Failed to assess ${serviceOrder.id}:`, error);
    }
  }

  console.log(`[RiskAssessment] Completed: ${assessedCount} assessed, ${highRiskCount} high/critical risk`);
}

// Schedule job
cron.schedule('0 0 * * *', dailyRiskAssessmentJob); // Every day at midnight
```

### Event-Triggered Risk Assessment

**Triggers**:

```typescript
// 1. When claim is filed
async function handleClaimFiled(event: ClaimFiledEvent): Promise<void> {
  const serviceOrder = await serviceOrderRepository.findById(event.serviceOrderId);
  await assessServiceOrderRisk(serviceOrder, 'EVENT_CLAIM_FILED');
}

// 2. When service order is rescheduled (3rd+ reschedule)
async function handleServiceOrderRescheduled(event: ServiceOrderRescheduledEvent): Promise<void> {
  const serviceOrder = await serviceOrderRepository.findById(event.serviceOrderId);
  const rescheduleCount = await serviceOrderRepository.getRescheduleCount(serviceOrder.id);

  if (rescheduleCount >= 3) {
    await assessServiceOrderRisk(serviceOrder, 'EVENT_MULTIPLE_RESCHEDULES');
  }
}

// 3. When checkout is incomplete
async function handleCheckoutIncomplete(event: CheckoutCompletedEvent): Promise<void> {
  if (event.status === 'INCOMPLETE') {
    const serviceOrder = await serviceOrderRepository.findById(event.serviceOrderId);
    await assessServiceOrderRisk(serviceOrder, 'EVENT_CHECKOUT_INCOMPLETE');
  }
}

// 4. When payment fails
async function handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
  const serviceOrders = await serviceOrderRepository.findBySalesOrderId(event.salesOrderId);
  for (const serviceOrder of serviceOrders) {
    await assessServiceOrderRisk(serviceOrder, 'EVENT_PAYMENT_FAILED');
  }
}
```

### API Endpoints

**1. Get Risk Assessment**
```http
GET /api/v1/service-orders/{serviceOrderId}/risk-assessment

Response:
{
  "serviceOrderId": "so_abc123",
  "riskLevel": "HIGH",
  "riskScore": 72.5,
  "assessedAt": "2025-01-16T00:00:05Z",
  "riskFactors": [
    {
      "factor": "MULTIPLE_RESCHEDULES",
      "description": "Service order rescheduled 4 times",
      "weight": 0.25,
      "severity": "HIGH"
    },
    {
      "factor": "RECENT_CLAIM_IN_PROJECT",
      "description": "Project has recent claim (last 30 days)",
      "weight": 0.20,
      "severity": "HIGH"
    }
  ],
  "acknowledged": false,
  "mitigationActions": [
    "Contact customer to confirm readiness",
    "Ensure provider has all necessary materials",
    "Schedule pre-service call 24h before appointment"
  ]
}
```

**2. Acknowledge Risk**
```http
POST /api/v1/service-orders/{serviceOrderId}/acknowledge-risk

Request:
{
  "acknowledgedBy": "op_123",
  "mitigationPlan": "Contacted customer, confirmed appointment. Verified provider has all materials."
}

Response:
{
  "serviceOrderId": "so_abc123",
  "riskAcknowledged": true,
  "acknowledgedBy": "op_123",
  "acknowledgedAt": "2025-01-16T10:30:00Z"
}
```

**3. Get High-Risk Service Orders (Dashboard)**
```http
GET /api/v1/service-orders?riskLevel=HIGH,CRITICAL&status=SCHEDULED,IN_PROGRESS

Response:
{
  "data": [
    {
      "id": "so_abc123",
      "orderNumber": "SO-2025-12345",
      "customerName": "Jean Dupont",
      "riskLevel": "HIGH",
      "riskScore": 72.5,
      "scheduledDate": "2025-01-20T09:00:00Z",
      "riskAcknowledged": false,
      "topRiskFactors": ["MULTIPLE_RESCHEDULES", "RECENT_CLAIM_IN_PROJECT"]
    }
  ]
}
```

---

## 5. Cross-Cutting Concerns

### Database Indexes

**Performance-critical indexes** for new features:

```sql
-- Project ownership queries
CREATE INDEX idx_projects_responsible_operator ON projects(responsible_operator_id);
CREATE INDEX idx_projects_assignment_mode ON projects(assignment_mode);

-- Sales potential queries
CREATE INDEX idx_so_sales_potential ON service_orders(sales_potential)
  WHERE service_type IN ('TV', 'QUOTATION');
CREATE INDEX idx_so_pre_estimation ON service_orders(sales_pre_estimation_id)
  WHERE sales_pre_estimation_id IS NOT NULL;

-- Risk assessment queries
CREATE INDEX idx_so_risk_level ON service_orders(risk_level)
  WHERE risk_level IN ('HIGH', 'CRITICAL');
CREATE INDEX idx_so_risk_assessed_at ON service_orders(risk_assessed_at);

-- Composite index for dashboard queries
CREATE INDEX idx_so_dashboard_risk_potential ON service_orders(
  risk_level, sales_potential, status, scheduled_date
);
```

### Kafka Events

**New Events**:

```json
// Project ownership changed
{
  "topic": "projects.ownership.changed",
  "key": "proj_abc123",
  "value": {
    "project_id": "proj_abc123",
    "previous_operator_id": "op_456",
    "new_operator_id": "op_123",
    "changed_at": 1705410000000,
    "changed_by": "op_123",
    "reason": "Taking ownership"
  }
}

// Sales potential assessed
{
  "topic": "service_orders.sales_potential.assessed",
  "key": "so_tv_001",
  "value": {
    "service_order_id": "so_tv_001",
    "potential_level": "HIGH",
    "potential_score": 87.5,
    "assessed_at": 1705410000000,
    "contributing_factors": ["High pre-estimation", "Platinum customer"]
  }
}

// Risk assessed
{
  "topic": "service_orders.risk.assessed",
  "key": "so_abc123",
  "value": {
    "service_order_id": "so_abc123",
    "risk_level": "HIGH",
    "risk_score": 72.5,
    "assessed_at": 1705410000000,
    "risk_factors": [
      {"factor": "MULTIPLE_RESCHEDULES", "severity": "HIGH"}
    ],
    "triggered_by": "BATCH_JOB"
  }
}
```

### AI/ML Infrastructure

**ML Model Serving**:
- **Deployment**: Kubernetes pods with horizontal scaling
- **Framework**: TensorFlow Serving or FastAPI
- **Model Registry**: MLflow
- **Monitoring**: Prometheus metrics (prediction latency, error rate)
- **A/B Testing**: Shadow mode for new model versions

**Model Training Pipeline**:
```typescript
// Retraining schedule
- Sales Potential Scorer: Monthly (retrain on last 6 months conversions)
- Risk Scorer: Weekly (retrain on last 3 months outcomes)

// Training data
- Sales Potential: TV/Quotation service orders with conversion outcome
- Risk: Service orders with claims, cancellations, complaints, CSAT scores

// Model versioning
- Semantic versioning: v1.2.3
- Track model performance metrics in MLflow
- Rollback if new version degrades performance
```

---

## 6. Implementation Roadmap

### Phase 1: Project Ownership (Week 1-2)

**Week 1**:
- Database schema changes
- Operator workload calculation
- Auto-assignment algorithm
- Manual assignment API

**Week 2**:
- Batch assignment API
- Notification filtering
- Dashboard integration
- Testing and deployment

**Deliverables**:
- ✅ Projects have responsible operators
- ✅ Auto-assignment working
- ✅ Operators can manage their portfolio
- ✅ Notifications filtered by ownership

---

### Phase 2: Sales Potential Assessment (Week 3-5)

**Week 3**:
- Database schema changes
- Sales pre-estimation integration
- Feature extraction logic

**Week 4**:
- ML model development and training
- Model deployment infrastructure
- API endpoints

**Week 5**:
- Dashboard integration
- Testing and validation
- Production deployment

**Deliverables**:
- ✅ TV/Quotation service orders have sales potential
- ✅ Pre-estimations linked from sales systems
- ✅ High-potential TVs prioritized
- ✅ AI model predicting potential accurately

---

### Phase 3: Risk Assessment (Week 6-8)

**Week 6**:
- Database schema changes
- Feature extraction logic
- ML model development

**Week 7**:
- Batch risk assessment job
- Event-triggered assessments
- Task creation for high-risk SOs

**Week 8**:
- Dashboard integration
- Risk acknowledgment workflow
- Testing and deployment

**Deliverables**:
- ✅ Service orders have risk levels
- ✅ Daily batch risk assessment running
- ✅ High-risk SOs create operator tasks
- ✅ AI model predicting risk accurately

---

## 7. Files to Update

### Domain Specifications

1. **domain/03-project-service-order-domain.md**
   - Add `responsibleOperatorId` to Project entity
   - Add `salesPotential`, `salesPreEstimationId`, `riskLevel`, `riskFactors` to ServiceOrder entity
   - Update business rules

2. **domain/10-ai-context-linking.md**
   - Add sales potential assessment AI model
   - Add risk assessment AI model
   - Update AI feature sections

3. **domain/08-task-management.md**
   - Add `SERVICE_ORDER_RISK_REVIEW` task type
   - Update task creation triggers

### API Specifications

4. **api/03-provider-capacity-api.md** → **api/03-project-service-order-api.md**
   - Add project ownership endpoints
   - Add sales potential endpoints
   - Add risk assessment endpoints

5. **api/09-operator-cockpit-api.md**
   - Add portfolio view (my projects)
   - Add high-potential TV dashboard
   - Add high-risk SO dashboard

### Integration Specifications

6. **integration/03-sales-integration.md**
   - Add pre-estimation data integration
   - Add Kafka event schemas

### Infrastructure Specifications

7. **infrastructure/02-database-design.md**
   - Add new tables and columns
   - Add indexes
   - Add materialized views

8. **NEW: infrastructure/08-ml-infrastructure.md**
   - ML model serving architecture
   - Model training pipelines
   - Model registry and versioning

---

**End of Analysis Document**
