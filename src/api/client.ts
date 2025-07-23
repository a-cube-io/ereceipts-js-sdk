import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { SecureTokenStorage } from '../storage/token';
import { RequestQueue } from '../storage/queue';
import { AxiosRetryInterceptor } from '../utils/retry';
import { isConnected } from '../utils/network';
import { apiLogger } from '../utils/logger';

// Extend AxiosRequestConfig to include our custom properties
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _queued?: boolean;
}
import { Environment, getBaseURL } from '../constants/endpoints';

export interface SDKConfig {
  environment: Environment;
  baseURL?: string;
  timeout?: number;
  enableRetry?: boolean;
  enableOfflineQueue?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

export const DEFAULT_CONFIG: SDKConfig = {
  environment: 'sandbox',
  timeout: 30000,
  enableRetry: true,
  enableOfflineQueue: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
};

class APIClient {
  private axiosInstance: AxiosInstance;
  private config: SDKConfig;

  constructor(config: Partial<SDKConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    const baseURL = this.config.baseURL ?? getBaseURL(this.config.environment);
    
    return axios.create({
      baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Add authentication token if available
        const token = await SecureTokenStorage.getToken();
        if (token && await SecureTokenStorage.isTokenValid()) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request if enabled
        if (this.config.enableLogging) {
          apiLogger.apiRequest(
            config.url ?? '',
            config.method?.toUpperCase() ?? 'GET',
            config.data
          );
        }

        return config;
      },
      (error: AxiosError) => {
        apiLogger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle responses and errors
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful response
        if (this.config.enableLogging) {
          apiLogger.apiResponse(
            response.config.url ?? '',
            response.status,
            response.data
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { 
          _retry?: boolean;
          _queued?: boolean;
        };

        // Log error
        if (this.config.enableLogging) {
          apiLogger.apiError(originalRequest?.url ?? '', error);
        }

        // Handle authentication errors
        if (error.response?.status === 401 && !originalRequest?._retry) {
          originalRequest._retry = true;
          await this.handleAuthError();
          return Promise.reject(error);
        }

        // Handle offline scenarios
        if (!isConnected() && this.config.enableOfflineQueue) {
          await this.handleOfflineRequest(originalRequest, error);
        }

        return Promise.reject(error);
      }
    );

    // Setup retry interceptor if enabled
    if (this.config.enableRetry) {
      AxiosRetryInterceptor.setupInterceptors(this.axiosInstance, {
        retries: this.config.maxRetries ?? 3,
        retryDelay: this.config.retryDelay ?? 1000,
        onRetry: (retryCount, error) => {
          apiLogger.warn(`Retrying request (${retryCount})`, {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
          });
          apiLogger.retryAttempt(retryCount, this.config.maxRetries ?? 3, this.config.retryDelay ?? 1000);
        },
      });
    }
  }

  private async handleAuthError(): Promise<void> {
    // Clear invalid token
    await SecureTokenStorage.removeToken();
    apiLogger.warn('Authentication token expired or invalid, cleared from storage');
  }

  private async handleOfflineRequest(
    originalRequest?: ExtendedAxiosRequestConfig,
    _error?: AxiosError
  ): Promise<void> {
    if (!originalRequest || originalRequest._queued) {
      return;
    }

    // Only queue POST, PUT, PATCH requests (mutations)
    const method = originalRequest.method?.toUpperCase();
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      originalRequest._queued = true;
      
      const priority = this.determinePriority(originalRequest);
      await RequestQueue.enqueueRequest(originalRequest, priority);
      
      apiLogger.info(`Request queued for retry: ${method} ${originalRequest.url}`, {
        priority,
        queueSize: (await RequestQueue.getQueueStats()).total,
      });
    }
  }

  private determinePriority(request: AxiosRequestConfig): 'high' | 'medium' | 'low' {
    const url = request.url ?? '';
    
    // High priority for critical operations
    if (url.includes('/receipts') || url.includes('/activation')) {
      return 'high';
    }
    
    // Medium priority for business operations
    if (url.includes('/merchants') || url.includes('/cash-register')) {
      return 'medium';
    }
    
    // Low priority for everything else
    return 'low';
  }

  // Public API methods
  public updateConfig(config: Partial<SDKConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recreate axios instance if base URL changed
    if (config.baseURL ?? config.environment) {
      this.axiosInstance = this.createAxiosInstance();
      this.setupInterceptors();
    }
  }

  public getConfig(): SDKConfig {
    return { ...this.config };
  }

  // HTTP methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async post<T = any>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async put<T = any>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async patch<T = any>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  // Advanced methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.request<T>(config);
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  // Utility methods
  public async isAuthenticated(): Promise<boolean> {
    const token = await SecureTokenStorage.getToken();
    return token !== null && await SecureTokenStorage.isTokenValid();
  }

  public async getCurrentToken(): Promise<string | null> {
    return await SecureTokenStorage.getToken();
  }

  // Offline queue management
  public async processOfflineQueue(): Promise<void> {
    if (!isConnected()) {
      apiLogger.warn('Cannot process offline queue: no network connection');
      return;
    }

    const stats = await RequestQueue.getQueueStats();
    if (stats.total === 0) {
      return;
    }

    apiLogger.info(`Processing offline queue: ${stats.total} requests`);

    while (true) {
      const nextRequest = await RequestQueue.getNextRequest();
      if (!nextRequest) {
        break;
      }

      try {
        // Re-add authentication header
        const token = await SecureTokenStorage.getToken();
        if (token && await SecureTokenStorage.isTokenValid()) {
          nextRequest.config.headers = {
            ...nextRequest.config.headers,
            Authorization: `Bearer ${token}`,
          };
        }

        await this.axiosInstance.request(nextRequest.config);
        await RequestQueue.removeRequest(nextRequest.id);
        
        apiLogger.info(`Successfully processed queued request: ${nextRequest.id}`);
      } catch (error) {
        await RequestQueue.incrementRetryCount(nextRequest.id);
        
        if (nextRequest.retryCount >= nextRequest.maxRetries) {
          await RequestQueue.removeRequest(nextRequest.id);
          apiLogger.error(`Failed to process queued request after max retries: ${nextRequest.id}`, error);
        } else {
          apiLogger.warn(`Failed to process queued request, will retry: ${nextRequest.id}`, error);
        }
      }
    }

    // Clean up expired requests
    await RequestQueue.cleanupExpiredRequests();
    
    const finalStats = await RequestQueue.getQueueStats();
    apiLogger.info(`Offline queue processing complete. Remaining: ${finalStats.total} requests`);
  }

  public async getOfflineQueueStats() {
    return await RequestQueue.getQueueStats();
  }

  public async clearOfflineQueue(): Promise<void> {
    await RequestQueue.clearQueue();
    apiLogger.info('Offline queue cleared');
  }
}

// Global API client instance
let apiClient: APIClient;

// Initialize API client
export const initializeAPIClient = (config?: Partial<SDKConfig>): APIClient => {
  apiClient = new APIClient(config);
  return apiClient;
};

// Get current API client instance
export const getAPIClient = (): APIClient => {
  if (!apiClient) {
    apiClient = new APIClient();
  }
  return apiClient;
};

// Configure SDK
export const configureSDK = (config: Partial<SDKConfig>): void => {
  getAPIClient().updateConfig(config);
};

export { APIClient };