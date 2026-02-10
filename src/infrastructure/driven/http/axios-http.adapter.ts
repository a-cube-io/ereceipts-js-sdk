import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { HttpRequestConfig, HttpResponse, IHttpPort } from '@/application/ports/driven/http.port';
import { IMTLSPort, MTLSRequestConfig, MTLSResponse } from '@/application/ports/driven/mtls.port';
import { clearObject, createPrefixedLogger } from '@/shared/utils';

import { AuthStrategy } from './auth-strategy';

const logJwt = createPrefixedLogger('HTTP-JWT');
const logMtls = createPrefixedLogger('HTTP-MTLS');

export interface AxiosHttpAdapterConfig {
  baseUrl: string;
  timeout?: number;
}

export class AxiosHttpAdapter implements IHttpPort {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private mtlsAdapter: IMTLSPort | null = null;
  private authStrategy: AuthStrategy | null = null;
  private baseUrl: string;

  constructor(config: AxiosHttpAdapterConfig) {
    this.baseUrl = config.baseUrl;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setMTLSAdapter(adapter: IMTLSPort | null): void {
    this.mtlsAdapter = adapter;
    logMtls.debug('mTLS adapter configured:', !!adapter);
  }

  setAuthStrategy(strategy: AuthStrategy | null): void {
    this.authStrategy = strategy;
    logJwt.debug('Auth strategy configured:', !!strategy);
  }

  private async shouldUseMTLS(url: string, method: string): Promise<boolean> {
    if (!this.mtlsAdapter) {
      logJwt.debug(`No mTLS adapter, using JWT for ${method} ${url}`);
      return false;
    }

    if (this.authStrategy) {
      const config = await this.authStrategy.determineAuthConfig(url, method);
      const logger = config.mode === 'mtls' ? logMtls : logJwt;
      logger.debug(`Auth config for ${method} ${url}:`, config);
      return config.mode === 'mtls';
    }

    // Fallback: use mTLS for mf1/mf2 endpoints if no strategy
    // This should rarely happen - only before SDK is fully initialized
    const useMtls = url.startsWith('/mf1') || url.startsWith('/mf2');
    if (useMtls) {
      logMtls.warn(`No auth strategy set, falling back to mTLS for ${method} ${url}`);
    }
    return useMtls;
  }

  private async makeMTLSRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    if (!this.mtlsAdapter) {
      throw new Error('mTLS adapter not available');
    }

    const fullUrl = this.constructMtlsUrl(url);

    const headers: Record<string, string> = {
      ...(method !== 'GET' && data ? { 'Content-Type': 'application/json' } : {}),
      ...(config?.headers || {}),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      logMtls.debug('JWT token present for mTLS request');
    } else {
      logMtls.warn('No JWT token for mTLS request');
    }

    const mtlsConfig: MTLSRequestConfig = {
      url: fullUrl,
      method,
      headers,
      data,
      timeout: config?.timeout,
    };

    logMtls.debug(`mTLS ${method} ${fullUrl}`);
    if (data) {
      logMtls.debug('Request body:', data);
    }

    try {
      const response: MTLSResponse<T> = await this.mtlsAdapter.request<T>(mtlsConfig);
      logMtls.debug(`mTLS Response ${response.status} from ${fullUrl}`);
      if (response.data) {
        logMtls.debug('Response body:', response.data);
      }
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      logMtls.error(`mTLS Response error from ${fullUrl}:`, error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } };
        if (axiosError.response?.data) {
          logMtls.error('Response body:', axiosError.response.data);
        }
      }
      throw error;
    }
  }

  private constructMtlsUrl(relativePath: string): string {
    const mtlsBaseUrl = this.mtlsAdapter?.getBaseUrl() || this.baseUrl;
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    return mtlsBaseUrl.endsWith('/') ? `${mtlsBaseUrl}${cleanPath}` : `${mtlsBaseUrl}/${cleanPath}`;
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
          logJwt.debug('Adding JWT token to request', {
            tokenPrefix: this.authToken.substring(0, 30) + '...',
            tokenLength: this.authToken.length,
          });
        } else {
          logJwt.warn('No JWT token available for request:', { url: config.url });
        }

        const method = config.method?.toUpperCase() ?? 'UNKNOWN';
        const authHeader = config.headers.Authorization;

        // Log full request details for debugging
        logJwt.info(`→ ${method} ${config.url}`, {
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`,
          hasAuthHeader: !!authHeader,
          authHeaderValue: authHeader ? `${String(authHeader).substring(0, 50)}...` : 'MISSING',
        });

        if (config.params && Object.keys(config.params as object).length > 0) {
          logJwt.debug('Request params:', config.params);
        }

        if (config.data) {
          logJwt.debug('Request body:', config.data);
        }

        return config;
      },
      (error) => {
        logJwt.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        const method = response.config.method?.toUpperCase() ?? 'UNKNOWN';
        logJwt.debug(`← ${method} ${response.status} ${response.config.url}`);

        if (response.data) {
          logJwt.debug('Response body:', response.data);
        }

        return response;
      },
      (error) => {
        const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
        logJwt.error(
          `← ${method} ${error.response?.status ?? 'ERR'} ${error.config?.url ?? 'unknown'}`
        );

        if (error.response?.data) {
          logJwt.error('Response body:', error.response.data);
        }

        return Promise.reject(error);
      }
    );
  }

  private mapConfig(config?: HttpRequestConfig): AxiosRequestConfig {
    if (!config) return {};

    return {
      headers: config.headers,
      params: config.params,
      timeout: config.timeout,
      responseType: config.responseType,
      data: config.data,
    };
  }

  private mapResponse<T>(response: AxiosResponse<T>): HttpResponse<T> {
    const headers: Record<string, string> = {};
    Object.entries(response.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });

    return {
      data: response.data,
      status: response.status,
      headers,
    };
  }

  async get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    if (await this.shouldUseMTLS(url, 'GET')) {
      return this.makeMTLSRequest<T>(url, 'GET', undefined, config);
    }
    const response = await this.client.get<T>(url, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const cleanedData = data ? clearObject(data) : data;
    if (await this.shouldUseMTLS(url, 'POST')) {
      return this.makeMTLSRequest<T>(url, 'POST', cleanedData, config);
    }
    const response = await this.client.post<T>(url, cleanedData, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    if (await this.shouldUseMTLS(url, 'PUT')) {
      return this.makeMTLSRequest<T>(url, 'PUT', cleanedData, config);
    }
    const response = await this.client.put<T>(url, cleanedData, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    if (await this.shouldUseMTLS(url, 'PATCH')) {
      return this.makeMTLSRequest<T>(url, 'PATCH', cleanedData, config);
    }
    const response = await this.client.patch<T>(url, cleanedData, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const data = config?.data;
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;
    if (await this.shouldUseMTLS(url, 'DELETE')) {
      return this.makeMTLSRequest<T>(url, 'DELETE', cleanedData, config);
    }
    const response = await this.client.delete<T>(url, this.mapConfig(config));
    return this.mapResponse(response);
  }

  setAuthToken(token: string | null): void {
    logJwt.info('setAuthToken called:', {
      hasToken: !!token,
      tokenPrefix: token?.substring(0, 20),
    });
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
