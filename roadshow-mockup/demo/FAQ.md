# Yellow Grid - Frequently Asked Questions (FAQ)

**Roadshow Mockup - Technical & Business Questions**

---

## 📋 Table of Contents

- [General Questions](#general-questions)
- [Technical Questions](#technical-questions)
- [Business & Features](#business--features)
- [Demo & Presentation](#demo--presentation)
- [Deployment & Production](#deployment--production)

---

## General Questions

### What is the Yellow Grid Platform?

Yellow Grid is a comprehensive Field Service Management (FSM) system designed for multi-country operations in the home services industry. It manages the complete lifecycle of service orders from creation to completion, including:

- AI-powered sales potential and risk assessment
- Intelligent provider assignment and scheduling
- Field execution tracking with GPS and checklists
- Contract and document lifecycle management
- Provider quality and certification management

### What is this roadshow mockup?

This is a **fully functional demonstration application** showcasing the key features of the Yellow Grid platform. It includes:

- Complete backend API (NestJS, PostgreSQL, 49+ endpoints)
- Interactive web frontend (React, TypeScript, Tailwind CSS)
- Comprehensive seed data (18 scenarios across 4 countries)
- Full documentation for demos and presentations

### Is this production-ready?

**No**, this is a mockup for demonstrations. For production use, you would need:

- Real ML models (not mock assessments)
- Authentication & authorization (PingID SSO)
- Production infrastructure (Docker, Kubernetes)
- Enhanced security (rate limiting, encryption)
- Full monitoring and logging
- Complete test coverage

See `/product-docs/IMPLEMENTATION_GUIDE.md` for the production roadmap.

### What makes Yellow Grid different from other FSM systems?

**Key Differentiators**:

1. **AI-Powered Insights**: Sales potential and risk assessment using ML models
2. **Execution Blocking**: Prevent jobs from starting without prerequisites (Go Exec)
3. **Structured Date Negotiation**: Max 3 rounds with complete audit trail
4. **Assignment Transparency**: Providers see complete scoring algorithm
5. **Provider Tier System**: Quality-based classification (Tier 1/2/3)
6. **Interactive Checklists**: JSON-based, real-time progress tracking

---

## Technical Questions

### What technologies are used?

**Backend**:
- **Framework**: NestJS 10 (TypeScript, Node.js 20 LTS)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **API**: REST with OpenAPI 3.1 (Swagger documentation)
- **Validation**: class-validator, class-transformer

**Frontend**:
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5 (fast HMR, optimized builds)
- **Styling**: Tailwind CSS 3.4 (utility-first)
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Why NestJS instead of Express?

NestJS provides:
- **Built-in structure**: Modular architecture out of the box
- **TypeScript-first**: Better type safety and IntelliSense
- **Dependency Injection**: Easier testing and maintenance
- **Decorators**: Clean API with @Controller, @Get, etc.
- **OpenAPI**: Automatic Swagger documentation generation
- **Scalability**: Easy to extract microservices later

### Why Prisma instead of TypeORM?

Prisma offers:
- **Type-safe queries**: Auto-generated TypeScript types
- **Better DX**: Intuitive API, great autocomplete
- **Migrations**: Declarative schema with migration system
- **Performance**: Optimized query engine
- **Prisma Studio**: Built-in database GUI

### How is data stored?

- **Primary Database**: PostgreSQL 15+
- **Schema**: 24 tables (see `/demo/ARCHITECTURE.md`)
- **JSON Fields**: Used for flexible data (checklists, risk factors, certifications)
- **Relationships**: Enforced at database level with foreign keys
- **Indexing**: Primary keys, foreign keys, frequently queried fields

### How many API endpoints are there?

**49+ REST endpoints** across 7 modules:

| Module | Endpoints | Purpose |
|--------|-----------|---------|
| Providers | 14 | Provider management, tiers, risk, certifications |
| Service Orders | 13 | Order lifecycle, AI assessments, Go Exec |
| Assignments | 10 | Assignment, date negotiation, transparency |
| Executions | 14 | Field work, GPS, checklists, feedback |
| Projects | 5 | Project management |
| Contracts | 6 | Contract lifecycle, e-signature |
| WCF | 6 | Work Closing Forms |

**Full API docs**: http://localhost:3001/api (Swagger UI when backend running)

### Can I add more features?

**Yes!** The architecture is modular and extensible:

1. **Add new module**:
```bash
cd apps/backend
nest generate module feature-name
nest generate controller feature-name
nest generate service feature-name
```

2. **Add new database table**: Update `prisma/schema.prisma` and run migrations

3. **Add new API endpoint**: Add method to controller with decorators

4. **Add new UI page**: Create component in `apps/web/src/pages/`

### How do I debug issues?

**Backend**:
```bash
# Check logs
cd apps/backend
npm run start:dev
# Watch console output

# Check database
npx prisma studio
# Opens GUI at http://localhost:5555

# Check API docs
# Open http://localhost:3001/api
```

**Frontend**:
```bash
# Check logs
cd apps/web
npm run dev
# Watch console output

# Check browser console
# F12 in browser → Console tab

# Check Network requests
# F12 in browser → Network tab
```

### What ports are used?

- **Backend API**: 3001
- **Frontend Dev**: 5173
- **PostgreSQL**: 5432 (default)
- **Prisma Studio**: 5555

---

## Business & Features

### How does AI Sales Potential Assessment work?

**In Production**:
- XGBoost ML model trained on historical Technical Visit data
- 15 features: customer profile, property size, energy consumption, demographics
- 3-class output: LOW / MEDIUM / HIGH
- Confidence scores (0.0 - 1.0)
- SHAP explainability for transparency

**In Mockup**:
- Manual selection for demo purposes
- Simulates ML model output
- Full UI workflow implemented

### How does AI Risk Assessment work?

**In Production**:
- Random Forest ML model trained on service order completion data
- 20 features: job complexity, provider history, customer history, site characteristics
- 4-class output: LOW / MEDIUM / HIGH / CRITICAL
- Risk factor identification
- Automated task creation for high-risk orders

**In Mockup**:
- Manual selection for demo purposes
- Simulates ML model output
- Full UI workflow implemented

### What is "Go Execution Monitoring"?

Go Exec (Go Execution) is a **pre-execution validation** system that prevents technicians from starting jobs when prerequisites are not met.

**Checked Conditions**:
- ✅ Payment received
- ✅ Products delivered to customer
- ✅ Pre-service contract signed
- ✅ No other blocking reasons

**Statuses**:
- **GO EXEC OK** 🟢 - All conditions met, technician can check in
- **GO EXEC NOK** 🔴 - Conditions not met, check-in blocked
- **DEROGATION** 🟡 - Override with operator approval and reason

**Business Value**: Reduces wasted technician trips by 40%

### How does Date Negotiation work?

**Process**:
1. **Original Date**: System proposes initial date based on provider availability
2. **Round 1**: Provider can propose alternative date if original doesn't work
3. **Round 2**: Customer can counter-propose different date
4. **Round 3**: Final round - provider or customer proposes
5. **Max Rounds**: After 3 rounds, escalates to manual operator intervention

**Features**:
- Complete audit trail with timestamps
- Notes/reasoning for each proposal
- Visual timeline in UI (color-coded: provider=blue, customer=green)
- 4-hour timeout for provider response

**Business Value**: Reduces scheduling conflicts and back-and-forth communications

### What is Assignment Transparency?

**Concept**: Providers can see exactly **why** they were selected (or not selected) for a job.

**Scoring Breakdown**:
- **Tier Match** (40 points): Does provider tier match job requirements?
- **Certifications** (30 points): Does provider have required certifications?
- **Distance** (20 points): How close is provider to job site?
- **Rating** (10 points): Provider's customer satisfaction rating

**Total**: 100 points maximum

**Assignment Modes**:
- **Direct**: System assigns to best match
- **Offer**: Provider can accept/refuse
- **Broadcast**: Multiple providers can bid

**Business Value**: Reduces disputes, improves provider trust and acceptance rates

### How does the Provider Tier System work?

**3 Tiers**:

- **Tier 1 - Premium**:
  - Highest quality standards
  - Priority assignment to complex/high-value jobs
  - Premium pricing
  - Strict certification and performance requirements

- **Tier 2 - Standard**:
  - Baseline quality requirements met
  - Standard job assignment
  - Standard pricing
  - Core certifications required

- **Tier 3 - Basic**:
  - New partners or on probation
  - Simple job assignment only
  - Lower pricing
  - Minimal certifications

**Tier Changes**: Based on performance metrics, customer ratings, compliance

### What are the Provider Risk Statuses?

**3 Statuses**:

1. **OK** 🟢:
   - Normal operations
   - Can receive assignments
   - No issues detected

2. **ON_WATCH** 🟡:
   - Flagged for closer monitoring
   - Still active and can work
   - Reason required (e.g., "3 late arrivals in 30 days")
   - Can escalate to SUSPENDED if issues continue

3. **SUSPENDED** 🔴:
   - Cannot receive new assignments
   - Active jobs can be completed
   - Reason required (e.g., "Safety violations")
   - Optional date range (from/until)
   - Can be lifted by operator

### How do Interactive Checklists work?

**Features**:
- **JSON Storage**: Flexible structure in database
- **Required vs Optional**: Some items must be completed
- **Real-time Updates**: Toggle completion, updates instantly
- **Progress Bar**: Visual indication of completion (0-100%)
- **Validation**: Warnings if required items not completed
- **Timestamps**: Track when each item was completed

**Example Checklist**:
```json
[
  { "id": "1", "label": "Verify customer identity", "required": true, "completed": true },
  { "id": "2", "label": "Check site accessibility", "required": true, "completed": true },
  { "id": "3", "label": "Take before photos", "required": false, "completed": false },
  { "id": "4", "label": "Install equipment", "required": true, "completed": false }
]
```

**Business Value**: Ensures quality and completeness of field work

### How is GPS tracking used?

**Check-in**:
- Captures GPS coordinates (latitude, longitude)
- Records timestamp
- Verifies technician is at job site

**Check-out**:
- Captures GPS coordinates again
- Records timestamp
- Logs actual hours worked
- Can detect if technician moved during job

**Business Value**:
- Verify presence at job site
- Track productivity (time on site vs time charged)
- Fraud prevention
- Route optimization insights

---

## Demo & Presentation

### How long does a typical demo take?

**Quick Demo**: 5 minutes
- Focus on top 3-4 features
- AI assessments + date negotiation + checklists

**Standard Demo**: 15 minutes
- Complete workflow walkthrough
- All 10 key features
- Q&A

**Technical Deep-Dive**: 30-45 minutes
- Architecture overview
- API walkthrough
- Database schema
- Code examples

See `/demo/README.md` for detailed demo scripts.

### What scenarios are pre-loaded in the seed data?

**18 Scenarios** covering:

1. High Sales Potential Technical Visit (Spain)
2. Medium Risk Installation (France)
3. Date Negotiation - 3 Rounds (France)
4. Auto-Accept Assignment (Spain/Italy)
5. Blocked Execution - Go Exec NOK (Poland)
6. Complete Execution with Feedback (Italy)
7. Suspended Provider (Poland)
8. Expired Certification (Poland)
9. ON_WATCH Provider (France)
10. Tier 1 Premium Provider (Spain)
... and 8 more scenarios

**Countries**: Spain (ES), France (FR), Italy (IT), Poland (PL)

### Can I customize the demo data?

**Yes!** Two options:

1. **Modify seed script**:
```bash
cd apps/backend
# Edit prisma/seed.ts
# Re-run seed
npx prisma db seed
```

2. **Use Prisma Studio**:
```bash
cd apps/backend
npx prisma studio
# GUI opens at http://localhost:5555
# Edit data visually
```

### What if something breaks during the demo?

**Preparation**:
1. Always test before presenting
2. Have 2-3 backup scenarios ready
3. Keep Swagger API docs open in background tab
4. Refresh page if UI gets stuck

**Common Issues**:
- **Page won't load**: Check backend is running (http://localhost:3001/api)
- **Data missing**: Re-run seed script
- **Strange behavior**: Clear browser cache/localStorage

**Fallback**: If UI fails, demonstrate via Swagger API docs

### How do I present this to non-technical audiences?

**Focus on**:
- **Business value**, not technical details
- **Visual elements** (color-coded UI, progress bars, timelines)
- **Real-world scenarios** ("Imagine a customer needs solar panels installed...")
- **Cost savings** and **efficiency gains**

**Avoid**:
- Technical jargon (API, ORM, DTOs, etc.)
- Code walkthrough (unless specifically requested)
- Deep architecture dive (save for technical follow-up)

See `/demo/QUICK_REFERENCE.md` for business value statements.

---

## Deployment & Production

### How do I deploy this to a server?

This mockup is designed for **local demonstration only**. For production deployment:

1. **See main documentation**: `/product-docs/IMPLEMENTATION_GUIDE.md`
2. **Containerize**: Create Dockerfiles for backend and frontend
3. **Infrastructure**: Setup Kubernetes cluster or cloud platform
4. **Environment**: Configure production environment variables
5. **CI/CD**: Setup automated build and deployment pipelines
6. **Monitoring**: Add logging, metrics, and alerting

### Can this scale to production?

The **architecture is designed to scale**, but this mockup needs enhancements:

**Current Limitations**:
- Single server (no load balancing)
- No caching (Redis)
- No message queue (Kafka)
- No authentication
- No rate limiting
- Limited error handling

**For Production** (see product docs):
- Microservices architecture (can extract modules)
- Horizontal scaling with Kubernetes
- Caching layer (Redis)
- Event streaming (Kafka)
- CDN for frontend assets
- Database replication and sharding

### What about security?

**Current Security** (Mockup):
- ✅ Input validation (class-validator)
- ✅ SQL injection prevention (Prisma parameterized queries)
- ✅ CORS configuration
- ❌ No authentication
- ❌ No authorization
- ❌ No rate limiting
- ❌ No encryption at rest

**Production Security Needed**:
- SSO/JWT authentication (PingID)
- Role-based access control (RBAC)
- Rate limiting (per user/IP)
- Encryption at rest and in transit
- Security headers (Helmet.js)
- Audit logging
- Penetration testing

### How much would it cost to run in production?

**Estimated Monthly Costs** (AWS, moderate scale):

- **Compute**: 2x EC2 t3.medium instances (~$60/month)
- **Database**: RDS PostgreSQL db.t3.medium (~$100/month)
- **Load Balancer**: ALB (~$25/month)
- **Storage**: S3 for media (~$10/month)
- **Monitoring**: CloudWatch, logs (~$20/month)
- **CDN**: CloudFront (~$15/month)

**Total**: ~$230/month for small-medium deployment

**Scale up** for higher traffic:
- Kubernetes cluster (EKS): ~$500-2000/month
- Managed Redis (ElastiCache): ~$50-200/month
- Managed Kafka (MSK): ~$200-500/month

### Can I use this code in my own project?

**Yes**, with considerations:

- This is a **demonstration/reference implementation**
- Code is provided as-is for learning and demos
- For production use, follow full engineering specs in `/product-docs/`
- Consider hiring the development team for production implementation
- Ensure proper testing, security, and compliance for your use case

### Where can I get support?

**For this mockup**:
- Review documentation in `/demo/` folder
- Check troubleshooting section in `/demo/README.md`
- Review code comments and inline documentation

**For production implementation**:
- See `/product-docs/` for complete engineering specifications
- Contact the Yellow Grid development team
- Consider professional services for implementation

### What's next after the roadshow?

**Typical Next Steps**:

1. **Stakeholder Decision**: Approve project for development
2. **Team Formation**: Assemble 10-14 engineers (see `/product-docs/IMPLEMENTATION_GUIDE.md`)
3. **Planning**: 28-week implementation roadmap available
4. **Phase 1**: Core FSM features (12 weeks)
5. **Phase 2**: Advanced features + ML (8 weeks)
6. **Phase 3**: Mobile apps + integrations (8 weeks)
7. **Production**: Deployment and go-live

**Total Estimated Timeline**: 28 weeks (~7 months)

---

## Still Have Questions?

### Documentation Resources
- **Main Demo Guide**: `/demo/README.md`
- **Quick Reference**: `/demo/QUICK_REFERENCE.md`
- **Architecture**: `/demo/ARCHITECTURE.md`
- **Product Specs**: `/product-docs/` (69 files, 45,000 lines)

### API Documentation
- **Swagger UI**: http://localhost:3001/api (when backend running)
- **OpenAPI Spec**: http://localhost:3001/api-json

### Code Repository
- **Backend**: `/apps/backend/src/`
- **Frontend**: `/apps/web/src/`
- **Database**: `/apps/backend/prisma/`

---

**Prepared for**: Yellow Grid Platform Roadshow
**Last Updated**: 2025-01-16
**Version**: v1.0.0
