# ACube SDK Module Documentation

Enterprise-grade TypeScript SDK for A-Cube e-receipt system integration with Stripe-like resource architecture and advanced cross-platform capabilities.

## 1. Introduction

The ACube SDK is the core module that provides a comprehensive interface for integrating with the A-Cube e-receipt system. Built with enterprise requirements in mind, it features:

- **Stripe-inspired Architecture**: Resource-based API design with lazy loading
- **Cross-Platform Support**: Works seamlessly in Node.js, React, React Native, and browser environments
- **Enterprise Authentication**: OAuth2, JWT, role-based access control, and session management
- **Offline-First Design**: Intelligent caching, queue management, and progressive sync
- **PWA Integration**: Service workers, manifest generation, and app installation prompts
- **React Native Optimizations**: Mobile-specific performance enhancements and background processing

## 2. Installation

```bash
npm install @a-cube-io/ereceipts-js-sdk
```

## 3. Quickstart

### Basic Usage

```typescript
import { createACubeSDK, ACubeSDKConfig } from '@a-cube-io/ereceipts-js-sdk';

// Initialize SDK
const config: ACubeSDKConfig = {
  environment: 'sandbox', // 'sandbox' | 'production' | 'development'
  apiKey: 'your_api_key',
  auth: {
    enabled: true,
    credentials: {
      username: 'your_username',
      password: 'your_password',
      autoLogin: true
    }
  }
};

const sdk = createACubeSDK(config);

// Initialize SDK (optional - resources are lazy-loaded)
await sdk.initialize();

// Use resources
const receipts = await sdk.receipts.list();
const user = await sdk.login({ username: 'user', password: 'pass' });
```

### With React Integration

```typescript
import { ACubeProvider, useACube } from '@a-cube-io/ereceipts-js-sdk/hooks/react';

function App() {
  return (
    <ACubeProvider
      config={{
        environment: 'production',
        apiKey: process.env.REACT_APP_ACUBE_API_KEY,
        features: {
          enableOfflineQueue: true,
          enableSync: true
        }
      }}
    >
      <MyComponent />
    </ACubeProvider>
  );
}

function MyComponent() {
  const { sdk, isOnline, isInitialized } = useACube();
  
  // Use SDK through context
  const handleCreateReceipt = async () => {
    const receipt = await sdk.receipts.create({
      merchant_id: 'merchant_123',
      total_amount: 1000,
      items: [/* ... */]
    });
  };
}
```

## 4. API Reference

### Core SDK Class

#### `class ACubeSDK`

Main SDK class providing access to all resources and functionality.

**Constructor**
```typescript
new ACubeSDK(config: ACubeSDKConfig)
```

**Configuration Interface**
```typescript
interface ACubeSDKConfig {
  environment: 'sandbox' | 'production' | 'development';
  apiKey?: string;
  baseUrls?: {
    api?: string;
    auth?: string;
  };
  httpConfig?: Partial<HttpClientConfig>;
  auth?: {
    enabled?: boolean;
    config?: Partial<AuthConfig>;
    credentials?: {
      username?: string;
      password?: string;
      autoLogin?: boolean;
    };
    storage?: {
      enableEncryption?: boolean;
      storageAdapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
    };
  };
  features?: {
    enableRetry?: boolean;
    enableCircuitBreaker?: boolean;
    enableOfflineQueue?: boolean;
    enableSync?: boolean;
  };
  offline?: {
    enabled?: boolean;
    storage?: {
      adapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
      maxSize?: number;
    };
    queue?: {
      maxItems?: number;
      maxRetries?: number;
      batchSize?: number;
    };
  };
  pwa?: {
    enabled?: boolean;
    autoRegister?: boolean;
    enableInstallPrompts?: boolean;
  };
  reactNative?: {
    enabled?: boolean;
    storage?: { enableOptimizedAdapter?: boolean; };
    connectivity?: { enableQualityMonitoring?: boolean; };
    performanceMonitor?: { enabled?: boolean; };
  };
}
```

### Resource Access (Stripe-style)

All resources are lazily loaded and accessed as properties:

#### Receipts Resource
```typescript
sdk.receipts.create(data: CreateReceiptRequest): Promise<Receipt>
sdk.receipts.retrieve(id: ReceiptId): Promise<Receipt>
sdk.receipts.list(params?: ListReceiptsParams): Promise<ReceiptList>
sdk.receipts.update(id: ReceiptId, data: UpdateReceiptRequest): Promise<Receipt>
sdk.receipts.delete(id: ReceiptId): Promise<void>
```

#### Cashiers Resource
```typescript
sdk.cashiers.create(data: CreateCashierRequest): Promise<Cashier>
sdk.cashiers.retrieve(id: CashierId): Promise<Cashier>
sdk.cashiers.list(params?: ListCashiersParams): Promise<CashierList>
sdk.cashiers.update(id: CashierId, data: UpdateCashierRequest): Promise<Cashier>
```

#### Merchants Resource
```typescript
sdk.merchants.create(data: CreateMerchantRequest): Promise<Merchant>
sdk.merchants.retrieve(id: MerchantId): Promise<Merchant>
sdk.merchants.list(params?: ListMerchantsParams): Promise<MerchantList>
```

#### Point of Sales Resource
```typescript
sdk.pointOfSales.create(data: CreatePOSRequest): Promise<PointOfSale>
sdk.pointOfSales.retrieve(id: PointOfSaleId): Promise<PointOfSale>
sdk.pointOfSales.list(params?: ListPOSParams): Promise<PointOfSaleList>
```

#### Cash Registers Resource
```typescript
sdk.cashRegisters.create(data: CreateCashRegisterRequest): Promise<CashRegister>
sdk.cashRegisters.retrieve(id: CashRegisterId): Promise<CashRegister>
sdk.cashRegisters.list(): Promise<CashRegisterList>
```

#### PEMs Resource
```typescript
sdk.pems.create(data: CreatePEMRequest): Promise<PEM>
sdk.pems.retrieve(id: PEMId): Promise<PEM>
sdk.pems.list(): Promise<PEMList>
```

### Authentication Methods

```typescript
// Login with credentials
sdk.login(credentials: LoginCredentials): Promise<AuthUser>

// Logout current user
sdk.logout(options?: LogoutOptions): Promise<void>

// Get current auth state
sdk.getAuthState(): AuthState | null

// Get current user
sdk.getCurrentUser(): AuthUser | null

// Check authentication status
sdk.isAuthenticated(): boolean

// Role management
sdk.hasRole(role: UserRole): boolean
sdk.hasAnyRole(roles: UserRole[]): boolean
sdk.getEffectiveRoles(): UserRole[]
sdk.getPrimaryRole(): UserRole | null
sdk.getSimpleRole(): SimpleUserRole
sdk.switchRole(targetRole: UserRole, context?: RoleContext): Promise<boolean>
```

### Offline & Sync Systems

Available when `features.enableOfflineQueue` and `features.enableSync` are enabled:

```typescript
// Storage system
sdk.storage.get(key: StorageKey): Promise<StorageValue>
sdk.storage.set(key: StorageKey, value: StorageValue): Promise<void>
sdk.storage.delete(key: StorageKey): Promise<void>

// Queue management
sdk.queue.add(operation: QueueOperation): Promise<void>
sdk.queue.process(): Promise<void>
sdk.queue.getStats(): QueueStats

// Sync engine
sdk.sync.start(): Promise<void>
sdk.sync.stop(): Promise<void>
sdk.sync.getStatus(): SyncStatus
```

### PWA System

Available when `pwa.enabled` is true:

```typescript
// PWA Manager
sdk.pwa.register(): Promise<void>
sdk.pwa.unregister(): Promise<void>
sdk.pwa.checkForUpdates(): Promise<void>
sdk.pwa.showInstallPrompt(): Promise<void>

// Manifest Generator
sdk.manifest.generate(): WebAppManifest
sdk.manifest.updateConfig(config: Partial<PWAManifestConfig>): void
```

### React Native Optimizations

Available when `reactNative.enabled` is true:

```typescript
// Optimized Storage
sdk.optimizedStorage.get(key: string): Promise<any>
sdk.optimizedStorage.set(key: string, value: any): Promise<void>

// Connectivity Manager
sdk.connectivity.getNetworkState(): NetworkState
sdk.connectivity.onNetworkChange(callback: NetworkChangeCallback): void

// Background Processor
sdk.backgroundProcessor.schedule(task: BackgroundTask): Promise<void>
sdk.backgroundProcessor.cancel(taskId: string): Promise<void>

// Performance Monitor
sdk.performanceMonitor.startMonitoring(): void
sdk.performanceMonitor.getMetrics(): PerformanceMetrics
```

## 5. Advanced Usage

### Environment-Specific Initialization

```typescript
import { 
  initializeSandboxSDK,
  initializeProductionSDK,
  initializeDevelopmentSDK 
} from '@a-cube-io/ereceipts-js-sdk';

// Sandbox environment
const sandboxSDK = initializeSandboxSDK({
  apiKey: 'sandbox_key',
  features: { enableRetry: true }
});

// Production environment
const productionSDK = initializeProductionSDK({
  apiKey: 'prod_key',
  features: {
    enableCircuitBreaker: true,
    enableOfflineQueue: true
  }
});
```

### Custom HTTP Configuration

```typescript
const sdk = createACubeSDK({
  environment: 'production',
  httpConfig: {
    timeout: 30000,
    retries: 3,
    enableCircuitBreaker: true,
    headers: {
      'X-Custom-Header': 'value'
    }
  }
});
```

### Offline-First Configuration

```typescript
const sdk = createACubeSDK({
  environment: 'production',
  offline: {
    enabled: true,
    storage: {
      adapter: 'indexeddb',
      maxSize: 200 * 1024 * 1024, // 200MB
      encryptionKey: 'your-encryption-key'
    },
    queue: {
      maxItems: 2000,
      maxRetries: 5,
      batchSize: 100
    },
    sync: {
      maxConcurrentSyncs: 5,
      enableDeltaSync: true,
      enableCompression: true
    }
  },
  features: {
    enableOfflineQueue: true,
    enableSync: true,
    enableRealTimeSync: true
  }
});
```

### Enterprise Authentication

```typescript
const sdk = createACubeSDK({
  environment: 'production',
  auth: {
    enabled: true,
    config: {
      sessionTimeout: 12 * 60 * 60 * 1000, // 12 hours
      enableDeviceBinding: true,
      enableSessionValidation: true,
      enableTokenRotation: true,
      maxRefreshAttempts: 5
    },
    storage: {
      enableEncryption: true,
      storageAdapter: 'indexeddb'
    },
    middleware: {
      enableRetry: true,
      maxRetries: 3,
      includeRoleHeaders: true,
      includePermissionHeaders: true
    }
  }
});

// Login and role management
const user = await sdk.login({
  username: 'admin@company.com',
  password: 'secure_password'
});

// Switch roles during session
await sdk.switchRole('merchant_admin', {
  merchant_id: 'merchant_123'
});

// Check permissions
const hasPermission = sdk.hasRole('cashier');
const canManage = sdk.hasAnyRole(['admin', 'manager']);
```

### React Native Mobile Optimizations

```typescript
const sdk = createACubeSDK({
  environment: 'production',
  reactNative: {
    enabled: true,
    storage: {
      enableOptimizedAdapter: true,
      cacheSize: 2000,
      enableCompression: true,
      enableBatching: true
    },
    connectivity: {
      enableQualityMonitoring: true,
      enableAdaptiveRetry: true,
      enableDataOptimization: true
    },
    backgroundProcessor: {
      enabled: true,
      maxConcurrentTasks: 5,
      enableBatteryOptimization: true,
      enableAppStateManagement: true
    },
    performanceMonitor: {
      enabled: true,
      enableMemoryMonitoring: true,
      enableFrameRateMonitoring: true,
      enableBatteryMonitoring: true
    }
  }
});

// Monitor performance
sdk.performanceMonitor.startMonitoring();
const metrics = sdk.performanceMonitor.getMetrics();

// Handle connectivity changes
sdk.connectivity.onNetworkChange((state) => {
  console.log('Network changed:', state);
  if (state.isConnected && state.quality === 'excellent') {
    // Sync pending operations
    sdk.queue.process();
  }
});
```

### PWA Integration

```typescript
const sdk = createACubeSDK({
  environment: 'production',
  pwa: {
    enabled: true,
    autoRegister: true,
    enableInstallPrompts: true,
    enablePushNotifications: true,
    vapidPublicKey: 'your-vapid-key',
    manifest: {
      name: 'A-Cube E-Receipt App',
      shortName: 'A-Cube',
      themeColor: '#1976d2',
      backgroundColor: '#ffffff'
    },
    appInstaller: {
      enabled: true,
      autoShow: true,
      criteria: {
        minEngagementTime: 5 * 60 * 1000, // 5 minutes
        minPageViews: 5,
        minReceiptsCreated: 3
      }
    }
  }
});

// Handle PWA events
sdk.pwa.on('installable', () => {
  console.log('App can be installed');
});

sdk.pwa.on('updated', () => {
  console.log('App updated, reload recommended');
});

// Show install prompt
await sdk.pwa.showInstallPrompt();
```

## 6. Validation & Errors

### Error Types

The SDK throws specific error types for different scenarios:

```typescript
import { 
  ACubeSDKError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  CircuitBreakerError
} from '@a-cube-io/ereceipts-js-sdk';

try {
  await sdk.receipts.create(receiptData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.violations);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication required');
  } else if (error instanceof NetworkError) {
    console.log('Network issue:', error.message);
  }
}
```

### Common Error Codes

| Error Code | Message | Scenario |
|------------|---------|----------|
| `SDK_INITIALIZATION_FAILED` | "SDK initialization failed" | SDK setup error |
| `AUTH_REQUIRED` | "Authentication required" | Unauthenticated request |
| `INVALID_CREDENTIALS` | "Invalid username or password" | Login failure |
| `SESSION_EXPIRED` | "Session has expired" | Token expiration |
| `INSUFFICIENT_PERMISSIONS` | "Insufficient permissions" | Authorization failure |
| `VALIDATION_ERROR` | "Validation failed" | Invalid request data |
| `NETWORK_ERROR` | "Network request failed" | Connection issues |
| `RATE_LIMIT_EXCEEDED` | "Rate limit exceeded" | Too many requests |
| `RESOURCE_NOT_FOUND` | "Resource not found" | Invalid ID or deleted resource |
| `OFFLINE_STORAGE_FULL` | "Offline storage is full" | Storage quota exceeded |
| `SYNC_FAILED` | "Synchronization failed" | Sync operation error |

## 7. Troubleshooting & FAQ

### Q: Why do I get "SDK_INITIALIZATION_FAILED" error?

**A:** This typically occurs due to:
- Invalid API key or environment configuration
- Network connectivity issues during initialization
- Missing required dependencies for offline features

**Solution:**
```typescript
try {
  await sdk.initialize();
} catch (error) {
  console.error('SDK initialization failed:', error);
  // Check configuration and network connectivity
}
```

### Q: How do I handle authentication token expiration?

**A:** The SDK handles token refresh automatically when `auth.config.enableTokenRotation` is enabled:

```typescript
const sdk = createACubeSDK({
  auth: {
    enabled: true,
    config: {
      enableTokenRotation: true,
      tokenRefreshBuffer: 5, // Refresh 5 minutes before expiry
      maxRefreshAttempts: 3
    }
  }
});

// Listen for auth events
sdk.on('auth.expired', async () => {
  // Handle expired session
  console.log('Session expired, redirecting to login');
});
```

### Q: Why are offline operations not working?

**A:** Ensure offline features are properly configured:

```typescript
const sdk = createACubeSDK({
  offline: { enabled: true },
  features: {
    enableOfflineQueue: true,
    enableSync: true
  }
});

// Check if offline systems are available
if (sdk.storage && sdk.queue) {
  console.log('Offline features available');
} else {
  console.log('Offline features not enabled');
}
```

### Q: How do I optimize performance for React Native?

**A:** Enable React Native optimizations:

```typescript
const sdk = createACubeSDK({
  reactNative: {
    enabled: true,
    storage: { enableOptimizedAdapter: true },
    connectivity: { enableQualityMonitoring: true },
    backgroundProcessor: { enabled: true },
    performanceMonitor: { enabled: true }
  }
});
```

### Q: How do I handle role switching errors?

**A:** Role switching can fail if the user doesn't have permission:

```typescript
try {
  const success = await sdk.switchRole('merchant_admin', {
    merchant_id: 'merchant_123'
  });
  
  if (!success) {
    console.log('Role switch failed - insufficient permissions');
  }
} catch (error) {
  console.error('Role switch error:', error);
}
```

## 8. Changelog

### v2.0.0 – Current Release
- **NEW**: Stripe-inspired resource architecture with lazy loading
- **NEW**: Enterprise authentication system with OAuth2 and JWT
- **NEW**: Cross-platform offline-first capabilities
- **NEW**: React Native mobile optimizations
- **NEW**: PWA integration with service workers and app installation
- **NEW**: Progressive sync engine with conflict resolution
- **IMPROVED**: TypeScript support with full type safety
- **IMPROVED**: Error handling with specific error types
- **IMPROVED**: Performance optimizations and caching strategies

### v1.0.0 – Initial Release
- Basic SDK functionality
- REST API integration
- Simple authentication
- TypeScript support