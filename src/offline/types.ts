/**
 * Offline queue types and interfaces
 */

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type ResourceType = 'receipt' | 'cashier' | 'point-of-sale' | 'cash-register' | 'merchant' | 'pem';
export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Queued operation data structure
 */
export interface QueuedOperation {
  id: string;
  type: OperationType;
  resource: ResourceType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  status: OperationStatus;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  priority: number; // Higher number = higher priority
}

/**
 * Sync result for a single operation
 */
export interface SyncResult {
  operation: QueuedOperation;
  success: boolean;
  error?: string;
  response?: any;
}

/**
 * Batch sync result
 */
export interface BatchSyncResult {
  totalOperations: number;
  successCount: number;
  failureCount: number;
  results: SyncResult[];
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxRetries: number;
  retryDelay: number; // Base delay in ms
  maxRetryDelay: number; // Maximum delay in ms
  backoffMultiplier: number; // Exponential backoff multiplier
  maxQueueSize: number;
  batchSize: number; // Number of operations to process at once
  syncInterval: number; // Auto-sync interval in ms (0 to disable)
}

/**
 * Queue events
 */
export interface QueueEvents {
  onOperationAdded?: (operation: QueuedOperation) => void;
  onOperationCompleted?: (result: SyncResult) => void;
  onOperationFailed?: (result: SyncResult) => void;
  onBatchSyncCompleted?: (result: BatchSyncResult) => void;
  onQueueEmpty?: () => void;
  onError?: (error: Error) => void;
}