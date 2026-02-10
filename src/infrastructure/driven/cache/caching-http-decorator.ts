import { Subscription } from 'rxjs';

import { ICachePort, INetworkPort } from '@/application/ports/driven';
import { ICacheKeyGenerator } from '@/application/ports/driven/cache-key.port';
import { HttpRequestConfig, HttpResponse, IHttpPort } from '@/application/ports/driven/http.port';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('CACHE');

export interface CachingHttpDecoratorConfig {
  enabled?: boolean;
}

export class CachingHttpDecorator implements IHttpPort {
  private currentOnlineState = true;
  private networkSubscription?: Subscription;
  private authToken: string | null = null;

  constructor(
    private readonly http: IHttpPort,
    private readonly cache: ICachePort,
    private readonly keyGenerator: ICacheKeyGenerator,
    private readonly networkMonitor?: INetworkPort,
    private readonly config: CachingHttpDecoratorConfig = {}
  ) {
    log.info('CachingHttpDecorator initialized', {
      enabled: config.enabled !== false,
      hasNetworkMonitor: !!networkMonitor,
    });
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    if (this.networkMonitor) {
      this.networkSubscription = this.networkMonitor.online$.subscribe((online) => {
        if (this.currentOnlineState !== online) {
          log.info('Network state changed:', { online });
        }
        this.currentOnlineState = online;
      });
    }
  }

  private isOnline(): boolean {
    if (this.networkMonitor) {
      return this.currentOnlineState;
    }

    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }

    return true;
  }

  async get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const startTime = Date.now();

    // Check if caching is disabled globally
    if (this.config.enabled === false) {
      log.debug('GET (cache disabled globally):', { url });
      return this.http.get<T>(url, config);
    }

    // Check if this URL should be cached
    const shouldCache = this.keyGenerator.shouldCache(url);
    if (!shouldCache) {
      log.debug('GET (not cacheable - likely a list endpoint):', { url });
      return this.http.get<T>(url, config);
    }

    const cacheKey = this.keyGenerator.generate(url, config?.params);
    const ttl = this.keyGenerator.getTTL(url);
    const resource = this.keyGenerator.parseResource(url);

    log.info('GET request starting:', {
      url,
      resource,
      cacheKey,
      ttlMs: ttl,
      ttlMin: Math.round(ttl / 60000),
      params: config?.params,
    });

    // Check cache
    let cached: { data: T; timestamp: number } | null = null;
    try {
      cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        log.debug('Cache entry found:', {
          cacheKey,
          timestamp: new Date(cached.timestamp).toISOString(),
          ageMs: Date.now() - cached.timestamp,
        });
      } else {
        log.debug('Cache entry not found:', { cacheKey });
      }
    } catch (error) {
      log.warn('Cache lookup failed:', {
        cacheKey,
        error: error instanceof Error ? error.message : error,
      });
    }

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const isExpired = age >= ttl;

      log.debug('Cache analysis:', {
        cacheKey,
        ageMs: age,
        ageSec: Math.round(age / 1000),
        ttlMs: ttl,
        isExpired,
        isOnline: this.isOnline(),
      });

      // If within TTL, return cached data
      if (!isExpired) {
        const duration = Date.now() - startTime;
        log.info('CACHE HIT:', {
          url,
          cacheKey,
          ageMs: age,
          durationMs: duration,
        });
        return {
          data: cached.data,
          status: 200,
          headers: { 'x-cache': 'HIT' },
        };
      }

      // If offline and cache is stale, return stale data
      if (!this.isOnline()) {
        const duration = Date.now() - startTime;
        log.info('CACHE STALE (offline):', {
          url,
          cacheKey,
          ageMs: age,
          durationMs: duration,
        });
        return {
          data: cached.data,
          status: 200,
          headers: { 'x-cache': 'STALE' },
        };
      }

      log.debug('Cache expired, fetching fresh data:', { cacheKey, ageMs: age, ttlMs: ttl });
    }

    // Fetch fresh data
    try {
      log.debug('Fetching from network:', { url });
      const response = await this.http.get<T>(url, config);

      // Cache the response
      try {
        await this.cache.set(cacheKey, response.data);
        log.debug('Response cached successfully:', { cacheKey });
      } catch (error) {
        log.error('Failed to cache response:', {
          cacheKey,
          error: error instanceof Error ? error.message : error,
        });
      }

      const duration = Date.now() - startTime;
      log.info('CACHE MISS (fetched fresh):', {
        url,
        cacheKey,
        status: response.status,
        durationMs: duration,
      });

      return {
        ...response,
        headers: { ...response.headers, 'x-cache': 'MISS' },
      };
    } catch (error) {
      // On error, return stale cache if available
      if (cached) {
        const duration = Date.now() - startTime;
        log.warn('CACHE STALE (network error):', {
          url,
          cacheKey,
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: duration,
        });
        return {
          data: cached.data,
          status: 200,
          headers: { 'x-cache': 'STALE' },
        };
      }

      log.error('Network error with no cache fallback:', {
        url,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    log.info('POST request:', { url });
    const response = await this.http.post<T>(url, data, config);
    await this.invalidateRelated(url, 'POST');
    return response;
  }

  async put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    log.info('PUT request:', { url });
    const response = await this.http.put<T>(url, data, config);
    await this.invalidateRelated(url, 'PUT');
    return response;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    log.info('PATCH request:', { url });
    const response = await this.http.patch<T>(url, data, config);
    await this.invalidateRelated(url, 'PATCH');
    return response;
  }

  async delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    log.info('DELETE request:', { url });
    const response = await this.http.delete<T>(url, config);
    await this.invalidateRelated(url, 'DELETE');
    return response;
  }

  setAuthToken(token: string | null): void {
    log.debug('CachingHttpDecorator.setAuthToken called:', {
      hasToken: !!token,
      tokenPrefix: token?.substring(0, 20),
      underlyingHttpType: this.http.constructor.name,
    });
    this.authToken = token;
    this.http.setAuthToken(token);
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  private async invalidateRelated(url: string, method: string): Promise<void> {
    const patterns = this.keyGenerator.getInvalidationPatterns(url, method);

    if (patterns.length === 0) {
      log.debug('No cache patterns to invalidate:', { url, method });
      return;
    }

    log.info('Invalidating cache patterns:', { url, method, patterns });

    for (const pattern of patterns) {
      try {
        await this.cache.invalidate(pattern);
        log.debug('Cache pattern invalidated:', { pattern });
      } catch (error) {
        log.error('Failed to invalidate pattern:', {
          pattern,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  }

  destroy(): void {
    log.debug('CachingHttpDecorator destroyed');
    this.networkSubscription?.unsubscribe();
  }
}
