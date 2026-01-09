import {
  ICachePort as ICacheAdapter,
  INetworkPort as INetworkMonitor,
  IStoragePort as IStorage,
} from '@/application/ports/driven';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  BatchSyncResult,
  DEFAULT_QUEUE_CONFIG,
  OperationType,
  QueueConfig,
  QueueEvents,
  ResourceType,
} from '@/domain/entities/offline.entity';

import { OperationQueue } from './queue';
import { SyncManager } from './sync-manager';

export class OfflineManager {
  private queue: OperationQueue;
  private syncManager: SyncManager;

  constructor(
    storage: IStorage,
    httpPort: IHttpPort,
    networkMonitor: INetworkMonitor,
    config: Partial<QueueConfig> = {},
    events: QueueEvents = {},
    _cache?: ICacheAdapter
  ) {
    const finalConfig = { ...DEFAULT_QUEUE_CONFIG, ...config };

    this.queue = new OperationQueue(storage, finalConfig, events);
    this.syncManager = new SyncManager(this.queue, httpPort, networkMonitor, finalConfig, events);
  }

  async queueOperation(
    type: OperationType,
    resource: ResourceType,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: unknown,
    priority: number = 1
  ): Promise<string> {
    return await this.queue.addOperation(type, resource, endpoint, method, data, priority);
  }

  async queueReceiptCreation(receiptData: unknown, priority: number = 2): Promise<string> {
    return await this.queueOperation(
      'CREATE',
      'receipt',
      '/mf1/receipts',
      'POST',
      receiptData,
      priority
    );
  }

  async queueReceiptVoid(voidData: unknown, priority: number = 3): Promise<string> {
    return await this.queueOperation(
      'DELETE',
      'receipt',
      '/mf1/receipts',
      'DELETE',
      voidData,
      priority
    );
  }

  async queueReceiptReturn(returnData: unknown, priority: number = 3): Promise<string> {
    return await this.queueOperation(
      'CREATE',
      'receipt',
      '/mf1/receipts/return',
      'POST',
      returnData,
      priority
    );
  }

  async queueCashierCreation(cashierData: unknown, priority: number = 1): Promise<string> {
    return await this.queueOperation(
      'CREATE',
      'cashier',
      '/mf1/cashiers',
      'POST',
      cashierData,
      priority
    );
  }

  isOnline(): boolean {
    return this.syncManager.isCurrentlyOnline();
  }

  getStatus() {
    return this.syncManager.getSyncStatus();
  }

  getPendingCount(): number {
    return this.queue.getPendingOperations().length;
  }

  isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  async sync(): Promise<BatchSyncResult | null> {
    return await this.syncManager.triggerSync();
  }

  async retryFailed(): Promise<void> {
    await this.queue.retryFailed();
    if (this.isOnline()) {
      await this.sync();
    }
  }

  async clearCompleted(): Promise<void> {
    await this.queue.clearCompleted();
  }

  async clearFailed(): Promise<void> {
    await this.queue.clearFailed();
  }

  async clearAll(): Promise<void> {
    await this.queue.clearQueue();
  }

  getOperation(id: string) {
    return this.queue.getOperation(id);
  }

  async removeOperation(id: string): Promise<boolean> {
    return await this.queue.removeOperation(id);
  }

  getQueueStats() {
    return this.queue.getStats();
  }

  startAutoSync(): void {
    this.queue.startAutoSync();
  }

  stopAutoSync(): void {
    this.queue.stopAutoSync();
  }

  destroy(): void {
    this.queue.destroy();
    this.syncManager.destroy();
  }
}
