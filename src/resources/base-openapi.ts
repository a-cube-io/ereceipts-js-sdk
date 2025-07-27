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

import type { HttpClient, RequestOptions as HttpRequestOptions } from '@/http/client';
import type { EndpointDefinition, HttpMethod } from '@/generated/endpoints';
import { EndpointUtils } from '@/generated/endpoints';
import { ValidationError, type ACubeSDKError } from '@/errors/index';

export interface BaseResourceConfig {
  client: HttpClient;
  endpoints: Record<string, EndpointDefinition>;
}

export interface RequestOptions {
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
 */
export abstract class BaseOpenAPIResource {
  protected readonly client: HttpClient;
  protected readonly endpoints: Record<string, EndpointDefinition>;

  constructor(config: BaseResourceConfig) {
    this.client = config.client;
    this.endpoints = config.endpoints;
  }

  /**
   * Execute a type-safe API request based on OpenAPI endpoint definition
   * 
   * @template TRequest - Type of request data
   * @template TResponse - Type of response data
   * @param endpointKey - Key to identify the endpoint in the endpoints map
   * @param data - Request body data (for POST/PUT/PATCH requests)
   * @param options - Additional request options
   * @returns Promise resolving to typed response data
   */
  protected async executeRequest<TRequest = unknown, TResponse = unknown>(
    endpointKey: string,
    data?: TRequest,
    options: RequestOptions = {}
  ): Promise<TResponse> {
    const endpoint = this.endpoints[endpointKey];
    if (!endpoint) {
      throw new ValidationError(
        `Unknown endpoint: ${endpointKey}`,
        'execute_request',
        [{ field: 'endpointKey', message: `Endpoint '${endpointKey}' not found`, code: 'UNKNOWN_ENDPOINT' }]
      );
    }

    // Validate the request before execution
    this.validateRequest({ endpoint, operation: endpointKey, data, ...options });

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
      headers['Accept'] = successResponse.contentType;
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
        errors
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
        code === '204' || endpoint.responses[code]?.description?.toLowerCase().includes('no content')
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
    _options: RequestOptions
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
      }
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
        code: 'UNSUPPORTED_OPERATION' 
      }]
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
    
    let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter (±25%)
    const jitter = delay * 0.25;
    delay += (Math.random() * 2 - 1) * jitter;
    
    return Math.floor(delay);
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