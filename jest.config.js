// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
      '^.+\\.ts$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          isolatedModules: true
      }]
  },
  testMatch: ['**/__tests__/**/*.ts'],
  setupFiles: ['dotenv/config'],
  globalSetup: '<rootDir>/tests/setup.ts',
  globalTeardown: '<rootDir>/tests/teardown.ts',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000,
  verbose: true,
  maxConcurrency: 1,
  maxWorkers: 1,
  testEnvironmentOptions: {
      // Add explicit cleanup of handles
      teardown: true,
      // Add custom environment vars
      env: {
          NODE_ENV: 'test'
      }
  }
};