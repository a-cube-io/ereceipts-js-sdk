/**
 * Batch Processor - Groups related operations for efficient processing
 * Enterprise-grade batching with resource and time-based strategies
 */

import type { 
  QueueItem, 
  // QueueItemId, 
  BatchOperation, 
  ResourceType,
  QueueEvents,
  QueuePriority
} from './types';

export interface BatchProcessorConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  enableResourceGrouping: boolean;
  enableTimeWindowing: boolean;
  enablePriorityBatching: boolean;
  maxConcurrentBatches: number;
  batchTimeoutMs: number;
}

export interface BatchingStrategy {
  groupByResource: boolean;
  groupByPriority: boolean;
  groupByTimeWindow: boolean;
  windowSizeMs: number;
  maxItemsPerBatch: number;
  priorityMixing: boolean; // Allow mixing priorities in batch
}

export interface BatchGroupKey {
  resource?: ResourceType;
  priority?: QueuePriority;
  timeWindow?: number;
  custom?: string;
}

export class BatchProcessor {
  private config: BatchProcessorConfig;
  private pendingBatches: Map<string, BatchOperation> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private processingBatches: Set<string> = new Set();
  private eventHandlers: Map<keyof QueueEvents, Set<Function>> = new Map();
  private batchCounter = 0;

  constructor(config: Partial<BatchProcessorConfig> = {}) {
    this.config = {
      maxBatchSize: 50,
      maxWaitTime: 5000,
      enableResourceGrouping: true,
      enableTimeWindowing: true,
      enablePriorityBatching: false,
      maxConcurrentBatches: 10,
      batchTimeoutMs: 30000,
      ...config,
    };
  }

  /**
   * Add items to batching system
   */
  addToBatch(items: QueueItem[], strategy: BatchingStrategy): BatchOperation[] {
    const groups = this.groupItems(items, strategy);
    const batches: BatchOperation[] = [];

    for (const [groupKey, groupItems] of groups) {
      const batch = this.createOrUpdateBatch(groupKey, groupItems, strategy);
      if (batch) {
        batches.push(batch);
      }
    }

    return batches;
  }

  /**
   * Process a specific batch
   */
  async processBatch(
    batchId: string,
    processor: (items: QueueItem[]) => Promise<void>
  ): Promise<BatchOperation | null> {
    const batch = this.pendingBatches.get(batchId);
    if (!batch || this.processingBatches.has(batchId)) {
      return null;
    }

    // Mark as processing
    this.processingBatches.add(batchId);
    const updatedBatch: BatchOperation = {
      ...batch,
      status: 'processing',
    };

    this.pendingBatches.set(batchId, updatedBatch);
    // Processing state tracked internally, no event needed

    try {
      // Cancel timer if exists
      const timer = this.batchTimers.get(batchId);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(batchId);
      }

      // Process based on strategy
      if (batch.strategy === 'parallel') {
        await this.processParallel(batch.items, processor, batch.maxConcurrency);
      } else if (batch.strategy === 'sequential') {
        await this.processSequential(batch.items, processor);
      } else {
        await processor(batch.items);
      }

      // Mark as completed
      const completedBatch: BatchOperation = {
        ...updatedBatch,
        status: 'completed',
      };

      this.pendingBatches.delete(batchId);
      this.processingBatches.delete(batchId);
      
      this.emit('batch:completed', { batch: completedBatch });
      return completedBatch;

    } catch (error) {
      // Mark as failed
      const failedBatch: BatchOperation = {
        ...updatedBatch,
        status: 'failed',
      };

      this.pendingBatches.set(batchId, failedBatch);
      this.processingBatches.delete(batchId);
      
      this.emit('batch:failed', { batch: failedBatch });
      throw error;
    }
  }

  /**
   * Get ready batches (full or timed out)
   */
  getReadyBatches(): BatchOperation[] {
    const readyBatches: BatchOperation[] = [];
    const now = Date.now();

    for (const batch of this.pendingBatches.values()) {
      if (batch.status === 'pending') {
        const isFullBatch = batch.items.length >= this.config.maxBatchSize;
        const isTimedOut = (now - batch.createdAt) >= this.config.maxWaitTime;
        
        if (isFullBatch || isTimedOut) {
          readyBatches.push(batch);
        }
      }
    }

    return readyBatches;
  }

  /**
   * Force process all pending batches
   */
  async flushAllBatches(
    processor: (items: QueueItem[]) => Promise<void>
  ): Promise<BatchOperation[]> {
    const allBatches = Array.from(this.pendingBatches.values())
      .filter(batch => batch.status === 'pending');

    const results: BatchOperation[] = [];

    for (const batch of allBatches) {
      try {
        const result = await this.processBatch(batch.id, processor);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Failed to process batch ${batch.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get batch by ID
   */
  getBatch(batchId: string): BatchOperation | null {
    return this.pendingBatches.get(batchId) || null;
  }

  /**
   * Get all pending batches
   */
  getPendingBatches(): BatchOperation[] {
    return Array.from(this.pendingBatches.values())
      .filter(batch => batch.status === 'pending');
  }

  /**
   * Cancel a batch
   */
  cancelBatch(batchId: string): boolean {
    const batch = this.pendingBatches.get(batchId);
    if (!batch || this.processingBatches.has(batchId)) {
      return false;
    }

    // Clear timer
    const timer = this.batchTimers.get(batchId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchId);
    }

    this.pendingBatches.delete(batchId);
    return true;
  }

  /**
   * Clear all batches
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    this.batchTimers.clear();
    this.pendingBatches.clear();
    this.processingBatches.clear();
  }

  /**
   * Get batch statistics
   */
  getStats() {
    const pendingBatches = this.getPendingBatches();
    
    return {
      totalBatches: this.pendingBatches.size,
      pendingBatches: pendingBatches.length,
      processingBatches: this.processingBatches.size,
      totalItemsInBatches: pendingBatches.reduce((sum, batch) => sum + batch.items.length, 0),
      averageBatchSize: pendingBatches.length > 0 
        ? pendingBatches.reduce((sum, batch) => sum + batch.items.length, 0) / pendingBatches.length
        : 0,
    };
  }

  // Event handling
  on<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit<K extends keyof QueueEvents>(event: K, data: QueueEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in batch event handler for ${event}:`, error);
        }
      });
    }
  }

  // Private helper methods

  private groupItems(items: QueueItem[], strategy: BatchingStrategy): Map<string, QueueItem[]> {
    const groups = new Map<string, QueueItem[]>();

    for (const item of items) {
      const groupKey = this.generateGroupKey(item, strategy);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      const group = groups.get(groupKey)!;
      if (group.length < strategy.maxItemsPerBatch) {
        group.push(item);
      } else {
        // Create new group with incremented key
        const newGroupKey = `${groupKey}_${groups.size}`;
        groups.set(newGroupKey, [item]);
      }
    }

    return groups;
  }

  private generateGroupKey(item: QueueItem, strategy: BatchingStrategy): string {
    const keyParts: string[] = [];

    if (strategy.groupByResource) {
      keyParts.push(`resource:${item.resource}`);
    }

    if (strategy.groupByPriority && !strategy.priorityMixing) {
      keyParts.push(`priority:${item.priority}`);
    }

    if (strategy.groupByTimeWindow) {
      const windowStart = Math.floor(Date.now() / strategy.windowSizeMs) * strategy.windowSizeMs;
      keyParts.push(`window:${windowStart}`);
    }

    return keyParts.join('|') || 'default';
  }

  private createOrUpdateBatch(
    groupKey: string,
    items: QueueItem[],
    strategy: BatchingStrategy
  ): BatchOperation | null {
    // Check if there's an existing batch for this group
    let existingBatch: BatchOperation | null = null;
    
    for (const batch of this.pendingBatches.values()) {
      if (batch.status === 'pending') {
        const batchGroupKey = this.generateBatchGroupKey(batch, strategy);
        if (batchGroupKey === groupKey) {
          existingBatch = batch;
          break;
        }
      }
    }

    if (existingBatch) {
      // Add items to existing batch
      const updatedItems = [...existingBatch.items, ...items];
      
      // Check if batch is full
      if (updatedItems.length >= strategy.maxItemsPerBatch) {
        // Split into current batch and new batch
        const currentBatchItems = updatedItems.slice(0, strategy.maxItemsPerBatch);
        const remainingItems = updatedItems.slice(strategy.maxItemsPerBatch);

        // Update current batch
        const updatedBatch: BatchOperation = {
          ...existingBatch,
          items: currentBatchItems,
        };
        this.pendingBatches.set(existingBatch.id, updatedBatch);

        // Create new batch for remaining items if any
        if (remainingItems.length > 0) {
          return this.createNewBatch(remainingItems, strategy);
        }

        return updatedBatch;
      } else {
        // Update existing batch
        const updatedBatch: BatchOperation = {
          ...existingBatch,
          items: updatedItems,
        };
        this.pendingBatches.set(existingBatch.id, updatedBatch);
        return updatedBatch;
      }
    } else {
      // Create new batch
      return this.createNewBatch(items, strategy);
    }
  }

  private createNewBatch(items: QueueItem[], strategy: BatchingStrategy): BatchOperation {
    const batchId = `batch_${++this.batchCounter}_${Date.now()}`;
    
    const batch: BatchOperation = {
      id: batchId,
      items: items.slice(0, strategy.maxItemsPerBatch),
      status: 'pending',
      createdAt: Date.now(),
      strategy: this.determineBatchStrategy(items),
      maxConcurrency: this.config.maxConcurrentBatches,
    };

    this.pendingBatches.set(batchId, batch);

    // Set timeout for batch processing
    const timer = setTimeout(() => {
      const currentBatch = this.pendingBatches.get(batchId);
      if (currentBatch && currentBatch.status === 'pending') {
        // Mark batch as failed due to timeout
        const failedBatch: BatchOperation = {
          ...currentBatch,
          status: 'failed',
        };
        this.pendingBatches.set(batchId, failedBatch);
        this.emit('batch:failed', { batch: failedBatch });
      }
    }, this.config.maxWaitTime) as unknown as NodeJS.Timeout;

    this.batchTimers.set(batchId, timer);

    this.emit('batch:created', { batch });

    return batch;
  }

  private generateBatchGroupKey(batch: BatchOperation, strategy: BatchingStrategy): string {
    if (batch.items.length === 0) return 'empty';
    
    const firstItem = batch.items[0];
    if (!firstItem) return 'empty';
    return this.generateGroupKey(firstItem, strategy);
  }

  private determineBatchStrategy(items: QueueItem[]): BatchOperation['strategy'] {
    // Analyze items to determine best processing strategy
    const hasHighPriority = items.some(item => item.priority === 'critical' || item.priority === 'high');
    const hasDependencies = items.some(item => item.dependencies && item.dependencies.length > 0);

    if (hasDependencies) {
      return 'sequential'; // Dependencies require sequential processing
    } else if (hasHighPriority && items.length <= 10) {
      return 'parallel'; // Small high-priority batches can be parallelized
    } else {
      return 'sequential'; // Default to sequential for reliability
    }
  }

  private async processParallel(
    items: QueueItem[],
    processor: (items: QueueItem[]) => Promise<void>,
    maxConcurrency: number = 5
  ): Promise<void> {
    const chunks = this.chunkArray(items, Math.max(1, Math.floor(items.length / maxConcurrency)));
    
    await Promise.all(
      chunks.map(chunk => processor(chunk))
    );
  }

  private async processSequential(
    items: QueueItem[],
    processor: (items: QueueItem[]) => Promise<void>
  ): Promise<void> {
    // Process each item individually in sequence
    for (const item of items) {
      await processor([item]);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Cleanup
  destroy(): void {
    this.clear();
  }
}