-- Migration: 001_add_v2_0_features
-- Description: Add v2.0 feature columns and tables (external references, project ownership, sales potential, risk assessment)
-- Author: Platform Architecture Team
-- Date: 2025-01-16
-- Version: 2.0.0

-- =====================================================
-- PART 1: SERVICE_ORDERS TABLE - Add v2.0 Columns
-- =====================================================

-- External Sales System References (4 columns)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS external_sales_order_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS external_project_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS external_lead_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS external_system_source VARCHAR(50);

-- Sales Potential Assessment (7 columns)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS sales_potential VARCHAR(20) DEFAULT 'LOW' CHECK (sales_potential IN ('LOW', 'MEDIUM', 'HIGH')),
  ADD COLUMN IF NOT EXISTS sales_potential_score DECIMAL(5,2) CHECK (sales_potential_score >= 0 AND sales_potential_score <= 100),
  ADD COLUMN IF NOT EXISTS sales_potential_updated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sales_pre_estimation_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sales_pre_estimation_value DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS sales_pre_estimation_currency VARCHAR(3) DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS salesman_notes TEXT;

-- Risk Assessment (6 columns)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
  ADD COLUMN IF NOT EXISTS risk_assessed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_acknowledged_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS risk_acknowledged_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN service_orders.external_sales_order_id IS 'External sales order ID from Pyxis/Tempo/SAP for bidirectional traceability';
COMMENT ON COLUMN service_orders.external_project_id IS 'External project ID from sales system';
COMMENT ON COLUMN service_orders.external_lead_id IS 'External lead/opportunity ID from sales system';
COMMENT ON COLUMN service_orders.external_system_source IS 'Source system: PYXIS, TEMPO, or SAP';

COMMENT ON COLUMN service_orders.sales_potential IS 'AI-predicted sales potential for TV/Quotation orders: LOW, MEDIUM, HIGH';
COMMENT ON COLUMN service_orders.sales_potential_score IS 'Sales potential confidence score (0-100)';
COMMENT ON COLUMN service_orders.sales_pre_estimation_id IS 'Link to pre-estimation from sales system';
COMMENT ON COLUMN service_orders.salesman_notes IS 'Salesman notes for NLP analysis in sales potential scoring';

COMMENT ON COLUMN service_orders.risk_level IS 'AI-assessed risk level: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN service_orders.risk_score IS 'Risk assessment score (0-100)';
COMMENT ON COLUMN service_orders.risk_factors IS 'Array of risk factors (JSON): factor, description, weight, severity';
COMMENT ON COLUMN service_orders.risk_acknowledged_by IS 'Operator who acknowledged HIGH/CRITICAL risk';
COMMENT ON COLUMN service_orders.risk_acknowledged_at IS 'Timestamp when risk was acknowledged';

-- =====================================================
-- PART 2: PROJECTS TABLE - Add v2.0 Columns
-- =====================================================

-- Project Ownership ("Pilote du Chantier") (4 columns)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS responsible_operator_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(20) DEFAULT 'AUTO' CHECK (assignment_mode IN ('AUTO', 'MANUAL')),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(100);

-- Add comments
COMMENT ON COLUMN projects.responsible_operator_id IS 'Responsible operator (Pilote du Chantier) for this project';
COMMENT ON COLUMN projects.assignment_mode IS 'Assignment mode: AUTO (workload-based) or MANUAL';
COMMENT ON COLUMN projects.assigned_at IS 'Timestamp when operator was assigned';
COMMENT ON COLUMN projects.assigned_by IS 'User ID or SYSTEM if auto-assigned';

-- =====================================================
-- PART 3: NEW TABLES
-- =====================================================

-- Table 1: External Reference Mappings (complex scenarios)
CREATE TABLE IF NOT EXISTS external_reference_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  external_system VARCHAR(50) NOT NULL,
  external_id VARCHAR(100) NOT NULL,
  reference_type VARCHAR(50) NOT NULL, -- 'SALES_ORDER', 'PROJECT', 'LEAD', 'CUSTOMER', etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(external_system, external_id, reference_type)
);

COMMENT ON TABLE external_reference_mappings IS 'Flexible external reference mapping for complex multi-system scenarios';

-- Table 2: Project Ownership History (audit trail)
CREATE TABLE IF NOT EXISTS project_ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  previous_operator_id UUID REFERENCES users(id),
  new_operator_id UUID NOT NULL REFERENCES users(id),
  changed_by VARCHAR(100) NOT NULL, -- User ID or 'SYSTEM'
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT
);

COMMENT ON TABLE project_ownership_history IS 'Audit trail of project ownership changes';

-- Table 3: Sales Pre-Estimations (from sales systems)
CREATE TABLE IF NOT EXISTS sales_pre_estimations (
  id VARCHAR(100) PRIMARY KEY,
  sales_system_id VARCHAR(50) NOT NULL,
  sales_system_source VARCHAR(50) NOT NULL, -- 'PYXIS', 'TEMPO', 'SAP'
  customer_id UUID NOT NULL,
  estimated_value DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  product_categories TEXT[], -- Array of product categories
  salesman_id VARCHAR(100),
  salesman_notes TEXT,
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
  valid_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sales_pre_estimations IS 'Pre-estimations from sales systems for TV/Quotation orders';

-- Table 4: Sales Potential Assessments History
CREATE TABLE IF NOT EXISTS sales_potential_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  potential VARCHAR(20) NOT NULL CHECK (potential IN ('LOW', 'MEDIUM', 'HIGH')),
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  reasoning JSONB, -- Array of reasoning strings
  feature_importance JSONB, -- Array of {feature, contribution} objects
  model_version VARCHAR(50),
  assessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sales_potential_assessments IS 'History of AI sales potential assessments';

-- Table 5: Risk Assessments History
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  risk_factors JSONB NOT NULL, -- Array of {factor, description, weight, severity} objects
  recommended_actions JSONB, -- Array of action strings
  triggered_by VARCHAR(50) NOT NULL, -- 'BATCH_JOB', 'EVENT_CLAIM_FILED', etc.
  model_version VARCHAR(50),
  assessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE risk_assessments IS 'History of AI risk assessments';

-- Table 6: Operator Workload Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS operator_workload AS
SELECT
  p.responsible_operator_id AS operator_id,
  COUNT(DISTINCT p.id) AS total_projects,
  COUNT(DISTINCT so.id) AS total_service_orders,
  SUM(so.estimated_duration_minutes) / 60.0 AS total_workload_hours,
  AVG(CASE
    WHEN so.risk_level = 'CRITICAL' THEN 4
    WHEN so.risk_level = 'HIGH' THEN 3
    WHEN so.risk_level = 'MEDIUM' THEN 2
    ELSE 1
  END) AS avg_risk_score,
  COUNT(CASE WHEN so.sales_potential = 'HIGH' THEN 1 END) AS high_potential_count
FROM projects p
LEFT JOIN service_orders so ON so.project_id = p.id
WHERE so.status NOT IN ('CANCELLED', 'COMPLETED', 'CLOSED')
  AND p.responsible_operator_id IS NOT NULL
GROUP BY p.responsible_operator_id;

COMMENT ON MATERIALIZED VIEW operator_workload IS 'Real-time operator workload metrics for auto-assignment (refresh every 5 minutes)';

-- Create unique index on materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_workload_operator_id ON operator_workload(operator_id);

-- =====================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =====================================================

-- External Reference Indexes
CREATE INDEX IF NOT EXISTS idx_so_external_sales_order
  ON service_orders(external_system_source, external_sales_order_id)
  WHERE external_sales_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_so_external_project
  ON service_orders(external_system_source, external_project_id)
  WHERE external_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_so_external_lead
  ON service_orders(external_system_source, external_lead_id)
  WHERE external_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_ref_mappings_lookup
  ON external_reference_mappings(external_system, external_id, reference_type);

-- Sales Potential Indexes
CREATE INDEX IF NOT EXISTS idx_so_sales_potential
  ON service_orders(sales_potential)
  WHERE service_type IN ('TV', 'QUOTATION');

CREATE INDEX IF NOT EXISTS idx_so_sales_pre_estimation
  ON service_orders(sales_pre_estimation_id)
  WHERE sales_pre_estimation_id IS NOT NULL;

-- Risk Assessment Indexes
CREATE INDEX IF NOT EXISTS idx_so_risk_level
  ON service_orders(risk_level)
  WHERE risk_level IN ('HIGH', 'CRITICAL');

CREATE INDEX IF NOT EXISTS idx_so_risk_unacknowledged
  ON service_orders(risk_level, risk_acknowledged_by)
  WHERE risk_level IN ('HIGH', 'CRITICAL') AND risk_acknowledged_by IS NULL;

-- Project Ownership Indexes
CREATE INDEX IF NOT EXISTS idx_projects_responsible_operator
  ON projects(responsible_operator_id)
  WHERE responsible_operator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_ownership_history_project
  ON project_ownership_history(project_id, changed_at DESC);

-- Composite Dashboard Indexes
CREATE INDEX IF NOT EXISTS idx_so_dashboard_risk_potential
  ON service_orders(risk_level, sales_potential, status, scheduled_date)
  WHERE service_type IN ('TV', 'QUOTATION', 'INSTALLATION');

CREATE INDEX IF NOT EXISTS idx_so_dashboard_operator_risk
  ON service_orders(status, risk_level, scheduled_date)
  WHERE risk_level IN ('MEDIUM', 'HIGH', 'CRITICAL');

-- History Table Indexes
CREATE INDEX IF NOT EXISTS idx_sales_potential_assessments_so
  ON sales_potential_assessments(service_order_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_so
  ON risk_assessments(service_order_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_triggered
  ON risk_assessments(triggered_by, assessed_at DESC);

-- =====================================================
-- PART 5: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to refresh operator workload materialized view
CREATE OR REPLACE FUNCTION refresh_operator_workload()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY operator_workload;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_operator_workload() IS 'Refresh operator workload materialized view (called every 5 minutes by cron)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for external_reference_mappings
DROP TRIGGER IF EXISTS update_external_reference_mappings_updated_at ON external_reference_mappings;
CREATE TRIGGER update_external_reference_mappings_updated_at
  BEFORE UPDATE ON external_reference_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sales_pre_estimations
DROP TRIGGER IF EXISTS update_sales_pre_estimations_updated_at ON sales_pre_estimations;
CREATE TRIGGER update_sales_pre_estimations_updated_at
  BEFORE UPDATE ON sales_pre_estimations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 6: SCHEDULED JOBS (via pg_cron extension)
-- =====================================================

-- Note: Requires pg_cron extension to be enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule operator workload refresh every 5 minutes
-- SELECT cron.schedule('refresh-operator-workload', '*/5 * * * *', 'SELECT refresh_operator_workload()');

-- =====================================================
-- PART 7: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE external_reference_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_pre_estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_potential_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see data for their country/BU
CREATE POLICY external_ref_tenant_isolation ON external_reference_mappings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = service_order_id
        AND so.country_code = current_setting('app.current_country', TRUE)
    )
  );

CREATE POLICY project_ownership_tenant_isolation ON project_ownership_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.country_code = current_setting('app.current_country', TRUE)
    )
  );

CREATE POLICY sales_pre_est_tenant_isolation ON sales_pre_estimations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_id
        AND c.country_code = current_setting('app.current_country', TRUE)
    )
  );

CREATE POLICY sales_potential_tenant_isolation ON sales_potential_assessments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = service_order_id
        AND so.country_code = current_setting('app.current_country', TRUE)
    )
  );

CREATE POLICY risk_assessment_tenant_isolation ON risk_assessments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = service_order_id
        AND so.country_code = current_setting('app.current_country', TRUE)
    )
  );

-- =====================================================
-- PART 8: DATA VALIDATION CONSTRAINTS
-- =====================================================

-- Constraint: Sales potential only for TV/QUOTATION service types
ALTER TABLE service_orders
  ADD CONSTRAINT chk_sales_potential_service_type
  CHECK (
    (sales_potential IS NULL AND sales_potential_score IS NULL)
    OR
    (service_type IN ('TV', 'QUOTATION'))
  );

-- Constraint: Risk acknowledgment only for HIGH/CRITICAL risk
ALTER TABLE service_orders
  ADD CONSTRAINT chk_risk_acknowledgment
  CHECK (
    (risk_acknowledged_by IS NULL AND risk_acknowledged_at IS NULL)
    OR
    (risk_level IN ('HIGH', 'CRITICAL') AND risk_acknowledged_by IS NOT NULL AND risk_acknowledged_at IS NOT NULL)
  );

-- Constraint: Project must have responsible operator if assignment_mode is set
ALTER TABLE projects
  ADD CONSTRAINT chk_project_ownership
  CHECK (
    (assignment_mode IS NULL)
    OR
    (responsible_operator_id IS NOT NULL)
  );

-- =====================================================
-- PART 9: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to application role (adjust role name as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON external_reference_mappings TO fsm_app_role;
GRANT SELECT, INSERT ON project_ownership_history TO fsm_app_role;
GRANT SELECT, INSERT, UPDATE ON sales_pre_estimations TO fsm_app_role;
GRANT SELECT, INSERT ON sales_potential_assessments TO fsm_app_role;
GRANT SELECT, INSERT ON risk_assessments TO fsm_app_role;
GRANT SELECT ON operator_workload TO fsm_app_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fsm_app_role;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Verification queries (comment out in production)
/*
-- Verify service_orders columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'service_orders'
  AND column_name LIKE '%external%' OR column_name LIKE '%sales_%' OR column_name LIKE '%risk_%'
ORDER BY ordinal_position;

-- Verify projects columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name LIKE '%responsible%' OR column_name LIKE '%assignment%'
ORDER BY ordinal_position;

-- Verify new tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'external_reference_mappings',
    'project_ownership_history',
    'sales_pre_estimations',
    'sales_potential_assessments',
    'risk_assessments'
  );

-- Verify materialized view
SELECT schemaname, matviewname, definition
FROM pg_matviews
WHERE matviewname = 'operator_workload';

-- Verify indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%external%'
    OR indexname LIKE '%sales%'
    OR indexname LIKE '%risk%'
    OR indexname LIKE '%operator%'
  )
ORDER BY tablename, indexname;

-- Count rows (should be 0 initially)
SELECT
  (SELECT COUNT(*) FROM external_reference_mappings) AS ext_refs,
  (SELECT COUNT(*) FROM project_ownership_history) AS ownership_history,
  (SELECT COUNT(*) FROM sales_pre_estimations) AS pre_estimations,
  (SELECT COUNT(*) FROM sales_potential_assessments) AS potential_assessments,
  (SELECT COUNT(*) FROM risk_assessments) AS risk_assessments;
*/
