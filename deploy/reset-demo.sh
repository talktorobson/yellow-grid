#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Parse arguments
SEED_DEMO=true  # Default to seeding demo data for reset

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --no-demo) SEED_DEMO=false ;;
        -h|--help)
            echo "Usage: ./reset-demo.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-demo    Skip demo data seeding (only seed base data)"
            echo "  -h, --help   Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${YELLOW}⚠️  WARNING: This will WIPE all data and reset the demo environment.${NC}"
echo -e "${YELLOW}Are you sure you want to continue? (y/N)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
then
    echo -e "\n${GREEN}🔄 Stopping containers and removing volumes...${NC}"
    docker compose -f deploy/docker-compose.yml down -v

    echo -e "\n${GREEN}🚀 Starting fresh containers...${NC}"
    docker compose -f deploy/docker-compose.yml up -d

    echo -e "\n${GREEN}⏳ Waiting for database to be ready...${NC}"
    # Simple wait loop
    until docker compose -f deploy/docker-compose.yml exec postgres pg_isready -U postgres; do
        echo "Waiting for postgres..."
        sleep 2
    done

    echo -e "\n${GREEN}📦 Running database migrations...${NC}"
    docker compose -f deploy/docker-compose.yml exec api npx prisma migrate deploy

    echo -e "\n${GREEN}🌱 Seeding base data...${NC}"
    docker compose -f deploy/docker-compose.yml exec api npx prisma db seed

    # Seed demo data if not disabled
    if [ "$SEED_DEMO" = true ]; then
        echo -e "\n${GREEN}🌱 Seeding demo data (PT, ES, IT, FR)...${NC}"
        docker compose -f deploy/docker-compose.yml exec api sh -c 'npx tsc prisma/seed-demo-data.ts --outDir prisma/dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck && node prisma/dist/seed-demo-data.js'
        echo -e "\n${GREEN}📊 Demo data seeded: 14 providers, 28 work teams, 43 service orders${NC}"
    fi

    echo -e "\n${GREEN}✅ Demo environment reset complete!${NC}"
    echo -e "Web App: http://localhost (or your server IP)"
    echo -e "API: http://localhost/api"
    echo -e "\n${GREEN}📊 Seeded Countries: PT, ES, IT, FR${NC}"
else
    echo -e "\n❌ Reset cancelled."
fi
