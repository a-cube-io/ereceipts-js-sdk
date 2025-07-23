import { useCallback, useEffect, useState } from 'react';
import { getAPIClient } from '../api/client';
import { RequestQueue } from '../storage/queue';
import { addNetworkListener, isConnected } from '../utils/network';
import { networkLogger } from '../utils/logger';

export interface QueueStats {
  total: number;
  byPriority: { high: number; medium: number; low: number };
  oldestTimestamp?: number;
  newestTimestamp?: number;
}

export interface UseRetryQueueReturn {
  stats: QueueStats;
  isProcessing: boolean;
  isConnected: boolean;
  processQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useRetryQueue = (): UseRetryQueueReturn => {
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    byPriority: { high: 0, medium: 0, low: 0 },
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [networkConnected, setNetworkConnected] = useState(isConnected());

  const refreshStats = useCallback(async () => {
    try {
      const queueStats = await RequestQueue.getQueueStats();
      setStats(queueStats);
    } catch (error) {
      networkLogger.error('Failed to refresh queue stats', error);
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || !networkConnected) {
      return;
    }

    try {
      setIsProcessing(true);
      networkLogger.info('Starting manual queue processing');
      
      const client = getAPIClient();
      await client.processOfflineQueue();
      
      // Refresh stats after processing
      await refreshStats();
      
      networkLogger.info('Manual queue processing completed');
    } catch (error) {
      networkLogger.error('Manual queue processing failed', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, networkConnected, refreshStats]);

  const clearQueue = useCallback(async () => {
    try {
      networkLogger.info('Clearing retry queue');
      
      await RequestQueue.clearQueue();
      await refreshStats();
      
      networkLogger.info('Retry queue cleared');
    } catch (error) {
      networkLogger.error('Failed to clear retry queue', error);
    }
  }, [refreshStats]);

  // Auto-process queue when network comes back online
  useEffect(() => {
    let processingTimeout: NodeJS.Timeout;

    const handleNetworkChange = async (state: { isConnected: boolean }) => {
      setNetworkConnected(state.isConnected);
      
      if (state.isConnected && !isProcessing) {
        // Wait a bit for network to stabilize before processing
        processingTimeout = setTimeout(async () => {
          try {
            networkLogger.info('Network reconnected, auto-processing queue');
            await processQueue();
          } catch (error) {
            networkLogger.error('Auto queue processing failed', error);
          }
        }, 2000);
      }
    };

    const unsubscribe = addNetworkListener(handleNetworkChange);

    return () => {
      unsubscribe();
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [processQueue, isProcessing]);

  // Refresh stats periodically
  useEffect(() => {
    // Initial load
    refreshStats();

    // Set up periodic refresh
    const interval = setInterval(refreshStats, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [refreshStats]);

  // Monitor queue changes by polling (could be optimized with events)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isProcessing) {
        await refreshStats();
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isProcessing, refreshStats]);

  return {
    stats,
    isProcessing,
    isConnected: networkConnected,
    processQueue,
    clearQueue,
    refreshStats,
  };
};