#!/bin/bash
set -e

echo "Initializing LocalStack resources..."

# Create S3 bucket
aws --endpoint-url=http://localhost:4566 s3 mb s3://restaurant-assets

# Create DynamoDB table for audit logs
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name audit-logs \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

echo "LocalStack resources initialized successfully!"