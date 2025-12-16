# Development Workflow

## Purpose

Defines the end-to-end development workflow for the AHS Field Service Execution Platform, from feature planning to production deployment.

## Feature Development Lifecycle

```
1. Planning → 2. Design → 3. Development → 4. Review → 5. Testing → 6. Deployment → 7. Monitor
```

## 1. Planning Phase

### Feature Request

**Input**: User story, bug report, or technical requirement

**Process**:
1. Product Manager creates ticket in project management tool (Jira/Linear)
2. Engineering Lead provides technical estimate
3. Feature prioritized in backlog

**Ticket Template**:
```markdown
## User Story
As a [role], I want [feature] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Notes
- Services affected: [list]
- External dependencies: [if any]
- Estimated effort: [S/M/L/XL]

## Definition of Done
- [ ] Code complete & tested
- [ ] Documentation updated
- [ ] PR approved & merged
- [ ] Feature flags configured
- [ ] Deployed to staging
```

### Sprint Planning

- **Cadence**: 2-week sprints
- **Capacity**: ~70% for planned work, 30% for bugs/support
- **Team commitment**: Features that fit in sprint capacity

## 2. Design Phase

### Technical Design Document (TDD)

For medium/large features, create TDD:

```markdown
# Feature: [Name]

## Problem Statement
What problem are we solving?

## Proposed Solution
High-level approach

## Detailed Design
### API Changes
- New endpoints
- Modified endpoints
- Breaking changes?

### Database Changes
- New tables/columns
- Migrations required
- Data backfill needed?

### Event Changes
- New events
- Modified event schemas

### Security Considerations
- Authentication/authorization changes
- Data privacy concerns
- Compliance requirements

## Implementation Plan
1. Step 1
2. Step 2
...

## Testing Strategy
- Unit tests
- Integration tests
- E2E scenarios

## Rollout Plan
- Feature flags
- Staged rollout
- Rollback plan

## Risks & Mitigations
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
```

### Design Review

- **Attendees**: Tech Lead, relevant engineers, Product Manager
- **Duration**: 30-60 minutes
- **Outcome**: Approved / Needs Changes

## 3. Development Phase

### Branch Strategy

**Git Flow Variant**:

```
main (production)
  ↑
develop (integration)
  ↑
feature/ABC-123-short-description
hotfix/ABC-456-critical-fix
```

### Creating Feature Branch

```bash
# From develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/ABC-123-add-provider-scoring

# Naming convention: feature/TICKET-ID-short-kebab-description
```

### Commit Convention

Follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semi-colons, etc
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Updating build tasks, package manager configs, etc

**Examples**:
```bash
git commit -m "feat(assignment): add provider scoring transparency"

git commit -m "fix(scheduling): correct buffer stacking for holidays

Buffers were not correctly skipping holidays when calculating
earliest service date. This fix ensures all non-working days
are excluded from buffer calculations.

Fixes: ABC-789"

git commit -m "docs(api): update scheduling API examples"
```

### Development Checklist

Before marking feature as "ready for review":

- [ ] Code complete
- [ ] Self-review done
- [ ] Unit tests added (coverage > 80%)
- [ ] Integration tests for new APIs
- [ ] OpenAPI spec updated (if API changes)
- [ ] Database migration created (if schema changes)
- [ ] Event schema registered (if new events)
- [ ] Error handling added
- [ ] Logging added (with correlation IDs)
- [ ] Documentation updated
- [ ] Feature flag configured (if applicable)

## 4. Code Review Phase

### Creating Pull Request

**PR Title**: `[ABC-123] Add provider scoring transparency`

**PR Description Template**:
```markdown
## Summary
Brief description of what this PR does

Fixes: ABC-123

## Changes
- Added scoring transparency to assignment service
- Updated assignment API to include funnel data
- Created new database tables for scoring audit

## Testing
- Unit tests: 15 new tests, all passing
- Integration tests: Added assignment funnel E2E test
- Manual testing: Verified in local environment

## Screenshots / Videos
[If UI changes]

## Deployment Notes
- [ ] Requires database migration (auto-applied)
- [ ] Requires new config values (documented in #config-changes)
- [ ] Breaks backward compatibility (version bump required)

## Checklist
- [ ] Code follows style guide
- [ ] Self-reviewed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No sensitive data in code
```

### Code Review Guidelines

**Reviewer Checklist**:
- [ ] Code is understandable
- [ ] Logic is correct
- [ ] Error handling is appropriate
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities
- [ ] Performance implications considered
- [ ] API contracts maintained (no breaking changes without version bump)
- [ ] Database migrations are reversible

**Review Etiquette**:
- **Be kind and constructive**
- **Ask questions** rather than make demands
- **Suggest alternatives** with reasoning
- **Approve if minor issues** (can be fixed in follow-up)
- **Request changes if blockers** (security, correctness, major design issues)

**Example Comments**:
```
✅ Good: "Consider extracting this into a separate function for better testability. What do you think?"
❌ Bad: "This is wrong. Refactor it."

✅ Good: "This query might be slow for large datasets. Have you considered adding an index on `scheduled_date`?"
❌ Bad: "Performance will be terrible here."
```

### Review Process

1. **Author creates PR** → Auto-assigns reviewers (based on CODEOWNERS)
2. **CI runs** → Lint, test, build must pass
3. **Reviewers review** → Approve / Request Changes / Comment
4. **Author addresses feedback** → Pushes new commits
5. **Re-review if needed**
6. **Approval** → Merge when >= 2 approvals (for critical services)

## 5. Testing Phase

### Test Pyramid

```
      E2E (10%)
    /         \
  Integration (30%)
 /                 \
Unit Tests (60%)
```

### Running Tests Locally

```bash
# Unit tests
npm run test:unit

# Integration tests (requires Docker)
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test

# Coverage
npm run test:coverage
```

### Continuous Integration

**GitHub Actions** pipeline (`.github/workflows/ci.yml`):

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck
      
      - name: Unit tests
        run: npm run test:unit
      
      - name: Integration tests
        run: npm run test:integration
      
      - name: Build
        run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Quality Gates

PR cannot be merged unless:
- ✅ All tests pass
- ✅ Code coverage > 80%
- ✅ Lint passes
- ✅ Build succeeds
- ✅ >= 2 approvals (for critical services)
- ✅ No unresolved conversations

## 6. Deployment Phase

### Environments

```
Local → Dev → Staging → Production
```

| Environment | Purpose | Auto-deploy | Approval Required |
|-------------|---------|-------------|-------------------|
| **Local** | Development | Manual | No |
| **Dev** | Integration testing | On merge to `develop` | No |
| **Staging** | Pre-production testing | On merge to `main` | No |
| **Production** | Live | Manual trigger | Yes (Engineering Lead) |

### Deployment Process

#### Automatic (Dev/Staging)

```
1. PR merged to develop/main
   ↓
2. GitHub Actions triggered
   ↓
3. Run tests
   ↓
4. Build Docker image
   ↓
5. Push to registry
   ↓
6. Deploy to k8s (via kubectl apply / Helm upgrade)
   ↓
7. Run smoke tests
   ↓
8. Notify team (Slack)
```

#### Manual (Production)

```
1. Create release tag (e.g., v1.2.3)
   ↓
2. Engineering Lead approves deployment
   ↓
3. GitHub Actions runs production deployment
   ↓
4. Blue-green / canary deployment
   ↓
5. Run smoke tests
   ↓
6. Monitor metrics for 30 minutes
   ↓
7. Rollback if issues / Complete if healthy
```

### Release Checklist

Before deploying to production:
- [ ] All tests passing in staging
- [ ] Database migrations tested in staging
- [ ] Performance testing done (if major change)
- [ ] Security review done (if auth/security changes)
- [ ] Changelog updated
- [ ] Documentation updated
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Stakeholders informed (if customer-facing changes)

### Feature Flags

Use feature flags for risky features:

```typescript
import { FeatureFlags } from './feature-flags';

if (FeatureFlags.isEnabled('provider-scoring-v2', { country: 'FR' })) {
  // New scoring algorithm
  return await this.scoringV2Service.score(provider, order);
} else {
  // Old algorithm
  return await this.scoringService.score(provider, order);
}
```

**Benefits**:
- Deploy code without enabling feature
- Gradual rollout (by country, percentage of users)
- Quick rollback (no redeploy needed)

## 7. Monitoring Phase

### Post-Deployment Monitoring

**First 30 minutes after deploy**:
- Watch error rates in Grafana
- Check application logs for exceptions
- Monitor key business metrics (assignment success rate, API latency)
- Verify new features working as expected

**Metrics to Watch**:
- HTTP error rate (should not spike)
- p95 latency (should not increase)
- Database connection pool (should not saturate)
- Kafka consumer lag (should not grow)

### Rollback Procedure

If issues detected:

```bash
# Kubernetes rollback to previous deployment
kubectl rollout undo deployment/fsm-backend -n ahs-fsm-prod

# Or via Helm
helm rollback fsm-backend -n ahs-fsm-prod

# Disable feature flag (if feature-flag-based deployment)
curl -X POST https://api.ahs-fsm.com/admin/feature-flags/provider-scoring-v2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'
```

### Incident Response

If production incident:
1. **Acknowledge**: On-call engineer acknowledges in PagerDuty
2. **Assess**: Determine severity (P1-P4)
3. **Communicate**: Update status page, notify stakeholders
4. **Mitigate**: Rollback, hotfix, or workaround
5. **Resolve**: Confirm incident resolved
6. **Post-mortem**: Document root cause and action items (blameless)

## Development Tools

### Required Tools

- **IDE**: VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Prisma
  - GitLens
- **Node.js**: v20 LTS
- **Docker**: For local PostgreSQL, Kafka, Redis
- **Git**: Version control
- **Postman/Insomnia**: API testing

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Git Hooks (Husky)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
      "pre-push": "npm run test:unit"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## Summary: Developer Day-to-Day

```
1. Pick ticket from sprint board
   ↓
2. Create feature branch
   ↓
3. Write code + tests
   ↓
4. Run tests locally (npm run test)
   ↓
5. Commit with conventional commit message
   ↓
6. Push branch, create PR
   ↓
7. Address review feedback
   ↓
8. Merge when approved + CI passes
   ↓
9. Monitor dev deployment
   ↓
10. Verify in staging
    ↓
11. Deploy to production (with approval)
    ↓
12. Monitor production
```

## Next Steps

- Review [Coding Standards](./02-coding-standards.md)
- Set up [Local Development Environment](./05-local-development-setup.md)
- Understand [CI/CD Pipeline](./06-cicd-pipeline.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
