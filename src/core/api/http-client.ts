import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ConfigManager } from '../config';
import { ACubeSDKError } from '../types';
import { ICacheAdapter, INetworkMonitor } from '../../adapters';
import { clearObject } from '../../utils';
import { 
  IMTLSAdapter, 
  CertificateData, 
  MTLSError, 
  MTLSErrorType,
  MTLSRequestConfig
} from '../../adapters';

/**
 * Authentication modes for requests
 */
export type AuthMode = 'jwt' | 'mtls' | 'dual' | 'auto';

/**
 * Extended request configuration with cache and mTLS options
 */
export interface CacheRequestConfig extends AxiosRequestConfig {
  /** Whether to use cache for this request (default: true if cache available) */
  useCache?: boolean;
  /** Custom cache TTL in milliseconds */
  cacheTtl?: number;
  /** Cache tags for group invalidation */
  cacheTags?: string[];
  /** Force refresh from the server */
  forceRefresh?: boolean;
  /** Authentication mode for this request */
  authMode?: AuthMode;
  /** Force specific port (e.g., 444 for mTLS) */
  port?: number;
  /** Skip mTLS fallback to JWT */
  noFallback?: boolean;
  /** Custom certificate for this request */
  customCertificate?: CertificateData;
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
 * Certificate configuration for cash registers
 */
export interface CashRegisterCertificate {
  cashRegisterId: string;
  certificate: string;
  privateKey: string;
  configuredAt: Date;
  isActive: boolean;
}

/**
 * HTTP client for API requests with mTLS, caching and network monitoring support
 */
export class HttpClient {
  private client: AxiosInstance;
  private cache?: ICacheAdapter;
  private networkMonitor?: INetworkMonitor;
  private mtlsAdapter: IMTLSAdapter | null;
  private certificateCache: Map<string, CashRegisterCertificate> = new Map();
  private isDebugEnabled: boolean = false;

  constructor(
    private config: ConfigManager, 
    cache?: ICacheAdapter,
    networkMonitor?: INetworkMonitor,
    mtlsAdapter?: IMTLSAdapter
  ) {
    this.client = this.createClient();
    this.cache = cache;
    this.networkMonitor = networkMonitor;
    this.mtlsAdapter = mtlsAdapter || null;
    this.isDebugEnabled = config.isDebugEnabled();
    
    // Log initialization state
    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Initialized:', {
        hasCache: !!cache,
        hasNetworkMonitor: !!networkMonitor,
        hasMTLSAdapter: !!mtlsAdapter,
        networkState: networkMonitor?.isOnline() || 'unknown'
      });
    }
  }

  /**
   * Get the mTLS adapter instance (for advanced usage or debugging)
   */
  getMTLSAdapter(): IMTLSAdapter | null {
    return this.mtlsAdapter;
  }

  /**
   * Construct full absolute URL for mTLS requests
   * Uses the mTLS adapter's configured base URL to avoid duplicate transformation
   */
  private constructMTLSUrl(relativePath: string): string {
    // Get the configured mTLS base URL from the adapter
    const mtlsBaseUrl = this.mtlsAdapter?.getBaseUrl();

    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Constructing mTLS URL:', {
        relativePath,
        mtlsBaseUrl,
        source: mtlsBaseUrl ? 'adapter' : 'fallback'
      });
    }
    
    if (!mtlsBaseUrl) {
      // Fallback: transform JWT base URL to mTLS URL if the adapter doesn't have it configured
      const jwtBaseUrl = this.config.getApiUrl();
      const fallbackMtlsBaseUrl = jwtBaseUrl.includes(':443') 
        ? jwtBaseUrl.replace(':443', ':444')
        : jwtBaseUrl.replace(/:\d+$/, '') + ':444';
      
      if (this.isDebugEnabled) {
        console.warn('[HTTP-CLIENT] mTLS adapter base URL not configured, using fallback transformation');
      }
      
      return this.combineUrlAndPath(fallbackMtlsBaseUrl, relativePath);
    }
    
    return this.combineUrlAndPath(mtlsBaseUrl, relativePath);
  }

  /**
   * Combine base URL with a relative path, handling slashes correctly
   */
  private combineUrlAndPath(baseUrl: string, relativePath: string): string {
    // Remove the leading slash from a relative path to avoid double slashes
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    
    // Combine base URL with a path
    const fullUrl = baseUrl.endsWith('/') 
      ? `${baseUrl}${cleanPath}`
      : `${baseUrl}/${cleanPath}`;
    
    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] URL construction:', {
        baseUrl,
        relativePath,
        cleanPath,
        fullUrl,
        source: this.mtlsAdapter?.getBaseUrl() ? 'adapter' : 'fallback'
      });
    }
    
    return fullUrl;
  }


  private createClient(): AxiosInstance {
    if (this.config.isDebugEnabled()) {
      console.log({
        customHeaders: this.config.getCustomHeaders()
      })
    }
    const client = axios.create({
      baseURL: this.config.getApiUrl(),
      timeout: this.config.getTimeout(),
      headers: {
        'Content-Type': 'application/json',
 //       'Access-Control-Allow-Origin': '*',
  //      ...this.config.getCustomHeaders(),
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

  // ==================== mTLS METHODS ====================

  /**
   * Configure a certificate for a cash register
   */
  async configureCashRegisterCertificate(
    cashRegisterId: string, 
    certificate: string, 
    privateKey: string
  ): Promise<void> {
    if (!this.mtlsAdapter) {
      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] mTLS not available, skipping certificate configuration');
      }
      return;
    }

    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Configuring certificate for cash register:', {
        cashRegisterId,
        certificateLength: certificate.length,
        privateKeyLength: privateKey.length
      });
    }

    try {
      const certificateData: CertificateData = {
        certificate,
        privateKey,
        format: 'PEM' // A-Cube uses a PEM format
      };

      await this.mtlsAdapter.configureCertificate(certificateData);

      // Cache certificate configuration
      this.certificateCache.set(cashRegisterId, {
        cashRegisterId,
        certificate,
        privateKey,
        configuredAt: new Date(),
        isActive: true
      });

      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] Certificate configured successfully for cash register:', cashRegisterId);
      }
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[HTTP-CLIENT] Certificate configuration failed:', error);
      }
      throw error;
    }
  }

  /**
   * Check if mTLS is available and configured
   */
  async isMTLSReady(): Promise<boolean> {
    if (!this.mtlsAdapter) return false;
    
    try {
      const hasCert = await this.mtlsAdapter.hasCertificate();
      
      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] mTLS ready check:', {
          adapterAvailable: !!this.mtlsAdapter,
          hasCertificate: hasCert
        });
      }
      
      return hasCert;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[HTTP-CLIENT] mTLS ready check failed:', error);
      }
      return false;
    }
  }

  /**
   * Test mTLS connection
   */
  async testMTLSConnection(): Promise<boolean> {
    if (!this.mtlsAdapter) return false;
    
    try {
      const result = await this.mtlsAdapter.testConnection();
      
      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] mTLS connection test:', result);
      }
      
      return result;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[HTTP-CLIENT] mTLS connection test failed:', error);
      }
      return false;
    }
  }

  /**
   * Determine authentication mode for a request
   */
  private determineAuthMode(url: string, config?: CacheRequestConfig): AuthMode {
    // Explicit mode specified
    if (config?.authMode) {
      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] Using explicit auth mode:', config.authMode);
      }
      return config.authMode;
    }

    // Receipt endpoints should use mTLS (A-Cube requirement)
    if (url.includes('/receipts') || url.includes('/mf1/receipts')) {
      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] Receipt endpoint detected, using mTLS mode');
      }
      return 'mtls';
    }

    // Default to auto mode
    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using auto auth mode');
    }
    return 'auto';
  }

  /**
   * Make a request with mTLS authentication + JWT dual authentication
   * This method combines both mTLS client certificates and JWT tokens
   * for enhanced security as required by A-Cube endpoints
   */
  private async makeRequestMTLS<T>(
    url: string, 
    config: AxiosRequestConfig & { method?: string } = {}
  ): Promise<T> {
    if (!this.mtlsAdapter) {
      throw new MTLSError(
        MTLSErrorType.NOT_SUPPORTED,
        'mTLS adapter not available'
      );
    }

    const isMTLSReady = await this.isMTLSReady();
    if (!isMTLSReady) {
      throw new MTLSError(
        MTLSErrorType.CERTIFICATE_NOT_FOUND,
        'mTLS certificate not configured'
      );
    }

    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Making mTLS request:', {
        method: config.method || 'GET',
        url,
        hasData: !!config.data,
        baseUrl: config.baseURL,
      });
    }

    try {
      // Prepare headers including both request-specific headers and JWT Authorization
      const headers: Record<string, string> = {
        ...(config.headers as Record<string, string> || {
            ...(this.client.defaults.headers.common as Record<string, string>),
            ...(config.method !== 'GET' && config.data ? { 'Content-Type': 'application/json' } : {})
        }),
      };

      // Include JWT Authorization header from axios client defaults if available
      const jwtToken = this.client.defaults.headers.common['Authorization'];
      if (jwtToken && typeof jwtToken === 'string') {
        headers['Authorization'] = jwtToken;
        
        if (this.isDebugEnabled) {
          console.log('[HTTP-CLIENT] Including JWT Authorization header in mTLS request');
        }
      }

      // Construct full absolute URL for mTLS request
      const fullUrl = this.constructMTLSUrl(url);

      const mtlsConfig: MTLSRequestConfig = {
        url: fullUrl,
        method: (config.method || 'GET') as any,
        headers,
        data: config.data,
        timeout: config.timeout
      };

      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] mTLS request config:', JSON.stringify(mtlsConfig, undefined, 2));
      }

      const response = await this.mtlsAdapter.request<T>(mtlsConfig);

      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] mTLS request successful:', {
          status: response.status,
          hasData: !!response.data,
          str: JSON.stringify(response.data)
        });
      }

      return response.data;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[HTTP-CLIENT] mTLS request failed:', error);
      }
      throw error;
    }
  }

  /**
   * Get mTLS status and certificate information
   */
  async getMTLSStatus() {
    const status = {
      adapterAvailable: !!this.mtlsAdapter,
      isReady: false,
      certificateCount: this.certificateCache.size,
      platformInfo: this.mtlsAdapter?.getPlatformInfo() || null,
      connectionTest: false
    };

    if (this.mtlsAdapter) {
      try {
        status.isReady = await this.isMTLSReady();
        status.connectionTest = await this.testMTLSConnection();
      } catch (error) {
        if (this.isDebugEnabled) {
          console.error('[HTTP-CLIENT] Status check failed:', error);
        }
      }
    }

    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] mTLS Status:', status);
    }

    return status;
  }

  /**
   * Remove certificate configuration
   */
  async removeCertificate(cashRegisterId?: string): Promise<void> {
    if (cashRegisterId) {
      this.certificateCache.delete(cashRegisterId);
      
      if (this.isDebugEnabled) {
        console.log('[HTTP-CLIENT] Removed certificate for cash register:', cashRegisterId);
      }
    } else {
      // Remove all certificates
      this.certificateCache.clear();
      
      if (this.mtlsAdapter) {
        try {
          await this.mtlsAdapter.removeCertificate();
          
          if (this.isDebugEnabled) {
            console.log('[HTTP-CLIENT] All certificates removed');
          }
        } catch (error) {
          if (this.isDebugEnabled) {
            console.error('[HTTP-CLIENT] Failed to remove certificates:', error);
          }
        }
      }
    }
  }

  // ==================== END mTLS METHODS ====================

  /**
   * GET request with mTLS support and optional caching
   */
  async get<T>(url: string, config?: CacheRequestConfig): Promise<T> {
    const authMode = this.determineAuthMode(url, config);

    // Try mTLS first for relevant modes
    if (authMode === 'mtls' || authMode === 'auto') {
      try {
        if (await this.isMTLSReady()) {
          return await this.makeRequestMTLS<T>(url, { ...config, method: 'GET' });
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS GET failed, checking fallback:', error);
        }
        
        if (authMode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Fallback to JWT with caching support
    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for GET:', url);
    }
    
    const options = config as CacheRequestConfig | undefined;
    const useCache = options?.useCache !== false && this.cache; // Default to true if cache available

    if (useCache) {
      return this.getCached<T>(url, config, options);
    }

    // Direct HTTP request (existing behavior)
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Cache-aware GET request implementation with network-first strategy
   * - When ONLINE: Always fetch from network and update cache
   * - When OFFLINE: Use cache if available
   */
  private async getCached<T>(url: string, config?: AxiosRequestConfig, options?: CacheRequestConfig): Promise<T> {
    const cacheKey = this.generateCacheKey(url, config);
    const isOnline = this.isOnline();

    if (this.config.isDebugEnabled()) {
      console.log('Cache request (network-first):', {
        url,
        isOnline,
        cacheKey,
        strategy: isOnline ? 'network-first' : 'cache-only',
        hasNetworkMonitor: !!this.networkMonitor,
        networkMonitorType: this.networkMonitor?.constructor.name
      });
    }

    try {
      // ONLINE: Network-first strategy - always fetch fresh data and update cache
      if (isOnline) {
        if (this.config.isDebugEnabled()) {
          console.log('Online: Fetching fresh data from network:', { url, cacheKey });
        }
        return await this.fetchAndCache<T>(url, config, cacheKey, options);
      }

      // OFFLINE: Cache-only strategy - use cached data if available
      if (this.config.isDebugEnabled()) {
        console.log('Offline: Checking cache for data:', { url, cacheKey });
      }

      const cached = await this.cache!.get<T>(cacheKey);
      
      if (cached) {
        if (this.config.isDebugEnabled()) {
          console.log('Cache hit (offline mode):', { 
            url, 
            cacheKey, 
            source: cached.source,
            age: Date.now() - cached.timestamp + 'ms'
          });
        }
        return cached.data;
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
          console.warn('Cache error, falling back to direct network request:', error);
        }
        return await this.fetchAndCache<T>(url, config, cacheKey, options);
      }

      throw this.transformError(error);
    }
  }

  /**
   * Fetch data from the network and cache the result
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
   * Generate a cache key from URL and config
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
   * Check if the device/application is online using the network monitor
   */
  private isOnline(): boolean {
    // Priority 1: Use injected network monitor for accurate platform-specific detection
    if (this.networkMonitor) {
      try {
        console.log('online',this.networkMonitor.isOnline())
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
    
    // Priority 3: Conservative default - assume it offline if you cannot determine
    // This prevents failed requests when the network state is unknown
    return false;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: CacheRequestConfig): Promise<T> {
    const authMode = this.determineAuthMode(url, config);

    // Clear empty/null/undefined values from data before sending
    const cleanedData = data  ? clearObject(data) : data;
    
    if (this.isDebugEnabled && data !== cleanedData) {
      console.log('[HTTP-CLIENT] POST data cleaned:', { original: data, cleaned: cleanedData });
    }

    // Try mTLS first for relevant modes
    if (authMode === 'mtls' || authMode === 'auto') {

        if (await this.isMTLSReady()) {

            if (this.isDebugEnabled) {
                console.log('[HTTP-CLIENT] Making mTLS POST request:', {
                    url,
                    Data: cleanedData
                });
            }

            const response = await this.makeRequestMTLS<T>(url, {
                ...config,
                method: 'POST',
                data: cleanedData
            });

            if (this.isDebugEnabled) {
                console.log('[HTTP-CLIENT] mTLS POST successful:', {
                    response,
                    str: JSON.stringify(response)
                });
            }

            return response
        }
    }

    // Fallback to JWT
    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for POST:', url);
    }
    
    try {
      const response: AxiosResponse<T> = await this.client.post(url, cleanedData, config);
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
    
    // Clear data before processing
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    
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
    
    // Fallback to regular POST with cleaned data
    return this.post<T>(url, cleanedData, config);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: CacheRequestConfig): Promise<T> {
    const authMode = this.determineAuthMode(url, config);

    // Clear empty/null/undefined values from data before sending
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    
    if (this.isDebugEnabled && data !== cleanedData) {
      console.log('[HTTP-CLIENT] PUT data cleaned:', { original: data, cleaned: cleanedData });
    }

    // Try mTLS first for relevant modes
    if (authMode === 'mtls' || authMode === 'auto') {
      try {
        if (await this.isMTLSReady()) {
          return await this.makeRequestMTLS<T>(url, { 
            ...config, 
            method: 'PUT', 
            data: cleanedData 
          });
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS PUT failed, checking fallback:', error);
        }
        
        if (authMode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Fallback to JWT
    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for PUT:', url);
    }
    
    try {
      const response: AxiosResponse<T> = await this.client.put(url, cleanedData, config);
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
    
    // Clear data before processing
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    
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
    
    // Fallback to regular PUT with cleaned data
    return this.put<T>(url, cleanedData, config);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: CacheRequestConfig): Promise<T> {
    const authMode = this.determineAuthMode(url, config);

    // Try mTLS first for relevant modes
    if (authMode === 'mtls' || authMode === 'auto') {
      try {
        if (await this.isMTLSReady()) {
          return await this.makeRequestMTLS<T>(url, { 
            ...config, 
            method: 'DELETE' 
          });
        }
      } catch (error) {
        if (this.isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS DELETE failed, checking fallback:', error);
        }
        
        if (authMode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Fallback to JWT
    if (this.isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for DELETE:', url);
    }
    
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
      // Clear empty/null/undefined values from data before sending
      const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
      
      if (this.config.isDebugEnabled() && data !== cleanedData) {
        console.log('PATCH data cleaned:', { original: data, cleaned: cleanedData });
      }
      
      const response: AxiosResponse<T> = await this.client.patch(url, cleanedData, config);
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
    
    // Clear data before processing
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    
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
    
    // Fallback to regular PATCH with cleaned data
    return this.patch<T>(url, cleanedData, config);
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