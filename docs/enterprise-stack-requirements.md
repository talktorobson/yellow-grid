# Enterprise Stack Requirements & Third-Party Integration Analysis

**Created**: 2025-01-15
**Status**: Architecture Decision Document
**Impact**: HIGH - Affects all architecture and infrastructure decisions

---

## 🎯 Mandatory Technology Stack

These technologies are **REQUIRED** by the enterprise client and must be used:

### 1. Apache Kafka
- **Status**: ✅ Already specified in architecture docs
- **Impact**: Removes "PostgreSQL Outbox Pattern" as an alternative
- **Decision**: Use Kafka from Day 1 for event-driven architecture
- **Configuration**:
  - Confluent Cloud (cloud-agnostic) **OR** self-hosted Kafka cluster
  - NOT AWS MSK or Azure Event Hubs (avoid cloud vendor lock-in)
  - Confluent Schema Registry with Avro schemas
  - Topic strategy: `{domain}.{entity}.{action}`

### 2. HashiCorp Vault
- **Status**: ⚠️ NOT mentioned in current documentation
- **Current Docs Say**: AWS Secrets Manager or Azure Key Vault
- **Impact**: REPLACE cloud provider secrets solutions with Vault
- **Decision**: HashiCorp Vault for all secrets management
- **Use Cases**:
  - Database credentials rotation
  - API keys and tokens
  - Encryption keys for PII/GDPR data
  - TLS certificates
  - Dynamic secrets for PostgreSQL, Kafka
  - RBAC integration with PingID

**Required Documentation Updates**:
- `product-docs/architecture/02-technical-stack.md` - Replace AWS/Azure secrets with Vault
- `product-docs/security/02-security-architecture.md` - Add Vault integration
- `product-docs/infrastructure/06-deployment-architecture.md` - Add Vault deployment

### 3. PostgreSQL Database
- **Status**: ✅ Already specified (PostgreSQL 15+)
- **Impact**: None - already the primary database
- **Decision**: Continue with PostgreSQL as documented
- **Configuration**:
  - Self-hosted PostgreSQL on Kubernetes **OR** managed PostgreSQL (RDS/Azure)
  - Prefer self-hosted for cost optimization and flexibility
  - Multi-schema design for service isolation
  - Connection pooling via PgBouncer

### 4. Datadog
- **Status**: ⚠️ NOT mandated in current documentation
- **Current Docs Say**: "Datadog/New Relic" (optional)
- **Impact**: REPLACE all observability vendor options with Datadog
- **Decision**: Datadog for APM, logging, metrics, tracing
- **Use Cases**:
  - Application Performance Monitoring (APM)
  - Infrastructure monitoring
  - Log aggregation and analysis
  - Distributed tracing (replaces OpenTelemetry exporters)
  - Real User Monitoring (RUM) for web/mobile apps
  - Synthetic monitoring and uptime checks

**Required Documentation Updates**:
- `product-docs/operations/01-observability-strategy.md` - Replace Prometheus/Grafana/ELK with Datadog
- `product-docs/operations/02-monitoring-alerting.md` - Update to Datadog alerting
- `product-docs/operations/03-logging-strategy.md` - Use Datadog Log Management

**Architecture Impact**:
```
BEFORE (Generic):
OpenTelemetry → Jaeger/Zipkin (tracing)
Prometheus → Grafana (metrics)
Fluentd → ELK Stack (logs)

AFTER (Datadog):
Datadog Agent → Datadog APM (tracing)
Datadog Agent → Datadog Metrics (metrics)
Datadog Agent → Datadog Logs (logs)
```

### 5. PingID (PingIdentity)
- **Status**: ⚠️ Generic "PingID SSO" mentioned but not detailed
- **Current Docs Say**: "JWT tokens (PingID SSO integration)"
- **Impact**: EXPAND documentation for full PingIdentity integration
- **Decision**: PingID for SSO, PingFederate for federation, PingDirectory for user store
- **Use Cases**:
  - Single Sign-On (SSO) for operators (Control Tower)
  - Multi-Factor Authentication (MFA)
  - SAML 2.0 and OIDC integration
  - Role and permission synchronization with RBAC system
  - Session management and logout

**Required Documentation Updates**:
- `product-docs/api/02-authentication-authorization.md` - Expand PingID integration details
- `product-docs/security/01-authentication-mechanisms.md` - Add PingFederate SAML/OIDC flows
- `product-docs/security/02-security-architecture.md` - Add PingDirectory user synchronization

**Integration Architecture**:
```
PingID/PingFederate (SSO)
   ↓ (SAML 2.0 / OIDC)
Identity & Access Service (NestJS)
   ↓ (JWT with roles/permissions)
API Gateway
   ↓
Domain Services
```

---

## 🌐 Cloud Provider Strategy (REVISED)

### ❌ What NOT to Do:
- **DO NOT** default to GCP/AWS/Azure managed services for everything
- **DO NOT** use cloud-specific solutions when open-source alternatives exist
- **DO NOT** lock into AWS MSK, Azure Event Hubs, GCP Pub/Sub (use Kafka instead)
- **DO NOT** use AWS Secrets Manager, Azure Key Vault (use HashiCorp Vault instead)
- **DO NOT** use cloud-specific message queues (SQS, Azure Service Bus)

### ✅ What TO Do:
- **Prefer self-hosted open-source** solutions on Kubernetes (Kafka, Vault, PostgreSQL)
- **Use cloud providers for**:
  - Compute (EKS, AKS, GKE) - Kubernetes clusters
  - Block storage (EBS, Azure Disks, Persistent Disks)
  - Object storage (S3, Azure Blob, GCS) - commodity service
  - Load balancers (ALB, Azure Load Balancer, GCP Load Balancer)
  - CDN (CloudFront, Azure CDN, Cloud CDN)
- **Avoid cloud-specific services** unless there's a compelling cost/operational reason

### Recommended Infrastructure Stack:

| Component | Solution | Deployment | Rationale |
|-----------|----------|------------|-----------|
| **Compute** | Kubernetes (EKS/AKS/GKE) | Cloud-managed control plane | Industry standard, cloud-agnostic |
| **Database** | PostgreSQL 15+ | Self-hosted on K8s OR managed RDS/Azure | Required by client |
| **Message Bus** | Apache Kafka | Self-hosted (Confluent Operator) OR Confluent Cloud | Required by client, enterprise-grade |
| **Secrets** | HashiCorp Vault | Self-hosted on K8s | Required by client |
| **Observability** | Datadog | SaaS | Required by client |
| **Cache** | Redis/Valkey | Self-hosted on K8s | Open-source, battle-tested |
| **Search** | PostgreSQL FTS initially | Self-hosted | Defer OpenSearch until needed |
| **Object Storage** | S3/Blob/GCS | Cloud-managed | Commodity service, low lock-in risk |
| **Service Mesh** | Istio (optional) | Self-hosted on K8s | Open-source, if microservices needed |
| **API Gateway** | Kong or Traefik | Self-hosted on K8s | Open-source, enterprise-grade |

**Infrastructure as Code**: Terraform (cloud-agnostic, multi-cloud)

---

## 🔧 THIRD-PARTY SOLUTIONS EVALUATION

You have access to three enterprise solutions:
1. **Camunda** - Workflow orchestration (BPMN)
2. **Adobe Sign** - E-signature platform
3. **Messaging Service** - (unspecified, needs clarification)

---

### 1️⃣ Camunda Workflow Orchestrator

#### 📊 Relevance to AHS FSM Project: **HIGH**

The AHS Field Service Management system has **complex, long-running, human-in-the-loop workflows** that are a perfect fit for a BPMN orchestration engine.

#### ✅ PROS of Using Camunda

1. **Perfect for Complex FSM Workflows**
   - **Technical Visit (TV) Flow**: Multi-outcome decision tree (YES/YES-BUT/NO) with blocking logic
   - **Assignment & Dispatch**: Multi-stage funnel with human approvals, provider acceptance, auto-accept rules
   - **Contract Lifecycle**: Multi-party signatures, approval chains, timeout handling
   - **WCF (Work Closing Form)**: Customer approval, rejection with re-work, escalation flows
   - **Claim & Warranty**: Investigation workflows, approval chains, refund/repair orchestration

2. **Visual Workflow Design (BPMN 2.0)**
   - Business analysts can design workflows visually
   - Developers implement service tasks in TypeScript/Java
   - Easy to communicate workflows to stakeholders
   - Reduces "workflow logic buried in code" problem

3. **Built-in Workflow Capabilities**
   - **Human Tasks**: Assign tasks to operators, escalate on timeout
   - **Timer Events**: SLA tracking, reminder notifications, auto-cancellation
   - **Parallel Gateways**: Multi-technician assignments, parallel approvals
   - **Event-Based Gateways**: Wait for external events (e.g., customer signature, payment confirmation)
   - **Compensation**: Undo workflows on failure (e.g., cancel assignment if provider rejects)

4. **Enterprise-Grade Features**
   - **Audit Trail**: Full workflow execution history (GDPR compliance)
   - **Versioning**: Deploy new workflow versions without breaking in-flight processes
   - **Monitoring**: Real-time workflow dashboards (where are bottlenecks?)
   - **Scalability**: Handles millions of active process instances
   - **Integration**: REST API, Kafka connectors, event-driven architecture

5. **Durable Execution**
   - Workflows survive service restarts (state persisted in PostgreSQL)
   - Automatic retries on transient failures
   - Long-running workflows (days/weeks) without manual state management

6. **Multi-Tenancy Support**
   - Camunda supports tenant isolation (Country/BU/Store filtering)
   - Deploy different workflow versions per country (ES auto-accept vs FR manual accept)

7. **TypeScript/JavaScript Support** (Camunda 8)
   - Zeebe engine with Node.js client libraries
   - Write service tasks in TypeScript (matches NestJS stack)
   - No need to learn Java

#### ❌ CONS of Using Camunda

1. **Additional Infrastructure Complexity**
   - Requires separate deployment (Zeebe broker cluster, Operate, Tasklist, Optimize)
   - Adds operational overhead (monitoring, backups, upgrades)
   - More components to secure and maintain

2. **Learning Curve**
   - Team needs to learn BPMN 2.0 notation
   - Understanding Zeebe's event sourcing model
   - Debugging workflows vs debugging code

3. **Over-Engineering Risk**
   - Not all workflows need orchestration (simple state machines are fine)
   - Could lead to "everything is a BPMN workflow" anti-pattern
   - Adds latency for simple operations

4. **Vendor Lock-In (Mild)**
   - BPMN is a standard, but Zeebe-specific features (Camunda 8) are not
   - Migrating workflows to another engine is possible but painful
   - License costs for enterprise features (if using Camunda Platform 8 SaaS)

5. **Dual State Management**
   - Workflow state in Camunda
   - Domain state in PostgreSQL
   - Need to keep both synchronized (eventual consistency challenges)

6. **Debugging & Testing**
   - Integration tests need Camunda test containers
   - Workflow debugging is different from code debugging
   - Local development setup more complex

7. **Cost**
   - Camunda Platform 8 SaaS has per-process-instance pricing
   - Self-hosted requires infrastructure (more Kubernetes pods, storage, compute)

#### 🎯 RECOMMENDATION: **YES, Use Camunda (Selectively)**

**Use Camunda for**:
- ✅ Technical Visit (TV) flow (complex decision tree, multi-week duration)
- ✅ Assignment & Dispatch (multi-stage funnel, human approvals, timeouts)
- ✅ Contract lifecycle (multi-party signatures, approval chains)
- ✅ WCF approval workflow (customer accept/reject, re-work loops)
- ✅ Claim & warranty investigation (long-running, approval chains)
- ✅ Provider onboarding (multi-step, document verification, approval)

**DO NOT use Camunda for**:
- ❌ Simple state transitions (service order CRUD, check-in/check-out)
- ❌ Real-time operations (scheduling calculations, capacity lookups)
- ❌ High-frequency events (every API call, every database write)

**Architecture Pattern**:
```
NestJS Domain Services
   ↓ (Start workflow for complex operations)
Camunda Zeebe
   ↓ (Invoke service tasks via Kafka or REST)
NestJS Domain Services
   ↓ (Update domain state in PostgreSQL)
PostgreSQL
```

**Integration Strategy**:
- **Start Workflows**: Domain services trigger Camunda workflows via Zeebe client
- **Service Tasks**: Camunda calls back into NestJS services (REST or Kafka)
- **Events**: Kafka events can trigger workflow progression (e.g., contract signed → advance workflow)
- **Human Tasks**: Camunda Tasklist UI for operator task management (or embed tasks in Control Tower)

**Deployment**:
- Camunda Platform 8 (Zeebe engine)
- Self-hosted on Kubernetes (Camunda Helm charts)
- OR Camunda SaaS (evaluate cost vs operational overhead)

---

### 2️⃣ Adobe Sign (E-Signature)

#### 📊 Relevance to AHS FSM Project: **CRITICAL**

The AHS FSM system has **mandatory e-signature requirements** for:
- **Pre-service contracts** (customer acceptance of terms, pricing, scope)
- **Work Closing Forms (WCF)** (customer acceptance of work, quality validation)
- **Provider agreements** (subcontractor contracts, SLA agreements)

**Current Documentation Gap**: E-signature architecture is designed but **no vendor selected**.

#### ✅ PROS of Using Adobe Sign

1. **Enterprise-Grade Solution**
   - Market leader in e-signature (trusted by Fortune 500)
   - 99.99% uptime SLA
   - Global availability (critical for ES, FR, IT, PL operations)

2. **EU Compliance (eIDAS Regulation)**
   - Adobe Sign is **eIDAS-qualified** for EU operations
   - Supports Advanced Electronic Signatures (AES) and Qualified Electronic Signatures (QES)
   - Critical for GDPR compliance and legal validity in Europe

3. **Multi-Party Signature Workflows**
   - **Sequential signing**: Customer → Technician → Provider → Store Manager
   - **Parallel signing**: Multiple approvers simultaneously
   - **Conditional routing**: If amount > €5000, require additional approval
   - Perfect for WCF workflows (customer signs, provider signs, store validates)

4. **Mobile-First Experience**
   - Optimized for mobile devices (technicians in the field)
   - Offline signature capture (sync when online)
   - Responsive signing UI (works on small screens)
   - Critical for field technician workflow

5. **Audit Trail & Compliance**
   - Tamper-evident audit trail (who signed, when, IP address, GPS location)
   - Digital certificate chaining
   - Long-term validation (LTV) for 10+ year retention
   - Meets legal requirements for contract retention

6. **Rich Integration Options**
   - REST API for programmatic document sending
   - Webhooks for real-time status updates (signed, declined, expired)
   - Pre-built connectors for Salesforce, SAP, Oracle (future ERP integration)
   - SOAP API for legacy system integration

7. **Document Templates**
   - Pre-fill templates with customer/provider data
   - Dynamic field insertion (name, address, service details)
   - Multi-language support (ES, FR, IT, PL)
   - Reduces manual data entry

8. **Authentication Options**
   - Email verification (standard)
   - SMS OTP (for high-value contracts)
   - Knowledge-based authentication (KBA)
   - ID verification (passport scan)
   - Integration with PingID (SSO for operators)

9. **Regulatory Compliance**
   - GDPR compliant
   - ISO 27001 certified
   - SOC 2 Type II compliant
   - PCI DSS compliant (if handling payment info)

10. **Already Integrated & Available**
    - No procurement delay (already licensed by enterprise client)
    - No vendor evaluation needed
    - Faster time to market

#### ❌ CONS of Using Adobe Sign

1. **Cost (High for Large Volumes)**
   - Per-transaction pricing (can be expensive at scale)
   - Typical cost: $0.50-$2.00 per signature depending on volume
   - **Impact for AHS**: 10,000 service orders/month = 20,000 signatures/month (contract + WCF) = $10K-$40K/month
   - Enterprise licensing may offer volume discounts (verify with client)

2. **Vendor Lock-In**
   - Proprietary API (not a standard like ETSI)
   - Migrating to another vendor requires code changes
   - Stored documents in Adobe Sign cloud (data portability concerns)

3. **External Dependency**
   - Relies on Adobe Sign SaaS availability
   - If Adobe Sign is down, contract workflows blocked
   - Latency for API calls (200-500ms per operation)
   - Mitigation: Async workflow, fallback to manual signature

4. **Limited Customization**
   - Signing UI is Adobe-branded (can white-label for enterprise, but limited)
   - Can't fully embed in mobile app (redirects to Adobe Sign)
   - User experience less seamless than native in-app signature

5. **Data Residency Challenges**
   - Adobe Sign stores documents in their cloud (may be US-based)
   - GDPR requires EU data residency for EU customers
   - Mitigation: Adobe offers EU data centers, verify configuration

6. **Overkill for Simple Signatures**
   - Technician check-in/check-out doesn't need Adobe Sign (simple canvas signature)
   - Only contracts and WCF need legal-grade e-signature
   - Could lead to over-use and unnecessary costs

7. **Integration Complexity**
   - REST API is comprehensive but requires adapter layer
   - Webhook reliability (need idempotency, retry logic)
   - Document lifecycle sync (Adobe Sign state ↔ AHS FSM state)

8. **Learning Curve**
   - Team needs to learn Adobe Sign API
   - Template design requires Adobe Sign UI training
   - Workflow debugging in external system

#### 🎯 RECOMMENDATION: **YES, Use Adobe Sign (Strategically)**

**Use Adobe Sign for**:
- ✅ **Pre-service contracts** (legal document, requires eIDAS compliance)
- ✅ **Work Closing Forms (WCF)** (customer acceptance, dispute resolution, warranty trigger)
- ✅ **Provider agreements** (subcontractor contracts, SLA agreements)
- ✅ **High-value service orders** (e.g., > €2000, require enhanced authentication)

**DO NOT use Adobe Sign for**:
- ❌ Technician check-in/check-out (use simple canvas signature in mobile app)
- ❌ Internal approvals (use Camunda human tasks or simple approval buttons)
- ❌ Low-value acknowledgments (use "I agree" checkbox)

**Architecture Pattern**:
```
NestJS Contract Service
   ↓ (Generate PDF from template)
Adobe Sign API
   ↓ (Send for signature)
Customer/Technician
   ↓ (Sign via email/SMS link)
Adobe Sign Webhook
   ↓ (Notify: document.signed)
NestJS Contract Service
   ↓ (Update contract status to SIGNED)
PostgreSQL + S3 (Store signed PDF)
```

**Integration Strategy**:
1. **Document Generation**: NestJS service generates PDF from template (or use Adobe Sign templates)
2. **Send for Signature**: Call Adobe Sign REST API with recipient list, fields, authentication
3. **Status Tracking**: Adobe Sign webhooks notify on signature events (signed, declined, expired)
4. **Document Retrieval**: Download signed PDF from Adobe Sign, store in S3, backup in Adobe Sign
5. **Audit Trail**: Store Adobe Sign audit trail JSON in PostgreSQL for compliance

**Cost Optimization**:
- Negotiate volume pricing with Adobe (10K-20K signatures/month)
- Use Adobe Sign only for legal documents (not all signatures)
- Monitor per-transaction costs monthly
- Consider alternative for low-value signatures (e.g., Yousign for EU, lower cost)

**Deployment**:
- Adobe Sign SaaS (cloud-hosted)
- EU data center configuration (verify GDPR compliance)
- API credentials stored in HashiCorp Vault

---

### 3️⃣ Messaging Service (Unspecified)

#### ⚠️ **Clarification Needed**

You mentioned "Messaging service" is available, but didn't specify which service. Common options:

**A. SMS/Email Notification Service** (e.g., Twilio, SendGrid, AWS SES, Mailgun)
**B. Instant Messaging Platform** (e.g., Slack, Microsoft Teams, WhatsApp Business API)
**C. Message Queue Service** (e.g., RabbitMQ, AWS SQS, Azure Service Bus) - **likely NOT this, since you have Kafka**

**Assumption**: You're referring to **SMS/Email notification service** (most relevant for FSM).

---

#### 📊 Relevance to AHS FSM Project: **HIGH**

The AHS FSM system requires:
- **SMS notifications**: Provider assignment offers, customer appointment reminders, technician en-route alerts
- **Email notifications**: Contract sent for signature, WCF ready for review, invoice delivery
- **Push notifications**: Mobile app alerts (assignment received, order updated)

**Current Documentation**: Defines notification service but no vendor specified.

#### ✅ PROS of Using Enterprise Messaging Service (e.g., Twilio)

1. **Reliable Delivery**
   - 99.95%+ uptime SLA
   - Global carrier relationships (works in ES, FR, IT, PL)
   - Automatic retries on failure
   - Delivery receipts (delivered, failed, undelivered)

2. **Multi-Channel Support**
   - SMS (critical for field technicians)
   - Email (for documents, invoices)
   - WhatsApp Business API (if needed for customer communication)
   - Voice calls (for urgent escalations)

3. **Compliance**
   - GDPR compliant
   - TCPA compliant (US)
   - Opt-out management (unsubscribe links)
   - Consent tracking

4. **Localization**
   - Multi-language templates (ES, FR, IT, PL)
   - Country-specific sender IDs (short codes, long codes)
   - Local carrier optimization (better delivery rates)

5. **Analytics**
   - Delivery rate tracking
   - Bounce rate analysis
   - Click-through rates (for links in SMS/email)
   - Cost per message tracking

6. **Integration**
   - REST API (easy NestJS integration)
   - Webhooks for delivery status
   - SMTP for email (fallback)
   - SDKs for Node.js

7. **Already Integrated & Available**
   - No procurement delay
   - No vendor evaluation needed
   - Pre-negotiated enterprise pricing

#### ❌ CONS of Using Enterprise Messaging Service

1. **Cost (Per-Message Pricing)**
   - SMS: $0.01-$0.10 per message (varies by country)
   - **Impact for AHS**: 10,000 orders/month × 5 SMS per order (assignment, reminder, en-route, completion, survey) = 50,000 SMS/month = $500-$5K/month
   - Email is cheaper ($0.001-$0.01 per email) but less immediate

2. **Vendor Lock-In**
   - Proprietary API (not a standard)
   - Migrating to another vendor requires code changes
   - Phone number portability (if using short codes)

3. **External Dependency**
   - Relies on third-party SaaS availability
   - If messaging service is down, notifications fail
   - Mitigation: Queue messages in Kafka, retry later

4. **Delivery Not Guaranteed**
   - SMS can fail (out of credit, invalid number, carrier block)
   - Email can be marked as spam
   - Need fallback strategy (retry, push notification, phone call)

5. **Rate Limiting**
   - SMS/email providers enforce rate limits (e.g., 100 SMS/second)
   - Bulk notifications (e.g., "storm approaching, reschedule all orders") can hit limits
   - Need message queuing and throttling

6. **Privacy Concerns**
   - Phone numbers and emails are PII (GDPR)
   - Need consent management
   - Need opt-out mechanism
   - Need data retention policies

#### 🎯 RECOMMENDATION: **YES, Use Enterprise Messaging Service**

**Use Messaging Service for**:
- ✅ **SMS notifications**: Provider assignment offers, appointment reminders, en-route alerts, completion confirmations
- ✅ **Email notifications**: Contract delivery, WCF review, invoice delivery, monthly reports
- ✅ **Transactional messages**: Password reset, account verification, two-factor authentication

**DO NOT use Messaging Service for**:
- ❌ **Real-time mobile app updates** (use push notifications via Firebase/APNS)
- ❌ **Internal system events** (use Kafka for service-to-service communication)
- ❌ **High-frequency alerts** (batch notifications instead)

**Architecture Pattern**:
```
NestJS Notification Service
   ↓ (Publish to Kafka: notification.requested)
Kafka Consumer
   ↓ (Read notification events)
Messaging Service Adapter
   ↓ (Call Twilio/SendGrid API)
SMS/Email Provider
   ↓ (Deliver to recipient)
Webhook
   ↓ (Notify: delivered/failed)
NestJS Notification Service
   ↓ (Update delivery status in PostgreSQL)
PostgreSQL
```

**Integration Strategy**:
1. **Template Management**: Store notification templates in PostgreSQL (multi-language)
2. **Event-Driven**: Domain events trigger notifications (order.assigned → SMS to provider)
3. **Adapter Pattern**: Abstract messaging provider (easy to swap vendors)
4. **Retry Logic**: Failed messages queued in Kafka, retry with exponential backoff
5. **Delivery Tracking**: Store delivery status in PostgreSQL (audit trail)
6. **Opt-Out Management**: Honor unsubscribe requests (GDPR compliance)

**Cost Optimization**:
- Use email for non-urgent notifications (cheaper)
- Batch notifications (daily digest instead of real-time)
- Use push notifications for mobile app users (free)
- Monitor per-message costs monthly

**Deployment**:
- SaaS (Twilio, SendGrid, etc.)
- API credentials stored in HashiCorp Vault
- Multi-region configuration (EU data center)

---

## 📝 SALES SYSTEM & CHANNEL REQUIREMENTS

### Critical Gap Identified

The current data model does **NOT** support:
- Multiple sales systems (Pyxis, Tempo)
- Multiple sales channels (e.g., in-store, online, phone, partner)

**Required Changes**:

```sql
-- Add sales system/channel tracking to service orders
ALTER TABLE service_orders ADD COLUMN sales_system VARCHAR(50); -- 'PYXIS', 'TEMPO'
ALTER TABLE service_orders ADD COLUMN sales_channel VARCHAR(50); -- 'IN_STORE', 'ONLINE', 'PHONE', 'PARTNER'
ALTER TABLE service_orders ADD COLUMN sales_order_id VARCHAR(255); -- External sales system order ID
ALTER TABLE service_orders ADD COLUMN sales_order_metadata JSONB; -- Flexible storage for system-specific data

-- Index for sales system queries
CREATE INDEX idx_service_orders_sales_system ON service_orders(sales_system);
CREATE INDEX idx_service_orders_sales_channel ON service_orders(sales_channel);
CREATE INDEX idx_service_orders_sales_order_id ON service_orders(sales_order_id);

-- Foreign key to sales system configuration
CREATE TABLE sales_systems (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- 'Pyxis', 'Tempo'
  code VARCHAR(50) UNIQUE NOT NULL, -- 'PYXIS', 'TEMPO'
  country_codes VARCHAR(2)[] NOT NULL, -- ['ES', 'FR'] (which countries use this system)
  api_endpoint VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  configuration JSONB, -- System-specific config
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Track which BUs use which sales systems
CREATE TABLE business_unit_sales_systems (
  id UUID PRIMARY KEY,
  business_unit_id UUID REFERENCES business_units(id),
  sales_system_id UUID REFERENCES sales_systems(id),
  is_primary BOOLEAN DEFAULT false, -- Primary sales system for this BU
  configuration JSONB, -- BU-specific config overrides
  UNIQUE(business_unit_id, sales_system_id)
);
```

**Business Rules to Support**:
- Order reconciliation across systems (same customer, different channels)
- Channel-specific pricing rules (online discount vs in-store)
- Channel-specific SLAs (online orders faster than phone orders)
- Sales system-specific data mappings (Pyxis product codes ≠ Tempo product codes)

---

## 🚀 FINAL RECOMMENDATIONS SUMMARY

### ✅ Use These Third-Party Solutions:

| Solution | Use Case | Priority | Rationale |
|----------|----------|----------|-----------|
| **Camunda** | Workflow orchestration for complex flows (TV, assignment, contracts, WCF, claims) | **HIGH** | Perfect fit for human-in-the-loop, long-running workflows |
| **Adobe Sign** | E-signature for contracts, WCF, provider agreements | **CRITICAL** | eIDAS compliance, enterprise-grade, already available |
| **Messaging Service** | SMS/email notifications for providers, customers, operators | **HIGH** | Reliable delivery, multi-channel, already available |

### 🔧 Enforce These Hard Requirements:

| Technology | Action Required | Priority | Impact |
|------------|----------------|----------|--------|
| **Apache Kafka** | ✅ Already specified, remove "Outbox pattern" alternative | MEDIUM | Simplifies decision-making |
| **HashiCorp Vault** | 🔄 Replace AWS/Azure secrets solutions | **HIGH** | Security architecture change |
| **PostgreSQL** | ✅ Already specified | LOW | No change needed |
| **Datadog** | 🔄 Replace Prometheus/Grafana/ELK stack | **HIGH** | Observability architecture change |
| **PingID** | 🔄 Expand documentation for full integration | MEDIUM | Authentication details needed |

### 📊 Update These Documentation Files:

1. **Technical Stack** (`product-docs/architecture/02-technical-stack.md`)
   - Replace AWS Secrets Manager → HashiCorp Vault
   - Replace Prometheus/Grafana → Datadog
   - Remove "PostgreSQL Outbox" alternative (Kafka is mandatory)
   - Add Camunda Platform 8 to workflow orchestration
   - Add Adobe Sign to e-signature section
   - Add messaging service provider

2. **Security Architecture** (`product-docs/security/02-security-architecture.md`)
   - Add HashiCorp Vault integration patterns
   - Add Vault RBAC with PingID integration
   - Expand PingID/PingFederate authentication flows

3. **Database Design** (`product-docs/infrastructure/02-database-design.md`)
   - **CRITICAL**: Redesign from generic SaaS template to AHS-specific schema
   - Add Country/BU/Store hierarchy
   - Add sales system and sales channel tracking
   - Add sales_systems, business_unit_sales_systems tables

4. **Observability Strategy** (`product-docs/operations/01-observability-strategy.md`)
   - Replace all observability tooling with Datadog
   - Update tracing, metrics, logging sections
   - Add Datadog agent deployment patterns

5. **Integration Architecture** (`product-docs/integration/01-integration-architecture.md`)
   - Add Camunda workflow integration patterns
   - Add Adobe Sign integration patterns
   - Add messaging service integration patterns
   - Add Vault secrets management for integrations

6. **API Authentication** (`product-docs/api/02-authentication-authorization.md`)
   - Expand PingID SSO integration details
   - Add SAML 2.0 and OIDC flows
   - Add session management with PingID

---

## 🎯 Next Steps

1. **Clarify "Messaging Service"** - Which provider? (Twilio, SendGrid, other?)
2. **Review cost model** - Adobe Sign + Messaging Service per-transaction costs
3. **Pilot Camunda** - Start with Technical Visit workflow as proof-of-concept
4. **Vault deployment plan** - Self-hosted on K8s or Vault Cloud?
5. **Datadog setup** - APM, logs, metrics, RUM configuration
6. **Database redesign** - Priority 1, blocks all implementation

---

**Document Status**: Draft for Review
**Author**: AI Assistant (Claude)
**Review Required**: Solution Architect, Enterprise Client, DevOps Lead
