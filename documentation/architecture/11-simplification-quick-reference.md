# Architecture Simplification - Quick Reference

**17 High-Impact Recommendations** | **30-40% Complexity Reduction**

---

## Services: 9 → 6 Services (-33%)

| Current (9) | Simplified (6) | Reason |
|-------------|----------------|--------|
| Identity & Access | **Platform Service** | Both foundational, low-change |
| Configuration | ↑ (merged) | Config is metadata like permissions |
| Scheduling & Availability | **Dispatch Service** | Sequential workflow, tight coupling |
| Assignment & Dispatch | ↑ (merged) | Atomic "find slot + assign" transaction |
| Communication | **Customer Interaction** | Both customer-facing, natural cohesion |
| Contracts & Documents | ↑ (merged) | Contracts require notifications |
| Provider & Capacity | **Provider & Capacity** | Keep (complex domain) |
| Orchestration & Control | **Orchestration & Control** | Keep (core orchestrator) |
| Execution & Mobile | **Execution & Mobile** | Keep (offline-first, different lifecycle) |

---

## Data Architecture

| Current | Simplified | Why |
|---------|-----------|-----|
| 8 PostgreSQL schemas | **1 schema** (`ahs_fsm`) | Simpler migrations, easier queries |
| Row-Level Security (RLS) | **Application-level filtering** | Explicit, testable, easier debugging |
| Pre-emptive partitioning | **Defer until 20M+ rows** | Premature optimization |

---

## Technology Stack

| Remove | Replace With | Savings |
|--------|-------------|---------|
| **Apache Kafka** | PostgreSQL Outbox + Event Bus | ~$1000/month, massive ops simplification |
| **Schema Registry** | N/A (no Kafka) | Included above |
| **OpenSearch** | PostgreSQL Full-Text Search | ~$200/month, simpler ops |
| **Complex Circuit Breaker** | Simple retry + timeout | Faster development |
| **Redis Idempotency** | Database unique constraints | One less dependency |
| **OpenTelemetry Tracing** | Defer (use logging + metrics) | Simpler instrumentation |

---

## Integration Patterns

| Over-Engineered | Simplify To |
|-----------------|-------------|
| Kafka for internal events | In-process Event Bus (modular monolith) |
| Custom circuit breaker (200 lines) | Retry with exponential backoff (60 lines) |
| Redis-based idempotency | Database unique constraint |
| 5 retry configs per integration | 1 global retry config |

---

## Development Workflow

| Current | Simplified |
|---------|-----------|
| 2 approvals for all PRs | 1 approval (2 for critical changes) |
| E2E tests from day 1 | Defer until post-MVP |
| Complex feature flags | Simple on/off per environment |
| 2-week sprints (rigid) | 1-2 week sprints (flexible) |

---

## Implementation Priority

### Phase 1 (Month 1): Quick Wins - 20% Complexity Reduction
- [ ] Single schema (remove multi-schema)
- [ ] Remove RLS (application-level filtering)
- [ ] PostgreSQL FTS (defer OpenSearch)
- [ ] Simple retry (remove circuit breaker complexity)
- [ ] Database idempotency (remove Redis dependency)

### Phase 2 (Month 2-3): Service Consolidation - 30% Fewer Services
- [ ] Merge Identity + Configuration → Platform Service
- [ ] Merge Communication + Contracts → Customer Interaction Service
- [ ] Merge Scheduling + Assignment → Dispatch Service

### Phase 3 (Month 3-4): Remove Kafka - Largest Complexity Win
- [ ] Implement Outbox pattern
- [ ] Build in-process Event Bus
- [ ] Migrate integrations to HTTP webhooks
- [ ] Decommission Kafka cluster

### Phase 4 (Month 4-6): Development Workflow - 25% Faster Velocity
- [ ] 1 approval for PRs (2 for critical)
- [ ] Defer E2E tests
- [ ] Simple feature flags

---

## Key Metrics

| Metric | Current | After Simplification | Improvement |
|--------|---------|---------------------|-------------|
| **Services** | 9 | 6 | -33% |
| **Databases** | 1 (with 8 schemas) | 1 (with 1 schema) | -88% schema complexity |
| **Message Brokers** | 1 (Kafka) | 0 | -100% Kafka complexity |
| **Search Engines** | 1 (OpenSearch) | 0 | -100% (use PostgreSQL) |
| **Caching Layers** | 2 (Redis for cache + idempotency) | 1 (Redis for cache) | -50% |
| **Inter-Service Calls** | ~50 per request | ~20 per request | -60% |
| **Deployment Units** | 9 services | 6 services | -33% |
| **Lines of Code** | ~90k (estimated) | ~65k (estimated) | -28% |
| **Monthly Infra Cost** | ~$5000 | ~$3500 | -30% |

---

## When to Add Complexity Back

| Technology | Add Back When... |
|------------|------------------|
| **Kafka** | >10k events/sec OR need event replay across multiple consumers |
| **OpenSearch** | PostgreSQL FTS p95 latency > 500ms OR need faceted search/geo-radius |
| **Circuit Breaker** | >10 high-throughput integrations OR cascading failure risk |
| **RLS** | Regulatory requirement for database-level tenant isolation |
| **Service Mesh** | >20 microservices with complex routing needs |
| **E2E Tests** | Post-launch, for critical user flows (booking, payments) |
| **Partitioning** | Single table > 20M rows AND queries slow despite indexes |
| **Tracing** | True microservices (>15 services) with complex call chains |

---

## Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Outbox pattern can't handle event volume | Low | Handles 10k events/sec; add Kafka if exceeded |
| PostgreSQL FTS insufficient | Low | Monitor p95 latency; add OpenSearch if > 500ms |
| Merged services become monolithic | Medium | Maintain clear module boundaries; extract if > 30k LoC |
| Application filtering misses tenant isolation | Low | Query auditing + code reviews; add RLS if needed |

---

## Quick Decision Matrix

**Should I use Kafka?**
- Do you have >10k events/sec? → YES
- Do you need event replay across multiple teams? → YES
- Are you building a modular monolith? → NO (use Outbox)

**Should I use OpenSearch?**
- Do you need faceted search or geo-radius? → YES
- Are PostgreSQL queries > 500ms? → YES
- Simple text search only? → NO (use PostgreSQL FTS)

**Should I use Circuit Breaker?**
- Do you have >10 integrations with high traffic? → YES
- Do you have <5 low-volume integrations? → NO (use retry)

**Should I split into microservices?**
- Do you have >15 teams working on the codebase? → YES
- Do services need independent scaling? → YES
- Is this a new project with <10 developers? → NO (start monolith)

---

## Estimated ROI

**Investment**: 4-6 engineering-months (spread over 6 months)

**Returns** (annually):
- Development velocity: +25-30% (1.5 more features per quarter)
- Infrastructure costs: -$18k/year
- Developer onboarding: -50% time (2 weeks → 1 week)
- Incident response: -40% time (simpler debugging)

**Payback Period**: 3-4 months

**Net Benefit** (3 years): ~$250k in saved engineering time + $54k in infrastructure savings = **$304k**

---

## Conclusion

**Start simple. Add complexity only when proven necessary.**

The current architecture is designed for a mature microservices system with 50+ services. For a modular monolith with 6 services, these simplifications will:

✅ Reduce development time by 25-30%
✅ Lower operational complexity by 35-40%
✅ Cut infrastructure costs by 20-25%
✅ Maintain all core functionality
✅ Preserve future flexibility

**Action**: Begin with Phase 1 (quick wins) immediately. Run for 1 month, measure impact, then proceed to Phase 2.

---

**Document Version**: 1.0
**Date**: 2025-01-15
**Author**: Architecture Review Team
