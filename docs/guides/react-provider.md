# React Provider Guide

## Overview

The `EReceiptsProvider` is the recommended way to integrate the A-Cube E-Receipts SDK into React applications. It provides automatic SDK initialization, authentication state management, and seamless integration with React's component lifecycle.

## Quick Start

### 1. Wrap Your App

```tsx
import React from 'react';
import { EReceiptsProvider } from '@a-cube-io/ereceipts-js-sdk';
import { AppContent } from './AppContent';

function App() {
  return (
    <EReceiptsProvider
      config={{
        environment: 'sandbox',
        enableLogging: true,
        enableOfflineQueue: true,
        onInitialized: () => {
          console.log('✅ E-Receipts SDK is ready!');
        },
        onAuthChange: (isAuthenticated) => {
          console.log('🔐 Auth status:', isAuthenticated ? 'Logged in' : 'Logged out');
        },
        onError: (error) => {
          console.error('❌ SDK Error:', error.message);
        }
      }}
    >
      <AppContent />
    </EReceiptsProvider>
  );
}

export default App;
```

### 2. Use SDK in Components

```tsx
import React from 'react';
import { useEReceipts, loginAsMerchant } from '@a-cube-io/ereceipts-js-sdk';

function AppContent() {
  const { 
    isInitialized, 
    isLoading, 
    isAuthenticated, 
    currentUser, 
    error,
    refreshAuthStatus 
  } = useEReceipts();

  const handleLogin = async () => {
    const result = await loginAsMerchant('merchant@example.com', 'password');
    if (result.success) {
      await refreshAuthStatus(); // Update provider state
    } else {
      console.error('Login failed:', result.error?.message);
    }
  };

  if (isLoading) {
    return <div>🔄 Initializing E-Receipts SDK...</div>;
  }

  if (error) {
    return <div>❌ SDK Error: {error.message}</div>;
  }

  if (!isInitialized) {
    return <div>⏳ SDK not ready yet...</div>;
  }

  return (
    <div>
      <h1>E-Receipts Dashboard</h1>
      
      {isAuthenticated ? (
        <div>
          <p>👋 Hello, {currentUser?.email}</p>
          <p>🏷️ Role: {currentUser?.role}</p>
          <button onClick={() => logoutUser()}>Logout</button>
        </div>
      ) : (
        <div>
          <p>Please log in to continue</p>
          <button onClick={handleLogin}>Login as Merchant</button>
        </div>
      )}
    </div>
  );
}
```

## Configuration Options

### EReceiptsProviderConfig

```typescript
interface EReceiptsProviderConfig {
  // SDK Configuration (extends SDKConfig)
  environment?: 'sandbox' | 'production' | 'development';
  baseURLMode?: 'auth' | 'api';
  baseURL?: string;
  timeout?: number;
  enableRetry?: boolean;
  enableOfflineQueue?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;

  // Provider-specific callbacks
  onInitialized?: () => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onLoadingChange?: (isLoading: boolean) => void;
  onAuthChange?: (isAuthenticated: boolean) => void;
  skipTokenValidation?: boolean;
}
```

### Example Configurations

#### Basic Configuration
```tsx
<EReceiptsProvider
  config={{
    environment: 'sandbox',
    enableLogging: true
  }}
>
  <App />
</EReceiptsProvider>
```

#### Production Configuration
```tsx
<EReceiptsProvider
  config={{
    environment: 'production',
    enableLogging: false,
    enableOfflineQueue: true,
    timeout: 60000,
    onError: (error) => {
      // Send to error tracking service
      errorTracker.captureException(error);
    }
  }}
>
  <App />
</EReceiptsProvider>
```

#### Development Configuration with Callbacks
```tsx
<EReceiptsProvider
  config={{
    environment: 'development',
    enableLogging: true,
    onInitialized: async () => {
      console.log('🚀 SDK initialized successfully!');
      // Auto-login for development
      if (process.env.NODE_ENV === 'development') {
        const result = await loginAsMerchant('dev@example.com', 'dev-password');
        console.log('🔑 Auto-login result:', result.success);
      }
    },
    onAuthChange: (isAuthenticated) => {
      // Update analytics
      analytics.track('auth_status_changed', { isAuthenticated });
    },
    onLoadingChange: (isLoading) => {
      // Show/hide global loading indicator
      setGlobalLoading(isLoading);
    }
  }}
>
  <App />
</EReceiptsProvider>
```

## useEReceipts Hook

The `useEReceipts` hook provides access to the SDK state and methods:

```typescript
interface EReceiptsContextState {
  // State
  isInitialized: boolean;        // SDK ready to use
  isLoading: boolean;            // SDK initializing
  isAuthenticated: boolean;      // User logged in
  currentUser: UserInfo | null;  // Current user details
  error: Error | null;           // Last error
  config: EReceiptsProviderConfig; // Current config

  // Methods
  reinitialize: (newConfig?: Partial<EReceiptsProviderConfig>) => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
  clearError: () => void;
}
```

### Hook Examples

#### Simple Usage
```tsx
function MyComponent() {
  const { isInitialized, isAuthenticated, currentUser } = useEReceipts();

  if (!isInitialized) return <div>Loading...</div>;

  return (
    <div>
      <p>Status: {isAuthenticated ? 'Logged in' : 'Logged out'}</p>
      {currentUser && <p>User: {currentUser.email}</p>}
    </div>
  );
}
```

#### Error Handling
```tsx
function ErrorBoundary() {
  const { error, clearError, reinitialize } = useEReceipts();

  if (error) {
    return (
      <div className="error-container">
        <h2>⚠️ SDK Error</h2>
        <p>{error.message}</p>
        <button onClick={clearError}>Clear Error</button>
        <button onClick={() => reinitialize()}>Retry Initialization</button>
      </div>
    );
  }

  return null;
}
```

#### Dynamic Reconfiguration
```tsx
function SettingsPanel() {
  const { config, reinitialize } = useEReceipts();
  const [environment, setEnvironment] = useState(config.environment);

  const handleEnvironmentChange = async () => {
    await reinitialize({ environment });
  };

  return (
    <div>
      <select 
        value={environment} 
        onChange={(e) => setEnvironment(e.target.value)}
      >
        <option value="sandbox">Sandbox</option>
        <option value="production">Production</option>
      </select>
      <button onClick={handleEnvironmentChange}>
        Switch Environment
      </button>
    </div>
  );
}
```

## Higher-Order Component

For class components or legacy code, use the `withEReceipts` HOC:

```tsx
import { withEReceipts, EReceiptsContextState } from '@a-cube-io/ereceipts-js-sdk';

interface Props {
  ereceipts: EReceiptsContextState;
}

class MyClassComponent extends React.Component<Props> {
  render() {
    const { isInitialized, currentUser } = this.props.ereceipts;
    
    if (!isInitialized) {
      return <div>Loading SDK...</div>;
    }

    return (
      <div>
        <h1>Welcome {currentUser?.email}</h1>
      </div>
    );
  }
}

export default withEReceipts(MyClassComponent);
```

## Best Practices

### 1. Place Provider at Root Level
```tsx
// ✅ Good - Provider at app root
function App() {
  return (
    <EReceiptsProvider config={...}>
      <Router>
        <Routes>
          <Route path="/" component={Dashboard} />
          <Route path="/receipts" component={Receipts} />
        </Routes>
      </Router>
    </EReceiptsProvider>
  );
}
```

### 2. Handle Loading States
```tsx
function AppContent() {
  const { isInitialized, isLoading, error } = useEReceipts();

  // Always handle these states
  if (error) return <ErrorScreen error={error} />;
  if (isLoading) return <LoadingScreen />;
  if (!isInitialized) return <InitializingScreen />;

  return <MainApp />;
}
```

### 3. Combine with Authentication Logic
```tsx
function AuthenticatedApp() {
  const { isAuthenticated, currentUser } = useEReceipts();

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}
```

### 4. Environment-Specific Configuration
```tsx
const getSDKConfig = (): EReceiptsProviderConfig => {
  const baseConfig = {
    enableOfflineQueue: true,
    maxRetries: 3,
  };

  switch (process.env.NODE_ENV) {
    case 'production':
      return {
        ...baseConfig,
        environment: 'production',
        enableLogging: false,
        onError: (error) => errorTracker.captureException(error),
      };
    
    case 'development':
      return {
        ...baseConfig,
        environment: 'development',
        enableLogging: true,
        onInitialized: () => console.log('🚀 SDK Ready for development!'),
      };
    
    default:
      return {
        ...baseConfig,
        environment: 'sandbox',
        enableLogging: true,
      };
  }
};

function App() {
  return (
    <EReceiptsProvider config={getSDKConfig()}>
      <AppContent />
    </EReceiptsProvider>
  );
}
```

## Common Patterns

### Authentication Guard
```tsx
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isInitialized, isAuthenticated } = useEReceipts();

  if (!isInitialized) {
    return <div>Initializing...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return <>{children}</>;
}
```

### Automatic Token Refresh
```tsx
function TokenRefreshManager() {
  const { isAuthenticated, refreshAuthStatus } = useEReceipts();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh auth status every 5 minutes
    const interval = setInterval(refreshAuthStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshAuthStatus]);

  return null;
}
```

### Network Status Integration
```tsx
function NetworkAwareProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <EReceiptsProvider
      config={{
        environment: 'sandbox',
        enableOfflineQueue: true,
        onError: (error) => {
          if (!isOnline) {
            console.log('📱 Offline - request queued for retry');
          }
        }
      }}
    >
      {children}
    </EReceiptsProvider>
  );
}
```

## Troubleshooting

### Provider Not Found Error
- **Error**: `useEReceipts must be used within an EReceiptsProvider`
- **Solution**: Ensure your component is wrapped by `<EReceiptsProvider>`

### Initialization Never Completes
- **Check**: Network connectivity and API endpoints
- **Debug**: Enable logging with `enableLogging: true`
- **Monitor**: Use `onError` callback to catch initialization failures

### Authentication State Not Updating
- **Solution**: Call `refreshAuthStatus()` after login/logout operations
- **Alternative**: Use the callback versions of auth functions

### Memory Leaks
- **Prevention**: Provider automatically cleans up intervals and listeners
- **Custom cleanup**: Use `useEffect` cleanup functions in your components