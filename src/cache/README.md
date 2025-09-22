# Advanced Cache System

A comprehensive, production-ready caching system with optimistic updates, performance monitoring, automatic cleanup, error recovery, and auto-sync capabilities.

## 🚀 Quick Start

```typescript
import { 
  OptimisticManager, 
  PerformanceMonitor, 
  CacheManager, 
  ErrorRecoveryManager, 
  CacheSyncManager 
} from './cache';
import { WebCacheAdapter } from '../platforms/web/cache';
import { HttpClient } from '../core/api/http-client';
import { WebNetworkMonitor } from '../platforms/web/network';

// Initialize cache components
const cache = new WebCacheAdapter({
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 10000,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
});

const performanceMonitor = new PerformanceMonitor();
const httpClient = new HttpClient(config, cache);
const networkMonitor = new WebNetworkMonitor();

// Create managers
const optimisticManager = new OptimisticManager(
  cache,
  offlineManager,
  { enablePerformanceMonitoring: true },
  {},
  performanceMonitor
);

const cacheManager = new CacheManager(
  cache,
  { enablePerformanceMonitoring: true },
  performanceMonitor
);

const errorRecoveryManager = new ErrorRecoveryManager(
  cache,
  optimisticManager,
  { autoRecovery: true },
  performanceMonitor
);

const cacheSyncManager = new CacheSyncManager(
  cache,
  httpClient,
  networkMonitor,
  { autoSyncOnReconnect: true },
  performanceMonitor
);
```

## 🧩 System Components

### 1. OptimisticManager
Provides immediate UI feedback for operations while handling background sync.

```typescript
// Create optimistic update
const operationId = await optimisticManager.createOptimisticUpdate(
  'receipt',
  'create',
  '/receipts',
  'POST',
  receiptData,
  optimisticReceipt,
  'receipt:temp_123',
  2
);

// Confirm when server responds
await optimisticManager.confirmOptimisticUpdate(operationId, serverReceipt);

// Or rollback if failed
await optimisticManager.rollbackOptimisticUpdate(operationId, 'Server error');
```

### 2. PerformanceMonitor
Tracks system performance and provides insights.

```typescript
// Track optimistic operations
performanceMonitor.recordOptimisticOperationCreated('op-123');
performanceMonitor.recordOptimisticOperationConfirmed('op-123');

// Track cache operations
const endTiming = performanceMonitor.startCacheOperation('get', 'key-123');
// ... perform cache operation
endTiming();

// Get metrics
const metrics = performanceMonitor.getMetrics();
const summary = performanceMonitor.getPerformanceSummary();

console.log(`Cache hit rate: ${metrics.cacheHitRate}%`);
console.log(`Memory efficiency: ${summary.memoryEfficiency}%`);
```

### 3. CacheManager
Advanced cache cleanup and memory management.

```typescript
// Get memory statistics
const memoryStats = await cacheManager.getMemoryStats();
console.log(`Memory usage: ${memoryStats.memoryUsagePercentage}%`);

// Perform cleanup
const cleanupResult = await cacheManager.performCleanup('lru', 'manual');
console.log(`Removed ${cleanupResult.entriesRemoved} entries`);

// Handle memory pressure
if (memoryStats.isMemoryPressure) {
  const recovery = await cacheManager.handleMemoryPressure();
  console.log(`Freed ${recovery.bytesFreed} bytes`);
}

// Get cleanup recommendations
const recommendations = await cacheManager.getCleanupRecommendations();
if (recommendations.shouldCleanup) {
  await cacheManager.performCleanup(recommendations.recommendedStrategy);
}
```

### 4. ErrorRecoveryManager
Handles failures gracefully with multiple recovery strategies.

```typescript
// Execute operation with recovery
const result = await errorRecoveryManager.executeWithRecovery(
  async () => await riskyOperation(),
  'risky-context',
  async () => await fallbackOperation() // Optional fallback
);

// Recover cache operations
const cacheRecovery = await errorRecoveryManager.recoverCacheOperation(
  async () => await cache.get('key'),
  'get',
  'key'
);

// Recover from storage quota exceeded
const quotaRecovery = await errorRecoveryManager.recoverFromQuotaExceeded();

// Recover from network errors
const networkRecovery = await errorRecoveryManager.recoverFromNetworkError('api-call');

// Get recovery statistics
const stats = errorRecoveryManager.getRecoveryStats();
console.log(`Total errors: ${stats.totalErrors}`);
```

### 5. CacheSyncManager
Automatic cache synchronization on network reconnection.

```typescript
// Refresh stale cache entries
const syncResult = await cacheSyncManager.refreshStaleCache();
console.log(`Synced ${syncResult.synced} entries`);

// Force sync specific keys
const forcedSync = await cacheSyncManager.forceSyncKeys(['receipt:123', 'receipt:456']);

// Get sync statistics
const syncStats = cacheSyncManager.getSyncStats();
console.log(`Active syncs: ${syncStats.activeSyncs}`);

// Enable/disable auto-sync
cacheSyncManager.setAutoSync(true);
```

## 📊 Performance Monitoring

### Key Metrics

```typescript
const metrics = performanceMonitor.getMetrics();

// Optimistic operations
console.log(`Created: ${metrics.optimisticOperationsCreated}`);
console.log(`Confirmed: ${metrics.optimisticOperationsConfirmed}`);
console.log(`Rolled back: ${metrics.optimisticOperationsRolledBack}`);
console.log(`Average confirmation time: ${metrics.averageConfirmationTime}ms`);

// Cache performance
console.log(`Hit rate: ${metrics.cacheHitRate}%`);
console.log(`Miss rate: ${metrics.cacheMissRate}%`);
console.log(`Average get time: ${metrics.cachePerformance.averageGetTime}ms`);

// Memory usage
console.log(`Current entries: ${metrics.memoryUsage.currentEntries}`);
console.log(`Current bytes: ${metrics.memoryUsage.currentBytes}`);
console.log(`Peak entries: ${metrics.memoryUsage.peakEntries}`);
```

### Performance Summary

```typescript
const summary = performanceMonitor.getPerformanceSummary();

console.log(`Success rate: ${summary.optimisticOperationsSuccessRate}%`);
console.log(`Cache efficiency: ${summary.cacheEfficiency}%`);
console.log(`Memory efficiency: ${summary.memoryEfficiency}%`);
```

## 🧹 Cache Management

### Cleanup Strategies

1. **LRU (Least Recently Used)**: Remove oldest accessed items
2. **FIFO (First In, First Out)**: Remove oldest items by timestamp
3. **Size-based**: Remove largest items first
4. **Age-based**: Remove items older than minimum age
5. **Priority**: Remove low priority items (optimistic < offline < server)

```typescript
// Automatic cleanup based on thresholds
const memoryStats = await cacheManager.getMemoryStats();
if (memoryStats.isMemoryPressure) {
  const result = await cacheManager.performCleanup('size-based', 'memory_pressure');
}

// Manual cleanup with specific strategy
const result = await cacheManager.performCleanup('lru', 'manual');

// Get recommendations
const recommendations = await cacheManager.getCleanupRecommendations();
if (recommendations.shouldCleanup) {
  console.log(`Recommended: ${recommendations.recommendedStrategy}`);
  console.log(`Urgency: ${recommendations.urgency}`);
  console.log(`Reason: ${recommendations.reason}`);
}
```

## 🔄 Error Recovery

### Error Types & Strategies

| Error Type | Strategy | Description |
|------------|----------|-------------|
| Network | Retry | Exponential backoff with circuit breaker |
| Timeout | Retry | Retry with increased timeout |
| Storage | Fallback | Use alternative storage or graceful degradation |
| Quota | Graceful Degrade | Cleanup cache and reduce functionality |
| Validation | Ignore | Usually not recoverable |
| Permission | Manual | Requires user intervention |

### Circuit Breaker

```typescript
// Automatic circuit breaker protection
const config = {
  circuitBreakerThreshold: 5, // Open after 5 failures
  circuitBreakerResetTimeout: 60000, // Reset after 1 minute
};

const errorManager = new ErrorRecoveryManager(cache, optimistic, config);

// Operations are automatically protected
const result = await errorManager.executeWithRecovery(
  async () => await unreliableOperation(),
  'unreliable-service'
);
```

### Recovery Examples

```typescript
// Network recovery with retry
const networkRecovery = await errorManager.recoverFromNetworkError('api-context');
if (networkRecovery.success) {
  console.log(`Recovered after ${networkRecovery.attempts} attempts`);
}

// Storage quota recovery
const quotaRecovery = await errorManager.recoverFromQuotaExceeded();
if (quotaRecovery.success) {
  console.log(`Freed space by removing ${quotaRecovery.recoveredData.entriesRemoved} entries`);
}

// Optimistic operation recovery
const optimisticRecovery = await errorManager.recoverOptimisticOperation('op-123', error);
if (optimisticRecovery.success) {
  console.log('Successfully rolled back optimistic operation');
}
```

## 🔄 Auto-Sync Features

### Network Reconnection

```typescript
// Automatic sync when network reconnects
const syncManager = new CacheSyncManager(
  cache,
  httpClient,
  networkMonitor,
  {
    autoSyncOnReconnect: true,
    maxStaleTime: 5 * 60 * 1000, // 5 minutes
    syncInterval: 30 * 1000, // 30 seconds periodic sync
  }
);

// Manual refresh
const result = await syncManager.refreshStaleCache();
console.log(`Synced ${result.synced}, failed ${result.failed}, conflicts resolved ${result.conflictsResolved}`);
```

### Conflict Resolution

```typescript
// Currently implements "server wins" strategy for MVP
// Extensible for more complex resolution strategies

interface ConflictResolution<T> {
  strategy: 'server-wins' | 'local-wins' | 'merge' | 'manual';
  resolvedData: T;
  conflictReason: string;
  localData?: T;
  serverData?: T;
}
```

## 🎯 Usage Examples

### Complete E-commerce Receipt System

```typescript
class ReceiptManager {
  constructor(
    private optimisticManager: OptimisticManager,
    private errorRecoveryManager: ErrorRecoveryManager,
    private cacheSyncManager: CacheSyncManager,
    private performanceMonitor: PerformanceMonitor
  ) {}

  async createReceipt(receiptData: ReceiptInput): Promise<ReceiptOutput> {
    // Track performance
    const createStart = this.performanceMonitor.startCacheOperation('set');
    
    try {
      // Generate optimistic receipt
      const optimisticReceipt = this.generateOptimisticReceipt(receiptData);
      const cacheKey = `receipt:${optimisticReceipt.uuid}`;
      
      // Create optimistic update with error recovery
      const operationId = await this.errorRecoveryManager.executeWithRecovery(
        async () => await this.optimisticManager.createOptimisticUpdate(
          'receipt',
          'create',
          '/receipts',
          'POST',
          receiptData,
          optimisticReceipt,
          cacheKey,
          2
        ),
        'receipt-creation'
      );
      
      createStart();
      return optimisticReceipt;
      
    } catch (error) {
      createStart();
      
      // Attempt recovery
      const recovery = await this.errorRecoveryManager.recoverCacheOperation(
        async () => { throw error; },
        'create',
        'receipt'
      );
      
      if (recovery.success) {
        return recovery.data as ReceiptOutput;
      }
      
      throw error;
    }
  }

  async getReceiptWithSync(uuid: string): Promise<ReceiptOutput | null> {
    const cacheKey = `receipt:${uuid}`;
    
    try {
      // Try cache first
      const cached = await cache.get<ReceiptOutput>(cacheKey);
      if (cached) {
        // Track access for LRU
        cacheManager.trackAccess(cacheKey);
        
        // Check if stale and sync if needed
        const now = Date.now();
        const isStale = now - cached.timestamp > 5 * 60 * 1000; // 5 minutes
        
        if (isStale && navigator.onLine) {
          // Sync in background
          this.cacheSyncManager.forceSyncKeys([cacheKey]);
        }
        
        return cached.data;
      }
      
      // Not in cache, fetch with error recovery
      return await this.errorRecoveryManager.executeWithRecovery(
        async () => {
          const response = await httpClient.get(`/receipts/${uuid}`);
          await cache.set(cacheKey, response.data);
          return response.data;
        },
        'receipt-fetch',
        async () => null // Fallback to null if unavailable
      );
      
    } catch (error) {
      console.error('Failed to get receipt:', error);
      return null;
    }
  }

  getPerformanceReport(): any {
    const metrics = this.performanceMonitor.getMetrics();
    const summary = this.performanceMonitor.getPerformanceSummary();
    const recoveryStats = this.errorRecoveryManager.getRecoveryStats();
    const syncStats = this.cacheSyncManager.getSyncStats();
    
    return {
      optimistic: {
        created: metrics.optimisticOperationsCreated,
        confirmed: metrics.optimisticOperationsConfirmed,
        rolledBack: metrics.optimisticOperationsRolledBack,
        successRate: summary.optimisticOperationsSuccessRate,
      },
      cache: {
        hitRate: metrics.cacheHitRate,
        missRate: metrics.cacheMissRate,
        efficiency: summary.cacheEfficiency,
        memoryEfficiency: summary.memoryEfficiency,
      },
      recovery: {
        totalErrors: recoveryStats.totalErrors,
        circuitBreakerStates: recoveryStats.circuitBreakerStates,
        recentErrors: recoveryStats.recentErrors.length,
      },
      sync: {
        isOnline: syncStats.isOnline,
        activeSyncs: syncStats.activeSyncs,
        queuedSyncs: syncStats.queuedSyncs,
      }
    };
  }
}
```

### React Hook Integration

```typescript
// Enhanced useReceipts hook with performance monitoring
export function useReceipts(): UseReceiptsReturn {
  const [performanceData, setPerformanceData] = useState<any>(null);
  
  // ... existing hook implementation
  
  // Add performance monitoring methods
  const getOptimisticPerformanceMetrics = useCallback(() => {
    if (!sdk?.getOfflineManager().isOptimisticEnabled()) return null;
    return sdk.getOfflineManager().getOptimisticManager()?.getPerformanceMetrics();
  }, [sdk]);
  
  const getOptimisticPerformanceSummary = useCallback(() => {
    if (!sdk?.getOfflineManager().isOptimisticEnabled()) return null;
    return sdk.getOfflineManager().getOptimisticManager()?.getPerformanceSummary();
  }, [sdk]);
  
  // Periodic performance updates
  useEffect(() => {
    if (!sdk) return;
    
    const interval = setInterval(() => {
      const summary = getOptimisticPerformanceSummary();
      if (summary) {
        setPerformanceData(summary);
      }
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [sdk, getOptimisticPerformanceSummary]);
  
  return {
    // ... existing returns
    getOptimisticPerformanceMetrics,
    getOptimisticPerformanceSummary,
    performanceData,
  };
}
```

## 🔧 Configuration

### OptimisticManager Config
```typescript
interface OptimisticConfig {
  rollbackTimeout?: number; // Auto-rollback after timeout (default: 30s)
  maxOptimisticOperations?: number; // Max tracked operations (default: 100)
  enablePerformanceMonitoring?: boolean; // Enable metrics (default: false)
  generateOptimisticId?: (resource: ResourceType, data: any) => string;
}
```

### CacheManager Config
```typescript
interface CacheManagementConfig {
  maxCacheSize?: number; // Max size in bytes (default: 100MB)
  maxEntries?: number; // Max number of entries (default: 10000)
  cleanupInterval?: number; // Auto-cleanup interval (default: 5min)
  memoryPressureThreshold?: number; // Pressure threshold 0-1 (default: 0.8)
  memoryPressureCleanupPercentage?: number; // % to remove (default: 30)
  minAgeForRemoval?: number; // Min age before removal (default: 1min)
}
```

### ErrorRecoveryManager Config
```typescript
interface ErrorRecoveryConfig {
  maxRetries?: number; // Max retry attempts (default: 3)
  baseRetryDelay?: number; // Base delay in ms (default: 1000)
  maxRetryDelay?: number; // Max delay in ms (default: 30000)
  autoRecovery?: boolean; // Enable auto-recovery (default: true)
  circuitBreakerThreshold?: number; // Failure threshold (default: 5)
  circuitBreakerResetTimeout?: number; // Reset timeout (default: 60000)
}
```

### CacheSyncManager Config
```typescript
interface CacheSyncConfig {
  maxStaleTime?: number; // Max staleness before refresh (default: 5min)
  syncInterval?: number; // Periodic sync interval (default: 30s)
  autoSyncOnReconnect?: boolean; // Sync on reconnect (default: true)
  maxConcurrentSyncs?: number; // Max concurrent syncs (default: 3)
  syncBatchSize?: number; // Batch size for sync ops (default: 10)
}
```

## 🧪 Testing

The system includes **85 comprehensive tests** covering:

- ✅ Optimistic operations (17 tests)
- ✅ Performance monitoring (17 tests) 
- ✅ Cache management (19 tests)
- ✅ Error recovery (20 tests)
- ✅ Cache synchronization (18 tests)

```bash
# Run all cache tests
npm test src/cache/__tests__/

# Run specific test suite
npm test src/cache/__tests__/optimistic-manager.test.ts
npm test src/cache/__tests__/performance-monitor.test.ts
npm test src/cache/__tests__/cache-manager.test.ts
npm test src/cache/__tests__/error-recovery-manager.test.ts
npm test src/cache/__tests__/cache-sync-manager.test.ts
```

## 🚀 Performance Features

1. **Intelligent Caching**: LRU, FIFO, size-based, and priority-based cleanup
2. **Memory Management**: Automatic pressure detection and cleanup
3. **Circuit Breakers**: Prevent cascading failures
4. **Batch Operations**: Efficient sync and cleanup in batches
5. **Concurrent Control**: Limit concurrent operations to prevent overload
6. **Performance Monitoring**: Real-time metrics and insights
7. **Graceful Degradation**: Continue operation with reduced functionality

## 🔒 Reliability Features

1. **Error Recovery**: Multiple strategies based on error type
2. **Optimistic Rollbacks**: Automatic rollback on failure
3. **Network Resilience**: Auto-retry with exponential backoff
4. **Conflict Resolution**: Handle data conflicts intelligently
5. **Resource Cleanup**: Prevent memory leaks and resource exhaustion
6. **Health Monitoring**: Track system health and performance

## 📈 Monitoring & Observability

The system provides comprehensive monitoring capabilities:

- Real-time performance metrics
- Error tracking and recovery statistics
- Memory usage and efficiency monitoring
- Cache hit rates and operation timings
- Circuit breaker states and failure patterns
- Sync operation statistics and queue status

Use these metrics to optimize performance, detect issues early, and ensure reliable operation in production environments.

## 🤝 Contributing

When contributing to the cache system:

1. **Maintain backward compatibility**
2. **Add comprehensive tests** for new features
3. **Update documentation** for API changes
4. **Follow TypeScript best practices**
5. **Consider performance implications**
6. **Test error scenarios thoroughly**

## 📄 License

This cache system is part of the ACube E-receipts SDK and follows the same licensing terms.