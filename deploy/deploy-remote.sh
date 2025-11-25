#!/bin/bash
set -e

VPS_IP="135.181.96.93"
VPS_USER="root"
SSH_KEY="deploy/vps_key"
TARGET_DIR="~/yellow-grid"

echo "🚀 Deploying to $VPS_USER@$VPS_IP..."

# Ensure key permissions
chmod 600 $SSH_KEY

# Create directory
echo "📂 Creating target directory..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "mkdir -p $TARGET_DIR"

# Sync files
echo "cw Syncing files..."
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'coverage' \
    --exclude 'mobile' \
    --exclude 'mobile-app' \
    --exclude 'web-app' \
    --exclude 'roadshow-mockup' \
    --exclude '.env' \
    . $VPS_USER@$VPS_IP:$TARGET_DIR

# Deploy
echo "🐳 Building and starting containers..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml up -d --build"

# Wait for DB
echo "⏳ Waiting for database..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && \
    until docker compose -f deploy/docker-compose.yml exec postgres pg_isready -U postgres; do \
        echo 'Waiting for postgres...'; \
        sleep 2; \
    done"

# Migrate and Seed
echo "📦 Running migrations..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml exec api npx prisma migrate deploy"

echo "🔧 Installing seed dependencies..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml exec api npm install typescript --no-save"

echo "🌱 Seeding data..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml exec api sh -c 'npx tsc prisma/seed.ts --outDir prisma/dist --module commonjs --target es2020 --esModuleInterop && node prisma/dist/seed.js'"

echo "✅ Deployment complete!"
