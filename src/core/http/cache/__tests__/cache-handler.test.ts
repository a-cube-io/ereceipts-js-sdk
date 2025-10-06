import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheHandler } from '../cache-handler';
import { ICacheAdapter, INetworkMonitor, CachedItem } from '../../../../adapters';

// Mock implementations
class MockCacheAdapter implements ICacheAdapter {
  private storage = new Map<string, CachedItem<any>>();

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    return this.storage.get(key) || null;
  }

  async set<T>(key: string, data: T): Promise<void> {
    this.storage.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async setItem<T>(key: string, item: CachedItem<T>): Promise<void> {
    this.storage.set(key, item);
  }

  async setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void> {
    items.forEach(([key, item]) => this.storage.set(key, item));
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.storage.keys()) {
      if (regex.test(key)) {
        this.storage.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getSize() {
    return {
      entries: this.storage.size,
      bytes: 0,
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    return 0;
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.storage.keys());
    if (!pattern) return keys;

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }
}

class MockNetworkMonitor implements INetworkMonitor {
  constructor(private online: boolean = true) {}

  isOnline(): boolean {
    return this.online;
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  async getNetworkInfo() {
    return {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    };
  }
}

describe('CacheHandler - Simplified Binary Strategy', () => {
  let cacheHandler: CacheHandler;
  let mockCache: MockCacheAdapter;
  let mockNetworkMonitor: MockNetworkMonitor;

  beforeEach(() => {
    mockCache = new MockCacheAdapter();
    mockNetworkMonitor = new MockNetworkMonitor(true);
    cacheHandler = new CacheHandler(mockCache, mockNetworkMonitor, false);
  });

  describe('Online Behavior', () => {
    it('should always fetch fresh data when online', async () => {
      const testData = { id: 1, name: 'Test' };
      const mockRequestFn = vi.fn().mockResolvedValue({ data: testData });

      const result = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn);

      expect(result).toEqual(testData);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should cache fresh data after fetching when online', async () => {
      const testData = { id: 1, name: 'Test' };
      const mockRequestFn = vi.fn().mockResolvedValue({ data: testData });

      await cacheHandler.handleCachedRequest('/api/test', mockRequestFn);

      // Verify data was cached
      const cached = await mockCache.get('/api/test');
      expect(cached).toBeTruthy();
      expect(cached?.data).toEqual(testData);
    });

    it('should update cache on every online request', async () => {
      const testData1 = { id: 1, name: 'Test 1' };
      const testData2 = { id: 2, name: 'Test 2' };
      const mockRequestFn1 = vi.fn().mockResolvedValue({ data: testData1 });
      const mockRequestFn2 = vi.fn().mockResolvedValue({ data: testData2 });

      // First request
      await cacheHandler.handleCachedRequest('/api/test', mockRequestFn1);
      const cached1 = await mockCache.get('/api/test');
      expect(cached1?.data).toEqual(testData1);

      // Second request updates cache
      await cacheHandler.handleCachedRequest('/api/test', mockRequestFn2);
      const cached2 = await mockCache.get('/api/test');
      expect(cached2?.data).toEqual(testData2);
    });

    it('should fallback to cache if network fails while online', async () => {
      const testData = { id: 1, name: 'Test' };

      // First, cache some data
      await mockCache.set('/api/test', testData);

      // Then simulate network error
      const mockRequestFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn);

      expect(result).toEqual(testData);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });

    it('should throw error if network fails and no cache available', async () => {
      const mockRequestFn = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        cacheHandler.handleCachedRequest('/api/test', mockRequestFn)
      ).rejects.toThrow('Network error');
    });
  });

  describe('Offline Behavior', () => {
    beforeEach(() => {
      mockNetworkMonitor.setOnline(false);
    });

    it('should return cached data when offline', async () => {
      const testData = { id: 1, name: 'Test' };
      await mockCache.set('/api/test', testData);

      const mockRequestFn = vi.fn();
      const result = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn);

      expect(result).toEqual(testData);
      expect(mockRequestFn).not.toHaveBeenCalled();
    });

    it('should throw error if offline and no cache available', async () => {
      const mockRequestFn = vi.fn();

      await expect(
        cacheHandler.handleCachedRequest('/api/test', mockRequestFn)
      ).rejects.toThrow('Offline: No cached data available');

      expect(mockRequestFn).not.toHaveBeenCalled();
    });

    it('should use old cached data without checking expiration', async () => {
      // Cache data with old timestamp (simulating data that would be expired with TTL)
      const testData = { id: 1, name: 'Old Data' };
      await mockCache.setItem('/api/test', {
        data: testData,
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 24 hours ago
      });

      mockNetworkMonitor.setOnline(false);

      const mockRequestFn = vi.fn();
      const result = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn);

      // Should still return old data (no expiration check)
      expect(result).toEqual(testData);
      expect(mockRequestFn).not.toHaveBeenCalled();
    });
  });

  describe('Cache Configuration', () => {
    it('should skip cache when useCache is false', async () => {
      const testData = { id: 1, name: 'Test' };
      const mockRequestFn = vi.fn().mockResolvedValue({ data: testData });

      const result = await cacheHandler.handleCachedRequest(
        '/api/test',
        mockRequestFn,
        { useCache: false }
      );

      expect(result).toEqual(testData);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);

      // Verify nothing was cached
      const cached = await mockCache.get('/api/test');
      expect(cached).toBeNull();
    });

    it('should work without cache adapter', async () => {
      const cacheHandlerWithoutCache = new CacheHandler(undefined, mockNetworkMonitor);
      const testData = { id: 1, name: 'Test' };
      const mockRequestFn = vi.fn().mockResolvedValue({ data: testData });

      const result = await cacheHandlerWithoutCache.handleCachedRequest(
        '/api/test',
        mockRequestFn
      );

      expect(result).toEqual(testData);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Cache Invalidation', () => {
    it('should manually invalidate cache by pattern', async () => {
      await mockCache.set('/api/receipts/1', { id: 1 });
      await mockCache.set('/api/receipts/2', { id: 2 });
      await mockCache.set('/api/merchants/1', { id: 1 });

      await cacheHandler.invalidateCache('/api/receipts/*');

      const receipt1 = await mockCache.get('/api/receipts/1');
      const receipt2 = await mockCache.get('/api/receipts/2');
      const merchant1 = await mockCache.get('/api/merchants/1');

      expect(receipt1).toBeNull();
      expect(receipt2).toBeNull();
      expect(merchant1).not.toBeNull();
    });
  });

  describe('Cache Failure Resilience', () => {
    it('should NOT block request when cache.set() fails', async () => {
      const testData = { id: 1, name: 'Test' };
      const mockRequestFn = vi.fn().mockResolvedValue({ data: testData });

      // Mock cache.set() to fail
      const originalSet = mockCache.set;
      mockCache.set = vi.fn().mockRejectedValue(new Error('Storage full'));

      mockNetworkMonitor.setOnline(true);

      // Request should succeed despite cache failure
      const result = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn);

      expect(result).toEqual(testData);
      expect(mockRequestFn).toHaveBeenCalledTimes(1);

      // Restore original method
      mockCache.set = originalSet;
    });

    it('should NOT block request when cache.get() fails during fallback', async () => {
      const testData = { id: 1, name: 'Test' };

      // Mock cache.get() to fail
      const originalGet = mockCache.get;
      mockCache.get = vi.fn().mockRejectedValue(new Error('Cache read error'));

      mockNetworkMonitor.setOnline(true);
      const mockRequestFn = vi.fn().mockRejectedValue(new Error('Network error'));

      // Should throw network error (not cache error)
      await expect(
        cacheHandler.handleCachedRequest('/api/test', mockRequestFn)
      ).rejects.toThrow('Network error');

      // Restore original method
      mockCache.get = originalGet;
    });

    it('should NOT block invalidation when cache.invalidate() fails', async () => {
      // Mock invalidate to fail
      const originalInvalidate = mockCache.invalidate;
      mockCache.invalidate = vi.fn().mockRejectedValue(new Error('Invalidation error'));

      // Should not throw - just log error
      await expect(
        cacheHandler.invalidateCache('/api/*')
      ).resolves.toBeUndefined();

      // Restore original method
      mockCache.invalidate = originalInvalidate;
    });
  });

  describe('Network Detection', () => {
    it('should detect online status from network monitor', () => {
      mockNetworkMonitor.setOnline(true);
      expect(cacheHandler.isOnline()).toBe(true);

      mockNetworkMonitor.setOnline(false);
      expect(cacheHandler.isOnline()).toBe(false);
    });

    it('should return cache status', () => {
      const status = cacheHandler.getCacheStatus();

      expect(status).toEqual({
        available: true,
        networkMonitorAvailable: true,
        isOnline: true,
      });
    });

    it('should work without network monitor', () => {
      const cacheHandlerWithoutMonitor = new CacheHandler(mockCache, undefined);

      // Should fallback to navigator.onLine or default to false
      const isOnline = cacheHandlerWithoutMonitor.isOnline();
      expect(typeof isOnline).toBe('boolean');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle online → offline → online transition', async () => {
      const testData1 = { id: 1, name: 'Online 1' };
      const testData2 = { id: 2, name: 'Online 2' };

      // Online: fetch and cache
      const mockRequestFn1 = vi.fn().mockResolvedValue({ data: testData1 });
      const result1 = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn1);
      expect(result1).toEqual(testData1);

      // Go offline: use cache
      mockNetworkMonitor.setOnline(false);
      const mockRequestFn2 = vi.fn();
      const result2 = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn2);
      expect(result2).toEqual(testData1); // Same data from cache
      expect(mockRequestFn2).not.toHaveBeenCalled();

      // Go online: fetch fresh data and update cache
      mockNetworkMonitor.setOnline(true);
      const mockRequestFn3 = vi.fn().mockResolvedValue({ data: testData2 });
      const result3 = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn3);
      expect(result3).toEqual(testData2);

      // Verify cache was updated
      const cached = await mockCache.get('/api/test');
      expect(cached?.data).toEqual(testData2);
    });

    it('should cache data indefinitely (no expiration)', async () => {
      const testData = { id: 1, name: 'Test' };

      // Cache data with very old timestamp
      await mockCache.setItem('/api/test', {
        data: testData,
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 365, // 1 year ago
      });

      // Should still use cached data when offline (no expiration check)
      mockNetworkMonitor.setOnline(false);
      const mockRequestFn = vi.fn();
      const result = await cacheHandler.handleCachedRequest('/api/test', mockRequestFn);

      expect(result).toEqual(testData);
      expect(mockRequestFn).not.toHaveBeenCalled();
    });
  });
});
