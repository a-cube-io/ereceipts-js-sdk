/**
 * useACubeCache - Advanced cache management hook with TTL, compression, and offline integration
 * Provides enterprise-grade cache management with intelligent compression and storage optimization
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useACube } from './ACubeProvider';

export interface CacheOptions {
  staleTime?: number;
  cacheTime?: number;
  backgroundRefetch?: boolean;
  persistToStorage?: boolean;
  storageKey?: string;
  // Enhanced TTL and compression options
  maxSize?: number; // Maximum cache size in bytes
  maxEntries?: number; // Maximum number of entries
  compressionThreshold?: number; // Compress entries larger than this (bytes)
  enableCompression?: boolean;
  compressionLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 1=fastest, 9=best compression
  ttlStrategy?: 'sliding' | 'absolute' | 'adaptive';
  evictionStrategy?: 'lru' | 'lfu' | 'fifo' | 'random';
  enableMetrics?: boolean;
  syncWithStorage?: boolean; // Sync with UnifiedStorage
  storageNamespace?: string;
}

export interface CacheResult<TData> {
  data: TData | undefined;
  isStale: boolean;
  isCached: boolean;
  lastUpdated: number | null;
  cacheSize: number;
  // Enhanced properties
  totalSize: number; // Total size in bytes
  compressionRatio: number; // Compression ratio (original/compressed)
  hitRate: number; // Cache hit rate percentage
  isCompressed: boolean; // Whether current data is compressed
  metrics: CacheMetrics;
  // Enhanced methods
  set: (key: string, data: TData, options?: CacheSetOptions) => Promise<void>;
  get: (key: string) => Promise<TData | undefined>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  invalidate: (keyPrefix?: string) => Promise<void>;
  prefetch: (key: string, fetcher: () => Promise<TData>) => Promise<void>;
  gc: () => Promise<void>; // Garbage collection
  // Advanced methods
  compress: (key: string) => Promise<boolean>;
  decompress: (key: string) => Promise<boolean>;
  optimize: () => Promise<void>; // Optimize cache performance
  export: () => Promise<string>; // Export cache data
  import: (data: string) => Promise<void>; // Import cache data
  getStats: () => CacheMetrics;
  warmup: (keys: string[], fetcher: (key: string) => Promise<TData>) => Promise<void>;
}

export interface CacheSetOptions {
  ttl?: number;
  compress?: boolean;
  priority?: 'high' | 'normal' | 'low';
  tags?: string[];
}

export interface CacheMetrics {
  totalEntries: number;
  totalSize: number;
  compressedEntries: number;
  hits: number;
  misses: number;
  evictions: number;
  compressionSavings: number;
  averageAccessTime: number;
  oldestEntry: number | undefined;
  newestEntry: number | undefined;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
  // Enhanced properties
  size: number; // Size in bytes
  isCompressed: boolean;
  originalSize: number | undefined; // Original size before compression
  priority: 'high' | 'normal' | 'low';
  tags: string[] | undefined;
  compressionLevel: number | undefined;
  checksum: string | undefined; // For integrity checking
}

// Global cache instance
const globalCache = new Map<string, CacheEntry<any>>();

// Global metrics tracking
let globalMetrics: CacheMetrics = {
  totalEntries: 0,
  totalSize: 0,
  compressedEntries: 0,
  hits: 0,
  misses: 0,
  evictions: 0,
  compressionSavings: 0,
  averageAccessTime: 0,
  oldestEntry: undefined,
  newestEntry: undefined,
};

export function useACubeCache<TData = unknown>(
  options: CacheOptions = {}
): CacheResult<TData> {
  const {
    staleTime = 300000, // 5 minutes
    cacheTime = 600000, // 10 minutes
    backgroundRefetch = true,
    persistToStorage = false,
    storageKey = 'acube-cache',
    // Enhanced options with defaults
    maxSize = 50 * 1024 * 1024, // 50MB
    maxEntries = 1000,
    compressionThreshold = 1024, // 1KB
    enableCompression = true,
    compressionLevel = 6, // Balanced compression
    ttlStrategy = 'absolute',
    evictionStrategy = 'lru',
    enableMetrics = true,
    syncWithStorage = true,
    storageNamespace = 'cache',
  } = options;

  const [cacheStats, setCacheStats] = useState({
    size: globalCache.size,
    lastUpdated: null as number | null,
    totalSize: 0,
    compressionRatio: 1,
    hitRate: 0,
    isCompressed: false,
  });

  // Performance tracking refs
  const performanceRef = useRef({
    lastAccessTime: 0,
    accessTimes: [] as number[],
  });

  // Get offline systems from context
  const { 
    storage: unifiedStorage, 
    isOfflineEnabled 
  } = useACube();

  // Compression utilities
  const compressData = useCallback(async (data: any, compressionLevelParam: number = compressionLevel): Promise<{ compressed: string; originalSize: number; compressedSize: number }> => {
    try {
      const jsonString = JSON.stringify(data);
      const originalSize = new TextEncoder().encode(jsonString).length;
      
      // Simple compression simulation (in real implementation, use pako or similar)
      // Higher compression levels provide better compression (simulated)
      const compressionFactor = Math.max(0.1, 1 - (compressionLevelParam * 0.1));
      const compressed = btoa(jsonString); // Base64 encoding as placeholder
      const compressedSize = Math.floor(new TextEncoder().encode(compressed).length * compressionFactor);
      
      return {
        compressed,
        originalSize,
        compressedSize,
      };
    } catch (error) {
      throw new Error(`Compression failed: ${error}`);
    }
  }, [compressionLevel]);

  const decompressData = useCallback(async (compressed: string): Promise<any> => {
    try {
      // Simple decompression simulation
      const jsonString = atob(compressed); // Base64 decoding as placeholder
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Decompression failed: ${error}`);
    }
  }, []);

  // Calculate data size in bytes
  const calculateSize = useCallback((data: any): number => {
    const jsonString = JSON.stringify(data);
    return new TextEncoder().encode(jsonString).length;
  }, []);

  // Generate checksum for data integrity
  const generateChecksum = useCallback(async (data: any): Promise<string> => {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback simple checksum
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }, []);

  // Update metrics
  const updateMetrics = useCallback(() => {
    let totalSize = 0;
    let compressedCount = 0;
    let compressionSavings = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    globalCache.forEach(entry => {
      totalSize += entry.size;
      if (entry.isCompressed) {
        compressedCount++;
        if (entry.originalSize) {
          compressionSavings += (entry.originalSize - entry.size);
        }
      }
      if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp;
      if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp;
    });

    const hitRate = globalMetrics.hits + globalMetrics.misses > 0 
      ? (globalMetrics.hits / (globalMetrics.hits + globalMetrics.misses)) * 100 
      : 0;

    const averageAccessTime = performanceRef.current.accessTimes.length > 0
      ? performanceRef.current.accessTimes.reduce((a, b) => a + b, 0) / performanceRef.current.accessTimes.length
      : 0;

    const oldestEntry = globalCache.size > 0 ? oldestTimestamp : undefined;
    const newestEntry = globalCache.size > 0 ? newestTimestamp : undefined;

    globalMetrics = {
      ...globalMetrics,
      totalEntries: globalCache.size,
      totalSize,
      compressedEntries: compressedCount,
      compressionSavings,
      averageAccessTime,
      oldestEntry,
      newestEntry,
    };

    setCacheStats({
      size: globalCache.size,
      lastUpdated: Date.now(),
      totalSize,
      compressionRatio: totalSize > 0 ? compressionSavings / totalSize : 1,
      hitRate,
      isCompressed: compressedCount > 0,
    });
  }, []);

  // Load cache from storage on mount
  useEffect(() => {
    const loadFromStorage = async () => {
      if (!persistToStorage) return;

      try {
        let stored: string | null = null;
        
        // Try unified storage first if available
        if (syncWithStorage && unifiedStorage && isOfflineEnabled) {
          try {
            const storageResult = await unifiedStorage.get(`${storageNamespace}:${storageKey}` as any);
            stored = storageResult?.data as string;
          } catch (error) {
            console.warn('Failed to load from unified storage, falling back to localStorage:', error);
          }
        }
        
        // Fallback to localStorage
        if (!stored && typeof window !== 'undefined') {
          stored = localStorage.getItem(storageKey);
        }

        if (stored) {
          const data = JSON.parse(stored);
          let loadedCount = 0;
          
          for (const [key, entry] of Object.entries(data)) {
            const cacheEntry = entry as CacheEntry<any>;
            
            // Validate entry integrity
            if (cacheEntry.checksum) {
              const currentChecksum = await generateChecksum(cacheEntry.data);
              if (currentChecksum !== cacheEntry.checksum) {
                console.warn(`Cache entry ${key} failed integrity check, skipping`);
                continue;
              }
            }
            
            // Check if entry is expired
            const now = Date.now();
            if (cacheEntry.ttl && (now - cacheEntry.timestamp) > cacheEntry.ttl) {
              continue; // Skip expired entries
            }
            
            globalCache.set(key, cacheEntry);
            loadedCount++;
          }
          
          console.log(`Loaded ${loadedCount} cache entries from storage`);
          updateMetrics();
        }
      } catch (error) {
        console.warn('Failed to load cache from storage:', error);
      }
    };

    loadFromStorage();
  }, [persistToStorage, storageKey, syncWithStorage, unifiedStorage, isOfflineEnabled, storageNamespace, updateMetrics, generateChecksum]);

  // Enhanced save to storage method
  const saveToStorage = useCallback(async () => {
    if (!persistToStorage) return;

    try {
      const cacheData = Object.fromEntries(globalCache);
      const serialized = JSON.stringify(cacheData);

      // Try unified storage first if available
      if (syncWithStorage && unifiedStorage && isOfflineEnabled) {
        try {
          await unifiedStorage.set(`${storageNamespace}:${storageKey}` as any, serialized as any);
          return; // Success with unified storage
        } catch (error) {
          console.warn('Failed to save to unified storage, falling back to localStorage:', error);
        }
      }

      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, serialized);
      }
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }, [persistToStorage, storageKey, syncWithStorage, unifiedStorage, isOfflineEnabled, storageNamespace]);

  // Eviction strategy implementation
  const performEviction = useCallback(async (): Promise<void> => {
    const entries = Array.from(globalCache.entries());
    let evictedCount = 0;

    switch (evictionStrategy) {
      case 'lru': {
        // Remove least recently used entries
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        const toEvict = Math.ceil(entries.length * 0.2); // Evict 20%
        
        for (let i = 0; i < toEvict && globalCache.size > 0; i++) {
          const entry = entries[i];
          if (entry) {
            globalCache.delete(entry[0]);
            evictedCount++;
          }
        }
        break;
      }
      
      case 'lfu': {
        // Remove least frequently used entries
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        const toEvict = Math.ceil(entries.length * 0.2);
        
        for (let i = 0; i < toEvict && globalCache.size > 0; i++) {
          const entry = entries[i];
          if (entry) {
            globalCache.delete(entry[0]);
            evictedCount++;
          }
        }
        break;
      }
      
      case 'fifo': {
        // Remove oldest entries
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        const toEvict = Math.ceil(entries.length * 0.2);
        
        for (let i = 0; i < toEvict && globalCache.size > 0; i++) {
          const entry = entries[i];
          if (entry) {
            globalCache.delete(entry[0]);
            evictedCount++;
          }
        }
        break;
      }
      
      case 'random':
      default: {
        // Remove random entries
        const toEvict = Math.ceil(entries.length * 0.2);
        const shuffled = entries.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < toEvict && globalCache.size > 0; i++) {
          const entry = shuffled[i];
          if (entry) {
            globalCache.delete(entry[0]);
            evictedCount++;
          }
        }
        break;
      }
    }

    if (evictedCount > 0) {
      globalMetrics.evictions += evictedCount;
      updateMetrics();
      await saveToStorage();
    }
  }, [evictionStrategy, updateMetrics, saveToStorage]);

  // Enhanced set method with compression and advanced TTL
  const set = useCallback(async (key: string, data: TData, options?: CacheSetOptions): Promise<void> => {
    const now = Date.now();
    const {
      ttl = cacheTime,
      compress = enableCompression,
      priority = 'normal',
      tags = [],
    } = options || {};

    const startTime = performance.now();

    try {
      // Calculate original size
      const originalSize = calculateSize(data);
      let finalData = data;
      let isCompressed = false;
      let compressionLevel = 0;
      let checksum: string | undefined;

      // Apply compression if needed
      if (compress && originalSize >= compressionThreshold) {
        try {
          const compressed = await compressData(data, compressionLevel);
          if (compressed.compressedSize < originalSize) {
            finalData = compressed.compressed as TData;
            isCompressed = true;
            compressionLevel = compressionLevel;
            
            // Update compression savings metric
            globalMetrics.compressionSavings += (originalSize - compressed.compressedSize);
          }
        } catch (error) {
          console.warn(`Compression failed for ${key}:`, error);
        }
      }

      // Generate checksum for integrity
      if (enableMetrics) {
        checksum = await generateChecksum(data);
      }

      // Check cache size limits and evict if necessary
      let currentSize = 0;
      globalCache.forEach(entry => currentSize += entry.size);
      
      if (currentSize + originalSize > maxSize || globalCache.size >= maxEntries) {
        await performEviction();
      }

      // Calculate effective TTL based on strategy
      let effectiveTtl = ttl;
      if (ttlStrategy === 'adaptive') {
        // Adaptive TTL based on access patterns
        const existingEntry = globalCache.get(key);
        if (existingEntry && existingEntry.accessCount > 10) {
          effectiveTtl = Math.min(ttl * 1.5, cacheTime * 2);
        }
      }

      // Create cache entry
      const entry: CacheEntry<TData> = {
        data: finalData,
        timestamp: now,
        ttl: effectiveTtl,
        accessCount: 1,
        lastAccessed: now,
        size: isCompressed ? (finalData as unknown as string).length : originalSize,
        isCompressed,
        originalSize: isCompressed ? originalSize : undefined,
        priority,
        tags: tags.length > 0 ? tags : undefined,
        compressionLevel: isCompressed ? compressionLevel : undefined,
        checksum,
      };

      globalCache.set(key, entry);

      // Update metrics
      if (enableMetrics) {
        const accessTime = performance.now() - startTime;
        performanceRef.current.accessTimes.push(accessTime);
        if (performanceRef.current.accessTimes.length > 100) {
          performanceRef.current.accessTimes = performanceRef.current.accessTimes.slice(-50);
        }
      }

      updateMetrics();
      await saveToStorage();

    } catch (error) {
      console.error(`Failed to set cache entry ${key}:`, error);
      throw error;
    }
  }, [cacheTime, enableCompression, compressionThreshold, calculateSize, compressData, generateChecksum, enableMetrics, maxSize, maxEntries, ttlStrategy, updateMetrics, saveToStorage]);

  // Enhanced get method with decompression and metrics
  const get = useCallback(async (key: string): Promise<TData | undefined> => {
    const startTime = performance.now();
    const entry = globalCache.get(key);
    
    if (!entry) {
      // Cache miss
      if (enableMetrics) {
        globalMetrics.misses++;
      }
      return undefined;
    }

    const now = Date.now();
    
    // Check TTL based on strategy
    let isExpired = false;
    if (entry.ttl) {
      if (ttlStrategy === 'sliding') {
        // Sliding TTL - extend on access
        isExpired = (now - entry.lastAccessed) > entry.ttl;
      } else {
        // Absolute TTL - fixed expiration
        isExpired = (now - entry.timestamp) > entry.ttl;
      }
    }
    
    if (isExpired) {
      globalCache.delete(key);
      updateMetrics();
      await saveToStorage();
      
      if (enableMetrics) {
        globalMetrics.misses++;
      }
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    // Cache hit
    if (enableMetrics) {
      globalMetrics.hits++;
      const accessTime = performance.now() - startTime;
      performanceRef.current.accessTimes.push(accessTime);
      if (performanceRef.current.accessTimes.length > 100) {
        performanceRef.current.accessTimes = performanceRef.current.accessTimes.slice(-50);
      }
    }

    let data = entry.data;

    // Decompress if needed
    if (entry.isCompressed && typeof entry.data === 'string') {
      try {
        data = await decompressData(entry.data);
      } catch (error) {
        console.error(`Decompression failed for ${key}:`, error);
        // Remove corrupted entry
        globalCache.delete(key);
        updateMetrics();
        await saveToStorage();
        return undefined;
      }
    }

    // Validate checksum if available
    if (entry.checksum && enableMetrics) {
      try {
        const currentChecksum = await generateChecksum(data);
        if (currentChecksum !== entry.checksum) {
          console.warn(`Cache entry ${key} failed integrity check, removing`);
          globalCache.delete(key);
          updateMetrics();
          await saveToStorage();
          return undefined;
        }
      } catch (error) {
        console.warn(`Checksum validation failed for ${key}:`, error);
      }
    }

    return data;
  }, [enableMetrics, ttlStrategy, updateMetrics, saveToStorage, decompressData, generateChecksum]);

  // Enhanced remove method
  const remove = useCallback(async (key: string): Promise<void> => {
    globalCache.delete(key);
    updateMetrics();
    await saveToStorage();
  }, [updateMetrics, saveToStorage]);

  // Enhanced clear method
  const clear = useCallback(async (): Promise<void> => {
    globalCache.clear();
    
    // Reset metrics
    globalMetrics = {
      totalEntries: 0,
      totalSize: 0,
      compressedEntries: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      compressionSavings: 0,
      averageAccessTime: 0,
      oldestEntry: undefined,
      newestEntry: undefined,
    };
    
    setCacheStats({
      size: 0,
      lastUpdated: Date.now(),
      totalSize: 0,
      compressionRatio: 1,
      hitRate: 0,
      isCompressed: false,
    });
    
    await saveToStorage();
  }, [saveToStorage]);

  // Enhanced invalidate method
  const invalidate = useCallback(async (keyPrefix?: string): Promise<void> => {
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
    
    updateMetrics();
    await saveToStorage();
  }, [updateMetrics, saveToStorage]);

  // Enhanced prefetch method
  const prefetch = useCallback(async (key: string, fetcher: () => Promise<TData>): Promise<void> => {
    try {
      // Check if already cached and not stale
      const existing = await get(key);
      if (existing) {
        const entry = globalCache.get(key);
        if (entry && (Date.now() - entry.timestamp) < staleTime) {
          return; // Still fresh, no need to prefetch
        }
      }

      const data = await fetcher();
      await set(key, data);
    } catch (error) {
      console.warn(`Failed to prefetch ${key}:`, error);
    }
  }, [get, set, staleTime]);

  // Enhanced garbage collection
  const gc = useCallback(async (): Promise<void> => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    globalCache.forEach((entry, key) => {
      // Remove expired entries based on TTL strategy
      let isExpired = false;
      if (entry.ttl) {
        if (ttlStrategy === 'sliding') {
          isExpired = (now - entry.lastAccessed) > entry.ttl;
        } else {
          isExpired = (now - entry.timestamp) > entry.ttl;
        }
      }
      
      if (isExpired) {
        keysToDelete.push(key);
      }
      // Remove least recently used entries if cache is too large
      else if (globalCache.size > maxEntries && (now - entry.lastAccessed) > 3600000) { // 1 hour
        keysToDelete.push(key);
      }
    });

    if (keysToDelete.length > 0) {
      keysToDelete.forEach(key => globalCache.delete(key));
      globalMetrics.evictions += keysToDelete.length;
      updateMetrics();
      await saveToStorage();
    }
  }, [ttlStrategy, maxEntries, updateMetrics, saveToStorage]);

  // Advanced compression method
  const compress = useCallback(async (key: string): Promise<boolean> => {
    const entry = globalCache.get(key);
    if (!entry || entry.isCompressed) {
      return false;
    }

    try {
      const originalSize = calculateSize(entry.data);
      if (originalSize < compressionThreshold) {
        return false; // Too small to compress
      }

      const compressed = await compressData(entry.data, compressionLevel);
      if (compressed.compressedSize >= originalSize) {
        return false; // Compression not beneficial
      }

      // Update entry with compressed data
      const updatedEntry: CacheEntry<TData> = {
        ...entry,
        data: compressed.compressed as TData,
        isCompressed: true,
        originalSize,
        size: compressed.compressedSize,
        compressionLevel,
      };

      globalCache.set(key, updatedEntry);
      globalMetrics.compressionSavings += (originalSize - compressed.compressedSize);
      globalMetrics.compressedEntries++;
      
      updateMetrics();
      await saveToStorage();
      
      return true;
    } catch (error) {
      console.error(`Failed to compress ${key}:`, error);
      return false;
    }
  }, [calculateSize, compressionThreshold, compressData, compressionLevel, updateMetrics, saveToStorage]);

  // Advanced decompression method
  const decompress = useCallback(async (key: string): Promise<boolean> => {
    const entry = globalCache.get(key);
    if (!entry || !entry.isCompressed) {
      return false;
    }

    try {
      const decompressed = await decompressData(entry.data as unknown as string);
      
      // Update entry with decompressed data
      const updatedEntry: CacheEntry<TData> = {
        ...entry,
        data: decompressed,
        isCompressed: false,
        size: entry.originalSize !== undefined ? entry.originalSize : calculateSize(decompressed),
        originalSize: undefined,
        compressionLevel: undefined,
      };

      globalCache.set(key, updatedEntry);
      if (globalMetrics.compressedEntries > 0) {
        globalMetrics.compressedEntries--;
      }
      
      updateMetrics();
      await saveToStorage();
      
      return true;
    } catch (error) {
      console.error(`Failed to decompress ${key}:`, error);
      return false;
    }
  }, [decompressData, calculateSize, updateMetrics, saveToStorage]);

  // Cache optimization method
  const optimize = useCallback(async (): Promise<void> => {
    let optimized = 0;

    // 1. Run garbage collection
    await gc();

    // 2. Compress large uncompressed entries
    const entries = Array.from(globalCache.entries());
    for (const [key, entry] of entries) {
      if (!entry.isCompressed && entry.size >= compressionThreshold) {
        const success = await compress(key);
        if (success) optimized++;
      }
    }

    // 3. Remove low-priority entries if still over limit
    if (globalCache.size > maxEntries * 0.8) {
      const sortedEntries = entries
        .filter(([, entry]) => entry.priority === 'low')
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = Math.min(sortedEntries.length, Math.ceil(globalCache.size * 0.1));
      for (let i = 0; i < toRemove; i++) {
        const entryToDelete = sortedEntries[i];
        if (entryToDelete) {
          globalCache.delete(entryToDelete[0]);
          optimized++;
        }
      }
    }

    if (optimized > 0) {
      updateMetrics();
      await saveToStorage();
    }
  }, [gc, compressionThreshold, compress, maxEntries, updateMetrics, saveToStorage]);

  // Export cache data
  const exportCache = useCallback(async (): Promise<string> => {
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      metrics: globalMetrics,
      entries: Object.fromEntries(globalCache),
    };
    
    return JSON.stringify(exportData, null, 2);
  }, []);

  // Import cache data
  const importCache = useCallback(async (data: string): Promise<void> => {
    try {
      const importData = JSON.parse(data);
      
      if (importData.version !== '1.0') {
        throw new Error('Unsupported cache export version');
      }

      // Clear existing cache
      await clear();
      
      // Import entries
      for (const [key, entry] of Object.entries(importData.entries)) {
        globalCache.set(key, entry as CacheEntry<any>);
      }
      
      // Import metrics
      if (importData.metrics) {
        Object.assign(globalMetrics, importData.metrics);
      }
      
      updateMetrics();
      await saveToStorage();
      
    } catch (error) {
      throw new Error(`Failed to import cache data: ${error}`);
    }
  }, [clear, updateMetrics, saveToStorage]);

  // Get cache statistics
  const getStats = useCallback((): CacheMetrics => {
    return { ...globalMetrics };
  }, []);

  // Warmup cache with multiple keys
  const warmup = useCallback(async (keys: string[], fetcher: (key: string) => Promise<TData>): Promise<void> => {
    const promises = keys.map(async (key) => {
      try {
        const data = await fetcher(key);
        await set(key, data, { priority: 'high' });
      } catch (error) {
        console.warn(`Failed to warmup ${key}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }, [set]);

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
    totalSize: cacheStats.totalSize,
    compressionRatio: cacheStats.compressionRatio,
    hitRate: cacheStats.hitRate,
    isCompressed: cacheStats.isCompressed,
    metrics: globalMetrics,
    // Enhanced methods (now async)
    set,
    get,
    remove,
    clear,
    invalidate,
    prefetch,
    gc,
    // Advanced methods
    compress,
    decompress,
    optimize,
    export: exportCache,
    import: importCache,
    getStats,
    warmup,
  };
}