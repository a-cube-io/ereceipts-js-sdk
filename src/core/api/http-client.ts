import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ConfigManager } from '../config';
import { ACubeSDKError } from '../types';

/**
 * HTTP client for API requests
 */
export class HttpClient {
  private client: AxiosInstance;

  constructor(private config: ConfigManager) {
    this.client = this.createClient();
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
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this.transformError(error);
    }
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