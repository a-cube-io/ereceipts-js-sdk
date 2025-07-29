/**
 * Enterprise Queue Manager
 * Orchestrates all queue components for enterprise-grade offline operations
 */

import { EventEmitter } from 'eventemitter3';
import { PriorityQueue } from './priority-queue';
import { BatchProcessor } from './batch-processor';
// import { ConflictResolverManager } from './conflict-resolver'; // TODO: Re-enable when implementing conflict resolution
import { RetryManager } from './retry-manager';
import { QueueAnalytics } from './queue-analytics';

import type { 
  QueueItem, 
  QueueItemId, 
  QueuePriority, 
  QueueOperationType,
  ResourceType,
  QueueConfig,
  QueueEvents,
  QueueStats,
  BatchOperation,
  QueueProcessor 
} from './types';
import { createQueueItemId } from './types';

export interface QueueManagerConfig extends QueueConfig {
  storageKey: string;
  autoProcessing: boolean;
  processingInterval: number;
  maxConcurrentProcessing: number;
  enablePersistence: boolean;
  enableAnalytics: boolean;
}

export interface ProcessingResult {
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
}

export class EnterpriseQueueManager extends EventEmitter<QueueEvents> {
  private config: QueueManagerConfig;
  private priorityQueue: PriorityQueue;
  private batchProcessor: BatchProcessor;
  // private _conflictResolver: ConflictResolverManager;  // TODO: Implement conflict resolution
  private retryManager: RetryManager;
  private analytics: QueueAnalytics;
  
  private processors: Map<string, QueueProcessor> = new Map();
  private processingItems: Set<QueueItemId> = new Set();
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private itemCounter = 0;

  constructor(config: Partial<QueueManagerConfig> = {}) {
    super();
    
    this.config = {
      maxSize: 10000,
      maxRetries: 3,
      defaultPriority: 'normal',
      defaultRetryStrategy: 'exponential',
      defaultConflictResolution: 'server-wins',
      batchingEnabled: true,
      batchSize: 20,
      batchTimeout: 5000,
      deadLetterEnabled: true,
      analyticsEnabled: true,
      persistToDisk: true,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      deduplicationEnabled: true,
      deduplicationWindow: 300000,
      storageKey: 'acube-enterprise-queue',
      autoProcessing: true,
      processingInterval: 1000,
      maxConcurrentProcessing: 5,
      enablePersistence: true,
      enableAnalytics: true,
      ...config,
    };

    // Initialize required components
    this.priorityQueue = new PriorityQueue(this.config);
    this.batchProcessor = new BatchProcessor({});
    // this._conflictResolver = new ConflictResolverManager({});  // TODO: Implement
    this.retryManager = new RetryManager({});
    this.analytics = new QueueAnalytics({});

    this.initializeComponents();
    this.setupEventHandlers();
    
    if (this.config.autoProcessing) {
      this.startAutoProcessing();
    }
  }

  /**
   * Add operation to queue
   */
  async enqueue(
    operation: QueueOperationType,
    resource: ResourceType,
    data: any,
    options: {
      priority?: QueuePriority;
      optimisticId?: string;
      batchId?: string;
      dependencies?: QueueItemId[];
      metadata?: Record<string, unknown>;
      scheduledAt?: number;
    } = {}
  ): Promise<QueueItemId> {
    const id = createQueueItemId(`${resource}_${operation}_${++this.itemCounter}_${Date.now()}`);
    
    const item: QueueItem = {
      id,
      priority: options.priority || this.config.defaultPriority,
      operation,
      resource,
      data,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(options.scheduledAt !== undefined && { scheduledAt: options.scheduledAt }),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      retryStrategy: this.config.defaultRetryStrategy,
      conflictResolution: this.config.defaultConflictResolution,
      ...(options.optimisticId && { optimisticId: options.optimisticId }),
      ...(options.batchId && { batchId: options.batchId }),
      ...(options.dependencies && { dependencies: options.dependencies }),
      ...(options.metadata && { metadata: options.metadata }),
      errorHistory: [],
    };

    // Check for deduplication
    if (this.config.deduplicationEnabled && this.isDuplicate(item)) {
      throw new Error(`Duplicate operation detected for ${resource}:${operation}`);
    }

    const success = this.priorityQueue.enqueue(item);
    if (!success) {
      throw new Error('Queue is full - unable to enqueue item');
    }

    // Persist if enabled
    if (this.config.enablePersistence) {
      await this.persistQueue();
    }

    // Record analytics
    if (this.config.enableAnalytics) {
      this.analytics.recordQueueSnapshot(this.getStats());
    }

    return id;
  }

  /**
   * Remove item from queue
   */
  async dequeue(id: QueueItemId): Promise<boolean> {
    const success = this.priorityQueue.remove(id);
    
    if (success && this.config.enablePersistence) {
      await this.persistQueue();
    }

    return success;
  }

  /**
   * Get item by ID
   */
  getItem(id: QueueItemId): QueueItem | null {
    return this.priorityQueue.get(id);
  }

  /**
   * Update item status
   */
  async updateItemStatus(
    id: QueueItemId, 
    status: QueueItem['status'], 
    error?: string
  ): Promise<boolean> {
    const item = this.priorityQueue.get(id);
    if (!item) {
      return false;
    }

    let errorHistory = item.errorHistory || [];
    if (error) {
      const newErrorEntry = {
        timestamp: Date.now(),
        error,
        retryable: this.isRetryableError(error),
        context: { status: item.status },
      };
      errorHistory = [...errorHistory, newErrorEntry];
    }

    // Create new item with updated properties
    const updatedItem: QueueItem = {
      ...item,
      status,
      updatedAt: Date.now(),
      ...(error && { errorHistory }),
    };

    const success = this.priorityQueue.updateItem(id, updatedItem);
    
    if (success) {
      // Handle status-specific logic
      await this.handleStatusChange(id, status, error);
      
      if (this.config.enablePersistence) {
        await this.persistQueue();
      }
    }

    return success;
  }

  /**
   * Register processor for resource/operation combination
   */
  registerProcessor(
    resource: ResourceType,
    operation: QueueOperationType,
    processor: QueueProcessor
  ): void {
    const key = `${resource}:${operation}`;
    this.processors.set(key, processor);
  }

  /**
   * Process next available items
   */
  async processNext(maxItems: number = 1): Promise<ProcessingResult[]> {
    if (this.isProcessing) {
      return [];
    }

    this.isProcessing = true;
    const results: ProcessingResult[] = [];

    try {
      const availableSlots = Math.min(
        maxItems,
        this.config.maxConcurrentProcessing - this.processingItems.size
      );

      if (availableSlots <= 0) {
        return results;
      }

      // Get ready items
      const readyItems = this.priorityQueue.getReadyItems(availableSlots);
      
      if (readyItems.length === 0) {
        return results;
      }

      // Process with batching if enabled
      if (this.config.batchingEnabled) {
        const batchResults = await this.processBatched(readyItems);
        results.push(...batchResults);
      } else {
        const individualResults = await this.processIndividually(readyItems);
        results.push(...individualResults);
      }

      // Update analytics
      if (this.config.enableAnalytics) {
        this.analytics.recordQueueSnapshot(this.getStats());
      }

    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Process all pending items
   */
  async processAll(): Promise<ProcessingResult[]> {
    const allResults: ProcessingResult[] = [];
    
    while (this.priorityQueue.getReadyItems(1).length > 0) {
      const results = await this.processNext(this.config.maxConcurrentProcessing);
      if (results.length === 0) break;
      allResults.push(...results);
    }

    return allResults;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return this.priorityQueue.getStats();
  }

  /**
   * Get queue insights
   */
  getInsights() {
    return this.analytics.getInsights();
  }

  /**
   * Get trend analysis
   */
  getTrendAnalysis() {
    return this.analytics.getTrendAnalysis();
  }

  /**
   * Clear all items from queue
   */
  async clear(): Promise<void> {
    this.priorityQueue.clear();
    this.batchProcessor.clear();
    this.retryManager.clearRetries();
    this.processingItems.clear();

    if (this.config.enablePersistence) {
      await this.persistQueue();
    }
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    this.emit('queue:paused', {});
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (this.config.autoProcessing && !this.processingTimer) {
      this.startAutoProcessing();
    }
    this.emit('queue:resumed', {});
  }

  /**
   * Get processing status
   */
  getProcessingStatus() {
    return {
      isProcessing: this.isProcessing,
      processingItems: this.processingItems.size,
      autoProcessing: this.processingTimer !== null,
      readyItems: this.priorityQueue.getReadyItems().length,
    };
  }

  /**
   * Initialize the queue manager
   */
  async initialize(): Promise<void> {
    // Initialize components if needed
    this.initializeComponents();
    
    // Load persisted queue if available
    // await this._loadPersistedQueue(); // TODO: Implement when storage is ready
    
    this.emit('queue:initialized', {});
  }

  /**
   * Add item to queue (compatibility method)
   */
  async add(item: QueueItem): Promise<void> {
    const success = this.priorityQueue.enqueue(item);
    if (!success) {
      throw new Error('Failed to add item to queue');
    }
    
    if (this.config.enablePersistence) {
      await this.persistQueue();
    }
  }

  /**
   * Process a specific queue item (public interface)
   */
  async processItem(item: QueueItem): Promise<ProcessingResult> {
    return this.processItemInternal(item);
  }

  /**
   * Get all queue items (compatibility method)
   */
  getQueueItems(): QueueItem[] {
    return this.priorityQueue.toArray();
  }

  /**
   * Cleanup and destroy
   */
  async destroy(): Promise<void> {
    this.pause();
    
    // Wait for current processing to complete
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.priorityQueue.clear();
    this.batchProcessor.destroy();
    this.retryManager.destroy();
    this.analytics.destroy();
    
    this.removeAllListeners();
  }

  // Private methods

  private initializeComponents(): void {
    this.priorityQueue = new PriorityQueue({
      maxSize: this.config.maxSize,
      enableMetrics: this.config.analyticsEnabled,
      enableEvents: true,
    });

    this.batchProcessor = new BatchProcessor({
      maxBatchSize: this.config.batchSize,
      maxWaitTime: this.config.batchTimeout,
      enableResourceGrouping: true,
      enableTimeWindowing: true,
    });

    // this._conflictResolver = new ConflictResolverManager({
    //   defaultStrategy: this.config.defaultConflictResolution,
    // });

    this.retryManager = new RetryManager({
      defaultRetryPolicy: {
        strategy: this.config.defaultRetryStrategy,
        maxRetries: this.config.maxRetries,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
        jitterEnabled: true,
      },
      circuitBreakerConfig: {
        enabled: this.config.circuitBreakerEnabled,
        failureThreshold: this.config.circuitBreakerThreshold,
        successThreshold: 3,
        timeout: 60000,
        monitoringWindow: 300000,
      },
    });

    this.analytics = new QueueAnalytics({
      enabled: this.config.enableAnalytics,
      sampleRate: 1.0,
      retentionDays: 7,
    });
  }

  private setupEventHandlers(): void {
    // Forward priority queue events
    this.priorityQueue.on('item:added', (data) => this.emit('item:added', data));
    this.priorityQueue.on('item:processing', (data) => this.emit('item:processing', data));
    this.priorityQueue.on('item:completed', (data) => this.emit('item:completed', data));
    this.priorityQueue.on('item:failed', (data) => this.emit('item:failed', data));

    // Handle retry events
    this.retryManager.on('item:retry-ready', async ({ itemId }) => {
      const item = this.priorityQueue.get(itemId);
      if (item) {
        await this.priorityQueue.updateItem(itemId, { 
          status: 'pending',
          retryCount: item.retryCount + 1,
        });
      }
    });

    // Handle batch events
    this.batchProcessor.on('batch:created', (data) => this.emit('batch:created', data));
    this.batchProcessor.on('batch:completed', (data) => this.emit('batch:completed', data));
  }

  private startAutoProcessing(): void {
    this.processingTimer = setInterval(async () => {
      try {
        await this.processNext(this.config.maxConcurrentProcessing);
      } catch (error) {
        console.error('Error in auto-processing:', error);
      }
    }, this.config.processingInterval) as unknown as NodeJS.Timeout;
  }

  private async processBatched(items: QueueItem[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    // Group items for batching
    const batches = this.batchProcessor.addToBatch(items, {
      groupByResource: true,
      groupByPriority: false,
      groupByTimeWindow: false,
      windowSizeMs: 60000,
      maxItemsPerBatch: this.config.batchSize,
      priorityMixing: true,
    });

    // Process each batch
    for (const batch of batches) {
      const batchResult = await this.processBatch(batch);
      results.push(...batchResult);
    }

    return results;
  }

  private async processIndividually(items: QueueItem[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    const processingPromises = items.map(async (item) => {
      return this.processItemInternal(item);
    });

    const batchResults = await Promise.allSettled(processingPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason?.message || 'Unknown error',
          processingTime: 0,
        });
      }
    }

    return results;
  }

  private async processBatch(batch: BatchOperation): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    try {
      await this.batchProcessor.processBatch(batch.id, async (items) => {
        const batchResults = await Promise.allSettled(
          items.map(item => this.processItemInternal(item))
        );
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason?.message || 'Batch processing error',
              processingTime: 0,
            });
          }
        }
      });
    } catch (error) {
      // If batch processing fails, fall back to individual processing
      console.warn('Batch processing failed, falling back to individual:', error);
      return this.processIndividually(batch.items);
    }

    return results;
  }

  private async processItemInternal(item: QueueItem): Promise<ProcessingResult> {
    const startTime = Date.now();
    this.processingItems.add(item.id);

    try {
      // Record processing start
      if (this.config.enableAnalytics) {
        this.analytics.recordProcessingStart(item.id);
      }

      // Update item status
      await this.updateItemStatus(item.id, 'processing');

      // Get processor
      const processorKey = `${item.resource}:${item.operation}`;
      const processor = this.processors.get(processorKey);
      
      if (!processor) {
        throw new Error(`No processor registered for ${processorKey}`);
      }

      // Execute processing
      const result = await processor(item);

      // Record success
      this.retryManager.recordSuccess(item.resource);
      
      if (this.config.enableAnalytics) {
        this.analytics.recordProcessingComplete(item.id, true);
      }

      // Update item status
      await this.updateItemStatus(item.id, 'completed');

      const processingTime = Date.now() - startTime;
      return {
        success: true,
        result,
        processingTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record failure
      this.retryManager.recordFailure(item.resource, errorMessage);
      
      if (this.config.enableAnalytics) {
        this.analytics.recordProcessingComplete(item.id, false);
      }

      // Handle retry or failure
      if (item.retryCount < item.maxRetries && this.isRetryableError(errorMessage)) {
        const retryScheduled = this.retryManager.scheduleRetry(item, errorMessage);
        if (retryScheduled) {
          await this.updateItemStatus(item.id, 'retry', errorMessage);
        } else {
          await this.updateItemStatus(item.id, 'failed', errorMessage);
        }
      } else {
        await this.updateItemStatus(item.id, 'failed', errorMessage);
      }

      const processingTime = Date.now() - startTime;
      return {
        success: false,
        error: errorMessage,
        processingTime,
      };

    } finally {
      this.processingItems.delete(item.id);
    }
  }

  private async handleStatusChange(
    id: QueueItemId, 
    status: QueueItem['status'], 
    _error?: string
  ): Promise<void> {
    const item = this.priorityQueue.get(id);
    if (!item) return;

    switch (status) {
      case 'failed':
        if (item.retryCount >= item.maxRetries && this.config.deadLetterEnabled) {
          // Move to dead letter queue
          await this.updateItemStatus(id, 'dead');
        }
        break;

      case 'dead':
        this.emit('item:dead', { item });
        break;

      case 'completed':
        // Remove completed items after a short delay
        setTimeout(() => {
          this.priorityQueue.remove(id);
        }, 5000);
        break;
    }
  }

  private isDuplicate(item: QueueItem): boolean {
    if (!this.config.deduplicationEnabled) return false;

    const cutoffTime = Date.now() - this.config.deduplicationWindow;
    const existingItems = this.priorityQueue.getByResource(item.resource);

    return existingItems.some(existing => 
      existing.operation === item.operation &&
      existing.createdAt >= cutoffTime &&
      JSON.stringify(existing.data) === JSON.stringify(item.data)
    );
  }

  private isRetryableError(error: string): boolean {
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVER_ERROR',
      'RATE_LIMITED',
      'TEMPORARY_FAILURE',
    ];

    return retryableErrors.some(retryable => error.includes(retryable));
  }

  private async persistQueue(): Promise<void> {
    if (!this.config.enablePersistence) return;

    try {
      const queueData = {
        items: this.priorityQueue.toArray(),
        timestamp: Date.now(),
      };

      // This would integrate with the storage adapter
      // For now, we'll use localStorage as a fallback
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.config.storageKey, JSON.stringify(queueData));
      }
    } catch (error) {
      console.warn('Failed to persist queue:', error);
    }
  }

  // TODO: Implement persisted queue loading when storage adapter is ready
  // private async _loadPersistedQueue(): Promise<void> {
  //   if (!this.config.enablePersistence) return;
  //
  //   try {
  //     // This would integrate with the storage adapter
  //     if (typeof localStorage !== 'undefined') {
  //       const serialized = localStorage.getItem(this.config.storageKey);
  //       if (serialized) {
  //         const queueData = JSON.parse(serialized);
  //         if (queueData.items && Array.isArray(queueData.items)) {
  //           for (const item of queueData.items) {
  //             this.priorityQueue.enqueue(item);
  //           }
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.warn('Failed to load persisted queue:', error);
  //   }
  // }
}

// Export types for external use
export type { QueueItem, QueueStats } from './types';