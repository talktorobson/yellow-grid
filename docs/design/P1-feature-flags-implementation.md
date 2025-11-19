# Feature Flags Implementation - Design Document

**Status**: DRAFT
**Priority**: P1 - HIGH (De-risk Country Rollouts)
**Owner**: Platform Team
**Estimated Effort**: 1 week
**Created**: 2025-11-18
**Last Updated**: 2025-11-18

---

## 1. Executive Summary

### Problem Statement
Yellow Grid will deploy to **4 countries** (FR, ES, IT, PL) with different:
- Operational maturity levels
- Provider ecosystems
- Regulatory requirements
- Business processes

**Current deployment model**: All-or-nothing deploys
- ❌ Cannot test features in one country before rolling to all
- ❌ Cannot disable problematic features without full rollback
- ❌ Cannot do gradual rollouts (5% → 25% → 50% → 100%)
- ❌ Cannot A/B test country-specific variations

**Critical use cases needing feature flags**:
1. **AI/ML features** (Risk Assessment, Sales Potential) - Test in FR first
2. **Project Ownership** (AUTO mode) - Different rules per country
3. **Geographic Provider Filtering** - Complex new algorithm
4. **External Sales Integration** - Different systems per country (Pyxis/Tempo/SAP)

### Recommendation
Implement **Unleash** (open-source feature flag platform) with:
- Country-level targeting
- Gradual rollout capabilities
- Emergency kill switches
- Simple on/off flags (no complex A/B testing initially)

**Why Unleash over LaunchDarkly**:
- ✅ Open-source (can self-host or use cloud)
- ✅ No per-seat pricing (~70% cost savings)
- ✅ GDPR-compliant (EU-hosted option)
- ✅ Simple yet powerful
- ✅ Good SDKs for Node.js/TypeScript + React

**Timeline**: 1 week implementation, immediate value

---

## 2. Feature Flag Strategy

### 2.1 Flag Types

| Flag Type | Example | Use Case | Rollout Strategy |
|-----------|---------|----------|------------------|
| **Country Rollout** | `ai-risk-assessment` | New features per country | FR → ES → IT → PL |
| **Kill Switch** | `provider-geographic-filtering` | Disable if bugs found | ON by default, OFF if issues |
| **Operational Mode** | `project-ownership-auto-mode` | Different config per country | ES/IT=ON, FR/PL=OFF |
| **Integration** | `sales-pyxis-integration` | External system integration | FR-only initially |
| **Beta Feature** | `real-time-websocket-dashboard` | Experimental features | Internal users first |

### 2.2 Naming Convention

```
{domain}.{feature}.{variant?}

Examples:
- assignment.geographic-filtering
- ml.risk-assessment
- ml.sales-potential
- projects.ownership-auto-mode
- integration.sales-pyxis
- integration.sales-tempo
- execution.offline-sync-v2
```

### 2.3 Flag Lifecycle

```
1. CREATED (dev defines flag)
   ↓
2. DEVELOPMENT (enabled in dev/staging only)
   ↓
3. BETA (enabled for internal users in production)
   ↓
4. GRADUAL_ROLLOUT (5% → 25% → 50% → 100%)
   ↓
5. FULLY_ENABLED (100% of users)
   ↓
6. LOCKED (remove conditional code, flag becomes permanent)
   ↓
7. DEPRECATED (clean up flag from Unleash)
```

**Important**: Flags should not live forever. After 6 months at 100%, remove conditional code.

---

## 3. Unleash Architecture

### 3.1 Deployment Options

**Option A: Unleash Cloud** (Recommended for simplicity)
- Managed service (unleash-hosted.com)
- EU hosting available (GDPR compliant)
- $80/month for starter plan (unlimited flags, 10K requests/sec)
- No infrastructure management

**Option B: Self-Hosted** (Recommended for control)
- Deploy on our Kubernetes cluster
- Zero software cost
- Full control over data
- Requires PostgreSQL database

**Decision**: Start with **Unleash Cloud (EU region)**, migrate to self-hosted if needed

### 3.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Unleash Cloud (EU)                                     │
│  ┌─────────────────┐                                    │
│  │  Unleash Admin  │ ← Operators configure flags       │
│  │      UI         │                                     │
│  └─────────────────┘                                    │
│                                                          │
│  ┌─────────────────┐                                    │
│  │  Unleash API    │                                     │
│  │  (PostgreSQL)   │                                     │
│  └────────┬────────┘                                    │
└───────────┼──────────────────────────────────────────────┘
            │ HTTPS
            │ Polling (15s interval)
            │
    ┌───────┴───────┐
    ▼               ▼
┌─────────┐   ┌─────────┐
│ Backend │   │Frontend │
│ (NestJS)│   │ (React) │
└────┬────┘   └────┬────┘
     │             │
     │ unleash-client-node
     │             └─ unleash-proxy-client-react
     │
     ▼
┌──────────────┐
│ Local Cache  │ ← Flags cached in memory
│ (in-memory)  │   Updates every 15s
└──────────────┘
```

### 3.3 Unleash Concepts

**Strategies**: Rules for enabling flags
- **Default**: Simple ON/OFF
- **UserIDs**: Enable for specific users (e.g., internal testing)
- **GradualRollout**: Percentage-based rollout (5%, 25%, 50%, 100%)
- **FlexibleRollout**: Custom rules (country, user role, etc.)

**Contexts**: Variables used in strategies
- `userId`: Individual user ID
- `countryCode`: FR, ES, IT, PL
- `environment`: dev, staging, production
- `userRole`: operator, provider, admin
- `tenantId`: Business unit or store

**Variants**: Different versions of a feature (advanced, not initially used)

---

## 4. Backend Implementation

### 4.1 Installation

```bash
npm install unleash-client @unleash/proxy --save
```

### 4.2 Unleash Module

```typescript
// src/common/feature-flags/feature-flags.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeatureFlagsService } from './feature-flags.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
```

### 4.3 Feature Flags Service

```typescript
// src/common/feature-flags/feature-flags.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initialize, Unleash, Context } from 'unleash-client';

export enum FeatureFlag {
  // AI/ML Features
  AI_RISK_ASSESSMENT = 'ml.risk-assessment',
  AI_SALES_POTENTIAL = 'ml.sales-potential',

  // Assignment Features
  GEOGRAPHIC_FILTERING = 'assignment.geographic-filtering',
  PROVIDER_SCORING_V2 = 'assignment.provider-scoring-v2',

  // Project Features
  PROJECT_OWNERSHIP_AUTO = 'projects.ownership-auto-mode',

  // Integration Features
  SALES_PYXIS_INTEGRATION = 'integration.sales-pyxis',
  SALES_TEMPO_INTEGRATION = 'integration.sales-tempo',
  SALES_SAP_INTEGRATION = 'integration.sales-sap',

  // Execution Features
  OFFLINE_SYNC_V2 = 'execution.offline-sync-v2',
  REALTIME_DASHBOARD = 'execution.realtime-dashboard',

  // Infrastructure
  KAFKA_ENABLED = 'infrastructure.kafka-enabled',
  OPENSEARCH_ENABLED = 'infrastructure.opensearch-enabled',
}

@Injectable()
export class FeatureFlagsService implements OnModuleInit, OnModuleDestroy {
  private unleash: Unleash;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.unleash = initialize({
      url: this.configService.get('UNLEASH_URL') || 'https://eu.unleash-hosted.com/api/',
      appName: 'yellow-grid-backend',
      environment: this.configService.get('ENVIRONMENT') || 'development',
      customHeaders: {
        Authorization: this.configService.get('UNLEASH_API_KEY'),
      },
      refreshInterval: 15000, // Poll every 15 seconds
      metricsInterval: 60000, // Send metrics every 60 seconds
    });

    // Wait for initial fetch
    await this.unleash.ready();
    console.log('Unleash feature flags initialized');
  }

  async onModuleDestroy() {
    this.unleash.destroy();
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(
    flag: FeatureFlag,
    context?: Partial<FeatureFlagContext>,
  ): boolean {
    const unleashContext: Context = {
      userId: context?.userId,
      sessionId: context?.sessionId,
      remoteAddress: context?.ipAddress,
      properties: {
        countryCode: context?.countryCode,
        userRole: context?.userRole,
        tenantId: context?.tenantId,
        environment: context?.environment,
      },
    };

    return this.unleash.isEnabled(flag, unleashContext);
  }

  /**
   * Check if flag is enabled with default fallback
   */
  isEnabledOrDefault(
    flag: FeatureFlag,
    context?: Partial<FeatureFlagContext>,
    defaultValue: boolean = false,
  ): boolean {
    try {
      return this.isEnabled(flag, context);
    } catch (error) {
      console.error(`Error checking feature flag ${flag}:`, error);
      return defaultValue; // Fail open or closed based on default
    }
  }

  /**
   * Get variant of a feature (for A/B testing, future use)
   */
  getVariant(
    flag: FeatureFlag,
    context?: Partial<FeatureFlagContext>,
  ): string {
    const unleashContext = this.buildContext(context);
    const variant = this.unleash.getVariant(flag, unleashContext);
    return variant.name;
  }

  private buildContext(context?: Partial<FeatureFlagContext>): Context {
    return {
      userId: context?.userId,
      sessionId: context?.sessionId,
      remoteAddress: context?.ipAddress,
      properties: {
        countryCode: context?.countryCode,
        userRole: context?.userRole,
        tenantId: context?.tenantId,
        environment: context?.environment || this.configService.get('ENVIRONMENT'),
      },
    };
  }
}

export interface FeatureFlagContext {
  userId?: string;
  sessionId?: string;
  countryCode?: 'FR' | 'ES' | 'IT' | 'PL';
  userRole?: 'operator' | 'provider' | 'admin' | 'technician';
  tenantId?: string;
  environment?: string;
  ipAddress?: string;
}
```

### 4.4 Usage in Controllers

```typescript
// src/modules/ml/controllers/risk-assessment.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { FeatureFlagsService, FeatureFlag } from '@/common/feature-flags';
import { CurrentUser } from '@/common/decorators';

@Controller('ml/risk-assessment')
export class RiskAssessmentController {
  constructor(
    private featureFlags: FeatureFlagsService,
    private riskAssessment: RiskAssessmentService,
  ) {}

  @Post('assess')
  async assessRisk(
    @Body() dto: AssessRiskDto,
    @CurrentUser() user: User,
  ) {
    // Check if AI risk assessment is enabled for this country
    const isEnabled = this.featureFlags.isEnabled(
      FeatureFlag.AI_RISK_ASSESSMENT,
      {
        userId: user.id,
        countryCode: dto.countryCode,
        userRole: user.role,
      },
    );

    if (!isEnabled) {
      // Fallback to manual risk assessment
      return this.riskAssessment.manualAssessment(dto);
    }

    // Use AI-powered risk assessment
    return this.riskAssessment.aiAssessment(dto);
  }
}
```

### 4.5 Usage in Services

```typescript
// src/modules/assignment/services/assignment.service.ts
import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, FeatureFlag } from '@/common/feature-flags';

@Injectable()
export class AssignmentService {
  constructor(private featureFlags: FeatureFlagsService) {}

  async findEligibleProviders(
    serviceOrder: ServiceOrder,
  ): Promise<Provider[]> {
    // Check if geographic filtering v2 is enabled
    const useGeographicFilteringV2 = this.featureFlags.isEnabled(
      FeatureFlag.GEOGRAPHIC_FILTERING,
      {
        countryCode: serviceOrder.countryCode,
      },
    );

    if (useGeographicFilteringV2) {
      return this.findProvidersWithGeographicFiltering(serviceOrder);
    }

    // Legacy logic
    return this.findProvidersLegacy(serviceOrder);
  }

  private async findProvidersWithGeographicFiltering(
    serviceOrder: ServiceOrder,
  ): Promise<Provider[]> {
    // New algorithm with advanced zone filtering
    // ...
  }

  private async findProvidersLegacy(
    serviceOrder: ServiceOrder,
  ): Promise<Provider[]> {
    // Old simple algorithm
    // ...
  }
}
```

### 4.6 Feature Flag Guard (Decorator Pattern)

```typescript
// src/common/decorators/feature-flag.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from '../feature-flags/feature-flags.service';

export const RequireFeatureFlag = (flag: FeatureFlag, fallback?: any) =>
  SetMetadata('feature-flag', { flag, fallback });
```

```typescript
// src/common/guards/feature-flag.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlags: FeatureFlagsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.get('feature-flag', context.getHandler());
    if (!metadata) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return this.featureFlags.isEnabled(metadata.flag, {
      userId: user?.id,
      countryCode: request.body?.countryCode || user?.countryCode,
      userRole: user?.role,
    });
  }
}
```

**Usage**:
```typescript
@Controller('projects')
export class ProjectsController {
  @Post()
  @RequireFeatureFlag(FeatureFlag.PROJECT_OWNERSHIP_AUTO)
  async createProject(@Body() dto: CreateProjectDto) {
    // This endpoint only available if feature flag is enabled
  }
}
```

---

## 5. Frontend Implementation

### 5.1 Installation

```bash
npm install @unleash/proxy-client-react --save
```

### 5.2 Unleash Provider Setup

```typescript
// web/src/App.tsx
import React from 'react';
import { FlagProvider } from '@unleash/proxy-client-react';

const unleashConfig = {
  url: 'https://eu.unleash-hosted.com/api/frontend',  // Proxy endpoint
  clientKey: process.env.REACT_APP_UNLEASH_CLIENT_KEY,
  refreshInterval: 15,
  appName: 'yellow-grid-web',
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
};

function App() {
  return (
    <FlagProvider config={unleashConfig}>
      <Router>
        {/* Your app */}
      </Router>
    </FlagProvider>
  );
}
```

### 5.3 Usage in Components

```typescript
// web/src/features/assignments/AssignmentFunnelPage.tsx
import React from 'react';
import { useFlag } from '@unleash/proxy-client-react';

export function AssignmentFunnelPage() {
  const showGeographicFiltering = useFlag('assignment.geographic-filtering');
  const showScoringTransparency = useFlag('assignment.provider-scoring-v2');

  return (
    <div>
      <h1>Assignment Funnel</h1>

      {showGeographicFiltering && (
        <GeographicFilterPanel />
      )}

      {showScoringTransparency && (
        <ScoringBreakdownModal />
      )}

      {/* Default UI */}
      <ProviderList />
    </div>
  );
}
```

### 5.4 Feature Flag Hook

```typescript
// web/src/hooks/useFeatureFlag.ts
import { useFlag, useFlags } from '@unleash/proxy-client-react';
import { useAuth } from './useAuth';

export function useFeatureFlag(flagName: string): boolean {
  const { user } = useAuth();
  const isEnabled = useFlag(flagName);

  // Additional client-side context can be added
  // For now, Unleash proxy handles server-side context

  return isEnabled;
}

// Usage
const isRiskAssessmentEnabled = useFeatureFlag('ml.risk-assessment');
```

---

## 6. Unleash Configuration (Admin UI)

### 6.1 Create Flags in Unleash

**Flag: `ml.risk-assessment`**
```yaml
Name: ml.risk-assessment
Description: Enable AI-powered risk assessment for service orders
Type: Release (on/off)
Enabled: Yes (in production)

Strategies:
  - Name: FlexibleRollout
    Parameters:
      stickiness: countryCode
      rollout: 100%
      constraints:
        - contextName: countryCode
          operator: IN
          values: [FR]  # Start with France only

  - Name: FlexibleRollout (Poland - gradual)
    Parameters:
      stickiness: userId
      rollout: 25%  # 25% of PL users
      constraints:
        - contextName: countryCode
          operator: IN
          values: [PL]
```

**Flag: `projects.ownership-auto-mode`**
```yaml
Name: projects.ownership-auto-mode
Description: Enable automatic project ownership assignment
Type: Release
Enabled: Yes

Strategies:
  - Name: Default (ES, IT)
    Parameters:
      stickiness: default
      rollout: 100%
      constraints:
        - contextName: countryCode
          operator: IN
          values: [ES, IT]  # AUTO mode for Spain, Italy

  # For France, Poland: Manual mode (flag disabled)
  - Name: Default (FR, PL)
    enabled: false
```

### 6.2 Gradual Rollout Example

**Scenario**: Roll out geographic filtering to Spain

**Week 1**: 5% of Spanish users
```yaml
Strategies:
  - Name: FlexibleRollout
    Parameters:
      stickiness: userId
      rollout: 5
      constraints:
        - contextName: countryCode
          operator: IN
          values: [ES]
```

**Week 2**: If no issues, increase to 25%
```yaml
rollout: 25  # Update via Unleash UI, no code deploy needed
```

**Week 3**: 50%
**Week 4**: 100%

---

## 7. Operational Procedures

### 7.1 Emergency Kill Switch

**Scenario**: Critical bug found in geographic filtering

**Action** (via Unleash UI):
1. Open flag `assignment.geographic-filtering`
2. Click "Disable in Production"
3. Save (takes effect in <30 seconds globally)

**No code deployment required** ✅

### 7.2 Feature Flag Monitoring

**Metrics to track**:
```typescript
// Prometheus metrics
const featureFlagUsage = new Counter({
  name: 'feature_flag_evaluations_total',
  help: 'Total feature flag evaluations',
  labelNames: ['flag', 'enabled', 'country'],
});

const featureFlagLatency = new Histogram({
  name: 'feature_flag_evaluation_duration_seconds',
  help: 'Time to evaluate feature flag',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
});
```

**Grafana Dashboard**:
- Flag evaluation rate (requests/sec)
- Percentage of users with each flag enabled (by country)
- Flag evaluation latency (should be <1ms from cache)

### 7.3 Flag Lifecycle Management

**Monthly Review**:
- Flags enabled at 100% for >6 months → Schedule for removal
- Flags never enabled → Delete if no longer needed
- Flags with high override rates → Investigate

**Example**: `assignment.geographic-filtering` at 100% for 6 months
1. Create ticket to remove conditional code
2. Deploy code without flag checks
3. Mark flag as "deprecated" in Unleash
4. After 1 month with no issues, delete flag from Unleash

---

## 8. Testing Strategy

### 8.1 Local Development

**.env.local**:
```bash
UNLEASH_URL=https://eu.unleash-hosted.com/api/
UNLEASH_API_KEY=default:development.xxx
ENVIRONMENT=development

# Override flags locally
FEATURE_FLAG_OVERRIDES='{"ml.risk-assessment":true,"ml.sales-potential":false}'
```

### 8.2 Integration Tests

```typescript
// test/feature-flags/feature-flags.e2e-spec.ts
describe('Feature Flags (E2E)', () => {
  let unleashService: FeatureFlagsService;

  beforeEach(() => {
    // Mock Unleash client
    unleashService = new FeatureFlagsService(configService);
  });

  it('should enable AI risk assessment for France', () => {
    const isEnabled = unleashService.isEnabled(
      FeatureFlag.AI_RISK_ASSESSMENT,
      { countryCode: 'FR' },
    );

    expect(isEnabled).toBe(true);
  });

  it('should disable AI risk assessment for Poland', () => {
    const isEnabled = unleashService.isEnabled(
      FeatureFlag.AI_RISK_ASSESSMENT,
      { countryCode: 'PL' },
    );

    expect(isEnabled).toBe(false);
  });

  it('should handle Unleash unavailability gracefully', async () => {
    // Simulate Unleash down
    mockUnleashClient.isEnabled.mockImplementation(() => {
      throw new Error('Unleash unavailable');
    });

    const isEnabled = unleashService.isEnabledOrDefault(
      FeatureFlag.AI_RISK_ASSESSMENT,
      { countryCode: 'FR' },
      false,  // Fail closed (safer)
    );

    expect(isEnabled).toBe(false);  // Falls back to default
  });
});
```

---

## 9. Cost Analysis

### Unleash Cloud
```
Starter Plan: $80/month
- Unlimited flags
- 10K requests/sec
- EU hosting available
- 2 environments (dev, prod)

Total Year 1: $960
```

### LaunchDarkly (for comparison)
```
Starter Plan: $10/seat/month (minimum 10 seats)
- $100/month base
- Additional features: +$50/month
- 50K monthly active users included

Total Year 1: $1,800 + overages
```

**Savings**: ~$840/year with Unleash

---

## 10. Security Considerations

### 10.1 API Key Management

**Backend**:
- Store `UNLEASH_API_KEY` in AWS Secrets Manager
- Rotate every 90 days
- Use different keys per environment

**Frontend**:
- Use Unleash Proxy (no direct API key exposure)
- Frontend client key is low-privilege (read-only)
- Cannot modify flags from frontend

### 10.2 GDPR Compliance

**Data sent to Unleash**:
- User ID (hashed)
- Country code
- User role
- Session ID

**Data NOT sent**:
- No PII (names, emails, addresses)
- No payment information
- No sensitive business data

**Unleash EU hosting**: Data stays in EU (Frankfurt region)

---

## 11. Success Criteria

- [ ] Unleash integrated in backend and frontend
- [ ] All v2.0 AI/ML features behind flags
- [ ] Zero downtime when enabling/disabling flags
- [ ] <1ms flag evaluation latency (from cache)
- [ ] 100% team trained on Unleash UI
- [ ] Gradual rollout process documented
- [ ] Emergency kill switch tested in staging

---

## 12. Timeline

### Week 1: Implementation
**Day 1-2**: Backend integration
- [ ] Set up Unleash Cloud account (EU region)
- [ ] Install `unleash-client` in backend
- [ ] Create `FeatureFlagsModule` and `FeatureFlagsService`
- [ ] Add feature flag checks to 3 pilot features

**Day 3**: Frontend integration
- [ ] Install `@unleash/proxy-client-react`
- [ ] Set up `FlagProvider` in `App.tsx`
- [ ] Add feature flag checks to 2 pilot UI features

**Day 4**: Configuration
- [ ] Create flags in Unleash UI for all v2.0 features
- [ ] Set up country-based targeting strategies
- [ ] Configure environments (dev, staging, prod)

**Day 5**: Testing & Documentation
- [ ] Write integration tests
- [ ] Test emergency kill switch
- [ ] Document operational procedures
- [ ] Train team on Unleash UI

---

## 13. Rollout Strategy for v2.0 Features

| Feature | Week 1 | Week 2 | Week 3 | Week 4 |
|---------|--------|--------|--------|--------|
| **AI Risk Assessment** | FR 100% | ES 25% | ES 100% | IT/PL 100% |
| **Geographic Filtering** | FR 50% | FR 100%, ES 25% | ES 100% | IT/PL 100% |
| **Project Ownership AUTO** | ES 100%, IT 100% | - | - | - |
| **Sales Potential ML** | FR 25% | FR 50% | FR 100% | ES/IT/PL 25% |

---

## 14. References

- [Unleash Documentation](https://docs.getunleash.io/)
- [Feature Flag Best Practices](https://martinfowler.com/articles/feature-toggles.html)
- [Unleash Strategies](https://docs.getunleash.io/reference/activation-strategies)

---

**Document Status**: Ready for implementation
**Next Steps**:
1. Set up Unleash Cloud account
2. Backend team implements FeatureFlagsService
3. Frontend team integrates React SDK
4. DevOps configures flags for v2.0 features
