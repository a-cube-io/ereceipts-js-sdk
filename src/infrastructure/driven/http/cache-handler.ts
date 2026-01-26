import { AxiosResponse } from 'axios';
import { Subscription } from 'rxjs';

import {
  ICachePort as ICacheAdapter,
  INetworkPort as INetworkMonitor,
} from '@/application/ports/driven';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('CACHE-HANDLER');

export interface CacheConfig {
  useCache?: boolean;
}

export class CacheHandler {
  private currentOnlineState = true;
  private networkSubscription?: Subscription;

  constructor(
    private cache?: ICacheAdapter,
    private networkMonitor?: INetworkMonitor
  ) {
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring(): void {
    if (this.networkMonitor) {
      this.networkSubscription = this.networkMonitor.online$.subscribe((online) => {
        this.currentOnlineState = online;
      });
    }
  }

  isOnline(): boolean {
    if (this.networkMonitor) {
      return this.currentOnlineState;
    }

    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }

    return false;
  }

  async handleCachedRequest<T>(
    url: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    config?: CacheConfig
  ): Promise<T> {
    if (!this.cache || config?.useCache === false) {
      const response = await requestFn();
      return response.data;
    }

    const cacheKey = this.generateCacheKey(url);
    const online = this.isOnline();

    log.debug('Request:', { url, cacheKey, online });

    if (online) {
      try {
        const response = await requestFn();

        if (this.cache) {
          await this.cache.set(cacheKey, response.data).catch((error) => {
            log.error('Failed to cache:', error instanceof Error ? error.message : error);
          });
        }

        return response.data;
      } catch (error) {
        const cached = await this.cache.get<T>(cacheKey).catch(() => null);
        if (cached) {
          log.debug('Network failed, using cache fallback');
          return cached.data;
        }
        throw error;
      }
    } else {
      const cached = await this.cache.get<T>(cacheKey).catch(() => null);
      if (cached) {
        log.debug('Offline, returning cached data');
        return cached.data;
      }

      throw new Error('Offline: No cached data available');
    }
  }

  private generateCacheKey(url: string): string {
    return url;
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.invalidate(pattern);
    } catch (error) {
      log.error('Invalidation failed:', error instanceof Error ? error.message : error);
    }
  }

  getCacheStatus() {
    return {
      available: !!this.cache,
      networkMonitorAvailable: !!this.networkMonitor,
      isOnline: this.isOnline(),
    };
  }

  destroy(): void {
    this.networkSubscription?.unsubscribe();
  }
}
