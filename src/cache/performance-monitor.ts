/**
 * Performance monitoring for optimistic updates system
 */

export interface PerformanceMetrics {
  /** Total number of optimistic operations created */
  optimisticOperationsCreated: number;
  /** Total number of operations confirmed successfully */
  optimisticOperationsConfirmed: number;
  /** Total number of operations rolled back */
  optimisticOperationsRolledBack: number;
  /** Total number of operations failed permanently */
  optimisticOperationsFailed: number;
  
  /** Average time from creation to confirmation (ms) */
  averageConfirmationTime: number;
  /** Average time from creation to rollback (ms) */
  averageRollbackTime: number;
  
  /** Cache hit rate for GET requests */
  cacheHitRate: number;
  /** Cache miss rate for GET requests */
  cacheMissRate: number;
  
  /** Total cache operations */
  cacheOperations: {
    gets: number;
    sets: number;
    invalidations: number;
    cleanups: number;
  };
  
  /** Cache performance */
  cachePerformance: {
    averageGetTime: number;
    averageSetTime: number;
    averageInvalidateTime: number;
    averageCleanupTime: number;
  };
  
  /** Memory usage statistics */
  memoryUsage: {
    /** Current number of cached items */
    currentEntries: number;
    /** Current cache size in bytes */
    currentBytes: number;
    /** Peak number of entries */
    peakEntries: number;
    /** Peak cache size in bytes */
    peakBytes: number;
  };
}

export interface OperationTiming {
  operationId: string;
  startTime: number;
  endTime?: number;
  operation: 'confirm' | 'rollback' | 'fail';
}

export interface CacheTiming {
  operation: 'get' | 'set' | 'invalidate' | 'cleanup';
  startTime: number;
  endTime: number;
  cacheKey?: string;
  success: boolean;
}

/**
 * Performance monitor for optimistic updates and cache operations
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    optimisticOperationsCreated: 0,
    optimisticOperationsConfirmed: 0,
    optimisticOperationsRolledBack: 0,
    optimisticOperationsFailed: 0,
    averageConfirmationTime: 0,
    averageRollbackTime: 0,
    cacheHitRate: 0,
    cacheMissRate: 0,
    cacheOperations: {
      gets: 0,
      sets: 0,
      invalidations: 0,
      cleanups: 0,
    },
    cachePerformance: {
      averageGetTime: 0,
      averageSetTime: 0,
      averageInvalidateTime: 0,
      averageCleanupTime: 0,
    },
    memoryUsage: {
      currentEntries: 0,
      currentBytes: 0,
      peakEntries: 0,
      peakBytes: 0,
    },
  };

  private operationTimings = new Map<string, OperationTiming>();
  private cacheTimings: CacheTiming[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Record the start of an optimistic operation
   */
  recordOptimisticOperationCreated(operationId: string): void {
    this.metrics.optimisticOperationsCreated++;
    
    this.operationTimings.set(operationId, {
      operationId,
      startTime: performance.now(),
      operation: 'confirm', // Will be updated when completed
    });
  }

  /**
   * Record optimistic operation confirmation
   */
  recordOptimisticOperationConfirmed(operationId: string): void {
    this.metrics.optimisticOperationsConfirmed++;
    
    const timing = this.operationTimings.get(operationId);
    if (timing) {
      timing.endTime = performance.now();
      timing.operation = 'confirm';
      
      const duration = timing.endTime - timing.startTime;
      this.updateAverageTime('confirmation', duration);
      
      this.operationTimings.delete(operationId);
    }
  }

  /**
   * Record optimistic operation rollback
   */
  recordOptimisticOperationRolledBack(operationId: string): void {
    this.metrics.optimisticOperationsRolledBack++;
    
    const timing = this.operationTimings.get(operationId);
    if (timing) {
      timing.endTime = performance.now();
      timing.operation = 'rollback';
      
      const duration = timing.endTime - timing.startTime;
      this.updateAverageTime('rollback', duration);
      
      this.operationTimings.delete(operationId);
    }
  }

  /**
   * Record optimistic operation failure
   */
  recordOptimisticOperationFailed(operationId: string): void {
    this.metrics.optimisticOperationsFailed++;
    
    const timing = this.operationTimings.get(operationId);
    if (timing) {
      timing.endTime = performance.now();
      timing.operation = 'fail';
      this.operationTimings.delete(operationId);
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheKey: string): void {
    this.cacheHits++;
    this.updateCacheHitRate();
    
    this.recordCacheTiming({
      operation: 'get',
      startTime: performance.now(),
      endTime: performance.now(),
      cacheKey,
      success: true,
    });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheKey: string): void {
    this.cacheMisses++;
    this.updateCacheHitRate();
    
    this.recordCacheTiming({
      operation: 'get',
      startTime: performance.now(),
      endTime: performance.now(),
      cacheKey,
      success: false,
    });
  }

  /**
   * Start timing a cache operation
   */
  startCacheOperation(operation: 'get' | 'set' | 'invalidate' | 'cleanup', cacheKey?: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.recordCacheTiming({
        operation,
        startTime,
        endTime,
        cacheKey,
        success: true,
      });
    };
  }

  /**
   * Record cache operation timing
   */
  private recordCacheTiming(timing: CacheTiming): void {
    this.cacheTimings.push(timing);
    
    // Update operation counters
    const operationKey = timing.operation === 'invalidate' ? 'invalidations' : `${timing.operation}s`;
    this.metrics.cacheOperations[operationKey as keyof typeof this.metrics.cacheOperations]++;
    
    // Update average times
    const duration = timing.endTime - timing.startTime;
    const avgKey = `average${timing.operation.charAt(0).toUpperCase() + timing.operation.slice(1)}Time` as keyof typeof this.metrics.cachePerformance;
    const currentAvg = this.metrics.cachePerformance[avgKey] as number;
    const count = this.metrics.cacheOperations[operationKey as keyof typeof this.metrics.cacheOperations];
    
    this.metrics.cachePerformance[avgKey] = ((currentAvg * (count - 1)) + duration) / count as any;
    
    // Cleanup old timings (keep last 1000)
    if (this.cacheTimings.length > 1000) {
      this.cacheTimings = this.cacheTimings.slice(-1000);
    }
  }

  /**
   * Update memory usage statistics
   */
  updateMemoryUsage(entries: number, bytes: number): void {
    this.metrics.memoryUsage.currentEntries = entries;
    this.metrics.memoryUsage.currentBytes = bytes;
    
    if (entries > this.metrics.memoryUsage.peakEntries) {
      this.metrics.memoryUsage.peakEntries = entries;
    }
    
    if (bytes > this.metrics.memoryUsage.peakBytes) {
      this.metrics.memoryUsage.peakBytes = bytes;
    }
  }

  /**
   * Update average confirmation/rollback time
   */
  private updateAverageTime(type: 'confirmation' | 'rollback', duration: number): void {
    const avgKey = type === 'confirmation' ? 'averageConfirmationTime' : 'averageRollbackTime';
    const countKey = type === 'confirmation' ? 'optimisticOperationsConfirmed' : 'optimisticOperationsRolledBack';
    
    const currentAvg = this.metrics[avgKey];
    const count = this.metrics[countKey];
    
    this.metrics[avgKey] = ((currentAvg * (count - 1)) + duration) / count;
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    if (total > 0) {
      this.metrics.cacheHitRate = (this.cacheHits / total) * 100;
      this.metrics.cacheMissRate = (this.cacheMisses / total) * 100;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    optimisticOperationsSuccessRate: number;
    averageOperationTime: number;
    cacheEfficiency: number;
    memoryEfficiency: number;
  } {
    const totalOperations = this.metrics.optimisticOperationsConfirmed + 
                           this.metrics.optimisticOperationsRolledBack + 
                           this.metrics.optimisticOperationsFailed;
    
    const successRate = totalOperations > 0 ? 
      (this.metrics.optimisticOperationsConfirmed / totalOperations) * 100 : 0;
    
    const averageOperationTime = (
      this.metrics.averageConfirmationTime + this.metrics.averageRollbackTime
    ) / 2;
    
    const cacheEfficiency = this.metrics.cacheHitRate;
    
    // Memory efficiency: lower is better (current vs peak usage)
    const memoryEfficiency = this.metrics.memoryUsage.peakBytes > 0 ?
      (this.metrics.memoryUsage.currentBytes / this.metrics.memoryUsage.peakBytes) * 100 : 100;
    
    return {
      optimisticOperationsSuccessRate: successRate,
      averageOperationTime,
      cacheEfficiency,
      memoryEfficiency,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      optimisticOperationsCreated: 0,
      optimisticOperationsConfirmed: 0,
      optimisticOperationsRolledBack: 0,
      optimisticOperationsFailed: 0,
      averageConfirmationTime: 0,
      averageRollbackTime: 0,
      cacheHitRate: 0,
      cacheMissRate: 0,
      cacheOperations: {
        gets: 0,
        sets: 0,
        invalidations: 0,
        cleanups: 0,
      },
      cachePerformance: {
        averageGetTime: 0,
        averageSetTime: 0,
        averageInvalidateTime: 0,
        averageCleanupTime: 0,
      },
      memoryUsage: {
        currentEntries: 0,
        currentBytes: 0,
        peakEntries: 0,
        peakBytes: 0,
      },
    };
    
    this.operationTimings.clear();
    this.cacheTimings = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get detailed timing information for debugging
   */
  getDetailedTimings(): {
    pendingOperations: OperationTiming[];
    recentCacheTimings: CacheTiming[];
  } {
    return {
      pendingOperations: Array.from(this.operationTimings.values()),
      recentCacheTimings: this.cacheTimings.slice(-100), // Last 100 timings
    };
  }
}