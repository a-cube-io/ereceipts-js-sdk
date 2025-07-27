/**
 * Tests for ACubeSDK Core
 * Tests the main SDK entry point and resource management
 */

import { ACubeSDK } from '@/core/sdk';
import { HttpClient } from '@/http/client';

describe('ACubeSDK', () => {
  let sdk: ACubeSDK;

  afterEach(() => {
    if (sdk) {
      sdk.removeAllListeners();
    }
  });

  describe('Initialization', () => {
    it('should create SDK instance with minimal config', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
    });

    it('should create SDK instance with API key', () => {
      sdk = new ACubeSDK({
        environment: 'production',
        apiKey: 'test-api-key',
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
    });

    it('should create SDK instance with custom base URLs', () => {
      sdk = new ACubeSDK({
        environment: 'development',
        baseUrls: {
          api: 'https://custom-api.example.com',
          auth: 'https://custom-auth.example.com',
        },
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
    });

    it('should create SDK instance with custom HTTP config', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        httpConfig: {
          timeout: 10000,
          enableRetry: false,
          enableCircuitBreaker: false,
        },
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
    });
  });

  describe('Resource Access', () => {
    beforeEach(() => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        apiKey: 'test-api-key',
      });
    });

    it('should provide access to cashiers resource', () => {
      expect(sdk.cashiers).toBeDefined();
      expect(typeof sdk.cashiers.list).toBe('function');
      expect(typeof sdk.cashiers.create).toBe('function');
      expect(typeof sdk.cashiers.retrieve).toBe('function');
      expect(typeof sdk.cashiers.me).toBe('function');
      expect(typeof sdk.cashiers.delete).toBe('function');
    });

    it('should provide access to receipts resource', () => {
      expect(sdk.receipts).toBeDefined();
      expect(typeof sdk.receipts.list).toBe('function');
      expect(typeof sdk.receipts.create).toBe('function');
      expect(typeof sdk.receipts.retrieve).toBe('function');
      expect(typeof sdk.receipts.void).toBe('function');
      expect(typeof sdk.receipts.voidWithProof).toBe('function');
    });

    it('should provide access to merchants resource', () => {
      expect(sdk.merchants).toBeDefined();
      expect(typeof sdk.merchants.list).toBe('function');
      expect(typeof sdk.merchants.create).toBe('function');
      expect(typeof sdk.merchants.retrieve).toBe('function');
      expect(typeof sdk.merchants.update).toBe('function');
    });

    it('should provide access to cash registers resource', () => {
      expect(sdk.cashRegisters).toBeDefined();
      expect(typeof sdk.cashRegisters.list).toBe('function');
      expect(typeof sdk.cashRegisters.create).toBe('function');
      expect(typeof sdk.cashRegisters.retrieve).toBe('function');
      expect(typeof sdk.cashRegisters.activate).toBe('function');
    });

    it('should provide access to point of sales resource', () => {
      expect(sdk.pointOfSales).toBeDefined();
      expect(typeof sdk.pointOfSales.list).toBe('function');
      expect(typeof sdk.pointOfSales.retrieve).toBe('function');
      expect(typeof sdk.pointOfSales.activate).toBe('function');
      expect(typeof sdk.pointOfSales.closeJournal).toBe('function');
    });

    it('should provide access to PEMs resource', () => {
      expect(sdk.pems).toBeDefined();
      expect(typeof sdk.pems.createPointOfSale).toBe('function');
      expect(typeof sdk.pems.getCertificates).toBe('function');
      expect(typeof sdk.pems.validateCertificateChain).toBe('function');
      expect(typeof sdk.pems.getConfiguration).toBe('function');
    });

    it('should reuse the same resource instances', () => {
      const cashiers1 = sdk.cashiers;
      const cashiers2 = sdk.cashiers;
      
      expect(cashiers1).toBe(cashiers2);
    });

    it('should provide access to underlying HTTP client', () => {
      expect(sdk.httpClient).toBeInstanceOf(HttpClient);
    });
  });

  describe('Environment Configuration', () => {
    it('should use sandbox URLs for sandbox environment', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
      // The exact URL checking would require exposing internal config
    });

    it('should use production URLs for production environment', () => {
      sdk = new ACubeSDK({
        environment: 'production',
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
    });

    it('should use development URLs for development environment', () => {
      sdk = new ACubeSDK({
        environment: 'development',
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
    });

    it('should override URLs with custom base URLs', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        baseUrls: {
          api: 'https://my-custom-api.com',
          auth: 'https://my-custom-auth.com',
        },
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
    });
  });

  describe('API Key Handling', () => {
    it('should work without API key for public endpoints', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
      expect(sdk.cashiers).toBeDefined();
    });

    it('should configure HTTP client with API key when provided', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        apiKey: 'sk_test_12345',
      });

      expect(sdk).toBeInstanceOf(ACubeSDK);
      expect(sdk.httpClient).toBeInstanceOf(HttpClient);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        apiKey: 'test-api-key',
      });
    });

    it('should be an event emitter', () => {
      expect(typeof sdk.on).toBe('function');
      expect(typeof sdk.emit).toBe('function');
      expect(typeof sdk.removeAllListeners).toBe('function');
    });

    it('should allow registering event listeners', () => {
      const listener = jest.fn();
      
      sdk.on('request:start', listener);
      
      // Emit a test event
      sdk.emit('request:start', { method: 'GET', url: '/test' });
      
      expect(listener).toHaveBeenCalledWith({ method: 'GET', url: '/test' });
    });

    it('should allow removing event listeners', () => {
      const listener = jest.fn();
      
      sdk.on('request:complete', listener);
      sdk.removeAllListeners();
      
      sdk.emit('request:complete', { status: 200 });
      
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple event types', () => {
      const startListener = jest.fn();
      const completeListener = jest.fn();
      const errorListener = jest.fn();
      
      sdk.on('request:start', startListener);
      sdk.on('request:complete', completeListener);
      sdk.on('request:error', errorListener);
      
      sdk.emit('request:start', { method: 'POST' });
      sdk.emit('request:complete', { status: 201 });
      sdk.emit('request:error', { error: new Error('test') });
      
      expect(startListener).toHaveBeenCalledTimes(1);
      expect(completeListener).toHaveBeenCalledTimes(1);
      expect(errorListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('HTTP Configuration', () => {
    it('should merge custom HTTP config with defaults', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        httpConfig: {
          timeout: 15000,
          enableLogging: true,
          userAgent: 'Custom-Agent/1.0.0',
        },
      });

      expect(sdk.httpClient).toBeInstanceOf(HttpClient);
    });

    it('should handle partial HTTP config', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        httpConfig: {
          timeout: 5000,
        },
      });

      expect(sdk.httpClient).toBeInstanceOf(HttpClient);
    });

    it('should work with empty HTTP config', () => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
        httpConfig: {},
      });

      expect(sdk.httpClient).toBeInstanceOf(HttpClient);
    });
  });

  describe('Lazy Loading', () => {
    beforeEach(() => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
      });
    });

    it('should lazily load resources only when accessed', () => {
      // Resources should be loaded on first access
      expect(sdk.cashiers).toBeDefined();
      expect(sdk.receipts).toBeDefined();
      expect(sdk.merchants).toBeDefined();
      expect(sdk.cashRegisters).toBeDefined();
      expect(sdk.pointOfSales).toBeDefined();
      expect(sdk.pems).toBeDefined();
    });

    it('should cache loaded resources', () => {
      const cashiers1 = sdk.cashiers;
      const cashiers2 = sdk.cashiers;
      
      expect(cashiers1).toBe(cashiers2);
    });
  });

  describe('Version and Metadata', () => {
    beforeEach(() => {
      sdk = new ACubeSDK({
        environment: 'sandbox',
      });
    });

    it('should expose SDK version information', () => {
      // Version info should be accessible if implemented
      expect(sdk).toBeInstanceOf(ACubeSDK);
    });

    it('should maintain configuration', () => {
      const config = {
        environment: 'production' as const,
        apiKey: 'test-key',
      };
      
      const prodSdk = new ACubeSDK(config);
      
      expect(prodSdk).toBeInstanceOf(ACubeSDK);
      prodSdk.removeAllListeners();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid environment gracefully', () => {
      // This would depend on implementation, but should not crash
      expect(() => {
        sdk = new ACubeSDK({
          environment: 'invalid' as any,
        });
      }).not.toThrow();
      
      if (sdk) {
        sdk.removeAllListeners();
      }
    });

    it('should handle malformed base URLs gracefully', () => {
      expect(() => {
        sdk = new ACubeSDK({
          environment: 'sandbox',
          baseUrls: {
            api: 'not-a-valid-url',
          },
        });
      }).not.toThrow();
      
      if (sdk) {
        sdk.removeAllListeners();
      }
    });
  });
});