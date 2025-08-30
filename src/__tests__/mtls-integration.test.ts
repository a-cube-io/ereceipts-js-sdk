/**
 * mTLS Integration Tests
 * Tests the complete mTLS flow with @a-cube-io/expo-mutual-tls
 */

import { ConfigManager } from '../core/config';
import { EnhancedHttpClient } from '../core/api/enhanced-http-client';
import { CertificateManager } from '../core/certificate-manager';
import { EnhancedReceiptsAPI } from '../core/api/enhanced-receipts';
import { EnhancedCashRegistersAPI } from '../core/api/enhanced-cash-registers';
import { CashRegistersAPI } from '../core/api/cash-registers';
import { PemsAPI } from '../core/api/pems';
import { ExpoMTLSAdapter } from '../adapters/expo-mtls';
import { MTLSError, MTLSErrorType } from '../adapters/mtls';

// Mock the @a-cube-io/expo-mutual-tls module
jest.mock('@a-cube-io/expo-mutual-tls', () => ({
  configurePEM: jest.fn(),
  configureP12: jest.fn(),
  request: jest.fn(),
  testConnection: jest.fn(),
  hasCertificate: jest.fn(),
  removeCertificate: jest.fn(),
  onDebugLog: jest.fn(),
  onError: jest.fn(),
  onCertificateExpiry: jest.fn()
}));

// Mock console methods to capture debug logs
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

describe('mTLS Integration Tests', () => {
  let config: ConfigManager;
  let httpClient: EnhancedHttpClient;
  let certificateManager: CertificateManager;
  let receiptsAPI: EnhancedReceiptsAPI;
  let cashRegistersAPI: EnhancedCashRegistersAPI;

  const mockCashRegister = {
    id: 'cash-register-123',
    name: 'Test Cash Register',
    pem_id: 'PEM123456',
    mtls_certificate: '-----BEGIN CERTIFICATE-----\nMOCK_CERTIFICATE\n-----END CERTIFICATE-----',
    private_key: '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----'
  };

  const mockReceipt = {
    uuid: 'receipt-uuid-123',
    number: 'R001',
    total: 100.00,
    status: 'completed'
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Initialize components with debug enabled
    config = new ConfigManager({
      apiUrl: 'https://api.acube.com:443',
      timeout: 30000,
      debug: true
    });

    httpClient = new EnhancedHttpClient(config);
    
    const baseCashRegistersAPI = new CashRegistersAPI(httpClient as any);
    const pemsAPI = new PemsAPI(httpClient as any);
    
    certificateManager = new CertificateManager(
      httpClient,
      baseCashRegistersAPI,
      pemsAPI,
      true // debug enabled
    );

    receiptsAPI = new EnhancedReceiptsAPI(httpClient, true);
    cashRegistersAPI = new EnhancedCashRegistersAPI(
      httpClient, 
      certificateManager, 
      true
    );

    // Set up user context
    receiptsAPI.setUserContext({
      roles: ['ROLE_CASHIER'], // Non-merchant role to test mTLS
      userId: 'test-user-123',
      merchantId: 'test-merchant-456'
    });
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
  });

  describe('ExpoMTLSAdapter', () => {
    let adapter: ExpoMTLSAdapter;

    beforeEach(() => {
      adapter = new ExpoMTLSAdapter(true);
    });

    test('should detect mTLS support correctly', async () => {
      const isSupported = await adapter.isMTLSSupported();
      
      // Should log detection attempt
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[MTLS-ADAPTER] mTLS support check:')
      );

      // In test environment, should return false (module is mocked)
      expect(isSupported).toBe(true); // Mocked module is available
    });

    test('should initialize with configuration', async () => {
      const config = {
        baseUrl: 'https://api.acube.com:444',
        port: 444,
        timeout: 30000
      };

      await adapter.initialize(config);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[MTLS-ADAPTER] Initialized with config:'),
        expect.objectContaining({
          baseUrl: config.baseUrl,
          port: config.port,
          timeout: config.timeout
        })
      );
    });

    test('should configure PEM certificate', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      ExpoMTLS.configurePEM.mockResolvedValueOnce(undefined);

      await adapter.initialize({
        baseUrl: 'https://api.acube.com:444',
        port: 444
      });

      const certificateData = {
        certificate: mockCashRegister.mtls_certificate,
        privateKey: mockCashRegister.private_key,
        format: 'PEM' as const
      };

      await adapter.configureCertificate(certificateData);

      expect(ExpoMTLS.configurePEM).toHaveBeenCalledWith({
        certificate: certificateData.certificate,
        privateKey: certificateData.privateKey,
        baseUrl: 'https://api.acube.com:444',
        timeout: undefined
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[MTLS-ADAPTER] PEM certificate configured successfully')
      );
    });

    test('should make mTLS request', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      ExpoMTLS.hasCertificate.mockResolvedValueOnce(true);
      ExpoMTLS.request.mockResolvedValueOnce({
        data: mockReceipt,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      });

      const requestConfig = {
        url: '/mf1/receipts',
        method: 'POST' as const,
        data: { test: 'data' },
        headers: { 'Authorization': 'Bearer token' }
      };

      const response = await adapter.request(requestConfig);

      expect(ExpoMTLS.request).toHaveBeenCalledWith({
        url: requestConfig.url,
        method: requestConfig.method,
        headers: requestConfig.headers,
        data: requestConfig.data,
        timeout: undefined
      });

      expect(response).toEqual({
        data: mockReceipt,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      });
    });

    test('should handle mTLS request failure', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      ExpoMTLS.hasCertificate.mockResolvedValueOnce(true);
      ExpoMTLS.request.mockRejectedValueOnce(new Error('Connection failed'));

      const requestConfig = {
        url: '/mf1/receipts',
        method: 'POST' as const
      };

      await expect(adapter.request(requestConfig))
        .rejects
        .toThrow(MTLSError);

      await expect(adapter.request(requestConfig))
        .rejects
        .toHaveProperty('type', MTLSErrorType.CONNECTION_FAILED);
    });
  });

  describe('EnhancedHttpClient', () => {
    test('should initialize with mTLS support', async () => {
      const status = await httpClient.getMTLSStatus();

      expect(status).toHaveProperty('adapterAvailable');
      expect(status).toHaveProperty('isReady');
      expect(status).toHaveProperty('platformInfo');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-HTTP] mTLS adapter initialized')
      );
    });

    test('should configure certificate for cash register', async () => {
      await httpClient.configureCashRegisterCertificate(
        mockCashRegister.id,
        mockCashRegister.mtls_certificate,
        mockCashRegister.private_key
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-HTTP] Certificate configured successfully'),
        mockCashRegister.id
      );
    });

    test('should test mTLS connectivity', async () => {
      const ExpoMTLS = require('@a-cube-io/expo-mutual-tls');
      ExpoMTLS.testConnection.mockResolvedValueOnce(true);

      const canConnect = await httpClient.testMTLSConnection();

      expect(canConnect).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-HTTP] mTLS connection test:'),
        true
      );
    });
  });

  describe('CertificateManager', () => {
    test('should auto-configure certificate from cash register', async () => {
      await certificateManager.autoConfigureCertificate(mockCashRegister);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[CERT-MANAGER] Auto-configuration successful'),
        mockCashRegister.id
      );

      const hasCert = certificateManager.hasCertificate(mockCashRegister.id);
      expect(hasCert).toBe(true);
    });

    test('should get certificate statistics', () => {
      // First configure a certificate
      certificateManager.autoConfigureCertificate(mockCashRegister);

      const stats = certificateManager.getStatistics();

      expect(stats).toHaveProperty('totalCertificates');
      expect(stats).toHaveProperty('byType');
      expect(stats.totalCertificates).toBeGreaterThan(0);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[CERT-MANAGER] Certificate statistics:')
      );
    });

    test('should remove certificate', async () => {
      // First configure a certificate
      await certificateManager.autoConfigureCertificate(mockCashRegister);

      // Then remove it
      await certificateManager.removeCertificate(mockCashRegister.id);

      const hasCert = certificateManager.hasCertificate(mockCashRegister.id);
      expect(hasCert).toBe(false);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[CERT-MANAGER] Certificate removed successfully'),
        mockCashRegister.id
      );
    });
  });

  describe('EnhancedReceiptsAPI', () => {
    beforeEach(async () => {
      // Configure certificate for testing
      await httpClient.configureCashRegisterCertificate(
        mockCashRegister.id,
        mockCashRegister.mtls_certificate,
        mockCashRegister.private_key
      );
    });

    test('should use role-based authentication for list', async () => {
      // Mock HTTP client methods
      const mockGet = jest.spyOn(httpClient, 'get').mockResolvedValueOnce({
        content: [mockReceipt],
        totalElements: 1,
        totalPages: 1
      });

      await receiptsAPI.list({ size: 10 });

      // Should be called with mTLS config for non-merchant role
      expect(mockGet).toHaveBeenCalledWith(
        '/mf1/receipts?size=10',
        expect.objectContaining({
          authMode: 'mtls',
          port: 444
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-RECEIPTS] Using mTLS authentication for non-merchant role')
      );
    });

    test('should use JWT for merchant role', async () => {
      // Set merchant role
      receiptsAPI.setUserContext({
        roles: ['ROLE_MERCHANT'],
        userId: 'merchant-user',
        merchantId: 'merchant-123'
      });

      const mockGet = jest.spyOn(httpClient, 'get').mockResolvedValueOnce({
        content: [mockReceipt],
        totalElements: 1,
        totalPages: 1
      });

      await receiptsAPI.list({ size: 10 });

      // Should be called with JWT config for merchant role
      expect(mockGet).toHaveBeenCalledWith(
        '/mf1/receipts?size=10',
        expect.objectContaining({
          authMode: 'jwt'
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-RECEIPTS] Using JWT authentication for merchant role')
      );
    });

    test('should create receipt with mTLS', async () => {
      const mockPost = jest.spyOn(httpClient, 'post').mockResolvedValueOnce(mockReceipt);

      const receiptData = {
        items: [{ name: 'Test Item', price: 10.00, quantity: 1 }],
        cashRegisterId: mockCashRegister.id
      };

      await receiptsAPI.create(receiptData);

      expect(mockPost).toHaveBeenCalledWith(
        '/mf1/receipts',
        receiptData,
        expect.objectContaining({
          authMode: 'mtls',
          port: 444,
          noFallback: false
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-RECEIPTS] Creating receipt with mTLS authentication')
      );
    });

    test('should test mTLS connectivity', async () => {
      const mockList = jest.spyOn(receiptsAPI, 'list').mockResolvedValueOnce({
        content: [mockReceipt],
        totalElements: 1,
        totalPages: 1
      } as any);

      const connectivity = await receiptsAPI.testMTLSConnectivity();

      expect(connectivity).toHaveProperty('isConnected', true);
      expect(connectivity).toHaveProperty('latency');

      expect(mockList).toHaveBeenCalledWith({ size: 1 });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-RECEIPTS] Testing mTLS connectivity')
      );
    });
  });

  describe('EnhancedCashRegistersAPI', () => {
    test('should create cash register with auto-certificate configuration', async () => {
      const mockPost = jest.spyOn(httpClient, 'post').mockResolvedValueOnce(mockCashRegister);

      const cashRegisterData = {
        name: 'Test Cash Register',
        pem_id: 'PEM123456'
      };

      const result = await cashRegistersAPI.create(cashRegisterData);

      expect(mockPost).toHaveBeenCalledWith(
        '/mf1/cash-registers',
        cashRegisterData,
        expect.objectContaining({
          authMode: 'jwt'
        })
      );

      expect(result).toEqual(mockCashRegister);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-CASH-REGISTERS] mTLS certificate auto-configured'),
        mockCashRegister.id
      );
    });

    test('should get certificate status', async () => {
      // First configure certificate
      await certificateManager.autoConfigureCertificate(mockCashRegister);

      const status = await cashRegistersAPI.getCertificateStatus(mockCashRegister.id);

      expect(status).toHaveProperty('hasCertificate', true);
      expect(status).toHaveProperty('isConfigured', true);
      expect(status).toHaveProperty('canConnect');
      expect(status).toHaveProperty('certificateInfo');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-CASH-REGISTERS] Certificate status:')
      );
    });

    test('should bulk configure certificates', async () => {
      const cashRegisterIds = ['cr1', 'cr2', 'cr3'];

      // Mock certificate manager
      const mockConfigure = jest.spyOn(certificateManager, 'configureCashRegisterCertificate')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Configuration failed'))
        .mockResolvedValueOnce(undefined);

      const result = await cashRegistersAPI.bulkConfigureCertificates(cashRegisterIds);

      expect(result.successful).toEqual(['cr1', 'cr3']);
      expect(result.failed).toEqual([
        { id: 'cr2', error: 'Configuration failed' }
      ]);

      expect(mockConfigure).toHaveBeenCalledTimes(3);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-CASH-REGISTERS] Bulk certificate configuration result:')
      );
    });
  });

  describe('Full Integration Flow', () => {
    test('should complete full mTLS integration flow', async () => {
      // Mock all necessary HTTP calls
      jest.spyOn(httpClient, 'post').mockResolvedValueOnce(mockCashRegister);
      jest.spyOn(httpClient, 'get').mockResolvedValueOnce({
        content: [mockReceipt],
        totalElements: 1,
        totalPages: 1
      });

      // 1. Create cash register with auto-certificate config
      const cashRegister = await cashRegistersAPI.create({
        name: 'Integration Test Cash Register',
        pem_id: 'PEM-INTEGRATION-123'
      });

      expect(cashRegister).toBeDefined();
      expect(cashRegister.id).toBeDefined();

      // 2. Verify certificate is configured
      const certStatus = await cashRegistersAPI.getCertificateStatus(cashRegister.id);
      expect(certStatus.hasCertificate).toBe(true);

      // 3. Test mTLS connectivity
      const connectivity = await receiptsAPI.testMTLSConnectivity();
      expect(connectivity.isConnected).toBe(true);

      // 4. Create receipt using mTLS
      jest.spyOn(httpClient, 'post').mockResolvedValueOnce(mockReceipt);
      
      const receipt = await receiptsAPI.create({
        items: [{ name: 'Integration Test Item', price: 50.00, quantity: 2 }],
        cashRegisterId: cashRegister.id
      });

      expect(receipt).toBeDefined();
      expect(receipt.uuid).toBeDefined();

      // 5. Verify all debug logs
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-CASH-REGISTERS] mTLS certificate auto-configured')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[ENHANCED-RECEIPTS] Creating receipt with mTLS authentication')
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle mTLS not supported gracefully', async () => {
      const adapter = new ExpoMTLSAdapter(true);
      
      // Mock module not available
      jest.doMock('@a-cube-io/expo-mutual-tls', () => {
        throw new Error('Module not found');
      });

      const isSupported = await adapter.isMTLSSupported();
      expect(isSupported).toBe(false);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[MTLS-ADAPTER] @a-cube-io/expo-mutual-tls not available')
      );
    });

    test('should handle certificate configuration errors', async () => {
      const invalidCertData = {
        certificate: 'invalid-cert',
        privateKey: 'invalid-key',
        format: 'PEM' as const
      };

      const adapter = new ExpoMTLSAdapter(true);
      await adapter.initialize({ baseUrl: 'https://api.acube.com:444' });

      await expect(adapter.configureCertificate(invalidCertData))
        .rejects
        .toThrow(MTLSError);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[MTLS-ADAPTER] Certificate configuration failed')
      );
    });
  });
});

// Test utilities
export const TestUtils = {
  createMockCashRegister: () => mockCashRegister,
  createMockReceipt: () => mockReceipt,
  
  async waitForAsyncOperation(operation: Promise<any>, timeout = 5000): Promise<any> {
    return Promise.race([
      operation,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }
};