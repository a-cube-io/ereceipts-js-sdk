/**
 * useACubeMutation - Enhanced mutation hook with optimistic updates and offline support
 * Handles create, update, delete operations with automatic cache invalidation and queue management
 */

import type { ACubeSDK } from '@/core/sdk';
import type { QueueItem } from '@/storage/queue/queue-manager';

import { createQueueItemId } from '@/storage/queue/types';
import { useRef, useState, useEffect, useCallback } from 'react';

import { useACube } from './ACubeProvider';
import { queryUtils } from './useACubeQuery';

export interface MutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => Promise<void> | void;
  retry?: boolean | number | ((failureCount: number, error: Error) => boolean);
  retryDelay?: number | ((retryAttempt: number) => number);
  optimisticUpdate?: (variables: TVariables) => any;
  invalidateQueries?: string | string[];
  updateQueries?: Record<string, (oldData: any, newData: TData, variables: TVariables) => any>;
  // Offline-first enhancements
  queueIfOffline?: boolean;
  optimisticUpdateDuration?: number; // ms
  rollbackOnError?: boolean;
  persistOptimisticUpdates?: boolean;
  mutationType?: 'create' | 'update' | 'delete' | 'custom';
  priority?: 'critical' | 'high' | 'normal' | 'low';
  resourceType?: string;
  conflictResolution?: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  onQueued?: (queueId: string) => void;
  onOptimisticUpdate?: (optimisticData: any) => void;
  onOptimisticRevert?: (originalData: any) => void;
}

export interface MutationResult<TData, TVariables> {
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isIdle: boolean;
  failureCount: number;
  status: 'idle' | 'loading' | 'error' | 'success';
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
  context: any;
  // Offline-first enhancements
  isOptimistic: boolean;
  isQueued: boolean;
  queueId?: string;
  syncStatus: 'synced' | 'pending' | 'failed' | 'queued' | 'unknown';
  isOffline: boolean;
  canRetryOffline: boolean;
  // Actions
  revertOptimistic: () => void;
  forceSync: () => Promise<void>;
}

export function useACubeMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables, sdk: ACubeSDK) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {},
): MutationResult<TData, TVariables> {
  const {
    onSuccess,
    onError,
    onSettled,
    onMutate,
    retry = false,
    retryDelay = (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    optimisticUpdate,
    invalidateQueries,
    updateQueries = {},
    // Offline-first options
    queueIfOffline = true,
    optimisticUpdateDuration = 30000, // 30 seconds
    rollbackOnError = true,
    persistOptimisticUpdates = false,
    mutationType = 'custom',
    priority = 'normal',
    resourceType = 'default',
    conflictResolution = 'client-wins',
    onQueued,
    onOptimisticUpdate,
    onOptimisticRevert,
  } = options;

  const [state, setState] = useState<{
    data: TData | undefined;
    error: Error | null;
    isLoading: boolean;
    failureCount: number;
    status: 'idle' | 'loading' | 'error' | 'success';
    context: any;
    isOptimistic: boolean;
    isQueued: boolean;
    queueId?: string;
    syncStatus: 'synced' | 'pending' | 'failed' | 'queued' | 'unknown';
    originalData?: any;
  }>({
    data: undefined,
    error: null,
    isLoading: false,
    failureCount: 0,
    status: 'idle',
    context: undefined,
    isOptimistic: false,
    isQueued: false,
    syncStatus: 'unknown',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optimisticTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get SDK and offline systems from context
  const {
    sdk,
    storage,
    queueManager,
    isOnline,
    isOfflineEnabled,
  } = useACube();

  const executeMutation = useCallback(async (variables: TVariables, isRetry = false): Promise<TData> => {
    if (!sdk) {
      throw new Error('SDK not available');
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }

    abortControllerRef.current = new AbortController();

    if (!isRetry) {
      setState(prev => ({
        ...prev,
        isLoading: true,
        status: 'loading',
        error: null,
        syncStatus: 'pending',
      }));
    }

    let context: any;
    let optimisticData: any;
    const originalQueryData: Record<string, any> = {};

    try {
      // Call onMutate for optimistic updates
      if (onMutate) {
        context = await onMutate(variables);
        setState(prev => ({ ...prev, context }));
      }

      // Apply optimistic update to cache
      if (optimisticUpdate) {
        optimisticData = optimisticUpdate(variables);

        // Store original data for rollback
        if (invalidateQueries) {
          const keys = Array.isArray(invalidateQueries) ? invalidateQueries : [invalidateQueries];
          keys.forEach(key => {
            originalQueryData[key] = queryUtils.getQueryData(key);
            queryUtils.setQueryData(key, optimisticData);
          });
        }

        // Update state to reflect optimistic update
        setState(prev => ({
          ...prev,
          data: optimisticData,
          isOptimistic: true,
          originalData: originalQueryData,
          syncStatus: 'pending',
        }));

        onOptimisticUpdate?.(optimisticData);

        // Set timeout to revert optimistic update if mutation takes too long
        if (optimisticUpdateDuration > 0) {
          optimisticTimeoutRef.current = setTimeout(() => {
            if (rollbackOnError) {
              revertOptimisticUpdates(originalQueryData);
            }
          }, optimisticUpdateDuration) as unknown as NodeJS.Timeout;
        }
      }

      // Check if we should go offline-first
      if (!isOnline && queueIfOffline && isOfflineEnabled && queueManager) {
        return await queueMutation(variables, context, optimisticData);
      }

      // Execute the mutation online
      const data = await mutationFn(variables, sdk);

      // Clear optimistic timeout since we got real data
      if (optimisticTimeoutRef.current) {
        clearTimeout(optimisticTimeoutRef.current);
      }

      setState(prev => ({
        ...prev,
        data,
        error: null,
        isLoading: false,
        failureCount: 0,
        status: 'success',
        isOptimistic: false,
        syncStatus: 'synced',
        originalData: undefined,
      }));

      // Update cache with real data
      if (queryUtils) {
        // Invalidate specified queries
        if (invalidateQueries) {
          if (Array.isArray(invalidateQueries)) {
            invalidateQueries.forEach(key => queryUtils.invalidateQueries(key));
          } else {
            queryUtils.invalidateQueries(invalidateQueries);
          }
        }

        // Update specific queries
        Object.entries(updateQueries).forEach(([queryKey, updateFn]) => {
          const oldData = queryUtils.getQueryData(queryKey);
          if (oldData !== undefined) {
            const newData = updateFn(oldData, data, variables);
            queryUtils.setQueryData(queryKey, newData);
          }
        });
      }

      // Persist to storage if enabled
      if (persistOptimisticUpdates && storage && isOfflineEnabled) {
        try {
          const storageKey = `mutation:${mutationType}:${Date.now()}`;
          await storage.set(storageKey as any, { data, variables, timestamp: Date.now() } as any);
        } catch (error) {
          console.warn('Failed to persist mutation result:', error);
        }
      }

      // Call success callback
      onSuccess?.(data, variables);
      onSettled?.(data, null, variables);

      return data;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Clear optimistic timeout
      if (optimisticTimeoutRef.current) {
        clearTimeout(optimisticTimeoutRef.current);
      }

      // Handle offline scenario
      if (!isOnline && queueIfOffline && isOfflineEnabled && queueManager) {
        try {
          return await queueMutation(variables, context, optimisticData);
        } catch (queueError) {
          // If queuing fails, continue with error handling
          console.warn('Failed to queue mutation:', queueError);
        }
      }

      // Revert optimistic updates on error
      if (rollbackOnError && optimisticUpdate && Object.keys(originalQueryData).length > 0) {
        revertOptimisticUpdates(originalQueryData);
        onOptimisticRevert?.(originalQueryData);
      }

      setState(prev => {
        const newFailureCount = prev.failureCount + 1;
        const shouldRetry = typeof retry === 'function'
          ? retry(newFailureCount, err)
          : typeof retry === 'number'
            ? newFailureCount < retry
            : retry && newFailureCount < 3;

        if (shouldRetry && isOnline) {
          const delay = typeof retryDelay === 'function'
            ? retryDelay(newFailureCount)
            : retryDelay;

          retryTimeoutRef.current = setTimeout(() => {
            executeMutation(variables, true);
          }, delay) as unknown as NodeJS.Timeout;

          return {
            ...prev,
            failureCount: newFailureCount,
            syncStatus: 'pending',
          };
        }

        return {
          ...prev,
          data: optimisticData || undefined,
          error: err,
          isLoading: false,
          failureCount: newFailureCount,
          status: 'error',
          isOptimistic: Boolean(optimisticData),
          syncStatus: 'failed',
          context,
        };
      });

      // Call error callbacks
      onError?.(err, variables);
      onSettled?.(undefined, err, variables);

      throw err;
    }
  }, [sdk, mutationFn, onMutate, onSuccess, onError, onSettled, retry, retryDelay, optimisticUpdate, invalidateQueries, updateQueries, isOnline, queueIfOffline, isOfflineEnabled, queueManager, rollbackOnError, optimisticUpdateDuration, persistOptimisticUpdates, storage, mutationType, onOptimisticUpdate, onOptimisticRevert]);

  // Helper function to queue mutations for offline execution
  const queueMutation = useCallback(async (
    variables: TVariables,
    context: any,
    optimisticData: any,
  ): Promise<TData> => {
    if (!queueManager) {
      throw new Error('Queue manager not available');
    }

    const queueId = createQueueItemId(`mutation_${Date.now()}_${Math.random().toString(36).substring(2)}`);

    const queueItem: QueueItem = {
      id: queueId,
      operation: mutationType === 'create' ? 'create' : mutationType === 'update' ? 'update' : mutationType === 'delete' ? 'delete' : 'custom',
      resource: resourceType as any,
      data: {
        variables,
        context,
        mutationFn: mutationFn.toString(), // Note: This won't work for complex functions
        options: { ...options },
      },
      priority,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      retryStrategy: 'exponential',
      conflictResolution,
    };

    await queueManager.add(queueItem);

    setState(prev => ({
      ...prev,
      isQueued: true,
      queueId,
      syncStatus: 'queued',
      data: optimisticData,
      isLoading: false,
      status: 'success', // Success in the sense that it's queued
    }));

    onQueued?.(queueId);
    onSuccess?.(optimisticData, variables);
    onSettled?.(optimisticData, null, variables);

    return optimisticData;
  }, [queueManager, mutationType, resourceType, priority, conflictResolution, options, onQueued, onSuccess, onSettled]);

  // Helper function to revert optimistic updates
  const revertOptimisticUpdates = useCallback((originalQueryData: Record<string, any>) => {
    Object.entries(originalQueryData).forEach(([key, data]) => {
      if (data !== undefined) {
        queryUtils.setQueryData(key, data);
      } else {
        queryUtils.removeQuery(key);
      }
    });

    setState(prev => ({
      ...prev,
      isOptimistic: false,
      data: undefined,
      ...(prev.originalData && { originalData: undefined }),
    }));
  }, []);

  // Helper function to force sync a queued mutation
  const forceSync = useCallback(async (): Promise<void> => {
    if (!state.queueId || !queueManager) {
      return;
    }

    try {
      const queueItems = queueManager.getQueueItems();
      const item = queueItems.find(item => item.id === state.queueId);

      if (item) {
        await queueManager.processItem(item);
        setState(prev => {
          const newState = {
            ...prev,
            isQueued: false,
            syncStatus: 'synced' as const,
          };
          delete (newState as any).queueId;
          return newState;
        });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncStatus: 'failed',
        error: error instanceof Error ? error : new Error('Force sync failed'),
      }));
      throw error;
    }
  }, [state.queueId, queueManager]);

  // Helper function to revert optimistic updates manually
  const revertOptimistic = useCallback(() => {
    if (state.originalData) {
      revertOptimisticUpdates(state.originalData);
      onOptimisticRevert?.(state.originalData);
    }
  }, [state.originalData, revertOptimisticUpdates, onOptimisticRevert]);

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      return await executeMutation(variables);
    } catch (error) {
      // Mutation errors are handled in executeMutation
      // This is for the async version
      throw error;
    }
  }, [executeMutation]);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => executeMutation(variables), [executeMutation]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }

    setState({
      data: undefined,
      error: null,
      isLoading: false,
      failureCount: 0,
      status: 'idle',
      context: undefined,
      isOptimistic: false,
      isQueued: false,
      syncStatus: 'unknown',
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (optimisticTimeoutRef.current) {
        clearTimeout(optimisticTimeoutRef.current);
      }
    }, []);

  return {
    ...state,
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    isIdle: state.status === 'idle',
    isOffline: !isOnline,
    canRetryOffline: Boolean(queueIfOffline && isOfflineEnabled && queueManager),
    mutate,
    mutateAsync,
    reset,
    revertOptimistic,
    forceSync,
  };
}

