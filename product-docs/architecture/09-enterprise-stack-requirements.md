# Enterprise Stack Requirements & Architecture Update

## Executive Summary

This document clarifies the **mandatory enterprise-grade stack requirements** driven by the largest client and updates all architecture documentation accordingly.

**Date**: 2025-01-15
**Status**: ✅ Authoritative Requirements

---

## Mandatory Technology Stack

### ✅ Required by Client Contract

These technologies are **non-negotiable** and must be used:

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Message Bus** | **Apache Kafka** | Client standard, enterprise event streaming |
| **Secrets Management** | **HashiCorp Vault** | Client security policy, dynamic secrets |
| **Database** | **PostgreSQL** | Client standard, proven at scale |
| **Observability** | **Datadog** | Client standard APM, full-stack visibility |
| **SSO/Identity** | **PingID** | Client identity provider (SAML 2.0/OIDC) |

### ✅ Available Third-Party Services

Pre-integrated services ready to use:

| Service | Provider | Use Case |
|---------|----------|----------|
| **Workflow Orchestration** | **Camunda Platform 8** | Long-running workflows, saga patterns |
| **E-Signature** | **Adobe Sign** | eIDAS-compliant digital signatures |
| **Messaging** | **Enterprise Messaging Service** | SMS/Email/Push notifications |

---

## GCP Service Strategy

### Principle: Use GCP Only Where It Makes Sense

**✅ Use GCP for:**
- **Compute**: GKE (Kubernetes orchestration)
- **Storage**: Cloud Storage (object storage for media)
- **Networking**: VPC, Load Balancer, Cloud NAT
- **CI/CD**: Cloud Build (optional, GitHub Actions preferred)

**❌ Don't use GCP managed services for:**
- ~~Cloud SQL~~ → Use **self-hosted PostgreSQL on GKE** (required by client)
- ~~Pub/Sub~~ → Use **Kafka** (required by client)
- ~~Secret Manager~~ → Use **Vault** (required by client)
- ~~Cloud Operations~~ → Use **Datadog** (required by client)
- ~~Memorystore~~ → Use **self-hosted Redis on GKE** (cost-effective, open-source)

**Rationale**:
- Avoid vendor lock-in where client already mandates specific tools
- Prefer enterprise-grade open-source solutions (Redis, PostgreSQL on K8s)
- Use GCP for infrastructure layer only (compute, network, storage)

---

## Multi-Sales System Data Model

### Requirement: Support Multiple Sales Systems & Channels

The platform must handle:

**Sales Systems** (order sources):
- **Pyxis** (current primary system)
- **Tempo** (future/regional system)
- Additional systems as clients expand

**Sales Channels**:
- Store (in-person sales)
- Web (e-commerce)
- Call center
- Mobile app
- Partner portals

**Implementation Strategy**:

```typescript
// Core domain model - sales system agnostic
interface ServiceOrder {
  id: UUID;

  // Multi-system support
  sourceSystem: 'pyxis' | 'tempo' | 'sap' | 'custom';
  externalOrderId: string;  // ID in source system
  salesChannel: 'store' | 'web' | 'call_center' | 'mobile' | 'partner';

  // Normalized fields (extracted from source system)
  customer: CustomerInfo;
  products: Product[];
  serviceType: ServiceType;
  address: Address;

  // Original payload (for audit/debugging)
  rawPayload: JSON;

  // System-specific metadata
  systemMetadata: Record<string, any>;
}
```

**Sales System Integration Adapters**:

```
src/
└── modules/
    └── integration/
        ├── pyxis-adapter/
        │   ├── pyxis-event-consumer.ts
        │   ├── pyxis-transformer.ts
        │   └── pyxis-api-client.ts
        ├── tempo-adapter/
        │   ├── tempo-event-consumer.ts
        │   ├── tempo-transformer.ts
        │   └── tempo-api-client.ts
        └── sales-adapter-interface.ts  # Common contract
```

**Database Schema**:

```sql
CREATE TABLE service_orders (
  id UUID PRIMARY KEY,

  -- Multi-system tracking
  source_system VARCHAR(50) NOT NULL,
  external_order_id VARCHAR(255) NOT NULL,
  sales_channel VARCHAR(50) NOT NULL,

  -- Multi-tenancy
  country_code VARCHAR(2) NOT NULL,
  bu_code VARCHAR(50) NOT NULL,
  store_code VARCHAR(50),

  -- Normalized data
  customer_data JSONB NOT NULL,
  products JSONB NOT NULL,
  service_type VARCHAR(100) NOT NULL,

  -- Audit
  raw_payload JSONB NOT NULL,
  system_metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint per source system
  UNIQUE(source_system, external_order_id)
);

CREATE INDEX idx_source_system ON service_orders (source_system, external_order_id);
CREATE INDEX idx_sales_channel ON service_orders (sales_channel);
CREATE INDEX idx_multi_tenant ON service_orders (country_code, bu_code, store_code);
```

---

## Architecture Revisions

### What Changed from Previous Docs

#### ❌ Removed/Revised

| Previous Recommendation | Revised Decision | Reason |
|------------------------|------------------|--------|
| **PostgreSQL Outbox Pattern** | ✅ Keep Kafka | Client requirement |
| **Cloud SQL** | ❌ Self-hosted PostgreSQL on GKE | Client requirement |
| **Secret Manager** | ❌ HashiCorp Vault | Client requirement |
| **Cloud Operations** | ❌ Datadog | Client requirement |
| **Remove Kafka** | ❌ Use Kafka | Client requirement |
| **Defer OpenSearch** | ✅ PostgreSQL FTS initially | Still valid (open-source) |

#### ✅ Added

| New Component | Purpose | Integration |
|---------------|---------|-------------|
| **Camunda Platform 8** | Workflow orchestration | Saga patterns, long-running processes |
| **Adobe Sign** | E-signatures | Contract signing, WCF digital signatures |
| **Enterprise Messaging** | Notifications | SMS, email, push via existing service |

---

## Updated Technology Stack

### Complete Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│ Operator Web:   React 18+ + TypeScript + TanStack Query        │
│ Mobile App:     React Native (Expo) + TypeScript               │
│ Customer Portal: Next.js 14+ + React + TypeScript              │
│ UI Components:  shadcn/ui + Tailwind CSS                       │
│ Maps:           Mapbox GL JS                                    │
├─────────────────────────────────────────────────────────────────┤
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│ Language:       TypeScript (Node.js 20 LTS)                    │
│ Framework:      NestJS 10+                                     │
│ API:            REST (OpenAPI 3.1)                             │
│ ORM:            Prisma 5+ (with raw SQL)                       │
│ Testing:        Jest + Supertest                               │
├─────────────────────────────────────────────────────────────────┤
│                   DATA & MESSAGING (REQUIRED)                   │
├─────────────────────────────────────────────────────────────────┤
│ Database:       PostgreSQL 15+ (self-hosted on GKE)           │
│ Search:         PostgreSQL FTS (OpenSearch deferred)          │
│ Cache:          Redis 7+ (self-hosted on GKE)                 │
│ Message Bus:    Apache Kafka (Confluent Cloud or self-hosted) │
│ Schema Registry: Confluent Schema Registry (Avro)             │
│ Object Storage: GCP Cloud Storage                              │
├─────────────────────────────────────────────────────────────────┤
│                  INFRASTRUCTURE (HYBRID GCP + OSS)              │
├─────────────────────────────────────────────────────────────────┤
│ Compute:        GKE Standard (cost-optimized node pools)      │
│ Container:      Docker                                         │
│ IaC:            Terraform 1.5+                                 │
│ CI/CD:          GitHub Actions                                 │
│ Networking:     GCP VPC, Cloud NAT, Load Balancer             │
│ API Gateway:    Kong 3.x (self-hosted on GKE)                 │
├─────────────────────────────────────────────────────────────────┤
│              OBSERVABILITY (REQUIRED - DATADOG)                 │
├─────────────────────────────────────────────────────────────────┤
│ APM:            Datadog APM                                    │
│ Tracing:        Datadog Distributed Tracing                   │
│ Metrics:        Datadog Metrics                                │
│ Logging:        Datadog Log Management                         │
│ RUM:            Datadog Real User Monitoring                   │
│ Alerting:       Datadog + PagerDuty                            │
├─────────────────────────────────────────────────────────────────┤
│              SECURITY (REQUIRED - VAULT + PINGID)               │
├─────────────────────────────────────────────────────────────────┤
│ SSO:            PingID (SAML 2.0 / OIDC)                      │
│ JWT:            RS256 signing                                  │
│ Secrets:        HashiCorp Vault (self-hosted on GKE)          │
│ Encryption:     TLS 1.3, AES-256 at-rest                      │
│ SAST:           SonarQube / Snyk                               │
├─────────────────────────────────────────────────────────────────┤
│              WORKFLOW & INTEGRATIONS                            │
├─────────────────────────────────────────────────────────────────┤
│ Workflow Engine: Camunda Platform 8 (Zeebe)                   │
│ E-Signature:    Adobe Sign (eIDAS-compliant)                  │
│ Notifications:  Enterprise Messaging Service (SMS/Email)      │
│ Sales Systems:  Pyxis, Tempo (adapter pattern)                │
│ ERP:            Oracle Fusion (adapter)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Self-Hosted Services on GKE

### PostgreSQL on Kubernetes

**Why self-hosted instead of Cloud SQL**:
- ✅ Client mandates PostgreSQL (already chosen)
- ✅ Full control over extensions, tuning
- ✅ No Cloud SQL Proxy complexity
- ✅ Cost savings vs managed service
- ✅ Proven operator: CloudNativePG or Zalando Postgres Operator

**Deployment**:

```yaml
# k8s/postgresql/postgresql-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: fsm-postgres
spec:
  instances: 3  # HA cluster

  postgresql:
    version: 15
    parameters:
      max_connections: "500"
      shared_buffers: "8GB"
      effective_cache_size: "24GB"
      work_mem: "16MB"

  storage:
    size: 500Gi
    storageClass: pd-ssd  # GCP persistent SSD

  backup:
    barmanObjectStore:
      destinationPath: gs://fsm-backups/postgresql
      wal:
        compression: gzip
      retention: 30d
```

**Cost estimate**: ~$300/mo (vs $400/mo Cloud SQL)

---

### Redis on Kubernetes

**Why self-hosted instead of Memorystore**:
- ✅ Open-source, no vendor lock-in
- ✅ Cost savings: $50/mo vs $120/mo
- ✅ Proven operator: Redis Operator or Bitnami Helm chart
- ✅ Simpler networking (no private service connect)

**Deployment**:

```yaml
# k8s/redis/redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: fsm-redis
spec:
  clusterSize: 3
  redisExporter:
    enabled: true

  storage:
    volumeClaimTemplate:
      spec:
        storageClassName: pd-standard
        resources:
          requests:
            storage: 10Gi

  resources:
    requests:
      memory: "2Gi"
      cpu: "500m"
    limits:
      memory: "4Gi"
      cpu: "1000m"
```

**Cost estimate**: ~$50/mo for 3-node cluster

---

### Kafka on Kubernetes

**Options**:

1. **Confluent Cloud** (Recommended initially)
   - ✅ Fully managed by Kafka creators
   - ✅ Built-in Schema Registry
   - ✅ No operational overhead
   - ❌ Cost: ~$1,000-1,500/mo

2. **Self-hosted with Strimzi Operator**
   - ✅ Open-source, full control
   - ✅ Cost: ~$400/mo (infrastructure only)
   - ❌ Operational complexity
   - ❌ Need to manage Schema Registry separately

**Recommendation**: Start with **Confluent Cloud**, migrate to self-hosted Strimzi if cost becomes issue (>$2k/mo).

**Confluent Cloud integration**:

```typescript
// src/infrastructure/kafka/confluent-client.ts
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'fsm-platform',
  brokers: [process.env.CONFLUENT_BOOTSTRAP_SERVER!],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_API_KEY!,
    password: process.env.CONFLUENT_API_SECRET!,
  },
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'fsm-service' });
```

---

### HashiCorp Vault on Kubernetes

**Why self-hosted**:
- ✅ Client requirement
- ✅ Dynamic secrets (database, Kafka)
- ✅ Encryption as a service
- ✅ PKI for internal certificates
- ✅ Proven Helm chart from HashiCorp

**Deployment**:

```yaml
# k8s/vault/values.yaml (Helm chart)
server:
  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      setNodeId: true
      config: |
        ui = true
        listener "tcp" {
          address = "0.0.0.0:8200"
          cluster_address = "0.0.0.0:8201"
          tls_disable = false
          tls_cert_file = "/vault/tls/tls.crt"
          tls_key_file = "/vault/tls/tls.key"
        }
        storage "raft" {
          path = "/vault/data"
        }
        service_registration "kubernetes" {}

  dataStorage:
    size: 10Gi
    storageClass: pd-ssd

  auditStorage:
    enabled: true
    size: 20Gi
```

**Application integration**:

```typescript
// src/infrastructure/vault/vault-client.ts
import * as vault from 'node-vault';

const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN, // From Kubernetes SA token
});

// Read secret
export async function getSecret(path: string): Promise<any> {
  const result = await vaultClient.read(`secret/data/${path}`);
  return result.data.data;
}

// Dynamic database credentials
export async function getDatabaseCredentials(): Promise<DBCredentials> {
  const result = await vaultClient.read('database/creds/fsm-app');
  return {
    username: result.data.username,
    password: result.data.password,
    ttl: result.lease_duration,
  };
}
```

---

## Camunda Integration

### Why Camunda Platform 8

**Use cases**:
- **Saga orchestration**: Multi-service transactions (TV → Installation → Contract)
- **Long-running workflows**: Service order lifecycle (days/weeks)
- **Human tasks**: Manual approval flows, escalations
- **Timeout handling**: Automatic actions if provider doesn't respond

**Architecture**:

```
┌─────────────────────────────────────────────┐
│         Camunda Platform 8                  │
│  ┌─────────┐  ┌────────┐  ┌──────────┐    │
│  │  Zeebe  │  │Operate │  │ Tasklist │    │
│  │ (Engine)│  │  (UI)  │  │   (UI)   │    │
│  └─────────┘  └────────┘  └──────────┘    │
└─────────────────────────────────────────────┘
         ↑ GRPC                    ↑ REST
         │                         │
┌────────┴─────────────────────────┴─────────┐
│      Orchestration Service (NestJS)        │
│  - BPMN workflow deployment                │
│  - Start process instances                 │
│  - Handle service tasks (workers)          │
│  - Complete human tasks via API            │
└───────────────────────────────────────────┘
```

**Example workflow**: **Service Order Journey**

```xml
<!-- workflows/service-order-journey.bpmn -->
<bpmn:process id="ServiceOrderJourney" name="Service Order Journey">

  <bpmn:startEvent id="OrderCreated" name="Order Created" />

  <bpmn:serviceTask id="ValidateOrder" name="Validate Order">
    <bpmn:extensionElements>
      <zeebe:taskDefinition type="validate-order" />
    </bpmn:extensionElements>
  </bpmn:serviceTask>

  <bpmn:exclusiveGateway id="NeedsTV" name="Needs TV?" />

  <bpmn:serviceTask id="ScheduleTV" name="Schedule TV">
    <bpmn:extensionElements>
      <zeebe:taskDefinition type="schedule-service" />
    </bpmn:extensionElements>
  </bpmn:serviceTask>

  <bpmn:serviceTask id="ExecuteTV" name="Execute TV">
    <bpmn:extensionElements>
      <zeebe:taskDefinition type="execute-service" />
    </bpmn:extensionElements>
  </bpmn:serviceTask>

  <!-- Timeout: If TV not completed in 7 days, escalate -->
  <bpmn:boundaryEvent id="TVTimeout" name="7 days" attachedToRef="ExecuteTV">
    <bpmn:timerEventDefinition>
      <bpmn:timeDuration>P7D</bpmn:timeDuration>
    </bpmn:timerEventDefinition>
  </bpmn:boundaryEvent>

  <bpmn:exclusiveGateway id="TVResult" name="TV Result?" />

  <bpmn:serviceTask id="ScheduleInstallation" name="Schedule Installation">
    <bpmn:extensionElements>
      <zeebe:taskDefinition type="schedule-service" />
    </bpmn:extensionElements>
  </bpmn:serviceTask>

  <!-- ... rest of workflow -->

</bpmn:process>
```

**Worker implementation**:

```typescript
// src/modules/orchestration/camunda/workers/schedule-service.worker.ts
import { ZBClient } from 'zeebe-node';

const zbClient = new ZBClient({
  hostname: process.env.ZEEBE_GATEWAY_ADDRESS!,
  port: 26500,
});

zbClient.createWorker({
  taskType: 'schedule-service',
  taskHandler: async (job) => {
    const { serviceOrderId, serviceType } = job.variables;

    // Call scheduling service
    const slot = await schedulingService.findAvailableSlot({
      serviceOrderId,
      serviceType,
    });

    // Complete job with result
    return job.complete({
      scheduledSlot: slot,
      scheduledAt: new Date().toISOString(),
    });
  },
});
```

---

## Adobe Sign Integration

### Use Cases

1. **Work Closing Form (WCF)** - Customer attestation after service
2. **Provider Contracts** - Onboarding agreements
3. **Customer Contracts** - Service agreements

**Integration**:

```typescript
// src/modules/contracts/adobe-sign/adobe-sign.service.ts
import axios from 'axios';

export class AdobeSignService {
  private readonly baseUrl = 'https://api.eu1.adobesign.com/api/rest/v6';

  async createAgreement(params: CreateAgreementParams): Promise<Agreement> {
    const response = await axios.post(
      `${this.baseUrl}/agreements`,
      {
        fileInfos: [{
          transientDocumentId: params.documentId,
        }],
        name: params.agreementName,
        participantSetsInfo: [{
          memberInfos: [{
            email: params.signerEmail,
          }],
          order: 1,
          role: 'SIGNER',
        }],
        signatureType: 'ESIGN',
        state: 'IN_PROCESS',
      },
      {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async getAgreementStatus(agreementId: string): Promise<AgreementStatus> {
    const response = await axios.get(
      `${this.baseUrl}/agreements/${agreementId}`,
      {
        headers: {
          'Authorization': `Bearer ${await this.getAccessToken()}`,
        },
      }
    );

    return response.data.status;
  }
}
```

**Workflow integration**:

```typescript
// Kafka event handler
@KafkaListener('execution.service.completed')
async handleServiceCompleted(event: ServiceCompletedEvent) {
  // Generate WCF document
  const wcfDocument = await this.generateWCF(event.serviceOrderId);

  // Upload to Adobe Sign
  const transientDocumentId = await adobeSignService.uploadDocument(wcfDocument);

  // Create agreement for customer signature
  const agreement = await adobeSignService.createAgreement({
    documentId: transientDocumentId,
    agreementName: `WCF - ${event.serviceOrderId}`,
    signerEmail: event.customerEmail,
  });

  // Store agreement ID
  await this.contractRepository.create({
    serviceOrderId: event.serviceOrderId,
    type: 'WCF',
    adobeAgreementId: agreement.id,
    status: 'pending_signature',
  });

  // Send notification to customer
  await notificationService.send({
    to: event.customerEmail,
    template: 'wcf-signature-request',
    data: { agreementUrl: agreement.url },
  });
}
```

---

## Enterprise Messaging Service Integration

### Use Cases

- **Customer notifications**: Appointment reminders, service updates
- **Provider notifications**: New job offers, schedule changes
- **Operator alerts**: SLA violations, escalations

**Integration**:

```typescript
// src/modules/communication/messaging/messaging.service.ts
export class MessagingService {
  async sendSMS(params: SendSMSParams): Promise<void> {
    await axios.post(
      process.env.MESSAGING_SERVICE_URL + '/sms',
      {
        to: params.phoneNumber,
        message: params.message,
        country: params.countryCode,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MESSAGING_API_KEY}`,
        },
      }
    );
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    await axios.post(
      process.env.MESSAGING_SERVICE_URL + '/email',
      {
        to: params.email,
        subject: params.subject,
        html: params.htmlBody,
        template: params.templateId,
        variables: params.variables,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MESSAGING_API_KEY}`,
        },
      }
    );
  }
}
```

---

## Updated Cost Model

### Monthly Infrastructure Costs (GCP + Self-Hosted)

| Component | Configuration | Monthly Cost |
|-----------|---------------|-------------|
| **GKE Standard** | 3 nodes (n2-standard-4) | $350 |
| **PostgreSQL (self-hosted)** | 3 instances, 500GB SSD | $300 |
| **Redis (self-hosted)** | 3 nodes, 10GB SSD | $50 |
| **Kafka (Confluent Cloud)** | Standard cluster, 1TB storage | $1,200 |
| **Vault (self-hosted)** | 3 instances, HA Raft | $100 |
| **Cloud Storage** | 500GB + 1TB egress | $40 |
| **Cloud CDN** | 2TB egress | $80 |
| **Load Balancer** | Global HTTPS LB | $20 |
| **Cloud NAT** | Regional NAT | $50 |
| **Datadog** | APM + Logs (15 hosts) | $900 |
| **Camunda Cloud** | Professional tier | $300 |
| **Adobe Sign** | API transactions | $200 |
| **PingID** | Included (client license) | $0 |
| **Total (Production)** | | **$3,590** |

**Cost comparison**:
- Previous "simplified" GCP: $1,300/mo (missing client requirements)
- Current enterprise stack: $3,590/mo (meets all requirements)
- Delta: +$2,290/mo for mandatory services

**Cost optimization opportunities**:
1. Self-host Kafka with Strimzi: Save $800/mo ($1,200 → $400)
2. Optimize Datadog hosts: Save $200/mo (12 hosts → $750)
3. Committed use discounts (GKE, Storage): Save $100/mo
4. **Optimized total**: ~$2,490/mo

---

## Migration from Previous Recommendations

### Deprecated Recommendations

| Previous Doc | Section | Status | Action |
|-------------|---------|--------|--------|
| `ARCHITECTURE_SIMPLIFICATION.md` | Remove Kafka | ❌ Deprecated | Keep Kafka (client requirement) |
| `GCP_SAAS_OPTIMIZATION.md` | Cloud SQL | ❌ Deprecated | Use self-hosted PostgreSQL |
| `GCP_SAAS_OPTIMIZATION.md` | Secret Manager | ❌ Deprecated | Use Vault |
| `GCP_SAAS_OPTIMIZATION.md` | Cloud Operations | ❌ Deprecated | Use Datadog |
| `GCP_SAAS_OPTIMIZATION.md` | Outbox Pattern | ❌ Deprecated | Use Kafka |

### Still Valid Recommendations

| Previous Doc | Section | Status | Notes |
|-------------|---------|--------|-------|
| All docs | Multi-tenancy (app-level) | ✅ Valid | Still preferred approach |
| All docs | 9 → 6 services | ✅ Valid | Service consolidation still beneficial |
| All docs | PostgreSQL FTS | ✅ Valid | Defer OpenSearch initially |
| All docs | Single region initially | ✅ Valid | Start with `us-central1` |
| Technical Stack | NestJS, Prisma, React | ✅ Valid | No changes |

---

## Implementation Priorities

### Phase 1: Core Infrastructure (Weeks 1-4)

- [ ] GKE Standard cluster setup
- [ ] PostgreSQL operator deployment (CloudNativePG)
- [ ] Redis operator deployment
- [ ] Kafka setup (Confluent Cloud initially)
- [ ] Vault deployment (HA Raft)
- [ ] VPC networking, Cloud NAT, Load Balancer

### Phase 2: Integrations (Weeks 5-8)

- [ ] Datadog agent deployment
- [ ] PingID SSO integration
- [ ] Camunda Platform 8 deployment
- [ ] Adobe Sign API integration
- [ ] Messaging Service API integration
- [ ] Pyxis adapter implementation
- [ ] Tempo adapter implementation (prepare structure)

### Phase 3: Application Services (Weeks 9-16)

- [ ] Deploy 6 core services
- [ ] Kafka event schemas
- [ ] Vault secrets integration
- [ ] Camunda workflow deployment
- [ ] Multi-sales-system data model
- [ ] End-to-end testing

### Phase 4: Production Readiness (Weeks 17-20)

- [ ] Load testing
- [ ] Security audit
- [ ] Datadog dashboards & alerts
- [ ] Disaster recovery testing
- [ ] Documentation finalization

---

## Success Criteria

### Technical

- ✅ All mandatory technologies integrated (Kafka, Vault, PostgreSQL, Datadog, PingID)
- ✅ Camunda workflows operational
- ✅ Adobe Sign e-signatures working
- ✅ Multi-sales-system support validated (Pyxis + Tempo)
- ✅ Multi-channel support validated (store, web, etc.)
- ✅ Self-hosted PostgreSQL performance meets SLA
- ✅ Vault secrets rotation working
- ✅ Datadog full observability (APM, logs, traces, RUM)

### Business

- ✅ Client compliance requirements met
- ✅ Cost within $2,500-3,500/mo range
- ✅ 20-week delivery timeline achieved
- ✅ Zero vendor lock-in for core services

---

## Conclusion

This updated architecture:

✅ **Meets all client requirements** (Kafka, Vault, PostgreSQL, Datadog, PingID)
✅ **Leverages available third-party services** (Camunda, Adobe Sign, Messaging)
✅ **Uses GCP strategically** (compute, storage, networking only)
✅ **Prefers open-source** (self-hosted PostgreSQL, Redis on K8s)
✅ **Supports multi-sales-system** (Pyxis, Tempo, future systems)
✅ **Supports multi-channel** (store, web, call center, mobile)
✅ **Maintains flexibility** (can migrate Kafka to self-hosted later)

**Key Principle**: Enterprise-grade, client-mandated stack + strategic use of GCP + proven open-source solutions

---

**Document Version**: 2.0.0
**Date**: 2025-01-15
**Author**: Platform Architecture Team
**Status**: ✅ Authoritative - Supersedes Previous Recommendations
