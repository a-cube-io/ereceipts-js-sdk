import { BehaviorSubject } from 'rxjs';

import { CachedItem, ICachePort, INetworkPort, NetworkStatus } from '@/application/ports/driven';
import { ICacheKeyGenerator } from '@/application/ports/driven/cache-key.port';
import { HttpResponse, IHttpPort } from '@/application/ports/driven/http.port';

import { CachingHttpDecorator } from '../caching-http-decorator';

jest.mock('@/shared/utils', () => ({
  ...jest.requireActual('@/shared/utils'),
  createPrefixedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock implementations
function createMockHttpPort(): jest.Mocked<IHttpPort> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  };
}

function createMockCachePort(): jest.Mocked<ICachePort> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    setItem: jest.fn(),
    setBatch: jest.fn(),
    invalidate: jest.fn(),
    clear: jest.fn(),
    getSize: jest.fn(),
    cleanup: jest.fn(),
    getKeys: jest.fn(),
  };
}

function createMockKeyGenerator(): jest.Mocked<ICacheKeyGenerator> {
  return {
    generate: jest.fn(),
    parseResource: jest.fn(),
    getInvalidationPatterns: jest.fn(),
    getTTL: jest.fn(),
    shouldCache: jest.fn(),
  };
}

function createMockNetworkPort(): INetworkPort & { setOnline: (online: boolean) => void } {
  const status$ = new BehaviorSubject<NetworkStatus>({ online: true, timestamp: Date.now() });
  const online$ = new BehaviorSubject<boolean>(true);

  return {
    status$,
    online$,
    getNetworkInfo: jest.fn().mockResolvedValue(null),
    destroy: jest.fn(),
    setOnline: (online: boolean) => {
      status$.next({ online, timestamp: Date.now() });
      online$.next(online);
    },
  };
}

describe('CachingHttpDecorator', () => {
  let mockHttp: jest.Mocked<IHttpPort>;
  let mockCache: jest.Mocked<ICachePort>;
  let mockKeyGenerator: jest.Mocked<ICacheKeyGenerator>;
  let mockNetwork: ReturnType<typeof createMockNetworkPort>;
  let decorator: CachingHttpDecorator;

  beforeEach(() => {
    mockHttp = createMockHttpPort();
    mockCache = createMockCachePort();
    mockKeyGenerator = createMockKeyGenerator();
    mockNetwork = createMockNetworkPort();

    // Default mock implementations
    mockKeyGenerator.shouldCache.mockReturnValue(true);
    mockKeyGenerator.generate.mockImplementation((url) => `cache:${url}`);
    mockKeyGenerator.getTTL.mockReturnValue(5 * 60 * 1000); // 5 minutes
    mockKeyGenerator.getInvalidationPatterns.mockReturnValue([]);
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.invalidate.mockResolvedValue(undefined);

    decorator = new CachingHttpDecorator(mockHttp, mockCache, mockKeyGenerator, mockNetwork);
  });

  afterEach(() => {
    decorator.destroy();
    jest.clearAllMocks();
  });

  describe('GET requests - Cache behavior', () => {
    it('should return cached data when cache is valid (HIT)', async () => {
      const cachedData = { id: '123', name: 'Test' };
      const cachedItem: CachedItem<typeof cachedData> = {
        data: cachedData,
        timestamp: Date.now() - 1000, // 1 second ago
      };

      mockCache.get.mockResolvedValue(cachedItem);

      const result = await decorator.get<typeof cachedData>('/mf1/receipts/123');

      expect(result.data).toEqual(cachedData);
      expect(result.headers['x-cache']).toBe('HIT');
      expect(result.status).toBe(200);
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it('should fetch from network when cache is expired (MISS)', async () => {
      const staleData = { id: '123', name: 'Old' };
      const freshData = { id: '123', name: 'Fresh' };

      // Cache is older than TTL (5 minutes)
      mockCache.get.mockResolvedValue({
        data: staleData,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      });

      mockHttp.get.mockResolvedValue({
        data: freshData,
        status: 200,
        headers: {},
      });

      const result = await decorator.get<typeof freshData>('/mf1/receipts/123');

      expect(result.data).toEqual(freshData);
      expect(result.headers['x-cache']).toBe('MISS');
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith('cache:/mf1/receipts/123', freshData);
    });

    it('should fetch from network when cache is empty (MISS)', async () => {
      const freshData = { id: '123', name: 'Fresh' };

      mockCache.get.mockResolvedValue(null);
      mockHttp.get.mockResolvedValue({
        data: freshData,
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      const result = await decorator.get<typeof freshData>('/mf1/receipts/123');

      expect(result.data).toEqual(freshData);
      expect(result.headers['x-cache']).toBe('MISS');
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should return stale cache when offline', async () => {
      const staleData = { id: '123', name: 'Stale' };

      // Cache is expired
      mockCache.get.mockResolvedValue({
        data: staleData,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      });

      // Go offline
      mockNetwork.setOnline(false);

      const result = await decorator.get<typeof staleData>('/mf1/receipts/123');

      expect(result.data).toEqual(staleData);
      expect(result.headers['x-cache']).toBe('STALE');
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it('should return stale cache on network error', async () => {
      const staleData = { id: '123', name: 'Stale' };

      // Cache is expired
      mockCache.get.mockResolvedValue({
        data: staleData,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      });

      // Network error
      mockHttp.get.mockRejectedValue(new Error('Network error'));

      const result = await decorator.get<typeof staleData>('/mf1/receipts/123');

      expect(result.data).toEqual(staleData);
      expect(result.headers['x-cache']).toBe('STALE');
    });

    it('should throw error when network fails and no cache available', async () => {
      mockCache.get.mockResolvedValue(null);
      mockHttp.get.mockRejectedValue(new Error('Network error'));

      await expect(decorator.get('/mf1/receipts/123')).rejects.toThrow('Network error');
    });

    it('should bypass cache when shouldCache returns false', async () => {
      mockKeyGenerator.shouldCache.mockReturnValue(false);

      const response: HttpResponse<unknown> = {
        data: [{ id: '1' }, { id: '2' }],
        status: 200,
        headers: {},
      };
      mockHttp.get.mockResolvedValue(response);

      const result = await decorator.get('/mf1/receipts');

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(response.data);
    });

    it('should bypass cache when config.enabled is false', async () => {
      const disabledDecorator = new CachingHttpDecorator(
        mockHttp,
        mockCache,
        mockKeyGenerator,
        mockNetwork,
        { enabled: false }
      );

      const response: HttpResponse<unknown> = {
        data: { id: '123' },
        status: 200,
        headers: {},
      };
      mockHttp.get.mockResolvedValue(response);

      await disabledDecorator.get('/mf1/receipts/123');

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockHttp.get).toHaveBeenCalledTimes(1);

      disabledDecorator.destroy();
    });

    it('should pass request config to underlying http client', async () => {
      mockCache.get.mockResolvedValue(null);
      mockHttp.get.mockResolvedValue({ data: {}, status: 200, headers: {} });

      const config = { params: { page: 0, size: 10 }, timeout: 5000 };
      await decorator.get('/mf1/receipts/123', config);

      expect(mockHttp.get).toHaveBeenCalledWith('/mf1/receipts/123', config);
    });

    it('should use params for cache key generation', async () => {
      mockCache.get.mockResolvedValue(null);
      mockHttp.get.mockResolvedValue({ data: {}, status: 200, headers: {} });

      const params = { page: 0, size: 10 };
      await decorator.get('/mf1/receipts/123', { params });

      expect(mockKeyGenerator.generate).toHaveBeenCalledWith('/mf1/receipts/123', params);
    });

    it('should handle cache.get errors gracefully', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));
      mockHttp.get.mockResolvedValue({ data: { id: '123' }, status: 200, headers: {} });

      const result = await decorator.get('/mf1/receipts/123');

      expect(result.headers['x-cache']).toBe('MISS');
      expect(mockHttp.get).toHaveBeenCalled();
    });

    it('should handle cache.set errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockRejectedValue(new Error('Cache write error'));
      mockHttp.get.mockResolvedValue({ data: { id: '123' }, status: 200, headers: {} });

      // Should not throw
      const result = await decorator.get('/mf1/receipts/123');

      expect(result.data).toEqual({ id: '123' });
    });
  });

  describe('POST requests - Cache invalidation', () => {
    it('should call underlying http.post', async () => {
      const requestData = { name: 'New Item' };
      const responseData = { id: '123', name: 'New Item' };

      mockHttp.post.mockResolvedValue({
        data: responseData,
        status: 201,
        headers: {},
      });

      const result = await decorator.post('/mf1/receipts', requestData);

      expect(mockHttp.post).toHaveBeenCalledWith('/mf1/receipts', requestData, undefined);
      expect(result.data).toEqual(responseData);
    });

    it('should invalidate cache patterns after POST', async () => {
      mockKeyGenerator.getInvalidationPatterns.mockReturnValue(['receipt:list:*']);
      mockHttp.post.mockResolvedValue({ data: {}, status: 201, headers: {} });

      await decorator.post('/mf1/receipts', {});

      expect(mockKeyGenerator.getInvalidationPatterns).toHaveBeenCalledWith(
        '/mf1/receipts',
        'POST'
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('receipt:list:*');
    });
  });

  describe('PUT requests - Cache invalidation', () => {
    it('should call underlying http.put', async () => {
      const requestData = { name: 'Updated Item' };
      const responseData = { id: '123', name: 'Updated Item' };

      mockHttp.put.mockResolvedValue({
        data: responseData,
        status: 200,
        headers: {},
      });

      const result = await decorator.put('/mf1/receipts/123', requestData);

      expect(mockHttp.put).toHaveBeenCalledWith('/mf1/receipts/123', requestData, undefined);
      expect(result.data).toEqual(responseData);
    });

    it('should invalidate cache patterns after PUT', async () => {
      mockKeyGenerator.getInvalidationPatterns.mockReturnValue(['receipt:123*', 'receipt:list:*']);
      mockHttp.put.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await decorator.put('/mf1/receipts/123', {});

      expect(mockKeyGenerator.getInvalidationPatterns).toHaveBeenCalledWith(
        '/mf1/receipts/123',
        'PUT'
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('receipt:123*');
      expect(mockCache.invalidate).toHaveBeenCalledWith('receipt:list:*');
    });
  });

  describe('PATCH requests - Cache invalidation', () => {
    it('should call underlying http.patch', async () => {
      const requestData = { name: 'Patched' };

      mockHttp.patch.mockResolvedValue({
        data: { id: '123', name: 'Patched' },
        status: 200,
        headers: {},
      });

      await decorator.patch('/mf1/receipts/123', requestData);

      expect(mockHttp.patch).toHaveBeenCalledWith('/mf1/receipts/123', requestData, undefined);
    });

    it('should invalidate cache patterns after PATCH', async () => {
      mockKeyGenerator.getInvalidationPatterns.mockReturnValue(['receipt:123*']);
      mockHttp.patch.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await decorator.patch('/mf1/receipts/123', {});

      expect(mockKeyGenerator.getInvalidationPatterns).toHaveBeenCalledWith(
        '/mf1/receipts/123',
        'PATCH'
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('receipt:123*');
    });
  });

  describe('DELETE requests - Cache invalidation', () => {
    it('should call underlying http.delete', async () => {
      mockHttp.delete.mockResolvedValue({
        data: null,
        status: 204,
        headers: {},
      });

      await decorator.delete('/mf1/receipts/123');

      expect(mockHttp.delete).toHaveBeenCalledWith('/mf1/receipts/123', undefined);
    });

    it('should invalidate cache patterns after DELETE', async () => {
      mockKeyGenerator.getInvalidationPatterns.mockReturnValue(['receipt:123*', 'receipt:list:*']);
      mockHttp.delete.mockResolvedValue({ data: null, status: 204, headers: {} });

      await decorator.delete('/mf1/receipts/123');

      expect(mockKeyGenerator.getInvalidationPatterns).toHaveBeenCalledWith(
        '/mf1/receipts/123',
        'DELETE'
      );
      expect(mockCache.invalidate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Auth token management', () => {
    it('should delegate setAuthToken to underlying http', () => {
      decorator.setAuthToken('test-token');

      expect(mockHttp.setAuthToken).toHaveBeenCalledWith('test-token');
    });

    it('should store auth token locally', () => {
      decorator.setAuthToken('test-token');

      expect(decorator.getAuthToken()).toBe('test-token');
    });

    it('should handle null token', () => {
      decorator.setAuthToken('test-token');
      decorator.setAuthToken(null);

      expect(mockHttp.setAuthToken).toHaveBeenLastCalledWith(null);
      expect(decorator.getAuthToken()).toBeNull();
    });
  });

  describe('Network monitoring', () => {
    it('should use network monitor online state', async () => {
      const staleData = { id: '123' };

      mockCache.get.mockResolvedValue({
        data: staleData,
        timestamp: Date.now() - 10 * 60 * 1000,
      });

      // Start online
      mockNetwork.setOnline(true);

      // Simulate network call for online state
      mockHttp.get.mockResolvedValue({ data: { id: '123' }, status: 200, headers: {} });
      await decorator.get('/mf1/receipts/123');
      expect(mockHttp.get).toHaveBeenCalled();

      mockHttp.get.mockClear();

      // Go offline
      mockNetwork.setOnline(false);

      // Should return stale cache without network call
      const result = await decorator.get('/mf1/receipts/123');
      expect(result.headers['x-cache']).toBe('STALE');
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it('should work without network monitor', async () => {
      const decoratorNoNetwork = new CachingHttpDecorator(mockHttp, mockCache, mockKeyGenerator);

      mockCache.get.mockResolvedValue(null);
      mockHttp.get.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await decoratorNoNetwork.get('/mf1/receipts/123');

      expect(mockHttp.get).toHaveBeenCalled();

      decoratorNoNetwork.destroy();
    });
  });

  describe('TTL handling', () => {
    it('should use TTL from keyGenerator', async () => {
      const shortTTL = 1000; // 1 second
      mockKeyGenerator.getTTL.mockReturnValue(shortTTL);

      // Cache is 2 seconds old (older than TTL)
      mockCache.get.mockResolvedValue({
        data: { id: '123' },
        timestamp: Date.now() - 2000,
      });

      mockHttp.get.mockResolvedValue({ data: { id: '123' }, status: 200, headers: {} });

      const result = await decorator.get('/mf1/receipts/123');

      expect(result.headers['x-cache']).toBe('MISS');
      expect(mockHttp.get).toHaveBeenCalled();
    });

    it('should return HIT when within TTL', async () => {
      const longTTL = 60 * 60 * 1000; // 1 hour
      mockKeyGenerator.getTTL.mockReturnValue(longTTL);

      // Cache is 30 minutes old (within TTL)
      mockCache.get.mockResolvedValue({
        data: { id: '123' },
        timestamp: Date.now() - 30 * 60 * 1000,
      });

      const result = await decorator.get('/mf1/receipts/123');

      expect(result.headers['x-cache']).toBe('HIT');
      expect(mockHttp.get).not.toHaveBeenCalled();
    });
  });

  describe('Cache invalidation error handling', () => {
    it('should not throw when invalidation fails', async () => {
      mockKeyGenerator.getInvalidationPatterns.mockReturnValue(['receipt:*']);
      mockCache.invalidate.mockRejectedValue(new Error('Invalidation error'));
      mockHttp.post.mockResolvedValue({ data: {}, status: 201, headers: {} });

      // Should not throw
      await expect(decorator.post('/mf1/receipts', {})).resolves.toBeDefined();
    });

    it('should continue invalidating other patterns on individual failure', async () => {
      mockKeyGenerator.getInvalidationPatterns.mockReturnValue(['receipt:123*', 'receipt:list:*']);

      mockCache.invalidate
        .mockRejectedValueOnce(new Error('First pattern failed'))
        .mockResolvedValueOnce(undefined);

      mockHttp.put.mockResolvedValue({ data: {}, status: 200, headers: {} });

      await decorator.put('/mf1/receipts/123', {});

      // Both patterns should be attempted
      expect(mockCache.invalidate).toHaveBeenCalledTimes(2);
    });
  });

  describe('destroy', () => {
    it('should unsubscribe from network monitor', () => {
      const subscriptionSpy = jest.spyOn(mockNetwork.online$, 'subscribe');

      const newDecorator = new CachingHttpDecorator(
        mockHttp,
        mockCache,
        mockKeyGenerator,
        mockNetwork
      );

      // Verify subscription was created
      expect(subscriptionSpy).toHaveBeenCalled();

      newDecorator.destroy();

      // After destroy, further emissions should not affect the decorator
      // This is implicitly tested by not throwing
    });
  });
});

describe('CachingHttpDecorator integration with CacheKeyGenerator', () => {
  it('should work with real CacheKeyGenerator', async () => {
    const { CacheKeyGenerator } = await import('../cache-key-generator');

    const mockHttp = createMockHttpPort();
    const mockCache = createMockCachePort();
    const keyGenerator = new CacheKeyGenerator();

    // Setup mock implementations
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);

    const decorator = new CachingHttpDecorator(mockHttp, mockCache, keyGenerator);

    // Test that list endpoints bypass cache
    mockHttp.get.mockResolvedValue({ data: [], status: 200, headers: {} });

    await decorator.get('/mf1/receipts');

    expect(mockCache.get).not.toHaveBeenCalled(); // Lists don't cache

    mockHttp.get.mockClear();

    // Test that item endpoints use cache
    mockHttp.get.mockResolvedValue({ data: { id: '123' }, status: 200, headers: {} });
    await decorator.get('/mf1/receipts/123');

    expect(mockCache.get).toHaveBeenCalled(); // Items do cache
    expect(mockCache.set).toHaveBeenCalled();

    decorator.destroy();
  });

  it('should generate correct cache keys for different resources', async () => {
    const { CacheKeyGenerator } = await import('../cache-key-generator');

    const mockHttp = createMockHttpPort();
    const mockCache = createMockCachePort();
    const keyGenerator = new CacheKeyGenerator();

    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockHttp.get.mockResolvedValue({ data: {}, status: 200, headers: {} });

    const decorator = new CachingHttpDecorator(mockHttp, mockCache, keyGenerator);

    // Test receipt endpoint
    await decorator.get('/mf1/receipts/abc-123');
    expect(mockCache.set).toHaveBeenLastCalledWith('receipt:abc-123', {});

    // Test merchant endpoint
    await decorator.get('/mf2/merchants/merchant-uuid');
    expect(mockCache.set).toHaveBeenLastCalledWith('merchant:merchant-uuid', {});

    // Test cashier me endpoint
    await decorator.get('/mf1/cashiers/me');
    expect(mockCache.set).toHaveBeenLastCalledWith('cashier:me', {});

    decorator.destroy();
  });

  it('should invalidate correct patterns on mutations', async () => {
    const { CacheKeyGenerator } = await import('../cache-key-generator');

    const mockHttp = createMockHttpPort();
    const mockCache = createMockCachePort();
    const keyGenerator = new CacheKeyGenerator();

    mockCache.invalidate.mockResolvedValue(undefined);
    mockHttp.post.mockResolvedValue({ data: {}, status: 201, headers: {} });
    mockHttp.put.mockResolvedValue({ data: {}, status: 200, headers: {} });
    mockHttp.delete.mockResolvedValue({ data: null, status: 204, headers: {} });

    const decorator = new CachingHttpDecorator(mockHttp, mockCache, keyGenerator);

    // POST should invalidate list
    await decorator.post('/mf1/receipts', {});
    expect(mockCache.invalidate).toHaveBeenCalledWith('receipt:list:*');

    mockCache.invalidate.mockClear();

    // PUT should invalidate item and list
    await decorator.put('/mf1/receipts/abc-123', {});
    expect(mockCache.invalidate).toHaveBeenCalledWith('receipt:abc-123*');
    expect(mockCache.invalidate).toHaveBeenCalledWith('receipt:list:*');

    mockCache.invalidate.mockClear();

    // DELETE cashier should also invalidate cashier:me
    await decorator.delete('/mf1/cashiers/cashier-uuid');
    expect(mockCache.invalidate).toHaveBeenCalledWith('cashier:cashier-uuid*');
    expect(mockCache.invalidate).toHaveBeenCalledWith('cashier:list:*');
    expect(mockCache.invalidate).toHaveBeenCalledWith('cashier:me');

    decorator.destroy();
  });
});
