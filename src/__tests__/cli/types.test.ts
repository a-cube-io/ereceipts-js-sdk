/**
 * CLI Types Tests
 * Basic tests for type definitions
 */

import type { 
  TraceConfig, 
  CLIConfig, 
  ProcessStatus
} from '../../cli/types.js';

describe('CLI Types', () => {
  describe('TraceConfig', () => {
    it('should have valid trace config structure', () => {
      const traceConfig: TraceConfig = {
        enabled: true,
        level: 'basic',
        includeStack: false,
        includeContext: true,
        includeTimestamp: true,
        outputFormat: 'pretty'
      };

      expect(traceConfig.enabled).toBe(true);
      expect(traceConfig.level).toBe('basic');
      expect(traceConfig.outputFormat).toBe('pretty');
    });
  });

  describe('CLIConfig', () => {
    it('should have valid CLI config structure', () => {
      const config: CLIConfig = {
        environment: 'sandbox',
        baseUrls: {
          api: 'https://api.example.com',
          auth: 'https://auth.example.com'
        },
        currentProfile: 'default'
      };

      expect(config.environment).toBe('sandbox');
      expect(config.baseUrls?.api).toBe('https://api.example.com');
      expect(config.currentProfile).toBe('default');
    });
  });

  describe('ProcessStatus', () => {
    it('should accept valid process status values', () => {
      const statuses: ProcessStatus[] = ['success', 'error', 'cancelled'];
      
      statuses.forEach(status => {
        expect(['success', 'error', 'cancelled']).toContain(status);
      });
    });
  });
});