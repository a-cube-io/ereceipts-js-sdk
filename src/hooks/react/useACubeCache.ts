/**
 * useACubeCache - Advanced cache management hook
 * Provides fine-grained control over query cache
 */

import { useCallback, useEffect, useState } from 'react';

export interface CacheOptions {
  staleTime?: number;
  cacheTime?: number;
  backgroundRefetch?: boolean;
  persistToStorage?: boolean;
  storageKey?: string;
}

export interface CacheResult<TData> {
  data: TData | undefined;
  isStale: boolean;
  isCached: boolean;
  lastUpdated: number | null;
  cacheSize: number;
  set: (key: string, data: TData, options?: { ttl?: number }) => void;
  get: (key: string) => TData | undefined;
  remove: (key: string) => void;
  clear: () => void;
  invalidate: (keyPrefix?: string) => void;
  prefetch: (key: string, fetcher: () => Promise<TData>) => Promise<void>;
  gc: () => void; // Garbage collection
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

// Global cache instance
const globalCache = new Map<string, CacheEntry<any>>();

export function useACubeCache<TData = unknown>(
  options: CacheOptions = {}
): CacheResult<TData> {
  const {
    staleTime = 300000, // 5 minutes
    cacheTime = 600000, // 10 minutes
    backgroundRefetch = true,
    persistToStorage = false,
    storageKey = 'acube-cache',
  } = options;

  const [cacheStats, setCacheStats] = useState({
    size: globalCache.size,
    lastUpdated: null as number | null,
  });

  // Load cache from storage on mount
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          Object.entries(data).forEach(([key, entry]: [string, any]) => {
            globalCache.set(key, entry);
          });
          setCacheStats({ size: globalCache.size, lastUpdated: Date.now() });
        }
      } catch (error) {
        console.warn('Failed to load cache from storage:', error);
      }
    }
  }, [persistToStorage, storageKey]);

  // Save cache to storage when it changes
  const saveToStorage = useCallback(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const cacheData = Object.fromEntries(globalCache);
        localStorage.setItem(storageKey, JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to save cache to storage:', error);
      }
    }
  }, [persistToStorage, storageKey]);

  const set = useCallback((key: string, data: TData, options?: { ttl?: number }) => {
    const entry: CacheEntry<TData> = {
      data,
      timestamp: Date.now(),
      ttl: options?.ttl || cacheTime,
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    globalCache.set(key, entry);
    setCacheStats({ size: globalCache.size, lastUpdated: Date.now() });
    saveToStorage();
  }, [cacheTime, saveToStorage]);

  const get = useCallback((key: string): TData | undefined => {
    const entry = globalCache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    
    // Check if entry is expired
    if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
      globalCache.delete(key);
      setCacheStats({ size: globalCache.size, lastUpdated: now });
      saveToStorage();
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }, [saveToStorage]);

  const remove = useCallback((key: string) => {
    globalCache.delete(key);
    setCacheStats({ size: globalCache.size, lastUpdated: Date.now() });
    saveToStorage();
  }, [saveToStorage]);

  const clear = useCallback(() => {
    globalCache.clear();
    setCacheStats({ size: 0, lastUpdated: Date.now() });
    saveToStorage();
  }, [saveToStorage]);

  const invalidate = useCallback((keyPrefix?: string) => {
    if (keyPrefix) {
      const keysToDelete: string[] = [];
      globalCache.forEach((_, key) => {
        if (key.startsWith(keyPrefix)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => globalCache.delete(key));
    } else {
      globalCache.clear();
    }
    setCacheStats({ size: globalCache.size, lastUpdated: Date.now() });
    saveToStorage();
  }, [saveToStorage]);

  const prefetch = useCallback(async (key: string, fetcher: () => Promise<TData>) => {
    // Check if already cached and not stale
    const existing = get(key);
    if (existing) {
      const entry = globalCache.get(key);
      if (entry && (Date.now() - entry.timestamp) < staleTime) {
        return; // Still fresh, no need to prefetch
      }
    }

    try {
      const data = await fetcher();
      set(key, data);
    } catch (error) {
      console.warn(`Failed to prefetch ${key}:`, error);
    }
  }, [get, set, staleTime]);

  const gc = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    globalCache.forEach((entry, key) => {
      // Remove expired entries
      if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
        keysToDelete.push(key);
      }
      // Remove least recently used entries if cache is too large
      else if (globalCache.size > 1000 && (now - entry.lastAccessed) > 3600000) { // 1 hour
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => globalCache.delete(key));
    
    if (keysToDelete.length > 0) {
      setCacheStats({ size: globalCache.size, lastUpdated: now });
      saveToStorage();
    }
  }, [saveToStorage]);

  // Automatic garbage collection
  useEffect(() => {
    const interval = setInterval(gc, 300000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [gc]);

  // Background refetch for stale data
  useEffect(() => {
    if (!backgroundRefetch) return;

    const interval = setInterval(() => {
      // This would trigger background refetches for stale queries
      // Implementation would depend on query registration system
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [backgroundRefetch]);

  return {
    data: undefined, // This would be the current data for a specific key if provided
    isStale: false, // Would be calculated based on staleTime
    isCached: globalCache.size > 0,
    lastUpdated: cacheStats.lastUpdated,
    cacheSize: cacheStats.size,
    set,
    get,
    remove,
    clear,
    invalidate,
    prefetch,
    gc,
  };
}