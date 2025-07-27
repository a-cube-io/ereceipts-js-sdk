/**
 * useACubeMutation - Enhanced mutation hook with optimistic updates
 * Handles create, update, delete operations with automatic cache invalidation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ACubeSDK } from '../../core/sdk';
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
}

export function useACubeMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables, sdk: ACubeSDK) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {}
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
  } = options;

  const [state, setState] = useState<{
    data: TData | undefined;
    error: Error | null;
    isLoading: boolean;
    failureCount: number;
    status: 'idle' | 'loading' | 'error' | 'success';
    context: any;
  }>({
    data: undefined,
    error: null,
    isLoading: false,
    failureCount: 0,
    status: 'idle',
    context: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get SDK instance from context
  const sdk = useACubeSDK(); // This would need to be implemented

  const executeMutation = useCallback(async (variables: TVariables, isRetry = false): Promise<TData> => {
    if (!sdk) {
      throw new Error('SDK not available');
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    if (!isRetry) {
      setState(prev => ({
        ...prev,
        isLoading: true,
        status: 'loading',
        error: null,
      }));
    }

    let context: any;
    
    try {
      // Call onMutate for optimistic updates
      if (onMutate) {
        context = await onMutate(variables);
        setState(prev => ({ ...prev, context }));
      }

      // Apply optimistic update to cache
      if (optimisticUpdate && queryUtils) {
        const optimisticData = optimisticUpdate(variables);
        // Apply optimistic updates to relevant queries
        if (invalidateQueries) {
          const keys = Array.isArray(invalidateQueries) ? invalidateQueries : [invalidateQueries];
          keys.forEach(key => {
            queryUtils.setQueryData(key, optimisticData);
          });
        }
      }

      // Execute the mutation
      const data = await mutationFn(variables, sdk);

      setState({
        data,
        error: null,
        isLoading: false,
        failureCount: 0,
        status: 'success',
        context,
      });

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

      // Call success callback
      onSuccess?.(data, variables);
      onSettled?.(data, null, variables);

      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Revert optimistic updates on error
      if (optimisticUpdate && context && queryUtils) {
        // This would revert optimistic updates
        // Implementation depends on how context is structured
      }

      setState(prev => {
        const newFailureCount = prev.failureCount + 1;
        const shouldRetry = typeof retry === 'function' 
          ? retry(newFailureCount, err)
          : typeof retry === 'number' 
            ? newFailureCount < retry
            : retry && newFailureCount < 3;

        if (shouldRetry) {
          const delay = typeof retryDelay === 'function' 
            ? retryDelay(newFailureCount) 
            : retryDelay;
          
          retryTimeoutRef.current = setTimeout(() => {
            executeMutation(variables, true);
          }, delay);

          return {
            ...prev,
            failureCount: newFailureCount,
          };
        }

        return {
          data: undefined,
          error: err,
          isLoading: false,
          failureCount: newFailureCount,
          status: 'error',
          context,
        };
      });

      // Call error callbacks
      onError?.(err, variables);
      onSettled?.(undefined, err, variables);

      throw err;
    }
  }, [sdk, mutationFn, onMutate, onSuccess, onError, onSettled, retry, retryDelay, optimisticUpdate, invalidateQueries, updateQueries, queryUtils]);

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      return await executeMutation(variables);
    } catch (error) {
      // Mutation errors are handled in executeMutation
      // This is for the async version
      throw error;
    }
  }, [executeMutation]);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    return await executeMutation(variables);
  }, [executeMutation]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    setState({
      data: undefined,
      error: null,
      isLoading: false,
      failureCount: 0,
      status: 'idle',
      context: undefined,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    isIdle: state.status === 'idle',
    mutate,
    mutateAsync,
    reset,
  };
}


// Hook to get SDK from React context - placeholder implementation
// This would be provided by ACubeProvider
function useACubeSDK(): ACubeSDK {
  throw new Error('useACubeSDK must be used within ACubeProvider');
}