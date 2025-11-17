# Yellow Grid - Quick Reference Card

**For Roadshow Demonstrations**

---

## 🚀 Quick Start Commands

```bash
# Terminal 1 - Backend
cd apps/backend
npm run start:dev

# Terminal 2 - Frontend
cd apps/web
npm run dev

# Access: http://localhost:5173
```

---

## ⭐ Top 10 Features to Demonstrate (Priority Order)

### 1. 🤖 AI Sales Potential Assessment
**Page**: Service Order Detail
**Demo**: Click "Assess Sales Potential" → Select HIGH (87%, €15k)
**Value**: Prioritize high-conversion Technical Visits
**Time**: 30 seconds

### 2. 🤖 AI Risk Assessment
**Page**: Service Order Detail
**Demo**: Click "Assess Risk" → Select CRITICAL (92%)
**Value**: Identify problematic jobs before they fail
**Time**: 30 seconds

### 3. 🚦 Go Execution Monitoring
**Page**: Service Order Detail
**Demo**: Show status breakdown (Payment/Delivery/Contract) → Block execution
**Value**: Prevent wasted technician trips
**Time**: 1 minute

### 4. 📅 Date Negotiation (Max 3 Rounds)
**Page**: Assignment Detail
**Demo**: Show timeline with 3 negotiation rounds
**Value**: Structured conflict resolution with audit trail
**Time**: 1 minute

### 5. ✅ Interactive Execution Checklists
**Page**: Execution Detail
**Demo**: Toggle checklist items → Show progress bar → Validation warnings
**Value**: Ensure quality and completeness of field work
**Time**: 1 minute

### 6. 📍 GPS Check-in/Check-out
**Page**: Execution Detail
**Demo**: Check in with GPS → Check out with hours → Show tracking
**Value**: Verify presence, track productivity
**Time**: 1 minute

### 7. 🏆 Provider Tier Management
**Page**: Provider Detail
**Demo**: Update tier from 2 → 1 → Show tier badges
**Value**: Quality-based provider classification
**Time**: 45 seconds

### 8. ⚠️ Provider Risk Management
**Page**: Provider Detail
**Demo**: Put on watch → Suspend → Lift suspension
**Value**: Systematic quality management
**Time**: 1 minute

### 9. 🎯 Assignment Transparency
**Page**: Assignment Detail
**Demo**: Show scoring breakdown (tier + certs + distance + rating)
**Value**: Fair and transparent provider selection
**Time**: 45 seconds

### 10. ⭐ Customer Feedback
**Page**: Execution Detail
**Demo**: 5-star rating → Comments → Show in provider profile
**Value**: Track quality, identify top performers
**Time**: 30 seconds

---

## 🎬 Recommended Demo Flows

### Quick Demo (5 minutes)
1. AI Assessments (Sales + Risk) - 1 min
2. Date Negotiation Timeline - 1 min
3. Interactive Checklist - 1 min
4. Provider Tier Management - 1 min
5. Q&A - 1 min

### Standard Demo (15 minutes)
Follow complete walkthrough in main README.md

### Technical Deep-Dive (30 minutes)
- Architecture overview - 5 min
- API walkthrough (Swagger) - 10 min
- Database schema (Prisma Studio) - 5 min
- Code walkthrough - 10 min

---

## 📊 Pre-Loaded Demo Data

### Service Orders (12 total)
```
SO-2024-TV-001  | Spain   | Technical Visit  | HIGH sales potential
SO-2024-IN-002  | France  | Installation     | Date negotiation (3 rounds)
SO-2024-IN-003  | Italy   | Installation     | Auto-accept
SO-2024-RE-004  | Poland  | Repair           | Blocked execution
```

### Providers (12 total)
```
SolarPro ES     | Spain   | Tier 1 | OK          | 4.8 rating
ElectricPlus FR | France  | Tier 1 | OK          | 4.7 rating
InstallPro IT   | Italy   | Tier 2 | ON_WATCH    | 4.2 rating
RepairCo PL     | Poland  | Tier 2 | SUSPENDED   | 3.5 rating
```

### Key Scenarios
- ✅ High sales potential (TV in Spain)
- ✅ Medium risk (Installation in France)
- ✅ Date negotiation (3 rounds in France)
- ✅ Auto-accept (Spain/Italy)
- ✅ Blocked execution (Poland)
- ✅ Suspended provider (Poland)
- ✅ Expired certification (Poland)

---

## 🔑 Key Differentiators to Emphasize

### vs. Traditional FSM Systems
1. **AI-Powered Insights** - Sales potential and risk assessment
2. **Execution Blocking** - Prevent jobs without prerequisites
3. **Date Negotiation** - Structured with max rounds
4. **Assignment Transparency** - Complete scoring visibility
5. **Provider Tier System** - Quality-based classification

### Business Value Statements
- 📈 **Increase sales conversion** by prioritizing high-potential Technical Visits
- 💰 **Reduce failed jobs 30%** with AI risk assessment and Go Exec blocking
- ⏱️ **Save 40% scheduling time** with structured date negotiation
- 🎯 **Improve provider acceptance 25%** with transparent scoring
- ⭐ **Boost quality 20%** with interactive checklists and tier management

---

## 🎨 UI Color Codes (for quick reference)

### Status Badges
- 🟢 **Green** - Success, OK, Active, Complete
- 🟡 **Yellow** - Warning, On Watch, Expiring Soon
- 🔴 **Red** - Error, Suspended, Expired, Blocked
- 🔵 **Blue** - Info, In Progress, Tier 2
- ⚪ **Gray** - Inactive, Tier 3, Neutral

### Feature Colors
- 🟣 **Purple** - Certifications
- 🟠 **Orange** - Audio notes
- 🟦 **Light Blue** - Provider actions
- 🟩 **Light Green** - Customer actions

---

## 🔧 Troubleshooting Quick Fixes

### Backend won't start
```bash
# Kill process on port 3001
lsof -i :3001
kill -9 <PID>

# Restart
cd apps/backend
npm run start:dev
```

### Frontend won't build
```bash
cd apps/web
rm -rf node_modules dist
npm install
npm run build
```

### No demo data
```bash
cd apps/backend
npx prisma db seed
```

### Database connection error
```bash
# Check .env file
cat apps/backend/.env

# Should have:
DATABASE_URL="postgresql://user:password@localhost:5432/yellow_grid_demo"
```

---

## 📱 Navigation Shortcuts

### Main Menu
- **Dashboard** - `/` - Statistics overview
- **Service Orders** - `/service-orders` - List with filters
- **Assignments** - `/assignments` - Assignment tracking
- **Executions** - `/executions` - Field operations
- **Providers** - `/providers` - Provider management
- **Tasks** - `/tasks` - Tasks & alerts
- **WCFs** - `/wcfs` - Work Closing Forms

### Detail Pages
- **Service Order** - `/service-orders/:id` - AI assessments, Go Exec
- **Assignment** - `/assignments/:id` - Date negotiation, transparency
- **Execution** - `/executions/:id` - Checklist, GPS, feedback
- **Provider** - `/providers/:id` - Tier, risk, certifications

---

## 📞 Support During Demo

### API Documentation
http://localhost:3001/api (Swagger UI)

### Database Viewer
```bash
cd apps/backend
npx prisma studio
# Opens browser to http://localhost:5555
```

### Check Logs
```bash
# Backend logs
cd apps/backend
npm run start:dev
# Watch console output

# Frontend logs
cd apps/web
npm run dev
# Watch console output
```

---

## 💡 Demo Tips

### Before Demo
- [ ] Test both backend and frontend start correctly
- [ ] Verify demo data loaded (check dashboard statistics)
- [ ] Prepare 2-3 backup scenarios in case of issues
- [ ] Have Swagger API docs open in background tab
- [ ] Clear browser cache/localStorage if strange behavior

### During Demo
- ✅ Start with high-impact features (AI assessments)
- ✅ Show business value, not just features
- ✅ Use color-coded UI to explain states
- ✅ Let audience ask questions between features
- ✅ Have this quick reference open on second monitor

### After Demo
- ✅ Share GitHub repository link
- ✅ Provide main documentation (demo/README.md)
- ✅ Offer follow-up technical deep-dive
- ✅ Collect feedback and questions

---

**Print this card** or keep it open during demonstrations for quick reference!
