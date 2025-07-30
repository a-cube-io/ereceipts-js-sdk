/**
 * Base OpenAPI Resource Class
 * Enterprise-grade foundation for all API resources with full type safety
 *
 * Features:
 * - Type-safe request execution based on OpenAPI specification
 * - Automatic parameter binding (path, query, body)
 * - Schema validation and error handling
 * - Audit trail and metadata tracking
 * - Integration with existing HTTP client and middleware
 */

import type { UnifiedStorage } from '@/storage/unified-storage';
import type { HttpMethod, EndpointDefinition } from '@/generated/endpoints';
import type { HttpClient, RequestOptions as HttpRequestOptions } from '@/http/client';
import type { QueueItem, EnterpriseQueueManager } from '@/storage/queue/queue-manager';

import { EndpointUtils } from '@/generated/endpoints';
import { createQueueItemId } from '@/storage/queue/types';
import { ValidationError, type ACubeSDKError } from '@/errors/index';

export interface BaseResourceConfig {
  client: HttpClient;
  endpoints: Record<string, EndpointDefinition>;
  storage?: UnifiedStorage | undefined;
  queueManager?: EnterpriseQueueManager | undefined;
  offlineEnabled?: boolean;
}

export interface OfflineRequestOptions {
  preferOffline?: boolean;
  queueIfOffline?: boolean;
  skipCache?: boolean;
  cacheTTL?: number; // seconds
  optimistic?: boolean;
}

export interface RequestOptions extends OfflineRequestOptions {
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, unknown>;
  headers?: Record<string, string>;
  metadata?: Record<string, unknown>;
  skipRetry?: boolean;
  skipCircuitBreaker?: boolean;
  timeout?: number;
}

export interface ValidationContext {
  endpoint: EndpointDefinition;
  operation: string;
  data?: unknown;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, unknown>;
}

/**
 * Abstract base class for all OpenAPI-based resources
 * Provides type-safe operations with comprehensive error handling and validation
 * Enhanced with offline-first capabilities
 */
export abstract class BaseOpenAPIResource {
  protected readonly client: HttpClient;

  protected readonly endpoints: Record<string, EndpointDefinition>;

  protected readonly storage?: UnifiedStorage | undefined;

  protected readonly queueManager?: EnterpriseQueueManager | undefined;

  protected readonly offlineEnabled: boolean;

  constructor(config: BaseResourceConfig) {
    this.client = config.client;
    this.endpoints = config.endpoints;
    this.storage = config.storage || undefined;
    this.queueManager = config.queueManager || undefined;
    this.offlineEnabled = config.offlineEnabled ?? false;
  }

  /**
   * Execute a type-safe API request based on OpenAPI endpoint definition
   * Enhanced with offline-first capabilities
   *
   * @template TRequest - Type of request data
   * @template TResponse - Type of response data
   * @param endpointKey - Key to identify the endpoint in the endpoints map
   * @param data - Request body data (for POST/PUT/PATCH requests)
   * @param options - Additional request options including offline preferences
   * @returns Promise resolving to typed response data
   */
  protected async executeRequest<TRequest = unknown, TResponse = unknown>(
    endpointKey: string,
    data?: TRequest,
    options: RequestOptions = {},
  ): Promise<TResponse> {
    const endpoint = this.endpoints[endpointKey];
    if (!endpoint) {
      throw new ValidationError(
        `Unknown endpoint: ${endpointKey}`,
        'execute_request',
        [{ field: 'endpointKey', message: `Endpoint '${endpointKey}' not found`, code: 'UNKNOWN_ENDPOINT' }],
      );
    }

    // Validate the request before execution
    this.validateRequest({ endpoint, operation: endpointKey, data, ...options });

    // Offline-first execution logic
    if (this.offlineEnabled && this.storage) {
      return this.executeOfflineFirstRequest<TRequest, TResponse>(endpoint, endpointKey, data, options);
    }

    // Fallback to standard online execution
    return this.executeOnlineRequest<TRequest, TResponse>(endpoint, endpointKey, data, options);
  }

  /**
   * Execute offline-first request with intelligent fallback
   */
  private async executeOfflineFirstRequest<TRequest = unknown, TResponse = unknown>(
    endpoint: EndpointDefinition,
    endpointKey: string,
    data?: TRequest,
    options: RequestOptions = {},
  ): Promise<TResponse> {
    const cacheKey = this.buildCacheKey(endpoint, options.pathParams, options.queryParams);
    const isReadOperation = endpoint.method === 'GET';
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method);

    try {
      // For read operations, try cache first unless explicitly skipped
      if (isReadOperation && !options.skipCache && !options.preferOffline) {
        const cachedResult = await this.getCachedResponse<TResponse>(cacheKey);
        if (cachedResult) {
          return cachedResult;
        }
      }

      // If prefer offline is set, try offline storage first
      if (options.preferOffline && isReadOperation) {
        const offlineResult = await this.getOfflineData<TResponse>(cacheKey);
        if (offlineResult) {
          return offlineResult;
        }
      }

      // Attempt online execution
      const result = await this.executeOnlineRequest<TRequest, TResponse>(endpoint, endpointKey, data, options);

      // Cache successful read responses
      if (isReadOperation && result) {
        await this.cacheResponse(cacheKey, result, options.cacheTTL);
      }

      return result;

    } catch (error) {
      // Handle offline scenarios for write operations
      if (isWriteOperation && options.queueIfOffline && this.queueManager) {
        return this.queueWriteOperation<TRequest, TResponse>(endpoint, endpointKey, data, options, error as Error);
      }

      // For read operations, try offline data as fallback
      if (isReadOperation) {
        const offlineResult = await this.getOfflineData<TResponse>(cacheKey);
        if (offlineResult) {
          return offlineResult;
        }
      }

      throw error;
    }
  }

  /**
   * Execute standard online request (original implementation)
   */
  private async executeOnlineRequest<TRequest = unknown, TResponse = unknown>(
    endpoint: EndpointDefinition,
    endpointKey: string,
    data?: TRequest,
    options: RequestOptions = {},
  ): Promise<TResponse> {

    // Build the complete URL with path parameters
    const url = this.buildRequestUrl(endpoint, options.pathParams);

    // Prepare request options for HTTP client
    const httpOptions: HttpRequestOptions = {
      method: endpoint.method,
      url,
      data,
      headers: {
        ...this.getDefaultHeaders(endpoint),
        ...options.headers,
      },
      metadata: {
        operationId: endpoint.operationId,
        resource: endpoint.metadata?.resource,
        operation: endpoint.metadata?.operation,
        ...options.metadata,
      },
      skipRetry: options.skipRetry ?? !EndpointUtils.isRetryable(endpoint),
    };

    // Add optional properties only if they have values
    if (options.queryParams) {
      httpOptions.params = options.queryParams;
    }
    if (options.timeout) {
      httpOptions.timeout = options.timeout;
    }
    if (options.skipCircuitBreaker !== undefined) {
      httpOptions.skipCircuitBreaker = options.skipCircuitBreaker;
    }

    try {
      // Execute the HTTP request through the client
      const response = await this.client.request<TResponse>(httpOptions);

      // Validate response if needed
      this.validateResponse(endpoint, response.data);

      return response.data;
    } catch (error) {
      // Enhanced error handling with OpenAPI context
      throw this.enhanceError(error as ACubeSDKError, endpoint, endpointKey, options);
    }
  }

  /**
   * Cache response data with TTL
   */
  private async cacheResponse<TResponse>(cacheKey: string, data: TResponse, ttl?: number): Promise<void> {
    if (!this.storage) {return;}

    try {
      const ttlSeconds = ttl || 3600; // Default 1 hour
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await this.storage.set(cacheKey as any, {
        data,
        timestamp: new Date(),
        expiresAt,
      });
    } catch (error) {
      // Cache failures should not break the main operation
      console.warn('Failed to cache response:', error);
    }
  }

  /**
   * Get cached response if valid
   */
  private async getCachedResponse<TResponse>(cacheKey: string): Promise<TResponse | null> {
    if (!this.storage) {return null;}

    try {
      const cached = await this.storage.get<{
        data: TResponse;
        timestamp: Date;
        expiresAt: Date;
      }>(cacheKey as any);

      if (cached && cached.data && 'expiresAt' in cached.data && new Date() < new Date(cached.data.expiresAt)) {
        return cached.data.data;
      }

      // Remove expired cache entry
      if (cached) {
        await this.storage.delete(cacheKey as any);
      }

      return null;
    } catch (error) {
      console.warn('Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Get offline data (persistent storage)
   */
  private async getOfflineData<TResponse>(cacheKey: string): Promise<TResponse | null> {
    if (!this.storage) {return null;}

    try {
      const offlineKey = `offline:${cacheKey}`;
      const offlineEntry = await this.storage.get(offlineKey as any);
      return (offlineEntry?.data as TResponse) || null;
    } catch (error) {
      console.warn('Failed to get offline data:', error);
      return null;
    }
  }

  /**
   * Queue write operation for later execution
   */
  private async queueWriteOperation<TRequest = unknown, TResponse = unknown>(
    endpoint: EndpointDefinition,
    endpointKey: string,
    data?: TRequest,
    options: RequestOptions = {},
    networkError?: Error,
  ): Promise<TResponse> {
    if (!this.queueManager) {
      throw networkError || new Error('Network unavailable and queue not configured');
    }

    // Create queue item
    const queueItem: QueueItem = {
      id: createQueueItemId(`${endpointKey}_${Date.now()}_${Math.random().toString(36).substring(2)}`),
      operation: this.mapHttpMethodToQueueOperation(endpoint.method),
      resource: 'receipts', // Default resource type - should be passed as parameter
      data: {
        endpoint: endpointKey,
        requestData: data,
        pathParams: options.pathParams,
        queryParams: options.queryParams,
        headers: options.headers,
      },
      priority: this.determinePriority(endpoint),
      status: 'pending' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      retryStrategy: 'exponential' as const,
      conflictResolution: 'client-wins' as const,
      ...(options.metadata && { metadata: options.metadata }),
    };

    // Add to queue
    await this.queueManager.add(queueItem);

    // For optimistic updates, return a placeholder response
    if (options.optimistic) {
      return this.createOptimisticResponse<TResponse>(endpoint, data, options);
    }

    // For non-optimistic updates, throw to indicate operation was queued
    throw new ValidationError(
      'Operation queued for later execution',
      'queued_operation',
      [{ field: 'network', message: 'Operation will be executed when network is available', code: 'QUEUED' }],
    );
  }

  /**
   * Build cache key for request
   */
  private buildCacheKey(
    endpoint: EndpointDefinition,
    pathParams?: Record<string, string | number>,
    queryParams?: Record<string, unknown>,
  ): string {
    let key = `${endpoint.method}:${endpoint.path}`;

    // Add path parameters to key
    if (pathParams) {
      const sortedParams = Object.keys(pathParams).sort();
      const pathParamString = sortedParams.map(key => `${key}=${pathParams[key]}`).join('&');
      key += `?path=${pathParamString}`;
    }

    // Add query parameters to key
    if (queryParams) {
      const sortedParams = Object.keys(queryParams).sort();
      const queryParamString = sortedParams.map(key => `${key}=${queryParams[key]}`).join('&');
      key += `&query=${queryParamString}`;
    }

    return `api_cache:${key}`;
  }

  /**
   * Map HTTP method to queue operation type
   */
  private mapHttpMethodToQueueOperation(method: string): QueueItem['operation'] {
    switch (method.toUpperCase()) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'custom'; // For GET and others
    }
  }

  /**
   * Determine queue priority based on endpoint
   */
  private determinePriority(endpoint: EndpointDefinition): QueueItem['priority'] {
    // Higher priority for receipts and critical operations
    if (endpoint.path.includes('/receipts') || endpoint.path.includes('/cashiers')) {
      return 'high';
    }
    return 'normal';
  }

  /**
   * Create optimistic response for write operations
   */
  private createOptimisticResponse<TResponse>(
    endpoint: EndpointDefinition,
    data: unknown,
    _options: RequestOptions,
  ): TResponse {
    // For POST operations, assume creation succeeded
    if (endpoint.method === 'POST') {
      return {
        ...(data && typeof data === 'object' ? data : {}),
        id: `temp_${Date.now()}`,
        _optimistic: true,
      } as TResponse;
    }

    // For PUT/PATCH, return the updated data
    if (endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
      return {
        ...(data && typeof data === 'object' ? data : {}),
        _optimistic: true,
      } as TResponse;
    }

    // For DELETE, return success indication
    if (endpoint.method === 'DELETE') {
      return {
        success: true,
        _optimistic: true,
      } as TResponse;
    }

    // Default optimistic response
    return {
      success: true,
      _optimistic: true,
    } as TResponse;
  }

  /**
   * Build complete request URL with path parameter substitution
   */
  private buildRequestUrl(endpoint: EndpointDefinition, pathParams: Record<string, string | number> = {}): string {
    return EndpointUtils.buildUrl(endpoint, pathParams);
  }

  /**
   * Get default headers based on endpoint requirements
   */
  private getDefaultHeaders(endpoint: EndpointDefinition): Record<string, string> {
    const headers: Record<string, string> = {};

    // Set content type for requests with body
    if (endpoint.requestBody) {
      headers['Content-Type'] = endpoint.requestBody.contentType;
    }

    // Set default accept header
    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    if (successResponse?.contentType) {
      headers.Accept = successResponse.contentType;
    }

    return headers;
  }

  /**
   * Validate request data against OpenAPI specification
   */
  private validateRequest(context: ValidationContext): void {
    const { endpoint, operation, data, pathParams, queryParams } = context;
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Validate required path parameters
    if (endpoint.parameters?.path) {
      for (const [paramName, paramType] of Object.entries(endpoint.parameters.path)) {
        if (!pathParams || !(paramName in pathParams)) {
          errors.push({
            field: `path.${paramName}`,
            message: `Required path parameter '${paramName}' is missing`,
            code: 'MISSING_PATH_PARAM',
          });
        } else {
          // Type validation for path parameters
          const value = pathParams[paramName];
          if (!this.validateParameterType(value, paramType)) {
            errors.push({
              field: `path.${paramName}`,
              message: `Path parameter '${paramName}' must be of type ${paramType}`,
              code: 'INVALID_PATH_PARAM_TYPE',
            });
          }
        }
      }
    }

    // Validate required request body
    if (endpoint.requestBody?.required && !data) {
      errors.push({
        field: 'body',
        message: 'Request body is required',
        code: 'MISSING_BODY',
      });
    }

    // Validate query parameters (basic type checking)
    if (endpoint.parameters?.query && queryParams) {
      for (const [paramName, paramType] of Object.entries(endpoint.parameters.query)) {
        const value = queryParams[paramName];
        if (value !== undefined && !this.validateParameterType(value, paramType)) {
          errors.push({
            field: `query.${paramName}`,
            message: `Query parameter '${paramName}' must be of type ${paramType}`,
            code: 'INVALID_QUERY_PARAM_TYPE',
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Request validation failed for operation '${operation}'`,
        operation,
        errors,
      );
    }
  }

  /**
   * Basic type validation for parameters
   */
  private validateParameterType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'integer':
      case 'number':
        return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
      case 'boolean':
        return typeof value === 'boolean';
      default:
        return true; // Allow unknown types for now
    }
  }

  /**
   * Validate response data (can be extended for schema validation)
   */
  private validateResponse(endpoint: EndpointDefinition, data: unknown): void {
    // Basic response validation - can be enhanced with JSON schema validation
    if (data === null || data === undefined) {
      // Check if null response is expected
      const hasNullableResponse = Object.keys(endpoint.responses).some(code =>
        code === '204' || endpoint.responses[code]?.description?.toLowerCase().includes('no content'),
      );

      if (!hasNullableResponse) {
        console.warn(`Received null/undefined response for ${endpoint.operationId}`);
      }
    }
  }

  /**
   * Enhance errors with OpenAPI-specific context
   */
  private enhanceError(
    error: ACubeSDKError,
    endpoint: EndpointDefinition,
    operation: string,
    _options: RequestOptions,
  ): ACubeSDKError {
    // Create enhanced error with additional context
    const enhancedError = new (error.constructor as new (...args: any[]) => ACubeSDKError)(
      error.message,
      error.code,
      {
        operation: error.operation || endpoint.operationId,
        retryable: error.retryable !== undefined ? error.retryable : EndpointUtils.isRetryable(endpoint),
        statusCode: error.statusCode,
        requestId: error.requestId,
        auditInfo: {
          ...error.auditInfo,
          // Add OpenAPI-specific audit information
          pemId: endpoint.metadata?.resource === 'point-of-sales' ? String(_options.pathParams?.serial_number || '') : error.auditInfo?.pemId,
        },
        cause: error.cause,
      },
    );

    // Add a custom property for OpenAPI metadata (non-enumerable to avoid serialization issues)
    Object.defineProperty(enhancedError, 'openapiMetadata', {
      value: {
        resource: endpoint.metadata?.resource,
        endpointOperation: operation,
        httpMethod: endpoint.method,
        path: endpoint.path,
      },
      writable: false,
      enumerable: false,
      configurable: false,
    });

    return enhancedError;
  }

  /**
   * Utility method to check if an operation is available
   */
  protected hasOperation(operationKey: string): boolean {
    return operationKey in this.endpoints;
  }

  /**
   * Get endpoint definition for an operation
   */
  protected getEndpoint(operationKey: string): EndpointDefinition | null {
    return this.endpoints[operationKey] || null;
  }

  /**
   * Get all available operations for this resource
   */
  protected getAvailableOperations(): string[] {
    return Object.keys(this.endpoints);
  }

  /**
   * Create a standardized error for missing operations
   */
  protected createUnsupportedOperationError(operation: string): ValidationError {
    return new ValidationError(
      `Operation '${operation}' is not supported by this resource`,
      'unsupported_operation',
      [{
        field: 'operation',
        message: `Available operations: ${this.getAvailableOperations().join(', ')}`,
        code: 'UNSUPPORTED_OPERATION',
      }],
    );
  }

  // Static utility methods for common patterns

  /**
   * Format validation errors for user-friendly display
   */
  static formatValidationErrors(errors: Array<{ field: string; message: string; code: string }>): string {
    return errors.map(error => `${error.field}: ${error.message}`).join(', ');
  }

  /**
   * Extract error details from API response
   */
  static extractErrorDetails(error: unknown): { message: string; details?: unknown } {
    if (error instanceof ValidationError) {
      return {
        message: error.message,
        details: error.violations,
      };
    }

    if (error instanceof Error) {
      return { message: error.message };
    }

    return { message: 'Unknown error occurred' };
  }

  /**
   * Check if error indicates a temporary failure
   */
  static isTemporaryError(error: ACubeSDKError): boolean {
    // Network errors are usually temporary
    if (error.name === 'NetworkError') {
      return true;
    }

    // Some HTTP status codes indicate temporary issues
    if (error.statusCode) {
      return [429, 500, 502, 503, 504].includes(error.statusCode);
    }

    return error.retryable ?? false;
  }

  /**
   * Get retry delay for temporary errors
   */
  static getRetryDelay(_error: ACubeSDKError, attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    let delay = Math.min(baseDelay * 2**(attempt - 1), maxDelay);

    // Add jitter (±25%)
    const jitter = delay * 0.25;
    delay += (Math.random() * 2 - 1) * jitter;

    return Math.floor(delay);
  }

  // Offline utility methods

  /**
   * Check if offline capabilities are enabled for this resource
   */
  protected isOfflineEnabled(): boolean {
    return this.offlineEnabled && Boolean(this.storage);
  }

  /**
   * Check if queue capabilities are enabled for this resource
   */
  protected isQueueEnabled(): boolean {
    return this.offlineEnabled && Boolean(this.queueManager);
  }

  /**
   * Store data for offline use (persistent across sessions)
   */
  protected async storeOfflineData(key: string, data: any): Promise<void> {
    if (!this.storage) {return;}

    try {
      const offlineKey = `offline:${key}`;
      await this.storage.set(offlineKey as any, data);
    } catch (error) {
      console.warn('Failed to store offline data:', error);
    }
  }

  /**
   * Clear cached data for a specific key pattern
   */
  protected async clearCache(keyPattern?: string): Promise<void> {
    if (!this.storage) {return;}

    try {
      if (keyPattern) {
        // Use query to find matching keys
        const results = await this.storage.query({ keyPrefix: `api_cache:${keyPattern}` }) as Array<{ key: any; value: any }>;
        for (const entry of results) {
          await this.storage.delete(entry.key);
        }
      } else {
        // Clear all cache entries for this resource
        const results = await this.storage.query({ keyPrefix: 'api_cache:' }) as Array<{ key: any; value: any }>;
        for (const entry of results) {
          await this.storage.delete(entry.key);
        }
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get offline queue statistics for this resource
   */
  protected async getOfflineStats(): Promise<{
    queuedOperations: number;
    cachedEntries: number;
    offlineEntries: number;
  }> {
    const stats = {
      queuedOperations: 0,
      cachedEntries: 0,
      offlineEntries: 0,
    };

    try {
      if (this.queueManager) {
        const queueStats = this.queueManager.getStats();
        stats.queuedOperations = queueStats.totalItems;
      }

      if (this.storage) {
        // Count cache entries
        const cacheEntries = await this.storage.query({ keyPrefix: 'api_cache:' }) as Array<{ key: any; value: any }>;
        stats.cachedEntries = cacheEntries.length;

        // Count offline entries
        const offlineEntries = await this.storage.query({ keyPrefix: 'offline:' }) as Array<{ key: any; value: any }>;
        stats.offlineEntries = offlineEntries.length;
      }
    } catch (error) {
      console.warn('Failed to get offline stats:', error);
    }

    return stats;
  }

  /**
   * Force sync of queued operations for this resource
   */
  protected async syncQueuedOperations(): Promise<void> {
    if (!this.queueManager) {return;}

    try {
      await this.queueManager.processAll();
    } catch (error) {
      console.warn('Failed to sync queued operations:', error);
      throw error;
    }
  }
}

/**
 * Type-safe endpoint builder for dynamic endpoint creation
 */
export class EndpointBuilder {
  private definition: Partial<EndpointDefinition> = {};

  constructor(path: string, method: HttpMethod) {
    this.definition = {
      path,
      method,
      tags: [],
      responses: {},
    };
  }

  operationId(id: string): this {
    this.definition.operationId = id;
    return this;
  }

  summary(text: string): this {
    this.definition.summary = text;
    return this;
  }

  description(text: string): this {
    this.definition.description = text;
    return this;
  }

  tag(name: string): this {
    this.definition.tags = [...(this.definition.tags || []), name];
    return this;
  }

  requireAuth(): this {
    this.definition.security = [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }];
    return this;
  }

  pathParam(name: string, type: string): this {
    if (!this.definition.parameters) {
      this.definition.parameters = {};
    }
    if (!this.definition.parameters.path) {
      this.definition.parameters.path = {};
    }
    this.definition.parameters.path[name] = type;
    return this;
  }

  queryParam(name: string, type: string): this {
    if (!this.definition.parameters) {
      this.definition.parameters = {};
    }
    if (!this.definition.parameters.query) {
      this.definition.parameters.query = {};
    }
    this.definition.parameters.query[name] = type;
    return this;
  }

  requestBody(schema: string, required = true): this {
    this.definition.requestBody = {
      required,
      contentType: 'application/json',
      schema,
    };
    return this;
  }

  response(statusCode: string, description: string, schema?: string): this {
    if (!this.definition.responses) {
      this.definition.responses = {};
    }
    this.definition.responses[statusCode] = {
      description,
      ...(schema && { contentType: 'application/json', schema }),
    };
    return this;
  }

  metadata(resource: string, operation: string, authRequired = true, retryable = true): this {
    this.definition.metadata = {
      resource,
      operation,
      authRequired,
      retryable,
    };
    return this;
  }

  build(): EndpointDefinition {
    if (!this.definition.operationId) {
      throw new Error('operationId is required');
    }

    return this.definition as EndpointDefinition;
  }
}
