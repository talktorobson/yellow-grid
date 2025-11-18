# Unified Authentication Architecture

**Version:** 2.0
**Last Updated:** 2025-01-17
**Status:** Active Design
**Related:** EXTERNAL_AUTH_IMPLEMENTATION.md

---

## Overview

The Yellow Grid Platform implements a **unified authentication architecture** that supports both internal users (operators, administrators) and external users (providers, technicians) within a single, cohesive system. This approach provides security isolation through user types and authentication methods while maintaining operational simplicity and a single permission model.

### Design Philosophy

1. **Single Token Standard**: All users authenticate via JWT, enabling unified API security
2. **Multi-Method Authentication**: Support different auth methods per user type
3. **Unified RBAC**: One permission system with scope-based authorization
4. **Security by Isolation**: User types enforce security boundaries
5. **Future-Proof**: Architecture supports migration to dedicated systems if needed

---

## Authentication Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │ Operator   │   │  Provider    │   │ Technician   │            │
│  │  Web App   │   │   Portal     │   │  Mobile App  │            │
│  │            │   │              │   │  (Offline)   │            │
│  └─────┬──────┘   └──────┬───────┘   └──────┬───────┘            │
│        │                  │                   │                    │
└────────┼──────────────────┼───────────────────┼────────────────────┘
         │                  │                   │
         ├──────────────────┴───────────────────┤
         │                                      │
┌────────▼──────────────────────────────────────▼────────────────────┐
│                        API GATEWAY                                  │
│                  (Kong / Traefik / NestJS)                         │
│                                                                     │
│  Validates JWT:                                                    │
│  - Signature (RS256)                                               │
│  - Expiration                                                      │
│  - Issuer                                                          │
│  - User Type                                                       │
│  - Tenant Context                                                  │
│                                                                     │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                  │
┌────────▼────────────┐                       ┌────────────▼──────────┐
│  INTERNAL AUTH      │                       │  EXTERNAL AUTH        │
│                     │                       │                       │
│  Future: PingID SSO │                       │  Email/Password       │
│  Current: Local     │                       │  + Mobile MFA         │
│                     │                       │  + Biometric          │
│  User Types:        │                       │                       │
│  - INTERNAL         │                       │  User Types:          │
│                     │                       │  - EXTERNAL_PROVIDER  │
│  Roles:             │                       │  - EXTERNAL_TECHNICIAN│
│  - ADMIN            │                       │                       │
│  - OPERATOR         │                       │  Roles:               │
│  - MANAGER          │                       │  - PROVIDER_MANAGER   │
│                     │                       │  - TECHNICIAN         │
└─────────────────────┘                       └───────────────────────┘
         │                                                  │
         └──────────────────┬───────────────────────────────┘
                            │
                   ┌────────▼─────────┐
                   │  Auth Service    │
                   │  (Orchestrator)  │
                   │                  │
                   │  Generates JWT:  │
                   │  - Access Token  │
                   │  - Refresh Token │
                   │  - User Context  │
                   └────────┬─────────┘
                            │
                   ┌────────▼─────────┐
                   │  User Database   │
                   │  (PostgreSQL)    │
                   │                  │
                   │  - Users         │
                   │  - Roles         │
                   │  - Permissions   │
                   │  - Refresh Tokens│
                   └──────────────────┘
```

---

## User Types & Classification

### User Type Taxonomy

```typescript
enum UserType {
  INTERNAL             = 'INTERNAL',
  EXTERNAL_PROVIDER    = 'EXTERNAL_PROVIDER',
  EXTERNAL_TECHNICIAN  = 'EXTERNAL_TECHNICIAN'
}
```

### User Type Characteristics

| User Type | Description | Authentication Method | Primary Interface | Tenant Scope |
|-----------|-------------|----------------------|-------------------|--------------|
| **INTERNAL** | Employees, operators, administrators | Local (future: PingID SSO) | Web application | All tenants (based on role) |
| **EXTERNAL_PROVIDER** | Provider company managers/admins | Email/Password + MFA | Provider portal (web) | Single provider |
| **EXTERNAL_TECHNICIAN** | Field service technicians | Biometric + Offline tokens | Mobile app | Single work team |

---

## JWT Token Structure

### Standard JWT Payload

All users receive a JWT with this structure:

```typescript
interface TokenPayload {
  // Standard JWT claims
  iss: string;                    // Issuer: "https://api.yellow-grid.com"
  sub: string;                    // Subject: User ID
  aud: string;                    // Audience: "https://api.yellow-grid.com"
  exp: number;                    // Expiration timestamp
  iat: number;                    // Issued at timestamp
  jti: string;                    // JWT ID (for revocation)

  // Custom claims
  type: 'access' | 'refresh';     // Token type
  userType: UserType;             // User classification
  email: string;                  // User email

  // Multi-tenancy
  tenant: {
    countryCode: string;          // ES, FR, IT, PL
    businessUnit: string;         // LM_ES, BD_FR, etc.
    providerId?: string;          // Only for EXTERNAL users
    workTeamId?: string;          // Only for EXTERNAL_TECHNICIAN
  };

  // Authorization
  roles: string[];                // RBAC roles
  permissions: string[];          // Computed permissions (optional, for perf)

  // Auth method tracking
  authMethod: AuthMethod;         // How user authenticated
  deviceId?: string;              // Device fingerprint (mobile)
}

enum AuthMethod {
  LOCAL = 'local',                // Email/password
  SSO = 'sso',                    // PingID (future)
  BIOMETRIC = 'biometric',        // Mobile biometric
  OFFLINE = 'offline'             // Offline token
}
```

### Example Tokens

**Internal Operator:**
```json
{
  "iss": "https://api.yellow-grid.com",
  "sub": "user_abc123",
  "aud": "https://api.yellow-grid.com",
  "exp": 1705518000,
  "iat": 1705517100,
  "jti": "jwt_xyz789",
  "type": "access",
  "userType": "INTERNAL",
  "email": "operator@leroymerlin.es",
  "tenant": {
    "countryCode": "ES",
    "businessUnit": "LM_ES"
  },
  "roles": ["OPERATOR", "DISPATCHER"],
  "authMethod": "local"
}
```

**External Provider:**
```json
{
  "iss": "https://api.yellow-grid.com",
  "sub": "user_def456",
  "aud": "https://api.yellow-grid.com",
  "exp": 1705518000,
  "iat": 1705517100,
  "jti": "jwt_abc123",
  "type": "access",
  "userType": "EXTERNAL_PROVIDER",
  "email": "manager@provider.com",
  "tenant": {
    "countryCode": "ES",
    "businessUnit": "LM_ES",
    "providerId": "prov_xyz123"
  },
  "roles": ["PROVIDER_MANAGER"],
  "authMethod": "local"
}
```

**External Technician (Mobile):**
```json
{
  "iss": "https://api.yellow-grid.com",
  "sub": "user_ghi789",
  "aud": "https://api.yellow-grid.com",
  "exp": 1705518000,
  "iat": 1705517100,
  "jti": "jwt_def456",
  "type": "access",
  "userType": "EXTERNAL_TECHNICIAN",
  "email": "tech@provider.com",
  "tenant": {
    "countryCode": "ES",
    "businessUnit": "LM_ES",
    "providerId": "prov_xyz123",
    "workTeamId": "team_abc789"
  },
  "roles": ["TECHNICIAN"],
  "authMethod": "biometric",
  "deviceId": "device_12345"
}
```

---

## Authentication Flows

### Flow 1: Internal User Login (Current)

```
┌─────────┐                  ┌─────────┐                  ┌──────────┐
│ Operator│                  │   API   │                  │ Database │
└────┬────┘                  └────┬────┘                  └────┬─────┘
     │                            │                             │
     │ POST /auth/internal/login  │                             │
     │ {email, password}          │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │ Query user by email         │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │ User record                 │
     │                            │<────────────────────────────┤
     │                            │                             │
     │                            │ Verify password (bcrypt)    │
     │                            │                             │
     │                            │ Generate JWT (userType: INTERNAL)
     │                            │                             │
     │                            │ Store refresh token         │
     │                            ├────────────────────────────>│
     │                            │                             │
     │ {accessToken, refreshToken}│                             │
     │<───────────────────────────┤                             │
     │                            │                             │
```

### Flow 2: Provider Registration

```
┌─────────┐                  ┌─────────┐                  ┌──────────┐
│ Provider│                  │   API   │                  │ Database │
└────┬────┘                  └────┬────┘                  └────┬─────┘
     │                            │                             │
     │ POST /auth/provider/register                            │
     │ {email, password, providerId}                           │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │ Validate providerId exists  │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │ Provider record             │
     │                            │<────────────────────────────┤
     │                            │                             │
     │                            │ Check email uniqueness      │
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │ Hash password (bcrypt)      │
     │                            │                             │
     │                            │ Create user (userType: EXTERNAL_PROVIDER)
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │ Generate email verification token
     │                            │                             │
     │                            │ Send verification email     │
     │                            │                             │
     │ {userId, message}          │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
```

### Flow 3: Provider Login

```
┌─────────┐                  ┌─────────┐                  ┌──────────┐
│ Provider│                  │   API   │                  │ Database │
└────┬────┘                  └────┬────┘                  └────┬─────┘
     │                            │                             │
     │ POST /auth/provider/login  │                             │
     │ {email, password}          │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │ Query user (userType: EXTERNAL_PROVIDER)
     │                            ├────────────────────────────>│
     │                            │                             │
     │                            │ User + Provider data        │
     │                            │<────────────────────────────┤
     │                            │                             │
     │                            │ Verify password             │
     │                            │                             │
     │                            │ Check MFA requirement       │
     │                            │                             │
     │ {mfaRequired: true}        │                             │
     │<───────────────────────────┤                             │
     │                            │                             │
     │ POST /auth/provider/mfa-verify                          │
     │ {code}                     │                             │
     ├───────────────────────────>│                             │
     │                            │                             │
     │                            │ Verify MFA code             │
     │                            │                             │
     │                            │ Generate JWT (userType: EXTERNAL_PROVIDER)
     │                            │                             │
     │ {accessToken, refreshToken}│                             │
     │<───────────────────────────┤                             │
```

### Flow 4: Technician Mobile Login (Biometric)

```
┌───────────┐              ┌─────────┐              ┌──────────┐
│Technician │              │   API   │              │ Database │
│  Mobile   │              │         │              │          │
└─────┬─────┘              └────┬────┘              └────┬─────┘
      │                         │                        │
      │ Initial setup:          │                        │
      │ POST /auth/technician/register                   │
      │ {email, password, workTeamId}                    │
      ├────────────────────────>│                        │
      │                         │ Create user (EXTERNAL_TECHNICIAN)
      │                         ├───────────────────────>│
      │                         │                        │
      │ {accessToken}           │                        │
      │<────────────────────────┤                        │
      │                         │                        │
      │ POST /auth/technician/biometric-setup           │
      │ {publicKey}             │                        │
      ├────────────────────────>│                        │
      │                         │                        │
      │                         │ Store device public key│
      │                         ├───────────────────────>│
      │                         │                        │
      │ {setupComplete}         │                        │
      │<────────────────────────┤                        │
      │                         │                        │
      │ Daily login:            │                        │
      │ [Biometric scan locally]│                        │
      │ Sign challenge with private key                 │
      │                         │                        │
      │ POST /auth/technician/biometric-login           │
      │ {deviceId, signature}   │                        │
      ├────────────────────────>│                        │
      │                         │                        │
      │                         │ Verify signature       │
      │                         │ with stored public key │
      │                         ├───────────────────────>│
      │                         │                        │
      │                         │ Generate JWT (authMethod: biometric)
      │                         │                        │
      │ {accessToken}           │                        │
      │<────────────────────────┤                        │
      │                         │                        │
      │ Offline mode:           │                        │
      │ Use cached offline token (7-day validity)       │
```

---

## Authorization Model

### Role Hierarchy

```
INTERNAL Roles:
├── SUPER_ADMIN (platform-wide)
├── ADMIN (tenant-level)
├── MANAGER (team-level)
├── OPERATOR (standard)
└── DISPATCHER (assignment management)

EXTERNAL_PROVIDER Roles:
├── PROVIDER_ADMIN (provider company admin)
└── PROVIDER_MANAGER (team manager)

EXTERNAL_TECHNICIAN Roles:
└── TECHNICIAN (field worker)
```

### Permission Matrix

| Resource | INTERNAL (Operator) | INTERNAL (Admin) | EXTERNAL_PROVIDER | EXTERNAL_TECHNICIAN |
|----------|---------------------|------------------|-------------------|---------------------|
| **Service Orders** | Read all, Create | Full CRUD | Read own | Read assigned only |
| **Providers** | Read all | Full CRUD | Read own | None |
| **Work Teams** | Read all | Full CRUD | Full CRUD (own) | Read own team |
| **Technicians** | Read all | Full CRUD | Full CRUD (own) | Read self |
| **Assignments** | Full CRUD | Full CRUD | Read own | Accept/Complete assigned |
| **Schedules** | Read all | Full CRUD | Manage own | Update availability |
| **Inventory** | Read all | Full CRUD | Manage own | Consume assigned |
| **Documents** | Read all | Full CRUD | Upload own | Upload evidence |
| **Analytics** | View all | View all | View own | View personal |

### Scope-Based Authorization

```typescript
// Permission format: resource:action:scope
type Permission = `${Resource}:${Action}:${Scope}`;

// Examples:
'service_orders:read:all'      // Internal operators
'service_orders:read:own'      // Providers (own = provider's SOs)
'service_orders:read:assigned' // Technicians

'assignments:create:all'       // Internal dispatchers
'assignments:accept:assigned'  // Technicians

'providers:update:own'         // Provider managers
'providers:update:all'         // Internal admins
```

---

## Security Features

### Token Security

#### Access Token
- **Lifetime:** 15 minutes
- **Algorithm:** RS256 (asymmetric)
- **Validation:** Signature + expiration + issuer + user type
- **Revocation:** Via token blacklist (Redis)

#### Refresh Token
- **Lifetime:** 7 days (30 days for internal, 7 days for external)
- **Storage:** Database with user_id + device_id
- **Rotation:** New refresh token issued on every refresh
- **Revocation:** Explicit revoke + cascade on user deactivation

#### Offline Token (Technicians)
- **Lifetime:** 7 days
- **Storage:** Encrypted local storage on device
- **Validation:** Device fingerprint + biometric
- **Sync:** Refreshed when device comes online

### Multi-Factor Authentication (MFA)

| User Type | MFA Method | Required For | Frequency |
|-----------|------------|--------------|-----------|
| INTERNAL | TOTP (Google Authenticator) | Admins, Managers | Every login |
| EXTERNAL_PROVIDER | SMS or TOTP | All providers | Every login |
| EXTERNAL_TECHNICIAN | Biometric | All technicians | Daily |

### Rate Limiting

| Endpoint | INTERNAL | EXTERNAL_PROVIDER | EXTERNAL_TECHNICIAN |
|----------|----------|-------------------|---------------------|
| Login | 10/min | 5/min | 10/min (per device) |
| Token Refresh | 100/hour | 50/hour | 200/hour |
| API Calls | 1000/min | 500/min | 200/min |

### Account Lockout

- **Failed Attempts:** 5 consecutive failures
- **Lockout Duration:** 15 minutes
- **Notification:** Email + Admin alert
- **Unlock:** Auto after duration OR admin manual unlock

### Device Management (Technicians)

```typescript
interface RegisteredDevice {
  deviceId: string;              // Unique device fingerprint
  userId: string;                // Technician user ID
  publicKey: string;             // For biometric challenge
  platform: 'ios' | 'android';   // Device platform
  deviceName: string;            // "iPhone 14 Pro"
  lastLogin: Date;               // Last successful login
  isActive: boolean;             // Can be deactivated remotely
  registeredAt: Date;            // Registration timestamp
}
```

- Max 3 devices per technician
- Remote device revocation by provider admin
- Auto-deactivate devices inactive >30 days

---

## Data Model

### User Table Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String?  // Nullable for SSO-only users

  // Multi-tenancy
  countryCode  String @map("country_code") @db.VarChar(3)
  businessUnit String @map("business_unit") @db.VarChar(50)

  // User classification
  userType     UserType @default(INTERNAL) @map("user_type")
  authProvider String   @default("local") @map("auth_provider") // local, sso, auth0
  externalAuthId String? @unique @map("external_auth_id") // For future Auth0 migration

  // Provider linkage (only for EXTERNAL users)
  providerId   String? @map("provider_id")
  provider     Provider? @relation(fields: [providerId], references: [id])

  workTeamId   String? @map("work_team_id")
  workTeam     WorkTeam? @relation(fields: [workTeamId], references: [id])

  // Profile
  firstName String @map("first_name")
  lastName  String @map("last_name")
  phone     String?

  // Status
  isActive   Boolean @default(true) @map("is_active")
  isVerified Boolean @default(false) @map("is_verified")

  // MFA
  mfaEnabled Boolean @default(false) @map("mfa_enabled")
  mfaSecret  String? @map("mfa_secret") // Encrypted TOTP secret

  // Roles & Permissions
  roles         UserRole[]
  refreshTokens RefreshToken[]
  devices       RegisteredDevice[]

  // Audit
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")

  @@index([email])
  @@index([userType])
  @@index([countryCode, businessUnit])
  @@index([providerId])
  @@index([workTeamId])
  @@map("users")
}

enum UserType {
  INTERNAL
  EXTERNAL_PROVIDER
  EXTERNAL_TECHNICIAN
}
```

### Registered Device Table

```prisma
model RegisteredDevice {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  deviceId   String   @unique @map("device_id")
  publicKey  String   @map("public_key")
  platform   String   // ios, android
  deviceName String   @map("device_name")

  isActive   Boolean  @default(true) @map("is_active")

  lastLoginAt DateTime? @map("last_login_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceId])
  @@map("registered_devices")
}
```

---

## API Endpoints

### Internal Authentication

```
POST   /api/v1/auth/internal/login
POST   /api/v1/auth/internal/logout
POST   /api/v1/auth/internal/refresh
POST   /api/v1/auth/internal/forgot-password
POST   /api/v1/auth/internal/reset-password
GET    /api/v1/auth/me
```

### Provider Authentication

```
POST   /api/v1/auth/provider/register
POST   /api/v1/auth/provider/verify-email
POST   /api/v1/auth/provider/login
POST   /api/v1/auth/provider/mfa-setup
POST   /api/v1/auth/provider/mfa-verify
POST   /api/v1/auth/provider/logout
POST   /api/v1/auth/provider/refresh
POST   /api/v1/auth/provider/forgot-password
POST   /api/v1/auth/provider/reset-password
```

### Technician Authentication

```
POST   /api/v1/auth/technician/register
POST   /api/v1/auth/technician/login
POST   /api/v1/auth/technician/biometric-setup
POST   /api/v1/auth/technician/biometric-login
POST   /api/v1/auth/technician/offline-token
POST   /api/v1/auth/technician/refresh
GET    /api/v1/auth/technician/devices
DELETE /api/v1/auth/technician/devices/:deviceId
```

---

## Monitoring & Observability

### Key Metrics

```typescript
// Authentication attempts
auth_login_attempts_total{user_type, auth_method, status}
auth_login_duration_seconds{user_type, auth_method, quantile}

// Token operations
auth_token_issued_total{user_type, token_type}
auth_token_refresh_total{user_type, status}
auth_token_revoked_total{user_type, reason}

// Security events
auth_failed_login_total{user_type, reason}
auth_account_locked_total{user_type}
auth_mfa_failed_total{user_type}
auth_suspicious_activity_total{user_type, activity_type}

// Device management
auth_device_registered_total{platform}
auth_device_revoked_total{platform, reason}
```

### Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High failed login rate | >50 failures/min for user_type | Warning | Investigate potential attack |
| Token validation errors | >5% error rate | Critical | Check JWT signing keys |
| Account lockouts spike | >20 lockouts/hour | Warning | Review lockout policy |
| MFA bypass attempts | Any occurrence | Critical | Security team notification |
| Offline token expiry | >100 expired/day | Warning | Check device connectivity |

---

## Future Enhancements

### Phase 1 (3-6 months)
- [ ] PingID SSO integration for internal users
- [ ] Social login for providers (Google, Apple)
- [ ] Advanced device fingerprinting
- [ ] Anomaly detection (impossible travel, unusual access patterns)

### Phase 2 (6-12 months)
- [ ] Passwordless authentication (WebAuthn)
- [ ] Risk-based authentication (adjust MFA based on risk score)
- [ ] Session recording for compliance
- [ ] Federated identity management

### Phase 3 (12+ months)
- [ ] Migrate to Auth0 if >5000 providers
- [ ] Zero-trust architecture
- [ ] Advanced fraud detection
- [ ] Decentralized identity (DID)

---

## Migration Path to Separate System

If future requirements dictate (>5000 providers, compliance, or advanced features), migration to Auth0 or similar:

### Step 1: Preparation
- Setup Auth0 tenant with organizations
- Configure social providers and enterprise connections
- Create user migration scripts

### Step 2: Dual Write
- New provider registrations → Auth0
- Existing providers → sync to Auth0
- Maintain local DB as source of truth

### Step 3: Dual Read
- Auth validates both local JWT and Auth0 JWT
- Gradual traffic shift to Auth0
- Monitor error rates

### Step 4: Complete Migration
- All provider auth → Auth0
- Internal users remain on local/PingID
- Deprecate local provider auth

### Step 5: Cleanup
- Remove provider auth code
- Archive old tokens
- Update documentation

**Estimated Migration Time:** 6-8 weeks

---

## Compliance & Privacy

### GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| Right to Access | User data export API |
| Right to Erasure | Soft delete + anonymization |
| Right to Portability | JSON export of user data |
| Data Minimization | Only collect necessary auth data |
| Consent Management | Explicit consent for MFA, biometric |
| Data Breach Notification | Auto-alert on suspicious activity |

### Data Retention

| Data Type | Retention Period | After Retention |
|-----------|------------------|-----------------|
| Active user account | Indefinite | N/A |
| Inactive user account | 2 years | Soft delete |
| Deleted user account | 30 days | Hard delete |
| Refresh tokens | 30 days | Auto-expire |
| Auth logs | 90 days | Archive to GCS |
| Security events | 1 year | Archive to GCS |

---

## References

- [EXTERNAL_AUTH_IMPLEMENTATION.md](../../EXTERNAL_AUTH_IMPLEMENTATION.md) - Implementation tracking
- [RBAC Model](./02-rbac-model.md) - Role-based access control
- [API Authentication](../api/02-authentication-authorization.md) - API auth specification
- [Mobile API](../api/06-execution-mobile-api.md) - Mobile authentication flows

---

**Document Control**
- **Version:** 2.0
- **Last Updated:** 2025-01-17
- **Owner:** Security & Platform Team
- **Review Cycle:** Quarterly
- **Next Review:** 2025-04-17
