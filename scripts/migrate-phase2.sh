#!/bin/bash

# Phase 2 Migration Script
# Creates and applies the Phase 2 database schema

set -e

echo "🚀 Starting Phase 2 Migration..."
echo ""

# Check if Docker containers are running
echo "📦 Checking Docker containers..."
docker-compose ps

# Create migration
echo ""
echo "📝 Creating migration..."
npx prisma migrate dev --name add-phase-2-modules --skip-seed

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run seed (optional)
read -p "Run database seed? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🌱 Seeding database..."
    npx prisma db seed
fi

echo ""
echo "✅ Phase 2 migration complete!"
echo ""
echo "Next steps:"
echo "  - Implement Service Order module"
echo "  - Implement Buffer Logic service"
echo "  - Implement Assignment & Booking services"
