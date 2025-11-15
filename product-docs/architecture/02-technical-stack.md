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
│ Primary DB:        PostgreSQL 15+ (self-hosted / managed)      │
│ Search:            PostgreSQL FTS (defer OpenSearch)           │
│ Cache:             Redis 7+ / Valkey (self-hosted)             │
│ Object Storage:    S3 / Azure Blob / GCS                       │
│ Message Bus:       Apache Kafka (REQUIRED - Confluent Cloud)   │
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
│ APM:               Datadog APM (REQUIRED)                      │
│ Tracing:           Datadog Distributed Tracing                 │
│ Metrics:           Datadog Metrics                             │
│ Logging:           Datadog Log Management                      │
│ RUM:               Datadog Real User Monitoring                │
│ Alerting:          Datadog Alerting + PagerDuty                │
├─────────────────────────────────────────────────────────────────┤
│                    SECURITY & AUTH                              │
├─────────────────────────────────────────────────────────────────┤
│ SSO:               PingID (SAML 2.0 / OIDC) (REQUIRED)         │
│ JWT:               jsonwebtoken (RS256)                        │
│ Secrets:           HashiCorp Vault (REQUIRED)                  │
│ Encryption:        TLS 1.3, at-rest encryption (AES-256)       │
│ SAST:              SonarQube / Snyk                            │
│ DAST:              OWASP ZAP (CI integration)                  │
├─────────────────────────────────────────────────────────────────┤
│              THIRD-PARTY INTEGRATIONS                          │
├─────────────────────────────────────────────────────────────────┤
│ Workflow Engine:   Camunda Platform 8 (Zeebe)                 │
│ E-Signature:       Adobe Sign (eIDAS-compliant)               │
│ Notifications:     Enterprise Messaging Service (SMS/Email)   │
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

## Messaging: Apache Kafka (REQUIRED)

**Choice**: Apache Kafka (Confluent Cloud or self-hosted on Kubernetes)

**Status**: **MANDATORY** - Required by enterprise client

**Rationale**:
- **Enterprise requirement**: Non-negotiable, part of standard stack
- **Durability**: Persistent, replicated logs
- **Throughput**: Handle high message volume
- **Replay**: Reprocess events from any point
- **Schema evolution**: With Confluent Schema Registry
- **Ecosystem**: Kafka Connect, ksqlDB (if needed)
- **Cloud-agnostic**: Confluent Cloud works across AWS/Azure/GCP

**Deployment Options**:
1. **Confluent Cloud** (Preferred) - Fully managed, multi-cloud
2. **Self-hosted on Kubernetes** - Using Confluent Operator or Strimzi

**Do NOT use**: AWS MSK, Azure Event Hubs, GCP Pub/Sub (avoid cloud vendor lock-in)

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

### Datadog (REQUIRED)

**Choice**: Datadog APM + Logs + Metrics + RUM

**Status**: **MANDATORY** - Required by enterprise client

**Rationale**:
- **Enterprise requirement**: Non-negotiable, part of standard stack
- **Unified platform**: APM, logs, metrics, RUM, security in one tool
- **Automatic instrumentation**: Auto-detect frameworks (NestJS, Express, Prisma)
- **Distributed tracing**: End-to-end request flow across services
- **Real User Monitoring**: Frontend performance (React, React Native)
- **Log correlation**: Link logs to traces via trace IDs
- **Infrastructure monitoring**: Kubernetes, PostgreSQL, Kafka, Redis
- **Alerting**: PagerDuty integration for on-call

**Components**:
- **Datadog APM**: Application Performance Monitoring
- **Datadog Logs**: Centralized log aggregation and analysis
- **Datadog Metrics**: Custom metrics and infrastructure metrics
- **Datadog RUM**: Real User Monitoring for web and mobile
- **Datadog Synthetics**: Uptime and API monitoring
- **Datadog Security**: Application Security Monitoring (ASM)

**Instrumentation**:
```typescript
import tracer from 'dd-trace';

// Initialize Datadog tracer (before other imports)
tracer.init({
  logInjection: true, // Inject trace IDs into logs
  runtimeMetrics: true, // Node.js runtime metrics
  profiling: true, // Continuous profiling
  env: process.env.DD_ENV, // 'dev', 'staging', 'prod'
  service: 'ahs-fsm-backend',
  version: process.env.DD_VERSION,
  tags: {
    'country': process.env.COUNTRY_CODE,
    'service_type': 'backend',
  },
});

// Winston logging integration (inject trace IDs)
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ahs-fsm-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Custom metrics
const { StatsD } = require('node-dogstatsd');
const dogstatsd = new StatsD('localhost', 8125);

dogstatsd.increment('assignment.offer.sent', 1, ['country:ES', 'provider_type:individual']);
dogstatsd.histogram('scheduling.calculation.duration', 245, ['country:FR']);
```

**Frontend Integration (React)**:
```typescript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.DD_APPLICATION_ID,
  clientToken: process.env.DD_CLIENT_TOKEN,
  site: 'datadoghq.eu', // EU data center
  service: 'ahs-fsm-web',
  env: process.env.DD_ENV,
  version: process.env.DD_VERSION,
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input', // GDPR compliance
});
```

**Mobile Integration (React Native)**:
```typescript
import { DdSdkReactNative } from '@datadog/mobile-react-native';

DdSdkReactNative.initialize({
  clientToken: process.env.DD_CLIENT_TOKEN,
  env: process.env.DD_ENV,
  applicationId: process.env.DD_APPLICATION_ID,
  trackInteractions: true,
  trackResources: true,
  trackErrors: true,
  site: 'EU1', // EU data center for GDPR
});
```

**Dashboards**:
- Service Order funnel (created → scheduled → assigned → completed)
- Assignment transparency (candidate filtering stages)
- API latency (p50, p95, p99)
- Error rates by service
- Infrastructure health (Kubernetes, PostgreSQL, Kafka)

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

### Secrets Management: HashiCorp Vault (REQUIRED)

**Choice**: HashiCorp Vault

**Status**: **MANDATORY** - Required by enterprise client

**Rationale**:
- **Enterprise requirement**: Non-negotiable, part of standard stack
- **Cloud-agnostic**: Works across AWS, Azure, GCP, on-premises
- **Dynamic secrets**: Generate database credentials on-demand with automatic rotation
- **Encryption as a Service**: Encrypt sensitive data (PII, payment info)
- **PKI**: Certificate management for TLS
- **Audit**: Detailed audit logs of all secret access
- **RBAC**: Fine-grained access control policies
- **Multi-tenancy**: Namespaces for different environments/countries

**Deployment Options**:
1. **HashiCorp Cloud Platform (HCP) Vault** (Preferred) - Fully managed
2. **Self-hosted on Kubernetes** - Using Vault Helm chart

**Secret Engines**:
- **KV v2**: Static secrets (API keys, tokens)
- **Database**: Dynamic PostgreSQL credentials
- **PKI**: TLS certificates
- **Transit**: Encryption as a service (encrypt PII fields)
- **AWS/Azure Secrets Engine**: Dynamic cloud credentials

**Integration with PingID**:
- Use Vault OIDC auth method with PingID
- User authentication flows through PingID → Vault policies apply

**Usage**:
```typescript
import vault from 'node-vault';

// Initialize Vault client
const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN, // From Kubernetes service account in prod
});

// Read static secret (API key)
async function getApiKey(keyName: string): Promise<string> {
  const result = await vaultClient.read(`secret/data/fsm/${keyName}`);
  return result.data.data.api_key;
}

// Get dynamic database credentials
async function getDatabaseCredentials(): Promise<{username: string, password: string}> {
  const result = await vaultClient.read('database/creds/fsm-backend');
  return {
    username: result.data.username,
    password: result.data.password,
  };
  // Vault auto-rotates these credentials after TTL expires
}

// Encrypt PII data (Transit engine)
async function encryptPII(plaintext: string): Promise<string> {
  const result = await vaultClient.write('transit/encrypt/customer-pii', {
    plaintext: Buffer.from(plaintext).toString('base64'),
  });
  return result.data.ciphertext;
}

// Decrypt PII data
async function decryptPII(ciphertext: string): Promise<string> {
  const result = await vaultClient.write('transit/decrypt/customer-pii', {
    ciphertext,
  });
  return Buffer.from(result.data.plaintext, 'base64').toString('utf-8');
}

// Kubernetes integration (service account auth)
// Vault agent sidecar injects secrets as files
// No code changes needed, secrets mounted at /vault/secrets/
```

**Vault Policies Example**:
```hcl
# Policy for backend service
path "secret/data/fsm/backend/*" {
  capabilities = ["read"]
}

path "database/creds/fsm-backend" {
  capabilities = ["read"]
}

path "transit/encrypt/customer-pii" {
  capabilities = ["update"]
}

path "transit/decrypt/customer-pii" {
  capabilities = ["update"]
}
```

**Secret Rotation**:
- Database credentials: Auto-rotated every 24 hours
- API keys: Manual rotation via CI/CD
- TLS certificates: Auto-renewed via Vault PKI engine

## Third-Party Integrations

### Workflow Orchestration: Camunda Platform 8

**Choice**: Camunda Platform 8 (Zeebe engine)

**Rationale**:
- **BPMN 2.0 standard**: Visual workflow design for complex FSM processes
- **Long-running workflows**: Perfect for multi-day/week processes (TV flow, contracts, claims)
- **Human tasks**: Operator approvals, customer signatures, timeout handling
- **Audit trail**: Full workflow history for compliance (GDPR, warranty tracking)
- **TypeScript support**: Zeebe Node.js client matches our stack
- **Event-driven**: Integrate with Kafka for seamless event flow

**Use Cases in AHS FSM**:
1. **Technical Visit (TV) Flow**: Multi-outcome decision tree (YES/YES-BUT/NO), blocking logic
2. **Assignment & Dispatch**: Multi-stage funnel, provider offers, auto-accept rules
3. **Contract Lifecycle**: Multi-party signatures (customer, technician, provider), approval chains
4. **WCF Approval**: Customer acceptance/rejection, re-work loops, escalation
5. **Claim & Warranty**: Investigation workflows, approval chains, refund/repair orchestration
6. **Provider Onboarding**: Multi-step verification, document approval, background checks

**Architecture**:
```
NestJS Services
   ↓ (Start workflow via Zeebe client)
Camunda Zeebe (Workflow Engine)
   ↓ (Service tasks call back via REST/Kafka)
NestJS Services
   ↓ (Update domain state)
PostgreSQL
```

**Integration Example**:
```typescript
import { ZBClient } from 'zeebe-node';

const zbc = new ZBClient({
  camundaCloud: {
    clusterId: process.env.ZEEBE_CLUSTER_ID,
    clientId: process.env.ZEEBE_CLIENT_ID,
    clientSecret: process.env.ZEEBE_CLIENT_SECRET,
  },
});

// Start Technical Visit workflow
async function startTechnicalVisitWorkflow(serviceOrderId: string) {
  const result = await zbc.createProcessInstance({
    bpmnProcessId: 'technical-visit-flow',
    variables: {
      serviceOrderId,
      customerId: order.customerId,
      providerId: order.providerId,
    },
  });
  return result.processInstanceKey;
}

// Service task: Check customer eligibility
zbc.createWorker({
  taskType: 'check-customer-eligibility',
  taskHandler: async (job) => {
    const { serviceOrderId } = job.variables;
    const eligible = await customerService.checkEligibility(serviceOrderId);

    return job.complete({
      eligible,
      reason: eligible ? null : 'Customer has outstanding payments',
    });
  },
});

// Human task: Approve TV result
// Handled via Camunda Tasklist UI or custom Control Tower integration
```

**Deployment**:
- Camunda Platform 8 SaaS (cloud-hosted) OR self-hosted on Kubernetes
- Components: Zeebe (engine), Operate (monitoring), Tasklist (human tasks), Optimize (analytics)

---

### E-Signature: Adobe Sign

**Choice**: Adobe Sign (Adobe Acrobat Sign)

**Rationale**:
- **eIDAS-qualified**: Compliant with EU e-signature regulations (critical for ES, FR, IT, PL)
- **Pre-existing license**: Already licensed by enterprise client (no procurement delay)
- **Multi-party workflows**: Sequential/parallel signing (customer → technician → provider)
- **Mobile-optimized**: Field technicians can sign on mobile devices
- **Audit trail**: Tamper-evident, legally binding records (10-year retention)
- **API-first**: REST API + webhooks for seamless integration

**Use Cases in AHS FSM**:
1. **Pre-Service Contracts**: Customer accepts terms, pricing, scope before work begins
2. **Work Closing Forms (WCF)**: Customer validates work completion, triggers warranty
3. **Provider Agreements**: Subcontractor contracts, SLA agreements, insurance verification

**Integration Example**:
```typescript
import axios from 'axios';

class AdobeSignService {
  private apiClient = axios.create({
    baseURL: process.env.ADOBE_SIGN_API_URL,
    headers: {
      'Authorization': `Bearer ${await vault.read('secret/data/adobe-sign-token')}`,
      'Content-Type': 'application/json',
    },
  });

  async sendContractForSignature(contractId: string, recipientEmail: string) {
    // 1. Upload contract PDF to Adobe Sign
    const transientDocument = await this.apiClient.post('/transientDocuments', {
      File: contractPdfBuffer,
      FileName: `contract-${contractId}.pdf`,
    });

    // 2. Create signature agreement
    const agreement = await this.apiClient.post('/agreements', {
      fileInfos: [{ transientDocumentId: transientDocument.data.transientDocumentId }],
      name: `Service Contract - ${contractId}`,
      participantSetsInfo: [
        {
          memberInfos: [{ email: recipientEmail }],
          order: 1,
          role: 'SIGNER',
        },
      ],
      signatureType: 'ESIGN',
      state: 'IN_PROCESS',
      emailOption: {
        sendOptions: {
          completionEmails: 'ALL',
          inFlightEmails: 'ALL',
        },
      },
    });

    return agreement.data.id;
  }

  // Webhook handler for Adobe Sign events
  async handleWebhook(event: AdobeSignWebhookEvent) {
    switch (event.event) {
      case 'AGREEMENT_WORKFLOW_COMPLETED':
        // Download signed PDF, store in S3, update contract status
        await this.downloadSignedDocument(event.agreementId);
        await contractService.markAsSigned(event.agreementId);
        break;

      case 'AGREEMENT_USER_DECLINED':
        // Handle customer rejection
        await contractService.markAsRejected(event.agreementId, event.reason);
        break;
    }
  }
}
```

**Deployment**:
- Adobe Sign SaaS (cloud-hosted)
- EU data center for GDPR compliance
- API credentials stored in HashiCorp Vault

---

### Messaging Service (SMS/Email Notifications)

**Choice**: Enterprise-grade messaging service (e.g., Twilio, SendGrid, or client-specified provider)

**Rationale**:
- **Pre-existing contract**: Leverage enterprise client's existing messaging service license
- **Multi-channel**: SMS (immediate), email (detailed), WhatsApp (optional)
- **High deliverability**: Carrier relationships, global coverage (ES, FR, IT, PL)
- **Compliance**: GDPR-compliant, opt-out management, consent tracking
- **Localization**: Multi-language templates, country-specific sender IDs

**Use Cases in AHS FSM**:
1. **Assignment Notifications**: SMS to providers when new work is available
2. **Appointment Reminders**: SMS to customers 24h before technician visit
3. **En-Route Alerts**: "Technician is 15 minutes away"
4. **Completion Confirmations**: "Work completed, please review WCF"
5. **Contract Delivery**: Email with Adobe Sign link
6. **CSAT Surveys**: Post-service satisfaction survey links

**Integration Example**:
```typescript
// Adapter pattern for messaging provider abstraction
interface IMessagingService {
  sendSMS(to: string, message: string, options?: SMSOptions): Promise<void>;
  sendEmail(to: string, subject: string, body: string, options?: EmailOptions): Promise<void>;
}

class TwilioMessagingService implements IMessagingService {
  private client = twilio(
    await vault.read('secret/data/twilio-account-sid'),
    await vault.read('secret/data/twilio-auth-token')
  );

  async sendSMS(to: string, message: string, options?: SMSOptions) {
    await this.client.messages.create({
      body: message,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    // Publish event for tracking
    await kafka.publish('notifications.sms.sent', {
      recipient: to,
      messageId: response.sid,
      timestamp: new Date(),
    });
  }

  async sendEmail(to: string, subject: string, body: string) {
    // Use SendGrid for email
    await sendgrid.send({
      to,
      from: 'noreply@ahs-fsm.com',
      subject,
      html: body,
    });
  }
}

// Notification orchestrator (consumes Kafka events)
class NotificationService {
  async onAssignmentCreated(event: AssignmentCreatedEvent) {
    const provider = await providerService.getProvider(event.providerId);
    const template = await this.getTemplate('assignment-offer', provider.language);

    await messagingService.sendSMS(
      provider.phone,
      template.render({
        providerName: provider.name,
        serviceType: event.serviceType,
        appointmentDate: event.appointmentDate,
        acceptLink: `${process.env.APP_URL}/accept/${event.assignmentId}`,
      })
    );
  }
}
```

**Architecture**:
```
Kafka Event: assignment.offer.created
   ↓
Notification Service (NestJS)
   ↓ (Render template, apply user preferences)
Messaging Adapter
   ↓ (Call provider API: Twilio, SendGrid, etc.)
SMS/Email Provider
   ↓ (Deliver to recipient)
Webhook
   ↓ (Delivery status: delivered/failed/bounced)
Notification Service
   ↓ (Update status in PostgreSQL, retry if failed)
PostgreSQL
```

**Cost Optimization**:
- Use email for non-urgent notifications (cheaper than SMS)
- Batch notifications (daily digest vs. real-time)
- Use push notifications for mobile app users (free)
- Monitor per-message costs via Datadog metrics

**Deployment**:
- SaaS (Twilio, SendGrid, etc.)
- API credentials stored in HashiCorp Vault
- Multi-region support for EU compliance

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
| Primary DB | MySQL, MongoDB | **PostgreSQL** ⚠️ REQUIRED | Features, JSON support, RLS |
| Frontend | Vue, Angular | **React** | Ecosystem, talent pool |
| Mobile | Native, Flutter | **React Native** | Code sharing, OTA updates |
| Message Bus | RabbitMQ, AWS SQS, Outbox | **Kafka** ⚠️ REQUIRED | Enterprise requirement, durability, replay |
| Search | Elasticsearch, OpenSearch | **PostgreSQL FTS** (defer OpenSearch) | Simplicity, avoid premature optimization |
| Cache | Memcached | **Redis / Valkey** | Data structures, features |
| Observability | Grafana, Prometheus, ELK | **Datadog** ⚠️ REQUIRED | Enterprise requirement, unified platform |
| Secrets | AWS Secrets, Azure Key Vault | **HashiCorp Vault** ⚠️ REQUIRED | Enterprise requirement, cloud-agnostic |
| SSO | Okta, Auth0 | **PingID** ⚠️ REQUIRED | Enterprise requirement, existing integration |
| Workflow Engine | Temporal, AWS Step Functions | **Camunda Platform 8** | BPMN support, human tasks, audit trail |
| E-Signature | DocuSign, Yousign | **Adobe Sign** | eIDAS-compliant, enterprise license |
| Notifications | Twilio, SendGrid, AWS SES | **Enterprise Messaging Service** | Pre-existing contract, multi-channel |

**Legend**: ⚠️ REQUIRED = Mandatory by enterprise client (non-negotiable)

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
