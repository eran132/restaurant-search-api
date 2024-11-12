#!/bin/bash
set -e

echo "Setting up development environment..."

# Check if .env exists, if not create it from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from template"
fi

# Start docker containers
echo "Starting docker containers..."
docker compose down -v
docker compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Initialize database
echo "Initializing database..."
npm run init-db

echo "Setup complete! Your development environment is ready."