/**
 * Core SDK Tests
 * Tests for the main ACubeSDK class
 */

import { ACubeSDK } from '../../core/sdk';
import type { ACubeSDKConfig } from '../../core/sdk';

// Mock the HTTP client
jest.mock('../../http/client', () => ({
  EnterpriseHttpClient: jest.fn().mockImplementation(() => ({
    setAuthToken: jest.fn(),
    addMiddleware: jest.fn(),
    request: jest.fn().mockResolvedValue({ data: {} }),
  })),
}));

// Mock the auth service
jest.mock('../../auth/auth-service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

// Mock EventEmitter3
jest.mock('eventemitter3', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

describe('ACubeSDK', () => {
  let sdk: ACubeSDK;
  const validConfig: ACubeSDKConfig = {
    apiKey: 'test-api-key',
    environment: 'sandbox',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create SDK instance with valid config', () => {
      expect(() => {
        sdk = new ACubeSDK(validConfig);
      }).not.toThrow();
      
      expect(sdk).toBeInstanceOf(ACubeSDK);
    });

    it('should throw error when apiKey is missing', () => {
      const invalidConfig = { environment: 'sandbox' } as ACubeSDKConfig;
      
      expect(() => {
        new ACubeSDK(invalidConfig);
      }).toThrow('API key is required');
    });

    it('should use default environment when not specified', () => {
      const configWithoutEnv: ACubeSDKConfig = {
        apiKey: 'test-api-key',
      };
      
      sdk = new ACubeSDK(configWithoutEnv);
      const config = sdk.getConfig();
      
      expect(config.environment).toBe('sandbox');
    });

    it('should set correct base URL for each environment', () => {
      const environments = [
        { env: 'production', url: 'https://ereceipts-it.acubeapi.com' },
        { env: 'sandbox', url: 'https://ereceipts-demo.acubeapi.com' },
        { env: 'development', url: 'http://localhost:3000' },
      ];

      environments.forEach(({ env, url }) => {
        const config: ACubeSDKConfig = {
          apiKey: 'test-api-key',
          environment: env as any,
        };
        
        const testSdk = new ACubeSDK(config);
        const sdkConfig = testSdk.getConfig();
        
        expect(sdkConfig.baseUrl).toBe(url);
      });
    });
  });

  describe('initialize method', () => {
    beforeEach(() => {
      sdk = new ACubeSDK(validConfig);
    });

    it('should initialize successfully', async () => {
      await expect(sdk.initialize()).resolves.not.toThrow();
    });

    it('should emit initialized event', async () => {
      const emitSpy = jest.spyOn(sdk as any, 'emit');
      
      await sdk.initialize();
      
      expect(emitSpy).toHaveBeenCalledWith('initialized');
    });

    it('should not initialize twice', async () => {
      await sdk.initialize();
      const authInitSpy = jest.spyOn((sdk as any).auth, 'initialize');
      
      await sdk.initialize();
      
      expect(authInitSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('updateConfig method', () => {
    beforeEach(() => {
      sdk = new ACubeSDK(validConfig);
    });

    it('should update configuration', () => {
      const newConfig: Partial<ACubeSDKConfig> = {
        timeout: 10000,
        retryAttempts: 5,
      };
      
      sdk.updateConfig(newConfig);
      const config = sdk.getConfig();
      
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(5);
      expect(config.apiKey).toBe(validConfig.apiKey); // Original values preserved
    });

    it('should emit config-updated event', () => {
      const emitSpy = jest.spyOn(sdk as any, 'emit');
      const newConfig = { timeout: 15000 };
      
      sdk.updateConfig(newConfig);
      
      expect(emitSpy).toHaveBeenCalledWith('config-updated', expect.any(Object));
    });
  });

  describe('resource lazy loading', () => {
    beforeEach(() => {
      sdk = new ACubeSDK(validConfig);
    });

    it('should lazy load receipts resource', () => {
      const receipts = sdk.receipts;
      
      expect(receipts).toBeDefined();
      expect(receipts).toBe(sdk.receipts); // Should return same instance
    });

    it('should lazy load cashiers resource', () => {
      const cashiers = sdk.cashiers;
      
      expect(cashiers).toBeDefined();
      expect(cashiers).toBe(sdk.cashiers); // Should return same instance
    });

    it('should lazy load all resources', () => {
      const resources = [
        'receipts',
        'cashiers',
        'merchants',
        'pointOfSales',
        'cashRegisters',
        'pems',
      ];

      resources.forEach(resource => {
        expect(sdk[resource as keyof ACubeSDK]).toBeDefined();
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      sdk = new ACubeSDK(validConfig);
    });

    it('should emit error event on initialization failure', async () => {
      const error = new Error('Init failed');
      (sdk as any).auth.initialize = jest.fn().mockRejectedValue(error);
      
      const errorHandler = jest.fn();
      sdk.on('error', errorHandler);
      
      await expect(sdk.initialize()).rejects.toThrow('Init failed');
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('destroy method', () => {
    beforeEach(() => {
      sdk = new ACubeSDK(validConfig);
    });

    it('should clean up resources on destroy', async () => {
      await sdk.initialize();
      
      const removeListenersSpy = jest.spyOn(sdk as any, 'removeAllListeners');
      const authDestroySpy = jest.spyOn((sdk as any).auth, 'destroy');
      
      sdk.destroy();
      
      expect(removeListenersSpy).toHaveBeenCalled();
      expect(authDestroySpy).toHaveBeenCalled();
    });
  });
});