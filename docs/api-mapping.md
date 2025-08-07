# ACube E-Receipt SDK - Comprehensive API Mapping

## Overview

The ACube E-Receipt SDK is a multi-platform TypeScript SDK for Italian electronic receipt management, supporting Web, Node.js, and React Native platforms with offline capabilities.

**Package**: `@a-cube-io/ereceipts-js-sdk`  
**Version**: 0.1.0  
**Platforms**: Web, Node.js, React Native  
**Main Exports**: Core SDK + React Components  

## Main Entry Points

### Core SDK Export
```typescript
// Main exports from src/index.ts
export * from './acube-sdk';        // Main SDK class
export * from './core';             // Core functionality  
export * from './adapters';         // Platform adapters
export * from './offline';          // Offline functionality
export { createACubeSDK as default } from './acube-sdk'; // Default export
```

### React Export
```typescript
// React-specific exports from src/react/index.ts
export * from './context';          // React Context Provider
export * from './hooks';            // React Hooks
```

## 1. Core SDK Classes

### ACubeSDK (Main SDK Class)

**Location**: `src/acube-sdk.ts`  
**Purpose**: Main SDK entry point with authentication, API access, and offline management

#### Constructor
```typescript
constructor(
  config: SDKConfig,
  customAdapters?: PlatformAdapters,
  events: SDKEvents = {}
)
```

#### Core Methods

##### Initialization
```typescript
async initialize(): Promise<void>
```
- Initializes platform adapters, API client, auth manager, and offline manager
- Sets up network monitoring and event handlers
- **Platform Availability**: All platforms

##### Authentication
```typescript
async login(credentials: AuthCredentials): Promise<User>
async logout(): Promise<void>
async getCurrentUser(): Promise<User | null>
async isAuthenticated(): Promise<boolean>
```
- **Platform Availability**: All platforms
- **Dependencies**: AuthManager, SecureStorage adapter

##### Configuration
```typescript
getConfig(): SDKConfig
updateConfig(updates: Partial<SDKConfig>): void
```

##### Offline Management
```typescript
getOfflineManager(): OfflineManager
isOnline(): boolean
```

##### Advanced Access
```typescript
getAdapters(): PlatformAdapters | undefined
destroy(): void
```

#### Public Properties
```typescript
public api?: APIClient  // Access to all API endpoints
```

### createACubeSDK (Factory Function)

```typescript
async function createACubeSDK(
  config: SDKConfig,
  customAdapters?: PlatformAdapters,  
  events?: SDKEvents
): Promise<ACubeSDK>
```
- **Purpose**: Create and initialize SDK in one call
- **Returns**: Initialized ACubeSDK instance
- **Platform Availability**: All platforms

## 2. Configuration Types

### SDKConfig
```typescript
interface SDKConfig {
  environment: Environment;           // 'production' | 'development' | 'sandbox'
  apiUrl?: string;                   // Custom API URL (optional)
  authUrl?: string;                  // Custom auth URL (optional) 
  timeout?: number;                  // Request timeout in ms (default: 30000)
  retryAttempts?: number;            // Retry attempts (default: 3)
  debug?: boolean;                   // Debug mode (default: false)
  customHeaders?: Record<string, string>; // Custom HTTP headers
}
```

### SDKEvents
```typescript
interface SDKEvents {
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
  onOfflineOperationAdded?: (operationId: string) => void;
  onOfflineOperationCompleted?: (operationId: string, success: boolean) => void;
}
```

## 3. API Client Classes

### APIClient (Main API Hub)

**Location**: `src/core/api/api-client.ts`  
**Purpose**: Centralized access to all API endpoints

#### Resource Managers
```typescript
public readonly receipts: ReceiptsAPI;
public readonly cashiers: CashiersAPI;
public readonly pointOfSales: PointOfSalesAPI;
public readonly cashRegisters: CashRegistersAPI;
public readonly merchants: MerchantsAPI;
public readonly pems: PemsAPI;
```

#### Authorization Methods
```typescript
setAuthorizationHeader(token: string): void
removeAuthorizationHeader(): void
getHttpClient(): HttpClient
```

### ReceiptsAPI

**Location**: `src/core/api/receipts.ts`  
**Purpose**: Electronic receipt management

#### Methods
```typescript
// Create new receipt
async create(receiptData: ReceiptInput): Promise<ReceiptOutput>

// List receipts with pagination
async list(params: { page?: number; size?: number }): Promise<Page<ReceiptOutput>>

// Get specific receipt
async get(receiptUuid: string): Promise<ReceiptOutput>

// Get receipt details (JSON or PDF)
async getDetails(
  receiptUuid: string, 
  format: 'json' | 'pdf' = 'json'
): Promise<ReceiptDetailsOutput | Blob>

// Void receipt
async void(voidData: ReceiptReturnOrVoidViaPEMInput): Promise<void>
async voidWithProof(voidData: ReceiptReturnOrVoidWithProofInput): Promise<void>

// Return receipt
async return(returnData: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput>
async returnWithProof(returnData: ReceiptReturnOrVoidWithProofInput): Promise<ReceiptOutput>
```

### CashiersAPI

**Location**: `src/core/api/cashiers.ts`  
**Purpose**: Cashier management

#### Methods
```typescript
// List cashiers with pagination
async list(params: { page?: number; size?: number }): Promise<Page<CashierOutput>>

// Create new cashier
async create(cashierData: CashierCreateInput): Promise<CashierOutput>

// Get current authenticated cashier
async me(): Promise<CashierOutput>

// Get specific cashier
async get(cashierId: number): Promise<CashierOutput>

// Delete cashier
async delete(cashierId: number): Promise<void>
```

### PointOfSalesAPI

**Location**: `src/core/api/point-of-sales.ts`  
**Purpose**: Point of Sale (PEM) management

### CashRegistersAPI

**Location**: `src/core/api/cash-registers.ts`  
**Purpose**: Cash register management

### MerchantsAPI

**Location**: `src/core/api/merchants.ts`  
**Purpose**: Merchant management (MF2)

### PemsAPI

**Location**: `src/core/api/pems.ts`  
**Purpose**: PEM device management (MF2)

## 4. Type Definitions

### Core Types

#### Authentication
```typescript
interface AuthCredentials {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  roles: Record<string, string[]>;
  fid: string;                    // Fiscal ID
  pid: string | null;             // PEM ID
}

interface TokenResponse {
  token: string;
}

interface JWTPayload {
  iat: number;                    // Issued at
  exp: number;                    // Expires at
  roles: Record<string, string[]>;
  username: string;
  uid: number;                    // User ID
  fid: string;                    // Fiscal ID
  pid: string | null;             // PEM ID
}
```

#### Receipt Types
```typescript
type ReceiptType = 'sale' | 'return' | 'void';
type GoodOrService = 'B' | 'S';  // Bene (Good) | Servizio (Service)
type VatRateCode = '4' | '5' | '10' | '22' | '2' | '6.4' | '7' | '7.3' | '7.5' | 
                   '7.65' | '7.95' | '8.3' | '8.5' | '8.8' | '9.5' | '12.3' | 
                   'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6';

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
```

### Error Handling
```typescript
type SDKError = 'NETWORK_ERROR' | 'AUTH_ERROR' | 'VALIDATION_ERROR' | 
                'NOT_FOUND_ERROR' | 'FORBIDDEN_ERROR' | 'UNKNOWN_ERROR';

class ACubeSDKError extends Error {
  constructor(
    public type: SDKError,
    message: string,
    public originalError?: any,
    public statusCode?: number
  )
}
```

## 5. React Integration

### ACubeProvider (Context Provider)

**Location**: `src/react/context.tsx`  
**Purpose**: React Context Provider for SDK state management

#### Props
```typescript
interface ACubeProviderProps {
  config: SDKConfig;
  children: ReactNode;
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
}
```

#### Context Value
```typescript
interface ACubeContextValue {
  sdk: ACubeSDK | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  error: ACubeSDKError | null;
  pendingOperations: number;
}
```

#### Usage
```typescript
function useACube(): ACubeContextValue
```

### React Hooks

#### useAuth Hook

**Location**: `src/react/hooks/use-auth.ts`  
**Purpose**: Authentication operations in React

```typescript
interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ACubeSDKError | null;
  login: (credentials: AuthCredentials) => Promise<User | null>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function useAuth(): UseAuthReturn
```

#### useReceipts Hook

**Location**: `src/react/hooks/use-receipts.ts`  
**Purpose**: Receipt operations with offline support

```typescript
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

function useReceipts(): UseReceiptsReturn
```

#### useOffline Hook

**Location**: `src/react/hooks/use-offline.ts`  
**Purpose**: Offline queue management

## 6. Platform Adapters

### PlatformAdapters Interface

**Location**: `src/adapters/index.ts`  
**Purpose**: Platform-specific implementations

```typescript
interface PlatformAdapters {
  storage: IStorage;              // Local storage
  secureStorage: ISecureStorage;  // Secure/encrypted storage
  networkMonitor: INetworkMonitor; // Network connectivity monitoring
}
```

### Storage Interfaces

#### IStorage
```typescript
interface IStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

#### ISecureStorage
```typescript
interface ISecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

#### INetworkMonitor
```typescript
interface INetworkMonitor {
  isOnline(): boolean;
  onStatusChange(callback: (online: boolean) => void): void;
}
```

### Platform Implementations

#### Web Platform
- **Storage**: `localStorage` implementation
- **SecureStorage**: `localStorage` with encryption
- **Network**: `navigator.onLine` API

#### Node.js Platform  
- **Storage**: File system implementation
- **SecureStorage**: Encrypted file storage
- **Network**: Network interface monitoring

#### React Native Platform
- **Storage**: `AsyncStorage` implementation  
- **SecureStorage**: `Keychain` (iOS) / `KeyStore` (Android)
- **Network**: `@react-native-community/netinfo`

## 7. Offline System

### OfflineManager

**Location**: `src/offline/offline-manager.ts`  
**Purpose**: Manages offline operation queue and synchronization

#### Key Methods
```typescript
// Queue operations
async queueReceiptCreation(receiptData: ReceiptInput): Promise<string>
async queueReceiptVoid(voidData: ReceiptReturnOrVoidViaPEMInput): Promise<string>
async queueReceiptReturn(returnData: ReceiptReturnOrVoidViaPEMInput): Promise<string>

// Queue management
getPendingCount(): number
async sync(): Promise<BatchSyncResult>
async clearQueue(): Promise<void>
destroy(): void
```

### Queue Types

#### QueuedOperation
```typescript
interface QueuedOperation {
  id: string;
  type: OperationType;              // 'CREATE' | 'UPDATE' | 'DELETE'
  resource: ResourceType;           // 'receipt' | 'cashier' | etc.
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  status: OperationStatus;          // 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  priority: number;
}
```

#### Queue Events
```typescript
interface QueueEvents {
  onOperationAdded?: (operation: QueuedOperation) => void;
  onOperationCompleted?: (result: SyncResult) => void;
  onOperationFailed?: (result: SyncResult) => void;
  onBatchSyncCompleted?: (result: BatchSyncResult) => void;
  onQueueEmpty?: () => void;
  onError?: (error: Error) => void;
}
```

## 8. Usage Patterns

### Basic SDK Initialization
```typescript
import { createACubeSDK, SDKConfig } from '@a-cube-io/ereceipts-js-sdk';

const config: SDKConfig = {
  environment: 'sandbox',
  debug: true
};

const sdk = await createACubeSDK(config);
```

### React Integration
```typescript
import { ACubeProvider, useAuth, useReceipts } from '@a-cube-io/ereceipts-js-sdk/react';

function App() {
  return (
    <ACubeProvider config={config}>
      <ReceiptManager />
    </ACubeProvider>
  );
}

function ReceiptManager() {
  const { login } = useAuth();
  const { createReceipt, receipts } = useReceipts();
  
  // Component logic...
}
```

### Custom Platform Adapters
```typescript
import { ACubeSDK, PlatformAdapters } from '@a-cube-io/ereceipts-js-sdk';

const customAdapters: PlatformAdapters = {
  storage: new CustomStorage(),
  secureStorage: new CustomSecureStorage(),
  networkMonitor: new CustomNetworkMonitor()
};

const sdk = new ACubeSDK(config, customAdapters);
await sdk.initialize();
```

## 9. Platform Support Matrix

| Feature | Web | Node.js | React Native |
|---------|-----|---------|--------------|
| Core SDK | ✅ | ✅ | ✅ |
| Authentication | ✅ | ✅ | ✅ |
| API Clients | ✅ | ✅ | ✅ |
| Offline Queue | ✅ | ✅ | ✅ |
| React Hooks | ✅ | ❌ | ✅ |
| File Downloads | ✅ | ✅ | ⚠️* |
| Secure Storage | ⚠️** | ✅ | ✅ |

*React Native: Limited blob/file handling  
**Web: Uses localStorage with encryption (less secure than native keystore)

## 10. Error Handling Strategy

### SDK Error Types
- **NETWORK_ERROR**: Network connectivity issues
- **AUTH_ERROR**: Authentication/authorization failures  
- **VALIDATION_ERROR**: Data validation failures
- **NOT_FOUND_ERROR**: Resource not found
- **FORBIDDEN_ERROR**: Access denied
- **UNKNOWN_ERROR**: Unexpected errors

### Error Context
All SDK errors include:
- `type`: Error classification
- `message`: Human-readable description
- `originalError`: Original underlying error
- `statusCode`: HTTP status code (when applicable)

## 11. Configuration Environments

### Environment URLs
- **Production**: `https://ereceipts-it.acubeapi.com`
- **Development**: `https://ereceipts-it.dev.acubeapi.com`  
- **Sandbox**: `https://ereceipts-it-sandbox.acubeapi.com` (default)

### Auth URLs
- **Production**: `https://common.api.acubeapi.com`
- **Development/Sandbox**: `https://common-sandbox.api.acubeapi.com`

This comprehensive API mapping covers all public interfaces, types, and usage patterns available in the ACube E-Receipt SDK, providing a complete reference for developers integrating the SDK into their applications.