# scripts/setup-dev.sh
#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up development environment...${NC}"

# Check if .env exists, if not create it from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env file from template${NC}"
fi

# Start docker containers
echo -e "${GREEN}Starting docker containers...${NC}"
docker compose down -v
docker compose up -d

# Wait for PostgreSQL with timeout
echo -e "${GREEN}Waiting for PostgreSQL to be ready...${NC}"
timeout=30
elapsed=0
while ! docker compose exec -T postgres pg_isready 2>/dev/null; do
    if [ "$elapsed" -ge "$timeout" ]; then
        echo -e "${RED}Timed out waiting for PostgreSQL${NC}"
        echo -e "${YELLOW}Container logs:${NC}"
        docker compose logs postgres
        exit 1
    fi
    echo -e "${YELLOW}PostgreSQL is unavailable - sleeping (${elapsed}s)${NC}"
    sleep 1
    elapsed=$((elapsed + 1))
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Initialize database
echo -e "${GREEN}Initializing database...${NC}"
if ! npm run init-db; then
    echo -e "${RED}Failed to initialize database. Please check the logs above.${NC}"
    exit 1
fi

echo -e "${GREEN}Setup complete! Your development environment is ready.${NC}"