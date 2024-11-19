# Use the official Node.js 16 image as the base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Install pip and LocalStack CLI
RUN apt-get update && apt-get install -y python3-pip && pip3 install localstack awscli-local

# Copy the rest of the application code to the working directory
COPY . .

# Ensure restaurants.json is copied to the correct location
COPY restaurants.json /var/lib/localstack/restaurants.json

# Package the Lambda function
RUN zip -r /app/lambda.zip .

# Install AWS Lambda runtime interface client
RUN npm install aws-lambda-ric

# Expose the port the app runs on
EXPOSE 3000

# Command to run the Lambda function
CMD ["node", "node_modules/aws-lambda-ric/bin/index.js", "src/api/server.handler"]