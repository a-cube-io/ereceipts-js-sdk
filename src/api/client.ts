import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { SecureStorageConfig, SecureTokenStorage } from '../storage/token';
import { RequestQueue } from '../storage/queue';
import { AxiosRetryInterceptor } from '../utils/retry';
import { isConnected } from '../utils/network';
import { apiLogger } from '../utils/logger';
import { BaseURLMode, Environment, getBasePath } from '../constants/endpoints';

// Extend AxiosRequestConfig to include our custom properties
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _queued?: boolean;
}

export interface SDKConfig {
  environment: Environment;
  storage: SecureStorageConfig;
  enableRetry?: boolean;
  enableOfflineQueue?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

// Internal config interface that includes automatic network settings
interface InternalSDKConfig extends SDKConfig {
  baseURLMode: BaseURLMode;
  baseURL: string;
  timeout: number;
}

// Default user-facing config (storage must be provided)
const DEFAULT_USER_CONFIG = {
  enableRetry: true,
  enableOfflineQueue: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
};

// Get automatic network settings based on environment and operation type
const getNetworkConfig = (environment: Environment, isAuthOperation = false): { baseURLMode: BaseURLMode; baseURL: string; timeout: number } => {
  const baseURLMode: BaseURLMode = isAuthOperation ? 'auth' : 'api';
  const baseURL = getBasePath(baseURLMode, environment);
  
  // Set timeouts based on operation type
  const timeout = isAuthOperation ? 15000 : // Auth operations: 15s
                  baseURLMode === 'api' ? 30000 : // API operations: 30s  
                  30000; // Default: 30s
  
  return { baseURLMode, baseURL, timeout };
};

class APIClient {
  private axiosInstance: AxiosInstance;
  private config: InternalSDKConfig;
  private userConfig: SDKConfig;
  

  constructor(config: Partial<SDKConfig> = {}) {
    // Validate that storage config is provided
    if (!config.storage) {
      throw new Error('SDKConfig.storage is required. Please provide SecureStorageConfig.');
    }
    
    // Merge user config with defaults
    this.userConfig = { ...DEFAULT_USER_CONFIG, ...config } as SDKConfig;
    
    // Configure SecureTokenStorage automatically
    SecureTokenStorage.configure(this.userConfig.storage);
    
    // Create internal config with automatic network settings
    const networkConfig = getNetworkConfig(this.userConfig.environment, false);
    this.config = {
      ...this.userConfig,
      ...networkConfig,
    };
    
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    const baseURL = this.config.baseURL;
    
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
    // Update user config
    this.userConfig = { ...this.userConfig, ...config };
    
    // Reconfigure SecureTokenStorage if storage config changed
    if (config.storage) {
      SecureTokenStorage.configure(config.storage);
    }
    
    // Update internal config with new automatic settings
    const networkConfig = getNetworkConfig(this.userConfig.environment, false);
    this.config = {
      ...this.userConfig,
      ...networkConfig,
    };
    
    // Recreate axios instance if environment changed
    if (config.environment) {
      this.axiosInstance = this.createAxiosInstance();
      this.setupInterceptors();
    }
  }

  public getConfig(): SDKConfig {
    return { ...this.userConfig };
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

    let nextRequest = await RequestQueue.getNextRequest();
    while (nextRequest) {

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
      
      // Get next request for next iteration
      nextRequest = await RequestQueue.getNextRequest();
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

  // Create a new client instance with auth mode
  public createAuthClient(): APIClient {
    // Create a new instance with auth-specific network settings
    const authNetworkConfig = getNetworkConfig(this.userConfig.environment, true);
    const authClient = Object.create(APIClient.prototype);
    
    // Copy user config and apply auth network settings
    authClient.userConfig = { ...this.userConfig };
    authClient.config = {
      ...this.userConfig,
      ...authNetworkConfig,
    };
    
    authClient.axiosInstance = authClient.createAxiosInstance();
    authClient.setupInterceptors();
    
    return authClient;
  }
}

// Global API client instance
let apiClient: APIClient;

// Initialize API client
export const initializeAPIClient = (config: SDKConfig): APIClient => {
  if (!config.storage) {
    throw new Error('SDKConfig.storage is required for API client initialization. Please provide SecureStorageConfig.');
  }
  apiClient = new APIClient(config);
  return apiClient;
};

// Get current API client instance
export const getAPIClient = (): APIClient => {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initializeAPIClient() first with storage configuration.');
  }
  return apiClient;
};

// Configure SDK (for updates after initialization)
export const configureSDK = (config: Partial<SDKConfig>): void => {
  getAPIClient().updateConfig(config);
};

// Get auth client instance (for authentication endpoints)
export const getAuthClient = (): APIClient => {
  return getAPIClient().createAuthClient();
};

export { APIClient };