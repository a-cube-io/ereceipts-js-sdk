/**
 * Enterprise Queue Types and Interfaces
 * Type-safe queue operations with branded types
 */


// Priority levels for queue operations
export type QueuePriority = 'critical' | 'high' | 'normal' | 'low';

// Operation types for queue items
export type QueueOperationType = 'create' | 'update' | 'delete' | 'batch' | 'custom';

// Conflict resolution strategies
export type ConflictResolutionStrategy = 'client-wins' | 'server-wins' | 'merge' | 'manual';

// Retry strategies
export type RetryStrategy = 'exponential' | 'linear' | 'custom';

// Queue item status
export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retry' | 'dead';

// Resource types that can be queued
export type ResourceType = 'receipts' | 'cashiers' | 'merchants' | 'cash-registers' | 'point-of-sales' | 'pems';

// Branded queue ID type
export type QueueItemId = string & { readonly __brand: 'QueueItemId' };

// Base queue item interface
export interface QueueItem {
  readonly id: QueueItemId;
  readonly priority: QueuePriority;
  readonly operation: QueueOperationType;
  readonly resource: ResourceType;
  readonly data: unknown;
  readonly status: QueueItemStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly scheduledAt?: number;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly retryStrategy: RetryStrategy;
  readonly conflictResolution: ConflictResolutionStrategy;
  readonly optimisticId?: string;
  readonly batchId?: string;
  readonly dependencies?: QueueItemId[];
  readonly metadata?: Record<string, unknown>;
  readonly errorHistory?: QueueError[];
}

// Queue error tracking
export interface QueueError {
  readonly timestamp: number;
  readonly error: string;
  readonly code?: string;
  readonly retryable: boolean;
  readonly context?: Record<string, unknown>;
}

// Batch operation interface
export interface BatchOperation {
  readonly id: string;
  readonly items: QueueItem[];
  readonly status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  readonly createdAt: number;
  readonly strategy: 'parallel' | 'sequential' | 'custom';
  readonly maxConcurrency?: number;
}

// Queue statistics
export interface QueueStats {
  readonly totalItems: number;
  readonly pendingItems: number;
  readonly processingItems: number;
  readonly completedItems: number;
  readonly failedItems: number;
  readonly deadItems: number;
  readonly averageProcessingTime: number;
  readonly successRate: number;
  readonly lastProcessedAt: number | null;
  readonly throughputPerMinute: number;
  readonly priorityDistribution: Record<QueuePriority, number>;
  readonly resourceDistribution: Record<ResourceType, number>;
}

// Mutable version for internal metrics management
export interface InternalQueueStats {
  totalItems: number;
  pendingItems: number;
  processingItems: number;
  completedItems: number;
  failedItems: number;
  deadItems: number;
  averageProcessingTime: number;
  successRate: number;
  lastProcessedAt: number | null;
  throughputPerMinute: number;
  priorityDistribution: Record<QueuePriority, number>;
  resourceDistribution: Record<ResourceType, number>;
}

// Queue configuration
export interface QueueConfig {
  readonly maxSize: number;
  readonly maxRetries: number;
  readonly defaultPriority: QueuePriority;
  readonly defaultRetryStrategy: RetryStrategy;
  readonly defaultConflictResolution: ConflictResolutionStrategy;
  readonly batchingEnabled: boolean;
  readonly batchSize: number;
  readonly batchTimeout: number;
  readonly deadLetterEnabled: boolean;
  readonly analyticsEnabled: boolean;
  readonly persistToDisk: boolean;
  readonly circuitBreakerEnabled: boolean;
  readonly circuitBreakerThreshold: number;
  readonly deduplicationEnabled: boolean;
  readonly deduplicationWindow: number;
}

// Queue event types
export interface QueueEvents {
  'item:added': { item: QueueItem };
  'item:processing': { item: QueueItem };
  'item:completed': { item: QueueItem; result?: unknown };
  'item:failed': { item: QueueItem; error: QueueError };
  'item:retry': { item: QueueItem; attempt: number };
  'item:dead': { item: QueueItem };
  'item:max-retries-exceeded': { item: QueueItem };
  'item:circuit-open': { item: QueueItem; resource: ResourceType };
  'item:retry-scheduled': { item: QueueItem; attempt: number; delay: number };
  'item:retry-cancelled': { item: QueueItem };
  'item:retry-ready': { itemId: QueueItemId; attempt: number };
  'batch:created': { batch: BatchOperation };
  'batch:completed': { batch: BatchOperation };
  'batch:failed': { batch: BatchOperation };
  'queue:initialized': {};
  'queue:drained': { stats: QueueStats };
  'queue:backpressure': { queueSize: number; threshold: number };
  'queue:paused': { reason?: string };
  'queue:resumed': { reason?: string };
  'circuit:opened': { resource: ResourceType; errorRate: number };
  'circuit:closed': { resource: ResourceType };
  'circuit:half-open': { resource: ResourceType };
  'circuit:reset': { resource: ResourceType };
  'retry:queue-full': { queueSize: number; maxSize: number };
}

// Retry policy configuration
export interface RetryPolicy {
  readonly strategy: RetryStrategy;
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffFactor: number;
  readonly jitterEnabled: boolean;
  readonly retryableErrors?: string[];
  readonly nonRetryableErrors?: string[];
}

// Circuit breaker state
export interface CircuitBreakerState {
  readonly state: 'closed' | 'open' | 'half-open';
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureTime: number | null;
  readonly nextRetryTime: number | null;
  readonly threshold: number;
  readonly timeout: number;
}

// Deduplication key generator
export type DeduplicationKeyGenerator = (item: Omit<QueueItem, 'id' | 'createdAt' | 'updatedAt'>) => string;

// Queue processor function type
export type QueueProcessor<T = unknown> = (item: QueueItem) => Promise<T>;

// Conflict resolver function type
export type ConflictResolver<T = unknown> = (
  localItem: QueueItem,
  serverItem: T,
  context: { resource: ResourceType; operation: QueueOperationType }
) => Promise<T>;

// Utility functions for creating branded types
export const createQueueItemId = (id: string): QueueItemId => id as QueueItemId;

// Type guards
export const isQueueItemId = (value: unknown): value is QueueItemId =>
  typeof value === 'string' && value.length > 0;

export const isValidPriority = (value: unknown): value is QueuePriority =>
  typeof value === 'string' && ['critical', 'high', 'normal', 'low'].includes(value);

export const isValidOperation = (value: unknown): value is QueueOperationType =>
  typeof value === 'string' && ['create', 'update', 'delete', 'batch', 'custom'].includes(value);

export const isValidResource = (value: unknown): value is ResourceType =>
  typeof value === 'string' &&
  ['receipts', 'cashiers', 'merchants', 'cash-registers', 'point-of-sales', 'pems'].includes(value);
