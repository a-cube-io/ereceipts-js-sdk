import { OptimisticManager, OptimisticConfig, OptimisticEvents } from '../optimistic-manager';
import { OfflineManager } from '../../offline';
import { ICacheAdapter, CachedItem } from '../../adapters';

// Mock implementations
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

class MockOfflineManager {
  async queueOperation(): Promise<string> {
    return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

describe('OptimisticManager', () => {
  let cache: MockCacheAdapter;
  let offlineManager: MockOfflineManager;
  let optimisticManager: OptimisticManager;
  let events: OptimisticEvents;

  beforeEach(() => {
    cache = new MockCacheAdapter();
    offlineManager = new MockOfflineManager() as any;
    events = {
      onOptimisticCreated: jest.fn(),
      onOptimisticConfirmed: jest.fn(),
      onOptimisticRolledBack: jest.fn(),
      onOptimisticFailed: jest.fn(),
    };

    optimisticManager = new OptimisticManager(
      cache,
      offlineManager as any,
      {},
      events
    );
  });

  afterEach(() => {
    optimisticManager.destroy();
  });

  describe('createOptimisticUpdate', () => {
    it('should create an optimistic update and store in cache', async () => {
      const optimisticData = { id: '123', name: 'Test Receipt', amount: '10.00' };
      const cacheKey = 'receipt:123';

      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test' },
        optimisticData,
        cacheKey
      );

      expect(operationId).toBeTruthy();
      expect(operationId).toMatch(/^opt_\d+_[a-z0-9]+$/);

      // Verify data is in cache
      const cachedItem = await cache.get(cacheKey);
      expect(cachedItem).toBeTruthy();
      expect(cachedItem!.data).toEqual(optimisticData);
      expect(cachedItem!.source).toBe('optimistic');
      expect(cachedItem!.syncStatus).toBe('pending');
      expect(cachedItem!.tags).toContain(`optimistic:${operationId}`);

      // Verify operation is tracked
      const operations = optimisticManager.getOptimisticOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0].id).toBe(operationId);
      expect(operations[0].resource).toBe('receipt');
      expect(operations[0].operation).toBe('CREATE');
      expect(operations[0].status).toBe('pending');

      // Verify event was called
      expect(events.onOptimisticCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: operationId,
          resource: 'receipt',
          operation: 'CREATE',
          status: 'pending',
        })
      );
    });

    it('should store previous data for rollback', async () => {
      const previousData = { id: '123', name: 'Old Receipt', amount: '5.00' };
      const optimisticData = { id: '123', name: 'Updated Receipt', amount: '10.00' };
      const cacheKey = 'receipt:123';

      // Set initial data
      await cache.set(cacheKey, previousData);

      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'UPDATE',
        '/api/receipts/123',
        'PUT',
        { receiptData: 'test' },
        optimisticData,
        cacheKey
      );

      const operations = optimisticManager.getOptimisticOperations();
      expect(operations[0].previousData).toEqual(previousData);
    });
  });

  describe('confirmOptimisticUpdate', () => {
    it('should confirm optimistic update with server data', async () => {
      const optimisticData = { id: '123', name: 'Test Receipt', amount: '10.00' };
      const serverData = { id: '123', name: 'Server Receipt', amount: '12.50', uuid: 'server-uuid' };
      const cacheKey = 'receipt:123';

      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test' },
        optimisticData,
        cacheKey
      );

      await optimisticManager.confirmOptimisticUpdate(operationId, serverData);

      // Verify cache has server data
      const cachedItem = await cache.get(cacheKey);
      expect(cachedItem!.data).toEqual(serverData);
      expect(cachedItem!.source).toBe('server');
      expect(cachedItem!.syncStatus).toBe('synced');

      // Verify operation status updated
      const operations = optimisticManager.getOptimisticOperations();
      const operation = operations.find(op => op.id === operationId);
      expect(operation!.status).toBe('confirmed');

      // Verify event was called
      expect(events.onOptimisticConfirmed).toHaveBeenCalledWith(
        expect.objectContaining({ id: operationId }),
        serverData
      );
    });
  });

  describe('rollbackOptimisticUpdate', () => {
    it('should rollback to previous data when available', async () => {
      const previousData = { id: '123', name: 'Original Receipt', amount: '5.00' };
      const optimisticData = { id: '123', name: 'Updated Receipt', amount: '10.00' };
      const cacheKey = 'receipt:123';

      // Set initial data
      await cache.set(cacheKey, previousData);

      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'UPDATE',
        '/api/receipts/123',
        'PUT',
        { receiptData: 'test' },
        optimisticData,
        cacheKey
      );

      await optimisticManager.rollbackOptimisticUpdate(operationId, 'Test rollback');

      // Verify cache has previous data
      const cachedItem = await cache.get(cacheKey);
      expect(cachedItem!.data).toEqual(previousData);
      expect(cachedItem!.source).toBe('server');
      expect(cachedItem!.syncStatus).toBe('synced');

      // Verify operation is removed
      const operations = optimisticManager.getOptimisticOperations();
      expect(operations.find(op => op.id === operationId)).toBeUndefined();

      // Verify event was called
      expect(events.onOptimisticRolledBack).toHaveBeenCalled();
    });

    it('should invalidate cache when no previous data', async () => {
      const optimisticData = { id: '123', name: 'New Receipt', amount: '10.00' };
      const cacheKey = 'receipt:123';

      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test' },
        optimisticData,
        cacheKey
      );

      await optimisticManager.rollbackOptimisticUpdate(operationId, 'Test rollback');

      // Verify cache is invalidated
      const cachedItem = await cache.get(cacheKey);
      expect(cachedItem).toBeNull();
    });
  });

  describe('handleSyncCompletion', () => {
    it('should confirm operation on successful sync', async () => {
      const optimisticData = { id: '123', name: 'Test Receipt', amount: '10.00' };
      const serverData = { id: '123', name: 'Server Receipt', amount: '12.50' };
      const cacheKey = 'receipt:123';

      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test' },
        optimisticData,
        cacheKey
      );

      const operations = optimisticManager.getOptimisticOperations();
      const queueOperationId = operations[0].queueOperationId;

      await optimisticManager.handleSyncCompletion(queueOperationId, true, serverData);

      // Verify cache has server data
      const cachedItem = await cache.get(cacheKey);
      expect(cachedItem!.data).toEqual(serverData);
      expect(cachedItem!.source).toBe('server');
    });

    it('should fail operation on sync failure', async () => {
      const optimisticData = { id: '123', name: 'Test Receipt', amount: '10.00' };
      const cacheKey = 'receipt:123';

      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test' },
        optimisticData,
        cacheKey
      );

      const operations = optimisticManager.getOptimisticOperations();
      const queueOperationId = operations[0].queueOperationId;

      await optimisticManager.handleSyncCompletion(queueOperationId, false, undefined, 'Server error');

      // Verify operation is failed and rolled back
      expect(events.onOptimisticFailed).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should track pending operations count', async () => {
      expect(optimisticManager.getPendingCount()).toBe(0);

      await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test1' },
        { id: '1' },
        'receipt:1'
      );

      expect(optimisticManager.getPendingCount()).toBe(1);

      await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test2' },
        { id: '2' },
        'receipt:2'
      );

      expect(optimisticManager.getPendingCount()).toBe(2);
    });

    it('should check pending optimistic updates for resource', async () => {
      const operationId = await optimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test' },
        { id: '123' },
        'receipt:123'
      );

      expect(optimisticManager.hasPendingOptimisticUpdates('receipt')).toBe(true);
      expect(optimisticManager.hasPendingOptimisticUpdates('receipt', '123')).toBe(true);
      expect(optimisticManager.hasPendingOptimisticUpdates('receipt', '456')).toBe(false);
      expect(optimisticManager.hasPendingOptimisticUpdates('cashier')).toBe(false);
    });
  });

  describe('configuration options', () => {
    it('should respect rollback timeout', async () => {
      const config: OptimisticConfig = {
        rollbackTimeout: 100, // 100ms
      };

      const customOptimisticManager = new OptimisticManager(
        cache,
        offlineManager as any,
        config,
        events
      );

      const operationId = await customOptimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test' },
        { id: '123' },
        'receipt:123'
      );

      // Wait for rollback timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify operation was rolled back due to timeout
      const operations = customOptimisticManager.getOptimisticOperations();
      expect(operations.find(op => op.id === operationId)).toBeUndefined();

      customOptimisticManager.destroy();
    });

    it('should respect max optimistic operations limit', async () => {
      const config: OptimisticConfig = {
        maxOptimisticOperations: 2,
      };

      const customOptimisticManager = new OptimisticManager(
        cache,
        offlineManager as any,
        config,
        events
      );

      // Create operations up to the limit
      await customOptimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test1' },
        { id: '1' },
        'receipt:1'
      );

      await customOptimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test2' },
        { id: '2' },
        'receipt:2'
      );

      // Confirm one to make it non-pending
      const operations = customOptimisticManager.getOptimisticOperations();
      await customOptimisticManager.confirmOptimisticUpdate(operations[0].id, { id: '1', confirmed: true });

      // Create more operations - should trigger cleanup
      await customOptimisticManager.createOptimisticUpdate(
        'receipt',
        'CREATE',
        '/api/receipts',
        'POST',
        { receiptData: 'test3' },
        { id: '3' },
        'receipt:3'
      );

      customOptimisticManager.destroy();
    });
  });
});