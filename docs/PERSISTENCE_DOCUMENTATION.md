# Data Persistence in ACube E-Receipt SDK

## Overview

The ACube E-Receipt SDK provides a comprehensive, cross-platform persistence architecture designed to handle data storage, authentication tokens, offline operations, and caching across Web, React Native, and Node.js environments. The SDK uses an adapter pattern to provide platform-specific implementations while maintaining a consistent API across all platforms.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Storage Adapters](#storage-adapters)
3. [Authentication Persistence](#authentication-persistence)
4. [Offline Data Management](#offline-data-management)
5. [Security Considerations](#security-considerations)
6. [Platform-Specific Implementations](#platform-specific-implementations)
7. [Integration Guide](#integration-guide)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Core Design Principles

The persistence system is built on several key principles:

- **Platform Abstraction**: Unified API across Web, React Native, and Node.js
- **Security First**: Sensitive data uses platform-appropriate secure storage
- **Offline Resilience**: Comprehensive offline operation queuing and synchronization
- **Modular Design**: Clean separation between storage, authentication, and offline management
- **Async by Default**: All operations are asynchronous for cross-platform consistency

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ACube SDK                            │
├─────────────────────────────────────────────────────────────┤
│  AuthManager    │  OfflineManager  │     API Clients       │
│  (Secure Data)  │  (Queue & Sync)  │   (HTTP Requests)     │
├─────────────────┼──────────────────┼─────────────────────────┤
│              Storage Abstraction Layer                     │
├─────────────────┬──────────────────┬─────────────────────────┤
│   IStorage      │  ISecureStorage  │  INetworkMonitor       │
│   (Basic Data)  │ (Sensitive Data) │  (Connectivity)        │
├─────────────────┴──────────────────┴─────────────────────────┤
│                Platform Adapters                           │
├─────────────────┬──────────────────┬─────────────────────────┤
│      Web        │  React Native    │       Node.js          │
│  localStorage   │   AsyncStorage   │     In-Memory          │
│  XOR Encryption │  Keychain/Store  │   (Development)        │
└─────────────────┴──────────────────┴─────────────────────────┘
```

## Storage Adapters

### IStorage Interface

The basic storage interface provides fundamental key-value operations:

```typescript
interface IStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  
  // Batch operations
  multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
  multiSet(keyValuePairs: Array<[string, string]>): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}
```

### ISecureStorage Interface

Enhanced storage for sensitive data with security features:

```typescript
interface ISecureStorage extends IStorage {
  isAvailable(): Promise<boolean>;
  getSecurityLevel(): Promise<SecurityLevel>;
}

enum SecurityLevel {
  NONE = 0,        // No encryption
  SOFTWARE = 1,    // Software-based encryption
  HARDWARE = 2,    // Hardware-backed encryption
}
```

## Authentication Persistence

### Token Storage

The AuthManager handles persistent authentication state using secure storage:

```typescript
// Storage keys used by AuthManager
const TOKEN_KEY = 'acube_tokens';     // JWT tokens with expiration
const USER_KEY = 'acube_user';        // User profile data
```

### Token Data Structure

```typescript
interface StoredTokenData {
  accessToken: string;    // JWT token
  expiresAt: number;     // Expiration timestamp (milliseconds)
}

interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;      // Role-based permissions
  fid: string;           // Fiscal ID
  pid: string | null;    // Partner ID
}
```

### Authentication Flow

1. **Login Process**:
   ```typescript
   const user = await authManager.login({ email, password });
   // Token and user data automatically stored in secure storage
   ```

2. **Session Restoration**:
   ```typescript
   const user = await authManager.getCurrentUser();
   // Automatically retrieves from secure storage or parses from valid JWT
   ```

3. **Token Validation**:
   - Automatic expiration checking with 5-minute buffer
   - Invalid tokens trigger automatic cleanup
   - 401 responses clear stored authentication data

### Security Features

- **Secure Storage**: Tokens stored using platform-appropriate secure storage
- **Automatic Cleanup**: Invalid or expired tokens automatically removed
- **JWT Parsing**: User data extracted from JWT payload to minimize API calls
- **Session Management**: Proper session lifecycle management

## Offline Data Management

The offline system consists of three main components working together:

### 1. OperationQueue

Manages a persistent queue of operations that need to be synchronized:

```typescript
interface QueuedOperation {
  id: string;
  type: OperationType;        // CREATE, UPDATE, DELETE
  resource: ResourceType;     // receipt, cashier, etc.
  data: any;                 // Operation payload
  endpoint: string;          // API endpoint
  method: HTTPMethod;        // HTTP method
  priority: number;          // Higher = more important
  status: OperationStatus;   // pending, processing, completed, failed
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}
```

**Queue Configuration**:
```typescript
interface QueueConfig {
  maxSize: number;           // Default: 1000
  batchSize: number;         // Default: 10
  maxRetries: number;        // Default: 3
  retryDelay: number;        // Default: 1000ms
}
```

### 2. SyncManager

Handles the synchronization of queued operations:

```typescript
interface SyncResult {
  operation: QueuedOperation;
  success: boolean;
  response?: any;
  error?: string;
}

interface SyncBatchResult {
  results: SyncResult[];
  successCount: number;
  failureCount: number;
}
```

**Sync Features**:
- **Network Awareness**: Only syncs when network is available
- **Batch Processing**: Processes operations in configurable batches
- **Retry Logic**: Exponential backoff for failed operations
- **Error Classification**: Distinguishes between retryable and permanent errors

### 3. OfflineManager

High-level API combining queue and sync functionality:

```typescript
// Common operations with predefined priorities
await offlineManager.createReceipt(receiptData);    // Priority: 2
await offlineManager.voidReceipt(receiptId);        // Priority: 3
await offlineManager.returnReceipt(receiptId);      // Priority: 3
await offlineManager.createCashier(cashierData);    // Priority: 1

// Generic operation queuing
await offlineManager.queueOperation({
  type: 'CREATE',
  resource: 'receipt',
  data: receiptData,
  endpoint: '/receipts',
  method: 'POST',
  priority: 2
});
```

### Offline Data Flow

```
1. User Action (Create Receipt)
   ↓
2. Check Network Status
   ↓
3. If Online → Direct API Call
   If Offline → Queue Operation
   ↓
4. Operation Stored in Persistent Queue
   ↓
5. Network Comes Back Online
   ↓
6. SyncManager Processes Queue
   ↓
7. Batch API Requests
   ↓
8. Update Queue with Results
   ↓
9. Retry Failed Operations
```

## Security Considerations

### Platform Security Comparison

| Platform | Storage Method | Security Level | Encryption |
|----------|---------------|----------------|------------|
| **Web** | localStorage + XOR | SOFTWARE | Client-side XOR cipher |
| **React Native iOS** | Keychain Services | HARDWARE* | iOS Keychain encryption |
| **React Native Android** | EncryptedSharedPreferences | HARDWARE* | Android Keystore |
| **Node.js** | In-Memory | NONE | No persistence |

*Hardware-backed when available on device

### Security Recommendations

#### Production Web Applications
```typescript
// Consider upgrading from XOR to Web Crypto API
if (crypto.subtle) {
  // Use Web Crypto API for stronger encryption
  // Implementation example:
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

#### Mobile Applications
```typescript
// Check security level before storing sensitive data
const securityLevel = await secureStorage.getSecurityLevel();
if (securityLevel >= SecurityLevel.SOFTWARE) {
  // Safe to store sensitive data
  await secureStorage.set('sensitive_key', sensitiveData);
} else {
  // Handle low-security scenario
  console.warn('Secure storage not available');
}
```

#### Server Applications
```typescript
// Use OS-specific secure storage for production
// Example for Node.js with keytar:
import keytar from 'keytar';

class ProductionSecureStorage implements ISecureStorage {
  async set(key: string, value: string): Promise<void> {
    await keytar.setPassword('acube-sdk', key, value);
  }
  
  async get(key: string): Promise<string | null> {
    return await keytar.getPassword('acube-sdk', key);
  }
}
```

### Data Protection Best Practices

1. **Sensitive Data Classification**:
   - **High**: Authentication tokens, user credentials
   - **Medium**: User profile data, preferences
   - **Low**: Cache data, temporary state

2. **Storage Selection**:
   - High sensitivity → Secure storage only
   - Medium sensitivity → Secure storage preferred, regular storage acceptable
   - Low sensitivity → Regular storage acceptable

3. **Data Lifecycle**:
   - Automatic cleanup of expired tokens
   - Regular cache invalidation
   - Proper logout data clearing

## Platform-Specific Implementations

### Web Platform

#### WebStorageAdapter
```typescript
class WebStorageAdapter implements IStorage {
  private storage = window.localStorage;
  
  async get(key: string): Promise<string | null> {
    return this.storage.getItem(key);
  }
  
  async set(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
  }
  
  // ... other methods
}
```

#### WebSecureStorageAdapter
```typescript
class WebSecureStorageAdapter implements ISecureStorage {
  private generateKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16)).join('');
  }
  
  private encrypt(data: string, key: string): string {
    // XOR encryption implementation
    return data.split('').map((char, i) => 
      char.charCodeAt(0) ^ key.charCodeAt(i % key.length)
    ).join('');
  }
  
  async getSecurityLevel(): Promise<SecurityLevel> {
    return SecurityLevel.SOFTWARE;
  }
}
```

### React Native Platform

#### ReactNativeStorageAdapter
```typescript
class ReactNativeStorageAdapter implements IStorage {
  private asyncStorage: any;
  
  constructor() {
    // Dynamic import to avoid Metro bundling issues
    this.initializeAsyncStorage();
  }
  
  private async initializeAsyncStorage() {
    try {
      // Try Expo AsyncStorage first
      const ExpoAsyncStorage = require('@react-native-async-storage/async-storage');
      this.asyncStorage = ExpoAsyncStorage.default || ExpoAsyncStorage;
    } catch {
      // Fallback to legacy RN AsyncStorage
      const { AsyncStorage } = require('react-native');
      this.asyncStorage = AsyncStorage;
    }
  }
}
```

#### ReactNativeSecureStorageAdapter
```typescript
class ReactNativeSecureStorageAdapter implements ISecureStorage {
  private secureStore: any;
  private keychain: any;
  
  async set(key: string, value: string): Promise<void> {
    if (this.secureStore) {
      // Use Expo SecureStore (preferred)
      await this.secureStore.setItemAsync(key, value);
    } else if (this.keychain) {
      // Use react-native-keychain (fallback)
      await this.keychain.setInternetCredentials(key, key, value);
    } else {
      throw new Error('No secure storage available');
    }
  }
  
  async getSecurityLevel(): Promise<SecurityLevel> {
    // Check for hardware-backed security
    if (this.secureStore?.getItemAsync) {
      return SecurityLevel.HARDWARE;
    }
    return SecurityLevel.SOFTWARE;
  }
}
```

### Node.js Platform

#### NodeStorageAdapter
```typescript
class NodeStorageAdapter implements IStorage {
  private storage = new Map<string, string>();
  
  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }
  
  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }
  
  async clear(): Promise<void> {
    this.storage.clear();
  }
}
```

**Note**: Node.js implementation is intended for development/testing. Production Node.js applications should implement persistent storage using file system or database solutions.

## Integration Guide

### Basic SDK Setup

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

// SDK automatically detects platform and initializes appropriate storage
const sdk = await createACubeSDK({
  environment: 'production',
  debug: false
});

// Storage is ready to use
const isAuthenticated = await sdk.auth.isAuthenticated();
```

### Custom Storage Implementation

```typescript
// Implement custom storage adapter
class CustomStorageAdapter implements IStorage {
  async get(key: string): Promise<string | null> {
    // Your custom implementation
    return await yourStorageMethod.get(key);
  }
  
  async set(key: string, value: string): Promise<void> {
    // Your custom implementation
    await yourStorageMethod.set(key, value);
  }
  
  // ... implement other required methods
}

// Use custom adapter
const sdk = await createACubeSDK({
  environment: 'production',
  storageAdapter: new CustomStorageAdapter(),
  secureStorageAdapter: new CustomSecureStorageAdapter()
});
```

### React Integration

```typescript
import { useAuth, useOffline } from '@a-cube-io/ereceipts-js-sdk/react';

function MyComponent() {
  const { user, login, logout } = useAuth();
  const { isOnline, queuedOperations, syncAll } = useOffline();
  
  const handleCreateReceipt = async (receiptData) => {
    if (isOnline) {
      // Direct API call
      const receipt = await sdk.receipts.create(receiptData);
    } else {
      // Queue for later sync
      await sdk.offline.createReceipt(receiptData);
    }
  };
  
  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      <p>Queued operations: {queuedOperations.length}</p>
      {!isOnline && (
        <button onClick={syncAll}>Sync when back online</button>
      )}
    </div>
  );
}
```

### Advanced Offline Configuration

```typescript
// Configure offline behavior
const sdk = await createACubeSDK({
  environment: 'production',
  offline: {
    maxQueueSize: 2000,        // Increase queue size
    batchSize: 20,             // Larger sync batches
    autoSyncInterval: 10000,   // Sync every 10 seconds
    maxRetries: 5,             // More retry attempts
    retryDelay: 2000           // Longer delay between retries
  }
});

// Monitor offline operations
sdk.offline.on('operationQueued', (operation) => {
  console.log('Operation queued:', operation.type, operation.resource);
});

sdk.offline.on('operationCompleted', (operation, result) => {
  console.log('Operation completed:', operation.id, result.success);
});

sdk.offline.on('syncBatchCompleted', (result) => {
  console.log(`Sync batch: ${result.successCount} success, ${result.failureCount} failed`);
});
```

## Best Practices

### Storage Management

1. **Use Appropriate Storage Types**:
   ```typescript
   // Sensitive data (tokens, credentials)
   await secureStorage.set('auth_token', token);
   
   // Non-sensitive data (preferences, cache)
   await storage.set('user_preferences', JSON.stringify(preferences));
   ```

2. **Handle Storage Availability**:
   ```typescript
   const isSecureStorageAvailable = await secureStorage.isAvailable();
   if (!isSecureStorageAvailable) {
     // Fallback to regular storage or inform user
     console.warn('Secure storage not available');
   }
   ```

3. **Implement Data Migration**:
   ```typescript
   // Check for old data format and migrate
   const oldUserData = await storage.get('old_user_key');
   if (oldUserData) {
     const migratedData = migrateUserData(JSON.parse(oldUserData));
     await secureStorage.set('acube_user', JSON.stringify(migratedData));
     await storage.remove('old_user_key');
   }
   ```

### Offline Operations

1. **Prioritize Operations**:
   ```typescript
   // High priority for business-critical operations
   await offlineManager.queueOperation({
     type: 'CREATE',
     resource: 'receipt',
     data: receiptData,
     priority: 10  // High priority
   });
   
   // Lower priority for analytics
   await offlineManager.queueOperation({
     type: 'CREATE',
     resource: 'analytics',
     data: analyticsData,
     priority: 1   // Low priority
   });
   ```

2. **Handle Sync Conflicts**:
   ```typescript
   sdk.offline.on('operationFailed', (operation, error) => {
     if (error.status === 409) {
       // Conflict - handle merge or user decision
       handleConflict(operation, error);
     } else if (error.status >= 400 && error.status < 500) {
       // Client error - don't retry
       logClientError(operation, error);
     }
     // 5xx errors automatically retried by sync manager
   });
   ```

3. **Monitor Queue Size**:
   ```typescript
   const queueStats = await offlineManager.getQueueStats();
   if (queueStats.size > 100) {
     // Large queue - consider user notification
     notifyUser('Many operations queued for sync');
   }
   ```

### Security Best Practices

1. **Token Lifecycle Management**:
   ```typescript
   // Check token validity before use
   const isValid = await authManager.isAuthenticated();
   if (!isValid) {
     // Redirect to login or refresh token
     await redirectToLogin();
   }
   ```

2. **Secure Data Cleanup**:
   ```typescript
   // Clear sensitive data on logout
   await authManager.logout(); // Automatically clears tokens and user data
   
   // Clear app cache if needed
   await storage.clear();
   ```

3. **Validate Storage Security**:
   ```typescript
   const securityLevel = await secureStorage.getSecurityLevel();
   if (securityLevel < SecurityLevel.SOFTWARE) {
     // Inform user about security limitations
     showSecurityWarning('Data stored without encryption');
   }
   ```

### Performance Optimization

1. **Batch Operations**:
   ```typescript
   // Instead of multiple individual operations
   const pairs = userData.map(user => [`user_${user.id}`, JSON.stringify(user)]);
   await storage.multiSet(pairs);
   ```

2. **Cache Frequently Used Data**:
   ```typescript
   // Cache user preferences
   const cachedPrefs = await storage.get('user_preferences');
   if (cachedPrefs) {
     return JSON.parse(cachedPrefs);
   }
   
   // Fetch from API and cache
   const preferences = await api.getUserPreferences();
   await storage.set('user_preferences', JSON.stringify(preferences));
   return preferences;
   ```

3. **Optimize Queue Processing**:
   ```typescript
   // Configure sync for your use case
   const sdk = await createACubeSDK({
     offline: {
       batchSize: 5,          // Smaller batches for slower networks
       autoSyncInterval: 60000, // Less frequent for battery saving
     }
   });
   ```

## Troubleshooting

### Common Issues

#### 1. Storage Not Available

**Problem**: `SecureStorage not available` error

**Solutions**:
```typescript
// Check availability before use
const isAvailable = await secureStorage.isAvailable();
if (!isAvailable) {
  // Use regular storage as fallback
  await storage.set(key, value);
  console.warn('Using regular storage - data not encrypted');
}
```

#### 2. Token Persistence Issues

**Problem**: User logged out unexpectedly

**Debug Steps**:
```typescript
// Check stored tokens
const tokenData = await secureStorage.get('acube_tokens');
if (tokenData) {
  const parsed = JSON.parse(tokenData);
  console.log('Token expires at:', new Date(parsed.expiresAt));
  console.log('Current time:', new Date());
}

// Check storage functionality
await secureStorage.set('test_key', 'test_value');
const retrieved = await secureStorage.get('test_key');
console.log('Storage test:', retrieved === 'test_value' ? 'PASS' : 'FAIL');
```

#### 3. Offline Sync Problems

**Problem**: Operations not syncing when online

**Debug Steps**:
```typescript
// Check network status
const isOnline = await networkMonitor.isOnline();
console.log('Network status:', isOnline);

// Check queue contents
const queueStats = await offlineManager.getQueueStats();
console.log('Queue size:', queueStats.size);
console.log('Pending operations:', queueStats.pending);

// Manual sync attempt
try {
  const result = await offlineManager.syncAll();
  console.log('Sync result:', result);
} catch (error) {
  console.error('Sync failed:', error);
}
```

#### 4. Platform Detection Issues

**Problem**: Wrong adapters loaded

**Debug Steps**:
```typescript
import { PlatformDetector } from '@a-cube-io/ereceipts-js-sdk';

const platform = PlatformDetector.detect();
console.log('Detected platform:', platform);
console.log('Is Expo:', PlatformDetector.isExpo());
console.log('Global objects:', {
  window: typeof window,
  global: typeof global,
  process: typeof process
});
```

### Error Handling Patterns

#### Storage Errors
```typescript
try {
  await storage.set(key, value);
} catch (error) {
  if (error.message.includes('QuotaExceededError')) {
    // Storage full - clear cache or notify user
    await clearCache();
  } else if (error.message.includes('SecurityError')) {
    // Permissions issue - fallback storage
    await fallbackStorage.set(key, value);
  } else {
    // Log and handle gracefully
    console.error('Storage error:', error);
    throw new ACubeSDKError('STORAGE_ERROR', 'Failed to save data');
  }
}
```

#### Offline Sync Errors
```typescript
sdk.offline.on('operationFailed', (operation, error) => {
  switch (error.status) {
    case 401:
      // Authentication expired
      redirectToLogin();
      break;
    case 403:
      // Permission denied - remove from queue
      offlineManager.removeOperation(operation.id);
      break;
    case 409:
      // Conflict - handle manually
      handleConflictResolution(operation, error);
      break;
    case 422:
      // Validation error - remove from queue
      logValidationError(operation, error);
      offlineManager.removeOperation(operation.id);
      break;
    default:
      // Retryable error - let sync manager handle
      console.log(`Operation ${operation.id} will be retried`);
  }
});
```

### Performance Monitoring

```typescript
// Monitor storage performance
const startTime = Date.now();
await storage.multiSet(largeBatch);
const duration = Date.now() - startTime;
console.log(`Batch operation took ${duration}ms`);

// Monitor sync performance
sdk.offline.on('syncBatchCompleted', (result) => {
  const { results, successCount, failureCount } = result;
  console.log(`Sync batch: ${successCount}/${successCount + failureCount} success`);
  
  if (failureCount > 0) {
    const errors = results.filter(r => !r.success).map(r => r.error);
    console.warn('Sync errors:', errors);
  }
});
```

---

## Support and Resources

- **GitHub Repository**: [ACube E-Receipt SDK](https://github.com/a-cube-io/acube-ereceipt)
- **API Documentation**: [Core API Reference](./API_DOCUMENTATION.md)
- **Authentication Guide**: [Auth System Documentation](./AUTH_API_DOCUMENTATION.md)
- **Role Management**: [Role System Documentation](./ROLES_API_DOCUMENTATION.md)

For questions about persistence, offline functionality, or storage adapters, please refer to the project repository or contact the development team.