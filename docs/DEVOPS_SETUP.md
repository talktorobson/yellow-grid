# DevOps Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐      ┌──────────────┐      ┌─────────────────────────────┐│
│  │ MacBook  │ push │   GitHub     │ auto │     STAGING VPS             ││
│  │   M2     │─────▶│   Actions    │─────▶│   (staging.goexec.de)       ││
│  │          │      │   CI/CD      │      │   - Auto-deploy on push     ││
│  │ Code     │      │              │      │   - Run E2E tests           ││
│  │ Only     │      │ - Lint       │      │   - Test data (resettable)  ││
│  └──────────┘      │ - Unit tests │      └─────────────────────────────┘│
│                    │ - Build      │                    │                 │
│                    │ - Deploy     │                    │ manual approve  │
│                    └──────────────┘                    ▼                 │
│                                         ┌─────────────────────────────┐ │
│                                         │     PRODUCTION VPS          │ │
│                                         │   (goexec.de)               │ │
│                                         │   - Deploy on tag/release   │ │
│                                         │   - Real customer data      │ │
│                                         │   - Zero-downtime deploy    │ │
│                                         └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Provision Staging VPS

**Recommended: Hetzner Cloud CX22** (€4.35/month)
- 4GB RAM, 2 vCPU, 40GB SSD
- Sufficient for full stack including Camunda

```bash
# Create VPS in Hetzner Console, then:
ssh root@<staging-ip> 'bash -s' < deploy/staging/setup-staging-vps.sh
```

### 2. Configure DNS

Add these DNS records:
| Record | Type | Value |
|--------|------|-------|
| staging.goexec.de | A | <staging-vps-ip> |
| operate.goexec.de | A | <prod-vps-ip> |
| tasklist.goexec.de | A | <prod-vps-ip> |

### 3. Add GitHub Secrets

Go to: Repository → Settings → Secrets → Actions

**Staging Secrets:**
| Secret | Value |
|--------|-------|
| `STAGING_HOST` | IP of staging VPS |
| `STAGING_USER` | `root` |
| `STAGING_SSH_KEY` | Private key for staging |

**Production Secrets:**
| Secret | Value |
|--------|-------|
| `PROD_HOST` | `135.181.96.93` |
| `PROD_USER` | `root` |
| `PROD_SSH_KEY` | Content of `deploy/vps_key` |

### 4. Generate SSH Key for CI/CD

```bash
# Generate new key pair for CI/CD
ssh-keygen -t ed25519 -C "github-actions@yellow-grid" -f ~/.ssh/github_actions -N ""

# Add to staging VPS
ssh-copy-id -i ~/.ssh/github_actions.pub root@<staging-ip>

# Add private key to GitHub Secrets as STAGING_SSH_KEY
cat ~/.ssh/github_actions
```

## Development Workflow

### Daily Development

```bash
# On MacBook - just code and push
git checkout -b feature/my-feature
# ... make changes ...
git commit -m "feat: my awesome feature"
git push origin feature/my-feature

# GitHub Actions automatically:
# 1. Runs lint + type check
# 2. Runs unit tests
# 3. Creates PR preview comment
```

### Testing on Staging

```bash
# Merge to main → auto-deploys to staging
git checkout main
git merge feature/my-feature
git push origin main

# Test at https://staging.goexec.de
# Login: operator.fr@adeo.com / Admin123!
```

### Deploying to Production

```bash
# Create a release → deploys to production
git tag v1.2.3
git push origin v1.2.3

# Or use GitHub UI:
# Releases → Draft new release → Publish
```

## Local Development (Minimal Resources)

For local development on MacBook M2, run only what you need:

```bash
# Just backend (no Camunda)
docker compose -f docker-compose.dev.yml up postgres redis

# Run API locally
npm run start:dev

# Or use remote staging for full stack testing
export API_URL=https://staging.goexec.de/api/v1
cd web && npm run dev
```

## Resource Comparison

| Environment | RAM Usage | Purpose |
|-------------|-----------|---------|
| **Local (MacBook)** | 2GB | Code only, use staging for full tests |
| **Staging VPS** | 3-4GB | Full stack, test deployments |
| **Production VPS** | 3-4GB | Live application |

## Monitoring & Logs

### View Logs
```bash
# Staging
ssh root@staging "cd /root/yellow-grid/deploy/staging && docker compose logs -f api"

# Production
ssh -i deploy/vps_key root@135.181.96.93 "cd /root/yellow-grid/deploy && docker compose logs -f api"
```

### Check Status
```bash
# Quick health check
curl -s https://staging.goexec.de/api/v1/health | jq
curl -s https://goexec.de/api/v1/health | jq
```

## Database Operations

### Reset Staging Data
```bash
ssh root@staging << 'EOF'
cd /root/yellow-grid/deploy/staging
docker compose exec -T api npx prisma migrate reset --force
docker compose exec -T api npm run seed
echo "✅ Staging data reset!"
EOF
```

### Backup Production
```bash
ssh -i deploy/vps_key root@135.181.96.93 << 'EOF'
cd /root/yellow-grid/deploy
docker compose exec -T postgres pg_dump -U postgres yellow_grid > /root/backups/$(date +%Y%m%d-%H%M%S).sql
echo "✅ Backup created!"
EOF
```

## Troubleshooting

### Deployment Failed
1. Check GitHub Actions logs
2. SSH to VPS and check container logs
3. Verify secrets are correct

### Out of Memory
```bash
# Check memory usage
ssh root@<vps> "free -h && docker stats --no-stream"

# If Camunda is using too much, disable UI
docker compose --profile camunda-ui down operate tasklist
```

### Certificate Issues
```bash
# Force cert renewal
ssh root@<vps> "docker exec frontend caddy reload"
```
