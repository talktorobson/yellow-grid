# Integration Testing Guide

## 📋 Overview

This directory contains comprehensive integration tests for the Yellow Grid Platform backend API. The tests verify end-to-end functionality of all API endpoints, including authentication, authorization, data validation, and business logic.

## 🏗️ Test Infrastructure

### Technology Stack

- **Test Framework**: Jest with TypeScript
- **HTTP Testing**: Supertest
- **Database**: PostgreSQL via Testcontainers
- **Cache**: Redis via Testcontainers
- **ORM**: Prisma Client

### Test Architecture

```
test/
├── auth/                    # Authentication & Authorization tests
├── providers/               # Provider Management API tests
├── service-orders/          # Service Order API tests
├── assignments/             # Assignment & Dispatch API tests
├── contracts/               # Contract & E-signature tests
├── utils/                   # Test utilities & helpers
│   ├── database-test-setup.ts
│   ├── test-data-factory.ts
│   ├── test-helpers.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
└── README.md (this file)
```

## 🚀 Running Tests

### Prerequisites

- Node.js 20+ installed
- Docker running (for Testcontainers)
- 8GB+ RAM recommended

### Quick Start

```bash
# Install dependencies
npm install

# Run all integration tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- providers/providers.e2e-spec.ts

# Run tests in watch mode
npm run test:e2e -- --watch

# Run tests with coverage
npm run test:e2e -- --coverage
```

### Environment Variables

Tests automatically use Testcontainers for database and Redis. No manual setup required!

If you need to override:

```bash
# Optional overrides
export DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export NODE_ENV="test"
```

## 📁 Test Suites

### 1. Authentication Tests (`/auth`)

**Coverage**: 31 tests
- Provider registration and login
- Technician biometric authentication
- JWT token validation
- Refresh token flow
- User type isolation

**Run**: `npm run test:e2e -- auth/`

### 2. Provider Management Tests (`/providers`)

**Coverage**: 25+ tests
- Provider CRUD operations
- Work team management
- Technician management
- Multi-tenancy isolation
- Authorization checks

**Run**: `npm run test:e2e -- providers/`

### 3. Service Order Tests (`/service-orders`)

**Coverage**: 40+ tests
- Service order lifecycle
- State machine transitions
- Scheduling and assignment
- Cancellation workflow
- Dependency management
- Priority handling (P1/P2)

**Run**: `npm run test:e2e -- service-orders/`

### 4. Assignment Tests (`/assignments`)

**Coverage**: 30+ tests
- Direct, offer, broadcast, auto-accept modes
- Provider scoring algorithm
- Assignment transparency (funnel)
- Accept/decline workflow
- Multi-provider scenarios
- Country-specific rules (ES/IT auto-accept)

**Run**: `npm run test:e2e -- assignments/`

### 5. Contract Tests (`/contracts`)

**Coverage**: 20+ tests
- Contract generation (PRE_SERVICE, POST_SERVICE)
- E-signature capture
- Contract sending (email/SMS)
- Lifecycle management (DRAFT → SENT → SIGNED)
- Rejection workflow
- Consent tracking

**Run**: `npm run test:e2e -- contracts/`

## 🛠️ Test Utilities

### DatabaseTestSetup

Manages Testcontainers for PostgreSQL and Redis.

```typescript
import { DatabaseTestSetup } from '../utils';

// Automatically started by global-setup.ts
// Available to all tests via environment variables
```

### TestDataFactory

Generates realistic test data with sensible defaults.

```typescript
import { TestDataFactory } from '../utils';

const factory = new TestDataFactory(prisma);

// Create entities
const provider = await factory.createProvider();
const project = await factory.createProject();
const serviceOrder = await factory.createServiceOrder(project.id);
const assignment = await factory.createAssignment(serviceOrder.id, provider.id);

// Create complete scenario
const scenario = await factory.createCompleteScenario();
// Returns: { provider, workTeam, technician, project, serviceOrder, assignment }
```

### Test Helpers

Common utilities for authentication, validation, and assertions.

```typescript
import {
  authenticatedRequest,
  expectRecentDate,
  expectPaginatedResponse,
  SPAIN_CONTEXT,
  FRANCE_CONTEXT
} from '../utils';

// Authenticated request
const response = await authenticatedRequest(app, 'get', '/api/v1/providers', token)
  .expect(200);

// Validate date is recent
expectRecentDate(response.body.createdAt);

// Validate paginated response
expectPaginatedResponse(response);

// Multi-tenancy context
const provider = await factory.createProvider({ ...SPAIN_CONTEXT });
```

## ✅ Best Practices

### 1. Test Isolation

Each test should be independent and not rely on other tests.

```typescript
beforeEach(async () => {
  // Setup test data
  testUser = await factory.createUser();
});

afterEach(async () => {
  // Cleanup
  await prisma.user.delete({ where: { id: testUser.id } });
});
```

### 2. Use Factories

Always use `TestDataFactory` for creating test data.

```typescript
// ✅ Good
const provider = await factory.createProvider({ status: 'ACTIVE' });

// ❌ Bad - Direct Prisma calls
const provider = await prisma.provider.create({ data: { ... } });
```

### 3. Test Both Success and Failure Cases

```typescript
describe('POST /api/v1/providers', () => {
  it('should create provider successfully', async () => { ... });
  it('should reject with duplicate email', async () => { ... });
  it('should reject with invalid tax ID', async () => { ... });
  it('should require admin role', async () => { ... });
});
```

### 4. Verify Database State

Don't just check API responses - verify database changes.

```typescript
const response = await request(app).post('/api/v1/providers').send(dto);

// Also verify in database
const dbProvider = await prisma.provider.findUnique({
  where: { id: response.body.id }
});
expect(dbProvider.status).toBe('ACTIVE');
```

### 5. Use Descriptive Test Names

```typescript
// ✅ Good
it('should reject assignment to provider in different country', async () => { ... });

// ❌ Bad
it('should fail', async () => { ... });
```

## 🔍 Debugging Tests

### Enable Debug Logging

```bash
# Run tests with debug output
DEBUG=* npm run test:e2e

# Specific debug namespace
DEBUG=testcontainers npm run test:e2e
```

### Run Single Test

```bash
# Run single test file
npm run test:e2e -- providers/providers.e2e-spec.ts

# Run single test case
npm run test:e2e -- -t "should create provider successfully"
```

### Inspect Test Database

During test execution, containers are running. You can connect:

```bash
# Get connection URL (printed during test startup)
# Example: postgresql://testuser:testpass@localhost:49153/yellow_grid_test

# Connect with psql
docker exec -it <container-id> psql -U testuser -d yellow_grid_test
```

## 📊 Code Coverage

### View Coverage Report

```bash
# Generate coverage
npm run test:e2e -- --coverage

# View HTML report
open coverage-e2e/lcov-report/index.html
```

### Coverage Targets

- **Overall**: ≥80%
- **Critical paths**: ≥90%
- **State machines**: ≥95%

## 🚨 Troubleshooting

### Testcontainers Not Starting

**Issue**: Docker connection errors

**Solution**:
```bash
# Ensure Docker is running
docker ps

# On Mac: Increase Docker memory to 8GB+
# Docker Desktop → Settings → Resources → Memory
```

### Database Migration Errors

**Issue**: Prisma migration fails

**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (dev only)
npx prisma migrate reset
```

### Port Conflicts

**Issue**: Port already in use

**Solution**:
Testcontainers automatically assigns random ports. If conflicts persist:

```bash
# Find and kill process using port
lsof -ti:5432 | xargs kill -9

# Restart Docker
docker restart
```

### Slow Test Execution

**Issue**: Tests take too long

**Solutions**:
1. Run tests in parallel: `npm run test:e2e -- --maxWorkers=4`
2. Increase timeout: `jest.setTimeout(60000);`
3. Skip slow tests during development: `it.skip(...)`

### Memory Issues

**Issue**: Out of memory errors

**Solutions**:
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e

# Use fewer workers
npm run test:e2e -- --maxWorkers=2
```

## 📈 Test Metrics

Current test coverage:

| Module | Tests | Coverage |
|--------|-------|----------|
| Authentication | 31 | 95%+ |
| Providers | 25 | 85%+ |
| Service Orders | 40 | 88%+ |
| Assignments | 30 | 90%+ |
| Contracts | 20 | 85%+ |
| **Total** | **146** | **87%** |

## 🔄 CI/CD Integration

Tests run automatically on:
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop`

See `.github/workflows/integration-tests.yml` for configuration.

### CI Environment

Tests in CI use the same Testcontainers setup as local development, ensuring consistency.

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Testcontainers](https://node.testcontainers.org/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## 🤝 Contributing

### Adding New Tests

1. Create test file: `test/<module>/<module>.e2e-spec.ts`
2. Use `TestDataFactory` for data creation
3. Follow existing patterns (see examples above)
4. Add both success and failure cases
5. Verify database state, not just API responses
6. Run tests locally before committing
7. Ensure 80%+ coverage for new code

### Code Review Checklist

- [ ] Tests are isolated and independent
- [ ] Uses `TestDataFactory` for data creation
- [ ] Includes success and error cases
- [ ] Verifies database state
- [ ] Has descriptive test names
- [ ] Cleans up test data in `afterEach`/`afterAll`
- [ ] Passes in CI/CD pipeline

## 📝 License

This is proprietary software. Unauthorized copying or distribution is prohibited.

---

**Last Updated**: 2025-11-18
**Maintained By**: Development Team
**Questions?**: Open an issue or contact the team
