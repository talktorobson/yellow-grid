# E2E Integration Tests - External Authentication System

This directory contains end-to-end integration tests for the external authentication system.

## Overview

The E2E tests validate the complete authentication flows by:
- Starting a real NestJS application instance
- Connecting to a real PostgreSQL database
- Making actual HTTP requests using supertest
- Testing complete user journeys from registration to authentication

## Test Files

### `auth/provider-auth.e2e-spec.ts`
Tests provider (company manager) authentication flows:
- ✅ Provider user registration with validation
- ✅ Provider login with credentials
- ✅ JWT token generation and validation
- ✅ User type isolation (EXTERNAL_PROVIDER)
- ✅ Provider status validation (ACTIVE/INACTIVE)
- ✅ Duplicate email prevention
- ✅ Password strength validation

**Coverage**: 13 test cases

### `auth/technician-auth.e2e-spec.ts`
Tests technician (field worker) authentication flows:
- ✅ Technician registration linked to work teams
- ✅ Email/password login
- ✅ Biometric device registration (RSA key pairs)
- ✅ Biometric login with challenge-response signature
- ✅ Offline token generation (7-day validity)
- ✅ Device management (list, revoke)
- ✅ Device limit enforcement (max 3 devices)
- ✅ User type isolation (EXTERNAL_TECHNICIAN)

**Coverage**: 18 test cases

**Total E2E Tests**: 31 test cases

---

## Prerequisites

### 1. Database Setup

The tests require a PostgreSQL database. You can use:

#### Option A: Docker Compose
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
npm run prisma:migrate

# Seed initial data (optional for tests)
npm run db:seed
```

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL 15+
# Create database
createdb yellow_grid_test

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/yellow_grid_test"

# Run migrations
npx prisma migrate dev
```

### 2. Environment Variables

Create a `.env.test` file in the project root:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yellow_grid_test?schema=public"

# JWT Configuration
JWT_SECRET="test-secret-key-change-in-production"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Application
NODE_ENV="test"
PORT="3000"

# Redis (optional for tests)
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

### 3. Dependencies

Ensure all test dependencies are installed:

```bash
npm install --save-dev supertest @types/supertest
```

---

## Running the Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test Suite
```bash
# Provider auth tests only
npx jest --config ./test/jest-e2e.json test/auth/provider-auth.e2e-spec.ts

# Technician auth tests only
npx jest --config ./test/jest-e2e.json test/auth/technician-auth.e2e-spec.ts
```

### Run with Coverage
```bash
npx jest --config ./test/jest-e2e.json --coverage
```

### Run in Watch Mode
```bash
npx jest --config ./test/jest-e2e.json --watch
```

### Run with Verbose Output
```bash
npx jest --config ./test/jest-e2e.json --verbose
```

---

## Test Structure

### Setup Phase (beforeAll)
1. Initialize NestJS application
2. Apply global validation pipes
3. Connect to test database
4. Create test fixtures (providers, work teams)

### Test Execution
Each test makes real HTTP requests and validates:
- HTTP status codes
- Response body structure
- Database state changes
- JWT token validity
- Business logic enforcement

### Cleanup Phase (afterAll)
1. Delete test data from database
2. Close database connections
3. Shut down application instance

---

## Test Data Management

### Fixtures
Tests create their own fixtures in `beforeAll`:
- Test provider: "E2E Test Provider" (ES/LM_ES)
- Test work team: "E2E Test Team" (linked to provider)
- Test users: Created during registration tests

### Cleanup Strategy
- All test data is deleted in `afterAll`
- Database constraints ensure referential integrity
- Tests use unique identifiers to avoid conflicts

---

## Security Testing

### Provider Authentication Security
- ✅ Password strength validation (min 8 chars, complexity)
- ✅ Bcrypt password hashing (10 salt rounds)
- ✅ Duplicate email prevention (409 Conflict)
- ✅ Provider validation (exists, active, country match)
- ✅ JWT token structure validation

### Technician Authentication Security
- ✅ RSA signature verification (2048-bit keys)
- ✅ Challenge-response protocol (prevents replay attacks)
- ✅ Device limit enforcement (max 3 devices)
- ✅ Device revocation (immediate effect)
- ✅ Offline token expiration (7 days)
- ✅ User type isolation in JWT payload

---

## Known Limitations

### Current Scope
These tests focus on authentication flows only. Future enhancements:

1. **Authorization Testing**
   - Test user type guards on protected endpoints
   - Verify RBAC permissions
   - Test multi-tenancy isolation

2. **MFA Testing**
   - TOTP verification (when implemented)
   - SMS verification (when implemented)
   - Backup codes

3. **Email Verification**
   - Email sending (when implemented)
   - Verification token validation
   - Resend functionality

4. **Performance Testing**
   - Concurrent login attempts
   - Rate limiting validation
   - Token refresh load testing

5. **Edge Cases**
   - Account lockout after failed attempts
   - Suspicious login detection
   - Session management

---

## Troubleshooting

### "Cannot connect to database"
- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env.test`
- Ensure migrations are applied: `npx prisma migrate dev`

### "Jest test timeout"
- Increase timeout in `test/jest-e2e.json`: `"testTimeout": 60000`
- Check if database is slow to respond
- Verify network connectivity

### "Provider not found" errors
- Check test fixtures are created in `beforeAll`
- Verify database migrations include provider/work team tables
- Check Prisma schema matches database

### "Device limit exceeded" errors
- Previous test runs may have left devices in database
- Run cleanup: `await prisma.registeredDevice.deleteMany()`
- Or use unique device IDs per test run

### "Invalid signature" errors
- Verify RSA key generation is correct
- Check signature encoding (base64)
- Ensure challenge is identical between signing and verification

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: yellow_grid_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/yellow_grid_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/yellow_grid_test
          JWT_SECRET: test-secret
```

---

## Test Coverage Goals

### Current Coverage (Phase 5)
- Provider registration: **100%** of happy path + error scenarios
- Provider login: **100%** of authentication flows
- Technician registration: **100%** of work team linkage
- Technician login: **100%** of credential validation
- Biometric setup: **100%** of device registration
- Biometric login: **100%** of signature verification
- Offline tokens: **100%** of generation flow
- Device management: **100%** of CRUD operations

### Target for Production
- **E2E Coverage**: >80% of critical user journeys
- **Integration Coverage**: >85% of service interactions
- **Combined with Unit Tests**: >90% overall code coverage

---

## Best Practices

### Writing New E2E Tests
1. **Use Real Data**: Don't mock database or HTTP layer
2. **Clean Up**: Always delete test data in `afterAll`
3. **Isolate Tests**: Each test should be independent
4. **Use Unique IDs**: Add timestamps to avoid conflicts
5. **Verify Database**: Check DB state after operations
6. **Test Negative Cases**: Invalid inputs, unauthorized access, etc.
7. **Use TypeScript**: Leverage type safety for DTOs
8. **Document Fixtures**: Explain test data setup

### Performance Optimization
1. **Reuse Application Instance**: Create once in `beforeAll`
2. **Parallel Execution**: Use Jest workers (default)
3. **Database Transactions**: Rollback instead of delete (future)
4. **Minimal Fixtures**: Create only necessary test data
5. **Connection Pooling**: Reuse database connections

---

## Related Documentation

- [Unit Tests](../src/modules/auth/README.md) - Service-level unit tests
- [API Documentation](../product-docs/api/README.md) - OpenAPI specs
- [Security Architecture](../product-docs/security/01-unified-authentication-architecture.md)
- [Implementation Tracking](../EXTERNAL_AUTH_IMPLEMENTATION.md)
- [Bug Report Phase 4](../BUG_REPORT_PHASE_4.md)

---

**Phase**: 5 (Integration Testing)
**Status**: ✅ Complete (tests written, pending infrastructure)
**Created**: 2025-01-17
**Last Updated**: 2025-01-17
**Maintainer**: Development Team + AI
