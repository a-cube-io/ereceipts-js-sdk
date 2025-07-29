# A-Cube E-Receipt SDK - API Reference

Complete API reference for the A-Cube E-Receipt SDK with detailed interfaces, methods, and examples.

## Table of Contents

- [Installation](#installation)
- [Core SDK API](#core-sdk-api)
- [Configuration](#configuration)
- [Authentication System](#authentication-system)
- [HTTP Client](#http-client)
- [Resources API](#resources-api)
- [Storage System](#storage-system)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)
- [Events System](#events-system)

## Installation

```bash
npm install @acube/ereceipt-sdk
```

## Core SDK API

### ACubeSDK Class

The main SDK class that provides access to all A-Cube e-receipt functionality.

```typescript
import { ACubeSDK } from '@acube/ereceipt-sdk';

const sdk = new ACubeSDK({
  environment: 'sandbox', // 'sandbox' | 'production' | 'development'
  apiKey: 'your-api-key'
});
```

#### Constructor

```typescript
constructor(config?: ACubeSDKConfig)
```

**Parameters:**
- `config` (optional): SDK configuration object

#### Properties

```typescript
// Lazy-loaded resource properties
readonly cashiers: CashiersResource;
readonly receipts: ReceiptsResource;
readonly pointOfSales: PointOfSalesResource;
readonly merchants: MerchantsResource;
readonly pems: PEMsResource;
readonly cashRegisters: CashRegistersResource;

// Configuration and clients
readonly config: ACubeSDKConfig;
readonly apiClient: HttpClient;
readonly authClient: HttpClient;
readonly authService: AuthService;
readonly storage: IACubeStorage;
```

#### Methods

##### `initialize()`
Initialize the SDK and authentication system.

```typescript
async initialize(): Promise<void>
```

**Example:**
```typescript
await sdk.initialize();
```

##### `isAuthenticated()`
Check if user is currently authenticated.

```typescript
isAuthenticated(): boolean
```

**Returns:** `boolean` - True if authenticated

##### `getCurrentUser()`
Get current authenticated user information.

```typescript
getCurrentUser(): AuthUser | null
```

**Returns:** `AuthUser | null` - Current user or null if not authenticated

##### `getAuthToken()`
Get current access token.

```typescript
async getAuthToken(): Promise<string | null>
```

**Returns:** `Promise<string | null>` - Current access token or null

##### `logout()`
Logout current user and clear authentication.

```typescript
async logout(options?: LogoutOptions): Promise<void>
```

**Parameters:**
- `options` (optional): Logout configuration

**Example:**
```typescript
await sdk.logout({ 
  clearAllSessions: true,
  reason: 'user_initiated' 
});
```

##### `getHealth()`
Get SDK health status including circuit breaker and authentication state.

```typescript
getHealth(): {
  status: 'healthy' | 'unhealthy';
  authentication: boolean;
  apiClient: object;
  authClient: object;
}
```

## Configuration

### ACubeSDKConfig Interface

Complete configuration interface for the SDK.

```typescript
interface ACubeSDKConfig {
  // Environment Configuration
  environment: 'sandbox' | 'production' | 'development';
  apiKey?: string;
  
  // Base URLs (auto-configured per environment)
  baseUrls?: {
    api?: string;
    auth?: string;
  };
  
  // HTTP Client Configuration
  httpConfig?: Partial<HttpClientConfig>;
  authHttpConfig?: Partial<HttpClientConfig>;
  
  // Authentication Configuration
  authConfig?: Partial<AuthConfig>;
  
  // Storage Configuration
  storageConfig?: {
    adapter?: 'memory' | 'localStorage' | 'asyncStorage' | 'fileSystem';
    encryption?: boolean;
    namespace?: string;
    ttl?: number;
  };
  
  // Offline Configuration
  offlineConfig?: {
    enabled?: boolean;
    maxQueueSize?: number;
    syncInterval?: number;
    conflictResolution?: 'client' | 'server' | 'manual';
  };
  
  // Performance Configuration
  performanceConfig?: {
    enableCaching?: boolean;
    cacheSize?: number;
    cacheTTL?: number;
    enableBatching?: boolean;
    batchSize?: number;
    enableCompression?: boolean;
  };
  
  // Logging Configuration
  loggingConfig?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    enableConsoleLogging?: boolean;
    enableFileLogging?: boolean;
    logDirectory?: string;
  };
  
  // Platform-Specific Configuration
  reactNativeConfig?: {
    enableBackgroundSync?: boolean;
    enablePushNotifications?: boolean;
    enableBiometricAuth?: boolean;
    healthCheckUrl?: string;
  };
  
  // PWA Configuration
  pwaConfig?: {
    enableServiceWorker?: boolean;
    enableOfflineSync?: boolean;
    enablePushNotifications?: boolean;
    manifestConfig?: object;
  };
  
  // Security Configuration
  securityConfig?: {
    enableCSP?: boolean;
    enableHSTS?: boolean;
    enableTokenBinding?: boolean;
    certificateValidation?: boolean;
  };
  
  // Development Tools
  devConfig?: {
    enableDebugMode?: boolean;
    enableMockData?: boolean;
    enableAPILogging?: boolean;
    webhookConfig?: {
      enabled?: boolean;
      port?: number;
      ngrokEnabled?: boolean;
    };
  };
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG: ACubeSDKConfig = {
  environment: 'sandbox',
  httpConfig: {
    timeout: 30000,
    enableRetry: true,
    enableCircuitBreaker: true,
    enableLogging: true
  },
  authConfig: {
    tokenRefreshBuffer: 5,
    maxRefreshAttempts: 3,
    storageEncryption: true
  },
  storageConfig: {
    adapter: 'memory',
    encryption: true
  },
  offlineConfig: {
    enabled: false,
    maxQueueSize: 1000,
    syncInterval: 30000
  },
  performanceConfig: {
    enableCaching: true,
    cacheSize: 100,
    cacheTTL: 300000
  }
};
```

## Authentication System

### AuthService Class

Handles OAuth2 authentication with automatic token refresh.

#### Methods

##### `login()`
Authenticate user with username/password.

```typescript
async login(credentials: LoginCredentials): Promise<AuthUser>
```

**Parameters:**
```typescript
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
```

**Example:**
```typescript
const user = await sdk.authService.login({
  username: 'user@example.com',
  password: 'secure-password',
  preferred_role: 'cashier',
  context: {
    merchant_id: 'merchant_123' as MerchantId,
    point_of_sale_id: 'pos_456' as PointOfSaleId
  }
});
```

##### `refreshToken()`
Refresh current access token.

```typescript
async refreshToken(): Promise<OAuth2TokenResponse>
```

##### `logout()`
Logout user and clear tokens.

```typescript
async logout(options?: LogoutOptions): Promise<void>
```

##### `getAuthState()`
Get current authentication state.

```typescript
getAuthState(): AuthState
```

**Returns:**
```typescript
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error: AuthError | null;
}
```

### User Roles and Permissions

#### UserRole Enum

```typescript
enum UserRole {
  ROLE_SUPPLIER = 'ROLE_SUPPLIER',         // Provider level
  ROLE_MERCHANT = 'ROLE_MERCHANT',         // Merchant level
  ROLE_CASHIER = 'ROLE_CASHIER',           // Cashier level
  ROLE_ADMIN = 'ROLE_ADMIN',               // Administrative access
  ROLE_PREVIOUS_ADMIN = 'ROLE_PREVIOUS_ADMIN',
  ROLE_ACUBE_MF1 = 'ROLE_ACUBE_MF1',       // A-Cube MF1 integration
  ROLE_EXTERNAL_MF1 = 'ROLE_EXTERNAL_MF1', // External MF1 integration
  ROLE_MF1 = 'ROLE_MF1'                    // Base MF1 access
}
```

#### Role Utilities

```typescript
// Check if user has specific role (including inherited)
hasRole(userRoles: UserRole[], requiredRole: UserRole): boolean

// Check if user has any of the specified roles
hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean

// Get all effective roles including inherited
getEffectiveRoles(userRoles: UserRole[]): UserRole[]

// Get primary role for display
getPrimaryRole(userRoles: UserRole[]): UserRole | null

// Convert to simple role format
toSimpleRole(userRoles: UserRole[]): SimpleUserRole
```

## HTTP Client

### HttpClient Class

Enterprise-grade HTTP client with circuit breaker, retry logic, and middleware.

#### Configuration

```typescript
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
```

#### Methods

##### `request()`
Make HTTP request with full configuration.

```typescript
async request<T = unknown>(options: RequestOptions): Promise<HttpResponse<T>>
```

**Parameters:**
```typescript
interface RequestOptions {
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
```

**Returns:**
```typescript
interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestId: string;
  duration: number;
  config?: RequestOptions;
  fromCache?: boolean;
}
```

##### Convenience Methods

```typescript
// GET request
async get<T>(url: string, options?: Partial<RequestOptions>): Promise<HttpResponse<T>>

// POST request
async post<T>(url: string, data?: unknown, options?: Partial<RequestOptions>): Promise<HttpResponse<T>>

// PUT request
async put<T>(url: string, data?: unknown, options?: Partial<RequestOptions>): Promise<HttpResponse<T>>

// DELETE request
async delete<T>(url: string, options?: Partial<RequestOptions>): Promise<HttpResponse<T>>

// PATCH request
async patch<T>(url: string, data?: unknown, options?: Partial<RequestOptions>): Promise<HttpResponse<T>>
```

#### Middleware System

```typescript
// Add custom middleware
addMiddleware(middleware: Middleware): HttpClient

// Remove middleware
removeMiddleware(name: string): HttpClient
```

#### Health and Metrics

```typescript
// Get circuit breaker metrics
getCircuitBreakerMetrics(): CircuitBreakerMetrics

// Get retry metrics
getRetryMetrics(): RetryMetrics

// Get overall client metrics
getMetrics(): {
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  averageResponseTime: number;
  retryCount: number;
}

// Get health status
getHealth(): {
  status: 'healthy' | 'unhealthy';
  circuitBreakerState: string;
  lastError: string | null;
  uptime: number;
}
```

## Resources API

All resources inherit from `BaseOpenAPIResource` and provide type-safe operations.

### Cashiers Resource

Manage cashier accounts and operations.

```typescript
interface CashiersResource {
  // List cashiers with pagination
  list(params?: {
    limit?: number;
    offset?: number;
    merchant_id?: MerchantId;
    active?: boolean;
  }): Promise<PaginatedResponse<Cashier>>;
  
  // Get cashier by ID
  get(id: CashierId): Promise<Cashier>;
  
  // Create new cashier
  create(data: CreateCashierRequest): Promise<Cashier>;
  
  // Update cashier
  update(id: CashierId, data: UpdateCashierRequest): Promise<Cashier>;
  
  // Delete cashier
  delete(id: CashierId): Promise<void>;
  
  // Get cashier permissions
  getPermissions(id: CashierId): Promise<Permission[]>;
  
  // Update cashier permissions
  updatePermissions(id: CashierId, permissions: Permission[]): Promise<void>;
}
```

### Receipts Resource

Manage e-receipt lifecycle and operations.

```typescript
interface ReceiptsResource {
  // List receipts with filtering
  list(params?: {
    limit?: number;
    offset?: number;
    merchant_id?: MerchantId;
    cashier_id?: CashierId;
    status?: ReceiptStatus;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<Receipt>>;
  
  // Get receipt by ID
  get(id: ReceiptId): Promise<Receipt>;
  
  // Create new receipt
  create(data: CreateReceiptRequest): Promise<Receipt>;
  
  // Update receipt
  update(id: ReceiptId, data: UpdateReceiptRequest): Promise<Receipt>;
  
  // Finalize receipt
  finalize(id: ReceiptId): Promise<Receipt>;
  
  // Cancel receipt
  cancel(id: ReceiptId, reason?: string): Promise<Receipt>;
  
  // Get receipt PDF
  getPDF(id: ReceiptId): Promise<Blob>;
  
  // Send receipt via email
  sendEmail(id: ReceiptId, email: string): Promise<void>;
  
  // Get receipt analytics
  getAnalytics(params: AnalyticsRequest): Promise<ReceiptAnalytics>;
}
```

### Point of Sales Resource

Manage POS devices and configurations.

```typescript
interface PointOfSalesResource {
  // List POS devices
  list(params?: {
    limit?: number;
    offset?: number;
    merchant_id?: MerchantId;
    active?: boolean;
  }): Promise<PaginatedResponse<PointOfSale>>;
  
  // Get POS by ID
  get(id: PointOfSaleId): Promise<PointOfSale>;
  
  // Create new POS
  create(data: CreatePointOfSaleRequest): Promise<PointOfSale>;
  
  // Update POS
  update(id: PointOfSaleId, data: UpdatePointOfSaleRequest): Promise<PointOfSale>;
  
  // Delete POS
  delete(id: PointOfSaleId): Promise<void>;
  
  // Get POS configuration
  getConfiguration(id: PointOfSaleId): Promise<POSConfiguration>;
  
  // Update POS configuration
  updateConfiguration(id: PointOfSaleId, config: POSConfiguration): Promise<void>;
  
  // Get POS status
  getStatus(id: PointOfSaleId): Promise<POSStatus>;
}
```

### Merchants Resource

Manage merchant accounts and business information.

```typescript
interface MerchantsResource {
  // List merchants
  list(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
  }): Promise<PaginatedResponse<Merchant>>;
  
  // Get merchant by ID
  get(id: MerchantId): Promise<Merchant>;
  
  // Create new merchant
  create(data: CreateMerchantRequest): Promise<Merchant>;
  
  // Update merchant
  update(id: MerchantId, data: UpdateMerchantRequest): Promise<Merchant>;
  
  // Delete merchant
  delete(id: MerchantId): Promise<void>;
  
  // Get merchant settings
  getSettings(id: MerchantId): Promise<MerchantSettings>;
  
  // Update merchant settings
  updateSettings(id: MerchantId, settings: MerchantSettings): Promise<void>;
  
  // Get merchant statistics
  getStatistics(id: MerchantId, period?: string): Promise<MerchantStatistics>;
}
```

### PEMs Resource

Manage PEM (Processore Elettronico di Memorizzazione) devices.

```typescript
interface PEMsResource {
  // List PEMs
  list(params?: {
    limit?: number;
    offset?: number;
    merchant_id?: MerchantId;
    status?: PEMStatus;
  }): Promise<PaginatedResponse<PEM>>;
  
  // Get PEM by ID
  get(id: PEMId): Promise<PEM>;
  
  // Register new PEM
  register(data: RegisterPEMRequest): Promise<PEM>;
  
  // Update PEM
  update(id: PEMId, data: UpdatePEMRequest): Promise<PEM>;
  
  // Deactivate PEM
  deactivate(id: PEMId, reason?: string): Promise<void>;
  
  // Get PEM certificate
  getCertificate(id: PEMId): Promise<PEMCertificate>;
  
  // Update PEM certificate
  updateCertificate(id: PEMId, certificate: PEMCertificate): Promise<void>;
  
  // Get PEM logs
  getLogs(id: PEMId, params?: LogsRequest): Promise<PaginatedResponse<PEMLog>>;
}
```

### Cash Registers Resource

Manage cash register devices and operations.

```typescript
interface CashRegistersResource {
  // List cash registers
  list(params?: {
    limit?: number;
    offset?: number;
    merchant_id?: MerchantId;
    active?: boolean;
  }): Promise<PaginatedResponse<CashRegister>>;
  
  // Get cash register by ID
  get(id: CashRegisterId): Promise<CashRegister>;
  
  // Register new cash register
  register(data: RegisterCashRegisterRequest): Promise<CashRegister>;
  
  // Update cash register
  update(id: CashRegisterId, data: UpdateCashRegisterRequest): Promise<CashRegister>;
  
  // Deactivate cash register
  deactivate(id: CashRegisterId): Promise<void>;
  
  // Get cash register status
  getStatus(id: CashRegisterId): Promise<CashRegisterStatus>;
  
  // Get cash register reports
  getReports(id: CashRegisterId, params?: ReportsRequest): Promise<CashRegisterReports>;
}
```

## Storage System

### IACubeStorage Interface

Abstract storage interface supporting multiple platforms.

```typescript
interface IACubeStorage {
  // Basic operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // Bulk operations
  getMultiple<T>(keys: string[]): Promise<Record<string, T | null>>;
  setMultiple<T>(items: Record<string, T>, ttl?: number): Promise<void>;
  deleteMultiple(keys: string[]): Promise<void>;
  
  // Query operations
  keys(pattern?: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
  
  // Metadata
  size(): Promise<number>;
  getTTL(key: string): Promise<number | null>;
  
  // Events
  on(event: 'set' | 'delete' | 'clear', listener: Function): void;
  off(event: 'set' | 'delete' | 'clear', listener: Function): void;
}
```

### Storage Adapters

#### Memory Storage (Default)
```typescript
const storage = new MemoryStorageAdapter({
  maxSize: 100, // MB
  ttlCheckInterval: 60000 // ms
});
```

#### File System Storage (Node.js)
```typescript
const storage = new FileSystemStorageAdapter({
  directory: './data',
  encryption: true,
  compression: true
});
```

#### LocalStorage Adapter (Browser)
```typescript
const storage = new LocalStorageAdapter({
  namespace: 'acube',
  encryption: true
});
```

#### AsyncStorage Adapter (React Native)
```typescript
const storage = new AsyncStorageAdapter({
  namespace: 'acube',
  encryption: true
});
```

## Error Handling

### Error Hierarchy

```typescript
class ACubeSDKError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp: number;
  recoverable: boolean;
}

class AuthenticationError extends ACubeSDKError {}
class ValidationError extends ACubeSDKError {}
class NetworkError extends ACubeSDKError {}
class RateLimitError extends ACubeSDKError {}
class ServerError extends ACubeSDKError {}
```

### Error Types

```typescript
const ErrorTypes = {
  // Authentication errors
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_FAILED: 'REFRESH_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // Business logic errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};
```

### Error Handling Example

```typescript
try {
  const receipt = await sdk.receipts.create(receiptData);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication error
    await sdk.authService.refreshToken();
    // Retry operation
  } else if (error instanceof ValidationError) {
    // Handle validation error
    console.error('Validation failed:', error.details);
  } else if (error instanceof NetworkError) {
    // Handle network error
    if (error.recoverable) {
      // Retry logic
    }
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

## Type Definitions

### Branded Types

The SDK uses branded types for type safety:

```typescript
// ID types are branded to prevent mixing
type CashierId = string & { readonly __brand: 'CashierId' };
type ReceiptId = string & { readonly __brand: 'ReceiptId' };
type MerchantId = string & { readonly __brand: 'MerchantId' };
type PointOfSaleId = string & { readonly __brand: 'PointOfSaleId' };
type PEMId = string & { readonly __brand: 'PEMId' };
type CashRegisterId = string & { readonly __brand: 'CashRegisterId' };

// Utility functions for branded types
function createCashierId(id: string): CashierId {
  return id as CashierId;
}

function createReceiptId(id: string): ReceiptId {
  return id as ReceiptId;
}
```

### Common Response Types

```typescript
// Paginated response
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// API response wrapper
interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: ValidationError[];
  metadata?: ResponseMetadata;
}

// Response metadata
interface ResponseMetadata {
  requestId: string;
  timestamp: number;
  version: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: number;
  };
}
```

## Events System

The SDK extends EventEmitter and provides comprehensive event system.

### Event Types

```typescript
// Authentication events
sdk.on('auth:login', (user: AuthUser) => {});
sdk.on('auth:logout', (reason?: string) => {});
sdk.on('auth:tokenRefresh', (tokens: OAuth2TokenResponse) => {});
sdk.on('auth:error', (error: AuthError) => {});

// HTTP events
sdk.on('http:request', (request: RequestContext) => {});
sdk.on('http:response', (response: ResponseContext) => {});
sdk.on('http:error', (error: Error) => {});

// Storage events
sdk.on('storage:set', (key: string, value: unknown) => {});
sdk.on('storage:delete', (key: string) => {});
sdk.on('storage:clear', () => {});

// Resource events
sdk.on('receipt:created', (receipt: Receipt) => {});
sdk.on('receipt:updated', (receipt: Receipt) => {});
sdk.on('receipt:finalized', (receipt: Receipt) => {});

// System events
sdk.on('ready', () => {});
sdk.on('error', (error: Error) => {});
sdk.on('destroy', () => {});
```

### Event Handling Example

```typescript
// Listen for authentication events
sdk.on('auth:login', (user) => {
  console.log('User logged in:', user.email);
});

sdk.on('auth:error', (error) => {
  console.error('Authentication error:', error.message);
  // Handle re-authentication
});

// Listen for HTTP errors
sdk.on('http:error', (error) => {
  console.error('HTTP error:', error.message);
  // Log for monitoring
});

// Listen for receipt events
sdk.on('receipt:created', (receipt) => {
  console.log('New receipt created:', receipt.id);
  // Update UI or trigger notifications
});
```

---

## Complete Example

Here's a complete example showing SDK initialization, authentication, and resource usage:

```typescript
import { ACubeSDK, UserRole } from '@acube/ereceipt-sdk';

// Initialize SDK
const sdk = new ACubeSDK({
  environment: 'sandbox',
  apiKey: 'your-api-key',
  authConfig: {
    tokenRefreshBuffer: 5,
    maxRefreshAttempts: 3
  },
  performanceConfig: {
    enableCaching: true,
    enableBatching: true
  }
});

// Setup event listeners
sdk.on('auth:login', (user) => {
  console.log('User authenticated:', user.email);
});

sdk.on('auth:error', (error) => {
  console.error('Authentication failed:', error.message);
});

// Initialize and authenticate
async function main() {
  try {
    // Initialize SDK
    await sdk.initialize();
    
    // Authenticate user
    const user = await sdk.authService.login({
      username: 'cashier@example.com',
      password: 'secure-password',
      preferred_role: UserRole.ROLE_CASHIER,
      context: {
        merchant_id: 'merchant_123' as MerchantId,
        point_of_sale_id: 'pos_456' as PointOfSaleId
      }
    });
    
    // Create a receipt
    const receipt = await sdk.receipts.create({
      merchant_id: user.merchant_id!,
      cashier_id: user.cashier_id!,
      point_of_sale_id: user.point_of_sale_id!,
      items: [
        {
          name: 'Coffee',
          quantity: 1,
          price: 2.50,
          tax_rate: 0.22
        }
      ],
      payment_method: 'cash',
      total_amount: 2.50
    });
    
    console.log('Receipt created:', receipt.id);
    
    // Finalize the receipt
    const finalizedReceipt = await sdk.receipts.finalize(receipt.id);
    console.log('Receipt finalized:', finalizedReceipt.status);
    
    // Get receipt PDF
    const pdfBlob = await sdk.receipts.getPDF(receipt.id);
    console.log('PDF generated, size:', pdfBlob.size);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

This comprehensive API reference covers all major aspects of the A-Cube E-Receipt SDK. For more specific examples and advanced usage patterns, refer to the individual resource documentation and the SDK's TypeScript definitions.