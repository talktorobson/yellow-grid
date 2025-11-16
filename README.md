# Yellow Grid - Field Service Execution Platform

> **Development Status**: 🟡 **Phase 1 In Progress** (75% complete) | **Production Implementation Started**

## 📊 Current Project Status

**Implementation Phase**: Phase 1 - Foundation (Week 1, Day 2-3)
**Progress**: 15% overall (75% of Phase 1 complete)
**Build Status**: ✅ Passing
**API Endpoints**: 12 functional REST endpoints
**Test Coverage**: 100% manual testing of all endpoints

### ✅ Completed Modules
- ✅ Infrastructure & DevOps (Docker, PostgreSQL, Redis)
- ✅ Authentication Module (JWT, login, register, refresh, logout)
- ✅ User Management Module (CRUD, RBAC, role assignment)
- ✅ API Gateway (validation, error handling, logging, CORS, Swagger)

### 🔄 In Progress
- [ ] Providers Module (50% of remaining Phase 1 work)
- [ ] Config Module (50% of remaining Phase 1 work)

**For detailed progress**: See [docs/PROGRESS_SUMMARY.md](docs/PROGRESS_SUMMARY.md) and [docs/IMPLEMENTATION_TRACKING.md](docs/IMPLEMENTATION_TRACKING.md)

---

## 🏗️ Repository Structure

```
yellow-grid-platform/
│
├── src/                   🚀 PRODUCTION CODE - Active implementation
│   ├── modules/           Feature modules (auth, users, providers, config)
│   ├── common/            Shared infrastructure (prisma, redis, filters)
│   └── main.ts            Application entry point
│
├── prisma/                💾 Database schema and migrations
│   ├── schema.prisma      10 models, multi-tenancy support
│   └── migrations/        Version-controlled database changes
│
├── scripts/               🛠️ Utility scripts
│   └── create-admin.ts    Promote users to admin role
│
├── product-docs/          📚 ENGINEERING SPECIFICATIONS (69 files)
│   ├── architecture/      System design, technical decisions
│   ├── domain/            Business domain models & logic
│   ├── api/               REST API specifications (OpenAPI 3.1)
│   ├── integration/       External system integrations
│   ├── security/          Security, RBAC, GDPR compliance
│   ├── infrastructure/    Database, messaging, deployment
│   ├── operations/        Monitoring, logging, incident response
│   ├── testing/           Testing strategies & standards
│   └── development/       Dev workflows, coding standards
│
├── docs/                  📋 Implementation tracking & progress
│   ├── IMPLEMENTATION_TRACKING.md  24-week roadmap with status
│   └── PROGRESS_SUMMARY.md         Detailed accomplishments
│
├── roadshow-mockup/       🎬 DEMO ONLY - For presentations (archived)
│
├── docker-compose.yml     🐳 Local development environment
├── CLAUDE.md              🤖 AI Assistant guide
└── README.md              👈 You are here
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- Docker Desktop (or Colima for macOS)
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/talktorobson/yellow-grid.git
cd yellow-grid

# Install dependencies
npm install

# Start Docker services (PostgreSQL + Redis)
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run start:dev
```

### Access Points
- **API**: http://localhost:3000/api/v1
- **API Documentation (Swagger)**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health

### Create Admin User

```bash
# Register a user first
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@12345",
    "firstName": "Admin",
    "lastName": "User",
    "countryCode": "FR",
    "businessUnit": "LEROY_MERLIN"
  }'

# Promote to admin
npx ts-node scripts/create-admin.ts admin@example.com
```

---

## ⚠️ IMPORTANT: Documentation vs. Implementation

### 📚 Product Documentation (`/product-docs/`)
- **Status**: Complete, production-ready specifications (69 files, ~45,000 lines)
- **Purpose**: Blueprint for building the real Yellow Grid platform
- **Use**: Reference for actual product development
- **Team Size**: 10-14 engineers recommended (currently: 1 solo developer)
- **Timeline**: 28-week implementation roadmap

### 🚀 Production Implementation (`/src/`)
- **Status**: Phase 1 in progress (75% complete)
- **Purpose**: Actual production codebase
- **Content**: Working backend API with authentication and user management
- **Technology**: TypeScript + NestJS + Prisma + PostgreSQL + Redis
- **Timeline**: Following 24-week phased implementation plan

### 🎬 Roadshow Mockup (`/roadshow-mockup/`)
- **Status**: Archived - replaced by production implementation
- **Purpose**: Was for investor/client presentations
- **Note**: ⚠️ DO NOT use mockup code - use `/src/` production code instead

---

---

## 🌟 About Yellow Grid

Yellow Grid is a comprehensive **Field Service Management (FSM) platform** designed for multi-country, multi-tenant operations in the home services industry.

### Key Value Propositions

1. **Assignment Transparency** ⭐ UNIQUE DIFFERENTIATOR
   - Complete audit trail showing why providers were selected/rejected
   - Scoring breakdown (distance, rating, availability, skills)
   - Funnel analytics for every assignment decision

2. **Technical Visit Intelligence**
   - Smart dependency management (TV → Installation)
   - Automatic blocking/unblocking based on outcomes
   - YES/YES-BUT/NO outcome tracking

3. **Multi-Country Operations at Scale**
   - Handles 4+ countries simultaneously
   - Country-specific business rules
   - Multi-currency, multi-language support

4. **Real-Time Field Operations**
   - Offline-first mobile app for technicians
   - GPS check-in/check-out
   - Photo capture, customer signatures
   - Live status updates

5. **Enterprise-Grade Architecture**
   - Multi-tenant SaaS platform
   - GDPR compliant
   - Role-based access control (RBAC)
   - 99.9% uptime SLA

---

## 🚀 Quick Start

### For Product Development (Real Platform)

1. **Read Specifications**:
   ```bash
   # Start here
   cat product-docs/README.md
   cat product-docs/IMPLEMENTATION_GUIDE.md
   cat CLAUDE.md  # If you're an AI assistant
   ```

2. **Understand Architecture**:
   - Review `/product-docs/architecture/` for system design
   - Check `/product-docs/domain/` for business logic
   - Study `/ARCHITECTURE_SIMPLIFICATION.md` for recommendations

3. **Plan Implementation**:
   - Follow the 28-week roadmap in `IMPLEMENTATION_GUIDE.md`
   - Assemble 10-14 person team
   - Set up infrastructure per specs

### For Roadshow Demo

1. **Run the Mockup**:
   ```bash
   cd roadshow-mockup
   cat README.md  # Demo-specific instructions
   ```

2. **Present to Investors/Clients**:
   - Use pre-loaded demo scenarios
   - Follow demo script (see mockup README)
   - Showcase key differentiators

---

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **product-docs/README.md** | Master documentation index | All team members |
| **IMPLEMENTATION_GUIDE.md** | 28-week roadmap | Tech lead, PM |
| **CLAUDE.md** | AI assistant guide | AI assistants |
| **ENGINEERING_KIT_SUMMARY.md** | High-level overview | Stakeholders |
| **ARCHITECTURE_SIMPLIFICATION.md** | Simplification recommendations | Tech lead, architects |
| **roadshow-mockup/README.md** | Demo setup & usage | Sales, marketing |

---

## 📝 Key Documents by Use Case

**Starting Development?**
→ `product-docs/IMPLEMENTATION_GUIDE.md`

**Understanding Architecture?**
→ `product-docs/architecture/01-architecture-overview.md`

**Building APIs?**
→ `product-docs/api/01-api-design-principles.md`

**Security & Compliance?**
→ `product-docs/security/03-data-privacy-gdpr.md`

**Running Demo?**
→ `roadshow-mockup/README.md`

**AI Assistant?**
→ `CLAUDE.md`

---

## 📊 Project Scope

### Core Features

✅ **Orchestration & Control**: Projects, service orders, journeys, tasks
✅ **Provider & Capacity Management**: Providers, teams, calendars, zones
✅ **Scheduling & Availability**: Buffer logic, slot calculation
✅ **Assignment & Dispatch**: Intelligent matching with transparency
✅ **Execution & Mobile**: Check-in/out, checklists, offline sync
✅ **Communication**: SMS, email, masked communication
✅ **Contracts & Documents**: E-signature, work closing forms
✅ **Analytics & Reporting**: Provider scorecards, KPIs

---

## 🛠️ Technology Stack (Production)

### Backend
- **Language**: TypeScript
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10+
- **ORM**: Prisma
- **Database**: PostgreSQL 15+
- **Messaging**: Apache Kafka (or simplified Outbox pattern)
- **Cache**: Redis/Valkey

### Frontend
- **Web**: React 18 + TypeScript
- **Mobile**: React Native + Expo
- **State**: Redux/Zustand
- **API**: REST (OpenAPI 3.1)

### Infrastructure
- **Container**: Docker
- **Orchestration**: Kubernetes (AWS EKS / Azure AKS)
- **CI/CD**: GitHub Actions
- **Cloud**: AWS or Azure
- **Observability**: OpenTelemetry, Prometheus, Grafana

---

## 📈 Success Metrics

### Technical KPIs
- API latency < 500ms (p95)
- Uptime: 99.9%
- Test coverage: >80%
- Build time: <10 min

### Business KPIs
- 10,000 service orders/month
- >95% assignment success rate
- >85% provider acceptance rate
- >4.5/5 customer satisfaction (CSAT)
- >90% first-time-fix rate

---

## 🗓️ Timeline

### Production Platform
- **Phase 1**: Foundation (Weeks 1-4)
- **Phase 2**: Core Business Logic (Weeks 5-12)
- **Phase 3**: Communication & UX (Weeks 13-16)
- **Phase 4**: Mobile & Advanced (Weeks 17-24)
- **Phase 5**: Integration & Production (Weeks 25-28)
- **Phase 6**: Scale (Week 29+)

**Total**: 28 weeks to production-ready with 10-14 person team

### Roadshow Mockup
- **Week 1-6**: Build demo platform
- **Week 7**: Polish & rehearse
- **Week 8+**: Present to investors/clients

---

## ⚖️ License

UNLICENSED - Proprietary platform

---

## 🔄 Document Version

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-11-15 | Rebranded to Yellow Grid, separated mockup from product |
| 1.0.0 | 2025-01-15 | Initial project documentation |

---

**Yellow Grid** - Transforming Field Service Management 🌟
