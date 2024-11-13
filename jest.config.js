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
    modulePathIgnorePatterns: ['<rootDir>/dist/']
  };