import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { HttpRequestConfig, HttpResponse, IHttpPort } from '@/application/ports/driven/http.port';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('HTTP');

export interface AxiosHttpAdapterConfig {
  baseUrl: string;
  timeout?: number;
}

export class AxiosHttpAdapter implements IHttpPort {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(config: AxiosHttpAdapterConfig) {
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
    const response = await this.client.get<T>(url, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.client.post<T>(url, data, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.client.put<T>(url, data, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const response = await this.client.patch<T>(url, data, this.mapConfig(config));
    return this.mapResponse(response);
  }

  async delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
    const response = await this.client.delete<T>(url, this.mapConfig(config));
    return this.mapResponse(response);
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}
