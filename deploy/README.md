# Yellow Grid Demo Deployment Guide

This guide explains how to deploy the Yellow Grid platform on a lightweight infrastructure for demo purposes.

## 🏗 Architecture

We use a **Single VPS** approach with Docker Compose to keep costs low (~$5-10/mo) and management simple.

- **Frontend**: React App served by Caddy (Web Server).
- **Backend**: NestJS API running in a container.
- **Database**: PostgreSQL container.
- **Cache**: Redis container.
- **Proxy**: Caddy handles reverse proxying `/api` requests and serving static files.
- **Kafka**: **DISABLED** to save RAM/CPU.

## 📋 Prerequisites

1.  **A VPS (Virtual Private Server)**
    -   **Provider**: Hetzner (Cloud), DigitalOcean, or AWS Lightsail.
    -   **Specs**: 2 vCPU, 4GB RAM (Recommended). 2GB RAM *might* work but is tight for build processes.
    -   **OS**: Ubuntu 22.04 or 24.04 LTS.
2.  **Domain Name** (Optional but recommended for SSL).

## 🚀 Deployment Steps

### 1. Prepare the Server

SSH into your server:
```bash
ssh root@135.181.96.93
```

Install Docker & Docker Compose:
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2. Clone the Repository

```bash
git clone https://github.com/talktorobson/yellow-grid.git
cd yellow-grid
```

### 3. Configure Domain (Optional)

If you have a domain (e.g., `demo.yellowgrid.com`), edit `deploy/Caddyfile`:

```caddyfile
# Change :80 to your domain
demo.yellowgrid.com {
    root * /srv
    encode gzip
    file_server
    try_files {path} /index.html

    handle /api/* {
        reverse_proxy api:3000
    }
}
```

### 4. Start the Demo

Run the reset script. This will build the images, start containers, migrate the DB, and seed data.

```bash
./deploy/reset-demo.sh
```

*Note: The first run will take a few minutes to build the Docker images.*

### Remote Deployment (from local machine)

Deploy to VPS directly from your local development machine:

```bash
# Basic deployment (base data only)
./deploy/deploy-remote.sh

# Deploy with demo data for PT, ES, IT, FR
./deploy/deploy-remote.sh --seed-demo

# Quick deploy (skip Docker rebuild)
./deploy/deploy-remote.sh --skip-build --seed-demo
```

## 🌱 Demo Data

The platform includes a demo data seeder that creates realistic test data for **Portugal, Spain, Italy, and France**.

### What gets seeded:
| Country | Providers | Work Teams | Service Orders |
|---------|-----------|------------|----------------|
| PT      | 3         | 6          | 8              |
| ES      | 4         | 8          | 15             |
| IT      | 3         | 6          | 8              |
| FR      | 4         | 8          | 12             |
| **Total** | **14**  | **28**     | **43**         |

Service orders include various states: CREATED, SCHEDULED, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED.

### Seed demo data locally:
```bash
./scripts/seed-demo.sh

# Or reset and reseed
./scripts/seed-demo.sh --reset
```

### Seed demo data on server:
```bash
# Via reset script (default includes demo data)
./deploy/reset-demo.sh

# Skip demo data
./deploy/reset-demo.sh --no-demo

# Via deploy script
./deploy/deploy-remote.sh --seed-demo
```

## 🔄 Operations

### Resetting the Demo
To wipe all data and restore the clean state (useful before a new client meeting):

```bash
./deploy/reset-demo.sh
```

### Viewing Logs
```bash
docker-compose -f deploy/docker-compose.yml logs -f
```

### Updating Code
If you push changes to git:
```bash
git pull
docker-compose -f deploy/docker-compose.yml build
./deploy/reset-demo.sh
```

## 📱 Mobile App Demo

Since the API is running on your VPS, you can point the mobile app to it.

1.  **Expo Go**: If you are developing locally, update your `.env` in `mobile-app/` to point to `http://135.181.96.93/api`.
2.  **Production**: If you build an APK, ensure the API URL is configured to your VPS IP or Domain.

## 💰 Estimated Cost
- **Hetzner CPX21**: ~€5.35/mo (3 vCPU, 4GB RAM).
- **DigitalOcean**: ~$24/mo (4GB RAM).
- **Software**: Free (Open Source).
