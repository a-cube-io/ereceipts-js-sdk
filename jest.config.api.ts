import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Test environment - using node for API tests
  testEnvironment: 'node',

  // Module directories for easier imports
  moduleDirectories: [
    'node_modules',
    'src',
    'src/__tests__',
  ],

  // Test file patterns - only API tests
  testMatch: [
    '<rootDir>/src/__tests__/api/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // Setup files - API specific
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup-api.ts',
  ],

  // Module name mapping for easier imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage/api',
  collectCoverageFrom: [
    'src/api/**/*.{js,jsx,ts,tsx}',
    'src/storage/**/*.{js,jsx,ts,tsx}',
    'src/utils/**/*.{js,jsx,ts,tsx}',
    'src/constants/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/api/types.generated.ts',
  ],

  // Test timeout
  testTimeout: 10000,

  // Display name for better test identification
  displayName: 'API Tests',
};

export default config; 