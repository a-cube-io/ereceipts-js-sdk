/**
 * Jest Configuration for React Native Environment Testing
 * Mobile-specific functionality and React Native integrations
 */

import type { Config } from 'jest';
import baseConfig from './jest.config.base';

const reactNativeConfig: Config = {
  ...baseConfig,
  displayName: 'React Native Tests',
  testEnvironment: 'node',
  preset: '@testing-library/react-native',
  testMatch: [
    '**/__tests__/integration/cross-platform/**/*.react-native.test.+(ts|tsx)',
    '**/__tests__/unit/storage/**/*.react-native.test.+(ts|tsx)',
    '**/*.(test|spec).react-native.+(ts|tsx)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/react-native-setup.ts',
    '@testing-library/jest-native/extend-expect',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@testing-library/react-native|@react-native-community|@react-navigation))',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^react-native$': 'react-native',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/mocks/async-storage.ts',
  },
  // React Native specific globals
  globals: {
    'ts-jest': {
      useESM: true,
    },
    __DEV__: true,
  },
  // Mock React Native modules
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native', 'web'],
  },
};

export default reactNativeConfig;