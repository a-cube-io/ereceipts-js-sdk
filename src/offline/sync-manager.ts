import { INetworkMonitor } from '../adapters';
import { HttpClient } from '../core/api';
import { OperationQueue } from './queue';
import { BatchSyncResult, QueueConfig, QueueEvents, QueuedOperation, SyncResult } from './types';

/**
 * Sync manager for handling offline operations
 */
export class SyncManager {
  private isOnline = true;
  private networkUnsubscribe?: () => void;
  private syncTimeout?: NodeJS.Timeout;

  constructor(
    private queue: OperationQueue,
    private httpClient: HttpClient,
    private networkMonitor: INetworkMonitor,
    private config: QueueConfig,
    private events: QueueEvents = {}
  ) {
    this.isOnline = networkMonitor.isOnline();
    this.setupNetworkMonitoring();
  }

  /**
   * Setup network monitoring and auto-sync
   */
  private setupNetworkMonitoring(): void {
    this.networkUnsubscribe = this.networkMonitor.onStatusChange((online) => {
      const wasOffline = !this.isOnline;
      this.isOnline = online;

      if (online && wasOffline) {
        // Back online - sync pending operations
        this.syncPendingOperations();
      }
    });
  }

  /**
   * Sync all pending operations
   */
  async syncPendingOperations(): Promise<BatchSyncResult> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    if (this.queue.isCurrentlyProcessing()) {
      throw new Error('Sync already in progress');
    }

    this.queue.setProcessing(true);

    try {
      const results: SyncResult[] = [];
      let successCount = 0;
      let failureCount = 0;

      while (!this.queue.isEmpty()) {
        const batch = this.queue.getNextBatch();
        if (batch.length === 0) break;

        // Process batch in parallel
        const batchPromises = batch.map((operation) => this.processOperation(operation));

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          const operation = batch[index];
          if (!operation) return;

          if (result.status === 'fulfilled') {
            const syncResult = result.value;
            results.push(syncResult);

            if (syncResult.success) {
              successCount++;
              this.events.onOperationCompleted?.(syncResult);
            } else {
              failureCount++;
              this.events.onOperationFailed?.(syncResult);
            }
          } else {
            // Promise rejected
            const syncResult: SyncResult = {
              operation,
              success: false,
              error: result.reason?.message || 'Unknown error',
            };

            results.push(syncResult);
            failureCount++;
            this.events.onOperationFailed?.(syncResult);

            // Update operation status
            this.queue.updateOperation(operation.id, {
              status: 'failed',
              error: syncResult.error,
            });
          }
        });

        // Add delay between batches to avoid overwhelming the server
        if (!this.queue.isEmpty()) {
          await this.delay(500);
        }
      }

      const batchResult: BatchSyncResult = {
        totalOperations: results.length,
        successCount,
        failureCount,
        results,
      };

      this.events.onBatchSyncCompleted?.(batchResult);

      if (this.queue.isEmpty()) {
        this.events.onQueueEmpty?.();
      }

      return batchResult;
    } finally {
      this.queue.setProcessing(false);
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<SyncResult> {
    // Update operation status to processing
    await this.queue.updateOperation(operation.id, {
      status: 'processing',
    });

    try {
      const response = await this.executeOperation(operation);

      // Operation successful
      await this.queue.updateOperation(operation.id, {
        status: 'completed',
      });

      return {
        operation,
        success: true,
        response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (operation.retryCount < operation.maxRetries && this.isRetryableError(error)) {
        // Schedule retry with exponential backoff
        const delay = this.calculateRetryDelay(operation.retryCount);

        await this.queue.updateOperation(operation.id, {
          status: 'pending',
          retryCount: operation.retryCount + 1,
          error: errorMessage,
        });

        // Schedule retry
        setTimeout(() => {
          if (this.isOnline && !this.queue.isCurrentlyProcessing()) {
            this.syncPendingOperations();
          }
        }, delay);

        return {
          operation,
          success: false,
          error: `Retrying: ${errorMessage}`,
        };
      } else {
        // Max retries exceeded or non-retryable error
        await this.queue.updateOperation(operation.id, {
          status: 'failed',
          error: errorMessage,
        });

        return {
          operation,
          success: false,
          error: errorMessage,
        };
      }
    }
  }

  /**
   * Execute the actual HTTP operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<unknown> {
    const { method, endpoint, data, headers } = operation;

    const config = headers ? { headers } : undefined;

    switch (method) {
      case 'GET':
        return await this.httpClient.get(endpoint, config);
      case 'POST':
        return await this.httpClient.post(endpoint, data, config);
      case 'PUT':
        return await this.httpClient.put(endpoint, data, config);
      case 'PATCH':
        return await this.httpClient.patch(endpoint, data, config);
      case 'DELETE':
        return await this.httpClient.delete(endpoint, config);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const errorObj = error as { code?: string; statusCode?: number };

    // Network errors are retryable
    if (errorObj.code === 'NETWORK_ERROR') {
      return true;
    }

    // Server errors (5xx) are retryable
    if (errorObj.statusCode && errorObj.statusCode >= 500) {
      return true;
    }

    // Rate limiting is retryable
    if (errorObj.statusCode === 429) {
      return true;
    }

    // Timeout errors are retryable
    const errorMessage = (error as Error)?.message;
    if (errorObj.code === 'ECONNABORTED' || errorMessage?.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, retryCount);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Manually trigger sync (if online)
   */
  async triggerSync(): Promise<BatchSyncResult | null> {
    if (!this.isOnline) {
      return null;
    }

    if (this.queue.isEmpty()) {
      return {
        totalOperations: 0,
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    return await this.syncPendingOperations();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isOnline: boolean;
    isProcessing: boolean;
    queueStats: ReturnType<OperationQueue['getStats']>;
  } {
    return {
      isOnline: this.isOnline,
      isProcessing: this.queue.isCurrentlyProcessing(),
      queueStats: this.queue.getStats(),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
  }
}
