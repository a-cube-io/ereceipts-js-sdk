import { AxiosRequestConfig, AxiosInstance } from 'axios';
import { z } from 'zod';

/**
 * Role and Permission Management System
 *
 * This module provides type-safe role management with hierarchical permissions
 * and context-based authorization for the ACube E-Receipt system.
 */
type BaseRole = 'ROLE_SUPPLIER' | 'ROLE_CACHIER' | 'ROLE_MERCHANT';
type RoleContext = 'ereceipts-it.acubeapi.com';
type RoleHierarchy = Record<BaseRole, BaseRole[]>;
type UserRoles = Partial<Record<RoleContext, BaseRole[]>>;
/**
 * Role hierarchy definition based on your system
 * Each role inherits permissions from roles listed in its array
 */
declare const ROLE_HIERARCHY: RoleHierarchy;
/**
 * Default context for e-receipt operations
 */
declare const DEFAULT_CONTEXT: RoleContext;
/**
 * Role permission levels (ascending order)
 */
declare enum RoleLevel {
    SUPPLIER = 1,
    CACHIER = 2,
    MERCHANT = 3
}
/**
 * Map roles to their permission levels
 */
declare const ROLE_LEVELS: Record<BaseRole, RoleLevel>;
/**
 * Get all roles that a user has (including inherited roles)
 * @param userRoles - User's role assignments by context
 * @param context - Context to check roles for
 * @returns Array of all effective roles (direct + inherited)
 */
declare function getEffectiveRoles(userRoles: UserRoles, context?: RoleContext): BaseRole[];
/**
 * Get all roles inherited from a specific role
 * @param role - Role to get inheritance for
 * @returns Array of inherited roles
 */
declare function getInheritedRoles(role: BaseRole): BaseRole[];
/**
 * Check if user has a specific role in a context
 * @param userRoles - User's role assignments
 * @param role - Role to check for
 * @param context - Context to check in
 * @returns True if user has the role (direct or inherited)
 */
declare function hasRole(userRoles: UserRoles, role: BaseRole, context?: RoleContext): boolean;
/**
 * Check if user has any of the specified roles
 * @param userRoles - User's role assignments
 * @param roles - Array of roles to check for
 * @param context - Context to check in
 * @returns True if user has any of the roles
 */
declare function hasAnyRole(userRoles: UserRoles, roles: BaseRole[], context?: RoleContext): boolean;
/**
 * Check if user has all of the specified roles
 * @param userRoles - User's role assignments
 * @param roles - Array of roles to check for
 * @param context - Context to check in
 * @returns True if user has all of the roles
 */
declare function hasAllRoles(userRoles: UserRoles, roles: BaseRole[], context?: RoleContext): boolean;
/**
 * Check if user has access to a specific context
 * @param userRoles - User's role assignments
 * @param context - Context to check
 * @returns True if user has any roles in the context
 */
declare function hasContext(userRoles: UserRoles, context: RoleContext): boolean;
/**
 * Get all contexts that a user has access to
 * @param userRoles - User's role assignments
 * @returns Array of contexts the user has access to
 */
declare function getUserContexts(userRoles: UserRoles): RoleContext[];
/**
 * Check if user has minimum role level in a context
 * @param userRoles - User's role assignments
 * @param minimumLevel - Minimum role level required
 * @param context - Context to check in
 * @returns True if user has at least the minimum role level
 */
declare function hasMinimumRoleLevel(userRoles: UserRoles, minimumLevel: RoleLevel, context?: RoleContext): boolean;
/**
 * Get the highest role level for a user in a context
 * @param userRoles - User's role assignments
 * @param context - Context to check in
 * @returns Highest role level or null if no roles
 */
declare function getHighestRoleLevel(userRoles: UserRoles, context?: RoleContext): RoleLevel | null;
/**
 * Check if user can perform an action that requires specific roles
 * @param userRoles - User's role assignments
 * @param requiredRoles - Roles required for the action
 * @param context - Context for the action
 * @param requireAll - Whether all roles are required (default: false - any role)
 * @returns True if user can perform the action
 */
declare function canPerformAction(userRoles: UserRoles, requiredRoles: BaseRole[], context?: RoleContext, requireAll?: boolean): boolean;
/**
 * Create a role checker function for a specific context
 * @param context - Context to create checker for
 * @returns Function that checks roles in the specified context
 */
declare function createContextRoleChecker(context: RoleContext): {
    hasRole: (userRoles: UserRoles, role: BaseRole) => boolean;
    hasAnyRole: (userRoles: UserRoles, roles: BaseRole[]) => boolean;
    hasAllRoles: (userRoles: UserRoles, roles: BaseRole[]) => boolean;
    hasMinimumLevel: (userRoles: UserRoles, level: RoleLevel) => boolean;
    canPerformAction: (userRoles: UserRoles, requiredRoles: BaseRole[], requireAll?: boolean) => boolean;
};
/**
 * Role-based authorization decorator for methods
 */
declare function requiresRole(roles: BaseRole[], context?: RoleContext): (_target: any, _propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Utility type for components that need role checking
 */
interface RoleAware {
    roles: UserRoles;
}
/**
 * Type guard to check if an object has role information
 */
declare function hasRoleInformation(obj: any): obj is RoleAware;
/**
 * Parse roles from the legacy format to the new structured format
 * @param legacyRoles - Roles in Record<string, string[]> format
 * @returns Roles in UserRoles format
 */
declare function parseLegacyRoles(legacyRoles: Record<string, string[]>): UserRoles;
/**
 * Convert UserRoles back to legacy format for API compatibility
 * @param userRoles - Roles in UserRoles format
 * @returns Roles in Record<string, string[]> format
 */
declare function toLegacyRoles(userRoles: UserRoles): Record<string, string[]>;
/**
 * Default role checker for the e-receipts context
 */
declare const ERoleChecker: {
    hasRole: (userRoles: UserRoles, role: BaseRole) => boolean;
    hasAnyRole: (userRoles: UserRoles, roles: BaseRole[]) => boolean;
    hasAllRoles: (userRoles: UserRoles, roles: BaseRole[]) => boolean;
    hasMinimumLevel: (userRoles: UserRoles, level: RoleLevel) => boolean;
    canPerformAction: (userRoles: UserRoles, requiredRoles: BaseRole[], requireAll?: boolean) => boolean;
};
/**
 * Common role combinations for quick checking
 */
declare const RoleGroups: {
    readonly CASHIER_ROLES: BaseRole[];
    readonly ALL_ROLES: BaseRole[];
};

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
 * Token response from auth server
 */
interface TokenResponse {
    token: string;
}
/**
 * JWT Token payload structure
 */
interface JWTPayload {
    iat: number;
    exp: number;
    roles: Record<string, string[]>;
    username: string;
    uid: number;
    fid: string;
    pid: string | null;
}
/**
 * Stored token data
 */
interface StoredTokenData {
    accessToken: string;
    expiresAt: number;
}
/**
 * User information
 */
interface User {
    id: string;
    email: string;
    username: string;
    roles: UserRoles;
    fid: string;
    pid: string | null;
}
/**
 * API Error response
 */
interface APIError {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
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
 * Authentication events
 */
interface AuthEvents {
    onAuthError?: (error: ACubeSDKError) => void;
    onUserChanged?: (user: User | null) => void;
}
/**
 * JWT Authentication Manager
 */
declare class AuthManager {
    private config;
    private secureStorage;
    private events;
    private static readonly TOKEN_KEY;
    private static readonly USER_KEY;
    private httpClient;
    private currentUser;
    constructor(config: ConfigManager, secureStorage: ISecureStorage, events?: AuthEvents);
    private createHttpClient;
    private setupInterceptors;
    /**
     * Login with email and password
     */
    login(credentials: AuthCredentials): Promise<User>;
    /**
     * Parse JWT token to extract payload
     */
    private parseJWTToken;
    /**
     * Logout and clear tokens
     */
    logout(): Promise<void>;
    /**
     * Get current user information
     */
    getCurrentUser(): Promise<User>;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): Promise<boolean>;
    /**
     * Get access token for API calls
     */
    getAccessToken(): Promise<string | null>;
    /**
     * Store tokens securely
     */
    private storeTokens;
    /**
     * Get stored tokens
     */
    private getStoredTokens;
    /**
     * Clear stored tokens
     */
    private clearTokens;
    /**
     * Check if token is expired
     */
    private isTokenExpired;
    /**
     * Transform API errors to SDK errors
     */
    private transformError;
}

/**
 * Platform detection utilities
 */
type Platform = 'web' | 'react-native' | 'node' | 'unknown';
interface PlatformInfo {
    platform: Platform;
    isReactNative: boolean;
    isWeb: boolean;
    isNode: boolean;
    isExpo: boolean;
}
/**
 * Detect the current platform
 */
declare function detectPlatform(): PlatformInfo;

/**
 * Dynamically load platform-specific adapters
 */
declare function loadPlatformAdapters(): Promise<PlatformAdapters>;

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
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}
interface CashierOutput {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
}
interface CashierSimpleOutput {
    uuid: string;
    first_name: string;
    last_name: string;
}
interface CashierListParams {
    page?: number;
    size?: number;
}
type PEMStatus = 'NEW' | 'REGISTERED' | 'ACTIVATED' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
interface Address {
    street_address: string;
    street_number: string;
    zip_code: string;
    city: string;
    province: string;
}
interface PointOfSaleListParams {
    status?: PEMStatus;
    page?: number;
    size?: number;
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
interface PointOfSaleUpdateInput {
    address?: Address;
}
type ReceiptType = 'sale' | 'return' | 'void';
type GoodOrService = 'B' | 'S';
type VatRateCode = '4' | '5' | '10' | '22' | '2' | '6.4' | '7' | '7.3' | '7.5' | '7.65' | '7.95' | '8.3' | '8.5' | '8.8' | '9.5' | '12.3' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6';
declare const VatRateCodeOptions: VatRateCode[];
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
    vat_number: string;
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
interface ReceiptListParams {
    page?: number;
    size?: number;
}
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
interface CashRegisterListParams {
    page?: number;
    size?: number;
    pem_id?: string;
}
interface MerchantOutput {
    uuid: string;
    vat_number: string;
    fiscal_code?: string | null;
    email: string;
    business_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    address?: Address;
}
interface MerchantsParams {
    page?: number;
}
interface MerchantCreateInput {
    vat_number: string;
    fiscal_code?: string;
    business_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    password: string;
    address?: Address;
}
interface MerchantUpdateInput {
    business_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    address?: Address | null;
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
interface SupplierOutput {
    uuid: string;
    fiscal_id: string;
    name: string;
    address?: Address;
}
interface SuppliersParams {
    page?: number;
}
interface SupplierCreateInput {
    fiscal_id: string;
    name: string;
    address?: Address;
}
interface SupplierUpdateInput {
    name: string;
    address?: Address;
}
interface DailyReportOutput {
    uuid: string;
    pem_serial_number: string;
    date: string;
    total_receipts: number;
    total_amount: string;
    status: 'pending' | 'sent' | 'error';
}
interface DailyReportsParams {
    pem_serial_number?: string;
    date_from?: string;
    date_to?: string;
    status?: 'pending' | 'sent' | 'error';
    page?: number;
}
interface JournalOutput {
    uuid: string;
    pem_serial_number: string;
    date: string;
    sequence_number: number;
    total_receipts: number;
    total_amount: string;
    status: 'open' | 'closed';
}
interface JournalsParams {
    pem_serial_number?: string;
    status?: 'open' | 'closed';
    date_from?: string;
    date_to?: string;
    page?: number;
}
interface JournalCloseInput {
    closing_timestamp: string;
    reason?: string;
}
interface ErrorModel {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
}
interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}
interface HTTPValidationError {
    detail?: ValidationError[];
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
    list(params?: ReceiptListParams): Promise<Page<ReceiptOutput>>;
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
    list(params?: CashierListParams): Promise<Page<CashierOutput>>;
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
    get(cashierId: string): Promise<CashierOutput>;
    /**
     * Delete a cashier
     */
    delete(cashierId: string): Promise<void>;
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
    list(params?: PointOfSaleListParams): Promise<Page<PointOfSaleOutput>>;
    /**
     * Get a specific Point of Sale by serial number
     */
    get(serialNumber: string): Promise<PointOfSaleDetailedOutput>;
    /**
     * Update a Point of Sale
     */
    update(serialNumber: string, updateData: PointOfSaleUpdateInput): Promise<PointOfSaleDetailedOutput>;
    /**
     * Close journal
     */
    closeJournal(): Promise<void>;
    /**
     * Trigger the activation process of a Point of Sale
     */
    activate(serialNumber: string, activationData: ActivationRequest): Promise<void>;
    /**
     * Create a new inactivity period
     */
    createInactivityPeriod(serialNumber: string): Promise<void>;
    /**
     * Change the state of the Point of Sale to 'offline'
     */
    setOffline(serialNumber: string, offlineData: PEMStatusOfflineRequest): Promise<void>;
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
    list(params?: CashRegisterListParams): Promise<Page<CashRegisterBasicOutput>>;
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
    list(params: MerchantsParams): Promise<MerchantOutput[]>;
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
    /**
     * Retrieve Point of Sale resources for a specific merchant
     */
    listPointOfSales(merchantUuid: string, params?: {
        page?: number;
    }): Promise<PointOfSaleOutput[]>;
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
     * Get a specific PEM by serial number
     */
    get(serialNumber: string): Promise<PointOfSaleDetailedOutput>;
    /**
     * Get mTLS and signing certificates for a PEM
     */
    getCertificates(serialNumber: string): Promise<PemCertificatesOutput>;
}

/**
 * Suppliers API manager (MF2)
 */
declare class SuppliersAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Retrieve the collection of Supplier resources
     */
    list(params: SuppliersParams): Promise<SupplierOutput[]>;
    /**
     * Create a Supplier resource
     */
    create(supplierData: SupplierCreateInput): Promise<SupplierOutput>;
    /**
     * Retrieve a Supplier resource by UUID
     */
    get(uuid: string): Promise<SupplierOutput>;
    /**
     * Replace the Supplier resource
     */
    update(uuid: string, supplierData: SupplierUpdateInput): Promise<SupplierOutput>;
    /**
     * Delete a Supplier resource
     */
    delete(uuid: string): Promise<void>;
}

/**
 * Daily Reports API manager (MF2)
 */
declare class DailyReportsAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Retrieve the collection of Daily Report resources
     */
    list(params?: DailyReportsParams): Promise<DailyReportOutput[]>;
    /**
     * Retrieve a Daily Report resource by UUID
     */
    get(uuid: string): Promise<DailyReportOutput>;
    /**
     * Regenerate/resend a daily report
     */
    regenerate(uuid: string): Promise<DailyReportOutput>;
}

/**
 * Journals API manager (MF2)
 */
declare class JournalsAPI {
    private httpClient;
    constructor(httpClient: HttpClient);
    /**
     * Retrieve the collection of Journal resources
     */
    list(params?: JournalsParams): Promise<JournalOutput[]>;
    /**
     * Retrieve a Journal resource by UUID
     */
    get(uuid: string): Promise<JournalOutput>;
    /**
     * Close a journal
     */
    close(uuid: string, closeData: JournalCloseInput): Promise<JournalOutput>;
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
    readonly suppliers: SuppliersAPI;
    readonly dailyReports: DailyReportsAPI;
    readonly journals: JournalsAPI;
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
 * Sync manager for handling offline operations
 */
declare class SyncManager {
    private queue;
    private httpClient;
    private networkMonitor;
    private config;
    private events;
    private isOnline;
    private networkUnsubscribe?;
    private syncTimeout?;
    constructor(queue: OperationQueue, httpClient: HttpClient, networkMonitor: INetworkMonitor, config: QueueConfig, events?: QueueEvents);
    /**
     * Setup network monitoring and auto-sync
     */
    private setupNetworkMonitoring;
    /**
     * Sync all pending operations
     */
    syncPendingOperations(): Promise<BatchSyncResult>;
    /**
     * Process a single operation
     */
    private processOperation;
    /**
     * Execute the actual HTTP operation
     */
    private executeOperation;
    /**
     * Check if an error is retryable
     */
    private isRetryableError;
    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay;
    /**
     * Utility delay function
     */
    private delay;
    /**
     * Check if currently online
     */
    isCurrentlyOnline(): boolean;
    /**
     * Manually trigger sync (if online)
     */
    triggerSync(): Promise<BatchSyncResult | null>;
    /**
     * Get sync status
     */
    getSyncStatus(): {
        isOnline: boolean;
        isProcessing: boolean;
        queueStats: ReturnType<OperationQueue['getStats']>;
    };
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
 * Create and initialize ACube SDK
 */
declare function createACubeSDK(config: SDKConfig, customAdapters?: PlatformAdapters, events?: SDKEvents): Promise<ACubeSDK>;

declare const VAT_RATE_CODE_OPTIONS: readonly ["4", "5", "10", "22", "2", "6.4", "7", "7.3", "7.5", "7.65", "7.95", "8.3", "8.5", "8.8", "9.5", "12.3", "N1", "N2", "N3", "N4", "N5", "N6"];
declare const GOOD_OR_SERVICE_OPTIONS: readonly ["B", "S"];
declare const RECEIPT_PROOF_TYPE_OPTIONS: readonly ["POS", "VR", "ND"];
declare const VatRateCodeSchema: z.ZodEnum<["4", "5", "10", "22", "2", "6.4", "7", "7.3", "7.5", "7.65", "7.95", "8.3", "8.5", "8.8", "9.5", "12.3", "N1", "N2", "N3", "N4", "N5", "N6"]>;
declare const GoodOrServiceSchema: z.ZodEnum<["B", "S"]>;
declare const ReceiptProofTypeSchema: z.ZodEnum<["POS", "VR", "ND"]>;
declare const ReceiptItemSchema: z.ZodObject<{
    good_or_service: z.ZodOptional<z.ZodEnum<["B", "S"]>>;
    quantity: z.ZodString;
    description: z.ZodString;
    unit_price: z.ZodString;
    vat_rate_code: z.ZodOptional<z.ZodEnum<["4", "5", "10", "22", "2", "6.4", "7", "7.3", "7.5", "7.65", "7.95", "8.3", "8.5", "8.8", "9.5", "12.3", "N1", "N2", "N3", "N4", "N5", "N6"]>>;
    simplified_vat_allocation: z.ZodOptional<z.ZodBoolean>;
    discount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_down_payment_or_voucher_redemption: z.ZodOptional<z.ZodBoolean>;
    complimentary: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    quantity: string;
    description: string;
    unit_price: string;
    good_or_service?: "B" | "S" | undefined;
    vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
    simplified_vat_allocation?: boolean | undefined;
    discount?: string | null | undefined;
    is_down_payment_or_voucher_redemption?: boolean | undefined;
    complimentary?: boolean | undefined;
}, {
    quantity: string;
    description: string;
    unit_price: string;
    good_or_service?: "B" | "S" | undefined;
    vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
    simplified_vat_allocation?: boolean | undefined;
    discount?: string | null | undefined;
    is_down_payment_or_voucher_redemption?: boolean | undefined;
    complimentary?: boolean | undefined;
}>;
declare const ReceiptInputSchema: z.ZodEffects<z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        good_or_service: z.ZodOptional<z.ZodEnum<["B", "S"]>>;
        quantity: z.ZodString;
        description: z.ZodString;
        unit_price: z.ZodString;
        vat_rate_code: z.ZodOptional<z.ZodEnum<["4", "5", "10", "22", "2", "6.4", "7", "7.3", "7.5", "7.65", "7.95", "8.3", "8.5", "8.8", "9.5", "12.3", "N1", "N2", "N3", "N4", "N5", "N6"]>>;
        simplified_vat_allocation: z.ZodOptional<z.ZodBoolean>;
        discount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        is_down_payment_or_voucher_redemption: z.ZodOptional<z.ZodBoolean>;
        complimentary: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }, {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }>, "many">;
    customer_tax_code: z.ZodOptional<z.ZodString>;
    customer_lottery_code: z.ZodOptional<z.ZodString>;
    discount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    invoice_issuing: z.ZodOptional<z.ZodBoolean>;
    uncollected_dcr_to_ssn: z.ZodOptional<z.ZodBoolean>;
    services_uncollected_amount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    goods_uncollected_amount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cash_payment_amount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    electronic_payment_amount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ticket_restaurant_payment_amount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ticket_restaurant_quantity: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    discount?: string | null | undefined;
    customer_tax_code?: string | undefined;
    customer_lottery_code?: string | undefined;
    invoice_issuing?: boolean | undefined;
    uncollected_dcr_to_ssn?: boolean | undefined;
    services_uncollected_amount?: string | null | undefined;
    goods_uncollected_amount?: string | null | undefined;
    cash_payment_amount?: string | null | undefined;
    electronic_payment_amount?: string | null | undefined;
    ticket_restaurant_payment_amount?: string | null | undefined;
    ticket_restaurant_quantity?: number | undefined;
}, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    discount?: string | null | undefined;
    customer_tax_code?: string | undefined;
    customer_lottery_code?: string | undefined;
    invoice_issuing?: boolean | undefined;
    uncollected_dcr_to_ssn?: boolean | undefined;
    services_uncollected_amount?: string | null | undefined;
    goods_uncollected_amount?: string | null | undefined;
    cash_payment_amount?: string | null | undefined;
    electronic_payment_amount?: string | null | undefined;
    ticket_restaurant_payment_amount?: string | null | undefined;
    ticket_restaurant_quantity?: number | undefined;
}>, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    discount?: string | null | undefined;
    customer_tax_code?: string | undefined;
    customer_lottery_code?: string | undefined;
    invoice_issuing?: boolean | undefined;
    uncollected_dcr_to_ssn?: boolean | undefined;
    services_uncollected_amount?: string | null | undefined;
    goods_uncollected_amount?: string | null | undefined;
    cash_payment_amount?: string | null | undefined;
    electronic_payment_amount?: string | null | undefined;
    ticket_restaurant_payment_amount?: string | null | undefined;
    ticket_restaurant_quantity?: number | undefined;
}, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    discount?: string | null | undefined;
    customer_tax_code?: string | undefined;
    customer_lottery_code?: string | undefined;
    invoice_issuing?: boolean | undefined;
    uncollected_dcr_to_ssn?: boolean | undefined;
    services_uncollected_amount?: string | null | undefined;
    goods_uncollected_amount?: string | null | undefined;
    cash_payment_amount?: string | null | undefined;
    electronic_payment_amount?: string | null | undefined;
    ticket_restaurant_payment_amount?: string | null | undefined;
    ticket_restaurant_quantity?: number | undefined;
}>;
declare const ReceiptReturnOrVoidViaPEMInputSchema: z.ZodObject<{
    pem_id: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        good_or_service: z.ZodOptional<z.ZodEnum<["B", "S"]>>;
        quantity: z.ZodString;
        description: z.ZodString;
        unit_price: z.ZodString;
        vat_rate_code: z.ZodOptional<z.ZodEnum<["4", "5", "10", "22", "2", "6.4", "7", "7.3", "7.5", "7.65", "7.95", "8.3", "8.5", "8.8", "9.5", "12.3", "N1", "N2", "N3", "N4", "N5", "N6"]>>;
        simplified_vat_allocation: z.ZodOptional<z.ZodBoolean>;
        discount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        is_down_payment_or_voucher_redemption: z.ZodOptional<z.ZodBoolean>;
        complimentary: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }, {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }>, "many">;
    document_number: z.ZodString;
    document_date: z.ZodOptional<z.ZodString>;
    lottery_code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    document_number: string;
    pem_id?: string | undefined;
    document_date?: string | undefined;
    lottery_code?: string | undefined;
}, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    document_number: string;
    pem_id?: string | undefined;
    document_date?: string | undefined;
    lottery_code?: string | undefined;
}>;
declare const ReceiptReturnOrVoidWithProofInputSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        good_or_service: z.ZodOptional<z.ZodEnum<["B", "S"]>>;
        quantity: z.ZodString;
        description: z.ZodString;
        unit_price: z.ZodString;
        vat_rate_code: z.ZodOptional<z.ZodEnum<["4", "5", "10", "22", "2", "6.4", "7", "7.3", "7.5", "7.65", "7.95", "8.3", "8.5", "8.8", "9.5", "12.3", "N1", "N2", "N3", "N4", "N5", "N6"]>>;
        simplified_vat_allocation: z.ZodOptional<z.ZodBoolean>;
        discount: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        is_down_payment_or_voucher_redemption: z.ZodOptional<z.ZodBoolean>;
        complimentary: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }, {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }>, "many">;
    proof: z.ZodEnum<["POS", "VR", "ND"]>;
    document_datetime: z.ZodString;
}, "strip", z.ZodTypeAny, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    proof: "POS" | "VR" | "ND";
    document_datetime: string;
}, {
    items: {
        quantity: string;
        description: string;
        unit_price: string;
        good_or_service?: "B" | "S" | undefined;
        vat_rate_code?: "4" | "5" | "10" | "22" | "2" | "6.4" | "7" | "7.3" | "7.5" | "7.65" | "7.95" | "8.3" | "8.5" | "8.8" | "9.5" | "12.3" | "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | undefined;
        simplified_vat_allocation?: boolean | undefined;
        discount?: string | null | undefined;
        is_down_payment_or_voucher_redemption?: boolean | undefined;
        complimentary?: boolean | undefined;
    }[];
    proof: "POS" | "VR" | "ND";
    document_datetime: string;
}>;
type ReceiptItemType = z.infer<typeof ReceiptItemSchema>;
type ReceiptInputType = z.infer<typeof ReceiptInputSchema>;
type ReceiptReturnOrVoidViaPEMInputType = z.infer<typeof ReceiptReturnOrVoidViaPEMInputSchema>;
type ReceiptReturnOrVoidWithProofInputType = z.infer<typeof ReceiptReturnOrVoidWithProofInputSchema>;
type VatRateCodeType = z.infer<typeof VatRateCodeSchema>;
type GoodOrServiceType = z.infer<typeof GoodOrServiceSchema>;
type ReceiptProofTypeType = z.infer<typeof ReceiptProofTypeSchema>;

declare const CashierCreateInputSchema: z.ZodObject<{
    first_name: z.ZodString;
    last_name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}, {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}>;
type CashierCreateInputType = z.infer<typeof CashierCreateInputSchema>;

declare const PEM_STATUS_OPTIONS: readonly ["NEW", "REGISTERED", "ACTIVATED", "ONLINE", "OFFLINE", "DISCARDED"];
declare const AddressSchema: z.ZodObject<{
    street_address: z.ZodString;
    street_number: z.ZodString;
    zip_code: z.ZodString;
    city: z.ZodString;
    province: z.ZodString;
}, "strip", z.ZodTypeAny, {
    street_address: string;
    street_number: string;
    zip_code: string;
    city: string;
    province: string;
}, {
    street_address: string;
    street_number: string;
    zip_code: string;
    city: string;
    province: string;
}>;
declare const PEMStatusSchema: z.ZodEnum<["NEW", "REGISTERED", "ACTIVATED", "ONLINE", "OFFLINE", "DISCARDED"]>;
declare const ActivationRequestSchema: z.ZodObject<{
    registration_key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    registration_key: string;
}, {
    registration_key: string;
}>;
declare const PEMStatusOfflineRequestSchema: z.ZodObject<{
    timestamp: z.ZodEffects<z.ZodString, string, string>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    reason: string;
}, {
    timestamp: string;
    reason: string;
}>;
type AddressType = z.infer<typeof AddressSchema>;
type PEMStatusType = z.infer<typeof PEMStatusSchema>;
type ActivationRequestType = z.infer<typeof ActivationRequestSchema>;
type PEMStatusOfflineRequestType = z.infer<typeof PEMStatusOfflineRequestSchema>;

declare const CashRegisterCreateSchema: z.ZodObject<{
    pem_serial_number: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    pem_serial_number: string;
    name: string;
}, {
    pem_serial_number: string;
    name: string;
}>;
type CashRegisterCreateType = z.infer<typeof CashRegisterCreateSchema>;

declare const MerchantCreateInputSchema: z.ZodObject<{
    vat_number: z.ZodString;
    fiscal_code: z.ZodOptional<z.ZodString>;
    business_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    first_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    last_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    email: z.ZodString;
    password: z.ZodString;
    address: z.ZodOptional<z.ZodObject<{
        street_address: z.ZodString;
        street_number: z.ZodString;
        zip_code: z.ZodString;
        city: z.ZodString;
        province: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    vat_number: string;
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    fiscal_code?: string | undefined;
    business_name?: string | null | undefined;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
}, {
    email: string;
    password: string;
    vat_number: string;
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    fiscal_code?: string | undefined;
    business_name?: string | null | undefined;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
}>;
declare const MerchantUpdateInputSchema: z.ZodObject<{
    business_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    first_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    last_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    address: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        street_address: z.ZodString;
        street_number: z.ZodString;
        zip_code: z.ZodString;
        city: z.ZodString;
        province: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    business_name?: string | null | undefined;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | null | undefined;
}, {
    first_name?: string | null | undefined;
    last_name?: string | null | undefined;
    business_name?: string | null | undefined;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | null | undefined;
}>;
type MerchantCreateInputType = z.infer<typeof MerchantCreateInputSchema>;
type MerchantUpdateInputType = z.infer<typeof MerchantUpdateInputSchema>;

declare const PEM_TYPE_OPTIONS: readonly ["AP", "SP", "TM", "PV"];
declare const PemDataSchema: z.ZodObject<{
    version: z.ZodString;
    type: z.ZodEnum<["AP", "SP", "TM", "PV"]>;
}, "strip", z.ZodTypeAny, {
    type: "AP" | "SP" | "TM" | "PV";
    version: string;
}, {
    type: "AP" | "SP" | "TM" | "PV";
    version: string;
}>;
declare const PemCreateInputSchema: z.ZodObject<{
    merchant_uuid: z.ZodString;
    address: z.ZodOptional<z.ZodObject<{
        street_address: z.ZodString;
        street_number: z.ZodString;
        zip_code: z.ZodString;
        city: z.ZodString;
        province: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }>>;
    external_pem_data: z.ZodOptional<z.ZodObject<{
        version: z.ZodString;
        type: z.ZodEnum<["AP", "SP", "TM", "PV"]>;
    }, "strip", z.ZodTypeAny, {
        type: "AP" | "SP" | "TM" | "PV";
        version: string;
    }, {
        type: "AP" | "SP" | "TM" | "PV";
        version: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    merchant_uuid: string;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
    external_pem_data?: {
        type: "AP" | "SP" | "TM" | "PV";
        version: string;
    } | undefined;
}, {
    merchant_uuid: string;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
    external_pem_data?: {
        type: "AP" | "SP" | "TM" | "PV";
        version: string;
    } | undefined;
}>;
type PemDataType = z.infer<typeof PemDataSchema>;
type PemCreateInputType = z.infer<typeof PemCreateInputSchema>;

declare const SupplierCreateInputSchema: z.ZodObject<{
    fiscal_id: z.ZodString;
    name: z.ZodString;
    address: z.ZodOptional<z.ZodObject<{
        street_address: z.ZodString;
        street_number: z.ZodString;
        zip_code: z.ZodString;
        city: z.ZodString;
        province: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    fiscal_id: string;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
}, {
    name: string;
    fiscal_id: string;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
}>;
declare const SupplierUpdateInputSchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodOptional<z.ZodObject<{
        street_address: z.ZodString;
        street_number: z.ZodString;
        zip_code: z.ZodString;
        city: z.ZodString;
        province: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }, {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
}, {
    name: string;
    address?: {
        street_address: string;
        street_number: string;
        zip_code: string;
        city: string;
        province: string;
    } | undefined;
}>;
type SupplierCreateInputType = z.infer<typeof SupplierCreateInputSchema>;
type SupplierUpdateInputType = z.infer<typeof SupplierUpdateInputSchema>;

declare const JournalCloseInputSchema: z.ZodObject<{
    closing_timestamp: z.ZodEffects<z.ZodString, string, string>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    closing_timestamp: string;
    reason?: string | undefined;
}, {
    closing_timestamp: string;
    reason?: string | undefined;
}>;
type JournalCloseInputType = z.infer<typeof JournalCloseInputSchema>;

declare const DAILY_REPORT_STATUS_OPTIONS: readonly ["pending", "sent", "error"];
declare const DailyReportStatusSchema: z.ZodEnum<["pending", "sent", "error"]>;
declare const DailyReportsParamsSchema: z.ZodObject<{
    pem_serial_number: z.ZodOptional<z.ZodString>;
    date_from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    date_to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    status: z.ZodOptional<z.ZodEnum<["pending", "sent", "error"]>>;
    page: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "sent" | "error" | undefined;
    pem_serial_number?: string | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
    page?: number | undefined;
}, {
    status?: "pending" | "sent" | "error" | undefined;
    pem_serial_number?: string | undefined;
    date_from?: string | undefined;
    date_to?: string | undefined;
    page?: number | undefined;
}>;
type DailyReportStatusType = z.infer<typeof DailyReportStatusSchema>;
type DailyReportsParamsType = z.infer<typeof DailyReportsParamsSchema>;

/**
 * Zod validation schemas for ACube E-Receipt API
 *
 * This module exports all validation schemas and types for API input DTOs.
 * Use these schemas to validate user input before sending requests to the API.
 *
 * @example
 * ```typescript
 * import { ReceiptInputSchema, ReceiptInputType } from '@/validations/api';
 *
 * // Validate input data
 * const result = ReceiptInputSchema.safeParse(userInput);
 * if (!result.success) {
 *   console.error('Validation errors:', result.error.errors);
 * } else {
 *   // Use validated data
 *   const validatedData: ReceiptInputType = result.data;
 * }
 * ```
 */

declare const ValidationMessages: {
    readonly fieldIsRequired: "This field is required";
    readonly arrayMin1: "At least one item is required";
    readonly paymentMethodRequired: "At least one payment method is required";
    readonly invalidEmail: "Please enter a valid email address";
    readonly passwordMinLength: "Password must be at least 8 characters long";
    readonly passwordComplexity: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character";
    readonly invalidZipCode: "Please enter a valid 5-digit zip code";
    readonly provinceMinLength: "Province code must be 2 characters";
    readonly provinceMaxLength: "Province code must be 2 characters";
    readonly invalidDateFormat: "Please enter a valid date";
    readonly nameMaxLength: "Name is too long";
    readonly invalidFiscalId: "Please enter a valid Italian fiscal ID (Codice Fiscale or Partita IVA)";
    readonly invalidVatNumber: "Please enter a valid VAT number (11 digits)";
    readonly invalidFiscalCode: "Please enter a valid fiscal code (11 digits)";
    readonly businessNameMaxLength: "Business name is too long (max 200 characters)";
    readonly firstNameMaxLength: "First name is too long (max 100 characters)";
    readonly lastNameMaxLength: "Last name is too long (max 100 characters)";
    readonly invalidUuid: "Please enter a valid UUID";
    readonly invalidPemType: "PEM type must be one of: AP, SP, TM, PV";
    readonly reasonMaxLength: "Reason is too long (max 255 characters)";
    readonly pageMinValue: "Page number must be at least 1";
    readonly invalidDailyReportStatus: "Daily report status must be one of: pending, sent, error";
};

declare const validateInput: <T>(schema: z.ZodSchema<T>, data: unknown) => {
    success: boolean;
    errors: {
        field: any;
        message: any;
        code: any;
    }[];
    data: null;
} | {
    success: boolean;
    errors: never[];
    data: T;
};
interface ValidationResult<T> {
    success: boolean;
    errors: Array<{
        field: string;
        message: string;
        code: string;
    }>;
    data: T | null;
}

export { ACubeSDK, ACubeSDKError, APIClient, ActivationRequestSchema, AddressSchema, AuthManager, CashRegisterCreateSchema, CashRegistersAPI, CashierCreateInputSchema, CashiersAPI, ConfigManager, DAILY_REPORT_STATUS_OPTIONS, DEFAULT_CONTEXT, DailyReportStatusSchema, DailyReportsAPI, DailyReportsParamsSchema, ERoleChecker, GOOD_OR_SERVICE_OPTIONS, GoodOrServiceSchema, HttpClient, JournalCloseInputSchema, JournalsAPI, MerchantCreateInputSchema, MerchantUpdateInputSchema, MerchantsAPI, OfflineManager, OperationQueue, PEMStatusOfflineRequestSchema, PEMStatusSchema, PEM_STATUS_OPTIONS, PEM_TYPE_OPTIONS, PemCreateInputSchema, PemDataSchema, PemsAPI, PointOfSalesAPI, RECEIPT_PROOF_TYPE_OPTIONS, ROLE_HIERARCHY, ROLE_LEVELS, ReceiptInputSchema, ReceiptItemSchema, ReceiptProofTypeSchema, ReceiptReturnOrVoidViaPEMInputSchema, ReceiptReturnOrVoidWithProofInputSchema, ReceiptsAPI, RoleGroups, RoleLevel, SupplierCreateInputSchema, SupplierUpdateInputSchema, SuppliersAPI, SyncManager, VAT_RATE_CODE_OPTIONS, ValidationMessages, VatRateCodeOptions, VatRateCodeSchema, canPerformAction, createACubeSDK, createContextRoleChecker, createACubeSDK as default, detectPlatform, getEffectiveRoles, getHighestRoleLevel, getInheritedRoles, getUserContexts, hasAllRoles, hasAnyRole, hasContext, hasMinimumRoleLevel, hasRole, hasRoleInformation, loadPlatformAdapters, parseLegacyRoles, requiresRole, toLegacyRoles, validateInput };
export type { APIError, ActivationRequest, ActivationRequestType, Address, AddressType, AuthCredentials, AuthEvents, BaseRole, BatchSyncResult, CashRegisterBasicOutput, CashRegisterCreate, CashRegisterCreateType, CashRegisterDetailedOutput, CashRegisterListParams, CashierCreateInput, CashierCreateInputType, CashierListParams, CashierOutput, CashierSimpleOutput, DailyReportOutput, DailyReportStatusType, DailyReportsParams, DailyReportsParamsType, Environment, ErrorModel, GoodOrService, GoodOrServiceType, HTTPValidationError, INetworkMonitor, ISecureStorage, IStorage, JWTPayload, JournalCloseInput, JournalCloseInputType, JournalOutput, JournalsParams, MerchantCreateInput, MerchantCreateInputType, MerchantOutput, MerchantUpdateInput, MerchantUpdateInputType, MerchantsParams, NetworkInfo, OperationStatus, OperationType, PEMStatus, PEMStatusOfflineRequest, PEMStatusOfflineRequestType, PEMStatusType, Page, PemCertificatesOutput, PemCreateInput, PemCreateInputType, PemCreateOutput, PemData, PemDataType, Platform, PlatformAdapters, PlatformInfo, PointOfSaleDetailedOutput, PointOfSaleListParams, PointOfSaleOutput, PointOfSaleUpdateInput, QueueConfig, QueueEvents, QueuedOperation, ReceiptDetailsOutput, ReceiptInput, ReceiptInputType, ReceiptItem, ReceiptItemType, ReceiptListParams, ReceiptOutput, ReceiptProofType, ReceiptProofTypeType, ReceiptReturnOrVoidViaPEMInput, ReceiptReturnOrVoidViaPEMInputType, ReceiptReturnOrVoidWithProofInput, ReceiptReturnOrVoidWithProofInputType, ReceiptType, ResourceType, RoleAware, RoleContext, RoleHierarchy, SDKConfig, SDKError, SDKEvents, StoredTokenData, SupplierCreateInput, SupplierCreateInputType, SupplierOutput, SupplierUpdateInput, SupplierUpdateInputType, SuppliersParams, SyncResult, TokenResponse, User, UserRoles, ValidationError, ValidationResult, VatRateCode, VatRateCodeType };
