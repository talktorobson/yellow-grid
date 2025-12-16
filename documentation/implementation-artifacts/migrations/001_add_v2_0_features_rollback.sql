-- Migration Rollback: 001_add_v2_0_features
-- Description: Rollback v2.0 feature additions (external references, project ownership, sales potential, risk assessment)
-- Author: Platform Architecture Team
-- Date: 2025-01-16
-- Version: 2.0.0
-- WARNING: This will DELETE all v2.0 data. Ensure you have backups before running.

-- =====================================================
-- PART 1: DROP RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS external_ref_tenant_isolation ON external_reference_mappings;
DROP POLICY IF EXISTS project_ownership_tenant_isolation ON project_ownership_history;
DROP POLICY IF EXISTS sales_pre_est_tenant_isolation ON sales_pre_estimations;
DROP POLICY IF EXISTS sales_potential_tenant_isolation ON sales_potential_assessments;
DROP POLICY IF EXISTS risk_assessment_tenant_isolation ON risk_assessments;

-- =====================================================
-- PART 2: DROP SCHEDULED JOBS
-- =====================================================

-- Note: Uncomment if pg_cron extension is enabled
-- SELECT cron.unschedule('refresh-operator-workload');

-- =====================================================
-- PART 3: DROP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_external_reference_mappings_updated_at ON external_reference_mappings;
DROP TRIGGER IF EXISTS update_sales_pre_estimations_updated_at ON sales_pre_estimations;

-- =====================================================
-- PART 4: DROP FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS refresh_operator_workload();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- =====================================================
-- PART 5: DROP INDEXES
-- =====================================================

-- External Reference Indexes
DROP INDEX IF EXISTS idx_so_external_sales_order;
DROP INDEX IF EXISTS idx_so_external_project;
DROP INDEX IF EXISTS idx_so_external_lead;
DROP INDEX IF EXISTS idx_external_ref_mappings_lookup;

-- Sales Potential Indexes
DROP INDEX IF EXISTS idx_so_sales_potential;
DROP INDEX IF EXISTS idx_so_sales_pre_estimation;

-- Risk Assessment Indexes
DROP INDEX IF EXISTS idx_so_risk_level;
DROP INDEX IF EXISTS idx_so_risk_unacknowledged;

-- Project Ownership Indexes
DROP INDEX IF EXISTS idx_projects_responsible_operator;
DROP INDEX IF EXISTS idx_project_ownership_history_project;

-- Composite Dashboard Indexes
DROP INDEX IF EXISTS idx_so_dashboard_risk_potential;
DROP INDEX IF EXISTS idx_so_dashboard_operator_risk;

-- History Table Indexes
DROP INDEX IF EXISTS idx_sales_potential_assessments_so;
DROP INDEX IF EXISTS idx_risk_assessments_so;
DROP INDEX IF EXISTS idx_risk_assessments_triggered;

-- Materialized View Index
DROP INDEX IF EXISTS idx_operator_workload_operator_id;

-- =====================================================
-- PART 6: DROP MATERIALIZED VIEW
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS operator_workload;

-- =====================================================
-- PART 7: DROP TABLES
-- =====================================================

DROP TABLE IF EXISTS risk_assessments CASCADE;
DROP TABLE IF EXISTS sales_potential_assessments CASCADE;
DROP TABLE IF EXISTS sales_pre_estimations CASCADE;
DROP TABLE IF EXISTS project_ownership_history CASCADE;
DROP TABLE IF EXISTS external_reference_mappings CASCADE;

-- =====================================================
-- PART 8: DROP CONSTRAINTS FROM EXISTING TABLES
-- =====================================================

-- Drop constraints from service_orders
ALTER TABLE service_orders
  DROP CONSTRAINT IF EXISTS chk_sales_potential_service_type,
  DROP CONSTRAINT IF EXISTS chk_risk_acknowledgment;

-- Drop constraints from projects
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS chk_project_ownership;

-- =====================================================
-- PART 9: DROP COLUMNS FROM EXISTING TABLES
-- =====================================================

-- Drop service_orders v2.0 columns
ALTER TABLE service_orders
  DROP COLUMN IF EXISTS external_sales_order_id,
  DROP COLUMN IF EXISTS external_project_id,
  DROP COLUMN IF EXISTS external_lead_id,
  DROP COLUMN IF EXISTS external_system_source,
  DROP COLUMN IF EXISTS sales_potential,
  DROP COLUMN IF EXISTS sales_potential_score,
  DROP COLUMN IF EXISTS sales_potential_updated_at,
  DROP COLUMN IF EXISTS sales_pre_estimation_id,
  DROP COLUMN IF EXISTS sales_pre_estimation_value,
  DROP COLUMN IF EXISTS sales_pre_estimation_currency,
  DROP COLUMN IF EXISTS salesman_notes,
  DROP COLUMN IF EXISTS risk_level,
  DROP COLUMN IF EXISTS risk_score,
  DROP COLUMN IF EXISTS risk_assessed_at,
  DROP COLUMN IF EXISTS risk_factors,
  DROP COLUMN IF EXISTS risk_acknowledged_by,
  DROP COLUMN IF EXISTS risk_acknowledged_at;

-- Drop projects v2.0 columns
ALTER TABLE projects
  DROP COLUMN IF EXISTS responsible_operator_id,
  DROP COLUMN IF EXISTS assignment_mode,
  DROP COLUMN IF EXISTS assigned_at,
  DROP COLUMN IF EXISTS assigned_by;

-- =====================================================
-- PART 10: REVOKE PERMISSIONS
-- =====================================================

-- Note: Tables are already dropped, but for completeness:
REVOKE ALL ON external_reference_mappings FROM fsm_app_role;
REVOKE ALL ON project_ownership_history FROM fsm_app_role;
REVOKE ALL ON sales_pre_estimations FROM fsm_app_role;
REVOKE ALL ON sales_potential_assessments FROM fsm_app_role;
REVOKE ALL ON risk_assessments FROM fsm_app_role;
REVOKE ALL ON operator_workload FROM fsm_app_role;

-- =====================================================
-- END OF ROLLBACK MIGRATION
-- =====================================================

-- Verification queries (comment out in production)
/*
-- Verify service_orders columns are removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'service_orders'
  AND (
    column_name LIKE '%external%'
    OR column_name LIKE '%sales_%'
    OR column_name LIKE '%risk_%'
  );
-- Should return 0 rows

-- Verify projects columns are removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects'
  AND (
    column_name LIKE '%responsible%'
    OR column_name LIKE '%assignment%'
  );
-- Should return 0 rows

-- Verify tables are dropped
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'external_reference_mappings',
    'project_ownership_history',
    'sales_pre_estimations',
    'sales_potential_assessments',
    'risk_assessments'
  );
-- Should return 0 rows

-- Verify materialized view is dropped
SELECT matviewname
FROM pg_matviews
WHERE matviewname = 'operator_workload';
-- Should return 0 rows
*/
