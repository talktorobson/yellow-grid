# ML Infrastructure Specification

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Owner**: Engineering & Data Science
**Status**: Specification

---

## Table of Contents

1. [Overview](#1-overview)
2. [ML Model Catalog](#2-ml-model-catalog)
3. [Model Serving Architecture](#3-model-serving-architecture)
4. [Model Training Pipeline](#4-model-training-pipeline)
5. [Feature Store](#5-feature-store)
6. [Model Versioning & Registry](#6-model-versioning--registry)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Infrastructure Components](#8-infrastructure-components)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Security & Access Control](#10-security--access-control)
11. [Cost Optimization](#11-cost-optimization)
12. [Disaster Recovery](#12-disaster-recovery)

---

## 1. Overview

### 1.1 Purpose

The **ML Infrastructure** provides the foundation for deploying, serving, and managing machine learning models within the FSM platform. It supports the AI-powered features including:

- **Sales Potential Scoring**: XGBoost model for TV/Quotation conversion prediction
- **Risk Assessment**: Random Forest model for service order risk detection
- **Context Linking**: NLP-based service order similarity matching

### 1.2 Key Requirements

**Performance**:
- Model inference latency: < 100ms (p95)
- Support for 1000+ concurrent predictions
- Batch processing: 10,000+ service orders/hour

**Reliability**:
- 99.9% uptime for model serving
- Automatic failover and model rollback
- Graceful degradation if ML services unavailable

**Scalability**:
- Horizontal scaling based on load
- Support for multiple model versions concurrently
- Multi-region deployment capability

**Maintainability**:
- Automated model training and deployment pipelines
- Centralized model versioning and registry
- A/B testing framework for model evaluation

---

## 2. ML Model Catalog

### 2.1 Active Models

| Model Name | Algorithm | Purpose | Input Features | Output | Latency Target | Update Frequency |
|------------|-----------|---------|----------------|--------|----------------|------------------|
| **Sales Potential Scorer** | XGBoost | Predict TV/Quotation conversion probability | 15 features | 3-class (LOW/MEDIUM/HIGH) + score | < 50ms | Monthly |
| **Risk Assessment Scorer** | Random Forest | Identify high-risk service orders | 20 features | 4-class (LOW/MEDIUM/HIGH/CRITICAL) + factors | < 100ms | Monthly |
| **Context Linker** | Embedding + Cosine Similarity | Find related service orders | Text embeddings (384-dim) | Similarity scores | < 200ms | Quarterly |

### 2.2 Model Dependencies

**External Services**:
- **OpenAI Embeddings API**: Text embedding generation (text-embedding-3-small)
- **Sentiment Analysis**: Customer/salesman note sentiment scoring

**Internal Services**:
- PostgreSQL: Feature data retrieval
- Redis: Feature caching
- GCS: Model artifact storage

---

## 3. Model Serving Architecture

### 3.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                              │
│                  (NestJS Backend Services)                      │
└────────────────┬──────────────────────────┬────────────────────┘
                 │                          │
                 ▼                          ▼
    ┌───────────────────────┐  ┌───────────────────────┐
    │   Sales Potential     │  │   Risk Assessment     │
    │   Service (Python)    │  │   Service (Python)    │
    │                       │  │                       │
    │   - FastAPI           │  │   - FastAPI           │
    │   - XGBoost           │  │   - scikit-learn      │
    │   - Feature Extractor │  │   - Feature Extractor │
    └───────────┬───────────┘  └───────────┬───────────┘
                │                          │
                ▼                          ▼
    ┌───────────────────────────────────────────────────┐
    │            Feature Store (Redis)                  │
    │   - Cached customer history                       │
    │   - Cached provider metrics                       │
    │   - Pre-computed embeddings                       │
    └───────────────────────────────────────────────────┘
                │
                ▼
    ┌───────────────────────────────────────────────────┐
    │         PostgreSQL (Source Data)                  │
    │   - service_orders                                │
    │   - claims, reschedules                           │
    │   - provider_metrics                              │
    └───────────────────────────────────────────────────┘
```

### 3.2 Model Serving Components

#### 3.2.1 FastAPI Model Services

**Technology**: FastAPI (Python 3.11+)

**Purpose**: HTTP API endpoints for model inference

**Endpoints**:

```python
# Sales Potential Scorer
POST /api/ml/v1/sales-potential/predict
{
  "service_order_id": "so_abc123"
}

Response:
{
  "potential": "HIGH",
  "score": 85,
  "confidence": 92,
  "reasoning": [
    "High pre-estimation value: €15,000 (+12.3 score)",
    "Positive salesman sentiment in notes (+8.7 score)"
  ],
  "inference_time_ms": 42
}

# Risk Assessment Scorer
POST /api/ml/v1/risk-assessment/predict
{
  "service_order_id": "so_xyz789",
  "triggered_by": "BATCH_JOB"
}

Response:
{
  "risk_level": "HIGH",
  "risk_score": 75,
  "confidence": 88,
  "risk_factors": [
    {
      "factor": "MULTIPLE_RESCHEDULES",
      "description": "Rescheduled 3 times",
      "weight": 0.35,
      "severity": "CRITICAL"
    }
  ],
  "recommended_actions": [
    "⚠️ URGENT: Review service order before check-in"
  ],
  "inference_time_ms": 68
}
```

#### 3.2.2 Model Loader

**Purpose**: Load trained models from GCS into memory at service startup

**Implementation**:

```python
# model_loader.py
from google.cloud import storage
import joblib
from pathlib import Path
import json

class ModelLoader:
    def __init__(self, gcs_bucket: str, model_registry_path: str):
        self.storage_client = storage.Client()
        self.bucket = self.storage_client.bucket(gcs_bucket)
        self.registry_path = model_registry_path
        self.models = {}

    def load_model(self, model_name: str, version: str = 'latest'):
        """Load model from GCS into memory"""
        if version == 'latest':
            version = self._get_latest_version(model_name)

        model_path = f"{self.registry_path}/{model_name}/{version}/model.pkl"
        local_path = f"/tmp/{model_name}_{version}.pkl"

        # Download from GCS
        blob = self.bucket.blob(model_path)
        blob.download_to_filename(local_path)

        # Load with joblib
        model = joblib.load(local_path)

        # Cache in memory
        self.models[f"{model_name}:{version}"] = model

        return model

    def get_model(self, model_name: str, version: str = 'latest'):
        """Get cached model or load if not cached"""
        key = f"{model_name}:{version}"
        if key not in self.models:
            return self.load_model(model_name, version)
        return self.models[key]

    def _get_latest_version(self, model_name: str) -> str:
        """Get latest model version from registry metadata"""
        metadata_path = f"{self.registry_path}/{model_name}/latest.json"
        blob = self.bucket.blob(metadata_path)
        metadata = json.loads(blob.download_as_text())
        return metadata['version']
```

#### 3.2.3 Feature Extractor

**Purpose**: Extract and prepare features for model inference

**Implementation**:

```python
# feature_extractor.py
from typing import Dict, Any
import asyncio
from redis import Redis
from sqlalchemy.ext.asyncio import AsyncSession

class FeatureExtractor:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis

    async def extract_sales_potential_features(
        self,
        service_order_id: str
    ) -> Dict[str, Any]:
        """Extract 15 features for sales potential scoring"""
        # Check cache first
        cache_key = f"features:sales_potential:{service_order_id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Fetch service order
        service_order = await self._fetch_service_order(service_order_id)

        # Fetch related data in parallel
        pre_estimation, customer_history, embeddings = await asyncio.gather(
            self._fetch_pre_estimation(service_order.sales_pre_estimation_id),
            self._fetch_customer_history(service_order.customer_id),
            self._generate_salesman_notes_embedding(service_order.salesman_notes)
        )

        # Build feature vector
        features = {
            # Pre-estimation features
            "pre_estimation_value": pre_estimation.estimated_value if pre_estimation else None,
            "pre_estimation_confidence": self._map_confidence(pre_estimation),
            "has_pre_estimation": pre_estimation is not None,

            # Product features
            "product_category_count": len(set(p.category for p in service_order.products)),
            "avg_product_price": sum(p.unit_price for p in service_order.products) / len(service_order.products),
            "has_high_value_products": any(p.unit_price > 5000 for p in service_order.products),
            "product_categories": [p.category for p in service_order.products],

            # Customer features
            "customer_historical_orders": len(customer_history),
            "customer_avg_order_value": self._calculate_avg_order_value(customer_history),
            "customer_project_count": len(set(o.project_id for o in customer_history)),
            "is_returning_customer": len(customer_history) > 0,

            # Salesman notes
            "salesman_notes_embedding": embeddings.tolist() if embeddings else [],
            "salesman_notes_length": len(service_order.salesman_notes or ""),
            "salesman_sentiment": await self._analyze_sentiment(service_order.salesman_notes),

            # Context
            "sales_channel": service_order.source_system
        }

        # Cache for 1 hour
        await self.redis.setex(cache_key, 3600, json.dumps(features))

        return features

    async def extract_risk_assessment_features(
        self,
        service_order_id: str
    ) -> Dict[str, Any]:
        """Extract 20 features for risk assessment"""
        # Similar implementation with 20 features
        # ... (claims, reschedules, provider metrics, etc.)
        pass
```

### 3.3 Load Balancing & Scaling

**Technology**: Kubernetes HPA (Horizontal Pod Autoscaler)

**Scaling Rules**:

```yaml
# ml-services-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sales-potential-scorer-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sales-potential-scorer
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: inference_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

---

## 4. Model Training Pipeline

### 4.1 Training Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Training Orchestrator                        │
│                    (Apache Airflow / Kubeflow)                  │
└────────────────┬──────────────────────────┬────────────────────┘
                 │                          │
                 ▼                          ▼
    ┌───────────────────────┐  ┌───────────────────────┐
    │   Data Extraction     │  │  Feature Engineering  │
    │   - SQL queries       │  │  - Transform data     │
    │   - Export to GCS     │  │  - Create features    │
    └───────────┬───────────┘  └───────────┬───────────┘
                │                          │
                └──────────────┬───────────┘
                               ▼
                   ┌───────────────────────┐
                   │  Model Training       │
                   │  - XGBoost/RF         │
                   │  - Hyperparameter     │
                   │    tuning (Optuna)    │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  Model Evaluation     │
                   │  - Validation metrics │
                   │  - A/B test readiness │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  Model Registry (GCS) │
                   │  - Version model      │
                   │  - Tag as candidate   │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  Deployment (CI/CD)   │
                   │  - Canary rollout     │
                   │  - Monitoring         │
                   └───────────────────────┘
```

### 4.2 Training Schedule

**Sales Potential Scorer**:
- **Frequency**: Monthly (1st of each month, 2:00 AM UTC)
- **Training Data**: Last 6 months of TV/Quotation service orders with outcomes
- **Minimum Samples**: 1,000+ labeled examples
- **Trigger**: Airflow DAG scheduled run or manual trigger

**Risk Assessment Scorer**:
- **Frequency**: Monthly (15th of each month, 2:00 AM UTC)
- **Training Data**: Last 12 months of service orders with risk outcomes
- **Minimum Samples**: 5,000+ labeled examples
- **Trigger**: Airflow DAG scheduled run or manual trigger

### 4.3 Airflow DAG Example

```python
# dags/train_sales_potential_model.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.google.cloud.operators.kubernetes_engine import GKEStartPodOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-science',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5)
}

with DAG(
    'train_sales_potential_model',
    default_args=default_args,
    description='Train Sales Potential Scorer (XGBoost)',
    schedule_interval='0 2 1 * *',  # Monthly on 1st at 2 AM
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=['ml', 'training', 'sales-potential']
) as dag:

    # Task 1: Extract training data from PostgreSQL
    extract_data = PythonOperator(
        task_id='extract_training_data',
        python_callable=extract_tv_quotation_data,
        op_kwargs={
            'lookback_months': 6,
            'gcs_output_path': 'gs://fsm-ml-data/sales-potential/training-data/'
        }
    )

    # Task 2: Feature engineering
    engineer_features = PythonOperator(
        task_id='engineer_features',
        python_callable=engineer_sales_potential_features,
        op_kwargs={
            'gcs_input_path': 'gs://fsm-ml-data/sales-potential/training-data/',
            'gcs_output_path': 'gs://fsm-ml-data/sales-potential/features/'
        }
    )

    # Task 3: Train XGBoost model
    train_model = PythonOperator(
        task_id='train_xgboost_model',
        python_callable=train_sales_potential_model,
        op_kwargs={
            'gcs_features_path': 'gs://fsm-ml-data/sales-potential/features/',
            'gcs_model_output': 'gs://fsm-ml-models/sales-potential/',
            'hyperparameters': {
                'n_estimators': 100,
                'max_depth': 6,
                'learning_rate': 0.1
            }
        }
    )

    # Task 4: Evaluate model
    evaluate_model = PythonOperator(
        task_id='evaluate_model',
        python_callable=evaluate_sales_potential_model,
        op_kwargs={
            'gcs_model_path': 'gs://fsm-ml-models/sales-potential/',
            'gcs_test_data': 'gs://fsm-ml-data/sales-potential/test-data/',
            'metrics_threshold': {
                'accuracy': 0.75,
                'precision_high': 0.80,
                'recall_high': 0.70
            }
        }
    )

    # Task 5: Register model in registry
    register_model = PythonOperator(
        task_id='register_model',
        python_callable=register_model_version,
        op_kwargs={
            'model_name': 'sales-potential-scorer',
            'gcs_model_path': 'gs://fsm-ml-models/sales-potential/',
            'tag': 'candidate'
        }
    )

    # Task 6: Notify data science team
    notify_team = PythonOperator(
        task_id='notify_team',
        python_callable=send_training_notification,
        op_kwargs={
            'model_name': 'Sales Potential Scorer',
            'slack_channel': '#ml-notifications'
        }
    )

    # Task dependencies
    extract_data >> engineer_features >> train_model >> evaluate_model >> register_model >> notify_team
```

---

## 5. Feature Store

### 5.1 Purpose

The **Feature Store** provides:
- Centralized feature caching to reduce database load
- Pre-computed features for faster inference
- Consistent feature definitions across training and serving

### 5.2 Technology Stack

**Primary**: Redis (Valkey)

**Schema**:

```python
# Feature cache keys
features:sales_potential:{service_order_id} = {
  "pre_estimation_value": 15000.0,
  "customer_historical_orders": 5,
  "salesman_sentiment": 0.82,
  # ... all 15 features
  "cached_at": "2025-01-16T10:00:00Z",
  "ttl_seconds": 3600
}

features:risk_assessment:{service_order_id} = {
  "claim_count": 2,
  "reschedule_count": 3,
  "provider_quality_score": 55,
  # ... all 20 features
  "cached_at": "2025-01-16T10:00:00Z",
  "ttl_seconds": 3600
}

# Pre-computed embeddings
embeddings:salesman_notes:{service_order_id} = [0.12, -0.34, 0.56, ...] # 384-dim vector
```

### 5.3 Cache Invalidation

**TTL-based**: Features expire after 1 hour

**Event-based**: Invalidate cache on relevant domain events:
- `projects.service_order.updated` → Invalidate all features for that SO
- `projects.salesman_notes.updated` → Invalidate embeddings
- `sales.pre_estimation.linked` → Invalidate sales potential features

---

## 6. Model Versioning & Registry

### 6.1 Model Registry Structure (GCS)

```
gs://fsm-ml-models/
├── sales-potential-scorer/
│   ├── v1.0.0/
│   │   ├── model.pkl              # Serialized XGBoost model
│   │   ├── metadata.json          # Training metadata
│   │   ├── metrics.json           # Validation metrics
│   │   └── feature_schema.json   # Feature definitions
│   ├── v1.1.0/
│   │   ├── model.pkl
│   │   ├── metadata.json
│   │   ├── metrics.json
│   │   └── feature_schema.json
│   └── latest.json                # Pointer to production version
│
├── risk-assessment-scorer/
│   ├── v1.0.0/
│   │   ├── model.pkl              # Serialized Random Forest model
│   │   ├── metadata.json
│   │   ├── metrics.json
│   │   └── feature_schema.json
│   └── latest.json
│
└── registry_metadata.json         # Global registry metadata
```

### 6.2 Model Metadata Schema

```json
{
  "model_name": "sales-potential-scorer",
  "version": "v1.1.0",
  "algorithm": "XGBoost",
  "training_date": "2025-01-01T02:00:00Z",
  "training_duration_minutes": 45,
  "training_samples": 5432,
  "hyperparameters": {
    "n_estimators": 100,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8
  },
  "validation_metrics": {
    "accuracy": 0.78,
    "precision_high": 0.82,
    "recall_high": 0.74,
    "f1_score": 0.77
  },
  "feature_count": 15,
  "model_size_mb": 12.4,
  "inference_latency_ms_p95": 42,
  "trained_by": "airflow_dag_train_sales_potential_model",
  "status": "candidate",  // candidate | production | archived
  "deployed_at": null,
  "tags": ["monthly-retrain", "2025-01"]
}
```

### 6.3 Model Promotion Workflow

```
1. Model training completes → Status: "candidate"
2. Data scientist reviews metrics → Manual approval
3. Canary deployment (10% traffic) → Monitor for 24 hours
4. If metrics stable → Gradual rollout (50%, 100%)
5. Update latest.json → Status: "production"
6. Previous production model → Status: "archived"
```

---

## 7. Monitoring & Observability

### 7.1 Model Performance Metrics

**Inference Metrics** (Prometheus):

```python
# Latency metrics
inference_latency_seconds = Histogram(
    'ml_inference_latency_seconds',
    'Model inference latency',
    ['model_name', 'version'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

# Request metrics
inference_requests_total = Counter(
    'ml_inference_requests_total',
    'Total inference requests',
    ['model_name', 'version', 'status']  # status: success | error
)

# Prediction distribution
prediction_distribution = Histogram(
    'ml_prediction_value',
    'Distribution of prediction values',
    ['model_name', 'prediction_class']
)

# Feature extraction metrics
feature_extraction_latency = Histogram(
    'ml_feature_extraction_latency_seconds',
    'Feature extraction latency',
    ['model_name']
)

# Cache hit rate
feature_cache_hits = Counter(
    'ml_feature_cache_hits_total',
    'Feature cache hits',
    ['model_name', 'cache_status']  # hit | miss
)
```

**Model Quality Metrics** (Daily Batch):

```python
# Prediction accuracy (ground truth comparison)
model_accuracy = Gauge(
    'ml_model_accuracy',
    'Model prediction accuracy (7-day window)',
    ['model_name', 'version']
)

# Prediction drift
prediction_drift = Gauge(
    'ml_prediction_drift',
    'Distribution shift in predictions',
    ['model_name', 'metric']  # KL divergence, PSI
)

# Feature drift
feature_drift = Gauge(
    'ml_feature_drift',
    'Distribution shift in input features',
    ['model_name', 'feature_name']
)
```

### 7.2 Alerting Rules

**Critical Alerts**:
- Inference latency p95 > 200ms for 5 minutes
- Error rate > 5% for 2 minutes
- Model service unavailable for 1 minute

**Warning Alerts**:
- Cache hit rate < 70% for 15 minutes
- Prediction drift > 0.15 (KL divergence)
- Feature drift > 0.20 for any feature

### 7.3 Dashboards

**Grafana Dashboard**: ML Model Performance

```
Row 1: Overview
- Total inference requests (24h)
- Average latency (p50, p95, p99)
- Error rate (%)
- Cache hit rate (%)

Row 2: Model-Specific Metrics
- Sales Potential Scorer: Prediction distribution (LOW/MEDIUM/HIGH)
- Risk Assessment Scorer: Prediction distribution (LOW/MEDIUM/HIGH/CRITICAL)

Row 3: Performance Trends
- Latency trend (7 days)
- Request volume trend (7 days)
- Error rate trend (7 days)

Row 4: Model Quality
- Accuracy (7-day rolling window)
- Prediction drift (KL divergence)
- Feature drift heatmap
```

---

## 8. Infrastructure Components

### 8.1 Compute Resources

**Model Serving Pods** (Kubernetes):

```yaml
# sales-potential-scorer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sales-potential-scorer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sales-potential-scorer
  template:
    metadata:
      labels:
        app: sales-potential-scorer
        version: v1.1.0
    spec:
      containers:
      - name: ml-service
        image: fsm/sales-potential-scorer:v1.1.0
        ports:
        - containerPort: 8000
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
        env:
        - name: MODEL_VERSION
          value: "v1.1.0"
        - name: GCS_BUCKET
          value: "fsm-ml-models"
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: "/var/secrets/google/key.json"
        - name: REDIS_HOST
          value: "redis-feature-store"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ml-db-credentials
              key: url
        volumeMounts:
        - name: gcp-credentials
          mountPath: /var/secrets/google
          readOnly: true
      volumes:
      - name: gcp-credentials
        secret:
          secretName: gcp-ml-service-account
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### 8.2 Storage

**Model Artifacts** (GCS):
- Bucket: `fsm-ml-models`
- Versioning: Enabled
- Lifecycle: Archive models older than 12 months to ARCHIVE storage class

**Training Data** (GCS):
- Bucket: `fsm-ml-data`
- Retention: 24 months
- Encryption: Google-managed encryption keys (GMEK)

**Feature Cache** (Redis):
- Instance: Redis 7.0 (Valkey fork)
- Memory: 8 GB (expandable to 32 GB)
- Persistence: RDB snapshots every 6 hours
- Replication: Primary + 1 replica for HA

---

## 9. Deployment Strategy

### 9.1 Canary Deployment

**Phase 1: Canary (10% traffic)**:
```yaml
# istio-virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: sales-potential-scorer
spec:
  hosts:
  - sales-potential-scorer
  http:
  - match:
    - headers:
        x-model-version:
          exact: "canary"
    route:
    - destination:
        host: sales-potential-scorer
        subset: v1.1.0
      weight: 100
  - route:
    - destination:
        host: sales-potential-scorer
        subset: v1.0.0
      weight: 90
    - destination:
        host: sales-potential-scorer
        subset: v1.1.0
      weight: 10
```

**Phase 2: Gradual Rollout** (50% → 100%):
- Monitor metrics for 24 hours at each phase
- Automatic rollback if error rate > 5% or latency p95 > 200ms

### 9.2 Rollback Strategy

**Automatic Rollback Triggers**:
- Error rate > 10% for 2 minutes
- Latency p95 > 500ms for 5 minutes
- Model service crash loops (3 restarts in 5 minutes)

**Rollback Process**:
1. Update `latest.json` to previous production version
2. Restart model service pods with new model version
3. Verify health checks pass
4. Monitor metrics for 15 minutes

---

## 10. Security & Access Control

### 10.1 Authentication

**Service-to-Service**: mTLS (Istio service mesh)

**API Key Authentication**: For external ML service access (if needed)

### 10.2 Data Privacy

**PII Handling**:
- Salesman notes and customer comments are NOT stored in feature cache
- Embeddings are stored (no PII leakage)
- Model training data is anonymized (customer IDs hashed)

**GDPR Compliance**:
- Model training data includes only EU customers with consent
- Right to be forgotten: Remove customer data from training sets on request

### 10.3 Model Security

**Model Artifact Signing**: Sign model files with GPG to prevent tampering

**Access Control**:
- GCS bucket access: Data science team + CI/CD pipeline only
- Model serving pods: Read-only access to GCS models via Workload Identity
- Feature store (Redis): Application-level access only

---

## 11. Cost Optimization

### 11.1 Infrastructure Costs (Estimated)

| Component | Resource | Monthly Cost (USD) |
|-----------|----------|-------------------|
| Model Serving (GKE) | 6 pods × 2 CPU × 4 GB RAM | $360 |
| Feature Store (Memorystore/Self-hosted) | 8 GB memory, 1 replica | $100 |
| Model Storage (GCS) | 50 GB models + data | $10 |
| Training (on-demand GKE) | 2 monthly runs × 2 hours GPU | $30 |
| **Total** | | **$500/month** |

### 11.2 Cost Optimization Strategies

**Compute**:
- Use GKE Spot VMs for training (60% cost savings)
- Auto-scale model serving pods based on load
- Use ARM-based instances (Tau T2A) for 20% savings

**Storage**:
- Archive old model versions to GCS ARCHIVE storage class after 12 months
- Compress training data with Parquet format

**Feature Store**:
- Implement TTL-based expiration (1 hour) to reduce memory usage
- Use Redis compression for large feature vectors

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

**Model Artifacts** (GCS):
- GCS versioning enabled (retain last 10 versions)
- Multi-region or Dual-region bucket configuration (europe-west1 + europe-west3)

**Feature Store** (Redis):
- RDB snapshots every 6 hours to GCS
- Point-in-time recovery up to 24 hours

**Training Data**:
- GCS versioning enabled
- Retention: 24 months

### 12.2 Recovery Procedures

**Model Service Failure** (RTO: 5 minutes):
1. GKE auto-restarts failed pods
2. Health checks verify recovery
3. If persistent failure, rollback to previous model version

**Redis Failure** (RTO: 10 minutes):
1. Promote replica to primary (Memorystore automatic failover)
2. Application continues with degraded performance (direct DB queries)
3. Restore RDB snapshot from GCS to new primary

**GCS Region Failure** (RTO: 30 minutes):
1. Multi-region bucket automatically handles failover
2. Update model loader GCS bucket configuration (if needed)
3. Restart model service pods with new configuration

---

## Appendix A: API Reference

### A.1 Health Endpoints

```python
GET /health
Response: {"status": "healthy", "version": "v1.1.0"}

GET /ready
Response: {"status": "ready", "model_loaded": true}

GET /metrics
Response: Prometheus metrics in text format
```

### A.2 Inference Endpoints

See Section 3.2.1 for detailed endpoint specifications.

---

## Appendix B: Model Comparison

| Criteria | XGBoost (Sales Potential) | Random Forest (Risk Assessment) |
|----------|---------------------------|--------------------------------|
| **Accuracy** | 78% (3-class) | 72% (4-class) |
| **Training Time** | 15 min (5K samples) | 30 min (10K samples) |
| **Inference Latency** | 42ms (p95) | 68ms (p95) |
| **Model Size** | 12 MB | 45 MB |
| **Explainability** | SHAP values | Feature importance |
| **Update Frequency** | Monthly | Monthly |

---

**End of Document**
