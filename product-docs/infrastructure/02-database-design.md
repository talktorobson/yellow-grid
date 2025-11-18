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

### Cloud SQL PostgreSQL Configuration

```hcl
# modules/database/cloud-sql-postgres/main.tf
resource "google_sql_database_instance" "postgres" {
  name             = "${var.environment}-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    # Instance tier (db-custom-8-32768 = 8 vCPU, 32GB RAM for production)
    tier              = var.instance_tier
    availability_type = "REGIONAL" # Multi-zone HA
    disk_type         = "PD_SSD"
    disk_size         = 100  # Initial 100 GB
    disk_autoresize       = true
    disk_autoresize_limit = 1000 # Auto-scale to 1 TB

    # Database flags (PostgreSQL configuration)
    database_flags {
      name  = "max_connections"
      value = "500"
    }

    database_flags {
      name  = "shared_buffers"
      value = "8388608" # 8GB (25% of 32GB RAM) in 8KB blocks
    }

    database_flags {
      name  = "effective_cache_size"
      value = "25165824" # 24GB (75% of 32GB RAM) in 8KB blocks
    }

    database_flags {
      name  = "maintenance_work_mem"
      value = "2097152" # 2GB in KB
    }

    database_flags {
      name  = "work_mem"
      value = "16384" # 16MB in KB
    }

    database_flags {
      name  = "wal_buffers"
      value = "2048" # 16MB in 8KB blocks
    }

    database_flags {
      name  = "checkpoint_timeout"
      value = "900" # 15 minutes
    }

    database_flags {
      name  = "checkpoint_completion_target"
      value = "0.9"
    }

    database_flags {
      name  = "random_page_cost"
      value = "1.1" # SSD optimized
    }

    database_flags {
      name  = "effective_io_concurrency"
      value = "200" # For SSD
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000" # Log queries > 1 second
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }

    database_flags {
      name  = "autovacuum_max_workers"
      value = "4"
    }

    database_flags {
      name  = "autovacuum_naptime"
      value = "30" # 30 seconds
    }

    database_flags {
      name  = "max_wal_senders"
      value = "10"
    }

    database_flags {
      name  = "wal_keep_size"
      value = "1024" # 1GB in MB
    }

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00" # 3 AM UTC
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window
    maintenance_window {
      day          = 7 # Sunday
      hour         = 4 # 4 AM UTC
      update_track = "stable"
    }

    # IP configuration (Private IP only)
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
      require_ssl     = true
    }

    # Insights and monitoring
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  # Deletion protection
  deletion_protection = var.environment == "production" ? true : false
}

# Read Replicas
resource "google_sql_database_instance" "postgres_replica" {
  count                = var.read_replica_count
  name                 = "${var.environment}-postgres-replica-${count.index + 1}"
  database_version     = "POSTGRES_15"
  region               = var.replica_region
  master_instance_name = google_sql_database_instance.postgres.name

  replica_configuration {
    failover_target = false
  }

  settings {
    tier              = var.replica_instance_tier
    availability_type = "ZONAL" # Replicas don't need HA
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
      require_ssl     = true
    }

    insights_config {
      query_insights_enabled = true
    }
  }

  deletion_protection = false
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
    storage_provider VARCHAR(50) DEFAULT 'gcs',
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
resource "google_sql_database_instance" "postgres_read_replica" {
  count = 3

  name                 = "${var.environment}-postgres-replica-${count.index + 1}"
  database_version     = "POSTGRES_15"
  region               = var.replica_regions[count.index] # Distribute across regions
  master_instance_name = google_sql_database_instance.postgres.name

  replica_configuration {
    failover_target = false
  }

  settings {
    # Use smaller instance tier for read replicas
    tier              = "db-custom-4-16384" # 4 vCPU, 16GB RAM
    availability_type = "ZONAL" # Replicas don't need HA
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    # IP configuration (Private IP only)
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
      require_ssl     = true
    }

    # Query Insights enabled
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
    }
  }

  deletion_protection = false

  labels = {
    environment = var.environment
    role        = "read-replica"
    zone        = var.replica_regions[count.index]
  }
}

# Application-side read replica routing
output "read_replica_private_ips" {
  value = google_sql_database_instance.postgres_read_replica[*].private_ip_address
}

output "read_replica_connection_names" {
  value = google_sql_database_instance.postgres_read_replica[*].connection_name
}
```

### Connection Pooling with PgBouncer

```ini
; pgbouncer.ini
[databases]
production = host=10.2.0.3 port=5432 dbname=production
production_ro = host=10.2.0.4 port=5432 dbname=production

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
# backup-postgres.sh - GCS version

set -e

# Configuration
BACKUP_DIR="/var/backups/postgres"
RETENTION_DAYS=30
CLOUD_SQL_INSTANCE="production-postgres"
PROJECT_ID="your-gcp-project-id"
DB_NAME="production"
DB_USER="backup_user"
GCS_BUCKET="gs://prod-db-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Option 1: Export from Cloud SQL to GCS (serverless, recommended)
echo "Starting Cloud SQL export at $(date)"
gcloud sql export sql ${CLOUD_SQL_INSTANCE} \
    ${GCS_BUCKET}/daily/backup_${TIMESTAMP}.sql.gz \
    --database=${DB_NAME} \
    --project=${PROJECT_ID} \
    --offload

echo "Cloud SQL export completed at $(date)"

# Option 2: Manual pg_dump (if you need more control)
# Get Cloud SQL Proxy connection
# cloud_sql_proxy -instances=${PROJECT_ID}:europe-west1:${CLOUD_SQL_INSTANCE}=tcp:5432 &
# PROXY_PID=$!
# sleep 3

# Dump database
# echo "Starting manual backup at $(date)"
# pg_dump -h 127.0.0.1 -p 5432 -U ${DB_USER} -d ${DB_NAME} \
#     -F custom -b -v -f ${BACKUP_DIR}/backup_${TIMESTAMP}.dump

# Compress backup
# echo "Compressing backup..."
# pigz -9 ${BACKUP_DIR}/backup_${TIMESTAMP}.dump

# Upload to GCS
# echo "Uploading to GCS..."
# gsutil -o "GSUtil:parallel_composite_upload_threshold=150M" \
#     cp ${BACKUP_DIR}/backup_${TIMESTAMP}.dump.gz \
#     ${GCS_BUCKET}/daily/backup_${TIMESTAMP}.dump.gz

# Set storage class to NEARLINE for cost savings
# gsutil rewrite -s NEARLINE ${GCS_BUCKET}/daily/backup_${TIMESTAMP}.dump.gz

# Remove local backup
# rm ${BACKUP_DIR}/backup_${TIMESTAMP}.dump.gz

# Kill Cloud SQL Proxy
# kill $PROXY_PID

# Clean up old backups (manual backups only)
echo "Cleaning up old local backups..."
find ${BACKUP_DIR} -name "*.dump.gz" -mtime +${RETENTION_DAYS} -delete

# Clean up old GCS backups using lifecycle policy (recommended)
# Or manually with gsutil:
echo "Listing old GCS backups..."
gsutil ls -l ${GCS_BUCKET}/daily/ | awk '{print $2, $3}' | while read -r createDate fileName; do
    if [[ -n "$createDate" ]]; then
        createEpoch=$(date -d "$createDate" +%s 2>/dev/null || echo 0)
        olderThan=$(date -d "-${RETENTION_DAYS} days" +%s)
        if [[ $createEpoch -lt $olderThan && -n "$fileName" ]]; then
            echo "Deleting old backup: $fileName"
            gsutil rm "$fileName"
        fi
    fi
done

echo "Backup completed at $(date)"

# Recommended: Use GCS lifecycle policy instead of manual cleanup
# gsutil lifecycle set lifecycle.json ${GCS_BUCKET}
# Where lifecycle.json contains:
# {
#   "lifecycle": {
#     "rule": [{
#       "action": {"type": "Delete"},
#       "condition": {"age": 30}
#     }, {
#       "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
#       "condition": {"age": 7}
#     }]
#   }
# }
```

### Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# restore-postgres-pitr.sh - GCP Cloud SQL version

set -e

# Configuration
RESTORE_TIME="2024-01-15T14:30:00.000Z"
SOURCE_INSTANCE="production-postgres"
RESTORED_INSTANCE="production-postgres-restored-$(date +%Y%m%d%H%M%S)"
PROJECT_ID="your-gcp-project-id"
REGION="europe-west1"

# Cloud SQL PITR uses automated backups + transaction logs
# Restore to specific point in time (within transaction log retention period)
echo "Starting Point-in-Time Recovery..."
echo "Source: ${SOURCE_INSTANCE}"
echo "Target: ${RESTORED_INSTANCE}"
echo "Restore time: ${RESTORE_TIME}"

# Clone instance to a new instance at specific point in time
gcloud sql instances clone ${SOURCE_INSTANCE} ${RESTORED_INSTANCE} \
    --point-in-time="${RESTORE_TIME}" \
    --project=${PROJECT_ID} \
    --async

echo "PITR initiated. New instance: ${RESTORED_INSTANCE}"
echo ""
echo "Monitor progress with:"
echo "  gcloud sql operations list --instance=${RESTORED_INSTANCE} --project=${PROJECT_ID}"
echo ""
echo "Check instance status with:"
echo "  gcloud sql instances describe ${RESTORED_INSTANCE} --project=${PROJECT_ID}"
echo ""
echo "Once ready, get connection info:"
echo "  gcloud sql instances describe ${RESTORED_INSTANCE} --project=${PROJECT_ID} --format='value(connectionName)'"
echo ""
echo "To connect via Cloud SQL Proxy:"
echo "  cloud_sql_proxy -instances=${PROJECT_ID}:${REGION}:${RESTORED_INSTANCE}=tcp:5433"

# Alternative: Restore from specific backup
# LIST_BACKUPS="gcloud sql backups list --instance=${SOURCE_INSTANCE} --project=${PROJECT_ID}"
# BACKUP_ID="<backup-id-from-list>"
# gcloud sql backups restore ${BACKUP_ID} \
#     --backup-instance=${SOURCE_INSTANCE} \
#     --backup-id=${BACKUP_ID} \
#     --project=${PROJECT_ID}
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

---

## AHS FSM-Specific Schema: Sales Systems & Channels

**Added**: 2025-01-15
**Status**: Critical addition for multi-sales-system support

### Multi-Tenancy & Sales System Architecture

The AHS FSM platform must support multiple sales systems (Pyxis, Tempo, SAP) and multiple sales channels (store, web, call center, mobile, partner). This section extends the generic schema with FSM-specific tables.

### Country Management

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

CREATE INDEX idx_countries_is_active ON countries(is_active);
```

### Business Units & Stores

```sql
-- Business Units (Leroy Merlin, Brico Depot, etc.)
CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL REFERENCES countries(code),
  code VARCHAR(50) NOT NULL UNIQUE, -- 'LM_ES', 'BD_FR', etc.
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50), -- 'RETAIL', 'B2B', 'FRANCHISE'
  is_active BOOLEAN DEFAULT true,
  configuration JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(country_code, code)
);

CREATE INDEX idx_business_units_country_code ON business_units(country_code);
CREATE INDEX idx_business_units_is_active ON business_units(is_active);

-- Individual store locations
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  store_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address JSONB NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  operational_hours JSONB,
  configuration JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_unit_id, store_code)
);

CREATE INDEX idx_stores_business_unit_id ON stores(business_unit_id);
CREATE INDEX idx_stores_is_active ON stores(is_active);
CREATE INDEX idx_stores_search ON stores USING GIN(to_tsvector('simple', name || ' ' || (address->>'city')));
```

### Sales Systems Configuration

```sql
-- Sales systems (Pyxis, Tempo, SAP, etc.)
CREATE TABLE sales_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL, -- 'PYXIS', 'TEMPO', 'SAP_COMMERCE'
  vendor VARCHAR(100),
  description TEXT,
  api_base_url VARCHAR(500),
  api_version VARCHAR(20),
  authentication_type VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  supported_countries VARCHAR(2)[],
  configuration JSONB,
  data_mapping JSONB, -- Field mappings between sales system and FSM
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_systems_code ON sales_systems(code);
CREATE INDEX idx_sales_systems_is_active ON sales_systems(is_active);

-- Business Unit ↔ Sales System mapping
CREATE TABLE business_unit_sales_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  sales_system_id UUID NOT NULL REFERENCES sales_systems(id),
  is_primary BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_unit_id, sales_system_id)
);

CREATE INDEX idx_bu_sales_systems_bu_id ON business_unit_sales_systems(business_unit_id);
CREATE INDEX idx_bu_sales_systems_sales_system_id ON business_unit_sales_systems(sales_system_id);
CREATE INDEX idx_bu_sales_systems_is_primary ON business_unit_sales_systems(is_primary) WHERE is_primary = true;
```

### Service Orders with Sales Context

```sql
-- Service orders with multi-sales-system support
CREATE TABLE service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenancy
  country_code VARCHAR(2) NOT NULL REFERENCES countries(code),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  store_id UUID NOT NULL REFERENCES stores(id),

  -- Sales system context (CRITICAL FIELDS)
  sales_system_id UUID NOT NULL REFERENCES sales_systems(id),
  sales_channel VARCHAR(50) NOT NULL, -- 'IN_STORE', 'ONLINE', 'PHONE', 'PARTNER', 'B2B', 'MOBILE_APP'
  sales_order_id VARCHAR(255) NOT NULL, -- External sales system order ID
  sales_order_number VARCHAR(100), -- Human-readable order number
  sales_order_line_id VARCHAR(255), -- Line item ID if multiple services
  sales_order_metadata JSONB, -- Sales system-specific data

  -- Project and service details
  project_id UUID,
  service_type VARCHAR(50) NOT NULL,
  product_category VARCHAR(100),
  product_sku VARCHAR(100),
  product_name VARCHAR(500),

  -- Customer information
  customer_id UUID NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  service_address JSONB NOT NULL,

  -- Dates and status
  order_date TIMESTAMP NOT NULL,
  requested_date DATE,
  scheduled_date DATE,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(10), -- 'P1', 'P2'

  -- Financial
  order_value_cents INTEGER,
  service_fee_cents INTEGER,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- ====== NEW: External Sales System References (v2.0) ======
  external_sales_order_id VARCHAR(100), -- Original sales order ID from Pyxis/Tempo/SAP
  external_project_id VARCHAR(100),     -- Sales system's project/customer order grouping ID
  external_lead_id VARCHAR(100),        -- Original lead/opportunity ID
  external_system_source VARCHAR(50),   -- 'PYXIS', 'TEMPO', 'SAP', etc.

  -- ====== NEW: Sales Potential Assessment (v2.0) - TV/Quotation only ======
  sales_potential VARCHAR(20) DEFAULT 'LOW' CHECK (sales_potential IN ('LOW', 'MEDIUM', 'HIGH')),
  sales_potential_score DECIMAL(5,2),      -- 0.00-100.00
  sales_potential_updated_at TIMESTAMP,
  sales_pre_estimation_id VARCHAR(100),    -- Link to pre-estimation from sales system
  sales_pre_estimation_value DECIMAL(12,2),
  sales_pre_estimation_currency VARCHAR(3),
  salesman_notes TEXT,                     -- Notes from salesman (for NLP analysis)

  -- ====== NEW: Risk Assessment (v2.0) ======
  risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score DECIMAL(5,2),                 -- 0.00-100.00
  risk_assessed_at TIMESTAMP,
  risk_factors JSONB,                      -- Array of risk factor objects
  risk_acknowledged_by UUID REFERENCES users(id),
  risk_acknowledged_at TIMESTAMP,

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

-- Composite indexes
CREATE INDEX idx_service_orders_country_bu_store ON service_orders(country_code, business_unit_id, store_id);
CREATE INDEX idx_service_orders_sales_system_channel ON service_orders(sales_system_id, sales_channel);

-- Unique constraint: Same sales order cannot be duplicated per sales system
CREATE UNIQUE INDEX idx_service_orders_sales_order_unique ON service_orders(sales_system_id, sales_order_id, sales_order_line_id);

-- ====== NEW: Indexes for v2.0 Features ======

-- External reference lookups (composite for performance)
CREATE INDEX idx_so_external_sales_order ON service_orders(external_system_source, external_sales_order_id)
  WHERE external_sales_order_id IS NOT NULL;
CREATE INDEX idx_so_external_project ON service_orders(external_system_source, external_project_id)
  WHERE external_project_id IS NOT NULL;
CREATE INDEX idx_so_external_lead ON service_orders(external_system_source, external_lead_id)
  WHERE external_lead_id IS NOT NULL;

-- Sales potential queries (TV/Quotation only)
CREATE INDEX idx_so_sales_potential ON service_orders(sales_potential)
  WHERE service_type IN ('TV', 'QUOTATION');
CREATE INDEX idx_so_pre_estimation ON service_orders(sales_pre_estimation_id)
  WHERE sales_pre_estimation_id IS NOT NULL;

-- Risk assessment queries
CREATE INDEX idx_so_risk_level ON service_orders(risk_level)
  WHERE risk_level IN ('HIGH', 'CRITICAL');
CREATE INDEX idx_so_risk_assessed_at ON service_orders(risk_assessed_at);

-- Composite index for dashboard queries (risk + potential + status)
CREATE INDEX idx_so_dashboard_risk_potential ON service_orders(
  risk_level, sales_potential, status, scheduled_date
) WHERE service_type IN ('TV', 'QUOTATION', 'INSTALLATION');
```

### Sales Channel Configurations

```sql
-- Channel-specific business rules
CREATE TABLE sales_channel_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  sales_channel VARCHAR(50) NOT NULL,

  -- SLA overrides
  sla_p1_hours INTEGER,
  sla_p2_hours INTEGER,

  -- Pricing rules
  pricing_markup_percentage DECIMAL(5,2),
  discount_percentage DECIMAL(5,2),

  -- Scheduling preferences
  allow_same_day_scheduling BOOLEAN DEFAULT false,
  require_customer_confirmation BOOLEAN DEFAULT true,
  auto_assign BOOLEAN DEFAULT false,

  -- Notification preferences
  send_sms_notifications BOOLEAN DEFAULT true,
  send_email_notifications BOOLEAN DEFAULT true,
  notification_language VARCHAR(10),

  -- Business rules
  rules JSONB,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_unit_id, sales_channel)
);

CREATE INDEX idx_sales_channel_config_bu_id ON sales_channel_configurations(business_unit_id);
CREATE INDEX idx_sales_channel_config_channel ON sales_channel_configurations(sales_channel);
```

### Sales System Integration Events

```sql
-- Integration event tracking
CREATE TABLE sales_system_integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_system_id UUID NOT NULL REFERENCES sales_systems(id),
  event_type VARCHAR(100) NOT NULL, -- 'ORDER_RECEIVED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'SYNC_ERROR'
  sales_order_id VARCHAR(255),
  service_order_id UUID REFERENCES service_orders(id),
  status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILURE', 'PENDING', 'RETRY'
  payload JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_integration_events_sales_system_id ON sales_system_integration_events(sales_system_id);
CREATE INDEX idx_integration_events_event_type ON sales_system_integration_events(event_type);
CREATE INDEX idx_integration_events_status ON sales_system_integration_events(status);
CREATE INDEX idx_integration_events_sales_order_id ON sales_system_integration_events(sales_order_id);
CREATE INDEX idx_integration_events_created_at ON sales_system_integration_events(created_at);
```

### Query Examples

```sql
-- Get all service orders from Pyxis via online channel in Spain
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

-- Sales channel performance metrics
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

## v2.0 Feature Additions (2025-01-16)

### Projects Table (Project Ownership)

```sql
-- FSM Projects table (customer service projects)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(255) NOT NULL,
  customer_id UUID NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  business_unit_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,

  -- ====== NEW: Project Ownership ("Pilote du Chantier") ======
  responsible_operator_id UUID REFERENCES users(id),
  assignment_mode VARCHAR(20) CHECK (assignment_mode IN ('AUTO', 'MANUAL')),
  assigned_at TIMESTAMP,
  assigned_by VARCHAR(100), -- User ID or 'SYSTEM'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_responsible_operator ON projects(responsible_operator_id);
CREATE INDEX idx_projects_assignment_mode ON projects(assignment_mode);
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_country_bu ON projects(country_code, business_unit_id);
```

### Project Ownership History

```sql
CREATE TABLE project_ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  previous_operator_id UUID REFERENCES users(id),
  new_operator_id UUID REFERENCES users(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by VARCHAR(100) NOT NULL, -- User ID or 'SYSTEM'
  reason VARCHAR(255)
);

CREATE INDEX idx_ownership_history_project ON project_ownership_history(project_id);
CREATE INDEX idx_ownership_history_operator ON project_ownership_history(new_operator_id);
CREATE INDEX idx_ownership_history_changed_at ON project_ownership_history(changed_at DESC);
```

### Operator Workload (Materialized View)

```sql
CREATE MATERIALIZED VIEW operator_workload AS
SELECT
  p.responsible_operator_id AS operator_id,
  COUNT(DISTINCT p.id) AS total_projects,
  COUNT(so.id) AS total_service_orders,
  SUM(so.estimated_duration_minutes) AS total_workload_minutes,
  SUM(so.estimated_duration_minutes) / 60.0 AS total_workload_hours
FROM projects p
LEFT JOIN service_orders so ON so.project_id = p.id
WHERE so.status NOT IN ('CANCELLED', 'COMPLETED', 'CLOSED')
  AND p.status NOT IN ('CANCELLED', 'COMPLETED')
GROUP BY p.responsible_operator_id;

CREATE UNIQUE INDEX idx_operator_workload_operator ON operator_workload(operator_id);

-- Refresh strategy: Every 5 minutes
CREATE OR REPLACE FUNCTION refresh_operator_workload()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY operator_workload;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-operator-workload', '*/5 * * * *', 'SELECT refresh_operator_workload()');
```

### Sales Pre-Estimations

```sql
CREATE TABLE sales_pre_estimations (
  id VARCHAR(100) PRIMARY KEY, -- ID from sales system (Pyxis, Tempo, SAP)
  sales_system_id VARCHAR(50) NOT NULL, -- 'PYXIS', 'TEMPO', 'SAP'
  customer_id UUID NOT NULL,
  estimated_value DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  product_categories TEXT[] NOT NULL,
  created_at TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  salesman_id VARCHAR(100),
  salesman_notes TEXT,
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
  metadata JSONB
);

CREATE INDEX idx_pre_estimation_customer ON sales_pre_estimations(customer_id);
CREATE INDEX idx_pre_estimation_value ON sales_pre_estimations(estimated_value DESC);
CREATE INDEX idx_pre_estimation_system ON sales_pre_estimations(sales_system_id);
CREATE INDEX idx_pre_estimation_valid_until ON sales_pre_estimations(valid_until) WHERE valid_until IS NOT NULL;
```

### Sales Potential Assessments

```sql
CREATE TABLE sales_potential_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  assessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  potential_level VARCHAR(20) NOT NULL CHECK (potential_level IN ('LOW', 'MEDIUM', 'HIGH')),
  potential_score DECIMAL(5,2) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  input_features JSONB NOT NULL,
  contributing_factors JSONB NOT NULL
);

CREATE INDEX idx_potential_assessments_so ON sales_potential_assessments(service_order_id);
CREATE INDEX idx_potential_assessments_level ON sales_potential_assessments(potential_level, assessed_at);
CREATE INDEX idx_potential_assessments_assessed_at ON sales_potential_assessments(assessed_at DESC);
```

### Risk Assessments

```sql
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  assessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score DECIMAL(5,2) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  input_features JSONB NOT NULL,
  risk_factors JSONB NOT NULL, -- Array of RiskFactor objects
  triggered_by VARCHAR(50) NOT NULL -- 'BATCH_JOB' | 'EVENT_CLAIM_FILED' | 'EVENT_RESCHEDULE' etc.
);

CREATE INDEX idx_risk_assessments_so ON risk_assessments(service_order_id);
CREATE INDEX idx_risk_assessments_level ON risk_assessments(risk_level, assessed_at);
CREATE INDEX idx_risk_assessments_assessed_at ON risk_assessments(assessed_at DESC);
CREATE INDEX idx_risk_assessments_triggered_by ON risk_assessments(triggered_by);
```

### External Reference Mappings

```sql
CREATE TABLE external_reference_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fsm_entity_type VARCHAR(50) NOT NULL, -- 'SERVICE_ORDER', 'PROJECT', 'CUSTOMER'
  fsm_entity_id UUID NOT NULL,
  external_system_source VARCHAR(50) NOT NULL, -- 'PYXIS', 'TEMPO', 'SAP'
  external_reference_type VARCHAR(50) NOT NULL, -- 'SALES_ORDER', 'PROJECT', 'LEAD', 'CUSTOMER', 'PRODUCT'
  external_reference_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_external_ref_fsm_entity ON external_reference_mappings(fsm_entity_type, fsm_entity_id);
CREATE INDEX idx_external_ref_external ON external_reference_mappings(
  external_system_source,
  external_reference_type,
  external_reference_id
);
CREATE INDEX idx_external_ref_created_at ON external_reference_mappings(created_at DESC);
```

---

**v2.0 Summary**: This schema design now enables:
- **External Sales System References**: Bidirectional traceability with Pyxis/Tempo/SAP
- **Project Ownership**: Operator assignment with workload balancing
- **Sales Potential Assessment**: AI-powered assessment for TV/Quotation service orders
- **Risk Assessment**: AI-powered risk scoring with daily batch + event-triggered evaluations
- **Complete Audit Trail**: All assessments, ownership changes, and external references tracked

---

**Note**: The base schema design enables:
- Multi-sales-system support (Pyxis, Tempo, SAP)
- Multi-channel tracking (store, web, call center, mobile, partner)
- Channel-specific business rules and SLAs
- Integration event audit trail
- Future extensibility without schema changes (via JSONB fields)

