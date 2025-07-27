/**
 * Retry Manager with Circuit Breaker
 * Enterprise-grade retry logic with exponential backoff and intelligent failure handling
 */

import type { 
  QueueItem, 
  QueueItemId, 
  // RetryStrategy, 
  RetryPolicy,
  CircuitBreakerState,
  ResourceType,
  QueueEvents 
} from './types';

export interface RetryManagerConfig {
  defaultRetryPolicy: RetryPolicy;
  circuitBreakerConfig: CircuitBreakerConfig;
  maxConcurrentRetries: number;
  retryQueueSize: number;
  enableJitter: boolean;
  enableMetrics: boolean;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitoringWindow: number;
}

export interface RetryAttempt {
  itemId: QueueItemId;
  attempt: number;
  scheduledAt: number;
  lastError?: string;
  backoffDelay: number;
  item?: QueueItem;
  retryCount?: number;
}

export interface RetryMetrics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryDelay: number;
  circuitBreakerTrips: number;
  retrySuccessRate: number;
  resourceMetrics: Record<ResourceType, {
    retries: number;
    successes: number;
    failures: number;
    averageDelay: number;
  }>;
}

export class RetryManager {
  private config: RetryManagerConfig;
  private circuitBreakers: Map<ResourceType, CircuitBreakerState> = new Map();
  private activeRetries: Map<QueueItemId, RetryAttempt> = new Map();
  private retryTimers: Map<QueueItemId, NodeJS.Timeout> = new Map();
  private metrics: RetryMetrics;
  private eventHandlers: Map<keyof QueueEvents, Set<Function>> = new Map();

  constructor(config: Partial<RetryManagerConfig> = {}) {
    this.config = {
      defaultRetryPolicy: this.getDefaultRetryPolicy(),
      circuitBreakerConfig: {
        enabled: true,
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        monitoringWindow: 300000,
      },
      maxConcurrentRetries: 10,
      retryQueueSize: 1000,
      enableJitter: true,
      enableMetrics: true,
      ...config,
    };

    this.metrics = this.initializeMetrics();
    this.initializeCircuitBreakers();
  }

  /**
   * Schedule retry for a failed item
   */
  scheduleRetry(item: QueueItem, error: string): boolean {
    // Check if item has exceeded max retries
    if (item.retryCount >= item.maxRetries) {
      this.emit('item:max-retries-exceeded', { item });
      return false;
    }

    // Check circuit breaker
    if (!this.isCircuitClosed(item.resource)) {
      this.emit('item:circuit-open', { item, resource: item.resource });
      return false;
    }

    // Check retry queue capacity
    if (this.activeRetries.size >= this.config.retryQueueSize) {
      this.emit('retry:queue-full', { 
        queueSize: this.activeRetries.size, 
        maxSize: this.config.retryQueueSize 
      });
      return false;
    }

    const retryPolicy = this.getRetryPolicy(item);
    const nextAttempt = item.retryCount + 1;
    const delay = this.calculateDelay(nextAttempt, retryPolicy);

    const retryAttempt: RetryAttempt = {
      itemId: item.id,
      attempt: nextAttempt,
      scheduledAt: Date.now() + delay,
      lastError: error,
      backoffDelay: delay,
    };

    this.activeRetries.set(item.id, retryAttempt);

    // Schedule the retry
    const timer = setTimeout(() => {
      this.executeRetry(item.id);
    }, delay);

    this.retryTimers.set(item.id, timer);

    this.updateMetricsOnRetryScheduled(item.resource, delay);
    this.emit('item:retry-scheduled', { item, delay, attempt: nextAttempt });

    return true;
  }

  /**
   * Cancel scheduled retry
   */
  cancelRetry(itemId: QueueItemId): boolean {
    const timer = this.retryTimers.get(itemId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(itemId);
    }

    const retryAttempt = this.activeRetries.get(itemId);
    if (retryAttempt) {
      this.activeRetries.delete(itemId);
      // Only emit if we have the item data, otherwise just log
      if (retryAttempt.item) {
        this.emit('item:retry-cancelled', { item: retryAttempt.item });
      }
      return true;
    }

    return false;
  }

  /**
   * Record successful operation (for circuit breaker)
   */
  recordSuccess(resource: ResourceType): void {
    const circuitBreaker = this.circuitBreakers.get(resource);
    if (!circuitBreaker) return;

    let updatedState: CircuitBreakerState = {
      ...circuitBreaker,
      successCount: circuitBreaker.successCount + 1,
      lastFailureTime: null,
    };

    // Check if we should close the circuit
    if (circuitBreaker.state === 'half-open' && 
        updatedState.successCount >= this.config.circuitBreakerConfig.successThreshold) {
      updatedState = {
        ...updatedState,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
      };
      this.emit('circuit:closed', { resource });
    }

    this.circuitBreakers.set(resource, updatedState);
    this.updateMetricsOnSuccess(resource);
  }

  /**
   * Record failed operation (for circuit breaker)
   */
  recordFailure(resource: ResourceType, _error: string): void {
    const circuitBreaker = this.circuitBreakers.get(resource);
    if (!circuitBreaker) return;

    const now = Date.now();
    let updatedState: CircuitBreakerState = {
      ...circuitBreaker,
      failureCount: circuitBreaker.failureCount + 1,
      lastFailureTime: now,
      successCount: 0, // Reset success count on failure
    };

    // Check if we should open the circuit
    if (circuitBreaker.state === 'closed' && 
        updatedState.failureCount >= this.config.circuitBreakerConfig.failureThreshold) {
      updatedState = {
        ...updatedState,
        state: 'open',
        nextRetryTime: now + this.config.circuitBreakerConfig.timeout,
      };
      this.emit('circuit:opened', { resource, errorRate: updatedState.failureCount });
      this.metrics.circuitBreakerTrips++;
    }

    this.circuitBreakers.set(resource, updatedState);
    this.updateMetricsOnFailure(resource);
  }

  /**
   * Check if circuit is closed for a resource
   */
  isCircuitClosed(resource: ResourceType): boolean {
    if (!this.config.circuitBreakerConfig.enabled) return true;

    const circuitBreaker = this.circuitBreakers.get(resource);
    if (!circuitBreaker) return true;

    const now = Date.now();

    switch (circuitBreaker.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if we should move to half-open
        if (circuitBreaker.nextRetryTime && now >= circuitBreaker.nextRetryTime) {
          const updatedState: CircuitBreakerState = {
            ...circuitBreaker,
            state: 'half-open',
            successCount: 0,
          };
          this.circuitBreakers.set(resource, updatedState);
          this.emit('circuit:half-open', { resource });
          return true;
        }
        return false;

      case 'half-open':
        return true;

      default:
        return true;
    }
  }

  /**
   * Get circuit breaker state for a resource
   */
  getCircuitState(resource: ResourceType): CircuitBreakerState | null {
    return this.circuitBreakers.get(resource) || null;
  }

  /**
   * Get all active retries
   */
  getActiveRetries(): RetryAttempt[] {
    return Array.from(this.activeRetries.values());
  }

  /**
   * Get retry metrics
   */
  getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all retries
   */
  clearRetries(): void {
    // Cancel all timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }

    this.retryTimers.clear();
    this.activeRetries.clear();
  }

  /**
   * Reset circuit breaker for a resource
   */
  resetCircuitBreaker(resource: ResourceType): void {
    const initialState = this.createInitialCircuitBreakerState();
    this.circuitBreakers.set(resource, initialState);
    this.emit('circuit:reset', { resource });
  }

  /**
   * Get retry policy for an item
   */
  getRetryPolicy(_item: QueueItem): RetryPolicy {
    // Could be customized per resource or operation type
    return this.config.defaultRetryPolicy;
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
          console.error(`Error in retry manager event handler for ${event}:`, error);
        }
      });
    }
  }

  // Private methods

  private async executeRetry(itemId: QueueItemId): Promise<void> {
    const retryAttempt = this.activeRetries.get(itemId);
    if (!retryAttempt) return;

    // Clean up retry state
    this.activeRetries.delete(itemId);
    this.retryTimers.delete(itemId);

    // Emit retry event - the queue processor should handle the actual retry
    this.emit('item:retry-ready', { itemId, attempt: retryAttempt.attempt });
  }

  private calculateDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.strategy) {
      case 'exponential':
        delay = Math.min(
          policy.baseDelay * Math.pow(policy.backoffFactor, attempt - 1),
          policy.maxDelay
        );
        break;

      case 'linear':
        delay = Math.min(
          policy.baseDelay * attempt,
          policy.maxDelay
        );
        break;

      case 'custom':
        // Custom logic would be implemented here
        delay = policy.baseDelay;
        break;

      default:
        delay = policy.baseDelay;
    }

    // Add jitter to prevent thundering herd
    if (this.config.enableJitter && policy.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random(); // Up to 10% jitter
      delay += jitter;
    }

    return Math.floor(delay);
  }

  private getDefaultRetryPolicy(): RetryPolicy {
    return {
      strategy: 'exponential',
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitterEnabled: true,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT',
        'SERVER_ERROR',
        'RATE_LIMITED',
        'TEMPORARY_FAILURE',
      ],
      nonRetryableErrors: [
        'AUTHENTICATION_ERROR',
        'AUTHORIZATION_ERROR',
        'VALIDATION_ERROR',
        'NOT_FOUND',
        'CONFLICT',
      ],
    };
  }

  private initializeMetrics(): RetryMetrics {
    return {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0,
      circuitBreakerTrips: 0,
      retrySuccessRate: 0,
      resourceMetrics: {
        receipts: { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
        cashiers: { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
        merchants: { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
        'cash-registers': { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
        'point-of-sales': { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
        pems: { retries: 0, successes: 0, failures: 0, averageDelay: 0 },
      },
    };
  }

  private initializeCircuitBreakers(): void {
    const resources: ResourceType[] = [
      'receipts', 'cashiers', 'merchants', 
      'cash-registers', 'point-of-sales', 'pems'
    ];

    for (const resource of resources) {
      this.circuitBreakers.set(resource, this.createInitialCircuitBreakerState());
    }
  }

  private createInitialCircuitBreakerState(): CircuitBreakerState {
    return {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      nextRetryTime: null,
      threshold: this.config.circuitBreakerConfig.failureThreshold,
      timeout: this.config.circuitBreakerConfig.timeout,
    };
  }

  private updateMetricsOnRetryScheduled(resource: ResourceType, delay: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalRetries++;
    this.metrics.resourceMetrics[resource].retries++;

    // Update average delay
    const totalDelay = this.metrics.averageRetryDelay * (this.metrics.totalRetries - 1) + delay;
    this.metrics.averageRetryDelay = totalDelay / this.metrics.totalRetries;

    // Update resource average delay
    const resourceMetric = this.metrics.resourceMetrics[resource];
    const resourceTotalDelay = resourceMetric.averageDelay * (resourceMetric.retries - 1) + delay;
    resourceMetric.averageDelay = resourceTotalDelay / resourceMetric.retries;
  }

  private updateMetricsOnSuccess(resource: ResourceType): void {
    if (!this.config.enableMetrics) return;

    this.metrics.successfulRetries++;
    this.metrics.resourceMetrics[resource].successes++;
    this.updateRetrySuccessRate();
  }

  private updateMetricsOnFailure(resource: ResourceType): void {
    if (!this.config.enableMetrics) return;

    this.metrics.failedRetries++;
    this.metrics.resourceMetrics[resource].failures++;
    this.updateRetrySuccessRate();
  }

  private updateRetrySuccessRate(): void {
    const total = this.metrics.successfulRetries + this.metrics.failedRetries;
    if (total > 0) {
      this.metrics.retrySuccessRate = (this.metrics.successfulRetries / total) * 100;
    }
  }

  // Cleanup
  destroy(): void {
    this.clearRetries();
    this.circuitBreakers.clear();
    this.eventHandlers.clear();
  }
}