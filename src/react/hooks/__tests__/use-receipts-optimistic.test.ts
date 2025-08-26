import { OptimisticManager } from '../../../cache/optimistic-manager';
import { ICacheAdapter } from '../../../adapters';

// Simple unit tests for optimistic functionality without React Testing Library
describe('Optimistic Receipts Functionality', () => {
  class MockCacheAdapter implements ICacheAdapter {
    private cache = new Map<string, any>();

    async get<T>(key: string) {
      return this.cache.get(key) || null;
    }

    async set<T>(key: string, data: T, ttl?: number) {
      await this.setItem(key, {
        data,
        timestamp: Date.now(),
        ttl: ttl || 300000,
      });
    }

    async setItem<T>(key: string, item: any) {
      this.cache.set(key, item);
    }

    async invalidate(pattern: string) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    }

    async clear() {
      this.cache.clear();
    }

    async getSize() {
      return {
        entries: this.cache.size,
        bytes: 0,
        lastCleanup: Date.now(),
      };
    }

    async cleanup() {
      return 0;
    }

    async getKeys() {
      return Array.from(this.cache.keys());
    }
  }

  class MockOfflineManager {
    async queueOperation() {
      return `queue_${Date.now()}`;
    }
  }

  it('should integrate optimistic manager with offline operations', async () => {
    const cache = new MockCacheAdapter();
    const offlineManager = new MockOfflineManager();
    
    const optimisticManager = new OptimisticManager(
      cache,
      offlineManager as any,
      {}
    );

    // Test receipt creation workflow
    const receiptData = { name: 'Test Receipt', amount: '10.00' };
    const optimisticReceipt = { uuid: 'temp-123', ...receiptData };
    const cacheKey = 'receipt:temp-123';

    const operationId = await optimisticManager.createOptimisticUpdate(
      'receipt',
      'CREATE',
      '/api/receipts',
      'POST',
      { receiptData },
      optimisticReceipt,
      cacheKey
    );

    // Verify optimistic data is cached
    const cachedItem = await cache.get(cacheKey);
    expect(cachedItem).toBeTruthy();
    expect(cachedItem.data).toEqual(optimisticReceipt);
    expect(cachedItem.source).toBe('optimistic');

    // Verify operation tracking
    const operations = optimisticManager.getOptimisticOperations();
    expect(operations).toHaveLength(1);
    expect(operations[0].id).toBe(operationId);
    expect(operations[0].resource).toBe('receipt');

    // Test confirmation workflow
    const serverReceipt = { uuid: 'server-123', ...receiptData };
    await optimisticManager.confirmOptimisticUpdate(operationId, serverReceipt);

    const confirmedItem = await cache.get(cacheKey);
    expect(confirmedItem.data).toEqual(serverReceipt);
    expect(confirmedItem.source).toBe('server');

    optimisticManager.destroy();
  });

  it('should handle receipt-specific rollback scenarios', async () => {
    const cache = new MockCacheAdapter();
    const offlineManager = new MockOfflineManager();
    
    const optimisticManager = new OptimisticManager(
      cache,
      offlineManager as any,
      {}
    );

    // Setup initial receipt
    const originalReceipt = { uuid: '123', name: 'Original', amount: '5.00' };
    await cache.set('receipt:123', originalReceipt);

    // Create optimistic update
    const updatedReceipt = { uuid: '123', name: 'Updated', amount: '10.00' };
    const operationId = await optimisticManager.createOptimisticUpdate(
      'receipt',
      'UPDATE',
      '/api/receipts/123',
      'PUT',
      { receiptData: updatedReceipt },
      updatedReceipt,
      'receipt:123'
    );

    // Verify update is applied
    let cachedItem = await cache.get('receipt:123');
    expect(cachedItem.data).toEqual(updatedReceipt);

    // Rollback the update
    await optimisticManager.rollbackOptimisticUpdate(operationId, 'Server error');

    // Verify rollback restored original data
    cachedItem = await cache.get('receipt:123');
    expect(cachedItem.data).toEqual(originalReceipt);

    optimisticManager.destroy();
  });

  it('should support receipt deletion optimistic updates', async () => {
    const cache = new MockCacheAdapter();
    const offlineManager = new MockOfflineManager();
    
    const optimisticManager = new OptimisticManager(
      cache,
      offlineManager as any,
      {}
    );

    // Setup receipt to delete
    const receipt = { uuid: '123', name: 'To Delete', amount: '10.00' };
    await cache.set('receipt:123', receipt);

    // Create optimistic delete (soft delete scenario)
    const deletedReceipt = { ...receipt, status: 'deleted' };
    const operationId = await optimisticManager.createOptimisticUpdate(
      'receipt',
      'DELETE',
      '/api/receipts/123',
      'DELETE',
      { receiptId: '123' },
      deletedReceipt,
      'receipt:123'
    );

    // Verify receipt is marked as deleted optimistically
    const cachedItem = await cache.get('receipt:123');
    expect(cachedItem.data).toEqual(deletedReceipt);
    expect(cachedItem.source).toBe('optimistic');

    // Simulate successful deletion confirmation
    await optimisticManager.confirmOptimisticUpdate(operationId, { success: true });

    optimisticManager.destroy();
  });
});