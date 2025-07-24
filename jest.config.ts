import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Use projects to separate React and React Native tests
  projects: [
    {
      displayName: 'React Tests',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/__tests__/react/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup-react.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^test-utils$': '<rootDir>/src/__tests__/react/test-utils',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(react|react-dom)/)',
      ],
      collectCoverage: false, // Disable coverage for individual projects to avoid conflicts
      coverageDirectory: 'coverage/react',
      collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}',
        '!src/api/types.generated.ts',
      ],
      testTimeout: 10000,
    },
    {
      displayName: 'React Native Tests',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/__tests__/react-native/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup-react-native.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^test-utils$': '<rootDir>/src/__tests__/react-native/test-utils',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|@react-native-community|@react-native-async-storage|react-native-keychain|@testing-library)/)',
      ],
      collectCoverage: false, // Disable coverage for individual projects to avoid conflicts
      coverageDirectory: 'coverage/react-native',
      collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}',
        '!src/api/types.generated.ts',
      ],
      testTimeout: 10000,
    },
  ],

  // Global settings
  moduleDirectories: [
    'node_modules',
    'src',
    'src/__tests__',
  ],

  // Global coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/api/types.generated.ts',
    '!src/**/index.ts', // Exclude index files that just re-export
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json',
    'text-summary',
    ['json-summary', { file: 'coverage-summary.json' }]
  ],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 10,
      statements: 10,
    },
    './src/components/': {
      branches: 60,
      functions: 35,
      lines: 60,
      statements: 60,
    },
    './src/providers/': {
      branches: 15,
      functions: 30,
      lines: 40,
      statements: 40,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/src/__tests__/',
  ],
};

export default config; 