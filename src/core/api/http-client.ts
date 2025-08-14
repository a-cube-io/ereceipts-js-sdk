import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ConfigManager } from '../config';
import { ACubeSDKError } from '../types';
import { ICacheAdapter, INetworkMonitor } from '../../adapters';

/**
 * Extended request configuration with cache options
 */
export interface CacheRequestConfig extends AxiosRequestConfig {
  /** Whether to use cache for this request (default: true if cache available) */
  useCache?: boolean;
  /** Custom cache TTL in milliseconds */
  cacheTtl?: number;
  /** Cache tags for group invalidation */
  cacheTags?: string[];
  /** Force refresh from server */
  forceRefresh?: boolean;
}

/**
 * Configuration for optimistic operations
 */
export interface OptimisticRequestConfig<T = any> extends AxiosRequestConfig {
  /** Enable optimistic update (requires cache) */
  optimistic?: boolean;
  /** Optimistic data to cache immediately */
  optimisticData?: T;
  /** Cache key for optimistic data */
  cacheKey?: string;
  /** Resource type for the operation */
  resourceType?: string;
  /** Priority for queue operation */
  priority?: number;
}

/**
 * HTTP client for API requests with optional caching and network monitoring support
 */
export class HttpClient {
  private client: AxiosInstance;
  private cache?: ICacheAdapter;
  private networkMonitor?: INetworkMonitor;

  constructor(
    private config: ConfigManager, 
    cache?: ICacheAdapter,
    networkMonitor?: INetworkMonitor
  ) {
    this.client = this.createClient();
    this.cache = cache;
    this.networkMonitor = networkMonitor;
    
    // Log network state on initialization if debug is enabled
    if (this.config.isDebugEnabled() && this.networkMonitor) {
      console.log('HttpClient initialized with network monitor:', {
        isOnline: this.networkMonitor.isOnline(),
        monitorType: this.networkMonitor.constructor.name
      });
    }
  }

  private createClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.getApiUrl(),
      timeout: this.config.getTimeout(),
      headers: {
        'Content-Type': 'application/json',
        ...this.config.getCustomHeaders(),
      },
    });

    // Add request interceptor for debugging
    if (this.config.isDebugEnabled()) {
      client.interceptors.request.use(
        (config) => {
          console.log('API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            headers: config.headers,
            data: config.data,
          });
          return config;
        },
        (error) => {
          console.error('API Request Error:', error);
          return Promise.reject(error);
        }
      );

      client.interceptors.response.use(
        (response) => {
          console.log('API Response:', {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
          });
          return response;
        },
        (error) => {
          console.error('API Response Error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
          });
          return Promise.reject(error);
        }
      );
    }

    return client;
  }

  /**
   * Set network monitor (for backward compatibility and testing)
   */
  setNetworkMonitor(monitor: INetworkMonitor): void {
    this.networkMonitor = monitor;
    
    if (this.config.isDebugEnabled()) {
      console.log('Network monitor updated:', {
        isOnline: monitor.isOnline(),
        monitorType: monitor.constructor.name
      });
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): { isOnline: boolean; hasMonitor: boolean } {
    return {
      isOnline: this.isOnline(),
      hasMonitor: !!this.networkMonitor
    };
  }

  /**
   * Set authorization header
   */
  setAuthorizationHeader(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authorization header
   */
  removeAuthorizationHeader(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * GET request with optional caching support
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const options = config as CacheRequestConfig | undefined;
    const useCache = options?.useCache !== false && this.cache; // Default to true if cache available

    if (useCache) {
      return this.getCached<T>(url, config, options);
    }

    // Fallback to direct HTTP request (existing behavior)
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Cache-aware GET request implementation
   */
  private async getCached<T>(url: string, config?: AxiosRequestConfig, options?: CacheRequestConfig): Promise<T> {
    const cacheKey = this.generateCacheKey(url, config);
    const isOnline = this.isOnline();

    if (this.config.isDebugEnabled()) {
      console.log('Cache request:', {
        url,
        isOnline,
        cacheKey,
        hasNetworkMonitor: !!this.networkMonitor,
        networkMonitorType: this.networkMonitor?.constructor.name
      });
    }
    try {
      // Try cache first
      const cached = await this.cache!.get<T>(cacheKey);
      
      if (cached) {
        if (this.config.isDebugEnabled()) {
          console.log('Cache hit:', { url, cacheKey, source: cached.source });
        }

        // If online, consider background refresh for stale data
        if (isOnline && this.isCacheStale(cached, options?.cacheTtl)) {
          // Background refresh (fire and forget)
          this.refreshCacheInBackground<T>(url, config, cacheKey, options).catch(console.error);
        }

        return cached.data;
      }

      // Cache miss - fetch from network if online
      if (isOnline) {
        return await this.fetchAndCache<T>(url, config, cacheKey, options);
      }

      // Offline and no cache - throw error
      throw new ACubeSDKError(
        'NETWORK_ERROR',
        `No cached data available for ${url} and device is offline`
      );

    } catch (error) {
      if (error instanceof ACubeSDKError) {
        throw error;
      }

      // Cache error - fallback to direct request if online
      if (isOnline) {
        if (this.config.isDebugEnabled()) {
          console.warn('Cache error, falling back to direct request:', error);
        }
        return await this.fetchAndCache<T>(url, config, cacheKey, options);
      }

      throw this.transformError(error);
    }
  }

  /**
   * Fetch data from network and cache the result
   */
  private async fetchAndCache<T>(
    url: string, 
    config?: AxiosRequestConfig, 
    cacheKey?: string,
    options?: CacheRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      
      // Cache the result if cache is available and caching is enabled
      if (this.cache && options?.useCache !== false && cacheKey) {
        const ttl = options?.cacheTtl;
        
        await this.cache.set(cacheKey, response.data, ttl).catch(error => {
          console.warn('Failed to cache response:', error);
        });

        if (this.config.isDebugEnabled()) {
          console.log('Data cached:', { url, cacheKey, ttl });
        }
      }

      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Refresh cache in background without blocking the current request
   */
  private async refreshCacheInBackground<T>(
    url: string,
    config?: AxiosRequestConfig,
    cacheKey?: string,
    options?: CacheRequestConfig
  ): Promise<void> {
    try {
      await this.fetchAndCache<T>(url, config, cacheKey, options);
    } catch (error) {
      if (this.config.isDebugEnabled()) {
        console.warn('Background cache refresh failed:', error);
      }
    }
  }

  /**
   * Generate cache key from URL and config
   */
  private generateCacheKey(url: string, config?: AxiosRequestConfig): string {
    const baseKey = `${this.client.defaults.baseURL}${url}`;
    
    if (config?.params) {
      const params = new URLSearchParams(config.params).toString();
      return `${baseKey}?${params}`;
    }
    
    return baseKey;
  }

  /**
   * Check if cached data is stale based on TTL
   */
  private isCacheStale(cached: any, customTtl?: number): boolean {
    const ttl = customTtl || cached.ttl || 300000; // 5 minutes default
    return Date.now() - cached.timestamp > ttl;
  }

  /**
   * Check if the device/application is online using the network monitor
   */
  private isOnline(): boolean {
    // Priority 1: Use injected network monitor for accurate platform-specific detection
    if (this.networkMonitor) {
      try {
        return this.networkMonitor.isOnline();
      } catch (error) {
        // Network monitor failed, log warning and continue with fallbacks
        if (this.config.isDebugEnabled()) {
          console.warn('Network monitor failed:', error);
        }
        // Continue to fallback options
      }
    }
    
    // Priority 2: Fallback to navigator.onLine for web environments
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    
    // Priority 3: Conservative default - assume offline if cannot determine
    // This prevents failed requests when network state is unknown
    return false;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * POST request with optimistic update support
   */
  async postOptimistic<T>(url: string, data: any, config?: OptimisticRequestConfig<T>): Promise<T> {
    const options = config as OptimisticRequestConfig<T> | undefined;
    
    if (options?.optimistic && this.cache && options.optimisticData && options.cacheKey) {
      // Store optimistic data immediately
      const optimisticItem = {
        data: options.optimisticData,
        timestamp: Date.now(),
        source: 'optimistic' as const,
        syncStatus: 'pending' as const,
        tags: [`optimistic_post`],
      };
      
      await this.cache.setItem(options.cacheKey, optimisticItem);
      
      if (this.config.isDebugEnabled()) {
        console.log('Optimistic POST data cached:', { url, cacheKey: options.cacheKey });
      }
      
      // Return optimistic data immediately
      return options.optimisticData;
    }
    
    // Fallback to regular POST
    return this.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * PUT request with optimistic update support
   */
  async putOptimistic<T>(url: string, data: any, config?: OptimisticRequestConfig<T>): Promise<T> {
    const options = config as OptimisticRequestConfig<T> | undefined;
    
    if (options?.optimistic && this.cache && options.optimisticData && options.cacheKey) {
      // Store optimistic data immediately
      const optimisticItem = {
        data: options.optimisticData,
        timestamp: Date.now(),
        source: 'optimistic' as const,
        syncStatus: 'pending' as const,
        tags: [`optimistic_put`],
      };
      
      await this.cache.setItem(options.cacheKey, optimisticItem);
      
      if (this.config.isDebugEnabled()) {
        console.log('Optimistic PUT data cached:', { url, cacheKey: options.cacheKey });
      }
      
      // Return optimistic data immediately
      return options.optimisticData;
    }
    
    // Fallback to regular PUT
    return this.put<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * DELETE request with optimistic update support
   */
  async deleteOptimistic<T>(url: string, config?: OptimisticRequestConfig<T>): Promise<T> {
    const options = config as OptimisticRequestConfig<T> | undefined;
    
    if (options?.optimistic && this.cache && options.cacheKey) {
      if (options.optimisticData) {
        // Store optimistic state (e.g., marked as deleted)
        const optimisticItem = {
          data: options.optimisticData,
          timestamp: Date.now(),
          source: 'optimistic' as const,
          syncStatus: 'pending' as const,
          tags: [`optimistic_delete`],
        };
        
        await this.cache.setItem(options.cacheKey, optimisticItem);
        
        if (this.config.isDebugEnabled()) {
          console.log('Optimistic DELETE data cached:', { url, cacheKey: options.cacheKey });
        }
        
        return options.optimisticData;
      } else {
        // Remove from cache immediately for hard delete
        await this.cache.invalidate(options.cacheKey);
        
        if (this.config.isDebugEnabled()) {
          console.log('Optimistic DELETE cache invalidated:', { url, cacheKey: options.cacheKey });
        }
        
        return {} as T; // Return empty object for DELETE
      }
    }
    
    // Fallback to regular DELETE
    return this.delete<T>(url, config);
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * PATCH request with optimistic update support
   */
  async patchOptimistic<T>(url: string, data: any, config?: OptimisticRequestConfig<T>): Promise<T> {
    const options = config as OptimisticRequestConfig<T> | undefined;
    
    if (options?.optimistic && this.cache && options.optimisticData && options.cacheKey) {
      // Store optimistic data immediately
      const optimisticItem = {
        data: options.optimisticData,
        timestamp: Date.now(),
        source: 'optimistic' as const,
        syncStatus: 'pending' as const,
        tags: [`optimistic_patch`],
      };
      
      await this.cache.setItem(options.cacheKey, optimisticItem);
      
      if (this.config.isDebugEnabled()) {
        console.log('Optimistic PATCH data cached:', { url, cacheKey: options.cacheKey });
      }
      
      // Return optimistic data immediately
      return options.optimisticData;
    }
    
    // Fallback to regular PATCH
    return this.patch<T>(url, data, config);
  }

  /**
   * Download file (binary response)
   */
  async download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> = await this.client.get(url, {
        ...config,
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Transform axios errors to SDK errors
   */
  private transformError(error: any): ACubeSDKError {
    if (axios.isAxiosError(error)) {
      const response = error.response;
      
      if (!response) {
        return new ACubeSDKError('NETWORK_ERROR', 'Network error occurred', error);
      }

      const status = response.status;
      const data = response.data;
      
      // Try to extract error message from response
      let message = 'Unknown error occurred';
      if (data?.detail) {
        message = data.detail;
      } else if (data?.title) {
        message = data.title;
      } else if (error.message) {
        message = error.message;
      }

      switch (status) {
        case 400:
          return new ACubeSDKError('VALIDATION_ERROR', message, error, status);
        case 401:
          return new ACubeSDKError('AUTH_ERROR', message, error, status);
        case 403:
          return new ACubeSDKError('FORBIDDEN_ERROR', message, error, status);
        case 404:
          return new ACubeSDKError('NOT_FOUND_ERROR', message, error, status);
        case 422:
          return new ACubeSDKError('VALIDATION_ERROR', message, error, status);
        default:
          return new ACubeSDKError('UNKNOWN_ERROR', message, error, status);
      }
    }

    return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error);
  }

  /**
   * Get the underlying axios instance for advanced use cases
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}