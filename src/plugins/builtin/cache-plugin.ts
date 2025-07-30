/**
 * Cache Plugin - Advanced caching strategies for A-Cube SDK
 * Provides intelligent caching with TTL, invalidation, and cache warming
 */

import type { HttpResponse, RequestOptions } from '@/http/client';

import { BasePlugin } from '../core/base-plugin';

import type { PluginContext, PluginManifest } from '../core/plugin-manager';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  topKeys: Array<{ key: string; hits: number }>;
  memoryUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number; // Maximum number of entries
  defaultTtl: number; // Default TTL in milliseconds
  strategy: 'lru' | 'lfu' | 'fifo';
  compression: boolean;
  persistence: boolean;
  maxMemoryMB: number;
  warmupUrls: string[];
}

export interface CacheWarmupRule {
  pattern: string;
  interval: number;
  priority: 'low' | 'medium' | 'high';
  conditions?: {
    timeRange?: { start: string; end: string }; // HH:MM format
    dayOfWeek?: number[]; // 0-6, Sunday = 0
  };
}

export class CachePlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    name: 'cache',
    version: '1.0.0',
    description: 'Advanced caching strategies for A-Cube SDK',
    author: 'A-Cube Team',
    permissions: [
      'http:read',
      'http:write',
      'storage:read',
      'storage:write',
      'cache:read',
      'cache:write',
      'events:emit',
      'config:read',
      'config:write',
    ],
  };

  private cache = new Map<string, CacheEntry>();

  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
  };

  private config: CacheConfig = {
    enabled: true,
    maxSize: 1000,
    defaultTtl: 300000,
    strategy: 'lru',
    compression: false,
    persistence: false,
    maxMemoryMB: 50,
    warmupUrls: [],
  };

  private warmupRules: CacheWarmupRule[] = [];

  private warmupInterval?: NodeJS.Timeout;

  private isEnabled: boolean = true;

  protected async initialize(_context: PluginContext): Promise<void> {
    // Load configuration
    this.config = this.getConfig<CacheConfig>('settings') || {
      enabled: true,
      maxSize: 1000,
      defaultTtl: 300000, // 5 minutes
      strategy: 'lru',
      compression: false,
      persistence: true,
      maxMemoryMB: 50,
      warmupUrls: [],
    };

    this.isEnabled = this.config.enabled;

    if (!this.isEnabled) {
      this.log('info', 'Cache plugin disabled by configuration');
      return;
    }

    // Load persisted cache if enabled
    if (this.config.persistence) {
      await this.loadPersistedCache();
    }

    // Load warmup rules
    this.warmupRules = this.getConfig<CacheWarmupRule[]>('warmupRules') || [];

    // Start cache warmup if rules exist
    if (this.warmupRules.length > 0) {
      this.startCacheWarmup();
    }

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Every minute

    this.log('info', 'Cache plugin initialized', {
      strategy: this.config.strategy,
      maxSize: this.config.maxSize,
      defaultTtl: this.config.defaultTtl,
      persistence: this.config.persistence,
      warmupRules: this.warmupRules.length,
    });
  }

  protected async cleanup(_context: PluginContext): Promise<void> {
    // Stop warmup interval
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
    }

    // Persist cache if enabled
    if (this.config.persistence) {
      await this.persistCache();
    }

    // Emit final stats
    this.emitEvent('cache_stats', this.getCacheStats());

    this.log('info', 'Cache plugin cleaned up', {
      finalEntries: this.cache.size,
      hitRate: this.calculateHitRate(),
    });
  }

  protected override async processRequest(_context: PluginContext, options: RequestOptions): Promise<RequestOptions> {
    if (!this.isEnabled || !this.shouldCache(options)) {
      return options;
    }

    const cacheKey = this.generateCacheKey(options);
    const cached = this.getCacheEntry(cacheKey);

    if (cached && !this.isExpired(cached)) {
      // Cache hit - return cached response
      this.stats.hits++;
      this.stats.totalRequests++;

      cached.hits++;
      cached.lastAccessed = Date.now();

      // Create mock response from cache
      const cachedResponse: HttpResponse<any> = {
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: cached.metadata?.headers || {},
        duration: 0,
        requestId: `cached_${Date.now()}`,
      };

      // Add extended properties using type assertion for cache metadata
      (cachedResponse as any).config = options;
      (cachedResponse as any).fromCache = true;

      // Emit cache hit event
      this.emitEvent('cache_hit', { key: cacheKey, data: cached });

      this.log('debug', `Cache HIT: ${cacheKey}`, {
        hits: cached.hits,
        age: Date.now() - cached.timestamp,
      });

      // Bypass actual request by modifying options to trigger cached response
      options.metadata = {
        ...options.metadata,
        _cachedResponse: cachedResponse,
        _cacheKey: cacheKey,
      };
    } else {
      // Cache miss
      this.stats.misses++;
      this.stats.totalRequests++;

      // Add cache metadata for response processing
      options.metadata = {
        ...options.metadata,
        _cacheKey: cacheKey,
        _shouldCache: true,
      };

      this.log('debug', `Cache MISS: ${cacheKey}`);
    }

    return options;
  }

  protected override async processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> {
    if (!this.isEnabled) {return response;}

    // Defensive typing for config property
    const responseConfig = (response as any).config;

    // Return cached response if available
    if (responseConfig?.metadata?._cachedResponse) {
      return responseConfig.metadata._cachedResponse;
    }

    // Cache successful responses
    if (responseConfig?.metadata?._shouldCache && this.shouldCacheResponse(response)) {
      const cacheKey = responseConfig.metadata._cacheKey;
      const ttl = this.determineTtl(response);

      this.setInCache(cacheKey, response.data, ttl, {
        url: responseConfig?.url,
        method: responseConfig?.method,
        status: response.status,
        headers: response.headers,
        timestamp: Date.now(),
      });

      this.log('debug', `Cached response: ${cacheKey}`, {
        ttl,
        size: this.calculateSize(response.data),
      });
    }

    return response;
  }

  /**
   * Manually set cache entry
   */
  public setCache<T>(key: string, data: T, ttl?: number, tags: string[] = []): void {
    this.setInCache(key, data, ttl || this.config.defaultTtl, {}, tags);
  }

  /**
   * Get cache entry
   */
  public getCache<T>(key: string): T | undefined {
    const entry = this.getCacheEntry(key);
    if (entry && !this.isExpired(entry)) {
      entry.hits++;
      entry.lastAccessed = Date.now();
      return entry.data;
    }
    return undefined;
  }

  /**
   * Delete cache entry
   */
  public deleteCache(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emitEvent('cache_delete', { key });
      this.log('debug', `Cache entry deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear cache by tags
   */
  public clearByTags(tags: string[]): number {
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.emitEvent('cache_clear', { tags, count: cleared });
      this.log('info', `Cleared ${cleared} cache entries by tags`, { tags });
    }

    return cleared;
  }

  /**
   * Clear all cache
   */
  public clearAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.emitEvent('cache_clear_all', { count });
    this.log('info', `Cleared all cache entries`, { count });
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + this.calculateSize(entry.data), 0);
    const hitRate = this.calculateHitRate();

    const topKeys = entries
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map(entry => ({ key: entry.key, hits: entry.hits }));

    const memoryUsage = this.calculateMemoryUsage(totalSize);

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate,
      missRate: 1 - hitRate,
      evictionCount: this.stats.evictions,
      topKeys,
      memoryUsage,
    };
  }

  /**
   * Warm cache with predefined URLs
   */
  public async warmCache(urls: string[] = this.config.warmupUrls): Promise<void> {
    if (!this.isEnabled || urls.length === 0) {return;}

    this.log('info', `Starting cache warmup for ${urls.length} URLs`);

    for (const url of urls) {
      try {
        const options: RequestOptions = {
          method: 'GET',
          url,
          headers: { 'X-Cache-Warmup': 'true' },
        };

        await this.makeRequest(options);
        this.log('debug', `Warmed cache for: ${url}`);
      } catch (error) {
        this.log('warn', `Failed to warm cache for: ${url}`, { error });
      }
    }

    this.log('info', 'Cache warmup completed');
  }

  /**
   * Set cache warmup rules
   */
  public setWarmupRules(rules: CacheWarmupRule[]): void {
    this.warmupRules = rules;
    this.setConfig('warmupRules', rules);

    // Restart warmup with new rules
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
    }

    if (rules.length > 0) {
      this.startCacheWarmup();
    }

    this.log('info', 'Cache warmup rules updated', { count: rules.length });
  }

  /**
   * Get cache keys matching pattern
   */
  public getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Get cache entries by tags
   */
  public getEntriesByTags(tags: string[]): CacheEntry[] {
    return Array.from(this.cache.values()).filter(entry =>
      tags.some(tag => entry.tags.includes(tag)),
    );
  }

  protected override setInCache<T>(key: string, data: T, ttl: number, metadata: Record<string, any> = {}, tags: string[] = []): void {
    // Check memory limits
    if (this.shouldEvict()) {
      this.evictEntries();
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      lastAccessed: Date.now(),
      tags,
      metadata,
    };

    this.cache.set(key, entry);
    this.emitEvent('cache_set', { key, ttl, tags });
  }

  /**
   * Get full cache entry object
   */
  private getCacheEntry(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  /**
   * Get cached data only (inherited method)
   */
  protected override getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry?.data as T | undefined;
  }

  private shouldCache(options: RequestOptions): boolean {
    // Only cache GET requests by default
    if (options.method !== 'GET') {return false;}

    // Don't cache if explicitly disabled
    if (options.headers?.['X-No-Cache'] === 'true') {return false;}

    // Don't cache warmup requests
    if (options.headers?.['X-Cache-Warmup'] === 'true') {return false;}

    return true;
  }

  private shouldCacheResponse(response: HttpResponse<any>): boolean {
    // Only cache successful responses
    if (response.status < 200 || response.status >= 300) {return false;}

    // Don't cache responses with no-cache headers
    const cacheControl = response.headers?.['cache-control'];
    if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
      return false;
    }

    return true;
  }

  private generateCacheKey(options: RequestOptions): string {
    const url = new URL(options.url, 'https://example.com');
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return `${options.method}:${url.pathname}${params ? `?${  params}` : ''}`;
  }

  private determineTtl(response: HttpResponse<any>): number {
    // Check Cache-Control header
    const cacheControl = response.headers?.['cache-control'];
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAgeValue = maxAgeMatch[1];
        if (maxAgeValue) {
          return parseInt(maxAgeValue) * 1000; // Convert to milliseconds
        }
      }
    }

    // Check Expires header
    const expires = response.headers?.expires;
    if (expires) {
      const expiresTime = new Date(expires).getTime();
      const now = Date.now();
      if (expiresTime > now) {
        return expiresTime - now;
      }
    }

    // Use default TTL
    return this.config.defaultTtl;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private shouldEvict(): boolean {
    return this.cache.size >= this.config.maxSize ||
           this.calculateMemoryUsage().percentage > 90;
  }

  private evictEntries(): void {
    const entriesToEvict = Math.max(1, Math.floor(this.config.maxSize * 0.1)); // Evict 10%
    const entries = Array.from(this.cache.entries());

    let evicted: Array<[string, CacheEntry]>;

    switch (this.config.strategy) {
      case 'lru':
        evicted = entries
          .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
          .slice(0, entriesToEvict);
        break;

      case 'lfu':
        evicted = entries
          .sort(([, a], [, b]) => a.hits - b.hits)
          .slice(0, entriesToEvict);
        break;

      case 'fifo':
      default:
        evicted = entries
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)
          .slice(0, entriesToEvict);
        break;
    }

    for (const [key] of evicted) {
      this.cache.delete(key);
      this.stats.evictions++;
    }

    this.emitEvent('cache_eviction', {
      strategy: this.config.strategy,
      count: evicted.length,
    });

    this.log('debug', `Evicted ${evicted.length} cache entries using ${this.config.strategy} strategy`);
  }

  private cleanupExpiredEntries(): void {
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.emitEvent('cache_cleanup', { count: cleanedCount });
      this.log('debug', `Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  private calculateHitRate(): number {
    return this.stats.totalRequests > 0
      ? this.stats.hits / this.stats.totalRequests
      : 0;
  }

  private calculateSize(data: any): number {
    if (!data) {return 0;}

    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private calculateMemoryUsage(totalSize?: number): { used: number; available: number; percentage: number } {
    const used = totalSize || Array.from(this.cache.values())
      .reduce((sum, entry) => sum + this.calculateSize(entry.data), 0);

    const available = this.config.maxMemoryMB * 1024 * 1024; // Convert MB to bytes
    const percentage = available > 0 ? (used / available) * 100 : 0;

    return { used, available, percentage };
  }

  private startCacheWarmup(): void {
    // Run warmup every hour
    this.warmupInterval = setInterval(() => {
      this.executeWarmupRules();
    }, 3600000) as unknown as NodeJS.Timeout;

    // Initial warmup
    setTimeout(() => this.executeWarmupRules(), 5000);
  }

  private async executeWarmupRules(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayOfWeek = now.getDay();

    for (const rule of this.warmupRules) {
      if (this.shouldExecuteWarmupRule(rule, currentHour, currentMinute, dayOfWeek)) {
        try {
          const urls = this.getUrlsFromPattern(rule.pattern);
          await this.warmCache(urls);
        } catch (error) {
          this.log('warn', `Failed to execute warmup rule: ${rule.pattern}`, { error });
        }
      }
    }
  }

  private shouldExecuteWarmupRule(rule: CacheWarmupRule, hour: number, minute: number, dayOfWeek: number): boolean {
    if (rule.conditions) {
      if (rule.conditions.dayOfWeek && !rule.conditions.dayOfWeek.includes(dayOfWeek)) {
        return false;
      }

      if (rule.conditions.timeRange) {
        const startParts = rule.conditions.timeRange.start.split(':').map(Number);
        const endParts = rule.conditions.timeRange.end.split(':').map(Number);
        const [startHour, startMinute] = startParts;
        const [endHour, endMinute] = endParts;

        if (startHour === undefined || startMinute === undefined ||
            endHour === undefined || endMinute === undefined) {
          return false; // Skip invalid time range
        }

        const currentTime = hour * 60 + minute;
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        if (currentTime < startTime || currentTime > endTime) {
          return false;
        }
      }
    }

    return true;
  }

  private getUrlsFromPattern(pattern: string): string[] {
    // Simple pattern matching - could be enhanced with more sophisticated logic
    if (pattern.includes('*')) {
      // For now, return warmup URLs that match the pattern
      return this.config.warmupUrls.filter(url => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(url);
      });
    }

    return [pattern];
  }

  private async loadPersistedCache(): Promise<void> {
    try {
      const persistedEntries = this.getFromStorage<Array<[string, CacheEntry]>>('cache_entries');
      const persistedStats = this.getFromStorage<typeof this.stats>('cache_stats');

      if (persistedEntries) {
        for (const [key, entry] of persistedEntries) {
          if (!this.isExpired(entry)) {
            this.cache.set(key, entry);
          }
        }
      }

      if (persistedStats) {
        this.stats = { ...this.stats, ...persistedStats };
      }

      this.log('debug', 'Loaded persisted cache', {
        entries: this.cache.size,
        hitRate: this.calculateHitRate(),
      });
    } catch (error) {
      this.log('warn', 'Failed to load persisted cache', { error });
    }
  }

  private async persistCache(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries());
      this.setInStorage('cache_entries', entries);
      this.setInStorage('cache_stats', this.stats);

      this.log('debug', 'Persisted cache', {
        entries: entries.length,
        hitRate: this.calculateHitRate(),
      });
    } catch (error) {
      this.log('warn', 'Failed to persist cache', { error });
    }
  }
}
