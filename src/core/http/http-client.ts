import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ConfigManager } from '../config';
import { ICacheAdapter, INetworkMonitor, IMTLSAdapter } from '../../adapters';
import { CertificateManager } from '../certificates/certificate-manager';
import { IUserProvider } from '../types';
import { clearObject } from '../../utils';

import { MTLSHandler } from './auth/mtls-handler';
import { CacheHandler } from './cache/cache-handler';
import { HttpRequestConfig } from './types';
import { transformError } from './utils/error-transformer';

/**
 * Simplified HTTP client with mTLS and caching support
 */
export class HttpClient {
  private client: AxiosInstance;
  private mtlsHandler: MTLSHandler;
  private cacheHandler: CacheHandler;
  private certificateManager: CertificateManager | null;
  private mtlsAdapter: IMTLSAdapter | null;
  private userProvider: IUserProvider | null;
  private _isDebugEnabled: boolean = false;

  constructor(
    private config: ConfigManager,
    certificateManager?: CertificateManager,
    cache?: ICacheAdapter,
    networkMonitor?: INetworkMonitor,
    mtlsAdapter?: IMTLSAdapter,
    userProvider?: IUserProvider
  ) {
    this.client = axios.create({
      baseURL: this.config.getApiUrl(),
      timeout: this.config.getTimeout(),
      headers: { 'Content-Type': 'application/json' },
    });
    this.certificateManager = certificateManager || null;
    this.mtlsAdapter = mtlsAdapter || null;
    this.userProvider = userProvider || null;
    this._isDebugEnabled = config.isDebugEnabled();
    
    // Initialize handlers
    this.mtlsHandler = new MTLSHandler(
      mtlsAdapter || null,
      certificateManager || null,
      this._isDebugEnabled,
      userProvider
    );
    
    this.cacheHandler = new CacheHandler(
      cache,
      networkMonitor,
      this._isDebugEnabled
    );
    
    // Log initialization state
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Initialized:', {
        hasCertificateManager: !!certificateManager,
        hasCache: !!cache,
        hasNetworkMonitor: !!networkMonitor,
        hasMTLSAdapter: !!mtlsAdapter,
        networkState: networkMonitor?.isOnline() || 'unknown'
      });
    }
  }

  private async createClient(usePort444: boolean = false, withAuth: boolean = false): Promise<AxiosInstance> {
    let baseURL = this.config.getApiUrl();

    // Modify URL for :444 port if needed
    if (usePort444) {
      try {
        const urlObj = new URL(baseURL);
        if (urlObj.port !== '444') {
          urlObj.port = '444';
          baseURL = urlObj.toString();
        }
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] Failed to modify URL for :444, using default:', error);
        }
      }
    }

    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Creating axios client:', {
        baseURL,
        timeout: this.config.getTimeout(),
        usePort444
      });
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if requested
    if (withAuth && this.userProvider) {
      try {
        const token = await this.userProvider.getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          if (this._isDebugEnabled) {
            console.log('[HTTP-CLIENT] JWT token added to client headers');
          }
        }
      } catch (error) {
        if (this._isDebugEnabled) {
          console.error('[HTTP-CLIENT] Failed to get JWT token for client:', error);
        }
      }
    }

    const client = axios.create({
      baseURL,
      timeout: this.config.getTimeout(),
      headers,
    });

    // Add request/response interceptors for debugging
    if (this._isDebugEnabled) {
      client.interceptors.request.use(
        (config) => {
          console.log('[HTTP-CLIENT] Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            baseURL: config.baseURL,
            hasData: !!config.data,
          });
          return config;
        },
        (error) => {
          console.error('[HTTP-CLIENT] Request Error:', error);
          return Promise.reject(error);
        }
      );

      client.interceptors.response.use(
        (response) => {
          console.log('[HTTP-CLIENT] Response:', {
            status: response.status,
            statusText: response.statusText,
            hasData: !!response.data,
          });
          return response;
        },
        (error) => {
          console.error('[HTTP-CLIENT] Response Error:', {
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
   * Get current network status
   */
  getNetworkStatus(): { isOnline: boolean; hasMonitor: boolean } {
    return {
      isOnline: this.cacheHandler.isOnline(),
      hasMonitor: !!this.cacheHandler
    };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.cacheHandler.isOnline();
  }

  /**
   * GET request with authentication and caching support
   */
  async get<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    const authConfig = await this.mtlsHandler.determineAuthConfig(url, config?.authMode, 'GET');
    const client = await this.createClient(authConfig.usePort444, true);

    // Try mTLS first if needed
    if (authConfig.mode === 'mtls' || authConfig.mode === 'auto') {
      try {
        return await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'GET' },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS GET failed:', error);
        }

        if (authConfig.mode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Use JWT with appropriate client (possibly :444)
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT for GET:', {
        url,
        usePort444: authConfig.usePort444
      });
    }

    return this.cacheHandler.handleCachedRequest<T>(
      url,
      () => client.get(url, config),
      config
    );
  }

  /**
   * POST request with authentication support
   */
  async post<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    const authConfig = await this.mtlsHandler.determineAuthConfig(url, config?.authMode, 'POST');
    const cleanedData = data ? clearObject(data) : data;
    const client = await this.createClient(authConfig.usePort444, true);

    if (this._isDebugEnabled && data !== cleanedData) {
      console.log('[HTTP-CLIENT] POST data cleaned:', { original: data, cleaned: cleanedData });
    }

    let result: T;

    // Try mTLS first if needed
    if (authConfig.mode === 'mtls' || authConfig.mode === 'auto') {
      try {
        result = await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'POST', data: cleanedData },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );

        // Auto-invalidate cache after successful POST
        await this.cacheHandler.invalidateAfterMutation(url, 'POST').catch((error) => {
          if (this._isDebugEnabled) {
            console.warn('[HTTP-CLIENT] Cache invalidation failed after POST:', error);
          }
        });

        return result;
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS POST failed:', error);
        }

        if (authConfig.mode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Use JWT with appropriate client (possibly :444)
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT for POST:', {
        url,
        usePort444: authConfig.usePort444
      });
    }

    try {
      const response: AxiosResponse<T> = await client.post(url, cleanedData, config);
      result = response.data;

      // Auto-invalidate cache after successful POST
      await this.cacheHandler.invalidateAfterMutation(url, 'POST').catch((error) => {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] Cache invalidation failed after POST:', error);
        }
      });

      return result;
    } catch (error) {
      throw transformError(error);
    }
  }

  /**
   * PUT request with authentication support
   */
  async put<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    const authConfig = await this.mtlsHandler.determineAuthConfig(url, config?.authMode, 'PUT');
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    const client = await this.createClient(authConfig.usePort444, true);

    if (this._isDebugEnabled && data !== cleanedData) {
      console.log('[HTTP-CLIENT] PUT data cleaned:', { original: data, cleaned: cleanedData });
    }

    let result: T;

    // Try mTLS first if needed
    if (authConfig.mode === 'mtls' || authConfig.mode === 'auto') {
      try {
        result = await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'PUT', data: cleanedData },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );

        // Auto-invalidate cache after successful PUT
        await this.cacheHandler.invalidateAfterMutation(url, 'PUT').catch((error) => {
          if (this._isDebugEnabled) {
            console.warn('[HTTP-CLIENT] Cache invalidation failed after PUT:', error);
          }
        });

        return result;
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS PUT failed:', error);
        }

        if (authConfig.mode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Use JWT with appropriate client (possibly :444)
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT for PUT:', {
        url,
        usePort444: authConfig.usePort444
      });
    }

    try {
      const response: AxiosResponse<T> = await client.put(url, cleanedData, config);
      result = response.data;

      // Auto-invalidate cache after successful PUT
      await this.cacheHandler.invalidateAfterMutation(url, 'PUT').catch((error) => {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] Cache invalidation failed after PUT:', error);
        }
      });

      return result;
    } catch (error) {
      throw transformError(error);
    }
  }

  /**
   * DELETE request with authentication support
   */
  async delete<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    const authConfig = await this.mtlsHandler.determineAuthConfig(url, config?.authMode, 'DELETE');
    const client = await this.createClient(authConfig.usePort444, true);

    let result: T;

    // Try mTLS first if needed
    if (authConfig.mode === 'mtls' || authConfig.mode === 'auto') {
      try {
        result = await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'DELETE' },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );

        // Auto-invalidate cache after successful DELETE
        await this.cacheHandler.invalidateAfterMutation(url, 'DELETE').catch((error) => {
          if (this._isDebugEnabled) {
            console.warn('[HTTP-CLIENT] Cache invalidation failed after DELETE:', error);
          }
        });

        return result;
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS DELETE failed:', error);
        }

        if (authConfig.mode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Use JWT with appropriate client (possibly :444)
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT for DELETE:', {
        url,
        usePort444: authConfig.usePort444
      });
    }

    try {
      const response: AxiosResponse<T> = await client.delete(url, config);
      result = response.data;

      // Auto-invalidate cache after successful DELETE
      await this.cacheHandler.invalidateAfterMutation(url, 'DELETE').catch((error) => {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] Cache invalidation failed after DELETE:', error);
        }
      });

      return result;
    } catch (error) {
      throw transformError(error);
    }
  }

  /**
   * PATCH request with authentication support
   */
  async patch<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    const authConfig = await this.mtlsHandler.determineAuthConfig(url, config?.authMode, 'PATCH');
    const client = await this.createClient(authConfig.usePort444, true);

    // Try mTLS first if needed
    if (authConfig.mode === 'mtls' || authConfig.mode === 'auto') {
      try {
        return await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'PATCH', data },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS PATCH failed:', error);
        }

        if (authConfig.mode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Use JWT with appropriate client (possibly :444)
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT for PATCH:', {
        url,
        usePort444: authConfig.usePort444
      });
    }

    try {
      const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;

      if (this._isDebugEnabled && data !== cleanedData) {
        console.log('[HTTP-CLIENT] PATCH data cleaned:', { original: data, cleaned: cleanedData });
      }

      const response: AxiosResponse<T> = await client.patch(url, cleanedData, config);
      const result = response.data;

      // Auto-invalidate cache after successful PATCH
      await this.cacheHandler.invalidateAfterMutation(url, 'PATCH').catch((error) => {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] Cache invalidation failed after PATCH:', error);
        }
      });

      return result;
    } catch (error) {
      throw transformError(error);
    }
  }

  /**
   * Get mTLS status and certificate information
   */
  async getMTLSStatus() {
    return this.mtlsHandler.getStatus();
  }

  /**
   * Store certificate with coordination between certificate manager and mTLS adapter
   * This ensures old certificates are properly cleared from both SDK storage and native keychain
   */
  async storeCertificate(
    certificate: string,
    privateKey: string,
    options: { format?: 'pem' | 'p12' | 'pkcs12' } = {}
  ): Promise<void> {
    return this.mtlsHandler.storeCertificate(certificate, privateKey, options);
  }

  /**
   * Clear certificate from both certificate manager and native keychain
   */
  async clearCertificate(): Promise<void> {
    return this.mtlsHandler.clearCertificate();
  }

  /**
   * Test mTLS connection
   */
  async testMTLSConnection(): Promise<boolean> {
    return this.mtlsHandler.testConnection();
  }

  /**
   * Check if mTLS is ready for requests
   */
  async isMTLSReady(): Promise<boolean> {
    return this.mtlsHandler.isMTLSReady();
  }

  /**
   * Get the mTLS adapter instance (for backward compatibility)
   */
  getMTLSAdapter() {
    return this.mtlsAdapter;
  }

  /**
   * Get a certificate manager instance
   */
  getCertificateManager(): CertificateManager | null {
    return this.certificateManager;
  }

  /**
   * Get the underlying axios instance for advanced use cases
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  /**
   * Invalidate cache entries
   */
  async invalidateCache(pattern: string): Promise<void> {
    return this.cacheHandler.invalidateCache(pattern);
  }


    get isDebugEnabled(): boolean {
        return this._isDebugEnabled;
    }
}