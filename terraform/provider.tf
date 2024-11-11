provider "aws" {
  access_key = "test"
  secret_key = "test"
  region     = "us-east-1"

  endpoints {
    dynamodb    = "http://localhost:4566"
    s3          = "http://localhost:4566"
    cloudwatch  = "http://localhost:4566"
    iam         = "http://localhost:4566"
  }

  skip_credentials_validation = true
  skip_metadata_api_check    = true
  skip_requesting_account_id = true
  s3_use_path_style         = true
}
