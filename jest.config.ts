import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Use projects to separate different test environments
  projects: [
    {
      displayName: 'API & Utils Tests',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/__tests__/api/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/utils/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/constants/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/__tests__/storage/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup-api.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(axios|zod)/)',
      ],
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
    },
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
      coverageDirectory: 'coverage/react',
      collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}',
        '!src/api/types.generated.ts',
        '!src/components/**/*.react-native.{js,jsx,ts,tsx}', // Exclude React Native components
      ],
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
      coverageDirectory: 'coverage/react-native',
      collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/**/*.test.{js,jsx,ts,tsx}',
        '!src/**/*.spec.{js,jsx,ts,tsx}',
        '!src/api/types.generated.ts',
        '!src/components/**/*.react.{js,jsx,ts,tsx}', // Exclude React-only components
      ],
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
  testTimeout: 10000,
  maxWorkers: '50%',
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  errorOnDeprecated: true,
};

export default config; 