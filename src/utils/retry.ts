import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { isConnected, waitForConnection } from './network';

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
  onRetry?: (retryCount: number, error: AxiosError) => void;
  exponentialBackoff?: boolean;
  maxRetryDelay?: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxRetryDelay: 10000,
  retryCondition: (error) => {
    // Retry on network errors and 5xx status codes
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 429; // Server errors or rate limiting
  },
};

/**
 * Sleep utility function
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate retry delay with exponential backoff
 */
export const calculateRetryDelay = (
  retryCount: number,
  baseDelay: number,
  exponentialBackoff: boolean = true,
  maxDelay: number = 10000
): number => {
  if (!exponentialBackoff) {
    return baseDelay;
  }

  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
};

/**
 * Retry a function with configurable retry logic
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.retries; attempt++) {
    try {
      // Wait for network connection if not connected
      if (!isConnected()) {
        const connected = await waitForConnection(30000);
        if (!connected) {
          throw new Error('Network connection timeout');
        }
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === finalConfig.retries) {
        break;
      }

      // Check if we should retry this error
      if (finalConfig.retryCondition && !finalConfig.retryCondition(error as AxiosError)) {
        break;
      }

      // Call onRetry callback if provided
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt + 1, error as AxiosError);
      }

      // Calculate and wait for retry delay
      const delay = calculateRetryDelay(
        attempt,
        finalConfig.retryDelay,
        finalConfig.exponentialBackoff,
        finalConfig.maxRetryDelay
      );

      console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${finalConfig.retries})`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Axios-specific retry interceptor
 */
export class AxiosRetryInterceptor {
  static setupInterceptors(axiosInstance: any, config: Partial<RetryConfig> = {}): void {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

    axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { 
          _retryCount?: number;
          _retried?: boolean;
        };

        // Initialize retry count
        if (!originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        // Check if we should retry
        const shouldRetry = 
          originalRequest._retryCount < finalConfig.retries &&
          !originalRequest._retried &&
          (finalConfig.retryCondition ? finalConfig.retryCondition(error) : true);

        if (!shouldRetry) {
          return Promise.reject(error);
        }

        // Increment retry count
        originalRequest._retryCount += 1;

        // Wait for network connection if needed
        if (!isConnected()) {
          const connected = await waitForConnection(30000);
          if (!connected) {
            return Promise.reject(new Error('Network connection timeout'));
          }
        }

        // Call onRetry callback
        if (finalConfig.onRetry) {
          finalConfig.onRetry(originalRequest._retryCount, error);
        }

        // Calculate retry delay
        const delay = calculateRetryDelay(
          originalRequest._retryCount - 1,
          finalConfig.retryDelay,
          finalConfig.exponentialBackoff,
          finalConfig.maxRetryDelay
        );

        // Wait before retrying
        await sleep(delay);

        // Mark as retried to avoid infinite loops
        originalRequest._retried = true;

        // Retry the request
        return axiosInstance(originalRequest);
      }
    );
  }
}

/**
 * Utility function to check if an error is retryable
 */
export const isRetryableError = (error: AxiosError): boolean => {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  
  // Server errors (5xx)
  if (status >= 500) {
    return true;
  }

  // Rate limiting
  if (status === 429) {
    return true;
  }

  // Unauthorized (might be temporary token issue)
  if (status === 401) {
    return true;
  }

  // Request timeout
  if (status === 408) {
    return true;
  }

  return false;
};

/**
 * Create a retry wrapper for API calls
 */
export const withRetry = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: Partial<RetryConfig>
): T => {
  return ((...args: Parameters<T>) => {
    return retryAsync(() => fn(...args), config);
  }) as T;
};

/**
 * Exponential backoff with jitter
 */
export const calculateJitteredDelay = (
  retryCount: number,
  baseDelay: number,
  maxDelay: number = 10000,
  jitterFactor: number = 0.1
): number => {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = exponentialDelay * jitterFactor * Math.random();
  const delay = exponentialDelay + jitter;
  
  return Math.min(delay, maxDelay);
};