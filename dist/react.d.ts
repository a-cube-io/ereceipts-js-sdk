import React, { ReactNode } from 'react';
import { AxiosRequestConfig, AxiosInstance } from 'axios';

/**
 * Core SDK types
 */
type Environment = 'production' | 'development' | 'sandbox';
/**
 * SDK Configuration
 */
interface SDKConfig {
    environment: Environment;
    apiUrl?: string;
    authUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    debug?: boolean;
    customHeaders?: Record<string, string>;
}
/**
 * Authentication credentials
 */
interface AuthCredentials {
    email: string;
    password: string;
}
/**
 * User information
 */
interface User {
    id: string;
    email: string;
    username: string;
    roles: Record<string, string[]>;
    fid: string;
    pid: string | null;
}
/**
 * SDK Error types
 */
type SDKError = 'NETWORK_ERROR' | 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND_ERROR' | 'FORBIDDEN_ERROR' | 'UNKNOWN_ERROR';
/**
 * SDK Exception class
 */
declare class ACubeSDKError extends Error {
    type: SDKError;
    originalError?: any | undefined;
    statusCode?: number | undefined;
    constructor(type: SDKError, message: string, originalError?: any | undefined, statusCode?: number | undefined);
}

/**
 * SDK Configuration manager
 */
declare class ConfigManager {
    private config;
    constructor(userConfig: SDKConfig);
    private mergeConfig;
    private getDefaultApiUrl;
    private getDefaultAuthUrl;
    /**
     * Get the current configuration
     */
    getConfig(): Required<SDKConfig>;
    /**
     * Get API URL
     */
    getApiUrl(): string;
    /**
     * Get Auth URL
     */
    getAuthUrl(): string;
    /**
     * Get environment
     */
    getEnvironment(): Environment;
    /**
     * Check if debug mode is enabled
     */
    isDebugEnabled(): boolean;
    /**
     * Get timeout in milliseconds
     */
    getTimeout(): number;
    /**
     * Get retry attempts
     */
    getRetryAttempts(): number;
    /**
     * Get custom headers
     */
    getCustomHeaders(): Record<string, string>;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<SDKConfig>): void;
}

/**
 * Storage adapter interface for cross-platform storage operations
 */
interface IStorage {
    /**
     * Get a value from storage
     * @param key The storage key
     * @returns The stored value or null if not found
     */
    get(key: string): Promise<string | null>;
    /**
     * Set a value in storage
     * @param key The storage key
     * @param value The value to store
     */
    set(key: string, value: string): Promise<void>;
    /**
     * Remove a value from storage
     * @param key The storage key
     */
    remove(key: string): Promise<void>;
    /**
     * Clear all values from storage
     */
    clear(): Promise<void>;
    /**
     * Get all keys in storage
     * @returns Array of storage keys
     */
    getAllKeys(): Promise<string[]>;
    /**
     * Get multiple values from storage
     * @param keys Array of storage keys
     * @returns Object with key-value pairs
     */
    multiGet(keys: string[]): Promise<Record<string, string | null>>;
    /**
     * Set multiple values in storage
     * @param items Object with key-value pairs
     */
    multiSet(items: Record<string, string>): Promise<void>;
    /**
     * Remove multiple values from storage
     * @param keys Array of storage keys
     */
    multiRemove(keys: string[]): Promise<void>;
}

/**
 * Secure storage adapter interface for sensitive data like tokens
 * Extends IStorage with the same interface but different implementations
 * should use platform-specific secure storage mechanisms
 */
interface ISecureStorage extends IStorage {
    /**
     * Check if secure storage is available on the platform
     * @returns true if secure storage is available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Get the security level of the storage
     * @returns Security level description
     */
    getSecurityLevel(): Promise<string>;
}

/**
 * Network monitor adapter interface for cross-platform network status
 */
interface INetworkMonitor {
    /**
     * Check if the device is currently online
     * @returns true if online, false if offline
     */
    isOnline(): boolean;
    /**
     * Subscribe to network status changes
     * @param callback Function to call when network status changes
     * @returns Cleanup function to unsubscribe
     */
    onStatusChange(callback: (online: boolean) => void): () => void;
    /**
     * Get detailed network information (optional)
     * @returns Network information object or null
     */
    getNetworkInfo(): Promise<NetworkInfo | null>;
}
/**
 * Detailed network information
 */
interface NetworkInfo {
    type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
    effectiveType?: '2g' | '3g' | '4g' | '5g';
    downlink?: number;
    rtt?: number;
}

/**
 * Platform adapters collection
 */
interface PlatformAdapters {
    storage: IStorage;
    secureStorage: ISecureStorage;
    networkMonitor: INetworkMonitor;
}

/**
 * Generated API types from OpenAPI spec
 */
interface Page<T> {
    members: T[];
    total?: number;
    page?: number;
    size?: number;
    pages?: number;
}
interface CashierCreateInput {
    email: string;
    password: string;
}
interface CashierOutput {
    id: number;
    email: string;
}
type PEMStatus = 'NEW' | 'REGISTERED' | 'ACTIVE' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
interface Address {
    street_address: string;
    zip_code: string;
    city: string;
    province: string;
}
interface PointOfSaleOutput {
    serial_number: string;
    status: PEMStatus;
    address: Address;
}
interface PointOfSaleDetailedOutput {
    serial_number: string;
    status: PEMStatus;
    address: Address;
    registration_key?: string;
}
interface ActivationRequest {
    registration_key: string;
}
interface PEMStatusOfflineRequest {
    timestamp: string;
    reason: string;
}
type ReceiptType = 'sale' | 'return' | 'void';
type GoodOrService = 'B' | 'S';
type VatRateCode = '4' | '5' | '10' | '22' | '2' | '6.4' | '7' | '7.3' | '7.5' | '7.65' | '7.95' | '8.3' | '8.5' | '8.8' | '9.5' | '12.3' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6';
interface ReceiptItem {
    good_or_service?: GoodOrService;
    quantity: string;
    description: string;
    unit_price: string;
    vat_rate_code?: VatRateCode;
    simplified_vat_allocation?: boolean;
    discount?: string;
    is_down_payment_or_voucher_redemption?: boolean;
    complimentary?: boolean;
}
interface ReceiptInput {
    items: ReceiptItem[];
    customer_tax_code?: string;
    customer_lottery_code?: string;
    discount?: string;
    invoice_issuing?: boolean;
    uncollected_dcr_to_ssn?: boolean;
    services_uncollected_amount?: string;
    goods_uncollected_amount?: string;
    cash_payment_amount?: string;
    electronic_payment_amount?: string;
    ticket_restaurant_payment_amount?: string;
    ticket_restaurant_quantity?: number;
}
interface ReceiptOutput {
    uuid: string;
    type: ReceiptType;
    customer_lottery_code?: string;
    created_at: string;
    total_amount: string;
    document_number?: string;
    document_datetime?: string;
}
interface ReceiptDetailsOutput {
    uuid: string;
    type: ReceiptType;
    customer_lottery_code?: string;
    created_at: string;
    total_amount: string;
    document_number?: string;
    document_datetime?: string;
    fiscal_id: string;
    total_taxable_amount: string;
    total_uncollected_amount: string;
    deductible_amount: string;
    total_vat_amount: string;
    total_discount: string;
    total_gross_discount: string;
    discount: string;
    items?: ReceiptItem[];
}
interface ReceiptReturnOrVoidViaPEMInput {
    pem_id?: string;
    items: ReceiptItem[];
    document_number: string;
    document_date?: string;
    lottery_code?: string;
}
type ReceiptProofType = 'POS' | 'VR' | 'ND';
interface ReceiptReturnOrVoidWithProofInput {
    items: ReceiptItem[];
    proof: ReceiptProofType;
    document_datetime: string;
}
interface CashRegisterCreate {
    pem_serial_number: string;
    name: string;
}
interface CashRegisterBasicOutput {
    id: string;
    pem_serial_number: string;
    name: string;
}
interface CashRegisterDetailedOutput {
    id: string;
    pem_serial_number: string;
    name: string;
    mtls_certificate: string;
    private_key: string;
}
interface MerchantOutput {
    uuid: string;
    fiscal_id: string;
    name: string;
    email: string;
    address?: Address;
}
interface MerchantCreateInput {
    fiscal_id: string;
    name: string;
    email: string;
    password: string;
    address?: Address;
}
interface MerchantUpdateInput {
    name: string;
    address?: Address;
}
interface PemCreateInput {
    merchant_uuid: string;
    address?: Address;
    external_pem_data?: PemData;
}
interface PemData {
    version: string;
    type: 'AP' | 'SP' | 'TM' | 'PV';
}
interface PemCreateOutput {
    serial_number: string;
    registration_key: string;
}
interface PemCertificatesOutput {
    mtls_certificate: string;
    activation_xml_response?: string;
}

/**
 * HTTP client for API requests
 */
declare class HttpClient {
    private config;
    private client;
    constructor(config: ConfigManager);
    private createClient;
    /**
     * Set authorization header
     */
    setAuthorizationHeader(token: string): void;
    /**
     * Remove authorization header
     */
    removeAuthorizationHeader(): void;
    /**
     * GET request
     */
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    /**
     * POST request
     */
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * PUT request
     */
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * DELETE request
     */
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    /**
     * PATCH request
     */
    patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * Download file (binary response)
     */
    download(url: string, config?: AxiosRequestConfig): Promise<Blob>;
    /**
     * Transform axios errors to SDK errors
     */
    private transformError;
    /**
     * Get the underlying axios instance for advanced use cases
     */
    getAxiosInstance(): AxiosInstance;
}

/**
 * Receipts API manager
 */
declare class ReceiptsAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Create a new electronic receipt
     */
    create(receiptData: ReceiptInput): Promise<ReceiptOutput>;
    /**
     * Get a list of electronic receipts
     */
    list(params?: {
        page?: number;
        size?: number;
    }): Promise<Page<ReceiptOutput>>;
    /**
     * Get an electronic receipt by UUID
     */
    get(receiptUuid: string): Promise<ReceiptOutput>;
    /**
     * Get receipt details (JSON or PDF)
     */
    getDetails(receiptUuid: string, format?: 'json' | 'pdf'): Promise<ReceiptDetailsOutput | Blob>;
    /**
     * Void an electronic receipt
     */
    void(voidData: ReceiptReturnOrVoidViaPEMInput): Promise<void>;
    /**
     * Void an electronic receipt identified by proof of purchase
     */
    voidWithProof(voidData: ReceiptReturnOrVoidWithProofInput): Promise<void>;
    /**
     * Return items from an electronic receipt
     */
    return(returnData: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput>;
    /**
     * Return items from an electronic receipt identified by proof of purchase
     */
    returnWithProof(returnData: ReceiptReturnOrVoidWithProofInput): Promise<ReceiptOutput>;
}

/**
 * Cashiers API manager
 */
declare class CashiersAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Read cashiers with pagination
     */
    list(params?: {
        page?: number;
        size?: number;
    }): Promise<Page<CashierOutput>>;
    /**
     * Create a new cashier
     */
    create(cashierData: CashierCreateInput): Promise<CashierOutput>;
    /**
     * Read currently authenticated cashier's information
     */
    me(): Promise<CashierOutput>;
    /**
     * Get a specific cashier by ID
     */
    get(cashierId: number): Promise<CashierOutput>;
    /**
     * Delete a cashier
     */
    delete(cashierId: number): Promise<void>;
}

/**
 * Point of Sales API manager
 */
declare class PointOfSalesAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Retrieve Point of Sales (PEMs)
     */
    list(params?: {
        status?: PEMStatus;
        page?: number;
        size?: number;
    }): Promise<Page<PointOfSaleOutput>>;
    /**
     * Get a specific Point of Sale by serial number
     */
    get(serialNumber: string): Promise<PointOfSaleDetailedOutput>;
    /**
     * Close journal
     */
    closeJournal(): Promise<any>;
    /**
     * Trigger the activation process of a Point of Sale
     */
    activate(serialNumber: string, activationData: ActivationRequest): Promise<any>;
    /**
     * Create a new inactivity period
     */
    createInactivityPeriod(serialNumber: string): Promise<any>;
    /**
     * Change the state of the Point of Sale to 'offline'
     */
    setOffline(serialNumber: string, offlineData: PEMStatusOfflineRequest): Promise<any>;
}

/**
 * Cash Registers API manager
 */
declare class CashRegistersAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Create a new cash register (point of sale)
     */
    create(cashRegisterData: CashRegisterCreate): Promise<CashRegisterDetailedOutput>;
    /**
     * Get all cash registers for the current merchant
     */
    list(params?: {
        page?: number;
        size?: number;
    }): Promise<Page<CashRegisterBasicOutput>>;
    /**
     * Get a cash register by ID
     */
    get(id: string): Promise<CashRegisterBasicOutput>;
}

/**
 * Merchants API manager (MF2)
 */
declare class MerchantsAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Retrieve the collection of Merchant resources
     */
    list(params?: {
        page?: number;
    }): Promise<MerchantOutput[]>;
    /**
     * Create a Merchant resource
     */
    create(merchantData: MerchantCreateInput): Promise<MerchantOutput>;
    /**
     * Retrieve a Merchant resource by UUID
     */
    get(uuid: string): Promise<MerchantOutput>;
    /**
     * Replace the Merchant resource
     */
    update(uuid: string, merchantData: MerchantUpdateInput): Promise<MerchantOutput>;
}

/**
 * PEMs API manager (MF2)
 */
declare class PemsAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Create a new PEM
     */
    create(pemData: PemCreateInput): Promise<PemCreateOutput>;
    /**
     * Get mTLS and signing certificates for a PEM
     */
    getCertificates(id: string): Promise<PemCertificatesOutput>;
}

/**
 * Main API client that combines all resource managers
 */
declare class APIClient {
    private httpClient;
    readonly receipts: ReceiptsAPI;
    readonly cashiers: CashiersAPI;
    readonly pointOfSales: PointOfSalesAPI;
    readonly cashRegisters: CashRegistersAPI;
    readonly merchants: MerchantsAPI;
    readonly pems: PemsAPI;
    constructor(config: ConfigManager);
    /**
     * Set authorization header for all requests
     */
    setAuthorizationHeader(token: string): void;
    /**
     * Remove authorization header
     */
    removeAuthorizationHeader(): void;
    /**
     * Get the underlying HTTP client for advanced use cases
     */
    getHttpClient(): HttpClient;
}

/**
 * Offline queue types and interfaces
 */
type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
type ResourceType = 'receipt' | 'cashier' | 'point-of-sale' | 'cash-register' | 'merchant' | 'pem';
type OperationStatus = 'pending' | 'processing' | 'completed' | 'failed';
/**
 * Queued operation data structure
 */
interface QueuedOperation {
    id: string;
    type: OperationType;
    resource: ResourceType;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: any;
    headers?: Record<string, string>;
    status: OperationStatus;
    createdAt: number;
    updatedAt: number;
    retryCount: number;
    maxRetries: number;
    error?: string;
    priority: number;
}
/**
 * Sync result for a single operation
 */
interface SyncResult {
    operation: QueuedOperation;
    success: boolean;
    error?: string;
    response?: any;
}
/**
 * Batch sync result
 */
interface BatchSyncResult {
    totalOperations: number;
    successCount: number;
    failureCount: number;
    results: SyncResult[];
}
/**
 * Queue configuration
 */
interface QueueConfig {
    maxRetries: number;
    retryDelay: number;
    maxRetryDelay: number;
    backoffMultiplier: number;
    maxQueueSize: number;
    batchSize: number;
    syncInterval: number;
}
/**
 * Queue events
 */
interface QueueEvents {
    onOperationAdded?: (operation: QueuedOperation) => void;
    onOperationCompleted?: (result: SyncResult) => void;
    onOperationFailed?: (result: SyncResult) => void;
    onBatchSyncCompleted?: (result: BatchSyncResult) => void;
    onQueueEmpty?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Operation queue manager for offline functionality
 */
declare class OperationQueue {
    private storage;
    private config;
    private events;
    private static readonly QUEUE_KEY;
    private queue;
    private isProcessing;
    private syncIntervalId?;
    constructor(storage: IStorage, config?: QueueConfig, events?: QueueEvents);
    /**
     * Add an operation to the queue
     */
    addOperation(type: OperationType, resource: ResourceType, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: any, priority?: number): Promise<string>;
    /**
     * Get all pending operations
     */
    getPendingOperations(): QueuedOperation[];
    /**
     * Get operation by ID
     */
    getOperation(id: string): QueuedOperation | undefined;
    /**
     * Remove operation from queue
     */
    removeOperation(id: string): Promise<boolean>;
    /**
     * Update operation status
     */
    updateOperation(id: string, updates: Partial<QueuedOperation>): Promise<boolean>;
    /**
     * Get queue statistics
     */
    getStats(): {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    };
    /**
     * Clear all operations from queue
     */
    clearQueue(): Promise<void>;
    /**
     * Clear completed operations
     */
    clearCompleted(): Promise<void>;
    /**
     * Clear failed operations
     */
    clearFailed(): Promise<void>;
    /**
     * Retry failed operations
     */
    retryFailed(): Promise<void>;
    /**
     * Get operations for batch processing
     */
    getNextBatch(): QueuedOperation[];
    /**
     * Check if queue is empty (no pending operations)
     */
    isEmpty(): boolean;
    /**
     * Start auto-sync timer
     */
    startAutoSync(): void;
    /**
     * Stop auto-sync timer
     */
    stopAutoSync(): void;
    /**
     * Set processing state
     */
    setProcessing(processing: boolean): void;
    /**
     * Check if currently processing
     */
    isCurrentlyProcessing(): boolean;
    /**
     * Load queue from storage
     */
    private loadQueue;
    /**
     * Save queue to storage
     */
    private saveQueue;
    /**
     * Generate unique ID for operations
     */
    private generateId;
    /**
     * Cleanup resources
     */
    destroy(): void;
}

/**
 * Offline manager that combines queue and sync functionality
 */
declare class OfflineManager {
    private queue;
    private syncManager;
    constructor(storage: IStorage, httpClient: HttpClient, networkMonitor: INetworkMonitor, config?: Partial<QueueConfig>, events?: QueueEvents);
    /**
     * Queue an operation for offline execution
     */
    queueOperation(type: OperationType, resource: ResourceType, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: any, priority?: number): Promise<string>;
    /**
     * Queue a receipt creation
     */
    queueReceiptCreation(receiptData: any, priority?: number): Promise<string>;
    /**
     * Queue a receipt void operation
     */
    queueReceiptVoid(voidData: any, priority?: number): Promise<string>;
    /**
     * Queue a receipt return operation
     */
    queueReceiptReturn(returnData: any, priority?: number): Promise<string>;
    /**
     * Queue a cashier creation
     */
    queueCashierCreation(cashierData: any, priority?: number): Promise<string>;
    /**
     * Check if currently online
     */
    isOnline(): boolean;
    /**
     * Get sync status and queue statistics
     */
    getStatus(): {
        isOnline: boolean;
        isProcessing: boolean;
        queueStats: ReturnType<OperationQueue["getStats"]>;
    };
    /**
     * Get pending operations count
     */
    getPendingCount(): number;
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean;
    /**
     * Manually trigger sync (if online)
     */
    sync(): Promise<BatchSyncResult | null>;
    /**
     * Retry failed operations
     */
    retryFailed(): Promise<void>;
    /**
     * Clear completed operations
     */
    clearCompleted(): Promise<void>;
    /**
     * Clear failed operations
     */
    clearFailed(): Promise<void>;
    /**
     * Clear all operations
     */
    clearAll(): Promise<void>;
    /**
     * Get operation by ID
     */
    getOperation(id: string): QueuedOperation | undefined;
    /**
     * Remove specific operation
     */
    removeOperation(id: string): Promise<boolean>;
    /**
     * Get queue statistics
     */
    getQueueStats(): {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    };
    /**
     * Start auto-sync (if not already started)
     */
    startAutoSync(): void;
    /**
     * Stop auto-sync
     */
    stopAutoSync(): void;
    /**
     * Cleanup resources
     */
    destroy(): void;
}

/**
 * SDK Events interface
 */
interface SDKEvents {
    onUserChanged?: (user: User | null) => void;
    onAuthError?: (error: ACubeSDKError) => void;
    onNetworkStatusChanged?: (online: boolean) => void;
    onOfflineOperationAdded?: (operationId: string) => void;
    onOfflineOperationCompleted?: (operationId: string, success: boolean) => void;
}
/**
 * Main ACube SDK class
 */
declare class ACubeSDK {
    private events;
    private config;
    private adapters?;
    private authManager?;
    private offlineManager?;
    private isInitialized;
    api?: APIClient;
    constructor(config: SDKConfig, customAdapters?: PlatformAdapters, events?: SDKEvents);
    /**
     * Initialize the SDK
     */
    initialize(): Promise<void>;
    /**
     * Login with email and password
     */
    login(credentials: AuthCredentials): Promise<User>;
    /**
     * Logout current user
     */
    logout(): Promise<void>;
    /**
     * Get current user
     */
    getCurrentUser(): Promise<User | null>;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Get offline manager for manual queue operations
     */
    getOfflineManager(): OfflineManager;
    /**
     * Check if currently online
     */
    isOnline(): boolean;
    /**
     * Get SDK configuration
     */
    getConfig(): SDKConfig;
    /**
     * Update SDK configuration
     */
    updateConfig(updates: Partial<SDKConfig>): void;
    /**
     * Get platform adapters (for advanced use cases)
     */
    getAdapters(): PlatformAdapters | undefined;
    /**
     * Destroy SDK and cleanup resources
     */
    destroy(): void;
    /**
     * Ensure SDK is initialized
     */
    private ensureInitialized;
}

/**
 * ACube SDK Context interface
 */
interface ACubeContextValue {
    sdk: ACubeSDK | null;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isOnline: boolean;
    error: ACubeSDKError | null;
    pendingOperations: number;
}
/**
 * ACube Provider Props
 */
interface ACubeProviderProps {
    config: SDKConfig;
    children: ReactNode;
    onUserChanged?: (user: User | null) => void;
    onAuthError?: (error: ACubeSDKError) => void;
    onNetworkStatusChanged?: (online: boolean) => void;
}
/**
 * ACube SDK Provider Component
 */
declare function ACubeProvider({ config, children, onUserChanged, onAuthError, onNetworkStatusChanged, }: ACubeProviderProps): React.JSX.Element;
/**
 * Hook to use ACube SDK context
 */
declare function useACube(): ACubeContextValue;

/**
 * Authentication hook return type
 */
interface UseAuthReturn {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: ACubeSDKError | null;
    login: (credentials: AuthCredentials) => Promise<User | null>;
    logout: () => Promise<void>;
    clearError: () => void;
}
/**
 * Hook for authentication operations
 */
declare function useAuth(): UseAuthReturn;

/**
 * Receipts hook return type
 */
interface UseReceiptsReturn {
    receipts: ReceiptOutput[];
    isLoading: boolean;
    error: ACubeSDKError | null;
    createReceipt: (receiptData: ReceiptInput) => Promise<ReceiptOutput | null>;
    voidReceipt: (voidData: ReceiptReturnOrVoidViaPEMInput) => Promise<boolean>;
    returnReceipt: (returnData: ReceiptReturnOrVoidViaPEMInput) => Promise<ReceiptOutput | null>;
    getReceipt: (receiptUuid: string) => Promise<ReceiptOutput | null>;
    getReceiptDetails: (receiptUuid: string, format?: 'json' | 'pdf') => Promise<ReceiptDetailsOutput | Blob | null>;
    refreshReceipts: () => Promise<void>;
    clearError: () => void;
}
/**
 * Hook for receipt operations
 */
declare function useReceipts(): UseReceiptsReturn;

/**
 * Offline hook return type
 */
interface UseOfflineReturn {
    isOnline: boolean;
    pendingOperations: number;
    sync: () => Promise<BatchSyncResult | null>;
    retryFailed: () => Promise<void>;
    clearCompleted: () => Promise<void>;
    clearFailed: () => Promise<void>;
    clearAll: () => Promise<void>;
    getQueueStats: () => any;
}
/**
 * Hook for offline operations management
 */
declare function useOffline(): UseOfflineReturn;

export { ACubeProvider, useACube, useAuth, useOffline, useReceipts };
export type { ACubeContextValue, ACubeProviderProps, UseAuthReturn, UseOfflineReturn, UseReceiptsReturn };
