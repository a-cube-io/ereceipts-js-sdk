/**
 * Priority Queue Implementation
 * Enterprise-grade priority-based queue with efficient operations
 */

import type {
  QueueItem,
  QueueStats,
  QueueEvents,
  QueueItemId,
  QueuePriority,
  QueueItemStatus,
  InternalQueueStats,
  // createQueueItemId
} from './types';

// Priority levels mapped to numeric values for sorting
const PRIORITY_VALUES: Record<QueuePriority, number> = {
  critical: 1000,
  high: 750,
  normal: 500,
  low: 250,
};

export interface PriorityQueueConfig {
  maxSize: number;
  enableMetrics: boolean;
  enableEvents: boolean;
}

export class PriorityQueue {
  private items: Map<QueueItemId, QueueItem> = new Map();

  private priorityIndex: Map<QueuePriority, Set<QueueItemId>> = new Map();

  private statusIndex: Map<QueueItemStatus, Set<QueueItemId>> = new Map();

  private resourceIndex: Map<string, Set<QueueItemId>> = new Map();

  private metrics: InternalQueueStats;

  private config: PriorityQueueConfig;

  private eventHandlers: Map<keyof QueueEvents, Set<Function>> = new Map();

  constructor(config: Partial<PriorityQueueConfig> = {}) {
    this.config = {
      maxSize: 10000,
      enableMetrics: true,
      enableEvents: true,
      ...config,
    };

    this.metrics = this.initializeMetrics();
    this.initializeIndexes();
  }

  private initializeMetrics(): InternalQueueStats {
    return {
      totalItems: 0,
      pendingItems: 0,
      processingItems: 0,
      completedItems: 0,
      failedItems: 0,
      deadItems: 0,
      averageProcessingTime: 0,
      successRate: 0,
      lastProcessedAt: null,
      throughputPerMinute: 0,
      priorityDistribution: {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0,
      },
      resourceDistribution: {
        receipts: 0,
        cashiers: 0,
        merchants: 0,
        'cash-registers': 0,
        'point-of-sales': 0,
        pems: 0,
      },
    };
  }

  private initializeIndexes(): void {
    // Initialize priority index
    Object.keys(PRIORITY_VALUES).forEach(priority => {
      this.priorityIndex.set(priority as QueuePriority, new Set());
    });

    // Initialize status index
    const statuses: QueueItemStatus[] = ['pending', 'processing', 'completed', 'failed', 'retry', 'dead'];
    statuses.forEach(status => {
      this.statusIndex.set(status, new Set());
    });
  }

  /**
   * Add item to the queue
   */
  enqueue(item: QueueItem): boolean {
    if (this.items.size >= this.config.maxSize) {
      this.emit('queue:backpressure', {
        queueSize: this.items.size,
        threshold: this.config.maxSize,
      });
      return false;
    }

    // Add to main storage
    this.items.set(item.id, item);

    // Update indexes
    this.addToIndex(item);

    // Update metrics
    this.updateMetricsOnAdd(item);

    // Emit event
    this.emit('item:added', { item });

    return true;
  }

  /**
   * Get next highest priority item
   */
  dequeue(): QueueItem | null {
    const item = this.peek();
    if (item) {
      this.remove(item.id);
    }
    return item;
  }

  /**
   * Peek at next highest priority item without removing
   */
  peek(): QueueItem | null {
    // Check critical priority first
    for (const priority of ['critical', 'high', 'normal', 'low'] as QueuePriority[]) {
      const prioritySet = this.priorityIndex.get(priority);
      if (prioritySet && prioritySet.size > 0) {
        // Get pending items from this priority level
        for (const itemId of prioritySet) {
          const item = this.items.get(itemId);
          if (item && item.status === 'pending') {
            // Check if item is ready to be processed (scheduled time)
            if (!item.scheduledAt || item.scheduledAt <= Date.now()) {
              return item;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Get multiple items by priority and status
   */
  dequeueMany(count: number, priority?: QueuePriority, status: QueueItemStatus = 'pending'): QueueItem[] {
    const items: QueueItem[] = [];
    const now = Date.now();

    const priorities = priority ? [priority] : ['critical', 'high', 'normal', 'low'] as QueuePriority[];

    for (const pri of priorities) {
      if (items.length >= count) {break;}

      const prioritySet = this.priorityIndex.get(pri);
      if (!prioritySet) {continue;}

      for (const itemId of prioritySet) {
        if (items.length >= count) {break;}

        const item = this.items.get(itemId);
        if (item &&
            item.status === status &&
            (!item.scheduledAt || item.scheduledAt <= now)) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Update item status and properties
   */
  updateItem(id: QueueItemId, updates: Partial<QueueItem>): boolean {
    const item = this.items.get(id);
    if (!item) {return false;}

    // Remove from old indexes
    this.removeFromIndex(item);

    // Update item
    const updatedItem: QueueItem = {
      ...item,
      ...updates,
      updatedAt: Date.now(),
    };

    this.items.set(id, updatedItem);

    // Add to new indexes
    this.addToIndex(updatedItem);

    // Update metrics
    this.updateMetricsOnUpdate(item, updatedItem);

    // Emit events based on status change
    if (item.status !== updatedItem.status) {
      this.emitStatusChangeEvent(updatedItem);
    }

    return true;
  }

  /**
   * Remove item from queue
   */
  remove(id: QueueItemId): boolean {
    const item = this.items.get(id);
    if (!item) {return false;}

    // Remove from main storage
    this.items.delete(id);

    // Remove from indexes
    this.removeFromIndex(item);

    // Update metrics
    this.updateMetricsOnRemove(item);

    return true;
  }

  /**
   * Get item by ID
   */
  get(id: QueueItemId): QueueItem | null {
    return this.items.get(id) || null;
  }

  /**
   * Check if queue contains item
   */
  has(id: QueueItemId): boolean {
    return this.items.has(id);
  }

  /**
   * Get items by status
   */
  getByStatus(status: QueueItemStatus): QueueItem[] {
    const statusSet = this.statusIndex.get(status);
    if (!statusSet) {return [];}

    return Array.from(statusSet)
      .map(id => this.items.get(id))
      .filter((item): item is QueueItem => item !== undefined);
  }

  /**
   * Get items by priority
   */
  getByPriority(priority: QueuePriority): QueueItem[] {
    const prioritySet = this.priorityIndex.get(priority);
    if (!prioritySet) {return [];}

    return Array.from(prioritySet)
      .map(id => this.items.get(id))
      .filter((item): item is QueueItem => item !== undefined);
  }

  /**
   * Get items by resource
   */
  getByResource(resource: string): QueueItem[] {
    const resourceSet = this.resourceIndex.get(resource);
    if (!resourceSet) {return [];}

    return Array.from(resourceSet)
      .map(id => this.items.get(id))
      .filter((item): item is QueueItem => item !== undefined);
  }

  /**
   * Get items that are ready to process (past scheduled time)
   */
  getReadyItems(limit?: number): QueueItem[] {
    const now = Date.now();
    const readyItems: QueueItem[] = [];

    for (const priority of ['critical', 'high', 'normal', 'low'] as QueuePriority[]) {
      if (limit && readyItems.length >= limit) {break;}

      const items = this.getByPriority(priority);
      for (const item of items) {
        if (limit && readyItems.length >= limit) {break;}

        if (item.status === 'pending' &&
            (!item.scheduledAt || item.scheduledAt <= now)) {
          readyItems.push(item);
        }
      }
    }

    return readyItems;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
    this.priorityIndex.forEach(set => set.clear());
    this.statusIndex.forEach(set => set.clear());
    this.resourceIndex.clear();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.items.size;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.size === 0;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.metrics };
  }

  /**
   * Get all items as array
   */
  toArray(): QueueItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Event subscription
   */
  on<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void {
    if (!this.config.enableEvents) {return;}

    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Event unsubscription
   */
  off<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event
   */
  private emit<K extends keyof QueueEvents>(event: K, data: QueueEvents[K]): void {
    if (!this.config.enableEvents) {return;}

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in queue event handler for ${event}:`, error);
        }
      });
    }
  }

  // Private helper methods

  private addToIndex(item: QueueItem): void {
    // Add to priority index
    const prioritySet = this.priorityIndex.get(item.priority);
    if (prioritySet) {
      prioritySet.add(item.id);
    }

    // Add to status index
    const statusSet = this.statusIndex.get(item.status);
    if (statusSet) {
      statusSet.add(item.id);
    }

    // Add to resource index
    if (!this.resourceIndex.has(item.resource)) {
      this.resourceIndex.set(item.resource, new Set());
    }
    this.resourceIndex.get(item.resource)!.add(item.id);
  }

  private removeFromIndex(item: QueueItem): void {
    // Remove from priority index
    const prioritySet = this.priorityIndex.get(item.priority);
    if (prioritySet) {
      prioritySet.delete(item.id);
    }

    // Remove from status index
    const statusSet = this.statusIndex.get(item.status);
    if (statusSet) {
      statusSet.delete(item.id);
    }

    // Remove from resource index
    const resourceSet = this.resourceIndex.get(item.resource);
    if (resourceSet) {
      resourceSet.delete(item.id);
      if (resourceSet.size === 0) {
        this.resourceIndex.delete(item.resource);
      }
    }
  }

  private updateMetricsOnAdd(item: QueueItem): void {
    if (!this.config.enableMetrics) {return;}

    this.metrics.totalItems++;
    this.metrics.pendingItems++;
    this.metrics.priorityDistribution[item.priority]++;
    this.metrics.resourceDistribution[item.resource]++;
  }

  private updateMetricsOnUpdate(oldItem: QueueItem, newItem: QueueItem): void {
    if (!this.config.enableMetrics) {return;}

    // Update status counts
    if (oldItem.status !== newItem.status) {
      this.decrementStatusCount(oldItem.status);
      this.incrementStatusCount(newItem.status);

      if (newItem.status === 'completed') {
        this.metrics.lastProcessedAt = Date.now();
        this.updateSuccessRate();
      }
    }
  }

  private updateMetricsOnRemove(item: QueueItem): void {
    if (!this.config.enableMetrics) {return;}

    this.metrics.totalItems--;
    this.decrementStatusCount(item.status);
    this.metrics.priorityDistribution[item.priority]--;
    this.metrics.resourceDistribution[item.resource]--;
  }

  private incrementStatusCount(status: QueueItemStatus): void {
    switch (status) {
      case 'pending':
        this.metrics.pendingItems++;
        break;
      case 'processing':
        this.metrics.processingItems++;
        break;
      case 'completed':
        this.metrics.completedItems++;
        break;
      case 'failed':
        this.metrics.failedItems++;
        break;
      case 'dead':
        this.metrics.deadItems++;
        break;
    }
  }

  private decrementStatusCount(status: QueueItemStatus): void {
    switch (status) {
      case 'pending':
        this.metrics.pendingItems = Math.max(0, this.metrics.pendingItems - 1);
        break;
      case 'processing':
        this.metrics.processingItems = Math.max(0, this.metrics.processingItems - 1);
        break;
      case 'completed':
        this.metrics.completedItems = Math.max(0, this.metrics.completedItems - 1);
        break;
      case 'failed':
        this.metrics.failedItems = Math.max(0, this.metrics.failedItems - 1);
        break;
      case 'dead':
        this.metrics.deadItems = Math.max(0, this.metrics.deadItems - 1);
        break;
    }
  }

  private updateSuccessRate(): void {
    const total = this.metrics.completedItems + this.metrics.failedItems + this.metrics.deadItems;
    if (total > 0) {
      this.metrics.successRate = (this.metrics.completedItems / total) * 100;
    }
  }

  private emitStatusChangeEvent(item: QueueItem): void {
    switch (item.status) {
      case 'processing':
        this.emit('item:processing', { item });
        break;
      case 'completed':
        this.emit('item:completed', { item });
        break;
      case 'failed':
        this.emit('item:failed', {
          item,
          error: item.errorHistory?.[item.errorHistory.length - 1] || {
            timestamp: Date.now(),
            error: 'Unknown error',
            retryable: false,
          },
        });
        break;
      case 'retry':
        this.emit('item:retry', { item, attempt: item.retryCount });
        break;
      case 'dead':
        this.emit('item:dead', { item });
        break;
    }
  }
}
