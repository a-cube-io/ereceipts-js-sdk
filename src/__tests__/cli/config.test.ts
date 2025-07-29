/**
 * CLI Configuration Tests
 * Tests for configuration management functionality
 */

import { loadConfig, saveConfig, ensureConfigDir } from '../../cli/config/index.js';

// Mock the config directory to use a temporary directory for tests
jest.mock('../../cli/config/constants.js', () => {
  const { join } = require('path');
  const { tmpdir } = require('os');
  const testDir = join(tmpdir(), 'acube-test-' + Math.random().toString(36));
  return {
    CONFIG_DIR: testDir,
    CONFIG_FILE: join(testDir, 'config.json'),
    AUTH_FILE: join(testDir, 'auth.json'),
    PROFILES_DIR: join(testDir, 'profiles'),
    DEFAULT_TRACE_CONFIG: {
      enabled: false,
      level: 'basic',
      includeStack: false,
      includeContext: true,
      includeTimestamp: true,
      outputFormat: 'pretty',
    }
  };
});

describe('CLI Configuration Management', () => {
  beforeAll(async () => {
    await ensureConfigDir();
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', async () => {
      const config = await loadConfig();
      
      expect(config).toEqual({
        environment: 'sandbox',
        trace: {
          enabled: false,
          level: 'basic',
          includeStack: false,
          includeContext: true,
          includeTimestamp: true,
          outputFormat: 'pretty',
        }
      });
    });
  });

  describe('saveConfig and loadConfig', () => {
    it('should save and load configuration correctly', async () => {
      const testConfig = {
        environment: 'production' as const,
        baseUrls: {
          api: 'https://api.test.com',
          auth: 'https://auth.test.com',
        },
        currentProfile: 'test-profile',
        trace: {
          enabled: true,
          level: 'verbose' as const,
          includeStack: true,
          includeContext: true,
          includeTimestamp: true,
          outputFormat: 'json' as const,
        }
      };

      await saveConfig(testConfig);
      const loadedConfig = await loadConfig();

      expect(loadedConfig).toEqual(testConfig);
    });
  });

  describe('ensureConfigDir', () => {
    it('should create config directory without errors', async () => {
      await expect(ensureConfigDir()).resolves.not.toThrow();
    });
  });
});