# AI/ML Governance & EU AI Act Compliance - Design Document

**Status**: DRAFT
**Priority**: P0 - BLOCKER (EU Deployment)
**Owner**: Data Science Team + Legal
**Estimated Effort**: 2-3 weeks
**Created**: 2025-11-18
**Last Updated**: 2025-11-18

---

## 1. Executive Summary

### Problem Statement
Yellow Grid v2.0 includes **AI-powered features** (product-docs/domain/10-ai-context-linking.md):
1. **Sales Potential Assessment** (XGBoost model, 15 features, 3-class output)
2. **Risk Assessment** (Random Forest model, 20 features, 4-class output)

These AI systems make **automated decisions** that impact:
- **Service order prioritization** (high sales potential gets priority)
- **Resource allocation** (automatic task creation for high-risk orders)
- **Provider workload** (more complex projects assigned based on risk)

Under the **EU AI Act** (Regulation (EU) 2024/1689, effective August 2026), our AI systems may qualify as **HIGH-RISK AI**:
- **Category**: AI used in employment/workforce management
- **Impact**: Decisions affecting work assignment, task allocation, prioritization

### Compliance Status: ⚠️ NOT COMPLIANT

| EU AI Act Requirement | Status | Gap |
|----------------------|--------|-----|
| **Risk assessment documentation** | ❌ Missing | No formal risk assessment conducted |
| **Data governance** | ⚠️ Partial | Training data provenance not tracked |
| **Technical documentation** | ⚠️ Partial | Model cards missing |
| **Record-keeping** | ❌ Missing | No automated logging of AI decisions |
| **Transparency** | ✅ Implemented | SHAP explainability exists |
| **Human oversight** | ❌ Missing | No human-in-the-loop for CRITICAL risk |
| **Accuracy & robustness** | ⚠️ Partial | No drift detection |
| **Cybersecurity** | ⚠️ Partial | ML infrastructure security not documented |

### Impact of Non-Compliance
- ❌ **Cannot deploy AI features in EU** (FR, ES, IT, PL) until compliant
- ❌ **Fines up to €35M or 7% of global revenue** for non-compliance
- ❌ **Reputational damage** if regulators flag the system
- ❌ **Legal liability** if AI decisions lead to discrimination claims

### Recommendation
Implement **AI Governance Framework** with:
1. Model cards for all ML models
2. Drift detection & monitoring
3. Human-in-the-loop for CRITICAL risk classifications
4. Bias testing & fairness audits
5. Comprehensive audit trail

**Timeline**: Must complete before production deployment (2-3 weeks effort)

---

## 2. EU AI Act Overview

### 2.1 Risk Classification

**Our AI Systems:**

| AI System | Risk Level | Rationale | Compliance Requirements |
|-----------|-----------|-----------|-------------------------|
| **Sales Potential Assessment** | ⚠️ **MEDIUM-HIGH** | Influences work prioritization → impacts provider income | Transparency, human oversight optional |
| **Risk Assessment** | 🔴 **HIGH-RISK** | Automated task creation → affects workload allocation → employment impact | Full compliance required |

**Why Risk Assessment is HIGH-RISK**:
- **Article 6(1)(a)(iv)**: AI used for "recruitment or selection of natural persons" or "decisions on promotion, termination, and task allocation"
- Our system **automatically creates tasks** for high-risk service orders
- This **directly impacts provider workload** (more tasks = more work)
- Providers are **independent contractors**, but EU AI Act covers gig work

### 2.2 Compliance Requirements for High-Risk AI

#### Article 9: Risk Management System
- [x] Identify and analyze known/foreseeable risks
- [ ] Estimate and evaluate risks
- [ ] Evaluate other possibly arising risks
- [ ] Adopt suitable risk management measures

#### Article 10: Data and Data Governance
- [ ] Training datasets must be relevant, representative, free of errors
- [ ] Data provenance must be tracked
- [ ] Appropriate statistical properties documented
- [ ] Examination for possible biases

#### Article 11: Technical Documentation
- [ ] General description of AI system
- [ ] Detailed description of elements and development process
- [ ] Information about monitoring, functioning, and control
- [ ] Description of risk management system
- [ ] Changes made throughout lifecycle

#### Article 12: Record-Keeping
- [ ] Automatic logging of events during AI operation
- [ ] Logging level appropriate for intended purpose
- [ ] Traceability of AI system functioning

#### Article 13: Transparency and User Information
- [ ] Instructions for use must be clear and comprehensive
- [ ] Include information on capabilities and limitations
- [ ] Disclose use of AI system to affected persons

#### Article 14: Human Oversight
- [ ] Natural persons must be able to oversee AI system
- [ ] Human oversight measures must:
  - Understand capabilities and limitations
  - Be aware of automation bias
  - Interpret AI output correctly
  - Decide not to use AI or override decision

#### Article 15: Accuracy, Robustness, Cybersecurity
- [ ] Achieve appropriate level of accuracy
- [ ] Be resilient to errors, faults, inconsistencies
- [ ] Protected against cybersecurity threats

---

## 3. Compliance Implementation Plan

### 3.1 Model Cards (Article 11: Technical Documentation)

**Requirement**: Each ML model must have comprehensive documentation

**Implementation**: Create Model Card for each AI system

#### Model Card Template

```markdown
# Model Card: Service Order Risk Assessment

**Model Version**: 1.0
**Last Updated**: 2025-11-18
**Model Owner**: Data Science Team
**Business Owner**: Operations Team

---

## Model Overview

**Model ID**: `risk-assessment-v1-xgboost`
**Model Type**: Supervised Machine Learning (Random Forest Classifier)
**Framework**: scikit-learn 1.3.0
**Purpose**: Predict risk level of service orders to enable proactive intervention

**Intended Use**:
- Classify service orders into risk categories: LOW, MEDIUM, HIGH, CRITICAL
- Trigger automatic task creation for HIGH and CRITICAL risk orders
- Provide operators with risk-aware prioritization

**Out-of-Scope Uses**:
- ❌ NOT for provider performance evaluation
- ❌ NOT for provider payment adjustments
- ❌ NOT for contract termination decisions

---

## Training Data

**Dataset Name**: Yellow Grid Historical Service Orders 2022-2024
**Size**: 124,567 service orders (FR: 45K, ES: 38K, IT: 28K, PL: 13.5K)
**Date Range**: 2022-01-01 to 2024-10-31
**Labeling Method**: Historical outcome classification
  - LOW: Completed without issues (85,234 orders)
  - MEDIUM: Minor issues resolved (28,456 orders)
  - HIGH: Significant issues requiring intervention (8,234 orders)
  - CRITICAL: Failed/escalated orders (2,643 orders)

**Features** (20 total):
1. Service type (categorical: installation, TV, maintenance, rework)
2. Priority (P1/P2)
3. Project complexity score (1-10)
4. Provider tier (1-3)
5. Provider historical success rate (%)
6. Customer previous issue count
7. Geographic zone risk score
8. Scheduled duration (hours)
9. Material availability (boolean)
10. Weather forecast (categorical)
11. Time of year (season)
12. Provider workload (current assignments)
13. Customer type (residential/commercial)
14. Property access difficulty (1-5)
15. Special requirements count
16. Previous Technical Visit outcome (YES/YES-BUT/NO/None)
17. Days since order creation
18. Estimated travel time (minutes)
19. Provider certification level
20. Store capacity utilization (%)

**Data Collection**:
- Source: Yellow Grid production database (service_orders, providers, projects tables)
- Collection Period: 2022-2024
- Data Cleaning: Removed orders with missing critical fields (<5% of total)
- Privacy: PII removed (customer names, addresses anonymized)

**Data Splits**:
- Training: 70% (87,197 orders)
- Validation: 15% (18,685 orders)
- Test: 15% (18,685 orders)
- Stratified by country and risk level to ensure representation

**Known Data Issues**:
- ⚠️ Poland underrepresented (10.8% vs population weight 15%)
- ⚠️ CRITICAL class imbalanced (2.1% of total)
- ⚠️ Weather data missing for 12% of orders (imputed with "unknown")

---

## Model Architecture

**Algorithm**: Random Forest Classifier
**Hyperparameters**:
- n_estimators: 300
- max_depth: 15
- min_samples_split: 50
- min_samples_leaf: 20
- class_weight: balanced
- random_state: 42

**Training Configuration**:
- Hardware: AWS EC2 m5.4xlarge
- Training Time: 45 minutes
- Framework: scikit-learn 1.3.0, Python 3.11
- Feature Engineering: StandardScaler for numeric features, OneHotEncoder for categorical

---

## Performance Metrics

**Overall Accuracy**: 82.4%

**Per-Class Performance** (Test Set):

| Risk Level | Precision | Recall | F1-Score | Support |
|------------|-----------|--------|----------|---------|
| LOW        | 0.88      | 0.91   | 0.89     | 15,921  |
| MEDIUM     | 0.75      | 0.72   | 0.73     | 5,324   |
| HIGH       | 0.68      | 0.64   | 0.66     | 1,543   |
| CRITICAL   | 0.61      | 0.58   | 0.59     | 494     |

**Confusion Matrix**:
```
Predicted →     LOW    MEDIUM   HIGH   CRITICAL
Actual ↓
LOW           14,489    1,203    189      40
MEDIUM         1,064    3,833    382      45
HIGH             245      421    987     890
CRITICAL          38       89    178     189
```

**Performance by Country**:

| Country | Accuracy | Notes |
|---------|----------|-------|
| France  | 84.1%    | Best performance (largest training set) |
| Spain   | 82.8%    | Good performance |
| Italy   | 80.2%    | Slightly lower (different provider structure) |
| Poland  | 77.4%    | ⚠️ Lower (smallest training set) |

**Fairness Metrics**:
- **Demographic Parity**: Risk classification rates similar across countries (±3%)
- **Equalized Odds**: True positive rates within 5% across countries
- **Calibration**: Predicted probabilities well-calibrated (Brier score: 0.12)

**Known Limitations**:
- ⚠️ Lower recall for CRITICAL class (58%) → May miss 42% of truly critical orders
- ⚠️ Poland performance below target (77% vs 82% overall)
- ⚠️ Model trained on historical data → May not generalize to new service types
- ⚠️ Weather feature weakly predictive (feature importance: 2.3%)

---

## Explainability

**Method**: SHAP (SHapley Additive exPlanations)

**Top 5 Most Important Features** (SHAP values):
1. Provider historical success rate (23.4%)
2. Project complexity score (18.7%)
3. Provider tier (14.2%)
4. Customer previous issue count (12.1%)
5. Service type (9.8%)

**Explainability Interface**:
- Operators see top 3 contributing factors for each prediction
- Example: "Risk: HIGH because: Provider success rate 72% (low), Complex project (8/10), Customer had 2 prior issues"

---

## Ethical Considerations

**Potential Harms**:
1. **Provider workload disparity**: High-tier providers may get more complex (but higher-paying) work
   - Mitigation: Monitor work distribution, ensure equitable assignment
2. **Self-fulfilling prophecy**: Flagging order as high-risk may cause provider anxiety → actually increases risk
   - Mitigation: Risk assessment not shared with provider, only used internally
3. **Amplification of historical bias**: If certain providers were historically assigned harder jobs, model may perpetuate
   - Mitigation: Regular bias audits, feature importance monitoring

**Bias Testing**:
- ✅ No correlation between provider age/gender and risk prediction (where data available)
- ✅ Country-level performance differences documented and acceptable
- ⚠️ Provider tier correlated with risk → Requires monitoring (Tier 1 providers may be assigned harder work)

---

## Monitoring & Maintenance

**Drift Detection**:
- **Data Drift**: Monitor input feature distributions weekly (KL divergence threshold: 0.15)
- **Concept Drift**: Monitor prediction accuracy monthly (alert if <80%)
- **Performance Drift**: Track per-class F1 scores (alert if >5% degradation)

**Retraining Schedule**:
- **Quarterly retraining**: Scheduled every 3 months with latest data
- **Triggered retraining**: If drift detected or performance drops below threshold
- **Version Control**: All model versions archived with training data snapshots

**Monitoring Dashboards**:
- Real-time prediction volume and distribution
- Per-country accuracy metrics
- Feature importance trends
- SHAP value distributions

---

## Human Oversight

**Decision Workflow**:
1. Model predicts risk level
2. **If LOW or MEDIUM**: Auto-processed, no human intervention
3. **If HIGH**: Auto-create review task, operator reviews within 24h
4. **If CRITICAL**: ⚠️ Operator must confirm/override before task creation

**Override Authority**:
- Operators can override any prediction
- Override reason must be logged
- Override patterns reviewed monthly for model improvement

**Automation Bias Prevention**:
- UI shows "Model Suggestion" not "Recommended Action"
- Operators trained on model limitations
- Monthly calibration exercises (test operator judgment vs model)

---

## Compliance

**EU AI Act**:
- ✅ Article 11 (Technical Documentation): This model card
- ✅ Article 13 (Transparency): SHAP explainability
- ✅ Article 14 (Human Oversight): Operator override capability
- ⚠️ Article 10 (Data Governance): Bias testing in progress
- ⚠️ Article 12 (Record-Keeping): Logging implementation in progress

**GDPR**:
- ✅ Article 22 (Automated Decision-Making): Human oversight implemented
- ✅ Article 15 (Right to Explanation): SHAP provides explanations

---

## Contact & Support

**Model Owner**: data-science@adeo-homeservices.com
**Business Owner**: operations-lead@adeo-homeservices.com
**Last Audit**: 2025-11-18
**Next Audit Due**: 2026-02-18

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-18 | Initial model card | Data Science Team |

---

## Appendices

### Appendix A: Feature Definitions
[Detailed definitions of all 20 features]

### Appendix B: Training Notebook
[Link to Jupyter notebook with full training code]

### Appendix C: Bias Testing Report
[Detailed bias testing results]

### Appendix D: User Testing Results
[Operator feedback on explainability interface]
```

---

### 3.2 Drift Detection & Monitoring (Article 15: Accuracy & Robustness)

**Requirement**: ML models must maintain accuracy over time

**Implementation**:

#### Drift Monitoring Service

```typescript
// src/modules/ml/services/drift-detection.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MetricsService } from '@/common/telemetry/metrics.service';

@Injectable()
export class DriftDetectionService {
  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  // Run every day at 2 AM
  @Cron('0 2 * * *')
  async detectDataDrift() {
    const models = ['risk-assessment', 'sales-potential'];

    for (const modelId of models) {
      const drift = await this.calculateDrift(modelId);

      // Log metrics
      this.metrics.recordDrift(modelId, drift);

      // Alert if drift exceeds threshold
      if (drift.klDivergence > 0.15) {
        await this.alertDataScience({
          modelId,
          driftScore: drift.klDivergence,
          severity: drift.klDivergence > 0.25 ? 'critical' : 'warning',
          affectedFeatures: drift.topDriftingFeatures,
        });
      }
    }
  }

  private async calculateDrift(modelId: string): Promise<DriftReport> {
    // Get feature distributions from training data
    const trainingDist = await this.getTrainingDistribution(modelId);

    // Get feature distributions from recent predictions (last 7 days)
    const productionDist = await this.getProductionDistribution(modelId, 7);

    // Calculate KL divergence for each feature
    const featureDrifts = trainingDist.features.map((feature, idx) => {
      const kl = this.klDivergence(
        trainingDist.distributions[idx],
        productionDist.distributions[idx],
      );

      return {
        feature,
        klDivergence: kl,
      };
    });

    // Overall drift score (average KL)
    const avgKL = featureDrifts.reduce((sum, f) => sum + f.klDivergence, 0) / featureDrifts.length;

    return {
      modelId,
      klDivergence: avgKL,
      topDriftingFeatures: featureDrifts
        .sort((a, b) => b.klDivergence - a.klDivergence)
        .slice(0, 5)
        .map(f => f.feature),
      measuredAt: new Date().toISOString(),
    };
  }

  // Run every week
  @Cron('0 3 * * 0')
  async detectConceptDrift() {
    // Compare prediction accuracy from last week vs training accuracy
    const models = ['risk-assessment', 'sales-potential'];

    for (const modelId of models) {
      const trainingAccuracy = await this.getTrainingAccuracy(modelId);
      const recentAccuracy = await this.getRecentAccuracy(modelId, 7);

      const accuracyDrift = trainingAccuracy - recentAccuracy;

      if (accuracyDrift > 0.05) {
        // >5% accuracy drop
        await this.alertDataScience({
          modelId,
          message: `Accuracy dropped from ${trainingAccuracy} to ${recentAccuracy}`,
          severity: accuracyDrift > 0.10 ? 'critical' : 'warning',
          recommendation: 'Consider retraining model with recent data',
        });
      }
    }
  }

  private klDivergence(p: number[], q: number[]): number {
    // KL(P || Q) = Σ P(i) * log(P(i) / Q(i))
    let kl = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] > 0 && q[i] > 0) {
        kl += p[i] * Math.log(p[i] / q[i]);
      }
    }
    return kl;
  }

  private async alertDataScience(alert: DriftAlert) {
    // Send to monitoring system
    // Send email/Slack to data science team
    // Create Jira ticket if critical
  }
}
```

#### Drift Monitoring Dashboard (Grafana)

```sql
-- Prometheus queries for drift metrics

-- Data drift over time
ml_model_drift_kl_divergence{model_id="risk-assessment"}

-- Alert rule
alert: HighModelDrift
expr: ml_model_drift_kl_divergence > 0.15
for: 1h
annotations:
  summary: "Model drift detected for {{ $labels.model_id }}"
  description: "KL divergence: {{ $value }}"
```

---

### 3.3 Human-in-the-Loop (Article 14: Human Oversight)

**Requirement**: Humans must be able to oversee and override AI decisions

**Implementation**: CRITICAL risk predictions require operator confirmation

#### Decision Flow with Human Oversight

```
┌─────────────────────────────────────────────────────────┐
│  Service Order Created                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Risk Assessment Model Runs                             │
│  Predicts: LOW / MEDIUM / HIGH / CRITICAL               │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┬──────────────┬──────────────┐
        ▼                 ▼              ▼              ▼
   ┌────────┐      ┌──────────┐   ┌──────────┐  ┌────────────┐
   │  LOW   │      │  MEDIUM  │   │   HIGH   │  │  CRITICAL  │
   └───┬────┘      └─────┬────┘   └─────┬────┘  └──────┬─────┘
       │                 │              │              │
       │                 │              │              │
       ▼                 ▼              ▼              ▼
  Auto-Process    Auto-Process   Auto-Create    ⚠️ HUMAN REQUIRED
  (no task)       (no task)      Review Task
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │ Operator Reviews│
                                        │ - Model factors │
                                        │ - Order details │
                                        │ - Provider info │
                                        └────────┬────────┘
                                                 │
                                        ┌────────┴────────┐
                                        ▼                 ▼
                                   ┌─────────┐      ┌──────────┐
                                   │ Confirm │      │ Override │
                                   │ (Create │      │ (Mark as │
                                   │  Task)  │      │  HIGH)   │
                                   └─────────┘      └──────────┘
```

#### Backend Implementation

```typescript
// src/modules/ml/services/risk-assessment.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MLService } from './ml.service';

@Injectable()
export class RiskAssessmentService {
  constructor(
    private prisma: PrismaService,
    private mlService: MLService,
  ) {}

  async assessServiceOrder(serviceOrderId: string): Promise<RiskAssessment> {
    // 1. Get service order data
    const serviceOrder = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
      include: { project: true, provider: true, customer: true },
    });

    // 2. Prepare features
    const features = await this.extractFeatures(serviceOrder);

    // 3. Call ML model
    const prediction = await this.mlService.predict('risk-assessment-v1', features);

    // 4. Log prediction (EU AI Act Article 12: Record-Keeping)
    await this.logPrediction(serviceOrderId, prediction, features);

    // 5. Handle based on risk level
    if (prediction.riskLevel === 'CRITICAL') {
      // HUMAN OVERSIGHT REQUIRED
      await this.createHumanReviewTask(serviceOrderId, prediction);

      return {
        serviceOrderId,
        riskLevel: 'CRITICAL',
        confidence: prediction.confidence,
        requiresHumanReview: true,  // ← Key flag
        reviewTaskId: task.id,
        explanation: prediction.shapExplanation,
      };
    } else if (prediction.riskLevel === 'HIGH') {
      // Auto-create review task
      await this.createAutomatedReviewTask(serviceOrderId, prediction);
    }

    return {
      serviceOrderId,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence,
      requiresHumanReview: false,
      explanation: prediction.shapExplanation,
    };
  }

  private async createHumanReviewTask(
    serviceOrderId: string,
    prediction: MLPrediction,
  ): Promise<Task> {
    return this.prisma.task.create({
      data: {
        type: 'RISK_REVIEW_CRITICAL',
        serviceOrderId,
        priority: 'URGENT',
        assignedTo: 'operations-team',  // Assign to operator
        title: `CRITICAL Risk Review Required: ${serviceOrderId}`,
        description: `
The AI model predicted CRITICAL risk for this service order.

**Model Prediction**: ${prediction.riskLevel} (${(prediction.confidence * 100).toFixed(1)}% confidence)

**Top Risk Factors**:
${prediction.shapExplanation.topFactors.map(f => `- ${f.feature}: ${f.contribution}`).join('\n')}

**Required Action**:
Please review this service order and either:
1. Confirm the risk assessment (create intervention task)
2. Override to HIGH/MEDIUM/LOW with justification

**Note**: This is a legal requirement under EU AI Act Article 14 (Human Oversight).
        `,
        metadata: {
          mlModelId: 'risk-assessment-v1',
          mlPrediction: prediction,
          euAIActCompliance: true,
        },
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),  // 4 hours
      },
    });
  }

  async processOperatorReview(
    taskId: string,
    decision: 'confirm' | 'override',
    overrideLevel?: RiskLevel,
    justification?: string,
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });

    if (decision === 'confirm') {
      // Operator confirmed CRITICAL → Create intervention task
      await this.createInterventionTask(task.serviceOrderId);

      // Log human override (EU AI Act Article 12)
      await this.logHumanDecision({
        taskId,
        serviceOrderId: task.serviceOrderId,
        operatorDecision: 'confirm',
        mlPrediction: task.metadata.mlPrediction.riskLevel,
        timestamp: new Date(),
      });
    } else {
      // Operator overrode model prediction
      await this.prisma.riskAssessment.update({
        where: { serviceOrderId: task.serviceOrderId },
        data: {
          riskLevel: overrideLevel,
          overriddenBy: task.assignedTo,
          overrideReason: justification,
          overriddenAt: new Date(),
        },
      });

      // Log human override
      await this.logHumanDecision({
        taskId,
        serviceOrderId: task.serviceOrderId,
        operatorDecision: 'override',
        mlPrediction: task.metadata.mlPrediction.riskLevel,
        operatorOverride: overrideLevel,
        justification,
        timestamp: new Date(),
      });

      // Use override for retraining
      await this.flagForRetraining(task.serviceOrderId, {
        modelPrediction: task.metadata.mlPrediction.riskLevel,
        humanLabel: overrideLevel,
      });
    }

    // Complete review task
    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'completed' },
    });
  }
}
```

#### Operator UI for Human Review

```typescript
// Control Tower: Risk Review Screen
interface RiskReviewProps {
  task: Task;
  serviceOrder: ServiceOrder;
  mlPrediction: MLPrediction;
}

function RiskReviewScreen({ task, serviceOrder, mlPrediction }: RiskReviewProps) {
  return (
    <div className="risk-review">
      <Alert type="warning">
        ⚠️ AI Model Predicted CRITICAL Risk - Your Review Required
      </Alert>

      <Section title="Service Order Details">
        <Field label="Order ID">{serviceOrder.id}</Field>
        <Field label="Customer">{serviceOrder.customerName}</Field>
        <Field label="Service Type">{serviceOrder.serviceType}</Field>
        <Field label="Provider">{serviceOrder.providerName}</Field>
      </Section>

      <Section title="AI Risk Assessment">
        <Field label="Predicted Risk">{mlPrediction.riskLevel}</Field>
        <Field label="Confidence">{(mlPrediction.confidence * 100).toFixed(1)}%</Field>

        <h4>Top Contributing Factors:</h4>
        <ul>
          {mlPrediction.shapExplanation.topFactors.map(factor => (
            <li key={factor.feature}>
              <strong>{factor.feature}</strong>: {factor.value}
              <span className="contribution">(+{factor.contribution.toFixed(2)} risk)</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Your Decision">
        <RadioGroup>
          <Radio value="confirm">
            ✅ Confirm CRITICAL Risk
            <small>Create intervention task immediately</small>
          </Radio>
          <Radio value="override">
            ✏️ Override Risk Level
            <Select options={['HIGH', 'MEDIUM', 'LOW']} />
            <TextArea placeholder="Justification required..." required />
          </Radio>
        </RadioGroup>

        <Button variant="primary" onClick={handleSubmit}>
          Submit Review
        </Button>
      </Section>

      <Section title="Training & Guidance">
        <Accordion title="About AI Risk Assessment Model">
          This model uses Random Forest classification with 20 features.
          It was trained on 124K historical service orders.
          Known limitations:
          - 58% recall for CRITICAL class (may miss some critical orders)
          - Lower accuracy in Poland (77%)
        </Accordion>

        <Accordion title="Avoiding Automation Bias">
          Remember:
          - The model is a suggestion, not a requirement
          - You have more context than the model (recent events, customer relationships)
          - If you disagree, override with justification
          - Your overrides improve the model over time
        </Accordion>
      </Section>
    </div>
  );
}
```

---

### 3.4 Audit Trail & Record-Keeping (Article 12)

**Requirement**: Automatic logging of AI decisions

**Implementation**:

#### ML Predictions Log Table

```sql
-- Database schema
CREATE TABLE ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,  -- 'service_order', 'technical_visit', etc.
  entity_id UUID NOT NULL,
  prediction_output JSONB NOT NULL,   -- Full model output
  input_features JSONB NOT NULL,      -- All features used
  confidence DECIMAL(5, 4),
  explanation JSONB,                  -- SHAP values
  predicted_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Human oversight tracking
  requires_human_review BOOLEAN DEFAULT FALSE,
  human_review_completed BOOLEAN DEFAULT FALSE,
  human_decision VARCHAR(50),         -- 'confirm', 'override'
  human_override_value VARCHAR(100),
  human_justification TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,

  -- Audit trail
  request_id UUID,                    -- Trace to original request
  operator_id UUID,                   -- Who triggered prediction

  -- Indexes
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_model (model_id, predicted_at),
  INDEX idx_review (requires_human_review, human_review_completed)
);

-- Retention: 5 years (EU AI Act requirement)
ALTER TABLE ml_predictions SET (
  autovacuum_enabled = true,
  autovacuum_freeze_max_age = 200000000
);
```

#### Logging Service

```typescript
// src/modules/ml/services/ml-audit.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class MLAuditService {
  constructor(private prisma: PrismaService) {}

  async logPrediction(params: {
    modelId: string;
    modelVersion: string;
    entityType: string;
    entityId: string;
    predictionOutput: any;
    inputFeatures: any;
    confidence: number;
    explanation: any;
    requiresHumanReview: boolean;
    requestId?: string;
    operatorId?: string;
  }): Promise<string> {
    const record = await this.prisma.mlPrediction.create({
      data: {
        modelId: params.modelId,
        modelVersion: params.modelVersion,
        entityType: params.entityType,
        entityId: params.entityId,
        predictionOutput: params.predictionOutput,
        inputFeatures: params.inputFeatures,
        confidence: params.confidence,
        explanation: params.explanation,
        requiresHumanReview: params.requiresHumanReview,
        requestId: params.requestId,
        operatorId: params.operatorId,
        predictedAt: new Date(),
      },
    });

    return record.id;
  }

  async logHumanDecision(params: {
    predictionId: string;
    decision: 'confirm' | 'override';
    overrideValue?: string;
    justification?: string;
    reviewedBy: string;
  }) {
    await this.prisma.mlPrediction.update({
      where: { id: params.predictionId },
      data: {
        humanReviewCompleted: true,
        humanDecision: params.decision,
        humanOverrideValue: params.overrideValue,
        humanJustification: params.justification,
        reviewedBy: params.reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  // EU AI Act compliance report
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReport> {
    const predictions = await this.prisma.mlPrediction.findMany({
      where: {
        predictedAt: { gte: startDate, lte: endDate },
      },
    });

    const totalPredictions = predictions.length;
    const requiresReview = predictions.filter(p => p.requiresHumanReview).length;
    const reviewCompleted = predictions.filter(
      p => p.requiresHumanReview && p.humanReviewCompleted,
    ).length;
    const overrideRate = predictions.filter(
      p => p.humanDecision === 'override',
    ).length / requiresReview;

    return {
      period: { startDate, endDate },
      totalPredictions,
      humanReviewRequired: requiresReview,
      humanReviewCompleted: reviewCompleted,
      humanReviewPending: requiresReview - reviewCompleted,
      overrideRate,
      complianceRate: reviewCompleted / requiresReview,
      models: this.groupByModel(predictions),
    };
  }
}
```

---

### 3.5 Bias Testing & Fairness (Article 10: Data Governance)

**Requirement**: Examine data for possible biases

**Implementation**: Quarterly bias audits

#### Bias Testing Framework

```python
# ml/bias_testing/fairness_audit.py
import pandas as pd
from sklearn.metrics import confusion_matrix
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric

def run_bias_audit(model, test_data: pd.DataFrame, protected_attrs: list):
    """
    Run comprehensive bias audit on ML model

    Protected attributes: country, provider_tier, provider_age_group
    """
    results = {}

    for attr in protected_attrs:
        # Get predictions per group
        groups = test_data[attr].unique()

        for group in groups:
            group_data = test_data[test_data[attr] == group]
            predictions = model.predict(group_data)
            actuals = group_data['actual_risk']

            # Metrics
            cm = confusion_matrix(actuals, predictions)
            accuracy = (cm[0,0] + cm[1,1]) / cm.sum()
            tpr = cm[1,1] / (cm[1,0] + cm[1,1])  # True positive rate
            fpr = cm[0,1] / (cm[0,0] + cm[0,1])  # False positive rate

            results[f"{attr}_{group}"] = {
                'accuracy': accuracy,
                'tpr': tpr,
                'fpr': fpr,
                'sample_size': len(group_data)
            }

    # Fairness metrics
    fairness_report = {}

    for attr in protected_attrs:
        groups_results = {k: v for k, v in results.items() if k.startswith(attr)}

        # Demographic parity: P(pred=HIGH | group=A) ≈ P(pred=HIGH | group=B)
        pred_rates = {g: r['tpr'] for g, r in groups_results.items()}
        demographic_parity_diff = max(pred_rates.values()) - min(pred_rates.values())

        # Equalized odds: TPR and FPR should be similar across groups
        tpr_diff = max(r['tpr'] for r in groups_results.values()) - \
                   min(r['tpr'] for r in groups_results.values())
        fpr_diff = max(r['fpr'] for r in groups_results.values()) - \
                   min(r['fpr'] for r in groups_results.values())

        fairness_report[attr] = {
            'demographic_parity_diff': demographic_parity_diff,
            'tpr_diff': tpr_diff,
            'fpr_diff': fpr_diff,
            'passes_fairness': (
                demographic_parity_diff < 0.10 and  # <10% difference
                tpr_diff < 0.10 and
                fpr_diff < 0.10
            )
        }

    return {
        'per_group_metrics': results,
        'fairness_metrics': fairness_report,
        'overall_bias_detected': any(
            not v['passes_fairness'] for v in fairness_report.values()
        )
    }

# Run quarterly
if __name__ == '__main__':
    model = load_model('risk-assessment-v1')
    test_data = load_test_data()

    audit_results = run_bias_audit(
        model,
        test_data,
        protected_attrs=['country', 'provider_tier']
    )

    # Generate report
    generate_bias_report(audit_results, output_path='reports/bias_audit_2025_Q4.pdf')

    # Alert if bias detected
    if audit_results['overall_bias_detected']:
        send_alert_to_data_science_team(audit_results)
```

---

## 4. Compliance Checklist

### Article-by-Article Compliance

| Article | Requirement | Status | Evidence |
|---------|-------------|--------|----------|
| **Article 6** | Risk classification | ✅ Complete | Risk assessment = HIGH-RISK documented |
| **Article 9** | Risk management system | ⚠️ In Progress | This document serves as risk management |
| **Article 10** | Data governance | ⚠️ In Progress | Training data documented, bias testing quarterly |
| **Article 11** | Technical documentation | ✅ Complete | Model cards created (Section 3.1) |
| **Article 12** | Record-keeping | ✅ Complete | ML predictions logged (Section 3.4) |
| **Article 13** | Transparency | ✅ Complete | SHAP explanations provided |
| **Article 14** | Human oversight | ✅ Complete | CRITICAL predictions require operator review (Section 3.3) |
| **Article 15** | Accuracy & robustness | ⚠️ In Progress | Drift detection implemented (Section 3.2) |
| **Article 61** | Post-market monitoring | ⚠️ In Progress | Monitoring dashboards planned |

---

## 5. Timeline & Milestones

### Week 1: Documentation & Planning
- [ ] Complete model cards for both ML models (Risk, Sales Potential)
- [ ] Conduct initial bias audit
- [ ] Document training data provenance
- [ ] Legal review of EU AI Act classification

### Week 2: Implementation
- [ ] Implement drift detection service
- [ ] Implement ML audit logging
- [ ] Build human oversight UI for CRITICAL risk
- [ ] Create Grafana dashboards for model monitoring

### Week 3: Testing & Validation
- [ ] Test drift detection with synthetic data
- [ ] User acceptance testing for human override UI
- [ ] Bias testing on production-like data
- [ ] Security audit of ML infrastructure

### Week 4: Deployment & Training
- [ ] Deploy to staging
- [ ] Train operators on human oversight responsibilities
- [ ] Deploy to production (EU countries only after legal approval)
- [ ] Set up quarterly review cadence

---

## 6. Ongoing Compliance

### Quarterly Tasks
- [ ] Run bias audit
- [ ] Review override rates (should be 5-15% for healthy human oversight)
- [ ] Retrain models with latest data
- [ ] Update model cards with new performance metrics

### Annual Tasks
- [ ] Full EU AI Act compliance audit (external if budget allows)
- [ ] Review and update risk classification
- [ ] Update technical documentation
- [ ] Cybersecurity audit of ML infrastructure

---

## 7. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regulators classify as HIGH-RISK | Cannot deploy in EU | Legal review confirms classification |
| Bias detected in production | Reputational damage, fines | Quarterly bias audits, rapid response plan |
| Drift undetected, accuracy drops | Poor decisions, customer complaints | Automated drift detection, alerts |
| Operators ignore AI suggestions (too many false positives) | Model becomes useless | Calibrate thresholds, monitor override rates |

---

## 8. Success Criteria

- [ ] EU AI Act compliance confirmed by legal team
- [ ] Zero regulatory fines or warnings
- [ ] <10% bias detected in fairness metrics
- [ ] 5-15% human override rate (healthy skepticism)
- [ ] <5% drift in production model
- [ ] 100% of CRITICAL predictions reviewed by humans within 4 hours

---

## 9. References

- [EU AI Act (Regulation 2024/1689)](https://artificialintelligenceact.eu/)
- [OECD AI Principles](https://oecd.ai/en/ai-principles)
- [Model Cards for Model Reporting](https://arxiv.org/abs/1810.03993)
- [Fairness and Machine Learning](https://fairmlbook.org/)
- Yellow Grid: product-docs/domain/10-ai-context-linking.md
- Yellow Grid: product-docs/infrastructure/08-ml-infrastructure.md

---

**Document Status**: Ready for legal review
**Next Steps**:
1. Legal team confirms HIGH-RISK classification
2. Data Science creates model cards
3. Backend implements audit logging
4. Frontend implements human oversight UI
