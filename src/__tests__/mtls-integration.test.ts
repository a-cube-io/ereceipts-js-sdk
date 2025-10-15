/**
 * mTLS Integration Tests the React Native mTLS adapter functionality
 */

import { ReactNativeMTLSAdapter } from '../platforms/react-native/mtls';
import { MTLSError } from '../adapters';

// Mock the @a-cube-io/expo-mutual-tls module
jest.mock('@a-cube-io/expo-mutual-tls', () => ({
  configurePEM: jest.fn().mockResolvedValue({ success: true }),
  storePEM: jest.fn().mockResolvedValue({ success: true }),
  configureP12: jest.fn().mockResolvedValue({ success: true }),
  storeP12: jest.fn().mockResolvedValue({ success: true }),
  hasCertificate: jest.fn().mockResolvedValue(true),
  removeCertificate: jest.fn().mockResolvedValue(undefined),
  request: jest.fn().mockResolvedValue({
    success: true,
    statusCode: 200,
    statusMessage: 'OK',
    headers: { 'content-type': ['application/json'] },
    body: JSON.stringify({ test: 'data' })
  }),
  testConnection: jest.fn().mockResolvedValue({
    success: true,
    statusCode: 200,
    statusMessage: 'OK',
    tlsVersion: 'TLSv1.3',
    cipherSuite: 'TLS_AES_256_GCM_SHA384'
  }),
  onDebugLog: jest.fn(),
  onError: jest.fn(),
  onCertificateExpiry: jest.fn()
}), { virtual: true });

describe('mTLS Integration Tests', () => {
  let adapter: ReactNativeMTLSAdapter;
  
  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ReactNativeMTLSAdapter(true);
  });

  describe('Adapter Initialization', () => {
    it('should initialize mTLS adapter', () => {
      expect(adapter).toBeInstanceOf(ReactNativeMTLSAdapter);
    });

    it('should detect mTLS support', async () => {
      const isSupported = await adapter.isMTLSSupported();
      expect(isSupported).toBe(true);
    });

    it('should initialize with configuration', async () => {
      const config = {
        baseUrl: 'https://api.test.com:444',
        port: 444,
        timeout: 30000
      };

      await adapter.initialize(config);
      expect(adapter.getBaseUrl()).toBe(config.baseUrl);
    });
  });

  describe('Certificate Management', () => {
    beforeEach(async () => {
      await adapter.initialize({
        baseUrl: 'https://api.test.com:444'
      });
    });

    it('should configure PEM certificate', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      
      const certificateData = {
        certificate: '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----',
        privateKey: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----',
        format: 'PEM' as const
      };

      await adapter.configureCertificate(certificateData);

      expect(ExpoMTLS.configurePEM).toHaveBeenCalledWith(
        'client-cert-service',
        'client-key-service',
        true
      );
      
      expect(ExpoMTLS.storePEM).toHaveBeenCalledWith(
        certificateData.certificate,
        certificateData.privateKey,
        undefined
      );
    });

    it('should check certificate availability', async () => {
      const hasCert = await adapter.hasCertificate();
      expect(hasCert).toBe(true);
    });

    it('should remove certificate', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      
      await adapter.removeCertificate();
      
      expect(ExpoMTLS.removeCertificate).toHaveBeenCalled();
    });
  });

  describe('Network Requests', () => {
    beforeEach(async () => {
      await adapter.initialize({
        baseUrl: 'https://api.test.com:444'
      });
    });

    it('should make mTLS request', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      
      const requestConfig = {
        url: '/test',
        method: 'GET' as const,
        headers: { 'Authorization': 'Bearer token' }
      };

      const response = await adapter.request(requestConfig);

      expect(ExpoMTLS.request).toHaveBeenCalledWith(
        requestConfig.url,
        expect.objectContaining({
          method: requestConfig.method,
          headers: requestConfig.headers
        })
      );

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ test: 'data' });
    });

    it('should test connection', async () => {
      const canConnect = await adapter.testConnection();
      expect(canConnect).toBe(true);
    });

    it('should handle request errors', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      ExpoMTLS.request.mockRejectedValueOnce(new Error('Network error'));

      const requestConfig = {
        url: '/test',
        method: 'GET' as const
      };

      await expect(adapter.request(requestConfig))
        .rejects.toThrow(MTLSError);
    });
  });

  describe('Platform Information', () => {
    it('should return correct platform info', () => {
      const platformInfo = adapter.getPlatformInfo();

      expect(platformInfo).toEqual({
        platform: 'react-native',
        mtlsSupported: true,
        certificateStorage: 'keychain',
        fallbackToJWT: true,
        configured: false
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle certificate configuration errors', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      ExpoMTLS.configurePEM.mockRejectedValueOnce(new Error('Configuration failed'));

      await adapter.initialize({ baseUrl: 'https://api.test.com:444' });

      const certificateData = {
        certificate: 'invalid-cert',
        privateKey: 'invalid-key',
        format: 'PEM' as const
      };

      await expect(adapter.configureCertificate(certificateData))
        .rejects.toThrow(MTLSError);
    });

    it('should handle module not available', async () => {
      // Test when the module fails to load by temporarily breaking the module
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Create a new adapter and break its module reference to simulate failure
      const newAdapter = new ReactNativeMTLSAdapter(true);
      
      // Manually set the module to null to simulate unavailability
      (newAdapter as any).expoMTLS = null;
      
      const isSupported = await newAdapter.isMTLSSupported();
      
      expect(isSupported).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });
});