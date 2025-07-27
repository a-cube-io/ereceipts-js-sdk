import { EventEmitter } from 'eventemitter3';

/**
 * Advanced Retry Logic with Exponential Backoff and Jitter
 * Prevents thundering herd problem and provides intelligent retry policies
 */
interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterType: 'none' | 'full' | 'equal' | 'decorrelated';
    retryableStatusCodes: number[];
    retryableErrors: string[];
    timeout?: number;
}
interface RetryAttempt {
    attempt: number;
    delay: number;
    error: Error;
    timestamp: number;
}
interface RetryMetrics {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    averageDelay: number;
    attempts: RetryAttempt[];
}
declare class RetryHandler {
    private config;
    private metrics;
    constructor(config: RetryConfig);
    execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T>;
    private executeWithTimeout;
    private shouldRetry;
    private calculateDelay;
    private extractStatusCode;
    private extractErrorCode;
    private isNetworkError;
    private sleep;
    getMetrics(): Readonly<RetryMetrics>;
    reset(): void;
}
declare const DEFAULT_RETRY_CONFIG: RetryConfig;
declare const AGGRESSIVE_RETRY_CONFIG: RetryConfig;
declare const CONSERVATIVE_RETRY_CONFIG: RetryConfig;

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring service health
 */
type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    resetTimeout: number;
    healthCheckInterval?: number;
    name?: string;
}
interface CircuitBreakerMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastFailureTime: number | null;
    lastSuccessTime: number | null;
    stateChanges: Array<{
        from: CircuitBreakerState;
        to: CircuitBreakerState;
        timestamp: number;
        reason: string;
    }>;
}
declare class CircuitBreaker {
    private config;
    private state;
    private metrics;
    private nextAttemptTime;
    private healthCheckTimer;
    constructor(config: CircuitBreakerConfig);
    execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T>;
    private executeWithTimeout;
    private shouldRejectRequest;
    private onSuccess;
    private onFailure;
    private transitionTo;
    private startHealthCheck;
    private performHealthCheck;
    getState(): CircuitBreakerState;
    getMetrics(): Readonly<CircuitBreakerMetrics>;
    reset(): void;
    destroy(): void;
    getHealthStatus(): {
        isHealthy: boolean;
        failureRate: number;
        avgResponseTime?: number;
        uptime: number;
    };
}

/**
 * Middleware Stack for HTTP Client
 * Allows for request/response interception and modification
 */
interface RequestContext {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
    metadata: Record<string, unknown>;
    startTime: number;
    requestId: string;
}
interface ResponseContext {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: unknown;
    metadata: Record<string, unknown>;
    endTime: number;
    duration: number;
}
interface Middleware {
    name: string;
    priority: number;
    beforeRequest?(context: RequestContext): Promise<RequestContext> | RequestContext;
    afterResponse?(context: RequestContext, response: ResponseContext): Promise<ResponseContext> | ResponseContext;
    onError?(context: RequestContext, error: Error): Promise<Error | void> | Error | void;
}
declare class MiddlewareStack {
    private middlewares;
    add(middleware: Middleware): this;
    remove(name: string): this;
    executeBeforeRequest(context: RequestContext): Promise<RequestContext>;
    executeAfterResponse(context: RequestContext, response: ResponseContext): Promise<ResponseContext>;
    executeOnError(context: RequestContext, error: Error): Promise<Error>;
    getMiddlewares(): Readonly<Middleware[]>;
    clear(): this;
}
declare class AuthenticationMiddleware implements Middleware {
    private getToken;
    name: string;
    priority: number;
    constructor(getToken: () => Promise<string | null>);
    beforeRequest(context: RequestContext): Promise<RequestContext>;
}
declare class RequestIdMiddleware implements Middleware {
    name: string;
    priority: number;
    beforeRequest(context: RequestContext): RequestContext;
}
declare class UserAgentMiddleware implements Middleware {
    private userAgent;
    name: string;
    priority: number;
    constructor(userAgent: string);
    beforeRequest(context: RequestContext): RequestContext;
}
declare class ContentTypeMiddleware implements Middleware {
    name: string;
    priority: number;
    beforeRequest(context: RequestContext): RequestContext;
}
declare class LoggingMiddleware implements Middleware {
    private logger;
    private options;
    name: string;
    priority: number;
    constructor(logger: {
        debug: (message: string, meta?: unknown) => void;
        warn: (message: string, meta?: unknown) => void;
        error: (message: string, meta?: unknown) => void;
    }, options?: {
        logRequests: boolean;
        logResponses: boolean;
        logHeaders: boolean;
        logBody: boolean;
        sanitizeHeaders?: string[];
    });
    beforeRequest(context: RequestContext): RequestContext;
    afterResponse(context: RequestContext, response: ResponseContext): ResponseContext;
    onError(context: RequestContext, error: Error): Error;
    private sanitizeHeaders;
    private sanitizeBody;
}
declare class RateLimitingMiddleware implements Middleware {
    private config;
    name: string;
    priority: number;
    private requests;
    constructor(config: {
        requestsPerMinute: number;
        keyGenerator?: (context: RequestContext) => string;
    });
    beforeRequest(context: RequestContext): Promise<RequestContext>;
}
declare class PerformanceMiddleware implements Middleware {
    name: string;
    priority: number;
    private metrics;
    afterResponse(context: RequestContext, response: ResponseContext): ResponseContext;
    getMetrics(): Record<string, {
        count: number;
        averageDuration: number;
        minDuration: number;
        maxDuration: number;
    }>;
    reset(): void;
}

interface HttpClientConfig {
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
interface RequestOptions$1 {
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
interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    requestId: string;
    duration: number;
}
declare class HttpClient extends EventEmitter {
    private config;
    private middlewareStack;
    private circuitBreaker;
    private retryHandler;
    private requestCounter;
    constructor(config: HttpClientConfig);
    private setupDefaultMiddlewares;
    request<T = unknown>(options: RequestOptions$1): Promise<HttpResponse<T>>;
    private makeHttpRequest;
    private buildUrl;
    private generateRequestId;
    get<T = unknown>(url: string, options?: Omit<RequestOptions$1, 'method' | 'url'>): Promise<HttpResponse<T>>;
    post<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions$1, 'method' | 'url' | 'data'>): Promise<HttpResponse<T>>;
    put<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions$1, 'method' | 'url' | 'data'>): Promise<HttpResponse<T>>;
    delete<T = unknown>(url: string, options?: Omit<RequestOptions$1, 'method' | 'url'>): Promise<HttpResponse<T>>;
    patch<T = unknown>(url: string, data?: unknown, options?: Omit<RequestOptions$1, 'method' | 'url' | 'data'>): Promise<HttpResponse<T>>;
    addMiddleware(middleware: Middleware): this;
    removeMiddleware(name: string): this;
    getCircuitBreakerMetrics(): Readonly<CircuitBreakerMetrics>;
    getRetryMetrics(): Readonly<RetryMetrics>;
    getHealthStatus(): {
        circuitBreaker: {
            isHealthy: boolean;
            failureRate: number;
            avgResponseTime?: number;
            uptime: number;
        };
        retry: Readonly<RetryMetrics>;
    };
    updateConfig(updates: Partial<HttpClientConfig>): void;
    destroy(): void;
}
declare const DEFAULT_HTTP_CONFIG: HttpClientConfig;
declare const AUTH_HTTP_CONFIG: HttpClientConfig;

/**
 * Branded types for type-safe IDs and values
 * Prevents mixing different types of IDs at compile time
 */
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & {
    [__brand]: TBrand;
};
type ReceiptId = Brand<string, 'ReceiptId'>;
type CashierId = Brand<number, 'CashierId'>;
type PEMId = Brand<string, 'PEMId'>;
type MerchantId = Brand<string, 'MerchantId'>;
type CashRegisterId = Brand<string, 'CashRegisterId'>;
type SerialNumber = Brand<string, 'SerialNumber'>;
type FiscalId = Brand<string, 'FiscalId'>;
type DocumentNumber = Brand<string, 'DocumentNumber'>;
type Amount = Brand<string, 'Amount'>;
type VATRate = Brand<string, 'VATRate'>;
type Quantity = Brand<string, 'Quantity'>;
declare const createReceiptId: (id: string) => ReceiptId;
declare const createCashierId: (id: number) => CashierId;
declare const createPEMId: (id: string) => PEMId;
declare const createMerchantId: (id: string) => MerchantId;
declare const createCashRegisterId: (id: string) => CashRegisterId;
declare const createSerialNumber: (sn: string) => SerialNumber;
declare const createFiscalId: (id: string) => FiscalId;
declare const createDocumentNumber: (dn: string) => DocumentNumber;
declare const createAmount: (amount: string) => Amount;
declare const createVATRate: (rate: string) => VATRate;
declare const createQuantity: (qty: string) => Quantity;
declare const isReceiptId: (value: unknown) => value is ReceiptId;
declare const isCashierId: (value: unknown) => value is CashierId;
declare const isFiscalId: (value: unknown) => value is FiscalId;
declare const isAmount: (value: unknown) => value is Amount;

/**
 * Type-safe event system for SDK
 * Discriminated unions ensure type safety for event payloads
 */

interface BaseEvent {
    timestamp: Date;
    requestId: string;
}
interface ReceiptCreatedEvent extends BaseEvent {
    type: 'receipt.created';
    data: {
        receiptId: ReceiptId;
        amount: string;
        fiscalId: string;
        cashierId?: CashierId;
        pemId?: PEMId;
    };
}
interface ReceiptVoidedEvent extends BaseEvent {
    type: 'receipt.voided';
    data: {
        receiptId: ReceiptId;
        originalReceiptId: ReceiptId;
        reason: string;
        documentNumber?: DocumentNumber;
    };
}
interface ReceiptReturnedEvent extends BaseEvent {
    type: 'receipt.returned';
    data: {
        receiptId: ReceiptId;
        originalReceiptId: ReceiptId;
        returnedItems: Array<{
            description: string;
            quantity: string;
            amount: string;
        }>;
    };
}
interface ReceiptTransmittedEvent extends BaseEvent {
    type: 'receipt.transmitted';
    data: {
        receiptId: ReceiptId;
        documentNumber: DocumentNumber;
        transmissionDate: Date;
        fiscalResponse: unknown;
    };
}
interface PEMActivatedEvent extends BaseEvent {
    type: 'pem.activated';
    data: {
        pemId: PEMId;
        serialNumber: SerialNumber;
        activationKey: string;
        status: 'ACTIVE';
    };
}
interface PEMStatusChangedEvent extends BaseEvent {
    type: 'pem.status_changed';
    data: {
        pemId: PEMId;
        serialNumber: SerialNumber;
        previousStatus: string;
        newStatus: string;
        reason?: string;
    };
}
interface CashierCreatedEvent extends BaseEvent {
    type: 'cashier.created';
    data: {
        cashierId: CashierId;
        email: string;
        merchantId: MerchantId;
    };
}
interface CashierDeletedEvent extends BaseEvent {
    type: 'cashier.deleted';
    data: {
        cashierId: CashierId;
        email: string;
    };
}
interface MerchantCreatedEvent extends BaseEvent {
    type: 'merchant.created';
    data: {
        merchantId: MerchantId;
        fiscalId: string;
        name: string;
        email: string;
    };
}
interface MerchantUpdatedEvent extends BaseEvent {
    type: 'merchant.updated';
    data: {
        merchantId: MerchantId;
        changes: Record<string, unknown>;
    };
}
interface ErrorEvent extends BaseEvent {
    type: 'error';
    data: {
        errorCode: string;
        errorMessage: string;
        operation: string;
        retry: boolean;
        context?: Record<string, unknown>;
    };
}
interface AuthenticationEvent extends BaseEvent {
    type: 'auth.success' | 'auth.failed' | 'auth.expired' | 'auth.refreshed';
    data: {
        userId?: string;
        role?: 'provider' | 'merchant' | 'cashier';
        expiresAt?: Date;
        error?: string;
    };
}
type ACubeSDKEvent = ReceiptCreatedEvent | ReceiptVoidedEvent | ReceiptReturnedEvent | ReceiptTransmittedEvent | PEMActivatedEvent | PEMStatusChangedEvent | CashierCreatedEvent | CashierDeletedEvent | MerchantCreatedEvent | MerchantUpdatedEvent | ErrorEvent | AuthenticationEvent;
type EventTypeMap = {
    [K in ACubeSDKEvent['type']]: Extract<ACubeSDKEvent, {
        type: K;
    }>['data'];
};
type WebhookEvent = Extract<ACubeSDKEvent, ReceiptTransmittedEvent | PEMActivatedEvent | PEMStatusChangedEvent | ErrorEvent>;
type ClientEvent = Exclude<ACubeSDKEvent, WebhookEvent>;

/**
 * Generated Endpoint Definitions from OpenAPI Specification
 * Comprehensive endpoint configurations for all API resources
 *
 * This file is auto-generated based on openapi.yaml
 * Do not edit manually - use regeneration scripts instead
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
interface EndpointDefinition {
    path: string;
    method: HttpMethod;
    operationId: string;
    summary?: string;
    description?: string;
    tags: string[];
    security?: Array<Record<string, string[]>>;
    parameters?: {
        path?: Record<string, string>;
        query?: Record<string, string>;
        header?: Record<string, string>;
    };
    requestBody?: {
        required: boolean;
        contentType: string;
        schema: string;
    };
    responses: {
        [statusCode: string]: {
            description: string;
            contentType?: string;
            schema?: string;
        };
    };
    metadata?: {
        resource: string;
        operation: string;
        authRequired: boolean;
        retryable: boolean;
    };
}
/**
 * Cashier Endpoints - User account management for cashiers
 */
declare class CashierEndpoints {
    static readonly LIST: EndpointDefinition;
    static readonly CREATE: EndpointDefinition;
    static readonly ME: EndpointDefinition;
    static readonly GET_BY_ID: EndpointDefinition;
    static readonly DELETE: EndpointDefinition;
}
/**
 * Point of Sales Endpoints - PEM device management
 */
declare class PointOfSalesEndpoints {
    static readonly LIST: EndpointDefinition;
    static readonly GET_BY_SERIAL: EndpointDefinition;
    static readonly CLOSE_JOURNAL: EndpointDefinition;
    static readonly ACTIVATION: EndpointDefinition;
    static readonly CREATE_INACTIVITY: EndpointDefinition;
    static readonly SET_OFFLINE: EndpointDefinition;
}
/**
 * Receipt Endpoints - Electronic receipt management
 */
declare class ReceiptEndpoints {
    static readonly LIST: EndpointDefinition;
    static readonly CREATE: EndpointDefinition;
    static readonly VOID: EndpointDefinition;
    static readonly GET_BY_UUID: EndpointDefinition;
    static readonly VOID_WITH_PROOF: EndpointDefinition;
    static readonly GET_DETAILS: EndpointDefinition;
    static readonly RETURN_ITEMS: EndpointDefinition;
    static readonly RETURN_ITEMS_WITH_PROOF: EndpointDefinition;
}
/**
 * Cash Register Endpoints - Cash register management
 */
declare class CashRegisterEndpoints {
    static readonly CREATE: EndpointDefinition;
    static readonly LIST: EndpointDefinition;
    static readonly GET_BY_ID: EndpointDefinition;
}
/**
 * Merchant Endpoints - Business entity management
 */
declare class MerchantEndpoints {
    static readonly LIST: EndpointDefinition;
    static readonly CREATE: EndpointDefinition;
    static readonly GET_BY_UUID: EndpointDefinition;
    static readonly UPDATE: EndpointDefinition;
}
/**
 * PEM Endpoints - Point of Sale Module certificate management
 */
declare class PEMEndpoints {
    static readonly CREATE_POS: EndpointDefinition;
    static readonly GET_CERTIFICATES: EndpointDefinition;
}

/**
 * Enterprise-grade error handling system
 * Hierarchical error types with retry logic and audit information
 */
declare abstract class ACubeSDKError extends Error {
    readonly code: string;
    readonly timestamp: Date;
    readonly requestId: string;
    readonly operation: string;
    readonly retryable: boolean;
    readonly statusCode?: number;
    readonly auditInfo?: AuditInfo;
    readonly cause?: Error;
    constructor(message: string, code: string, options: {
        operation: string;
        retryable?: boolean;
        statusCode?: number;
        requestId?: string;
        auditInfo?: AuditInfo;
        cause?: Error;
    });
    toJSON(): Record<string, unknown>;
}
interface AuditInfo {
    userId?: string;
    role?: 'provider' | 'merchant' | 'cashier';
    fiscalId?: string;
    receiptId?: string;
    pemId?: string;
    ipAddress?: string;
    userAgent?: string;
}
declare class NetworkError extends ACubeSDKError {
    constructor(message: string, operation: string, options?: {
        statusCode?: number;
        requestId?: string;
        retryable?: boolean;
        cause?: Error;
    });
}
declare class AuthenticationError extends ACubeSDKError {
    constructor(message: string, operation: string, options?: {
        statusCode?: number;
        requestId?: string;
        auditInfo?: AuditInfo;
    });
}
declare class AuthorizationError extends ACubeSDKError {
    constructor(message: string, operation: string, options?: {
        statusCode?: number;
        requestId?: string;
        auditInfo?: AuditInfo;
    });
}
declare class ValidationError extends ACubeSDKError {
    readonly violations: ValidationViolation[];
    constructor(message: string, operation: string, violations: ValidationViolation[], options?: {
        requestId?: string;
        auditInfo?: AuditInfo;
    });
    toJSON(): Record<string, unknown>;
}
interface ValidationViolation {
    field: string;
    message: string;
    code: string;
    value?: unknown;
}
declare class FiscalError extends ACubeSDKError {
    readonly fiscalCode?: string;
    readonly documentNumber?: string;
    constructor(message: string, operation: string, options?: {
        fiscalCode?: string;
        documentNumber?: string;
        statusCode?: number;
        requestId?: string;
        retryable?: boolean;
        auditInfo?: AuditInfo;
    });
    toJSON(): Record<string, unknown>;
}
declare class RateLimitError extends ACubeSDKError {
    readonly retryAfter?: number;
    constructor(message: string, operation: string, options?: {
        retryAfter?: number;
        requestId?: string;
    });
    toJSON(): Record<string, unknown>;
}
declare class ConfigurationError extends ACubeSDKError {
    constructor(message: string, operation: string, options?: {
        requestId?: string;
    });
}
declare class NotFoundError extends ACubeSDKError {
    readonly resourceType: string;
    readonly resourceId: string;
    constructor(resourceType: string, resourceId: string, operation: string, options?: {
        requestId?: string;
        auditInfo?: AuditInfo;
    });
    toJSON(): Record<string, unknown>;
}
declare class CircuitBreakerError extends ACubeSDKError {
    readonly state: 'OPEN' | 'HALF_OPEN';
    constructor(message: string, operation: string, state: 'OPEN' | 'HALF_OPEN', options?: {
        requestId?: string;
    });
    toJSON(): Record<string, unknown>;
}
declare function createErrorFromResponse(response: {
    status: number;
    statusText: string;
    data?: unknown;
}, operation: string, requestId?: string): ACubeSDKError;

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

interface BaseResourceConfig {
    client: HttpClient;
    endpoints: Record<string, EndpointDefinition>;
}
interface RequestOptions {
    pathParams?: Record<string, string | number>;
    queryParams?: Record<string, unknown>;
    headers?: Record<string, string>;
    metadata?: Record<string, unknown>;
    skipRetry?: boolean;
    skipCircuitBreaker?: boolean;
    timeout?: number;
}
interface ValidationContext {
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
declare abstract class BaseOpenAPIResource {
    protected readonly client: HttpClient;
    protected readonly endpoints: Record<string, EndpointDefinition>;
    constructor(config: BaseResourceConfig);
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
    protected executeRequest<TRequest = unknown, TResponse = unknown>(endpointKey: string, data?: TRequest, options?: RequestOptions): Promise<TResponse>;
    /**
     * Build complete request URL with path parameter substitution
     */
    private buildRequestUrl;
    /**
     * Get default headers based on endpoint requirements
     */
    private getDefaultHeaders;
    /**
     * Validate request data against OpenAPI specification
     */
    private validateRequest;
    /**
     * Basic type validation for parameters
     */
    private validateParameterType;
    /**
     * Validate response data (can be extended for schema validation)
     */
    private validateResponse;
    /**
     * Enhance errors with OpenAPI-specific context
     */
    private enhanceError;
    /**
     * Utility method to check if an operation is available
     */
    protected hasOperation(operationKey: string): boolean;
    /**
     * Get endpoint definition for an operation
     */
    protected getEndpoint(operationKey: string): EndpointDefinition | null;
    /**
     * Get all available operations for this resource
     */
    protected getAvailableOperations(): string[];
    /**
     * Create a standardized error for missing operations
     */
    protected createUnsupportedOperationError(operation: string): ValidationError;
    /**
     * Format validation errors for user-friendly display
     */
    static formatValidationErrors(errors: Array<{
        field: string;
        message: string;
        code: string;
    }>): string;
    /**
     * Extract error details from API response
     */
    static extractErrorDetails(error: unknown): {
        message: string;
        details?: unknown;
    };
    /**
     * Check if error indicates a temporary failure
     */
    static isTemporaryError(error: ACubeSDKError): boolean;
    /**
     * Get retry delay for temporary errors
     */
    static getRetryDelay(_error: ACubeSDKError, attempt: number): number;
}

/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */
/** OneOf type helpers */
type Without<T, U> = {
    [P in Exclude<keyof T, keyof U>]?: never;
};
type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;
type OneOf<T extends any[]> = T extends [infer Only] ? Only : T extends [infer A, infer B, ...infer Rest] ? OneOf<[XOR<A, B>, ...Rest]> : never;
interface components {
    schemas: {
        /** ActivationRequest */
        "E-Receipt_IT_API_ActivationRequest": {
            /** Registration Key */
            registration_key: string;
        };
        /** Address */
        "E-Receipt_IT_API_Address": {
            /**
             * Street Address
             * @description The street address associated to the PEM
             */
            street_address: string;
            /**
             * Zip Code
             * @description The zip code associated to the PEM
             */
            zip_code: string;
            /**
             * City
             * @description The city associated to the PEM
             */
            city: string;
            /**
             * Province
             * @description The province associated to the PEM
             */
            province: string;
        };
        /** CashRegisterBasicOutput */
        "E-Receipt_IT_API_CashRegisterBasicOutput": {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Pem Serial Number */
            pem_serial_number: string;
            /** Name */
            name: string;
        };
        /** CashRegisterCreate */
        "E-Receipt_IT_API_CashRegisterCreate": {
            /** Pem Serial Number */
            pem_serial_number: string;
            /** Name */
            name: string;
        };
        /** CashRegisterDetailedOutput */
        "E-Receipt_IT_API_CashRegisterDetailedOutput": {
            /**
             * Id
             * Format: uuid
             */
            id: string;
            /** Pem Serial Number */
            pem_serial_number: string;
            /** Name */
            name: string;
            /** Mtls Certificate */
            mtls_certificate: string;
            /** Private Key */
            private_key: string;
        };
        /** CashierCreateInput */
        "E-Receipt_IT_API_CashierCreateInput": {
            /** Email */
            email: string;
            /** Password */
            password: string;
        };
        /** CashierOutput */
        "E-Receipt_IT_API_CashierOutput": {
            /** Id */
            id: number;
            /** Email */
            email: string;
        };
        /** ErrorModel400BadRequest */
        "E-Receipt_IT_API_ErrorModel400BadRequest": {
            /**
             * Type
             * @default /errors/400
             */
            type?: string;
            /**
             * Title
             * @default Bad Request
             */
            title?: string;
            /**
             * Status
             * @default 400
             */
            status?: number;
            /**
             * Detail
             * @default A human-readable explanation specific to this occurrence of the problem
             */
            detail?: string;
            /**
             * Instance
             * @default A URI reference that identifies the specific occurrence of the problem
             */
            instance?: string | null;
        };
        /** ErrorModel401Unauthorized */
        "E-Receipt_IT_API_ErrorModel401Unauthorized": {
            /**
             * Type
             * @default /errors/401
             */
            type?: string;
            /**
             * Title
             * @default Could not validate credentials
             */
            title?: string;
            /**
             * Status
             * @default 401
             */
            status?: number;
            /**
             * Detail
             * @default A human-readable explanation specific to this occurrence of the problem
             */
            detail?: string;
            /**
             * Instance
             * @default A URI reference that identifies the specific occurrence of the problem
             */
            instance?: string | null;
        };
        /** ErrorModel403Forbidden */
        "E-Receipt_IT_API_ErrorModel403Forbidden": {
            /**
             * Type
             * @default /errors/403
             */
            type?: string;
            /**
             * Title
             * @default Forbidden
             */
            title?: string;
            /**
             * Status
             * @default 403
             */
            status?: number;
            /**
             * Detail
             * @default A human-readable explanation specific to this occurrence of the problem
             */
            detail?: string;
            /**
             * Instance
             * @default A URI reference that identifies the specific occurrence of the problem
             */
            instance?: string | null;
        };
        /** ErrorModel404NotFound */
        "E-Receipt_IT_API_ErrorModel404NotFound": {
            /**
             * Type
             * @default /errors/404
             */
            type?: string;
            /**
             * Title
             * @default Not Found
             */
            title?: string;
            /**
             * Status
             * @default 404
             */
            status?: number;
            /**
             * Detail
             * @default A human-readable explanation specific to this occurrence of the problem
             */
            detail?: string;
            /**
             * Instance
             * @default A URI reference that identifies the specific occurrence of the problem
             */
            instance?: string | null;
        };
        /**
         * GoodOrService
         * @enum {string}
         */
        "E-Receipt_IT_API_GoodOrService": "B" | "S";
        /** HTTPValidationError */
        "E-Receipt_IT_API_HTTPValidationError": {
            /** Detail */
            detail?: components["schemas"]["E-Receipt_IT_API_ValidationError"][];
        };
        /**
         * PEMStatus
         * @enum {string}
         */
        "E-Receipt_IT_API_PEMStatus": "NEW" | "REGISTERED" | "ACTIVE" | "ONLINE" | "OFFLINE" | "DISCARDED";
        /** PEMStatusOfflineRequest */
        "E-Receipt_IT_API_PEMStatusOfflineRequest": {
            /**
             * Timestamp
             * Format: date-time
             */
            timestamp: string;
            /** Reason */
            reason: string;
        };
        /** Page[~T]Customized[CashRegisterBasicOutput] */
        "E-Receipt_IT_API_Page__T_Customized_CashRegisterBasicOutput_": {
            /** Members */
            members: components["schemas"]["E-Receipt_IT_API_CashRegisterBasicOutput"][];
            /** Total */
            total?: number | null;
            /** Page */
            page: number | null;
            /** Size */
            size: number | null;
            /** Pages */
            pages?: number | null;
        };
        /** Page[~T]Customized[CashierOutput] */
        "E-Receipt_IT_API_Page__T_Customized_CashierOutput_": {
            /** Members */
            members: components["schemas"]["E-Receipt_IT_API_CashierOutput"][];
            /** Total */
            total?: number | null;
            /** Page */
            page: number | null;
            /** Size */
            size: number | null;
            /** Pages */
            pages?: number | null;
        };
        /** Page[~T]Customized[PointOfSaleOutput] */
        "E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_": {
            /** Members */
            members: components["schemas"]["E-Receipt_IT_API_PointOfSaleOutput"][];
            /** Total */
            total?: number | null;
            /** Page */
            page: number | null;
            /** Size */
            size: number | null;
            /** Pages */
            pages?: number | null;
        };
        /** Page[~T]Customized[ReceiptOutput] */
        "E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_": {
            /** Members */
            members: components["schemas"]["E-Receipt_IT_API_ReceiptOutput"][];
            /** Total */
            total?: number | null;
            /** Page */
            page: number | null;
            /** Size */
            size: number | null;
            /** Pages */
            pages?: number | null;
        };
        /** PointOfSaleDetailedOutput */
        "E-Receipt_IT_API_PointOfSaleDetailedOutput": {
            /** Serial Number */
            serial_number: string;
            status: components["schemas"]["E-Receipt_IT_API_PEMStatus"];
            address: components["schemas"]["E-Receipt_IT_API_Address"];
            /** Registration Key */
            registration_key: string | null;
        };
        /** PointOfSaleOutput */
        "E-Receipt_IT_API_PointOfSaleOutput": {
            /** Serial Number */
            serial_number: string;
            status: components["schemas"]["E-Receipt_IT_API_PEMStatus"];
            address: components["schemas"]["E-Receipt_IT_API_Address"];
        };
        /** ReceiptDetailsOutput */
        "E-Receipt_IT_API_ReceiptDetailsOutput": {
            /**
             * Uuid
             * Format: uuid
             */
            uuid: string;
            type: components["schemas"]["E-Receipt_IT_API_ReceiptType"];
            /**
             * Customer Lottery Code
             * @description Lottery code of the customer
             */
            customer_lottery_code?: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Total Amount
             * @description Total amount of the receipt as a string with up to 8 decimal digits
             */
            total_amount: string;
            /**
             * Document Number
             * @description The document number assigned to the document by the Tax Authority.
             *         This is the official ID of the document valid for fiscal purposes.
             *         It's null if the receipt has not been sent yet.
             */
            document_number?: string | null;
            /** Document Datetime */
            document_datetime?: string | null;
            /**
             * Fiscal Id
             * @description The VAT number associated to the receipt issuer
             */
            fiscal_id: string;
            /**
             * Total Taxable Amount
             * @description Total amount subject to VAT/tax before any discounts or exemptions as a string with 2 to 8 decimal digits
             */
            total_taxable_amount: string;
            /**
             * Total Uncollected Amount
             * @description Total amount that remains unpaid or uncollected from the customer as a string with 2 to 8 decimal digits
             */
            total_uncollected_amount: string;
            /**
             * Deductible Amount
             * @description Amount that can be deducted for tax purposes (business expenses) as a string with 2 to 8 decimal digits
             */
            deductible_amount: string;
            /**
             * Total Vat Amount
             * @description Total Value Added Tax amount calculated on taxable transactions as a string with 2 to 8 decimal digits
             */
            total_vat_amount: string;
            /**
             * Total Discount
             * @description Total discount amount applied to the receipt (net of tax) as a string with 2 to 8 decimal digits
             */
            total_discount: string;
            /**
             * Total Gross Discount
             * @description Total discount amount before tax calculations (gross amount) as a string with 2 to 8 decimal digits
             */
            total_gross_discount: string;
            /**
             * Discount
             * @description Individual discount amount applied to specific items or the overall receipt as a string with 2 to 8 decimal digits
             */
            discount: string;
            /**
             * Items
             * @description List of individual products/services included in the receipt
             * @default []
             */
            items?: components["schemas"]["E-Receipt_IT_API_ReceiptItem"][];
        };
        /** ReceiptInput */
        "E-Receipt_IT_API_ReceiptInput": {
            /**
             * Items
             * @description 'Elementi contabili. Commercial document items. It is mandatory that there is at least one item.
             */
            items: components["schemas"]["E-Receipt_IT_API_ReceiptItem"][];
            /**
             * Customer Tax Code
             * @description Tax code of the customer
             */
            customer_tax_code?: string | null;
            /**
             * Customer Lottery Code
             * @description Lottery code of the customer
             */
            customer_lottery_code?: string | null;
            /**
             * Discount
             * @description 'Sconto A Pagare'. This discount, applied in EUR as a string with 2 to 8 decimal digits, does not change the taxable amount of the receipt that is sent to the Agenzia delle Entrate. It is just a not paid amount, usually a rounding up, that is applied at payment time.
             * @default 0.00
             */
            discount?: string;
            /**
             * Invoice Issuing
             * @description 'Flag Emissione Fattura'. In case of uncollected amount, set this field to true in case for services invoice at the end of the period. This use case is generally called 'Credito - segue fattura'.
             * @default false
             */
            invoice_issuing?: boolean;
            /**
             * Uncollected Dcr To Ssn
             * @description Set this flag to true when the payment is not collected because the commercial document relates to the Distinta Contabile Riepilogativa that will be transmitted to the Sistema Sanitario Nazionale.
             * @default false
             */
            uncollected_dcr_to_ssn?: boolean;
            /**
             * Services Uncollected Amount
             * @description 'Credito Non Riscosso - Prestazioni Servizi'. Uncollected Amount in EUR as a string with 2 to 8 decimal digits in case of services.
             * @default 0.00
             */
            services_uncollected_amount?: string;
            /**
             * Goods Uncollected Amount
             * @description 'Credito Non Riscosso - Bene Consegnato'. Uncollected Amount in EUR as a string with 2 to 8 decimal digits in case of delivered goods.
             * @default 0.00
             */
            goods_uncollected_amount?: string;
            /**
             * Cash Payment Amount
             * @description 'Pagamento in contanti'. Cash payment amount in EUR as a string with 2 to 8 decimal digits.
             * @default 0.00
             */
            cash_payment_amount?: string;
            /**
             * Electronic Payment Amount
             * @description 'Pagamento elettronico'. Electronic payment amount in EUR as a string with 2 to 8 decimal digits.
             * @default 0.00
             */
            electronic_payment_amount?: string;
            /**
             * Ticket Restaurant Payment Amount
             * @description 'Pagamento Ticket Restaurant'. Ticket restaurant payment amount in EUR as a string with 2 to 8 decimal digits.
             * @default 0.00
             */
            ticket_restaurant_payment_amount?: string;
            /**
             * Ticket Restaurant Quantity
             * @description 'Numero Ticket Restaurant'. Number of Ticket Restaurants used.
             * @default 0
             */
            ticket_restaurant_quantity?: number;
        };
        /**
         * ReceiptItem
         * @description Model representing an item in a commercial document.
         */
        "E-Receipt_IT_API_ReceiptItem": {
            /**
             * @description Type of the item. It can be a good or a service.
             * @default B
             */
            good_or_service?: components["schemas"]["E-Receipt_IT_API_GoodOrService"];
            /**
             * Quantity
             * @description Quantity expressed as a string with exactly 2 decimal digits. E.g. '1.00', '1.50', '2.00'
             */
            quantity: string;
            /**
             * Description
             * @description Description of the item (max 1000 chars)
             */
            description: string;
            /**
             * Unit Price
             * @description Unit price expressed as a string with 2 to 8 decimal digits. It is a gross price, i.e. it includes VAT amount
             */
            unit_price: string;
            /**
             * @description VAT rate code as a string
             * @default 22
             */
            vat_rate_code?: components["schemas"]["E-Receipt_IT_API_VatRateCode"] | null;
            /**
             * Simplified Vat Allocation
             * @description Set to true if this item is subject to 'Ventilazione IVA'. If true, 'vat_rate_code' must not be set.
             * @default false
             */
            simplified_vat_allocation?: boolean;
            /**
             * Discount
             * @description Discount amount in EUR as a string with 2 to 8 decimal digits. It is a gross price, i.e. it includes VAT amount
             * @default 0
             */
            discount?: string;
            /**
             * Is Down Payment Or Voucher Redemption
             * @description Field to be filled in when issuing a commercial balance document to indicate that the amount reported in field 3.8.5 <TotalAmount> has already been collected as a down payment and the goods being sold had not been delivered. Field to be filled in also for the sale of goods and services by redeeming single-use vouchers.
             * @default false
             */
            is_down_payment_or_voucher_redemption?: boolean;
            /**
             * Complimentary
             * @description Set to true if it is a complimentary (free) item. It deducts the gift amount from the amount of the document but does not deduct it from the VAT and taxable amount
             * @default false
             */
            complimentary?: boolean;
        };
        /** ReceiptOutput */
        "E-Receipt_IT_API_ReceiptOutput": {
            /**
             * Uuid
             * Format: uuid
             */
            uuid: string;
            type: components["schemas"]["E-Receipt_IT_API_ReceiptType"];
            /**
             * Customer Lottery Code
             * @description Lottery code of the customer
             */
            customer_lottery_code?: string | null;
            /**
             * Created At
             * Format: date-time
             */
            created_at: string;
            /**
             * Total Amount
             * @description Total amount of the receipt as a string with up to 8 decimal digits
             */
            total_amount: string;
            /**
             * Document Number
             * @description The document number assigned to the document by the Tax Authority.
             *         This is the official ID of the document valid for fiscal purposes.
             *         It's null if the receipt has not been sent yet.
             */
            document_number?: string | null;
            /** Document Datetime */
            document_datetime?: string | null;
        };
        /**
         * ReceiptProofType
         * @enum {string}
         */
        "E-Receipt_IT_API_ReceiptProofType": "POS" | "VR" | "ND";
        /** ReceiptReturnOrVoidViaPEMInput */
        "E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput": {
            /**
             * Pem Id
             * @description The PEM ID that issued the original receipt. If not provided, we assume the sale receipt was issued by the current PEM.
             */
            pem_id?: string | null;
            /** Items */
            items: components["schemas"]["E-Receipt_IT_API_ReceiptItem"][];
            /**
             * Document Number
             * @description The document number of the original receipt
             */
            document_number: string;
            /**
             * Document Date
             * @description The date of the original receipt in ISO format. Mandatory only if the sale receipt has been issued by a different PEM.
             */
            document_date?: string | null;
            /**
             * Lottery Code
             * @description The lottery code of the original receipt
             */
            lottery_code?: string | null;
        };
        /** ReceiptReturnOrVoidWithProofInput */
        "E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput": {
            /** Items */
            items: components["schemas"]["E-Receipt_IT_API_ReceiptItem"][];
            /** @description The type of proof of purchase: 'POS' for POS receipts, 'VR' for 'Vuoti a rendere', 'ND' for other residual cases. Used in place of device serial number/unique PEM identifier. */
            proof: components["schemas"]["E-Receipt_IT_API_ReceiptProofType"];
            /**
             * Document Datetime
             * @description The date of the proof of purchase in ISO format
             */
            document_datetime: string;
        };
        /**
         * ReceiptType
         * @enum {string}
         */
        "E-Receipt_IT_API_ReceiptType": "sale" | "return" | "void";
        /** ValidationError */
        "E-Receipt_IT_API_ValidationError": {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
        /**
         * VatRateCode
         * @description VAT rate codes with their corresponding descriptions.
         * @enum {string}
         */
        "E-Receipt_IT_API_VatRateCode": "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6";
        "A-Cube_GOV-IT_PEL_Platform_Address": {
            street_address: string;
            zip_code: string;
            city: string;
            province: string;
        };
        "A-Cube_GOV-IT_PEL_Platform_Address.jsonld": {
            "@context"?: OneOf<[
                string,
                {
                    "@vocab": string;
                    /** @enum {string} */
                    hydra: "http://www.w3.org/ns/hydra/core#";
                    [key: string]: unknown;
                }
            ]>;
            "@id"?: string;
            "@type"?: string;
            street_address: string;
            zip_code: string;
            city: string;
            province: string;
        };
        /** @description Unprocessable entity */
        "A-Cube_GOV-IT_PEL_Platform_ConstraintViolation-json": {
            /**
             * @default 422
             * @example 422
             */
            status?: number;
            violations?: {
                /** @description The property path of the violation */
                propertyPath?: string;
                /** @description The message associated with the violation */
                message?: string;
            }[];
            detail?: string;
            type?: string;
            title?: string | null;
            instance?: string | null;
        };
        /** @description Unprocessable entity */
        "A-Cube_GOV-IT_PEL_Platform_ConstraintViolation.jsonld-jsonld": {
            "@context"?: OneOf<[
                string,
                {
                    "@vocab": string;
                    /** @enum {string} */
                    hydra: "http://www.w3.org/ns/hydra/core#";
                    [key: string]: unknown;
                }
            ]>;
            "@id"?: string;
            "@type"?: string;
            /**
             * @default 422
             * @example 422
             */
            status?: number;
            violations?: {
                /** @description The property path of the violation */
                propertyPath?: string;
                /** @description The message associated with the violation */
                message?: string;
            }[];
            detail?: string;
            description?: string;
            type?: string;
            title?: string | null;
            instance?: string | null;
        };
        /** @description A representation of common errors. */
        "A-Cube_GOV-IT_PEL_Platform_Error": {
            /** @description A short, human-readable summary of the problem. */
            title?: string | null;
            /** @description A human-readable explanation specific to this occurrence of the problem. */
            detail?: string | null;
            /** @default 400 */
            status?: number;
            /** @description A URI reference that identifies the specific occurrence of the problem. It may or may not yield further information if dereferenced. */
            instance?: string | null;
            /** @description A URI reference that identifies the problem type */
            type?: string;
        };
        /** @description A representation of common errors. */
        "A-Cube_GOV-IT_PEL_Platform_Error.jsonld": {
            "@context"?: OneOf<[
                string,
                {
                    "@vocab": string;
                    /** @enum {string} */
                    hydra: "http://www.w3.org/ns/hydra/core#";
                    [key: string]: unknown;
                }
            ]>;
            "@id"?: string;
            "@type"?: string;
            /** @description A short, human-readable summary of the problem. */
            title?: string | null;
            /** @description A human-readable explanation specific to this occurrence of the problem. */
            detail?: string | null;
            /** @default 400 */
            status?: number;
            /** @description A URI reference that identifies the specific occurrence of the problem. It may or may not yield further information if dereferenced. */
            instance?: string | null;
            /** @description A URI reference that identifies the problem type */
            type?: string;
            description?: string | null;
        };
        "A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput": {
            /** @description The VAT-ID of the merchant (Partita IVA). */
            fiscal_id: string;
            /** @description The business name of the merchant (Ragione sociale). */
            name: string;
            /**
             * Format: email
             * @description The email address.
             */
            email: string;
            /** @description The password. */
            password: string;
            /** @description The billing address. */
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address"];
        };
        "A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput.jsonld": {
            /** @description The VAT-ID of the merchant (Partita IVA). */
            fiscal_id: string;
            /** @description The business name of the merchant (Ragione sociale). */
            name: string;
            /**
             * Format: email
             * @description The email address.
             */
            email: string;
            /** @description The password. */
            password: string;
            /** @description The billing address. */
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address.jsonld"];
        };
        "A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput": {
            uuid?: string;
            fiscal_id?: string;
            name?: string;
            email?: string;
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address"];
        };
        "A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput.jsonld": {
            "@context"?: OneOf<[
                string,
                {
                    "@vocab": string;
                    /** @enum {string} */
                    hydra: "http://www.w3.org/ns/hydra/core#";
                    [key: string]: unknown;
                }
            ]>;
            "@id"?: string;
            "@type"?: string;
            uuid?: string;
            fiscal_id?: string;
            name?: string;
            email?: string;
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address.jsonld"];
        };
        "A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput": {
            /** @description The business name of the merchant (Ragione sociale). */
            name: string;
            /** @description The billing address. */
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address"] | null;
        };
        "A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput.jsonld": {
            /** @description The business name of the merchant (Ragione sociale). */
            name: string;
            /** @description The billing address. */
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address.jsonld"] | null;
        };
        "A-Cube_GOV-IT_PEL_Platform_Pem.PemCertificatesOutput": {
            mtls_certificate?: string;
            activation_xml_response?: string | null;
        };
        "A-Cube_GOV-IT_PEL_Platform_Pem.PemCertificatesOutput.jsonld": {
            "@context"?: OneOf<[
                string,
                {
                    "@vocab": string;
                    /** @enum {string} */
                    hydra: "http://www.w3.org/ns/hydra/core#";
                    [key: string]: unknown;
                }
            ]>;
            "@id"?: string;
            "@type"?: string;
            mtls_certificate?: string;
            activation_xml_response?: string | null;
        };
        "A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateInput": {
            /**
             * Format: uuid
             * @description The merchant UUID.
             */
            merchant_uuid: string;
            /** @description The address. Leave empty to use the default merchant address. */
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address"] | null;
            /** @description The external PEM configuration. */
            external_pem_data?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_PemData"] | null;
        };
        "A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateInput.jsonld": {
            /**
             * Format: uuid
             * @description The merchant UUID.
             */
            merchant_uuid: string;
            /** @description The address. Leave empty to use the default merchant address. */
            address?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address.jsonld"] | null;
            /** @description The external PEM configuration. */
            external_pem_data?: components["schemas"]["A-Cube_GOV-IT_PEL_Platform_PemData.jsonld"] | null;
        };
        "A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateOutput": {
            serial_number?: string;
            registration_key?: string;
        };
        "A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateOutput.jsonld": {
            "@context"?: OneOf<[
                string,
                {
                    "@vocab": string;
                    /** @enum {string} */
                    hydra: "http://www.w3.org/ns/hydra/core#";
                    [key: string]: unknown;
                }
            ]>;
            "@id"?: string;
            "@type"?: string;
            serial_number?: string;
            registration_key?: string;
        };
        "A-Cube_GOV-IT_PEL_Platform_PemData": {
            version: string;
            /** @enum {string} */
            type: "AP" | "SP" | "TM" | "PV";
        };
        "A-Cube_GOV-IT_PEL_Platform_PemData.jsonld": {
            version: string;
            /** @enum {string} */
            type: "AP" | "SP" | "TM" | "PV";
        };
    };
    responses: {};
    parameters: {};
    requestBodies: {};
    headers: {};
    pathItems: never;
}

/**
 * Cashiers Resource - OpenAPI Implementation
 * Type-safe implementation based on OpenAPI specification
 *
 * Features:
 * - Full CRUD operations for cashier management
 * - Type-safe input/output with branded types
 * - Advanced validation and business logic
 * - Password security utilities
 * - Email management and formatting
 */

type CashierCreateInput = components['schemas']['E-Receipt_IT_API_CashierCreateInput'];
type CashierOutput = components['schemas']['E-Receipt_IT_API_CashierOutput'];
type CashierPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashierOutput_'];
interface CashierListParams {
    page?: number;
    size?: number;
}
interface CashierValidationOptions {
    enforceStrongPassword?: boolean;
    allowedEmailDomains?: string[];
    checkEmailUniqueness?: boolean;
}
/**
 * Cashiers Resource Class - OpenAPI Based
 * Manages cashier user accounts with full OpenAPI compliance
 */
declare class CashiersResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of cashiers with pagination
     *
     * @param params - Pagination parameters
     * @returns Promise resolving to paginated cashier list
     */
    list(params?: CashierListParams): Promise<CashierPage>;
    /**
     * Create a new cashier
     *
     * @param data - Cashier creation input data
     * @param options - Validation options
     * @returns Promise resolving to created cashier
     */
    create(data: CashierCreateInput, options?: CashierValidationOptions): Promise<CashierOutput>;
    /**
     * Get current cashier information
     *
     * @returns Promise resolving to current cashier details
     */
    me(): Promise<CashierOutput>;
    /**
     * Get a specific cashier by ID
     *
     * @param cashierId - Cashier ID (branded or number)
     * @returns Promise resolving to cashier details
     */
    retrieve(cashierId: CashierId | number): Promise<CashierOutput>;
    /**
     * Delete a cashier
     *
     * @param cashierId - Cashier ID (branded or number)
     * @returns Promise resolving when deletion is complete
     */
    delete(cashierId: CashierId | number): Promise<void>;
    /**
     * Update a cashier's profile (future enhancement)
     * Note: This endpoint is not yet available in the OpenAPI spec
     */
    update(cashierId: CashierId | number, data: Partial<CashierCreateInput>): Promise<CashierOutput>;
    /**
     * Comprehensive cashier input validation
     */
    private validateCashierInput;
    /**
     * Check if email already exists (placeholder for future implementation)
     */
    private checkEmailExists;
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Validate email format (static utility)
     */
    static isValidEmail(email: string): boolean;
    /**
     * Check password strength with detailed analysis
     */
    static checkPasswordStrength(password: string): {
        isValid: boolean;
        score: number;
        message?: string;
        suggestions: string[];
    };
    /**
     * Generate a secure password
     */
    static generateSecurePassword(length?: number): string;
    /**
     * Format email for display (partial masking for privacy)
     */
    static formatEmailForDisplay(email: string): string;
    /**
     * Extract domain from email
     */
    static getEmailDomain(email: string): string | null;
    /**
     * Validate email domain against allowed domains
     */
    static isAllowedEmailDomain(email: string, allowedDomains: string[]): boolean;
    /**
     * Generate username suggestion from email
     */
    static generateUsername(email: string): string;
    /**
     * Validate cashier creation rate limits (placeholder for future implementation)
     */
    static checkCreationRateLimit(ipAddress: string): boolean;
    /**
     * Get cashier role permissions (placeholder for future implementation)
     */
    static getCashierPermissions(): string[];
    /**
     * Format cashier for display in UI
     */
    static formatCashierForDisplay(cashier: CashierOutput): {
        displayName: string;
        maskedEmail: string;
        status: string;
        permissions: string[];
    };
    /**
     * Validate cashier session (placeholder for future implementation)
     */
    static validateCashierSession(cashierId: CashierId | number): Promise<boolean>;
}

/**
 * Receipts Resource - OpenAPI Implementation
 * Type-safe implementation for electronic receipt management
 *
 * Features:
 * - Complete electronic receipt lifecycle management
 * - Type-safe input/output with branded types
 * - Advanced validation for Italian fiscal requirements
 * - Receipt item calculations and VAT handling
 * - PDF generation and details retrieval
 * - Return and void operations
 */

type ReceiptInput = components['schemas']['E-Receipt_IT_API_ReceiptInput'];
type ReceiptOutput = components['schemas']['E-Receipt_IT_API_ReceiptOutput'];
type ReceiptPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_'];
type VoidReceiptRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput'];
type VoidReceiptOutput = ReceiptOutput;
type VoidReceiptWithProofRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput'];
type ReturnRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput'];
type ReturnWithProofRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput'];
interface ReceiptListParams {
    page?: number | undefined;
    size?: number | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
    serial_number?: string | undefined;
}
interface ReceiptValidationOptions {
    validateVATRates?: boolean;
    checkTotalCalculations?: boolean;
    enforceItalianFiscalRules?: boolean;
    maxReceiptItems?: number;
}
interface ReceiptCalculationResult {
    subtotal: Amount;
    vatAmount: Amount;
    totalAmount: Amount;
    discountAmount: Amount;
    itemCount: number;
    breakdown: {
        vatRate: string;
        netAmount: Amount;
        vatAmount: Amount;
        grossAmount: Amount;
    }[];
}
type PaymentMethod = 'cash' | 'electronic' | 'ticket_restaurant' | 'mixed';
/**
 * Receipts Resource Class - OpenAPI Based
 * Manages electronic receipts with full Italian fiscal compliance
 */
declare class ReceiptsResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of receipts with filtering and pagination
     *
     * @param params - List parameters including filters and pagination
     * @returns Promise resolving to paginated receipt list
     */
    list(params?: ReceiptListParams): Promise<ReceiptPage>;
    /**
     * Create a new electronic receipt
     *
     * @param data - Receipt input data with items and payment information
     * @param options - Validation options for fiscal compliance
     * @returns Promise resolving to created receipt
     */
    create(data: ReceiptInput, options?: ReceiptValidationOptions): Promise<ReceiptOutput>;
    /**
     * Void an electronic receipt
     *
     * @param voidData - Void request data
     * @returns Promise resolving to void confirmation
     */
    void(voidData: VoidReceiptRequest): Promise<VoidReceiptOutput>;
    /**
     * Get a specific receipt by UUID
     *
     * @param receiptId - Receipt UUID
     * @returns Promise resolving to receipt details
     */
    retrieve(receiptId: ReceiptId | string): Promise<ReceiptOutput>;
    /**
     * Void a receipt using proof of purchase
     *
     * @param voidData - Void request with proof data
     * @returns Promise resolving to void confirmation
     */
    voidWithProof(voidData: VoidReceiptWithProofRequest): Promise<VoidReceiptOutput>;
    /**
     * Get receipt details or PDF
     *
     * @param receiptId - Receipt UUID
     * @param format - Response format ('json' or 'pdf')
     * @returns Promise resolving to receipt details or PDF blob
     */
    getDetails(receiptId: ReceiptId | string, format?: 'json' | 'pdf'): Promise<components['schemas']['E-Receipt_IT_API_ReceiptDetailsOutput'] | Blob>;
    /**
     * Return items from a receipt
     *
     * @param returnData - Return request data
     * @returns Promise resolving to return receipt
     */
    returnItems(returnData: ReturnRequest): Promise<ReceiptOutput>;
    /**
     * Return items from a receipt using proof of purchase
     *
     * @param returnData - Return request with proof data
     * @returns Promise resolving to return receipt
     */
    returnItemsWithProof(returnData: ReturnWithProofRequest): Promise<ReceiptOutput>;
    /**
     * Comprehensive receipt input validation
     */
    private validateReceiptInput;
    /**
     * Validate individual receipt item
     */
    private validateReceiptItem;
    /**
     * Validate payment amounts
     */
    private validatePaymentAmounts;
    /**
     * Validate calculation accuracy
     */
    private validateCalculations;
    /**
     * Validate Italian fiscal compliance rules
     */
    private validateItalianFiscalRules;
    /**
     * Calculate total receipt amount with VAT breakdown
     */
    calculateTotalAmount(data: ReceiptInput): ReceiptCalculationResult;
    /**
     * Format receipt for display
     */
    static formatReceiptForDisplay(receipt: ReceiptOutput): {
        receiptNumber: string;
        date: string;
        time: string;
        formattedTotal: string;
        paymentMethod: PaymentMethod;
        itemSummary: string;
    };
    /**
     * Determine primary payment method
     */
    private static determinePaymentMethod;
    /**
     * Generate receipt summary for reports
     */
    static generateReceiptSummary(receipts: ReceiptOutput[]): {
        totalCount: number;
        totalAmount: Amount;
        vatAmount: Amount;
        averageAmount: Amount;
        paymentMethodBreakdown: Record<PaymentMethod, {
            count: number;
            amount: Amount;
        }>;
        dateRange: {
            from: string;
            to: string;
        };
    };
    /**
     * Validate receipt return eligibility
     */
    static validateReturnEligibility(receipt: ReceiptOutput, returnDate?: Date): {
        eligible: boolean;
        reason?: string;
        daysRemaining?: number;
    };
    /**
     * Generate fiscal code for lottery participation
     */
    static generateLotteryCode(): string;
}

/**
 * Point of Sales Resource - OpenAPI Implementation
 * Type-safe implementation for PEM device management
 *
 * Features:
 * - Complete PEM device lifecycle management
 * - Activation and certificate management
 * - Status monitoring and control
 * - Journal closing operations
 * - Inactivity period management
 */

type PointOfSaleOutput$1 = components['schemas']['E-Receipt_IT_API_PointOfSaleOutput'];
type PointOfSalePage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_'];
type ActivationRequest = components['schemas']['E-Receipt_IT_API_ActivationRequest'];
type InactivityRequest = components['schemas']['E-Receipt_IT_API_PEMStatusOfflineRequest'];
type ActivationOutput = Record<string, never>;
type CloseJournalOutput = Record<string, never>;
interface PointOfSaleValidationOptions {
    validateSerialNumber?: boolean;
    checkActivationStatus?: boolean;
    enforceStatusTransitions?: boolean;
}
interface DeviceStatus {
    serialNumber: SerialNumber;
    status: PEMStatus$1;
    lastSeen: string;
    certificateExpiry?: string | undefined;
    firmwareVersion?: string | undefined;
    batteryLevel?: number | undefined;
    connectivity: ConnectivityStatus;
}
interface JournalSummary {
    date: string;
    transactionCount: number;
    totalAmount: string;
    vatAmount: string;
    firstTransaction?: string;
    lastTransaction?: string;
    status: 'open' | 'closed' | 'pending';
}
type PEMStatus$1 = components['schemas']['E-Receipt_IT_API_PEMStatus'];
type ConnectivityStatus = 'online' | 'offline' | 'intermittent' | 'unknown';
/**
 * Point of Sales Resource Class - OpenAPI Based
 * Manages PEM devices with full Italian fiscal compliance
 */
declare class PointOfSalesResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of Point of Sales devices
     *
     * @returns Promise resolving to paginated PEM list
     */
    list(): Promise<PointOfSalePage>;
    /**
     * Get a specific Point of Sale by serial number
     *
     * @param serialNumber - Device serial number
     * @returns Promise resolving to PEM details
     */
    retrieve(serialNumber: SerialNumber | string): Promise<PointOfSaleOutput$1>;
    /**
     * Close the daily journal for a Point of Sale
     *
     * @returns Promise resolving to close confirmation
     */
    closeJournal(): Promise<CloseJournalOutput>;
    /**
     * Trigger activation process for a Point of Sale
     *
     * @param serialNumber - Device serial number
     * @param activationData - Activation request data
     * @param options - Validation options
     * @returns Promise resolving to activation status
     */
    activate(serialNumber: SerialNumber | string, activationData: ActivationRequest, options?: PointOfSaleValidationOptions): Promise<ActivationOutput>;
    /**
     * Create an inactivity period for a Point of Sale
     *
     * @param serialNumber - Device serial number
     * @param inactivityData - Inactivity period request data
     * @returns Promise resolving when inactivity period is created
     */
    createInactivityPeriod(serialNumber: SerialNumber | string, inactivityData: InactivityRequest): Promise<void>;
    /**
     * Set Point of Sale status to offline
     *
     * @param serialNumber - Device serial number
     * @returns Promise resolving when status is updated
     */
    setOffline(serialNumber: SerialNumber | string): Promise<void>;
    /**
     * Get device status summary
     *
     * @param serialNumber - Device serial number
     * @returns Promise resolving to device status
     */
    getDeviceStatus(serialNumber: SerialNumber | string): Promise<DeviceStatus>;
    /**
     * Get journal summary for a specific date
     *
     * @param serialNumber - Device serial number
     * @param date - Date in YYYY-MM-DD format
     * @returns Promise resolving to journal summary
     */
    getJournalSummary(_serialNumber: SerialNumber | string, date?: string): Promise<JournalSummary>;
    /**
     * Validate activation request
     */
    private validateActivationRequest;
    /**
     * Validate registration key format
     */
    private validateRegistrationKey;
    /**
     * Validate serial number format
     */
    static validateSerialNumber(serialNumber: SerialNumber | string): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Analyze device status from device data
     */
    static analyzeDeviceStatus(device: PointOfSaleOutput$1): DeviceStatus;
    /**
     * Determine connectivity status from device data
     */
    private static determineConnectivityStatus;
    /**
     * Format device for display
     */
    static formatDeviceForDisplay(device: PointOfSaleOutput$1): {
        displayName: string;
        statusBadge: string;
        location: string;
        lastActivity: string;
        certificateStatus: string;
    };
    /**
     * Calculate device uptime
     */
    static calculateUptime(_device: PointOfSaleOutput$1): {
        uptimeHours: number;
        uptimePercentage: number;
        availabilityStatus: 'excellent' | 'good' | 'poor' | 'critical';
    };
    /**
     * Generate device health report
     */
    static generateHealthReport(devices: PointOfSaleOutput$1[]): {
        totalDevices: number;
        activeDevices: number;
        offlineDevices: number;
        devicesRequiringAttention: number;
        avgUptimePercentage: number;
        certificateExpiringCount: number;
        statusBreakdown: Record<PEMStatus$1, number>;
    };
    /**
     * Validate journal closing eligibility
     */
    static validateJournalClosingEligibility(device: PointOfSaleOutput$1, _date: string): {
        canClose: boolean;
        reasons: string[];
        requirements: string[];
    };
    /**
     * Get recommended maintenance schedule
     */
    static getMaintenanceSchedule(_device: PointOfSaleOutput$1): {
        nextMaintenance: string;
        maintenanceType: 'routine' | 'certificate' | 'firmware' | 'urgent';
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        estimatedDuration: string;
    };
    /**
     * Check if firmware version is outdated
     * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
     */
    /**
     * Generate activation code for new devices
     */
    static generateActivationCode(): string;
}

/**
 * Cash Registers Resource - OpenAPI Implementation
 * Type-safe implementation for cash register management
 *
 * Features:
 * - Cash register lifecycle management
 * - Registration and configuration
 * - Status monitoring and reporting
 * - Integration with Point of Sales devices
 */

type CashRegisterInput = components['schemas']['E-Receipt_IT_API_CashRegisterCreate'];
type CashRegisterOutput = components['schemas']['E-Receipt_IT_API_CashRegisterDetailedOutput'];
type CashRegisterPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashRegisterBasicOutput_'];
interface CashRegisterValidationOptions {
    validateSerialNumber?: boolean;
    checkDuplicateRegistration?: boolean;
    enforceLocationValidation?: boolean;
}
interface CashRegisterConfiguration {
    id: CashRegisterId;
    name: string;
    location: string;
    serialNumber: string;
    model: string;
    manufacturer: string;
    installationDate: string;
    lastMaintenance?: string | undefined;
    nextMaintenance?: string | undefined;
    status: CashRegisterStatus;
    settings: CashRegisterSettings;
}
interface CashRegisterSettings {
    printReceipts: boolean;
    enableLottery: boolean;
    defaultVATRate: string;
    language: 'it' | 'en' | 'de' | 'fr';
    currency: 'EUR';
    timezone: string;
    paperSize: 'A4' | 'thermal_58mm' | 'thermal_80mm';
    connectionType: 'ethernet' | 'wifi' | 'cellular';
}
interface CashRegisterStats {
    registerId: CashRegisterId;
    totalTransactions: number;
    totalAmount: string;
    averageTransaction: string;
    transactionsToday: number;
    amountToday: string;
    lastTransaction?: string;
    uptime: {
        hours: number;
        percentage: number;
    };
    errorCount: number;
    maintenanceScore: number;
}
type CashRegisterStatus = 'active' | 'inactive' | 'maintenance' | 'error' | 'offline';
type MaintenanceType = 'routine' | 'repair' | 'upgrade' | 'calibration';
/**
 * Cash Registers Resource Class - OpenAPI Based
 * Manages cash register devices with full compliance
 */
declare class CashRegistersResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Create a new cash register
     *
     * @param data - Cash register input data
     * @param options - Validation options
     * @returns Promise resolving to created cash register
     */
    create(data: CashRegisterInput, options?: CashRegisterValidationOptions): Promise<CashRegisterOutput>;
    /**
     * Get a list of cash registers
     *
     * @returns Promise resolving to paginated cash register list
     */
    list(): Promise<CashRegisterPage>;
    /**
     * Get a specific cash register by ID
     *
     * @param registerId - Cash register ID
     * @returns Promise resolving to cash register details
     */
    retrieve(registerId: CashRegisterId | number): Promise<CashRegisterOutput>;
    /**
     * Get cash register configuration
     *
     * @param registerId - Cash register ID
     * @returns Promise resolving to configuration
     */
    getConfiguration(registerId: CashRegisterId | number): Promise<CashRegisterConfiguration>;
    /**
     * Get cash register statistics
     *
     * @param registerId - Cash register ID
     * @returns Promise resolving to statistics
     */
    getStatistics(registerId: CashRegisterId | number): Promise<CashRegisterStats>;
    /**
     * Update cash register settings (future enhancement)
     */
    updateSettings(registerId: CashRegisterId | number, settings: Partial<CashRegisterSettings>): Promise<CashRegisterOutput>;
    /**
     * Validate cash register input
     */
    private validateCashRegisterInput;
    /**
     * Check for duplicate serial number
     */
    private checkDuplicateSerial;
    /**
     * Validate serial number format
     */
    static validateSerialNumber(serialNumber: string): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Build configuration from cash register data
     */
    static buildConfiguration(register: CashRegisterOutput): CashRegisterConfiguration;
    /**
     * Get default settings for cash registers
     */
    static getDefaultSettings(): CashRegisterSettings;
    /**
     * Calculate statistics for a cash register
     */
    static calculateStatistics(register: CashRegisterOutput): CashRegisterStats;
    /**
     * Format cash register for display
     */
    static formatForDisplay(register: CashRegisterOutput): {
        displayName: string;
        statusBadge: string;
        location: string;
        lastActivity: string;
        serialNumber: string;
    };
    /**
     * Generate maintenance schedule
     */
    static generateMaintenanceSchedule(_register: CashRegisterOutput): {
        nextMaintenance: string;
        maintenanceType: MaintenanceType;
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        estimatedDuration: string;
    };
    /**
     * Validate cash register compatibility with PEM device
     */
    static validatePEMCompatibility(register: CashRegisterOutput, pemModel: string): {
        compatible: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Check if firmware is outdated
     * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
     */
    /**
     * Generate health report for multiple cash registers
     */
    static generateFleetHealthReport(registers: CashRegisterOutput[]): {
        totalRegisters: number;
        activeRegisters: number;
        registersNeedingMaintenance: number;
        averageUptime: number;
        totalTransactionsToday: number;
        totalRevenueToday: string;
        statusBreakdown: Record<CashRegisterStatus, number>;
        topPerformers: {
            id: string;
            name: string;
            todayRevenue: string;
        }[];
    };
    /**
     * Generate installation checklist
     */
    static generateInstallationChecklist(): {
        preInstallation: string[];
        installation: string[];
        postInstallation: string[];
        testing: string[];
    };
}

/**
 * Merchants Resource - OpenAPI Implementation
 * Type-safe implementation for business entity management
 *
 * Features:
 * - Complete merchant lifecycle management
 * - Italian VAT number validation and verification
 * - Business address management
 * - Merchant profile and settings
 * - Compliance and certification tracking
 */

type MerchantCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput'];
type MerchantUpdateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput'];
type MerchantOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput'];
interface MerchantValidationOptions {
    validateVATNumber?: boolean;
    checkBusinessRegistration?: boolean;
    enforceAddressValidation?: boolean;
    validateItalianPostalCodes?: boolean;
}
interface BusinessAnalytics {
    registrationDate: string;
    businessAge: number;
    completenessScore: number;
    missingFields: string[];
    recommendations: string[];
    complianceStatus: 'compliant' | 'pending' | 'non-compliant';
}
interface AddressValidationResult {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
    formattedAddress?: string | undefined;
}
/**
 * Merchants Resource Class - OpenAPI Based
 * Manages merchant business entities with full Italian compliance
 */
declare class MerchantsResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of merchants
     *
     * @returns Promise resolving to merchant list
     */
    list(): Promise<MerchantOutput[]>;
    /**
     * Create a new merchant
     *
     * @param data - Merchant creation input data
     * @param options - Validation options
     * @returns Promise resolving to created merchant
     */
    create(data: MerchantCreateInput, options?: MerchantValidationOptions): Promise<MerchantOutput>;
    /**
     * Get a merchant by UUID
     *
     * @param merchantId - Merchant UUID
     * @returns Promise resolving to merchant details
     */
    retrieve(merchantId: MerchantId | string): Promise<MerchantOutput>;
    /**
     * Update a merchant's information
     *
     * @param merchantId - Merchant UUID
     * @param data - Merchant update input data
     * @param options - Validation options
     * @returns Promise resolving to updated merchant
     */
    update(merchantId: MerchantId | string, data: MerchantUpdateInput, options?: MerchantValidationOptions): Promise<MerchantOutput>;
    /**
     * Get merchant business analytics
     *
     * @param merchantId - Merchant UUID
     * @returns Promise resolving to business analytics
     */
    getAnalytics(merchantId: MerchantId | string): Promise<BusinessAnalytics>;
    /**
     * Validate merchant address
     *
     * @param address - Address to validate
     * @returns Address validation result
     */
    validateAddress(address: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address']): Promise<AddressValidationResult>;
    /**
     * Comprehensive merchant creation input validation
     */
    private validateMerchantCreateInput;
    /**
     * Merchant update input validation
     */
    private validateMerchantUpdateInput;
    /**
     * Validate Italian VAT number with checksum
     */
    private validateItalianVATNumber;
    /**
     * Validate business name
     */
    private validateBusinessName;
    /**
     * Validate password strength
     */
    private validatePassword;
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Validate Italian VAT number (static utility)
     */
    static isValidItalianVATNumber(vatNumber: string): boolean;
    /**
     * Format fiscal ID for display
     */
    static formatFiscalId(fiscalId: FiscalId | string): string;
    /**
     * Validate Italian address
     */
    static validateItalianAddress(address: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address']): Promise<AddressValidationResult>;
    /**
     * Analyze business profile completeness and compliance
     */
    static analyzeBusinessProfile(merchant: MerchantOutput): BusinessAnalytics;
    /**
     * Generate business summary
     */
    static generateBusinessSummary(merchant: MerchantOutput): string;
    /**
     * Validate business name format (static utility)
     */
    static isValidBusinessName(name: string): boolean;
    /**
     * Normalize business name
     */
    static normalizeBusinessName(name: string): string;
    /**
     * Extract province code from address
     */
    static getProvinceCode(merchant: MerchantOutput): string | null;
    /**
     * Check if merchant is based in specific region
     */
    static isInRegion(merchant: MerchantOutput, regionProvinces: string[]): boolean;
    /**
     * Get Italian business regions
     */
    static getItalianRegions(): Record<string, string[]>;
    /**
     * Determine merchant region
     */
    static getMerchantRegion(merchant: MerchantOutput): string | null;
}

/**
 * PEMs Resource - OpenAPI Implementation
 * Type-safe implementation for Point of Sale Module certificate management
 *
 * Features:
 * - PEM certificate lifecycle management
 * - Point of Sale creation and configuration
 * - Certificate validation and renewal
 * - Compliance and audit tracking
 */

type PointOfSaleCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateInput'];
type PointOfSaleOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateOutput'];
interface PEMValidationOptions {
    validateCertificateChain?: boolean;
    checkExpirationDate?: boolean;
    enforceComplianceRules?: boolean;
    validateSignatures?: boolean;
}
interface CertificateInfo {
    id: string;
    type: CertificateType;
    status: CertificateStatus;
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
    serialNumber: string;
    fingerprint: string;
    keyUsage: string[];
    issuedFor: string;
}
interface CertificateChain {
    root: CertificateInfo;
    intermediate?: CertificateInfo[];
    leaf: CertificateInfo;
    validationResults: {
        chainValid: boolean;
        rootTrusted: boolean;
        notExpired: boolean;
        revocationChecked: boolean;
        issues: string[];
    };
}
interface PEMConfiguration {
    pemId: PEMId;
    deviceSerialNumber: string;
    certificates: CertificateInfo[];
    configuration: {
        fiscalMemorySize: string;
        supportedOperations: string[];
        maxDailyTransactions: number;
        complianceVersion: string;
    };
    status: PEMStatus;
    lastAudit?: string;
    nextCertificateRenewal?: string;
}
type CertificateType = 'root' | 'intermediate' | 'device' | 'signing' | 'encryption';
type CertificateStatus = 'valid' | 'expired' | 'revoked' | 'pending' | 'invalid';
type PEMStatus = 'active' | 'inactive' | 'maintenance' | 'compliance_check' | 'certificate_renewal';
type ComplianceLevel = 'full' | 'partial' | 'non_compliant' | 'under_review';
/**
 * PEMs Resource Class - OpenAPI Based
 * Manages PEM devices and certificates with full Italian compliance
 */
declare class PEMsResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Create a new Point of Sale
     *
     * @param data - Point of Sale creation input data
     * @param options - Validation options
     * @returns Promise resolving to created Point of Sale
     */
    createPointOfSale(data: PointOfSaleCreateInput, options?: PEMValidationOptions): Promise<PointOfSaleOutput>;
    /**
     * Get certificates for a Point of Sale
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to certificate information
     */
    getCertificates(posId: PEMId | string): Promise<CertificateInfo[]>;
    /**
     * Validate certificate chain for a PEM device
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to certificate chain validation
     */
    validateCertificateChain(posId: PEMId | string): Promise<CertificateChain>;
    /**
     * Get PEM configuration and status
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to PEM configuration
     */
    getConfiguration(posId: PEMId | string): Promise<PEMConfiguration>;
    /**
     * Check compliance status for a PEM device
     *
     * @param posId - Point of Sale ID
     * @returns Promise resolving to compliance assessment
     */
    checkCompliance(posId: PEMId | string): Promise<{
        level: ComplianceLevel;
        score: number;
        issues: string[];
        recommendations: string[];
        lastCheck: string;
        nextCheck: string;
    }>;
    /**
     * Request certificate renewal for a PEM device
     *
     * @param posId - Point of Sale ID
     * @param certificateType - Type of certificate to renew
     * @returns Promise resolving when renewal is initiated
     */
    requestCertificateRenewal(_posId: PEMId | string, _certificateType?: CertificateType): Promise<{
        renewalId: string;
        estimatedCompletion: string;
    }>;
    /**
     * Validate Point of Sale input
     */
    private validatePointOfSaleInput;
    /**
     * Validate address information
     */
    private validateAddress;
    /**
     * Validate certificates
     * @deprecated This method is not used since certificates field is not available in OpenAPI schema
     */
    /**
     * Parse certificate response from API
     */
    private parseCertificateResponse;
    /**
     * Build certificate chain from individual certificates
     */
    static buildCertificateChain(certificates: CertificateInfo[]): CertificateChain;
    /**
     * Validate certificate chain integrity
     */
    private static validateCertificateChain;
    /**
     * Build PEM configuration from certificates
     */
    static buildPEMConfiguration(posId: PEMId | string, certificates: CertificateInfo[]): PEMConfiguration;
    /**
     * Determine PEM status based on certificates
     */
    private static determinePEMStatus;
    /**
     * Calculate next certificate renewal date
     */
    private static calculateNextRenewal;
    /**
     * Assess compliance level
     */
    static assessCompliance(config: PEMConfiguration): {
        level: ComplianceLevel;
        score: number;
        issues: string[];
        recommendations: string[];
        lastCheck: string;
        nextCheck: string;
    };
    /**
     * Format certificate for display
     */
    static formatCertificateForDisplay(cert: CertificateInfo): {
        displayName: string;
        statusBadge: string;
        validity: string;
        issuerShort: string;
        expiresIn: string;
    };
    /**
     * Generate certificate summary report
     */
    static generateCertificateSummary(certificates: CertificateInfo[]): {
        totalCertificates: number;
        validCertificates: number;
        expiredCertificates: number;
        expiringSoon: number;
        revokedCertificates: number;
        typeBreakdown: Record<CertificateType, number>;
        nextExpiry: string | null;
    };
    /**
     * Validate certificate signature (placeholder implementation)
     */
    static validateCertificateSignature(cert: CertificateInfo, issuerCert?: CertificateInfo): {
        valid: boolean;
        error?: string;
    };
    /**
     * Generate certificate renewal request
     */
    static generateRenewalRequest(cert: CertificateInfo): {
        certificateId: string;
        currentExpiry: string;
        requestedValidityPeriod: number;
        justification: string;
        urgency: 'low' | 'medium' | 'high' | 'critical';
    };
}

interface ACubeSDKConfig {
    /**
     * API environment
     */
    environment: 'sandbox' | 'production' | 'development';
    /**
     * API key for authentication
     */
    apiKey?: string;
    /**
     * Custom base URLs for different environments
     */
    baseUrls?: {
        api?: string;
        auth?: string;
    };
    /**
     * HTTP client configuration
     */
    httpConfig?: Partial<HttpClientConfig>;
    /**
     * Authentication configuration
     */
    auth?: {
        getToken?: () => Promise<string | null>;
        onTokenExpired?: () => Promise<void>;
        autoRefresh?: boolean;
    };
    /**
     * Logging configuration
     */
    logging?: {
        enabled: boolean;
        level: 'debug' | 'info' | 'warn' | 'error';
        sanitize: boolean;
    };
    /**
     * Feature flags
     */
    features?: {
        enableRetry?: boolean;
        enableCircuitBreaker?: boolean;
        enableMetrics?: boolean;
        enableOfflineQueue?: boolean;
    };
    /**
     * Development options
     */
    dev?: {
        enableMocking?: boolean;
        mockDelay?: number;
    };
}
declare const DEFAULT_SDK_CONFIG: Required<ACubeSDKConfig>;
declare class ACubeSDK extends EventEmitter<EventTypeMap> {
    private config;
    private apiClient;
    private authClient;
    private isInitialized;
    private _cashiers?;
    private _receipts?;
    private _pointOfSales?;
    private _cashRegisters?;
    private _merchants?;
    private _pems?;
    constructor(config: ACubeSDKConfig);
    private mergeConfig;
    private createHttpClient;
    private getDefaultApiUrl;
    private getDefaultAuthUrl;
    private setupEventHandlers;
    /**
     * Initialize the SDK (optional - resources are lazy loaded)
     */
    initialize(): Promise<void>;
    private validateConfig;
    private performHealthCheck;
    /**
     * Cashiers resource - user management
     */
    get cashiers(): CashiersResource;
    /**
     * Receipts resource - e-receipt management
     */
    get receipts(): ReceiptsResource;
    /**
     * Point of Sales resource - POS device management
     */
    get pointOfSales(): PointOfSalesResource;
    /**
     * Cash Registers resource - device registration
     */
    get cashRegisters(): CashRegistersResource;
    /**
     * Merchants resource - business entity management
     */
    get merchants(): MerchantsResource;
    /**
     * PEMs resource - electronic memorization device management
     */
    get pems(): PEMsResource;
    /**
     * Update SDK configuration
     */
    updateConfig(updates: Partial<ACubeSDKConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): Readonly<Required<ACubeSDKConfig>>;
    /**
     * Get SDK metrics and health status
     */
    getMetrics(): {
        api: {
            circuitBreaker: {
                isHealthy: boolean;
                failureRate: number;
                avgResponseTime?: number;
                uptime: number;
            };
            retry: Readonly<RetryMetrics>;
        };
        auth: {
            circuitBreaker: {
                isHealthy: boolean;
                failureRate: number;
                avgResponseTime?: number;
                uptime: number;
            };
            retry: Readonly<RetryMetrics>;
        };
        isInitialized: boolean;
        environment: "sandbox" | "production" | "development";
    };
    /**
     * Get HTTP clients (for advanced usage)
     */
    getClients(): {
        api: HttpClient;
        auth: HttpClient;
    };
    /**
     * Cleanup resources
     */
    destroy(): void;
}
declare function createACubeSDK(config: ACubeSDKConfig): ACubeSDK;

/**
 * A-Cube E-Receipts SDK - Main Entry Point
 * Enterprise-grade TypeScript SDK for A-Cube e-receipt system integration
 */

/**
 * Initialize SDK with sandbox configuration
 */
declare function initializeSandboxSDK(config?: Partial<ACubeSDKConfig>): ACubeSDK;
/**
 * Initialize SDK with production configuration
 */
declare function initializeProductionSDK(config?: Partial<ACubeSDKConfig>): ACubeSDK;
/**
 * Initialize SDK with development configuration
 */
declare function initializeDevelopmentSDK(config?: Partial<ACubeSDKConfig>): ACubeSDK;
declare const SDK_VERSION = "2.0.0";
declare const API_VERSION = "1.0.0";

export { ACubeSDK, type ACubeSDKConfig, ACubeSDKError, type ACubeSDKEvent, AGGRESSIVE_RETRY_CONFIG, API_VERSION, AUTH_HTTP_CONFIG, type Amount, type AuditInfo, AuthenticationError, type AuthenticationEvent, AuthenticationMiddleware, AuthorizationError, BaseOpenAPIResource, type BaseResourceConfig, CONSERVATIVE_RETRY_CONFIG, CashRegisterEndpoints, type CashRegisterId, CashRegistersResource as CashRegisters, CashRegistersResource, type CashierCreatedEvent, type CashierDeletedEvent, CashierEndpoints, type CashierId, CashiersResource as Cashiers, CashiersResource, CircuitBreaker, type CircuitBreakerConfig, CircuitBreakerError, type CircuitBreakerMetrics, type CircuitBreakerState, type ClientEvent, ConfigurationError, ContentTypeMiddleware, DEFAULT_HTTP_CONFIG, DEFAULT_RETRY_CONFIG, DEFAULT_SDK_CONFIG, type DocumentNumber, type EndpointDefinition, type ErrorEvent, type EventTypeMap, FiscalError, type FiscalId, HttpClient, type HttpClientConfig, type HttpResponse, LoggingMiddleware, type MerchantCreatedEvent, MerchantEndpoints, type MerchantId, type MerchantUpdatedEvent, MerchantsResource as Merchants, MerchantsResource, type Middleware, MiddlewareStack, NetworkError, NotFoundError, type RequestOptions as OpenAPIRequestOptions, type PEMActivatedEvent, PEMEndpoints, type PEMId, type PEMStatusChangedEvent, PEMsResource as PEMs, PEMsResource, PerformanceMiddleware, PointOfSalesResource as PointOfSales, PointOfSalesEndpoints, PointOfSalesResource, type Quantity, RateLimitError, RateLimitingMiddleware, type ReceiptCreatedEvent, ReceiptEndpoints, type ReceiptId, type ReceiptReturnedEvent, type ReceiptTransmittedEvent, type ReceiptVoidedEvent, ReceiptsResource as Receipts, ReceiptsResource, type RequestContext, RequestIdMiddleware, type RequestOptions$1 as RequestOptions, type ResponseContext, type RetryAttempt, type RetryConfig, RetryHandler, type RetryMetrics, SDK_VERSION, type SerialNumber, UserAgentMiddleware, type VATRate, type ValidationContext, ValidationError, type ValidationViolation, type WebhookEvent, createACubeSDK, createAmount, createCashRegisterId, createCashierId, createDocumentNumber, createErrorFromResponse, createFiscalId, createMerchantId, createPEMId, createQuantity, createReceiptId, createSerialNumber, createVATRate, ACubeSDK as default, initializeDevelopmentSDK, initializeProductionSDK, initializeSandboxSDK, isAmount, isCashierId, isFiscalId, isReceiptId };
