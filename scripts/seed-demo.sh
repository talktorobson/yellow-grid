#!/bin/bash
# Seed demo data locally (development environment)
# Usage: ./scripts/seed-demo.sh [--reset]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

RESET=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --reset)
            RESET=true
            ;;
        -h|--help)
            echo "Usage: ./scripts/seed-demo.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --reset    Clear existing demo data before seeding"
            echo "  -h, --help Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${GREEN}🌱 Seeding demo data for PT, ES, IT, FR...${NC}"

# Check if Prisma client is generated
if [ ! -d "node_modules/@prisma/client" ]; then
    echo -e "${YELLOW}⚠️  Generating Prisma client...${NC}"
    npx prisma generate
fi

# Optional: Clear existing demo data
if [ "$RESET" = true ]; then
    echo -e "${YELLOW}🗑️  Clearing existing demo data...${NC}"
    npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function clear() {
    // Delete in correct order due to foreign keys
    await prisma.assignment.deleteMany({});
    await prisma.serviceOrderLineItem.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.workTeamCalendar.deleteMany({});
    await prisma.workTeamZoneAssignment.deleteMany({});
    await prisma.workTeam.deleteMany({});
    await prisma.interventionZone.deleteMany({});
    await prisma.providerWorkingSchedule.deleteMany({});
    await prisma.provider.deleteMany({});
    console.log('✅ Cleared existing data');
}
clear().then(() => prisma.\$disconnect());
"
fi

# Run the demo seed script
echo -e "${GREEN}🚀 Running demo seed script...${NC}"
npx ts-node --transpile-only --compiler-options '{"module": "commonjs", "esModuleInterop": true}' prisma/seed-demo-data.ts

echo -e "${GREEN}✅ Demo data seeding complete!${NC}"
echo ""
echo -e "📊 Seeded data:"
echo -e "   - 14 Providers (PT: 3, ES: 4, IT: 3, FR: 4)"
echo -e "   - 28 Work Teams (2 per provider)"
echo -e "   - 43 Service Orders (various states)"
echo -e "   - 10 Services (HVAC, Plumbing, Electrical, etc.)"
