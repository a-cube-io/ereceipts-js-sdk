import { AxiosResponse } from 'axios';
import { ICacheAdapter, INetworkMonitor } from '../../../adapters';

/**
 * Simplified cache request configuration
 */
export interface CacheConfig {
  /** Whether to use cache for this request (default: true if cache available) */
  useCache?: boolean;
  /** Custom cache TTL in milliseconds */
  cacheTtl?: number;
  /** Force refresh from the server */
  forceRefresh?: boolean;
}

/**
 * Cache Handler for HTTP request caching with network-aware strategies
 */
export class CacheHandler {
  private isDebugEnabled: boolean = false;

  constructor(
    private cache?: ICacheAdapter,
    private networkMonitor?: INetworkMonitor,
    debugEnabled: boolean = false
  ) {
    this.isDebugEnabled = debugEnabled;
  }

  /**
   * Check if the device/application is online
   */
  isOnline(): boolean {
    // Priority 1: Use injected network monitor for accurate platform-specific detection
    if (this.networkMonitor) {
      try {
        return this.networkMonitor.isOnline();
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[CACHE-HANDLER] Network monitor failed:', error);
        }
      }
    }
    
    // Priority 2: Fallback to navigator.onLine for web environments
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    
    // Priority 3: Conservative default - assume offline if cannot determine
    return false;
  }

  /**
   * Handle cached GET request with network-first strategy
   * - When ONLINE: Always fetch from network and update cache
   * - When OFFLINE: Use cache if available
   */
  async handleCachedRequest<T>(
    url: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    config?: CacheConfig
  ): Promise<T> {
    if (!this.cache || config?.useCache === false) {
      // No cache available or caching disabled - make direct request
      const response = await requestFn();
      return response.data;
    }

    const cacheKey = this.generateCacheKey(url);
    const isOnline = this.isOnline();

    if (this.isDebugEnabled) {
      console.log('[CACHE-HANDLER] Cache request:', {
        url,
        isOnline,
        cacheKey,
        strategy: isOnline ? 'network-first' : 'cache-only',
        forceRefresh: config?.forceRefresh
      });
    }

    try {
      // ONLINE: Network-first strategy - always fetch fresh data and update cache
      if (isOnline && !config?.forceRefresh) {
        if (this.isDebugEnabled) {
          console.log('[CACHE-HANDLER] Online: Fetching fresh data from network');
        }
        return await this.fetchAndCache<T>(requestFn, cacheKey, config?.cacheTtl);
      }

      // OFFLINE or force refresh: Check cache first
      if (this.isDebugEnabled) {
        console.log('[CACHE-HANDLER] Checking cache for data');
      }

      const cached = await this.cache.get<T>(cacheKey);
      
      if (cached) {
        if (this.isDebugEnabled) {
          console.log('[CACHE-HANDLER] Cache hit:', { 
            cacheKey, 
            source: cached.source,
            age: Date.now() - cached.timestamp + 'ms'
          });
        }
        return cached.data;
      }

      // No cache available and offline - try network anyway (might work)
      if (!isOnline) {
        if (this.isDebugEnabled) {
          console.warn('[CACHE-HANDLER] Offline with no cache - attempting network request');
        }
      }

      // Fallback to network request
      return await this.fetchAndCache<T>(requestFn, cacheKey, config?.cacheTtl);

    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CACHE-HANDLER] Cache request failed:', error);
      }
      throw error;
    }
  }

  /**
   * Fetch data from the network and cache the result
   */
  private async fetchAndCache<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    cacheKey: string,
    cacheTtl?: number
  ): Promise<T> {
    try {
      const response = await requestFn();
      
      // Cache the result if cache is available
      if (this.cache) {
        await this.cache.set(cacheKey, response.data, cacheTtl).catch(error => {
          if (this.isDebugEnabled) {
            console.warn('[CACHE-HANDLER] Failed to cache response:', error);
          }
        });

        if (this.isDebugEnabled) {
          console.log('[CACHE-HANDLER] Data cached:', { cacheKey, ttl: cacheTtl });
        }
      }

      return response.data;
    } catch (error) {
      // If we have cached data and network fails, try to return cached data
      if (this.cache) {
        const cached = await this.cache.get<T>(cacheKey).catch(() => null);
        if (cached) {
          if (this.isDebugEnabled) {
            console.log('[CACHE-HANDLER] Network failed, using stale cache:', cacheKey);
          }
          return cached.data;
        }
      }
      throw error;
    }
  }

  /**
   * Generate a cache key from URL and optional parameters
   */
  private generateCacheKey(url: string, params?: Record<string, any>): string {
    let baseKey = url;
    
    if (params) {
      const paramString = new URLSearchParams(params).toString();
      baseKey = `${url}?${paramString}`;
    }
    
    return baseKey;
  }

  /**
   * Invalidate cache entries (simplified version)
   */
  async invalidateCache(pattern: string): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.invalidate(pattern);
      if (this.isDebugEnabled) {
        console.log('[CACHE-HANDLER] Cache invalidated:', pattern);
      }
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CACHE-HANDLER] Cache invalidation failed:', error);
      }
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      available: !!this.cache,
      networkMonitorAvailable: !!this.networkMonitor,
      isOnline: this.isOnline()
    };
  }
}