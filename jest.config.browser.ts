/**
 * Jest Configuration for Browser Environment Testing
 * React components, hooks, and browser-specific functionality
 */

import type { Config } from 'jest';
import baseConfig from './jest.config.base';

const browserConfig: Config = {
  ...baseConfig,
  displayName: 'Browser Tests',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/__tests__/unit/hooks/**/*.test.+(ts|tsx)',
    '**/__tests__/integration/react-integration/**/*.test.+(ts|tsx)',
    '**/__tests__/integration/cross-platform/**/*.browser.test.+(ts|tsx)',
    '**/*.(test|spec).browser.+(ts|tsx)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/browser-setup.ts',
    '@testing-library/jest-dom',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testEnvironmentOptions: {
    jsdom: {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable',
    },
  },
  // Additional setup for browser environment
  globals: {
    'ts-jest': {
      useESM: true,
    },
    // Mock browser APIs
    indexedDB: {},
    localStorage: {},
    sessionStorage: {},
  },
};

export default browserConfig;