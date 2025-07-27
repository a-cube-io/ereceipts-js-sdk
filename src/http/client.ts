/**
 * Enterprise HTTP Client with Advanced Features
 * Integrates circuit breaker, retry logic, middleware, and comprehensive error handling
 */

import { EventEmitter } from 'eventemitter3';
import { CircuitBreaker, type CircuitBreakerConfig } from './circuit-breaker';
import { RetryHandler, type RetryConfig, DEFAULT_RETRY_CONFIG } from './retry';
import { 
  MiddlewareStack, 
  type RequestContext, 
  type ResponseContext,
  AuthenticationMiddleware,
  RequestIdMiddleware,
  UserAgentMiddleware,
  ContentTypeMiddleware,
  LoggingMiddleware,
  type Middleware,
} from './middleware.js';
import { createErrorFromResponse, ACubeSDKError } from '../errors/index.js';

export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  retryConfig: RetryConfig;
  circuitBreakerConfig: CircuitBreakerConfig;
  headers: Record<string, string>;
  enableCircuitBreaker: boolean;
  enableRetry: boolean;
  enableLogging: boolean;
  userAgent: string;
  getAuthToken?: () => Promise<string | null>;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  metadata?: Record<string, unknown>;
  skipRetry?: boolean;
  skipCircuitBreaker?: boolean;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestId: string;
  duration: number;
  config?: RequestOptions;
  fromCache?: boolean;
}

export class HttpClient extends EventEmitter {
  private middlewareStack: MiddlewareStack;
  private circuitBreaker: CircuitBreaker;
  private retryHandler: RetryHandler;
  private requestCounter = 0;

  constructor(private config: HttpClientConfig) {
    super();
    
    this.middlewareStack = new MiddlewareStack();
    this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);
    this.retryHandler = new RetryHandler(config.retryConfig);
    
    this.setupDefaultMiddlewares();
  }

  private setupDefaultMiddlewares(): void {
    // Authentication middleware (if token provider available)
    if (this.config.getAuthToken) {
      this.middlewareStack.add(new AuthenticationMiddleware(this.config.getAuthToken));
    }

    // Request ID middleware
    this.middlewareStack.add(new RequestIdMiddleware());

    // User Agent middleware
    this.middlewareStack.add(new UserAgentMiddleware(this.config.userAgent));

    // Content Type middleware
    this.middlewareStack.add(new ContentTypeMiddleware());

    // Logging middleware (if enabled)
    if (this.config.enableLogging) {
      this.middlewareStack.add(new LoggingMiddleware(
        {
          debug: (msg, meta) => this.emit('debug', msg, meta),
          warn: (msg, meta) => this.emit('warn', msg, meta),
          error: (msg, meta) => this.emit('error', msg, meta),
        },
        {
          logRequests: true,
          logResponses: true,
          logHeaders: false,
          logBody: false,
        }
      ));
    }
  }

  async request<T = unknown>(options: RequestOptions): Promise<HttpResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Create request context
    const context: RequestContext = {
      url: this.buildUrl(options.url, options.params),
      method: options.method,
      headers: {
        ...this.config.headers,
        ...options.headers,
      },
      body: options.data,
      metadata: options.metadata || {},
      startTime,
      requestId,
    };

    const executeRequest = async (): Promise<HttpResponse<T>> => {
      try {
        // Execute before request middlewares
        const processedContext = await this.middlewareStack.executeBeforeRequest(context);
        
        // Make the actual HTTP request
        const response = await this.makeHttpRequest(processedContext, options.timeout);
        
        // Execute after response middlewares
        const processedResponse = await this.middlewareStack.executeAfterResponse(
          processedContext,
          response
        );
        
        return {
          data: processedResponse.data as T,
          status: processedResponse.status,
          statusText: processedResponse.statusText,
          headers: processedResponse.headers,
          requestId,
          duration: processedResponse.duration,
        };
      } catch (error) {
        // Execute error middlewares
        const processedError = await this.middlewareStack.executeOnError(
          context,
          error as Error
        );
        throw processedError;
      }
    };

    try {
      // Apply circuit breaker if enabled
      if (this.config.enableCircuitBreaker && !options.skipCircuitBreaker) {
        if (this.config.enableRetry && !options.skipRetry) {
          // Both circuit breaker and retry
          return await this.circuitBreaker.execute(
            () => this.retryHandler.execute(() => executeRequest(), `${options.method} ${options.url}`),
            `${options.method} ${options.url}`
          );
        } else {
          // Circuit breaker only
          return await this.circuitBreaker.execute(
            executeRequest,
            `${options.method} ${options.url}`
          );
        }
      } else if (this.config.enableRetry && !options.skipRetry) {
        // Retry only
        return await this.retryHandler.execute(
          executeRequest,
          `${options.method} ${options.url}`
        );
      } else {
        // No circuit breaker or retry
        return await executeRequest();
      }
    } catch (error) {
      // Emit error event for monitoring
      this.emit('requestError', {
        requestId,
        method: options.method,
        url: options.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      
      throw error;
    }
  }

  private async makeHttpRequest(
    context: RequestContext,
    timeoutOverride?: number
  ): Promise<ResponseContext> {
    const timeout = timeoutOverride || this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: context.method,
        headers: context.headers,
        signal: controller.signal,
      };

      if (context.body && context.method !== 'GET') {
        fetchOptions.body = typeof context.body === 'string' 
          ? context.body 
          : JSON.stringify(context.body);
      }

      const response = await fetch(context.url, fetchOptions);
      clearTimeout(timeoutId);

      const endTime = Date.now();
      const duration = endTime - context.startTime;

      // Parse response data
      let data: unknown;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('application/pdf')) {
        data = await response.blob();
      } else if (contentType.includes('text/')) {
        data = await response.text();
      } else {
        data = await response.arrayBuffer();
      }

      // Convert headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const responseContext: ResponseContext = {
        status: response.status,
        statusText: response.statusText,
        headers,
        data,
        metadata: {},
        endTime,
        duration,
      };

      // Check for HTTP errors
      if (!response.ok) {
        const error = createErrorFromResponse(
          {
            status: response.status,
            statusText: response.statusText,
            data,
          },
          `${context.method} ${context.url}`,
          context.requestId
        );
        throw error;
      }

      // Emit success event
      this.emit('requestSuccess', {
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        status: response.status,
        duration,
      });

      return responseContext;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ACubeSDKError) {
        throw error;
      }

      // Handle network/fetch errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw createErrorFromResponse(
            {
              status: 408,
              statusText: 'Request Timeout',
              data: { message: 'Request timeout' },
            },
            `${context.method} ${context.url}`,
            context.requestId
          );
        }
        
        throw createErrorFromResponse(
          {
            status: 0,
            statusText: 'Network Error',
            data: { message: error.message },
          },
          `${context.method} ${context.url}`,
          context.requestId
        );
      }
      
      throw error;
    }
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(path, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Convenience methods
  async get<T = unknown>(
    url: string, 
    options: Omit<RequestOptions, 'method' | 'url'> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    options: Omit<RequestOptions, 'method' | 'url' | 'data'> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'POST', url, data });
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    options: Omit<RequestOptions, 'method' | 'url' | 'data'> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'PUT', url, data });
  }

  async delete<T = unknown>(
    url: string,
    options: Omit<RequestOptions, 'method' | 'url'> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options: Omit<RequestOptions, 'method' | 'url' | 'data'> = {}
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'PATCH', url, data });
  }

  // Middleware management
  addMiddleware(middleware: Middleware): this {
    this.middlewareStack.add(middleware);
    return this;
  }

  removeMiddleware(name: string): this {
    this.middlewareStack.remove(name);
    return this;
  }

  // Health and metrics
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  getRetryMetrics() {
    return this.retryHandler.getMetrics();
  }

  getHealthStatus() {
    return {
      circuitBreaker: this.circuitBreaker.getHealthStatus(),
      retry: this.retryHandler.getMetrics(),
    };
  }

  // Configuration updates
  updateConfig(updates: Partial<HttpClientConfig>): void {
    Object.assign(this.config, updates);
  }

  // Cleanup
  destroy(): void {
    this.circuitBreaker.destroy();
    this.retryHandler.reset();
    this.middlewareStack.clear();
    this.removeAllListeners();
  }
}

// Default configurations
export const DEFAULT_HTTP_CONFIG: HttpClientConfig = {
  baseUrl: 'https://ereceipts-it-sandbox.acubeapi.com',
  timeout: 30000,
  retryConfig: DEFAULT_RETRY_CONFIG,
  circuitBreakerConfig: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 60000,
    name: 'acube-http-client',
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  enableCircuitBreaker: true,
  enableRetry: true,
  enableLogging: true,
  userAgent: 'ACube-SDK/2.0.0',
};

export const AUTH_HTTP_CONFIG: HttpClientConfig = {
  ...DEFAULT_HTTP_CONFIG,
  baseUrl: 'https://common-sandbox.api.acubeapi.com',
  circuitBreakerConfig: {
    ...DEFAULT_HTTP_CONFIG.circuitBreakerConfig,
    name: 'acube-auth-client',
  },
};