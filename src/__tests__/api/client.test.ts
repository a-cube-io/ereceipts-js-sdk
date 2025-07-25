import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  APIClient,
  initializeAPIClient,
  getAPIClient,
  configureSDK,
  getAuthClient,
  SDKConfig,
} from '../../api/client';
import { SecureTokenStorage } from '../../storage/token';
import { RequestQueue } from '../../storage/queue';
import { AxiosRetryInterceptor } from '../../utils/retry';
import { isConnected } from '../../utils/network';
import { apiLogger } from '../../utils/logger';
import { getBasePath } from '../../constants/endpoints';

// Mock dependencies
jest.mock('axios');
jest.mock('../../storage/token');
jest.mock('../../storage/queue');
jest.mock('../../utils/retry');
jest.mock('../../utils/network', () => ({
  isConnected: jest.fn(),
}));
jest.mock('../../utils/logger');
jest.mock('../../constants/endpoints');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
const mockRequestQueue = RequestQueue as jest.Mocked<typeof RequestQueue>;
const mockAxiosRetryInterceptor = AxiosRetryInterceptor as jest.Mocked<typeof AxiosRetryInterceptor>;
const mockIsConnected = isConnected as jest.MockedFunction<typeof isConnected>;
const mockApiLogger = apiLogger as jest.Mocked<typeof apiLogger>;
const mockGetBasePath = getBasePath as jest.MockedFunction<typeof getBasePath>;

describe('APIClient', () => {
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  let apiClient: APIClient;

  // Test configuration with required storage
  const testConfig: SDKConfig = {
    environment: 'sandbox',
    storage: {
      encryptionKeyId: 'test-key-v1',
      storeNamespace: 'test-store'
    },
    enableLogging: false,
    enableRetry: true,
    enableOfflineQueue: true,
    maxRetries: 3,
    retryDelay: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    } as any;

    mockAxios.create.mockReturnValue(mockAxiosInstance);
    mockGetBasePath.mockReturnValue('https://api.example.com');

    // Setup default mocks
    mockSecureTokenStorage.getToken.mockResolvedValue('test-token');
    mockSecureTokenStorage.isTokenValid.mockResolvedValue(true);
    mockSecureTokenStorage.configure.mockReturnValue(undefined);
    mockIsConnected.mockReturnValue(true);
    mockRequestQueue.getQueueStats.mockResolvedValue({ total: 0, byPriority: { high: 0, medium: 0, low: 0 } });

    // Create API client instance with required storage config
    apiClient = new APIClient(testConfig);
  });

  describe('Constructor and Configuration', () => {
    it('should create APIClient with default configuration', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    });

    it('should create APIClient with custom configuration', () => {
      const customConfig: SDKConfig = {
        environment: 'production',
        storage: {
          encryptionKeyId: 'prod-key-v1',
          storeNamespace: 'prod-store'
        },
        enableRetry: false,
        enableLogging: false,
      };

      new APIClient(customConfig);

      expect(mockGetBasePath).toHaveBeenCalledWith('api', 'production');
      expect(mockSecureTokenStorage.configure).toHaveBeenCalledWith(customConfig.storage);
    });

    it('should setup interceptors on creation', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('HTTP Methods', () => {
    const mockResponse = { data: { success: true }, status: 200 };

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      mockAxiosInstance.patch.mockResolvedValue(mockResponse);
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
    });

    it('should make GET requests', async () => {
      const result = await apiClient.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should make POST requests', async () => {
      const data = { test: 'data' };
      const result = await apiClient.post('/test', data);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', data, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should make PUT requests', async () => {
      const data = { test: 'data' };
      const result = await apiClient.put('/test', data);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', data, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should make PATCH requests', async () => {
      const data = { test: 'data' };
      const result = await apiClient.patch('/test', data);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', data, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should make DELETE requests', async () => {
      const result = await apiClient.delete('/test');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = { timeout: 60000, enableLogging: false };
      
      apiClient.updateConfig(newConfig);
      
      const currentConfig = apiClient.getConfig();
      expect(currentConfig.timeout).toBe(60000);
      expect(currentConfig.enableLogging).toBe(false);
    });

    it('should return configuration copy', () => {
      const config = apiClient.getConfig();
      
      expect(config).toEqual(testConfig);
      expect(config).not.toBe(apiClient.getConfig()); // Should be different objects
    });
  });

  describe('Authentication Utilities', () => {
    it('should check if user is authenticated', async () => {
      const result = await apiClient.isAuthenticated();
      
      expect(result).toBe(true);
      expect(mockSecureTokenStorage.getToken).toHaveBeenCalled();
      expect(mockSecureTokenStorage.isTokenValid).toHaveBeenCalled();
    });

    it('should return false when not authenticated', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue(null);
      
      const result = await apiClient.isAuthenticated();
      
      expect(result).toBe(false);
    });

    it('should get current token', async () => {
      const result = await apiClient.getCurrentToken();
      
      expect(result).toBe('test-token');
      expect(mockSecureTokenStorage.getToken).toHaveBeenCalled();
    });
  });

  describe('Offline Queue Management', () => {
    it('should get offline queue stats', async () => {
      const stats = { total: 5, byPriority: { high: 2, medium: 2, low: 1 } };
      mockRequestQueue.getQueueStats.mockResolvedValue(stats);
      
      const result = await apiClient.getOfflineQueueStats();
      
      expect(result).toEqual(stats);
    });

    it('should clear offline queue', async () => {
      await apiClient.clearOfflineQueue();
      
      expect(mockRequestQueue.clearQueue).toHaveBeenCalled();
      expect(mockApiLogger.info).toHaveBeenCalledWith('Offline queue cleared');
    });
  });

  describe('Client Factory Methods', () => {
    it('should create auth client', () => {
      const authClient = apiClient.createAuthClient();
      
      expect(authClient).toBeInstanceOf(APIClient);
      expect(mockGetBasePath).toHaveBeenCalledWith('auth', 'sandbox');
    });

    // Note: createModeClient method was removed in favor of automatic mode management
  });

  describe('Global API Client Management', () => {
    beforeEach(() => {
      // Clear global instance
      (getAPIClient as any).apiClient = undefined;
    });

    it('should initialize API client', () => {
      const config: SDKConfig = {
        environment: 'production',
        storage: {
          encryptionKeyId: 'init-key-v1',
          storeNamespace: 'init-store'
        }
      };
      const client = initializeAPIClient(config);
      
      expect(client).toBeInstanceOf(APIClient);
      expect(mockGetBasePath).toHaveBeenCalledWith('api', 'production');
    });

    it('should get existing API client instance', () => {
      const client1 = getAPIClient();
      const client2 = getAPIClient();
      
      expect(client1).toBe(client2);
    });

    it('should work with properly initialized API client', () => {
      // Ensure we have a client initialized from previous tests
      const config: SDKConfig = {
        environment: 'sandbox',
        storage: {
          encryptionKeyId: 'health-key-v1',
          storeNamespace: 'health-store'
        }
      };
      initializeAPIClient(config);
      
      expect(() => getAPIClient()).not.toThrow();
      expect(getAPIClient()).toBeInstanceOf(APIClient);
    });

    it('should configure SDK', () => {
      // First ensure we have an initialized client
      const initConfig: SDKConfig = {
        environment: 'sandbox',
        storage: {
          encryptionKeyId: 'config-key-v1',
          storeNamespace: 'config-store'
        }
      };
      initializeAPIClient(initConfig);
      
      const config = { enableLogging: false };
      
      configureSDK(config);
      
      // The configureSDK calls updateConfig on existing client
      expect(mockAxios.create).toHaveBeenCalled();
    });

    it('should get auth client instance', () => {
      // First ensure we have an initialized client
      const config: SDKConfig = {
        environment: 'sandbox',
        storage: {
          encryptionKeyId: 'auth-key-v1',
          storeNamespace: 'auth-store'
        }
      };
      initializeAPIClient(config);
      
      const authClient = getAuthClient();
      
      expect(authClient).toBeInstanceOf(APIClient);
      // The getAuthClient calls getAPIClient first, then createAuthClient
      expect(mockGetBasePath).toHaveBeenCalledWith('auth', expect.any(String));
    });
  });

  describe('Priority Determination', () => {
    it('should assign high priority to receipt and activation endpoints', () => {
      const client = new APIClient(testConfig);
      const request = { url: '/receipts/123' };
      
      // Access private method through any
      const determinePriority = (client as any).determinePriority;
      const priority = determinePriority(request);
      
      expect(priority).toBe('high');
    });

    it('should assign medium priority to merchant and cash-register endpoints', () => {
      const client = new APIClient(testConfig);
      const request = { url: '/merchants/456' };
      
      const determinePriority = (client as any).determinePriority;
      const priority = determinePriority(request);
      
      expect(priority).toBe('medium');
    });

    it('should assign low priority to other endpoints', () => {
      const client = new APIClient(testConfig);
      const request = { url: '/other/endpoint' };
      
      const determinePriority = (client as any).determinePriority;
      const priority = determinePriority(request);
      
      expect(priority).toBe('low');
    });
  });

  describe('Interceptor Setup', () => {
    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should setup retry interceptor when enabled', () => {
      const configWithRetry = { ...testConfig, enableRetry: true };
      new APIClient(configWithRetry);

      expect(mockAxiosRetryInterceptor.setupInterceptors).toHaveBeenCalledWith(
        mockAxiosInstance,
        expect.objectContaining({
          retries: 3,
          retryDelay: 1000,
        })
      );
    });

    it('should not setup retry interceptor when disabled', () => {
      // Clear previous calls
      jest.clearAllMocks();
      
      const configWithoutRetry = { ...testConfig, enableRetry: false };
      new APIClient(configWithoutRetry);

      expect(mockAxiosRetryInterceptor.setupInterceptors).not.toHaveBeenCalled();
    });
  });



  describe('Configuration Updates', () => {
    it('should recreate axios instance when base URL configs change', () => {
      const newConfig = { environment: 'production' as const };
      
      apiClient.updateConfig(newConfig);
      
      expect(mockAxios.create).toHaveBeenCalledTimes(2); // Once in constructor, once in updateConfig
    });

    it('should not recreate axios instance when non-base URL configs change', () => {
      const newConfig = { timeout: 60000 };
      
      apiClient.updateConfig(newConfig);
      
      expect(mockAxios.create).toHaveBeenCalledTimes(1); // Only in constructor
    });

    it('should configure storage when storage config is updated', () => {
      const newStorageConfig = {
        encryptionKeyId: 'new-key-v2',
        storeNamespace: 'new-store'
      };
      const newConfig = { storage: newStorageConfig };
      
      apiClient.updateConfig(newConfig);
      
      expect(mockSecureTokenStorage.configure).toHaveBeenCalledWith(newStorageConfig);
    });

    it('should not recreate instance when non-environment configs change', () => {
      const initialCreateCallCount = mockAxios.create.mock.calls.length;
      const newConfig = { enableLogging: false };
      
      apiClient.updateConfig(newConfig);
      
      expect(mockAxios.create).toHaveBeenCalledTimes(initialCreateCallCount); // No additional calls
    });
  });

  describe('Advanced HTTP Methods', () => {
    const mockResponse = { data: { success: true }, status: 200 };

    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue(mockResponse);
    });

    it('should make custom requests', async () => {
      const config = { method: 'POST', url: '/test', data: { test: 'data' } };
      const result = await apiClient.request(config);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(config);
      expect(result).toEqual(mockResponse);
    });

    it('should get axios instance', () => {
      const instance = apiClient.getAxiosInstance();

      expect(instance).toBe(mockAxiosInstance);
    });
  });

  describe('Offline Queue Management', () => {
    it('should get offline queue stats', async () => {
      const stats = { total: 5, byPriority: { high: 2, medium: 2, low: 1 } };
      mockRequestQueue.getQueueStats.mockResolvedValue(stats);
      
      const result = await apiClient.getOfflineQueueStats();
      
      expect(result).toEqual(stats);
    });

    it('should clear offline queue', async () => {
      await apiClient.clearOfflineQueue();
      
      expect(mockRequestQueue.clearQueue).toHaveBeenCalled();
      expect(mockApiLogger.info).toHaveBeenCalledWith('Offline queue cleared');
    });
  });

  describe('Error Handling', () => {
    it('should handle axios instance creation errors', () => {
      mockAxios.create.mockImplementationOnce(() => {
        throw new Error('Axios creation failed');
      });

      expect(() => new APIClient(testConfig)).toThrow('Axios creation failed');
    });



    it('should handle queue processing errors', async () => {
      mockRequestQueue.getQueueStats.mockRejectedValueOnce(new Error('Queue error'));
      
      await expect(apiClient.processOfflineQueue()).rejects.toThrow('Queue error');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete request lifecycle with authentication', async () => {
      const mockResponse = { data: { success: true }, status: 200 };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.post('/test', { data: 'test' });

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { data: 'test' }, undefined);
    });

    it('should handle offline request queuing and processing', async () => {
      // Simulate offline scenario
      mockIsConnected.mockReturnValueOnce(false);
      mockRequestQueue.getQueueStats.mockResolvedValueOnce({ total: 1, byPriority: { high: 1, medium: 0, low: 0 } });
      mockRequestQueue.getNextRequest.mockResolvedValueOnce(null);

      // This would normally queue a request, but we're testing the offline queue processing
      await apiClient.processOfflineQueue();

      expect(mockIsConnected).toHaveBeenCalled();
    });

    it('should handle configuration updates and instance recreation', () => {
      const initialConfig = apiClient.getConfig();
      
      apiClient.updateConfig({ environment: 'production' });
      
      const updatedConfig = apiClient.getConfig();
      expect(updatedConfig.environment).toBe('production');
      expect(updatedConfig).not.toEqual(initialConfig);
    });
  });
}); 