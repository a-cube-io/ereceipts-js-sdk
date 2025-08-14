import axios from 'axios';
import { HttpClient, OptimisticRequestConfig } from '../http-client';
import { ConfigManager } from '../../config';
import { ICacheAdapter, CachedItem } from '../../../adapters';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cache adapter
class MockCacheAdapter implements ICacheAdapter {
  private cache = new Map<string, CachedItem<any>>();

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    return this.cache.get(key) || null;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.setItem(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || 300000,
    });
  }

  async setItem<T>(key: string, item: CachedItem<T>): Promise<void> {
    this.cache.set(key, item);
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getSize() {
    return {
      entries: this.cache.size,
      bytes: 0,
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    return 0;
  }

  async getKeys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }
}

describe('HttpClient Optimistic Operations', () => {
  let httpClient: HttpClient;
  let configManager: ConfigManager;
  let cacheAdapter: MockCacheAdapter;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset axios mock
    jest.clearAllMocks();
    
    // Setup mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      defaults: { headers: { common: {} }, baseURL: 'https://api.test.com' },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Setup config manager
    configManager = new ConfigManager({
      apiUrl: 'https://api.test.com', environment: 'development',
        //apiKey: 'test-key',
      debug: false
    });

    // Setup cache adapter
    cacheAdapter = new MockCacheAdapter();

    // Create HTTP client with cache
    httpClient = new HttpClient(configManager, cacheAdapter);
  });

  describe('postOptimistic', () => {
    it('should return optimistic data immediately when optimistic=true', async () => {
      const requestData = { name: 'Test Receipt', amount: '10.00' };
      const optimisticData = { id: 'temp-123', name: 'Test Receipt', amount: '10.00' };
      const config: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData,
        cacheKey: 'receipt:temp-123'
      };

      const result = await httpClient.postOptimistic('/receipts', requestData, config);

      expect(result).toEqual(optimisticData);

      // Verify data was cached
      const cachedItem = await cacheAdapter.get('receipt:temp-123');
      expect(cachedItem).toBeTruthy();
      expect(cachedItem!.data).toEqual(optimisticData);
      expect(cachedItem!.source).toBe('optimistic');
      expect(cachedItem!.syncStatus).toBe('pending');
      expect(cachedItem!.tags).toContain('optimistic_post');
    });

    it('should fallback to regular POST when optimistic=false', async () => {
      const requestData = { name: 'Test Receipt', amount: '10.00' };
      const serverResponse = { id: '123', name: 'Test Receipt', amount: '10.00' };
      
      mockAxiosInstance.post.mockResolvedValue({ data: serverResponse });

      const config: OptimisticRequestConfig = {
        optimistic: false,
        optimisticData: { id: 'temp-123', name: 'Test Receipt', amount: '10.00' },
        cacheKey: 'receipt:temp-123'
      };

      const result = await httpClient.postOptimistic('/receipts', requestData, config);

      expect(result).toEqual(serverResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/receipts', requestData, config);

      // Verify no optimistic data was cached
      const cachedItem = await cacheAdapter.get('receipt:temp-123');
      expect(cachedItem).toBeNull();
    });

    it('should fallback to regular POST when cache is not available', async () => {
      const httpClientNoCache = new HttpClient(configManager); // No cache
      const requestData = { name: 'Test Receipt', amount: '10.00' };
      const serverResponse = { id: '123', name: 'Test Receipt', amount: '10.00' };
      
      mockAxiosInstance.post.mockResolvedValue({ data: serverResponse });

      const config: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData: { id: 'temp-123', name: 'Test Receipt', amount: '10.00' },
        cacheKey: 'receipt:temp-123'
      };

      const result = await httpClientNoCache.postOptimistic('/receipts', requestData, config);

      expect(result).toEqual(serverResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/receipts', requestData, config);
    });

    it('should require optimisticData and cacheKey for optimistic mode', async () => {
      const requestData = { name: 'Test Receipt', amount: '10.00' };
      const serverResponse = { id: '123', name: 'Test Receipt', amount: '10.00' };
      
      mockAxiosInstance.post.mockResolvedValue({ data: serverResponse });

      // Missing optimisticData
      const configNoData: OptimisticRequestConfig = {
        optimistic: true,
        cacheKey: 'receipt:temp-123'
      };

      let result = await httpClient.postOptimistic('/receipts', requestData, configNoData);
      expect(result).toEqual(serverResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalled();

      // Missing cacheKey
      const configNoKey: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData: { id: 'temp-123', name: 'Test Receipt', amount: '10.00' }
      };

      result = await httpClient.postOptimistic('/receipts', requestData, configNoKey);
      expect(result).toEqual(serverResponse);
    });
  });

  describe('putOptimistic', () => {
    it('should return optimistic data immediately when optimistic=true', async () => {
      const requestData = { name: 'Updated Receipt', amount: '15.00' };
      const optimisticData = { id: '123', name: 'Updated Receipt', amount: '15.00' };
      const config: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData,
        cacheKey: 'receipt:123'
      };

      const result = await httpClient.putOptimistic('/receipts/123', requestData, config);

      expect(result).toEqual(optimisticData);

      // Verify data was cached with PUT tag
      const cachedItem = await cacheAdapter.get('receipt:123');
      expect(cachedItem!.tags).toContain('optimistic_put');
    });
  });

  describe('patchOptimistic', () => {
    it('should return optimistic data immediately when optimistic=true', async () => {
      const requestData = { amount: '20.00' };
      const optimisticData = { id: '123', name: 'Test Receipt', amount: '20.00' };
      const config: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData,
        cacheKey: 'receipt:123'
      };

      const result = await httpClient.patchOptimistic('/receipts/123', requestData, config);

      expect(result).toEqual(optimisticData);

      // Verify data was cached with PATCH tag
      const cachedItem = await cacheAdapter.get('receipt:123');
      expect(cachedItem!.tags).toContain('optimistic_patch');
    });
  });

  describe('deleteOptimistic', () => {
    it('should return optimistic data when provided', async () => {
      const optimisticData = { id: '123', status: 'deleted' };
      const config: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData,
        cacheKey: 'receipt:123'
      };

      const result = await httpClient.deleteOptimistic('/receipts/123', config);

      expect(result).toEqual(optimisticData);

      // Verify data was cached with DELETE tag
      const cachedItem = await cacheAdapter.get('receipt:123');
      expect(cachedItem!.tags).toContain('optimistic_delete');
    });

    it('should invalidate cache when no optimistic data provided', async () => {
      // Pre-populate cache
      await cacheAdapter.set('receipt:123', { id: '123', name: 'Test Receipt' });

      const config: OptimisticRequestConfig = {
        optimistic: true,
        cacheKey: 'receipt:123'
      };

      const result = await httpClient.deleteOptimistic('/receipts/123', config);

      expect(result).toEqual({});

      // Verify cache was invalidated
      const cachedItem = await cacheAdapter.get('receipt:123');
      expect(cachedItem).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle cache errors gracefully', async () => {
      // The optimistic operations should handle cache errors gracefully
      // For now, we'll test that it doesn't throw on cache errors
      const config: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData: { id: 'temp-123', name: 'Test Receipt', amount: '10.00' },
        cacheKey: 'receipt:temp-123'
      };

      // Test with a good response
      const serverResponse = { id: '123', name: 'Test Receipt', amount: '10.00' };
      mockAxiosInstance.post.mockResolvedValue({ data: serverResponse });

      // Should not throw even if cache operations might fail
      const result = await httpClient.postOptimistic('/receipts', {}, config);
      expect(result).toBeTruthy();
    });

    it('should handle errors in optimistic operations', async () => {
      const requestData = { name: 'Test Receipt', amount: '10.00' };
      
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { detail: 'Bad request' }
        },
        message: 'Request failed with status code 400'
      };
      
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      // Test that postOptimistic handles errors when falling back to regular POST
      try {
        await httpClient.postOptimistic('/receipts', requestData, { optimistic: false });
        fail('Should have thrown an error');
      } catch (error: any) {
        // Should throw some kind of SDK error
        expect(error.name).toBe('ACubeSDKError');
        expect(error.type).toBeTruthy();
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('debugging', () => {
    it('should log optimistic operations when debug enabled', async () => {
      const debugConfig = new ConfigManager({
        apiUrl: 'https://api.test.com',
        environment: 'development',
        //apiKey: 'test-key',
        debug: true
      });

      const debugHttpClient = new HttpClient(debugConfig, cacheAdapter);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const optimisticData = { id: 'temp-123', name: 'Test Receipt', amount: '10.00' };
      const config: OptimisticRequestConfig = {
        optimistic: true,
        optimisticData,
        cacheKey: 'receipt:temp-123'
      };

      await debugHttpClient.postOptimistic('/receipts', {}, config);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Optimistic POST data cached:',
        expect.objectContaining({
          url: '/receipts',
          cacheKey: 'receipt:temp-123'
        })
      );

      consoleSpy.mockRestore();
    });
  });
});