export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export type ResourceType =
  | 'receipt'
  | 'cashier'
  | 'point-of-sale'
  | 'cash-register'
  | 'merchant'
  | 'pem';

export type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  resource: ResourceType;
  endpoint: string;
  method: HttpMethod;
  data?: unknown;
  headers?: Record<string, string>;
  status: OperationStatus;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  priority: number;
}

export interface SyncResult {
  operation: QueuedOperation;
  success: boolean;
  error?: string;
  response?: unknown;
}

export interface BatchSyncResult {
  totalOperations: number;
  successCount: number;
  failureCount: number;
  results: SyncResult[];
}

export interface QueueConfig {
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
  maxQueueSize: number;
  batchSize: number;
  syncInterval: number;
}

export interface QueueEvents {
  onOperationAdded?: (operation: QueuedOperation) => void;
  onOperationCompleted?: (result: SyncResult) => void;
  onOperationFailed?: (result: SyncResult) => void;
  onBatchSyncCompleted?: (result: BatchSyncResult) => void;
  onQueueEmpty?: () => void;
  onError?: (error: Error) => void;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isProcessing: boolean;
  queueStats: QueueStats;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  backoffMultiplier: 2,
  maxQueueSize: 1000,
  batchSize: 10,
  syncInterval: 30000,
};
