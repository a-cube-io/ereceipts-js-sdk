# ACube React Hooks Module Documentation

Enterprise-grade React hooks for A-Cube SDK integration with data fetching, authentication, offline support, and cross-platform compatibility.

## 1. Introduction

The ACube React Hooks module provides a comprehensive set of React hooks designed for modern React and React Native applications. It offers:

- **Data Management**: React Query-inspired hooks with caching and optimistic updates
- **Authentication System**: Complete auth state management with role-based access control
- **Offline-First Design**: Intelligent caching, queue management, and sync capabilities
- **Cross-Platform Support**: Works seamlessly in React web and React Native applications
- **TypeScript Integration**: Full type safety with comprehensive TypeScript definitions
- **Enterprise Features**: Advanced error handling, retry logic, and performance optimizations

## 2. Installation

```bash
npm install @a-cube-io/ereceipts-js-sdk
```

## 3. Quickstart

### Basic Setup with Provider

```typescript
import { ACubeProvider, useACube } from '@a-cube-io/ereceipts-js-sdk/hooks/react';

function App() {
  return (
    <ACubeProvider
      config={{
        environment: 'production',
        apiKey: process.env.REACT_APP_ACUBE_API_KEY,
        auth: {
          enabled: true,
          credentials: {
            username: 'user@example.com',
            password: 'password',
            autoLogin: true
          }
        },
        features: {
          enableOfflineQueue: true,
          enableSync: true
        }
      }}
    >
      <Dashboard />
    </ACubeProvider>
  );
}

function Dashboard() {
  const { sdk, isOnline, isInitialized } = useACube();
  
  if (!isInitialized) {
    return <div>Loading SDK...</div>;
  }
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      <ReceiptsList />
    </div>
  );
}
```

### Data Fetching with useACubeQuery

```typescript
import { useACubeQuery } from '@a-cube-io/ereceipts-js-sdk/hooks/react';

function ReceiptsList() {
  const { 
    data: receipts, 
    isLoading, 
    error, 
    refetch,
    isOffline,
    isFromCache 
  } = useACubeQuery(
    'receipts',
    (sdk) => sdk.receipts.list({ limit: 10 }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      offlineFallback: true,
      persistToStorage: true
    }
  );

  if (isLoading) return <div>Loading receipts...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div>
        {isOffline && <span>📡 Offline Mode</span>}
        {isFromCache && <span>💾 From Cache</span>}
        <button onClick={() => refetch()}>Refresh</button>
      </div>
      
      <ul>
        {receipts?.data.map(receipt => (
          <li key={receipt.id}>
            Receipt #{receipt.receipt_number} - ${receipt.total_amount / 100}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 4. API Reference

### Core Provider System

#### `ACubeProvider`

Main provider component that initializes and manages the SDK context.

```typescript
interface ACubeProviderProps {
  config: ACubeSDKConfig;
  children: ReactNode;
  fallback?: ReactNode;
  onInitializationError?: (error: Error) => void;
  autoInitialize?: boolean;
}

<ACubeProvider
  config={{
    environment: 'production',
    apiKey: 'your_api_key',
    features: {
      enableOfflineQueue: true,
      enableSync: true
    }
  }}
  fallback={<LoadingSpinner />}
  onInitializationError={(error) => console.error('SDK Error:', error)}
>
  <App />
</ACubeProvider>
```

#### `useACube`

Hook to access the main SDK context and utilities.

```typescript
interface ACubeContextValue {
  sdk: ACubeSDK;
  storage?: UnifiedStorage;
  queueManager?: EnterpriseQueueManager;
  syncEngine?: ProgressiveSyncEngine;
  networkManager?: INetworkManager;
  isInitialized: boolean;
  isOnline: boolean;
  isOfflineEnabled: boolean;
  isSyncEnabled: boolean;
  initializationError?: Error;
  enableOffline: () => Promise<void>;
  enableSync: () => Promise<void>;
  getOfflineStatus: () => OfflineStatus;
}

const {
  sdk,
  isInitialized,
  isOnline,
  isOfflineEnabled,
  enableOffline,
  getOfflineStatus
} = useACube();
```

### Data Management Hooks

#### `useACubeQuery`

Enhanced data fetching hook with caching, offline support, and optimistic updates.

```typescript
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
  // Offline-first enhancements
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
  // Offline-first enhancements
  isOffline: boolean;
  isCached: boolean;
  isFromCache: boolean;
  syncStatus: 'synced' | 'pending' | 'failed' | 'unknown';
  offlineDataAvailable: boolean;
}

// Example usage
const { data, isLoading, error, refetch } = useACubeQuery(
  ['receipts', { merchant_id: 'merchant_123' }],
  (sdk) => sdk.receipts.list({ merchant_id: 'merchant_123' }),
  {
    staleTime: 5 * 60 * 1000,
    offlineFallback: true,
    networkPolicy: 'cache-first'
  }
);
```

#### `useACubeMutation`

Hook for data mutations with optimistic updates and error handling.

```typescript
interface MutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data?: TData, error?: Error, variables?: TVariables) => void;
  retry?: boolean | number;
  retryDelay?: number;
  // Offline support
  queueOnOffline?: boolean;
  optimisticUpdate?: (variables: TVariables) => void;
}

interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
  // Offline support
  isPending: boolean;
  isQueued: boolean;
}

// Example usage
const createReceiptMutation = useACubeMutation(
  (sdk, variables: CreateReceiptRequest) => sdk.receipts.create(variables),
  {
    onSuccess: (receipt) => {
      console.log('Receipt created:', receipt.id);
      // Invalidate receipts list
      queryUtils.invalidateQueries('receipts');
    },
    queueOnOffline: true,
    optimisticUpdate: (variables) => {
      // Update UI optimistically
      queryUtils.setQueryData('receipts', (old) => ({
        ...old,
        data: [...old.data, { ...variables, id: 'temp-id' }]
      }));
    }
  }
);

const handleCreateReceipt = () => {
  createReceiptMutation.mutate({
    merchant_id: 'merchant_123',
    total_amount: 1000,
    items: [/* ... */]
  });
};
```

#### `useACubeCache`

Hook for direct cache management and manipulation.

```typescript
interface CacheOptions {
  storageKey?: string;
  ttl?: number;
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}

interface CacheResult<T> {
  data: T | undefined;
  set: (data: T) => Promise<void>;
  remove: () => Promise<void>;
  clear: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const { data, set, remove, clear } = useACubeCache<Receipt[]>(
  'cached-receipts',
  {
    ttl: 30 * 60 * 1000, // 30 minutes
    storageKey: 'receipts-cache'
  }
);
```

#### `useACubeOffline`

Hook for offline-specific functionality and queue management.

```typescript
interface OfflineOptions {
  enableQueue?: boolean;
  enableStorage?: boolean;
  syncOnReconnect?: boolean;
}

interface OfflineResult {
  isOnline: boolean;
  isOfflineEnabled: boolean;
  queuedOperations: number;
  pendingSyncOperations: number;
  lastSyncTime?: Date;
  processQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  getQueueStats: () => QueueStats;
}

const {
  isOnline,
  queuedOperations,
  processQueue,
  getQueueStats
} = useACubeOffline({
  enableQueue: true,
  syncOnReconnect: true
});
```

#### `useACubeSubscription`

Hook for real-time data subscriptions and live updates.

```typescript
interface SubscriptionOptions<TData> {
  enabled?: boolean;
  onData?: (data: TData) => void;
  onError?: (error: Error) => void;
  reconnectOnError?: boolean;
  maxRetries?: number;
}

interface SubscriptionResult<TData> {
  data: TData | undefined;
  error: Error | null;
  isConnected: boolean;
  isConnecting: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

const { data, isConnected, reconnect } = useACubeSubscription(
  'receipts-updates',
  (sdk) => sdk.receipts.subscribe(),
  {
    enabled: true,
    onData: (update) => {
      console.log('Receipt update:', update);
      // Update local cache
      queryUtils.invalidateQueries('receipts');
    }
  }
);
```

### Authentication Hooks

#### `useAuth`

Main authentication hook providing complete auth state and actions.

```typescript
const {
  // State
  user,
  isAuthenticated,
  isLoading,
  error,
  // Actions
  login,
  logout,
  refreshSession,
  clearError,
  // Role Management
  hasRole,
  hasAnyRole,
  getEffectiveRoles,
  getPrimaryRole,
  getSimpleRole,
  switchRole,
  // Permissions
  checkPermission,
  // Session
  getSessionInfo
} = useAuth();
```

#### `useLogin`

Hook specifically for login functionality with enhanced error handling.

```typescript
const {
  login,
  isLogging,
  loginError,
  clearLoginError
} = useLogin();

const handleLogin = async () => {
  try {
    await login({
      username: 'user@example.com',
      password: 'password'
    });
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

#### `useLogout`

Hook for logout functionality with loading state management.

```typescript
const { logout, isLoggingOut } = useLogout();

const handleLogout = async () => {
  await logout({ 
    clearTokens: true,
    revokeRefreshToken: true 
  });
};
```

#### `useUser`

Hook for accessing current user information and utilities.

```typescript
const {
  user,
  isAuthenticated,
  userId,
  userEmail,
  userName,
  userRoles,
  userPermissions,
  lastLogin,
  sessionId
} = useUser();
```

#### `useRoles`

Hook for role management and switching.

```typescript
const {
  currentRoles,
  effectiveRoles,
  primaryRole,
  simpleRole,
  hasRole,
  hasAnyRole,
  switchRole,
  isSwitchingRole
} = useRoles();

const handleRoleSwitch = async () => {
  await switchRole('merchant_admin', {
    merchant_id: 'merchant_123'
  });
};
```

#### `usePermissions`

Hook for permission checking with caching.

```typescript
const {
  checkPermission,
  clearPermissionCache,
  isCheckingPermission
} = usePermissions();

const checkReceiptPermission = async () => {
  const result = await checkPermission({
    resource: 'receipts',
    action: 'create',
    context: { merchant_id: 'merchant_123' }
  });
  
  return result.allowed;
};
```

#### `useSession`

Hook for session management with auto-refresh.

```typescript
const {
  sessionInfo,
  isRefreshing,
  sessionError,
  refreshSession,
  reloadSessionInfo,
  isSessionExpired,
  timeUntilExpiry
} = useSession();

useEffect(() => {
  if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutes
    refreshSession();
  }
}, [timeUntilExpiry]);
```

#### `useRequireAuth`

Hook to enforce authentication requirements.

```typescript
const { isAuthenticated, isLoading } = useRequireAuth('/login');

if (!isAuthenticated && !isLoading) {
  return <div>Redirecting to login...</div>;
}
```

#### `useRequireRole`

Hook to enforce role-based access control.

```typescript
const {
  hasRequiredRole,
  isAuthenticated,
  isLoading,
  canAccess
} = useRequireRole(['admin', 'manager']);

if (!canAccess) {
  return <div>Access denied</div>;
}
```

### Pre-built Components

#### Authentication Components

```typescript
import {
  LoginForm,
  AuthStatus,
  UserProfile,
  RoleSwitcher,
  ProtectedRoute,
  PermissionGate
} from '@a-cube-io/ereceipts-js-sdk/hooks/react';

// Login form with validation
<LoginForm
  onSuccess={(user) => console.log('Logged in:', user)}
  onError={(error) => console.error('Login error:', error)}
  showRememberMe={true}
  enableSocialLogin={false}
/>

// Authentication status indicator
<AuthStatus
  showUserInfo={true}
  showLogoutButton={true}
  onLogout={() => console.log('Logged out')}
/>

// User profile display
<UserProfile
  showRoles={true}
  showPermissions={true}
  enableRoleSwitching={true}
/>

// Role-based route protection
<ProtectedRoute
  requiredRoles={['admin', 'manager']}
  fallback={<AccessDenied />}
>
  <AdminPanel />
</ProtectedRoute>

// Permission-based content gating
<PermissionGate
  permission={{
    resource: 'receipts',
    action: 'create'
  }}
  fallback={<div>No permission to create receipts</div>}
>
  <CreateReceiptButton />
</PermissionGate>
```

### Utility Hooks

#### `useACubeSDK`

Direct access to SDK instance.

```typescript
const sdk = useACubeSDK();
```

#### `useACubeStorage`

Access to offline storage system.

```typescript
const storage = useACubeStorage();
```

#### `useACubeQueueManager`

Access to offline queue management.

```typescript
const queueManager = useACubeQueueManager();
```

#### `useACubeSyncEngine`

Access to progressive sync engine.

```typescript
const syncEngine = useACubeSyncEngine();
```

#### `useACubeNetworkStatus`

Network connectivity monitoring.

```typescript
const {
  isOnline,
  quality, // 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  type     // 'wifi' | 'cellular' | 'ethernet' | 'unknown'
} = useACubeNetworkStatus();
```

## 5. Advanced Usage

### Custom Query Keys and Data Transformation

```typescript
const { data: transformedReceipts } = useACubeQuery(
  ['receipts', 'transformed', { merchant_id: merchantId }],
  async (sdk) => {
    const response = await sdk.receipts.list({ merchant_id: merchantId });
    return response.data;
  },
  {
    select: (receipts) => receipts.map(receipt => ({
      ...receipt,
      formattedAmount: `$${receipt.total_amount / 100}`,
      isRecent: (Date.now() - new Date(receipt.created_at).getTime()) < 24 * 60 * 60 * 1000
    })),
    staleTime: 5 * 60 * 1000
  }
);
```

### Optimistic Updates with Mutations

```typescript
const updateReceiptMutation = useACubeMutation(
  (sdk, { id, ...data }: UpdateReceiptRequest & { id: string }) => 
    sdk.receipts.update(id, data),
  {
    onMutate: async ({ id, ...newData }) => {
      // Cancel outgoing refetches
      await queryUtils.cancelQueries(['receipts']);
      
      // Snapshot the previous value
      const previousReceipts = queryUtils.getQueryData(['receipts']);
      
      // Optimistically update
      queryUtils.setQueryData(['receipts'], (old) => ({
        ...old,
        data: old.data.map(receipt => 
          receipt.id === id ? { ...receipt, ...newData } : receipt
        )
      }));
      
      return { previousReceipts };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousReceipts) {
        queryUtils.setQueryData(['receipts'], context.previousReceipts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryUtils.invalidateQueries(['receipts']);
    }
  }
);
```

### Offline-First Data Strategy

```typescript
const OfflineFirstComponent = () => {
  const { data, isFromCache, syncStatus } = useACubeQuery(
    'critical-data',
    (sdk) => sdk.receipts.list(),
    {
      networkPolicy: 'offline-first',
      persistToStorage: true,
      storageKey: 'critical-receipts',
      staleTime: Infinity, // Never consider cached data stale
      cacheTime: 24 * 60 * 60 * 1000 // Keep in cache for 24 hours
    }
  );

  const { isOnline, processQueue } = useACubeOffline();

  useEffect(() => {
    if (isOnline && syncStatus === 'pending') {
      processQueue();
    }
  }, [isOnline, syncStatus]);

  return (
    <div>
      {!isOnline && <div>📡 Working offline</div>}
      {isFromCache && <div>💾 Showing cached data</div>}
      {syncStatus === 'pending' && <div>🔄 Sync pending</div>}
      
      {data?.data.map(receipt => (
        <div key={receipt.id}>{receipt.receipt_number}</div>
      ))}
    </div>
  );
};
```

### Real-time Updates with Subscriptions

```typescript
const RealTimeReceiptsComponent = () => {
  const { data: receipts, refetch } = useACubeQuery(
    'receipts',
    (sdk) => sdk.receipts.list()
  );

  const { data: updates, isConnected } = useACubeSubscription(
    'receipt-updates',
    (sdk) => sdk.receipts.subscribe(),
    {
      onData: (update) => {
        // Handle real-time updates
        if (update.type === 'receipt.created' || update.type === 'receipt.updated') {
          refetch();
        }
      }
    }
  );

  return (
    <div>
      <div>
        Real-time status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      
      {receipts?.data.map(receipt => (
        <div key={receipt.id}>
          {receipt.receipt_number}
          {updates?.receiptId === receipt.id && <span> (Updated)</span>}
        </div>
      ))}
    </div>
  );
};
```

### Role-Based UI Components

```typescript
const RoleBasedDashboard = () => {
  const { hasRole, hasAnyRole, switchRole } = useRoles();
  const { user } = useUser();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      
      {hasAnyRole(['admin', 'manager']) && (
        <section>
          <h2>Management Panel</h2>
          <ManagementTools />
        </section>
      )}
      
      {hasRole('cashier') && (
        <section>
          <h2>Cashier Tools</h2>
          <CashierInterface />
        </section>
      )}
      
      {hasRole('merchant_admin') && (
        <section>
          <h2>Merchant Administration</h2>
          <MerchantSettings />
        </section>
      )}
      
      <RoleSwitcher
        availableRoles={user?.roles || []}
        onRoleSwitch={(role, context) => switchRole(role, context)}
      />
    </div>
  );
};
```

## 6. Validation & Errors

### Error Handling Patterns

```typescript
const ErrorHandlingExample = () => {
  const { data, error, isError, refetch } = useACubeQuery(
    'receipts',
    (sdk) => sdk.receipts.list(),
    {
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error instanceof AuthenticationError) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        console.error('Query failed:', error);
        
        if (error instanceof AuthenticationError) {
          // Redirect to login
          window.location.href = '/login';
        } else if (error instanceof RateLimitError) {
          // Show rate limit message
          toast.error('Too many requests. Please wait a moment.');
        }
      }
    }
  );

  if (isError) {
    return (
      <div className="error-container">
        <h3>Something went wrong</h3>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Try Again</button>
      </div>
    );
  }

  // ... render success state
};
```

### Common Error Scenarios

| Error Type | Common Causes | Recommended Handling |
|------------|---------------|---------------------|
| `AuthenticationError` | Token expired, invalid credentials | Redirect to login, refresh token |
| `AuthorizationError` | Insufficient permissions | Show access denied, suggest role switch |
| `ValidationError` | Invalid request data | Show field-specific errors, form validation |
| `NetworkError` | Connection issues | Show offline indicator, enable offline mode |
| `RateLimitError` | Too many requests | Show rate limit warning, implement backoff |
| `NotFoundError` | Resource doesn't exist | Show 404 message, redirect to list view |

## 7. Troubleshooting & FAQ

### Q: Why is my query not refetching when I expect it to?

**A:** Check the `staleTime` configuration. Data is considered fresh until `staleTime` expires:

```typescript
const { data } = useACubeQuery(
  'receipts',
  (sdk) => sdk.receipts.list(),
  {
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  }
);
```

### Q: How do I handle authentication token refresh in my queries?

**A:** The SDK handles token refresh automatically, but you can listen for auth events:

```typescript
const { sdk } = useACube();

useEffect(() => {
  const handleTokenRefresh = () => {
    // Optionally invalidate all queries after token refresh
    queryUtils.invalidateQueries();
  };

  sdk.on('auth.refresh', handleTokenRefresh);
  return () => sdk.off('auth.refresh', handleTokenRefresh);
}, [sdk]);
```

### Q: Why are my offline mutations not being processed?

**A:** Ensure offline queue is enabled and process the queue when back online:

```typescript
const { isOnline, processQueue } = useACubeOffline();

useEffect(() => {
  if (isOnline) {
    processQueue();
  }
}, [isOnline]);
```

### Q: How do I implement global error handling for all queries?

**A:** Use the provider's error handler:

```typescript
<ACubeProvider
  config={config}
  onInitializationError={(error) => {
    console.error('Global SDK error:', error);
    // Handle global errors
  }}
>
  <App />
</ACubeProvider>
```

### Q: How do I clear all cached data?

**A:** Use the query utilities:

```typescript
import { queryUtils } from '@a-cube-io/ereceipts-js-sdk/hooks/react';

// Clear all cached queries
queryUtils.invalidateQueries();

// Clear specific query pattern
queryUtils.invalidateQueries('receipts');

// Remove specific query from cache
queryUtils.removeQuery(['receipts', { merchant_id: '123' }]);
```

### Q: Why is my component re-rendering too often?

**A:** Check if you're properly memoizing query keys and functions:

```typescript
const memoizedQueryKey = useMemo(() => 
  ['receipts', { merchant_id: merchantId }], 
  [merchantId]
);

const memoizedQueryFn = useCallback(
  (sdk) => sdk.receipts.list({ merchant_id: merchantId }),
  [merchantId]
);

const { data } = useACubeQuery(memoizedQueryKey, memoizedQueryFn);
```

## 8. Changelog

### v2.0.0 – Current Release
- **NEW**: Complete React hooks ecosystem for A-Cube SDK
- **NEW**: Advanced data fetching with offline-first capabilities
- **NEW**: Enterprise authentication hooks with role management
- **NEW**: Real-time subscriptions and live updates
- **NEW**: Cross-platform support for React and React Native
- **NEW**: Pre-built authentication components
- **NEW**: Comprehensive TypeScript support
- **IMPROVED**: Performance optimizations with intelligent caching
- **IMPROVED**: Error handling with specific error types and recovery strategies
- **IMPROVED**: Offline queue management and progressive sync

### v1.0.0 – Initial Release
- Basic React integration
- Simple data fetching hooks
- Basic authentication support