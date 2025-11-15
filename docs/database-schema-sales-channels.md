# Database Schema: Sales Systems & Channels Support

**Created**: 2025-01-15
**Status**: Schema Design Document
**Priority**: HIGH - Critical gap identified

---

## Overview

The current database design documentation uses a **generic SaaS template** that does not reflect the AHS FSM domain requirements. This document addresses the critical gap: **support for multiple sales systems and sales channels**.

### Requirements

1. **Multiple Sales Systems**: The platform must integrate with different sales platforms:
   - **Pyxis** (primary sales system in some countries)
   - **Tempo** (alternative sales system in other countries/BUs)
   - Future sales systems (extensibility)

2. **Multiple Sales Channels**: Orders can originate from various channels:
   - **IN_STORE**: Customer purchases at physical store
   - **ONLINE**: E-commerce website purchases
   - **PHONE**: Call center orders
   - **PARTNER**: Third-party marketplace (e.g., Amazon, ManoMano)
   - **B2B**: Business-to-business contracts

3. **Multi-Tenancy Hierarchy**: The system must support:
   ```
   Country (ES, FR, IT, PL)
     └── Business Unit (Leroy Merlin, Brico Depot)
         └── Store (individual locations)
             └── Sales System Configuration
                 └── Service Orders
   ```

---

## Core Schema Design

### 1. Country Management

```sql
-- Countries table (master data)
CREATE TABLE countries (
  code VARCHAR(2) PRIMARY KEY, -- ISO 3166-1 alpha-2: 'ES', 'FR', 'IT', 'PL'
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(3) NOT NULL, -- ISO 4217: 'EUR', 'PLN'
  timezone VARCHAR(50) NOT NULL, -- 'Europe/Madrid', 'Europe/Paris', etc.
  locale VARCHAR(10) NOT NULL, -- 'es-ES', 'fr-FR', 'it-IT', 'pl-PL'
  is_active BOOLEAN DEFAULT true,
  configuration JSONB, -- Country-specific config (tax rates, regulations, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_countries_is_active ON countries(is_active);

-- Sample data
INSERT INTO countries (code, name, currency, timezone, locale) VALUES
  ('ES', 'Spain', 'EUR', 'Europe/Madrid', 'es-ES'),
  ('FR', 'France', 'EUR', 'Europe/Paris', 'fr-FR'),
  ('IT', 'Italy', 'EUR', 'Europe/Rome', 'it-IT'),
  ('PL', 'Poland', 'PLN', 'Europe/Warsaw', 'pl-PL');
```

### 2. Business Units

```sql
-- Business Units (Leroy Merlin, Brico Depot, etc.)
CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL REFERENCES countries(code),
  code VARCHAR(50) NOT NULL UNIQUE, -- 'LM_ES', 'BD_FR', etc.
  name VARCHAR(100) NOT NULL, -- 'Leroy Merlin Spain', 'Brico Depot France'
  type VARCHAR(50), -- 'RETAIL', 'B2B', 'FRANCHISE'
  is_active BOOLEAN DEFAULT true,
  configuration JSONB, -- BU-specific config (pricing rules, SLAs, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(country_code, code)
);

-- Indexes
CREATE INDEX idx_business_units_country_code ON business_units(country_code);
CREATE INDEX idx_business_units_is_active ON business_units(is_active);

-- Sample data
INSERT INTO business_units (country_code, code, name, type) VALUES
  ('ES', 'LM_ES', 'Leroy Merlin Spain', 'RETAIL'),
  ('ES', 'BD_ES', 'Brico Depot Spain', 'RETAIL'),
  ('FR', 'LM_FR', 'Leroy Merlin France', 'RETAIL'),
  ('FR', 'BD_FR', 'Brico Depot France', 'RETAIL'),
  ('IT', 'LM_IT', 'Leroy Merlin Italy', 'RETAIL'),
  ('PL', 'LM_PL', 'Leroy Merlin Poland', 'RETAIL');
```

### 3. Stores

```sql
-- Individual store locations
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  store_code VARCHAR(50) NOT NULL, -- 'LM_MAD_001', 'BD_PAR_042'
  name VARCHAR(255) NOT NULL, -- 'Leroy Merlin Madrid Centro'
  address JSONB NOT NULL, -- {street, city, postal_code, coordinates: {lat, lng}}
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  operational_hours JSONB, -- {monday: {open: '09:00', close: '21:00'}, ...}
  configuration JSONB, -- Store-specific config
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_unit_id, store_code)
);

-- Indexes
CREATE INDEX idx_stores_business_unit_id ON stores(business_unit_id);
CREATE INDEX idx_stores_is_active ON stores(is_active);
CREATE INDEX idx_stores_store_code ON stores(store_code);

-- Full-text search index for store names and addresses
CREATE INDEX idx_stores_search ON stores USING GIN(to_tsvector('simple', name || ' ' || (address->>'city')));

-- Sample data
INSERT INTO stores (business_unit_id, store_code, name, address) VALUES
  (
    (SELECT id FROM business_units WHERE code = 'LM_ES'),
    'LM_MAD_001',
    'Leroy Merlin Madrid Centro',
    '{"street": "Calle de Bravo Murillo, 25", "city": "Madrid", "postal_code": "28015", "coordinates": {"lat": 40.4378, "lng": -3.7042}}'::jsonb
  );
```

### 4. Sales Systems (Critical Table)

```sql
-- Sales systems configuration (Pyxis, Tempo, future systems)
CREATE TABLE sales_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- 'Pyxis', 'Tempo', 'SAP Commerce', etc.
  code VARCHAR(50) UNIQUE NOT NULL, -- 'PYXIS', 'TEMPO', 'SAP_COMMERCE'
  vendor VARCHAR(100), -- 'Adeo Group', 'SAP', 'Salesforce'
  description TEXT,
  api_base_url VARCHAR(500), -- 'https://pyxis-api.adeo.com/v2'
  api_version VARCHAR(20), -- 'v2', '2024-01'
  authentication_type VARCHAR(50), -- 'OAUTH2', 'API_KEY', 'SAML'
  is_active BOOLEAN DEFAULT true,
  supported_countries VARCHAR(2)[], -- ['ES', 'FR'] - which countries use this system
  configuration JSONB, -- System-specific config (API endpoints, retry policies, etc.)
  data_mapping JSONB, -- Field mappings between sales system and FSM (e.g., product codes)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sales_systems_code ON sales_systems(code);
CREATE INDEX idx_sales_systems_is_active ON sales_systems(is_active);

-- Sample data
INSERT INTO sales_systems (name, code, vendor, api_base_url, supported_countries, configuration) VALUES
  (
    'Pyxis',
    'PYXIS',
    'Adeo Group',
    'https://pyxis-api.adeo.com/v2',
    ARRAY['ES', 'FR', 'IT'],
    '{
      "timeout_ms": 5000,
      "retry_attempts": 3,
      "product_catalog_endpoint": "/products",
      "order_endpoint": "/orders"
    }'::jsonb
  ),
  (
    'Tempo',
    'TEMPO',
    'Adeo Group',
    'https://tempo-api.adeo.com/v1',
    ARRAY['PL'],
    '{
      "timeout_ms": 5000,
      "retry_attempts": 3,
      "legacy_mode": true
    }'::jsonb
  );
```

### 5. Business Unit Sales Systems Mapping

```sql
-- Which sales systems are used by which business units
CREATE TABLE business_unit_sales_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  sales_system_id UUID NOT NULL REFERENCES sales_systems(id),
  is_primary BOOLEAN DEFAULT false, -- Primary sales system for this BU
  priority INTEGER DEFAULT 100, -- Order priority (1=highest, 100=lowest)
  is_active BOOLEAN DEFAULT true,
  configuration JSONB, -- BU-specific overrides for sales system config
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_unit_id, sales_system_id)
);

-- Indexes
CREATE INDEX idx_bu_sales_systems_bu_id ON business_unit_sales_systems(business_unit_id);
CREATE INDEX idx_bu_sales_systems_sales_system_id ON business_unit_sales_systems(sales_system_id);
CREATE INDEX idx_bu_sales_systems_is_primary ON business_unit_sales_systems(is_primary) WHERE is_primary = true;

-- Sample data: Leroy Merlin Spain uses Pyxis, Leroy Merlin Poland uses Tempo
INSERT INTO business_unit_sales_systems (business_unit_id, sales_system_id, is_primary) VALUES
  (
    (SELECT id FROM business_units WHERE code = 'LM_ES'),
    (SELECT id FROM sales_systems WHERE code = 'PYXIS'),
    true
  ),
  (
    (SELECT id FROM business_units WHERE code = 'LM_PL'),
    (SELECT id FROM sales_systems WHERE code = 'TEMPO'),
    true
  );
```

### 6. Service Orders (Updated with Sales Context)

```sql
-- Service orders with sales system and channel tracking
CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenancy
  country_code VARCHAR(2) NOT NULL REFERENCES countries(code),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  store_id UUID NOT NULL REFERENCES stores(id),

  -- Sales system context (CRITICAL FIELDS)
  sales_system_id UUID NOT NULL REFERENCES sales_systems(id),
  sales_channel VARCHAR(50) NOT NULL, -- 'IN_STORE', 'ONLINE', 'PHONE', 'PARTNER', 'B2B'
  sales_order_id VARCHAR(255) NOT NULL, -- External sales system order ID (e.g., Pyxis order ID)
  sales_order_number VARCHAR(100), -- Human-readable sales order number (e.g., 'SO-2025-001234')
  sales_order_line_id VARCHAR(255), -- Line item ID within sales order (if multiple services)
  sales_order_metadata JSONB, -- Flexible storage for sales system-specific data

  -- Project and service details
  project_id UUID REFERENCES projects(id),
  service_type VARCHAR(50) NOT NULL, -- 'INSTALLATION', 'REPAIR', 'MAINTENANCE', 'TECHNICAL_VISIT'
  product_category VARCHAR(100), -- 'KITCHEN', 'BATHROOM', 'DOORS_WINDOWS', 'FLOORING'
  product_sku VARCHAR(100), -- Product SKU from sales system
  product_name VARCHAR(500),

  -- Customer information
  customer_id UUID NOT NULL REFERENCES customers(id),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  service_address JSONB NOT NULL, -- Address where service will be performed

  -- Dates and status
  order_date TIMESTAMP NOT NULL, -- When customer placed the order
  requested_date DATE, -- Customer's preferred service date
  scheduled_date DATE, -- Confirmed service date after scheduling
  status VARCHAR(50) NOT NULL, -- Service order status
  priority VARCHAR(10), -- 'P1', 'P2'

  -- Financial
  order_value_cents INTEGER, -- Total order value in cents
  service_fee_cents INTEGER, -- Service fee portion

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_sales_channel CHECK (sales_channel IN ('IN_STORE', 'ONLINE', 'PHONE', 'PARTNER', 'B2B', 'MOBILE_APP'))
);

-- Indexes
CREATE INDEX idx_service_orders_country_code ON service_orders(country_code);
CREATE INDEX idx_service_orders_business_unit_id ON service_orders(business_unit_id);
CREATE INDEX idx_service_orders_store_id ON service_orders(store_id);
CREATE INDEX idx_service_orders_sales_system_id ON service_orders(sales_system_id);
CREATE INDEX idx_service_orders_sales_channel ON service_orders(sales_channel);
CREATE INDEX idx_service_orders_sales_order_id ON service_orders(sales_order_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_service_orders_order_date ON service_orders(order_date);
CREATE INDEX idx_service_orders_scheduled_date ON service_orders(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_service_orders_country_bu_store ON service_orders(country_code, business_unit_id, store_id);
CREATE INDEX idx_service_orders_sales_system_channel ON service_orders(sales_system_id, sales_channel);

-- Unique constraint: Same sales order ID cannot be duplicated within a sales system
CREATE UNIQUE INDEX idx_service_orders_sales_order_unique ON service_orders(sales_system_id, sales_order_id, sales_order_line_id);
```

---

## Sales Channel Business Rules

### Channel-Specific Configurations

Each sales channel may have different business rules:

```sql
-- Sales channel configurations
CREATE TABLE sales_channel_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  sales_channel VARCHAR(50) NOT NULL,

  -- SLA overrides
  sla_p1_hours INTEGER, -- P1 response time in hours (overrides default)
  sla_p2_hours INTEGER, -- P2 response time in hours

  -- Pricing rules
  pricing_markup_percentage DECIMAL(5,2), -- Additional markup for this channel
  discount_percentage DECIMAL(5,2), -- Discount for this channel

  -- Scheduling preferences
  allow_same_day_scheduling BOOLEAN DEFAULT false,
  require_customer_confirmation BOOLEAN DEFAULT true,
  auto_assign BOOLEAN DEFAULT false,

  -- Notification preferences
  send_sms_notifications BOOLEAN DEFAULT true,
  send_email_notifications BOOLEAN DEFAULT true,
  notification_language VARCHAR(10), -- 'es', 'fr', 'it', 'pl'

  -- Business rules
  rules JSONB, -- Complex channel-specific business rules

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_unit_id, sales_channel)
);

-- Indexes
CREATE INDEX idx_sales_channel_config_bu_id ON sales_channel_configurations(business_unit_id);
CREATE INDEX idx_sales_channel_config_channel ON sales_channel_configurations(sales_channel);

-- Sample data: Online orders get priority SLA and auto-assignment
INSERT INTO sales_channel_configurations (business_unit_id, sales_channel, sla_p1_hours, sla_p2_hours, allow_same_day_scheduling, auto_assign) VALUES
  (
    (SELECT id FROM business_units WHERE code = 'LM_ES'),
    'ONLINE',
    48, -- P1 within 48 hours
    120, -- P2 within 5 days
    true,
    true
  ),
  (
    (SELECT id FROM business_units WHERE code = 'LM_ES'),
    'IN_STORE',
    72, -- P1 within 72 hours
    168, -- P2 within 7 days
    false,
    false
  );
```

---

## Sales System Integration Events

Track integration events from sales systems:

```sql
-- Integration events log
CREATE TABLE sales_system_integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_system_id UUID NOT NULL REFERENCES sales_systems(id),
  event_type VARCHAR(100) NOT NULL, -- 'ORDER_RECEIVED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'SYNC_ERROR'
  sales_order_id VARCHAR(255), -- External order ID
  service_order_id UUID REFERENCES service_orders(id), -- Linked FSM service order (if created)
  status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILURE', 'PENDING', 'RETRY'
  payload JSONB, -- Raw event payload from sales system
  error_message TEXT, -- Error details if failed
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_events_sales_system_id ON sales_system_integration_events(sales_system_id);
CREATE INDEX idx_integration_events_event_type ON sales_system_integration_events(event_type);
CREATE INDEX idx_integration_events_status ON sales_system_integration_events(status);
CREATE INDEX idx_integration_events_sales_order_id ON sales_system_integration_events(sales_order_id);
CREATE INDEX idx_integration_events_created_at ON sales_system_integration_events(created_at);

-- Partition by month (for high-volume event logs)
-- CREATE TABLE sales_system_integration_events_2025_01 PARTITION OF sales_system_integration_events
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## Query Examples

### 1. Get all service orders from Pyxis via online channel in Spain

```sql
SELECT
  so.id,
  so.sales_order_id,
  so.sales_channel,
  ss.name AS sales_system_name,
  bu.name AS business_unit_name,
  s.name AS store_name,
  so.status
FROM service_orders so
JOIN sales_systems ss ON so.sales_system_id = ss.id
JOIN business_units bu ON so.business_unit_id = bu.id
JOIN stores s ON so.store_id = s.id
WHERE so.country_code = 'ES'
  AND ss.code = 'PYXIS'
  AND so.sales_channel = 'ONLINE'
  AND so.order_date >= NOW() - INTERVAL '30 days';
```

### 2. Get sales system configuration for a business unit

```sql
SELECT
  bu.name AS business_unit,
  ss.name AS sales_system,
  ss.code AS sales_system_code,
  buss.is_primary,
  buss.priority,
  ss.api_base_url,
  ss.supported_countries
FROM business_unit_sales_systems buss
JOIN business_units bu ON buss.business_unit_id = bu.id
JOIN sales_systems ss ON buss.sales_system_id = ss.id
WHERE bu.code = 'LM_ES'
  AND buss.is_active = true
ORDER BY buss.priority;
```

### 3. Reconcile sales orders from multiple systems

```sql
-- Find duplicate customers across sales systems (order reconciliation)
SELECT
  so.customer_email,
  so.customer_phone,
  COUNT(DISTINCT so.sales_system_id) AS system_count,
  ARRAY_AGG(DISTINCT ss.name) AS sales_systems,
  COUNT(*) AS total_orders
FROM service_orders so
JOIN sales_systems ss ON so.sales_system_id = ss.id
WHERE so.order_date >= NOW() - INTERVAL '90 days'
GROUP BY so.customer_email, so.customer_phone
HAVING COUNT(DISTINCT so.sales_system_id) > 1;
```

### 4. Sales channel performance metrics

```sql
-- Service orders by channel (last 30 days)
SELECT
  so.sales_channel,
  bu.name AS business_unit,
  COUNT(*) AS order_count,
  AVG(EXTRACT(EPOCH FROM (so.scheduled_date - so.order_date::DATE)) / 3600) AS avg_scheduling_hours,
  COUNT(*) FILTER (WHERE so.status = 'COMPLETED') AS completed_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE so.status = 'COMPLETED') / COUNT(*), 2) AS completion_rate_pct
FROM service_orders so
JOIN business_units bu ON so.business_unit_id = bu.id
WHERE so.order_date >= NOW() - INTERVAL '30 days'
GROUP BY so.sales_channel, bu.name
ORDER BY order_count DESC;
```

---

## Migration Notes

### From Generic Template to AHS-Specific Schema

The existing `product-docs/infrastructure/02-database-design.md` file contains a generic SaaS template with tables like:
- `app.organizations`
- `app.projects`
- `app.tasks`
- `app.comments`

**Action Required**: Replace the entire schema with AHS FSM-specific tables including:
- Countries, Business Units, Stores (multi-tenancy)
- Sales Systems, Business Unit Sales Systems (sales integration)
- Service Orders (with sales context)
- Providers, Work Teams, Technicians (provider hierarchy)
- Assignments, Dispatch, Execution (core FSM domain)
- Contracts, Documents, Media (document management)

**File to Update**: `product-docs/infrastructure/02-database-design.md`

---

## Summary

This schema design addresses the critical gaps:

✅ **Multi-tenancy hierarchy**: Country → Business Unit → Store
✅ **Sales system flexibility**: Support for Pyxis, Tempo, and future systems
✅ **Sales channel tracking**: IN_STORE, ONLINE, PHONE, PARTNER, B2B, etc.
✅ **Channel-specific business rules**: SLAs, pricing, notifications per channel
✅ **Integration event tracking**: Audit trail of sales system integration
✅ **Extensibility**: JSONB fields for system-specific metadata and mappings

This design enables:
- **Order reconciliation** across multiple sales systems
- **Channel-specific workflows** (online orders get auto-assigned, in-store orders require confirmation)
- **Business intelligence** (which channel drives the most revenue? which sales system has the highest completion rate?)
- **Future-proof architecture** (add new sales systems without schema changes)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-15
**Owner**: Data Architecture Team
**Status**: Awaiting review and merge into main database design document
