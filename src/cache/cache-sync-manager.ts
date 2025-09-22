import { ICacheAdapter, CachedItem } from '../adapters';
import { INetworkMonitor } from '../adapters/network';
import { HttpClient } from '../core/api/http-client';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Cache synchronization configuration
 */
export interface CacheSyncConfig {
  /** Maximum age for cache entries before refresh (ms) */
  maxStaleTime?: number;
  /** Interval for periodic sync when online (ms) */
  syncInterval?: number;
  /** Enable automatic sync on network reconnection */
  autoSyncOnReconnect?: boolean;
  /** Maximum number of concurrent sync operations */
  maxConcurrentSyncs?: number;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Batch size for sync operations */
  syncBatchSize?: number;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 'server-wins' | 'local-wins' | 'merge' | 'manual';

/**
 * Conflict resolution result
 */
export interface ConflictResolution<T> {
  strategy: ConflictResolutionStrategy;
  resolvedData: T;
  conflictReason: string;
  localData?: T;
  serverData?: T;
}

/**
 * Sync operation result
 */
export interface SyncResult {
  /** Number of entries synced successfully */
  synced: number;
  /** Number of entries that failed to sync */
  failed: number;
  /** Number of conflicts resolved */
  conflictsResolved: number;
  /** Time taken for sync operation (ms) */
  syncTime: number;
  /** Any errors encountered */
  errors: Array<{ key: string; error: string }>;
}

/**
 * Sync status for cache entries
 */
export interface SyncStatus {
  /** Whether entry needs syncing */
  needsSync: boolean;
  /** Last sync attempt timestamp */
  lastSyncAttempt?: number;
  /** Number of sync attempts */
  syncAttempts: number;
  /** Last sync error */
  lastSyncError?: string;
}

/**
 * Cache sync manager for automatic cache refresh and conflict resolution
 */
export class CacheSyncManager {
  private config: Required<CacheSyncConfig>;
  private performanceMonitor?: PerformanceMonitor;
  private syncTimer?: NodeJS.Timeout;
  private networkUnsubscribe?: () => void;
  private activeSyncs = new Set<string>();
  private syncQueue = new Set<string>();
  private isOnline = false;

  constructor(
    private cache: ICacheAdapter,
    private httpClient: HttpClient,
    private networkMonitor: INetworkMonitor,
    config: CacheSyncConfig = {},
    performanceMonitor?: PerformanceMonitor
  ) {
    this.config = {
      maxStaleTime: 5 * 60 * 1000, // 5 minutes
      syncInterval: 30 * 1000, // 30 seconds
      autoSyncOnReconnect: true,
      maxConcurrentSyncs: 3,
      enablePerformanceMonitoring: false,
      syncBatchSize: 10,
      ...config,
    };

    this.performanceMonitor = performanceMonitor;
    this.isOnline = this.networkMonitor.isOnline();
    
    this.setupNetworkListener();
    
    if (this.config.syncInterval > 0) {
      this.startPeriodicSync();
    }
  }

  /**
   * Setup network status listener
   */
  private setupNetworkListener(): void {
    this.networkUnsubscribe = this.networkMonitor.onStatusChange((online) => {
      const wasOffline = !this.isOnline;
      this.isOnline = online;
      
      if (online && wasOffline && this.config.autoSyncOnReconnect) {
        // Network reconnected - trigger cache refresh
        this.refreshStaleCache().catch(console.error);
      }
    });
  }

  /**
   * Refresh all stale cache entries
   */
  async refreshStaleCache(): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        synced: 0,
        failed: 0,
        conflictsResolved: 0,
        syncTime: 0,
        errors: [{ key: 'network', error: 'Device is offline' }],
      };
    }

    const startTime = performance.now();
    const endTiming = this.performanceMonitor?.startCacheOperation('cleanup');
    
    try {
      // Get all cache keys
      const keys = await this.cache.getKeys();
      const staleKeys = await this.identifyStaleEntries(keys);
      
      // Sync stale entries in batches
      const result = await this.syncCacheEntries(staleKeys);
      
      endTiming?.();
      return {
        ...result,
        syncTime: performance.now() - startTime,
      };
    } catch (error) {
      endTiming?.();
      return {
        synced: 0,
        failed: 0,
        conflictsResolved: 0,
        syncTime: performance.now() - startTime,
        errors: [{ key: 'refresh', error: (error as Error).message }],
      };
    }
  }

  /**
   * Sync specific cache entries
   */
  async syncCacheEntries(keys: string[]): Promise<SyncResult> {
    const result: SyncResult = {
      synced: 0,
      failed: 0,
      conflictsResolved: 0,
      syncTime: 0,
      errors: [],
    };

    // Process keys in batches to avoid overwhelming the server
    const batches = this.createBatches(keys, this.config.syncBatchSize);
    
    for (const batch of batches) {
      const batchPromises = batch.map(key => this.syncSingleEntry(key));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((batchResult, index) => {
        const key = batch[index] as string;
        
        if (batchResult.status === 'fulfilled') {
          const syncResult = batchResult.value;
          if (syncResult.success) {
            result.synced++;
            if (syncResult.hadConflict) {
              result.conflictsResolved++;
            }
          } else {
            result.failed++;
            result.errors.push({
              key,
              error: syncResult.error || 'Unknown sync error',
            });
          }
        } else {
          result.failed++;
          result.errors.push({
            key,
            error: batchResult.reason?.message || 'Sync promise rejected',
          });
        }
      });
    }

    return result;
  }

  /**
   * Sync a single cache entry
   */
  private async syncSingleEntry(key: string): Promise<{
    success: boolean;
    hadConflict: boolean;
    error?: string;
  }> {
    if (this.activeSyncs.has(key)) {
      return { success: false, hadConflict: false, error: 'Sync already in progress' };
    }

    if (this.activeSyncs.size >= this.config.maxConcurrentSyncs) {
      // Add to queue for later processing
      this.syncQueue.add(key);
      return { success: false, hadConflict: false, error: 'Sync queued due to concurrency limit' };
    }

    this.activeSyncs.add(key);
    
    try {
      const cachedItem = await this.cache.get(key);
      if (!cachedItem) {
        return { success: false, hadConflict: false, error: 'Cache entry not found' };
      }

      // Extract resource info from cache key
      const resourceInfo = this.parseResourceFromKey(key);
      if (!resourceInfo) {
        return { success: false, hadConflict: false, error: 'Unable to parse resource from key' };
      }

      // Fetch fresh data from server
      const serverData = await this.fetchServerData(resourceInfo);
      
      // Check for conflicts and resolve
      const resolution = await this.resolveConflicts(cachedItem, serverData, key);
      
      // Update cache with resolved data
      const updatedItem: CachedItem<any> = {
        data: resolution.resolvedData,
        timestamp: Date.now(),
        source: 'server',
        syncStatus: 'synced',
        etag: serverData.etag,
      };
      
      await this.cache.setItem(key, updatedItem);
      
      return {
        success: true,
        hadConflict: resolution.strategy !== 'server-wins' || !!resolution.localData,
      };
    } catch (error) {
      return {
        success: false,
        hadConflict: false,
        error: (error as Error).message,
      };
    } finally {
      this.activeSyncs.delete(key);
      
      // Process queued sync if available
      if (this.syncQueue.size > 0) {
        const nextKey = this.syncQueue.values().next().value as string;
        this.syncQueue.delete(nextKey);
        setTimeout(() => this.syncSingleEntry(nextKey), 100);
      }
    }
  }

  /**
   * Identify stale cache entries that need refreshing
   */
  private async identifyStaleEntries(keys: string[]): Promise<string[]> {
    const staleKeys: string[] = [];
    const now = Date.now();
    
    for (const key of keys) {
      try {
        const item = await this.cache.get(key);
        if (!item) continue;
        
        // Check if entry is stale
        const age = now - item.timestamp;
        const isStale = age > this.config.maxStaleTime;
        const needsSync = item.syncStatus === 'pending' || item.syncStatus === 'failed';
        
        if (isStale || needsSync) {
          staleKeys.push(key);
        }
      } catch (error) {
        // If we can't read the item, consider it for refresh
        staleKeys.push(key);
      }
    }
    
    return staleKeys;
  }

  /**
   * Parse resource information from cache key
   */
  private parseResourceFromKey(key: string): { type: string; id?: string; endpoint: string } | null {
    // Expected format: "resource_type:id" or "resource_type:endpoint"
    // Examples: "receipt:123", "merchants:list", "payments:create"
    
    const parts = key.split(':');
    if (parts.length < 2) return null;
    
    const type = parts[0];
    const identifier = parts[1];
    
    if (!type) return null;
    
    // Map cache key patterns to API endpoints
    const endpointMap: Record<string, string> = {
      receipt: `/receipts/${identifier}`,
      receipts: '/receipts',
      merchant: `/merchants/${identifier}`,
      merchants: '/merchants',
      payment: `/payments/${identifier}`,
      payments: '/payments',
    };
    
    const endpoint = endpointMap[type];
    if (!endpoint) return null;
    
    return {
      type,
      id: identifier,
      endpoint,
    };
  }

  /**
   * Fetch fresh data from server
   */
  private async fetchServerData(resourceInfo: { type: string; id?: string; endpoint: string }): Promise<any> {
    // Use the HTTP client to fetch fresh data
    const response: any = await this.httpClient.get(resourceInfo.endpoint);
    return response.data;
  }

  /**
   * Resolve conflicts between cached and server data
   */
  private async resolveConflicts<T>(
    cachedItem: CachedItem<T>,
    serverData: T,
    key: string
  ): Promise<ConflictResolution<T>> {
    // Simple conflict detection - compare timestamps and ETags
    const hasConflict = this.detectConflict(cachedItem, serverData);
    
    if (!hasConflict) {
      return {
        strategy: 'server-wins',
        resolvedData: serverData,
        conflictReason: 'No conflict detected',
      };
    }
    
    // For MVP, implement "server always wins" strategy
    return this.resolveConflictServerWins(cachedItem, serverData, key);
  }

  /**
   * Detect if there's a conflict between cached and server data
   */
  private detectConflict<T>(cachedItem: CachedItem<T>, serverData: any): boolean {
    // Check if cached item was modified locally
    if (cachedItem.source === 'optimistic' || cachedItem.syncStatus === 'pending') {
      return true;
    }
    
    // Check ETag mismatch
    if (cachedItem.etag && serverData.etag && cachedItem.etag !== serverData.etag) {
      return true;
    }
    
    // For now, assume no conflict if basic checks pass
    return false;
  }

  /**
   * Resolve conflict using "server wins" strategy
   */
  private resolveConflictServerWins<T>(
    cachedItem: CachedItem<T>,
    serverData: T,
    _key: string
  ): ConflictResolution<T> {
    return {
      strategy: 'server-wins',
      resolvedData: serverData,
      conflictReason: 'Applying server-wins strategy for MVP',
      localData: cachedItem.data,
      serverData,
    };
  }

  /**
   * Create batches from array of keys
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Start periodic sync timer
   */
  private startPeriodicSync(): void {
    this.syncTimer = setInterval(async () => {
      if (this.isOnline) {
        try {
          await this.refreshStaleCache();
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop periodic sync timer
   */
  private stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    isOnline: boolean;
    activeSyncs: number;
    queuedSyncs: number;
    lastSyncTime?: number;
    syncEnabled: boolean;
  } {
    return {
      isOnline: this.isOnline,
      activeSyncs: this.activeSyncs.size,
      queuedSyncs: this.syncQueue.size,
      syncEnabled: this.config.autoSyncOnReconnect,
    };
  }

  /**
   * Manually trigger sync for specific keys
   */
  async forceSyncKeys(keys: string[]): Promise<SyncResult> {
    return await this.syncCacheEntries(keys);
  }

  /**
   * Enable or disable automatic sync
   */
  setAutoSync(enabled: boolean): void {
    this.config.autoSyncOnReconnect = enabled;
    
    if (enabled && this.config.syncInterval > 0) {
      this.startPeriodicSync();
    } else {
      this.stopPeriodicSync();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPeriodicSync();
    
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    
    this.activeSyncs.clear();
    this.syncQueue.clear();
  }
}