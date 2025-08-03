import { IStorage, INetworkMonitor } from '../adapters';
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

/**
 * Offline manager that combines queue and sync functionality
 */
export class OfflineManager {
  private queue: OperationQueue;
  private syncManager: SyncManager;

  constructor(
    storage: IStorage,
    httpClient: HttpClient,
    networkMonitor: INetworkMonitor,
    config: Partial<QueueConfig> = {},
    events: QueueEvents = {}
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

    // Initialize queue and sync manager
    this.queue = new OperationQueue(storage, finalConfig, events);
    this.syncManager = new SyncManager(
      this.queue,
      httpClient,
      networkMonitor,
      finalConfig,
      events
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
   * Cleanup resources
   */
  destroy(): void {
    this.queue.destroy();
    this.syncManager.destroy();
  }
}