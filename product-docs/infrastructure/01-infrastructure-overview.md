# Infrastructure Overview

## Executive Summary

This document provides a comprehensive overview of the Google Cloud Platform (GCP) infrastructure architecture, covering deployment strategies, networking topology, security boundaries, regional distribution, and cost optimization through a hybrid approach of managed GCP services and self-hosted open source solutions.

## Table of Contents

1. [Cloud Architecture](#cloud-architecture)
2. [Regional Distribution](#regional-distribution)
3. [Network Topology](#network-topology)
4. [Security Architecture](#security-architecture)
5. [High Availability Design](#high-availability-design)
6. [Disaster Recovery](#disaster-recovery)
7. [Cost Optimization Strategy](#cost-optimization-strategy)

---

## Cloud Architecture

### GCP + Open Source Hybrid Strategy

Our infrastructure uses Google Cloud Platform (GCP) with a strategic mix of managed services and self-hosted open source components to optimize for both cost and scalability **with no compromise on scale**.

**Philosophy**: Start with managed GCP services for rapid deployment, migrate to self-hosted open source on GKE as scale increases and cost optimization becomes critical.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud DNS & Global Load Balancer             │
│                     (Cloud Load Balancing)                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
    ┌────────────▼──────────────────────────────────┐
    │         GCP Infrastructure                    │
    │         Multi-Region (europe-west, us-east)   │
    │                                                │
    │  ┌──────────────────┐  ┌──────────────────┐  │
    │  │ Managed Services │  │ Self-Hosted OSS  │  │
    │  │ (GKE, Cloud SQL) │  │ (Kafka, Grafana) │  │
    │  └──────────────────┘  └──────────────────┘  │
    └────────────────────────────────────────────────┘
```

### GCP Infrastructure Components

```hcl
# Terraform - GCP Provider Configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "terraform-state-prod"
    prefix = "infrastructure/terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.primary_region

  default_labels = {
    environment = var.environment
    project     = "fsm-platform"
    managed_by  = "terraform"
    cost_center = var.cost_center
  }
}

# Multi-region provider aliases
provider "google" {
  alias   = "europe-west1"
  project = var.project_id
  region  = "europe-west1"
}

provider "google" {
  alias   = "europe-west3"
  project = var.project_id
  region  = "europe-west3"
}

provider "google" {
  alias   = "us-east1"
  project = var.project_id
  region  = "us-east1"
}
```

### Managed GCP Services

| Service | Purpose | Cost Tier | Scaling Strategy |
|---------|---------|-----------|------------------|
| **Google Cloud Storage (GCS)** | Media, documents, backups | Pay-per-use | Auto-scaling |
| **Cloud SQL PostgreSQL** | Primary database | Managed | Vertical scaling + read replicas |
| **GKE Autopilot** | Container orchestration | Pay-per-pod | Horizontal auto-scaling |
| **Cloud Memorystore (Redis)** | Caching, calendar bitmaps | Managed | Vertical scaling |
| **Cloud CDN** | Media delivery | Pay-per-use | Global edge network |
| **Cloud Load Balancing** | HTTP(S) LB + SSL | Pay-per-use | Auto-scaling |
| **Secret Manager** | Credentials management | Free tier + usage | N/A |
| **Cloud Monitoring** | Metrics, logs, traces | Free tier + usage | N/A |

### Self-Hosted Open Source (on GKE)

| Service | Purpose | Cost Savings | When to Self-Host |
|---------|---------|--------------|-------------------|
| **Kafka (Strimzi)** | Event streaming | ~70% vs Confluent Cloud | Day 1 (no vendor lock-in) |
| **Prometheus** | Metrics collection | Supplement Cloud Monitoring | Day 1 (standard OSS stack) |
| **Grafana** | Dashboards | Supplement Cloud Monitoring | Day 1 (advanced visualizations) |
| **PostgreSQL** | Database | ~60% vs Cloud SQL | When >500GB or >10k QPS |
| **Redis** | Caching | ~50% vs Memorystore | When >100GB or >100k ops/sec |

**Migration Path**: Managed → Self-Hosted
- Start: Cloud SQL, Memorystore (rapid deployment)
- Scale: Self-host PostgreSQL and Redis on GKE when cost/performance requires
- Always: GCS, GKE, Cloud CDN (cost-effective at any scale)

---

## Regional Distribution

### GCP Regions

| Region | Code | Purpose | Services | Data Residency |
|--------|------|---------|----------|----------------|
| Europe (Paris) | europe-west9 | FR Primary Production | All services, GDPR compliant | France |
| Europe (Belgium) | europe-west1 | EU Primary Production | All services, GDPR compliant | EU |
| Europe (Frankfurt) | europe-west3 | EU Secondary / DR | All services, GDPR compliant | Germany |
| Europe (Madrid) | europe-southwest1 | ES Production | All services, GDPR compliant | Spain |
| Europe (Warsaw) | europe-central2 | PL Production | All services, GDPR compliant | Poland |
| Europe (Milan) | europe-west8 | IT Production | All services, GDPR compliant | Italy |
| US East (South Carolina) | us-east1 | DR / Development | Read replicas, Testing | US (isolated) |

### GDPR Compliance & Data Residency

**Critical Requirement**: All production data for EU countries (FR, ES, IT, PL) **MUST** remain within EU regions.

```hcl
# Regional data residency enforcement
locals {
  # Country-to-region mapping for GDPR compliance
  country_regions = {
    FR = "europe-west9"     # France → Paris
    ES = "europe-southwest1" # Spain → Madrid
    IT = "europe-west8"      # Italy → Milan
    PL = "europe-central2"   # Poland → Warsaw
  }

  # EU-only regions for production data
  eu_regions = [
    "europe-west1",      # Belgium (EU primary)
    "europe-west3",      # Germany (DR)
    "europe-west8",      # Italy
    "europe-west9",      # France
    "europe-central2",   # Poland
    "europe-southwest1", # Spain
  ]
}

# Enforce data residency with resource policies
resource "google_org_policy_policy" "restrict_resource_locations" {
  name   = "projects/${var.project_id}/policies/gcp.resourceLocations"
  parent = "projects/${var.project_id}"

  spec {
    rules {
      values {
        allowed_values = local.eu_regions
      }
    }
  }
}
```

### Region Selection Terraform Module

```hcl
# modules/region-selector/main.tf
locals {
  # GCP Region configurations
  gcp_regions = {
    france = {
      name               = "europe-west9"
      zones              = ["europe-west9-a", "europe-west9-b", "europe-west9-c"]
      cidr_block         = "10.0.0.0/16"
      country            = "FR"
      gdpr_compliant     = true
    }

    belgium = {
      name               = "europe-west1"
      zones              = ["europe-west1-b", "europe-west1-c", "europe-west1-d"]
      cidr_block         = "10.1.0.0/16"
      country            = "EU"
      gdpr_compliant     = true
    }

    germany = {
      name               = "europe-west3"
      zones              = ["europe-west3-a", "europe-west3-b", "europe-west3-c"]
      cidr_block         = "10.2.0.0/16"
      country            = "DE"
      gdpr_compliant     = true
    }

    spain = {
      name               = "europe-southwest1"
      zones              = ["europe-southwest1-a", "europe-southwest1-b", "europe-southwest1-c"]
      cidr_block         = "10.3.0.0/16"
      country            = "ES"
      gdpr_compliant     = true
    }

    poland = {
      name               = "europe-central2"
      zones              = ["europe-central2-a", "europe-central2-b", "europe-central2-c"]
      cidr_block         = "10.4.0.0/16"
      country            = "PL"
      gdpr_compliant     = true
    }

    italy = {
      name               = "europe-west8"
      zones              = ["europe-west8-a", "europe-west8-b", "europe-west8-c"]
      cidr_block         = "10.5.0.0/16"
      country            = "IT"
      gdpr_compliant     = true
    }

    us_east = {
      name               = "us-east1"
      zones              = ["us-east1-b", "us-east1-c", "us-east1-d"]
      cidr_block         = "10.10.0.0/16"
      country            = "US"
      gdpr_compliant     = false
      purpose            = "DR and development only"
    }
  }
}

output "gcp_regions" {
  value = local.gcp_regions
}

output "primary_region" {
  value = local.gcp_regions.belgium # EU primary
}

output "eu_regions" {
  value = {
    for key, region in local.gcp_regions : key => region
    if region.gdpr_compliant == true
  }
}
```

---

## Network Topology

### GCP VPC Architecture

```hcl
# modules/networking/gcp-vpc/main.tf
resource "google_compute_network" "main" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  mtu                     = 1460

  description = "Main VPC for ${var.environment} environment"
}

# Public Subnet (Load Balancers, NAT Gateway, Bastion)
resource "google_compute_subnetwork" "public" {
  count         = length(var.regions)
  name          = "${var.environment}-public-${var.regions[count.index]}"
  ip_cidr_range = cidrsubnet(var.vpc_cidr, 8, count.index)
  region        = var.regions[count.index]
  network       = google_compute_network.main.id

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Private Subnet - Application Tier (GKE, Kafka)
resource "google_compute_subnetwork" "private_app" {
  count         = length(var.regions)
  name          = "${var.environment}-private-app-${var.regions[count.index]}"
  ip_cidr_range = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  region        = var.regions[count.index]
  network       = google_compute_network.main.id

  private_ip_google_access = true

  # Secondary IP ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = cidrsubnet(var.vpc_cidr, 4, count.index + 10)
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = cidrsubnet(var.vpc_cidr, 6, count.index + 20)
  }

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Private Subnet - Data Tier (Cloud SQL, Memorystore)
resource "google_compute_subnetwork" "private_data" {
  count         = length(var.regions)
  name          = "${var.environment}-private-data-${var.regions[count.index]}"
  ip_cidr_range = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  region        = var.regions[count.index]
  network       = google_compute_network.main.id

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Cloud NAT for private subnet outbound access
resource "google_compute_router" "main" {
  count   = length(var.regions)
  name    = "${var.environment}-router-${var.regions[count.index]}"
  region  = var.regions[count.index]
  network = google_compute_network.main.id

  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "main" {
  count  = length(var.regions)
  name   = "${var.environment}-nat-${var.regions[count.index]}"
  router = google_compute_router.main[count.index].name
  region = var.regions[count.index]

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Private Service Connection for Cloud SQL
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "${var.environment}-private-ip-alloc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}
```

### Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│                    VPC (10.0.0.0/16)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Public Subnets (10.0.0.0/24, 10.0.1.0/24, ...)      │  │
│  │ - Cloud Load Balancer                                │  │
│  │ - Cloud NAT Gateway                                  │  │
│  │ - Bastion Hosts (IAP Tunnel)                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Private App Subnets (10.0.10.0/24, 10.0.11.0/24)    │  │
│  │ - GKE Autopilot Pods                                 │  │
│  │ - Application Containers (NestJS, FastAPI)          │  │
│  │ - Kafka Brokers (Strimzi on GKE)                    │  │
│  │ - Prometheus + Grafana                               │  │
│  │ Secondary Ranges:                                    │  │
│  │   - GKE Pods: 10.0.0.0/20                           │  │
│  │   - GKE Services: 10.0.32.0/22                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Private Data Subnets (10.0.20.0/24, 10.0.21.0/24)   │  │
│  │ - Cloud SQL PostgreSQL (Private IP)                 │  │
│  │ - Cloud Memorystore Redis (Private IP)              │  │
│  │ - Self-hosted PostgreSQL (if migrated)              │  │
│  │ - Self-hosted Redis (if migrated)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Firewall Rules

```hcl
# modules/networking/firewall-rules/main.tf

# Allow HTTPS from internet to Load Balancer
resource "google_compute_firewall" "allow_https" {
  name    = "${var.environment}-allow-https"
  network = var.network_name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["load-balancer"]

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

# Allow HTTP from internet to Load Balancer (redirect to HTTPS)
resource "google_compute_firewall" "allow_http" {
  name    = "${var.environment}-allow-http"
  network = var.network_name

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["load-balancer"]

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

# Allow internal communication within GKE cluster
resource "google_compute_firewall" "allow_gke_internal" {
  name    = "${var.environment}-allow-gke-internal"
  network = var.network_name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_tags = ["gke-node"]
  target_tags = ["gke-node"]
}

# Allow health checks from GCP load balancers
resource "google_compute_firewall" "allow_health_checks" {
  name    = "${var.environment}-allow-health-checks"
  network = var.network_name

  allow {
    protocol = "tcp"
  }

  source_ranges = [
    "35.191.0.0/16",  # Google Cloud health check ranges
    "130.211.0.0/22",
  ]

  target_tags = ["gke-node", "load-balancer"]
}

# Allow IAP (Identity-Aware Proxy) for SSH bastion access
resource "google_compute_firewall" "allow_iap_ssh" {
  name    = "${var.environment}-allow-iap-ssh"
  network = var.network_name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"] # IAP IP range

  target_tags = ["bastion"]
}

# Deny all other ingress by default (implicit deny)
resource "google_compute_firewall" "deny_all_ingress" {
  name     = "${var.environment}-deny-all-ingress"
  network  = var.network_name
  priority = 65534 # Lowest priority (evaluated last)

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}
```

---

## Security Architecture

### Service Accounts and IAM

```hcl
# modules/security/service-accounts/main.tf

# GKE Cluster Service Account
resource "google_service_account" "gke_cluster" {
  account_id   = "${var.environment}-gke-cluster-sa"
  display_name = "GKE Cluster Service Account"
  description  = "Service account for GKE Autopilot cluster"
}

resource "google_project_iam_member" "gke_cluster_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_cluster.email}"
}

resource "google_project_iam_member" "gke_cluster_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_cluster.email}"
}

# GKE Node Service Account
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.environment}-gke-nodes-sa"
  display_name = "GKE Nodes Service Account"
  description  = "Service account for GKE Autopilot nodes"
}

resource "google_project_iam_member" "gke_nodes_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Application Service Account (for GCS, Secret Manager access)
resource "google_service_account" "app" {
  account_id   = "${var.environment}-app-sa"
  display_name = "Application Service Account"
  description  = "Service account for application workloads"
}

# GCS Access for media uploads
resource "google_storage_bucket_iam_member" "app_gcs_admin" {
  bucket = var.media_bucket_name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.app.email}"
}

# Secret Manager Access
resource "google_secret_manager_secret_iam_member" "app_secret_accessor" {
  secret_id = google_secret_manager_secret.app_secrets.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}

# Workload Identity Binding (GKE Pod → GCP SA)
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/${var.k8s_service_account}]"
}

# Cloud SQL Client Access
resource "google_project_iam_member" "app_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app.email}"
}
```

### Secret Management

```hcl
# modules/security/secrets/main.tf

# Application Secrets
resource "google_secret_manager_secret" "app_secrets" {
  secret_id = "${var.environment}-app-secrets"

  replication {
    user_managed {
      replicas {
        location = "europe-west1"
      }
      replicas {
        location = "europe-west3"
      }
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Database credentials
resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.environment}-db-password"

  replication {
    user_managed {
      replicas {
        location = "europe-west1"
      }
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    type        = "database"
  }
}

# JWT Signing Keys
resource "google_secret_manager_secret" "jwt_private_key" {
  secret_id = "${var.environment}-jwt-private-key"

  replication {
    user_managed {
      replicas {
        location = "europe-west1"
      }
      replicas {
        location = "europe-west3"
      }
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    type        = "jwt"
  }
}

# Third-party API keys (DocuSign, Twilio, SendGrid)
resource "google_secret_manager_secret" "external_api_keys" {
  secret_id = "${var.environment}-external-api-keys"

  replication {
    automatic = true
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    type        = "api-keys"
  }
}
```

### Network Security with VPC Service Controls

```hcl
# modules/security/vpc-service-controls/main.tf

# VPC Service Perimeter for GDPR compliance
resource "google_access_context_manager_service_perimeter" "gdpr_perimeter" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/servicePerimeters/${var.environment}_gdpr"
  title  = "${var.environment} GDPR Perimeter"

  status {
    restricted_services = [
      "storage.googleapis.com",
      "sql-component.googleapis.com",
      "sqladmin.googleapis.com",
    ]

    resources = [
      "projects/${var.project_number}"
    ]

    vpc_accessible_services {
      enable_restriction = true
      allowed_services = [
        "storage.googleapis.com",
        "sql-component.googleapis.com",
      ]
    }

    ingress_policies {
      ingress_from {
        sources {
          resource = "projects/${var.project_number}"
        }
        identity_type = "ANY_IDENTITY"
      }
      ingress_to {
        resources = ["*"]
        operations {
          service_name = "storage.googleapis.com"
          method_selectors {
            method = "*"
          }
        }
      }
    }

    egress_policies {
      egress_from {
        identity_type = "ANY_IDENTITY"
      }
      egress_to {
        resources = ["*"]
        operations {
          service_name = "storage.googleapis.com"
          method_selectors {
            method = "*"
          }
        }
      }
    }
  }
}
```

---

## High Availability Design

### Multi-Zone GKE Autopilot Deployment

```hcl
# modules/ha/gke-autopilot/main.tf
resource "google_container_cluster" "primary" {
  name     = "${var.environment}-gke-cluster"
  location = var.region # Regional cluster (multi-zone by default)

  # Autopilot mode (fully managed)
  enable_autopilot = true

  # Release channel for automatic upgrades
  release_channel {
    channel = "REGULAR" # RAPID, REGULAR, or STABLE
  }

  # Networking configuration
  network    = var.network_name
  subnetwork = var.subnetwork_name

  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"

    master_global_access_config {
      enabled = true
    }
  }

  # Master authorized networks (restrict access to cluster API)
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0" # Replace with specific IP ranges in production
      display_name = "All (replace in production)"
    }
  }

  # Workload Identity for GKE pods → GCP service accounts
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Monitoring and logging
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]

    managed_prometheus {
      enabled = true
    }
  }

  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00" # 3 AM UTC
    }
  }

  # Vertical Pod Autoscaling
  vertical_pod_autoscaling {
    enabled = true
  }

  # Binary Authorization (enforce signed container images)
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Resource labels
  resource_labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
```

### Cloud SQL High Availability

```hcl
# modules/ha/cloud-sql/main.tf
resource "google_sql_database_instance" "primary" {
  name             = "${var.environment}-postgres-primary"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.instance_tier # db-custom-4-16384 (4 vCPU, 16GB RAM)
    availability_type = "REGIONAL" # Multi-zone HA
    disk_type         = "PD_SSD"
    disk_size         = var.disk_size_gb
    disk_autoresize       = true
    disk_autoresize_limit = var.max_disk_size_gb

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00" # 2 AM UTC
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
      hour         = 3 # 3 AM UTC
      update_track = "stable"
    }

    # IP configuration (Private IP only)
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
      require_ssl     = true

      authorized_networks {
        name  = "bastion-only"
        value = var.bastion_ip_cidr
      }
    }

    # Insights and monitoring
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    # Database flags
    database_flags {
      name  = "max_connections"
      value = "500"
    }

    database_flags {
      name  = "shared_buffers"
      value = "4096000" # 4GB (25% of RAM for 16GB instance)
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000" # Log queries > 1s
    }
  }

  # Deletion protection
  deletion_protection = var.environment == "production" ? true : false
}

# Read replicas for scaling reads
resource "google_sql_database_instance" "read_replica" {
  count                = var.read_replica_count
  name                 = "${var.environment}-postgres-replica-${count.index + 1}"
  database_version     = "POSTGRES_15"
  region               = var.replica_region
  master_instance_name = google_sql_database_instance.primary.name

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

### Cloud Memorystore (Redis) HA Configuration

```hcl
# modules/ha/memorystore/main.tf
resource "google_redis_instance" "cache" {
  name               = "${var.environment}-redis"
  tier               = "STANDARD_HA" # High Availability tier
  memory_size_gb     = var.memory_size_gb
  region             = var.region
  redis_version      = "REDIS_7_0"
  replica_count      = 1 # HA replica

  # Network configuration
  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  # Persistence configuration
  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }

  # Maintenance window
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }

  # Redis configuration
  redis_configs = {
    maxmemory-policy = "allkeys-lru"
    notify-keyspace-events = "Ex" # Enable expiration notifications
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}
```

---

## Disaster Recovery

### Backup Strategy

```hcl
# modules/disaster-recovery/backups/main.tf

# GCS Bucket for backups
resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-${var.environment}-backups"
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false

  # Versioning for backup safety
  versioning {
    enabled = true
  }

  # Lifecycle rules for cost optimization
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 180
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  # Soft delete with 30-day retention
  soft_delete_policy {
    retention_duration_seconds = 2592000 # 30 days
  }

  # Uniform bucket-level access
  uniform_bucket_level_access {
    enabled = true
  }

  labels = {
    environment = var.environment
    purpose     = "disaster-recovery"
  }
}

# Export Cloud SQL backups to GCS
resource "google_sql_backup_run" "manual_backup" {
  instance = var.cloud_sql_instance_name
}
```

### Cross-Region Replication

```hcl
# modules/disaster-recovery/cross-region/main.tf

# GCS Multi-region or Dual-region bucket
resource "google_storage_bucket" "multi_region" {
  name          = "${var.project_id}-${var.environment}-media-multi"
  location      = "EU" # Multi-region (automatic replication across EU)
  storage_class = "STANDARD"
  force_destroy = false

  # Versioning
  versioning {
    enabled = true
  }

  # Uniform bucket-level access
  uniform_bucket_level_access {
    enabled = true
  }

  labels = {
    environment = var.environment
    purpose     = "production-media"
  }
}

# Dual-region bucket for critical data
resource "google_storage_bucket" "dual_region" {
  name     = "${var.project_id}-${var.environment}-critical-dual"
  location = "EUR4" # Dual-region: europe-west1 + europe-north1

  # Custom dual-region configuration
  custom_placement_config {
    data_locations = ["europe-west1", "europe-west3"]
  }

  storage_class = "STANDARD"
  force_destroy = false

  versioning {
    enabled = true
  }

  uniform_bucket_level_access {
    enabled = true
  }

  labels = {
    environment = var.environment
    purpose     = "critical-data"
  }
}
```

### RTO and RPO Targets

| Service | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) | Strategy |
|---------|-------------------------------|--------------------------------|----------|
| **Cloud SQL PostgreSQL** | 15 minutes | 5 minutes | REGIONAL HA + PITR + automated backups |
| **GCS (Media)** | 0 minutes | 0 minutes | Multi-region bucket (automatic replication) |
| **GKE (Application)** | 10 minutes | 0 minutes | Regional cluster (stateless workloads) |
| **Kafka (Strimzi on GKE)** | 10 minutes | 1 minute | Replicated across zones + persistent volumes |
| **Redis (Memorystore)** | 5 minutes | 5 minutes | STANDARD_HA tier + RDB snapshots |

**Disaster Recovery Drill Schedule**: Quarterly (every 3 months)

---

## Cost Optimization Strategy

### GCP Committed Use Discounts (CUDs)

```hcl
# modules/cost-optimization/commitments/main.tf

# 1-year committed use discount for Compute Engine (GKE nodes)
resource "google_compute_commitment" "gke_nodes" {
  name        = "${var.environment}-gke-nodes-cud"
  description = "1-year committed use discount for GKE nodes"
  region      = var.region

  plan = "TWELVE_MONTH" # or THIRTY_SIX_MONTH for more savings

  resources {
    type   = "VCPU"
    amount = "32" # 32 vCPUs reserved
  }

  resources {
    type   = "MEMORY"
    amount = "131072" # 128 GB RAM reserved (in MB)
  }
}

# Cloud SQL committed use discount
# Note: Applied via GCP Console, not Terraform
```

**Expected Savings**:
- GKE Compute: 37% off with 1-year, 55% off with 3-year
- Cloud SQL: 30% off with 1-year, 52% off with 3-year

### Resource Labeling for Cost Attribution

```hcl
# modules/cost-optimization/labeling/main.tf
locals {
  common_labels = {
    environment  = var.environment
    project      = "fsm-platform"
    managed_by   = "terraform"
    cost_center  = var.cost_center
    team         = var.team_name
    component    = var.component_name
  }
}

# Apply labels to all resources
# Example: GCS bucket with cost labels
resource "google_storage_bucket" "labeled_bucket" {
  name     = "${var.project_id}-example-bucket"
  location = var.region

  labels = merge(local.common_labels, {
    service = "media-storage"
    tier    = "production"
  })
}
```

### Auto-Scaling for Cost Efficiency

```hcl
# modules/cost-optimization/autoscaling/main.tf

# GKE Autopilot handles autoscaling automatically, but we can set budget alerts
resource "google_billing_budget" "monthly_budget" {
  billing_account = var.billing_account_id
  display_name    = "${var.environment} Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_number}"]

    labels = {
      environment = var.environment
    }
  }

  amount {
    specified_amount {
      currency_code = "EUR"
      units         = "5000" # €5,000/month
    }
  }

  threshold_rules {
    threshold_percent = 0.5 # 50% alert
  }

  threshold_rules {
    threshold_percent = 0.75 # 75% alert
  }

  threshold_rules {
    threshold_percent = 0.9 # 90% alert
  }

  threshold_rules {
    threshold_percent = 1.0 # 100% alert
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    pubsub_topic = google_pubsub_topic.budget_alerts.id
  }
}

# Pub/Sub topic for budget alerts
resource "google_pubsub_topic" "budget_alerts" {
  name = "${var.environment}-budget-alerts"

  labels = {
    environment = var.environment
  }
}
```

### GCS Lifecycle Policies

```hcl
# modules/cost-optimization/gcs-lifecycle/main.tf
resource "google_storage_bucket" "optimized_storage" {
  name     = "${var.project_id}-${var.environment}-media"
  location = "EU"

  # Lifecycle rules for automatic cost optimization
  lifecycle_rule {
    condition {
      age                   = 30
      matches_storage_class = ["STANDARD"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE" # Access < 1x/month
    }
  }

  lifecycle_rule {
    condition {
      age                   = 90
      matches_storage_class = ["NEARLINE"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE" # Access < 1x/quarter
    }
  }

  lifecycle_rule {
    condition {
      age                   = 365
      matches_storage_class = ["COLDLINE"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE" # Long-term retention
    }
  }

  # Delete old object versions after 90 days
  lifecycle_rule {
    condition {
      days_since_noncurrent_time = 90
    }
    action {
      type = "Delete"
    }
  }

  # Delete incomplete multipart uploads after 7 days
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }
}
```

**Cost Optimization Impact**:
- GCS lifecycle policies: **60-80% storage cost reduction** (STANDARD → ARCHIVE)
- Committed use discounts: **37-55% compute cost reduction**
- Autopilot mode: **20-30% reduction** vs. standard GKE (pay-per-pod)
- Budget alerts: Prevent cost overruns

**Total Expected Savings**: ~€18,000/year vs AWS equivalent (~35% cost reduction)

---

## Monitoring and Observability

### Cloud Monitoring Integration

```hcl
# modules/monitoring/cloud-monitoring/main.tf

# Uptime check for API endpoint
resource "google_monitoring_uptime_check_config" "api_uptime" {
  display_name = "${var.environment} API Uptime Check"
  timeout      = "10s"
  period       = "60s" # Check every minute

  http_check {
    path         = "/health"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.api_domain
    }
  }
}

# Alert policy for uptime check failures
resource "google_monitoring_alert_policy" "api_down" {
  display_name = "${var.environment} API Down"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "API Uptime Check Failure"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" resource.type=\"uptime_url\" metric.label.check_id=\"${google_monitoring_uptime_check_config.api_uptime.uptime_check_id}\""
      duration        = "300s" # 5 minutes
      comparison      = "COMPARISON_LT"
      threshold_value = 1.0

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.id]

  alert_strategy {
    auto_close = "1800s" # Auto-close after 30 minutes
  }
}

# PagerDuty notification channel
resource "google_monitoring_notification_channel" "pagerduty" {
  display_name = "PagerDuty On-Call"
  type         = "pagerduty"

  labels = {
    service_key = var.pagerduty_service_key
  }

  enabled = true
}

# Custom metrics dashboard
resource "google_monitoring_dashboard" "infrastructure" {
  dashboard_json = jsonencode({
    displayName = "${var.environment} Infrastructure Dashboard"
    gridLayout = {
      widgets = [
        {
          title = "GKE Pod CPU Usage"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"kubernetes.io/container/cpu/core_usage_time\" resource.type=\"k8s_container\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Cloud SQL Connections"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"cloudsql.googleapis.com/database/network/connections\" resource.type=\"cloudsql_database\""
                }
              }
            }]
          }
        },
        {
          title = "GCS Bucket Requests"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"storage.googleapis.com/api/request_count\" resource.type=\"gcs_bucket\""
                }
              }
            }]
          }
        }
      ]
    }
  })
}
```

### Logging with Cloud Logging (Stackdriver)

```hcl
# modules/monitoring/cloud-logging/main.tf

# Log sink to export logs to Cloud Storage for long-term retention
resource "google_logging_project_sink" "export_to_gcs" {
  name        = "${var.environment}-logs-export"
  destination = "storage.googleapis.com/${google_storage_bucket.logs.name}"

  filter = <<-EOT
    resource.type="k8s_container"
    severity >= ERROR
  EOT

  unique_writer_identity = true
}

# Grant sink permission to write to GCS
resource "google_storage_bucket_iam_member" "log_writer" {
  bucket = google_storage_bucket.logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.export_to_gcs.writer_identity
}

# GCS bucket for log storage
resource "google_storage_bucket" "logs" {
  name          = "${var.project_id}-${var.environment}-logs"
  location      = var.region
  storage_class = "STANDARD"

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access {
    enabled = true
  }
}

# Log-based metric for error rate
resource "google_logging_metric" "error_rate" {
  name   = "${var.environment}_error_rate"
  filter = <<-EOT
    resource.type="k8s_container"
    severity >= ERROR
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

# Alert on high error rate
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "${var.environment} High Error Rate"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Error Rate > 100/min"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.error_rate.name}\" resource.type=\"k8s_container\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 100.0

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pagerduty.id]
}
```

---

## Summary

This GCP-based infrastructure provides a comprehensive foundation for deploying a highly available, secure, GDPR-compliant, and cost-optimized cloud architecture. The hybrid approach of managed GCP services combined with self-hosted open source components ensures **no compromise on scale** while maintaining cost efficiency.

### Key Highlights:

- **Cloud Provider**: Google Cloud Platform (GCP) only
- **GDPR Compliance**: All EU data stays within EU regions (europe-west*)
- **High Availability**: Regional GKE, Cloud SQL REGIONAL HA, multi-zone deployments
- **Security**: VPC Service Controls, Workload Identity, Secret Manager, Private IPs
- **Disaster Recovery**: Multi-region GCS, PITR, automated backups, cross-region replication
- **Cost Optimization**: Committed use discounts (37-55% savings), GCS lifecycle policies (60-80% storage savings), GKE Autopilot (pay-per-pod)
- **Observability**: Cloud Monitoring + Prometheus/Grafana hybrid approach

### Managed vs. Self-Hosted Strategy:

**Start with Managed** (Weeks 1-12):
- Cloud SQL PostgreSQL
- Cloud Memorystore Redis
- GCS, Cloud CDN, Cloud Load Balancing
- GKE Autopilot

**Migrate to Self-Hosted** (When needed for cost/performance):
- PostgreSQL on GKE (when >500GB or >10k QPS)
- Redis on GKE (when >100GB or >100k ops/sec)
- Always self-host: Kafka (Strimzi), Prometheus, Grafana (open source)

### Cost Comparison vs. AWS:
- **GCP Total**: ~€33,000/year (estimated)
- **AWS Equivalent**: ~€51,000/year (estimated)
- **Savings**: ~€18,000/year (~35% reduction)

### Next Steps:

1. Review database design (02-database-design.md)
2. Configure Kafka topics (03-kafka-topics.md)
3. Setup object storage (04-object-storage.md)
4. Implement caching strategy (05-caching-strategy.md)
5. Deploy GKE infrastructure (06-deployment-architecture.md)
6. Configure auto-scaling (07-scaling-strategy.md)
7. Implement ML infrastructure on GCP (08-ml-infrastructure.md)
