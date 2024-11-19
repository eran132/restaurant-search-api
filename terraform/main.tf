terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 2.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = var.aws_access_key
  secret_key                  = var.aws_secret_key
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  s3_force_path_style         = true
  skip_requesting_account_id  = true
  endpoints {
    dynamodb = "http://localhost:4566"
    s3       = "http://localhost:4566"
    lambda   = "http://localhost:4566"
    iam      = "http://localhost:4566"
  }
}

provider "docker" {}

resource "docker_image" "localstack" {
  name = "localstack/localstack:latest"
}

resource "null_resource" "remove_existing_localstack" {
  provisioner "local-exec" {
    command = "docker ps -a --filter name=localstack --format '{{.Names}}' | grep -w localstack | xargs -r docker rm -f"
  }
}

resource "docker_container" "localstack" {
  depends_on = [null_resource.remove_existing_localstack]
  image      = docker_image.localstack.name
  name       = "localstack"
  ports {
    internal = 4566
    external = 4566
  }
  ports {
    internal = 4571
    external = 4571
  }
  env = [
    "SERVICES=s3,dynamodb,cloudwatch,logs,lambda,iam",
    "DEBUG=1",
    "DATA_DIR=/var/lib/localstack",
    "LAMBDA_EXECUTOR=docker",
    "LAMBDA_REMOTE_DOCKER=false",
    "DOCKER_HOST=unix:///var/run/docker.sock"
  ]
  volumes {
    host_path      = abspath("${path.module}/../localstack")
    container_path = "/var/lib/localstack"
  }
  volumes {
    host_path      = "/var/run/docker.sock"
    container_path = "/var/run/docker.sock"
  }
}

resource "aws_s3_bucket" "restaurant_data" {
  bucket = "restaurant-data"
}

resource "aws_s3_bucket_object" "restaurants_json" {
  depends_on = [aws_s3_bucket.restaurant_data]
  bucket     = aws_s3_bucket.restaurant_data.bucket
  key        = "restaurants.json"
  source     = "${path.module}/../restaurants.json"
}

resource "aws_dynamodb_table" "restaurants" {
  name           = "Restaurants"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "RestaurantID"

  attribute {
    name = "RestaurantID"
    type = "S"
  }

  lifecycle {
    ignore_changes = [name]
  }
}

resource "aws_dynamodb_table" "audit_logs" {
  name           = "AuditLogs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LogID"

  attribute {
    name = "LogID"
    type = "S"
  }

  lifecycle {
    ignore_changes = [name]
  }
}

resource "aws_iam_role" "lambda_role" {
  name = "lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "null_resource" "package_lambda" {
  triggers = {
    source_code = filesha256("${path.module}/../src/api/server.ts")
  }

  provisioner "local-exec" {
    command = <<EOT
      cd ${path.module}/..
      npm install
      zip -r lambda.zip node_modules src package.json
    EOT
  }
}

resource "aws_lambda_function" "restaurant_search" {
  depends_on     = [null_resource.package_lambda, null_resource.wait_for_localstack]
  filename       = "${path.module}/../lambda.zip"
  function_name  = "restaurant-search"
  role           = aws_iam_role.lambda_role.arn
  handler        = "src/api/server.handler"
  runtime        = "nodejs16.x"
  source_code_hash = filebase64sha256("${path.module}/../lambda.zip")
  environment {
    variables = {
      NODE_ENV = "production"
      DYNAMODB_ENDPOINT = "http://localhost:4566"
      REGION = "us-east-1"
    }
  }
}

resource "null_resource" "wait_for_localstack" {
  depends_on = [docker_container.localstack]

  provisioner "local-exec" {
    command = <<EOT
      echo "Waiting for LocalStack to be ready..."
      for i in {1..30}; do
        if curl -s http://localhost:4566/_localstack/health | grep -q "\"running\""; then
          echo "LocalStack is ready"
          exit 0
        fi
        echo "Waiting... ($i/30)"
        sleep 5
      done
      echo "LocalStack failed to start"
      exit 1
    EOT
  }
}

resource "null_resource" "setup_localstack" {
  depends_on = [null_resource.wait_for_localstack, aws_lambda_function.restaurant_search]

  provisioner "local-exec" {
    command = <<EOT
      # Create S3 bucket and upload data
      aws --endpoint-url=http://localhost:4566 s3 mb s3://restaurant-data || true
      aws --endpoint-url=http://localhost:4566 s3 cp ${path.module}/../restaurants.json s3://restaurant-data/ || true

      # Create DynamoDB tables (only if they don't exist)
      aws --endpoint-url=http://localhost:4566 dynamodb create-table \
        --table-name Restaurants \
        --attribute-definitions AttributeName=RestaurantID,AttributeType=S \
        --key-schema AttributeName=RestaurantID,KeyType=HASH \
        --billing-mode PAY PER REQUEST || true

      aws --endpoint-url=http://localhost:4566 dynamodb create-table \
        --table-name AuditLogs \
        --attribute-definitions AttributeName=LogID,AttributeType=S \
        --key-schema AttributeName=LogID,KeyType=HASH \
        --billing-mode PAY PER REQUEST || true

      # Test Lambda function
      echo "Testing Lambda function..."
      aws --endpoint-url=http://localhost:4566 lambda invoke \
        --function-name restaurant-search \
        --payload '{"httpMethod": "GET", "path": "/restaurants"}' \
        response.json || true
    EOT
  }
}

output "localstack_status" {
  value = "LocalStack is running at http://localhost:4566"
}

output "lambda_function_name" {
  value = aws_lambda_function.restaurant_search.function_name
}