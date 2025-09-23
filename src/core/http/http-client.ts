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
import { 
  CertificateError, 
  CertificateErrorType
} from '../certificates/certificate-errors';

/**
 * Simplified HTTP client with mTLS and caching support
 */
export class HttpClient {
  private client: AxiosInstance;
  private mtlsHandler: MTLSHandler;
  private cacheHandler: CacheHandler;
  private certificateManager: CertificateManager | null;
  private mtlsAdapter: IMTLSAdapter | null;
  private _isDebugEnabled: boolean = false;

  constructor(
    private config: ConfigManager,
    certificateManager?: CertificateManager,
    cache?: ICacheAdapter,
    networkMonitor?: INetworkMonitor,
    mtlsAdapter?: IMTLSAdapter,
    userProvider?: IUserProvider
  ) {
    this.client = this.createClient();
    this.certificateManager = certificateManager || null;
    this.mtlsAdapter = mtlsAdapter || null;
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

  private createClient(): AxiosInstance {
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Creating axios client:', {
        baseURL: this.config.getApiUrl(),
        timeout: this.config.getTimeout()
      });
    }

    const client = axios.create({
      baseURL: this.config.getApiUrl(),
      timeout: this.config.getTimeout(),
      headers: {
        'Content-Type': 'application/json',
      },
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
   * GET request with mTLS support and caching
   */
  async get<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    const authMode = await this.mtlsHandler.determineAuthMode(url, config?.authMode);
    const requiresMTLS = this.mtlsHandler.requiresMTLS(url);

    // Try mTLS first for relevant modes (no pre-flight check - let makeRequestMTLS handle retry)
    if (authMode === 'mtls' || authMode === 'auto') {
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
        
        if (error instanceof CertificateError && requiresMTLS) {
          throw error;
        }
        
        if (authMode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    } else if (requiresMTLS && authMode === 'jwt') {
      throw new CertificateError(
        CertificateErrorType.MTLS_REQUIRED,
        `Endpoint ${url} requires mTLS authentication but JWT mode was specified`
      );
    }

    // Fallback to JWT with caching support
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for GET:', url);
    }
    
    return this.cacheHandler.handleCachedRequest<T>(
      url,
      () => this.client.get(url, config),
      config
    );
  }

  /**
   * POST request with mTLS support
   */
  async post<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    const authMode = await this.mtlsHandler.determineAuthMode(url, config?.authMode);
    const cleanedData = data ? clearObject(data) : data;
    
    if (this._isDebugEnabled && data !== cleanedData) {
      console.log('[HTTP-CLIENT] POST data cleaned:', { original: data, cleaned: cleanedData });
    }

    // Try mTLS first for relevant modes (no pre-flight check - let makeRequestMTLS handle retry)
    if (authMode === 'mtls' || authMode === 'auto') {
      try {
        return await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'POST', data: cleanedData },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS POST failed:', error);
        }
        
        if (authMode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Fallback to JWT
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for POST:', url);
    }
    
    try {
      const response: AxiosResponse<T> = await this.client.post(url, cleanedData, config);
      return response.data;
    } catch (error) {
      throw transformError(error);
    }
  }

  /**
   * PUT request with mTLS support
   */
  async put<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    const authMode = await this.mtlsHandler.determineAuthMode(url, config?.authMode);
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    
    if (this._isDebugEnabled && data !== cleanedData) {
      console.log('[HTTP-CLIENT] PUT data cleaned:', { original: data, cleaned: cleanedData });
    }

    // Try mTLS first for relevant modes (no pre-flight check - let makeRequestMTLS handle retry)
    if (authMode === 'mtls' || authMode === 'auto') {
      try {
        return await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'PUT', data: cleanedData },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS PUT failed:', error);
        }
        
        if (authMode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Fallback to JWT
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for PUT:', url);
    }
    
    try {
      const response: AxiosResponse<T> = await this.client.put(url, cleanedData, config);
      return response.data;
    } catch (error) {
      throw transformError(error);
    }
  }

  /**
   * DELETE request with mTLS support
   */
  async delete<T>(url: string, config?: HttpRequestConfig): Promise<T> {
    const authMode = await this.mtlsHandler.determineAuthMode(url, config?.authMode);

    // Try mTLS first for relevant modes (no pre-flight check - let makeRequestMTLS handle retry)
    if (authMode === 'mtls' || authMode === 'auto') {
      try {
        return await this.mtlsHandler.makeRequestMTLS<T>(
          url,
          { ...config, method: 'DELETE' },
          undefined,
          this.client.defaults.headers.common['Authorization'] as string
        );
      } catch (error) {
        if (this._isDebugEnabled) {
          console.warn('[HTTP-CLIENT] mTLS DELETE failed:', error);
        }
        
        if (authMode === 'mtls' && config?.noFallback) {
          throw error;
        }
      }
    }

    // Fallback to JWT
    if (this._isDebugEnabled) {
      console.log('[HTTP-CLIENT] Using JWT fallback for DELETE:', url);
    }
    
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw transformError(error);
    }
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<T> {
    try {
      const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
      
      if (this._isDebugEnabled && data !== cleanedData) {
        console.log('[HTTP-CLIENT] PATCH data cleaned:', { original: data, cleaned: cleanedData });
      }
      
      const response: AxiosResponse<T> = await this.client.patch(url, cleanedData, config);
      return response.data;
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