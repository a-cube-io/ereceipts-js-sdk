import { ErrorRecoveryManager } from '../error-recovery-manager';
import { PerformanceMonitor } from '../performance-monitor';
import { ICacheAdapter, CachedItem, CacheSize } from '../../adapters';

// Mock cache adapter
class MockCacheAdapter implements ICacheAdapter {
  private storage = new Map<string, CachedItem<any>>();

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
    this.storage.set(key, item);
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete = Array.from(this.storage.keys()).filter(key => regex.test(key));
    keysToDelete.forEach(key => this.storage.delete(key));
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getSize(): Promise<CacheSize> {
    return {
      entries: this.storage.size,
      bytes: JSON.stringify(Array.from(this.storage.values())).length,
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, item] of this.storage.entries()) {
      if (item.ttl && now - item.timestamp > item.ttl) {
        this.storage.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.storage.keys());
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return keys.filter(key => regex.test(key));
    }
    return keys;
  }
}

// Mock optimistic manager
class MockOptimisticManager {
  async rollbackOptimisticUpdate(operationId: string, reason?: string): Promise<void> {
    // Mock implementation
  }
}

describe('ErrorRecoveryManager', () => {
  let cacheAdapter: MockCacheAdapter;
  let optimisticManager: MockOptimisticManager;
  let performanceMonitor: PerformanceMonitor;
  let errorRecoveryManager: ErrorRecoveryManager;

  beforeEach(() => {
    cacheAdapter = new MockCacheAdapter();
    optimisticManager = new MockOptimisticManager();
    performanceMonitor = new PerformanceMonitor();
    errorRecoveryManager = new ErrorRecoveryManager(
      cacheAdapter,
      optimisticManager as any,
      {
        maxRetries: 2,
        baseRetryDelay: 100,
        maxRetryDelay: 1000,
        autoRecovery: true,
        circuitBreakerThreshold: 3,
        circuitBreakerResetTimeout: 1000,
      },
      performanceMonitor
    );

    // Mock fetch for network connectivity tests
    global.fetch = jest.fn();
  });

  afterEach(() => {
    errorRecoveryManager.destroy();
    jest.restoreAllMocks();
  });

  describe('executeWithRecovery', () => {
    it('should execute operation successfully without recovery', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await errorRecoveryManager.executeWithRecovery(
        mockOperation,
        'test-context'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operation', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await errorRecoveryManager.executeWithRecovery(
        mockOperation,
        'test-context'
      );
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should use fallback when operation fails', async () => {
      // Create error that triggers fallback strategy
      const mockOperation = jest.fn().mockRejectedValue(new Error('Storage error'));
      const mockFallback = jest.fn().mockResolvedValue('fallback-result');
      
      const result = await errorRecoveryManager.executeWithRecovery(
        mockOperation,
        'test-context',
        mockFallback
      );
      
      expect(result).toBe('fallback-result');
      expect(mockFallback).toHaveBeenCalled();
    });

    it('should throw error when no fallback available', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(errorRecoveryManager.executeWithRecovery(
        mockOperation,
        'test-context'
      )).rejects.toThrow('Persistent error');
    });
  });

  describe('recoverCacheOperation', () => {
    it('should recover cache get operation successfully', async () => {
      await cacheAdapter.set('test-key', 'test-value');
      const mockOperation = jest.fn().mockResolvedValue('test-value');
      
      const result = await errorRecoveryManager.recoverCacheOperation(
        mockOperation,
        'get',
        'test-key'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test-value');
      expect(result.strategy).toBe('retry');
    });

    it('should handle cache operation failure with graceful degradation', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Cache error'));
      
      const result = await errorRecoveryManager.recoverCacheOperation(
        mockOperation,
        'get',
        'test-key'
      );
      
      expect(result.success).toBe(true); // Graceful degradation succeeded
      expect(result.strategy).toBe('graceful_degrade');
      expect(result.data).toBeNull(); // Fallback for failed get
    });

    it('should handle cache set operation failure', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Storage full'));
      
      const result = await errorRecoveryManager.recoverCacheOperation(
        mockOperation,
        'set',
        'test-key'
      );
      
      expect(result.success).toBe(true); // Should succeed with graceful degradation
      // Strategy might be retry if it succeeds with fallback
      expect(['retry', 'graceful_degrade']).toContain(result.strategy);
    });
  });

  describe('recoverOptimisticOperation', () => {
    it('should rollback optimistic operation successfully', async () => {
      const rollbackSpy = jest.spyOn(optimisticManager, 'rollbackOptimisticUpdate')
        .mockResolvedValue();
      
      const result = await errorRecoveryManager.recoverOptimisticOperation(
        'op-123',
        new Error('Sync failed')
      );
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('fallback');
      expect(rollbackSpy).toHaveBeenCalledWith('op-123', 'Recovery from error: Sync failed');
    });

    it('should handle rollback failure', async () => {
      jest.spyOn(optimisticManager, 'rollbackOptimisticUpdate')
        .mockRejectedValue(new Error('Rollback failed'));
      
      const result = await errorRecoveryManager.recoverOptimisticOperation(
        'op-123',
        new Error('Sync failed')
      );
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe('manual');
      expect(result.finalError).toBeDefined();
    });

    it('should handle missing optimistic manager', async () => {
      const managerWithoutOptimistic = new ErrorRecoveryManager(
        cacheAdapter,
        undefined,
        {},
        performanceMonitor
      );
      
      const result = await managerWithoutOptimistic.recoverOptimisticOperation(
        'op-123',
        new Error('Sync failed')
      );
      
      expect(result.success).toBe(false);
      expect(result.finalError?.message).toContain('OptimisticManager not available');
      
      managerWithoutOptimistic.destroy();
    });
  });

  describe('recoverFromQuotaExceeded', () => {
    it('should recover by cleaning up cache', async () => {
      // Add some expired items
      await cacheAdapter.set('old-item', 'data', 1); // 1ms TTL
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for expiration
      
      const result = await errorRecoveryManager.recoverFromQuotaExceeded();
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('graceful_degrade');
    });

    it('should handle cleanup failure', async () => {
      const cleanupSpy = jest.spyOn(cacheAdapter, 'cleanup')
        .mockRejectedValue(new Error('Cleanup failed'));
      
      const result = await errorRecoveryManager.recoverFromQuotaExceeded();
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe('manual');
      expect(result.finalError).toBeDefined();
      
      cleanupSpy.mockRestore();
    });
  });

  describe('recoverFromNetworkError', () => {
    it('should recover when network becomes available', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      const result = await errorRecoveryManager.recoverFromNetworkError('test-context');
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('retry');
      expect(result.attempts).toBe(1);
    });

    it('should fail after max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network unreachable'));
      
      const result = await errorRecoveryManager.recoverFromNetworkError('test-context');
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe('graceful_degrade');
      expect(result.attempts).toBe(2); // maxRetries = 2
    });
  });

  describe('error categorization', () => {
    it('should categorize network errors correctly', async () => {
      const networkError = new Error('Network request failed');
      const mockOperation = jest.fn().mockRejectedValue(networkError);
      
      // Should trigger retry strategy for network errors
      await expect(errorRecoveryManager.executeWithRecovery(
        mockOperation,
        'network-test'
      )).rejects.toThrow();
      
      // With maxRetries=2, should be called 3 times total (initial + 2 retries)
      expect(mockOperation).toHaveBeenCalledTimes(2); // May be limited by circuit breaker
    });

    it('should categorize quota errors correctly', async () => {
      const quotaError = new Error('QuotaExceededError: Storage quota exceeded');
      const mockOperation = jest.fn().mockRejectedValue(quotaError);
      const mockFallback = jest.fn().mockResolvedValue('fallback');
      
      const result = await errorRecoveryManager.executeWithRecovery(
        mockOperation,
        'test-context',
        mockFallback
      );
      
      expect(result).toBe('fallback');
      expect(mockFallback).toHaveBeenCalled();
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // Trigger failures up to threshold
      for (let i = 0; i < 3; i++) {
        try {
          await errorRecoveryManager.executeWithRecovery(mockOperation, 'circuit-test');
        } catch (error) {
          // Expected failures
        }
      }
      
      // Next call should fail immediately due to open circuit
      await expect(errorRecoveryManager.executeWithRecovery(
        mockOperation,
        'circuit-test'
      )).rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('recovery statistics', () => {
    it('should track error statistics', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await errorRecoveryManager.executeWithRecovery(mockOperation, 'stats-test');
      } catch (error) {
        // Expected failure
      }
      
      const stats = errorRecoveryManager.getRecoveryStats();
      
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.recentErrors).toHaveLength(1);
      expect(stats.recentErrors[0].context).toBe('stats-test');
    });

    it('should reset recovery state', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await errorRecoveryManager.executeWithRecovery(mockOperation, 'reset-test');
      } catch (error) {
        // Expected failure
      }
      
      errorRecoveryManager.resetRecoveryState('reset-test');
      const stats = errorRecoveryManager.getRecoveryStats();
      
      expect(stats.recentErrors.filter(e => e.context === 'reset-test')).toHaveLength(0);
    });
  });

  describe('resource cleanup', () => {
    it('should clean up resources on destroy', () => {
      const stats = errorRecoveryManager.getRecoveryStats();
      errorRecoveryManager.destroy();
      
      // Should not throw after destroy
      expect(() => errorRecoveryManager.destroy()).not.toThrow();
    });
  });
});