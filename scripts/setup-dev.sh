#!/bin/bash
echo -e "Setting up development environment..."
# Create .env file from template if it doesn't exist
if [ ! -f .env ]; then
    cp .env.template .env
    echo -e "Created .env file from template"
fi

echo -e "Starting docker containers..."
docker-compose up -d

echo -e "PostgreSQL is ready!"

echo -e "Initializing database..."
npx ts-node scripts/init-db.ts

echo -e "Development environment setup complete!"