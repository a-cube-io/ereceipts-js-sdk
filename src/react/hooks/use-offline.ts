import { useCallback } from 'react';
import { useACube } from '../context';
import { BatchSyncResult } from '../../';

/**
 * Offline hook return type
 */
export interface UseOfflineReturn {
  isOnline: boolean;
  pendingOperations: number;
  sync: () => Promise<BatchSyncResult | null>;
  retryFailed: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  clearFailed: () => Promise<void>;
  clearAll: () => Promise<void>;
  getQueueStats: () => any;
}

/**
 * Hook for offline operations management
 */
export function useOffline(): UseOfflineReturn {
  const { sdk, isOnline, pendingOperations } = useACube();

  const sync = useCallback(async (): Promise<BatchSyncResult | null> => {
    if (!sdk) {
      return null;
    }

    return await sdk.getOfflineManager().sync();
  }, [sdk]);

  const retryFailed = useCallback(async (): Promise<void> => {
    if (!sdk) {
      return;
    }

    await sdk.getOfflineManager().retryFailed();
  }, [sdk]);

  const clearCompleted = useCallback(async (): Promise<void> => {
    if (!sdk) {
      return;
    }

    await sdk.getOfflineManager().clearCompleted();
  }, [sdk]);

  const clearFailed = useCallback(async (): Promise<void> => {
    if (!sdk) {
      return;
    }

    await sdk.getOfflineManager().clearFailed();
  }, [sdk]);

  const clearAll = useCallback(async (): Promise<void> => {
    if (!sdk) {
      return;
    }

    await sdk.getOfflineManager().clearAll();
  }, [sdk]);

  const getQueueStats = useCallback(() => {
    if (!sdk) {
      return null;
    }

    return sdk.getOfflineManager().getQueueStats();
  }, [sdk]);

  return {
    isOnline,
    pendingOperations,
    sync,
    retryFailed,
    clearCompleted,
    clearFailed,
    clearAll,
    getQueueStats,
  };
}