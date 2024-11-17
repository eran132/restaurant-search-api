#!/bin/bash

echo -e "Setting up development environment..."

# Create .env file from template if it doesn't exist
if [ ! -f .env ]; then
    cp .env.template .env
    echo -e "Created .env file from template"
fi

echo -e "Starting docker containers..."
docker-compose up -d

echo -e "Waiting for PostgreSQL to be ready..."
until [ "$(docker inspect -f {{.State.Health.Status}} restaurant-search-api-restaurants_db-1)" == "healthy" ]; do
    echo -e "PostgreSQL is unavailable - sleeping"
    sleep 1
done

echo -e "PostgreSQL is ready!"

echo -e "Initializing database..."
docker-compose run node_app npx ts-node scripts/init-db.ts

echo -e "Development environment setup complete!"