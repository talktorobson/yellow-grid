# CI/CD Pipeline

## Purpose

Defines the continuous integration and continuous deployment pipeline for the AHS Field Service Execution Platform.

## Pipeline Overview

```
Code Push → CI Pipeline → Build → Test → Deploy → Monitor
```

**Environments**:
- **Dev**: Auto-deploy on merge to `develop`
- **Staging**: Auto-deploy on merge to `main`
- **Production**: Manual approval required

## CI Pipeline (GitHub Actions)

### Workflow File

**`.github/workflows/ci.yml`**:

```yaml
name: CI

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run Prettier check
        run: npm run format:check

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run TypeScript compiler
        run: npm run typecheck

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run unit tests
        run: npm run test:unit:cov
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit
          fail_ci_if_error: true

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ahs_fsm_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ahs_fsm_test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ahs_fsm_test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ahs_fsm_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ahs_fsm_test
      
      - name: Seed test data
        run: npm run db:seed:test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ahs_fsm_test
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ahs_fsm_test
          REDIS_URL: redis://localhost:6379

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, unit-tests]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
          retention-days: 7

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run npm audit
        run: npm audit --audit-level=high

  docker-build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [build, integration-tests]
    if: github.event_name == 'push'
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## CD Pipeline

### Deployment to Dev

**`.github/workflows/deploy-dev.yml`**:

```yaml
name: Deploy to Dev

on:
  push:
    branches: [develop]

jobs:
  deploy:
    name: Deploy to Dev Environment
    runs-on: ubuntu-latest
    environment: development
    
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker europe-west1-docker.pkg.dev

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials ahs-fsm-dev --region europe-west1

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/fsm-backend \
            fsm-backend=europe-west1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/fsm/fsm-backend:${{ github.sha }} \
            -n ahs-fsm-dev

          kubectl rollout status deployment/fsm-backend -n ahs-fsm-dev --timeout=5m
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --env=dev
      
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to Dev: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Deployment to Production

**`.github/workflows/deploy-prod.yml`**:

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy (e.g., v1.2.3)'
        required: true

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.ahs-fsm.com
    
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}
      
      - name: Verify version tag
        run: |
          git fetch --tags
          if ! git tag | grep -q "^${{ github.event.inputs.version }}$"; then
            echo "Tag ${{ github.event.inputs.version }} does not exist"
            exit 1
          fi
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials ahs-fsm-prod --region europe-west1
      
      - name: Deploy with Canary
        run: |
          # Deploy canary (10% traffic)
          kubectl apply -f k8s/canary/deployment.yaml
          
          # Wait 10 minutes and monitor
          sleep 600
          
          # Check canary metrics
          if ! ./scripts/check-canary-health.sh; then
            echo "Canary deployment failed health checks"
            kubectl delete -f k8s/canary/deployment.yaml
            exit 1
          fi
          
          # Promote to full deployment
          kubectl apply -f k8s/production/deployment.yaml
          kubectl rollout status deployment/fsm-backend -n ahs-fsm-prod --timeout=10m
      
      - name: Run smoke tests
        run: |
          npm run test:smoke -- --env=prod
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.event.inputs.version }}
          release_name: Release ${{ github.event.inputs.version }}
          draft: false
          prerelease: false
      
      - name: Notify team
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment ${{ github.event.inputs.version }}: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Dockerfile

**`Dockerfile`**:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "dist/main"]
```

## Quality Gates

### Required Checks Before Merge

- ✅ Lint passes (ESLint + Prettier)
- ✅ Type check passes
- ✅ Unit tests pass (coverage > 80%)
- ✅ Integration tests pass
- ✅ Build succeeds
- ✅ Security scan passes (no high vulnerabilities)
- ✅ Code review approved (≥ 2 reviewers)

### Deployment Gates

**Dev**:
- All CI checks pass

**Staging**:
- All CI checks pass
- Merged to `main`

**Production**:
- Manual approval by Engineering Lead
- Canary deployment health check passes
- Smoke tests pass

## Monitoring Post-Deployment

After each deployment, monitor:

```bash
# Check pod status
kubectl get pods -n ahs-fsm-{env}

# Check logs
kubectl logs -f deployment/fsm-backend -n ahs-fsm-{env}

# Check metrics in Grafana
# - HTTP error rate
# - p95 latency
# - Pod restarts
# - Database connection pool
```

**Automated monitoring** via Grafana alerts:
- Error rate > 1% → Alert
- p95 latency > 500ms → Alert
- Pod crash loops → Page on-call

## Rollback Procedure

### Automatic Rollback

If smoke tests fail after deployment:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    kubectl rollout undo deployment/fsm-backend -n ahs-fsm-{env}
```

### Manual Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/fsm-backend -n ahs-fsm-prod

# Or rollback to specific revision
kubectl rollout history deployment/fsm-backend -n ahs-fsm-prod
kubectl rollout undo deployment/fsm-backend --to-revision=5 -n ahs-fsm-prod
```

## Secrets Management

### GitHub Secrets

Required secrets in GitHub Actions:

```
GCP_WORKLOAD_IDENTITY_PROVIDER  # Format: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
GCP_SERVICE_ACCOUNT             # Format: github-actions@PROJECT_ID.iam.gserviceaccount.com
GCP_PROJECT_ID                  # GCP project ID
SNYK_TOKEN
SLACK_WEBHOOK
DATABASE_URL (for CI)
```

### Kubernetes Secrets

Secrets stored in GCP Secret Manager, injected via External Secrets Operator:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: fsm-secrets
spec:
  secretStoreRef:
    name: gcpsm-secret-store
  target:
    name: fsm-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: ahs-fsm-database-url
    - secretKey: JWT_SECRET
      remoteRef:
        key: ahs-fsm-jwt-secret
```

## Performance Optimization

### Build Caching

- Use GitHub Actions cache for `node_modules`
- Use Docker build cache for layers
- Cache Prisma Client generation

### Parallel Jobs

Run independent jobs in parallel:
- Lint, typecheck, unit tests run concurrently
- Integration and E2E tests run after unit tests pass

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
