import axios, { AxiosInstance } from 'axios';

import { HttpRequestConfig, HttpResponse, IHttpPort } from '@/application/ports/driven/http.port';
import { clearObject, createPrefixedLogger } from '@/shared/utils';

import { AuthStrategy } from './auth-strategy';
import { MtlsAuthHandler } from './mtls-auth.handler';

const log = createPrefixedLogger('HTTP-CLIENT');

export interface HttpClientConfig {
  baseUrl: string;
  timeout?: number;
}

export class HttpClient implements IHttpPort {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private baseUrl: string;

  constructor(
    config: HttpClientConfig,
    private readonly authStrategy: AuthStrategy | null = null
  ) {
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

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        log.debug(`${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          log.debug('Request body:', config.data);
        }
        return config;
      },
      (error) => {
        log.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        log.debug(`Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        log.error(`Response error: ${error.response?.status} ${error.message}`);
        if (error.response?.data) {
          log.error('Response body:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  private createClientWithPort444(): AxiosInstance {
    let modifiedBaseUrl = this.baseUrl;

    try {
      const urlObj = new URL(this.baseUrl);
      if (urlObj.port !== '444') {
        urlObj.port = '444';
        modifiedBaseUrl = urlObj.toString();
      }
    } catch {
      log.warn('Failed to modify URL for :444, using default');
    }

    const client = axios.create({
      baseURL: modifiedBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    return client;
  }

  private mapHeaders(response: { headers: Record<string, unknown> }): Record<string, string> {
    const headers: Record<string, string> = {};
    Object.entries(response.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
    return headers;
  }

  async get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    if (this.authStrategy) {
      const authConfig = await this.authStrategy.determineAuthConfig(url, 'GET');

      if (authConfig.mode === 'mtls') {
        const mtlsHandler = this.authStrategy.getMtlsHandler();
        const data = await mtlsHandler.makeRequest<T>(
          url,
          {
            method: 'GET',
            headers: config?.headers as Record<string, string>,
            timeout: config?.timeout,
          },
          this.authToken ? `Bearer ${this.authToken}` : undefined
        );

        return { data, status: 200, headers: {} };
      }

      if (authConfig.usePort444) {
        const client = this.createClientWithPort444();
        const response = await client.get<T>(url, config);
        return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
      }
    }

    const response = await this.client.get<T>(url, config);
    return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
  }

  async post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const cleanedData = data ? clearObject(data) : data;

    if (this.authStrategy) {
      const authConfig = await this.authStrategy.determineAuthConfig(url, 'POST');

      if (authConfig.mode === 'mtls') {
        const mtlsHandler = this.authStrategy.getMtlsHandler();
        const responseData = await mtlsHandler.makeRequest<T>(
          url,
          {
            method: 'POST',
            data: cleanedData,
            headers: config?.headers as Record<string, string>,
            timeout: config?.timeout,
          },
          this.authToken ? `Bearer ${this.authToken}` : undefined
        );

        return { data: responseData, status: 200, headers: {} };
      }

      if (authConfig.usePort444) {
        const client = this.createClientWithPort444();
        const response = await client.post<T>(url, cleanedData, config);
        return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
      }
    }

    const response = await this.client.post<T>(url, cleanedData, config);
    return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
  }

  async put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;

    if (this.authStrategy) {
      const authConfig = await this.authStrategy.determineAuthConfig(url, 'PUT');

      if (authConfig.mode === 'mtls') {
        const mtlsHandler = this.authStrategy.getMtlsHandler();
        const responseData = await mtlsHandler.makeRequest<T>(
          url,
          {
            method: 'PUT',
            data: cleanedData,
            headers: config?.headers as Record<string, string>,
            timeout: config?.timeout,
          },
          this.authToken ? `Bearer ${this.authToken}` : undefined
        );

        return { data: responseData, status: 200, headers: {} };
      }

      if (authConfig.usePort444) {
        const client = this.createClientWithPort444();
        const response = await client.put<T>(url, cleanedData, config);
        return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
      }
    }

    const response = await this.client.put<T>(url, cleanedData, config);
    return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const cleanedData = data && typeof data === 'object' ? clearObject(data) : data;

    if (this.authStrategy) {
      const authConfig = await this.authStrategy.determineAuthConfig(url, 'PATCH');

      if (authConfig.mode === 'mtls') {
        const mtlsHandler = this.authStrategy.getMtlsHandler();
        const responseData = await mtlsHandler.makeRequest<T>(
          url,
          {
            method: 'PATCH',
            data: cleanedData,
            headers: config?.headers as Record<string, string>,
            timeout: config?.timeout,
          },
          this.authToken ? `Bearer ${this.authToken}` : undefined
        );

        return { data: responseData, status: 200, headers: {} };
      }

      if (authConfig.usePort444) {
        const client = this.createClientWithPort444();
        const response = await client.patch<T>(url, cleanedData, config);
        return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
      }
    }

    const response = await this.client.patch<T>(url, cleanedData, config);
    return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
  }

  async delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    if (this.authStrategy) {
      const authConfig = await this.authStrategy.determineAuthConfig(url, 'DELETE');

      if (authConfig.mode === 'mtls') {
        const mtlsHandler = this.authStrategy.getMtlsHandler();
        const data = await mtlsHandler.makeRequest<T>(
          url,
          {
            method: 'DELETE',
            headers: config?.headers as Record<string, string>,
            timeout: config?.timeout,
          },
          this.authToken ? `Bearer ${this.authToken}` : undefined
        );

        return { data, status: 200, headers: {} };
      }

      if (authConfig.usePort444) {
        const client = this.createClientWithPort444();
        const response = await client.delete<T>(url, config);
        return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
      }
    }

    const response = await this.client.delete<T>(url, config);
    return { data: response.data, status: response.status, headers: this.mapHeaders(response) };
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  getMtlsHandler(): MtlsAuthHandler | null {
    return this.authStrategy?.getMtlsHandler() || null;
  }

  async storeCertificate(
    certificate: string,
    privateKey: string,
    options: { format?: 'pem' | 'p12' | 'pkcs12' } = {}
  ): Promise<void> {
    const mtlsHandler = this.getMtlsHandler();
    if (!mtlsHandler) {
      throw new Error('mTLS handler not available');
    }
    await mtlsHandler.storeCertificate(certificate, privateKey, options);
  }

  async clearCertificate(): Promise<void> {
    const mtlsHandler = this.getMtlsHandler();
    if (mtlsHandler) {
      await mtlsHandler.clearCertificate();
    }
  }

  async getMTLSStatus() {
    const mtlsHandler = this.getMtlsHandler();
    if (!mtlsHandler) {
      return {
        adapterAvailable: false,
        certificatePortAvailable: false,
        isReady: false,
        hasCertificate: false,
        certificateInfo: null,
        platformInfo: null,
        pendingRequestsCount: 0,
      };
    }
    return mtlsHandler.getStatus();
  }

  async testMTLSConnection(): Promise<boolean> {
    const mtlsHandler = this.getMtlsHandler();
    if (!mtlsHandler) {
      return false;
    }
    return mtlsHandler.testConnection();
  }

  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
