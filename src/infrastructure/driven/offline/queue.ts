import { IStoragePort as IStorage } from '@/application/ports/driven';
import {
  DEFAULT_QUEUE_CONFIG,
  HttpMethod,
  OperationType,
  QueueConfig,
  QueueEvents,
  QueueStats,
  QueuedOperation,
  ResourceType,
} from '@/domain/entities/offline.entity';

export class OperationQueue {
  private static readonly QUEUE_KEY = 'acube_operation_queue';
  private queue: QueuedOperation[] = [];
  private processing = false;
  private syncIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private storage: IStorage,
    private config: QueueConfig = DEFAULT_QUEUE_CONFIG,
    private events: QueueEvents = {}
  ) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    this.loadQueue();

    if (this.config.syncInterval > 0) {
      this.startAutoSync();
    }
  }

  async addOperation(
    type: OperationType,
    resource: ResourceType,
    endpoint: string,
    method: HttpMethod,
    data?: unknown,
    priority: number = 1
  ): Promise<string> {
    if (this.queue.length >= this.config.maxQueueSize) {
      const lowPriorityIndex = this.queue.findIndex((op) => op.priority === 1);
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        throw new Error('Queue is full');
      }
    }

    const operation: QueuedOperation = {
      id: this.generateId(),
      type,
      resource,
      endpoint,
      method,
      data,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      priority,
    };

    const insertIndex = this.queue.findIndex((op) => op.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(operation);
    } else {
      this.queue.splice(insertIndex, 0, operation);
    }

    await this.saveQueue();
    this.events.onOperationAdded?.(operation);

    return operation.id;
  }

  getPendingOperations(): QueuedOperation[] {
    return this.queue.filter((op) => op.status === 'pending' || op.status === 'failed');
  }

  getOperation(id: string): QueuedOperation | undefined {
    return this.queue.find((op) => op.id === id);
  }

  async removeOperation(id: string): Promise<boolean> {
    const index = this.queue.findIndex((op) => op.id === id);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    await this.saveQueue();
    return true;
  }

  async updateOperation(id: string, updates: Partial<QueuedOperation>): Promise<boolean> {
    const operation = this.queue.find((op) => op.id === id);
    if (!operation) return false;

    Object.assign(operation, { ...updates, updatedAt: Date.now() });
    await this.saveQueue();
    return true;
  }

  getStats(): QueueStats {
    return {
      total: this.queue.length,
      pending: this.queue.filter((op) => op.status === 'pending').length,
      processing: this.queue.filter((op) => op.status === 'processing').length,
      completed: this.queue.filter((op) => op.status === 'completed').length,
      failed: this.queue.filter((op) => op.status === 'failed').length,
    };
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  async clearCompleted(): Promise<void> {
    this.queue = this.queue.filter((op) => op.status !== 'completed');
    await this.saveQueue();
  }

  async clearFailed(): Promise<void> {
    this.queue = this.queue.filter((op) => op.status !== 'failed');
    await this.saveQueue();
  }

  async retryFailed(): Promise<void> {
    for (const operation of this.queue.filter((op) => op.status === 'failed')) {
      if (operation.retryCount < operation.maxRetries) {
        operation.status = 'pending';
        operation.retryCount++;
        operation.updatedAt = Date.now();
        delete operation.error;
      }
    }
    await this.saveQueue();
  }

  getNextBatch(): QueuedOperation[] {
    return this.queue
      .filter((op) => op.status === 'pending')
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)
      .slice(0, this.config.batchSize);
  }

  isEmpty(): boolean {
    return this.getPendingOperations().length === 0;
  }

  startAutoSync(): void {
    if (this.syncIntervalId) return;

    this.syncIntervalId = setInterval(() => {
      if (!this.isEmpty() && !this.processing) {
        this.events.onQueueEmpty?.();
      }
    }, this.config.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  setProcessing(value: boolean): void {
    this.processing = value;
  }

  isCurrentlyProcessing(): boolean {
    return this.processing;
  }

  private async loadQueue(): Promise<void> {
    try {
      const queueData = await this.storage.get(OperationQueue.QUEUE_KEY);
      if (queueData) {
        this.queue = JSON.parse(queueData);
        this.queue.forEach((op) => {
          if (op.status === 'processing') {
            op.status = 'pending';
          }
        });
      }
    } catch {
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await this.storage.set(OperationQueue.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      this.events.onError?.(new Error(`Failed to save queue: ${error}`));
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy(): void {
    this.stopAutoSync();
  }
}
