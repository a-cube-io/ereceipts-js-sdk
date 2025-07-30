/**
 * Offline Integration for PWA
 * Bridges the PWA Background Sync with the existing offline queue system
 *
 * Features:
 * - Automatic queue migration
 * - Unified offline handling
 * - Receipt-specific sync strategies
 * - Italian tax compliance preservation
 */

import type { HttpClient } from '@/http/client';
import type { EnterpriseQueueManager } from '@/storage/queue/queue-manager';

import { EventEmitter } from 'eventemitter3';

import { type SyncOperation, BackgroundSyncManager, type BackgroundSyncConfig } from './background-sync';

/**
 * Receipt sync priority determination
 */
export function getReceiptSyncPriority(receipt: any): 'critical' | 'high' | 'normal' | 'low' {
  // Critical: Fiscal receipts that must be transmitted
  if (receipt.fiscal_required || receipt.lottery_enabled) {
    return 'critical';
  }

  // High: Recent receipts or high-value transactions
  const isRecent = new Date(receipt.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
  const isHighValue = parseFloat(receipt.amount) > 1000;

  if (isRecent || isHighValue) {
    return 'high';
  }

  // Normal: Standard receipts
  if (receipt.status === 'pending' || receipt.status === 'draft') {
    return 'normal';
  }

  // Low: Updates to existing receipts
  return 'low';
}

/**
 * Offline integration configuration
 */
export interface OfflineIntegrationConfig {
  /** Enable automatic queue migration */
  enableMigration?: boolean;

  /** Receipt-specific sync settings */
  receiptSync?: {
    /** Batch size for receipt sync */
    batchSize?: number;

    /** Priority receipts with lottery */
    prioritizeLottery?: boolean;

    /** Fiscal compliance timeout */
    fiscalTimeout?: number;
  };

  /** Conflict resolution for receipts */
  conflictResolution?: {
    /** Preserve fiscal data */
    preserveFiscalData?: boolean;

    /** Auto-resolve duplicates */
    autoResolveDuplicates?: boolean;
  };
}

/**
 * Integration events
 */
export interface OfflineIntegrationEvents {
  'migration:started': { totalOperations: number };
  'migration:progress': { completed: number; total: number };
  'migration:completed': { migratedCount: number };
  'receipt:queued': { receipt: any; priority: string };
  'receipt:synced': { receipt: any; response: any };
  'fiscal:timeout': { receipt: any; timeout: number };
}

const DEFAULT_CONFIG: Required<OfflineIntegrationConfig> = {
  enableMigration: true,
  receiptSync: {
    batchSize: 20,
    prioritizeLottery: true,
    fiscalTimeout: 72 * 60 * 60 * 1000, // 72 hours
  },
  conflictResolution: {
    preserveFiscalData: true,
    autoResolveDuplicates: true,
  },
};

/**
 * PWA Offline Integration
 * Bridges PWA background sync with enterprise queue system
 */
export class PWAOfflineIntegration extends EventEmitter<OfflineIntegrationEvents> {
  private syncManager: BackgroundSyncManager;

  private queueManager?: EnterpriseQueueManager;

  private config: Required<OfflineIntegrationConfig>;

  private migrationInProgress = false;

  constructor(
    httpClient: HttpClient,
    config: OfflineIntegrationConfig = {},
    backgroundSyncConfig?: BackgroundSyncConfig,
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize background sync with receipt-optimized settings
    const syncConfig: BackgroundSyncConfig = {
      ...backgroundSyncConfig,
      defaultConflictStrategy: this.config.conflictResolution.preserveFiscalData
        ? 'merge'
        : 'server-wins',
    };
    if (this.config.receiptSync.batchSize !== undefined) {
      syncConfig.batchSize = this.config.receiptSync.batchSize;
    }
    this.syncManager = new BackgroundSyncManager(httpClient, syncConfig);

    this.setupEventForwarding();
  }

  /**
   * Set the enterprise queue manager for migration
   */
  setQueueManager(queueManager: EnterpriseQueueManager): void {
    this.queueManager = queueManager;

    if (this.config.enableMigration && !this.migrationInProgress) {
      this.migrateExistingQueue();
    }
  }

  /**
   * Setup event forwarding from sync manager
   */
  private setupEventForwarding(): void {
    // Forward relevant sync events
    this.syncManager.on('operation:completed', ({ operation, response }) => {
      if (operation.endpoint.includes('/receipts')) {
        this.emit('receipt:synced', {
          receipt: operation.data,
          response,
        });
      }
    });

    this.syncManager.on('operation:queued', ({ operation }) => {
      if (operation.endpoint.includes('/receipts')) {
        this.emit('receipt:queued', {
          receipt: operation.data,
          priority: operation.priority,
        });
      }
    });
  }

  /**
   * Migrate existing offline queue to background sync
   */
  private async migrateExistingQueue(): Promise<void> {
    if (!this.queueManager || this.migrationInProgress) {
      return;
    }

    this.migrationInProgress = true;

    try {
      const existingItems = await this.queueManager.getQueueItems();

      if (existingItems.length === 0) {
        this.migrationInProgress = false;
        return;
      }

      this.emit('migration:started', { totalOperations: existingItems.length });

      let migratedCount = 0;

      for (const item of existingItems) {
        try {
          // Convert queue item to sync operation
          const syncOp = await this.convertQueueItemToSyncOp(item);

          if (syncOp) {
            await this.syncManager.queueOperation(syncOp);

            // Remove from old queue
            await this.queueManager.dequeue(item.id);

            migratedCount++;
            this.emit('migration:progress', {
              completed: migratedCount,
              total: existingItems.length,
            });
          }
        } catch (error) {
          console.error('Failed to migrate queue item:', item.id, error);
        }
      }

      this.emit('migration:completed', { migratedCount });

    } catch (error) {
      console.error('Queue migration failed:', error);
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Convert queue item to sync operation
   */
  private async convertQueueItemToSyncOp(item: any): Promise<Omit<SyncOperation, 'id' | 'metadata' | 'status'> | null> {
    // Extract request details from queue item
    const { request } = item;

    if (!request) {
      return null;
    }

    // Determine priority based on content
    let priority: 'critical' | 'high' | 'normal' | 'low' = 'normal';

    if (request.url?.includes('/receipts') && request.data) {
      priority = getReceiptSyncPriority(request.data);
    }

    return {
      type: this.getOperationType(request.method),
      priority,
      endpoint: request.url || '',
      method: request.method || 'POST',
      data: request.data,
      headers: request.headers,
    };
  }

  /**
   * Get operation type from HTTP method
   */
  private getOperationType(method?: string): 'create' | 'update' | 'delete' | 'batch' {
    switch (method?.toUpperCase()) {
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'create';
    }
  }

  /**
   * Queue a receipt for sync with intelligent priority
   */
  async queueReceipt(receipt: any, endpoint: string): Promise<void> {
    const priority = getReceiptSyncPriority(receipt);

    // Check fiscal timeout
    if (receipt.fiscal_required) {
      const createdAt = new Date(receipt.created_at).getTime();
      const timeElapsed = Date.now() - createdAt;

      if (
        this.config.receiptSync &&
        typeof this.config.receiptSync.fiscalTimeout === 'number' &&
        timeElapsed > this.config.receiptSync.fiscalTimeout
      ) {
        this.emit('fiscal:timeout', {
          receipt,
          timeout: this.config.receiptSync.fiscalTimeout,
        });
      }
    }

    await this.syncManager.queueOperation({
      type: 'create',
      priority,
      endpoint,
      method: 'POST',
      data: receipt,
      headers: {
        'Content-Type': 'application/json',
        'X-Receipt-Type': receipt.type || 'standard',
        'X-Fiscal-Required': receipt.fiscal_required ? 'true' : 'false',
      },
    });
  }

  /**
   * Queue multiple receipts as a batch
   */
  async queueReceiptBatch(receipts: any[], endpoint: string): Promise<void> {
    // Sort receipts by priority
    const sortedReceipts = receipts.sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityMap[getReceiptSyncPriority(a)];
      const bPriority = priorityMap[getReceiptSyncPriority(b)];
      return aPriority - bPriority;
    });

    // Create batch operations
    const operations = sortedReceipts.map(receipt => ({
      type: 'create' as const,
      priority: getReceiptSyncPriority(receipt),
      endpoint,
      method: 'POST' as const,
      data: receipt,
    }));

    await this.syncManager.queueBatch(operations, 'high');
  }

  /**
   * Get sync statistics
   */
  getSyncStatistics() {
    return this.syncManager.getStatistics();
  }

  /**
   * Get pending receipts
   */
  getPendingReceipts(): any[] {
    const allOperations = this.syncManager.getAllOperations();

    return allOperations
      .filter(op => op.endpoint.includes('/receipts') && op.status === 'pending')
      .map(op => op.data);
  }

  /**
   * Force sync now (useful for testing or manual trigger)
   */
  forceSyncNow(): Promise<void> {
    return this.syncManager.syncNow();
  }

  /**
   * Retry failed receipt operations
   */
  retryFailedReceipts(): number {
    return this.syncManager.retryFailed();
  }

  /**
   * Clear completed receipt operations
   */
  clearCompletedReceipts(): number {
    return this.syncManager.clearCompleted();
  }

  /**
   * Check if a receipt is pending sync
   */
  isReceiptPending(receiptId: string): boolean {
    const operations = this.syncManager.getAllOperations();

    return operations.some(op =>
      op.status === 'pending' &&
      op.data?.id === receiptId,
    );
  }

  /**
   * Cancel a pending receipt sync
   */
  cancelReceiptSync(receiptId: string): boolean {
    const operations = this.syncManager.getAllOperations();
    const receiptOp = operations.find(op => op.data?.id === receiptId);

    if (receiptOp) {
      return this.syncManager.cancelOperation(receiptOp.id);
    }

    return false;
  }

  /**
   * Destroy the integration
   */
  async destroy(): Promise<void> {
    await this.syncManager.destroy();
    this.removeAllListeners();
  }
}

/**
 * Create offline integration helper
 */
export function createOfflineIntegration(
  httpClient: HttpClient,
  config?: OfflineIntegrationConfig,
): PWAOfflineIntegration {
  return new PWAOfflineIntegration(httpClient, config);
}
