import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Test environment - using jsdom for React Native components (simplified approach)
  testEnvironment: 'jsdom',

  // Module directories for easier imports
  moduleDirectories: [
    'node_modules',
    'src',
    'src/__tests__',
  ],

  // Test file patterns - only React Native tests
  testMatch: [
    '<rootDir>/src/__tests__/react-native/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // Setup files - React Native specific
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup-react-native.ts',
  ],

  // Module name mapping for easier imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^test-utils$': '<rootDir>/src/__tests__/react-native/test-utils',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Ignore patterns for transformation - include React Native modules
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-native-async-storage|react-native-keychain|@testing-library)/)',
  ],

  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/components/**/*.react.{js,jsx,ts,tsx}', // Exclude React-only components
  ],

  // Test timeout
  testTimeout: 10000,

  // Display name for better test identification
  displayName: 'React Native Tests',
};

export default config; 