#!/bin/bash
set -e

VPS_IP="135.181.96.93"
VPS_USER="root"
SSH_KEY="deploy/vps_key"
TARGET_DIR="~/yellow-grid"

# Parse arguments
SEED_DEMO=false
SKIP_BUILD=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --seed-demo) SEED_DEMO=true ;;
        --skip-build) SKIP_BUILD=true ;;
        -h|--help)
            echo "Usage: ./deploy-remote.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --seed-demo    Seed demo data for PT, ES, IT, FR after deployment"
            echo "  --skip-build   Skip Docker build (faster for code-only changes)"
            echo "  -h, --help     Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo "🚀 Deploying to $VPS_USER@$VPS_IP..."
echo "   Options: seed-demo=$SEED_DEMO, skip-build=$SKIP_BUILD"

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
if [ "$SKIP_BUILD" = true ]; then
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml up -d"
else
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml up -d --build"
fi

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

echo "🌱 Seeding base data..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml exec api sh -c 'npx tsc prisma/seed.ts --outDir prisma/dist --module commonjs --target es2020 --esModuleInterop && node prisma/dist/seed.js'"

# Seed demo data if requested
if [ "$SEED_DEMO" = true ]; then
    echo "🌱 Seeding demo data (PT, ES, IT, FR)..."
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "cd $TARGET_DIR && docker compose -f deploy/docker-compose.yml exec api sh -c 'npx tsc prisma/seed-demo-data.ts --outDir prisma/dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck && node prisma/dist/seed-demo-data.js'"
    echo "✅ Demo data seeded: 14 providers, 28 work teams, 43 service orders"
fi

echo "✅ Deployment complete!"
echo ""
echo "📍 Access your deployment:"
echo "   Web App: https://$VPS_IP"
echo "   API: https://$VPS_IP/api/v1"
echo "   API Docs: https://$VPS_IP/api/docs"
