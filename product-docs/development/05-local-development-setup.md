# Local Development Setup

## Purpose

Step-by-step guide to set up your local development environment for the AHS Field Service Execution Platform.

## Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 20 LTS | https://nodejs.org/ |
| **npm** | 10+ | Included with Node.js |
| **Git** | 2.40+ | https://git-scm.com/ |
| **Docker** | 24+ | https://www.docker.com/products/docker-desktop |
| **Docker Compose** | 2.20+ | Included with Docker Desktop |
| **VS Code** (recommended) | Latest | https://code.visualstudio.com/ |

### Optional Tools

- **Postman** or **Insomnia** - API testing
- **DBeaver** or **Postico** - Database client
- **k9s** - Kubernetes cluster management (for later)

## Initial Setup

### 1. Clone Repository

```bash
# SSH (recommended)
git clone git@github.com:talktorobson/fsm.git
cd fsm

# Or HTTPS
git clone https://github.com/talktorobson/fsm.git
cd fsm
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Verify installation
npm --version  # Should be 10.x or higher
node --version # Should be v20.x
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your settings
```

**`.env.local` example**:
```bash
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ahs_fsm_dev?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Kafka
KAFKA_BROKERS="localhost:9092"
KAFKA_CLIENT_ID="ahs-fsm-dev"

# GCP (for local GCS via fake-gcs-server)
GCS_ENDPOINT=http://localhost:4443
GCS_BUCKET=ahs-fsm-dev
GCS_PROJECT_ID=local-dev
STORAGE_EMULATOR_HOST=localhost:4443

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=1h

# External services (use mock servers in local)
PING_SSO_ENABLED=false
PYXIS_API_URL=http://localhost:8080/mock
ORACLE_API_URL=http://localhost:8081/mock
```

### 4. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, Kafka, fake-gcs-server (GCS emulator)
docker-compose up -d

# Verify services are running
docker-compose ps

# Should see:
# - postgres (port 5432)
# - redis (port 6379)
# - kafka (port 9092)
# - zookeeper (port 2181)
# - fake-gcs-server (port 4443) - for GCS emulation
```

**`docker-compose.yml`** (already in repo):
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ahs_fsm_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  fake-gcs-server:
    image: fsouza/fake-gcs-server:latest
    ports:
      - "4443:4443"
    command: ["-scheme", "http", "-port", "4443", "-external-url", "http://localhost:4443"]
    volumes:
      - gcs_data:/data

volumes:
  postgres_data:
  gcs_data:
```

### 5. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Verify database schema
npx prisma studio
# Opens http://localhost:5555 for database browsing
```

### 6. Seed Test Data

```bash
# Seed development database with test data
npm run db:seed

# This creates:
# - 3 test providers with work teams
# - 10 test service orders
# - Sample configuration data
# - Test users with different roles
```

See **[Test Environment Bootstrap](#test-environment-bootstrap)** section below for details.

### 7. Start Application

```bash
# Development mode with hot reload
npm run start:dev

# Application will start on http://localhost:3000
# API documentation: http://localhost:3000/api/docs (Swagger UI)
```

### 8. Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-14T10:30:00.000Z"}

# Check database connection
curl http://localhost:3000/health/db

# Check Redis connection
curl http://localhost:3000/health/redis

# Check Kafka connection
curl http://localhost:3000/health/kafka
```

## VS Code Setup

### Recommended Extensions

Install these VS Code extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-typescript-next",
    "orta.vscode-jest"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

### Launch Configuration

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Application",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasename}", "--detectOpenHandles"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Test Environment Bootstrap

### Overview

The test environment setup ensures all engineers have consistent datasets, configuration, and secrets for local development and testing.

### Test Data Structure

```
test-data/
├── seeds/
│   ├── 01-users.seed.ts
│   ├── 02-providers.seed.ts
│   ├── 03-service-orders.seed.ts
│   ├── 04-configuration.seed.ts
│   └── index.ts
├── fixtures/
│   ├── providers.fixture.ts
│   ├── service-orders.fixture.ts
│   └── users.fixture.ts
└── README.md
```

### Seeding Test Data

**`npm run db:seed`** runs these steps:

1. **Clear existing data** (except migrations)
2. **Create test users** with different roles
3. **Create test providers** and work teams
4. **Create test service orders** in various states
5. **Load configuration** (buffers, P1/P2 rules)

**Example seed script** (`test-data/seeds/02-providers.seed.ts`):

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedProviders() {
  // Provider 1: France - Full service provider
  const provider1 = await prisma.provider.create({
    data: {
      id: 'provider-1-uuid',
      name: 'ABC Home Services',
      countryCode: 'FR',
      buCode: 'Leroy Merlin',
      canPerformTV: true,
      canPerformInstallation: true,
      tier: 1,
      status: 'active',
      workTeams: {
        create: [
          {
            name: 'Team Paris',
            baseLocation: { lat: 48.8566, lng: 2.3522 },
            canPerformTV: true,
            canPerformInstallation: true,
          },
          {
            name: 'Team Lyon',
            baseLocation: { lat: 45.7640, lng: 4.8357 },
            canPerformTV: false,
            canPerformInstallation: true,
          },
        ],
      },
    },
  });

  // Provider 2: Spain - TV-only provider
  const provider2 = await prisma.provider.create({
    data: {
      id: 'provider-2-uuid',
      name: 'TechVisit España',
      countryCode: 'ES',
      buCode: 'Leroy Merlin',
      canPerformTV: true,
      canPerformInstallation: false,
      tier: 2,
      status: 'active',
      workTeams: {
        create: [
          {
            name: 'Madrid TV Team',
            canPerformTV: true,
            canPerformInstallation: false,
          },
        ],
      },
    },
  });

  console.log('✅ Providers seeded:', provider1.name, provider2.name);
}
```

### Test Users & Auth Tokens

**Default test users** (created by seed):

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `admin@ahs.test` | `test123` | SuperAdmin | All |
| `operator.fr@ahs.test` | `test123` | ServiceOperator | FR/Leroy Merlin |
| `provider.abc@test.com` | `test123` | ProviderAdmin | Provider 1 |

**Get auth token for testing**:

```bash
# Login as operator
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator.fr@ahs.test","password":"test123"}'

# Response includes JWT token
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "email": "operator.fr@ahs.test" }
}

# Use token in subsequent requests
export TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/providers
```

### Feature Flags

**Local feature flags** (in `.env.local` or seed data):

```bash
# Enable/disable features for local testing
FEATURE_PROVIDER_SCORING_V2=true
FEATURE_TV_FLOW_ENABLED=true
FEATURE_WCF_DIGITAL_SIGNATURE=false
```

**Or via database seed**:

```typescript
await prisma.featureFlag.createMany({
  data: [
    { key: 'provider-scoring-v2', enabled: true, scope: { country: 'FR' } },
    { key: 'tv-flow-enabled', enabled: true, scope: {} },
  ],
});
```

### Test Secrets

**Local secrets** (never commit real secrets):

```bash
# .env.local (not committed)
JWT_SECRET=local-dev-secret-change-me
PING_SSO_CLIENT_SECRET=mock-secret
PYXIS_API_KEY=test-api-key
TWILIO_AUTH_TOKEN=test-token
```

**For integration tests** use dedicated test secrets:

```bash
# .env.test (loaded during tests)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ahs_fsm_test"
JWT_SECRET=test-jwt-secret
REDIS_URL="redis://localhost:6379/1"
```

### Mock External Services

For local development, mock external services:

**`docker-compose.yml`** includes mock servers:

```yaml
services:
  mock-pyxis:
    image: mockserver/mockserver:latest
    ports:
      - "8080:1080"
    environment:
      MOCKSERVER_INITIALIZATION_JSON_PATH: /config/pyxis-mocks.json
    volumes:
      - ./mocks/pyxis-mocks.json:/config/pyxis-mocks.json

  mock-oracle:
    image: mockserver/mockserver:latest
    ports:
      - "8081:1080"
    environment:
      MOCKSERVER_INITIALIZATION_JSON_PATH: /config/oracle-mocks.json
    volumes:
      - ./mocks/oracle-mocks.json:/config/oracle-mocks.json
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- provider.service.spec.ts

# Run tests in watch mode
npm run test:unit:watch

# Run with coverage
npm run test:unit:cov
```

### Integration Tests

```bash
# Start test infrastructure (uses separate DB)
npm run test:infra:up

# Run integration tests
npm run test:integration

# Stop test infrastructure
npm run test:infra:down
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- assignment.e2e-spec.ts
```

## Common Tasks

### Reset Database

```bash
# Drop and recreate database
npm run db:reset

# Re-run migrations
npx prisma migrate dev

# Reseed data
npm run db:seed
```

### View Logs

```bash
# Application logs
tail -f logs/app.log

# Docker service logs
docker-compose logs -f postgres
docker-compose logs -f kafka
```

### Restart Services

```bash
# Restart all infrastructure
docker-compose restart

# Restart specific service
docker-compose restart postgres

# Stop all
docker-compose down

# Start all
docker-compose up -d
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env.local
PORT=3001
```

### Database Connection Issues

```bash
# Check Postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Reset connection
docker-compose restart postgres

# Verify connection
psql postgresql://postgres:postgres@localhost:5432/ahs_fsm_dev
```

### Kafka Issues

```bash
# Check Kafka is running
docker-compose ps kafka zookeeper

# Reset Kafka
docker-compose down
docker volume rm fsm_kafka_data
docker-compose up -d
```

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Prisma client
rm -rf node_modules/.prisma
npx prisma generate
```

## Next Steps

- Read [Development Workflow](./01-development-workflow.md)
- Review [Coding Standards](./02-coding-standards.md)
- Understand [Git Workflow](./03-git-workflow.md)
- Check [Code Review Guidelines](./04-code-review-guidelines.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
