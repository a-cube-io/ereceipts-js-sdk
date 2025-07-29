/**
 * Enhanced useACubeOffline Hook
 * Enterprise-grade offline state management with the new queue system
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EnterpriseQueueManager } from './queue-manager';
import type { ACubeSDK } from '@/core/sdk';
import type { 
  QueueItemId, 
  QueuePriority, 
  ResourceType, 
  QueueOperationType,
  QueueStats
} from './types';

export interface ProcessingResult {
  id: QueueItemId;
  success: boolean;
  error?: Error;
  retryCount?: number;
  processingTime?: number;
}

export interface EnhancedOfflineOptions {
  enabled?: boolean;
  maxQueueSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  persistQueue?: boolean;
  syncOnReconnect?: boolean;
  conflictResolution?: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  enableBatching?: boolean;
  batchSize?: number;
  batchTimeout?: number;
  enableAnalytics?: boolean;
  autoProcessing?: boolean;
  processingInterval?: number;
  priorityMapping?: Record<string, QueuePriority>;
}

export interface EnhancedOfflineResult {
  // Connection state
  isOnline: boolean;
  isOffline: boolean;
  
  // Queue state
  queueSize: number;
  queueStats: QueueStats;
  processingStatus: {
    isProcessing: boolean;
    processingItems: number;
    autoProcessing: boolean;
    readyItems: number;
  };
  
  // Queue operations
  addToQueue: (
    operation: QueueOperationType,
    resource: ResourceType,
    data: any,
    options?: {
      priority?: QueuePriority;
      optimisticId?: string;
      metadata?: Record<string, unknown>;
      scheduledAt?: number;
    }
  ) => Promise<QueueItemId>;
  
  removeFromQueue: (id: QueueItemId) => Promise<boolean>;
  getQueuedOperation: (id: QueueItemId) => any;
  clearQueue: () => Promise<void>;
  
  // Processing control
  sync: () => Promise<ProcessingResult[]>;
  pause: () => void;
  resume: () => void;
  
  // Analytics and insights
  getInsights: () => any;
  getTrendAnalysis: () => any;
  
  // Advanced features
  scheduleOperation: (
    operation: QueueOperationType,
    resource: ResourceType,
    data: any,
    scheduledAt: number,
    options?: { priority?: QueuePriority }
  ) => Promise<QueueItemId>;
  
  batchOperations: (
    operations: Array<{
      operation: QueueOperationType;
      resource: ResourceType;
      data: any;
      priority?: QueuePriority;
    }>
  ) => Promise<QueueItemId[]>;
  
  // Event subscriptions
  onQueueEvent: (event: string, handler: Function) => void;
  offQueueEvent: (event: string, handler: Function) => void;
}

const DEFAULT_OPTIONS: Required<EnhancedOfflineOptions> = {
  enabled: true,
  maxQueueSize: 1000,
  maxRetries: 3,
  retryDelay: 1000,
  persistQueue: true,
  syncOnReconnect: true,
  conflictResolution: 'server-wins',
  enableBatching: true,
  batchSize: 20,
  batchTimeout: 5000,
  enableAnalytics: true,
  autoProcessing: true,
  processingInterval: 2000,
  priorityMapping: {
    payment: 'critical',
    receipt: 'high',
    cashier: 'normal',
    settings: 'low',
  },
};

export function useEnhancedACubeOffline(
  options: EnhancedOfflineOptions = {}
): EnhancedOfflineResult {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    queueStats: {
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
      priorityDistribution: { critical: 0, high: 0, normal: 0, low: 0 },
      resourceDistribution: { 
        receipts: 0, 
        cashiers: 0, 
        merchants: 0, 
        'cash-registers': 0, 
        'point-of-sales': 0, 
        pems: 0 
      },
    } as QueueStats,
    processingStatus: {
      isProcessing: false,
      processingItems: 0,
      autoProcessing: config.autoProcessing,
      readyItems: 0,
    },
  }));

  const queueManagerRef = useRef<EnterpriseQueueManager | null>(null);
  const sdk = useACubeSDK();

  // Initialize queue manager
  useEffect(() => {
    if (!config.enabled || !sdk) return;

    const queueManager = new EnterpriseQueueManager({
      maxSize: config.maxQueueSize,
      maxRetries: config.maxRetries,
      defaultConflictResolution: config.conflictResolution,
      batchingEnabled: config.enableBatching,
      batchSize: config.batchSize,
      batchTimeout: config.batchTimeout,
      analyticsEnabled: config.enableAnalytics,
      autoProcessing: config.autoProcessing,
      processingInterval: config.processingInterval,
      enablePersistence: config.persistQueue,
    });

    // Register processors for each resource
    registerSDKProcessors(queueManager, sdk);

    // Set up event listeners
    setupQueueEventListeners(queueManager, setState);

    queueManagerRef.current = queueManager;

    return () => {
      queueManager.destroy();
      queueManagerRef.current = null;
    };
  }, [config, sdk]);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      
      if (config.syncOnReconnect && queueManagerRef.current) {
        // Delay sync to allow connection to stabilize
        setTimeout(() => {
          queueManagerRef.current?.resume();
        }, 1000);
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      
      // Pause auto-processing when offline
      if (queueManagerRef.current) {
        queueManagerRef.current.pause();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [config.syncOnReconnect]);

  // Queue operations
  const addToQueue = useCallback(async (
    operation: QueueOperationType,
    resource: ResourceType,
    data: any,
    options: {
      priority?: QueuePriority;
      optimisticId?: string;
      metadata?: Record<string, unknown>;
      scheduledAt?: number;
    } = {}
  ): Promise<QueueItemId> => {
    if (!queueManagerRef.current) {
      throw new Error('Queue manager not initialized');
    }

    // Auto-determine priority if not specified
    const priority = options.priority || 
      config.priorityMapping[operation] || 
      config.priorityMapping[resource] || 
      'normal';

    return queueManagerRef.current.enqueue(operation, resource, data, {
      ...options,
      priority,
    });
  }, [config.priorityMapping]);

  const removeFromQueue = useCallback(async (id: QueueItemId): Promise<boolean> => {
    if (!queueManagerRef.current) return false;
    return queueManagerRef.current.dequeue(id);
  }, []);

  const getQueuedOperation = useCallback((id: QueueItemId) => {
    if (!queueManagerRef.current) return null;
    return queueManagerRef.current.getItem(id);
  }, []);

  const clearQueue = useCallback(async (): Promise<void> => {
    if (!queueManagerRef.current) return;
    await queueManagerRef.current.clear();
  }, []);

  // Processing control
  const sync = useCallback(async (): Promise<ProcessingResult[]> => {
    if (!queueManagerRef.current || !state.isOnline) {
      return [];
    }

    const results = await queueManagerRef.current.processAll();
    // Transform queue-manager results to match expected interface
    return results.map((result, index) => ({
      id: `sync_${Date.now()}_${index}` as QueueItemId,
      success: result.success,
      ...(result.error && { error: new Error(result.error) }),
      ...(result.processingTime !== undefined && { processingTime: result.processingTime }),
    }));
  }, [state.isOnline]);

  const pause = useCallback(() => {
    if (!queueManagerRef.current) return;
    queueManagerRef.current.pause();
  }, []);

  const resume = useCallback(() => {
    if (!queueManagerRef.current) return;
    queueManagerRef.current.resume();
  }, []);

  // Analytics
  const getInsights = useCallback(() => {
    if (!queueManagerRef.current) return null;
    return queueManagerRef.current.getInsights();
  }, []);

  const getTrendAnalysis = useCallback(() => {
    if (!queueManagerRef.current) return null;
    return queueManagerRef.current.getTrendAnalysis();
  }, []);

  // Advanced features
  const scheduleOperation = useCallback(async (
    operation: QueueOperationType,
    resource: ResourceType,
    data: any,
    scheduledAt: number,
    options: { priority?: QueuePriority } = {}
  ): Promise<QueueItemId> => {
    return addToQueue(operation, resource, data, {
      ...options,
      scheduledAt,
    });
  }, [addToQueue]);

  const batchOperations = useCallback(async (
    operations: Array<{
      operation: QueueOperationType;
      resource: ResourceType;
      data: any;
      priority?: QueuePriority;
    }>
  ): Promise<QueueItemId[]> => {
    // Generate batch ID for tracking (not currently used but reserved for future batch operations)
    // const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const ids = await Promise.all(
      operations.map(op => 
        addToQueue(op.operation, op.resource, op.data, {
          ...(op.priority && { priority: op.priority }),
        })
      )
    );

    return ids;
  }, [addToQueue]);

  // Event subscriptions
  const onQueueEvent = useCallback((event: string, handler: Function) => {
    if (!queueManagerRef.current) return;
    queueManagerRef.current.on(event as any, handler as any);
  }, []);

  const offQueueEvent = useCallback((event: string, handler: Function) => {
    if (!queueManagerRef.current) return;
    queueManagerRef.current.off(event as any, handler as any);
  }, []);

  return {
    isOnline: state.isOnline,
    isOffline: !state.isOnline,
    queueSize: state.queueStats.totalItems,
    queueStats: state.queueStats,
    processingStatus: state.processingStatus,
    addToQueue,
    removeFromQueue,
    getQueuedOperation,
    clearQueue,
    sync,
    pause,
    resume,
    getInsights,
    getTrendAnalysis,
    scheduleOperation,
    batchOperations,
    onQueueEvent,
    offQueueEvent,
  };
}

// Helper functions
function registerSDKProcessors(queueManager: EnterpriseQueueManager, sdk: ACubeSDK): void {
  // Register processors for each resource type
  
  // Receipts
  queueManager.registerProcessor('receipts', 'create', async (item) => {
    return sdk.receipts.create(item.data as any);
  });
  
  queueManager.registerProcessor('receipts', 'update', async (item) => {
    const data = item.data as any;
    return sdk.receipts.update(data.id, data);
  });
  
  queueManager.registerProcessor('receipts', 'delete', async (item) => {
    const data = item.data as any;
    return sdk.receipts.delete(data.id);
  });

  // Cashiers
  queueManager.registerProcessor('cashiers', 'create', async (item) => {
    return sdk.cashiers.create(item.data as any);
  });
  
  queueManager.registerProcessor('cashiers', 'update', async (item) => {
    const data = item.data as any;
    return sdk.cashiers.update(data.id, data);
  });
  
  queueManager.registerProcessor('cashiers', 'delete', async (item) => {
    const data = item.data as any;
    return sdk.cashiers.delete(data.id);
  });

  // Merchants
  queueManager.registerProcessor('merchants', 'create', async (item) => {
    return sdk.merchants.create(item.data as any);
  });
  
  queueManager.registerProcessor('merchants', 'update', async (item) => {
    const data = item.data as any;
    return sdk.merchants.update(data.id, data);
  });

  // Add other resources as needed...
}

function setupQueueEventListeners(
  queueManager: EnterpriseQueueManager, 
  setState: React.Dispatch<React.SetStateAction<any>>
): void {
  // Update stats on queue changes
  const updateStats = () => {
    setState((prev: any) => ({
      ...prev,
      queueStats: queueManager.getStats(),
      processingStatus: queueManager.getProcessingStatus(),
    }));
  };

  queueManager.on('item:added', updateStats);
  queueManager.on('item:completed', updateStats);
  queueManager.on('item:failed', updateStats);
  queueManager.on('item:processing', updateStats);
  queueManager.on('queue:drained', updateStats);
}

// Placeholder for SDK context hook
function useACubeSDK(): ACubeSDK {
  throw new Error('useACubeSDK must be used within ACubeProvider');
}