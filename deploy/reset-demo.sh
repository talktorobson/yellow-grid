#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

    echo -e "\n${GREEN}🌱 Seeding demo data...${NC}"
    docker compose -f deploy/docker-compose.yml exec api npx prisma db seed

    echo -e "\n${GREEN}✅ Demo environment reset complete!${NC}"
    echo -e "Web App: http://localhost (or your server IP)"
    echo -e "API: http://localhost/api"
else
    echo -e "\n❌ Reset cancelled."
fi
