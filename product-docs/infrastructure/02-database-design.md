# Database Design

## Executive Summary

This document provides comprehensive database architecture, schema design, indexing strategies, partitioning approaches, and Row-Level Security (RLS) implementation for PostgreSQL 15.4 with high availability and performance optimization.

## Table of Contents

1. [Database Architecture](#database-architecture)
2. [Schema Design](#schema-design)
3. [Indexing Strategy](#indexing-strategy)
4. [Partitioning Strategy](#partitioning-strategy)
5. [Row-Level Security (RLS)](#row-level-security-rls)
6. [Replication and Sharding](#replication-and-sharding)
7. [Performance Optimization](#performance-optimization)
8. [Backup and Recovery](#backup-and-recovery)

---

## Database Architecture

### RDS PostgreSQL Configuration

```hcl
# modules/database/rds-postgres/main.tf
resource "aws_db_parameter_group" "postgres" {
  name   = "${var.environment}-postgres-params"
  family = "postgres15"

  # Connection and Authentication
  parameter {
    name  = "max_connections"
    value = "500"
  }

  # Memory Configuration
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}" # 25% of instance memory
  }

  parameter {
    name  = "effective_cache_size"
    value = "{DBInstanceClassMemory*3/4096}" # 75% of instance memory
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "2097152" # 2GB in KB
  }

  parameter {
    name  = "work_mem"
    value = "16384" # 16MB in KB
  }

  # Write Ahead Log
  parameter {
    name  = "wal_buffers"
    value = "16384" # 16MB in 8KB blocks
  }

  parameter {
    name  = "checkpoint_timeout"
    value = "900" # 15 minutes
  }

  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }

  # Query Planner
  parameter {
    name  = "random_page_cost"
    value = "1.1" # SSD optimized
  }

  parameter {
    name  = "effective_io_concurrency"
    value = "200" # For SSD
  }

  # Logging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries > 1 second
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  # Auto Vacuum
  parameter {
    name  = "autovacuum_max_workers"
    value = "4"
  }

  parameter {
    name  = "autovacuum_naptime"
    value = "30" # 30 seconds
  }

  # Replication
  parameter {
    name  = "max_wal_senders"
    value = "10"
  }

  parameter {
    name  = "wal_keep_size"
    value = "1024" # 1GB in MB
  }

  tags = {
    Name        = "${var.environment}-postgres-params"
    Environment = var.environment
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "15.4"

  # Instance Configuration
  instance_class = var.instance_class # db.r6g.2xlarge for production

  # Storage Configuration
  allocated_storage     = 100  # Initial 100 GB
  max_allocated_storage = 1000 # Auto-scale to 1 TB
  storage_type          = "gp3"
  iops                  = 12000
  storage_throughput    = 500
  storage_encrypted     = true
  kms_key_id           = var.kms_key_id

  # Database Configuration
  db_name  = var.database_name
  username = var.master_username
  password = var.master_password # Use AWS Secrets Manager
  port     = 5432

  # Parameter and Option Groups
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Network Configuration
  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false

  # Backup Configuration
  backup_retention_period   = 30
  backup_window            = "03:00-04:00"
  maintenance_window       = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot    = true
  delete_automated_backups = false

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval            = 60
  monitoring_role_arn           = var.monitoring_role_arn
  performance_insights_enabled   = true
  performance_insights_retention_period = 7

  # High Availability
  auto_minor_version_upgrade = true
  deletion_protection       = var.environment == "production"
  skip_final_snapshot      = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  tags = {
    Name        = "${var.environment}-postgres"
    Environment = var.environment
  }
}

# Read Replicas
resource "aws_db_instance" "postgres_replica" {
  count              = var.read_replica_count
  identifier         = "${var.environment}-postgres-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.postgres.identifier

  instance_class = var.replica_instance_class

  # Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = var.monitoring_role_arn

  # No backups for replicas
  backup_retention_period = 0

  auto_minor_version_upgrade = true

  tags = {
    Name        = "${var.environment}-postgres-replica-${count.index + 1}"
    Environment = var.environment
    Role        = "ReadReplica"
  }
}
```

---

## Schema Design

### Core Tables Schema

```sql
-- ============================================================================
-- DATABASE INITIALIZATION
-- ============================================================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- For exclusion constraints

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================================
-- AUTHENTICATION SCHEMA
-- ============================================================================

-- Users table
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(50),
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    locale VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User roles
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User role assignments
CREATE TABLE auth.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- Sessions
CREATE TABLE auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255),
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE auth.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE auth.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- APPLICATION SCHEMA
-- ============================================================================

-- Organizations
CREATE TABLE app.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    industry VARCHAR(100),
    size VARCHAR(50),
    settings JSONB DEFAULT '{}'::jsonb,
    billing_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'deleted')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Organization members
CREATE TABLE app.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
    UNIQUE(organization_id, user_id)
);

-- Projects
CREATE TABLE app.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'public')),
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, slug)
);

-- Tasks (partitioned by created_at)
CREATE TABLE app.tasks (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
    parent_task_id UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assignee_id UUID REFERENCES auth.users(id),
    reporter_id UUID REFERENCES auth.users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Task partitions (monthly)
CREATE TABLE app.tasks_2024_01 PARTITION OF app.tasks
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE app.tasks_2024_02 PARTITION OF app.tasks
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE app.tasks_2024_03 PARTITION OF app.tasks
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Add more partitions as needed...

-- Comments
CREATE TABLE app.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES app.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions UUID[],
    attachments JSONB DEFAULT '[]'::jsonb,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Attachments
CREATE TABLE app.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID,
    comment_id UUID REFERENCES app.comments(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 's3',
    checksum VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CHECK (task_id IS NOT NULL OR comment_id IS NOT NULL)
);

-- Notifications
CREATE TABLE app.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Notification partitions (monthly)
CREATE TABLE app.notifications_2024_01 PARTITION OF app.notifications
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE app.notifications_2024_02 PARTITION OF app.notifications
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ============================================================================
-- ANALYTICS SCHEMA
-- ============================================================================

-- Events (high-volume, time-series data)
CREATE TABLE analytics.events (
    id BIGSERIAL NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES app.organizations(id),
    session_id UUID,
    properties JSONB DEFAULT '{}'::jsonb,
    context JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Event partitions (daily for high volume)
CREATE TABLE analytics.events_2024_01_01 PARTITION OF analytics.events
    FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');

CREATE TABLE analytics.events_2024_01_02 PARTITION OF analytics.events
    FOR VALUES FROM ('2024-01-02') TO ('2024-01-03');

-- Page views
CREATE TABLE analytics.page_views (
    id BIGSERIAL NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    url TEXT NOT NULL,
    referrer TEXT,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ============================================================================
-- AUDIT SCHEMA
-- ============================================================================

-- Audit log (immutable, append-only)
CREATE TABLE audit.audit_log (
    id BIGSERIAL NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Audit log partitions (monthly)
CREATE TABLE audit.audit_log_2024_01 PARTITION OF audit.audit_log
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit.audit_log_2024_02 PARTITION OF audit.audit_log
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Project statistics (refreshed periodically)
CREATE MATERIALIZED VIEW analytics.project_stats AS
SELECT
    p.id AS project_id,
    p.name AS project_name,
    p.organization_id,
    COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) AS in_progress_tasks,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) AS todo_tasks,
    AVG(CASE WHEN t.status = 'done' AND t.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600
        END) AS avg_completion_time_hours,
    MAX(t.updated_at) AS last_activity_at
FROM app.projects p
LEFT JOIN app.tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.organization_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON analytics.project_stats (project_id);

-- User activity summary
CREATE MATERIALIZED VIEW analytics.user_activity_stats AS
SELECT
    u.id AS user_id,
    u.email,
    COUNT(DISTINCT t.id) AS tasks_assigned,
    COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS tasks_completed,
    COUNT(DISTINCT c.id) AS comments_created,
    MAX(u.last_login_at) AS last_login_at,
    COUNT(DISTINCT DATE(c.created_at)) AS active_days_last_30
FROM auth.users u
LEFT JOIN app.tasks t ON u.id = t.assignee_id AND t.deleted_at IS NULL
LEFT JOIN app.comments c ON u.id = c.user_id AND c.deleted_at IS NULL AND c.created_at > NOW() - INTERVAL '30 days'
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email;

CREATE UNIQUE INDEX ON analytics.user_activity_stats (user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER set_timestamp BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON auth.roles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON app.organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON app.projects
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON app.tasks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp BEFORE UPDATE ON app.comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Audit log trigger function
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.audit_log (table_name, record_id, action, user_id, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', current_setting('app.current_user_id', TRUE)::UUID, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.audit_log (table_name, record_id, action, user_id, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', current_setting('app.current_user_id', TRUE)::UUID, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_log (table_name, record_id, action, user_id, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', current_setting('app.current_user_id', TRUE)::UUID, row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_organizations AFTER INSERT OR UPDATE OR DELETE ON app.organizations
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON app.projects
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();
```

---

## Indexing Strategy

### Performance-Optimized Indexes

```sql
-- ============================================================================
-- AUTH SCHEMA INDEXES
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON auth.users USING btree (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON auth.users USING btree (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON auth.users USING btree (created_at DESC);
CREATE INDEX idx_users_last_login ON auth.users USING btree (last_login_at DESC NULLS LAST);

-- Full-text search on user names
CREATE INDEX idx_users_fulltext ON auth.users USING gin (
    to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, ''))
);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON auth.sessions USING btree (user_id);
CREATE INDEX idx_sessions_token_hash ON auth.sessions USING hash (token_hash);
CREATE INDEX idx_sessions_expires_at ON auth.sessions USING btree (expires_at);
CREATE INDEX idx_sessions_last_activity ON auth.sessions USING btree (last_activity_at DESC);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON auth.user_roles USING btree (user_id);
CREATE INDEX idx_user_roles_role_id ON auth.user_roles USING btree (role_id);
CREATE INDEX idx_user_roles_expires_at ON auth.user_roles USING btree (expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- APP SCHEMA INDEXES
-- ============================================================================

-- Organizations indexes
CREATE INDEX idx_organizations_slug ON app.organizations USING btree (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_status ON app.organizations USING btree (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_created_by ON app.organizations USING btree (created_by);
CREATE INDEX idx_organizations_trial_ends ON app.organizations USING btree (trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Full-text search on organizations
CREATE INDEX idx_organizations_fulltext ON app.organizations USING gin (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- Organization members indexes
CREATE INDEX idx_org_members_org_id ON app.organization_members USING btree (organization_id);
CREATE INDEX idx_org_members_user_id ON app.organization_members USING btree (user_id);
CREATE INDEX idx_org_members_role ON app.organization_members USING btree (role);
CREATE INDEX idx_org_members_status ON app.organization_members USING btree (status);

-- Projects indexes
CREATE INDEX idx_projects_org_id ON app.projects USING btree (organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_slug ON app.projects USING btree (slug);
CREATE INDEX idx_projects_status ON app.projects USING btree (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_created_by ON app.projects USING btree (created_by);
CREATE INDEX idx_projects_visibility ON app.projects USING btree (visibility);
CREATE INDEX idx_projects_dates ON app.projects USING btree (start_date, end_date);

-- Full-text search on projects
CREATE INDEX idx_projects_fulltext ON app.projects USING gin (
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- Tasks indexes (note: applied to each partition)
CREATE INDEX idx_tasks_project_id ON app.tasks USING btree (project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee_id ON app.tasks USING btree (assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_reporter_id ON app.tasks USING btree (reporter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON app.tasks USING btree (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON app.tasks USING btree (priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON app.tasks USING btree (due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_parent_task ON app.tasks USING btree (parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_tasks_project_status_priority ON app.tasks
    USING btree (project_id, status, priority DESC)
    WHERE deleted_at IS NULL;

-- Full-text search on tasks
CREATE INDEX idx_tasks_fulltext ON app.tasks USING gin (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- GIN index for array columns
CREATE INDEX idx_tasks_tags ON app.tasks USING gin (tags);

-- JSONB indexes for metadata queries
CREATE INDEX idx_tasks_metadata ON app.tasks USING gin (metadata);

-- Comments indexes
CREATE INDEX idx_comments_task_id ON app.comments USING btree (task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user_id ON app.comments USING btree (user_id);
CREATE INDEX idx_comments_parent_id ON app.comments USING btree (parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_created_at ON app.comments USING btree (created_at DESC);

-- Full-text search on comments
CREATE INDEX idx_comments_fulltext ON app.comments USING gin (
    to_tsvector('english', content)
);

-- Attachments indexes
CREATE INDEX idx_attachments_task_id ON app.attachments USING btree (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_attachments_comment_id ON app.attachments USING btree (comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_attachments_uploaded_by ON app.attachments USING btree (uploaded_by);
CREATE INDEX idx_attachments_mime_type ON app.attachments USING btree (mime_type);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON app.notifications USING btree (user_id);
CREATE INDEX idx_notifications_is_read ON app.notifications USING btree (is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON app.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_type ON app.notifications USING btree (type);

-- Composite index for unread notifications
CREATE INDEX idx_notifications_user_unread ON app.notifications
    USING btree (user_id, created_at DESC)
    WHERE is_read = FALSE;

-- ============================================================================
-- ANALYTICS SCHEMA INDEXES
-- ============================================================================

-- Events indexes
CREATE INDEX idx_events_type ON analytics.events USING btree (event_type);
CREATE INDEX idx_events_user_id ON analytics.events USING btree (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_org_id ON analytics.events USING btree (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_events_session_id ON analytics.events USING btree (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_events_created_at ON analytics.events USING btree (created_at DESC);

-- JSONB indexes for event properties
CREATE INDEX idx_events_properties ON analytics.events USING gin (properties);

-- Page views indexes
CREATE INDEX idx_page_views_user_id ON analytics.page_views USING btree (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_page_views_session_id ON analytics.page_views USING btree (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_page_views_url ON analytics.page_views USING btree (url);
CREATE INDEX idx_page_views_created_at ON analytics.page_views USING btree (created_at DESC);

-- ============================================================================
-- AUDIT SCHEMA INDEXES
-- ============================================================================

-- Audit log indexes
CREATE INDEX idx_audit_table_record ON audit.audit_log USING btree (table_name, record_id);
CREATE INDEX idx_audit_user_id ON audit.audit_log USING btree (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_action ON audit.audit_log USING btree (action);
CREATE INDEX idx_audit_created_at ON audit.audit_log USING btree (created_at DESC);

-- JSONB indexes for changed values
CREATE INDEX idx_audit_new_values ON audit.audit_log USING gin (new_values);
CREATE INDEX idx_audit_old_values ON audit.audit_log USING gin (old_values);
```

---

## Partitioning Strategy

### Automated Partition Management

```sql
-- ============================================================================
-- PARTITION MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to create future partitions
CREATE OR REPLACE FUNCTION create_partition(
    parent_table TEXT,
    partition_name TEXT,
    start_date DATE,
    end_date DATE
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        parent_table,
        start_date,
        end_date
    );

    RAISE NOTICE 'Created partition % for table %', partition_name, parent_table;
END;
$$ LANGUAGE plpgsql;

-- Function to create monthly partitions for the next N months
CREATE OR REPLACE FUNCTION create_monthly_partitions(
    schema_name TEXT,
    table_name TEXT,
    months_ahead INTEGER DEFAULT 6
)
RETURNS VOID AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..months_ahead LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := format('%s.%s_%s',
            schema_name,
            table_name,
            TO_CHAR(start_date, 'YYYY_MM')
        );

        PERFORM create_partition(
            schema_name || '.' || table_name,
            partition_name,
            start_date,
            end_date
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(
    schema_name TEXT,
    table_name TEXT,
    retention_months INTEGER DEFAULT 24
)
RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' months')::INTERVAL);

    FOR partition_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = schema_name
        AND tablename LIKE table_name || '_%'
        AND tablename < table_name || '_' || TO_CHAR(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.%I', partition_record.schemaname, partition_record.tablename);
        RAISE NOTICE 'Dropped old partition %', partition_record.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job to maintain partitions (run monthly via pg_cron or external scheduler)
CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS VOID AS $$
BEGIN
    -- Create future partitions for tasks
    PERFORM create_monthly_partitions('app', 'tasks', 6);

    -- Create future partitions for notifications
    PERFORM create_monthly_partitions('app', 'notifications', 6);

    -- Create future partitions for audit log
    PERFORM create_monthly_partitions('audit', 'audit_log', 6);

    -- Create daily partitions for events (next 90 days)
    FOR i IN 0..90 LOOP
        PERFORM create_partition(
            'analytics.events',
            'analytics.events_' || TO_CHAR(CURRENT_DATE + i, 'YYYY_MM_DD'),
            CURRENT_DATE + i,
            CURRENT_DATE + i + 1
        );
    END LOOP;

    -- Drop old partitions beyond retention period
    PERFORM drop_old_partitions('app', 'tasks', 24);
    PERFORM drop_old_partitions('app', 'notifications', 6);
    PERFORM drop_old_partitions('audit', 'audit_log', 24);
    PERFORM drop_old_partitions('analytics', 'events', 12);

    RAISE NOTICE 'Partition maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Row-Level Security (RLS)

### Comprehensive RLS Policies

```sql
-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Get current user ID from session
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user has role
CREATE OR REPLACE FUNCTION auth.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth.user_roles ur
        JOIN auth.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.current_user_id()
        AND r.name = role_name
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION app.is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM app.organization_members
        WHERE organization_id = org_id
        AND user_id = auth.current_user_id()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user's organization role
CREATE OR REPLACE FUNCTION app.get_organization_role(org_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role
        FROM app.organization_members
        WHERE organization_id = org_id
        AND user_id = auth.current_user_id()
        AND status = 'active'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has access to project
CREATE OR REPLACE FUNCTION app.can_access_project(proj_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    org_id UUID;
    project_visibility TEXT;
BEGIN
    SELECT organization_id, visibility
    INTO org_id, project_visibility
    FROM app.projects
    WHERE id = proj_id;

    -- Public projects accessible to all
    IF project_visibility = 'public' THEN
        RETURN TRUE;
    END IF;

    -- Organization projects accessible to org members
    IF project_visibility = 'organization' AND app.is_organization_member(org_id) THEN
        RETURN TRUE;
    END IF;

    -- Private projects only accessible to org members
    IF project_visibility = 'private' AND app.is_organization_member(org_id) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Users: Can only see themselves unless admin
CREATE POLICY users_select_policy ON auth.users
    FOR SELECT
    USING (
        id = auth.current_user_id()
        OR auth.has_role('admin')
        OR EXISTS (
            SELECT 1 FROM app.organization_members om
            WHERE om.user_id = auth.users.id
            AND om.organization_id IN (
                SELECT organization_id FROM app.organization_members
                WHERE user_id = auth.current_user_id()
            )
        )
    );

CREATE POLICY users_update_policy ON auth.users
    FOR UPDATE
    USING (id = auth.current_user_id() OR auth.has_role('admin'))
    WITH CHECK (id = auth.current_user_id() OR auth.has_role('admin'));

-- Organizations: Members can see their organizations
CREATE POLICY organizations_select_policy ON app.organizations
    FOR SELECT
    USING (
        app.is_organization_member(id)
        OR auth.has_role('admin')
    );

CREATE POLICY organizations_update_policy ON app.organizations
    FOR UPDATE
    USING (
        app.get_organization_role(id) IN ('owner', 'admin')
        OR auth.has_role('admin')
    );

CREATE POLICY organizations_delete_policy ON app.organizations
    FOR DELETE
    USING (
        app.get_organization_role(id) = 'owner'
        OR auth.has_role('admin')
    );

-- Projects: Based on visibility and organization membership
CREATE POLICY projects_select_policy ON app.projects
    FOR SELECT
    USING (
        visibility = 'public'
        OR (visibility = 'organization' AND app.is_organization_member(organization_id))
        OR (visibility = 'private' AND app.is_organization_member(organization_id))
        OR auth.has_role('admin')
    );

CREATE POLICY projects_insert_policy ON app.projects
    FOR INSERT
    WITH CHECK (
        app.is_organization_member(organization_id)
        AND created_by = auth.current_user_id()
    );

CREATE POLICY projects_update_policy ON app.projects
    FOR UPDATE
    USING (
        app.is_organization_member(organization_id)
        AND app.get_organization_role(organization_id) IN ('owner', 'admin', 'member')
    );

CREATE POLICY projects_delete_policy ON app.projects
    FOR DELETE
    USING (
        app.get_organization_role(organization_id) IN ('owner', 'admin')
    );

-- Tasks: Can access if can access project
CREATE POLICY tasks_select_policy ON app.tasks
    FOR SELECT
    USING (
        app.can_access_project(project_id)
        OR auth.has_role('admin')
    );

CREATE POLICY tasks_insert_policy ON app.tasks
    FOR INSERT
    WITH CHECK (
        app.can_access_project(project_id)
        AND reporter_id = auth.current_user_id()
    );

CREATE POLICY tasks_update_policy ON app.tasks
    FOR UPDATE
    USING (
        app.can_access_project(project_id)
        AND (
            assignee_id = auth.current_user_id()
            OR reporter_id = auth.current_user_id()
            OR app.get_organization_role(
                (SELECT organization_id FROM app.projects WHERE id = project_id)
            ) IN ('owner', 'admin')
        )
    );

CREATE POLICY tasks_delete_policy ON app.tasks
    FOR DELETE
    USING (
        app.can_access_project(project_id)
        AND (
            reporter_id = auth.current_user_id()
            OR app.get_organization_role(
                (SELECT organization_id FROM app.projects WHERE id = project_id)
            ) IN ('owner', 'admin')
        )
    );

-- Comments: Can access if can access task
CREATE POLICY comments_select_policy ON app.comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM app.tasks t
            WHERE t.id = comments.task_id
            AND app.can_access_project(t.project_id)
        )
    );

CREATE POLICY comments_insert_policy ON app.comments
    FOR INSERT
    WITH CHECK (
        user_id = auth.current_user_id()
        AND EXISTS (
            SELECT 1 FROM app.tasks t
            WHERE t.id = task_id
            AND app.can_access_project(t.project_id)
        )
    );

CREATE POLICY comments_update_policy ON app.comments
    FOR UPDATE
    USING (
        user_id = auth.current_user_id()
    );

CREATE POLICY comments_delete_policy ON app.comments
    FOR DELETE
    USING (
        user_id = auth.current_user_id()
        OR auth.has_role('admin')
    );

-- Notifications: Users can only see their own
CREATE POLICY notifications_select_policy ON app.notifications
    FOR SELECT
    USING (user_id = auth.current_user_id());

CREATE POLICY notifications_update_policy ON app.notifications
    FOR UPDATE
    USING (user_id = auth.current_user_id());
```

---

## Replication and Sharding

### Read Replica Configuration

```hcl
# Terraform configuration for read replicas
resource "aws_db_instance" "postgres_read_replica" {
  count = 3

  identifier          = "${var.environment}-postgres-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.postgres.identifier

  # Use smaller instance class for read replicas
  instance_class = "db.r6g.xlarge"

  # Enable Performance Insights
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Enhanced Monitoring
  monitoring_interval = 60
  monitoring_role_arn = var.monitoring_role_arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Place in different AZs for HA
  availability_zone = element(var.availability_zones, count.index)

  tags = {
    Name        = "${var.environment}-postgres-replica-${count.index + 1}"
    Environment = var.environment
    Role        = "ReadReplica"
    AZ          = element(var.availability_zones, count.index)
  }
}

# Application-side read replica routing
output "read_replica_endpoints" {
  value = aws_db_instance.postgres_read_replica[*].endpoint
}
```

### Connection Pooling with PgBouncer

```ini
; pgbouncer.ini
[databases]
production = host=postgres-primary.abc123.us-east-1.rds.amazonaws.com port=5432 dbname=production
production_ro = host=postgres-replica-1.abc123.us-east-1.rds.amazonaws.com port=5432 dbname=production

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Connection pool settings
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 10
reserve_pool_timeout = 3

; Timeouts
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 15

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

; Performance
max_db_connections = 100
max_user_connections = 100
```

---

## Performance Optimization

### Query Performance Analysis

```sql
-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Find slow queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Find missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
AND n_distinct > 100
AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Cache hit ratio
SELECT
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
FROM pg_statio_user_tables;
```

### Vacuum and Analyze Strategy

```sql
-- Autovacuum configuration per table
ALTER TABLE app.tasks SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE analytics.events SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 5
);

-- Manual maintenance commands
VACUUM ANALYZE app.tasks;
REINDEX TABLE CONCURRENTLY app.tasks;
```

---

## Backup and Recovery

### Automated Backup Scripts

```bash
#!/bin/bash
# backup-postgres.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/postgres"
RETENTION_DAYS=30
DB_HOST="postgres-primary.abc123.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="production"
DB_USER="backup_user"
S3_BUCKET="s3://prod-db-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Dump database
echo "Starting backup at $(date)"
pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} \
    -F custom -b -v -f ${BACKUP_DIR}/backup_${TIMESTAMP}.dump

# Compress backup
echo "Compressing backup..."
pigz -9 ${BACKUP_DIR}/backup_${TIMESTAMP}.dump

# Upload to S3
echo "Uploading to S3..."
aws s3 cp ${BACKUP_DIR}/backup_${TIMESTAMP}.dump.gz \
    ${S3_BUCKET}/daily/backup_${TIMESTAMP}.dump.gz \
    --storage-class STANDARD_IA

# Remove local backup
rm ${BACKUP_DIR}/backup_${TIMESTAMP}.dump.gz

# Clean up old backups
echo "Cleaning up old backups..."
find ${BACKUP_DIR} -name "*.dump.gz" -mtime +${RETENTION_DAYS} -delete

# Clean up old S3 backups
aws s3 ls ${S3_BUCKET}/daily/ | while read -r line; do
    createDate=$(echo $line | awk {'print $1" "$2'})
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "-${RETENTION_DAYS} days" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo $line | awk {'print $4'})
        if [[ $fileName != "" ]]; then
            aws s3 rm ${S3_BUCKET}/daily/$fileName
        fi
    fi
done

echo "Backup completed at $(date)"
```

### Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# restore-postgres-pitr.sh

set -e

# Configuration
RESTORE_TIME="2024-01-15 14:30:00 UTC"
DB_INSTANCE_ID="production-postgres"
SNAPSHOT_ID="automated-snapshot-2024-01-15"
RESTORED_INSTANCE_ID="production-postgres-restored-$(date +%Y%m%d%H%M%S)"

# Restore to point in time
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier ${DB_INSTANCE_ID} \
    --target-db-instance-identifier ${RESTORED_INSTANCE_ID} \
    --restore-time "${RESTORE_TIME}" \
    --db-instance-class db.r6g.2xlarge \
    --multi-az \
    --vpc-security-group-ids sg-0123456789abcdef \
    --db-subnet-group-name production-db-subnet-group

echo "Restore initiated. Instance ID: ${RESTORED_INSTANCE_ID}"
echo "Monitor progress with: aws rds describe-db-instances --db-instance-identifier ${RESTORED_INSTANCE_ID}"
```

---

## Summary

This database design provides a robust, scalable, and secure foundation for the application with:

- **High Performance**: Optimized indexes, partitioning, and query patterns
- **Security**: Comprehensive RLS policies and audit logging
- **Scalability**: Read replicas, connection pooling, and horizontal partitioning
- **Reliability**: Automated backups, PITR, and disaster recovery
- **Maintainability**: Automated partition management and vacuum strategies

### Key Metrics:

- **Expected Read QPS**: 50,000+
- **Expected Write QPS**: 10,000+
- **Data Retention**: 24 months (configurable per table)
- **Backup Retention**: 30 days daily, 12 months monthly
- **Recovery Point Objective (RPO)**: 5 minutes
- **Recovery Time Objective (RTO)**: 30 minutes
