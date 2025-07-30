/**
 * Jest Configuration for Node.js Environment Testing
 * Unit tests, API integration, and server-side functionality
 */

import type { Config } from 'jest';
import baseConfig from './jest.config.base';

const nodeConfig: Config = {
  ...baseConfig,
  displayName: 'Node.js Tests',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/unit/**/*.test.+(ts|tsx)',
    '**/__tests__/integration/api-integration/**/*.test.+(ts|tsx)',
    '**/__tests__/integration/offline-workflows/**/*.test.+(ts|tsx)',
    '**/*.(test|spec).node.+(ts|tsx)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/node-setup.ts',
  ],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // Node.js specific test environment variables
  testEnvironmentOptions: {
    node: {
      experimental: {
        vm: true,
      },
    },
  },
};

export default nodeConfig;