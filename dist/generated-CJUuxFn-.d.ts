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
type Amount = Brand<string, 'Amount'>;

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

export { type Amount as A, BaseOpenAPIResource as B, type CashierId as C, type FiscalId as F, HttpClient as H, type MerchantId as M, type PEMId as P, type ReceiptId as R, type SerialNumber as S, type CashRegisterId as a, type components as c };
