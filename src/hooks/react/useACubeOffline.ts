/**
 * useACubeOffline - Modern offline state management and queue synchronization
 * Enhanced with UnifiedStorage, enterprise queue management, and intelligent sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useACube } from './ACubeProvider';
import type { QueueItem, QueueStats } from '@/storage/queue/queue-manager';

export interface OfflineOptions {
  enabled?: boolean;
  syncOnReconnect?: boolean;
  backgroundSync?: boolean;
  syncInterval?: number; // milliseconds
  conflictResolution?: 'client' | 'server' | 'merge';
  onSyncStart?: () => void;
  onSyncComplete?: (results: SyncResults) => void;
  onSyncError?: (error: Error) => void;
  onOfflineChange?: (isOffline: boolean) => void;
}

export interface SyncResults {
  successful: number;
  failed: number;
  conflicts: number;
  duration: number;
}

export interface OfflineStatus {
  queuedOperations: number;
  cachedEntries: number;
  offlineEntries: number;
  lastSyncTime?: Date | undefined;
  pendingSyncOperations: number;
}

export interface OfflineResult {
  // Network state
  isOnline: boolean;
  isOffline: boolean;
  networkStatus: 'online' | 'offline' | 'reconnecting';
  
  // Queue state
  queueStats: QueueStats;
  queuedOperations: QueueItem[];
  
  // Sync state
  isSyncing: boolean;
  syncProgress: number;
  lastSyncTime: Date | null;
  lastSyncResults: SyncResults | null;
  
  // Storage state
  storageStatus: OfflineStatus;
  
  // Actions
  sync: () => Promise<SyncResults>;
  clearQueue: () => Promise<void>;
  clearCache: () => Promise<void>;
  getQueuedOperation: (id: string) => QueueItem | undefined;
  forceSync: (queueId?: string) => Promise<void>;
  enableOfflineMode: () => Promise<void>;
  disableOfflineMode: () => void;
  
  // Advanced features
  exportOfflineData: () => Promise<string>;
  importOfflineData: (data: string) => Promise<void>;
  getOfflineReport: () => Promise<OfflineStatus>;
}

export function useACubeOffline(options: OfflineOptions = {}): OfflineResult {
  const {
    enabled = true,
    syncOnReconnect = true,
    backgroundSync = false,
    syncInterval = 30000, // 30 seconds
    onSyncStart,
    onSyncComplete,
    onSyncError,
    onOfflineChange,
  } = options;

  // Get SDK and offline systems from context
  const { 
    storage, 
    queueManager, 
    syncEngine,
    isOnline: contextIsOnline,
    isOfflineEnabled,
    isSyncEnabled 
  } = useACube();

  // Local state
  const [isOnline, setIsOnline] = useState(contextIsOnline);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnecting'>(
    contextIsOnline ? 'online' : 'offline'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastSyncResults, setLastSyncResults] = useState<SyncResults | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats>({
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
  });
  const [storageStatus, setStorageStatus] = useState<OfflineStatus>({
    queuedOperations: 0,
    cachedEntries: 0,
    offlineEntries: 0,
    pendingSyncOperations: 0,
  });

  // Refs for interval management
  const syncIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastNetworkStatusRef = useRef(contextIsOnline);

  // Update online status when context changes
  useEffect(() => {
    const newStatus = contextIsOnline;
    setIsOnline(newStatus);
    
    // Handle status transitions
    if (lastNetworkStatusRef.current !== newStatus) {
      setNetworkStatus(newStatus ? 'online' : 'offline');
      
      // Reconnection logic
      if (!lastNetworkStatusRef.current && newStatus && syncOnReconnect) {
        setNetworkStatus('reconnecting');
        sync().finally(() => {
          setNetworkStatus('online');
        });
      }
      
      // Notify about offline changes
      onOfflineChange?.(!newStatus);
      lastNetworkStatusRef.current = newStatus;
    }
  }, [contextIsOnline, syncOnReconnect, onOfflineChange]);

  // Update stats periodically
  const updateStats = useCallback(async () => {
    if (!enabled || !isOfflineEnabled) return;

    try {
      // Update queue stats
      if (queueManager) {
        const stats = queueManager.getStats();
        setQueueStats(stats);
      }

      // Update storage status
      if (storage) {
        const offlineStatus: OfflineStatus = {
          queuedOperations: queueStats.totalItems,
          cachedEntries: 0,
          offlineEntries: 0,
          pendingSyncOperations: 0,
        };

        // Count cache entries
        try {
          const cacheEntries = await storage.query({ keyPrefix: 'api_cache:' });
          offlineStatus.cachedEntries = cacheEntries.length;
        } catch (error) {
          console.warn('Failed to count cache entries:', error);
        }

        // Count offline entries
        try {
          const offlineEntries = await storage.query({ keyPrefix: 'offline:' });
          offlineStatus.offlineEntries = offlineEntries.length;
        } catch (error) {
          console.warn('Failed to count offline entries:', error);
        }

        // Get sync status
        if (syncEngine && isSyncEnabled) {
          const syncStatus = syncEngine.getStatus();
          offlineStatus.pendingSyncOperations = syncStatus.activeSyncs + syncStatus.queuedSyncs;
          offlineStatus.lastSyncTime = syncStatus.lastSync ? new Date(syncStatus.lastSync) : undefined;
          setLastSyncTime(syncStatus.lastSync ? new Date(syncStatus.lastSync) : null);
        }

        setStorageStatus(offlineStatus);
      }
    } catch (error) {
      console.warn('Failed to update offline stats:', error);
    }
  }, [enabled, isOfflineEnabled, queueManager, storage, syncEngine, isSyncEnabled, queueStats.totalItems]);

  // Setup background sync
  useEffect(() => {
    if (!enabled || !backgroundSync || !isOnline) return;

    syncIntervalRef.current = setInterval(() => {
      if (!isSyncing) {
        sync().catch(console.warn);
      }
    }, syncInterval);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [enabled, backgroundSync, isOnline, isSyncing, syncInterval]);

  // Update stats on mount and periodically
  useEffect(() => {
    updateStats();
    const statsInterval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(statsInterval);
  }, [updateStats]);

  // Core sync function
  const sync = useCallback(async (): Promise<SyncResults> => {
    if (!enabled || !isOfflineEnabled || isSyncing) {
      return { successful: 0, failed: 0, conflicts: 0, duration: 0 };
    }

    const startTime = Date.now();
    setIsSyncing(true);
    setSyncProgress(0);
    onSyncStart?.();

    try {
      const results: SyncResults = {
        successful: 0,
        failed: 0,
        conflicts: 0,
        duration: 0,
      };

      // Process queue if available
      if (queueManager) {
        setSyncProgress(25);
        try {
          await queueManager.processAll();
          const newStats = queueManager.getStats();
          results.successful += queueStats.totalItems - newStats.totalItems;
          results.failed += newStats.failedItems;
        } catch (error) {
          console.warn('Queue sync failed:', error);
          results.failed += queueStats.totalItems;
        }
      }

      // Sync with server if sync engine available
      if (syncEngine && isSyncEnabled) {
        setSyncProgress(75);
        try {
          const syncResult = await syncEngine.executeSync({
            operation: 'full',
            direction: 'bidirectional',
            strategy: 'immediate',
          });
          
          results.successful += syncResult.statistics.recordsSynced;
          results.conflicts += syncResult.statistics.conflictsDetected;
          if (syncResult.errors.length > 0) {
            results.failed += syncResult.errors.length;
          }
        } catch (error) {
          console.warn('Sync engine failed:', error);
          results.failed += 1;
        }
      }

      setSyncProgress(100);
      results.duration = Date.now() - startTime;
      
      setLastSyncTime(new Date());
      setLastSyncResults(results);
      await updateStats();
      
      onSyncComplete?.(results);
      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Sync failed');
      onSyncError?.(errorMessage);
      throw errorMessage;
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  }, [enabled, isOfflineEnabled, isSyncing, queueManager, syncEngine, isSyncEnabled, queueStats.totalItems, updateStats, onSyncStart, onSyncComplete, onSyncError]);

  // Get queued operations
  const getQueuedOperations = useCallback((): QueueItem[] => {
    if (!queueManager) return [];
    
    try {
      return queueManager.getQueueItems();
    } catch (error) {
      console.warn('Failed to get queued operations:', error);
      return [];
    }
  }, [queueManager]);

  // Clear queue
  const clearQueue = useCallback(async (): Promise<void> => {
    if (!queueManager) return;
    
    try {
      await queueManager.clear();
      await updateStats();
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }, [queueManager, updateStats]);

  // Clear cache
  const clearCache = useCallback(async (): Promise<void> => {
    if (!storage) return;
    
    try {
      const cacheEntries = await storage.query({ keyPrefix: 'api_cache:' });
      for (const entry of cacheEntries) {
        await storage.delete(entry.key);
      }
      await updateStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }, [storage, updateStats]);

  // Get specific queued operation
  const getQueuedOperation = useCallback((id: string): QueueItem | undefined => {
    if (!queueManager) return undefined;
    
    try {
      const items = queueManager.getQueueItems();
      return items.find(item => item.id === id);
    } catch (error) {
      console.warn('Failed to get queued operation:', error);
      return undefined;
    }
  }, [queueManager]);

  // Force sync specific item
  const forceSync = useCallback(async (queueId?: string): Promise<void> => {
    if (!queueManager) return;
    
    try {
      if (queueId) {
        const item = getQueuedOperation(queueId);
        if (item) {
          await queueManager.processItem(item);
        }
      } else {
        await queueManager.processAll();
      }
      await updateStats();
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }, [queueManager, getQueuedOperation, updateStats]);

  // Enable offline mode
  const enableOfflineMode = useCallback(async (): Promise<void> => {
    try {
      // Initialize storage and queue if available
      if (storage) {
        await storage.initialize?.();
      }
      if (queueManager) {
        await queueManager.initialize?.();
      }
      await updateStats();
    } catch (error) {
      console.error('Failed to enable offline mode:', error);
      throw error;
    }
  }, [storage, queueManager, updateStats]);

  // Disable offline mode
  const disableOfflineMode = useCallback((): void => {
    // Clear intervals
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
  }, []);

  // Export offline data
  const exportOfflineData = useCallback(async (): Promise<string> => {
    if (!storage) throw new Error('Storage not available');
    
    try {
      const offlineEntries = await storage.query({ keyPrefix: 'offline:' });
      const cacheEntries = await storage.query({ keyPrefix: 'api_cache:' });
      const queueItems = queueManager ? queueManager.getQueueItems() : [];
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        offline: offlineEntries,
        cache: cacheEntries,
        queue: queueItems,
        stats: storageStatus,
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export offline data:', error);
      throw error;
    }
  }, [storage, queueManager, storageStatus]);

  // Import offline data
  const importOfflineData = useCallback(async (data: string): Promise<void> => {
    if (!storage) throw new Error('Storage not available');
    
    try {
      const importData = JSON.parse(data);
      
      // Import offline entries
      for (const entry of importData.offline || []) {
        await storage.set(entry.key, entry.value);
      }
      
      // Import cache entries (with expiration check)
      for (const entry of importData.cache || []) {
        if (entry.value?.expiresAt && new Date(entry.value.expiresAt) > new Date()) {
          await storage.set(entry.key, entry.value);
        }
      }
      
      // Import queue items
      if (queueManager && importData.queue) {
        for (const item of importData.queue) {
          await queueManager.add(item);
        }
      }
      
      await updateStats();
    } catch (error) {
      console.error('Failed to import offline data:', error);
      throw error;
    }
  }, [storage, queueManager, updateStats]);

  // Get offline report
  const getOfflineReport = useCallback(async (): Promise<OfflineStatus> => {
    await updateStats();
    return storageStatus;
  }, [updateStats, storageStatus]);

  return {
    // Network state
    isOnline,
    isOffline: !isOnline,
    networkStatus,
    
    // Queue state
    queueStats,
    queuedOperations: getQueuedOperations(),
    
    // Sync state
    isSyncing,
    syncProgress,
    lastSyncTime,
    lastSyncResults,
    
    // Storage state
    storageStatus,
    
    // Actions
    sync,
    clearQueue,
    clearCache,
    getQueuedOperation,
    forceSync,
    enableOfflineMode,
    disableOfflineMode,
    
    // Advanced features
    exportOfflineData,
    importOfflineData,
    getOfflineReport,
  };
}