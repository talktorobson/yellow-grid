# Infrastructure Overview

## Executive Summary

This document provides a comprehensive overview of the cloud infrastructure architecture, covering multi-cloud deployment strategies, networking topology, security boundaries, and regional distribution.

## Table of Contents

1. [Cloud Architecture](#cloud-architecture)
2. [Regional Distribution](#regional-distribution)
3. [Network Topology](#network-topology)
4. [Security Architecture](#security-architecture)
5. [High Availability Design](#high-availability-design)
6. [Disaster Recovery](#disaster-recovery)

---

## Cloud Architecture

### Multi-Cloud Strategy

Our infrastructure supports both AWS and Azure deployments with the following distribution:

**Primary Cloud Provider**: AWS
- Production workloads: 70%
- Cost optimization focus
- Mature service ecosystem
- Better pricing for compute/storage

**Secondary Cloud Provider**: Azure
- Production workloads: 30%
- Enterprise integration requirements
- Geographic compliance needs
- Hybrid cloud connectivity

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DNS & Global Load Balancer               │
│                     (Route 53 / Azure Traffic Manager)          │
└────────────────┬───────────────────────┬────────────────────────┘
                 │                       │
    ┌────────────▼──────────┐   ┌───────▼─────────────┐
    │   AWS Infrastructure  │   │  Azure Infrastructure│
    │   Multi-Region        │   │  Multi-Region        │
    └───────────────────────┘   └──────────────────────┘
```

### AWS Infrastructure Components

```hcl
# Terraform - AWS Provider Configuration
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "terraform-state-prod"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.primary_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "FSM-Platform"
      ManagedBy   = "Terraform"
      CostCenter  = var.cost_center
    }
  }
}

# Multi-region provider aliases
provider "aws" {
  alias  = "us-west-2"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu-west-1"
  region = "eu-west-1"
}

provider "aws" {
  alias  = "ap-southeast-1"
  region = "ap-southeast-1"
}
```

### Azure Infrastructure Components

```hcl
# Terraform - Azure Provider Configuration
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }

    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }

  subscription_id = var.azure_subscription_id
}

# Multi-region provider aliases
provider "azurerm" {
  alias           = "eastus"
  subscription_id = var.azure_subscription_id
  features {}
}

provider "azurerm" {
  alias           = "westeurope"
  subscription_id = var.azure_subscription_id
  features {}
}
```

---

## Regional Distribution

### AWS Regions

| Region | Code | Purpose | Services |
|--------|------|---------|----------|
| US East (N. Virginia) | us-east-1 | Primary Production | All services, Global CDN origin |
| US West (Oregon) | us-west-2 | DR & Active-Active | All services, Read replicas |
| EU (Ireland) | eu-west-1 | GDPR Compliance | All services, EU data residency |
| Asia Pacific (Singapore) | ap-southeast-1 | APAC Users | Compute, CDN edge |
| EU (Frankfurt) | eu-central-1 | GDPR Compliance | Data residency, Compliance |

### Azure Regions

| Region | Code | Purpose | Services |
|--------|------|---------|----------|
| East US | eastus | Primary Production | All services |
| West Europe | westeurope | GDPR Compliance | All services, EU data |
| Southeast Asia | southeastasia | APAC Users | Compute, Storage |

### Region Selection Terraform Module

```hcl
# modules/region-selector/main.tf
locals {
  # AWS Region configurations
  aws_regions = {
    primary = {
      name              = "us-east-1"
      availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
      cidr_block        = "10.0.0.0/16"
    }

    secondary = {
      name              = "us-west-2"
      availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
      cidr_block        = "10.1.0.0/16"
    }

    europe = {
      name              = "eu-west-1"
      availability_zones = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
      cidr_block        = "10.2.0.0/16"
    }

    asia = {
      name              = "ap-southeast-1"
      availability_zones = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"]
      cidr_block        = "10.3.0.0/16"
    }
  }

  # Azure Region configurations
  azure_regions = {
    primary = {
      name       = "eastus"
      cidr_block = "10.10.0.0/16"
    }

    europe = {
      name       = "westeurope"
      cidr_block = "10.11.0.0/16"
    }

    asia = {
      name       = "southeastasia"
      cidr_block = "10.12.0.0/16"
    }
  }
}

output "aws_regions" {
  value = local.aws_regions
}

output "azure_regions" {
  value = local.azure_regions
}
```

---

## Network Topology

### AWS VPC Architecture

```hcl
# modules/networking/aws-vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Public Subnets (ALB, NAT Gateway, Bastion)
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-${var.availability_zones[count.index]}"
    Tier = "Public"
  }
}

# Private Subnets (Application Tier)
resource "aws_subnet" "private_app" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-app-${var.availability_zones[count.index]}"
    Tier = "Private-App"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Private Subnets (Data Tier)
resource "aws_subnet" "private_data" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-data-${var.availability_zones[count.index]}"
    Tier = "Private-Data"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# NAT Gateways (One per AZ for HA)
resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "${var.environment}-nat-eip-${var.availability_zones[count.index]}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.environment}-nat-${var.availability_zones[count.index]}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.environment}-private-rt-${var.availability_zones[count.index]}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "private_data" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private_data[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

### Network Segmentation

```
┌─────────────────────────────────────────────────────────────┐
│                         VPC (10.0.0.0/16)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Public Subnets (10.0.0.0/24, 10.0.1.0/24, ...)      │  │
│  │ - Application Load Balancer                         │  │
│  │ - NAT Gateway                                        │  │
│  │ - Bastion Hosts                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Private App Subnets (10.0.10.0/24, 10.0.11.0/24)    │  │
│  │ - EKS Worker Nodes                                   │  │
│  │ - Application Containers                             │  │
│  │ - Kafka Brokers                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Private Data Subnets (10.0.20.0/24, 10.0.21.0/24)   │  │
│  │ - RDS PostgreSQL                                     │  │
│  │ - ElastiCache Redis                                  │  │
│  │ - DocumentDB                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Azure Virtual Network

```hcl
# modules/networking/azure-vnet/main.tf
resource "azurerm_resource_group" "network" {
  name     = "${var.environment}-network-rg"
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.environment}-vnet"
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name
  address_space       = [var.vnet_cidr]

  tags = {
    Environment = var.environment
  }
}

# Subnets
resource "azurerm_subnet" "public" {
  name                 = "${var.environment}-public-subnet"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_cidr, 8, 0)]
}

resource "azurerm_subnet" "private_app" {
  name                 = "${var.environment}-private-app-subnet"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_cidr, 8, 10)]

  delegation {
    name = "aks-delegation"

    service_delegation {
      name    = "Microsoft.ContainerService/managedClusters"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_subnet" "private_data" {
  name                 = "${var.environment}-private-data-subnet"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_cidr, 8, 20)]

  service_endpoints = [
    "Microsoft.Sql",
    "Microsoft.Storage",
    "Microsoft.KeyVault"
  ]
}

# Network Security Groups
resource "azurerm_network_security_group" "public" {
  name                = "${var.environment}-public-nsg"
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_security_group" "private_app" {
  name                = "${var.environment}-private-app-nsg"
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name

  security_rule {
    name                       = "DenyDirectInternet"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "Internet"
  }
}

# NAT Gateway for Azure
resource "azurerm_public_ip" "nat" {
  name                = "${var.environment}-nat-pip"
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
}

resource "azurerm_nat_gateway" "main" {
  name                = "${var.environment}-nat-gateway"
  location            = azurerm_resource_group.network.location
  resource_group_name = azurerm_resource_group.network.name
  sku_name            = "Standard"
  zones               = ["1", "2", "3"]
}

resource "azurerm_nat_gateway_public_ip_association" "main" {
  nat_gateway_id       = azurerm_nat_gateway.main.id
  public_ip_address_id = azurerm_public_ip.nat.id
}
```

---

## Security Architecture

### Network Security

#### AWS Security Groups

```hcl
# modules/security/aws-security-groups/main.tf

# ALB Security Group
resource "aws_security_group" "alb" {
  name_prefix = "${var.environment}-alb-"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.environment}-alb-sg"
  }
}

# EKS Cluster Security Group
resource "aws_security_group" "eks_cluster" {
  name_prefix = "${var.environment}-eks-cluster-"
  description = "Security group for EKS cluster control plane"
  vpc_id      = var.vpc_id

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.environment}-eks-cluster-sg"
  }
}

# EKS Worker Nodes Security Group
resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.environment}-eks-nodes-"
  description = "Security group for EKS worker nodes"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow nodes to communicate with each other"
    from_port       = 0
    to_port         = 65535
    protocol        = "-1"
    self            = true
  }

  ingress {
    description     = "Allow pods to communicate with cluster API"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  ingress {
    description     = "Allow ALB to reach pods"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.environment}-eks-nodes-sg"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${var.environment}-rds-"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from application tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.environment}-rds-sg"
  }
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name_prefix = "${var.environment}-redis-"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from application tier"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.environment}-redis-sg"
  }
}

# Kafka Security Group
resource "aws_security_group" "kafka" {
  name_prefix = "${var.environment}-kafka-"
  description = "Security group for MSK Kafka"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Kafka plaintext"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  ingress {
    description     = "Kafka TLS"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  ingress {
    description     = "Zookeeper"
    from_port       = 2181
    to_port         = 2181
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.environment}-kafka-sg"
  }
}
```

### IAM Policies and Roles

```hcl
# modules/security/iam-roles/main.tf

# EKS Cluster Role
resource "aws_iam_role" "eks_cluster" {
  name = "${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

# EKS Node Group Role
resource "aws_iam_role" "eks_nodes" {
  name = "${var.environment}-eks-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

# Custom policy for S3 access
resource "aws_iam_policy" "s3_access" {
  name        = "${var.environment}-s3-access-policy"
  description = "Policy for S3 bucket access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.bucket_name}",
          "arn:aws:s3:::${var.bucket_name}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  policy_arn = aws_iam_policy.s3_access.arn
  role       = aws_iam_role.eks_nodes.name
}
```

---

## High Availability Design

### Multi-AZ Deployment Strategy

```hcl
# modules/ha/multi-az-deployment/main.tf
locals {
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  ha_config = {
    min_instances     = 3
    desired_instances = 6
    max_instances     = 12

    distribution = {
      az_count              = length(local.availability_zones)
      instances_per_az      = 2
      spread_across_all_azs = true
    }
  }
}

# Auto Scaling Group with multi-AZ distribution
resource "aws_autoscaling_group" "app" {
  name                = "${var.environment}-app-asg"
  vpc_zone_identifier = var.subnet_ids
  min_size            = local.ha_config.min_instances
  max_size            = local.ha_config.max_instances
  desired_capacity    = local.ha_config.desired_instances

  health_check_type         = "ELB"
  health_check_grace_period = 300
  force_delete              = false

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.environment}-app-instance"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
}

# Application Load Balancer with multi-AZ
resource "aws_lb" "app" {
  name               = "${var.environment}-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "${var.environment}-app-alb"
  }
}

# Target Group with health checks
resource "aws_lb_target_group" "app" {
  name     = "${var.environment}-app-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }
}
```

### Database High Availability

```hcl
# modules/ha/rds-multi-az/main.tf
resource "aws_db_instance" "postgres" {
  identifier     = "${var.environment}-postgres"
  engine         = "postgres"
  engine_version = "15.4"

  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = var.kms_key_id

  # Multi-AZ configuration
  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [var.security_group_id]

  # Backup configuration
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot  = true

  # Performance Insights
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Enhanced Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval            = 60
  monitoring_role_arn           = var.monitoring_role_arn

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Deletion protection
  deletion_protection = var.environment == "production" ? true : false
  skip_final_snapshot = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.environment}-postgres-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  tags = {
    Name        = "${var.environment}-postgres"
    Environment = var.environment
  }
}

# Read Replicas for scaling reads
resource "aws_db_instance" "postgres_replica" {
  count              = var.read_replica_count
  identifier         = "${var.environment}-postgres-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.postgres.identifier

  instance_class = var.replica_instance_class

  # Performance Insights
  performance_insights_enabled = true

  # No backups needed for read replicas
  backup_retention_period = 0

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name        = "${var.environment}-postgres-replica-${count.index + 1}"
    Environment = var.environment
    Role        = "ReadReplica"
  }
}
```

---

## Disaster Recovery

### Backup Strategy

```hcl
# modules/disaster-recovery/backup/main.tf

# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "${var.environment}-backup-vault"
  kms_key_arn = var.kms_key_arn

  tags = {
    Name        = "${var.environment}-backup-vault"
    Environment = var.environment
  }
}

# Backup Plan
resource "aws_backup_plan" "main" {
  name = "${var.environment}-backup-plan"

  # Daily backups retained for 7 days
  rule {
    rule_name         = "daily_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)" # 2 AM UTC daily

    lifecycle {
      delete_after = 7
    }

    recovery_point_tags = {
      Type = "Daily"
    }
  }

  # Weekly backups retained for 4 weeks
  rule {
    rule_name         = "weekly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)" # 3 AM UTC every Sunday

    lifecycle {
      delete_after = 28
    }

    recovery_point_tags = {
      Type = "Weekly"
    }
  }

  # Monthly backups retained for 12 months
  rule {
    rule_name         = "monthly_backups"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 4 1 * ? *)" # 4 AM UTC on 1st of month

    lifecycle {
      delete_after = 365
    }

    recovery_point_tags = {
      Type = "Monthly"
    }
  }

  tags = {
    Name        = "${var.environment}-backup-plan"
    Environment = var.environment
  }
}

# Backup Selection
resource "aws_backup_selection" "main" {
  name         = "${var.environment}-backup-selection"
  iam_role_arn = aws_iam_role.backup.arn
  plan_id      = aws_backup_plan.main.id

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }

  resources = [
    "*"
  ]
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup" {
  name = "${var.environment}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "backup.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "backup" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}

resource "aws_iam_role_policy_attachment" "restore" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
  role       = aws_iam_role.backup.name
}
```

### Cross-Region Replication

```hcl
# modules/disaster-recovery/cross-region/main.tf

# S3 Cross-Region Replication
resource "aws_s3_bucket_replication_configuration" "main" {
  role   = aws_iam_role.replication.arn
  bucket = var.source_bucket_id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    filter {
      prefix = ""
    }

    destination {
      bucket        = var.destination_bucket_arn
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = var.destination_kms_key_id
      }

      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }

      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }
}

# RDS Automated Backup Replication
resource "aws_db_instance_automated_backups_replication" "postgres" {
  source_db_instance_arn = var.source_db_instance_arn
  kms_key_id            = var.destination_kms_key_id

  retention_period = 7
}
```

### RTO and RPO Targets

| Service | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|---------|-------------------------------|--------------------------------|
| Database (RDS) | 30 minutes | 5 minutes |
| Object Storage (S3) | 15 minutes | 0 (continuous replication) |
| Application Tier | 15 minutes | 0 (stateless) |
| Message Queue (Kafka) | 10 minutes | 1 minute |
| Cache (Redis) | 5 minutes | Acceptable loss |

---

## Cost Optimization Strategies

### Resource Tagging for Cost Allocation

```hcl
# modules/cost-optimization/tagging/main.tf
locals {
  common_tags = {
    Environment  = var.environment
    Project      = "FSM-Platform"
    ManagedBy    = "Terraform"
    CostCenter   = var.cost_center
    Owner        = var.owner
    Application  = var.application_name
  }

  cost_allocation_tags = {
    "cost:service"    = var.service_name
    "cost:team"       = var.team_name
    "cost:component"  = var.component_name
  }
}

# Enable Cost Allocation Tags
resource "aws_ce_cost_allocation_tag" "environment" {
  tag_key = "Environment"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "cost_center" {
  tag_key = "CostCenter"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "service" {
  tag_key = "cost:service"
  status  = "Active"
}
```

### Auto-Scaling for Cost Efficiency

```hcl
# modules/cost-optimization/autoscaling/main.tf

# Schedule-based scaling for non-production environments
resource "aws_autoscaling_schedule" "scale_down_evening" {
  count                  = var.environment != "production" ? 1 : 0
  scheduled_action_name  = "scale-down-evening"
  min_size               = 1
  max_size               = 2
  desired_capacity       = 1
  recurrence             = "0 20 * * MON-FRI" # 8 PM on weekdays
  autoscaling_group_name = var.autoscaling_group_name
}

resource "aws_autoscaling_schedule" "scale_up_morning" {
  count                  = var.environment != "production" ? 1 : 0
  scheduled_action_name  = "scale-up-morning"
  min_size               = 2
  max_size               = 10
  desired_capacity       = 3
  recurrence             = "0 8 * * MON-FRI" # 8 AM on weekdays
  autoscaling_group_name = var.autoscaling_group_name
}

# Weekend scale-down for dev/staging
resource "aws_autoscaling_schedule" "scale_down_weekend" {
  count                  = var.environment != "production" ? 1 : 0
  scheduled_action_name  = "scale-down-weekend"
  min_size               = 0
  max_size               = 1
  desired_capacity       = 0
  recurrence             = "0 20 * * FRI" # Friday 8 PM
  autoscaling_group_name = var.autoscaling_group_name
}
```

### S3 Lifecycle Policies

```hcl
# modules/cost-optimization/s3-lifecycle/main.tf
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = var.bucket_id

  # Transition old objects to cheaper storage classes
  rule {
    id     = "transition-old-objects"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    transition {
      days          = 180
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }

  # Delete old versions
  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
  }

  # Delete incomplete multipart uploads
  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

---

## Monitoring and Observability

### CloudWatch Dashboards

```hcl
# modules/monitoring/cloudwatch/main.tf
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-infrastructure-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", { stat = "Average" }],
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            ["AWS/ElastiCache", "CPUUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "CPU Utilization Across Services"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "Application Load Balancer Metrics"
        }
      }
    ]
  })
}
```

---

## Summary

This infrastructure overview provides a comprehensive foundation for deploying a highly available, secure, and cost-optimized cloud architecture across AWS and Azure. The modular Terraform approach ensures consistency, maintainability, and scalability.

### Key Highlights:

- **Multi-Cloud**: AWS (primary) + Azure (secondary)
- **Multi-Region**: 5 AWS regions, 3 Azure regions
- **High Availability**: Multi-AZ deployments, auto-scaling, load balancing
- **Security**: Network segmentation, security groups, IAM policies
- **Disaster Recovery**: Automated backups, cross-region replication
- **Cost Optimization**: Resource tagging, auto-scaling schedules, lifecycle policies

### Next Steps:

1. Review database design (02-database-design.md)
2. Configure Kafka topics (03-kafka-topics.md)
3. Setup object storage (04-object-storage.md)
4. Implement caching strategy (05-caching-strategy.md)
5. Deploy Kubernetes infrastructure (06-deployment-architecture.md)
6. Configure auto-scaling (07-scaling-strategy.md)
