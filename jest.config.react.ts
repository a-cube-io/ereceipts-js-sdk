import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Test environment - using jsdom for React components
  testEnvironment: 'jsdom',

  // Module directories for easier imports
  moduleDirectories: [
    'node_modules',
    'src',
    'src/__tests__',
  ],

  // Test file patterns - only React tests
  testMatch: [
    '<rootDir>/src/__tests__/react/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // Setup files - React specific
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup-react.ts',
  ],

  // Module name mapping for easier imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^test-utils$': '<rootDir>/src/__tests__/react/test-utils',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Ignore patterns for transformation - no React Native
  transformIgnorePatterns: [
    'node_modules/(?!(react|react-dom)/)',
  ],

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/components/**/*.react-native.{js,jsx,ts,tsx}', // Exclude React Native components
  ],

  // Test timeout
  testTimeout: 10000,

  // Display name for better test identification
  displayName: 'React Tests',
};

export default config; 