import { AxiosResponse } from 'axios';
import { ICacheAdapter, INetworkMonitor } from '../../../adapters';

/**
 * Simplified cache request configuration
 * Cache behavior: Online = always fetch fresh data, Offline = always use cache
 */
export interface CacheConfig {
  /** Whether to use cache for this request (default: true if cache available) */
  useCache?: boolean;
}

/**
 * Simplified Cache Handler with binary online/offline strategy
 * - Online: Always fetch fresh data from network and update cache
 * - Offline: Always use cached data (no TTL/expiration check)
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
   * Handle cached GET request with simplified binary strategy
   * - Online: Fetch from network and update cache
   * - Offline: Return from cache (no expiration check)
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
    const online = this.isOnline();

    if (this.isDebugEnabled) {
      console.log('[CACHE-HANDLER] Request details:', {
        url,
        cacheKey,
        online,
        cacheAvailable: !!this.cache
      });
    }

    if (online) {
      // ONLINE: Always fetch from network and update cache
      try {
        const response = await requestFn();

        // Cache the result (no TTL - cache never expires)
        // Note: Cache failures should NEVER block the main operation
        if (this.cache) {
          await this.cache.set(cacheKey, response.data).catch(error => {
            // Always log cache failures (not just in debug mode)
            console.error('[CACHE-HANDLER] Failed to cache response (non-blocking):', {
              url,
              error: error instanceof Error ? error.message : error
            });
            if (this.isDebugEnabled) {
              console.error('[CACHE-HANDLER] Full error details:', error);
            }
          });

          if (this.isDebugEnabled) {
            console.log('[CACHE-HANDLER] Data fetched and cached:', { cacheKey });
          }
        }

        return response.data;
      } catch (error) {
        // Network failed while online - try cache as fallback
        const cached = await this.cache.get<T>(cacheKey).catch(cacheError => {
          console.error('[CACHE-HANDLER] Failed to read cache during fallback (non-blocking):', {
            url,
            error: cacheError instanceof Error ? cacheError.message : cacheError
          });
          return null;
        });
        if (cached) {
          if (this.isDebugEnabled) {
            console.log('[CACHE-HANDLER] Network failed, using cached data as fallback');
          }
          return cached.data;
        }
        throw error;
      }
    } else {
      // OFFLINE: Always use cache (no expiration check)
      const cached = await this.cache.get<T>(cacheKey).catch(cacheError => {
        console.error('[CACHE-HANDLER] Failed to read cache while offline (non-blocking):', {
          url,
          error: cacheError instanceof Error ? cacheError.message : cacheError
        });
        return null;
      });
      if (cached) {
        if (this.isDebugEnabled) {
          console.log('[CACHE-HANDLER] Offline mode, returning cached data');
        }
        return cached.data;
      }

      throw new Error('Offline: No cached data available for this request');
    }
  }

  /**
   * Generate a cache key from URL
   */
  private generateCacheKey(url: string): string {
    return url;
  }

  /**
   * Invalidate cache entries matching a pattern (kept for manual cache clearing if needed)
   * Note: Invalidation failures are non-blocking and only logged
   */
  async invalidateCache(pattern: string): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.invalidate(pattern);
      if (this.isDebugEnabled) {
        console.log('[CACHE-HANDLER] Cache invalidated:', pattern);
      }
    } catch (error) {
      // Always log invalidation failures
      console.error('[CACHE-HANDLER] Cache invalidation failed (non-blocking):', {
        pattern,
        error: error instanceof Error ? error.message : error
      });
      if (this.isDebugEnabled) {
        console.error('[CACHE-HANDLER] Full error details:', error);
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
