# Yellow Grid - Roadshow Mockup (DEMO ONLY)

> ⚠️ **IMPORTANT**: This is a SIMPLIFIED MOCKUP for roadshow demonstrations. **DO NOT use as production code!**

---

## 🎯 Purpose

This mockup demonstrates Yellow Grid's key value propositions to investors and potential clients through:
- Live interactive demos (15-20 minutes)
- Pre-loaded realistic scenarios
- Visual showcase of core differentiators
- Working prototypes of key features

## ⚠️ Limitations

This is a **DEMO** implementation with significant simplifications:

| Area | Production | Mockup |
|------|-----------|--------|
| **Architecture** | Microservices/modular monolith | Simplified monolith |
| **Database** | Multi-schema with RLS | Single schema, app-level filtering |
| **Messaging** | Kafka / robust event bus | In-memory events |
| **Security** | Full RBAC, audit, encryption | Basic JWT auth |
| **Testing** | 80%+ coverage | Minimal testing |
| **Performance** | Optimized for scale | Demo data only |
| **Integrations** | Real external systems | Mocked services |
| **Infrastructure** | Kubernetes, multi-AZ | Docker Compose |

**For production specifications, see `/documentation/` directory.**

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- (Optional) Mobile: Expo Go app

### Setup

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis)
npm run docker:up

# Run database migrations
npm run db:migrate

# Seed demo data
npm run seed

# Start backend API
npm run dev:backend

# In another terminal: Start web app
npm run dev:web

# (Optional) Start mobile app
npm run dev:mobile
```

### Access Points

- **Backend API**: http://localhost:3000/api
- **API Docs**: http://localhost:3000/api/docs
- **Web App**: http://localhost:5173
- **Database UI**: http://localhost:8080 (Adminer)
- **Mobile**: Expo Go (scan QR code)

### Demo Credentials

```
Admin: admin@yellowgrid.com / demo123
Operator: operator@yellowgrid.com / demo123
Provider: provider@yellowgrid.com / demo123
Technician: tech@yellowgrid.com / demo123
```

---

## 🎬 Demo Scenarios

### Scenario 1: Happy Path Installation (France)
**Duration**: 3 minutes
**Customer**: Jean Dupont, Paris
**Service**: Kitchen installation (P2)
**Provider**: InstallPro France (5-star)
**Flow**: Create order → Auto-assign → Accept → Complete → Rate

**Key Showcase**:
- Quick order creation
- Intelligent auto-assignment
- Real-time status updates

### Scenario 2: Technical Visit Flow (Spain)
**Duration**: 4 minutes
**Customer**: Maria Garcia, Madrid
**Service**: Bathroom renovation (requires TV)
**Flow**: TV scheduled → YES-BUT outcome → Scope change → Installation scheduled

**Key Showcase**:
- TV dependency management
- Automatic blocking/unblocking
- Complex workflow handling

### Scenario 3: Assignment Transparency (Italy)
**Duration**: 3 minutes
**Order**: Urgent P1 repair
**Candidates**: 12 providers evaluated
**Flow**: View assignment funnel → See scoring → Audit trail

**Key Showcase**: ⭐ **PRIMARY DIFFERENTIATOR**
- Filtering funnel (47→12→5→3→1)
- Scoring breakdown (distance: 25pts, rating: 30pts, etc.)
- Complete transparency

### Scenario 4: Multi-Country Operations
**Duration**: 2 minutes
**View**: Dashboard across ES, FR, IT, PL
**Shows**: 500+ active orders, real-time updates

**Key Showcase**:
- Enterprise scale visualization
- Multi-tenant operations
- Real-time dashboards

### Scenario 5: Mobile Field Experience
**Duration**: 4 minutes
**Technician**: Marco (Italian technician)
**Flow**: Job list → Navigate → Check-in → Photos → Signature → Check-out

**Key Showcase**:
- User-friendly mobile UX
- GPS tracking
- Offline capability (if demoing offline mode)

---

## 📁 Project Structure

```
roadshow-mockup/
├── apps/
│   ├── backend/          # NestJS API server
│   │   ├── prisma/       # Database schema & migrations
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── database/ # Prisma service
│   │   │   └── main.ts   # App bootstrap
│   │   └── package.json
│   │
│   ├── web/              # React Control Tower (operator UI)
│   │   ├── src/
│   │   │   ├── pages/    # Page components
│   │   │   ├── components/ # Reusable components
│   │   │   ├── hooks/    # Custom React hooks
│   │   │   └── api/      # API client
│   │   └── package.json
│   │
│   └── mobile/           # React Native technician app
│       ├── src/
│       │   ├── screens/  # Screen components
│       │   ├── navigation/ # React Navigation
│       │   └── services/ # API & offline sync
│       └── package.json
│
├── docker/               # Docker Compose infrastructure
│   ├── docker-compose.yml
│   └── init-db.sql
│
├── packages/
│   └── shared/           # Shared types & utilities
│
└── README.md             # This file
```

---

## 🎨 Demo Flow Walkthrough

### Part 1: The Problem (2 min)
*Presenter speaks while showing slides*

"Field service is broken:
- Providers don't trust black-box assignments
- Operators lack visibility
- Customers frustrated by delays
- No transparency = no trust"

### Part 2: Yellow Grid Solution (12 min)
*Live demo on actual platform*

**2A. Control Tower** (3 min)
1. Login as operator
2. Show dashboard (active orders, metrics)
3. Create new service order (quick form)
4. Watch auto-assignment happen in real-time
5. View assignment details

**2B. Assignment Transparency** (3 min) ⭐ **KILLER FEATURE**
1. Open assignment funnel visualization
2. Show filtering steps:
   - 47 providers in system
   - 12 in service zone
   - 5 available on date
   - 3 have required skills
   - 1 best match (highest score)
3. Display scoring breakdown
4. Show audit trail

**2C. Mobile Experience** (3 min)
1. Switch to mobile app (or emulator)
2. Login as technician
3. View job list
4. Open job details
5. Start navigation (maps)
6. Check-in with GPS
7. Complete checklist
8. Take photos
9. Get customer signature
10. Check-out

**2D. Analytics & Insights** (3 min)
1. Back to web app
2. Show provider scorecards
3. Display capacity heat maps
4. View quality metrics (CSAT, first-time-fix)
5. Demonstrate multi-country view

### Part 3: The Platform (2 min)
*Switch to slides*

- Multi-country, multi-tenant SaaS
- Enterprise security (GDPR, RBAC)
- Integration-ready (Sales, ERP, Comms)
- Scalable (100k+ orders/month)

### Part 4: The Opportunity (2 min)
*Slide deck*

- Market size
- Roadmap (pilot → multi-country → enterprise)
- Investment ask / partnership proposal

**Total**: 18 minutes + Q&A

---

## 🛠️ Technology Stack (Mockup)

### Backend
- NestJS 10 + TypeScript 5
- Prisma ORM
- PostgreSQL 15
- JWT authentication
- Swagger documentation

### Frontend
- React 18 + Vite
- TailwindCSS + Ant Design
- React Query
- Recharts for visualizations

### Mobile
- React Native + Expo
- React Navigation
- AsyncStorage (offline)
- Expo Camera, Location

### Infrastructure (Local Demo)
- Docker Compose
- PostgreSQL
- Redis (caching)
- Adminer (DB UI)

---

## 🔧 Development Commands

```bash
# Root level
npm install              # Install all dependencies
npm run docker:up        # Start infrastructure
npm run docker:down      # Stop infrastructure

# Backend
npm run dev:backend      # Start API server (watch mode)
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run seed             # Seed demo data

# Web
npm run dev:web          # Start React app
npm run build:web        # Production build

# Mobile
npm run dev:mobile       # Start Expo
npm run android          # Run on Android
npm run ios              # Run on iOS
```

---

## 📊 Demo Data

### Pre-loaded Entities

- **Countries**: 4 (ES, FR, IT, PL)
- **Users**: 20 (admins, operators, providers, technicians)
- **Providers**: 50 across 4 countries
- **Work Teams**: 100 teams
- **Service Orders**: 500 (various statuses)
- **Assignments**: 300 (with complete funnel data)
- **Executions**: 200 (completed jobs with ratings)

### Realistic Scenarios

All demo scenarios use realistic:
- French, Spanish, Italian, Polish names
- Actual postal codes and cities
- Believable service descriptions
- Historical timestamp progression

---

## 🎥 Demo Tips

### Before Demo

1. ✅ Run `npm run seed` to reset data
2. ✅ Clear browser cache
3. ✅ Test all demo flows
4. ✅ Prepare backup video recording
5. ✅ Check WiFi stability
6. ✅ Close unnecessary apps/tabs

### During Demo

1. 🎯 Focus on differentiators (assignment transparency!)
2. 🚀 Keep it fast-paced (18 min target)
3. 💬 Tell a story (customer journey)
4. 📊 Show metrics and impact
5. 🤝 Engage audience with questions

### After Demo

1. 📧 Send follow-up materials
2. 🎬 Share demo video
3. 📅 Schedule pilot discussion
4. 📋 Gather feedback

---

## ⚠️ Known Limitations

### Mockup Shortcuts

- **No real authentication**: Hardcoded JWT, no SSO
- **No real integrations**: External systems mocked
- **Limited error handling**: Happy path focus
- **No performance optimization**: Demo data only
- **Simplified offline sync**: Basic implementation
- **Mock notifications**: No real SMS/email
- **No multi-tenancy isolation**: Simplified filtering

### Not Implemented (Mockup)

- ❌ Advanced RBAC (basic roles only)
- ❌ Audit logging
- ❌ Complex buffer stacking
- ❌ Route optimization
- ❌ Advanced analytics
- ❌ Document generation
- ❌ E-signature integration
- ❌ Payment processing

**For complete feature list, see `/documentation/`**

---

## 🚨 Troubleshooting

### Docker won't start
```bash
# Check if ports are in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Kill existing processes or change ports in docker-compose.yml
```

### Database connection fails
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart Docker services
npm run docker:down && npm run docker:up
```

### Seed data fails
```bash
# Reset database
npm run db:migrate -- --force-reset
npm run seed
```

### Mobile app won't connect
```bash
# Ensure backend is running on same network
# Update API URL in mobile/.env to use IP address (not localhost)
```

---

## 📞 Support

### For Demo Issues
Contact: Sales Engineering Team

### For Technical Questions
See: `/documentation/` for production specifications

### For Product Information
See: `/ENGINEERING_KIT_SUMMARY.md`

---

## 🔄 Version

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-15 | Initial mockup setup (Yellow Grid rebrand) |

---

**Remember**: This is a DEMO. For production implementation, follow `/documentation/` specifications.

**Yellow Grid Mockup** - Showcasing the Future of Field Service 🌟
