# Complete Function Reference

This document provides a comprehensive reference for every function available in the A-Cube SDK.

## Table of Contents
- [Configuration Functions](#configuration-functions)
- [Authentication Functions](#authentication-functions)
- [Merchant Management Functions](#merchant-management-functions)
- [Point of Sale Functions](#point-of-sale-functions)
- [Receipt Management Functions](#receipt-management-functions)
- [Cash Register Functions](#cash-register-functions)
- [Cashier Management Functions](#cashier-management-functions)
- [Storage Functions](#storage-functions)
- [Network Utility Functions](#network-utility-functions)
- [Validation Functions](#validation-functions)
- [Retry Utility Functions](#retry-utility-functions)
- [Logging Functions](#logging-functions)
- [Helper Functions](#helper-functions)

---

## Configuration Functions

### `initSDK(config?: Partial<SDKConfig>): Promise<APIClient>`
**Purpose:** Initializes the A-Cube SDK with optional configuration.
**Parameters:** 
- `config` (optional): SDK configuration object
**Returns:** Promise resolving to the API client instance
**Usage:** Call once at application startup

### `configureSDK(config: Partial<SDKConfig>): void`
**Purpose:** Updates SDK configuration after initialization.
**Parameters:** 
- `config`: Partial configuration object to update
**Returns:** void
**Usage:** Runtime configuration updates

### `initializeAPIClient(config?: Partial<SDKConfig>): APIClient`
**Purpose:** Creates and configures a new API client instance.
**Parameters:** 
- `config` (optional): SDK configuration object
**Returns:** API client instance
**Usage:** Advanced initialization control

### `getAPIClient(): APIClient`
**Purpose:** Gets the current API client instance.
**Parameters:** None
**Returns:** Current API client instance
**Usage:** Access configured client for direct API calls

---

## Authentication Functions

### `loginProvider(email: string, password: string): Promise<AuthToken>`
**Purpose:** Authenticates a user as a Provider (highest privilege level).
**Parameters:** 
- `email`: Provider's email address
- `password`: Provider's password (must meet security requirements)
**Returns:** Promise resolving to authentication token
**Throws:** `AuthenticationError` if login fails
**Role Access:** Public (pre-authentication)

### `loginMerchant(email: string, password: string): Promise<AuthToken>`
**Purpose:** Authenticates a user as a Merchant.
**Parameters:** 
- `email`: Merchant's email address  
- `password`: Merchant's password
**Returns:** Promise resolving to authentication token
**Throws:** `AuthenticationError` if login fails
**Role Access:** Public (pre-authentication)

### `loginCashier(email: string, password: string): Promise<AuthToken>`
**Purpose:** Authenticates a user as a Cashier (operational level).
**Parameters:** 
- `email`: Cashier's email address
- `password`: Cashier's password
**Returns:** Promise resolving to authentication token
**Throws:** `AuthenticationError` if login fails
**Role Access:** Public (pre-authentication)

### `logout(): Promise<void>`
**Purpose:** Logs out the current user and clears all authentication data.
**Parameters:** None
**Returns:** Promise resolving when logout complete
**Side Effects:** Clears tokens, processes offline queue
**Role Access:** Any authenticated user

### `isAuthenticated(): Promise<boolean>`
**Purpose:** Checks if a user is currently authenticated with a valid token.
**Parameters:** None
**Returns:** Promise resolving to boolean indicating authentication status
**Side Effects:** Removes expired tokens
**Role Access:** Any

### `getCurrentUser(): Promise<{email: string, role: string} | null>`
**Purpose:** Gets information about the currently authenticated user.
**Parameters:** None
**Returns:** Promise resolving to user info or null if not authenticated
**Role Access:** Any authenticated user

### `refreshToken(): Promise<AuthToken | null>`
**Purpose:** Attempts to refresh the current authentication token.
**Parameters:** None
**Returns:** Promise resolving to refreshed token or null if unavailable
**Role Access:** Any authenticated user

### `hasRole(role: string): Promise<boolean>`
**Purpose:** Checks if the current user has a specific role.  
**Parameters:** 
- `role`: Role to check ('provider', 'merchant', 'cashier')
**Returns:** Promise resolving to boolean
**Role Access:** Any authenticated user

---

## Merchant Management Functions

### `createMerchant(data: MerchantCreateInput): Promise<MerchantOutput>`
**Purpose:** Creates a new merchant account.
**Parameters:** 
- `data`: Merchant creation data object
**Returns:** Promise resolving to created merchant data
**Role Access:** Provider only
**Validation:** Fiscal ID, email format, password strength, address format

### `getMerchants(page?: number): Promise<MerchantOutput[]>`
**Purpose:** Retrieves a list of merchants with pagination.
**Parameters:** 
- `page` (optional): Page number for pagination (default: 1)
**Returns:** Promise resolving to array of merchant objects
**Role Access:** Provider only

### `getMerchantById(uuid: string): Promise<MerchantOutput>`
**Purpose:** Retrieves a specific merchant by UUID.
**Parameters:** 
- `uuid`: Merchant's unique identifier
**Returns:** Promise resolving to merchant data
**Role Access:** Provider, or own merchant data

### `updateMerchant(uuid: string, data: MerchantUpdateInput): Promise<MerchantOutput>`
**Purpose:** Updates merchant information.
**Parameters:** 
- `uuid`: Merchant's unique identifier
- `data`: Updated merchant data
**Returns:** Promise resolving to updated merchant data
**Role Access:** Provider, or own merchant data

---

## Point of Sale Functions

### `getPointOfSales(status?: string, page?: number, size?: number): Promise<PaginatedResponse<PEMPublic>>`
**Purpose:** Retrieves Point of Electronic Money (PEM) devices.
**Parameters:** 
- `status` (optional): Filter by PEM status
- `page` (optional): Page number (default: 1)
- `size` (optional): Items per page (default: 30)
**Returns:** Promise resolving to paginated PEM devices
**Role Access:** Merchant, Cashier (own devices)

### `getPointOfSaleBySerial(serialNumber: string): Promise<PEMPublic>`
**Purpose:** Retrieves a specific PEM device by serial number.
**Parameters:** 
- `serialNumber`: PEM device serial number
**Returns:** Promise resolving to PEM device information
**Role Access:** Merchant, Cashier (accessible device)

### `activatePointOfSale(serialNumber: string, registrationKey: string): Promise<void>`
**Purpose:** Activates a PEM device with the Italian Tax Agency.
**Parameters:** 
- `serialNumber`: PEM device serial number
- `registrationKey`: Registration key provided by tax authority
**Returns:** Promise resolving when activation complete
**Role Access:** Merchant only
**Critical:** Required for device operation

### `createInactivityPeriod(serialNumber: string): Promise<void>`
**Purpose:** Creates an inactivity period for a PEM device.
**Parameters:** 
- `serialNumber`: PEM device serial number
**Returns:** Promise resolving when period created
**Role Access:** Merchant only
**Use Case:** Maintenance periods, temporary closure

### `setPointOfSaleOffline(serialNumber: string, timestamp: string, reason: string): Promise<void>`
**Purpose:** Sets a PEM device to offline status.
**Parameters:** 
- `serialNumber`: PEM device serial number
- `timestamp`: ISO timestamp when device went offline
- `reason`: Reason for going offline
**Returns:** Promise resolving when status updated
**Role Access:** Merchant, Cashier

### `closeJournal(): Promise<void>`
**Purpose:** Closes the current journal for all PEM devices (end-of-day operation).
**Parameters:** None
**Returns:** Promise resolving when journals closed
**Role Access:** Merchant only
**Critical:** Required daily operation

---

## Receipt Management Functions

### `createReceipt(data: ReceiptInput): Promise<ReceiptOutput>`
**Purpose:** Creates a new electronic receipt (core business operation).
**Parameters:** 
- `data`: Receipt data object with items and payment info
**Returns:** Promise resolving to created receipt
**Role Access:** Merchant, Cashier
**Validation:** Items, amounts, VAT calculations
**Critical:** Primary revenue operation

### `getReceipts(page?: number, size?: number): Promise<PaginatedResponse<ReceiptOutput>>`
**Purpose:** Retrieves electronic receipts with pagination.
**Parameters:** 
- `page` (optional): Page number (default: 1)
- `size` (optional): Items per page (default: 30)
**Returns:** Promise resolving to paginated receipts
**Role Access:** Merchant, Cashier (own receipts)

### `getReceiptById(uuid: string): Promise<ReceiptOutput>`
**Purpose:** Retrieves a specific receipt by UUID.
**Parameters:** 
- `uuid`: Receipt's unique identifier
**Returns:** Promise resolving to receipt data
**Role Access:** Merchant, Cashier (accessible receipt)

### `getReceiptDetails(uuid: string, format?: 'json' | 'pdf'): Promise<ReceiptDetailsOutput | Blob>`
**Purpose:** Retrieves detailed receipt information or PDF.
**Parameters:** 
- `uuid`: Receipt's unique identifier
- `format` (optional): Response format ('json' or 'pdf', default: 'json')
**Returns:** Detailed receipt data or PDF Blob
**Role Access:** Merchant, Cashier (accessible receipt)

### `voidReceipt(data: VoidReceiptData): Promise<void>`
**Purpose:** Voids (cancels) an electronic receipt.
**Parameters:** 
- `data`: Void receipt data object
**Returns:** Promise resolving when receipt voided
**Role Access:** Merchant, Cashier
**Critical:** Tax compliance operation

### `voidReceiptWithProof(data: VoidReceiptWithProofData): Promise<void>`
**Purpose:** Voids a receipt using proof of purchase instead of PEM reference.
**Parameters:** 
- `data`: Void receipt data with proof information
**Returns:** Promise resolving when receipt voided
**Role Access:** Merchant, Cashier

### `returnReceiptItems(data: ReturnReceiptData): Promise<ReceiptOutput>`
**Purpose:** Processes a return/refund for receipt items.
**Parameters:** 
- `data`: Return receipt data object
**Returns:** Promise resolving to new return receipt
**Role Access:** Merchant, Cashier

### `returnReceiptItemsWithProof(data: ReturnReceiptWithProofData): Promise<ReceiptOutput>`
**Purpose:** Processes returns using proof of purchase.
**Parameters:** 
- `data`: Return receipt data with proof information
**Returns:** Promise resolving to new return receipt
**Role Access:** Merchant, Cashier

---

## Cash Register Functions

### `createCashRegister(data: CashRegisterCreate): Promise<CashRegisterOutput>`
**Purpose:** Creates a new cash register with mTLS certificate.
**Parameters:** 
- `data`: Cash register creation data
**Returns:** Promise resolving to cash register data with certificate
**Role Access:** Merchant only
**Side Effects:** Automatically stores certificate securely

### `getCashRegisters(page?: number, size?: number): Promise<PaginatedResponse<CashRegisterOutput>>`
**Purpose:** Retrieves cash registers with pagination.
**Parameters:** 
- `page` (optional): Page number (default: 1)
- `size` (optional): Items per page (default: 30)
**Returns:** Promise resolving to paginated cash registers
**Role Access:** Merchant only

### `getCashRegisterById(id: string): Promise<CashRegisterOutput>`
**Purpose:** Retrieves a specific cash register by ID.
**Parameters:** 
- `id`: Cash register UUID
**Returns:** Promise resolving to cash register data
**Role Access:** Merchant (own registers)

### `getMTLSCertificate(id: string): Promise<string>`
**Purpose:** Retrieves the mTLS certificate for a cash register.
**Parameters:** 
- `id`: Cash register UUID
**Returns:** Promise resolving to certificate PEM string
**Role Access:** Merchant (own registers)
**Security:** Certificate used for secure API communication

---

## Cashier Management Functions

### `createCashier(data: CashierCreateInput): Promise<CashierOutput>`
**Purpose:** Creates a new cashier account.
**Parameters:** 
- `data`: Cashier creation data
**Returns:** Promise resolving to created cashier data
**Role Access:** Merchant only

### `getCashiers(page?: number, size?: number): Promise<PaginatedResponse<CashierOutput>>`
**Purpose:** Retrieves cashiers with pagination.
**Parameters:** 
- `page` (optional): Page number (default: 1)
- `size` (optional): Items per page (default: 30)
**Returns:** Promise resolving to paginated cashiers
**Role Access:** Merchant only

### `getCashierById(id: number): Promise<CashierOutput>`
**Purpose:** Retrieves a specific cashier by ID.
**Parameters:** 
- `id`: Cashier ID number
**Returns:** Promise resolving to cashier data
**Role Access:** Merchant (own cashiers)

### `getCurrentCashier(): Promise<CashierOutput>`
**Purpose:** Gets information about the currently authenticated cashier.
**Parameters:** None
**Returns:** Promise resolving to current cashier data
**Role Access:** Cashier only

### `deleteCashier(id: number): Promise<void>`
**Purpose:** Deletes a cashier account.
**Parameters:** 
- `id`: Cashier ID number
**Returns:** Promise resolving when cashier deleted
**Role Access:** Merchant only

---

## Storage Functions

### SecureTokenStorage Class

#### `SecureTokenStorage.storeToken(token: AuthToken): Promise<void>`
**Purpose:** Stores authentication token securely.
**Parameters:** 
- `token`: Authentication token object
**Storage:** Keychain (mobile) / Secure localStorage (web)

#### `SecureTokenStorage.getToken(): Promise<string | null>`
**Purpose:** Retrieves stored authentication token.
**Returns:** Promise resolving to token string or null

#### `SecureTokenStorage.isTokenValid(): Promise<boolean>`
**Purpose:** Checks if stored token is still valid (not expired).
**Returns:** Promise resolving to boolean validity status

#### `SecureTokenStorage.removeToken(): Promise<void>`
**Purpose:** Removes authentication token and related data.
**Side Effects:** Clears all auth-related storage

#### `SecureTokenStorage.storeUserInfo(token: string): Promise<void>`
**Purpose:** Extracts and stores user information from JWT token.
**Parameters:** 
- `token`: JWT token string

#### `SecureTokenStorage.getUserRole(): Promise<string | null>`
**Purpose:** Gets the role of the currently stored user.
**Returns:** Promise resolving to role string or null

#### `SecureTokenStorage.getUserEmail(): Promise<string | null>`
**Purpose:** Gets the email of the currently stored user.
**Returns:** Promise resolving to email string or null

#### `SecureTokenStorage.clearAll(): Promise<void>`
**Purpose:** Clears all stored data (nuclear option).
**Use Case:** Development, account switching

### CertificateStorage Class

#### `CertificateStorage.storeMTLSCertificate(uuid: string, certificate: string, privateKey?: string): Promise<void>`
**Purpose:** Stores mTLS certificate securely.
**Parameters:** 
- `uuid`: Cash register UUID
- `certificate`: Certificate PEM string
- `privateKey` (optional): Private key PEM string

#### `CertificateStorage.getMTLSCertificate(uuid: string): Promise<MTLSCertificate | null>`
**Purpose:** Retrieves stored mTLS certificate.
**Parameters:** 
- `uuid`: Cash register UUID
**Returns:** Promise resolving to certificate object or null

#### `CertificateStorage.removeMTLSCertificate(uuid: string): Promise<void>`
**Purpose:** Removes mTLS certificate.
**Parameters:** 
- `uuid`: Cash register UUID

#### `CertificateStorage.validateCertificate(uuid: string): Promise<boolean>`
**Purpose:** Validates stored certificate (expiry, format, etc.).
**Parameters:** 
- `uuid`: Cash register UUID
**Returns:** Promise resolving to boolean validity status

### RequestQueue Class

#### `RequestQueue.enqueueRequest(config: AxiosRequestConfig, priority?: 'high' | 'medium' | 'low'): Promise<void>`
**Purpose:** Adds failed request to offline queue.
**Parameters:** 
- `config`: Axios request configuration
- `priority` (optional): Request priority level

#### `RequestQueue.getQueue(): Promise<QueuedRequest[]>`
**Purpose:** Gets all queued requests.
**Returns:** Promise resolving to array of queued requests

#### `RequestQueue.getNextRequest(): Promise<QueuedRequest | null>`
**Purpose:** Gets next request for processing (priority order).
**Returns:** Promise resolving to next request or null

#### `RequestQueue.removeRequest(requestId: string): Promise<void>`
**Purpose:** Removes request from queue.
**Parameters:** 
- `requestId`: Unique request identifier

#### `RequestQueue.clearQueue(): Promise<void>`
**Purpose:** Clears entire queue.
**Use Case:** Reset offline state

#### `RequestQueue.getQueueStats(): Promise<QueueStats>`
**Purpose:** Gets queue statistics and metrics.
**Returns:** Promise resolving to queue statistics object

---

## Network Utility Functions

### `isConnected(): boolean`
**Purpose:** Checks current network connection status.
**Returns:** Boolean indicating connection status
**Platform:** Cross-platform (React Native NetInfo / Web navigator.onLine)

### `getNetworkState(): NetworkState`
**Purpose:** Gets detailed network state information.
**Returns:** Network state object with connection details

### `addNetworkListener(listener: NetworkStateChangeHandler): () => void`
**Purpose:** Adds network state change listener.
**Parameters:** 
- `listener`: Callback function for network state changes
**Returns:** Unsubscribe function

### `removeNetworkListener(listener: NetworkStateChangeHandler): void`
**Purpose:** Removes network state change listener.
**Parameters:** 
- `listener`: Callback function to remove

### `checkInternetConnectivity(): Promise<boolean>`
**Purpose:** Actively checks internet connectivity (beyond local network).
**Returns:** Promise resolving to boolean connectivity status

### `waitForConnection(timeoutMs?: number): Promise<boolean>`
**Purpose:** Waits for network connection with timeout.
**Parameters:** 
- `timeoutMs` (optional): Timeout in milliseconds (default: 30000)
**Returns:** Promise resolving to boolean success status

---

## Validation Functions

### `validateEmail(email: string): ValidationResult`
**Purpose:** Validates email address format.
**Parameters:** 
- `email`: Email string to validate
**Returns:** Validation result object

### `validatePassword(password: string): ValidationResult`
**Purpose:** Validates password strength (A-Cube requirements).
**Parameters:** 
- `password`: Password string to validate
**Returns:** Validation result object
**Rules:** 8-40 chars, uppercase, lowercase, digit, special char

### `validateFiscalId(fiscalId: string): ValidationResult`
**Purpose:** Validates Italian fiscal ID (Partita IVA).
**Parameters:** 
- `fiscalId`: Fiscal ID string to validate
**Returns:** Validation result object
**Format:** Exactly 11 digits

### `validateZipCode(zipCode: string): ValidationResult`
**Purpose:** Validates Italian postal code format.
**Parameters:** 
- `zipCode`: ZIP code string to validate
**Returns:** Validation result object
**Format:** Exactly 5 digits

### `validateProvinceCode(province: string): ValidationResult`
**Purpose:** Validates Italian province code format.
**Parameters:** 
- `province`: Province code string to validate
**Returns:** Validation result object
**Format:** Exactly 2 letters

### `validateAddress(address: Address): ValidationResult`
**Purpose:** Validates complete Italian address format.
**Parameters:** 
- `address`: Address object to validate
**Returns:** Validation result object

### `validateReceiptItem(item: ReceiptItem): ValidationResult`
**Purpose:** Validates receipt item data.
**Parameters:** 
- `item`: Receipt item object to validate
**Returns:** Validation result object

### `validateMoneyAmount(amount: string, fieldName: string, required?: boolean): ValidationResult`
**Purpose:** Validates money amount format.
**Parameters:** 
- `amount`: Amount string to validate
- `fieldName`: Field name for error messages
- `required` (optional): Whether field is required
**Returns:** Validation result object
**Format:** Decimal with 2-8 decimal places

### `combineValidationResults(...results: ValidationResult[]): ValidationResult`
**Purpose:** Combines multiple validation results into one.
**Parameters:** 
- `results`: Variable number of validation result objects
**Returns:** Combined validation result

### `validateRequired(value: any, fieldName: string): ValidationResult`
**Purpose:** Generic required field validation.
**Parameters:** 
- `value`: Value to check
- `fieldName`: Field name for error messages
**Returns:** Validation result object

---

## Retry Utility Functions

### `retryAsync<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>`
**Purpose:** Retries async function with configurable options.
**Parameters:** 
- `fn`: Async function to retry
- `config` (optional): Retry configuration
**Returns:** Promise resolving to function result

### `withRetry<T>(fn: T, config?: Partial<RetryConfig>): T`
**Purpose:** Creates retry wrapper for function.
**Parameters:** 
- `fn`: Function to wrap with retry logic
- `config` (optional): Retry configuration
**Returns:** Wrapped function with retry capability

### `isRetryableError(error: AxiosError): boolean`
**Purpose:** Checks if error should trigger retry.
**Parameters:** 
- `error`: Axios error object
**Returns:** Boolean indicating if error is retryable

### `calculateRetryDelay(retryCount: number, baseDelay: number, exponentialBackoff?: boolean, maxDelay?: number): number`
**Purpose:** Calculates retry delay with exponential backoff.
**Parameters:** 
- `retryCount`: Current retry attempt number
- `baseDelay`: Base delay in milliseconds
- `exponentialBackoff` (optional): Whether to use exponential backoff
- `maxDelay` (optional): Maximum delay cap
**Returns:** Calculated delay in milliseconds

### `calculateJitteredDelay(retryCount: number, baseDelay: number, maxDelay?: number, jitterFactor?: number): number`
**Purpose:** Calculates retry delay with jitter to prevent thundering herd.
**Parameters:** 
- `retryCount`: Current retry attempt number
- `baseDelay`: Base delay in milliseconds
- `maxDelay` (optional): Maximum delay cap
- `jitterFactor` (optional): Jitter randomization factor
**Returns:** Calculated delay with jitter in milliseconds

---

## Logging Functions

### `logError(message: string, data?: any, source?: string): void`
**Purpose:** Logs error message with optional data and source.
**Parameters:** 
- `message`: Error message
- `data` (optional): Additional error data
- `source` (optional): Source component/module name

### `logWarn(message: string, data?: any, source?: string): void`
**Purpose:** Logs warning message with optional data and source.
**Parameters:** 
- `message`: Warning message
- `data` (optional): Additional warning data
- `source` (optional): Source component/module name

### `logInfo(message: string, data?: any, source?: string): void`
**Purpose:** Logs info message with optional data and source.
**Parameters:** 
- `message`: Info message
- `data` (optional): Additional info data
- `source` (optional): Source component/module name

### `logDebug(message: string, data?: any, source?: string): void`
**Purpose:** Logs debug message with optional data and source.
**Parameters:** 
- `message`: Debug message
- `data` (optional): Additional debug data
- `source` (optional): Source component/module name

### Scoped Loggers

#### `apiLogger.info(message: string, data?: any): void`
**Purpose:** Logs API-related info messages.
**Scope:** API operations, requests, responses

#### `authLogger.warn(message: string, data?: any): void`
**Purpose:** Logs authentication-related warnings.
**Scope:** Login, logout, token operations

#### `storageLogger.error(message: string, data?: any): void`
**Purpose:** Logs storage-related errors.
**Scope:** Token storage, certificate storage, data persistence

#### `networkLogger.info(message: string, data?: any): void`
**Purpose:** Logs network-related information.
**Scope:** Connection status, retry operations

#### `uiLogger.debug(message: string, data?: any): void`
**Purpose:** Logs UI component debug information.
**Scope:** Component lifecycle, user interactions

---

## Helper Functions

### `quickLoginProvider(email: string, password: string): Promise<{success: boolean, token?: AuthToken, error?: any}>`
**Purpose:** Simplified provider login with success/error handling.
**Parameters:** 
- `email`: Provider email
- `password`: Provider password
**Returns:** Promise resolving to result object

### `quickLoginMerchant(email: string, password: string): Promise<{success: boolean, token?: AuthToken, error?: any}>`
**Purpose:** Simplified merchant login with success/error handling.
**Parameters:** 
- `email`: Merchant email
- `password`: Merchant password
**Returns:** Promise resolving to result object

### `isSDKReady(): Promise<boolean>`
**Purpose:** Checks if SDK is properly configured and ready.
**Returns:** Promise resolving to boolean readiness status

---

## Constants and Enums

### `UserRole`
**Values:** 
- `UserRole.PROVIDER = 'provider'`
- `UserRole.MERCHANT = 'merchant'`
- `UserRole.CASHIER = 'cashier'`

### `API_ENDPOINTS`
**Values:**
- `API_ENDPOINTS.SANDBOX = 'https://api-sandbox.acube.it'`
- `API_ENDPOINTS.PRODUCTION = 'https://api.acube.it'`

### `STORAGE_KEYS`
**Purpose:** Centralized storage key constants for consistent data access.

### Role Permission Functions

#### `hasPermission(userRole: UserRole, permission: string): boolean`
**Purpose:** Checks if user role has specific permission.

#### `isProvider(role: string): boolean`
**Purpose:** Checks if role is provider.

#### `isMerchant(role: string): boolean`
**Purpose:** Checks if role is merchant.

#### `isCashier(role: string): boolean`
**Purpose:** Checks if role is cashier.

---

This comprehensive function reference covers every available function in the A-Cube SDK, including their purpose, parameters, return values, access requirements, and usage patterns. Each function is designed for specific roles and use cases within the Italian e-receipt system.