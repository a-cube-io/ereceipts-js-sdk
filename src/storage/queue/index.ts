/**
 * Enterprise Queue Management System
 * 
 * A comprehensive, enterprise-grade queue management system for handling offline operations
 * with priority-based processing, intelligent batching, conflict resolution, and advanced analytics.
 * 
 * @author Claude (Sub-Agent 8: Advanced Queue Management System)
 * @version 1.0.0
 */

// Core Types and Interfaces
export * from './types';
export type { BottleneckAnalysis } from './queue-analytics';

// Storage Adapters
export { BaseStorageAdapter } from '../base/storage-adapter';
export { WebStorageAdapter } from '../adapters/web-storage';
export { ReactNativeStorageAdapter } from '../adapters/react-native-storage';

// Core Queue Components
export { PriorityQueue } from './priority-queue';
export { BatchProcessor } from './batch-processor';
export { ConflictResolverManager } from './conflict-resolver';
export { RetryManager } from './retry-manager';
export { QueueAnalytics } from './queue-analytics';

// Main Queue Manager
export { EnterpriseQueueManager } from './queue-manager';
// Import for local usage
import { EnterpriseQueueManager } from './queue-manager';
import type { BottleneckAnalysis } from './queue-analytics';

// Enhanced React Hook
export { useEnhancedACubeOffline } from './enhanced-offline-hook';
export type { EnhancedOfflineOptions, EnhancedOfflineResult } from './enhanced-offline-hook';

// Utility functions for creating branded types
export { 
  createQueueItemId,
  isQueueItemId,
  isValidPriority,
  isValidOperation,
  isValidResource
} from './types';

/**
 * ENTERPRISE QUEUE SYSTEM OVERVIEW
 * =================================
 * 
 * This system provides enterprise-grade queue management for offline-first applications
 * with the following key features:
 * 
 * 1. PRIORITY-BASED PROCESSING
 *    - Four priority levels: Critical, High, Normal, Low
 *    - Intelligent scheduling based on priority and time
 *    - Resource-aware processing with load balancing
 * 
 * 2. INTELLIGENT BATCHING
 *    - Groups related operations by resource, time, or custom criteria
 *    - Configurable batch sizes and timeout windows
 *    - Parallel and sequential processing strategies
 * 
 * 3. ADVANCED CONFLICT RESOLUTION
 *    - Multiple strategies: Client-wins, Server-wins, Merge, Manual
 *    - Field-level merge rules with custom resolvers
 *    - Intelligent conflict detection and resolution
 * 
 * 4. SOPHISTICATED RETRY LOGIC
 *    - Exponential backoff with jitter
 *    - Circuit breaker pattern for failing services
 *    - Configurable retry policies per resource/operation
 * 
 * 5. COMPREHENSIVE ANALYTICS
 *    - Real-time performance metrics
 *    - Trend analysis and forecasting
 *    - Bottleneck detection and optimization suggestions
 *    - Health scoring and anomaly detection
 * 
 * 6. ENTERPRISE FEATURES
 *    - Cross-platform storage (Web/React Native)
 *    - Type-safe operations with branded types
 *    - Event-driven architecture with subscriptions
 *    - Configurable persistence and recovery
 * 
 * USAGE EXAMPLE
 * =============
 * 
 * ```typescript
 * import { useEnhancedACubeOffline } from './storage/queue';
 * 
 * function MyComponent() {
 *   const {
 *     addToQueue,
 *     queueStats,
 *     sync,
 *     getInsights
 *   } = useEnhancedACubeOffline({
 *     enableBatching: true,
 *     enableAnalytics: true,
 *     maxRetries: 3,
 *     conflictResolution: 'merge'
 *   });
 * 
 *   const createReceipt = async (receiptData) => {
 *     const queueId = await addToQueue(
 *       'create',
 *       'receipts', 
 *       receiptData,
 *       { priority: 'high' }
 *     );
 *     
 *     return queueId;
 *   };
 * 
 *   const syncOfflineOperations = async () => {
 *     const results = await sync();
 *     console.log('Sync results:', results);
 *   };
 * 
 *   return (
 *     <div>
 *       <p>Queue Size: {queueStats.totalItems}</p>
 *       <p>Success Rate: {queueStats.successRate}%</p>
 *       <button onClick={syncOfflineOperations}>
 *         Sync ({queueStats.pendingItems} pending)
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * ARCHITECTURE COMPONENTS
 * =======================
 * 
 * 1. **EnterpriseQueueManager**: Main orchestrator that coordinates all components
 * 2. **PriorityQueue**: Efficient priority-based queue with indexing and metrics
 * 3. **BatchProcessor**: Groups operations for efficient batch processing
 * 4. **ConflictResolverManager**: Handles data conflicts with multiple strategies
 * 5. **RetryManager**: Manages retries with circuit breaker and exponential backoff
 * 6. **QueueAnalytics**: Provides insights, metrics, and performance monitoring
 * 7. **StorageAdapters**: Cross-platform storage abstraction layer
 * 8. **Enhanced Hook**: React integration with enterprise queue features
 * 
 * PERFORMANCE CHARACTERISTICS
 * ===========================
 * 
 * - Queue Operations: O(log n) enqueue/dequeue with priority indexing
 * - Memory Usage: Optimized with configurable retention and cleanup
 * - Throughput: Supports thousands of operations per minute
 * - Latency: Sub-millisecond queue operations, configurable processing intervals
 * - Scalability: Horizontal scaling through batching and parallel processing
 * 
 * RELIABILITY FEATURES
 * ====================
 * 
 * - Persistent storage with automatic recovery
 * - Dead letter queue for failed operations
 * - Circuit breaker prevents cascading failures
 * - Operation deduplication prevents duplicate processing
 * - Comprehensive error handling and logging
 * - Health monitoring with automated alerts
 * 
 * SECURITY CONSIDERATIONS
 * =======================
 * 
 * - Encrypted storage for sensitive operations
 * - Type-safe operations prevent injection attacks
 * - Configurable data sanitization
 * - Audit trail for all queue operations
 * - Access control integration points
 */

// Default configurations for different use cases
export const QUEUE_CONFIGS = {
  /**
   * High-performance configuration for critical business operations
   */
  ENTERPRISE: {
    maxSize: 10000,
    maxRetries: 5,
    defaultPriority: 'high' as const,
    batchingEnabled: true,
    batchSize: 50,
    batchTimeout: 2000,
    enableAnalytics: true,
    autoProcessing: true,
    processingInterval: 500,
    circuitBreakerEnabled: true,
    deduplicationEnabled: true,
  },

  /**
   * Balanced configuration for standard applications
   */
  STANDARD: {
    maxSize: 5000,
    maxRetries: 3,
    defaultPriority: 'normal' as const,
    batchingEnabled: true,
    batchSize: 20,
    batchTimeout: 5000,
    enableAnalytics: true,
    autoProcessing: true,
    processingInterval: 2000,
    circuitBreakerEnabled: true,
    deduplicationEnabled: true,
  },

  /**
   * Lightweight configuration for simple use cases
   */
  LIGHTWEIGHT: {
    maxSize: 1000,
    maxRetries: 2,
    defaultPriority: 'normal' as const,
    batchingEnabled: false,
    enableAnalytics: false,
    autoProcessing: true,
    processingInterval: 5000,
    circuitBreakerEnabled: false,
    deduplicationEnabled: false,
  },

  /**
   * Development configuration with extensive debugging
   */
  DEVELOPMENT: {
    maxSize: 100,
    maxRetries: 1,
    defaultPriority: 'normal' as const,
    batchingEnabled: true,
    batchSize: 5,
    batchTimeout: 1000,
    enableAnalytics: true,
    autoProcessing: false, // Manual processing for debugging
    processingInterval: 10000,
    circuitBreakerEnabled: false,
    deduplicationEnabled: true,
  },
} as const;

/**
 * Factory function to create a configured queue manager
 */
export function createEnterpriseQueue(
  preset: keyof typeof QUEUE_CONFIGS = 'STANDARD',
  overrides: Partial<any> = {}
) {
  const config = { ...QUEUE_CONFIGS[preset], ...overrides };
  return new EnterpriseQueueManager(config);
}

/**
 * Queue health checker utility
 */
export function assessQueueHealth(queueManager: EnterpriseQueueManager) {
  const stats = queueManager.getStats();
  const insights = queueManager.getInsights();
  
  return {
    overall: insights.healthScore,
    recommendations: insights.bottlenecks.map((b: BottleneckAnalysis) => b.suggestion),
    criticalIssues: insights.bottlenecks.filter((b: BottleneckAnalysis) => b.severity === 'critical'),
    performance: {
      throughput: stats.throughputPerMinute,
      successRate: stats.successRate,
      averageProcessingTime: stats.averageProcessingTime,
    },
    queueStatus: {
      size: stats.totalItems,
      pending: stats.pendingItems,
      processing: stats.processingItems,
      failed: stats.failedItems,
    },
  };
}