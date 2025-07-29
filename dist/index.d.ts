import { EventEmitter } from 'eventemitter3';
import React$1, { ReactNode } from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';

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
type PointOfSaleId = Brand<string, 'PointOfSaleId'>;
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
declare const createPointOfSaleId: (id: string) => PointOfSaleId;
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
declare const isMerchantId: (value: unknown) => value is MerchantId;
declare const isPointOfSaleId: (value: unknown) => value is PointOfSaleId;
declare const isSerialNumber: (value: unknown) => value is SerialNumber;
declare const isPEMId: (value: unknown) => value is PEMId;
declare const isQuantity: (value: unknown) => value is Quantity;

/**
 * Advanced Retry Logic with Exponential Backoff and Jitter
 * Prevents thundering herd problem and provides intelligent retry policies
 */
interface RetryConfig$1 {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterType: 'none' | 'full' | 'equal' | 'decorrelated';
    retryableStatusCodes: number[];
    retryableErrors: string[];
    timeout?: number;
}
interface RetryAttempt$1 {
    attempt: number;
    delay: number;
    error: Error;
    timestamp: number;
}
interface RetryMetrics$1 {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    averageDelay: number;
    attempts: RetryAttempt$1[];
}
declare class RetryHandler {
    private config;
    private metrics;
    constructor(config: RetryConfig$1);
    execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T>;
    private executeWithTimeout;
    private shouldRetry;
    private calculateDelay;
    private extractStatusCode;
    private extractErrorCode;
    private isNetworkError;
    private sleep;
    getMetrics(): Readonly<RetryMetrics$1>;
    reset(): void;
}
declare const DEFAULT_RETRY_CONFIG: RetryConfig$1;
declare const AGGRESSIVE_RETRY_CONFIG: RetryConfig$1;
declare const CONSERVATIVE_RETRY_CONFIG: RetryConfig$1;

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring service health
 */
type CircuitBreakerState$1 = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
declare const CircuitBreakerState$1: {
    readonly CLOSED: "CLOSED";
    readonly OPEN: "OPEN";
    readonly HALF_OPEN: "HALF_OPEN";
};
interface CircuitBreakerConfig$1 {
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
        from: CircuitBreakerState$1;
        to: CircuitBreakerState$1;
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
    constructor(config: CircuitBreakerConfig$1);
    execute<T>(operation: () => Promise<T>, operationName?: string): Promise<T>;
    private executeWithTimeout;
    private shouldRejectRequest;
    private onSuccess;
    private onFailure;
    private transitionTo;
    private startHealthCheck;
    private performHealthCheck;
    getState(): CircuitBreakerState$1;
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
    retryConfig: RetryConfig$1;
    circuitBreakerConfig: CircuitBreakerConfig$1;
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
    config?: RequestOptions$1;
    fromCache?: boolean;
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
    getRetryMetrics(): Readonly<RetryMetrics$1>;
    getMetrics(): {
        requestCount: number;
        successCount: number;
        errorCount: number;
        totalDuration: number;
        averageResponseTime: number;
        retryCount: number;
    };
    getHealth(): {
        status: string;
        circuitBreakerState: CircuitBreakerState$1;
        lastError: null;
        uptime: number;
    };
    getHealthStatus(): {
        circuitBreaker: {
            isHealthy: boolean;
            failureRate: number;
            avgResponseTime?: number;
            uptime: number;
        };
        retry: Readonly<RetryMetrics$1>;
    };
    updateConfig(updates: Partial<HttpClientConfig>): void;
    destroy(): void;
}
declare const DEFAULT_HTTP_CONFIG: HttpClientConfig;
declare const AUTH_HTTP_CONFIG: HttpClientConfig;

/**
 * Type-safe event system for SDK
 * Discriminated unions ensure type safety for event payloads
 */

interface BaseEvent$1 {
    timestamp: Date;
    requestId: string;
}
interface ReceiptCreatedEvent extends BaseEvent$1 {
    type: 'receipt.created';
    data: {
        receiptId: ReceiptId;
        amount: string;
        fiscalId: string;
        cashierId?: CashierId;
        pemId?: PEMId;
    };
}
interface ReceiptVoidedEvent extends BaseEvent$1 {
    type: 'receipt.voided';
    data: {
        receiptId: ReceiptId;
        originalReceiptId: ReceiptId;
        reason: string;
        documentNumber?: DocumentNumber;
    };
}
interface ReceiptReturnedEvent extends BaseEvent$1 {
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
interface ReceiptTransmittedEvent extends BaseEvent$1 {
    type: 'receipt.transmitted';
    data: {
        receiptId: ReceiptId;
        documentNumber: DocumentNumber;
        transmissionDate: Date;
        fiscalResponse: unknown;
    };
}
interface PEMActivatedEvent extends BaseEvent$1 {
    type: 'pem.activated';
    data: {
        pemId: PEMId;
        serialNumber: SerialNumber;
        activationKey: string;
        status: 'ACTIVE';
    };
}
interface PEMStatusChangedEvent extends BaseEvent$1 {
    type: 'pem.status_changed';
    data: {
        pemId: PEMId;
        serialNumber: SerialNumber;
        previousStatus: string;
        newStatus: string;
        reason?: string;
    };
}
interface CashierCreatedEvent extends BaseEvent$1 {
    type: 'cashier.created';
    data: {
        cashierId: CashierId;
        email: string;
        merchantId: MerchantId;
    };
}
interface CashierDeletedEvent extends BaseEvent$1 {
    type: 'cashier.deleted';
    data: {
        cashierId: CashierId;
        email: string;
    };
}
interface MerchantCreatedEvent extends BaseEvent$1 {
    type: 'merchant.created';
    data: {
        merchantId: MerchantId;
        fiscalId: string;
        name: string;
        email: string;
    };
}
interface MerchantUpdatedEvent extends BaseEvent$1 {
    type: 'merchant.updated';
    data: {
        merchantId: MerchantId;
        changes: Record<string, unknown>;
    };
}
interface ErrorEvent extends BaseEvent$1 {
    type: 'error';
    data: {
        errorCode: string;
        errorMessage: string;
        operation: string;
        retry: boolean;
        context?: Record<string, unknown>;
    };
}
interface AuthenticationEvent extends BaseEvent$1 {
    type: 'auth.success' | 'auth.failed' | 'auth.expired' | 'auth.refreshed' | 'auth.error' | 'auth.logout';
    data: {
        userId?: string;
        role?: 'provider' | 'merchant' | 'cashier';
        expiresAt?: Date;
        error?: string;
        errorCode?: string;
        errorMessage?: string;
        operation?: string;
        retry?: boolean;
        context?: Record<string, unknown>;
        reason?: string;
        user?: unknown;
        sessionId?: string;
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
 * Unified Storage Interface for A-Cube SDK
 * Provides cross-platform storage abstraction with type safety and encryption support
 */

declare const __storageKeyBrand: unique symbol;
type StorageKey = string & {
    [__storageKeyBrand]: 'StorageKey';
};
declare const createStorageKey: (key: string) => StorageKey;
type StorageValue = string | number | boolean | object | Array<any> | null | undefined;
interface StorageEntry<T = StorageValue> {
    readonly data: T;
    readonly metadata: {
        readonly key: StorageKey;
        readonly createdAt: number;
        readonly updatedAt: number;
        readonly expiresAt?: number;
        readonly encrypted: boolean;
        readonly compressed: boolean;
        readonly version: string;
        readonly checksum?: string;
    };
}
interface StorageOptions {
    readonly encrypt?: boolean;
    readonly compress?: boolean;
    readonly ttl?: number;
    readonly namespace?: string;
    readonly version?: string;
}
interface QueryOptions$1 {
    readonly keyPrefix?: string;
    readonly prefix?: string;
    readonly namespace?: string;
    readonly limit?: number;
    readonly offset?: number;
    readonly includeExpired?: boolean;
    readonly sortBy?: 'key' | 'createdAt' | 'updatedAt';
    readonly sortOrder?: 'asc' | 'desc';
}
interface StorageTransaction {
    readonly id: string;
    set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void>;
    get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null>;
    delete(key: StorageKey): Promise<boolean>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    readonly isActive: boolean;
}
interface StorageAdapter {
    readonly name: string;
    readonly isAvailable: boolean;
    readonly capabilities: {
        readonly supportsTransactions: boolean;
        readonly supportsIndexing: boolean;
        readonly maxKeyLength: number;
        readonly maxValueSize: number;
        readonly supportsCompression: boolean;
        readonly supportsEncryption: boolean;
        readonly supportsTTL: boolean;
    };
    set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void>;
    get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null>;
    delete(key: StorageKey): Promise<boolean>;
    exists(key: StorageKey): Promise<boolean>;
    clear(namespace?: string): Promise<void>;
    setMany<T extends StorageValue>(entries: Array<{
        key: StorageKey;
        value: T;
        options?: StorageOptions;
    }>): Promise<void>;
    getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>>;
    deleteMany(keys: StorageKey[]): Promise<number>;
    keys(options?: QueryOptions$1): Promise<StorageKey[]>;
    values<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    entries<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    count(options?: QueryOptions$1): Promise<number>;
    beginTransaction(): Promise<StorageTransaction>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    cleanup(): Promise<number>;
    optimize(): Promise<void>;
    getStats(): Promise<StorageStats>;
}
interface StorageStats {
    readonly totalKeys: number;
    readonly totalSize: number;
    readonly namespaces: string[];
    readonly oldestEntry: number;
    readonly newestEntry: number;
    readonly expiredEntries: number;
    readonly encryptedEntries: number;
    readonly compressedEntries: number;
}
interface UnifiedStorage extends StorageAdapter {
    setReceipt(id: ReceiptId, receipt: any, options?: StorageOptions): Promise<void>;
    getReceipt(id: ReceiptId): Promise<any | null>;
    deleteReceipt(id: ReceiptId): Promise<boolean>;
    setCashier(id: CashierId, cashier: any, options?: StorageOptions): Promise<void>;
    getCashier(id: CashierId): Promise<any | null>;
    deleteCashier(id: CashierId): Promise<boolean>;
    setMerchant(id: MerchantId, merchant: any, options?: StorageOptions): Promise<void>;
    getMerchant(id: MerchantId): Promise<any | null>;
    deleteMerchant(id: MerchantId): Promise<boolean>;
    setPEM(id: PEMId, pem: any, options?: StorageOptions): Promise<void>;
    getPEM(id: PEMId): Promise<any | null>;
    deletePEM(id: PEMId): Promise<boolean>;
    setCashRegister(id: CashRegisterId, cashRegister: any, options?: StorageOptions): Promise<void>;
    getCashRegister(id: CashRegisterId): Promise<any | null>;
    deleteCashRegister(id: CashRegisterId): Promise<boolean>;
    setCache<T extends StorageValue>(key: string, value: T, ttl?: number): Promise<void>;
    getCache<T extends StorageValue>(key: string): Promise<T | null>;
    invalidateCache(pattern?: string): Promise<number>;
    setSession<T extends StorageValue>(key: string, value: T): Promise<void>;
    getSession<T extends StorageValue>(key: string): Promise<T | null>;
    clearSession(): Promise<void>;
    setSecure<T extends StorageValue>(key: string, value: T): Promise<void>;
    getSecure<T extends StorageValue>(key: string): Promise<T | null>;
    deleteSecure(key: string): Promise<boolean>;
    setConfig<T extends StorageValue>(key: string, value: T): Promise<void>;
    getConfig<T extends StorageValue>(key: string): Promise<T | null>;
    deleteConfig(key: string): Promise<boolean>;
    exportData(namespace?: string): Promise<string>;
    importData(data: string): Promise<number>;
    query<T extends StorageValue>(options: QueryOptions$1): Promise<Array<{
        key: StorageKey;
        value: T;
    }>>;
    initialize(): Promise<void>;
    destroy(): Promise<void>;
    on(event: 'set' | 'get' | 'delete' | 'clear' | 'error', listener: (...args: any[]) => void): void;
    off(event: 'set' | 'get' | 'delete' | 'clear' | 'error', listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
}
declare class StorageError extends Error {
    readonly code: string;
    readonly operation: string;
    readonly key?: StorageKey | undefined;
    readonly cause?: Error | undefined;
    constructor(message: string, code: string, operation: string, key?: StorageKey | undefined, cause?: Error | undefined);
}
declare class StorageConnectionError extends StorageError {
    constructor(adapter: string, cause?: Error);
}
declare class StorageCapacityError extends StorageError {
    constructor(key: StorageKey, size: number, maxSize: number);
}
declare class StorageEncryptionError extends StorageError {
    constructor(key: StorageKey, operation: string, cause?: Error);
}
declare class StorageTransactionError extends StorageError {
    constructor(transactionId: string, operation: string, cause?: Error);
}
declare const STORAGE_NAMESPACES: {
    readonly RECEIPTS: "receipts";
    readonly CASHIERS: "cashiers";
    readonly MERCHANTS: "merchants";
    readonly PEMS: "pems";
    readonly CASH_REGISTERS: "cash_registers";
    readonly CACHE: "cache";
    readonly SESSION: "session";
    readonly SECURE: "secure";
    readonly CONFIG: "config";
    readonly OFFLINE_QUEUE: "offline_queue";
    readonly ANALYTICS: "analytics";
    readonly AUDIT: "audit";
};

/**
 * Enterprise Queue Types and Interfaces
 * Type-safe queue operations with branded types
 */
type QueuePriority = 'critical' | 'high' | 'normal' | 'low';
type QueueOperationType = 'create' | 'update' | 'delete' | 'batch' | 'custom';
type ConflictResolutionStrategy$1 = 'client-wins' | 'server-wins' | 'merge' | 'manual';
type RetryStrategy = 'exponential' | 'linear' | 'custom';
type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retry' | 'dead';
type ResourceType = 'receipts' | 'cashiers' | 'merchants' | 'cash-registers' | 'point-of-sales' | 'pems';
type QueueItemId = string & {
    readonly __brand: 'QueueItemId';
};
interface QueueItem {
    readonly id: QueueItemId;
    readonly priority: QueuePriority;
    readonly operation: QueueOperationType;
    readonly resource: ResourceType;
    readonly data: unknown;
    readonly status: QueueItemStatus;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly scheduledAt?: number;
    readonly retryCount: number;
    readonly maxRetries: number;
    readonly retryStrategy: RetryStrategy;
    readonly conflictResolution: ConflictResolutionStrategy$1;
    readonly optimisticId?: string;
    readonly batchId?: string;
    readonly dependencies?: QueueItemId[];
    readonly metadata?: Record<string, unknown>;
    readonly errorHistory?: QueueError[];
}
interface QueueError {
    readonly timestamp: number;
    readonly error: string;
    readonly code?: string;
    readonly retryable: boolean;
    readonly context?: Record<string, unknown>;
}
interface BatchOperation {
    readonly id: string;
    readonly items: QueueItem[];
    readonly status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
    readonly createdAt: number;
    readonly strategy: 'parallel' | 'sequential' | 'custom';
    readonly maxConcurrency?: number;
}
interface QueueStats {
    readonly totalItems: number;
    readonly pendingItems: number;
    readonly processingItems: number;
    readonly completedItems: number;
    readonly failedItems: number;
    readonly deadItems: number;
    readonly averageProcessingTime: number;
    readonly successRate: number;
    readonly lastProcessedAt: number | null;
    readonly throughputPerMinute: number;
    readonly priorityDistribution: Record<QueuePriority, number>;
    readonly resourceDistribution: Record<ResourceType, number>;
}
interface QueueConfig {
    readonly maxSize: number;
    readonly maxRetries: number;
    readonly defaultPriority: QueuePriority;
    readonly defaultRetryStrategy: RetryStrategy;
    readonly defaultConflictResolution: ConflictResolutionStrategy$1;
    readonly batchingEnabled: boolean;
    readonly batchSize: number;
    readonly batchTimeout: number;
    readonly deadLetterEnabled: boolean;
    readonly analyticsEnabled: boolean;
    readonly persistToDisk: boolean;
    readonly circuitBreakerEnabled: boolean;
    readonly circuitBreakerThreshold: number;
    readonly deduplicationEnabled: boolean;
    readonly deduplicationWindow: number;
}
interface QueueEvents {
    'item:added': {
        item: QueueItem;
    };
    'item:processing': {
        item: QueueItem;
    };
    'item:completed': {
        item: QueueItem;
        result?: unknown;
    };
    'item:failed': {
        item: QueueItem;
        error: QueueError;
    };
    'item:retry': {
        item: QueueItem;
        attempt: number;
    };
    'item:dead': {
        item: QueueItem;
    };
    'item:max-retries-exceeded': {
        item: QueueItem;
    };
    'item:circuit-open': {
        item: QueueItem;
        resource: ResourceType;
    };
    'item:retry-scheduled': {
        item: QueueItem;
        attempt: number;
        delay: number;
    };
    'item:retry-cancelled': {
        item: QueueItem;
    };
    'item:retry-ready': {
        itemId: QueueItemId;
        attempt: number;
    };
    'batch:created': {
        batch: BatchOperation;
    };
    'batch:completed': {
        batch: BatchOperation;
    };
    'batch:failed': {
        batch: BatchOperation;
    };
    'queue:initialized': {};
    'queue:drained': {
        stats: QueueStats;
    };
    'queue:backpressure': {
        queueSize: number;
        threshold: number;
    };
    'queue:paused': {
        reason?: string;
    };
    'queue:resumed': {
        reason?: string;
    };
    'circuit:opened': {
        resource: ResourceType;
        errorRate: number;
    };
    'circuit:closed': {
        resource: ResourceType;
    };
    'circuit:half-open': {
        resource: ResourceType;
    };
    'circuit:reset': {
        resource: ResourceType;
    };
    'retry:queue-full': {
        queueSize: number;
        maxSize: number;
    };
}
interface RetryPolicy {
    readonly strategy: RetryStrategy;
    readonly maxRetries: number;
    readonly baseDelay: number;
    readonly maxDelay: number;
    readonly backoffFactor: number;
    readonly jitterEnabled: boolean;
    readonly retryableErrors?: string[];
    readonly nonRetryableErrors?: string[];
}
interface CircuitBreakerState {
    readonly state: 'closed' | 'open' | 'half-open';
    readonly failureCount: number;
    readonly successCount: number;
    readonly lastFailureTime: number | null;
    readonly nextRetryTime: number | null;
    readonly threshold: number;
    readonly timeout: number;
}
type QueueProcessor<T = unknown> = (item: QueueItem) => Promise<T>;
type ConflictResolver<T = unknown> = (localItem: QueueItem, serverItem: T, context: {
    resource: ResourceType;
    operation: QueueOperationType;
}) => Promise<T>;

/**
 * Queue Analytics System
 * Enterprise-grade monitoring and insights for queue performance
 */

interface AnalyticsConfig {
    enabled: boolean;
    sampleRate: number;
    retentionDays: number;
    aggregationIntervals: number[];
    enableRealTimeMetrics: boolean;
    enableTrendAnalysis: boolean;
}
interface PerformanceMetrics$2 {
    timestamp: number;
    processingTime: number;
    queueSize: number;
    throughput: number;
    errorRate: number;
    priorityDistribution: Record<QueuePriority, number>;
    resourceDistribution: Record<ResourceType, number>;
    operationDistribution: Record<QueueOperationType, number>;
}
interface TrendAnalysis {
    timeRange: string;
    avgProcessingTime: number;
    avgQueueSize: number;
    avgThroughput: number;
    peakQueueSize: number;
    errorRateChange: number;
    performanceScore: number;
    recommendations: string[];
}
interface QueueInsights {
    bottlenecks: BottleneckAnalysis[];
    patterns: UsagePattern[];
    anomalies: Anomaly[];
    forecasts: PerformanceForecast[];
    healthScore: number;
}
interface BottleneckAnalysis {
    type: 'resource' | 'priority' | 'operation' | 'time';
    identifier: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: number;
    suggestion: string;
}
interface UsagePattern {
    pattern: 'peak_hours' | 'batch_processing' | 'retry_storm' | 'resource_hotspot';
    description: string;
    frequency: number;
    timeWindows: string[];
    impact: number;
}
interface Anomaly {
    type: 'throughput' | 'latency' | 'error_rate' | 'queue_size';
    timestamp: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
    deviation: number;
    expectedValue: number;
    actualValue: number;
}
interface PerformanceForecast {
    metric: 'queue_size' | 'processing_time' | 'throughput' | 'error_rate';
    timeHorizon: number;
    predictedValue: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}
declare class QueueAnalytics {
    private config;
    private metricsHistory;
    private realtimeMetrics;
    private aggregatedMetrics;
    private itemTimings;
    private processingStartTimes;
    constructor(config?: Partial<AnalyticsConfig>);
    /**
     * Record item processing start
     */
    recordProcessingStart(itemId: string): void;
    /**
     * Record item processing completion
     */
    recordProcessingComplete(itemId: string, _success: boolean): void;
    /**
     * Record queue snapshot for metrics
     */
    recordQueueSnapshot(stats: QueueStats): void;
    /**
     * Get comprehensive queue insights
     */
    getInsights(timeRangeMs?: number): QueueInsights;
    /**
     * Get trend analysis for specified time range
     */
    getTrendAnalysis(timeRangeMs?: number): TrendAnalysis;
    /**
     * Get real-time metrics
     */
    getRealTimeMetrics(): PerformanceMetrics$2 | null;
    /**
     * Get aggregated metrics for specific interval
     */
    getAggregatedMetrics(intervalMs: number, timeRangeMs?: number): PerformanceMetrics$2[];
    /**
     * Clear old metrics data
     */
    cleanup(): void;
    /**
     * Export metrics data
     */
    exportMetrics(format?: 'json' | 'csv'): string;
    private initializeAggregationMaps;
    private startRealtimeMetrics;
    private addMetricsPoint;
    private addToAggregatedMetrics;
    private aggregateMetrics;
    private calculateAverageProcessingTime;
    private calculateThroughput;
    private calculateErrorRate;
    private getOperationDistribution;
    private analyzeBottlenecks;
    private identifyPatterns;
    private detectAnomalies;
    private generateForecasts;
    private calculateHealthScore;
    private calculateErrorRateChange;
    private calculatePerformanceScore;
    private generateRecommendations;
    private calculateStandardDeviation;
    private calculateTrend;
    private formatTimeRange;
    private exportAsCSV;
    private getEmptyInsights;
    private getEmptyTrendAnalysis;
    destroy(): void;
}

interface QueueManagerConfig extends QueueConfig {
    storageKey: string;
    autoProcessing: boolean;
    processingInterval: number;
    maxConcurrentProcessing: number;
    enablePersistence: boolean;
    enableAnalytics: boolean;
}
interface ProcessingResult$1 {
    success: boolean;
    result?: any;
    error?: string;
    processingTime: number;
}
declare class EnterpriseQueueManager extends EventEmitter<QueueEvents> {
    private config;
    private priorityQueue;
    private batchProcessor;
    private retryManager;
    private analytics;
    private processors;
    private processingItems;
    private processingTimer;
    private isProcessing;
    private itemCounter;
    constructor(config?: Partial<QueueManagerConfig>);
    /**
     * Add operation to queue
     */
    enqueue(operation: QueueOperationType, resource: ResourceType, data: any, options?: {
        priority?: QueuePriority;
        optimisticId?: string;
        batchId?: string;
        dependencies?: QueueItemId[];
        metadata?: Record<string, unknown>;
        scheduledAt?: number;
    }): Promise<QueueItemId>;
    /**
     * Remove item from queue
     */
    dequeue(id: QueueItemId): Promise<boolean>;
    /**
     * Get item by ID
     */
    getItem(id: QueueItemId): QueueItem | null;
    /**
     * Update item status
     */
    updateItemStatus(id: QueueItemId, status: QueueItem['status'], error?: string): Promise<boolean>;
    /**
     * Register processor for resource/operation combination
     */
    registerProcessor(resource: ResourceType, operation: QueueOperationType, processor: QueueProcessor): void;
    /**
     * Process next available items
     */
    processNext(maxItems?: number): Promise<ProcessingResult$1[]>;
    /**
     * Process all pending items
     */
    processAll(): Promise<ProcessingResult$1[]>;
    /**
     * Get queue statistics
     */
    getStats(): QueueStats;
    /**
     * Get queue insights
     */
    getInsights(): QueueInsights;
    /**
     * Get trend analysis
     */
    getTrendAnalysis(): TrendAnalysis;
    /**
     * Clear all items from queue
     */
    clear(): Promise<void>;
    /**
     * Pause queue processing
     */
    pause(): void;
    /**
     * Resume queue processing
     */
    resume(): void;
    /**
     * Get processing status
     */
    getProcessingStatus(): {
        isProcessing: boolean;
        processingItems: number;
        autoProcessing: boolean;
        readyItems: number;
    };
    /**
     * Initialize the queue manager
     */
    initialize(): Promise<void>;
    /**
     * Add item to queue (compatibility method)
     */
    add(item: QueueItem): Promise<void>;
    /**
     * Process a specific queue item (public interface)
     */
    processItem(item: QueueItem): Promise<ProcessingResult$1>;
    /**
     * Get all queue items (compatibility method)
     */
    getQueueItems(): QueueItem[];
    /**
     * Cleanup and destroy
     */
    destroy(): Promise<void>;
    private initializeComponents;
    private setupEventHandlers;
    private startAutoProcessing;
    private processBatched;
    private processIndividually;
    private processBatch;
    private processItemInternal;
    private handleStatusChange;
    private isDuplicate;
    private isRetryableError;
    private persistQueue;
}

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
    storage?: UnifiedStorage | undefined;
    queueManager?: EnterpriseQueueManager | undefined;
    offlineEnabled?: boolean;
}
interface OfflineRequestOptions {
    preferOffline?: boolean;
    queueIfOffline?: boolean;
    skipCache?: boolean;
    cacheTTL?: number;
    optimistic?: boolean;
}
interface RequestOptions extends OfflineRequestOptions {
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
 * Enhanced with offline-first capabilities
 */
declare abstract class BaseOpenAPIResource {
    protected readonly client: HttpClient;
    protected readonly endpoints: Record<string, EndpointDefinition>;
    protected readonly storage?: UnifiedStorage | undefined;
    protected readonly queueManager?: EnterpriseQueueManager | undefined;
    protected readonly offlineEnabled: boolean;
    constructor(config: BaseResourceConfig);
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
    protected executeRequest<TRequest = unknown, TResponse = unknown>(endpointKey: string, data?: TRequest, options?: RequestOptions): Promise<TResponse>;
    /**
     * Execute offline-first request with intelligent fallback
     */
    private executeOfflineFirstRequest;
    /**
     * Execute standard online request (original implementation)
     */
    private executeOnlineRequest;
    /**
     * Cache response data with TTL
     */
    private cacheResponse;
    /**
     * Get cached response if valid
     */
    private getCachedResponse;
    /**
     * Get offline data (persistent storage)
     */
    private getOfflineData;
    /**
     * Queue write operation for later execution
     */
    private queueWriteOperation;
    /**
     * Build cache key for request
     */
    private buildCacheKey;
    /**
     * Map HTTP method to queue operation type
     */
    private mapHttpMethodToQueueOperation;
    /**
     * Determine queue priority based on endpoint
     */
    private determinePriority;
    /**
     * Create optimistic response for write operations
     */
    private createOptimisticResponse;
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
    /**
     * Check if offline capabilities are enabled for this resource
     */
    protected isOfflineEnabled(): boolean;
    /**
     * Check if queue capabilities are enabled for this resource
     */
    protected isQueueEnabled(): boolean;
    /**
     * Store data for offline use (persistent across sessions)
     */
    protected storeOfflineData(key: string, data: any): Promise<void>;
    /**
     * Clear cached data for a specific key pattern
     */
    protected clearCache(keyPattern?: string): Promise<void>;
    /**
     * Get offline queue statistics for this resource
     */
    protected getOfflineStats(): Promise<{
        queuedOperations: number;
        cachedEntries: number;
        offlineEntries: number;
    }>;
    /**
     * Force sync of queued operations for this resource
     */
    protected syncQueuedOperations(): Promise<void>;
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
 * Enhanced with offline-first capabilities
 */
declare class CashiersResource extends BaseOpenAPIResource {
    constructor(client: HttpClient, storage?: UnifiedStorage | undefined, queueManager?: EnterpriseQueueManager | undefined);
    /**
     * Get a list of cashiers with pagination
     * Enhanced with offline-first capabilities
     *
     * @param params - Pagination parameters
     * @param options - Request options including offline preferences
     * @returns Promise resolving to paginated cashier list
     */
    list(params?: CashierListParams, options?: Partial<RequestOptions>): Promise<CashierPage>;
    /**
     * Create a new cashier
     * Enhanced with offline queuing and optimistic updates
     *
     * @param data - Cashier creation input data
     * @param validationOptions - Validation options
     * @param requestOptions - Request options including offline preferences
     * @returns Promise resolving to created cashier
     */
    create(data: CashierCreateInput, validationOptions?: CashierValidationOptions, requestOptions?: Partial<RequestOptions>): Promise<CashierOutput>;
    /**
     * Get current cashier information
     * Enhanced with intelligent caching
     *
     * @param options - Request options including offline preferences
     * @returns Promise resolving to current cashier details
     */
    me(options?: Partial<RequestOptions>): Promise<CashierOutput>;
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
 * Enhanced with offline-first capabilities
 */
declare class ReceiptsResource extends BaseOpenAPIResource {
    constructor(client: HttpClient, storage?: UnifiedStorage | undefined, queueManager?: EnterpriseQueueManager | undefined);
    /**
     * Get a list of receipts with filtering and pagination
     * Enhanced with offline-first capabilities
     *
     * @param params - List parameters including filters and pagination
     * @param options - Request options including offline preferences
     * @returns Promise resolving to paginated receipt list
     */
    list(params?: ReceiptListParams, options?: Partial<RequestOptions>): Promise<ReceiptPage>;
    /**
     * Create a new electronic receipt
     * Enhanced with offline queuing and optimistic updates
     *
     * @param data - Receipt input data with items and payment information
     * @param validationOptions - Validation options for fiscal compliance
     * @param requestOptions - Request options including offline preferences
     * @returns Promise resolving to created receipt
     */
    create(data: ReceiptInput, validationOptions?: ReceiptValidationOptions, requestOptions?: Partial<RequestOptions>): Promise<ReceiptOutput>;
    /**
     * Void an electronic receipt
     * Enhanced with offline queuing for critical operations
     *
     * @param voidData - Void request data
     * @param options - Request options including offline preferences
     * @returns Promise resolving to void confirmation
     */
    void(voidData: VoidReceiptRequest, options?: Partial<RequestOptions>): Promise<VoidReceiptOutput>;
    /**
     * Get a specific receipt by UUID
     * Enhanced with intelligent caching for frequent lookups
     *
     * @param receiptId - Receipt UUID
     * @param options - Request options including offline preferences
     * @returns Promise resolving to receipt details
     */
    retrieve(receiptId: ReceiptId | string, options?: Partial<RequestOptions>): Promise<ReceiptOutput>;
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
     * Update an existing receipt
     *
     * @param receiptId - The receipt ID to update
     * @param updateData - Update data for the receipt
     * @returns Promise resolving to updated receipt
     */
    update(receiptId: ReceiptId | string, updateData: Partial<ReceiptInput>): Promise<ReceiptOutput>;
    /**
     * Delete a receipt
     *
     * @param receiptId - The receipt ID to delete
     * @returns Promise resolving to deletion confirmation
     */
    delete(receiptId: ReceiptId | string): Promise<{
        success: boolean;
        message?: string;
    }>;
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
    /**
     * Get offline receipt statistics
     */
    getOfflineReceiptStats(): Promise<{
        resourceType: string;
        capabilities: {
            canCreateOffline: boolean;
            canReadOffline: boolean;
            canCacheReceipts: boolean;
        };
        queuedOperations: number;
        cachedEntries: number;
        offlineEntries: number;
    }>;
    /**
     * Sync all queued receipt operations
     */
    syncQueuedReceipts(): Promise<void>;
    /**
     * Clear receipt cache (useful for data refresh)
     */
    clearReceiptCache(): Promise<void>;
    /**
     * Store receipt for offline access
     */
    storeReceiptOffline(receiptId: string, receipt: ReceiptOutput): Promise<void>;
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
 * mTLS Certificate Manager
 * Secure storage and management of mTLS certificates for POS devices
 *
 * Features:
 * - Secure storage of certificates received from server
 * - Cross-platform certificate management
 * - Certificate validation and lifecycle management
 * - Integration with cash register endpoints
 */

/**
 * mTLS Certificate data structure
 */
interface MTLSCertificate {
    /** Unique identifier for the cash register */
    cashRegisterId: CashRegisterId;
    /** PEM serial number from the device */
    pemSerialNumber: SerialNumber;
    /** Human-readable name for the cash register */
    name: string;
    /** The actual mTLS certificate in PEM format */
    certificate: string;
    /** Certificate metadata */
    metadata: {
        /** When the certificate was issued */
        issuedAt: Date;
        /** When the certificate expires (if available) */
        expiresAt?: Date;
        /** Certificate authority information */
        issuer?: string;
        /** Certificate subject information */
        subject?: string;
        /** Certificate fingerprint for validation */
        fingerprint?: string;
    };
    /** When this certificate was stored locally */
    storedAt: Date;
    /** Certificate status */
    status: 'active' | 'expired' | 'revoked' | 'pending';
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
/**
 * Cash register creation request with mTLS certificate support
 */
interface CashRegisterCreateRequest {
    /** PEM serial number from the device */
    pem_serial_number: string;
    /** Human-readable name for the cash register */
    name: string;
}
/**
 * Cash register creation response with mTLS certificate
 */
interface CashRegisterCreateResponse {
    /** Unique identifier for the cash register */
    uuid: string;
    /** PEM serial number from the device */
    pem_serial_number: string;
    /** Human-readable name for the cash register */
    name: string;
    /** mTLS certificate in PEM format */
    mtls_certificate: string;
}
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
 * Manages cash register devices with full compliance and mTLS certificate management
 */
declare class CashRegistersResource extends BaseOpenAPIResource {
    private certificateManager;
    constructor(client: HttpClient);
    /**
     * Initialize the resource (including certificate manager)
     */
    initialize(): Promise<void>;
    /**
     * Register a new cash register and obtain mTLS certificate
     * This method calls the server endpoint and automatically stores the certificate securely
     *
     * @param request - Cash register creation request
     * @returns Promise resolving to created cash register with certificate info
     */
    registerWithCertificate(request: CashRegisterCreateRequest): Promise<{
        cashRegister: CashRegisterCreateResponse;
        certificate: MTLSCertificate;
    }>;
    /**
     * Get mTLS certificate for a cash register
     *
     * @param cashRegisterId - Cash register ID
     * @returns Promise resolving to certificate or null if not found
     */
    getCertificate(cashRegisterId: CashRegisterId): Promise<MTLSCertificate | null>;
    /**
     * Get all stored mTLS certificates
     *
     * @returns Promise resolving to array of certificates
     */
    getAllCertificates(): Promise<MTLSCertificate[]>;
    /**
     * Remove mTLS certificate for a cash register
     *
     * @param cashRegisterId - Cash register ID
     * @returns Promise resolving to true if certificate was removed
     */
    removeCertificate(cashRegisterId: CashRegisterId): Promise<boolean>;
    /**
     * Get certificate storage statistics
     *
     * @returns Promise resolving to storage statistics
     */
    getCertificateStats(): Promise<{
        totalCertificates: number;
        activeCertificates: number;
        expiredCertificates: number;
        storageSize: number;
        lastUpdate: Date | null;
    }>;
    /**
     * Cleanup expired certificates
     *
     * @returns Promise resolving to number of certificates removed
     */
    cleanupExpiredCertificates(): Promise<number>;
    /**
     * Create a new cash register (legacy method)
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
    /**
     * Destroy the resource and cleanup certificate manager
     */
    destroy(): Promise<void>;
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

/**
 * Core types for the sync and background processing system
 * Comprehensive type definitions for progressive sync, conflict resolution, and real-time updates
 */
interface BaseEvent {
    timestamp: Date;
    requestId: string;
}
type SyncOperation = 'full' | 'delta' | 'realtime' | 'background';
type SyncPhase = 'validate' | 'prepare' | 'execute' | 'verify' | 'cleanup';
type SyncStatus = 'idle' | 'syncing' | 'paused' | 'error' | 'completed';
type SyncDirection = 'upload' | 'download' | 'bidirectional';
type SyncStrategy = 'immediate' | 'batched' | 'scheduled' | 'adaptive';
interface SyncOptions {
    operation?: SyncOperation;
    direction?: SyncDirection;
    strategy?: SyncStrategy;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    maxRetries?: number;
    timeoutMs?: number;
    batchSize?: number;
    resources?: string[];
    since?: Date;
    force?: boolean;
}
interface SyncResult {
    id: string;
    operation: SyncOperation;
    status: 'success' | 'partial' | 'failed';
    startTime: Date;
    endTime: Date;
    duration: number;
    statistics: SyncStatistics;
    errors: SyncError[];
    conflicts: SyncConflict[];
    metadata: Record<string, unknown>;
}
interface SyncStatistics {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    bytesTransferred: number;
    recordsSynced: number;
    conflictsDetected: number;
    conflictsResolved: number;
    networkRequests: number;
    cacheHits: number;
}
interface SyncError {
    id: string;
    phase: SyncPhase;
    operation: string;
    error: Error;
    retryable: boolean;
    timestamp: Date;
    context: Record<string, unknown>;
}
interface DataDelta {
    resource: string;
    operation: 'create' | 'update' | 'delete';
    id: string;
    data?: any;
    previousData?: any;
    timestamp: Date;
    checksum: string;
    dependencies?: string[];
}
interface DeltaCalculationResult {
    deltas: DataDelta[];
    lastSyncTimestamp: Date;
    totalChanges: number;
    estimatedSyncTime: number;
    estimatedBandwidth: number;
}
type ConflictType$1 = 'version' | 'concurrent' | 'dependency' | 'schema';
type ConflictResolutionStrategy = 'client-wins' | 'server-wins' | 'merge' | 'user-choice' | 'latest-wins';
interface SyncConflict {
    id: string;
    type: ConflictType$1;
    resource: string;
    recordId: string;
    clientData: any;
    serverData: any;
    clientVersion: string;
    serverVersion: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
    autoResolvable: boolean;
    suggestedResolution?: ConflictResolutionStrategy;
    metadata: Record<string, unknown>;
}
type ConnectionType$1 = 'wifi' | 'cellular' | 'ethernet' | 'none';
type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
interface ConnectionInfo {
    type: ConnectionType$1;
    quality: ConnectionQuality;
    bandwidth: number;
    latency: number;
    isMetered: boolean;
    isOnline: boolean;
    lastChanged: Date;
}
interface NetworkOptimization {
    enableCompression: boolean;
    batchSize: number;
    maxConcurrentRequests: number;
    timeoutMs: number;
    retryStrategy: 'linear' | 'exponential' | 'adaptive';
    prioritizeOperations: boolean;
}
interface SyncStartedEvent extends BaseEvent {
    type: 'sync.started';
    data: {
        syncId: string;
        operation: SyncOperation;
        estimatedDuration?: number;
        dataTypes: string[];
        options: SyncOptions;
    };
}
interface SyncProgressEvent extends BaseEvent {
    type: 'sync.progress';
    data: {
        syncId: string;
        progress: number;
        phase: SyncPhase;
        operations: {
            completed: number;
            total: number;
            errors: number;
        };
        estimatedTimeRemaining?: number;
    };
}
interface SyncCompletedEvent extends BaseEvent {
    type: 'sync.completed';
    data: {
        syncId: string;
        result: SyncResult;
        summary: {
            recordsSynced: number;
            conflictsResolved: number;
            errors: number;
            duration: number;
        };
    };
}
interface SyncFailedEvent extends BaseEvent {
    type: 'sync.failed';
    data: {
        syncId: string;
        error: SyncError;
        phase: SyncPhase;
        retryable: boolean;
        nextRetryTime?: Date;
    };
}
interface SyncConflictEvent extends BaseEvent {
    type: 'sync.conflict';
    data: {
        syncId: string;
        conflicts: SyncConflict[];
        autoResolved: number;
        requiresUserInput: number;
    };
}
interface SyncPausedEvent extends BaseEvent {
    type: 'sync.paused';
    data: {
        syncId: string;
        reason: 'user-request' | 'network-issue' | 'battery-low' | 'error';
        canResume: boolean;
    };
}
interface SyncResumedEvent extends BaseEvent {
    type: 'sync.resumed';
    data: {
        syncId: string;
        previousPause: Date;
        resumeReason: string;
    };
}
type SyncEvent = SyncStartedEvent | SyncProgressEvent | SyncCompletedEvent | SyncFailedEvent | SyncConflictEvent | SyncPausedEvent | SyncResumedEvent;
type SyncEventTypeMap = {
    [K in SyncEvent['type']]: Extract<SyncEvent, {
        type: K;
    }>['data'];
};

/**
 * Progressive Sync Engine - Core synchronization system with partial failure recovery
 * Implements smart synchronization with delta sync, batch operations, and rollback capabilities
 */

interface SyncEngineConfig {
    maxConcurrentSyncs: number;
    defaultTimeout: number;
    defaultRetries: number;
    batchSize: number;
    enableRollback: boolean;
    enableDeltaSync: boolean;
    enableCompression: boolean;
    checkpointInterval: number;
}
/**
 * Progressive Sync Engine with partial failure recovery and rollback capabilities
 */
declare class ProgressiveSyncEngine extends EventEmitter<SyncEventTypeMap> {
    private config;
    private activeSyncs;
    private syncQueue;
    private isProcessingQueue;
    private lastSyncTimestamp;
    constructor(config?: Partial<SyncEngineConfig>);
    /**
     * Initialize the sync engine
     */
    initialize(): Promise<void>;
    /**
     * Execute a progressive sync operation with rollback capability
     */
    executeSync(options?: SyncOptions): Promise<SyncResult>;
    /**
     * Calculate data deltas for efficient synchronization
     */
    calculateDeltas(since?: Date): Promise<DeltaCalculationResult>;
    /**
     * Get current sync status and metrics
     */
    getStatus(): {
        activeSyncs: number;
        queuedSyncs: number;
        status: SyncStatus;
        lastSync: Date | null;
    };
    /**
     * Cancel a specific sync operation
     */
    cancelSync(syncId: string): Promise<boolean>;
    /**
     * Cancel all active sync operations
     */
    cancelAllSyncs(): Promise<void>;
    private executeSyncInternal;
    private executeSyncPhases;
    private executePhase;
    private validateSyncOperation;
    private prepareSyncData;
    private executeSyncOperations;
    private executeBatch;
    private verifySyncResults;
    private cleanupSyncResources;
    private createCheckpoint;
    private rollbackToLastCheckpoint;
    private queueSync;
    private processQueue;
    private createExecutionContext;
    private createSyncResult;
    private createSyncError;
    private isRetryableError;
    private estimateSyncTime;
    private estimateBandwidth;
    private generateSyncId;
    private emitSyncStarted;
    private emitSyncProgress;
    private emitSyncCompleted;
    private emitSyncFailed;
    private estimateTimeRemaining;
}

/**
 * Access Control Manager for A-Cube SDK
 * Provides comprehensive role-based access control (RBAC) and attribute-based access control (ABAC)
 */
interface AccessControlConfig {
    enabled: boolean;
    model: 'RBAC' | 'ABAC' | 'HYBRID';
    session: {
        timeout: number;
        maxConcurrentSessions: number;
        requireReauth: boolean;
    };
    audit: {
        logAllAccess: boolean;
        logFailedAttempts: boolean;
        retentionPeriod: number;
    };
    enforcement: {
        strictMode: boolean;
        allowEscalation: boolean;
        requireApproval: string[];
    };
}
interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    inherits?: string[];
    conditions?: AccessCondition[];
    metadata: {
        createdAt: number;
        updatedAt: number;
        createdBy: string;
        isSystem: boolean;
    };
}
interface Permission {
    id: string;
    resource: string;
    action: string;
    effect: 'allow' | 'deny';
    conditions?: AccessCondition[];
    scope?: {
        global?: boolean;
        organizations?: string[];
        locations?: string[];
        resources?: string[];
    };
}
interface AccessCondition {
    type: 'time' | 'location' | 'device' | 'attribute' | 'context';
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    attribute: string;
    value: any;
    metadata?: Record<string, any>;
}
interface User {
    id: string;
    email: string;
    name: string;
    roles: string[];
    attributes: Record<string, any>;
    status: 'active' | 'inactive' | 'suspended' | 'locked';
    lastLogin?: number;
    failedAttempts: number;
    lockoutUntil?: number;
    sessions: UserSession[];
    metadata: {
        createdAt: number;
        updatedAt: number;
        createdBy: string;
        department?: string;
        location?: string;
    };
}
interface UserSession {
    id: string;
    userId: string;
    startedAt: number;
    lastActivity: number;
    expiresAt: number;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: string;
    status: 'active' | 'expired' | 'terminated';
    permissions: Permission[];
}
interface AccessContext {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: string;
    timestamp: number;
    requestId?: string;
    attributes?: Record<string, any>;
}
interface AccessAuditEntry {
    id: string;
    userId: string;
    sessionId?: string;
    action: 'login' | 'logout' | 'access_granted' | 'access_denied' | 'permission_changed' | 'role_assigned' | 'role_revoked';
    resource?: string;
    timestamp: number;
    context: AccessContext;
    details: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
declare class AccessControlManager {
    private config;
    private users;
    private roles;
    private sessions;
    private accessRequests;
    private auditLog;
    private permissionCache;
    constructor(config?: Partial<AccessControlConfig>);
    /**
     * Create a new user
     */
    createUser(userData: Omit<User, 'id' | 'sessions' | 'failedAttempts' | 'metadata'>, createdBy: string): Promise<string>;
    /**
     * Assign role to user
     */
    assignRole(userId: string, roleId: string, assignedBy: string): Promise<void>;
    /**
     * Revoke role from user
     */
    revokeRole(userId: string, roleId: string, revokedBy: string): Promise<void>;
    /**
     * Create a new role
     */
    createRole(roleData: Omit<Role, 'id' | 'metadata'>, createdBy: string): Promise<string>;
    /**
     * Authenticate user and create session
     */
    authenticate(userId: string, context: AccessContext): Promise<{
        sessionId: string;
        permissions: Permission[];
    }>;
    /**
     * Check if user has permission to perform action on resource
     */
    checkAccess(sessionId: string, resource: string, action: string, context: AccessContext): Promise<{
        granted: boolean;
        reason?: string;
        requiresApproval?: boolean;
    }>;
    /**
     * Approve pending access request
     */
    approveAccess(requestId: string, approvedBy: string, context: AccessContext): Promise<void>;
    /**
     * Terminate user session
     */
    terminateSession(sessionId: string): Promise<void>;
    /**
     * Get user permissions (with caching)
     */
    getUserPermissions(userId: string): Promise<Permission[]>;
    /**
     * Get access audit log
     */
    getAuditLog(filter?: {
        userId?: string;
        action?: string;
        resource?: string;
        timeRange?: {
            start: number;
            end: number;
        };
        riskLevel?: AccessAuditEntry['riskLevel'];
    }): AccessAuditEntry[];
    /**
     * Get access control statistics
     */
    getAccessControlStats(): {
        users: {
            total: number;
            active: number;
            suspended: number;
            locked: number;
        };
        sessions: {
            active: number;
            total: number;
            averageDuration: number;
        };
        permissions: {
            totalRoles: number;
            totalPermissions: number;
            averagePermissionsPerUser: number;
        };
        audit: {
            totalEntries: number;
            failedAttempts: number;
            highRiskEvents: number;
        };
    };
    private evaluatePermissions;
    private evaluateConditions;
    private evaluateCondition;
    private checkScope;
    private matchesResource;
    private matchesAction;
    private initializeDefaultRoles;
    private clearUserPermissionCache;
    private auditAccess;
    private startSessionCleanup;
    private generateUserId;
    private generateRoleId;
    private generateSessionId;
    private generateRequestId;
    private generateAuditId;
}

/**
 * Authentication Types and Interfaces
 * Comprehensive type definitions for the enterprise auth system
 */

/**
 * User roles in the A-Cube system with hierarchical structure
 */
declare enum UserRole {
    ROLE_SUPPLIER = "ROLE_SUPPLIER",// Provider level
    ROLE_MERCHANT = "ROLE_MERCHANT",// Merchant level (includes cashier permissions)
    ROLE_CASHIER = "ROLE_CASHIER",// Cashier level (basic operations)
    ROLE_ADMIN = "ROLE_ADMIN",// Administrative access
    ROLE_PREVIOUS_ADMIN = "ROLE_PREVIOUS_ADMIN",// Former admin with limited access
    ROLE_ACUBE_MF1 = "ROLE_ACUBE_MF1",// A-Cube MF1 integration
    ROLE_EXTERNAL_MF1 = "ROLE_EXTERNAL_MF1",// External MF1 integration
    ROLE_MF1 = "ROLE_MF1"
}
/**
 * Simplified user role types for external APIs and UI
 */
type SimpleUserRole = 'provider' | 'merchant' | 'cashier' | 'admin';
/**
 * OAuth2 token response from /mf1/login endpoint
 */
interface OAuth2TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    scope?: string;
}
/**
 * Decoded JWT token payload
 */
interface JWTPayload {
    sub: string;
    email: string;
    roles: UserRole[];
    permissions: string[];
    iat: number;
    exp: number;
    nbf?: number;
    jti?: string;
    iss?: string;
    aud?: string | string[];
    cashier_id?: CashierId;
    merchant_id?: MerchantId;
    point_of_sale_id?: PointOfSaleId;
    [key: string]: unknown;
}
/**
 * Login credentials for OAuth2 password grant
 */
interface LoginCredentials {
    username: string;
    password: string;
    scope?: string;
    mfa_code?: string;
    device_id?: string;
    device_name?: string;
    preferred_role?: UserRole | SimpleUserRole;
    context?: {
        merchant_id?: MerchantId;
        cashier_id?: CashierId;
        point_of_sale_id?: PointOfSaleId;
    };
}
/**
 * User information after successful authentication
 */
interface AuthUser {
    id: string;
    email: string;
    name?: string;
    roles: UserRole[];
    permissions: string[];
    cashier_id?: CashierId;
    merchant_id?: MerchantId;
    point_of_sale_id?: PointOfSaleId;
    session_id: string;
    last_login: Date;
    attributes?: Record<string, unknown>;
}
/**
 * Authentication state for the SDK
 */
interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    error: AuthError | null;
}
/**
 * Stored authentication data (encrypted in storage)
 */
interface StoredAuthData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    tokenType: 'Bearer';
    user: AuthUser;
    encryptedAt: number;
    version: '1.0';
    deviceId?: string;
    sessionMetadata?: {
        ip?: string;
        userAgent?: string;
        location?: string;
    };
}
/**
 * Authentication error types
 */
declare const AuthErrorType: {
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    readonly REFRESH_FAILED: "REFRESH_FAILED";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly STORAGE_ERROR: "STORAGE_ERROR";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly SESSION_EXPIRED: "SESSION_EXPIRED";
    readonly MFA_REQUIRED: "MFA_REQUIRED";
    readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
    readonly UNKNOWN_ERROR: "UNKNOWN_ERROR";
};
type AuthErrorType = typeof AuthErrorType[keyof typeof AuthErrorType];
/**
 * Authentication error with context
 */
interface AuthError extends Error {
    type: AuthErrorType;
    message: string;
    code?: string;
    statusCode?: number;
    details?: Record<string, unknown>;
    timestamp: number;
    recoverable: boolean;
}
/**
 * Authentication configuration
 */
interface AuthConfig {
    loginUrl: string;
    refreshUrl: string;
    logoutUrl?: string;
    tokenRefreshBuffer: number;
    maxRefreshAttempts: number;
    refreshRetryDelay: number;
    storageKey: string;
    storageEncryption: boolean;
    sessionTimeout: number;
    maxConcurrentSessions: number;
    requireReauth: boolean;
    enableDeviceBinding: boolean;
    enableSessionValidation: boolean;
    enableTokenRotation: boolean;
    enablePerformanceOptimization?: boolean;
    performanceConfig?: {
        permissionCacheSize?: number;
        permissionCacheTTL?: number;
        roleCacheSize?: number;
        roleCacheTTL?: number;
        tokenValidationCacheSize?: number;
        tokenValidationCacheTTL?: number;
        maxBatchSize?: number;
        batchTimeoutMs?: number;
        enableMetrics?: boolean;
    };
    onTokenRefresh?: (tokens: OAuth2TokenResponse) => void;
    onTokenExpired?: () => void;
    onAuthError?: (error: AuthError) => void;
    onSessionExpired?: () => void;
    onLogout?: (reason?: string) => void;
}
/**
 * Permission check request
 */
interface PermissionCheck {
    resource: string;
    action: string;
    context?: Record<string, unknown>;
}
/**
 * Permission check result
 */
interface PermissionResult {
    granted: boolean;
    reason?: string;
    requiresApproval?: boolean;
    conditions?: Array<{
        type: string;
        satisfied: boolean;
        message?: string;
    }>;
}
/**
 * Token status information
 */
interface TokenStatus {
    isValid: boolean;
    expiresIn: number;
    isRefreshing: boolean;
    needsRefresh: boolean;
    lastRefreshed?: Date;
    refreshFailures: number;
}
/**
 * Authentication middleware configuration
 */
interface AuthMiddlewareConfig {
    enableRetry: boolean;
    maxRetries: number;
    retryDelay: number;
    authHeaderName: string;
    authScheme: string;
    includeRoleHeaders: boolean;
    roleHeaderName: string;
    includePermissionHeaders: boolean;
    permissionHeaderName: string;
    includeRequestContext: boolean;
    contextHeaders: Record<string, string>;
}
/**
 * Logout options
 */
interface LogoutOptions {
    clearAllSessions?: boolean;
    reason?: 'user_initiated' | 'session_expired' | 'security' | 'token_invalid' | 'other';
    message?: string;
    redirectUrl?: string;
    clearLocalData?: boolean;
}
/**
 * Session information
 */
interface SessionInfo {
    id: string;
    userId: string;
    createdAt: Date;
    lastActivity: Date;
    expiresAt: Date;
    deviceId?: string;
    deviceName?: string;
    deviceType?: 'web' | 'mobile' | 'desktop';
    ipAddress?: string;
    location?: {
        country?: string;
        city?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    userAgent?: string;
    active: boolean;
}

/**
 * Token Manager
 * Handles JWT token parsing, validation, and automatic refresh
 */

interface TokenManagerConfig {
    refreshUrl: string;
    tokenRefreshBuffer: number;
    maxRefreshAttempts: number;
    refreshRetryDelay: number;
    enableTokenRotation: boolean;
    onTokenRefresh?: (tokens: OAuth2TokenResponse) => void;
    onTokenExpired?: () => void;
}
/**
 * Manages JWT tokens with automatic refresh
 */
declare class TokenManager extends EventEmitter {
    private config;
    private httpClient;
    private refreshTimer;
    private refreshPromise;
    private refreshAttempts;
    private currentTokens;
    constructor(httpClient: HttpClient, config?: Partial<TokenManagerConfig>);
    /**
     * Set tokens and start refresh timer
     */
    setTokens(tokens: OAuth2TokenResponse): void;
    /**
     * Get current access token
     */
    getAccessToken(): string | null;
    /**
     * Get current refresh token
     */
    getRefreshToken(): string | null;
    /**
     * Get token status
     */
    getTokenStatus(): TokenStatus;
    /**
     * Parse JWT token
     */
    parseToken(token: string): JWTPayload | null;
    /**
     * Validate JWT token
     */
    validateToken(token: string): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Refresh tokens
     */
    refreshTokens(): Promise<OAuth2TokenResponse>;
    /**
     * Perform the actual refresh request
     */
    private performRefresh;
    /**
     * Schedule automatic token refresh
     */
    private scheduleRefresh;
    /**
     * Clear tokens and stop refresh timer
     */
    clearTokens(): void;
    /**
     * Force token refresh
     */
    forceRefresh(): Promise<OAuth2TokenResponse>;
    /**
     * Base64URL decode
     */
    private base64UrlDecode;
    /**
     * Create auth error
     */
    private createAuthError;
    /**
     * Event emitters
     */
    private emitRefreshStart;
    private emitRefreshSuccess;
    private emitRefreshFailure;
    private emitTokenExpired;
    /**
     * Destroy token manager
     */
    destroy(): void;
}

/**
 * Authentication Storage
 * Secure cross-platform storage for authentication tokens
 */

interface AuthStorageConfig {
    storageKey: string;
    enableEncryption: boolean;
    encryptionKey?: string;
    storageAdapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
    autoMigrate: boolean;
}
/**
 * Secure authentication storage with cross-platform support
 */
declare class AuthStorage extends EventEmitter {
    private config;
    private storage;
    private encryption;
    private encryptionKeyId;
    private memoryCache;
    private isInitialized;
    constructor(config?: Partial<AuthStorageConfig>);
    /**
     * Initialize storage and encryption
     */
    initialize(): Promise<void>;
    /**
     * Store authentication data securely
     */
    store(data: StoredAuthData): Promise<void>;
    /**
     * Retrieve authentication data
     */
    retrieve(): Promise<StoredAuthData | null>;
    /**
     * Clear authentication data
     */
    clear(): Promise<void>;
    /**
     * Update specific fields in stored auth data
     */
    update(updates: Partial<StoredAuthData>): Promise<void>;
    /**
     * Check if auth data exists and is valid
     */
    exists(): Promise<boolean>;
    /**
     * Get storage statistics
     */
    getStats(): Promise<{
        hasData: boolean;
        isExpired: boolean;
        expiresIn: number | null;
        storageType: string;
        encryptionEnabled: boolean;
    }>;
    /**
     * Platform-specific secure storage (React Native Keychain)
     */
    private storePlatformSpecific;
    /**
     * Retrieve from platform-specific storage
     */
    private retrievePlatformSpecific;
    /**
     * Clear platform-specific storage
     */
    private clearPlatformSpecific;
    /**
     * Initialize encryption key
     */
    private initializeEncryption;
    /**
     * Migrate from legacy storage formats
     */
    private migrateFromLegacyStorage;
    /**
     * Detect appropriate storage adapter
     */
    private detectStorageAdapter;
    /**
     * Platform detection helpers
     */
    private isReactNative;
    private isWeb;
    /**
     * Get React Native Keychain module
     */
    private getKeychain;
    /**
     * Ensure storage is initialized
     */
    private ensureInitialized;
    /**
     * Emit storage error event
     */
    private emitStorageError;
    /**
     * Create auth error
     */
    private createAuthError;
    /**
     * Utility: Convert ArrayBuffer to base64
     */
    private arrayBufferToBase64;
    /**
     * Utility: Convert base64 to ArrayBuffer
     */
    private base64ToArrayBuffer;
    /**
     * Destroy storage instance
     */
    destroy(): Promise<void>;
}

/**
 * Authentication Performance Optimizations
 * Memory-efficient caching, batching, and performance monitoring for auth operations
 */

interface AuthPerformanceMetrics {
    permissionChecks: {
        total: number;
        cached: number;
        cacheHitRate: number;
        avgResponseTime: number;
    };
    roleComputations: {
        total: number;
        cached: number;
        cacheHitRate: number;
        avgResponseTime: number;
    };
    tokenValidations: {
        total: number;
        cached: number;
        cacheHitRate: number;
        avgResponseTime: number;
    };
    batchOperations: {
        totalBatches: number;
        avgBatchSize: number;
        avgBatchTime: number;
    };
    memoryUsage: {
        totalCacheSize: number;
        permissionCacheSize: number;
        roleCacheSize: number;
        tokenCacheSize: number;
    };
}

/**
 * Enterprise authentication service with OAuth2, role-based access, and session management
 */
declare class AuthService extends EventEmitter {
    private config;
    private httpClient;
    private tokenManager;
    private storage;
    private accessControl;
    private currentState;
    private deviceId;
    private sessionCleanupInterval;
    private performanceOptimizer;
    constructor(httpClient: HttpClient, config?: Partial<AuthConfig>, accessControl?: AccessControlManager, storage?: AuthStorage, tokenManager?: TokenManager);
    /**
     * Initialize the auth service and restore session if available
     */
    initialize(): Promise<void>;
    /**
     * Login with username and password
     */
    login(credentials: LoginCredentials): Promise<AuthUser>;
    /**
     * Logout user and clear session
     */
    logout(options?: LogoutOptions): Promise<void>;
    /**
     * Get current authentication state
     */
    getState(): AuthState;
    /**
     * Get current user
     */
    getCurrentUser(): AuthUser | null;
    /**
     * Check if user has permission (optimized with caching and batching)
     */
    checkPermission(permission: PermissionCheck): Promise<PermissionResult>;
    /**
     * Direct permission check without optimization (used by optimizer)
     */
    private checkPermissionDirect;
    /**
     * Check if user has specific role (including inherited roles)
     */
    hasRole(role: UserRole): boolean;
    /**
     * Check if user has any of the specified roles (including inherited roles)
     */
    hasAnyRole(roles: UserRole[]): boolean;
    /**
     * Get user's effective roles (including inherited roles) - optimized with caching
     */
    getEffectiveRoles(): UserRole[];
    /**
     * Get user's primary role for display purposes
     */
    getPrimaryRole(): UserRole | null;
    /**
     * Get user's simple role for external APIs
     */
    getSimpleRole(): SimpleUserRole;
    /**
     * Switch to a different role context during session
     */
    switchRole(targetRole: UserRole, context?: {
        merchant_id?: MerchantId;
        cashier_id?: CashierId;
        point_of_sale_id?: PointOfSaleId;
    }): Promise<boolean>;
    /**
     * Get current session info
     */
    getSessionInfo(): Promise<SessionInfo | null>;
    /**
     * Refresh current session
     */
    refreshSession(): Promise<void>;
    /**
     * Restore session from storage
     */
    private restoreSession;
    /**
     * Handle token expiration
     */
    private handleTokenExpired;
    /**
     * Handle login errors
     */
    private handleLoginError;
    /**
     * Update authentication state
     */
    private updateState;
    /**
     * Setup event listeners
     */
    private setupEventListeners;
    /**
     * Start session cleanup timer
     */
    private startSessionCleanup;
    /**
     * Clean up expired sessions
     */
    private cleanupExpiredSessions;
    /**
     * Event emitters
     */
    private emitLoginStart;
    private emitLoginSuccess;
    private emitLoginFailure;
    private emitLogout;
    private emitSessionCreated;
    private emitSessionRestored;
    /**
     * Utility methods
     */
    private generateDeviceId;
    private generateSessionId;
    private getDeviceName;
    private getDeviceType;
    private getClientIP;
    private getUserAgent;
    private createAuthError;
    /**
     * Preload common permissions for the current user
     */
    private preloadCommonPermissions;
    /**
     * Clear user-specific performance caches (call on role change, logout, etc.)
     */
    clearUserCaches(): void;
    /**
     * Get performance metrics for monitoring
     */
    getPerformanceMetrics(): AuthPerformanceMetrics | null;
    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics(): void;
    /**
     * Destroy auth service
     */
    destroy(): Promise<void>;
}

/**
 * Enhanced Authentication Middleware
 * Advanced middleware with automatic token refresh, role-based headers, and request queuing
 */

/**
 * Enhanced authentication middleware with automatic token refresh and role-based access
 */
declare class EnhancedAuthMiddleware extends EventEmitter implements Middleware {
    readonly name = "enhanced-auth";
    readonly priority = 100;
    private config;
    private authService;
    private tokenManager;
    private isRefreshing;
    private requestQueue;
    private readonly queueTimeout;
    constructor(authService: AuthService, tokenManager: TokenManager, config?: Partial<AuthMiddlewareConfig>);
    /**
     * Before request: Add authentication headers and user context
     */
    beforeRequest(context: RequestContext): Promise<RequestContext>;
    /**
     * After response: Handle token expiration and refresh
     */
    afterResponse(context: RequestContext, response: ResponseContext): Promise<ResponseContext>;
    /**
     * Error handler: Process authentication-related errors
     */
    onError(context: RequestContext, error: Error): Promise<Error>;
    /**
     * Add authentication and context headers to request
     */
    private addAuthHeaders;
    /**
     * Queue request during token refresh
     */
    private queueRequest;
    /**
     * Refresh tokens with request queuing
     */
    private refreshTokensWithQueue;
    /**
     * Process all queued requests after token refresh
     */
    private processQueuedRequests;
    /**
     * Retry request with new token after 401 response
     */
    private retryRequestWithNewToken;
    /**
     * Handle authentication failure (401 after refresh attempt)
     */
    private handleAuthenticationFailure;
    /**
     * Handle authorization failure (403 responses)
     */
    private handleAuthorizationFailure;
    /**
     * Check for role changes that might explain authorization failure
     */
    private checkForRoleChanges;
    /**
     * Setup event listeners for auth service
     */
    private setupEventListeners;
    /**
     * Check if URL is an authentication endpoint
     */
    private isAuthEndpoint;
    /**
     * Check if request should be retried with token refresh
     */
    private shouldRetryWithRefresh;
    /**
     * Check if error is authentication-related
     */
    private isAuthRelatedError;
    /**
     * Create auth error from generic error
     */
    private createAuthError;
    /**
     * Get middleware statistics
     */
    getStats(): {
        queuedRequests: number;
        isRefreshing: boolean;
        totalRetries: number;
        averageQueueTime: number;
    };
    /**
     * Clear request queue and reset state
     */
    clearQueue(): void;
    /**
     * Destroy middleware and clean up resources
     */
    destroy(): void;
}

/**
 * Push Notifications Manager for A-Cube E-Receipt SDK
 * Handles PWA push notifications with Italian e-receipt specific messaging
 *
 * Features:
 * - VAPID key management
 * - Subscription handling
 * - Receipt-specific notifications
 * - Fiscal compliance alerts
 * - Multi-language support
 * - Notification actions
 */

/**
 * Notification types for e-receipts
 */
type NotificationType = 'receipt_created' | 'receipt_synced' | 'receipt_void' | 'fiscal_alert' | 'lottery_win' | 'sync_completed' | 'sync_failed' | 'offline_reminder' | 'app_update';
/**
 * Notification priority levels
 */
type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';
/**
 * Push notification configuration
 */
interface PushNotificationConfig {
    /** VAPID public key for push service */
    vapidPublicKey: string;
    /** Service worker registration */
    serviceWorkerRegistration?: ServiceWorkerRegistration;
    /** Default notification options */
    defaultOptions?: {
        /** Notification icon */
        icon?: string;
        /** Notification badge */
        badge?: string;
        /** Vibration pattern */
        vibrate?: number[];
        /** Silent notifications */
        silent?: boolean;
        /** Require interaction */
        requireInteraction?: boolean;
        /** Notification tag for grouping */
        tag?: string;
    };
    /** Language for notifications */
    language?: 'it' | 'en' | 'de' | 'fr';
    /** Enable automatic subscription */
    autoSubscribe?: boolean;
    /** Notification server endpoint */
    serverEndpoint?: string;
}
/**
 * Push subscription info
 */
interface PushSubscriptionInfo {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    expirationTime?: number | null;
}
/**
 * Notification payload
 */
interface NotificationPayload {
    type: NotificationType;
    title: string;
    body: string;
    data?: {
        receiptId?: string | undefined;
        amount?: string | undefined;
        merchantName?: string | undefined;
        timestamp?: string | undefined;
        actionUrl?: string | undefined;
        priority?: NotificationPriority | undefined;
        [key: string]: any;
    };
    options?: NotificationOptions;
}
/**
 * Push notification events
 */
interface PushNotificationEvents {
    'subscription:created': {
        subscription: PushSubscriptionInfo;
    };
    'subscription:updated': {
        subscription: PushSubscriptionInfo;
    };
    'subscription:deleted': {
        reason: string;
    };
    'permission:granted': {
        permission: NotificationPermission;
    };
    'permission:denied': {
        permission: NotificationPermission;
    };
    'notification:shown': {
        notification: NotificationPayload;
    };
    'notification:clicked': {
        action: string;
        data: any;
    };
    'notification:closed': {
        notification: NotificationPayload;
    };
    'error': {
        error: Error;
        context: string;
    };
}
/**
 * Push Notifications Manager
 * Handles PWA push notifications for e-receipt updates
 */
declare class PushNotificationManager extends EventEmitter<PushNotificationEvents> {
    private config;
    private registration;
    private subscription;
    private isSupported;
    private permission;
    constructor(config: PushNotificationConfig);
    /**
     * Check if push notifications are supported
     */
    private checkSupport;
    /**
     * Initialize push notifications
     */
    private initialize;
    /**
     * Request notification permission
     */
    requestPermission(): Promise<NotificationPermission>;
    /**
     * Subscribe to push notifications
     */
    subscribe(): Promise<PushSubscriptionInfo | null>;
    /**
     * Unsubscribe from push notifications
     */
    unsubscribe(): Promise<void>;
    /**
     * Show a notification
     */
    showNotification(payload: NotificationPayload): Promise<void>;
    /**
     * Show receipt created notification
     */
    notifyReceiptCreated(receipt: {
        id: string;
        amount: string;
        merchantName: string;
        timestamp?: string;
    }): Promise<void>;
    /**
     * Show fiscal alert notification
     */
    notifyFiscalAlert(data: {
        message: string;
        receiptId?: string;
        urgency?: 'high' | 'critical';
    }): Promise<void>;
    /**
     * Show lottery win notification
     */
    notifyLotteryWin(data: {
        receiptId: string;
        prizeAmount?: string;
        claimCode?: string;
    }): Promise<void>;
    /**
     * Show sync status notification
     */
    notifySyncStatus(status: 'completed' | 'failed', count: number): Promise<void>;
    /**
     * Show offline reminder notification
     */
    notifyOfflineReminder(pendingCount: number): Promise<void>;
    /**
     * Prepare notification with localization
     */
    private prepareNotification;
    /**
     * Get localized action title
     */
    private getActionTitle;
    /**
     * Convert VAPID key to Uint8Array
     */
    private urlBase64ToUint8Array;
    /**
     * Extract subscription info from PushSubscription
     */
    private extractSubscriptionInfo;
    /**
     * Send subscription to server
     */
    private sendSubscriptionToServer;
    /**
     * Remove subscription from server
     */
    private removeSubscriptionFromServer;
    /**
     * Get current permission status
     */
    getPermission(): NotificationPermission;
    /**
     * Check if notifications are supported
     */
    isNotificationSupported(): boolean;
    /**
     * Check if subscribed to push notifications
     */
    isSubscribed(): boolean;
    /**
     * Get current subscription
     */
    getSubscription(): PushSubscriptionInfo | null;
    /**
     * Set notification language
     */
    setLanguage(language: 'it' | 'en' | 'de' | 'fr'): void;
    /**
     * Destroy the push notification manager
     */
    destroy(): Promise<void>;
}

/**
 * PWA App Installer for A-Cube E-Receipt SDK
 * Handles Progressive Web App installation prompts and app lifecycle
 *
 * Features:
 * - Smart install prompt timing
 * - Custom install UI components
 * - Install criteria checking
 * - A2HS (Add to Home Screen) support
 * - Installation analytics
 * - Multi-platform support
 */

/**
 * Install prompt criteria
 */
interface InstallCriteria {
    /** Minimum user engagement time (ms) */
    minEngagementTime?: number;
    /** Minimum page views */
    minPageViews?: number;
    /** Minimum receipts created */
    minReceiptsCreated?: number;
    /** Days since first visit */
    daysSinceFirstVisit?: number;
    /** Require return visits */
    requireReturnVisit?: boolean;
    /** Custom criteria function */
    customCriteria?: () => boolean | Promise<boolean>;
}
/**
 * Install prompt configuration
 */
interface AppInstallerConfig {
    /** Install criteria */
    criteria?: InstallCriteria;
    /** Auto-show prompt when criteria met */
    autoShow?: boolean;
    /** Delay before showing prompt (ms) */
    showDelay?: number;
    /** Max times to show prompt */
    maxPromptAttempts?: number;
    /** Days to wait after dismissal */
    dismissalCooldown?: number;
    /** Custom prompt UI */
    customPrompt?: {
        enabled?: boolean;
        title?: string;
        message?: string;
        installButtonText?: string;
        cancelButtonText?: string;
        icon?: string;
    };
    /** Installation tracking */
    analytics?: {
        enabled?: boolean;
        trackingId?: string;
        customEvents?: Record<string, any>;
    };
    /** Platform-specific settings */
    platforms?: {
        /** iOS Safari specific */
        ios?: {
            showIOSInstructions?: boolean;
            customInstructions?: string;
        };
        /** Android Chrome specific */
        android?: {
            enableWebAPK?: boolean;
            customIcon?: string;
        };
        /** Desktop specific */
        desktop?: {
            showDesktopPrompt?: boolean;
            position?: 'top' | 'bottom' | 'center';
        };
    };
}
/**
 * Installation events
 */
interface AppInstallerEvents {
    'criteria:met': {
        criteria: InstallCriteria;
    };
    'prompt:available': {
        prompt: BeforeInstallPromptEvent$1;
    };
    'prompt:shown': {
        type: 'native' | 'custom';
    };
    'prompt:dismissed': {
        reason: 'user' | 'timeout' | 'error';
    };
    'install:started': {
        platform: string;
    };
    'install:completed': {
        outcome: 'accepted' | 'dismissed';
        platform: string;
    };
    'install:failed': {
        error: Error;
        platform: string;
    };
    'analytics:tracked': {
        event: string;
        data: any;
    };
}
/**
 * User engagement tracking
 */
interface EngagementData {
    firstVisit: number;
    lastVisit: number;
    totalTime: number;
    pageViews: number;
    receiptsCreated: number;
    returnVisits: number;
    promptsShown: number;
    lastPromptShown?: number;
    dismissed: boolean;
    installed: boolean;
}
/**
 * Platform detection
 */
interface PlatformInfo {
    name: 'ios' | 'android' | 'desktop' | 'unknown';
    browser: string;
    version: string;
    supportsNativePrompt: boolean;
    supportsWebAPK: boolean;
    isStandalone: boolean;
}
/**
 * Enhanced BeforeInstallPromptEvent interface
 */
interface BeforeInstallPromptEvent$1 extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}
/**
 * PWA App Installer
 * Manages app installation prompts and user engagement tracking
 */
declare class AppInstaller extends EventEmitter<AppInstallerEvents> {
    private config;
    private installPrompt;
    private engagementData;
    private platformInfo;
    private isInitialized;
    private engagementTimer?;
    private promptTimeout;
    private customPromptElement;
    constructor(config?: AppInstallerConfig);
    /**
     * Merge configuration with defaults
     */
    private mergeConfig;
    /**
     * Initialize the app installer
     */
    private initialize;
    /**
     * Setup event listeners
     */
    private setupEventListeners;
    /**
     * Detect platform information
     */
    private detectPlatform;
    /**
     * Load engagement data from storage
     */
    private loadEngagementData;
    /**
     * Save engagement data to storage
     */
    private saveEngagementData;
    /**
     * Update engagement data
     */
    private updateEngagementData;
    /**
     * Start engagement tracking
     */
    private startEngagementTracking;
    /**
     * Pause engagement tracking
     */
    private pauseEngagementTracking;
    /**
     * Resume engagement tracking
     */
    private resumeEngagementTracking;
    /**
     * Start criteria checking
     */
    private startCriteriaChecking;
    /**
     * Check if install criteria are met
     */
    checkCriteria(): Promise<boolean>;
    /**
     * Check criteria and show prompt if met
     */
    private checkCriteriaAndShow;
    /**
     * Show native install prompt
     */
    showNativePrompt(): Promise<void>;
    /**
     * Show custom install prompt
     */
    showCustomPrompt(): Promise<void>;
    /**
     * Create custom prompt UI
     */
    private createCustomPromptUI;
    /**
     * Hide custom prompt
     */
    private hideCustomPrompt;
    /**
     * Handle custom install button click
     */
    private handleCustomInstall;
    /**
     * Show platform-specific install instructions
     */
    private showInstallInstructions;
    /**
     * Handle app installed
     */
    private handleAppInstalled;
    /**
     * Handle prompt dismissed
     */
    private handlePromptDismissed;
    /**
     * Track analytics event
     */
    private trackAnalytics;
    /**
     * Record receipt created (for engagement tracking)
     */
    recordReceiptCreated(): void;
    /**
     * Manually trigger install prompt
     */
    showInstallPrompt(): Promise<void>;
    /**
     * Check if app can be installed
     */
    canInstall(): boolean;
    /**
     * Get engagement statistics
     */
    getEngagementStats(): EngagementData;
    /**
     * Get platform information
     */
    getPlatformInfo(): PlatformInfo;
    /**
     * Reset engagement data (for testing)
     */
    resetEngagement(): void;
    /**
     * Destroy the app installer
     */
    destroy(): void;
}

/**
 * PWA Manager for A-Cube E-Receipt SDK
 * Manages Progressive Web App features including service worker registration,
 * caching strategies, and offline functionality
 *
 * Features:
 * - Service worker lifecycle management
 * - Cache control and monitoring
 * - Offline queue integration
 * - App install prompts
 * - Background sync coordination
 */

/**
 * PWA Manager configuration
 */
interface PWAManagerConfig {
    /** Service worker script path */
    serviceWorkerPath?: string;
    /** Enable automatic service worker registration */
    autoRegister?: boolean;
    /** Enable app install prompts */
    enableInstallPrompts?: boolean;
    /** Cache strategy preferences */
    cacheStrategy?: {
        /** API cache duration in milliseconds */
        apiCacheDuration?: number;
        /** Static cache duration in milliseconds */
        staticCacheDuration?: number;
        /** Enable stale-while-revalidate for API calls */
        staleWhileRevalidate?: boolean;
    };
    /** Background sync configuration */
    backgroundSync?: {
        /** Enable periodic background sync */
        enablePeriodicSync?: boolean;
        /** Minimum interval for periodic sync in milliseconds */
        minSyncInterval?: number;
    };
    /** Push notification configuration */
    pushNotifications?: {
        /** Enable push notifications */
        enabled?: boolean;
        /** VAPID public key for push notifications */
        vapidPublicKey?: string;
    };
    /** App installer configuration */
    appInstaller?: {
        /** Enable app install prompts */
        enabled?: boolean;
        /** Install criteria configuration */
        criteria?: InstallCriteria;
        /** Auto-show prompt when criteria met */
        autoShow?: boolean;
        /** Custom installer configuration */
        config?: Partial<AppInstallerConfig>;
    };
}
/**
 * PWA events
 */
interface PWAEvents {
    'sw:registered': {
        registration: ServiceWorkerRegistration;
    };
    'sw:updated': {
        registration: ServiceWorkerRegistration;
    };
    'sw:error': {
        error: Error;
    };
    'install:available': {
        prompt: BeforeInstallPromptEvent;
    };
    'install:completed': {
        outcome: 'accepted' | 'dismissed';
    };
    'cache:updated': {
        cacheName: string;
        size: number;
    };
    'offline:queued': {
        request: string;
        id: string;
    };
    'offline:synced': {
        request: string;
        id: string;
    };
    'push:received': {
        data: any;
    };
    'push:subscribed': {
        subscription: any;
    };
    'push:unsubscribed': {
        reason: string;
    };
    'notification:shown': {
        notification: NotificationPayload;
    };
    'notification:clicked': {
        action: string;
        data: any;
    };
    'sync:completed': {
        syncedCount: number;
    };
    'app:installable': {
        canInstall: boolean;
    };
    'app:installed': {
        platform: string;
    };
    'app:install-prompted': {
        type: 'native' | 'custom';
    };
    'app:install-dismissed': {
        reason: 'user' | 'timeout' | 'error';
    };
}
/**
 * Cache information
 */
interface CacheInfo {
    name: string;
    size: number;
    lastUpdated?: Date;
}
/**
 * Install prompt event (enhanced BeforeInstallPromptEvent)
 */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}
/**
 * PWA Manager - Coordinates Progressive Web App features
 */
declare class PWAManager extends EventEmitter<PWAEvents> {
    private config;
    private registration;
    private installPrompt;
    private isSupported;
    private messageChannel;
    private pushManager?;
    private appInstaller?;
    constructor(config?: PWAManagerConfig);
    /**
     * Check if PWA features are supported
     */
    private checkPWASupport;
    /**
     * Setup event listeners for PWA features
     */
    private setupEventListeners;
    /**
     * Register service worker
     */
    registerServiceWorker(): Promise<ServiceWorkerRegistration>;
    /**
     * Setup message channel for service worker communication
     */
    private setupMessageChannel;
    /**
     * Register periodic background sync
     */
    private registerPeriodicSync;
    /**
     * Initialize app installer
     */
    private initializeAppInstaller;
    /**
     * Initialize push notifications
     */
    private initializePushNotifications;
    /**
     * Handle online/offline status changes
     */
    private handleOnlineStatusChange;
    /**
     * Trigger background sync
     */
    triggerBackgroundSync(): Promise<void>;
    /**
     * Show app install prompt
     */
    showInstallPrompt(): Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    } | null>;
    /**
     * Get cache information
     */
    getCacheInfo(): Promise<CacheInfo[]>;
    /**
     * Clear all caches
     */
    clearCache(): Promise<void>;
    /**
     * Force service worker update
     */
    updateServiceWorker(): Promise<void>;
    /**
     * Check if app is installable
     */
    isInstallable(): boolean;
    /**
     * Check if app is installed
     */
    isInstalled(): boolean;
    /**
     * Get service worker registration
     */
    getRegistration(): ServiceWorkerRegistration | null;
    /**
     * Check if PWA features are supported
     */
    isPWASupported(): boolean;
    /**
     * Get push notification manager
     */
    getPushManager(): PushNotificationManager | undefined;
    /**
     * Get app installer
     */
    getAppInstaller(): AppInstaller | undefined;
    /**
     * Record receipt created (for app installer engagement tracking)
     */
    recordReceiptCreated(): void;
    /**
     * Get engagement statistics
     */
    getEngagementStats(): EngagementData | null;
    /**
     * Check if app install criteria are met
     */
    checkInstallCriteria(): Promise<boolean>;
    /**
     * Subscribe to push notifications
     */
    subscribeToPushNotifications(): Promise<any>;
    /**
     * Unsubscribe from push notifications
     */
    unsubscribeFromPushNotifications(): Promise<void>;
    /**
     * Show a notification
     */
    showNotification(payload: NotificationPayload): Promise<void>;
    /**
     * Check if subscribed to push notifications
     */
    isPushSubscribed(): boolean;
    /**
     * Destroy PWA manager
     */
    destroy(): Promise<void>;
}

/**
 * PWA Manifest Generator for A-Cube E-Receipt SDK
 * Generates Progressive Web App manifest.json files with Italian e-receipt specific configuration
 *
 * Features:
 * - Dynamic manifest generation
 * - Italian localization support
 * - E-receipt specific shortcuts and categories
 * - Theme customization
 * - Icon generation support
 */
/**
 * PWA Manifest configuration
 */
interface PWAManifestConfig {
    /** App name */
    name?: string;
    /** Short app name for home screen */
    shortName?: string;
    /** App description */
    description?: string;
    /** App start URL */
    startUrl?: string;
    /** App scope */
    scope?: string;
    /** Display mode */
    display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
    /** Orientation preference */
    orientation?: 'any' | 'natural' | 'landscape' | 'portrait';
    /** Theme color */
    themeColor?: string;
    /** Background color */
    backgroundColor?: string;
    /** App language */
    lang?: string;
    /** App categories */
    categories?: string[];
    /** Screenshots for app stores */
    screenshots?: Array<{
        src: string;
        sizes: string;
        type: string;
        platform?: 'narrow' | 'wide';
        label?: string;
    }>;
    /** App shortcuts */
    shortcuts?: Array<{
        name: string;
        url: string;
        description?: string;
        icons?: Array<{
            src: string;
            sizes: string;
            type?: string;
        }>;
    }>;
    /** Custom icons */
    icons?: Array<{
        src: string;
        sizes: string;
        type?: string;
        purpose?: 'any' | 'maskable' | 'monochrome';
    }>;
}
/**
 * Web App Manifest interface
 */
interface WebAppManifest {
    name: string;
    short_name: string;
    description: string;
    start_url: string;
    scope: string;
    display: string;
    orientation: string;
    theme_color: string;
    background_color: string;
    lang: string;
    categories: string[];
    icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose?: string;
    }>;
    screenshots?: Array<{
        src: string;
        sizes: string;
        type: string;
        platform?: string;
        label?: string;
    }>;
    shortcuts?: Array<{
        name: string;
        url: string;
        description?: string;
        icons?: Array<{
            src: string;
            sizes: string;
            type?: string;
        }>;
    }>;
    prefer_related_applications?: boolean;
    related_applications?: Array<{
        platform: string;
        url: string;
        id?: string;
    }>;
}
/**
 * PWA Manifest Generator
 * Creates and manages Progressive Web App manifest files
 */
declare class ManifestGenerator {
    private config;
    constructor(config?: PWAManifestConfig);
    /**
     * Generate web app manifest
     */
    generateManifest(): WebAppManifest;
    /**
     * Generate manifest as JSON string
     */
    generateManifestJSON(): string;
    /**
     * Generate HTML meta tags for PWA
     */
    generateHTMLMetaTags(): string;
    /**
     * Generate service worker registration script
     */
    generateServiceWorkerScript(serviceWorkerPath?: string): string;
    /**
     * Update manifest configuration
     */
    updateConfig(updates: Partial<PWAManifestConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): Required<PWAManifestConfig>;
    /**
     * Generate localized manifest for different languages
     */
    generateLocalizedManifest(locale: string): WebAppManifest;
    /**
     * Get localized configuration
     */
    private getLocalizedConfig;
    /**
     * Validate manifest configuration
     */
    validateManifest(): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Generate complete PWA setup files
     */
    generatePWAFiles(): {
        manifest: string;
        html: string;
        serviceWorkerScript: string;
        validation: {
            isValid: boolean;
            errors: string[];
        };
    };
}

/**
 * Optimized React Native AsyncStorage Adapter
 * High-performance storage with memory caching, batching, and advanced optimizations
 *
 * Features:
 * - In-memory LRU cache for frequently accessed data
 * - Intelligent write batching and coalescing
 * - Compression for large values
 * - Background cleanup and defragmentation
 * - Performance monitoring and metrics
 * - Memory pressure handling
 * - Connection retry logic
 */

/**
 * Performance metrics tracking
 */
interface PerformanceMetrics$1 {
    cacheHits: number;
    cacheMisses: number;
    reads: number;
    writes: number;
    batches: number;
    compressionSaved: number;
    avgReadTime: number;
    avgWriteTime: number;
    memoryPressureEvents: number;
    backgroundCleanups: number;
}
/**
 * Optimized React Native storage configuration
 */
interface OptimizedReactNativeStorageConfig {
    /** Key prefix for namespacing */
    keyPrefix?: string;
    /** Enable in-memory LRU cache */
    enableCache?: boolean;
    /** Cache size limit */
    cacheSize?: number;
    /** Cache TTL in milliseconds */
    cacheTTL?: number;
    /** Enable write batching */
    enableBatching?: boolean;
    /** Batch delay in milliseconds */
    batchDelay?: number;
    /** Maximum batch size */
    maxBatchSize?: number;
    /** Enable compression for large values */
    enableCompression?: boolean;
    /** Compression threshold in bytes */
    compressionThreshold?: number;
    /** Enable background cleanup */
    enableBackgroundCleanup?: boolean;
    /** Cleanup interval in milliseconds */
    cleanupInterval?: number;
    /** Enable performance monitoring */
    enableMetrics?: boolean;
    /** Enable memory pressure handling */
    enableMemoryPressureHandling?: boolean;
    /** Maximum memory usage before pressure handling */
    memoryPressureThreshold?: number;
}
/**
 * Storage events
 */
interface StorageEvents {
    'cache:hit': {
        key: string;
    };
    'cache:miss': {
        key: string;
    };
    'batch:processed': {
        size: number;
        duration: number;
    };
    'compression:applied': {
        key: string;
        originalSize: number;
        compressedSize: number;
    };
    'memory:pressure': {
        usage: number;
        threshold: number;
    };
    'background:cleanup': {
        cleaned: number;
        duration: number;
    };
    'performance:metrics': {
        metrics: PerformanceMetrics$1;
    };
}
/**
 * Optimized React Native AsyncStorage Adapter
 */
declare class OptimizedReactNativeStorageAdapter extends EventEmitter<StorageEvents> implements StorageAdapter {
    readonly name = "OptimizedReactNativeStorage";
    readonly isAvailable: any;
    readonly capabilities: {
        supportsTransactions: boolean;
        supportsIndexing: boolean;
        maxKeyLength: number;
        maxValueSize: number;
        supportsCompression: boolean;
        supportsEncryption: boolean;
        supportsTTL: boolean;
    };
    private config;
    private cache;
    private writeBatch;
    private AsyncStorage;
    private isInitialized;
    private metrics;
    private cleanupTimer?;
    private memoryUsage;
    constructor(config?: OptimizedReactNativeStorageConfig);
    private initializeMetrics;
    private initialize;
    private startBackgroundCleanup;
    private setupMemoryPressureHandling;
    private handleMemoryPressure;
    set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void>;
    get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null>;
    delete(key: StorageKey): Promise<boolean>;
    exists(key: StorageKey): Promise<boolean>;
    clear(namespace?: string): Promise<void>;
    setMany<T extends StorageValue>(entries: Array<{
        key: StorageKey;
        value: T;
        options?: StorageOptions;
    }>): Promise<void>;
    getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>>;
    deleteMany(keys: StorageKey[]): Promise<number>;
    query<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    keys(options?: QueryOptions$1): Promise<StorageKey[]>;
    values<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    entries<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    count(options?: QueryOptions$1): Promise<number>;
    beginTransaction(): Promise<StorageTransaction>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    optimize(): Promise<void>;
    getStats(): Promise<StorageStats>;
    private getPrefixedKey;
    private isExpired;
    private getAllKeys;
    private cleanupExpiredStorage;
    private compress;
    private decompress;
    /**
     * Get performance metrics
     */
    getMetrics(): PerformanceMetrics$1;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    /**
     * Force cleanup
     */
    cleanup(): Promise<number>;
    /**
     * Destroy adapter and cleanup resources
     */
    destroy(): Promise<void>;
}

/**
 * React Native Connectivity Manager
 * Advanced network connectivity handling with intelligent retry, quality monitoring,
 * and adaptive behavior for mobile environments
 *
 * Features:
 * - Real-time network quality monitoring
 * - Intelligent retry strategies based on network conditions
 * - Adaptive timeouts and batch sizes
 * - Background/foreground app state handling
 * - Data usage optimization
 * - Connection pooling and reuse
 */

/**
 * Network quality levels
 */
type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
/**
 * Connection types
 */
type ConnectionType = 'wifi' | 'cellular' | '2g' | '3g' | '4g' | '5g' | 'ethernet' | 'bluetooth' | 'unknown' | 'none';
/**
 * Network state information
 */
interface NetworkState {
    isConnected: boolean;
    connectionType: ConnectionType;
    quality: NetworkQuality;
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    isExpensive?: boolean;
    strength?: number;
    timestamp: number;
}
/**
 * Retry configuration based on network conditions
 */
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
}
/**
 * Network quality thresholds
 */
interface QualityThresholds {
    excellent: {
        minDownlink: number;
        maxRtt: number;
    };
    good: {
        minDownlink: number;
        maxRtt: number;
    };
    fair: {
        minDownlink: number;
        maxRtt: number;
    };
    poor: {
        minDownlink: number;
        maxRtt: number;
    };
}
/**
 * Connectivity manager configuration
 */
interface ConnectivityConfig {
    /** Enable network quality monitoring */
    enableQualityMonitoring?: boolean;
    /** Quality check interval in ms */
    qualityCheckInterval?: number;
    /** Enable adaptive retry strategies */
    enableAdaptiveRetry?: boolean;
    /** Enable data usage optimization */
    enableDataOptimization?: boolean;
    /** Enable background/foreground optimization */
    enableAppStateOptimization?: boolean;
    /** Custom quality thresholds */
    qualityThresholds?: Partial<QualityThresholds>;
    /** Retry configurations by network quality */
    retryConfigs?: Record<NetworkQuality, RetryConfig>;
    /** Timeout configurations by network quality (ms) */
    timeoutConfigs?: Record<NetworkQuality, number>;
    /** Enable connection health monitoring */
    enableHealthMonitoring?: boolean;
    /** Health check URL */
    healthCheckUrl?: string;
    /** Health check interval in ms */
    healthCheckInterval?: number;
}
/**
 * Connectivity events
 */
interface ConnectivityEvents {
    'network:change': {
        current: NetworkState;
        previous: NetworkState;
    };
    'quality:change': {
        quality: NetworkQuality;
        previous: NetworkQuality;
    };
    'connection:lost': {
        lastState: NetworkState;
    };
    'connection:restored': {
        newState: NetworkState;
    };
    'health:check': {
        healthy: boolean;
        latency?: number;
    };
    'app:background': {
        networkState: NetworkState;
    };
    'app:foreground': {
        networkState: NetworkState;
    };
    'data:optimization': {
        enabled: boolean;
        reason: string;
    };
}
/**
 * React Native Connectivity Manager
 */
declare class ConnectivityManager extends EventEmitter<ConnectivityEvents> {
    private config;
    private currentState;
    private previousState?;
    private isInitialized;
    private NetInfo;
    private AppState;
    private qualityTimer?;
    private healthTimer?;
    private healthHistory;
    private currentAppState;
    constructor(config?: ConnectivityConfig);
    private getInitialState;
    private initialize;
    private setupNetworkListener;
    private setupAppStateListener;
    private setupFallbackDetection;
    private handleNetworkStateChange;
    private mapConnectionType;
    private calculateNetworkQuality;
    private handleDataOptimization;
    private startQualityMonitoring;
    private startHealthMonitoring;
    private updateNetworkState;
    private performHealthCheck;
    /**
     * Get current network state
     */
    getNetworkState(): NetworkState;
    /**
     * Check if network is available
     */
    isConnected(): boolean;
    /**
     * Get current network quality
     */
    getNetworkQuality(): NetworkQuality;
    /**
     * Get retry configuration for current network conditions
     */
    getRetryConfig(): RetryConfig;
    /**
     * Get timeout for current network conditions
     */
    getTimeout(): number;
    /**
     * Check if data optimization should be enabled
     */
    shouldOptimizeData(): boolean;
    /**
     * Get connection health score (0-1)
     */
    getHealthScore(): number;
    /**
     * Wait for network connection to be restored
     */
    waitForConnection(timeout?: number): Promise<boolean>;
    /**
     * Execute a network operation with intelligent retry
     */
    executeWithRetry<T>(operation: () => Promise<T>, customRetryConfig?: Partial<RetryConfig>): Promise<T>;
    /**
     * Get adaptive batch size based on network conditions
     */
    getAdaptiveBatchSize(baseBatchSize?: number): number;
    /**
     * Destroy the connectivity manager
     */
    destroy(): void;
}

/**
 * React Native Background Processor
 * Handles background tasks, sync operations, and app lifecycle management
 * with intelligent scheduling and resource management
 *
 * Features:
 * - Background task scheduling and execution
 * - App state-aware processing
 * - Battery and performance optimization
 * - Push notification triggers
 * - Sync queue management
 * - Resource usage monitoring
 */

/**
 * Background task types
 */
type BackgroundTaskType = 'sync' | 'upload' | 'cleanup' | 'analytics' | 'cache_warmup' | 'notification' | 'custom';
/**
 * Task priority levels
 */
type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
/**
 * Background task definition
 */
interface BackgroundTask {
    id: string;
    type: BackgroundTaskType;
    priority: TaskPriority;
    data: any;
    executionTime?: number;
    delay?: number;
    interval?: number;
    maxRetries?: number;
    retryCount?: number;
    createdAt: number;
    maxExecutionTime?: number;
    requiredNetworkType?: 'any' | 'wifi' | 'cellular';
    requiresCharging?: boolean;
    requiresDeviceIdle?: boolean;
}
/**
 * Task execution result
 */
interface TaskResult {
    success: boolean;
    data?: any;
    error?: Error;
    executionTime: number;
    retryAfter?: number;
}
/**
 * App state types
 */
type AppState = 'active' | 'background' | 'inactive';
/**
 * Background processor configuration
 */
interface BackgroundProcessorConfig {
    /** Maximum concurrent background tasks */
    maxConcurrentTasks?: number;
    /** Default task timeout in ms */
    defaultTaskTimeout?: number;
    /** Enable battery optimization */
    enableBatteryOptimization?: boolean;
    /** Minimum battery level for non-critical tasks */
    minBatteryLevel?: number;
    /** Enable app state management */
    enableAppStateManagement?: boolean;
    /** Maximum background execution time in ms */
    maxBackgroundTime?: number;
    /** Enable task persistence */
    enableTaskPersistence?: boolean;
    /** Storage key for task persistence */
    persistenceKey?: string;
    /** Enable resource monitoring */
    enableResourceMonitoring?: boolean;
    /** CPU usage threshold for throttling */
    cpuThrottleThreshold?: number;
    /** Memory usage threshold for throttling */
    memoryThrottleThreshold?: number;
}
/**
 * Background processor events
 */
interface BackgroundProcessorEvents {
    'task:scheduled': {
        task: BackgroundTask;
    };
    'task:started': {
        task: BackgroundTask;
    };
    'task:completed': {
        task: BackgroundTask;
        result: TaskResult;
    };
    'task:failed': {
        task: BackgroundTask;
        error: Error;
    };
    'task:retry': {
        task: BackgroundTask;
        attempt: number;
    };
    'queue:empty': {};
    'queue:full': {
        queueSize: number;
    };
    'app:background': {
        remainingTime?: number;
    };
    'app:foreground': {};
    'battery:low': {
        level: number;
    };
    'battery:charging': {
        isCharging: boolean;
    };
    'resource:throttle': {
        reason: 'cpu' | 'memory' | 'battery';
    };
    'resource:resume': {
        reason: string;
    };
}
/**
 * Task executor function type
 */
type TaskExecutor = (task: BackgroundTask, signal: AbortSignal) => Promise<TaskResult>;
/**
 * React Native Background Processor
 */
declare class BackgroundProcessor extends EventEmitter<BackgroundProcessorEvents> {
    private config;
    private taskQueue;
    private activeTasks;
    private taskExecutors;
    private isInitialized;
    private isPaused;
    private AppState;
    private BackgroundTask;
    private AsyncStorage;
    private currentAppState;
    private batteryState;
    private backgroundTaskId;
    private resourceMonitorTimer?;
    private executionStats;
    constructor(config?: BackgroundProcessorConfig);
    private initialize;
    private setupAppStateListener;
    private setupBatteryMonitoring;
    private startResourceMonitoring;
    private getMemoryInfo;
    private getCPUUsage;
    private handleAppBackground;
    private handleAppForeground;
    private handleBackgroundTimeExpired;
    private processCriticalTasks;
    private pauseNonCriticalTasks;
    private throttleExecution;
    private resumeExecution;
    private registerDefaultExecutors;
    /**
     * Register a task executor
     */
    registerExecutor(type: BackgroundTaskType, executor: TaskExecutor): void;
    /**
     * Schedule a new background task
     */
    scheduleTask(task: Omit<BackgroundTask, 'id' | 'createdAt' | 'retryCount'>): Promise<string>;
    /**
     * Cancel a scheduled task
     */
    cancelTask(taskId: string): Promise<boolean>;
    /**
     * Get task status
     */
    getTaskStatus(taskId: string): 'queued' | 'running' | 'completed' | 'not_found';
    /**
     * Get queue statistics
     */
    getQueueStats(): {
        totalTasks: number;
        successfulTasks: number;
        failedTasks: number;
        avgExecutionTime: number;
        totalExecutionTime: number;
        queued: number;
        running: number;
        isPaused: boolean;
        currentAppState: AppState;
        batteryLevel: number;
        isCharging: boolean;
    };
    private sortTaskQueue;
    private processQueue;
    private canExecuteTask;
    private executeTask;
    private handleTaskResult;
    private handleTaskError;
    private generateTaskId;
    private persistTasks;
    private loadPersistedTasks;
    /**
     * Force process all critical tasks immediately
     */
    processCriticalTasksImmediately(): Promise<void>;
    /**
     * Pause all background processing
     */
    pause(): void;
    /**
     * Resume background processing
     */
    resume(): void;
    /**
     * Clear all queued tasks
     */
    clearQueue(): Promise<void>;
    /**
     * Destroy the background processor
     */
    destroy(): void;
}

/**
 * React Native Performance Monitor
 * Comprehensive performance monitoring and optimization for mobile environments
 *
 * Features:
 * - App startup time monitoring
 * - Memory usage tracking
 * - CPU performance monitoring
 * - Network request performance
 * - Frame rate monitoring
 * - Bundle size analysis
 * - Battery usage tracking
 * - Crash and error reporting
 * - User experience metrics
 */

/**
 * Performance metric types
 */
interface PerformanceMetrics {
    appStartTime: number;
    timeToInteractive: number;
    firstContentfulPaint?: number;
    memoryUsage: MemoryMetrics;
    cpuUsage: number;
    frameRate: FrameRateMetrics;
    networkPerformance: NetworkMetrics;
    userInteractions: InteractionMetrics;
    batteryImpact: BatteryMetrics;
    errorRate: number;
    crashCount: number;
    timestamp: number;
}
interface MemoryMetrics {
    used: number;
    total: number;
    peak: number;
    heapUsed?: number;
    heapTotal?: number;
    gcEvents: number;
    memoryWarnings: number;
}
interface FrameRateMetrics {
    current: number;
    average: number;
    drops: number;
    jankCount: number;
}
interface NetworkMetrics {
    avgRequestTime: number;
    failureRate: number;
    bytesTransferred: number;
    requestCount: number;
    slowRequestCount: number;
}
interface InteractionMetrics {
    avgResponseTime: number;
    slowInteractions: number;
    totalInteractions: number;
    userSatisfactionScore: number;
}
interface BatteryMetrics {
    drainRate: number;
    networkDrain: number;
    cpuDrain: number;
    backgroundDrain: number;
}
/**
 * Performance thresholds for alerting
 */
interface PerformanceThresholds {
    maxMemoryUsage: number;
    minFrameRate: number;
    maxResponseTime: number;
    maxBatteryDrainRate: number;
    maxErrorRate: number;
    maxNetworkFailureRate: number;
}
/**
 * Performance monitoring configuration
 */
interface PerformanceMonitorConfig {
    /** Enable monitoring */
    enabled?: boolean;
    /** Monitoring interval in ms */
    monitoringInterval?: number;
    /** Enable memory monitoring */
    enableMemoryMonitoring?: boolean;
    /** Enable frame rate monitoring */
    enableFrameRateMonitoring?: boolean;
    /** Enable network monitoring */
    enableNetworkMonitoring?: boolean;
    /** Enable battery monitoring */
    enableBatteryMonitoring?: boolean;
    /** Enable user interaction monitoring */
    enableInteractionMonitoring?: boolean;
    /** Enable crash reporting */
    enableCrashReporting?: boolean;
    /** Performance thresholds */
    thresholds?: Partial<PerformanceThresholds>;
    /** Maximum history entries to keep */
    maxHistorySize?: number;
    /** Enable performance profiling */
    enableProfiling?: boolean;
    /** Sample rate for profiling (0-1) */
    profilingSampleRate?: number;
    /** Enable automatic optimization */
    enableAutoOptimization?: boolean;
    /** Report performance data to server */
    enableRemoteReporting?: boolean;
    /** Remote reporting endpoint */
    reportingEndpoint?: string;
}
/**
 * Performance events
 */
interface PerformanceEvents {
    'metrics:updated': {
        metrics: PerformanceMetrics;
    };
    'threshold:exceeded': {
        metric: string;
        value: number;
        threshold: number;
    };
    'memory:warning': {
        usage: number;
        available: number;
    };
    'frame:drop': {
        droppedFrames: number;
        duration: number;
    };
    'network:slow': {
        url: string;
        duration: number;
    };
    'interaction:slow': {
        type: string;
        duration: number;
    };
    'battery:drain': {
        rate: number;
        cause: string;
    };
    'crash:detected': {
        error: Error;
        context: any;
    };
    'optimization:applied': {
        type: string;
        impact: string;
    };
    'report:sent': {
        success: boolean;
        data?: any;
    };
}
/**
 * React Native Performance Monitor
 */
declare class PerformanceMonitor extends EventEmitter<PerformanceEvents> {
    private config;
    private isInitialized;
    private isMonitoring;
    private PerformanceObserver;
    private AppState;
    private DeviceInfo;
    private startTime;
    private lastMetrics?;
    private metricsHistory;
    private monitoringTimer?;
    private memoryPeakUsage;
    private frameDropCount;
    private networkRequests;
    private userInteractions;
    private errorCount;
    private crashCount;
    private gcEventCount;
    private memoryWarningCount;
    private batteryHistory;
    constructor(config?: PerformanceMonitorConfig);
    private initialize;
    private setupMemoryMonitoring;
    private setupFrameRateMonitoring;
    private setupNetworkMonitoring;
    private setupErrorMonitoring;
    private setupInteractionMonitoring;
    private setupBatteryMonitoring;
    private calculateBatteryDrainRate;
    private startMonitoring;
    private collectMetrics;
    private getMemoryUsage;
    private getCPUUsage;
    private getFrameRateMetrics;
    private getNetworkMetrics;
    private getInteractionMetrics;
    private getBatteryMetrics;
    private calculateErrorRate;
    private checkThresholds;
    private applyMemoryOptimization;
    private sendMetricsToServer;
    private getDeviceInfo;
    /**
     * Record a user interaction for monitoring
     */
    recordInteraction(type: string, startTime: number, endTime?: number): void;
    /**
     * Get current performance metrics
     */
    getCurrentMetrics(): PerformanceMetrics | undefined;
    /**
     * Get performance history
     */
    getMetricsHistory(): PerformanceMetrics[];
    /**
     * Get performance summary
     */
    getPerformanceSummary(): {
        current: PerformanceMetrics | undefined;
        averages: {
            memoryUsage: number;
            frameRate: number;
            responseTime: number;
        };
        totals: {
            errors: number;
            crashes: number;
            frameDrops: number;
            memoryWarnings: number;
        };
    } | null;
    /**
     * Force metrics collection
     */
    collectMetricsNow(): void;
    /**
     * Reset performance counters
     */
    resetCounters(): void;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Start monitoring
     */
    resumeMonitoring(): void;
    /**
     * Destroy the performance monitor
     */
    destroy(): void;
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
        enabled?: boolean;
        config?: Partial<AuthConfig>;
        credentials?: {
            username?: string;
            password?: string;
            autoLogin?: boolean;
        };
        storage?: {
            enableEncryption?: boolean;
            storageKey?: string;
            storageAdapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
        };
        middleware?: {
            enableRetry?: boolean;
            maxRetries?: number;
            includeRoleHeaders?: boolean;
            includePermissionHeaders?: boolean;
            includeRequestContext?: boolean;
        };
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
        enableSync?: boolean;
        enableRealTimeSync?: boolean;
    };
    /**
     * Offline and sync configuration
     */
    offline?: {
        enabled?: boolean;
        storage?: {
            adapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
            encryptionKey?: string;
            maxSize?: number;
        };
        queue?: {
            maxItems?: number;
            maxRetries?: number;
            retryDelay?: number;
            batchSize?: number;
        };
        sync?: Partial<SyncEngineConfig>;
    };
    /**
     * Progressive Web App configuration
     */
    pwa?: {
        enabled?: boolean;
        manager?: Partial<PWAManagerConfig>;
        manifest?: Partial<PWAManifestConfig>;
        autoRegister?: boolean;
        enableInstallPrompts?: boolean;
        enablePushNotifications?: boolean;
        vapidPublicKey?: string;
        appInstaller?: {
            enabled?: boolean;
            autoShow?: boolean;
            criteria?: {
                minEngagementTime?: number;
                minPageViews?: number;
                minReceiptsCreated?: number;
                daysSinceFirstVisit?: number;
                requireReturnVisit?: boolean;
            };
        };
    };
    /**
     * React Native mobile optimizations
     */
    reactNative?: {
        enabled?: boolean;
        storage?: {
            enableOptimizedAdapter?: boolean;
            cacheSize?: number;
            enableCompression?: boolean;
            enableBatching?: boolean;
            batchDelay?: number;
        };
        connectivity?: {
            enableQualityMonitoring?: boolean;
            enableAdaptiveRetry?: boolean;
            enableDataOptimization?: boolean;
            healthCheckUrl?: string;
        };
        backgroundProcessor?: {
            enabled?: boolean;
            maxConcurrentTasks?: number;
            enableBatteryOptimization?: boolean;
            enableAppStateManagement?: boolean;
            enableTaskPersistence?: boolean;
        };
        performanceMonitor?: {
            enabled?: boolean;
            enableMemoryMonitoring?: boolean;
            enableFrameRateMonitoring?: boolean;
            enableBatteryMonitoring?: boolean;
            enableRemoteReporting?: boolean;
        };
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
    private _syncManager?;
    private _storage?;
    private _queueManager?;
    private _authService?;
    private _tokenManager?;
    private _authStorage?;
    private _authMiddleware?;
    private _pwaManager?;
    private _manifestGenerator?;
    private _optimizedStorage?;
    private _connectivityManager?;
    private _backgroundProcessor?;
    private _performanceMonitor?;
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
     * Initialize the enterprise authentication system
     */
    private initializeAuthSystem;
    /**
     * Initialize React Native optimization systems
     */
    private initializeReactNativeOptimizations;
    /**
     * Set up auth event forwarding to SDK events
     */
    private setupAuthEventForwarding;
    /**
     * Cashiers resource - user management
     * Enhanced with offline capabilities when enabled
     */
    get cashiers(): CashiersResource;
    /**
     * Receipts resource - e-receipt management
     * Enhanced with offline capabilities when enabled
     */
    get receipts(): ReceiptsResource;
    /**
     * Point of Sales resource - POS device management
     * Enhanced with offline capabilities when enabled
     */
    get pointOfSales(): PointOfSalesResource;
    /**
     * Cash Registers resource - device registration
     * Enhanced with offline capabilities when enabled
     */
    get cashRegisters(): CashRegistersResource;
    /**
     * Merchants resource - business entity management
     * Enhanced with offline capabilities when enabled
     */
    get merchants(): MerchantsResource;
    /**
     * PEMs resource - electronic memorization device management
     * Enhanced with offline capabilities when enabled
     */
    get pems(): PEMsResource;
    /**
     * PWA Manager - Progressive Web App functionality
     * Handles service worker registration, caching, and offline capabilities
     */
    get pwa(): PWAManager;
    /**
     * Manifest Generator - PWA manifest creation and management
     * Creates web app manifests with Italian e-receipt specific configuration
     */
    get manifest(): ManifestGenerator;
    /**
     * Progressive sync manager - smart synchronization with partial failure recovery
     * Only available when features.enableSync is true
     */
    get sync(): ProgressiveSyncEngine;
    /**
     * Unified storage system - cross-platform storage with encryption
     * Only available when offline.enabled is true
     */
    get storage(): UnifiedStorage;
    /**
     * Enterprise queue manager - advanced operation queuing with retry logic
     * Only available when features.enableOfflineQueue is true
     */
    get queue(): EnterpriseQueueManager;
    /**
     * JWT token manager - automatic refresh, validation, parsing
     * Only available when auth.enabled is true
     */
    get tokenManager(): TokenManager;
    /**
     * Enterprise authentication service - OAuth2, role-based access, session management
     * Only available when auth.enabled is true
     */
    get authService(): AuthService;
    /**
     * Secure cross-platform auth storage - encrypted token storage
     * Only available when auth.enabled is true
     */
    get authStorage(): AuthStorage;
    /**
     * Enhanced authentication middleware - automatic token refresh, role headers
     * Only available when auth.enabled is true
     */
    get authMiddleware(): EnhancedAuthMiddleware;
    /**
     * Login with username and password
     */
    login(credentials: LoginCredentials): Promise<AuthUser>;
    /**
     * Logout current user
     */
    logout(options?: LogoutOptions): Promise<void>;
    /**
     * Get current authentication state
     */
    getAuthState(): AuthState | null;
    /**
     * Get current authenticated user
     */
    getCurrentUser(): AuthUser | null;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Check if user has specific role (including inherited roles from hierarchy)
     */
    hasRole(role: UserRole): boolean;
    /**
     * Check if user has any of the specified roles (including inherited roles)
     */
    hasAnyRole(roles: UserRole[]): boolean;
    /**
     * Get user's effective roles (including inherited roles from hierarchy)
     */
    getEffectiveRoles(): UserRole[];
    /**
     * Get user's primary role for display purposes
     */
    getPrimaryRole(): UserRole | null;
    /**
     * Get user's simple role for external APIs
     */
    getSimpleRole(): SimpleUserRole;
    /**
     * Switch to a different role context during session
     */
    switchRole(targetRole: UserRole, context?: {
        merchant_id?: MerchantId;
        cashier_id?: CashierId;
        point_of_sale_id?: PointOfSaleId;
    }): Promise<boolean>;
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
            retry: Readonly<RetryMetrics$1>;
        };
        auth: {
            circuitBreaker: {
                isHealthy: boolean;
                failureRate: number;
                avgResponseTime?: number;
                uptime: number;
            };
            retry: Readonly<RetryMetrics$1>;
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
     * Optimized React Native Storage Adapter - High-performance AsyncStorage with caching
     * Only available when reactNative.enabled is true and enableOptimizedAdapter is true
     */
    get optimizedStorage(): OptimizedReactNativeStorageAdapter;
    /**
     * Connectivity Manager - Intelligent network handling and retry strategies
     * Only available when reactNative.enabled is true
     */
    get connectivity(): ConnectivityManager;
    /**
     * Background Processor - Task scheduling and app lifecycle management
     * Only available when reactNative.enabled is true and backgroundProcessor.enabled is true
     */
    get backgroundProcessor(): BackgroundProcessor;
    /**
     * Performance Monitor - Mobile performance metrics and optimization
     * Only available when reactNative.enabled is true and performanceMonitor.enabled is true
     */
    get performanceMonitor(): PerformanceMonitor;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
}
declare function createACubeSDK(config: ACubeSDKConfig): ACubeSDK;

/**
 * Platform Detection Utility for A-Cube SDK
 * Detects the current runtime environment to enable platform-specific optimizations
 */
type PlatformType = 'web' | 'react-native' | 'node' | 'unknown';
interface PlatformCapabilities {
    readonly platform: PlatformType;
    readonly hasIndexedDB: boolean;
    readonly hasLocalStorage: boolean;
    readonly hasAsyncStorage: boolean;
    readonly hasFileSystem: boolean;
    readonly hasWebCrypto: boolean;
    readonly hasCompressionStreams: boolean;
    readonly supportsWorkers: boolean;
    readonly supportsNotifications: boolean;
    readonly isSecureContext: boolean;
    readonly maxStorageSize: number;
}
interface EnvironmentInfo extends PlatformCapabilities {
    readonly userAgent?: string;
    readonly nodeVersion?: string;
    readonly reactNativeVersion?: string;
    readonly browserName?: string;
    readonly browserVersion?: string;
    readonly osName?: string;
    readonly osVersion?: string;
    readonly deviceType: 'mobile' | 'tablet' | 'desktop' | 'server' | 'unknown';
    readonly connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
    readonly isOnline: boolean;
    readonly language: string;
    readonly timezone: string;
}
/**
 * Platform detector with comprehensive environment analysis
 */
declare class PlatformDetector {
    private static instance;
    private cachedInfo;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): PlatformDetector;
    /**
     * Detect current platform type
     */
    detectPlatform(): PlatformType;
    /**
     * Get comprehensive environment information
     */
    getEnvironmentInfo(): EnvironmentInfo;
    /**
     * Detect storage and API capabilities
     */
    private detectCapabilities;
    /**
     * Detect device and browser information
     */
    private detectDeviceInfo;
    /**
     * Detect network information
     */
    private detectNetworkInfo;
    /**
     * Detect locale information
     */
    private detectLocaleInfo;
    private checkIndexedDBSupport;
    private checkLocalStorageSupport;
    private checkAsyncStorageSupport;
    private checkFileSystemSupport;
    private checkWebCryptoSupport;
    private checkCompressionStreamsSupport;
    private checkNodeCompressionSupport;
    private checkWebWorkersSupport;
    private checkWorkerThreadsSupport;
    private checkNotificationSupport;
    private checkSecureContext;
    private checkNodeCryptoSupport;
    private estimateWebStorageQuota;
    private getReactNativeVersion;
    private getReactNativeOS;
    private detectMobileDeviceType;
    private detectWebDeviceType;
    private parseBrowserInfo;
    private parseOSInfo;
    /**
     * Clear cached information (useful for testing)
     */
    clearCache(): void;
    /**
     * Check if specific capability is available
     */
    hasCapability(capability: keyof PlatformCapabilities): boolean;
    /**
     * Get optimal storage adapter for current platform
     */
    getRecommendedStorageAdapter(): 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
    /**
     * Get performance tier based on platform capabilities
     */
    getPerformanceTier(): 'high' | 'medium' | 'low';
}
declare const platformDetector: PlatformDetector;
declare const getPlatform: () => PlatformType;
declare const getEnvironmentInfo: () => EnvironmentInfo;
declare const hasCapability: (capability: keyof PlatformCapabilities) => boolean;
declare const getRecommendedStorageAdapter: () => "indexeddb" | "localstorage" | "asyncstorage" | "filesystem" | "memory";
declare const getPerformanceTier: () => "high" | "low" | "medium";

/**
 * IndexedDB Storage Adapter for A-Cube SDK
 * Provides robust, high-performance storage with schema management and migrations
 */

interface IndexedDBSchema {
    readonly version: number;
    readonly stores: {
        readonly [storeName: string]: {
            readonly keyPath?: string;
            readonly autoIncrement?: boolean;
            readonly indexes?: {
                readonly [indexName: string]: {
                    readonly keyPath: string | string[];
                    readonly unique?: boolean;
                    readonly multiEntry?: boolean;
                };
            };
        };
    };
}
interface IndexedDBMigration {
    readonly version: number;
    readonly up: (db: IDBDatabase, transaction: IDBTransaction) => void | Promise<void>;
    readonly down?: (db: IDBDatabase, transaction: IDBTransaction) => void | Promise<void>;
}
interface IndexedDBConfig {
    readonly databaseName: string;
    readonly version: number;
    readonly schema: IndexedDBSchema;
    readonly migrations: IndexedDBMigration[];
    readonly timeout?: number;
    readonly maxRetries?: number;
}
/**
 * IndexedDB Storage Adapter
 * High-performance storage with advanced features
 */
declare class IndexedDBAdapter implements StorageAdapter {
    readonly name = "IndexedDB";
    private db;
    private config;
    private connectionPromise;
    readonly capabilities: {
        readonly supportsTransactions: true;
        readonly supportsIndexing: true;
        readonly maxKeyLength: 1024;
        readonly maxValueSize: number;
        readonly supportsCompression: true;
        readonly supportsEncryption: true;
        readonly supportsTTL: true;
    };
    constructor(config?: Partial<IndexedDBConfig>);
    get isAvailable(): boolean;
    isConnected(): boolean;
    connect(): Promise<void>;
    private establishConnection;
    private handleUpgrade;
    private getDefaultSchema;
    disconnect(): Promise<void>;
    set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void>;
    setWithTransaction<T extends StorageValue>(key: StorageKey, value: T, options: StorageOptions | undefined, transaction: IDBTransaction): Promise<void>;
    get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null>;
    getWithTransaction<T extends StorageValue>(key: StorageKey, transaction: IDBTransaction): Promise<StorageEntry<T> | null>;
    delete(key: StorageKey): Promise<boolean>;
    deleteWithTransaction(key: StorageKey, transaction: IDBTransaction): Promise<boolean>;
    exists(key: StorageKey): Promise<boolean>;
    clear(namespace?: string): Promise<void>;
    setMany<T extends StorageValue>(entries: Array<{
        key: StorageKey;
        value: T;
        options?: StorageOptions;
    }>): Promise<void>;
    getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>>;
    deleteMany(keys: StorageKey[]): Promise<number>;
    keys(options?: QueryOptions$1): Promise<StorageKey[]>;
    values<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    entries<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    count(options?: QueryOptions$1): Promise<number>;
    beginTransaction(): Promise<StorageTransaction>;
    cleanup(): Promise<number>;
    optimize(): Promise<void>;
    getStats(): Promise<StorageStats>;
    private createStorageEntry;
    private matchesQuery;
    private applySortingAndPaging;
    private estimateEntrySize;
}

/**
 * LocalStorage Storage Adapter for A-Cube SDK
 * Provides fallback storage for environments without IndexedDB
 */

/**
 * LocalStorage Storage Adapter
 * Fallback storage implementation for environments without IndexedDB
 */
declare class LocalStorageAdapter implements StorageAdapter {
    readonly name = "LocalStorage";
    private keyPrefix;
    readonly capabilities: {
        readonly supportsTransactions: true;
        readonly supportsIndexing: false;
        readonly maxKeyLength: 256;
        readonly maxValueSize: number;
        readonly supportsCompression: true;
        readonly supportsEncryption: true;
        readonly supportsTTL: true;
    };
    constructor(keyPrefix?: string);
    get isAvailable(): boolean;
    isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getStorageKey(key: StorageKey): string;
    createStorageEntry<T extends StorageValue>(key: StorageKey, value: T, options: Required<StorageOptions>): StorageEntry<T>;
    set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void>;
    get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null>;
    delete(key: StorageKey): Promise<boolean>;
    exists(key: StorageKey): Promise<boolean>;
    clear(namespace?: string): Promise<void>;
    setMany<T extends StorageValue>(entries: Array<{
        key: StorageKey;
        value: T;
        options?: StorageOptions;
    }>): Promise<void>;
    getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>>;
    deleteMany(keys: StorageKey[]): Promise<number>;
    keys(options?: QueryOptions$1): Promise<StorageKey[]>;
    values<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    entries<T extends StorageValue>(options?: QueryOptions$1): Promise<Array<StorageEntry<T>>>;
    count(options?: QueryOptions$1): Promise<number>;
    beginTransaction(): Promise<StorageTransaction>;
    cleanup(): Promise<number>;
    optimize(): Promise<void>;
    getStats(): Promise<StorageStats>;
    private matchesQuery;
    private applySortingAndPaging;
    private getAvailableSpace;
}

/**
 * Storage Encryption Service for A-Cube SDK
 * Provides seamless encryption/decryption integration with storage adapters
 */

interface StorageEncryptionConfig {
    readonly enabled: boolean;
    readonly algorithm: 'AES-GCM' | 'AES-CBC';
    readonly keyLength: 128 | 192 | 256;
    readonly keyDerivation: {
        readonly algorithm: 'PBKDF2' | 'scrypt';
        readonly iterations: number;
    };
    readonly compression: boolean;
    readonly keyRotationInterval?: number;
    readonly masterPassword?: string;
    readonly keyId?: string;
}
interface EncryptionMetadata {
    readonly encrypted: boolean;
    readonly algorithm?: string;
    readonly keyId?: string;
    readonly version: string;
    readonly checksum?: string;
}
interface EncryptionKeyManager {
    getCurrentKeyId(): Promise<string>;
    deriveKey(password: string, keyId?: string): Promise<string>;
    rotateKey(): Promise<string>;
    getKeyInfo(keyId: string): Promise<{
        algorithm: string;
        created: number;
        expires?: number;
    } | null>;
    cleanup(): Promise<number>;
}
/**
 * Storage Encryption Service
 * Handles encryption/decryption for storage adapters
 */
declare class StorageEncryptionService {
    private encryption;
    private keyManager;
    private config;
    constructor(config?: Partial<StorageEncryptionConfig>);
    /**
     * Encrypt storage value if encryption is enabled
     */
    encryptValue<T extends StorageValue>(value: T, key: StorageKey, forceEncrypt?: boolean): Promise<{
        data: T | string;
        metadata: EncryptionMetadata;
    }>;
    /**
     * Decrypt storage value if it was encrypted
     */
    decryptValue<T extends StorageValue>(data: T | string, metadata: EncryptionMetadata, key: StorageKey): Promise<T>;
    /**
     * Process storage entry for encryption
     */
    encryptStorageEntry<T extends StorageValue>(entry: StorageEntry<T>, forceEncrypt?: boolean): Promise<StorageEntry<T | string>>;
    /**
     * Process storage entry for decryption
     */
    decryptStorageEntry<T extends StorageValue>(entry: StorageEntry<T | string>): Promise<StorageEntry<T>>;
    /**
     * Check if encryption is enabled
     */
    isEncryptionEnabled(): boolean;
    /**
     * Get current encryption configuration
     */
    getConfig(): Readonly<StorageEncryptionConfig>;
    /**
     * Update encryption configuration
     */
    updateConfig(newConfig: Partial<StorageEncryptionConfig>): Promise<void>;
    /**
     * Rotate encryption keys
     */
    rotateKeys(): Promise<string>;
    /**
     * Get encryption statistics
     */
    getEncryptionStats(): Promise<{
        enabled: boolean;
        algorithm: string;
        keyLength: number;
        currentKeyId: string;
        keyAge: number;
        nextRotation?: number;
    }>;
    /**
     * Cleanup expired keys
     */
    cleanup(): Promise<number>;
    /**
     * Test encryption/decryption with sample data
     */
    testEncryption(): Promise<boolean>;
    /**
     * Generate integrity checksum
     */
    private generateChecksum;
    /**
     * Simple hash fallback for environments without crypto.subtle
     */
    private simpleHash;
    /**
     * Generate unique key ID
     */
    private generateKeyId;
}
declare const createEncryptionService: (config?: Partial<StorageEncryptionConfig>) => StorageEncryptionService;
declare const createSecureEncryptionService: (masterPassword: string) => StorageEncryptionService;
declare const createMinimalEncryptionService: () => StorageEncryptionService;

/**
 * Storage Factory for A-Cube SDK
 * Automatic platform detection and optimal storage adapter selection
 */

interface StorageFactoryConfig {
    readonly preferredAdapter?: 'indexeddb' | 'localstorage' | 'memory' | 'auto';
    readonly encryption?: Partial<StorageEncryptionConfig>;
    readonly keyPrefix?: string;
    readonly enableCompression?: boolean;
    readonly enableCaching?: boolean;
    readonly performanceMode?: 'high' | 'balanced' | 'conservative';
    readonly debug?: boolean;
    readonly maxRetries?: number;
    readonly connectionTimeout?: number;
}
/**
 * Storage Factory
 * Main entry point for creating storage instances
 */
declare class StorageFactory {
    private static instance;
    private storageInstances;
    private constructor();
    static getInstance(): StorageFactory;
    /**
     * Create storage instance with automatic adapter selection
     */
    createStorage(config?: StorageFactoryConfig): Promise<UnifiedStorage>;
    /**
     * Get environment information
     */
    getEnvironmentInfo(): EnvironmentInfo;
    /**
     * Test storage compatibility
     */
    testCompatibility(): Promise<{
        platform: PlatformType;
        availableAdapters: string[];
        recommendedAdapter: string;
        encryptionSupported: boolean;
        compressionSupported: boolean;
    }>;
    /**
     * Clear all cached instances
     */
    clearInstances(): void;
    private selectOptimalAdapter;
    private createSpecificAdapter;
    private generateInstanceKey;
}
declare const storageFactory: StorageFactory;
declare const createStorage: (config?: StorageFactoryConfig) => Promise<UnifiedStorage>;
declare const createSecureStorage: (masterPassword: string) => Promise<UnifiedStorage>;
declare const createHighPerformanceStorage: () => Promise<UnifiedStorage>;
declare const createCompatibilityStorage: () => Promise<UnifiedStorage>;

/**
 * Priority Queue Implementation
 * Enterprise-grade priority-based queue with efficient operations
 */

interface PriorityQueueConfig {
    maxSize: number;
    enableMetrics: boolean;
    enableEvents: boolean;
}
declare class PriorityQueue {
    private items;
    private priorityIndex;
    private statusIndex;
    private resourceIndex;
    private metrics;
    private config;
    private eventHandlers;
    constructor(config?: Partial<PriorityQueueConfig>);
    private initializeMetrics;
    private initializeIndexes;
    /**
     * Add item to the queue
     */
    enqueue(item: QueueItem): boolean;
    /**
     * Get next highest priority item
     */
    dequeue(): QueueItem | null;
    /**
     * Peek at next highest priority item without removing
     */
    peek(): QueueItem | null;
    /**
     * Get multiple items by priority and status
     */
    dequeueMany(count: number, priority?: QueuePriority, status?: QueueItemStatus): QueueItem[];
    /**
     * Update item status and properties
     */
    updateItem(id: QueueItemId, updates: Partial<QueueItem>): boolean;
    /**
     * Remove item from queue
     */
    remove(id: QueueItemId): boolean;
    /**
     * Get item by ID
     */
    get(id: QueueItemId): QueueItem | null;
    /**
     * Check if queue contains item
     */
    has(id: QueueItemId): boolean;
    /**
     * Get items by status
     */
    getByStatus(status: QueueItemStatus): QueueItem[];
    /**
     * Get items by priority
     */
    getByPriority(priority: QueuePriority): QueueItem[];
    /**
     * Get items by resource
     */
    getByResource(resource: string): QueueItem[];
    /**
     * Get items that are ready to process (past scheduled time)
     */
    getReadyItems(limit?: number): QueueItem[];
    /**
     * Clear all items
     */
    clear(): void;
    /**
     * Get queue size
     */
    size(): number;
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean;
    /**
     * Get queue statistics
     */
    getStats(): QueueStats;
    /**
     * Get all items as array
     */
    toArray(): QueueItem[];
    /**
     * Event subscription
     */
    on<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void;
    /**
     * Event unsubscription
     */
    off<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void;
    /**
     * Emit event
     */
    private emit;
    private addToIndex;
    private removeFromIndex;
    private updateMetricsOnAdd;
    private updateMetricsOnUpdate;
    private updateMetricsOnRemove;
    private incrementStatusCount;
    private decrementStatusCount;
    private updateSuccessRate;
    private emitStatusChangeEvent;
}

/**
 * Batch Processor - Groups related operations for efficient processing
 * Enterprise-grade batching with resource and time-based strategies
 */

interface BatchProcessorConfig {
    maxBatchSize: number;
    maxWaitTime: number;
    enableResourceGrouping: boolean;
    enableTimeWindowing: boolean;
    enablePriorityBatching: boolean;
    maxConcurrentBatches: number;
    batchTimeoutMs: number;
}
interface BatchingStrategy {
    groupByResource: boolean;
    groupByPriority: boolean;
    groupByTimeWindow: boolean;
    windowSizeMs: number;
    maxItemsPerBatch: number;
    priorityMixing: boolean;
}
declare class BatchProcessor {
    private config;
    private pendingBatches;
    private batchTimers;
    private processingBatches;
    private eventHandlers;
    private batchCounter;
    constructor(config?: Partial<BatchProcessorConfig>);
    /**
     * Add items to batching system
     */
    addToBatch(items: QueueItem[], strategy: BatchingStrategy): BatchOperation[];
    /**
     * Process a specific batch
     */
    processBatch(batchId: string, processor: (items: QueueItem[]) => Promise<void>): Promise<BatchOperation | null>;
    /**
     * Get ready batches (full or timed out)
     */
    getReadyBatches(): BatchOperation[];
    /**
     * Force process all pending batches
     */
    flushAllBatches(processor: (items: QueueItem[]) => Promise<void>): Promise<BatchOperation[]>;
    /**
     * Get batch by ID
     */
    getBatch(batchId: string): BatchOperation | null;
    /**
     * Get all pending batches
     */
    getPendingBatches(): BatchOperation[];
    /**
     * Cancel a batch
     */
    cancelBatch(batchId: string): boolean;
    /**
     * Clear all batches
     */
    clear(): void;
    /**
     * Get batch statistics
     */
    getStats(): {
        totalBatches: number;
        pendingBatches: number;
        processingBatches: number;
        totalItemsInBatches: number;
        averageBatchSize: number;
    };
    on<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void;
    off<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void;
    private emit;
    private groupItems;
    private generateGroupKey;
    private createOrUpdateBatch;
    private createNewBatch;
    private generateBatchGroupKey;
    private determineBatchStrategy;
    private processParallel;
    private processSequential;
    private chunkArray;
    destroy(): void;
}

/**
 * Conflict Resolution System
 * Enterprise-grade conflict resolution for offline-first operations
 */

interface ConflictContext {
    resource: ResourceType;
    operation: QueueOperationType;
    localTimestamp: number;
    serverTimestamp: number;
    clientId: string;
    conflictType: ConflictType;
}
type ConflictType = 'version-mismatch' | 'concurrent-modification' | 'stale-data' | 'missing-dependency' | 'validation-error' | 'permission-denied' | 'resource-locked' | 'schema-incompatible';
interface ConflictResolution<T = any> {
    strategy: ConflictResolutionStrategy$1;
    resolvedData: T;
    requiresUserInput: boolean;
    metadata: {
        conflictType: ConflictType;
        resolutionReason: string;
        dataSource: 'client' | 'server' | 'merged' | 'manual';
        confidence: number;
        preservedFields?: string[];
        discardedFields?: string[];
    };
}
interface MergeRule {
    field: string;
    strategy: 'client' | 'server' | 'latest' | 'merge-array' | 'custom';
    customResolver?: (clientValue: any, serverValue: any, context: ConflictContext) => any;
}
interface ConflictResolverConfig {
    defaultStrategy: ConflictResolutionStrategy$1;
    mergeRules: Record<ResourceType, MergeRule[]>;
    userInputTimeout: number;
    maxResolutionAttempts: number;
    enableAutoResolution: boolean;
    confidenceThreshold: number;
}
declare class ConflictResolverManager {
    private config;
    private customResolvers;
    private pendingUserInputs;
    private resolutionHistory;
    constructor(config?: Partial<ConflictResolverConfig>);
    /**
     * Resolve conflict between local and server data
     */
    resolveConflict<T = any>(localItem: QueueItem, serverData: T, context: ConflictContext): Promise<ConflictResolution<T>>;
    /**
     * Register custom conflict resolver
     */
    registerResolver(resource: ResourceType, operation: QueueOperationType, resolver: ConflictResolver): void;
    /**
     * Get conflict resolution suggestions based on context
     */
    getResolutionSuggestions(context: ConflictContext): ConflictResolutionStrategy$1[];
    /**
     * Analyze conflict to determine type and severity
     */
    analyzeConflict(localItem: QueueItem, serverData: any): ConflictContext;
    /**
     * Get resolution history for analytics
     */
    getResolutionHistory(): ConflictResolution[];
    /**
     * Clear resolution history
     */
    clearHistory(): void;
    private resolveClientWins;
    private resolveServerWins;
    private resolveMerge;
    private resolveManual;
    private performMerge;
    private createResolution;
    private getDataSource;
    private calculateMergeConfidence;
    private getDefaultMergeRules;
    private hasValidationIssues;
    private hasSchemaIssues;
    private getClientId;
    private getNestedProperty;
    private setNestedProperty;
    private mergeArrays;
}

/**
 * Retry Manager with Circuit Breaker
 * Enterprise-grade retry logic with exponential backoff and intelligent failure handling
 */

interface RetryManagerConfig {
    defaultRetryPolicy: RetryPolicy;
    circuitBreakerConfig: CircuitBreakerConfig;
    maxConcurrentRetries: number;
    retryQueueSize: number;
    enableJitter: boolean;
    enableMetrics: boolean;
}
interface CircuitBreakerConfig {
    enabled: boolean;
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    monitoringWindow: number;
}
interface RetryAttempt {
    itemId: QueueItemId;
    attempt: number;
    scheduledAt: number;
    lastError?: string;
    backoffDelay: number;
    item?: QueueItem;
    retryCount?: number;
}
interface RetryMetrics {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetryDelay: number;
    circuitBreakerTrips: number;
    retrySuccessRate: number;
    resourceMetrics: Record<ResourceType, {
        retries: number;
        successes: number;
        failures: number;
        averageDelay: number;
    }>;
}
declare class RetryManager {
    private config;
    private circuitBreakers;
    private activeRetries;
    private retryTimers;
    private metrics;
    private eventHandlers;
    constructor(config?: Partial<RetryManagerConfig>);
    /**
     * Schedule retry for a failed item
     */
    scheduleRetry(item: QueueItem, error: string): boolean;
    /**
     * Cancel scheduled retry
     */
    cancelRetry(itemId: QueueItemId): boolean;
    /**
     * Record successful operation (for circuit breaker)
     */
    recordSuccess(resource: ResourceType): void;
    /**
     * Record failed operation (for circuit breaker)
     */
    recordFailure(resource: ResourceType, _error: string): void;
    /**
     * Check if circuit is closed for a resource
     */
    isCircuitClosed(resource: ResourceType): boolean;
    /**
     * Get circuit breaker state for a resource
     */
    getCircuitState(resource: ResourceType): CircuitBreakerState | null;
    /**
     * Get all active retries
     */
    getActiveRetries(): RetryAttempt[];
    /**
     * Get retry metrics
     */
    getMetrics(): RetryMetrics;
    /**
     * Clear all retries
     */
    clearRetries(): void;
    /**
     * Reset circuit breaker for a resource
     */
    resetCircuitBreaker(resource: ResourceType): void;
    /**
     * Get retry policy for an item
     */
    getRetryPolicy(_item: QueueItem): RetryPolicy;
    on<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void;
    off<K extends keyof QueueEvents>(event: K, handler: (data: QueueEvents[K]) => void): void;
    private emit;
    private executeRetry;
    private calculateDelay;
    private getDefaultRetryPolicy;
    private initializeMetrics;
    private initializeCircuitBreakers;
    private createInitialCircuitBreakerState;
    private updateMetricsOnRetryScheduled;
    private updateMetricsOnSuccess;
    private updateMetricsOnFailure;
    private updateRetrySuccessRate;
    destroy(): void;
}

/**
 * Enhanced useACubeOffline Hook
 * Enterprise-grade offline state management with the new queue system
 */

interface ProcessingResult {
    id: QueueItemId;
    success: boolean;
    error?: Error;
    retryCount?: number;
    processingTime?: number;
}
interface EnhancedOfflineOptions {
    enabled?: boolean;
    maxQueueSize?: number;
    maxRetries?: number;
    retryDelay?: number;
    persistQueue?: boolean;
    syncOnReconnect?: boolean;
    conflictResolution?: 'client-wins' | 'server-wins' | 'merge' | 'manual';
    enableBatching?: boolean;
    batchSize?: number;
    batchTimeout?: number;
    enableAnalytics?: boolean;
    autoProcessing?: boolean;
    processingInterval?: number;
    priorityMapping?: Record<string, QueuePriority>;
}
interface EnhancedOfflineResult {
    isOnline: boolean;
    isOffline: boolean;
    queueSize: number;
    queueStats: QueueStats;
    processingStatus: {
        isProcessing: boolean;
        processingItems: number;
        autoProcessing: boolean;
        readyItems: number;
    };
    addToQueue: (operation: QueueOperationType, resource: ResourceType, data: any, options?: {
        priority?: QueuePriority;
        optimisticId?: string;
        metadata?: Record<string, unknown>;
        scheduledAt?: number;
    }) => Promise<QueueItemId>;
    removeFromQueue: (id: QueueItemId) => Promise<boolean>;
    getQueuedOperation: (id: QueueItemId) => any;
    clearQueue: () => Promise<void>;
    sync: () => Promise<ProcessingResult[]>;
    pause: () => void;
    resume: () => void;
    getInsights: () => any;
    getTrendAnalysis: () => any;
    scheduleOperation: (operation: QueueOperationType, resource: ResourceType, data: any, scheduledAt: number, options?: {
        priority?: QueuePriority;
    }) => Promise<QueueItemId>;
    batchOperations: (operations: Array<{
        operation: QueueOperationType;
        resource: ResourceType;
        data: any;
        priority?: QueuePriority;
    }>) => Promise<QueueItemId[]>;
    onQueueEvent: (event: string, handler: Function) => void;
    offQueueEvent: (event: string, handler: Function) => void;
}
declare function useEnhancedACubeOffline(options?: EnhancedOfflineOptions): EnhancedOfflineResult;

/**
 * Network Manager - Simplified cross-platform network monitoring
 * Basic connection monitoring without browser-specific APIs
 */

interface NetworkManagerConfig {
    enableMonitoring: boolean;
    monitoringInterval: number;
    qualityCheckInterval: number;
    qualityThresholds: {
        excellent: {
            bandwidth: number;
            latency: number;
        };
        good: {
            bandwidth: number;
            latency: number;
        };
        fair: {
            bandwidth: number;
            latency: number;
        };
        poor: {
            bandwidth: number;
            latency: number;
        };
    };
    adaptiveOptimization: boolean;
    conserveDataOnMetered: boolean;
    pauseOnPoorConnection: boolean;
    maxRetryAttempts: number;
    retryBackoffMultiplier: number;
    maxRetryDelay: number;
}
interface NetworkEventMap {
    'connection-changed': ConnectionInfo;
    'quality-changed': {
        previous: ConnectionQuality;
        current: ConnectionQuality;
    };
    'optimization-applied': NetworkOptimization;
    'poor-connection-detected': ConnectionInfo;
    'connection-restored': ConnectionInfo;
}
/**
 * Cross-platform Network Manager
 */
declare class NetworkManager extends EventEmitter<NetworkEventMap> {
    private config;
    private currentConnection;
    private monitoringTimer;
    private qualityCheckTimer;
    private isMonitoring;
    private connectionHistory;
    private lastQualityCheck;
    constructor(config?: Partial<NetworkManagerConfig>);
    /**
     * Initialize the network manager
     */
    initialize(): Promise<void>;
    /**
     * Add connection change listener
     */
    onConnectionChange(listener: (info: ConnectionInfo) => void): void;
    /**
     * Start network monitoring
     */
    startMonitoring(): void;
    /**
     * Stop network monitoring
     */
    stopMonitoring(): void;
    /**
     * Get current connection information
     */
    getConnectionInfo(): ConnectionInfo;
    /**
     * Check if the connection is suitable for sync operations
     */
    isSyncRecommended(syncType?: 'light' | 'medium' | 'heavy'): boolean;
    /**
     * Optimize sync options based on current network conditions
     */
    optimizeForConnection(options: SyncOptions): SyncOptions & {
        networkOptimization: NetworkOptimization;
    };
    /**
     * Calculate appropriate retry delay based on network conditions
     */
    calculateRetryDelay(attempt: number, baseDelay?: number): number;
    /**
     * Get connection quality metrics over time
     */
    getConnectionMetrics(): {
        current: ConnectionInfo;
        average: {
            bandwidth: number;
            latency: number;
            quality: ConnectionQuality;
        };
        stability: number;
        history: ConnectionInfo[];
    };
    private getInitialConnectionInfo;
    private detectConnectionType;
    private setupOnlineOfflineListeners;
    private onlineHandler?;
    private offlineHandler?;
    private removeOnlineOfflineListeners;
    private checkConnection;
    private measureConnectionQuality;
    private calculateQualityFromMetrics;
    private updateConnection;
    private updateConnectionStatus;
    private calculateOptimization;
    private performQualityCheck;
    /**
     * Cleanup resources
     */
    destroy(): void;
}

/**
 * ACubeProvider - React Context System for A-Cube SDK
 * Enterprise-grade provider with offline capabilities, sync management, and error boundaries
 */

interface ACubeContextValue {
    sdk: ACubeSDK;
    storage?: UnifiedStorage | undefined;
    queueManager?: EnterpriseQueueManager | undefined;
    syncEngine?: ProgressiveSyncEngine | undefined;
    networkManager?: NetworkManager | undefined;
    isInitialized: boolean;
    isOnline: boolean;
    isOfflineEnabled: boolean;
    isSyncEnabled: boolean;
    initializationError?: Error | undefined;
    enableOffline: () => Promise<void>;
    enableSync: () => Promise<void>;
    getOfflineStatus: () => {
        queuedOperations: number;
        lastSyncTime?: Date;
        pendingSyncOperations: number;
    };
}
interface ACubeProviderProps {
    config: ACubeSDKConfig;
    children: ReactNode;
    fallback?: ReactNode;
    onInitializationError?: (error: Error) => void;
    autoInitialize?: boolean;
}
/**
 * ACubeProvider - Main provider component for the A-Cube SDK
 * Provides SDK instance, offline storage, queue management, and sync capabilities
 */
declare const ACubeProvider: React$1.FC<ACubeProviderProps>;
/**
 * Hook to access the ACube SDK context
 * Throws an error if used outside of ACubeProvider
 */
declare const useACube: () => ACubeContextValue;
/**
 * Hook to access just the SDK instance
 */
declare const useACubeSDK: () => ACubeSDK;
/**
 * Hook to access offline storage
 */
declare const useACubeStorage: () => UnifiedStorage;
/**
 * Hook to access queue manager
 */
declare const useACubeQueueManager: () => EnterpriseQueueManager;
/**
 * Hook to access sync engine
 */
declare const useACubeSyncEngine: () => ProgressiveSyncEngine;
/**
 * Hook to access network manager
 */
declare const useACubeNetworkManager: () => NetworkManager | undefined;
/**
 * Hook for network status
 */
declare const useACubeNetworkStatus: () => {
    isOnline: boolean;
    quality: "excellent" | "good" | "fair" | "poor" | "unknown";
    type: "wifi" | "cellular" | "ethernet" | "unknown";
};

/**
 * useACubeQuery - Enhanced data fetching hook with caching and optimistic updates
 * Inspired by React Query but tailored for A-Cube SDK
 */

interface QueryOptions<TData> {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    refetchInterval?: number;
    staleTime?: number;
    cacheTime?: number;
    retry?: boolean | number | ((failureCount: number, error: Error) => boolean);
    retryDelay?: number | ((retryAttempt: number) => number);
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    select?: (data: TData) => any;
    initialData?: TData;
    placeholderData?: TData;
    offlineFallback?: boolean;
    persistToStorage?: boolean;
    storageKey?: string;
    networkPolicy?: 'cache-first' | 'network-first' | 'offline-first';
    syncOnReconnect?: boolean;
}
interface QueryResult<TData> {
    data: TData | undefined;
    error: Error | null;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    isSuccess: boolean;
    isStale: boolean;
    refetch: () => Promise<void>;
    remove: () => void;
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    isPaused: boolean;
    status: 'idle' | 'loading' | 'error' | 'success';
    isOffline: boolean;
    isCached: boolean;
    isFromCache: boolean;
    syncStatus: 'synced' | 'pending' | 'failed' | 'unknown';
    offlineDataAvailable: boolean;
}
declare function useACubeQuery<TData = unknown>(queryKey: string | string[], queryFn: (sdk: ACubeSDK) => Promise<TData>, options?: QueryOptions<TData>): QueryResult<TData>;

/**
 * useACubeMutation - Enhanced mutation hook with optimistic updates and offline support
 * Handles create, update, delete operations with automatic cache invalidation and queue management
 */

interface MutationOptions<TData, TVariables> {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
    onMutate?: (variables: TVariables) => Promise<void> | void;
    retry?: boolean | number | ((failureCount: number, error: Error) => boolean);
    retryDelay?: number | ((retryAttempt: number) => number);
    optimisticUpdate?: (variables: TVariables) => any;
    invalidateQueries?: string | string[];
    updateQueries?: Record<string, (oldData: any, newData: TData, variables: TVariables) => any>;
    queueIfOffline?: boolean;
    optimisticUpdateDuration?: number;
    rollbackOnError?: boolean;
    persistOptimisticUpdates?: boolean;
    mutationType?: 'create' | 'update' | 'delete' | 'custom';
    priority?: 'critical' | 'high' | 'normal' | 'low';
    resourceType?: string;
    conflictResolution?: 'client-wins' | 'server-wins' | 'merge' | 'manual';
    onQueued?: (queueId: string) => void;
    onOptimisticUpdate?: (optimisticData: any) => void;
    onOptimisticRevert?: (originalData: any) => void;
}
interface MutationResult<TData, TVariables> {
    data: TData | undefined;
    error: Error | null;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    isIdle: boolean;
    failureCount: number;
    status: 'idle' | 'loading' | 'error' | 'success';
    mutate: (variables: TVariables) => Promise<TData>;
    mutateAsync: (variables: TVariables) => Promise<TData>;
    reset: () => void;
    context: any;
    isOptimistic: boolean;
    isQueued: boolean;
    queueId?: string;
    syncStatus: 'synced' | 'pending' | 'failed' | 'queued' | 'unknown';
    isOffline: boolean;
    canRetryOffline: boolean;
    revertOptimistic: () => void;
    forceSync: () => Promise<void>;
}
declare function useACubeMutation<TData = unknown, TVariables = void>(mutationFn: (variables: TVariables, sdk: ACubeSDK) => Promise<TData>, options?: MutationOptions<TData, TVariables>): MutationResult<TData, TVariables>;

/**
 * useACubeSubscription - Real-time data subscriptions
 * Handles WebSocket connections and real-time updates
 */
interface SubscriptionOptions<TData> {
    enabled?: boolean;
    reconnect?: boolean;
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
    onData?: (data: TData) => void;
    onError?: (error: Error) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    filter?: (data: TData) => boolean;
    transform?: (data: any) => TData;
}
interface SubscriptionResult<TData> {
    data: TData | null;
    error: Error | null;
    isConnected: boolean;
    isConnecting: boolean;
    isError: boolean;
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
    reconnectCount: number;
    subscribe: () => void;
    unsubscribe: () => void;
    send: (message: any) => void;
}
declare function useACubeSubscription<TData = unknown>(subscriptionKey: string, options?: SubscriptionOptions<TData>): SubscriptionResult<TData>;

/**
 * useACubeCache - Advanced cache management hook with TTL, compression, and offline integration
 * Provides enterprise-grade cache management with intelligent compression and storage optimization
 */
interface CacheOptions {
    staleTime?: number;
    cacheTime?: number;
    backgroundRefetch?: boolean;
    persistToStorage?: boolean;
    storageKey?: string;
    maxSize?: number;
    maxEntries?: number;
    compressionThreshold?: number;
    enableCompression?: boolean;
    compressionLevel?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    ttlStrategy?: 'sliding' | 'absolute' | 'adaptive';
    evictionStrategy?: 'lru' | 'lfu' | 'fifo' | 'random';
    enableMetrics?: boolean;
    syncWithStorage?: boolean;
    storageNamespace?: string;
}
interface CacheResult<TData> {
    data: TData | undefined;
    isStale: boolean;
    isCached: boolean;
    lastUpdated: number | null;
    cacheSize: number;
    totalSize: number;
    compressionRatio: number;
    hitRate: number;
    isCompressed: boolean;
    metrics: CacheMetrics;
    set: (key: string, data: TData, options?: CacheSetOptions) => Promise<void>;
    get: (key: string) => Promise<TData | undefined>;
    remove: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    invalidate: (keyPrefix?: string) => Promise<void>;
    prefetch: (key: string, fetcher: () => Promise<TData>) => Promise<void>;
    gc: () => Promise<void>;
    compress: (key: string) => Promise<boolean>;
    decompress: (key: string) => Promise<boolean>;
    optimize: () => Promise<void>;
    export: () => Promise<string>;
    import: (data: string) => Promise<void>;
    getStats: () => CacheMetrics;
    warmup: (keys: string[], fetcher: (key: string) => Promise<TData>) => Promise<void>;
}
interface CacheSetOptions {
    ttl?: number;
    compress?: boolean;
    priority?: 'high' | 'normal' | 'low';
    tags?: string[];
}
interface CacheMetrics {
    totalEntries: number;
    totalSize: number;
    compressedEntries: number;
    hits: number;
    misses: number;
    evictions: number;
    compressionSavings: number;
    averageAccessTime: number;
    oldestEntry: number | undefined;
    newestEntry: number | undefined;
}
declare function useACubeCache<TData = unknown>(options?: CacheOptions): CacheResult<TData>;

/**
 * useACubeOffline - Modern offline state management and queue synchronization
 * Enhanced with UnifiedStorage, enterprise queue management, and intelligent sync
 */

interface OfflineOptions {
    enabled?: boolean;
    syncOnReconnect?: boolean;
    backgroundSync?: boolean;
    syncInterval?: number;
    conflictResolution?: 'client' | 'server' | 'merge';
    onSyncStart?: () => void;
    onSyncComplete?: (results: SyncResults) => void;
    onSyncError?: (error: Error) => void;
    onOfflineChange?: (isOffline: boolean) => void;
}
interface SyncResults {
    successful: number;
    failed: number;
    conflicts: number;
    duration: number;
}
interface OfflineStatus {
    queuedOperations: number;
    cachedEntries: number;
    offlineEntries: number;
    lastSyncTime?: Date | undefined;
    pendingSyncOperations: number;
}
interface OfflineResult {
    isOnline: boolean;
    isOffline: boolean;
    networkStatus: 'online' | 'offline' | 'reconnecting';
    queueStats: QueueStats;
    queuedOperations: QueueItem[];
    isSyncing: boolean;
    syncProgress: number;
    lastSyncTime: Date | null;
    lastSyncResults: SyncResults | null;
    storageStatus: OfflineStatus;
    sync: () => Promise<SyncResults>;
    clearQueue: () => Promise<void>;
    clearCache: () => Promise<void>;
    getQueuedOperation: (id: string) => QueueItem | undefined;
    forceSync: (queueId?: string) => Promise<void>;
    enableOfflineMode: () => Promise<void>;
    disableOfflineMode: () => void;
    exportOfflineData: () => Promise<string>;
    importOfflineData: (data: string) => Promise<void>;
    getOfflineReport: () => Promise<OfflineStatus>;
}
declare function useACubeOffline(options?: OfflineOptions): OfflineResult;

interface AuthContextValue {
    state: AuthState;
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: AuthError | null;
    login: (credentials: LoginCredentials) => Promise<AuthUser>;
    logout: (options?: LogoutOptions) => Promise<void>;
    refreshSession: () => Promise<void>;
    clearError: () => void;
    hasRole: (role: UserRole) => boolean;
    hasAnyRole: (roles: UserRole[]) => boolean;
    getEffectiveRoles: () => UserRole[];
    getPrimaryRole: () => UserRole | null;
    getSimpleRole: () => SimpleUserRole;
    switchRole: (targetRole: UserRole, context?: {
        merchant_id?: MerchantId;
        cashier_id?: CashierId;
        point_of_sale_id?: PointOfSaleId;
    }) => Promise<boolean>;
    checkPermission: (permission: PermissionCheck) => Promise<PermissionResult>;
    getSessionInfo: () => Promise<SessionInfo | null>;
}
interface AuthProviderProps {
    children: React$1.ReactNode;
    sdk: ACubeSDK;
    autoInitialize?: boolean;
    onAuthError?: (error: AuthError) => void;
    onAuthSuccess?: (user: AuthUser) => void;
    onLogout?: (reason?: string) => void;
}
/**
 * Auth Provider Component
 */
declare function AuthProvider({ children, sdk, autoInitialize, onAuthError, onAuthSuccess, onLogout, }: AuthProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to use auth context
 */
declare function useAuthContext(): AuthContextValue;
/**
 * Hook to check if auth is available
 */
declare function useAuthAvailable(): boolean;

/**
 * Main authentication hook
 * Provides complete auth state and actions
 */
declare function useAuth(): {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: AuthError | null;
    login: (credentials: LoginCredentials) => Promise<AuthUser>;
    logout: (options?: LogoutOptions) => Promise<void>;
    refreshSession: () => Promise<void>;
    clearError: () => void;
    hasRole: (role: UserRole) => boolean;
    hasAnyRole: (roles: UserRole[]) => boolean;
    getEffectiveRoles: () => UserRole[];
    getPrimaryRole: () => UserRole | null;
    getSimpleRole: () => SimpleUserRole;
    switchRole: (targetRole: UserRole, context?: {
        merchant_id?: MerchantId;
        cashier_id?: CashierId;
        point_of_sale_id?: PointOfSaleId;
    }) => Promise<boolean>;
    checkPermission: (permission: PermissionCheck) => Promise<PermissionResult>;
    getSessionInfo: () => Promise<SessionInfo | null>;
};
/**
 * Hook for login functionality
 * Manages login state and provides login action
 */
declare function useLogin(): {
    login: (credentials: LoginCredentials) => Promise<AuthUser>;
    isLogging: boolean;
    loginError: AuthError | null;
    clearLoginError: () => void;
};
/**
 * Hook for logout functionality
 * Manages logout state and provides logout action
 */
declare function useLogout(): {
    logout: (options?: LogoutOptions) => Promise<void>;
    isLoggingOut: boolean;
};
/**
 * Hook for user information
 * Provides current user data and user-related utilities
 */
declare function useUser(): {
    user: AuthUser | null;
    isAuthenticated: boolean;
    userId: string | undefined;
    userEmail: string | undefined;
    userName: string | undefined;
    userRoles: UserRole[];
    userPermissions: string[];
    lastLogin: Date | undefined;
    sessionId: string | undefined;
};
/**
 * Hook for role management
 * Provides role checking and switching functionality
 */
declare function useRoles(): {
    currentRoles: UserRole[];
    effectiveRoles: UserRole[];
    primaryRole: UserRole | null;
    simpleRole: SimpleUserRole;
    hasRole: (role: UserRole) => boolean;
    hasAnyRole: (roles: UserRole[]) => boolean;
    switchRole: (targetRole: UserRole, context?: {
        merchant_id?: MerchantId;
        cashier_id?: CashierId;
        point_of_sale_id?: PointOfSaleId;
    }) => Promise<boolean>;
    isSwitchingRole: boolean;
};
/**
 * Hook for permission checking
 * Provides permission checking functionality with caching
 */
declare function usePermissions(): {
    checkPermission: (permission: PermissionCheck, useCache?: boolean) => Promise<PermissionResult>;
    clearPermissionCache: () => void;
    isCheckingPermission: (permission: PermissionCheck) => boolean;
};
/**
 * Hook for session management
 * Provides session information and management
 */
declare function useSession(): {
    sessionInfo: SessionInfo | null;
    isRefreshing: boolean;
    sessionError: string | null;
    refreshSession: () => Promise<void>;
    reloadSessionInfo: () => Promise<void>;
    isSessionExpired: boolean;
    timeUntilExpiry: number;
};
/**
 * Hook to require authentication
 * Throws error or redirects if user is not authenticated
 */
declare function useRequireAuth(redirectTo?: string): {
    isAuthenticated: boolean;
    isLoading: boolean;
};
/**
 * Hook to require specific role
 * Throws error if user doesn't have required role
 */
declare function useRequireRole(requiredRole: UserRole | UserRole[], fallbackComponent?: React.ComponentType): {
    hasRequiredRole: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    canAccess: boolean;
};

interface LoginFormProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    className?: string;
    autoComplete?: boolean;
    showRememberMe?: boolean;
    allowRoleSelection?: boolean;
    availableRoles?: UserRole[];
}
declare function LoginForm({ onSuccess, onError, className, autoComplete, showRememberMe, allowRoleSelection, availableRoles, }: LoginFormProps): react_jsx_runtime.JSX.Element;
interface UserProfileProps {
    showRoles?: boolean;
    showSession?: boolean;
    showPermissions?: boolean;
    className?: string;
}
declare function UserProfile({ showRoles, showSession, showPermissions, className, }: UserProfileProps): react_jsx_runtime.JSX.Element | null;
interface RoleSwitcherProps {
    availableRoles?: UserRole[];
    onRoleSwitch?: (role: UserRole) => void;
    className?: string;
}
declare function RoleSwitcher({ availableRoles, onRoleSwitch, className, }: RoleSwitcherProps): react_jsx_runtime.JSX.Element | null;
interface AuthStatusProps {
    showLoginPrompt?: boolean;
    loginPromptText?: string;
    className?: string;
}
declare function AuthStatus({ showLoginPrompt, loginPromptText, className, }: AuthStatusProps): react_jsx_runtime.JSX.Element | null;
interface ProtectedRouteProps {
    children: React$1.ReactNode;
    requiredRole?: UserRole | UserRole[];
    fallback?: React$1.ComponentType;
    redirectTo?: string;
    className?: string;
}
declare function ProtectedRoute({ children, requiredRole, fallback: FallbackComponent, redirectTo, className, }: ProtectedRouteProps): react_jsx_runtime.JSX.Element | null;
interface PermissionGateProps {
    children: React$1.ReactNode;
    resource: string;
    action: string;
    context?: Record<string, unknown>;
    fallback?: React$1.ComponentType;
    showLoading?: boolean;
}
declare function PermissionGate({ children, resource, action, context, fallback: FallbackComponent, showLoading, }: PermissionGateProps): react_jsx_runtime.JSX.Element | null;

/**
 * GDPR Compliance Manager for A-Cube SDK
 * Provides comprehensive GDPR compliance tools and data protection capabilities
 */
interface GDPRConfig {
    enabled: boolean;
    dataRetention: {
        defaultPeriod: number;
        categories: Record<string, number>;
    };
    consent: {
        required: boolean;
        granular: boolean;
        withdrawalEnabled: boolean;
        consentVersion: string;
    };
    dataMinimization: {
        enabled: boolean;
        allowedFields: Record<string, string[]>;
    };
    rightToErasure: {
        enabled: boolean;
        gracePeriod: number;
        cascadeDeletion: boolean;
    };
    dataPortability: {
        enabled: boolean;
        formats: ('json' | 'xml' | 'csv')[];
        includeMetadata: boolean;
    };
    anonymization: {
        enabled: boolean;
        techniques: ('pseudonymization' | 'aggregation' | 'suppression')[];
        retainStructure: boolean;
    };
}
interface ConsentRecord {
    id: string;
    subjectId: string;
    purpose: string;
    dataTypes: string[];
    consentGiven: boolean;
    consentVersion: string;
    timestamp: number;
    expiresAt?: number;
    source: 'explicit' | 'implied' | 'legitimate_interest';
    withdrawnAt?: number;
    withdrawalReason?: string;
    metadata: Record<string, any>;
}
interface DataProcessingRecord {
    id: string;
    subjectId: string;
    dataType: string;
    purpose: string;
    lawfulBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
    processingActivity: string;
    timestamp: number;
    dataLocation: string;
    retentionPeriod: number;
    thirdPartySharing: boolean;
    encryptionUsed: boolean;
    metadata: Record<string, any>;
}
interface GDPRAuditReport {
    generatedAt: number;
    period: {
        start: number;
        end: number;
    };
    summary: {
        totalSubjects: number;
        activeConsents: number;
        withdrawnConsents: number;
        dataExportRequests: number;
        erasureRequests: number;
        dataProcessingActivities: number;
    };
    compliance: {
        consentCompliance: number;
        retentionCompliance: number;
        dataMinimizationCompliance: number;
        securityCompliance: number;
    };
    violations: GDPRViolation[];
    recommendations: string[];
}
interface GDPRViolation {
    id: string;
    type: 'consent' | 'retention' | 'data_minimization' | 'security' | 'transparency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    subjectId?: string;
    detectedAt: number;
    resolvedAt?: number;
    status: 'open' | 'investigating' | 'resolved' | 'false_positive';
    remediation?: string;
    metadata: Record<string, any>;
}
declare class GDPRComplianceManager {
    private config;
    private dataSubjects;
    private consentRecords;
    private processingRecords;
    private exportRequests;
    private erasureRequests;
    private violations;
    constructor(config?: Partial<GDPRConfig>);
    /**
     * Register a new data subject
     */
    registerDataSubject(subjectId: string, email?: string, initialConsent?: Partial<ConsentRecord>): Promise<void>;
    /**
     * Record consent for data processing
     */
    recordConsent(subjectId: string, consent: Partial<ConsentRecord> & {
        purpose: string;
        dataTypes: string[];
        consentGiven: boolean;
    }): Promise<string>;
    /**
     * Withdraw consent
     */
    withdrawConsent(subjectId: string, consentId: string, reason?: string): Promise<void>;
    /**
     * Check if processing is lawful for a data subject
     */
    isProcessingLawful(subjectId: string, purpose: string, dataTypes: string[]): {
        lawful: boolean;
        basis: string;
        warnings: string[];
    };
    /**
     * Record data processing activity
     */
    recordProcessingActivity(activity: Omit<DataProcessingRecord, 'id' | 'timestamp'>): void;
    /**
     * Handle data export request (Right to Data Portability)
     */
    requestDataExport(subjectId: string, options?: {
        format?: 'json' | 'xml' | 'csv';
        includeMetadata?: boolean;
        dataTypes?: string[];
    }): Promise<string>;
    /**
     * Handle data erasure request (Right to be Forgotten)
     */
    requestDataErasure(subjectId: string, reason: string, options?: {
        immediateErasure?: boolean;
        dataTypes?: string[];
        cascadeDelete?: boolean;
    }): Promise<string>;
    /**
     * Generate GDPR compliance report
     */
    generateComplianceReport(timeRangeMs?: number): GDPRAuditReport;
    /**
     * Anonymize data for a subject
     */
    anonymizeDataSubject(subjectId: string): Promise<void>;
    private processDataExport;
    private processDataErasure;
    private initializeRetentionScheduler;
    private enforceDataRetention;
    private scheduleDataSubjectDeletion;
    private checkDataRetentionAfterConsentWithdrawal;
    private calculateRetentionCompliance;
    private calculateDataMinimizationCompliance;
    private calculateSecurityCompliance;
    private generateRecommendations;
    private pseudonymizeEmail;
    private aggregateProcessingRecords;
    private convertToCSV;
    private convertToXML;
    private generateConsentId;
    private generateProcessingId;
    private generateRequestId;
}

/**
 * Fiscal Audit Compliance for A-Cube SDK
 * Provides comprehensive fiscal compliance tools for Italian tax system
 */
interface FiscalConfig {
    enabled: boolean;
    taxRegion: 'IT' | 'EU' | 'GLOBAL';
    retentionPeriod: number;
    digitalSignature: {
        required: boolean;
        algorithm: 'ECDSA' | 'RSA-PSS';
        certificateValidation: boolean;
    };
    receiptSequencing: {
        enforceSequential: boolean;
        allowGaps: boolean;
        maxGapSize: number;
    };
    auditTrail: {
        immutable: boolean;
        hashChaining: boolean;
        timestamping: boolean;
    };
    compliance: {
        agenziaEntrate: boolean;
        vatCompliance: boolean;
        antiMoneyLaundering: boolean;
    };
}
interface FiscalDocument {
    id: string;
    type: 'receipt' | 'invoice' | 'credit_note' | 'fiscal_report';
    sequenceNumber: number;
    fiscalYear: number;
    documentNumber: string;
    timestamp: number;
    amount: {
        net: number;
        vat: number;
        total: number;
        currency: string;
    };
    merchant: {
        vatNumber: string;
        fiscalCode: string;
        name: string;
        address: string;
    };
    customer?: {
        vatNumber?: string;
        fiscalCode?: string;
        name?: string;
    };
    items: FiscalLineItem[];
    vat: VATBreakdown[];
    paymentMethod: string;
    digitalSignature?: string;
    hash: string;
    previousHash?: string;
    auditTrail: FiscalAuditEntry[];
    compliance: {
        agenziaEntrateCompliant: boolean;
        vatCompliant: boolean;
        fiscallyValid: boolean;
        warnings: string[];
    };
    metadata: {
        pos_id?: string;
        operator_id?: string;
        location?: string;
        device_serial?: string;
    };
}
interface FiscalLineItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    category?: string;
    sku?: string;
}
interface VATBreakdown {
    rate: number;
    netAmount: number;
    vatAmount: number;
    totalAmount: number;
    category: 'standard' | 'reduced' | 'exempt' | 'zero';
}
interface FiscalAuditEntry {
    id: string;
    timestamp: number;
    action: 'created' | 'modified' | 'voided' | 'transmitted' | 'archived';
    userId: string;
    details: Record<string, any>;
    hash: string;
    signature?: string;
}
interface FiscalPeriod {
    year: number;
    month?: number;
    quarter?: number;
    startDate: number;
    endDate: number;
    status: 'open' | 'closed' | 'transmitted' | 'archived';
    documents: string[];
    summary: {
        totalDocuments: number;
        totalAmount: number;
        totalVAT: number;
        byType: Record<string, number>;
        byVATRate: Record<string, number>;
    };
    transmissionData?: {
        transmittedAt: number;
        batchId: string;
        acknowledgmentId?: string;
        status: 'pending' | 'accepted' | 'rejected';
    };
}
interface FiscalReport {
    id: string;
    type: 'vat_summary' | 'sales_summary' | 'audit_trail' | 'compliance_check';
    period: FiscalPeriod;
    generatedAt: number;
    generatedBy: string;
    data: any;
    hash: string;
    signature?: string;
    format: 'json' | 'xml' | 'pdf';
    compliance: {
        agenziaEntrateFormat: boolean;
        digitallyValid: boolean;
        complete: boolean;
    };
}
declare class FiscalAuditManager {
    private config;
    private documents;
    private periods;
    private violations;
    private sequenceCounters;
    private auditChain;
    private reports;
    constructor(config?: Partial<FiscalConfig>);
    /**
     * Create a fiscal document (receipt, invoice, etc.)
     */
    createFiscalDocument(type: FiscalDocument['type'], merchantInfo: FiscalDocument['merchant'], items: FiscalLineItem[], paymentMethod: string, customerInfo?: FiscalDocument['customer'], metadata?: FiscalDocument['metadata']): Promise<string>;
    /**
     * Void a fiscal document
     */
    voidFiscalDocument(documentId: string, reason: string, userId: string): Promise<void>;
    /**
     * Generate fiscal period report
     */
    generateFiscalReport(type: FiscalReport['type'], year: number, month?: number, quarter?: number): Promise<string>;
    /**
     * Validate fiscal document integrity
     */
    validateDocumentIntegrity(documentId: string): Promise<{
        isValid: boolean;
        issues: string[];
        hashChainValid: boolean;
        signatureValid: boolean;
    }>;
    /**
     * Get fiscal compliance status
     */
    getFiscalComplianceStatus(): {
        overall: 'compliant' | 'warnings' | 'violations';
        documents: {
            total: number;
            compliant: number;
            withWarnings: number;
            withViolations: number;
        };
        periods: {
            open: number;
            closed: number;
            transmitted: number;
        };
        violations: {
            total: number;
            critical: number;
            unresolved: number;
        };
        retention: {
            totalDocuments: number;
            expiringSoon: number;
            expired: number;
        };
    };
    /**
     * Export fiscal data for tax authorities
     */
    exportFiscalData(year: number, format?: 'xml' | 'json'): Promise<string>;
    private initializeFiscalSystem;
    private getNextSequenceNumber;
    private validateSequence;
    private calculateAmounts;
    private getVATCategory;
    private validateVATCompliance;
    private calculateDocumentHash;
    private calculateAuditHash;
    private calculateReportHash;
    private getLastDocumentHash;
    private findDocumentByHash;
    private signDocument;
    private signReport;
    private verifyDocumentSignature;
    private validateCompliance;
    private generateDocumentNumber;
    private ensureFiscalPeriod;
    private updateFiscalPeriod;
    private checkForViolations;
    private recordViolation;
    private generateVATSummary;
    private generateSalesSummary;
    private generateAuditTrailReport;
    private generateComplianceReport;
    private performPeriodicComplianceCheck;
    private convertToAgenziaEntrateXML;
    private groupDocumentsByType;
    private generatePeriodKey;
    private generateDocumentId;
    private generateAuditId;
    private generateReportId;
    private generateViolationId;
}

/**
 * Advanced Encryption Layer for A-Cube SDK
 * Provides comprehensive encryption, decryption, and key management
 */
interface EncryptionConfig {
    algorithm: 'AES-GCM' | 'AES-CBC' | 'RSA-OAEP';
    keyLength: 128 | 192 | 256 | 2048 | 4096;
    keyDerivation: {
        algorithm: 'PBKDF2' | 'scrypt' | 'Argon2';
        iterations: number;
        salt: Uint8Array;
    };
    compression: boolean;
    metadata: {
        version: string;
        timestamp: number;
        keyId: string;
    };
}

/**
 * Digital Signatures for A-Cube SDK
 * Provides comprehensive digital signing and verification capabilities
 */
interface SignatureConfig {
    algorithm: 'ECDSA' | 'RSA-PSS' | 'HMAC';
    hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
    curve?: 'P-256' | 'P-384' | 'P-521';
    saltLength?: number;
    keyLength?: 2048 | 3072 | 4096;
}

/**
 * Key Rotation Manager for A-Cube SDK
 * Provides automated key rotation, versioning, and lifecycle management
 */

interface KeyRotationConfig {
    rotationInterval: number;
    gracePeriod: number;
    autoRotate: boolean;
    rotationTriggers: {
        timeBasedRotation: boolean;
        usageBasedRotation: boolean;
        compromiseDetection: boolean;
        maxUsageCount?: number;
    };
    notification: {
        beforeRotation: number;
        afterRotation: boolean;
        onFailure: boolean;
    };
    backup: {
        enabled: boolean;
        encryptBackups: boolean;
        retentionPeriod: number;
    };
}

/**
 * Plugin Manager - Core plugin system for A-Cube SDK
 * Provides extensible architecture with lifecycle hooks and middleware
 */

interface PluginManifest {
    name: string;
    version: string;
    description?: string;
    author?: string;
    dependencies?: string[];
    peerDependencies?: string[];
    sdkVersion?: string;
    permissions?: PluginPermission[];
}
type PluginPermission = 'http:read' | 'http:write' | 'storage:read' | 'storage:write' | 'events:emit' | 'events:listen' | 'cache:read' | 'cache:write' | 'config:read' | 'config:write';
interface PluginContext {
    sdk: ACubeSDK;
    logger: PluginLogger;
    storage: PluginStorage;
    events: PluginEventEmitter;
    config: PluginConfig;
    cache: PluginCache;
    http: PluginHttpClient;
}
interface PluginLogger {
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
}
interface PluginStorage {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    delete(key: string): void;
    clear(): void;
    keys(): string[];
}
interface PluginEventEmitter {
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): boolean;
}
interface PluginConfig {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
}
interface PluginCache {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttl?: number): void;
    delete(key: string): void;
    clear(): void;
}
interface PluginHttpClient {
    request<T>(options: RequestOptions$1): Promise<HttpResponse<T>>;
    get<T>(url: string, options?: Partial<RequestOptions$1>): Promise<HttpResponse<T>>;
    post<T>(url: string, data?: any, options?: Partial<RequestOptions$1>): Promise<HttpResponse<T>>;
}
interface PluginLifecycleHooks {
    onInit?(context: PluginContext): Promise<void> | void;
    onDestroy?(context: PluginContext): Promise<void> | void;
    onConfigChange?(context: PluginContext, key: string, value: any): Promise<void> | void;
    beforeRequest?(context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1> | RequestOptions$1;
    afterResponse?(context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>> | HttpResponse<any>;
    onError?(context: PluginContext, error: Error): Promise<Error | void> | Error | void;
}
interface Plugin extends PluginLifecycleHooks {
    manifest: PluginManifest;
}
interface PluginError {
    message: string;
    stack?: string;
    timestamp: Date;
    phase: 'load' | 'init' | 'runtime' | 'destroy';
}
declare class PluginManager extends EventEmitter {
    private plugins;
    private middleware;
    private sdk;
    private globalConfig;
    private globalCache;
    constructor(sdk: ACubeSDK);
    /**
     * Register a plugin with the SDK
     */
    register(plugin: Plugin): Promise<void>;
    /**
     * Unregister a plugin
     */
    unregister(name: string): Promise<void>;
    /**
     * Get information about registered plugins
     */
    getRegisteredPlugins(): Array<{
        name: string;
        version: string;
        isActive: boolean;
        loadedAt: Date;
        errors: PluginError[];
    }>;
    /**
     * Check if plugin is registered
     */
    isRegistered(name: string): boolean;
    /**
     * Get plugin by name
     */
    getPlugin(name: string): Plugin | undefined;
    /**
     * Execute middleware hooks
     */
    executeBeforeRequestHooks(options: RequestOptions$1): Promise<RequestOptions$1>;
    executeAfterResponseHooks(response: HttpResponse<any>): Promise<HttpResponse<any>>;
    executeErrorHooks(error: Error): Promise<Error>;
    /**
     * Cleanup all plugins
     */
    destroy(): Promise<void>;
    private validatePlugin;
    private validateDependencies;
    private createPluginContext;
    private createPluginLogger;
    private createPluginStorage;
    private createPluginEventEmitter;
    private createPluginConfig;
    private createPluginCache;
    private createPluginHttpClient;
    private registerMiddleware;
    private handleMiddlewareError;
}

declare abstract class BasePlugin implements Plugin {
    abstract readonly manifest: PluginManifest;
    protected context?: PluginContext;
    /**
     * Initialize the plugin with context
     */
    onInit(context: PluginContext): Promise<void>;
    /**
     * Cleanup plugin resources
     */
    onDestroy(context: PluginContext): Promise<void>;
    /**
     * Handle configuration changes
     */
    onConfigChange(context: PluginContext, key: string, value: any): Promise<void>;
    /**
     * Process requests before they are sent
     */
    beforeRequest(context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1>;
    /**
     * Process responses after they are received
     */
    afterResponse(context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>>;
    /**
     * Handle errors
     */
    onError(context: PluginContext, error: Error): Promise<Error | void>;
    /**
     * Plugin-specific initialization logic
     */
    protected abstract initialize(context: PluginContext): Promise<void>;
    /**
     * Plugin-specific cleanup logic
     */
    protected abstract cleanup(context: PluginContext): Promise<void>;
    /**
     * Handle configuration changes (optional)
     */
    protected handleConfigChange(_context: PluginContext, _key: string, _value: any): Promise<void>;
    /**
     * Process outgoing requests (optional)
     */
    protected processRequest(_context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1 | void>;
    /**
     * Process incoming responses (optional)
     */
    protected processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any> | void>;
    /**
     * Handle errors (optional)
     */
    protected handleError(_context: PluginContext, error: Error): Promise<Error | void>;
    /**
     * Ensure plugin has required permissions
     */
    protected requirePermissions(...permissions: PluginPermission[]): void;
    /**
     * Check if plugin has permission
     */
    protected hasPermission(permission: PluginPermission): boolean;
    /**
     * Log messages with plugin context
     */
    protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void;
    /**
     * Get configuration value
     */
    protected getConfig<T>(key: string): T | undefined;
    /**
     * Set configuration value
     */
    protected setConfig<T>(key: string, value: T): void;
    /**
     * Get from cache
     */
    protected getFromCache<T>(key: string): T | undefined;
    /**
     * Set in cache
     */
    protected setInCache<T>(key: string, value: T, ttl?: number): void;
    /**
     * Get from storage
     */
    protected getFromStorage<T>(key: string): T | undefined;
    /**
     * Set in storage
     */
    protected setInStorage<T>(key: string, value: T): void;
    /**
     * Emit event
     */
    protected emitEvent(event: string, ...args: any[]): boolean;
    /**
     * Listen to event
     */
    protected onEvent(event: string, listener: (...args: any[]) => void): void;
    /**
     * Make HTTP request
     */
    protected makeRequest<T>(options: RequestOptions$1): Promise<HttpResponse<T>>;
    /**
     * Get SDK instance
     */
    protected get sdk(): ACubeSDK;
    /**
     * Validate plugin manifest
     */
    static validateManifest(manifest: PluginManifest): void;
}

/**
 * Analytics Plugin - Track API usage, performance metrics, and user behavior
 * Provides comprehensive analytics for A-Cube SDK usage
 */

interface PerformanceMetric$1 {
    operation: string;
    duration: number;
    timestamp: number;
    success: boolean;
    errorCode?: string;
    metadata?: Record<string, any>;
}
interface UsageStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    topEndpoints: Array<{
        endpoint: string;
        count: number;
    }>;
    errorDistribution: Record<string, number>;
    timeRange: {
        start: number;
        end: number;
    };
}
declare class AnalyticsPlugin extends BasePlugin {
    readonly manifest: PluginManifest;
    private sessionId;
    private requestMetrics;
    private eventQueue;
    private performanceMetrics;
    private flushInterval?;
    protected initialize(context: PluginContext): Promise<void>;
    protected cleanup(_context: PluginContext): Promise<void>;
    protected processRequest(_context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1>;
    protected processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>>;
    protected handleError(_context: PluginContext, error: Error): Promise<Error>;
    /**
     * Track custom event
     */
    trackEvent(event: string, properties?: Record<string, any>, userId?: string): void;
    /**
     * Get usage statistics
     */
    getUsageStats(timeRangeMs?: number): UsageStats;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(limit?: number): PerformanceMetric$1[];
    /**
     * Clear all stored data
     */
    clearData(): void;
    private flushEvents;
    private updateCachedStats;
    private generateSessionId;
    private sanitizeUrl;
}

/**
 * Audit Plugin - Comprehensive audit logging and compliance for A-Cube SDK
 * Provides detailed audit trails, compliance reporting, and security monitoring
 */

interface AuditEvent {
    id: string;
    timestamp: number;
    type: 'request' | 'response' | 'auth' | 'config' | 'error' | 'security' | 'data';
    action: string;
    actor: {
        userId?: string;
        sessionId: string;
        ipAddress?: string;
        userAgent?: string;
    };
    resource: {
        type: string;
        id?: string;
        path?: string;
    };
    outcome: 'success' | 'failure' | 'warning';
    details: Record<string, any>;
    risk: 'low' | 'medium' | 'high' | 'critical';
    compliance: {
        gdpr: boolean;
        fiscal: boolean;
        internal: boolean;
    };
    retention: number;
}
interface ComplianceReport {
    period: {
        start: number;
        end: number;
    };
    events: {
        total: number;
        byType: Record<string, number>;
        byRisk: Record<string, number>;
        byOutcome: Record<string, number>;
    };
    compliance: {
        gdpr: {
            dataAccess: number;
            dataModification: number;
            dataExport: number;
            dataDelete: number;
        };
        fiscal: {
            receiptCreation: number;
            receiptVoid: number;
            receiptModification: number;
            fiscalReports: number;
        };
        security: {
            authFailures: number;
            suspiciousActivity: number;
            privilegeEscalation: number;
            dataLeaks: number;
        };
    };
    violations: AuditEvent[];
    recommendations: string[];
}
interface AuditFilter {
    type?: AuditEvent['type'][];
    action?: string[];
    outcome?: AuditEvent['outcome'][];
    risk?: AuditEvent['risk'][];
    timeRange?: {
        start: number;
        end: number;
    };
    userId?: string;
    resource?: string;
    compliance?: ('gdpr' | 'fiscal' | 'internal')[];
}
declare class AuditPlugin extends BasePlugin {
    readonly manifest: PluginManifest;
    private events;
    private sessionId;
    private currentUser?;
    private suspiciousActivity;
    private isEnabled;
    private maxEvents;
    private retentionPeriods;
    protected initialize(_context: PluginContext): Promise<void>;
    protected cleanup(_context: PluginContext): Promise<void>;
    protected processRequest(_context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1>;
    protected processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>>;
    protected handleError(_context: PluginContext, error: Error): Promise<Error>;
    /**
     * Record custom audit event
     */
    recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'actor' | 'retention'>, userId?: string): void;
    /**
     * Set current user context
     */
    setUserContext(userId: string, role: string): void;
    /**
     * Get audit events with filtering
     */
    getAuditEvents(filter?: AuditFilter): AuditEvent[];
    /**
     * Generate compliance report
     */
    generateComplianceReport(timeRangeMs?: number): ComplianceReport;
    /**
     * Export audit data for external systems
     */
    exportAuditData(filter?: AuditFilter): {
        metadata: {
            exportTime: number;
            totalEvents: number;
            filter?: AuditFilter;
        };
        events: AuditEvent[];
    };
    /**
     * Clear audit data (with compliance considerations)
     */
    clearAuditData(olderThan?: number, preserveCompliance?: boolean): number;
    private assessRequestRisk;
    private assessResponseRisk;
    private assessErrorRisk;
    private assessRequestCompliance;
    private assessResponseCompliance;
    private checkSuspiciousActivity;
    private checkComplianceViolations;
    private setupRealTimeMonitoring;
    private generateRecommendations;
    private generateSessionId;
    private generateEventId;
    private generateCorrelationId;
    private extractUserIdFromAuth;
    private getCurrentIpAddress;
    private getCurrentUserAgent;
    private sanitizePath;
    private sanitizeUrl;
    private sanitizeHeaders;
    private calculateSize;
    private groupBy;
    private isOutsideBusinessHours;
    private cleanupExpiredEvents;
    private loadPersistedEvents;
    private persistEvents;
}

/**
 * Cache Plugin - Advanced caching strategies for A-Cube SDK
 * Provides intelligent caching with TTL, invalidation, and cache warming
 */

interface CacheEntry<T = any> {
    key: string;
    data: T;
    timestamp: number;
    ttl: number;
    hits: number;
    lastAccessed: number;
    tags: string[];
    metadata?: Record<string, any>;
}
interface CacheStats {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
    topKeys: Array<{
        key: string;
        hits: number;
    }>;
    memoryUsage: {
        used: number;
        available: number;
        percentage: number;
    };
}
interface CacheWarmupRule {
    pattern: string;
    interval: number;
    priority: 'low' | 'medium' | 'high';
    conditions?: {
        timeRange?: {
            start: string;
            end: string;
        };
        dayOfWeek?: number[];
    };
}
declare class CachePlugin extends BasePlugin {
    readonly manifest: PluginManifest;
    private cache;
    private stats;
    private config;
    private warmupRules;
    private warmupInterval?;
    private isEnabled;
    protected initialize(_context: PluginContext): Promise<void>;
    protected cleanup(_context: PluginContext): Promise<void>;
    protected processRequest(_context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1>;
    protected processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>>;
    /**
     * Manually set cache entry
     */
    setCache<T>(key: string, data: T, ttl?: number, tags?: string[]): void;
    /**
     * Get cache entry
     */
    getCache<T>(key: string): T | undefined;
    /**
     * Delete cache entry
     */
    deleteCache(key: string): boolean;
    /**
     * Clear cache by tags
     */
    clearByTags(tags: string[]): number;
    /**
     * Clear all cache
     */
    clearAll(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats;
    /**
     * Warm cache with predefined URLs
     */
    warmCache(urls?: string[]): Promise<void>;
    /**
     * Set cache warmup rules
     */
    setWarmupRules(rules: CacheWarmupRule[]): void;
    /**
     * Get cache keys matching pattern
     */
    getKeysByPattern(pattern: string): string[];
    /**
     * Get cache entries by tags
     */
    getEntriesByTags(tags: string[]): CacheEntry[];
    protected setInCache<T>(key: string, data: T, ttl: number, metadata?: Record<string, any>, tags?: string[]): void;
    /**
     * Get full cache entry object
     */
    private getCacheEntry;
    /**
     * Get cached data only (inherited method)
     */
    protected getFromCache<T>(key: string): T | undefined;
    private shouldCache;
    private shouldCacheResponse;
    private generateCacheKey;
    private determineTtl;
    private isExpired;
    private shouldEvict;
    private evictEntries;
    private cleanupExpiredEntries;
    private calculateHitRate;
    private calculateSize;
    private calculateMemoryUsage;
    private startCacheWarmup;
    private executeWarmupRules;
    private shouldExecuteWarmupRule;
    private getUrlsFromPattern;
    private loadPersistedCache;
    private persistCache;
}

/**
 * Debug Plugin - Advanced debugging and logging for A-Cube SDK
 * Provides comprehensive debugging tools and request/response logging
 */

interface DebugEvent {
    id: string;
    timestamp: number;
    type: 'request' | 'response' | 'error' | 'log';
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: any;
    duration?: number;
    stackTrace?: string;
    correlationId?: string;
}
interface DebugFilter {
    level?: ('debug' | 'info' | 'warn' | 'error')[];
    type?: ('request' | 'response' | 'error' | 'log')[];
    timeRange?: {
        start: number;
        end: number;
    };
    keyword?: string;
    correlationId?: string;
}
interface DebugSession {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    events: DebugEvent[];
    metadata: Record<string, any>;
}
declare class DebugPlugin extends BasePlugin {
    readonly manifest: PluginManifest;
    private events;
    private sessions;
    private activeSession?;
    private requestCorrelations;
    private maxEvents;
    private isEnabled;
    protected initialize(_context: PluginContext): Promise<void>;
    protected cleanup(_context: PluginContext): Promise<void>;
    protected processRequest(_context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1>;
    protected processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>>;
    protected handleError(_context: PluginContext, error: Error): Promise<Error>;
    /**
     * Start a debug session
     */
    startSession(name: string, metadata?: Record<string, any>): string;
    /**
     * End a debug session
     */
    endSession(sessionId: string): DebugSession | undefined;
    /**
     * Add custom debug event
     */
    addDebugLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void;
    /**
     * Get debug events with optional filtering
     */
    getEvents(filter?: DebugFilter): DebugEvent[];
    /**
     * Get debug session
     */
    getSession(sessionId: string): DebugSession | undefined;
    /**
     * Get all sessions
     */
    getSessions(): DebugSession[];
    /**
     * Export debug data
     */
    exportDebugData(sessionId?: string): {
        session?: DebugSession;
        events: DebugEvent[];
    };
    /**
     * Clear debug data
     */
    clearDebugData(sessionId?: string): void;
    /**
     * Get debug statistics
     */
    getDebugStats(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsByLevel: Record<string, number>;
        activeSessions: number;
        averageRequestDuration: number;
        errorRate: number;
    };
    private addEvent;
    private sanitizeUrl;
    private sanitizeHeaders;
    private sanitizeBody;
    private sanitizeResponseBody;
    private sanitizeObject;
    private setupGlobalErrorHandler;
    private loadPersistedEvents;
    private persistEvents;
}

/**
 * Performance Plugin - Monitor and optimize A-Cube SDK performance
 * Provides comprehensive performance tracking and optimization recommendations
 */

interface PerformanceMetric {
    id: string;
    timestamp: number;
    type: 'request' | 'memory' | 'bundle' | 'render' | 'custom';
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count' | 'percentage';
    category: 'network' | 'computation' | 'memory' | 'storage' | 'ui';
    metadata?: Record<string, any>;
    tags?: string[];
}
interface PerformanceAlert {
    id: string;
    timestamp: number;
    level: 'info' | 'warning' | 'critical';
    metric: string;
    threshold: number;
    actualValue: number;
    message: string;
    recommendation?: string;
}
interface PerformanceBudget {
    metric: string;
    warning: number;
    critical: number;
    unit: 'ms' | 'bytes' | 'count' | 'percentage';
    category: 'network' | 'computation' | 'memory' | 'storage' | 'ui';
}
interface PerformanceReport {
    period: {
        start: number;
        end: number;
    };
    metrics: {
        requests: {
            total: number;
            average: number;
            p50: number;
            p95: number;
            p99: number;
            slowest: PerformanceMetric[];
        };
        memory: {
            peak: number;
            average: number;
            trend: 'increasing' | 'decreasing' | 'stable';
        };
        budgets: {
            passed: number;
            warnings: number;
            critical: number;
        };
    };
    alerts: PerformanceAlert[];
    recommendations: string[];
}
declare class PerformancePlugin extends BasePlugin {
    readonly manifest: PluginManifest;
    private metrics;
    private alerts;
    private budgets;
    private requestStartTimes;
    private memoryMonitor?;
    private isEnabled;
    private maxMetrics;
    protected initialize(_context: PluginContext): Promise<void>;
    protected cleanup(_context: PluginContext): Promise<void>;
    protected processRequest(_context: PluginContext, options: RequestOptions$1): Promise<RequestOptions$1>;
    protected processResponse(_context: PluginContext, response: HttpResponse<any>): Promise<HttpResponse<any>>;
    protected handleError(_context: PluginContext, error: Error): Promise<Error>;
    /**
     * Record a custom performance metric
     */
    recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'> & Partial<Pick<PerformanceMetric, 'id' | 'timestamp'>>): void;
    /**
     * Set performance budgets
     */
    setBudgets(budgets: PerformanceBudget[]): void;
    /**
     * Get performance metrics with optional filtering
     */
    getMetrics(filter?: {
        type?: PerformanceMetric['type'][];
        category?: PerformanceMetric['category'][];
        timeRange?: {
            start: number;
            end: number;
        };
        name?: string;
        tags?: string[];
    }): PerformanceMetric[];
    /**
     * Get performance alerts
     */
    getAlerts(level?: PerformanceAlert['level']): PerformanceAlert[];
    /**
     * Generate performance report
     */
    generateReport(timeRangeMs?: number): PerformanceReport;
    /**
     * Clear performance data
     */
    clearData(olderThan?: number): void;
    /**
     * Get current performance summary
     */
    getPerformanceSummary(): {
        totalMetrics: number;
        activeAlerts: number;
        averageRequestTime: number;
        errorRate: number;
        memoryUsage: number;
    };
    private checkBudgets;
    private startMemoryMonitoring;
    private getDefaultBudgets;
    private calculateSize;
    private sanitizeUrl;
    private percentile;
    private calculateTrend;
    private generateRecommendations;
    private getBudgetRecommendation;
    private loadPersistedMetrics;
    private persistMetrics;
}

/**
 * Pre-commit Quality Gates for A-Cube SDK
 * Automated quality checks before code commits
 */
interface QualityGateConfig {
    enabled: boolean;
    failFast: boolean;
    parallel: boolean;
    timeoutMs: number;
    checks: {
        lint: QualityCheckConfig;
        format: QualityCheckConfig;
        typecheck: QualityCheckConfig;
        test: QualityCheckConfig;
        security: QualityCheckConfig;
        dependencies: QualityCheckConfig;
        commitMessage: QualityCheckConfig;
        fileSize: QualityCheckConfig;
    };
    notifications: {
        slack?: {
            webhook: string;
            channel: string;
        };
        email?: {
            recipients: string[];
            smtp: any;
        };
        teams?: {
            webhook: string;
        };
    };
}
interface QualityCheckConfig {
    enabled: boolean;
    severity: 'error' | 'warning' | 'info';
    autofix: boolean;
    timeout: number;
    rules?: Record<string, any>;
}
interface QualityCheckResult {
    check: string;
    status: 'pass' | 'fail' | 'warning' | 'skipped';
    duration: number;
    details: {
        filesChecked: number;
        issues: QualityIssue[];
        autoFixed: number;
        warnings: string[];
    };
    command?: string;
    output?: string;
}
interface QualityIssue {
    file: string;
    line?: number;
    column?: number;
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    fixable: boolean;
    category: 'lint' | 'format' | 'type' | 'security' | 'dependency' | 'style';
}
interface CommitValidation {
    isValid: boolean;
    score: number;
    issues: QualityIssue[];
    suggestions: string[];
    bypassable: boolean;
}
declare class PreCommitManager {
    private config;
    private hooks;
    private cache;
    constructor(config?: Partial<QualityGateConfig>);
    /**
     * Register custom quality hook
     */
    registerHook(name: string, hook: QualityHook): void;
    /**
     * Run all pre-commit checks
     */
    runPreCommitChecks(stagedFiles: string[]): Promise<CommitValidation>;
    /**
     * Auto-fix issues where possible
     */
    autoFixIssues(stagedFiles: string[]): Promise<{
        fixed: number;
        remaining: QualityIssue[];
    }>;
    /**
     * Validate commit message format
     */
    validateCommitMessage(message: string): QualityCheckResult;
    /**
     * Check file sizes
     */
    checkFileSizes(files: string[]): Promise<QualityCheckResult>;
    /**
     * Generate quality report
     */
    generateQualityReport(results: QualityCheckResult[]): {
        summary: {
            totalChecks: number;
            passed: number;
            failed: number;
            warnings: number;
            score: number;
        };
        details: QualityCheckResult[];
        recommendations: string[];
    };
    private runQualityCheck;
    private calculateCommitValidation;
    private cacheResults;
    private sendNotifications;
    private formatSlackMessage;
    private sendSlackNotification;
    private logQualitySummary;
    private initializeDefaultHooks;
}
interface QualityHook {
    execute(files: string[], config: QualityCheckConfig): Promise<QualityCheckResult>;
    autofix?(files: string[], config: QualityCheckConfig): Promise<{
        fixed: number;
        remaining: QualityIssue[];
    }>;
}

/**
 * CI/CD Pipeline Management for A-Cube SDK
 * Automated build, test, and deployment workflows
 */
interface CICDConfig {
    enabled: boolean;
    provider: 'github' | 'gitlab' | 'azure' | 'jenkins' | 'custom';
    environment: 'development' | 'staging' | 'production';
    pipelines: {
        build: PipelineConfig;
        test: PipelineConfig;
        security: PipelineConfig;
        deploy: PipelineConfig;
        release: PipelineConfig;
    };
    notifications: {
        slack?: {
            webhook: string;
            channels: string[];
        };
        email?: {
            recipients: string[];
            templates: Record<string, string>;
        };
        teams?: {
            webhook: string;
        };
    };
    artifacts: {
        retention: number;
        storage: 'local' | 's3' | 'azure' | 'gcs';
        encryption: boolean;
    };
}
interface PipelineConfig {
    enabled: boolean;
    trigger: 'push' | 'pr' | 'schedule' | 'manual';
    schedule?: string;
    timeout: number;
    retries: number;
    parallel: boolean;
    steps: PipelineStep[];
    conditions?: PipelineCondition[];
}
interface PipelineStep {
    name: string;
    type: 'command' | 'script' | 'action' | 'docker' | 'deploy';
    command?: string;
    script?: string;
    action?: string;
    dockerfile?: string;
    environment?: Record<string, string>;
    workingDirectory?: string;
    continueOnError: boolean;
    timeout: number;
    retries: number;
    cache?: {
        key: string;
        paths: string[];
    };
}
interface PipelineCondition {
    type: 'branch' | 'tag' | 'file_changed' | 'env_var' | 'custom';
    pattern: string;
    exclude?: string[];
}
interface PipelineRun {
    id: string;
    pipelineType: string;
    status: 'pending' | 'running' | 'success' | 'failure' | 'cancelled';
    trigger: string;
    branch: string;
    commit: string;
    startedAt: number;
    completedAt?: number;
    duration?: number;
    steps: PipelineStepResult[];
    artifacts: ArtifactInfo[];
    metrics: PipelineMetrics;
}
interface PipelineStepResult {
    name: string;
    status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
    startedAt: number;
    completedAt?: number;
    duration?: number;
    exitCode?: number;
    output?: string;
    error?: string;
    retryCount: number;
}
interface ArtifactInfo {
    name: string;
    path: string;
    size: number;
    type: 'build' | 'test' | 'coverage' | 'security' | 'docs';
    url?: string;
    expiresAt: number;
}
interface PipelineMetrics {
    buildTime: number;
    testCoverage: number;
    codeQuality: number;
    securityScore: number;
    bundleSize: number;
    performance: {
        loadTime: number;
        memoryUsage: number;
        cpuUsage: number;
    };
}
interface DeploymentConfig {
    environment: string;
    strategy: 'rolling' | 'blue_green' | 'canary' | 'recreate';
    replicas: number;
    healthChecks: {
        enabled: boolean;
        path: string;
        timeout: number;
        interval: number;
        retries: number;
    };
    rollback: {
        enabled: boolean;
        triggers: string[];
        timeout: number;
    };
    secrets: Record<string, string>;
}
declare class CICDManager {
    private config;
    private runs;
    private deployments;
    constructor(config?: Partial<CICDConfig>);
    /**
     * Trigger pipeline execution
     */
    triggerPipeline(type: keyof CICDConfig['pipelines'], context: {
        branch: string;
        commit: string;
        trigger: string;
        author?: string;
        message?: string;
    }): Promise<string>;
    /**
     * Get pipeline run status
     */
    getPipelineRun(runId: string): PipelineRun | undefined;
    /**
     * List pipeline runs with filtering
     */
    listPipelineRuns(filter?: {
        type?: string;
        status?: string;
        branch?: string;
        since?: number;
        limit?: number;
    }): PipelineRun[];
    /**
     * Cancel running pipeline
     */
    cancelPipeline(runId: string): Promise<void>;
    /**
     * Deploy to environment
     */
    deployToEnvironment(environment: string, deploymentConfig: DeploymentConfig, artifacts: ArtifactInfo[]): Promise<string>;
    /**
     * Generate CI/CD workflow files
     */
    generateWorkflowFiles(): Record<string, string>;
    /**
     * Get pipeline metrics and analytics
     */
    getPipelineMetrics(timeRange?: number): {
        summary: {
            totalRuns: number;
            successRate: number;
            averageDuration: number;
            failureReasons: Record<string, number>;
        };
        trends: {
            buildTimes: Array<{
                date: number;
                duration: number;
            }>;
            successRates: Array<{
                date: number;
                rate: number;
            }>;
            deploymentFrequency: Array<{
                date: number;
                count: number;
            }>;
        };
        quality: {
            testCoverage: number;
            codeQuality: number;
            securityScore: number;
        };
    };
    private executePipeline;
    private executeStep;
    private executeCommand;
    private executeScript;
    private executeDocker;
    private evaluateConditions;
    private validateDeployment;
    private executeDeploymentStrategy;
    private executeRollingDeployment;
    private executeBlueGreenDeployment;
    private executeCanaryDeployment;
    private runHealthChecks;
    private sendNotification;
    private generateGitHubWorkflow;
    private generateGitHubReleaseWorkflow;
    private generateGitLabWorkflow;
    private generateAzureWorkflow;
    private getDefaultBuildPipeline;
    private getDefaultTestPipeline;
    private getDefaultSecurityPipeline;
    private getDefaultDeployPipeline;
    private getDefaultReleasePipeline;
    private initializeMetrics;
    private generateRunId;
    private extractFailureReason;
    private generateBuildTimeTrend;
    private generateSuccessRateTrend;
    private generateDeploymentFrequency;
    private calculateAverageMetric;
}

/**
 * Dependency Management for A-Cube SDK
 * Automated dependency updates, security scanning, and license compliance
 */
interface DependencyConfig {
    enabled: boolean;
    scanSchedule: string;
    autoUpdate: {
        enabled: boolean;
        policy: 'patch' | 'minor' | 'major' | 'custom';
        excludePatterns: string[];
        requireApproval: boolean;
    };
    security: {
        scanVulnerabilities: boolean;
        allowedSeverities: ('low' | 'moderate' | 'high' | 'critical')[];
        autoFixSecurityIssues: boolean;
        reportingThreshold: 'low' | 'moderate' | 'high' | 'critical';
    };
    license: {
        scanLicenses: boolean;
        allowedLicenses: string[];
        blockedLicenses: string[];
        requireApproval: string[];
    };
    monitoring: {
        trackUsage: boolean;
        detectUnused: boolean;
        bundleSizeTracking: boolean;
        performanceImpact: boolean;
    };
}
interface DependencyInfo {
    name: string;
    version: string;
    type: 'dependency' | 'devDependency' | 'peerDependency' | 'optionalDependency';
    license: string;
    repository?: string;
    homepage?: string;
    description?: string;
    size: {
        bundled: number;
        unpacked: number;
    };
    usage: {
        imported: boolean;
        lastUsed: number;
        importCount: number;
        files: string[];
    };
    security: {
        vulnerabilities: SecurityVulnerability[];
        riskScore: number;
        lastScanned: number;
    };
    updates: {
        current: string;
        latest: string;
        wanted: string;
        type: 'patch' | 'minor' | 'major';
        breaking: boolean;
        changelog?: string;
    };
}
interface SecurityVulnerability {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    cvss: number;
    cwe: string[];
    references: string[];
    vulnerableVersions: string;
    patchedVersions: string;
    publishedAt: number;
    updatedAt: number;
}
interface DependencyReport {
    timestamp: number;
    summary: {
        total: number;
        outdated: number;
        vulnerable: number;
        unused: number;
        licenseIssues: number;
    };
    dependencies: DependencyInfo[];
    vulnerabilities: SecurityVulnerability[];
    recommendations: DependencyRecommendation[];
    metrics: {
        bundleSize: number;
        loadTime: number;
        securityScore: number;
        licenseCompliance: number;
    };
}
interface DependencyRecommendation {
    type: 'update' | 'remove' | 'replace' | 'add' | 'security_fix';
    package: string;
    current?: string;
    recommended?: string;
    reason: string;
    impact: 'low' | 'medium' | 'high';
    breaking: boolean;
    effort: 'low' | 'medium' | 'high';
    benefits: string[];
    risks: string[];
}
interface UpdatePlan {
    id: string;
    createdAt: number;
    updates: Array<{
        package: string;
        from: string;
        to: string;
        type: 'patch' | 'minor' | 'major';
        breaking: boolean;
        reason: string;
    }>;
    strategy: 'all_at_once' | 'incremental' | 'critical_first';
    testingRequired: boolean;
    approvalRequired: boolean;
    estimatedRisk: 'low' | 'medium' | 'high';
}
declare class DependencyManager {
    private config;
    private vulnerabilities;
    private updatePlans;
    private scanHistory;
    constructor(config?: Partial<DependencyConfig>);
    /**
     * Scan all dependencies for updates, vulnerabilities, and compliance
     */
    scanDependencies(): Promise<DependencyReport>;
    /**
     * Create update plan for dependencies
     */
    createUpdatePlan(packages?: string[], strategy?: UpdatePlan['strategy']): Promise<string>;
    /**
     * Execute update plan
     */
    executeUpdatePlan(planId: string): Promise<{
        success: boolean;
        updated: string[];
        failed: Array<{
            package: string;
            error: string;
        }>;
    }>;
    /**
     * Fix security vulnerabilities
     */
    fixSecurityVulnerabilities(autoApprove?: boolean): Promise<{
        fixed: string[];
        failed: Array<{
            package: string;
            error: string;
        }>;
        requiresManualReview: string[];
    }>;
    /**
     * Remove unused dependencies
     */
    removeUnusedDependencies(): Promise<{
        removed: string[];
        kept: Array<{
            package: string;
            reason: string;
        }>;
    }>;
    /**
     * Get dependency metrics and trends
     */
    getDependencyMetrics(): {
        current: DependencyReport['metrics'];
        trends: {
            bundleSize: Array<{
                date: number;
                size: number;
            }>;
            vulnerabilities: Array<{
                date: number;
                count: number;
            }>;
            outdated: Array<{
                date: number;
                count: number;
            }>;
        };
    };
    private loadPackageInfo;
    private scanForUpdates;
    private scanVulnerabilities;
    private scanLicenses;
    private analyzeUsage;
    private generateRecommendations;
    private mergeDependencyInfo;
    private calculateMetrics;
    private hasLicenseIssue;
    private getUpdateReason;
    private calculatePlanRisk;
    private updatePackage;
    private removePackage;
    private findPatchedVersion;
    private shouldKeepPackage;
    private getKeepReason;
    private generatePlanId;
    private logScanSummary;
}

/**
 * Quality Automation System for A-Cube SDK
 * Complete suite of quality gates, CI/CD, and dependency management
 */

/**
 * Comprehensive Quality Manager
 * Integrates all quality automation components into a unified interface
 */
declare class QualityManager {
    private preCommit;
    private cicd;
    private dependencies;
    constructor(config?: {
        preCommit?: Partial<QualityGateConfig>;
        cicd?: Partial<CICDConfig>;
        dependencies?: Partial<DependencyConfig>;
    });
    /**
     * Get pre-commit manager
     */
    getPreCommit(): PreCommitManager;
    /**
     * Get CI/CD manager
     */
    getCICD(): CICDManager;
    /**
     * Get dependency manager
     */
    getDependencies(): DependencyManager;
    /**
     * Initialize quality automation with default configurations
     */
    initialize(): Promise<{
        preCommitEnabled: boolean;
        cicdEnabled: boolean;
        dependenciesEnabled: boolean;
        workflowFiles: Record<string, string>;
    }>;
    /**
     * Run complete quality check for commit
     */
    runQualityCheck(stagedFiles: string[], commitMessage: string): Promise<{
        validation: CommitValidation;
        dependencyReport?: DependencyReport;
        recommendations: string[];
    }>;
    /**
     * Execute full CI/CD pipeline
     */
    runFullPipeline(context: {
        branch: string;
        commit: string;
        trigger: string;
    }): Promise<{
        buildRun?: string;
        testRun?: string;
        securityRun?: string;
        deployRun?: string;
    }>;
    /**
     * Perform automated maintenance
     */
    performMaintenance(): Promise<{
        dependencyUpdates: {
            planId?: string;
            updated: string[];
            failed: Array<{
                package: string;
                error: string;
            }>;
        };
        securityFixes: {
            fixed: string[];
            failed: Array<{
                package: string;
                error: string;
            }>;
            requiresManualReview: string[];
        };
        cleanup: {
            removed: string[];
            kept: Array<{
                package: string;
                reason: string;
            }>;
        };
    }>;
    /**
     * Generate comprehensive quality report
     */
    generateQualityReport(): Promise<{
        overview: {
            qualityScore: number;
            securityScore: number;
            maintenanceScore: number;
            recommendations: string[];
        };
        preCommit: {
            checksEnabled: number;
            lastRunTime?: number;
            averageRunTime: number;
        };
        cicd: {
            pipelineRuns: number;
            successRate: number;
            averageBuildTime: number;
            deploymentFrequency: number;
        };
        dependencies: {
            total: number;
            outdated: number;
            vulnerable: number;
            unused: number;
            bundleSize: number;
        };
        trends: {
            qualityTrend: 'improving' | 'stable' | 'declining';
            securityTrend: 'improving' | 'stable' | 'declining';
            performanceTrend: 'improving' | 'stable' | 'declining';
        };
    }>;
    /**
     * Setup development environment with quality tools
     */
    setupDevelopmentEnvironment(): Promise<{
        configFiles: Record<string, string>;
        scripts: Record<string, string>;
        devDependencies: string[];
    }>;
    private calculateQualityScore;
    private calculateMaintenanceScore;
    private generateQualityRecommendations;
    private calculateTrend;
    private generatePreCommitHook;
    private generateESLintConfig;
    private generatePrettierConfig;
    private generateJestConfig;
    private generateGitIgnore;
    private generateCommitLintConfig;
}

/**
 * Validation Middleware for OpenAPI Resources
 * Integrates runtime validation with resource operations
 */

/**
 * Validation middleware configuration
 */
interface ValidationMiddlewareConfig {
    enabled: boolean;
    strict: boolean;
    enableWarnings: boolean;
    failOnWarnings: boolean;
    customSchemas?: Record<string, SchemaDefinition>;
    skipValidation?: string[];
}
/**
 * Configuration utilities
 */
declare namespace ValidationConfig {
    /**
     * Create strict validation configuration
     */
    function strictConfig(): ValidationMiddlewareConfig;
    /**
     * Create lenient validation configuration
     */
    function lenientConfig(): ValidationMiddlewareConfig;
    /**
     * Create development validation configuration
     */
    function developmentConfig(): ValidationMiddlewareConfig;
    /**
     * Create production validation configuration
     */
    function productionConfig(): ValidationMiddlewareConfig;
    /**
     * Disable validation (for testing or development)
     */
    function disabledConfig(): ValidationMiddlewareConfig;
}

/**
 * Runtime Validation System
 * Enterprise-grade validation framework with Zod integration support
 *
 * Features:
 * - Schema-based validation for OpenAPI types
 * - Branded type validation
 * - Italian fiscal compliance rules
 * - Configurable validation levels
 * - Detailed error reporting
 */
interface ValidationResult {
    isValid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}
interface ValidationIssue {
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning';
    value?: unknown;
}
interface SchemaDefinition {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'branded';
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    enum?: readonly string[];
    properties?: Record<string, SchemaDefinition>;
    items?: SchemaDefinition;
    brandValidator?: (value: unknown) => boolean;
    customValidation?: (value: unknown) => ValidationIssue[];
}

/**
 * PWA (Progressive Web App) Module for A-Cube E-Receipt SDK
 *
 * Provides comprehensive PWA functionality including:
 * - Service worker management
 * - Advanced caching strategies
 * - Offline-first functionality
 * - App install prompts
 * - Push notifications
 * - Background sync
 * - Manifest generation
 *
 * @example Basic Usage
 * ```typescript
 * import { PWAManager, ManifestGenerator } from '@a-cube-io/ereceipts-js-sdk/pwa';
 *
 * // Initialize PWA manager
 * const pwa = new PWAManager({
 *   autoRegister: true,
 *   enableInstallPrompts: true,
 * });
 *
 * // Generate manifest
 * const manifestGenerator = new ManifestGenerator({
 *   name: 'My E-Receipt App',
 *   themeColor: '#1976d2',
 * });
 *
 * const manifest = manifestGenerator.generateManifestJSON();
 * ```
 *
 * @example Advanced PWA Setup
 * ```typescript
 * import { PWAManager, ManifestGenerator } from '@a-cube-io/ereceipts-js-sdk/pwa';
 *
 * const pwa = new PWAManager({
 *   serviceWorkerPath: '/custom-sw.js',
 *   cacheStrategy: {
 *     apiCacheDuration: 10 * 60 * 1000, // 10 minutes
 *     staleWhileRevalidate: true,
 *   },
 *   pushNotifications: {
 *     enabled: true,
 *     vapidPublicKey: 'your-vapid-key',
 *   },
 * });
 *
 * // Listen for PWA events
 * pwa.on('sw:registered', ({ registration }) => {
 *   console.log('Service worker registered:', registration);
 * });
 *
 * pwa.on('install:available', ({ prompt }) => {
 *   // Show custom install UI
 *   showInstallButton();
 * });
 *
 * pwa.on('offline:synced', ({ request, id }) => {
 *   console.log('Offline request synced:', request);
 * });
 * ```
 */

interface ServiceWorkerMessage {
    type: string;
    data?: any;
}
interface CacheUpdateEvent {
    cacheName: string;
    size: number;
    lastUpdated?: Date;
}
interface OfflineQueueEvent {
    request: string;
    id: string;
    timestamp?: number;
}
/**
 * PWA utility functions
 */
declare const PWAUtils: {
    /**
     * Check if the app is running in standalone mode (installed as PWA)
     */
    isStandalone(): boolean;
    /**
     * Check if PWA features are supported
     */
    isPWASupported(): boolean;
    /**
     * Check if background sync is supported
     */
    isBackgroundSyncSupported(): boolean;
    /**
     * Check if push notifications are supported
     */
    isPushNotificationSupported(): boolean;
    /**
     * Check if periodic background sync is supported
     */
    isPeriodicSyncSupported(): boolean;
    /**
     * Get display mode
     */
    getDisplayMode(): "browser" | "standalone" | "minimal-ui" | "fullscreen";
    /**
     * Get network status
     */
    getNetworkStatus(): {
        online: boolean;
        effectiveType?: "2g" | "3g" | "4g" | "slow-2g";
        downlink?: number;
        rtt?: number;
    };
    /**
     * Estimate cache storage quota
     */
    getStorageEstimate(): Promise<{
        quota?: number;
        usage?: number;
        usagePercentage?: number;
    }>;
    /**
     * Convert bytes to human readable format
     */
    formatBytes(bytes: number, decimals?: number): string;
    /**
     * Create a debounced function
     */
    debounce<T extends (...args: any[]) => any>(func: T, wait: number, immediate?: boolean): (...args: Parameters<T>) => void;
};
/**
 * PWA constants
 */
declare const PWA_CONSTANTS: {
    readonly STATIC_CACHE_PREFIX: "acube-static-";
    readonly API_CACHE_PREFIX: "acube-api-";
    readonly RUNTIME_CACHE_PREFIX: "acube-runtime-";
    readonly DEFAULT_API_CACHE_DURATION: number;
    readonly DEFAULT_STATIC_CACHE_DURATION: number;
    readonly DEFAULT_RUNTIME_CACHE_DURATION: number;
    readonly DEFAULT_QUEUE_NAME: "acube-offline-queue";
    readonly DEFAULT_MAX_QUEUE_SIZE: 1000;
    readonly DEFAULT_MAX_RETENTION_TIME: number;
    readonly DEFAULT_MIN_SYNC_INTERVAL: number;
    readonly DEFAULT_THEME_COLOR: "#1976d2";
    readonly DEFAULT_BACKGROUND_COLOR: "#ffffff";
    readonly DEFAULT_DISPLAY_MODE: "standalone";
    readonly DEFAULT_ORIENTATION: "portrait";
    readonly SW_EVENTS: {
        readonly REGISTERED: "sw:registered";
        readonly UPDATED: "sw:updated";
        readonly ERROR: "sw:error";
        readonly INSTALL_AVAILABLE: "install:available";
        readonly INSTALL_COMPLETED: "install:completed";
        readonly CACHE_UPDATED: "cache:updated";
        readonly OFFLINE_QUEUED: "offline:queued";
        readonly OFFLINE_SYNCED: "offline:synced";
        readonly PUSH_RECEIVED: "push:received";
        readonly SYNC_COMPLETED: "sync:completed";
    };
    readonly ERECEIPT_CATEGORIES: readonly ["business", "finance", "productivity", "utilities"];
    readonly RECOMMENDED_ICON_SIZES: readonly ["72x72", "96x96", "128x128", "144x144", "152x152", "192x192", "384x384", "512x512"];
    readonly MASKABLE_ICON_SIZES: readonly ["192x192", "512x512"];
};

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

export { type ACubeContextValue, ACubeProvider, type ACubeProviderProps, ACubeSDK, type ACubeSDKConfig, ACubeSDKError, type ACubeSDKEvent, AGGRESSIVE_RETRY_CONFIG, API_VERSION, AUTH_HTTP_CONFIG, type AccessControlConfig, AccessControlManager, type Amount, AnalyticsPlugin, type AuditInfo, AuditPlugin, type AuthContextValue, type AuthError, AuthProvider, type AuthProviderProps, type AuthState, AuthStatus, type AuthStatusProps, type AuthUser, AuthenticationError, type AuthenticationEvent, AuthenticationMiddleware, AuthorizationError, BaseOpenAPIResource, BasePlugin, type BaseResourceConfig, type BatchOperation, BatchProcessor, CONSERVATIVE_RETRY_CONFIG, type CacheInfo, CachePlugin, type CacheUpdateEvent, CashRegisterEndpoints, type CashRegisterId, CashRegistersResource as CashRegisters, CashRegistersResource, type CashierCreatedEvent, type CashierDeletedEvent, CashierEndpoints, type CashierId, CashiersResource as Cashiers, CashiersResource, CircuitBreaker, type CircuitBreakerConfig$1 as CircuitBreakerConfig, CircuitBreakerError, type CircuitBreakerMetrics, CircuitBreakerState$1 as CircuitBreakerState, type ClientEvent, ConfigurationError, type ConflictResolutionStrategy$1 as ConflictResolutionStrategy, ConflictResolverManager, type ConnectionInfo, ContentTypeMiddleware, DEFAULT_HTTP_CONFIG, DEFAULT_RETRY_CONFIG, DEFAULT_SDK_CONFIG, DebugPlugin, type DependencyConfig, DependencyManager, type DocumentNumber, type EncryptionConfig, type EncryptionKeyManager, type EncryptionMetadata, type EndpointDefinition, type EnhancedOfflineOptions, type EnhancedOfflineResult, EnterpriseQueueManager, type EnvironmentInfo, type ErrorEvent, type EventTypeMap, FiscalAuditManager, type FiscalConfig, FiscalError, type FiscalId, GDPRComplianceManager, type GDPRConfig, HttpClient, type HttpClientConfig, type HttpResponse, IndexedDBAdapter, type KeyRotationConfig, LocalStorageAdapter, LoggingMiddleware, type LoginCredentials, LoginForm, type LoginFormProps, type LogoutOptions, ManifestGenerator, type MerchantCreatedEvent, MerchantEndpoints, type MerchantId, type MerchantUpdatedEvent, MerchantsResource as Merchants, MerchantsResource, type Middleware, MiddlewareStack, NetworkError, NotFoundError, type OAuth2TokenResponse, type OfflineQueueEvent, type RequestOptions as OpenAPIRequestOptions, type PEMActivatedEvent, PEMEndpoints, type PEMId, type PEMStatusChangedEvent, PEMsResource as PEMs, PEMsResource, type PWAEvents, PWAManager, type PWAManagerConfig, type PWAManifestConfig, PWAUtils, PWA_CONSTANTS, PerformanceMiddleware, PerformancePlugin, type Permission, type PermissionCheck, PermissionGate, type PermissionGateProps, type PermissionResult, type PlatformCapabilities, type PlatformType, type PluginConfig, type PluginContext, PluginManager, type PointOfSaleId, PointOfSalesResource as PointOfSales, PointOfSalesEndpoints, PointOfSalesResource, PriorityQueue, ProtectedRoute, type ProtectedRouteProps, QualityManager, type Quantity, type QueryOptions$1 as QueryOptions, QueueAnalytics, type QueueConfig, type QueueItem, type QueueOperationType, type QueuePriority, type QueueStats, RateLimitError, RateLimitingMiddleware, type ReceiptCreatedEvent, ReceiptEndpoints, type ReceiptId, type ReceiptReturnedEvent, type ReceiptTransmittedEvent, type ReceiptVoidedEvent, ReceiptsResource as Receipts, ReceiptsResource, type RequestContext, RequestIdMiddleware, type RequestOptions$1 as RequestOptions, type ResponseContext, type RetryAttempt$1 as RetryAttempt, type RetryConfig$1 as RetryConfig, RetryHandler, RetryManager, type RetryMetrics$1 as RetryMetrics, type Role, RoleSwitcher, type RoleSwitcherProps, SDK_VERSION, STORAGE_NAMESPACES, type SerialNumber, type ServiceWorkerMessage, type SessionInfo, type SignatureConfig, type SimpleUserRole, type StorageAdapter, StorageCapacityError, StorageConnectionError, type StorageEncryptionConfig, StorageEncryptionError, StorageEncryptionService, type StorageEntry, StorageError, StorageFactory, type StorageFactoryConfig, type StorageKey, type StorageOptions, type StorageStats, type StorageTransaction, StorageTransactionError, type StorageValue, type StoredAuthData, type SyncConflict, type SyncOptions, type SyncResult, type UnifiedStorage, type User, UserAgentMiddleware, UserProfile, type UserProfileProps, UserRole, type VATRate, ValidationConfig, type ValidationContext, ValidationError, type ValidationIssue, type ValidationResult, type ValidationViolation, type WebAppManifest, type WebhookEvent, createACubeSDK, createAmount, createCashRegisterId, createCashierId, createCompatibilityStorage, createDocumentNumber, createEncryptionService, createErrorFromResponse, createFiscalId, createHighPerformanceStorage, createMerchantId, createMinimalEncryptionService, createPEMId, createPointOfSaleId, createQuantity, createReceiptId, createSecureEncryptionService, createSecureStorage, createSerialNumber, createStorage, createStorageKey, createVATRate, ACubeSDK as default, getEnvironmentInfo, getPerformanceTier, getPlatform, getRecommendedStorageAdapter, hasCapability, initializeDevelopmentSDK, initializeProductionSDK, initializeSandboxSDK, isAmount, isCashierId, isFiscalId, isMerchantId, isPEMId, isPointOfSaleId, isQuantity, isReceiptId, isSerialNumber, platformDetector, storageFactory, useACube, useACubeCache, useACubeMutation, useACubeNetworkManager, useACubeNetworkStatus, useACubeOffline, useACubeQuery, useACubeQueueManager, useACubeSDK, useACubeStorage, useACubeSubscription, useACubeSyncEngine, useAuth, useAuthAvailable, useAuthContext, useEnhancedACubeOffline, useLogin, useLogout, usePermissions, useRequireAuth, useRequireRole, useRoles, useSession, useUser };
