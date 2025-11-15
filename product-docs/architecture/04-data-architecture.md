# Data Architecture

## Purpose

This document defines the complete data architecture for the AHS Field Service Execution Platform, including database schemas, relationships, partitioning strategies, and multi-tenancy implementation.

## Database Strategy

### Primary Database: PostgreSQL 15+

**Multi-Schema Approach**: Separate schemas per domain service

```
ahs_fsm_db
├── identity_access
├── providers_capacity
├── projects_orders
├── assignments
├── execution
├── documents
├── communications
└── config_rules
```

## Multi-Tenancy: Discriminator Columns + RLS

Every table includes:
```sql
country_code VARCHAR(2) NOT NULL,
bu_code VARCHAR(50) NOT NULL,
store_id INTEGER
```

## Complete documentation available in final engineering kit

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
