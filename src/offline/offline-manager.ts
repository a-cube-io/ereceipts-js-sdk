import { IStorage, INetworkMonitor, ICacheAdapter } from '../adapters';
import { HttpClient } from '../core/api';
import { OperationQueue } from './queue';
import { SyncManager } from './sync-manager';
import { 
  OperationType, 
  ResourceType, 
  QueueConfig, 
  QueueEvents, 
  BatchSyncResult 
} from './types';
import { OptimisticManager, OptimisticConfig, OptimisticEvents } from '../cache';

/**
 * Enhanced offline manager with optimistic update support
 */
export class OfflineManager {
  private queue: OperationQueue;
  private syncManager: SyncManager;
  private optimisticManager?: OptimisticManager;

  constructor(
    storage: IStorage,
    httpClient: HttpClient,
    networkMonitor: INetworkMonitor,
    config: Partial<QueueConfig> = {},
    events: QueueEvents = {},
    cache?: ICacheAdapter,
    optimisticConfig?: OptimisticConfig,
    optimisticEvents?: OptimisticEvents
  ) {
    // Create default config
    const defaultConfig: QueueConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      maxRetryDelay: 30000,
      backoffMultiplier: 2,
      maxQueueSize: 1000,
      batchSize: 10,
      syncInterval: 30000, // 30 seconds
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Initialize optimistic manager if cache is available (before sync manager for event integration)
    if (cache) {
      this.optimisticManager = new OptimisticManager(
        cache,
        this,
        optimisticConfig,
        optimisticEvents
      );
    }

    // Enhance events with optimistic manager integration
    const enhancedEvents: QueueEvents = {
      ...events,
      onOperationCompleted: (result) => {
        // Call original event handler first
        events.onOperationCompleted?.(result);
        
        // Notify optimistic manager of successful completion
        if (this.optimisticManager && result.success) {
          this.optimisticManager.handleSyncCompletion(
            result.operation.id,
            true,
            result.response
          ).catch(console.error);
        }
      },
      onOperationFailed: (result) => {
        // Call original event handler first
        events.onOperationFailed?.(result);
        
        // Notify optimistic manager of failed completion
        if (this.optimisticManager && !result.success) {
          this.optimisticManager.handleSyncCompletion(
            result.operation.id,
            false,
            undefined,
            result.error
          ).catch(console.error);
        }
      },
    };

    // Initialize queue and sync manager with enhanced events
    this.queue = new OperationQueue(storage, finalConfig, enhancedEvents);
    this.syncManager = new SyncManager(
      this.queue,
      httpClient,
      networkMonitor,
      finalConfig,
      enhancedEvents
    );
  }

  /**
   * Queue an operation for offline execution
   */
  async queueOperation(
    type: OperationType,
    resource: ResourceType,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: any,
    priority: number = 1
  ): Promise<string> {
    return await this.queue.addOperation(type, resource, endpoint, method, data, priority);
  }

  /**
   * Queue a receipt creation
   */
  async queueReceiptCreation(receiptData: any, priority: number = 2): Promise<string> {
    return await this.queueOperation(
      'CREATE',
      'receipt',
      '/mf1/receipts',
      'POST',
      receiptData,
      priority
    );
  }

  /**
   * Queue a receipt void operation
   */
  async queueReceiptVoid(voidData: any, priority: number = 3): Promise<string> {
    return await this.queueOperation(
      'DELETE',
      'receipt',
      '/mf1/receipts',
      'DELETE',
      voidData,
      priority
    );
  }

  /**
   * Queue a receipt return operation
   */
  async queueReceiptReturn(returnData: any, priority: number = 3): Promise<string> {
    return await this.queueOperation(
      'CREATE',
      'receipt',
      '/mf1/receipts/return',
      'POST',
      returnData,
      priority
    );
  }

  /**
   * Queue a cashier creation
   */
  async queueCashierCreation(cashierData: any, priority: number = 1): Promise<string> {
    return await this.queueOperation(
      'CREATE',
      'cashier',
      '/mf1/cashiers',
      'POST',
      cashierData,
      priority
    );
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.syncManager.isCurrentlyOnline();
  }

  /**
   * Get sync status and queue statistics
   */
  getStatus() {
    return this.syncManager.getSyncStatus();
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return this.queue.getPendingOperations().length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  /**
   * Manually trigger sync (if online)
   */
  async sync(): Promise<BatchSyncResult | null> {
    return await this.syncManager.triggerSync();
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<void> {
    await this.queue.retryFailed();
    
    // Trigger sync if online
    if (this.isOnline()) {
      await this.sync();
    }
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<void> {
    await this.queue.clearCompleted();
  }

  /**
   * Clear failed operations
   */
  async clearFailed(): Promise<void> {
    await this.queue.clearFailed();
  }

  /**
   * Clear all operations
   */
  async clearAll(): Promise<void> {
    await this.queue.clearQueue();
  }

  /**
   * Get operation by ID
   */
  getOperation(id: string) {
    return this.queue.getOperation(id);
  }

  /**
   * Remove specific operation
   */
  async removeOperation(id: string): Promise<boolean> {
    return await this.queue.removeOperation(id);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.queue.getStats();
  }

  /**
   * Start auto-sync (if not already started)
   */
  startAutoSync(): void {
    this.queue.startAutoSync();
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync(): void {
    this.queue.stopAutoSync();
  }

  /**
   * Create optimistic update (requires cache)
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
  ): Promise<string | null> {
    if (!this.optimisticManager) {
      return null; // No optimistic updates without cache
    }

    return await this.optimisticManager.createOptimisticUpdate(
      resource,
      operation,
      endpoint,
      method,
      data,
      optimisticData,
      cacheKey,
      priority
    );
  }

  /**
   * Enhanced queue receipt creation with optimistic update
   */
  async queueReceiptCreationWithOptimistic<T>(
    receiptData: any, 
    optimisticReceipt: T,
    cacheKey: string,
    priority: number = 2
  ): Promise<string | null> {
    return await this.createOptimisticUpdate(
      'receipt',
      'CREATE',
      '/mf1/receipts',
      'POST',
      receiptData,
      optimisticReceipt,
      cacheKey,
      priority
    );
  }

  /**
   * Enhanced queue receipt void with optimistic update
   */
  async queueReceiptVoidWithOptimistic<T>(
    voidData: any,
    optimisticUpdate: T,
    cacheKey: string,
    priority: number = 3
  ): Promise<string | null> {
    return await this.createOptimisticUpdate(
      'receipt',
      'DELETE',
      '/mf1/receipts',
      'DELETE',
      voidData,
      optimisticUpdate,
      cacheKey,
      priority
    );
  }

  /**
   * Enhanced queue receipt return with optimistic update
   */
  async queueReceiptReturnWithOptimistic<T>(
    returnData: any,
    optimisticReceipt: T,
    cacheKey: string,
    priority: number = 3
  ): Promise<string | null> {
    return await this.createOptimisticUpdate(
      'receipt',
      'CREATE',
      '/mf1/receipts/return',
      'POST',
      returnData,
      optimisticReceipt,
      cacheKey,
      priority
    );
  }

  /**
   * Get optimistic operations (if available)
   */
  getOptimisticOperations() {
    return this.optimisticManager?.getOptimisticOperations() || [];
  }

  /**
   * Get pending optimistic operations count
   */
  getOptimisticPendingCount(): number {
    return this.optimisticManager?.getPendingCount() || 0;
  }

  /**
   * Check if optimistic updates are enabled
   */
  isOptimisticEnabled(): boolean {
    return !!this.optimisticManager;
  }

  /**
   * Check if resource has pending optimistic updates
   */
  hasPendingOptimisticUpdates(resource: ResourceType, resourceId?: string): boolean {
    return this.optimisticManager?.hasPendingOptimisticUpdates(resource, resourceId) || false;
  }

  /**
   * Get the optimistic manager (for advanced use cases)
   */
  getOptimisticManager() {
    return this.optimisticManager;
  }

  /**
   * Manually rollback a specific optimistic operation
   */
  async rollbackOptimisticOperation(operationId: string, reason?: string): Promise<void> {
    if (!this.optimisticManager) {
      return;
    }
    
    await this.optimisticManager.rollbackOptimisticUpdate(operationId, reason);
  }

  /**
   * Manually rollback all pending optimistic operations for a resource
   */
  async rollbackOptimisticOperationsByResource(resource: ResourceType, resourceId?: string): Promise<void> {
    if (!this.optimisticManager) {
      return;
    }
    
    const operations = this.optimisticManager.getOptimisticOperations();
    const targetOperations = operations.filter(op => 
      op.resource === resource && 
      op.status === 'pending' &&
      (resourceId ? op.cacheKey.includes(resourceId) : true)
    );
    
    for (const operation of targetOperations) {
      await this.optimisticManager.rollbackOptimisticUpdate(
        operation.id, 
        `Manual rollback for ${resource}${resourceId ? ` ${resourceId}` : ''}`
      );
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.queue.destroy();
    this.syncManager.destroy();
    this.optimisticManager?.destroy();
  }
}