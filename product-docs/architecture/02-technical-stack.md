# Technical Stack

## Purpose

This document defines the technology choices for the AHS Field Service Execution Platform, providing rationale for each selection and implementation guidelines.

## Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│ Operator Web App:  React 18+ + TypeScript + TanStack Query     │
│ Mobile App:        React Native (Expo) + TypeScript            │
│ Customer Portal:   Next.js 14+ + React + TypeScript            │
│ State Management:  Zustand / Jotai (lightweight)               │
│ UI Components:     Radix UI / shadcn/ui + Tailwind CSS         │
│ Forms:             React Hook Form + Zod validation            │
│ Maps:              Mapbox GL JS / Google Maps                  │
├─────────────────────────────────────────────────────────────────┤
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│ Language:          TypeScript (Node.js 20 LTS)                 │
│ Framework:         NestJS 10+                                  │
│ API Style:         REST (OpenAPI 3.1)                          │
│ Validation:        class-validator + class-transformer         │
│ ORM:               Prisma (with raw SQL where needed)          │
│ Testing:           Jest + Supertest                            │
├─────────────────────────────────────────────────────────────────┤
│                       DATA & STORAGE                            │
├─────────────────────────────────────────────────────────────────┤
│ Primary DB:        PostgreSQL 15+ (AWS RDS / Azure DB)         │
│ Search:            OpenSearch 2.x (AWS / self-hosted)          │
│ Cache:             Redis 7+ / Valkey (ElastiCache / Azure)     │
│ Object Storage:    AWS S3 / Azure Blob Storage                 │
│ Message Bus:       Apache Kafka (Confluent Cloud / AWS MSK)    │
│ Schema Registry:   Confluent Schema Registry (Avro)            │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE                               │
├─────────────────────────────────────────────────────────────────┤
│ Container:         Docker                                       │
│ Orchestration:     Kubernetes (AWS EKS / Azure AKS / GKE)      │
│ IaC:               Terraform 1.5+                              │
│ CI/CD:             GitHub Actions                               │
│ API Gateway:       Kong 3.x / Traefik                          │
│ Service Mesh:      (Deferred - not needed initially)           │
├─────────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY                                │
├─────────────────────────────────────────────────────────────────┤
│ Tracing:           OpenTelemetry + Grafana Tempo               │
│ Metrics:           Prometheus + Grafana                        │
│ Logging:           Winston (app) + Grafana Loki                │
│ APM:               Grafana stack (unified)                     │
│ Alerting:          Grafana Alerting + PagerDuty                │
│ Uptime:            Better Uptime / Pingdom                     │
├─────────────────────────────────────────────────────────────────┤
│                    SECURITY & AUTH                              │
├─────────────────────────────────────────────────────────────────┤
│ SSO:               PingID (SAML 2.0 / OIDC)                    │
│ JWT:               jsonwebtoken (RS256)                        │
│ Secrets:           AWS Secrets Manager / Azure Key Vault       │
│ Encryption:        TLS 1.3, at-rest encryption (AES-256)       │
│ SAST:              SonarQube / Snyk                            │
│ DAST:              OWASP ZAP (CI integration)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Stack

### Language: TypeScript + Node.js

**Choice**: TypeScript 5.x with Node.js 20 LTS

**Rationale**:
- **Developer productivity**: Large talent pool, fast iteration
- **Type safety**: Catch errors at compile time
- **Ecosystem**: Rich npm ecosystem for integrations
- **Async I/O**: Perfect for I/O-bound field service operations
- **Code sharing**: Share types between frontend and backend

**Alternatives considered**:
- ❌ **Go**: Better performance, but smaller ecosystem, harder to hire
- ❌ **Java/Kotlin**: Over-engineered for our needs, slower iteration
- ❌ **Python**: Weaker type system, slower performance

**Configuration**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist"
  }
}
```

### Framework: NestJS

**Choice**: NestJS 10+

**Rationale**:
- **Modular architecture**: Perfect for our modular monolith approach
- **Dependency injection**: Clean separation of concerns
- **Built-in patterns**: Guards, interceptors, pipes for cross-cutting concerns
- **OpenAPI integration**: First-class Swagger support
- **Testing**: Built-in testing utilities
- **Microservices support**: Easy migration path when needed

**Module structure**:
```
src/
├── modules/
│   ├── identity-access/        # Service 1
│   ├── provider-capacity/      # Service 2
│   ├── orchestration-control/  # Service 3
│   ├── scheduling/             # Service 4
│   ├── assignment-dispatch/    # Service 5
│   ├── execution-mobile/       # Service 6
│   ├── communication/          # Service 7
│   ├── contracts-documents/    # Service 8
│   └── configuration/          # Service 9
├── common/                      # Shared utilities
├── infrastructure/              # DB, Kafka, Redis clients
└── main.ts                      # Bootstrap
```

### ORM: Prisma

**Choice**: Prisma 5+

**Rationale**:
- **Type-safe queries**: Auto-generated TypeScript types
- **Schema-first**: Single source of truth in `schema.prisma`
- **Migrations**: Built-in migration system
- **Performance**: Can drop to raw SQL when needed
- **Developer experience**: Excellent tooling (Prisma Studio)

**Alternative for complex queries**: Raw SQL with typed results

**Schema organization**:
```prisma
// prisma/schema.prisma

// Separate schemas per domain service
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = [
    "identity_access",
    "providers_capacity",
    "projects_orders",
    "assignments",
    "execution",
    "documents",
    "communications",
    "config_rules"
  ]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

model Provider {
  id           String   @id @default(uuid())
  name         String
  countryCode  String   @map("country_code")
  // ... fields

  @@schema("providers_capacity")
}
```

### API Design: REST + OpenAPI

**Choice**: RESTful APIs with OpenAPI 3.1 specification

**Rationale**:
- **Industry standard**: Well-understood by all developers
- **Tooling**: Excellent client generation, testing tools
- **Documentation**: Auto-generated from code annotations
- **Versioning**: URL-based versioning (`/api/v1/...`)

**NestJS integration**:
```typescript
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('providers')
@Controller('api/v1/providers')
export class ProviderController {
  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, type: ProviderDto })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProvider(@Param('id') id: string): Promise<ProviderDto> {
    // ...
  }
}
```

**Standards**:
- HTTP methods: GET (read), POST (create), PUT (full update), PATCH (partial), DELETE
- Status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)
- Pagination: Cursor-based for large lists
- Filtering: Query params with standardized operators
- Sorting: `?sort=createdAt:desc`

## Frontend Stack

### Operator Web App: React + TypeScript

**Choice**: React 18+ with TypeScript, Vite bundler

**Rationale**:
- **Component model**: Perfect for complex UIs (Control Tower, Gantt charts)
- **Ecosystem**: Largest ecosystem of libraries
- **Performance**: Virtual DOM + Concurrent features
- **Hiring**: Easiest to find React developers

**Key libraries**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.4",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.0",
    "mapbox-gl": "^3.0.0",
    "date-fns": "^3.0.0",
    "recharts": "^2.10.0"
  }
}
```

**State management**:
- **Server state**: TanStack Query (caching, refetching)
- **Client state**: Zustand (lightweight, no boilerplate)
- **Form state**: React Hook Form

**Component library**:
- **shadcn/ui** (copy-paste components) + **Radix UI** (headless primitives)
- **Tailwind CSS** for styling
- Avoids heavy component library lock-in

### Mobile App: React Native (Expo)

**Choice**: React Native with Expo SDK 50+

**Rationale**:
- **Code sharing**: Share logic with web (React + TS)
- **OTA updates**: Push updates without app store review
- **Developer experience**: Fast refresh, Expo dev tools
- **Native capabilities**: Camera, GPS, offline storage
- **Cross-platform**: Single codebase for iOS + Android

**Expo modules**:
```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-camera": "~14.0.0",
    "expo-location": "~16.5.0",
    "expo-file-system": "~16.0.0",
    "@react-navigation/native": "^6.1.0",
    "@tanstack/react-query": "^5.17.0",
    "react-native-maps": "1.10.0",
    "react-native-sqlite-storage": "^6.0.1"
  }
}
```

**Offline strategy**:
- **Local DB**: SQLite (via `expo-sqlite` or `@op-engineering/op-sqlite`)
- **Sync**: Custom sync engine with retry logic
- **Media queue**: Background upload with `expo-task-manager`

### Customer Portal: Next.js

**Choice**: Next.js 14+ (App Router)

**Rationale**:
- **SEO**: Server-side rendering for public pages
- **Performance**: Fast page loads (critical for customer UX)
- **Built-in optimizations**: Image optimization, code splitting
- **API routes**: Can serve simple BFF endpoints

**Use cases**:
- Appointment booking page
- Contract signing
- CSAT survey
- Document upload

## Data Layer

### Primary Database: PostgreSQL

**Choice**: PostgreSQL 15+ (managed: AWS RDS / Azure Database)

**Rationale**:
- **Feature-rich**: JSONB, full-text search, CTEs, window functions
- **Partitioning**: Native table partitioning for time-series data
- **Row-Level Security**: Built-in multi-tenancy support
- **Extensions**: PostGIS (if geo features needed), pg_cron
- **Reliability**: Battle-tested, ACID compliant
- **Ecosystem**: Prisma, Hasura, excellent tooling

**Configuration**:
```sql
-- Key settings for performance
max_connections = 200
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 2GB
random_page_cost = 1.1  -- For SSD
effective_io_concurrency = 200
```

**Partitioning strategy**:
```sql
-- Partition by month for high-volume tables
CREATE TABLE service_orders (
  id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  -- ...
) PARTITION BY RANGE (created_at);

CREATE TABLE service_orders_2025_01 PARTITION OF service_orders
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Search: OpenSearch

**Choice**: OpenSearch 2.x (AWS OpenSearch Service or self-hosted)

**Rationale**:
- **Full-text search**: Natural language queries across entities
- **Aggregations**: Dashboards and analytics
- **Open source**: No licensing concerns (vs Elasticsearch)
- **Managed option**: AWS OpenSearch Service

**Indexed entities**:
- Projects
- Service orders
- Providers and work teams
- Customers
- Addresses

**Index example**:
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "type": { "type": "keyword" },
      "customerId": { "type": "keyword" },
      "customerName": { "type": "text" },
      "address": {
        "properties": {
          "street": { "type": "text" },
          "city": { "type": "keyword" },
          "postalCode": { "type": "keyword" }
        }
      },
      "createdAt": { "type": "date" }
    }
  }
}
```

### Cache: Redis / Valkey

**Choice**: Redis 7+ or Valkey (AWS ElastiCache / Azure Cache)

**Rationale**:
- **Speed**: In-memory, microsecond latency
- **Data structures**: Strings, hashes, sets, sorted sets
- **TTL**: Automatic expiration
- **Pub/sub**: Real-time notifications (optional)

**Use cases**:
- Session storage (JWT tokens)
- Hot availability slots (TTL: 5 minutes)
- Rate limiting counters
- Temporary assignment results
- Feature flags

**Data structures**:
```typescript
// Availability slots cache
// Key: "availability:{providerId}:{date}"
// Value: JSON array of slots
// TTL: 300 seconds (5 min)

await redis.setex(
  `availability:${providerId}:${date}`,
  300,
  JSON.stringify(slots)
);

// Rate limiting
// Key: "ratelimit:{userId}:{endpoint}"
// Value: counter
// TTL: 60 seconds

const count = await redis.incr(`ratelimit:${userId}:${endpoint}`);
if (count === 1) {
  await redis.expire(`ratelimit:${userId}:${endpoint}`, 60);
}
if (count > 100) {
  throw new RateLimitError();
}
```

### Object Storage: S3 / Azure Blob

**Choice**: AWS S3 or Azure Blob Storage

**Rationale**:
- **Scalability**: Unlimited storage
- **Durability**: 99.999999999% (11 9's)
- **Lifecycle policies**: Automatic archival and deletion
- **CDN integration**: CloudFront / Azure CDN
- **Access control**: Fine-grained IAM policies

**Bucket structure**:
```
ahs-field-service-{env}/
├── contracts/{country}/{year}/{month}/{id}.pdf
├── wcf/{country}/{year}/{month}/{id}.pdf
├── media/
│   ├── photos/{execution_id}/{timestamp}_{uuid}.jpg
│   ├── videos/{execution_id}/{timestamp}_{uuid}.mp4
│   └── audio/{execution_id}/{timestamp}_{uuid}.m4a
└── documents/{project_id}/{type}/{filename}
```

**Lifecycle rules**:
- Contracts/WCF: Retain 10 years (STANDARD → GLACIER after 2 years)
- Media: STANDARD → STANDARD_IA after 90 days → GLACIER after 1 year → DELETE after 5 years
- Temp uploads: DELETE after 7 days if not confirmed

## Messaging: Apache Kafka

**Choice**: Apache Kafka (Confluent Cloud or AWS MSK)

**Rationale**:
- **Durability**: Persistent, replicated logs
- **Throughput**: Handle high message volume
- **Replay**: Reprocess events from any point
- **Schema evolution**: With Confluent Schema Registry
- **Ecosystem**: Kafka Connect, ksqlDB (if needed)

**Topic naming**:
```
{domain}.{entity}.{event}

Examples:
- projects.service_order.created
- projects.service_order.status_changed
- assignments.offer.created
- assignments.offer.accepted
- execution.checkin.completed
- execution.checkout.completed
- contracts.wcf.signed
- integration.sales.order_received
- integration.erp.payment_ready
```

**Partitioning strategy**:
- Partition key: `{countryCode}_{serviceOrderId}` or `{providerId}`
- Ensures ordering within a service order or provider
- Number of partitions: Start with 3-6 per topic, scale based on throughput

**Schema Registry**:
```json
{
  "type": "record",
  "name": "ServiceOrderCreated",
  "namespace": "com.ahs.fsm.events",
  "fields": [
    { "name": "id", "type": "string" },
    { "name": "projectId", "type": "string" },
    { "name": "serviceType", "type": "string" },
    { "name": "countryCode", "type": "string" },
    { "name": "createdAt", "type": "long", "logicalType": "timestamp-millis" }
  ]
}
```

## Infrastructure

### Container Platform: Kubernetes

**Choice**: Managed Kubernetes (AWS EKS, Azure AKS, or GCP GKE)

**Rationale**:
- **Standardization**: Industry standard orchestration
- **Scalability**: Horizontal pod autoscaling
- **Resilience**: Self-healing, rolling updates
- **Ecosystem**: Helm charts, operators
- **Managed**: Avoid control plane operational burden

**Cluster setup**:
```yaml
# Terraform example
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "ahs-fsm-${var.environment}"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      min_size     = 3
      max_size     = 10
      desired_size = 3

      instance_types = ["t3.xlarge"]
      capacity_type  = "ON_DEMAND"
    }
  }
}
```

**Deployment pattern**:
```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fsm-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: app
        image: ahs-fsm:${VERSION}
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
```

### API Gateway: Kong

**Choice**: Kong Gateway 3.x (OSS or Enterprise)

**Rationale**:
- **Plugins**: Rich ecosystem (auth, rate limiting, logging)
- **Performance**: Built on NGINX, very fast
- **Declarative config**: GitOps-friendly
- **Admin API**: Programmable configuration

**Alternative**: Traefik (lighter, good for modular monolith)

**Configuration**:
```yaml
# Kong declarative config
_format_version: "3.0"

services:
  - name: fsm-backend
    url: http://fsm-backend:3000
    routes:
      - name: api-v1
        paths:
          - /api/v1
    plugins:
      - name: jwt
        config:
          secret_is_base64: false
      - name: rate-limiting
        config:
          minute: 1000
          policy: redis
      - name: cors
        config:
          origins:
            - https://app.ahs-fsm.com
```

### IaC: Terraform

**Choice**: Terraform 1.5+ with remote state (S3 + DynamoDB / Azure Blob)

**Rationale**:
- **Multi-cloud**: Cloud-agnostic (important for EU requirements)
- **State management**: Centralized, locked state
- **Module ecosystem**: Reusable modules
- **Plan/apply workflow**: Safe changes

**Structure**:
```
terraform/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
├── modules/
│   ├── networking/
│   ├── kubernetes/
│   ├── database/
│   ├── kafka/
│   └── observability/
└── backend.tf
```

### CI/CD: GitHub Actions

**Choice**: GitHub Actions

**Rationale**:
- **Integrated**: Same platform as code
- **Matrix builds**: Test multiple Node versions
- **Secrets management**: Built-in secrets
- **Self-hosted runners**: For private resources

**Pipeline**:
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: |
            ahs-fsm:${{ github.sha }}
            ahs-fsm:latest
```

## Observability Stack

### OpenTelemetry + Grafana Stack

**Choice**: OpenTelemetry instrumentation + Grafana LGTM stack

**Rationale**:
- **Unified**: Single telemetry SDK (traces, metrics, logs)
- **Vendor-neutral**: Avoid lock-in
- **Correlation**: Trace IDs link logs, metrics, traces
- **Cost-effective**: Grafana Cloud or self-hosted

**Components**:
- **Loki**: Logs aggregation
- **Tempo**: Distributed tracing
- **Prometheus**: Metrics collection
- **Grafana**: Unified dashboards

**Instrumentation**:
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

## Security Stack

### SSO: PingID

**Choice**: PingID (SAML 2.0 / OpenID Connect)

**Rationale**:
- **Enterprise requirement**: Already used by AHS
- **Standards-based**: SAML 2.0 / OIDC
- **MFA support**: Built-in multi-factor auth

**Integration**:
```typescript
import { Strategy as SamlStrategy } from 'passport-saml';

passport.use(new SamlStrategy(
  {
    callbackUrl: process.env.SAML_CALLBACK_URL,
    entryPoint: process.env.PING_SSO_ENTRY_POINT,
    issuer: 'ahs-field-service',
    cert: process.env.PING_CERT,
  },
  (profile, done) => {
    // Map SAML profile to user
    const user = {
      id: profile.nameID,
      email: profile.email,
      roles: profile.roles,
      // ...
    };
    done(null, user);
  }
));
```

### Secrets Management

**Choice**: AWS Secrets Manager / Azure Key Vault

**Rationale**:
- **Rotation**: Automatic secret rotation
- **Audit**: Access logs
- **Integration**: Native SDK support
- **Encryption**: KMS-encrypted

**Usage**:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'eu-west-1' });

async function getSecret(secretName: string): Promise<string> {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return response.SecretString;
}

// In app initialization
const dbPassword = await getSecret('fsm/db/password');
```

## Development Tools

| Purpose | Tool |
|---------|------|
| **IDE** | VS Code + ESLint + Prettier |
| **API Testing** | Postman / Insomnia / Bruno |
| **DB Client** | DBeaver / Postico / Prisma Studio |
| **Load Testing** | k6 / Artillery |
| **Mock Server** | MSW (Mock Service Worker) |
| **Git Hooks** | Husky + lint-staged |
| **Commit Convention** | Conventional Commits |
| **Changelog** | standard-version |

## Version Matrix

| Component | Version | Support Until |
|-----------|---------|---------------|
| Node.js | 20 LTS | 2026-04-30 |
| TypeScript | 5.3+ | N/A (rolling) |
| PostgreSQL | 15.x | 2027-11-11 |
| React | 18.2+ | N/A (rolling) |
| React Native | 0.73+ | N/A (rolling) |
| Kafka | 3.6+ | N/A (rolling) |
| Kubernetes | 1.28+ | 2024-10-28 |

## Decision Matrix

| Technology | Considered Alternatives | Decision | Rationale |
|------------|------------------------|----------|-----------|
| Backend Language | Go, Java | **TypeScript** | Developer productivity, ecosystem |
| Backend Framework | Express, Fastify | **NestJS** | Modularity, DI, structure |
| ORM | TypeORM, Drizzle | **Prisma** | Type safety, DX, migrations |
| Primary DB | MySQL, MongoDB | **PostgreSQL** | Features, JSON support, RLS |
| Frontend | Vue, Angular | **React** | Ecosystem, talent pool |
| Mobile | Native, Flutter | **React Native** | Code sharing, OTA updates |
| Message Bus | RabbitMQ, AWS SQS | **Kafka** | Durability, replay, throughput |
| Search | Elasticsearch | **OpenSearch** | Open source, no licensing |
| Cache | Memcached | **Redis** | Data structures, features |
| Observability | DataDog, New Relic | **Grafana Stack** | Cost, flexibility, open source |

## Migration Strategy

### Phase 1 (Months 0-6): Foundation
- Set up monorepo with NestJS
- PostgreSQL with Prisma
- Basic Kafka setup (minimal topics)
- Simple deployment (Docker Compose for dev, single k8s deployment for prod)

### Phase 2 (Months 6-12): Production
- Full Kafka event catalog
- OpenSearch for search
- Grafana observability stack
- Multi-environment CI/CD

### Phase 3 (Months 12-18): Scale
- Service extraction (Scheduling, Assignment)
- Advanced caching strategies
- Performance optimization
- Global CDN

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenTelemetry](https://opentelemetry.io/)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
**Owner**: Platform Architecture Team
