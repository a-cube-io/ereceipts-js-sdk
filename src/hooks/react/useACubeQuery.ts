/**
 * useACubeQuery - Enhanced data fetching hook with caching and optimistic updates
 * Inspired by React Query but tailored for A-Cube SDK
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ACubeSDK } from '@/core/sdk';

export interface QueryOptions<TData> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number | ((failureCount: number, error: Error) => boolean);
  retryDelay?: number | ((retryAttempt: number) => number);
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  select?: (data: TData) => any;
  initialData?: TData;
  placeholderData?: TData;
}

export interface QueryResult<TData> {
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
  remove: () => void;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  failureCount: number;
  isPaused: boolean;
  status: 'idle' | 'loading' | 'error' | 'success';
}

interface QueryCache<TData> {
  data: TData;
  timestamp: number;
  error: Error | null;
  isStale: boolean;
}

// Global query cache
const queryCache = new Map<string, QueryCache<any>>();

// Global cache garbage collection
let cacheCleanupInterval: NodeJS.Timeout | null = null;

function startCacheCleanup() {
  if (cacheCleanupInterval) return;
  
  cacheCleanupInterval = setInterval(() => {
    const now = Date.now();
    const staleEntries: string[] = [];
    
    queryCache.forEach((cache, key) => {
      // Remove entries older than default cache time (5 minutes)
      if (now - cache.timestamp > 300000) {
        staleEntries.push(key);
      }
    });
    
    staleEntries.forEach(key => queryCache.delete(key));
  }, 60000); // Run every minute
}

// Start cleanup when module loads
startCacheCleanup();

export function useACubeQuery<TData = unknown>(
  queryKey: string | string[],
  queryFn: (sdk: ACubeSDK) => Promise<TData>,
  options: QueryOptions<TData> = {}
): QueryResult<TData> {
  const {
    enabled = true,
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
    refetchInterval,
    staleTime = 0,
    cacheTime = 300000, // 5 minutes - used for cache cleanup logic
    retry = 3,
    retryDelay = (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    onSuccess,
    onError,
    select,
    initialData,
    placeholderData,
  } = options;

  const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  
  const [state, setState] = useState<{
    data: TData | undefined;
    error: Error | null;
    isLoading: boolean;
    isFetching: boolean;
    isStale: boolean;
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    status: 'idle' | 'loading' | 'error' | 'success';
  }>(() => {
    const cached = queryCache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < staleTime) {
      return {
        data: select ? select(cached.data) : cached.data,
        error: cached.error,
        isLoading: false,
        isFetching: false,
        isStale: false,
        dataUpdatedAt: cached.timestamp,
        errorUpdatedAt: cached.error ? cached.timestamp : 0,
        failureCount: 0,
        status: cached.error ? 'error' : 'success',
      };
    }
    
    return {
      data: initialData || placeholderData,
      error: null,
      isLoading: enabled,
      isFetching: enabled,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      status: enabled ? 'loading' : 'idle',
    };
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get SDK instance from context (would need to be provided by ACubeProvider)
  const sdk = useACubeSDK(); // This would need to be implemented

  const fetchData = useCallback(async (isRefetch = false) => {
    if (!enabled || !sdk) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isFetching: true,
      isLoading: prev.data === undefined,
      ...(isRefetch && { isStale: false }),
    }));

    try {
      const data = await queryFn(sdk);
      const now = Date.now();
      
      // Update cache
      queryCache.set(key, {
        data,
        timestamp: now,
        error: null,
        isStale: false,
      });

      const processedData = select ? select(data) : data;

      setState({
        data: processedData,
        error: null,
        isLoading: false,
        isFetching: false,
        isStale: false,
        dataUpdatedAt: now,
        errorUpdatedAt: 0,
        failureCount: 0,
        status: 'success',
      });

      onSuccess?.(data);
    } catch (error) {
      const now = Date.now();
      const err = error instanceof Error ? error : new Error(String(error));
      
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
            fetchData(true);
          }, delay);

          return {
            ...prev,
            failureCount: newFailureCount,
            isFetching: false,
            isLoading: false,
          };
        }

        // Update cache with error
        queryCache.set(key, {
          data: prev.data as TData,
          timestamp: now,
          error: err,
          isStale: true,
        });

        onError?.(err);

        return {
          ...prev,
          error: err,
          isLoading: false,
          isFetching: false,
          errorUpdatedAt: now,
          failureCount: newFailureCount,
          status: 'error',
        };
      });
    }
  }, [enabled, sdk, queryFn, key, retry, retryDelay, select, onSuccess, onError]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const remove = useCallback(() => {
    queryCache.delete(key);
    setState(prev => ({
      ...prev,
      data: undefined,
      error: null,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      status: 'idle',
    }));
  }, [key]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchData, enabled]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled && state.status === 'success') {
      refetchIntervalRef.current = setInterval(() => {
        fetchData(true);
      }, refetchInterval);
    }

    return () => {
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, [refetchInterval, enabled, state.status, fetchData]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (enabled && state.status === 'success') {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, state.status, fetchData]);

  // Network reconnect refetch
  useEffect(() => {
    if (!refetchOnReconnect) return;

    const handleOnline = () => {
      if (enabled && state.status === 'success') {
        fetchData(true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, enabled, state.status, fetchData]);

  // Mark data as stale after staleTime and manage cache cleanup
  useEffect(() => {
    if (staleTime && state.data && state.status === 'success') {
      const timeout = setTimeout(() => {
        setState(prev => ({ ...prev, isStale: true }));
      }, staleTime);
      
      return () => clearTimeout(timeout);
    }
    // Schedule cache cleanup based on cacheTime
    if (cacheTime && state.data && state.status === 'success') {
      const cleanupTimeout = setTimeout(() => {
        queryCache.delete(key);
      }, cacheTime);
      
      return () => clearTimeout(cleanupTimeout);
    }
    // Return empty cleanup function for all code paths
    return () => {};
  }, [staleTime, cacheTime, state.data, state.status, key]);

  return {
    ...state,
    isError: state.status === 'error',
    isSuccess: state.status === 'success',
    isPaused: false, // Could be implemented for network-aware pausing
    refetch,
    remove,
  };
}

// Placeholder for SDK context hook
function useACubeSDK(): ACubeSDK {
  // This would be implemented to get SDK from React context
  throw new Error('useACubeSDK must be used within ACubeProvider');
}

// Export cache utilities for advanced usage
export const queryUtils = {
  getQueryData: <T>(key: string | string[]): T | undefined => {
    const cacheKey = Array.isArray(key) ? key.join(':') : key;
    return queryCache.get(cacheKey)?.data;
  },
  
  setQueryData: <T>(key: string | string[], data: T): void => {
    const cacheKey = Array.isArray(key) ? key.join(':') : key;
    queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      error: null,
      isStale: false,
    });
  },
  
  invalidateQueries: (keyPrefix?: string): void => {
    if (keyPrefix) {
      queryCache.forEach((_, key) => {
        if (key.startsWith(keyPrefix)) {
          queryCache.delete(key);
        }
      });
    } else {
      queryCache.clear();
    }
  },
  
  removeQuery: (key: string | string[]): void => {
    const cacheKey = Array.isArray(key) ? key.join(':') : key;
    queryCache.delete(cacheKey);
  },
};