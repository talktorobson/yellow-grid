# Authentication & Authorization

## Overview

The FSM Platform API uses **JWT (JSON Web Tokens)** for authentication and **Role-Based Access Control (RBAC)** with scopes for authorization. This document provides complete specifications for authentication flows, token management, and authorization mechanisms.

## Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [JWT Token Structure](#jwt-token-structure)
3. [Authentication Flows](#authentication-flows)
4. [Token Refresh](#token-refresh)
5. [Role-Based Access Control](#role-based-access-control)
6. [Scopes & Permissions](#scopes--permissions)
7. [Security Best Practices](#security-best-practices)
8. [OpenAPI Specification](#openapi-specification)

---

## Authentication Overview

### Authentication Methods

The API supports the following authentication methods:

1. **JWT Bearer Token** (Primary)
2. **API Keys** (Service-to-service)
3. **OAuth 2.0** (Third-party integrations)

### Bearer Token Authentication

All API requests require a JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Token Lifecycle

| Token Type | Lifetime | Renewable | Revocable |
|------------|----------|-----------|-----------|
| Access Token | 15 minutes | No | Yes |
| Refresh Token | 30 days | Yes | Yes |
| API Key | No expiry | N/A | Yes |

---

## JWT Token Structure

### Access Token Claims

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2025-11-14"
  },
  "payload": {
    "iss": "https://api.fsm-platform.com",
    "sub": "user_123e4567-e89b-12d3-a456-426614174000",
    "aud": "https://api.fsm-platform.com",
    "exp": 1699876543,
    "iat": 1699875643,
    "nbf": 1699875643,
    "jti": "jwt_123e4567-e89b-12d3-a456-426614174000",
    "type": "access",
    "scope": "providers:read providers:write assignments:read",
    "roles": ["dispatcher", "admin"],
    "tenant": "tenant_acme-corp",
    "email": "dispatcher@acme.com",
    "name": "Jane Dispatcher"
  }
}
```

### Claim Definitions

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| iss | string | Yes | Token issuer (API base URL) |
| sub | string | Yes | Subject (user ID) |
| aud | string | Yes | Intended audience (API base URL) |
| exp | number | Yes | Expiration time (Unix timestamp) |
| iat | number | Yes | Issued at time (Unix timestamp) |
| nbf | number | Yes | Not before time (Unix timestamp) |
| jti | string | Yes | Unique token identifier (for revocation) |
| type | string | Yes | Token type: "access" or "refresh" |
| scope | string | Yes | Space-separated permission scopes |
| roles | array | Yes | User roles for RBAC |
| tenant | string | Yes | Multi-tenant identifier |
| email | string | No | User email address |
| name | string | No | User display name |

### Refresh Token Claims

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2025-11-14"
  },
  "payload": {
    "iss": "https://api.fsm-platform.com",
    "sub": "user_123e4567-e89b-12d3-a456-426614174000",
    "aud": "https://api.fsm-platform.com",
    "exp": 1702468543,
    "iat": 1699875643,
    "jti": "jwt_refresh_123e4567-e89b-12d3-a456-426614174000",
    "type": "refresh",
    "tenant": "tenant_acme-corp"
  }
}
```

### Token Signing

- **Algorithm**: RS256 (RSA Signature with SHA-256)
- **Key Rotation**: Keys rotated every 90 days
- **Key ID (kid)**: Included in header for key identification
- **Public Keys**: Available at `/.well-known/jwks.json`

---

## Authentication Flows

### 1. Username/Password Login

**Endpoint**: `POST /v1/auth/login`

#### Request

```bash
curl -X POST "https://api.fsm-platform.com/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dispatcher@acme.com",
    "password": "SecureP@ssw0rd!",
    "tenant": "acme-corp"
  }'
```

#### Request Schema

```json
{
  "email": "string (format: email, required)",
  "password": "string (minLength: 8, required)",
  "tenant": "string (optional, for multi-tenant setups)",
  "mfaCode": "string (optional, 6-digit code if MFA enabled)"
}
```

#### Success Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "scope": "providers:read providers:write assignments:read",
  "user": {
    "id": "user_123e4567-e89b-12d3-a456-426614174000",
    "email": "dispatcher@acme.com",
    "name": "Jane Dispatcher",
    "roles": ["dispatcher", "admin"],
    "tenant": "tenant_acme-corp"
  }
}
```

#### Error Responses

**401 Unauthorized - Invalid Credentials**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "requestId": "req_123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2025-11-14T10:30:00Z"
  }
}
```

**403 Forbidden - MFA Required**

```json
{
  "error": {
    "code": "MFA_REQUIRED",
    "message": "Multi-factor authentication code required",
    "details": {
      "mfaMethods": ["totp", "sms"],
      "sessionToken": "temp_session_123e4567"
    }
  }
}
```

**422 Unprocessable Entity - Validation Error**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      }
    ]
  }
}
```

### 2. API Key Authentication

**Endpoint**: `POST /v1/auth/api-key`

#### Request

```bash
curl -X POST "https://api.fsm-platform.com/v1/auth/api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk_live_123e4567-e89b-12d3-a456-426614174000",
    "apiSecret": "sk_secret_123e4567-e89b-12d3-a456-426614174000"
  }'
```

#### Success Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "scope": "providers:read assignments:read",
  "apiKey": {
    "id": "key_123e4567-e89b-12d3-a456-426614174000",
    "name": "Production Integration Key",
    "environment": "production"
  }
}
```

### 3. OAuth 2.0 Flow

**Authorization Endpoint**: `GET /v1/oauth/authorize`

#### Authorization Request

```bash
https://api.fsm-platform.com/v1/oauth/authorize?
  response_type=code&
  client_id=client_123e4567&
  redirect_uri=https://yourapp.com/callback&
  scope=providers:read assignments:read&
  state=random_state_string
```

#### Token Exchange

```bash
curl -X POST "https://api.fsm-platform.com/v1/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=auth_code_123e4567" \
  -d "client_id=client_123e4567" \
  -d "client_secret=client_secret_123e4567" \
  -d "redirect_uri=https://yourapp.com/callback"
```

#### Success Response

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "scope": "providers:read assignments:read"
}
```

---

## Token Refresh

### Refresh Access Token

**Endpoint**: `POST /v1/auth/refresh`

#### Request

```bash
curl -X POST "https://api.fsm-platform.com/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### Request Schema

```json
{
  "refreshToken": "string (required, valid JWT refresh token)"
}
```

#### Success Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

#### Error Response (401 Unauthorized)

```json
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Refresh token is invalid or expired"
  }
}
```

### Token Revocation

**Endpoint**: `POST /v1/auth/revoke`

#### Request

```bash
curl -X POST "https://api.fsm-platform.com/v1/auth/revoke" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "refresh_token"
  }'
```

#### Success Response (204 No Content)

---

## Role-Based Access Control

### Role Hierarchy

```
┌─────────────┐
│  superadmin │  (Platform administrators)
└──────┬──────┘
       │
┌──────▼──────┐
│    admin    │  (Tenant administrators)
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
│  dispatcher │  │   manager   │  │  coordinator│
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                  ┌──────▼──────┐
                  │   provider  │
                  └─────────────┘
```

### Role Definitions

| Role | Description | Typical Users |
|------|-------------|---------------|
| superadmin | Platform-wide administration | Platform operators |
| admin | Tenant-level administration | Company administrators |
| dispatcher | Assignment creation & management | Dispatch teams |
| manager | Team & territory management | Regional managers |
| coordinator | Scheduling & optimization | Operations coordinators |
| provider | Field service provider | Technicians, contractors |

### Role Permissions Matrix

| Resource | superadmin | admin | dispatcher | manager | coordinator | provider |
|----------|------------|-------|------------|---------|-------------|----------|
| Providers | CRUD | CRUD | Read | Read | Read | Read (self) |
| Assignments | CRUD | CRUD | CRUD | Read | CRUD | Read (assigned) |
| Work Orders | CRUD | CRUD | CRUD | Read | Read | Read (assigned) |
| Schedules | CRUD | CRUD | CRUD | CRUD | CRUD | Read (self) |
| Territories | CRUD | CRUD | Read | CRUD | Read | None |
| Settings | CRUD | CRUD | Read | Read | Read | None |
| Analytics | All | Tenant | Team | Team | Team | Self |

---

## Scopes & Permissions

### Scope Format

Scopes follow the format: `resource:action`

**Examples**:
- `providers:read` - Read provider information
- `providers:write` - Create/update providers
- `assignments:delete` - Delete assignments
- `schedules:*` - All schedule operations

### Scope Categories

#### Provider Scopes

| Scope | Description | Required Role |
|-------|-------------|---------------|
| providers:read | List and view providers | Any authenticated user |
| providers:write | Create/update providers | admin, dispatcher |
| providers:delete | Delete providers | admin |
| providers:manage | Full provider management | admin |

#### Assignment Scopes

| Scope | Description | Required Role |
|-------|-------------|---------------|
| assignments:read | View assignments | Any authenticated user |
| assignments:write | Create/update assignments | dispatcher, coordinator |
| assignments:delete | Delete assignments | admin, dispatcher |
| assignments:assign | Assign to providers | dispatcher, coordinator |
| assignments:manage | Full assignment control | admin, dispatcher |

#### Schedule Scopes

| Scope | Description | Required Role |
|-------|-------------|---------------|
| schedules:read | View schedules | Any authenticated user |
| schedules:write | Update availability | coordinator, provider |
| schedules:manage | Manage all schedules | admin, coordinator |

#### Administrative Scopes

| Scope | Description | Required Role |
|-------|-------------|---------------|
| admin:users | User management | admin |
| admin:settings | System settings | admin |
| admin:billing | Billing management | admin |
| admin:audit | Audit log access | admin, superadmin |

### Scope Validation

API endpoints validate scopes before processing requests:

```http
GET /v1/providers
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

Required scope: providers:read
Token scopes: providers:read providers:write assignments:read
✓ Authorization successful
```

### Insufficient Scope Error

```json
{
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "Token lacks required scope: providers:write",
    "details": {
      "requiredScope": "providers:write",
      "availableScopes": ["providers:read", "assignments:read"]
    }
  }
}
```

---

## Security Best Practices

### Token Storage

**Client-Side (Browser)**:
```javascript
// Store access token in memory (not localStorage)
let accessToken = null;

// Store refresh token in httpOnly cookie (server-side set)
// Never store refresh token in localStorage
```

**Server-Side**:
```javascript
// Store tokens in secure, encrypted storage
// Use environment variables for secrets
// Never log tokens
```

### Token Transmission

1. **Always use HTTPS** in production
2. **Include tokens in Authorization header**, not query parameters
3. **Validate token on every request**
4. **Implement token expiration checks**

### Token Rotation

```javascript
// Automatically refresh tokens before expiration
const TOKEN_REFRESH_THRESHOLD = 60; // seconds

if (tokenExpiresIn < TOKEN_REFRESH_THRESHOLD) {
  await refreshAccessToken();
}
```

### Multi-Factor Authentication

**Enable MFA** for sensitive roles:

```bash
curl -X POST "https://api.fsm-platform.com/v1/auth/mfa/enable" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "totp"
  }'
```

**Response**:

```json
{
  "method": "totp",
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "backupCodes": [
    "12345678",
    "87654321"
  ]
}
```

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Cannot be common password
- Cannot match previous 5 passwords

### Account Lockout

After **5 failed login attempts**:
- Account locked for **15 minutes**
- Email notification sent
- Audit log entry created

---

## OpenAPI Specification

### Complete Authentication API

```yaml
openapi: 3.1.0
info:
  title: FSM Platform Authentication API
  version: 1.0.0
  description: Authentication and authorization endpoints

servers:
  - url: https://api.fsm-platform.com/v1
    description: Production

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    LoginRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
          description: User email address
          example: dispatcher@acme.com
        password:
          type: string
          format: password
          minLength: 8
          description: User password
          example: SecureP@ssw0rd!
        tenant:
          type: string
          description: Tenant identifier for multi-tenant setups
          example: acme-corp
        mfaCode:
          type: string
          pattern: '^[0-9]{6}$'
          description: 6-digit MFA code if enabled
          example: "123456"

    LoginResponse:
      type: object
      required:
        - accessToken
        - refreshToken
        - tokenType
        - expiresIn
      properties:
        accessToken:
          type: string
          description: JWT access token
          example: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
        refreshToken:
          type: string
          description: JWT refresh token
          example: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
        tokenType:
          type: string
          enum: [Bearer]
          description: Token type
          example: Bearer
        expiresIn:
          type: integer
          description: Access token lifetime in seconds
          example: 900
        scope:
          type: string
          description: Space-separated permission scopes
          example: providers:read providers:write assignments:read
        user:
          $ref: '#/components/schemas/AuthUser'

    AuthUser:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: User unique identifier
          example: user_123e4567-e89b-12d3-a456-426614174000
        email:
          type: string
          format: email
          description: User email
          example: dispatcher@acme.com
        name:
          type: string
          description: User full name
          example: Jane Dispatcher
        roles:
          type: array
          items:
            type: string
            enum: [superadmin, admin, dispatcher, manager, coordinator, provider]
          description: User roles
          example: [dispatcher, admin]
        tenant:
          type: string
          description: Tenant identifier
          example: tenant_acme-corp

    RefreshRequest:
      type: object
      required:
        - refreshToken
      properties:
        refreshToken:
          type: string
          description: Valid JWT refresh token
          example: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

    RefreshResponse:
      type: object
      required:
        - accessToken
        - refreshToken
        - tokenType
        - expiresIn
      properties:
        accessToken:
          type: string
          description: New JWT access token
        refreshToken:
          type: string
          description: New JWT refresh token
        tokenType:
          type: string
          enum: [Bearer]
        expiresIn:
          type: integer
          description: Access token lifetime in seconds

    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              description: Error code
            message:
              type: string
              description: Human-readable error message
            details:
              type: object
              description: Additional error details
            requestId:
              type: string
              format: uuid
              description: Request identifier for debugging
            timestamp:
              type: string
              format: date-time
              description: Error timestamp

paths:
  /auth/login:
    post:
      summary: User login
      description: Authenticate user with email and password
      operationId: login
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error:
                  code: INVALID_CREDENTIALS
                  message: Email or password is incorrect
        '403':
          description: MFA required
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/refresh:
    post:
      summary: Refresh access token
      description: Get new access token using refresh token
      operationId: refreshToken
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RefreshRequest'
      responses:
        '200':
          description: Token refreshed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RefreshResponse'
        '401':
          description: Invalid or expired refresh token
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/logout:
    post:
      summary: User logout
      description: Revoke current access and refresh tokens
      operationId: logout
      tags:
        - Authentication
      security:
        - bearerAuth: []
      responses:
        '204':
          description: Logout successful
        '401':
          description: Invalid or missing token
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/me:
    get:
      summary: Get current user
      description: Retrieve authenticated user information
      operationId: getCurrentUser
      tags:
        - Authentication
      security:
        - bearerAuth: []
      responses:
        '200':
          description: User information retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthUser'
        '401':
          description: Invalid or missing token
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

---

## Rate Limiting for Auth Endpoints

| Endpoint | Limit | Window | Lockout |
|----------|-------|--------|---------|
| /auth/login | 5 attempts | 15 minutes | 15 minutes |
| /auth/refresh | 10 attempts | 1 hour | N/A |
| /auth/logout | 20 attempts | 1 hour | N/A |

---

## Contact & Support

- Security Issues: security@fsm-platform.com
- API Documentation: https://docs.fsm-platform.com/api/auth
- Developer Portal: https://developers.fsm-platform.com
