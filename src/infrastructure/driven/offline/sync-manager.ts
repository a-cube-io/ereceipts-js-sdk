import { Subject, Subscription } from 'rxjs';
import { filter, pairwise, startWith, takeUntil } from 'rxjs/operators';

import { INetworkPort as INetworkMonitor } from '@/application/ports/driven';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  BatchSyncResult,
  QueueConfig,
  QueueEvents,
  QueuedOperation,
  SyncResult,
  SyncStatus,
} from '@/domain/entities/offline.entity';

import { OperationQueue } from './queue';

export class SyncManager {
  private isOnline = true;
  private readonly destroy$ = new Subject<void>();
  private networkSubscription?: Subscription;

  constructor(
    private queue: OperationQueue,
    private httpPort: IHttpPort,
    private networkMonitor: INetworkMonitor,
    private config: QueueConfig,
    private events: QueueEvents = {}
  ) {
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    // Subscribe to online$ to track current state
    this.networkSubscription = this.networkMonitor.online$
      .pipe(
        startWith(true), // Assume online initially
        pairwise(),
        filter(([wasOnline, isNowOnline]) => !wasOnline && isNowOnline),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Offline → Online transition detected
        this.syncPendingOperations();
      });

    // Track current online state
    this.networkMonitor.online$.pipe(takeUntil(this.destroy$)).subscribe((online) => {
      this.isOnline = online;
    });
  }

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
            const syncResult: SyncResult = {
              operation,
              success: false,
              error: result.reason?.message || 'Unknown error',
            };

            results.push(syncResult);
            failureCount++;
            this.events.onOperationFailed?.(syncResult);

            this.queue.updateOperation(operation.id, {
              status: 'failed',
              error: syncResult.error,
            });
          }
        });

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

  private async processOperation(operation: QueuedOperation): Promise<SyncResult> {
    await this.queue.updateOperation(operation.id, { status: 'processing' });

    try {
      const response = await this.executeOperation(operation);

      await this.queue.updateOperation(operation.id, { status: 'completed' });

      return { operation, success: true, response };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (operation.retryCount < operation.maxRetries && this.isRetryableError(error)) {
        const delay = this.calculateRetryDelay(operation.retryCount);

        await this.queue.updateOperation(operation.id, {
          status: 'pending',
          retryCount: operation.retryCount + 1,
          error: errorMessage,
        });

        setTimeout(() => {
          if (this.isOnline && !this.queue.isCurrentlyProcessing()) {
            this.syncPendingOperations();
          }
        }, delay);

        return { operation, success: false, error: `Retrying: ${errorMessage}` };
      } else {
        await this.queue.updateOperation(operation.id, {
          status: 'failed',
          error: errorMessage,
        });

        return { operation, success: false, error: errorMessage };
      }
    }
  }

  private async executeOperation(operation: QueuedOperation): Promise<unknown> {
    const { method, endpoint, data, headers } = operation;
    const config = headers ? { headers } : undefined;

    switch (method) {
      case 'GET':
        return (await this.httpPort.get(endpoint, config)).data;
      case 'POST':
        return (await this.httpPort.post(endpoint, data, config)).data;
      case 'PUT':
        return (await this.httpPort.put(endpoint, data, config)).data;
      case 'PATCH':
        return (await this.httpPort.patch(endpoint, data, config)).data;
      case 'DELETE':
        return (await this.httpPort.delete(endpoint, config)).data;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  private isRetryableError(error: unknown): boolean {
    const errorObj = error as { code?: string; statusCode?: number };

    if (errorObj.code === 'NETWORK_ERROR') return true;
    if (errorObj.statusCode && errorObj.statusCode >= 500) return true;
    if (errorObj.statusCode === 429) return true;

    const errorMessage = (error as Error)?.message;
    if (errorObj.code === 'ECONNABORTED' || errorMessage?.includes('timeout')) return true;

    return false;
  }

  private calculateRetryDelay(retryCount: number): number {
    const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, retryCount);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  async triggerSync(): Promise<BatchSyncResult | null> {
    if (!this.isOnline) return null;

    if (this.queue.isEmpty()) {
      return { totalOperations: 0, successCount: 0, failureCount: 0, results: [] };
    }

    return await this.syncPendingOperations();
  }

  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isProcessing: this.queue.isCurrentlyProcessing(),
      queueStats: this.queue.getStats(),
    };
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.networkSubscription?.unsubscribe();
  }
}
