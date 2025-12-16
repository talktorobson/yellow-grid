# Architecture Updates Summary - Enterprise Stack Alignment

## Overview

This document summarizes all changes made to align the architecture with **mandatory client requirements** and **available third-party services**.

**Date**: 2025-01-15
**Trigger**: Client contract requirements clarification
**Impact**: Significant revision to previous simplification recommendations

---

##

 Key Changes

### ✅ Mandatory Technologies (Non-Negotiable)

| Component | Previous | Updated | Source |
|-----------|----------|---------|--------|
| **Message Bus** | ~~Outbox Pattern~~ | **Apache Kafka** | Client requirement |
| **Secrets** | ~~Cloud Secret Manager~~ | **HashiCorp Vault** | Client requirement |
| **Database** | Cloud SQL | **PostgreSQL (self-hosted)** | Client requirement |
| **Observability** | ~~Cloud Operations~~ | **Datadog** | Client requirement |
| **SSO** | PingID | **PingID** | Already correct ✅ |

### ✅ Third-Party Services Added

| Service | Provider | Integration Point |
|---------|----------|-------------------|
| **Workflow Engine** | Camunda Platform 8 | Long-running workflows, sagas |
| **E-Signature** | Adobe Sign | WCF, contracts, digital signatures |
| **Messaging** | Enterprise Service | SMS, Email, Push notifications |

### ✅ Multi-System Support Added

**Data Model Extensions**:
- Support multiple sales systems (Pyxis, Tempo, future)
- Support multiple sales channels (store, web, call center, mobile, partner)
- Sales system adapters with common interface
- Unique constraint per source system

---

## Files Modified

### 1. New Authoritative Documents

- ✅ `docs/ENTERPRISE_STACK_REQUIREMENTS.md` - **Master reference** for all stack decisions
- ✅ `docs/ARCHITECTURE_UPDATES_SUMMARY.md` - This file

### 2. Updated Architecture Docs

- 🔄 `documentation/architecture/02-technical-stack.md` - Updated stack overview
- 🔄 `documentation/architecture/03-service-boundaries.md` - Added integration adapters
- 🔄 `documentation/domain/01-domain-model-overview.md` - Multi-sales-system support

### 3. Deprecated Recommendations

- ⚠️ `ARCHITECTURE_SIMPLIFICATION.md` - Section 3.1 "Remove Kafka" **deprecated**
- ⚠️ `docs/GCP_SAAS_OPTIMIZATION.md` - Sections on Cloud SQL, Secret Manager, Cloud Operations **deprecated**
- ⚠️ `docs/gcp-migration-*` - Use only GCP compute/network sections

**Note**: These files are NOT deleted (for reference) but marked as partially superseded.

---

## Architectural Decisions

### Decision 1: Self-Host Core Services on GKE

**Rationale**:
- Client mandates PostgreSQL, Kafka, Vault (can't use GCP managed alternatives)
- Prefer enterprise open-source over vendor lock-in
- Cost-effective for Redis (vs Memorystore)

**Implementation**:
```
GKE Standard (3 nodes)
├── PostgreSQL (CloudNativePG operator, 3 instances, HA)
├── Redis (Redis Operator, 3 nodes)
├── Vault (HashiCorp Helm chart, 3 instances, Raft HA)
└── Kafka (Confluent Cloud initially, migrate to Strimzi later)
```

---

### Decision 2: Use GCP for Infrastructure Layer Only

**Use GCP for**:
- ✅ GKE (Kubernetes orchestration)
- ✅ VPC, Cloud NAT, Load Balancer (networking)
- ✅ Cloud Storage (object storage)
- ✅ (Optional) Cloud Build (CI/CD)

**Don't use GCP managed services for**:
- ❌ Cloud SQL → PostgreSQL on GKE
- ❌ Pub/Sub → Kafka
- ❌ Secret Manager → Vault
- ❌ Cloud Operations → Datadog
- ❌ Memorystore → Redis on GKE

---

### Decision 3: Leverage Pre-Integrated Third-Party Services

| Service | Use Case | Integration |
|---------|----------|-------------|
| **Camunda** | Saga orchestration, long workflows, timeouts | BPMN workflows via Zeebe GRPC |
| **Adobe Sign** | eIDAS-compliant e-signatures | REST API integration |
| **Messaging** | Multi-channel notifications | REST API integration |

---

### Decision 4: Multi-Sales-System Data Model

**Core principle**: Sales-system-agnostic domain model

```typescript
interface ServiceOrder {
  // Multi-system tracking
  sourceSystem: 'pyxis' | 'tempo' | 'sap';
  externalOrderId: string;
  salesChannel: 'store' | 'web' | 'call_center' | 'mobile';

  // Normalized fields
  customer: CustomerInfo;
  products: Product[];

  // Original payload (audit)
  rawPayload: JSON;
}
```

**Adapter pattern**:
```
Sales System → Adapter → Normalized Event → Kafka → Core Services
```

---

## Cost Impact

### Previous "Simplified" GCP Stack

| Component | Monthly Cost |
|-----------|-------------|
| GKE Autopilot | $600 |
| Cloud SQL | $400 |
| Memorystore Redis | $120 |
| Cloud Storage | $40 |
| Cloud CDN | $80 |
| Cloud Operations | $50 |
| **Total** | **$1,290** |

**Issues**: ❌ Doesn't meet client requirements

---

### Updated Enterprise Stack

| Component | Monthly Cost |
|-----------|-------------|
| GKE Standard | $350 |
| PostgreSQL (self-hosted) | $300 |
| Redis (self-hosted) | $50 |
| **Kafka (Confluent Cloud)** | **$1,200** |
| Vault (self-hosted) | $100 |
| Cloud Storage | $40 |
| Cloud CDN | $80 |
| Cloud NAT + LB | $70 |
| **Datadog** | **$900** |
| **Camunda Cloud** | **$300** |
| **Adobe Sign** | **$200** |
| **Total** | **$3,590** |

**With optimizations** (self-hosted Kafka, Datadog tuning):
- Kafka: Strimzi on GKE = $400 (save $800)
- Datadog: 12 hosts vs 15 = $750 (save $150)
- **Optimized Total**: **$2,640/mo**

---

## Service Boundaries Update

### New Integration Adapters Module

```
src/
└── modules/
    ├── integration/
    │   ├── sales-adapters/
    │   │   ├── pyxis/
    │   │   │   ├── pyxis-event-consumer.ts
    │   │   │   ├── pyxis-transformer.ts
    │   │   │   └── pyxis-client.ts
    │   │   ├── tempo/
    │   │   │   ├── tempo-event-consumer.ts
    │   │   │   ├── tempo-transformer.ts
    │   │   │   └── tempo-client.ts
    │   │   └── sales-adapter.interface.ts
    │   ├── erp-adapter/
    │   ├── adobe-sign-adapter/
    │   ├── messaging-adapter/
    │   └── camunda-adapter/
    └── ...
```

---

## Event Schema Updates

### Kafka Topics

```
// Sales system events (input)
pyxis.orders.created
tempo.orders.created

// Normalized internal events
fsm.service_orders.created
fsm.service_orders.updated
fsm.service_orders.scheduled
fsm.service_orders.assigned
fsm.service_orders.completed

// Cross-service events
fsm.assignments.offer_accepted
fsm.execution.checkout_completed
fsm.contracts.signature_completed
```

### Schema Registry

```json
{
  "type": "record",
  "name": "ServiceOrderCreated",
  "namespace": "com.ahs.fsm.events",
  "fields": [
    {"name": "eventId", "type": "string"},
    {"name": "timestamp", "type": "long"},
    {"name": "sourceSystem", "type": {"type": "enum", "name": "SourceSystem", "symbols": ["PYXIS", "TEMPO", "SAP"]}},
    {"name": "externalOrderId", "type": "string"},
    {"name": "salesChannel", "type": {"type": "enum", "name": "SalesChannel", "symbols": ["STORE", "WEB", "CALL_CENTER", "MOBILE", "PARTNER"]}},
    {"name": "serviceOrderId", "type": "string"},
    {"name": "customer", "type": "CustomerInfo"},
    {"name": "rawPayload", "type": ["null", "string"], "default": null}
  ]
}
```

---

## Datadog Integration

### APM Instrumentation

```typescript
// src/main.ts
import tracer from 'dd-trace';

// Initialize Datadog tracer
tracer.init({
  service: 'fsm-api',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,
});

// Start NestJS app
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap();
```

### Custom Metrics

```typescript
import { StatsD } from 'hot-shots';

const dogstatsd = new StatsD({
  host: process.env.DD_AGENT_HOST,
  port: 8125,
  prefix: 'fsm.',
});

// Track custom metrics
dogstatsd.increment('service_orders.created', 1, {
  source_system: 'pyxis',
  country: 'FR',
});

dogstatsd.histogram('assignment.scoring.duration_ms', duration, {
  provider_count: providers.length,
});
```

---

## Vault Integration

### Dynamic Database Credentials

```typescript
// src/infrastructure/vault/database-credentials.ts
import * as vault from 'node-vault';

const vaultClient = vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

export async function getDatabaseConnection() {
  // Request dynamic credentials
  const creds = await vaultClient.read('database/creds/fsm-app-role');

  // Credentials are time-limited (default: 1 hour)
  return {
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    username: creds.data.username,  // Dynamic user
    password: creds.data.password,  // Dynamic password
    ssl: true,
  };
}

// Renew lease before expiration
setInterval(async () => {
  await vaultClient.write('sys/leases/renew', {
    lease_id: leaseId,
  });
}, 3000 * 1000); // Renew every 50 minutes (TTL: 1 hour)
```

---

## Migration Path

### From Previous Recommendations to Enterprise Stack

| Task | Action | Priority |
|------|--------|----------|
| **Remove Outbox Pattern code** | Replace with Kafka producers/consumers | HIGH |
| **Deploy Kafka** | Confluent Cloud OR Strimzi on GKE | HIGH |
| **Deploy Vault** | Helm chart, configure Raft HA | HIGH |
| **Deploy PostgreSQL** | CloudNativePG operator | HIGH |
| **Deploy Datadog agent** | DaemonSet on all GKE nodes | HIGH |
| **Integrate Camunda** | Deploy Zeebe cluster, implement workers | MEDIUM |
| **Integrate Adobe Sign** | Implement REST API client | MEDIUM |
| **Integrate Messaging** | Implement REST API client | MEDIUM |
| **Implement sales adapters** | Pyxis adapter (immediate), Tempo (future) | MEDIUM |
| **Update data model** | Add sourceSystem, externalOrderId fields | HIGH |

---

## Testing Strategy

### Integration Testing with Real Services

```yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:15-alpine

  redis:
    image: redis:7-alpine

  kafka:
    image: confluentinc/cp-kafka:7.5.0

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0

  vault:
    image: hashicorp/vault:1.15

  datadog-agent:
    image: datadog/agent:latest
    environment:
      DD_API_KEY: test-key
      DD_APM_ENABLED: true
```

---

## Documentation Status

### Updated Docs

- ✅ `docs/ENTERPRISE_STACK_REQUIREMENTS.md` - **New authoritative reference**
- ✅ `docs/ARCHITECTURE_UPDATES_SUMMARY.md` - This file
- 🔄 `documentation/architecture/02-technical-stack.md` - In progress
- 🔄 `documentation/architecture/03-service-boundaries.md` - In progress
- 🔄 `documentation/domain/01-domain-model-overview.md` - In progress

### Deprecated Sections (Keep for Reference)

- ⚠️ `ARCHITECTURE_SIMPLIFICATION.md` - Section 3.1 "Remove Kafka"
- ⚠️ `docs/GCP_SAAS_OPTIMIZATION.md` - Managed services sections
- ⚠️ `docs/gcp-migration-implementation-guide.md` - Cloud SQL, Secret Manager sections

**Important**: DO NOT delete these files. They contain valuable patterns (multi-tenancy, service consolidation) that are still valid.

---

## Next Steps

### Immediate (This Week)

1. ✅ Review `ENTERPRISE_STACK_REQUIREMENTS.md` with team
2. ✅ Get approval for $2,640-3,590/mo cost
3. [ ] Update remaining architecture docs
4. [ ] Create Terraform modules for:
   - PostgreSQL operator
   - Vault Helm deployment
   - Kafka (Confluent Cloud config)
   - Datadog agent DaemonSet

### Short-term (Next 2 Weeks)

1. [ ] Deploy dev environment with new stack
2. [ ] Implement Kafka event schemas
3. [ ] Implement Vault integration
4. [ ] Deploy Datadog APM
5. [ ] Test sales adapter pattern with Pyxis

### Medium-term (Next Month)

1. [ ] Camunda workflow implementation
2. [ ] Adobe Sign integration
3. [ ] Messaging service integration
4. [ ] Full integration testing
5. [ ] Performance benchmarking

---

## Questions & Decisions Log

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| 2025-01-15 | Kafka: Confluent Cloud or self-hosted? | **Confluent Cloud initially** | Faster to production, proven reliability. Migrate to Strimzi if cost > $2k/mo |
| 2025-01-15 | GKE Autopilot or Standard? | **GKE Standard** | Need node pools for cost optimization, taints for stateful workloads |
| 2025-01-15 | PostgreSQL: Which operator? | **CloudNativePG** | CNCF project, active development, simpler than Zalando |
| 2025-01-15 | Datadog: How many hosts? | **12-15 hosts** | 3 PostgreSQL + 3 Redis + 3 Vault + 6 app services |
| 2025-01-15 | Camunda: Cloud or self-hosted? | **Camunda Cloud** | Managed service, $300/mo vs ops complexity |

---

## Conclusion

This architecture update:

✅ **Aligns with all client requirements** (Kafka, Vault, PostgreSQL, Datadog, PingID)
✅ **Leverages available third-party services** (Camunda, Adobe Sign, Messaging)
✅ **Balances GCP and open-source** (strategic use of managed services)
✅ **Supports multi-sales-system/channel** (Pyxis, Tempo, store, web, etc.)
✅ **Maintains cost efficiency** (~$2,640/mo optimized)
✅ **Preserves valid patterns** (multi-tenancy, service boundaries)

**Supersedes**: Previous simplification recommendations that removed Kafka or used GCP-specific managed services for core platform components.

**Authority**: This document and `ENTERPRISE_STACK_REQUIREMENTS.md` are the authoritative references for all architecture decisions going forward.

---

**Document Version**: 1.0.0
**Date**: 2025-01-15
**Author**: Platform Architecture Team
**Status**: ✅ Final
