import { PerformanceMonitor } from '../performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    // Mock performance.now for consistent testing
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('optimistic operations tracking', () => {
    it('should track optimistic operation creation', () => {
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordOptimisticOperationCreated('op2');

      const metrics = monitor.getMetrics();
      expect(metrics.optimisticOperationsCreated).toBe(2);
    });

    it('should track optimistic operation confirmation', () => {
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordOptimisticOperationConfirmed('op1');

      const metrics = monitor.getMetrics();
      expect(metrics.optimisticOperationsCreated).toBe(1);
      expect(metrics.optimisticOperationsConfirmed).toBe(1);
      expect(metrics.averageConfirmationTime).toBeGreaterThanOrEqual(0);
    });

    it('should track optimistic operation rollback', () => {
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordOptimisticOperationRolledBack('op1');

      const metrics = monitor.getMetrics();
      expect(metrics.optimisticOperationsCreated).toBe(1);
      expect(metrics.optimisticOperationsRolledBack).toBe(1);
      expect(metrics.averageRollbackTime).toBeGreaterThanOrEqual(0);
    });

    it('should track optimistic operation failure', () => {
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordOptimisticOperationFailed('op1');

      const metrics = monitor.getMetrics();
      expect(metrics.optimisticOperationsCreated).toBe(1);
      expect(metrics.optimisticOperationsFailed).toBe(1);
    });

    it('should calculate success rate correctly', () => {
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordOptimisticOperationCreated('op2');
      monitor.recordOptimisticOperationCreated('op3');

      monitor.recordOptimisticOperationConfirmed('op1');
      monitor.recordOptimisticOperationConfirmed('op2');
      monitor.recordOptimisticOperationRolledBack('op3');

      const summary = monitor.getPerformanceSummary();
      expect(summary.optimisticOperationsSuccessRate).toBe(66.66666666666666); // 2 out of 3 successful
    });
  });

  describe('cache performance tracking', () => {
    it('should track cache hits and misses', () => {
      monitor.recordCacheHit('key1');
      monitor.recordCacheHit('key2');
      monitor.recordCacheMiss('key3');

      const metrics = monitor.getMetrics();
      expect(metrics.cacheHitRate).toBeCloseTo(66.67, 1); // 2 hits out of 3 total
      expect(metrics.cacheMissRate).toBeCloseTo(33.33, 1); // 1 miss out of 3 total
    });

    it('should track cache operation timing', () => {
      const endTiming = monitor.startCacheOperation('get', 'test-key');
      
      // Simulate some time passing
      jest.spyOn(performance, 'now').mockReturnValue(performance.now() + 10);
      endTiming();

      const metrics = monitor.getMetrics();
      expect(metrics.cacheOperations.gets).toBe(1);
      expect(metrics.cachePerformance.averageGetTime).toBeGreaterThan(0);
    });

    it('should track different cache operation types', () => {
      const getEnd = monitor.startCacheOperation('get');
      const setEnd = monitor.startCacheOperation('set');
      const invalidateEnd = monitor.startCacheOperation('invalidate');
      const cleanupEnd = monitor.startCacheOperation('cleanup');

      getEnd();
      setEnd();
      invalidateEnd();
      cleanupEnd();

      const metrics = monitor.getMetrics();
      expect(metrics.cacheOperations.gets).toBe(1);
      expect(metrics.cacheOperations.sets).toBe(1);
      expect(metrics.cacheOperations.invalidations).toBe(1);
      expect(metrics.cacheOperations.cleanups).toBe(1);
    });
  });

  describe('memory usage tracking', () => {
    it('should track current and peak memory usage', () => {
      monitor.updateMemoryUsage(10, 1000);
      monitor.updateMemoryUsage(20, 2000);
      monitor.updateMemoryUsage(15, 1500);

      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage.currentEntries).toBe(15);
      expect(metrics.memoryUsage.currentBytes).toBe(1500);
      expect(metrics.memoryUsage.peakEntries).toBe(20);
      expect(metrics.memoryUsage.peakBytes).toBe(2000);
    });

    it('should calculate memory efficiency', () => {
      monitor.updateMemoryUsage(10, 1000);
      monitor.updateMemoryUsage(20, 2000); // Peak
      monitor.updateMemoryUsage(15, 1500); // Current

      const summary = monitor.getPerformanceSummary();
      expect(summary.memoryEfficiency).toBe(75); // 1500/2000 * 100
    });
  });

  describe('performance summary', () => {
    it('should calculate comprehensive performance summary', () => {
      // Setup optimistic operations
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordOptimisticOperationCreated('op2');
      monitor.recordOptimisticOperationConfirmed('op1');
      monitor.recordOptimisticOperationRolledBack('op2');

      // Setup cache operations
      monitor.recordCacheHit('key1');
      monitor.recordCacheHit('key2');
      monitor.recordCacheMiss('key3');

      // Setup memory usage
      monitor.updateMemoryUsage(100, 10000);

      const summary = monitor.getPerformanceSummary();

      expect(summary.optimisticOperationsSuccessRate).toBe(50); // 1 success out of 2
      expect(summary.averageOperationTime).toBeGreaterThanOrEqual(0);
      expect(summary.cacheEfficiency).toBeCloseTo(66.67, 1); // 2 hits out of 3
      expect(summary.memoryEfficiency).toBe(100); // Current equals peak
    });
  });

  describe('reset and cleanup', () => {
    it('should reset all metrics', () => {
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordCacheHit('key1');
      monitor.updateMemoryUsage(10, 1000);

      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.optimisticOperationsCreated).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.memoryUsage.currentEntries).toBe(0);
    });

    it('should limit cache timing history', () => {
      // Create more than 1000 cache operations
      for (let i = 0; i < 1200; i++) {
        const endTiming = monitor.startCacheOperation('get', `key${i}`);
        endTiming();
      }

      const detailedTimings = monitor.getDetailedTimings();
      expect(detailedTimings.recentCacheTimings).toHaveLength(100); // Limited to last 100
    });
  });

  describe('edge cases', () => {
    it('should handle division by zero in averages', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.averageConfirmationTime).toBe(0);
      expect(metrics.averageRollbackTime).toBe(0);
    });

    it('should handle empty cache statistics', () => {
      const summary = monitor.getPerformanceSummary();
      expect(summary.cacheEfficiency).toBe(0);
    });

    it('should handle operations without timing data', () => {
      // Record operations for non-existent operation IDs
      monitor.recordOptimisticOperationConfirmed('nonexistent');
      monitor.recordOptimisticOperationRolledBack('nonexistent');
      monitor.recordOptimisticOperationFailed('nonexistent');

      const metrics = monitor.getMetrics();
      expect(metrics.optimisticOperationsConfirmed).toBe(1);
      expect(metrics.optimisticOperationsRolledBack).toBe(1);
      expect(metrics.optimisticOperationsFailed).toBe(1);
    });
  });

  describe('detailed timing information', () => {
    it('should provide detailed timing for debugging', () => {
      monitor.recordOptimisticOperationCreated('op1');
      monitor.recordOptimisticOperationCreated('op2');

      const endTiming = monitor.startCacheOperation('get', 'key1');
      endTiming();

      const detailedTimings = monitor.getDetailedTimings();
      expect(detailedTimings.pendingOperations).toHaveLength(2);
      expect(detailedTimings.recentCacheTimings).toHaveLength(1);

      expect(detailedTimings.pendingOperations[0]).toMatchObject({
        operationId: 'op1',
        operation: 'confirm',
      });
    });
  });
});