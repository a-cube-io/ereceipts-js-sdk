/**
 * Background Sync Manager for A-Cube E-Receipt SDK
 * Advanced offline-first synchronization with intelligent retry strategies
 * 
 * Features:
 * - Priority-based sync queue
 * - Conflict resolution strategies
 * - Delta sync optimization
 * - Batch synchronization
 * - Progress tracking
 * - Automatic retry with exponential backoff
 */

import { EventEmitter } from 'eventemitter3';
import type { HttpClient, HttpResponse } from '@/http/client';
import type { UnifiedStorage } from '@/storage/unified-storage';
import { createStorageKey } from '@/storage/unified-storage';
import { createStorage } from '@/storage/storage-factory';

/**
 * Sync operation types
 */
export type SyncOperationType = 'create' | 'update' | 'delete' | 'batch';

/**
 * Sync operation priority levels
 */
export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy = 'client-wins' | 'server-wins' | 'merge' | 'manual';

/**
 * Sync operation status
 */
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';

/**
 * Sync operation interface
 */
export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  priority: SyncPriority;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    attemptCount: number;
    lastAttempt?: Date;
    nextRetry?: Date;
    userId?: string;
    deviceId?: string;
    checksum?: string;
  };
  status: SyncStatus;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  conflictData?: {
    localVersion: any;
    serverVersion: any;
    strategy: ConflictStrategy;
  };
}

/**
 * Sync batch interface
 */
export interface SyncBatch {
  id: string;
  operations: SyncOperation[];
  priority: SyncPriority;
  status: SyncStatus;
  progress: {
    total: number;
    completed: number;
    failed: number;
    conflicts: number;
  };
  metadata: {
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
  };
}

/**
 * Background sync configuration
 */
export interface BackgroundSyncConfig {
  /** Maximum number of operations in queue */
  maxQueueSize?: number;
  
  /** Maximum retry attempts per operation */
  maxRetries?: number;
  
  /** Base retry delay in milliseconds */
  baseRetryDelay?: number;
  
  /** Maximum retry delay in milliseconds */
  maxRetryDelay?: number;
  
  /** Batch size for sync operations */
  batchSize?: number;
  
  /** Enable delta sync optimization */
  enableDeltaSync?: boolean;
  
  /** Enable compression for sync data */
  enableCompression?: boolean;
  
  /** Conflict resolution strategy */
  defaultConflictStrategy?: ConflictStrategy;
  
  /** Storage configuration */
  storage?: {
    adapter?: 'memory' | 'localStorage' | 'indexedDB' | 'reactNative';
    encryptionKey?: string;
  };
  
  /** Network detection */
  networkDetection?: {
    enabled?: boolean;
    checkInterval?: number;
    endpoints?: string[];
  };
}

/**
 * Background sync events
 */
export interface BackgroundSyncEvents {
  'sync:started': { batch: SyncBatch };
  'sync:progress': { batch: SyncBatch; operation: SyncOperation };
  'sync:completed': { batch: SyncBatch; duration: number };
  'sync:failed': { batch: SyncBatch; error: Error };
  'operation:queued': { operation: SyncOperation };
  'operation:started': { operation: SyncOperation };
  'operation:completed': { operation: SyncOperation; response: any };
  'operation:failed': { operation: SyncOperation; error: Error };
  'operation:conflict': { operation: SyncOperation; conflict: any };
  'queue:full': { size: number; operation: SyncOperation };
  'network:online': { timestamp: Date };
  'network:offline': { timestamp: Date };
}

/**
 * Sync statistics
 */
export interface SyncStatistics {
  totalOperations: number;
  pendingOperations: number;
  completedOperations: number;
  failedOperations: number;
  conflictedOperations: number;
  averageSyncTime: number;
  lastSyncTime?: Date;
  nextSyncTime?: Date;
  dataTransferred: {
    uploaded: number;
    downloaded: number;
  };
}

const DEFAULT_CONFIG: Required<BackgroundSyncConfig> = {
  maxQueueSize: 5000,
  maxRetries: 5,
  baseRetryDelay: 5000,
  maxRetryDelay: 300000, // 5 minutes
  batchSize: 50,
  enableDeltaSync: true,
  enableCompression: true,
  defaultConflictStrategy: 'server-wins',
  storage: {
    adapter: 'indexedDB' as const,
  },
  networkDetection: {
    enabled: true,
    checkInterval: 30000, // 30 seconds
    endpoints: ['/health', '/ping'],
  },
};

/**
 * Background Sync Manager
 * Handles offline-first synchronization with intelligent retry and conflict resolution
 */
export class BackgroundSyncManager extends EventEmitter<BackgroundSyncEvents> {
  private config: Required<BackgroundSyncConfig>;
  private storage: UnifiedStorage | null = null;
  private httpClient: HttpClient;
  private syncQueue: Map<string, SyncOperation> = new Map();
  private activeBatch: SyncBatch | null = null;
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private networkCheckInterval?: NodeJS.Timeout;
  private syncTimeout: NodeJS.Timeout | undefined = undefined;
  private statistics: SyncStatistics = {
    totalOperations: 0,
    pendingOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    conflictedOperations: 0,
    averageSyncTime: 0,
    dataTransferred: {
      uploaded: 0,
      downloaded: 0,
    },
  };

  constructor(httpClient: HttpClient, config: BackgroundSyncConfig = {}) {
    super();
    this.httpClient = httpClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.setupEventListeners();
    this.initialize();
  }

  /**
   * Initialize the sync manager
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize storage
      this.storage = await createStorage({
        preferredAdapter: this.config.storage.adapter === 'indexedDB' ? 'indexeddb' : 
                          this.config.storage.adapter === 'localStorage' ? 'localstorage' : 'auto',
        encryption: { enabled: false },
      });

      // Load existing queue from storage
      await this.loadQueueFromStorage();

      // Start network monitoring
      if (this.config.networkDetection.enabled) {
        this.startNetworkMonitoring();
      }

      // Register for service worker sync if available
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        this.registerBackgroundSync();
      }
    } catch (error) {
      console.error('Failed to initialize BackgroundSyncManager:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Online/offline events
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));

    // Page visibility for aggressive sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    });
  }

  /**
   * Queue a sync operation
   */
  async queueOperation(
    operation: Omit<SyncOperation, 'id' | 'metadata' | 'status'>
  ): Promise<SyncOperation> {
    // Check queue size limit
    if (this.syncQueue.size >= this.config.maxQueueSize) {
      const op = { ...operation, id: '', metadata: {}, status: 'pending' as SyncStatus };
      this.emit('queue:full', { size: this.syncQueue.size, operation: op as SyncOperation });
      throw new Error('Sync queue is full');
    }

    // Create sync operation
    const userId = this.getCurrentUserId();
    const syncOp: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        attemptCount: 0,
        ...(userId ? { userId } : {}),
        deviceId: this.getDeviceId(),
        checksum: this.calculateChecksum(operation.data),
      },
      status: 'pending',
    };

    // Add to queue
    this.syncQueue.set(syncOp.id, syncOp);
    this.statistics.totalOperations++;
    this.statistics.pendingOperations++;

    // Persist to storage
    await this.saveQueueToStorage();

    // Emit event
    this.emit('operation:queued', { operation: syncOp });

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.scheduleSyncWithDelay(0);
    }

    return syncOp;
  }

  /**
   * Queue multiple operations as a batch
   */
  async queueBatch(
    operations: Array<Omit<SyncOperation, 'id' | 'metadata' | 'status'>>,
    priority: SyncPriority = 'normal'
  ): Promise<SyncBatch> {
    const batch: SyncBatch = {
      id: this.generateBatchId(),
      operations: [],
      priority,
      status: 'pending',
      progress: {
        total: operations.length,
        completed: 0,
        failed: 0,
        conflicts: 0,
      },
      metadata: {
        createdAt: new Date(),
      },
    };

    // Queue all operations
    for (const op of operations) {
      try {
        const syncOp = await this.queueOperation({ ...op, priority });
        batch.operations.push(syncOp);
      } catch (error) {
        console.error('Failed to queue operation:', error);
      }
    }

    return batch;
  }

  /**
   * Start synchronization
   */
  async syncNow(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;

    try {
      // Get pending operations sorted by priority and creation time
      const pendingOps = this.getPendingOperations();
      
      if (pendingOps.length === 0) {
        this.isSyncing = false;
        return;
      }

      // Create batch
      const batch: SyncBatch = {
        id: this.generateBatchId(),
        operations: pendingOps.slice(0, this.config.batchSize),
        priority: 'normal',
        status: 'syncing',
        progress: {
          total: Math.min(pendingOps.length, this.config.batchSize),
          completed: 0,
          failed: 0,
          conflicts: 0,
        },
        metadata: {
          createdAt: new Date(),
          startedAt: new Date(),
        },
      };

      this.activeBatch = batch;
      this.emit('sync:started', { batch });

      // Process operations
      for (const operation of batch.operations) {
        try {
          await this.processOperation(operation, batch);
        } catch (error) {
          console.error('Failed to process operation:', operation.id, error);
        }
      }

      // Complete batch
      batch.status = 'completed';
      batch.metadata.completedAt = new Date();
      batch.metadata.duration = batch.metadata.completedAt.getTime() - batch.metadata.startedAt!.getTime();

      this.emit('sync:completed', { batch, duration: batch.metadata.duration });
      this.statistics.lastSyncTime = new Date();

    } catch (error) {
      console.error('Sync failed:', error);
      if (this.activeBatch) {
        this.activeBatch.status = 'failed';
        this.emit('sync:failed', { batch: this.activeBatch, error: error as Error });
      }
    } finally {
      this.isSyncing = false;
      this.activeBatch = null;
      await this.saveQueueToStorage();
      
      // Schedule next sync if there are pending operations
      if (this.statistics.pendingOperations > 0) {
        this.scheduleNextSync();
      }
    }
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation, batch: SyncBatch): Promise<void> {
    operation.status = 'syncing';
    operation.metadata.lastAttempt = new Date();
    operation.metadata.attemptCount++;

    this.emit('operation:started', { operation });
    this.emit('sync:progress', { batch, operation });

    try {
      // Prepare request
      const requestData = this.config.enableCompression 
        ? await this.compressData(operation.data)
        : operation.data;

      // Execute request
      const response = await this.httpClient.request({
        method: operation.method,
        url: operation.endpoint,
        data: requestData,
        headers: {
          ...operation.headers,
          'X-Sync-Operation-Id': operation.id,
          'X-Sync-Priority': operation.priority,
          'X-Sync-Checksum': operation.metadata.checksum || '',
        },
      });

      // Handle response
      if (response.status >= 200 && response.status < 300) {
        // Success
        operation.status = 'completed';
        this.syncQueue.delete(operation.id);
        this.statistics.pendingOperations--;
        this.statistics.completedOperations++;
        batch.progress.completed++;

        // Update data transferred statistics
        this.updateDataTransferStats(operation, response);

        this.emit('operation:completed', { operation, response: response.data });
      } else if (response.status === 409) {
        // Conflict
        await this.handleConflict(operation, response, batch);
      } else {
        // Other errors
        throw new Error(`Sync failed with status ${response.status}`);
      }
    } catch (error) {
      await this.handleOperationError(operation, error as Error, batch);
    }
  }

  /**
   * Handle conflict resolution
   */
  private async handleConflict(
    operation: SyncOperation,
    response: HttpResponse<any>,
    batch: SyncBatch
  ): Promise<void> {
    operation.status = 'conflict';
    operation.conflictData = {
      localVersion: operation.data,
      serverVersion: response.data.serverVersion,
      strategy: this.config.defaultConflictStrategy,
    };

    this.statistics.conflictedOperations++;
    batch.progress.conflicts++;

    this.emit('operation:conflict', { 
      operation, 
      conflict: operation.conflictData 
    });

    // Apply conflict resolution strategy
    switch (this.config.defaultConflictStrategy) {
      case 'client-wins':
        // Retry with force flag
        operation.headers = {
          ...operation.headers,
          'X-Force-Update': 'true',
        };
        operation.status = 'pending';
        operation.metadata.attemptCount = 0;
        break;

      case 'server-wins':
        // Accept server version, remove from queue
        operation.status = 'completed';
        this.syncQueue.delete(operation.id);
        this.statistics.pendingOperations--;
        break;

      case 'merge':
        // Attempt to merge changes
        const mergedData = await this.mergeConflict(
          operation.conflictData.localVersion,
          operation.conflictData.serverVersion
        );
        operation.data = mergedData;
        operation.status = 'pending';
        operation.metadata.attemptCount = 0;
        break;

      case 'manual':
        // Keep in queue for manual resolution
        break;
    }
  }

  /**
   * Handle operation error
   */
  private async handleOperationError(
    operation: SyncOperation,
    error: Error,
    batch: SyncBatch
  ): Promise<void> {
    operation.error = {
      code: 'SYNC_ERROR',
      message: error.message,
      details: error,
    };

    // Check retry eligibility
    if (operation.metadata.attemptCount < this.config.maxRetries) {
      // Calculate next retry time with exponential backoff
      const delay = Math.min(
        this.config.baseRetryDelay * Math.pow(2, operation.metadata.attemptCount - 1),
        this.config.maxRetryDelay
      );
      
      operation.metadata.nextRetry = new Date(Date.now() + delay);
      operation.status = 'pending';
      
      this.emit('operation:failed', { operation, error });
    } else {
      // Max retries exceeded
      operation.status = 'failed';
      this.statistics.failedOperations++;
      batch.progress.failed++;
      
      // Remove from queue
      this.syncQueue.delete(operation.id);
      this.statistics.pendingOperations--;
      
      this.emit('operation:failed', { operation, error });
    }
  }

  /**
   * Get pending operations sorted by priority
   */
  private getPendingOperations(): SyncOperation[] {
    const now = new Date();
    const pendingOps = Array.from(this.syncQueue.values())
      .filter(op => {
        if (op.status !== 'pending') return false;
        if (op.metadata.nextRetry && op.metadata.nextRetry > now) return false;
        return true;
      });

    // Sort by priority and creation time
    return pendingOps.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime();
    });
  }

  /**
   * Register for background sync with service worker
   */
  private async registerBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await (registration as any).sync.register('acube-background-sync');
        console.log('Background sync registered');
      }
    } catch (error) {
      console.warn('Failed to register background sync:', error);
    }
  }

  /**
   * Start network monitoring
   */
  private startNetworkMonitoring(): void {
    this.networkCheckInterval = setInterval(async () => {
      if (!this.config.networkDetection.endpoints || this.config.networkDetection.endpoints.length === 0) return;
      
      try {
        // Try to reach one of the health check endpoints
        const endpoint = this.config.networkDetection.endpoints[0];
        if (!endpoint) return;
        
        const response = await this.httpClient.get(endpoint, {
          timeout: 5000,
        });
        
        if (!this.isOnline && response.status === 200) {
          this.handleOnlineStatus(true);
        }
      } catch (error) {
        if (this.isOnline) {
          this.handleOnlineStatus(false);
        }
      }
    }, this.config.networkDetection.checkInterval) as unknown as NodeJS.Timeout;
  }

  /**
   * Handle online/offline status change
   */
  private handleOnlineStatus(isOnline: boolean): void {
    if (this.isOnline === isOnline) return;
    
    this.isOnline = isOnline;
    
    if (isOnline) {
      this.emit('network:online', { timestamp: new Date() });
      
      // Start sync when coming online
      if (this.statistics.pendingOperations > 0) {
        this.scheduleSyncWithDelay(1000); // Wait 1 second before syncing
      }
    } else {
      this.emit('network:offline', { timestamp: new Date() });
      
      // Cancel any scheduled sync
      if (this.syncTimeout) {
        clearTimeout(this.syncTimeout);
        this.syncTimeout = undefined;
      }
    }
  }

  /**
   * Schedule sync with delay
   */
  private scheduleSyncWithDelay(delay: number): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.syncNow();
    }, delay) as unknown as NodeJS.Timeout;
  }

  /**
   * Schedule next sync based on pending operations
   */
  private scheduleNextSync(): void {
    // Find the earliest retry time
    let earliestRetry: Date | null = null;
    
    for (const op of this.syncQueue.values()) {
      if (op.metadata.nextRetry && (!earliestRetry || op.metadata.nextRetry < earliestRetry)) {
        earliestRetry = op.metadata.nextRetry;
      }
    }
    
    if (earliestRetry) {
      const delay = Math.max(0, earliestRetry.getTime() - Date.now());
      this.scheduleSyncWithDelay(delay);
      this.statistics.nextSyncTime = earliestRetry;
    }
  }

  /**
   * Load queue from storage
   */
  private async loadQueueFromStorage(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const storageKey = createStorageKey('acube_sync_queue');
      const result = await this.storage.get(storageKey);
      if (result && result.data) {
        const queue = JSON.parse(result.data as string);
        
        // Restore queue with proper date objects
        for (const [id, op] of Object.entries(queue)) {
          const operation = op as SyncOperation;
          operation.metadata.createdAt = new Date(operation.metadata.createdAt);
          operation.metadata.updatedAt = new Date(operation.metadata.updatedAt);
          
          if (operation.metadata.lastAttempt) {
            operation.metadata.lastAttempt = new Date(operation.metadata.lastAttempt);
          }
          if (operation.metadata.nextRetry) {
            operation.metadata.nextRetry = new Date(operation.metadata.nextRetry);
          }
          
          this.syncQueue.set(id, operation);
        }
        
        // Update statistics
        this.updateStatisticsFromQueue();
      }
    } catch (error) {
      console.error('Failed to load sync queue from storage:', error);
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueueToStorage(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const queue: Record<string, SyncOperation> = {};
      
      for (const [id, op] of this.syncQueue) {
        queue[id] = op;
      }
      
      const storageKey = createStorageKey('acube_sync_queue');
      await this.storage.set(storageKey, JSON.stringify(queue), {
        encrypt: true,
      });
    } catch (error) {
      console.error('Failed to save sync queue to storage:', error);
    }
  }

  /**
   * Update statistics from queue
   */
  private updateStatisticsFromQueue(): void {
    this.statistics.pendingOperations = 0;
    
    for (const op of this.syncQueue.values()) {
      if (op.status === 'pending') {
        this.statistics.pendingOperations++;
      }
    }
  }

  /**
   * Update data transfer statistics
   */
  private updateDataTransferStats(operation: SyncOperation, response: HttpResponse<any>): void {
    // Estimate upload size
    if (operation.data) {
      const uploadSize = JSON.stringify(operation.data).length;
      this.statistics.dataTransferred.uploaded += uploadSize;
    }
    
    // Estimate download size
    if (response.data) {
      const downloadSize = JSON.stringify(response.data).length;
      this.statistics.dataTransferred.downloaded += downloadSize;
    }
  }

  /**
   * Merge conflict data (basic implementation)
   */
  private async mergeConflict(localData: any, serverData: any): Promise<any> {
    // This is a basic implementation - in real scenarios,
    // you would implement domain-specific merge logic
    return {
      ...serverData,
      ...localData,
      _merged: true,
      _mergedAt: new Date().toISOString(),
    };
  }

  /**
   * Compress data for transmission
   */
  private async compressData(data: any): Promise<any> {
    // This is a placeholder - in production you would use
    // actual compression like gzip
    return data;
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: any): string {
    if (!data) return '';
    
    // Simple checksum implementation
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string | undefined {
    // This would be implemented based on your auth system
    return undefined;
  }

  /**
   * Get device ID
   */
  private getDeviceId(): string {
    // Try to get or generate a persistent device ID
    let deviceId = localStorage.getItem('acube_device_id');
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('acube_device_id', deviceId);
    }
    
    return deviceId;
  }

  /**
   * Get sync statistics
   */
  getStatistics(): SyncStatistics {
    return { ...this.statistics };
  }

  /**
   * Get operation by ID
   */
  getOperation(operationId: string): SyncOperation | undefined {
    return this.syncQueue.get(operationId);
  }

  /**
   * Get all operations
   */
  getAllOperations(): SyncOperation[] {
    return Array.from(this.syncQueue.values());
  }

  /**
   * Clear completed operations
   */
  clearCompleted(): number {
    let cleared = 0;
    
    for (const [id, op] of this.syncQueue) {
      if (op.status === 'completed') {
        this.syncQueue.delete(id);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      this.saveQueueToStorage();
    }
    
    return cleared;
  }

  /**
   * Cancel operation
   */
  cancelOperation(operationId: string): boolean {
    const operation = this.syncQueue.get(operationId);
    
    if (operation && operation.status === 'pending') {
      this.syncQueue.delete(operationId);
      this.statistics.pendingOperations--;
      this.saveQueueToStorage();
      return true;
    }
    
    return false;
  }

  /**
   * Retry failed operations
   */
  retryFailed(): number {
    let retried = 0;
    
    for (const op of this.syncQueue.values()) {
      if (op.status === 'failed') {
        op.status = 'pending';
        op.metadata.attemptCount = 0;
        delete op.metadata.nextRetry;
        delete op.error;
        retried++;
      }
    }
    
    if (retried > 0) {
      this.statistics.pendingOperations += retried;
      this.statistics.failedOperations -= retried;
      this.saveQueueToStorage();
      
      if (this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    }
    
    return retried;
  }

  /**
   * Force sync even when offline (for testing)
   */
  forceSyncNow(): Promise<void> {
    const wasOffline = !this.isOnline;
    this.isOnline = true;
    
    return this.syncNow().finally(() => {
      if (wasOffline) {
        this.isOnline = false;
      }
    });
  }

  /**
   * Destroy the sync manager
   */
  async destroy(): Promise<void> {
    // Clear intervals
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
    }
    
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    // Remove event listeners
    window.removeEventListener('online', () => this.handleOnlineStatus(true));
    window.removeEventListener('offline', () => this.handleOnlineStatus(false));
    
    // Save final state
    await this.saveQueueToStorage();
    
    // Clear memory
    this.syncQueue.clear();
    this.removeAllListeners();
  }
}