# Persistence API Reference - ACube E-Receipt SDK

## Overview

This document provides a comprehensive API reference for all persistence-related classes, interfaces, and methods in the ACube E-Receipt SDK. The persistence system handles data storage, authentication tokens, offline operations, and cross-platform compatibility.

## Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Storage Adapters](#storage-adapters)
3. [Authentication Management](#authentication-management)
4. [Offline System APIs](#offline-system-apis)
5. [Platform Detection](#platform-detection)
6. [Error Types](#error-types)
7. [Event System](#event-system)
8. [Configuration Options](#configuration-options)

## Core Interfaces

### IStorage

Basic storage interface for non-sensitive data.

```typescript
interface IStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
  multiSet(keyValuePairs: Array<[string, string]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}
```

#### Methods

##### get(key: string): Promise<string | null>

Retrieves a value for the given key.

**Parameters:**
- `key` (string): The storage key

**Returns:** Promise resolving to the stored value or null if not found

**Example:**
```typescript
const userData = await storage.get('user_preferences');
if (userData) {
  const preferences = JSON.parse(userData);
}
```

##### set(key: string, value: string): Promise<void>

Stores a value with the given key.

**Parameters:**
- `key` (string): The storage key
- `value` (string): The value to store

**Throws:** `StorageError` if storage operation fails

**Example:**
```typescript
await storage.set('user_preferences', JSON.stringify(preferences));
```

##### remove(key: string): Promise<void>

Removes the value for the given key.

**Parameters:**
- `key` (string): The storage key to remove

**Example:**
```typescript
await storage.remove('cached_data');
```

##### clear(): Promise<void>

Removes all stored data.

**Example:**
```typescript
await storage.clear();
```

##### getAllKeys(): Promise<string[]>

Returns all storage keys.

**Returns:** Promise resolving to array of all keys

**Example:**
```typescript
const keys = await storage.getAllKeys();
console.log('Stored keys:', keys);
```

##### multiGet(keys: string[]): Promise<Array<[string, string | null]>>

Retrieves multiple values in a single operation.

**Parameters:**
- `keys` (string[]): Array of keys to retrieve

**Returns:** Promise resolving to array of [key, value] pairs

**Example:**
```typescript
const pairs = await storage.multiGet(['key1', 'key2', 'key3']);
const values = Object.fromEntries(pairs);
```

##### multiSet(keyValuePairs: Array<[string, string]>): Promise<void>

Stores multiple key-value pairs in a single operation.

**Parameters:**
- `keyValuePairs` (Array<[string, string]>): Array of [key, value] pairs

**Example:**
```typescript
await storage.multiSet([
  ['key1', 'value1'],
  ['key2', 'value2']
]);
```

##### multiRemove(keys: string[]): Promise<void>

Removes multiple keys in a single operation.

**Parameters:**
- `keys` (string[]): Array of keys to remove

**Example:**
```typescript
await storage.multiRemove(['temp1', 'temp2', 'temp3']);
```

### ISecureStorage

Enhanced storage interface for sensitive data with security features.

```typescript
interface ISecureStorage extends IStorage {
  isAvailable(): Promise<boolean>;
  getSecurityLevel(): Promise<SecurityLevel>;
}

enum SecurityLevel {
  NONE = 0,      // No encryption
  SOFTWARE = 1,  // Software-based encryption
  HARDWARE = 2   // Hardware-backed encryption
}
```

#### Additional Methods

##### isAvailable(): Promise<boolean>

Checks if secure storage is available on the current platform.

**Returns:** Promise resolving to true if secure storage is available

**Example:**
```typescript
const isSecure = await secureStorage.isAvailable();
if (isSecure) {
  await secureStorage.set('sensitive_token', token);
} else {
  console.warn('Secure storage not available');
}
```

##### getSecurityLevel(): Promise<SecurityLevel>

Returns the security level of the storage implementation.

**Returns:** Promise resolving to SecurityLevel enum value

**Example:**
```typescript
const level = await secureStorage.getSecurityLevel();
if (level >= SecurityLevel.SOFTWARE) {
  // Safe to store sensitive data
  await secureStorage.set('auth_token', token);
}
```

### INetworkMonitor

Interface for monitoring network connectivity.

```typescript
interface INetworkMonitor extends EventEmitter {
  isOnline(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

#### Methods

##### isOnline(): Promise<boolean>

Checks current network connectivity status.

**Returns:** Promise resolving to true if network is available

**Example:**
```typescript
const online = await networkMonitor.isOnline();
if (online) {
  await syncData();
}
```

##### start(): Promise<void>

Starts monitoring network status changes.

**Example:**
```typescript
await networkMonitor.start();
networkMonitor.on('statusChanged', (isOnline) => {
  console.log('Network status:', isOnline ? 'Online' : 'Offline');
});
```

##### stop(): Promise<void>

Stops monitoring network status changes.

**Example:**
```typescript
await networkMonitor.stop();
```

## Storage Adapters

### WebStorageAdapter

Web platform storage implementation using localStorage.

```typescript
class WebStorageAdapter implements IStorage {
  constructor(storage?: Storage);
}
```

**Constructor Parameters:**
- `storage` (Storage, optional): Browser Storage object (defaults to localStorage)

**Example:**
```typescript
// Use localStorage (default)
const storage = new WebStorageAdapter();

// Use sessionStorage
const sessionStorage = new WebStorageAdapter(window.sessionStorage);
```

### WebSecureStorageAdapter

Web platform secure storage with XOR encryption.

```typescript
class WebSecureStorageAdapter implements ISecureStorage {
  constructor(storage?: Storage);
}
```

**Features:**
- XOR encryption with randomly generated keys
- Keys stored separately with 'secure_' prefix
- Automatic key generation using crypto.getRandomValues()

**Example:**
```typescript
const secureStorage = new WebSecureStorageAdapter();
await secureStorage.set('token', 'sensitive_data');
```

### ReactNativeStorageAdapter

React Native storage using AsyncStorage.

```typescript
class ReactNativeStorageAdapter implements IStorage {
  constructor();
}
```

**Features:**
- Automatic detection of AsyncStorage implementation
- Supports both @react-native-async-storage/async-storage and legacy RN AsyncStorage
- Dynamic imports to avoid Metro bundling issues

**Example:**
```typescript
const storage = new ReactNativeStorageAdapter();
await storage.set('user_data', JSON.stringify(userData));
```

### ReactNativeSecureStorageAdapter

React Native secure storage using Keychain/Keystore.

```typescript
class ReactNativeSecureStorageAdapter implements ISecureStorage {
  constructor();
}
```

**Features:**
- Primary: Expo SecureStore (iOS Keychain/Android EncryptedSharedPreferences)
- Fallback: react-native-keychain
- Hardware-backed encryption when available

**Example:**
```typescript
const secureStorage = new ReactNativeSecureStorageAdapter();
const level = await secureStorage.getSecurityLevel();
// Returns SecurityLevel.HARDWARE on supported devices
```

### NodeStorageAdapter

Node.js in-memory storage for development/testing.

```typescript
class NodeStorageAdapter implements IStorage {
  constructor();
}
```

**Note:** Data is not persistent across process restarts. For production, implement file-based or database storage.

**Example:**
```typescript
const storage = new NodeStorageAdapter();
await storage.set('test_data', 'value');
// Data lost when process exits
```

## Authentication Management

### AuthManager

Manages authentication state and token persistence.

```typescript
class AuthManager {
  constructor(
    config: ConfigManager,
    secureStorage: ISecureStorage,
    events?: AuthEvents
  );
}
```

#### Constructor Parameters

- `config` (ConfigManager): SDK configuration manager
- `secureStorage` (ISecureStorage): Secure storage implementation
- `events` (AuthEvents, optional): Event handlers for auth events

#### Methods

##### login(credentials: AuthCredentials): Promise<User>

Authenticates user and stores tokens securely.

**Parameters:**
- `credentials` (AuthCredentials): User login credentials

```typescript
interface AuthCredentials {
  email: string;
  password: string;
}
```

**Returns:** Promise resolving to authenticated User object

**Storage Keys Used:**
- `acube_tokens`: JWT token with expiration
- `acube_user`: User profile data

**Example:**
```typescript
const user = await authManager.login({
  email: 'user@example.com',
  password: 'password123'
});
console.log('Logged in as:', user.email);
```

##### logout(): Promise<void>

Logs out user and clears stored authentication data.

**Clears:**
- JWT tokens
- User profile data
- All secure authentication state

**Example:**
```typescript
await authManager.logout();
console.log('User logged out');
```

##### getCurrentUser(): Promise<User>

Retrieves current authenticated user.

**Returns:** Promise resolving to User object

**Throws:** `ACubeSDKError` with type 'AUTH_ERROR' if not authenticated

**Data Sources (in order):**
1. Memory cache
2. Secure storage
3. Valid JWT token parsing

**Example:**
```typescript
try {
  const user = await authManager.getCurrentUser();
  console.log('Current user:', user.email);
} catch (error) {
  if (error.type === 'AUTH_ERROR') {
    // User not authenticated
    redirectToLogin();
  }
}
```

##### isAuthenticated(): Promise<boolean>

Checks if user is currently authenticated with valid token.

**Returns:** Promise resolving to authentication status

**Validation:**
- Token exists in secure storage
- Token not expired (with 5-minute buffer)

**Example:**
```typescript
const isAuth = await authManager.isAuthenticated();
if (!isAuth) {
  await redirectToLogin();
}
```

##### getAccessToken(): Promise<string | null>

Retrieves valid access token for API calls.

**Returns:** Promise resolving to JWT token or null if invalid/expired

**Features:**
- Automatic expiration checking
- Expired token cleanup

**Example:**
```typescript
const token = await authManager.getAccessToken();
if (token) {
  apiClient.setAuthHeader(`Bearer ${token}`);
} else {
  await refreshAuthentication();
}
```

#### Types

##### User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;
  fid: string;
  pid: string | null;
}
```

##### AuthEvents

```typescript
interface AuthEvents {
  onAuthError?: (error: ACubeSDKError) => void;
  onUserChanged?: (user: User | null) => void;
}
```

**Example:**
```typescript
const authManager = new AuthManager(config, secureStorage, {
  onAuthError: (error) => {
    console.error('Auth error:', error.message);
    showLoginForm();
  },
  onUserChanged: (user) => {
    if (user) {
      console.log('User logged in:', user.email);
    } else {
      console.log('User logged out');
    }
  }
});
```

## Offline System APIs

### OperationQueue

Manages persistent queue of offline operations.

```typescript
class OperationQueue {
  constructor(storage: IStorage, config?: QueueConfig);
}
```

#### Constructor Parameters

- `storage` (IStorage): Storage adapter for queue persistence
- `config` (QueueConfig, optional): Queue configuration options

#### Configuration

```typescript
interface QueueConfig {
  maxSize: number;      // Default: 1000
  batchSize: number;    // Default: 10
  maxRetries: number;   // Default: 3
  retryDelay: number;   // Default: 1000 (ms)
}
```

#### Methods

##### add(operation: QueuedOperation): Promise<void>

Adds operation to the queue.

**Parameters:**
- `operation` (QueuedOperation): Operation to queue

```typescript
interface QueuedOperation {
  id: string;
  type: OperationType;
  resource: ResourceType;
  data: any;
  endpoint: string;
  method: HTTPMethod;
  priority: number;
  status: OperationStatus;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

enum ResourceType {
  RECEIPT = 'receipt',
  CASHIER = 'cashier',
  POINT_OF_SALE = 'point-of-sale',
  CASH_REGISTER = 'cash-register',
  MERCHANT = 'merchant',
  PEM = 'pem'
}

enum OperationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

**Example:**
```typescript
await queue.add({
  id: 'receipt_001',
  type: OperationType.CREATE,
  resource: ResourceType.RECEIPT,
  data: receiptData,
  endpoint: '/receipts',
  method: 'POST',
  priority: 2,
  status: OperationStatus.PENDING,
  createdAt: new Date(),
  attempts: 0
});
```

##### getNextBatch(size?: number): Promise<QueuedOperation[]>

Gets next batch of operations to process.

**Parameters:**
- `size` (number, optional): Batch size (defaults to config.batchSize)

**Returns:** Promise resolving to array of operations ordered by priority

**Example:**
```typescript
const batch = await queue.getNextBatch(5);
for (const operation of batch) {
  await processOperation(operation);
}
```

##### updateOperation(id: string, updates: Partial<QueuedOperation>): Promise<void>

Updates an operation in the queue.

**Parameters:**
- `id` (string): Operation ID
- `updates` (Partial<QueuedOperation>): Fields to update

**Example:**
```typescript
await queue.updateOperation('receipt_001', {
  status: OperationStatus.COMPLETED,
  attempts: 1
});
```

##### removeOperation(id: string): Promise<void>

Removes operation from queue.

**Parameters:**
- `id` (string): Operation ID to remove

**Example:**
```typescript
await queue.removeOperation('failed_operation_123');
```

##### getStats(): Promise<QueueStats>

Gets queue statistics.

**Returns:** Promise resolving to queue statistics

```typescript
interface QueueStats {
  size: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
```

**Example:**
```typescript
const stats = await queue.getStats();
console.log(`Queue: ${stats.pending} pending, ${stats.failed} failed`);
```

##### clear(): Promise<void>

Clears all operations from queue.

**Example:**
```typescript
await queue.clear();
```

### SyncManager

Handles synchronization of queued operations with the API.

```typescript
class SyncManager extends EventEmitter {
  constructor(
    queue: OperationQueue,
    httpClient: AxiosInstance,
    config?: SyncConfig
  );
}
```

#### Constructor Parameters

- `queue` (OperationQueue): Operation queue to sync
- `httpClient` (AxiosInstance): HTTP client for API calls
- `config` (SyncConfig, optional): Sync configuration

#### Configuration

```typescript
interface SyncConfig {
  batchDelay: number;        // Default: 500 (ms)
  maxConcurrentBatches: number; // Default: 1
  retryableStatusCodes: number[]; // Default: [429, 500, 502, 503, 504]
}
```

#### Methods

##### syncBatch(operations: QueuedOperation[]): Promise<SyncBatchResult>

Synchronizes a batch of operations.

**Parameters:**
- `operations` (QueuedOperation[]): Operations to sync

**Returns:** Promise resolving to batch sync results

```typescript
interface SyncBatchResult {
  results: SyncResult[];
  successCount: number;
  failureCount: number;
}

interface SyncResult {
  operation: QueuedOperation;
  success: boolean;
  response?: any;
  error?: string;
}
```

**Example:**
```typescript
const batch = await queue.getNextBatch();
const result = await syncManager.syncBatch(batch);
console.log(`Synced: ${result.successCount} success, ${result.failureCount} failed`);
```

##### syncAll(): Promise<SyncBatchResult>

Synchronizes all pending operations in batches.

**Returns:** Promise resolving to combined sync results

**Features:**
- Processes operations in priority order
- Batches operations according to configuration
- Adds delay between batches
- Handles retryable errors automatically

**Example:**
```typescript
const result = await syncManager.syncAll();
if (result.failureCount > 0) {
  console.warn(`${result.failureCount} operations failed to sync`);
}
```

#### Events

##### 'batchSyncing'

Emitted when batch sync starts.

**Payload:** `{ operations: QueuedOperation[] }`

##### 'batchSynced'

Emitted when batch sync completes.

**Payload:** `{ result: SyncBatchResult }`

##### 'operationSynced'

Emitted when individual operation syncs.

**Payload:** `{ result: SyncResult }`

**Example:**
```typescript
syncManager.on('batchSynced', ({ result }) => {
  console.log(`Batch synced: ${result.successCount}/${result.results.length}`);
});

syncManager.on('operationSynced', ({ result }) => {
  if (result.success) {
    console.log(`Operation ${result.operation.id} synced successfully`);
  } else {
    console.error(`Operation ${result.operation.id} failed: ${result.error}`);
  }
});
```

### OfflineManager

High-level API combining queue and sync functionality.

```typescript
class OfflineManager extends EventEmitter {
  constructor(
    storage: IStorage,
    httpClient: AxiosInstance,
    networkMonitor: INetworkMonitor,
    config?: OfflineConfig
  );
}
```

#### Constructor Parameters

- `storage` (IStorage): Storage adapter for queue persistence
- `httpClient` (AxiosInstance): HTTP client for API calls
- `networkMonitor` (INetworkMonitor): Network connectivity monitor
- `config` (OfflineConfig, optional): Offline configuration

#### Configuration

```typescript
interface OfflineConfig {
  queue?: QueueConfig;
  sync?: SyncConfig;
  autoSyncInterval: number;  // Default: 30000 (ms)
  enableAutoSync: boolean;   // Default: true
}
```

#### Methods

##### queueOperation(operation: Omit<QueuedOperation, 'id' | 'status' | 'createdAt' | 'attempts'>): Promise<string>

Queues an operation for later synchronization.

**Parameters:**
- `operation`: Operation data without auto-generated fields

**Returns:** Promise resolving to generated operation ID

**Example:**
```typescript
const operationId = await offlineManager.queueOperation({
  type: OperationType.CREATE,
  resource: ResourceType.RECEIPT,
  data: receiptData,
  endpoint: '/receipts',
  method: 'POST',
  priority: 2
});
```

##### createReceipt(data: any): Promise<string>

Queues receipt creation operation.

**Parameters:**
- `data` (any): Receipt data

**Returns:** Promise resolving to operation ID

**Priority:** 2

**Example:**
```typescript
const operationId = await offlineManager.createReceipt({
  items: [{ description: 'Coffee', price: '2.50' }],
  total: '2.50'
});
```

##### voidReceipt(receiptId: string): Promise<string>

Queues receipt void operation.

**Parameters:**
- `receiptId` (string): Receipt ID to void

**Returns:** Promise resolving to operation ID

**Priority:** 3

**Example:**
```typescript
const operationId = await offlineManager.voidReceipt('receipt_123');
```

##### returnReceipt(receiptId: string, data?: any): Promise<string>

Queues receipt return operation.

**Parameters:**
- `receiptId` (string): Receipt ID to return
- `data` (any, optional): Return data

**Returns:** Promise resolving to operation ID

**Priority:** 3

**Example:**
```typescript
const operationId = await offlineManager.returnReceipt('receipt_123', {
  reason: 'Customer request'
});
```

##### createCashier(data: any): Promise<string>

Queues cashier creation operation.

**Parameters:**
- `data` (any): Cashier data

**Returns:** Promise resolving to operation ID

**Priority:** 1

**Example:**
```typescript
const operationId = await offlineManager.createCashier({
  name: 'John Doe',
  email: 'john@example.com'
});
```

##### syncAll(): Promise<SyncBatchResult>

Manually synchronizes all queued operations.

**Returns:** Promise resolving to sync results

**Example:**
```typescript
const result = await offlineManager.syncAll();
console.log(`Sync completed: ${result.successCount} success`);
```

##### getQueueStats(): Promise<QueueStats>

Gets current queue statistics.

**Returns:** Promise resolving to queue statistics

**Example:**
```typescript
const stats = await offlineManager.getQueueStats();
if (stats.failed > 0) {
  console.warn(`${stats.failed} operations failed`);
}
```

##### removeOperation(id: string): Promise<void>

Removes operation from queue.

**Parameters:**
- `id` (string): Operation ID

**Example:**
```typescript
await offlineManager.removeOperation('failed_operation_id');
```

##### clearQueue(): Promise<void>

Clears all operations from queue.

**Example:**
```typescript
await offlineManager.clearQueue();
```

##### startAutoSync(): void

Starts automatic synchronization when online.

**Features:**
- Monitors network status
- Syncs automatically when network becomes available
- Configurable sync interval

**Example:**
```typescript
offlineManager.startAutoSync();
```

##### stopAutoSync(): void

Stops automatic synchronization.

**Example:**
```typescript
offlineManager.stopAutoSync();
```

#### Events

##### 'operationQueued'

Emitted when operation is added to queue.

**Payload:** `{ operation: QueuedOperation }`

##### 'operationCompleted'

Emitted when operation completes successfully.

**Payload:** `{ operation: QueuedOperation, result: SyncResult }`

##### 'operationFailed'

Emitted when operation fails permanently.

**Payload:** `{ operation: QueuedOperation, error: string }`

##### 'syncStarted'

Emitted when sync process starts.

**Payload:** `{ operationCount: number }`

##### 'syncCompleted'

Emitted when sync process completes.

**Payload:** `{ result: SyncBatchResult }`

**Example:**
```typescript
offlineManager.on('operationQueued', ({ operation }) => {
  console.log(`Queued ${operation.type} ${operation.resource}`);
});

offlineManager.on('operationCompleted', ({ operation, result }) => {
  console.log(`Completed operation ${operation.id}`);
});

offlineManager.on('operationFailed', ({ operation, error }) => {
  console.error(`Failed operation ${operation.id}: ${error}`);
});
```

## Platform Detection

### PlatformDetector

Utility class for detecting the current runtime platform.

```typescript
class PlatformDetector {
  static detect(): Platform;
  static isWeb(): boolean;
  static isReactNative(): boolean;
  static isNode(): boolean;
  static isExpo(): boolean;
}
```

#### Methods

##### detect(): Platform

Detects the current platform.

**Returns:** Platform enum value

```typescript
enum Platform {
  WEB = 'web',
  REACT_NATIVE = 'react-native',
  NODE = 'node',
  UNKNOWN = 'unknown'
}
```

**Detection Logic:**
1. Check for Expo environment
2. Check for React Native environment
3. Check for Node.js environment
4. Default to Web if `window` exists
5. Return UNKNOWN if none match

**Example:**
```typescript
const platform = PlatformDetector.detect();
switch (platform) {
  case Platform.WEB:
    console.log('Running in browser');
    break;
  case Platform.REACT_NATIVE:
    console.log('Running in React Native');
    break;
  case Platform.NODE:
    console.log('Running in Node.js');
    break;
}
```

##### isWeb(): boolean

Checks if running in web browser.

**Returns:** True if web platform

##### isReactNative(): boolean

Checks if running in React Native.

**Returns:** True if React Native platform

##### isNode(): boolean

Checks if running in Node.js.

**Returns:** True if Node.js platform

##### isExpo(): boolean

Checks if running in Expo environment.

**Returns:** True if Expo environment detected

**Example:**
```typescript
if (PlatformDetector.isExpo()) {
  // Use Expo-specific APIs
  const secureStorage = new ExpoSecureStorageAdapter();
} else if (PlatformDetector.isReactNative()) {
  // Use React Native APIs
  const secureStorage = new ReactNativeSecureStorageAdapter();
}
```

## Error Types

### ACubeSDKError

Base error class for SDK-specific errors.

```typescript
class ACubeSDKError extends Error {
  constructor(
    public type: SDKError,
    message: string,
    public originalError?: any,
    public statusCode?: number
  );
}

type SDKError = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'FORBIDDEN_ERROR'
  | 'STORAGE_ERROR'
  | 'QUEUE_ERROR'
  | 'SYNC_ERROR'
  | 'UNKNOWN_ERROR';
```

#### Properties

- `type` (SDKError): Error category
- `message` (string): Error description
- `originalError` (any, optional): Original underlying error
- `statusCode` (number, optional): HTTP status code if applicable

#### Usage in Persistence Context

```typescript
try {
  await storage.set('key', 'value');
} catch (error) {
  if (error instanceof ACubeSDKError) {
    switch (error.type) {
      case 'STORAGE_ERROR':
        console.error('Storage failed:', error.message);
        break;
      case 'AUTH_ERROR':
        console.error('Authentication failed:', error.message);
        break;
    }
  }
}
```

### Storage-Specific Errors

#### StorageQuotaExceededError

Thrown when storage quota is exceeded.

```typescript
class StorageQuotaExceededError extends ACubeSDKError {
  constructor(message: string) {
    super('STORAGE_ERROR', message);
  }
}
```

#### SecureStorageUnavailableError

Thrown when secure storage is not available.

```typescript
class SecureStorageUnavailableError extends ACubeSDKError {
  constructor(message: string) {
    super('STORAGE_ERROR', message);
  }
}
```

### Queue-Specific Errors

#### QueueFullError

Thrown when queue reaches maximum size.

```typescript
class QueueFullError extends ACubeSDKError {
  constructor(maxSize: number) {
    super('QUEUE_ERROR', `Queue full: maximum ${maxSize} operations`);
  }
}
```

#### InvalidOperationError

Thrown when operation data is invalid.

```typescript
class InvalidOperationError extends ACubeSDKError {
  constructor(reason: string) {
    super('VALIDATION_ERROR', `Invalid operation: ${reason}`);
  }
}
```

## Event System

### EventEmitter Integration

Many persistence classes extend EventEmitter for real-time updates.

```typescript
import { EventEmitter } from 'events';

// Classes that emit events
class SyncManager extends EventEmitter { /* ... */ }
class OfflineManager extends EventEmitter { /* ... */ }
class NetworkMonitor extends EventEmitter { /* ... */ }
```

### Common Event Patterns

#### Network Status Events

```typescript
networkMonitor.on('statusChanged', (isOnline: boolean) => {
  console.log('Network:', isOnline ? 'Online' : 'Offline');
});

networkMonitor.on('connected', () => {
  console.log('Network connected');
});

networkMonitor.on('disconnected', () => {
  console.log('Network disconnected');
});
```

#### Sync Events

```typescript
syncManager.on('batchSyncing', ({ operations }) => {
  console.log(`Starting sync of ${operations.length} operations`);
});

syncManager.on('batchSynced', ({ result }) => {
  console.log(`Sync completed: ${result.successCount}/${result.results.length}`);
});

syncManager.on('operationSynced', ({ result }) => {
  if (result.success) {
    notifyOperationSuccess(result.operation);
  } else {
    handleOperationError(result.operation, result.error);
  }
});
```

#### Offline Manager Events

```typescript
offlineManager.on('operationQueued', ({ operation }) => {
  updateUI('Operation queued for sync');
});

offlineManager.on('operationCompleted', ({ operation, result }) => {
  updateUI(`${operation.type} completed successfully`);
});

offlineManager.on('operationFailed', ({ operation, error }) => {
  showError(`${operation.type} failed: ${error}`);
});

offlineManager.on('syncStarted', ({ operationCount }) => {
  showSyncProgress(0, operationCount);
});

offlineManager.on('syncCompleted', ({ result }) => {
  hideSyncProgress();
  if (result.failureCount > 0) {
    showWarning(`${result.failureCount} operations failed to sync`);
  }
});
```

## Configuration Options

### SDK Configuration

Main SDK configuration affecting persistence.

```typescript
interface SDKConfig {
  environment: Environment;
  apiUrl?: string;
  authUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  debug?: boolean;
  customHeaders?: Record<string, string>;
  
  // Storage configuration
  storageAdapter?: IStorage;
  secureStorageAdapter?: ISecureStorage;
  networkMonitorAdapter?: INetworkMonitor;
  
  // Offline configuration
  offline?: OfflineConfig;
}
```

### Offline Configuration

```typescript
interface OfflineConfig {
  // Queue settings
  queue?: {
    maxSize: number;        // Default: 1000
    batchSize: number;      // Default: 10
    maxRetries: number;     // Default: 3
    retryDelay: number;     // Default: 1000
  };
  
  // Sync settings
  sync?: {
    batchDelay: number;           // Default: 500
    maxConcurrentBatches: number; // Default: 1
    retryableStatusCodes: number[]; // Default: [429, 500, 502, 503, 504]
  };
  
  // Auto-sync settings
  autoSyncInterval: number;  // Default: 30000
  enableAutoSync: boolean;   // Default: true
}
```

### Usage Example

```typescript
const sdk = await createACubeSDK({
  environment: 'production',
  debug: false,
  timeout: 10000,
  
  // Custom storage adapters
  storageAdapter: new CustomStorageAdapter(),
  secureStorageAdapter: new CustomSecureStorageAdapter(),
  
  // Offline configuration
  offline: {
    queue: {
      maxSize: 2000,
      batchSize: 20,
      maxRetries: 5
    },
    sync: {
      batchDelay: 1000,
      maxConcurrentBatches: 2
    },
    autoSyncInterval: 15000,
    enableAutoSync: true
  }
});
```

### Environment-Specific Defaults

```typescript
// Development
const devConfig: Partial<SDKConfig> = {
  debug: true,
  timeout: 5000,
  offline: {
    autoSyncInterval: 60000, // Less frequent for development
    queue: { maxSize: 100 }  // Smaller queue for testing
  }
};

// Production
const prodConfig: Partial<SDKConfig> = {
  debug: false,
  timeout: 10000,
  offline: {
    autoSyncInterval: 30000,
    queue: { maxSize: 1000, maxRetries: 5 }
  }
};

// Testing
const testConfig: Partial<SDKConfig> = {
  storageAdapter: new MemoryStorageAdapter(),
  secureStorageAdapter: new MemorySecureStorageAdapter(),
  offline: { enableAutoSync: false }
};
```

---

## Support and Resources

- **GitHub Repository**: [ACube E-Receipt SDK](https://github.com/a-cube-io/acube-ereceipt)
- **General Documentation**: [Persistence Overview](./PERSISTENCE_DOCUMENTATION.md)
- **Authentication Guide**: [Auth System Documentation](./AUTH_API_DOCUMENTATION.md)
- **Role Management**: [Role System Documentation](./ROLES_API_DOCUMENTATION.md)

For technical questions about the persistence APIs, please refer to the project repository or contact the development team.