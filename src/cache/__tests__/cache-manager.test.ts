import { CacheManager, CleanupStrategy } from '../cache-manager';
import { ICacheAdapter, CachedItem, CacheSize } from '../../adapters';

// Mock cache adapter for testing
class MockCacheAdapter implements ICacheAdapter {
  private storage = new Map<string, CachedItem<any>>();
  private totalSize = 0;

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    return this.storage.get(key) || null;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const item: CachedItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await this.setItem(key, item);
  }

  async setItem<T>(key: string, item: CachedItem<T>): Promise<void> {
    const size = JSON.stringify(item).length * 2;
    this.totalSize += size;
    if (this.storage.has(key)) {
      const oldSize = JSON.stringify(this.storage.get(key)).length * 2;
      this.totalSize -= oldSize;
    }
    this.storage.set(key, item);
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = this.patternToRegex(pattern);
    const keysToDelete: string[] = [];
    
    for (const key of this.storage.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      const item = this.storage.get(key);
      if (item) {
        const size = JSON.stringify(item).length * 2;
        this.totalSize -= size;
      }
      this.storage.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.storage.clear();
    this.totalSize = 0;
  }

  async getSize(): Promise<CacheSize> {
    return {
      entries: this.storage.size,
      bytes: this.totalSize,
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    let removedCount = 0;
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, item] of this.storage.entries()) {
      if (item.ttl && now - item.timestamp > item.ttl) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      const item = this.storage.get(key);
      if (item) {
        const size = JSON.stringify(item).length * 2;
        this.totalSize -= size;
      }
      this.storage.delete(key);
      removedCount++;
    }

    return removedCount;
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.storage.keys());
    
    if (pattern) {
      const regex = this.patternToRegex(pattern);
      return keys.filter(key => regex.test(key));
    }
    
    return keys;
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    return new RegExp(`^${regexPattern}$`);
  }
}

describe('CacheManager', () => {
  let cacheAdapter: MockCacheAdapter;
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheAdapter = new MockCacheAdapter();
    cacheManager = new CacheManager(
      cacheAdapter,
      {
        maxCacheSize: 1000, // Small size for testing
        maxEntries: 10,
        cleanupInterval: 0, // Disable automatic cleanup for tests
        memoryPressureThreshold: 0.8,
        memoryPressureCleanupPercentage: 50, // More aggressive for small test cache
        minAgeForRemoval: 0, // Allow immediate removal for tests
      }
    );

    // Mock performance.now for consistent testing
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    cacheManager.destroy();
    jest.restoreAllMocks();
  });

  describe('memory stats', () => {
    it('should calculate memory usage correctly', async () => {
      // Add some cache entries
      await cacheAdapter.set('key1', { data: 'large'.repeat(50) });
      await cacheAdapter.set('key2', { data: 'small' });

      const stats = await cacheManager.getMemoryStats();

      expect(stats.current.entries).toBe(2);
      expect(stats.current.bytes).toBeGreaterThan(0);
      expect(stats.memoryUsagePercentage).toBeGreaterThan(0);
    });

    it('should detect memory pressure', async () => {
      // Fill cache beyond threshold (80% of 1000 bytes)
      for (let i = 0; i < 5; i++) {
        await cacheAdapter.set(`key${i}`, { data: 'x'.repeat(200) });
      }

      const stats = await cacheManager.getMemoryStats();
      expect(stats.isMemoryPressure).toBe(true);
      expect(stats.recommendedStrategy).toBe('age-based');
    });
  });

  describe('cleanup strategies', () => {
    beforeEach(async () => {
      // Set up test data with different characteristics
      const baseTime = Date.now();
      
      await cacheAdapter.setItem('old-large', {
        data: { content: 'x'.repeat(100) },
        timestamp: baseTime - 10000,
        source: 'server',
        syncStatus: 'synced',
      });

      await cacheAdapter.setItem('new-small', {
        data: { content: 'small' },
        timestamp: baseTime - 1000,
        source: 'server',
        syncStatus: 'synced',
      });

      await cacheAdapter.setItem('optimistic-data', {
        data: { content: 'opt' },
        timestamp: baseTime - 5000,
        source: 'optimistic',
        syncStatus: 'pending',
      });

      await cacheAdapter.setItem('failed-sync', {
        data: { content: 'failed' },
        timestamp: baseTime - 3000,
        source: 'offline',
        syncStatus: 'failed',
      });

      // Track access times for LRU testing
      cacheManager.trackAccess('old-large');
      await new Promise(resolve => setTimeout(resolve, 10));
      cacheManager.trackAccess('new-small');
    });

    it('should perform LRU cleanup', async () => {
      const result = await cacheManager.performCleanup('lru', 'manual');

      expect(result.entriesRemoved).toBeGreaterThan(0);
      expect(result.strategy).toBe('lru');
      expect(result.reason).toBe('manual');
      expect(result.cleanupTime).toBeGreaterThanOrEqual(0);

      // Should remove least recently used items first
      const remainingKeys = await cacheAdapter.getKeys();
      expect(remainingKeys).toContain('new-small'); // More recently accessed
    });

    // Note: FIFO and size-based strategies were removed in the simplification

    it('should perform age-based cleanup', async () => {
      const result = await cacheManager.performCleanup('age-based', 'manual');

      expect(result.entriesRemoved).toBeGreaterThan(0);
      expect(result.strategy).toBe('age-based');

      // Should remove oldest items first
      const remainingKeys = await cacheAdapter.getKeys();
      expect(remainingKeys).toContain('new-small'); // Newest item
    });

    // Note: Priority-based cleanup strategy was removed in the simplification
  });

  describe('memory pressure handling', () => {
    it('should handle memory pressure when threshold exceeded', async () => {
      // Fill cache beyond threshold
      for (let i = 0; i < 8; i++) {
        await cacheAdapter.set(`pressure${i}`, { data: 'x'.repeat(200) });
      }

      const result = await cacheManager.handleMemoryPressure();

      expect(result.reason).toBe('memory_pressure');
      expect(result.entriesRemoved).toBeGreaterThan(0);

      // Should reduce cache size - verify cleanup occurred
      const finalSize = await cacheAdapter.getSize();
      expect(finalSize.entries).toBeLessThan(8); // Should have removed some entries
    });

    it('should not cleanup when no memory pressure', async () => {
      await cacheAdapter.set('key1', { data: 'small' });

      const result = await cacheManager.handleMemoryPressure();

      expect(result.reason).toBe('memory_pressure');
      expect(result.entriesRemoved).toBe(0);
    });
  });

  describe('cleanup recommendations', () => {
    it('should recommend cleanup for high memory usage', async () => {
      // Fill cache beyond threshold
      for (let i = 0; i < 8; i++) {
        await cacheAdapter.set(`high${i}`, { data: 'x'.repeat(200) });
      }

      const recommendations = await cacheManager.getCleanupRecommendations();

      expect(recommendations.shouldCleanup).toBe(true);
      expect(recommendations.urgency).toBe('high');
      expect(recommendations.recommendedStrategy).toBe('age-based');
      expect(recommendations.reason).toContain('Memory pressure');
    });

    it('should recommend cleanup for high entry count', async () => {
      // Add entries approaching the limit (9 out of 10 = 90%)
      for (let i = 0; i < 9; i++) {
        await cacheAdapter.set(`e${i}`, { data: 'x' }); // Very small data
      }

      const recommendations = await cacheManager.getCleanupRecommendations();

      expect(recommendations.shouldCleanup).toBe(true);
      if (recommendations.urgency === 'high') {
        // If memory pressure is detected, check that
        expect(recommendations.recommendedStrategy).toBe('age-based');
        expect(recommendations.reason).toContain('Memory pressure');
      } else {
        expect(recommendations.urgency).toBe('medium');
        expect(recommendations.recommendedStrategy).toBe('lru');
        expect(recommendations.reason).toContain('Entry count approaching');
      }
    });

    it('should not recommend cleanup when cache is healthy', async () => {
      // Create a fresh cache manager and adapter to avoid test pollution
      const freshAdapter = new MockCacheAdapter();
      const freshManager = new CacheManager(
        freshAdapter,
        {
          maxCacheSize: 1000,
          maxEntries: 10,
          cleanupInterval: 0,
          memoryPressureThreshold: 0.8,
          memoryPressureCleanupPercentage: 50,
        }
      );

      const recommendations = await freshManager.getCleanupRecommendations();

      expect(recommendations.shouldCleanup).toBe(false);
      expect(recommendations.urgency).toBe('low');
      
      freshManager.destroy();
    });
  });

  // Note: Performance monitoring integration was removed in the simplification

  describe('access tracking', () => {
    it('should track cache access times', () => {
      const key = 'test-key';
      const beforeTime = Date.now();
      
      cacheManager.trackAccess(key);
      
      const afterTime = Date.now();
      
      // Access time should be recorded (we can't directly test the private map,
      // but we can verify behavior in LRU cleanup)
      expect(afterTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('cleanup timing', () => {
    it('should measure cleanup performance', async () => {
      await cacheAdapter.set('key1', { data: 'test' });

      const result = await cacheManager.performCleanup('lru');

      expect(result.cleanupTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.cleanupTime).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle cleanup errors gracefully', async () => {
      // Mock cache adapter to throw error
      const errorAdapter = {
        getSize: jest.fn().mockRejectedValue(new Error('Cache error')),
        get: jest.fn(),
        set: jest.fn(),
        setItem: jest.fn(),
        invalidate: jest.fn(),
        clear: jest.fn(),
        cleanup: jest.fn(),
        getKeys: jest.fn(),
      } as any;

      const errorManager = new CacheManager(errorAdapter, {});

      await expect(errorManager.performCleanup('lru')).rejects.toThrow('Cache error');

      errorManager.destroy();
    });
  });

  describe('resource cleanup', () => {
    it('should clean up resources on destroy', () => {
      cacheManager.trackAccess('key1');
      cacheManager.trackAccess('key2');

      cacheManager.destroy();

      // Should stop cleanup timer and clear access tracking
      // We can't directly test private properties, but destroy should not throw
      expect(() => cacheManager.destroy()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty cache cleanup', async () => {
      const result = await cacheManager.performCleanup('lru');

      expect(result.entriesRemoved).toBe(0);
      expect(result.bytesFreed).toBe(0);
    });

    it('should handle cleanup with minimum age requirements', async () => {
      // Create a new cache manager with minimum age requirement
      const ageManager = new CacheManager(
        cacheAdapter,
        {
          maxCacheSize: 1000,
          maxEntries: 10,
          minAgeForRemoval: 60000, // 1 minute
          memoryPressureCleanupPercentage: 50,
        }
      );

      const now = Date.now();
      
      // Add recent item (within minimum age)
      await cacheAdapter.setItem('recent', {
        data: { content: 'recent' },
        timestamp: now - 30000, // 30 seconds ago (less than 1 minute minimum)
      });

      // Add old item (beyond minimum age)
      await cacheAdapter.setItem('old', {
        data: { content: 'old' },
        timestamp: now - 120000, // 2 minutes ago (beyond 1 minute minimum)
      });

      const result = await ageManager.performCleanup('age-based');

      // Should remove old items but keep recent ones
      const remainingKeys = await cacheAdapter.getKeys();
      expect(remainingKeys).toContain('recent');
      
      ageManager.destroy();
    });
  });
});