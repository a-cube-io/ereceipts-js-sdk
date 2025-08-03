import { IStorage } from '../adapters';
import { 
  QueuedOperation, 
  OperationType, 
  ResourceType, 
  QueueConfig, 
  QueueEvents 
} from './types';

/**
 * Default queue configuration
 */
const DEFAULT_CONFIG: QueueConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  maxQueueSize: 1000,
  batchSize: 10,
  syncInterval: 0, // Disabled by default
};

/**
 * Operation queue manager for offline functionality
 */
export class OperationQueue {
  private static readonly QUEUE_KEY = 'acube_operation_queue';
  
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private syncIntervalId?: NodeJS.Timeout;

  constructor(
    private storage: IStorage,
    private config: QueueConfig = DEFAULT_CONFIG,
    private events: QueueEvents = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadQueue();
    
    if (this.config.syncInterval > 0) {
      this.startAutoSync();
    }
  }

  /**
   * Add an operation to the queue
   */
  async addOperation(
    type: OperationType,
    resource: ResourceType,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: any,
    priority: number = 1
  ): Promise<string> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority operation
      const lowPriorityIndex = this.queue.findIndex(op => op.priority === 1);
      if (lowPriorityIndex !== -1) {
        this.queue.splice(lowPriorityIndex, 1);
      } else {
        throw new Error('Queue is full and cannot add new operations');
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

    // Insert operation based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(op => op.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(operation);
    } else {
      this.queue.splice(insertIndex, 0, operation);
    }

    await this.saveQueue();
    this.events.onOperationAdded?.(operation);

    return operation.id;
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): QueuedOperation[] {
    return this.queue.filter(op => op.status === 'pending' || op.status === 'failed');
  }

  /**
   * Get operation by ID
   */
  getOperation(id: string): QueuedOperation | undefined {
    return this.queue.find(op => op.id === id);
  }

  /**
   * Remove operation from queue
   */
  async removeOperation(id: string): Promise<boolean> {
    const index = this.queue.findIndex(op => op.id === id);
    if (index === -1) {
      return false;
    }

    this.queue.splice(index, 1);
    await this.saveQueue();
    return true;
  }

  /**
   * Update operation status
   */
  async updateOperation(id: string, updates: Partial<QueuedOperation>): Promise<boolean> {
    const operation = this.queue.find(op => op.id === id);
    if (!operation) {
      return false;
    }

    Object.assign(operation, {
      ...updates,
      updatedAt: Date.now(),
    });

    await this.saveQueue();
    return true;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(op => op.status === 'pending').length,
      processing: this.queue.filter(op => op.status === 'processing').length,
      completed: this.queue.filter(op => op.status === 'completed').length,
      failed: this.queue.filter(op => op.status === 'failed').length,
    };
  }

  /**
   * Clear all operations from queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<void> {
    this.queue = this.queue.filter(op => op.status !== 'completed');
    await this.saveQueue();
  }

  /**
   * Clear failed operations
   */
  async clearFailed(): Promise<void> {
    this.queue = this.queue.filter(op => op.status !== 'failed');
    await this.saveQueue();
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<void> {
    const failedOperations = this.queue.filter(op => op.status === 'failed');
    
    for (const operation of failedOperations) {
      if (operation.retryCount < operation.maxRetries) {
        operation.status = 'pending';
        operation.retryCount++;
        operation.updatedAt = Date.now();
        delete operation.error;
      }
    }

    await this.saveQueue();
  }

  /**
   * Get operations for batch processing
   */
  getNextBatch(): QueuedOperation[] {
    return this.queue
      .filter(op => op.status === 'pending')
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)
      .slice(0, this.config.batchSize);
  }

  /**
   * Check if queue is empty (no pending operations)
   */
  isEmpty(): boolean {
    return this.getPendingOperations().length === 0;
  }

  /**
   * Start auto-sync timer
   */
  startAutoSync(): void {
    if (this.syncIntervalId) {
      return;
    }

    this.syncIntervalId = setInterval(() => {
      if (!this.isEmpty() && !this.isProcessing) {
        // Trigger sync through event
        this.events.onQueueEmpty?.();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop auto-sync timer
   */
  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  /**
   * Set processing state
   */
  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
  }

  /**
   * Check if currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueData = await this.storage.get(OperationQueue.QUEUE_KEY);
      if (queueData) {
        this.queue = JSON.parse(queueData);
        
        // Reset processing status on load (in case app crashed while processing)
        this.queue.forEach(op => {
          if (op.status === 'processing') {
            op.status = 'pending';
          }
        });
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await this.storage.set(OperationQueue.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
      this.events.onError?.(new Error(`Failed to save queue: ${error}`));
    }
  }

  /**
   * Generate unique ID for operations
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoSync();
  }
}