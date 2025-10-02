import { AxiosResponse } from 'axios';
import { ICacheAdapter, INetworkMonitor, NetworkInfo } from '../../../adapters';

/**
 * Network connection quality assessment
 */
export interface NetworkQuality {
  isOnline: boolean;
  speed: 'fast' | 'moderate' | 'slow' | 'unknown';
  latency: number; // in milliseconds
  reliability: 'high' | 'medium' | 'low' | 'unknown';
}

/**
 * Cache strategy types
 */
export type CacheStrategy =
  | 'network-first'    // Always try network first, fall back to cache
  | 'cache-first'      // Check cache first, then network if needed
  | 'network-only'     // Skip cache entirely
  | 'cache-only'       // Use cache only, no network requests
  | 'stale-while-revalidate'; // Return cache immediately, update in background

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
  /** Override automatic strategy selection */
  strategy?: CacheStrategy;
  /** Enable background refresh for this request */
  backgroundRefresh?: boolean;
  /** Maximum acceptable cache age in milliseconds */
  maxCacheAge?: number;
}

/**
 * Cache Handler for HTTP request caching with network-aware strategies
 */
export class CacheHandler {
  private isDebugEnabled: boolean = false;
  private networkQualityCache: NetworkQuality | null = null;
  private lastNetworkCheck: number = 0;
  private readonly NETWORK_CHECK_INTERVAL = 30000; // 30 seconds
  private backgroundRefreshQueue = new Set<string>();

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
   * Assess network connection quality with caching
   */
  async getNetworkQuality(): Promise<NetworkQuality> {
    const now = Date.now();

    // Use cached assessment if recent
    if (this.networkQualityCache && (now - this.lastNetworkCheck) < this.NETWORK_CHECK_INTERVAL) {
      return this.networkQualityCache;
    }

    const isOnline = this.isOnline();

    if (!isOnline) {
      this.networkQualityCache = {
        isOnline: false,
        speed: 'unknown',
        latency: Infinity,
        reliability: 'unknown'
      };
      this.lastNetworkCheck = now;
      return this.networkQualityCache;
    }

    // Perform quick network quality assessment
    try {
      const startTime = performance.now();

      // Use network monitor if available for detailed assessment
      if (this.networkMonitor && typeof this.networkMonitor.getNetworkInfo === 'function') {
        try {
          const networkInfo = await this.networkMonitor.getNetworkInfo();
          const latency = performance.now() - startTime;

          this.networkQualityCache = {
            isOnline: true,
            speed: this.assessSpeed(networkInfo?.effectiveType || 'unknown'),
            latency: latency,
            reliability: this.assessReliability(networkInfo)
          };
        } catch (error) {
          // Fallback to basic assessment
          this.networkQualityCache = this.createBasicNetworkAssessment(performance.now() - startTime);
        }
      } else {
        // Basic assessment without detailed connection info
        this.networkQualityCache = this.createBasicNetworkAssessment(performance.now() - startTime);
      }
    } catch (error) {
      if (this.isDebugEnabled) {
        console.warn('[CACHE-HANDLER] Network quality assessment failed:', error);
      }

      this.networkQualityCache = {
        isOnline: true,
        speed: 'unknown',
        latency: 0,
        reliability: 'unknown'
      };
    }

    this.lastNetworkCheck = now;
    return this.networkQualityCache;
  }

  /**
   * Create basic network assessment based on simple latency test
   */
  private createBasicNetworkAssessment(latency: number): NetworkQuality {
    let speed: NetworkQuality['speed'];
    let reliability: NetworkQuality['reliability'];

    // Assess speed based on basic latency
    if (latency < 100) {
      speed = 'fast';
      reliability = 'high';
    } else if (latency < 300) {
      speed = 'moderate';
      reliability = 'medium';
    } else if (latency < 1000) {
      speed = 'slow';
      reliability = 'medium';
    } else {
      speed = 'slow';
      reliability = 'low';
    }

    return {
      isOnline: true,
      speed,
      latency,
      reliability
    };
  }

  /**
   * Assess network speed from connection type
   */
  private assessSpeed(effectiveType: string): NetworkQuality['speed'] {
    switch (effectiveType.toLowerCase()) {
      case '4g':
      case 'fast':
        return 'fast';
      case '3g':
      case 'moderate':
        return 'moderate';
      case '2g':
      case 'slow-2g':
      case 'slow':
        return 'slow';
      default:
        return 'unknown';
    }
  }

  /**
   * Assess network reliability from network info
   */
  private assessReliability(networkInfo: NetworkInfo | null): NetworkQuality['reliability'] {
    if (!networkInfo) {
      return 'unknown';
    }

    // Basic reliability assessment based on connection type and other factors
    if (networkInfo.effectiveType === '4g' && (networkInfo.downlink || 0) > 10) {
      return 'high';
    } else if (networkInfo.effectiveType === '3g' || (networkInfo.downlink || 0) > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Select optimal cache strategy based on network conditions and configuration
   */
  async selectStrategy(config?: CacheConfig, cacheExists?: boolean): Promise<CacheStrategy> {
    // Use explicit strategy if provided
    if (config?.strategy) {
      return config.strategy;
    }

    // Force refresh always uses network-first
    if (config?.forceRefresh) {
      return 'network-first';
    }

    const networkQuality = await this.getNetworkQuality();

    if (this.isDebugEnabled) {
      console.log('[CACHE-HANDLER] Network quality assessment:', networkQuality);
    }

    // Offline - use cache if available
    if (!networkQuality.isOnline) {
      return cacheExists ? 'cache-only' : 'network-first';
    }

    // Online strategy selection based on network quality and cache status
    if (networkQuality.speed === 'fast' && networkQuality.reliability === 'high') {
      // Great connection - always get fresh data
      return 'network-first';
    }

    if (networkQuality.speed === 'slow' || networkQuality.reliability === 'low') {
      // Poor connection - prefer cache if available and not too old
      if (cacheExists && config?.maxCacheAge) {
        return 'stale-while-revalidate';
      }
      return cacheExists ? 'cache-first' : 'network-first';
    }

    // Moderate connection - balanced approach
    if (config?.backgroundRefresh && cacheExists) {
      return 'stale-while-revalidate';
    }

    return cacheExists ? 'cache-first' : 'network-first';
  }

  /**
   * Handle cached GET request with intelligent hybrid strategy
   * Automatically selects optimal strategy based on network conditions
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

    // Check for cached data
    const cached = await this.cache.get<T>(cacheKey).catch(() => null);
    const cacheExists = !!cached;
    const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;

    // Check if cache is too old
    const isCacheStale = config?.maxCacheAge ? cacheAge > config.maxCacheAge : false;

    // Select optimal strategy
    const strategy = await this.selectStrategy(config, cacheExists && !isCacheStale);

    if (this.isDebugEnabled) {
      console.log('[CACHE-HANDLER] Request details:', {
        url,
        cacheKey,
        strategy,
        cacheExists,
        cacheAge: cached ? `${cacheAge}ms` : 'none',
        isCacheStale
      });
    }

    try {
      return await this.executeStrategy<T>(strategy, requestFn, cacheKey, cached, config);
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CACHE-HANDLER] Request failed:', error);
      }
      throw error;
    }
  }

  /**
   * Execute the selected cache strategy
   */
  private async executeStrategy<T>(
    strategy: CacheStrategy,
    requestFn: () => Promise<AxiosResponse<T>>,
    cacheKey: string,
    cached: any,
    config?: CacheConfig
  ): Promise<T> {
    switch (strategy) {
      case 'network-first':
        return await this.executeNetworkFirst<T>(requestFn, cacheKey, cached, config);

      case 'cache-first':
        return await this.executeCacheFirst<T>(requestFn, cacheKey, cached, config);

      case 'network-only':
        const response = await requestFn();
        return response.data;

      case 'cache-only':
        if (cached) {
          return cached.data;
        }
        throw new Error('No cached data available and cache-only strategy specified');

      case 'stale-while-revalidate':
        return await this.executeStaleWhileRevalidate<T>(requestFn, cacheKey, cached, config);

      default:
        throw new Error(`Unknown cache strategy: ${strategy}`);
    }
  }

  /**
   * Execute network-first strategy
   */
  private async executeNetworkFirst<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    cacheKey: string,
    cached: any,
    config?: CacheConfig
  ): Promise<T> {
    try {
      return await this.fetchAndCache<T>(requestFn, cacheKey, config?.cacheTtl);
    } catch (error) {
      // Network failed, try cache as fallback
      if (cached) {
        if (this.isDebugEnabled) {
          console.log('[CACHE-HANDLER] Network failed, using cached data as fallback');
        }
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Execute cache-first strategy
   */
  private async executeCacheFirst<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    cacheKey: string,
    cached: any,
    config?: CacheConfig
  ): Promise<T> {
    if (cached) {
      if (this.isDebugEnabled) {
        console.log('[CACHE-HANDLER] Cache hit, returning cached data');
      }
      return cached.data;
    }

    // No cache, fetch from network
    return await this.fetchAndCache<T>(requestFn, cacheKey, config?.cacheTtl);
  }

  /**
   * Execute stale-while-revalidate strategy
   */
  private async executeStaleWhileRevalidate<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    cacheKey: string,
    cached: any,
    config?: CacheConfig
  ): Promise<T> {
    if (cached) {
      // Return cached data immediately
      if (this.isDebugEnabled) {
        console.log('[CACHE-HANDLER] Returning stale cache, refreshing in background');
      }

      // Start background refresh if not already in progress
      if (!this.backgroundRefreshQueue.has(cacheKey)) {
        this.backgroundRefreshQueue.add(cacheKey);
        this.refreshInBackground<T>(requestFn, cacheKey, config?.cacheTtl)
          .finally(() => {
            this.backgroundRefreshQueue.delete(cacheKey);
          });
      }

      return cached.data;
    }

    // No cache available, fetch normally
    return await this.fetchAndCache<T>(requestFn, cacheKey, config?.cacheTtl);
  }

  /**
   * Refresh data in background without blocking the main request
   */
  private async refreshInBackground<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    cacheKey: string,
    cacheTtl?: number
  ): Promise<void> {
    try {
      await this.fetchAndCache<T>(requestFn, cacheKey, cacheTtl);
      if (this.isDebugEnabled) {
        console.log('[CACHE-HANDLER] Background refresh completed:', cacheKey);
      }
    } catch (error) {
      if (this.isDebugEnabled) {
        console.warn('[CACHE-HANDLER] Background refresh failed:', cacheKey, error);
      }
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
   * Get cache status with hybrid strategy information
   */
  getCacheStatus() {
    return {
      available: !!this.cache,
      networkMonitorAvailable: !!this.networkMonitor,
      isOnline: this.isOnline(),
      hybridStrategy: true,
      backgroundRefreshActive: this.backgroundRefreshQueue.size > 0,
      lastNetworkCheck: this.lastNetworkCheck,
      networkQuality: this.networkQualityCache
    };
  }

  /**
   * Get detailed cache performance metrics
   */
  async getCacheMetrics() {
    const networkQuality = await this.getNetworkQuality();
    const cacheSize = this.cache ? await this.cache.getSize().catch(() => null) : null;

    return {
      networkQuality,
      cacheSize,
      backgroundRefreshQueue: this.backgroundRefreshQueue.size,
      lastNetworkCheck: this.lastNetworkCheck,
      networkCheckInterval: this.NETWORK_CHECK_INTERVAL
    };
  }

  /**
   * Configure selective caching strategies for different endpoint types
   * Comprehensive mapping for all e-receipt system resources
   */
  getSelectiveCacheConfig(): Partial<CacheConfig> {
    return {
      useCache: true,
      strategy: 'network-first'
    }
  }

  /**
   * Apply selective caching configuration automatically
   */
  async handleCachedRequestWithDefaults<T>(
    url: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    userConfig?: CacheConfig
  ): Promise<T> {
    const defaultConfig = this.getSelectiveCacheConfig();
    const mergedConfig = { ...defaultConfig, ...userConfig };

    return this.handleCachedRequest<T>(url, requestFn, mergedConfig);
  }

  /**
   * Clear background refresh queue
   */
  clearBackgroundRefreshQueue(): void {
    this.backgroundRefreshQueue.clear();
  }

  /**
   * Force network quality reassessment
   */
  async forceNetworkQualityCheck(): Promise<NetworkQuality> {
    this.lastNetworkCheck = 0; // Force refresh
    return await this.getNetworkQuality();
  }

  /**
   * Get cache invalidation patterns for resource mutations
   * Maps POST/PUT/DELETE operations to list endpoints that should be invalidated
   */
  getInvalidationPatterns(url: string, method: string): string[] {
    const normalizedUrl = url.toLowerCase();
    const httpMethod = method.toUpperCase();

    // Only invalidate for state-changing operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(httpMethod)) {
      return [];
    }

    const patterns: string[] = [];

    // Receipt operations - invalidate receipt lists
    if (normalizedUrl.includes('/mf1/receipts')) {
      if (httpMethod === 'POST' && normalizedUrl === '/mf1/receipts') {
        // Creating new receipt - invalidate all receipt lists
        patterns.push('/mf1/receipts*');
      } else if (httpMethod === 'POST' && normalizedUrl.includes('/return')) {
        // Receipt returns create new receipts - invalidate lists
        patterns.push('/mf1/receipts*');
      }
    }

    // Cashier operations - invalidate cashier lists
    if (normalizedUrl.includes('/mf1/cashiers')) {
      if (httpMethod === 'POST' && normalizedUrl === '/mf1/cashiers') {
        patterns.push('/mf1/cashiers*');
      } else if ((httpMethod === 'PUT' || httpMethod === 'PATCH' || httpMethod === 'DELETE') && normalizedUrl.match(/\/mf1\/cashiers\/[^/]+$/)) {
        patterns.push('/mf1/cashiers*');
      }
    }

    // Point of Sales operations - invalidate POS lists
    if (normalizedUrl.includes('/mf1/point-of-sales') || normalizedUrl.includes('/mf2/point-of-sales')) {
      if (normalizedUrl.includes('/activation') ||
          normalizedUrl.includes('/inactivity') ||
          normalizedUrl.includes('/status')) {
        patterns.push('/mf1/point-of-sales*');
        patterns.push('/mf2/point-of-sales*');
      }
    }

    // Cash registers operations
    if (normalizedUrl.includes('/cash-registers')) {
      patterns.push('/mf1/cash-registers*');
      patterns.push('/mf2/cash-registers*');
    }

    // Suppliers operations
    if (normalizedUrl.includes('/suppliers')) {
      if (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH' || httpMethod === 'DELETE') {
        patterns.push('/mf1/suppliers*');
        patterns.push('/mf2/suppliers*');
      }
    }

    // Daily reports operations - regeneration affects lists
    if (normalizedUrl.includes('/mf2/daily-reports') && normalizedUrl.includes('/regenerate')) {
      patterns.push('/mf2/daily-reports*');
    }

    // Journals - any modifications affect journal lists
    if (normalizedUrl.includes('/journals')) {
      patterns.push('/mf1/journals*');
      patterns.push('/mf2/journals*');
    }

    // PEMs operations
    if (normalizedUrl.includes('/pems')) {
      patterns.push('/mf1/pems*');
      patterns.push('/mf2/pems*');
    }

    // Merchants operations
    if (normalizedUrl.includes('/merchants')) {
      if (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH') {
        patterns.push('/mf1/merchants*');
        patterns.push('/mf2/merchants*');
      }
    }

    return patterns;
  }

  /**
   * Invalidate cache after successful resource mutations
   * Called automatically after successful POST/PUT/DELETE operations
   */
  async invalidateAfterMutation(url: string, method: string): Promise<void> {
    if (!this.cache) return;

    const patterns = this.getInvalidationPatterns(url, method);

    if (patterns.length === 0) return;

    if (this.isDebugEnabled) {
      console.log('[CACHE-HANDLER] Auto-invalidating cache after mutation:', {
        url,
        method,
        patterns
      });
    }

    // Invalidate all matched patterns
    const invalidationPromises = patterns.map(async (pattern) => {
      try {
        await this.invalidateCache(pattern);
        if (this.isDebugEnabled) {
          console.log('[CACHE-HANDLER] Successfully invalidated pattern:', pattern);
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[CACHE-HANDLER] Failed to invalidate pattern:', pattern, error);
        }
        // Don't throw - invalidation failures shouldn't break the main request
      }
    });

    // Wait for all invalidations to complete
    await Promise.all(invalidationPromises);
  }
}