import { BehaviorSubject, Observable, Subject } from 'rxjs';

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
  QueuedOperation,
  ResourceType,
  SyncStatus,
} from '@/domain/entities/offline.entity';

import { OperationQueue } from './queue';
import { SyncManager } from './sync-manager';

export class OfflineManager {
  private queue: OperationQueue;
  private syncManager: SyncManager;
  private readonly queueSubject = new BehaviorSubject<QueuedOperation[]>([]);
  private readonly syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isOnline: true,
    isProcessing: false,
    queueStats: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 },
  });
  private readonly destroy$ = new Subject<void>();

  get queue$(): Observable<QueuedOperation[]> {
    return this.queueSubject.asObservable();
  }

  get syncStatus$(): Observable<SyncStatus> {
    return this.syncStatusSubject.asObservable();
  }

  constructor(
    storage: IStorage,
    httpPort: IHttpPort,
    networkMonitor: INetworkMonitor,
    config: Partial<QueueConfig> = {},
    events: QueueEvents = {},
    _cache?: ICacheAdapter
  ) {
    const finalConfig = { ...DEFAULT_QUEUE_CONFIG, ...config };

    const wrappedEvents: QueueEvents = {
      ...events,
      onOperationAdded: (op) => {
        this.updateQueueState();
        events.onOperationAdded?.(op);
      },
      onOperationCompleted: (result) => {
        this.updateQueueState();
        events.onOperationCompleted?.(result);
      },
      onOperationFailed: (result) => {
        this.updateQueueState();
        events.onOperationFailed?.(result);
      },
      onBatchSyncCompleted: (result) => {
        this.updateQueueState();
        events.onBatchSyncCompleted?.(result);
      },
    };

    this.queue = new OperationQueue(storage, finalConfig, wrappedEvents);
    this.syncManager = new SyncManager(
      this.queue,
      httpPort,
      networkMonitor,
      finalConfig,
      wrappedEvents
    );

    this.updateQueueState();
  }

  private updateQueueState(): void {
    this.queueSubject.next(this.queue.getPendingOperations());
    this.syncStatusSubject.next(this.syncManager.getSyncStatus());
  }

  async queueOperation(
    type: OperationType,
    resource: ResourceType,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: unknown,
    priority: number = 1
  ): Promise<string> {
    const id = await this.queue.addOperation(type, resource, endpoint, method, data, priority);
    this.updateQueueState();
    return id;
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
    const result = await this.syncManager.triggerSync();
    this.updateQueueState();
    return result;
  }

  async retryFailed(): Promise<void> {
    await this.queue.retryFailed();
    this.updateQueueState();
    if (this.isOnline()) {
      await this.sync();
    }
  }

  async clearCompleted(): Promise<void> {
    await this.queue.clearCompleted();
    this.updateQueueState();
  }

  async clearFailed(): Promise<void> {
    await this.queue.clearFailed();
    this.updateQueueState();
  }

  async clearAll(): Promise<void> {
    await this.queue.clearQueue();
    this.updateQueueState();
  }

  getOperation(id: string) {
    return this.queue.getOperation(id);
  }

  async removeOperation(id: string): Promise<boolean> {
    const result = await this.queue.removeOperation(id);
    this.updateQueueState();
    return result;
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
    this.destroy$.next();
    this.destroy$.complete();
    this.queue.destroy();
    this.syncManager.destroy();
  }
}
