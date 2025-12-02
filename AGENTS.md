# Repository Guidelines

## Orientation

- **Backend**: `src/` (NestJS + Prisma + PostgreSQL + Redis). 276 files, 53,539 lines. Phases 1-5 complete. Production-ready.
- **Mobile App**: `mobile-app/` (React Native + Expo). Phase 3 deliverable. ~50% complete.
- **Web App**: `web/` (React + Vite). 161 files, 5,969 lines. Phase 5 complete. Multi-experience platform deployed.
- **Documentation**: `product-docs/` holds v2.0 production-ready specs. `docs/IMPLEMENTATION_TRACKING.md` is the authoritative progress tracker.
- **Legacy/Reference**: `roadshow-mockup/` is archived. `business-requirements/` are read-only source materials.
- **Live Demo**: https://135.181.96.93

## Remote Server (VPS) - Quick Reference

### Connection Details
- **IP**: `135.181.96.93`
- **SSH**: `ssh -i deploy/vps_key root@135.181.96.93`
- **HTTPS**: Self-signed certificate - use `curl -sk` (skip certificate verification)
- **Deployment Directory**: `/root/yellow-grid` (NOT `/root/yellow-grid-demo`)

### API Access (curl examples)
```bash
# Health check
curl -sk "https://135.181.96.93/api/v1/health"

# Login (get token)
curl -sk "https://135.181.96.93/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"operator.fr@adeo.com","password":"Admin123!"}'

# Authenticated request (use token from login)
TOKEN=$(curl -sk "https://135.181.96.93/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"operator.fr@adeo.com","password":"Admin123!"}' | jq -r '.data.accessToken')
curl -sk "https://135.181.96.93/api/v1/service-orders?take=5" \
  -H "Authorization: Bearer $TOKEN"
```

### Docker Commands (run via SSH)
```bash
# View containers
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose ps"

# View API logs
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose logs api --tail 50"

# Restart API
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose restart api"

# Rebuild and restart (after code changes)
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose build api --no-cache && docker compose up -d api"

# Run database query
ssh -i deploy/vps_key root@135.181.96.93 'cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid -c "SELECT COUNT(*) FROM service_orders;"'
```

### Database Access
```bash
# Interactive psql
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose exec postgres psql -U postgres -d yellow_grid"

# Run SQL file
ssh -i deploy/vps_key root@135.181.96.93 'cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid < /path/to/script.sql'

# Run inline SQL (use heredoc for complex queries)
ssh -i deploy/vps_key root@135.181.96.93 'cd /root/yellow-grid/deploy && docker compose exec -T postgres psql -U postgres -d yellow_grid << "EOSQL"
SELECT id, state, urgency FROM service_orders LIMIT 5;
EOSQL'
```

### Demo Credentials
| Email | Password | Role |
|-------|----------|------|
| `operator.fr@adeo.com` | `Admin123!` | OPERATOR |
| `admin.fr@adeo.com` | `Admin123!` | ADMIN |
| `psm.fr@adeo.com` | `Admin123!` | PSM |
| `seller.fr@adeo.com` | `Admin123!` | SELLER |

### Deployment
```bash
# Full deploy from local machine
./deploy/deploy-remote.sh

# Deploy with demo data reseed
./deploy/deploy-remote.sh --seed-demo

# Skip build (code only)
./deploy/deploy-remote.sh --skip-build
```

### Container Names
- `yellow-grid-demo-api` - NestJS backend
- `yellow-grid-demo-frontend` - Caddy + React SPA
- `yellow-grid-demo-postgres` - PostgreSQL 15
- `yellow-grid-demo-redis` - Redis 7

## Build, Run, and Test

### Backend (`src/`)

- **Setup**: `npm ci`, `docker-compose up -d`, `npm run prisma:migrate`, `npm run prisma:generate`.
- **Run**: `npm run start:dev`.
- **Test**:
  - Unit: `npm test -- --runInBand`.
  - E2E: `npm run test:e2e` (requires DB setup, see `test/README.md`).
  - Coverage: `npm run test:cov`.
- **Deploy**: `./deploy/deploy-remote.sh` (deploys to VPS at 135.181.96.93).
- **Seed**: Compile with `npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --resolveJsonModule --skipLibCheck --module commonjs --target ES2020`, then run on server.

### Mobile App (`mobile-app/`)

- **Setup**: `cd mobile-app && npm install`.
- **Run**: `npx expo start`.
- **Test**: Jest setup pending.

### Web App (`web/`)

- **Setup**: `cd web && npm install`.
- **Run**: `npm run dev`.
- **Test**: `npm run test` (Vitest).
- **E2E**: `node e2e-tests.cjs` and `node e2e-navigation-tests.cjs` (126 tests total).

## Data Model (Key Entities)

### Provider Hierarchy (AHS Business Rules - Nov 2025)
- **Provider**: Main entity with P1/P2 types, risk levels, working schedules
- **ProviderWorkingSchedule**: 1:1 with Provider - working days, shifts (morning/afternoon/evening), lunch breaks, capacity limits
- **InterventionZone**: Geographic coverage (PRIMARY/SECONDARY/OVERFLOW) with postal codes, GeoJSON boundaries
- **ServicePriorityConfig**: Provider service preferences (P1=Always Accept, P2=Bundle Only, OPT_OUT)
- **WorkTeam**: Teams under providers with zone assignments and calendar inheritance
- **WorkTeamCalendar**: Team-level calendar overrides with planned absences and dedicated working days
- **TechnicianCertification**: Certification tracking with expiry dates

### Service Orders
- **ServiceOrder**: Core entity with `urgency` field (URGENT, STANDARD, LOW) for response time requirements
- **Note on P1/P2**: P1/P2 terminology ONLY applies to provider service preferences (ServicePriorityConfig), NOT to service order urgency. Service orders use explicit urgency levels.

### Demo Data (Seeded - Dec 2025)
- **French Customers**: Marie Dupont, Jean-Pierre Martin, Sophie Bernard, Pierre Durand, Isabelle Moreau, François Leroy, Nathalie Petit, Laurent Roux
- **French Providers**: Services Pro Paris, TechniService Marseille, InstallPlus Lyon, ProHabitat Bordeaux
- **French Cities**: Paris, Lyon, Bordeaux, Marseille, Nice, Toulouse, Nantes
- **Multi-Country**: ES, IT, PT with localized customer names
- **Demo Credentials**: operator@adeo.com / Operator123!, admin-fr@adeo.com / Admin123!

### Key Enums
- `ProviderTypeEnum`: P1, P2 (provider hierarchy type)
- `ServicePriorityType`: P1, P2, OPT_OUT (provider service preferences per specialty)
- `ServiceUrgency`: URGENT, STANDARD, LOW (service order response time requirements)
- `RiskLevel`: NONE, LOW, MEDIUM, HIGH, CRITICAL
- `ZoneType`: PRIMARY, SECONDARY, OVERFLOW
- `WorkTeamStatus`: ACTIVE, INACTIVE, ON_VACATION, SUSPENDED

## Coding Style & Conventions

- **Backend**: Strict TypeScript, NestJS patterns (`*.module.ts`, `*.service.ts`), DTOs with `class-validator`.
  - **API Responses**: All endpoints return `{ data: T, meta: any }`. Frontend services unwrap this.
  - **Auth**: `GET /auth/me` for current user info.
- **Mobile**: React Native with Expo. Functional components, hooks, strong typing.
- **Web**: React with Vite. Functional components, hooks.
- **General**: 2-space formatting, Prettier/ESLint.

## Testing Expectations

- **Backend**: Aim for ≥80% coverage. Unit specs alongside code (`*.spec.ts`). E2E suites in `test/`.
- **Frontend**: Component testing (React Testing Library) and logic testing.

## Documentation

- **Specs are authoritative**: Align code with `product-docs/`.
- **Track Progress**: Update `docs/IMPLEMENTATION_TRACKING.md` when completing tasks.
- **Key Files**:
  - `prisma/schema.prisma` - Database schema (~3,200 lines, 65+ models)
  - `product-docs/domain/02-provider-capacity-domain.md` - Provider domain spec
  - `docs/IMPLEMENTATION_TRACKING.md` - Progress tracker
