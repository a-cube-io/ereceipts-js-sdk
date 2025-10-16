import { IStorage, INetworkMonitor, ICacheAdapter } from '../adapters';
import { HttpClient } from '../core';
import { OperationQueue } from './queue';
import { SyncManager } from './sync-manager';
import { 
  OperationType, 
  ResourceType, 
  QueueConfig, 
  QueueEvents, 
  BatchSyncResult 
} from './types';

/**
 * Enhanced offline manager with optimistic update support
 */
export class OfflineManager {
  private queue: OperationQueue;
  private syncManager: SyncManager;

  constructor(
    storage: IStorage,
    httpClient: HttpClient,
    networkMonitor: INetworkMonitor,
    config: Partial<QueueConfig> = {},
    events: QueueEvents = {},
    _cache?: ICacheAdapter
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

    // Use original events without optimistic manager integration
    const enhancedEvents: QueueEvents = {
      ...events
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
   * Remove a specific operation
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
    _resource: ResourceType,
    _operation: OperationType,
    _endpoint: string,
    _method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    _data: any,
    _optimisticData: T,
    _cacheKey: string,
    _priority: number = 2
  ): Promise<string | null> {
    // Optimistic updates disabled in a simplified cache system
    return null;
  }

  /**
   * Enhanced queue receipt creation with an optimistic update
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
   * Enhanced queue receipt void with an optimistic update
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
   * Enhanced queue receipt return with an optimistic update
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
   * Get optimistic operations (disabled in a simplified cache system)
   */
  getOptimisticOperations() {
    return [];
  }

  /**
   * Get pending optimistic operations count (disabled in a simplified cache system)
   */
  getOptimisticPendingCount(): number {
    return 0;
  }

  /**
   * Check if optimistic updates are enabled (disabled in a simplified cache system)
   */
  isOptimisticEnabled(): boolean {
    return false;
  }

  /**
   * Check if a resource has pending optimistic updates (disabled in a simplified cache system)
   */
  hasPendingOptimisticUpdates(_resource: ResourceType, _resourceId?: string): boolean {
    return false;
  }

  /**
   * Get the optimistic manager (disabled in a simplified cache system)
   */
  getOptimisticManager() {
    return null;
  }

  /**
   * Manually roll back a specific optimistic operation (disabled in a simplified cache system)
   */
  async rollbackOptimisticOperation(_operationId: string, _reason?: string): Promise<void> {
    // Optimistic updates disabled in a simplified cache system
    return;
  }

  /**
   * Manually roll back all pending optimistic operations for a resource (disabled in a simplified cache system)
   */
  async rollbackOptimisticOperationsByResource(_resource: ResourceType, _resourceId?: string): Promise<void> {
    // Optimistic updates disabled in a simplified cache system
    return;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.queue.destroy();
    this.syncManager.destroy();
  }
}