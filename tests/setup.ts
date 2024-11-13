import { AWS as _AWS } from 'aws-sdk';
import { setup } from '@localstack/test-utils';

beforeAll(async () => {
  await setup({
    services: ['s3', 'dynamodb', 'cloudwatch'],
    region: 'us-east-1',
    endpointURL: 'http://localhost:4566'
  });
});