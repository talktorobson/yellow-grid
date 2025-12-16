# External Provider Authentication System - Implementation Tracking

**Decision Date:** 2025-01-17
**Approach:** Option A - Unified Authentication with Multi-Tenant RBAC
**Status:** 🟡 In Progress
**Estimated Completion:** 2-3 weeks

---

## Executive Summary

Implementing a unified authentication system that supports both internal users (operators, admins) and external users (providers, technicians) within a single JWT-based architecture. This approach provides security isolation through user types and authentication methods while maintaining a single RBAC system.

### Key Design Decisions

1. **Single JWT System**: One token structure, multiple authentication methods
2. **User Type Separation**: `INTERNAL` vs `EXTERNAL_PROVIDER` vs `EXTERNAL_TECHNICIAN`
3. **Authentication Methods**:
   - Internal: PingID SSO (future)
   - Providers: Email/Password + Mobile MFA
   - Technicians: Biometric + Mobile-optimized
4. **Unified RBAC**: Single permission model with scope-based authorization
5. **Migration Path**: Can extract to separate system (Auth0) if needed at >5000 providers

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
│            Single JWT Validation (RS256)                     │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────▼────────┐              ┌──────────▼──────────┐
│ Internal Auth  │              │  Provider Auth      │
│ (Future: SSO)  │              │  (Email/Password)   │
│ For now: Local │              │  + Mobile MFA       │
└────────────────┘              └─────────────────────┘
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                ┌─────────▼──────────┐
                │   Auth Service     │
                │  (Orchestrator)    │
                └────────────────────┘
                          │
                ┌─────────▼──────────┐
                │   Unified RBAC     │
                │   Permission Check │
                └────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Schema & Data Model (Week 1)
**Status:** 🔴 Not Started

#### Tasks
- [x] ~~Analysis & Design~~ (Complete)
- [ ] Update Prisma schema with user types
- [ ] Add auth provider field
- [ ] Add provider/work team linkage
- [ ] Add external auth ID field (for future Auth0 migration)
- [ ] Create migration
- [ ] Update seed data

#### Schema Changes
```prisma
model User {
  // User type classification
  userType     UserType @default(INTERNAL) @map("user_type")

  // Auth provider tracking
  authProvider String   @default("local") @map("auth_provider") // sso, local, auth0
  externalAuthId String? @unique @map("external_auth_id")

  // Provider linkage (only for EXTERNAL users)
  providerId   String? @map("provider_id")
  provider     Provider? @relation(fields: [providerId], references: [id])

  workTeamId   String? @map("work_team_id")
  workTeam     WorkTeam? @relation(fields: [workTeamId], references: [id])
}

enum UserType {
  INTERNAL             // Operators, admins, managers
  EXTERNAL_PROVIDER    // Provider company users (managers)
  EXTERNAL_TECHNICIAN  // Field technicians
}
```

---

### Phase 2: Authentication Services (Week 1-2)
**Status:** 🔴 Not Started

#### Tasks
- [ ] Create base auth service interface
- [ ] Implement internal auth service (current local auth)
- [ ] Implement provider auth service
  - [ ] Registration flow
  - [ ] Login flow
  - [ ] Password requirements (mobile-friendly)
  - [ ] Mobile MFA support (SMS/TOTP)
- [ ] Implement technician auth service
  - [ ] Biometric token support
  - [ ] Offline token generation
- [ ] Add auth method router/orchestrator
- [ ] Implement token generation with user type

#### Service Structure
```
src/modules/auth/
├── services/
│   ├── auth-orchestrator.service.ts  ← NEW (routes to correct auth method)
│   ├── internal-auth.service.ts      ← Refactor from current auth.service.ts
│   ├── provider-auth.service.ts      ← NEW (provider registration/login)
│   └── technician-auth.service.ts    ← NEW (mobile-optimized auth)
├── strategies/
│   ├── jwt.strategy.ts               ← UPDATE (validate all user types)
│   ├── local.strategy.ts             ← EXISTS
│   └── biometric.strategy.ts         ← NEW (mobile biometric)
├── guards/
│   ├── jwt-auth.guard.ts             ← EXISTS
│   ├── roles.guard.ts                ← EXISTS
│   └── user-type.guard.ts            ← NEW (INTERNAL vs EXTERNAL)
└── decorators/
    ├── current-user.decorator.ts     ← EXISTS
    └── user-type.decorator.ts        ← NEW
```

---

### Phase 3: API Endpoints (Week 2)
**Status:** 🔴 Not Started

#### Tasks
- [ ] Create provider registration endpoint
- [ ] Create provider login endpoint
- [ ] Create technician login endpoint (mobile-optimized)
- [ ] Add user type to JWT payload
- [ ] Update token refresh to preserve user type
- [ ] Add provider-specific validation rules
- [ ] Implement rate limiting per user type

#### New Endpoints
```
POST /api/v1/auth/provider/register
POST /api/v1/auth/provider/login
POST /api/v1/auth/provider/verify-email
POST /api/v1/auth/provider/forgot-password
POST /api/v1/auth/provider/reset-password

POST /api/v1/auth/technician/login
POST /api/v1/auth/technician/biometric-setup
POST /api/v1/auth/technician/biometric-login
POST /api/v1/auth/technician/offline-token
```

---

### Phase 4: Authorization & Guards (Week 2)
**Status:** 🔴 Not Started

#### Tasks
- [ ] Create user type guard
- [ ] Update roles guard to check user type
- [ ] Add provider scope validation
- [ ] Implement tenant isolation for providers
- [ ] Add permission checks for cross-user-type operations
- [ ] Create decorator for user type restriction

#### Usage Examples
```typescript
// Only internal users can access
@UseGuards(JwtAuthGuard, UserTypeGuard)
@UserType('INTERNAL')
@Get('internal/dashboard')
async getDashboard() { }

// Only providers can access
@UseGuards(JwtAuthGuard, UserTypeGuard)
@UserType('EXTERNAL_PROVIDER')
@Get('provider/jobs')
async getProviderJobs() { }

// Both internal and providers can access (with different scopes)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'PROVIDER_MANAGER')
@Get('work-teams/:id')
async getWorkTeam() { }
```

---

### Phase 5: Mobile-Specific Features (Week 2-3)
**Status:** 🔴 Not Started

#### Tasks
- [ ] Implement biometric token generation
- [ ] Add offline token support (7-day validity)
- [ ] Implement token refresh with short-lived access tokens
- [ ] Add device fingerprinting
- [ ] Implement push notification for auth events
- [ ] Add suspicious login detection
- [ ] Implement session management per device

#### Mobile Auth Flow
```
1. Technician installs app
2. Register with email/phone + password
3. Verify email/phone (OTP)
4. Setup biometric (store local key)
5. Generate offline token (7-day validity)
6. Use biometric for daily login (generates session token)
7. Refresh token when online
```

---

### Phase 6: Testing (Week 3)
**Status:** 🔴 Not Started

#### Tasks
- [ ] Unit tests for all auth services
- [ ] Integration tests for auth flows
- [ ] E2E tests for provider registration
- [ ] E2E tests for technician mobile auth
- [ ] Security tests (SQL injection, XSS, token manipulation)
- [ ] Performance tests (auth load)
- [ ] Offline scenario tests

#### Test Coverage Targets
- Unit tests: >85%
- Integration tests: >80%
- E2E critical paths: 100%

---

### Phase 7: Documentation (Week 3)
**Status:** 🔴 Not Started

#### Tasks
- [ ] Update security architecture docs
- [ ] Document provider onboarding flow
- [ ] Create provider auth API documentation
- [ ] Update mobile app auth guide
- [ ] Create admin guide for user management
- [ ] Document migration path to Auth0
- [ ] Add troubleshooting guide

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **Stolen provider credentials** | MFA required, device fingerprinting, anomaly detection |
| **Token theft** | Short-lived access tokens (15min), refresh token rotation |
| **Brute force attacks** | Rate limiting, account lockout, CAPTCHA |
| **Session hijacking** | Device fingerprinting, IP monitoring, logout on suspicious activity |
| **Offline token compromise** | Biometric validation, device-bound tokens, remote revocation |
| **Provider impersonation** | Email/phone verification, KYC for high-value providers |

### Security Features

- [x] Password hashing (bcrypt)
- [ ] MFA support (SMS, TOTP)
- [ ] Rate limiting per user type
- [ ] Account lockout (5 failed attempts)
- [ ] Suspicious login detection
- [ ] Device fingerprinting
- [ ] Token rotation on refresh
- [ ] Token revocation API
- [ ] Audit logging for all auth events

---

## Data Privacy & Compliance

### GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Right to be forgotten** | Soft delete with anonymization |
| **Data portability** | Export user data API |
| **Consent management** | Track consent in user profile |
| **Data residency** | Country-specific data storage (already in schema) |
| **Access logging** | Audit trail for all data access |

### Provider Data Isolation

- Providers can only access their own data (tenant isolation)
- Operators can view provider data (with audit trail)
- Cross-provider data access is logged
- Provider deletion cascades to linked users

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Authentication metrics
auth.login.total { user_type, auth_method, status }
auth.registration.total { user_type, status }
auth.token_refresh.total { user_type, status }
auth.logout.total { user_type }

// Security metrics
auth.failed_login.total { user_type, reason }
auth.locked_account.total { user_type }
auth.suspicious_login.total { user_type, reason }
auth.token_revoked.total { user_type, reason }

// Performance metrics
auth.login.duration { user_type, p95, p99 }
auth.token_validation.duration { p95, p99 }
```

### Alerts

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Failed login spike | >100/min for single user_type | Warning |
| Token validation failures | >5% error rate | Critical |
| Auth service latency | p95 >500ms | Warning |
| Account lockouts | >50/hour | Warning |
| Suspicious logins detected | >10/hour | Critical |

---

## Migration Strategy (to Auth0 if needed)

### Triggers for Migration

1. Provider count >5,000
2. Auth-related security incidents >2/month
3. Compliance audit requirement
4. Provider auth load >100 req/sec sustained
5. Need for advanced features (social login, adaptive MFA)

### Migration Path

```
Phase 1: Preparation (2 weeks)
- Setup Auth0 tenant
- Configure social providers
- Map user types to Auth0 organizations
- Create migration scripts

Phase 2: Dual-Write (2 weeks)
- New providers → Auth0
- Existing providers → Local DB + Auth0 sync
- Validate sync accuracy

Phase 3: Dual-Read (2 weeks)
- Auth validates both systems
- Monitor error rates
- Fix edge cases

Phase 4: Full Migration (1 week)
- All auth → Auth0
- Deprecate local auth for providers
- Keep internal auth separate (PingID)

Phase 5: Cleanup (1 week)
- Remove local provider auth code
- Archive old tokens
- Update documentation
```

---

## Testing Strategy

### Test Scenarios

#### Provider Registration
- [ ] Happy path: email/password registration
- [ ] Email already exists
- [ ] Weak password rejection
- [ ] Email verification flow
- [ ] Provider linkage validation
- [ ] Country-specific validation

#### Provider Login
- [ ] Valid credentials
- [ ] Invalid credentials (wrong password)
- [ ] Non-existent email
- [ ] Locked account
- [ ] MFA required
- [ ] MFA verification
- [ ] Token generation with correct user type

#### Technician Mobile Auth
- [ ] Biometric setup
- [ ] Biometric login
- [ ] Offline token generation
- [ ] Offline token validation
- [ ] Token refresh when online
- [ ] Device change detection

#### Cross-User-Type Operations
- [ ] Operator viewing provider data
- [ ] Provider accessing own work teams
- [ ] Provider attempting to access other providers
- [ ] Technician accessing assigned jobs only
- [ ] Admin managing all user types

---

## Performance Targets

| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| Provider login | <300ms (p95) | TBD | 🔴 |
| Token validation | <50ms (p95) | TBD | 🔴 |
| Provider registration | <500ms (p95) | TBD | 🔴 |
| Token refresh | <200ms (p95) | TBD | 🔴 |
| Biometric login | <100ms (p95) | TBD | 🔴 |

---

## Dependencies & Risks

### Dependencies
- ✅ Prisma ORM
- ✅ NestJS + Passport
- ✅ JWT library (@nestjs/jwt)
- ⚠️ PingID SSO integration (future)
- ⚠️ SMS provider for MFA (Twilio/AWS SNS)
- ⚠️ Mobile app biometric SDK

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema migration issues | Medium | High | Test migrations thoroughly, backup before deploy |
| Performance degradation | Low | Medium | Load testing, caching, query optimization |
| Security vulnerabilities | Medium | Critical | Security review, penetration testing |
| Provider adoption resistance | Medium | Medium | Clear onboarding docs, support team training |
| Offline auth complexity | High | Medium | Thorough testing, fallback mechanisms |

---

## Success Criteria

### Technical Success
- [ ] All tests passing (>85% coverage)
- [ ] Auth latency <300ms (p95)
- [ ] Zero security vulnerabilities
- [ ] Migration rollback plan tested
- [ ] Documentation complete

### Business Success
- [ ] Providers can self-register within 5 minutes
- [ ] Technicians can login offline
- [ ] Support tickets related to auth <5% of total
- [ ] Zero auth-related security incidents
- [ ] Admin can manage users efficiently

---

## Open Questions

1. **MFA Provider**: Which service? (Twilio, AWS SNS, or custom?)
2. **Biometric SDK**: React Native library choice? (react-native-biometrics?)
3. **Offline Token Storage**: AsyncStorage vs Secure Storage?
4. **Provider Verification**: KYC process for high-value providers?
5. **Social Login**: Support Google/Apple sign-in for providers?

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-01-17 | Initial document created | Claude |
| TBD | Schema migration completed | - |
| TBD | Auth services implemented | - |
| TBD | Testing completed | - |
| TBD | Production deployment | - |

---

## Next Steps

1. **Immediate (This Sprint)**
   - Review and approve this implementation plan
   - Update Prisma schema
   - Create database migration
   - Implement base auth services

2. **Short-term (Next Sprint)**
   - Implement provider registration/login
   - Add user type guards
   - Create API endpoints
   - Write tests

3. **Medium-term (Month 2)**
   - Mobile biometric auth
   - MFA implementation
   - Security testing
   - Documentation

---

**Last Updated:** 2025-01-17
**Owner:** Platform Team
**Review Status:** Draft → Awaiting Approval
