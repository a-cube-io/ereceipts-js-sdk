import { ICacheAdapter, CachedItem } from '../adapters';
import { OfflineManager, OperationType, ResourceType } from '../offline';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Optimistic update configuration
 */
export interface OptimisticConfig {
  /** Auto-rollback failed operations after timeout (ms) */
  rollbackTimeout?: number;
  /** Maximum number of optimistic operations to track */
  maxOptimisticOperations?: number;
  /** Generate optimistic IDs for new resources */
  generateOptimisticId?: (resource: ResourceType, data: any) => string;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
}

/**
 * Optimistic operation data
 */
export interface OptimisticOperation<T = any> {
  /** Unique operation ID */
  id: string;
  /** Queue operation ID for tracking */
  queueOperationId: string;
  /** Resource type */
  resource: ResourceType;
  /** Operation type */
  operation: OperationType;
  /** Cache key for the optimistic data */
  cacheKey: string;
  /** Original optimistic data */
  optimisticData: T;
  /** Previous data for rollback */
  previousData?: T;
  /** Timestamp when operation was created */
  createdAt: number;
  /** Current status */
  status: 'pending' | 'confirmed' | 'failed' | 'rolled_back';
  /** Error message if operation failed */
  error?: string;
}

/**
 * Events emitted by optimistic manager
 */
export interface OptimisticEvents {
  /** Emitted when optimistic operation is created */
  onOptimisticCreated?: (operation: OptimisticOperation) => void;
  /** Emitted when operation is confirmed by server */
  onOptimisticConfirmed?: (operation: OptimisticOperation, serverData: any) => void;
  /** Emitted when operation fails and is rolled back */
  onOptimisticRolledBack?: (operation: OptimisticOperation) => void;
  /** Emitted when operation fails permanently */
  onOptimisticFailed?: (operation: OptimisticOperation) => void;
}

/**
 * Optimistic update manager for immediate UI updates
 */
export class OptimisticManager {
  private operations = new Map<string, OptimisticOperation>();
  private config: OptimisticConfig;
  private performanceMonitor?: PerformanceMonitor;

  constructor(
    private cache: ICacheAdapter,
    private offlineManager: OfflineManager,
    config: OptimisticConfig = {},
    private events: OptimisticEvents = {}
  ) {
    this.config = {
      rollbackTimeout: 30000, // 30 seconds
      maxOptimisticOperations: 100,
      generateOptimisticId: this.defaultOptimisticIdGenerator,
      enablePerformanceMonitoring: false,
      ...config,
    };

    // Initialize performance monitoring if enabled
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor = new PerformanceMonitor();
    }

    this.setupOfflineManagerIntegration();
  }

  /**
   * Create an optimistic update for immediate UI feedback
   */
  async createOptimisticUpdate<T>(
    resource: ResourceType,
    operation: OperationType,
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data: any,
    optimisticData: T,
    cacheKey: string,
    priority: number = 2
  ): Promise<string> {
    // Generate unique operation ID
    const operationId = this.generateOperationId();

    // Store previous data for rollback
    const previousData = await this.cache.get<T>(cacheKey);

    // Create optimistic cache entry
    const optimisticCacheItem: CachedItem<T> = {
      data: optimisticData,
      timestamp: Date.now(),
      source: 'optimistic',
      syncStatus: 'pending',
      tags: [`optimistic:${operationId}`],
    };

    // Store in cache immediately
    await this.cache.setItem(cacheKey, optimisticCacheItem);

    // Queue the actual operation
    const queueOperationId = await this.offlineManager.queueOperation(
      operation,
      resource,
      endpoint,
      method,
      data,
      priority
    );

    // Track the optimistic operation
    const optimisticOp: OptimisticOperation<T> = {
      id: operationId,
      queueOperationId,
      resource,
      operation,
      cacheKey,
      optimisticData,
      previousData: previousData?.data,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.operations.set(operationId, optimisticOp);
    
    // Record performance metrics
    this.performanceMonitor?.recordOptimisticOperationCreated(operationId);
    
    // Cleanup old operations if we exceed the limit
    await this.cleanupOldOperations();

    // Setup rollback timer
    this.setupRollbackTimer(operationId);

    // Emit event
    this.events.onOptimisticCreated?.(optimisticOp);

    return operationId;
  }

  /**
   * Confirm an optimistic operation with server data
   */
  async confirmOptimisticUpdate<T>(
    operationId: string, 
    serverData: T
  ): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'pending') {
      return;
    }

    // Update cache with confirmed server data
    const confirmedCacheItem: CachedItem<T> = {
      data: serverData,
      timestamp: Date.now(),
      source: 'server',
      syncStatus: 'synced',
    };

    await this.cache.setItem(operation.cacheKey, confirmedCacheItem);

    // Update operation status
    operation.status = 'confirmed';

    // Record performance metrics
    this.performanceMonitor?.recordOptimisticOperationConfirmed(operationId);

    // Emit event
    this.events.onOptimisticConfirmed?.(operation, serverData);

    // Clean up after confirmation
    setTimeout(() => {
      this.operations.delete(operationId);
    }, 5000); // Keep for 5 seconds for debugging
  }

  /**
   * Rollback an optimistic operation
   */
  async rollbackOptimisticUpdate(operationId: string, error?: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return;
    }

    // Restore previous data or remove optimistic entry
    if (operation.previousData) {
      const rollbackCacheItem: CachedItem<any> = {
        data: operation.previousData,
        timestamp: operation.createdAt - 1, // Older timestamp
        source: 'server',
        syncStatus: 'synced',
      };
      await this.cache.setItem(operation.cacheKey, rollbackCacheItem);
    } else {
      // No previous data, invalidate the cache entry
      await this.cache.invalidate(operation.cacheKey);
    }

    // Update operation status
    operation.status = 'rolled_back';
    operation.error = error;

    // Record performance metrics
    this.performanceMonitor?.recordOptimisticOperationRolledBack(operationId);

    // Emit event
    this.events.onOptimisticRolledBack?.(operation);

    // Remove from tracking
    this.operations.delete(operationId);
  }

  /**
   * Mark an operation as permanently failed
   */
  async failOptimisticUpdate(operationId: string, error: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return;
    }

    // Rollback the optimistic data
    await this.rollbackOptimisticUpdate(operationId, error);

    // Update status before removal
    operation.status = 'failed';
    operation.error = error;

    // Record performance metrics
    this.performanceMonitor?.recordOptimisticOperationFailed(operationId);

    // Emit event
    this.events.onOptimisticFailed?.(operation);
  }

  /**
   * Get current optimistic operations
   */
  getOptimisticOperations(): OptimisticOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get pending optimistic operations count
   */
  getPendingCount(): number {
    return Array.from(this.operations.values()).filter(op => op.status === 'pending').length;
  }

  /**
   * Check if a specific resource has pending optimistic updates
   */
  hasPendingOptimisticUpdates(resource: ResourceType, resourceId?: string): boolean {
    return Array.from(this.operations.values()).some(op => 
      op.resource === resource && 
      op.status === 'pending' &&
      (resourceId ? op.cacheKey.includes(resourceId) : true)
    );
  }

  /**
   * Setup integration with offline manager for sync notifications
   */
  private setupOfflineManagerIntegration(): void {
    // This would be implemented through events from the offline manager
    // For now, we'll handle this through manual calls from the sync process
  }

  /**
   * Setup rollback timer for an operation
   */
  private setupRollbackTimer(operationId: string): void {
    if (this.config.rollbackTimeout && this.config.rollbackTimeout > 0) {
      setTimeout(async () => {
        const operation = this.operations.get(operationId);
        if (operation && operation.status === 'pending') {
          await this.rollbackOptimisticUpdate(operationId, 'Operation timed out');
        }
      }, this.config.rollbackTimeout);
    }
  }

  /**
   * Cleanup old operations to prevent memory leaks
   */
  private async cleanupOldOperations(): Promise<void> {
    if (this.operations.size <= (this.config.maxOptimisticOperations || 100)) {
      return;
    }

    // Remove oldest completed/failed operations
    const operations = Array.from(this.operations.entries())
      .filter(([, op]) => op.status !== 'pending')
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);

    const toRemove = operations.slice(0, operations.length - 50); // Keep last 50
    toRemove.forEach(([id]) => this.operations.delete(id));
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Default optimistic ID generator for new resources
   */
  private defaultOptimisticIdGenerator(resource: ResourceType, _data: any): string {
    return `temp_${resource}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Handle sync completion from offline manager
   */
  async handleSyncCompletion(queueOperationId: string, success: boolean, result?: any, error?: string): Promise<void> {
    // Find operation by queue ID
    const operation = Array.from(this.operations.values())
      .find(op => op.queueOperationId === queueOperationId);

    if (!operation) {
      return;
    }

    if (success && result) {
      await this.confirmOptimisticUpdate(operation.id, result);
    } else {
      await this.failOptimisticUpdate(operation.id, error || 'Sync failed');
    }
  }

  /**
   * Get performance metrics (if monitoring is enabled)
   */
  getPerformanceMetrics() {
    return this.performanceMonitor?.getMetrics() || null;
  }

  /**
   * Get performance summary (if monitoring is enabled)
   */
  getPerformanceSummary() {
    return this.performanceMonitor?.getPerformanceSummary() || null;
  }

  /**
   * Reset performance metrics (if monitoring is enabled)
   */
  resetPerformanceMetrics(): void {
    this.performanceMonitor?.reset();
  }

  /**
   * Check if performance monitoring is enabled
   */
  isPerformanceMonitoringEnabled(): boolean {
    return !!this.performanceMonitor;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.operations.clear();
    this.performanceMonitor?.reset();
  }
}