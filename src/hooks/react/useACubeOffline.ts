/**
 * useACubeOffline - Offline state management and queue synchronization
 * Handles offline scenarios with automatic retry and data persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ACubeSDK } from '@/core/sdk';

export interface OfflineQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  optimisticId?: string;
}

export interface OfflineOptions {
  enabled?: boolean;
  maxQueueSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  persistQueue?: boolean;
  syncOnReconnect?: boolean;
  conflictResolution?: 'client' | 'server' | 'merge';
}

export interface OfflineResult {
  isOnline: boolean;
  isOffline: boolean;
  queueSize: number;
  queuedOperations: OfflineQueueItem[];
  lastSyncTime: number | null;
  isSyncing: boolean;
  syncProgress: number;
  addToQueue: (operation: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => string;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  sync: () => Promise<void>;
  retry: (id: string) => Promise<void>;
  getQueuedOperation: (id: string) => OfflineQueueItem | undefined;
}

const STORAGE_KEY = 'acube-offline-queue';

export function useACubeOffline(options: OfflineOptions = {}): OfflineResult {
  const {
    enabled = true,
    maxQueueSize = 100,
    maxRetries = 3,
    retryDelay = 1000,
    persistQueue = true,
    syncOnReconnect = true,
    conflictResolution = 'server', // TODO: implement conflict resolution logic
  } = options;

  // Store configuration for future conflict resolution implementation
  const config = { conflictResolution };
  
  // Debug configuration on mount (will be used in conflict resolution)
  useEffect(() => {
    console.debug('Offline hook initialized with config:', config);
  }, []);

  const [state, setState] = useState<{
    isOnline: boolean;
    queue: OfflineQueueItem[];
    lastSyncTime: number | null;
    isSyncing: boolean;
    syncProgress: number;
  }>(() => {
    // Load queue from storage on initialization
    let initialQueue: OfflineQueueItem[] = [];
    if (persistQueue && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          initialQueue = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Failed to load offline queue from storage:', error);
      }
    }

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      queue: initialQueue,
      lastSyncTime: null,
      isSyncing: false,
      syncProgress: 0,
    };
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sdk = useACubeSDK(); // Would need to be implemented

  // Save queue to storage
  const saveQueue = useCallback((queue: OfflineQueueItem[]) => {
    if (persistQueue && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      } catch (error) {
        console.warn('Failed to save offline queue to storage:', error);
      }
    }
  }, [persistQueue]);

  // Add operation to queue
  const addToQueue = useCallback((operation: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): string => {
    if (!enabled) return '';

    const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const queueItem: OfflineQueueItem = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries ?? maxRetries,
    };

    setState(prev => {
      let newQueue = [...prev.queue, queueItem];
      
      // Enforce max queue size (remove oldest items)
      if (newQueue.length > maxQueueSize) {
        newQueue = newQueue.slice(-maxQueueSize);
      }

      saveQueue(newQueue);
      return { ...prev, queue: newQueue };
    });

    // Try to sync immediately if online
    if (state.isOnline && !state.isSyncing) {
      setTimeout(() => sync(), 100);
    }

    return id;
  }, [enabled, maxRetries, maxQueueSize, saveQueue, state.isOnline, state.isSyncing]);

  // Remove operation from queue
  const removeFromQueue = useCallback((id: string) => {
    setState(prev => {
      const newQueue = prev.queue.filter(item => item.id !== id);
      saveQueue(newQueue);
      return { ...prev, queue: newQueue };
    });
  }, [saveQueue]);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setState(prev => {
      saveQueue([]);
      return { ...prev, queue: [] };
    });
  }, [saveQueue]);

  // Sync queued operations
  const sync = useCallback(async () => {
    if (!enabled || !sdk || !state.isOnline || state.isSyncing || state.queue.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));

    const successfulIds: string[] = [];
    const failedItems: OfflineQueueItem[] = [];

    for (let i = 0; i < state.queue.length; i++) {
      const item = state.queue[i];
      if (!item) {
        console.warn('Skipping undefined queue item at index', i);
        continue;
      }
      
      setState(prev => ({
        ...prev,
        syncProgress: ((i + 1) / state.queue.length) * 100,
      }));

      try {
        await executeQueuedOperation(sdk, item);
        successfulIds.push(item.id);
      } catch (error) {
        console.warn(`Failed to sync operation ${item.id}:`, error);
        
        const updatedItem: OfflineQueueItem = {
          id: item.id,
          operation: item.operation,
          resource: item.resource,
          data: item.data,
          timestamp: item.timestamp,
          maxRetries: item.maxRetries,
          retryCount: item.retryCount + 1,
          ...(item.optimisticId && { optimisticId: item.optimisticId }),
        };

        if (updatedItem.retryCount < (updatedItem.maxRetries ?? maxRetries)) {
          failedItems.push(updatedItem);
        } else {
          console.error(`Operation ${item.id} exceeded max retries and will be removed`);
        }
      }
    }

    // Update queue with failed items only
    setState(prev => {
      const newQueue = failedItems;
      saveQueue(newQueue);
      return {
        ...prev,
        queue: newQueue,
        isSyncing: false,
        syncProgress: 100,
        lastSyncTime: Date.now(),
      };
    });

    // Schedule retry for failed items
    if (failedItems.length > 0) {
      syncTimeoutRef.current = setTimeout(() => {
        sync();
      }, retryDelay * Math.pow(2, failedItems[0]?.retryCount ?? 0));
    }
  }, [enabled, sdk, state.isOnline, state.isSyncing, state.queue, saveQueue, retryDelay]);

  // Retry specific operation
  const retry = useCallback(async (id: string) => {
    const item = state.queue.find(op => op.id === id);
    if (!item || !sdk) {
      console.warn('Item or SDK not available for retry');
      return;
    }

    try {
      await executeQueuedOperation(sdk, item);
      removeFromQueue(id);
    } catch (error) {
      setState(prev => ({
        ...prev,
        queue: prev.queue.map(op => 
          op.id === id 
            ? { ...op, retryCount: op.retryCount + 1 }
            : op
        ),
      }));
      throw error;
    }
  }, [state.queue, sdk, removeFromQueue]);

  // Get specific queued operation
  const getQueuedOperation = useCallback((id: string): OfflineQueueItem | undefined => {
    return state.queue.find(item => item.id === id);
  }, [state.queue]);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      
      if (syncOnReconnect && state.queue.length > 0) {
        // Delay sync to allow connection to stabilize
        setTimeout(() => sync(), 1000);
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      
      // Cancel any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOnReconnect, state.queue.length, sync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOnline: state.isOnline,
    isOffline: !state.isOnline,
    queueSize: state.queue.length,
    queuedOperations: state.queue,
    lastSyncTime: state.lastSyncTime,
    isSyncing: state.isSyncing,
    syncProgress: state.syncProgress,
    addToQueue,
    removeFromQueue,
    clearQueue,
    sync,
    retry,
    getQueuedOperation,
  };
}

// Execute a queued operation
async function executeQueuedOperation(sdk: ACubeSDK, item: OfflineQueueItem): Promise<void> {
  switch (item.operation) {
    case 'create':
      await executeCreateOperation(sdk, item);
      break;
    case 'update':
      await executeUpdateOperation(sdk, item);
      break;
    case 'delete':
      await executeDeleteOperation(sdk, item);
      break;
    default:
      throw new Error(`Unknown operation: ${item.operation}`);
  }
}

async function executeCreateOperation(sdk: ACubeSDK, item: OfflineQueueItem): Promise<void> {
  switch (item.resource) {
    case 'receipts':
      await sdk.receipts.create(item.data);
      break;
    case 'cashiers':
      await sdk.cashiers.create(item.data);
      break;
    // Add other resources as needed
    default:
      throw new Error(`Unknown resource for create: ${item.resource}`);
  }
}

async function executeUpdateOperation(sdk: ACubeSDK, item: OfflineQueueItem): Promise<void> {
  switch (item.resource) {
    case 'receipts':
      await sdk.receipts.update(item.data.id, item.data);
      break;
    case 'cashiers':
      await sdk.cashiers.update(item.data.id, item.data);
      break;
    // Add other resources as needed
    default:
      throw new Error(`Unknown resource for update: ${item.resource}`);
  }
}

async function executeDeleteOperation(sdk: ACubeSDK, item: OfflineQueueItem): Promise<void> {
  switch (item.resource) {
    case 'receipts':
      await sdk.receipts.delete(item.data.id);
      break;
    case 'cashiers':
      await sdk.cashiers.delete(item.data.id);
      break;
    // Add other resources as needed
    default:
      throw new Error(`Unknown resource for delete: ${item.resource}`);
  }
}

// Placeholder for SDK context hook
function useACubeSDK(): ACubeSDK {
  throw new Error('useACubeSDK must be used within ACubeProvider');
}