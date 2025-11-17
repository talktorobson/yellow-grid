# Yellow Grid Platform - Roadshow Demo Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-16
**Status**: Ready for Demo

---

## 🎯 Quick Start (5 Minutes)

### Prerequisites
- Node.js 20 LTS or higher
- PostgreSQL 15+ running locally
- Git

### 1. Clone & Install
```bash
cd roadshow-mockup
npm install
```

### 2. Setup Database
```bash
# Create database
createdb yellow_grid_demo

# Configure environment
cp apps/backend/.env.example apps/backend/.env

# Edit apps/backend/.env:
DATABASE_URL="postgresql://user:password@localhost:5432/yellow_grid_demo"
```

### 3. Initialize Database & Seed Data
```bash
cd apps/backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed demo data (18 scenarios, all 10 workflow steps)
npx prisma db seed
```

### 4. Start Backend
```bash
cd apps/backend
npm run start:dev

# Backend runs on http://localhost:3001
# Swagger API docs: http://localhost:3001/api
```

### 5. Start Frontend
```bash
# In a new terminal
cd apps/web
npm run dev

# Frontend runs on http://localhost:5173
```

### 6. Access the Demo
Open browser: **http://localhost:5173**

---

## 🏗️ Architecture Overview

### Technology Stack

**Backend**:
- **Framework**: NestJS 10 (TypeScript)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **API**: REST with OpenAPI 3.1 (Swagger)
- **Validation**: class-validator, class-transformer

**Frontend**:
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5 (fast HMR)
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router v6
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Project Structure
```
roadshow-mockup/
├── apps/
│   ├── backend/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/           # 7 feature modules
│   │   │   │   ├── providers/
│   │   │   │   ├── service-orders/
│   │   │   │   ├── assignments/
│   │   │   │   ├── executions/
│   │   │   │   ├── projects/
│   │   │   │   ├── contracts/
│   │   │   │   └── wcf/
│   │   │   └── common/
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Database schema
│   │   │   └── seed.ts            # Demo data (1,143 lines)
│   │   └── package.json
│   │
│   └── web/                        # React frontend
│       ├── src/
│       │   ├── api/               # 7 API service modules (72 endpoints)
│       │   ├── components/        # Reusable components
│       │   ├── pages/             # 12 route pages
│       │   ├── types/             # TypeScript definitions
│       │   └── main.tsx
│       └── package.json
│
├── demo/                           # This documentation
└── package.json
```

### API Architecture

**7 Modules, 49+ REST Endpoints**:

| Module | Endpoints | Key Features |
|--------|-----------|--------------|
| **Providers** | 14 | Tier management, risk status, certifications |
| **Service Orders** | 13 | AI assessments, Go Exec monitoring, lifecycle |
| **Assignments** | 10 | Date negotiation, timeout tracking, transparency |
| **Executions** | 14 | Check-in/out, checklists, media, feedback |
| **Projects** | 5 | Project management, ownership |
| **Contracts** | 6 | E-signature workflow |
| **WCF** | 6 | Work Closing Forms |

**Full API Documentation**: http://localhost:3001/api (Swagger UI)

---

## ⭐ Key Features Showcase

### 1. AI-Powered Sales Potential Assessment
**Location**: Service Order Detail Page

**What it demonstrates**:
- XGBoost ML model integration (mock for demo)
- 3-tier classification: LOW / MEDIUM / HIGH
- Confidence scores (0.0 - 1.0)
- Pre-estimation value linking
- Sales notes capture

**Demo Script**:
1. Navigate to Service Orders → Click any Technical Visit order
2. Locate "AI Sales Potential Assessment" panel
3. Click "Assess Sales Potential" button
4. Select HIGH (87% confidence, €15k estimated value)
5. Show how high-potential leads get prioritized

**Business Value**: Prioritize Technical Visits most likely to convert to sales.

---

### 2. AI-Powered Risk Assessment
**Location**: Service Order Detail Page

**What it demonstrates**:
- Random Forest ML model integration (mock for demo)
- 4-tier risk levels: LOW / MEDIUM / HIGH / CRITICAL
- Risk factor identification
- Automated task creation for high-risk orders
- Proactive risk management

**Demo Script**:
1. On same Service Order detail page
2. Locate "AI Risk Assessment" panel
3. Click "Assess Risk" button
4. Select CRITICAL (92% risk score)
5. Show risk factors: complexity, history
6. Explain how this triggers task creation

**Business Value**: Identify problematic jobs before they fail, reducing costly rework.

---

### 3. Go Execution Monitoring & Blocking
**Location**: Service Order Detail Page

**What it demonstrates**:
- Pre-execution validation (payment, delivery, contract status)
- Blocking logic when conditions not met
- Derogation workflow (override with reason)
- Real-time status display

**Demo Script**:
1. Navigate to Service Order with status "ASSIGNED"
2. Locate "Go Execution Monitoring" panel
3. Show status breakdown:
   - Payment Status: PAID ✅
   - Product Delivery: DELIVERED ✅
   - Contract: SIGNED ✅
   - **Overall**: GO EXEC OK 🟢
4. Click "Block Execution" to simulate NOK scenario
5. Show how technician cannot check-in when blocked
6. Demonstrate derogation override

**Business Value**: Prevent technicians from starting jobs without prerequisites, reducing failed visits.

---

### 4. Date Negotiation Workflow (Max 3 Rounds)
**Location**: Assignment Detail Page

**What it demonstrates**:
- Visual timeline of negotiation rounds
- Color-coded proposers (Provider=blue, Customer=green)
- Max 3 rounds enforcement
- Automatic escalation to operator after 3 rounds
- Notes and reasoning for each proposal

**Demo Script**:
1. Navigate to Assignments → Click assignment with status "PENDING"
2. Scroll to "Date Negotiation Timeline"
3. Show original date: December 5, 2024, 10:00 AM
4. Show Round 1 (Provider proposes Dec 6 - "Team fully booked")
5. Show Round 2 (Customer proposes Dec 7 - "Not available Dec 6")
6. Show Round 3 (Provider proposes Dec 8 - "Adjusted schedule")
7. Show **MAX ROUNDS WARNING** - Manual intervention required

**Business Value**: Structured date conflict resolution with clear audit trail.

---

### 5. Provider Tier & Risk Management
**Location**: Provider Detail Page

**What it demonstrates**:
- 3-tier provider classification (Tier 1/2/3)
- Risk status workflow: OK → ON_WATCH → SUSPENDED
- Certification expiration tracking
- Context-aware actions based on state

**Demo Script**:
1. Navigate to Providers → Click any provider
2. Show current tier badge (e.g., "Tier 2 - Standard")
3. Click "Update Tier" → Select Tier 1 (Premium)
4. Explain tier criteria:
   - Tier 1: Highest quality, premium pricing
   - Tier 2: Standard, meets baseline requirements
   - Tier 3: Basic, new partners or probation
5. Show Risk Status section
6. Click "Put On Watch" → Enter reason: "3 late arrivals in 30 days"
7. Show ON_WATCH badge with warning banner
8. Click "Suspend Provider" → Enter reason and date range
9. Show SUSPENDED badge and alert
10. Demonstrate "Lift Suspension" action

**Business Value**: Systematic provider quality management with clear escalation path.

---

### 6. Interactive Execution Checklists
**Location**: Execution Detail Page

**What it demonstrates**:
- JSON-based checklist storage
- Visual progress bar
- Required vs optional items
- Toggle completion in real-time
- Validation warnings for incomplete required items

**Demo Script**:
1. Navigate to Executions → Click execution with status "IN_PROGRESS"
2. Scroll to "Execution Checklist" section
3. Show progress bar: 67% complete
4. Toggle checklist items:
   - ✅ "Verify customer identity" (required)
   - ✅ "Check installation site accessibility" (required)
   - ⬜ "Take before photos" (required) ← Not completed
   - ✅ "Install solar panels" (required)
   - ⬜ "Configure inverter" (required) ← Not completed
   - ✅ "Test system operation" (required)
   - ⬜ "Customer walkthrough" (optional)
5. Show warning: "Some required items are not completed"
6. Complete remaining required items → Progress bar updates to 100%

**Business Value**: Ensure quality and completeness of field work with structured checklists.

---

### 7. GPS Check-in/Check-out Tracking
**Location**: Execution Detail Page

**What it demonstrates**:
- Browser geolocation integration
- Timestamp and coordinates capture
- Actual hours tracking
- Blocking prevention when execution is NOK

**Demo Script**:
1. On Execution Detail page (status: CHECKED_IN)
2. Show Check-in section:
   - Timestamp: December 5, 2024, 08:15 AM
   - GPS: 48.856613, 2.352222
3. Click "Check Out" button
4. Click "Use Current Location" (browser prompts for permission)
5. Enter actual hours: 6.5
6. Submit check-out
7. Show Check-out section with new data
8. Show calculated time on-site

**Business Value**: Verify technician presence at job site, track productivity.

---

### 8. Assignment Transparency & Scoring
**Location**: Assignment Detail Page

**What it demonstrates**:
- Complete funnel audit trail
- Scoring algorithm visibility
- Multiple assignment modes: Direct, Offer, Broadcast
- Country-specific auto-accept (ES, IT)

**Demo Script**:
1. Navigate to Assignment Detail page
2. Show "Assignment Transparency" panel
3. Explain scoring factors:
   - Tier match (40 points)
   - Certifications (30 points)
   - Distance (20 points)
   - Rating (10 points)
4. Show auto-accept indicator for ES/IT countries
5. Explain how providers can see why they were/weren't selected

**Business Value**: Fair and transparent provider selection, reduces disputes.

---

### 9. Customer Feedback Collection
**Location**: Execution Detail Page

**What it demonstrates**:
- 5-star rating system
- Customer comments
- Digital signature capture (placeholder)
- Post-service quality tracking

**Demo Script**:
1. Navigate to Execution with status "COMPLETED"
2. Scroll to "Customer Feedback" section (if already submitted)
3. Show rating: 5/5 stars
4. Show comments: "Excellent work, very professional team"
5. Show signature placeholder
6. Explain how this feeds provider rating

**Business Value**: Track service quality, identify top performers and problem providers.

---

### 10. Certification Expiration Management
**Location**: Provider Detail Page

**What it demonstrates**:
- Certification tracking with expiration dates
- Color-coded alerts:
  - 🔴 Red: Expired
  - 🟡 Yellow: Expiring within 30 days
  - ⚪ White: Valid
- Add/remove certifications
- Compliance management

**Demo Script**:
1. Navigate to Provider Detail page
2. Scroll to "Certifications" section
3. Show certifications list:
   - "Solar Panel Installation" (SOLAR_INST_2024) - Expires Dec 31, 2025 (Valid)
   - "Electrical Work" (ELEC_CERT_2023) - Expires Jan 15, 2025 (Expiring Soon - Yellow)
   - "Roof Work" (ROOF_2022) - Expired Nov 30, 2024 (Expired - Red)
4. Click "Add Certification"
5. Enter new certification details
6. Submit
7. Click remove icon on expired certification

**Business Value**: Ensure regulatory compliance, prevent unqualified technicians from being assigned.

---

## 🎬 Complete Demo Walkthrough (15 Minutes)

### Scenario: High-Value Solar Installation with Complications

**Backstory**: Customer needs solar panel installation. We'll walk through the entire lifecycle from order creation to completion, showcasing all key features.

---

#### **Step 1: Service Order Creation & AI Assessment (2 min)**

1. **Navigate**: Dashboard → Service Orders → Click "SO-2024-TV-001" (Technical Visit)
2. **AI Sales Potential**:
   - Click "Assess Sales Potential"
   - Select HIGH (87% confidence, €15,000 estimated value)
   - Explain: AI analyzed customer profile, property size, energy consumption
   - **Value**: Prioritize this lead for follow-up
3. **AI Risk Assessment**:
   - Click "Assess Risk"
   - Select MEDIUM (52% risk score)
   - Risk factors: First-time customer, moderate site complexity
   - **Value**: Create monitoring task automatically

---

#### **Step 2: Go Exec Validation (1 min)**

1. **Check Go Exec Status**:
   - Payment: PAID ✅
   - Product Delivery: DELIVERED ✅
   - Contract: SIGNED ✅
   - **Overall**: GO EXEC OK 🟢
2. **Demonstrate Blocking** (optional):
   - Click "Block Execution"
   - Reason: "Customer requested reschedule"
   - Show GO EXEC NOK 🔴
   - **Value**: Prevents wasted technician trips

---

#### **Step 3: Provider Assignment & Transparency (2 min)**

1. **Navigate**: Assignments → Click assignment for this order
2. **Show Provider Info**:
   - Provider: "SolarPro France"
   - Tier: Tier 1 (Premium)
   - Risk Status: OK ✅
3. **Assignment Transparency**:
   - Scoring breakdown:
     - Tier 1 match: 40 points
     - Solar certification: 30 points
     - Distance <10km: 20 points
     - Rating 4.8/5: 10 points
     - **Total**: 100/100 points
   - **Value**: Provider understands why they were selected

---

#### **Step 4: Date Negotiation (3 min)**

1. **Show Original Date**: December 5, 2024, 10:00 AM
2. **Round 1** (Provider proposes alternative):
   - Provider: "Team fully booked on Dec 5"
   - Proposed: December 6, 2024, 10:00 AM
3. **Round 2** (Customer counter-proposes):
   - Customer: "Not available December 6"
   - Proposed: December 7, 2024, 14:00 PM
4. **Round 3** (Provider accepts):
   - Provider: "Adjusted team schedule"
   - Accepted: December 7, 2024, 14:00 PM
5. **Show Timeline Visual**:
   - Color-coded (blue=provider, green=customer)
   - Round counter: 3/3 rounds
   - **Value**: Structured conflict resolution

---

#### **Step 5: Field Execution - Check-in (2 min)**

1. **Navigate**: Executions → Click execution for this assignment
2. **Check Blocking Status**: Not blocked ✅
3. **Click "Check In"**:
   - Click "Use Current Location" (browser prompts)
   - GPS captured: 48.856613, 2.352222
   - Timestamp: December 7, 2024, 14:05 PM
4. **Show Checklist**:
   - Progress: 0% complete
   - 7 items total (5 required, 2 optional)
   - **Value**: Technician knows exactly what to do

---

#### **Step 6: Checklist Completion (2 min)**

1. **Toggle Items** (demonstrate progress bar updating):
   - ✅ Verify customer identity
   - ✅ Check site accessibility
   - ✅ Take before photos
   - ✅ Install solar panels (main work)
   - ✅ Configure inverter
   - ✅ Test system operation
   - ✅ Customer walkthrough
2. **Progress Bar**: 0% → 14% → 28% → ... → 100%
3. **Show Warning** (before completing required items):
   - "Some required items are not completed"
4. **Value**: Quality assurance, nothing forgotten

---

#### **Step 7: Check-out & Completion (1 min)**

1. **Click "Check Out"**:
   - Click "Use Current Location"
   - GPS: 48.856789, 2.352445 (moved slightly)
   - Actual hours: 6.5
   - Submit
2. **Show Time Tracking**:
   - Check-in: 14:05
   - Check-out: 20:35
   - Duration: 6h 30min
3. **Complete Execution**:
   - Click "Complete Execution"
   - Status: COMPLETE ✅
   - Notes: "Installation successful, customer very satisfied"

---

#### **Step 8: Customer Feedback (1 min)**

1. **Customer Feedback Form** (in sidebar):
   - Rating: Click 5 stars ⭐⭐⭐⭐⭐
   - Comments: "Excellent work, very professional team. System working perfectly!"
   - Submit
2. **Show Feedback Display**:
   - 5/5 stars
   - Customer comments
   - **Value**: Quality tracking, provider rating updates

---

#### **Step 9: Provider Management (1 min)**

1. **Navigate**: Providers → Click "SolarPro France"
2. **Show Provider Profile**:
   - Tier 1 - Premium
   - Risk Status: OK
   - Overall Rating: 4.8/5
   - Certifications: 3 valid, 1 expiring soon
3. **Performance Metrics**:
   - Acceptance Rate: 87%
   - On-Time Completion: 92%
4. **Demonstrate Actions**:
   - Update Tier (show modal)
   - Put On Watch (show modal)
   - Suspend Provider (show modal)
5. **Value**: Continuous provider quality management

---

### Demo Tips

✅ **Do**:
- Emphasize **unique differentiators**: AI assessments, date negotiation, assignment transparency
- Show **business value** for each feature, not just technical capabilities
- Use the **seed data** - it has realistic scenarios pre-loaded
- Highlight **color-coded UI** - makes complex states easy to understand
- Demonstrate **real-time updates** - toggle checklist items, update statuses

❌ **Don't**:
- Rush through the AI assessment features - these are key differentiators
- Skip the date negotiation timeline - it's a unique feature
- Forget to explain **why** features matter (reduce costs, improve quality, etc.)
- Get stuck on technical details unless asked

---

## 📊 Demo Data Overview

The seed script creates **18 scenarios** covering all 10 workflow steps:

### Countries & Providers
- **4 Countries**: Spain (ES), France (FR), Italy (IT), Poland (PL)
- **12 Providers**:
  - Tier 1 (4 providers): Premium quality
  - Tier 2 (6 providers): Standard quality
  - Tier 3 (2 providers): Basic/probation
- **Risk Statuses**:
  - 9 providers: OK
  - 2 providers: ON_WATCH
  - 1 provider: SUSPENDED

### Service Orders
- **12 Service Orders** across all countries
- **Service Types**:
  - Technical Visits (TV): 4 orders
  - Installations: 6 orders
  - Repairs: 2 orders
- **Statuses**: CREATED, SCHEDULED, ASSIGNED, IN_PROGRESS, COMPLETED

### Key Scenarios
1. **High Sales Potential TV** (Spain) - Demonstrates AI sales assessment
2. **Medium Risk Installation** (France) - Demonstrates AI risk assessment
3. **Date Negotiation Flow** (France) - 3 rounds, max rounds reached
4. **Auto-Accept Assignment** (Spain) - Country-specific auto-accept
5. **Blocked Execution** (Poland) - Go Exec NOK scenario
6. **Complete Execution** (Italy) - Full checklist, customer feedback
7. **Suspended Provider** (France) - Risk management workflow
8. **Expired Certification** (Poland) - Compliance tracking

---

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -l | grep yellow_grid_demo

# Reset database (WARNING: Deletes all data)
cd apps/backend
npx prisma migrate reset
npx prisma db seed
```

### Backend Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process if needed
kill -9 <PID>

# Check environment variables
cat apps/backend/.env

# Regenerate Prisma client
cd apps/backend
npx prisma generate
```

### Frontend Build Errors
```bash
# Clear node_modules and reinstall
cd apps/web
rm -rf node_modules
npm install

# Check TypeScript errors
npm run build
```

### Seed Data Not Loading
```bash
# Check package.json has seed configuration
cat apps/backend/package.json | grep seed

# Run seed manually
cd apps/backend
npx tsx prisma/seed.ts

# Check data loaded
npx prisma studio
# Browse tables in Prisma Studio UI
```

---

## 📸 Screenshot Guide (for presentations)

Recommended screenshots to capture for presentations:

1. **Dashboard Overview** - Shows all statistics
2. **Service Order Detail - AI Assessments** - Sales Potential + Risk panels
3. **Service Order Detail - Go Exec Monitoring** - Status breakdown
4. **Assignment Detail - Date Negotiation Timeline** - Visual timeline with 3 rounds
5. **Assignment Detail - Assignment Transparency** - Scoring breakdown
6. **Execution Detail - Interactive Checklist** - Progress bar at various stages
7. **Execution Detail - GPS Tracking** - Check-in/check-out with coordinates
8. **Execution Detail - Customer Feedback** - 5-star rating and comments
9. **Provider Detail - Tier Management** - Tier selection modal
10. **Provider Detail - Risk Status Alerts** - Suspended/On Watch banners
11. **Provider Detail - Certifications** - Color-coded expiration warnings

---

## 🚀 Next Steps After Demo

### For Further Development
1. **Implement Real ML Models**:
   - Integrate actual XGBoost for sales potential
   - Integrate Random Forest for risk assessment
   - Add feature engineering pipelines

2. **Add Authentication**:
   - PingID SSO integration
   - JWT token management
   - Role-based access control

3. **Mobile App**:
   - React Native provider app
   - Technician field app
   - Offline-first architecture

4. **Production Infrastructure**:
   - Docker containerization
   - Kubernetes deployment
   - CI/CD pipelines

5. **Additional Features**:
   - Real-time notifications (WebSocket)
   - File upload for photos/signatures
   - PDF generation for contracts/WCF
   - Advanced analytics dashboards

### For Production Deployment
See main project documentation: `/product-docs/IMPLEMENTATION_GUIDE.md`

---

## 📞 Support & Resources

- **Main Documentation**: `/product-docs/`
- **API Documentation**: http://localhost:3001/api (when backend running)
- **Prisma Studio** (Database UI): `npx prisma studio` in apps/backend
- **Backend Port**: 3001
- **Frontend Port**: 5173

---

**Prepared for**: Yellow Grid Platform Roadshow
**Version**: Roadshow Mockup v1.0.0
**Ready for Demo**: ✅ Yes
