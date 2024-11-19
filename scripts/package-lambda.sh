#!/bin/bash

# Navigate to the source directory
cd "$(dirname "$0")/../src"

# Install dependencies
npm install

# Package the Lambda function
zip -r ../lambda.zip .