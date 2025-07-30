# ACube Provider System Documentation

Enterprise-grade React context system for A-Cube SDK with cross-platform support, offline capabilities, and intelligent network management.

## 1. Introduction

The ACube Provider System is a comprehensive React context solution that manages SDK initialization, network connectivity, offline capabilities, and cross-platform compatibility. It provides:

- **Cross-Platform Architecture**: Automatic detection and configuration for Web and React Native
- **Intelligent Network Management**: Platform-specific connectivity monitoring and adaptation
- **Enterprise Error Boundaries**: Comprehensive error handling with graceful degradation
- **Offline-First Design**: Seamless offline queue management and progressive sync
- **TypeScript Integration**: Full type safety with comprehensive interface definitions
- **Performance Optimization**: Lazy loading, resource management, and memory optimization

## 2. Installation

```bash
npm install @a-cube-io/ereceipts-js-sdk
```

## 3. Quickstart

### Basic Web Application Setup

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
      fallback={<LoadingSpinner />}
      onInitializationError={(error) => {
        console.error('SDK initialization failed:', error);
        // Handle initialization errors
      }}
    >
      <Dashboard />
    </ACubeProvider>
  );
}

function Dashboard() {
  const { 
    sdk, 
    isInitialized, 
    isOnline, 
    isOfflineEnabled,
    getOfflineStatus 
  } = useACube();

  if (!isInitialized) {
    return <div>Initializing SDK...</div>;
  }

  const offlineStatus = getOfflineStatus();

  return (
    <div>
      <h1>Dashboard</h1>
      <div>
        Status: {isOnline ? 'Online' : 'Offline'}
        {isOfflineEnabled && (
          <span> | Queued: {offlineStatus.queuedOperations}</span>
        )}
      </div>
      <ReceiptManager />
    </div>
  );
}
```

### React Native Application Setup

```typescript
import { ACubeProvider, useACube } from '@a-cube-io/ereceipts-js-sdk/hooks/react';

function App() {
  return (
    <ACubeProvider
      config={{
        environment: 'production',
        apiKey: 'your_api_key',
        // Enable React Native optimizations
        reactNative: {
          enabled: true,
          storage: {
            enableOptimizedAdapter: true,
            enableCompression: true
          },
          connectivity: {
            enableQualityMonitoring: true,
            enableAdaptiveRetry: true
          },
          performanceMonitor: {
            enabled: true,
            enableMemoryMonitoring: true
          }
        },
        features: {
          enableOfflineQueue: true,
          enableSync: true
        }
      }}
      fallback={<LoadingIndicator />}
    >
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ACubeProvider>
  );
}

function HomeScreen() {
  const { networkManager } = useACubeNetworkStatus();
  const { isOnline, quality, type } = networkManager || {};

  return (
    <View>
      <Text>Network Status: {isOnline ? 'Connected' : 'Disconnected'}</Text>
      <Text>Connection Type: {type}</Text>
      <Text>Signal Quality: {quality}</Text>
    </View>
  );
}
```

## 4. API Reference

### Core Provider Component

#### `ACubeProvider`

Main provider component that initializes and manages the SDK ecosystem.

```typescript
interface ACubeProviderProps {
  config: ACubeSDKConfig;
  children: ReactNode;
  fallback?: ReactNode;
  onInitializationError?: (error: Error) => void;
  autoInitialize?: boolean;
}

// Configuration interface
interface ACubeSDKConfig {
  environment: 'sandbox' | 'production' | 'development';
  apiKey?: string;
  baseUrls?: {
    api?: string;
    auth?: string;
  };
  
  // Authentication configuration
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
  
  // Feature flags
  features?: {
    enableRetry?: boolean;
    enableCircuitBreaker?: boolean;
    enableOfflineQueue?: boolean;
    enableSync?: boolean;
    enableRealTimeSync?: boolean;
  };
  
  // Offline capabilities
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
  
  // React Native optimizations
  reactNative?: {
    enabled?: boolean;
    storage?: {
      enableOptimizedAdapter?: boolean;
      enableCompression?: boolean;
    };
    connectivity?: {
      enableQualityMonitoring?: boolean;
      enableAdaptiveRetry?: boolean;
    };
    performanceMonitor?: {
      enabled?: boolean;
      enableMemoryMonitoring?: boolean;
    };
  };
}
```

### Context Value Interface

#### `ACubeContextValue`

Complete interface provided by the ACube context.

```typescript
interface ACubeContextValue {
  // Core SDK
  sdk: ACubeSDK;
  
  // System components (available when enabled)
  storage?: UnifiedStorage;
  queueManager?: EnterpriseQueueManager;
  syncEngine?: ProgressiveSyncEngine;
  networkManager?: INetworkManager;
  
  // Status indicators
  isInitialized: boolean;
  isOnline: boolean;
  isOfflineEnabled: boolean;
  isSyncEnabled: boolean;
  initializationError?: Error;
  
  // Utility methods
  enableOffline: () => Promise<void>;
  enableSync: () => Promise<void>;
  getOfflineStatus: () => OfflineStatus;
}

interface OfflineStatus {
  queuedOperations: number;
  lastSyncTime?: Date;
  pendingSyncOperations: number;
}
```

### Core Hooks

#### `useACube`

Main hook to access the complete SDK context.

```typescript
const {
  sdk,
  storage,
  queueManager,
  syncEngine,
  networkManager,
  isInitialized,
  isOnline,
  isOfflineEnabled,
  isSyncEnabled,
  initializationError,
  enableOffline,
  enableSync,
  getOfflineStatus
} = useACube();

// Example usage
if (!isInitialized) {
  return <LoadingSpinner />;
}

if (initializationError) {
  return <ErrorFallback error={initializationError} />;
}

// Use SDK
const receipts = await sdk.receipts.list();
```

#### `useACubeSDK`

Direct access to the SDK instance.

```typescript
const sdk = useACubeSDK();

// Direct SDK usage
const handleCreateReceipt = async (data) => {
  try {
    const receipt = await sdk.receipts.create(data);
    console.log('Receipt created:', receipt.id);
  } catch (error) {
    console.error('Failed to create receipt:', error);
  }
};
```

#### `useACubeStorage`

Access to the unified storage system (requires offline.enabled = true).

```typescript
const storage = useACubeStorage();

// Storage operations
const saveData = async (key, data) => {
  await storage.set(key, data);
};

const loadData = async (key) => {
  return await storage.get(key);
};
```

#### `useACubeQueueManager`

Access to the offline queue manager (requires features.enableOfflineQueue = true).

```typescript
const queueManager = useACubeQueueManager();

// Queue operations
const addToQueue = async (operation) => {
  await queueManager.add(operation);
};

const processQueue = async () => {
  await queueManager.process();
};

const stats = queueManager.getStats();
console.log('Queued operations:', stats.totalItems);
```

#### `useACubeSyncEngine`

Access to the progressive sync engine (requires features.enableSync = true).

```typescript
const syncEngine = useACubeSyncEngine();

// Sync operations
const startSync = async () => {
  await syncEngine.start();
};

const syncStatus = syncEngine.getStatus();
console.log('Active syncs:', syncStatus.activeSyncs);
```

#### `useACubeNetworkManager`

Access to the platform-specific network manager.

```typescript
const networkManager = useACubeNetworkManager();

// Network monitoring
useEffect(() => {
  if (networkManager?.onConnectionChange) {
    networkManager.onConnectionChange((info) => {
      console.log('Network changed:', info);
    });
  }
}, [networkManager]);
```

#### `useACubeNetworkStatus`

Enhanced network status monitoring with connection quality.

```typescript
const {
  isOnline,
  quality, // 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  type     // 'wifi' | 'cellular' | 'ethernet' | 'unknown'
} = useACubeNetworkStatus();

// React to network changes
useEffect(() => {
  if (isOnline && quality === 'excellent') {
    // Trigger sync operations
    syncEngine?.start();
  } else if (!isOnline) {
    // Switch to offline mode
    console.log('Switched to offline mode');
  }
}, [isOnline, quality]);
```

## 5. Advanced Usage

### Cross-Platform Configuration

The provider automatically detects the platform and configures appropriate systems:

```typescript
const CrossPlatformProvider = ({ children }) => {
  const isReactNative = Platform.OS !== undefined;
  
  const config = {
    environment: 'production',
    apiKey: 'your_api_key',
    
    // Web-specific configuration
    ...(!isReactNative && {
      pwa: {
        enabled: true,
        autoRegister: true,
        enableInstallPrompts: true
      }
    }),
    
    // React Native-specific configuration
    ...(isReactNative && {
      reactNative: {
        enabled: true,
        storage: {
          enableOptimizedAdapter: true,
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
          enableBatteryOptimization: true
        },
        performanceMonitor: {
          enabled: true,
          enableMemoryMonitoring: true,
          enableFrameRateMonitoring: true
        }
      }
    }),
    
    features: {
      enableOfflineQueue: true,
      enableSync: true,
      enableRealTimeSync: isReactNative
    }
  };

  return (
    <ACubeProvider config={config}>
      {children}
    </ACubeProvider>
  );
};
```

### Enterprise Error Boundary Integration

```typescript
const EnterpriseApp = () => {
  const [errorInfo, setErrorInfo] = useState(null);

  const customErrorFallback = (
    <div className="error-boundary">
      <h2>Application Error</h2>
      <p>The A-Cube SDK encountered an error. Please try refreshing the page.</p>
      <button onClick={() => window.location.reload()}>
        Refresh Page
      </button>
      {errorInfo && (
        <details>
          <summary>Error Details</summary>
          <pre>{errorInfo.toString()}</pre>
        </details>
      )}
    </div>
  );

  return (
    <ACubeProvider
      config={{
        environment: 'production',
        apiKey: process.env.REACT_APP_ACUBE_API_KEY,
        logging: {
          enabled: true,
          level: 'error',
          sanitize: true
        }
      }}
      fallback={customErrorFallback}
      onInitializationError={(error) => {
        setErrorInfo(error);
        
        // Send error to monitoring service
        if (window.Sentry) {
          window.Sentry.captureException(error);
        }
        
        // Log to analytics
        if (window.gtag) {
          window.gtag('event', 'exception', {
            description: error.message,
            fatal: true
          });
        }
      }}
    >
      <Router>
        <AppRoutes />
      </Router>
    </ACubeProvider>
  );
};
```

### Dynamic Configuration Updates

```typescript
const DynamicConfigComponent = () => {
  const { sdk, isInitialized } = useACube();
  const [environment, setEnvironment] = useState('sandbox');

  const updateEnvironment = useCallback(async (newEnv) => {
    if (isInitialized) {
      // Update SDK configuration
      sdk.updateConfig({
        environment: newEnv,
        baseUrls: {
          api: newEnv === 'production' 
            ? 'https://ereceipts-it.acubeapi.com'
            : 'https://ereceipts-it-sandbox.acubeapi.com'
        }
      });
      
      setEnvironment(newEnv);
    }
  }, [sdk, isInitialized]);

  return (
    <div>
      <h3>Environment: {environment}</h3>
      <button onClick={() => updateEnvironment('sandbox')}>
        Switch to Sandbox
      </button>
      <button onClick={() => updateEnvironment('production')}>
        Switch to Production
      </button>
    </div>
  );
};
```

### Offline-First Implementation

```typescript
const OfflineFirstApp = () => {
  const {
    isOnline,
    isOfflineEnabled,
    enableOffline,
    getOfflineStatus
  } = useACube();

  const [offlineStatus, setOfflineStatus] = useState(null);

  useEffect(() => {
    // Enable offline capabilities if not already enabled
    if (!isOfflineEnabled) {
      enableOffline().catch(console.error);
    }
  }, [isOfflineEnabled, enableOffline]);

  useEffect(() => {
    // Update offline status periodically
    const interval = setInterval(() => {
      if (isOfflineEnabled) {
        setOfflineStatus(getOfflineStatus());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOfflineEnabled, getOfflineStatus]);

  return (
    <div className="app">
      <header>
        <NetworkIndicator isOnline={isOnline} />
        {isOfflineEnabled && offlineStatus && (
          <OfflineStatus status={offlineStatus} />
        )}
      </header>
      
      <main>
        <AppContent />
      </main>
    </div>
  );
};

const NetworkIndicator = ({ isOnline }) => (
  <div className={`network-indicator ${isOnline ? 'online' : 'offline'}`}>
    {isOnline ? '🟢 Online' : '🔴 Offline'}
  </div>
);

const OfflineStatus = ({ status }) => (
  <div className="offline-status">
    <span>📦 Queued: {status.queuedOperations}</span>
    <span>🔄 Pending Sync: {status.pendingSyncOperations}</span>
    {status.lastSyncTime && (
      <span>⏰ Last Sync: {status.lastSyncTime.toLocaleTimeString()}</span>
    )}
  </div>
);
```

### Performance Monitoring Integration

```typescript
const PerformanceMonitoredApp = () => {
  const { sdk, isInitialized } = useACube();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (isInitialized && sdk.performanceMonitor) {
      // Start performance monitoring
      sdk.performanceMonitor.startMonitoring();

      // Get metrics periodically
      const metricsInterval = setInterval(() => {
        const currentMetrics = sdk.performanceMonitor.getMetrics();
        setMetrics(currentMetrics);
        
        // Send metrics to analytics
        if (currentMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
          console.warn('High memory usage detected:', currentMetrics.memoryUsage);
        }
      }, 10000); // Every 10 seconds

      return () => {
        clearInterval(metricsInterval);
        sdk.performanceMonitor.destroy();
      };
    }
  }, [sdk, isInitialized]);

  return (
    <div>
      {metrics && (
        <div className="performance-metrics">
          <div>Memory: {Math.round(metrics.memoryUsage / 1024 / 1024)}MB</div>
          <div>Frame Rate: {metrics.frameRate}fps</div>
          <div>Battery: {metrics.batteryLevel}%</div>
        </div>
      )}
      <AppContent />
    </div>
  );
};
```

### Multi-Tenant Configuration

```typescript
const MultiTenantProvider = ({ tenant, children }) => {
  const config = useMemo(() => ({
    environment: 'production',
    apiKey: tenant.apiKey,
    baseUrls: {
      api: `https://${tenant.subdomain}.acubeapi.com`,
      auth: `https://auth-${tenant.region}.acubeapi.com`
    },
    auth: {
      enabled: true,
      config: {
        storageKey: `acube_auth_${tenant.id}`,
        sessionTimeout: tenant.sessionTimeout || 8 * 60 * 60 * 1000
      }
    },
    offline: {
      enabled: tenant.offlineEnabled,
      storage: {
        adapter: tenant.storageAdapter || 'indexeddb',
        maxSize: tenant.storageQuota || 100 * 1024 * 1024
      }
    },
    features: {
      enableOfflineQueue: tenant.offlineEnabled,
      enableSync: tenant.syncEnabled,
      enableRealTimeSync: tenant.realtimeEnabled
    }
  }), [tenant]);

  return (
    <ACubeProvider
      key={tenant.id} // Force re-initialization on tenant change
      config={config}
      fallback={<TenantLoadingScreen tenant={tenant} />}
    >
      {children}
    </ACubeProvider>
  );
};

// Usage
const App = () => {
  const [currentTenant, setCurrentTenant] = useState(null);

  return (
    <div>
      <TenantSelector onTenantSelect={setCurrentTenant} />
      {currentTenant && (
        <MultiTenantProvider tenant={currentTenant}>
          <Dashboard />
        </MultiTenantProvider>
      )}
    </div>
  );
};
```

## 6. Platform-Specific Features

### Web Platform Features

```typescript
// PWA integration
const WebPWAFeatures = () => {
  const { sdk } = useACube();

  useEffect(() => {
    if (sdk.pwa) {
      // Handle PWA events
      sdk.pwa.on('installable', () => {
        console.log('App can be installed');
      });

      sdk.pwa.on('updated', () => {
        console.log('App updated');
        // Show update notification
      });

      // Register service worker
      sdk.pwa.register();
    }
  }, [sdk]);

  return (
    <div>
      <InstallPrompt />
      <UpdateNotification />
    </div>
  );
};
```

### React Native Platform Features

```typescript
// React Native specific features
const ReactNativeFeatures = () => {
  const { sdk } = useACube();
  const { isOnline, quality, type } = useACubeNetworkStatus();

  useEffect(() => {
    if (sdk.connectivity) {
      // Handle network quality changes
      sdk.connectivity.onNetworkChange((state) => {
        if (state.quality === 'poor') {
          // Enable data optimization
          sdk.connectivity.enableDataOptimization();
        }
      });
    }

    if (sdk.backgroundProcessor) {
      // Schedule background tasks
      sdk.backgroundProcessor.schedule({
        id: 'sync-receipts',
        task: async () => {
          if (isOnline) {
            await sdk.sync.start();
          }
        },
        interval: 5 * 60 * 1000, // 5 minutes
        enableBatteryOptimization: true
      });
    }
  }, [sdk, isOnline]);

  return (
    <View>
      <NetworkQualityIndicator quality={quality} type={type} />
      <BackgroundTaskStatus />
    </View>
  );
};
```

## 7. Error Handling & Recovery

### Comprehensive Error Boundaries

```typescript
const RobustErrorBoundary = ({ children }) => {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback((error, errorInfo) => {
    setError({ error, errorInfo });
    
    // Log error details
    console.error('Provider Error:', error, errorInfo);
    
    // Send to error tracking
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: { errorInfo }
      });
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
  }, []);

  const handleReset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    // Clear all cached data
    if (window.localStorage) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('acube_')) {
          localStorage.removeItem(key);
        }
      });
    }
    window.location.reload();
  }, []);

  if (error) {
    return (
      <div className="error-boundary">
        <h2>Something went wrong</h2>
        <p>{error.error.message}</p>
        
        <div className="error-actions">
          {retryCount < 3 && (
            <button onClick={handleRetry}>
              Retry ({3 - retryCount} attempts left)
            </button>
          )}
          <button onClick={handleReset}>
            Reset Application
          </button>
        </div>
        
        <details>
          <summary>Technical Details</summary>
          <pre>{error.error.stack}</pre>
        </details>
      </div>
    );
  }

  return (
    <ACubeProvider
      key={retryCount} // Force re-initialization on retry
      config={/* ... */}
      onInitializationError={handleError}
    >
      {children}
    </ACubeProvider>
  );
};
```

### Graceful Degradation Strategies

```typescript
const GracefulDegradationProvider = ({ children }) => {
  const [degradationLevel, setDegradationLevel] = useState('full');

  const config = useMemo(() => {
    const baseConfig = {
      environment: 'production',
      apiKey: process.env.REACT_APP_ACUBE_API_KEY
    };

    switch (degradationLevel) {
      case 'full':
        return {
          ...baseConfig,
          features: {
            enableOfflineQueue: true,
            enableSync: true,
            enableRealTimeSync: true,
            enableCircuitBreaker: true
          },
          offline: { enabled: true },
          auth: { enabled: true }
        };

      case 'limited':
        return {
          ...baseConfig,
          features: {
            enableOfflineQueue: true,
            enableSync: false,
            enableRealTimeSync: false,
            enableCircuitBreaker: true
          },
          offline: { enabled: true },
          auth: { enabled: true }
        };

      case 'basic':
        return {
          ...baseConfig,
          features: {
            enableOfflineQueue: false,
            enableSync: false,
            enableRealTimeSync: false,
            enableCircuitBreaker: false
          },
          offline: { enabled: false },
          auth: { enabled: false }
        };

      default:
        return baseConfig;
    }
  }, [degradationLevel]);

  const handleDegradation = useCallback((level) => {
    console.warn(`Degrading to ${level} mode`);
    setDegradationLevel(level);
  }, []);

  return (
    <ACubeProvider
      config={config}
      onInitializationError={(error) => {
        if (error.message.includes('offline')) {
          handleDegradation('limited');
        } else if (error.message.includes('auth')) {
          handleDegradation('basic');
        }
      }}
    >
      <DegradationIndicator level={degradationLevel} />
      {children}
    </ACubeProvider>
  );
};
```

## 8. Troubleshooting & FAQ

### Q: Why is the provider not initializing?

**A:** Check the following:
1. Verify API key and environment configuration
2. Ensure network connectivity
3. Check browser/React Native compatibility
4. Review console for specific error messages

```typescript
<ACubeProvider
  config={config}
  onInitializationError={(error) => {
    console.error('Initialization failed:', error);
    // Check error.message for specific issues
  }}
>
```

### Q: How do I handle network connectivity changes?

**A:** Use the network status hooks:

```typescript
const { isOnline, quality } = useACubeNetworkStatus();

useEffect(() => {
  if (!isOnline) {
    // Switch to offline mode
    console.log('Network lost, switching to offline mode');
  } else if (quality === 'excellent') {
    // Sync pending operations
    console.log('High-quality connection restored');
  }
}, [isOnline, quality]);
```

### Q: Why are offline features not working?

**A:** Ensure offline configuration is correct:

```typescript
const config = {
  offline: { enabled: true },
  features: {
    enableOfflineQueue: true,
    enableSync: true
  }
};

// Check if offline features are available
const { isOfflineEnabled, storage, queueManager } = useACube();
if (!isOfflineEnabled || !storage || !queueManager) {
  console.error('Offline features not properly configured');
}
```

### Q: How do I clear all cached data?

**A:** Use the provider utilities:

```typescript
const { storage, queueManager } = useACube();

const clearAllData = async () => {
  if (storage) {
    await storage.clear();
  }
  if (queueManager) {
    await queueManager.clear();
  }
  // Clear query cache
  queryUtils.invalidateQueries();
};
```

### Q: Why is my React Native app not detecting network changes?

**A:** Ensure React Native network dependencies are installed:

```bash
npm install @react-native-community/netinfo
# For iOS
cd ios && pod install
```

And enable React Native optimizations:

```typescript
const config = {
  reactNative: {
    enabled: true,
    connectivity: {
      enableQualityMonitoring: true
    }
  }
};
```

## 9. Changelog

### v2.0.0 – Current Release
- **NEW**: Cross-platform provider system for React and React Native
- **NEW**: Intelligent network management with platform-specific optimization
- **NEW**: Enterprise error boundaries with graceful degradation
- **NEW**: Comprehensive offline-first capabilities
- **NEW**: Performance monitoring and optimization
- **NEW**: Multi-tenant support with dynamic configuration
- **IMPROVED**: TypeScript support with full interface definitions
- **IMPROVED**: Error handling with specific recovery strategies
- **IMPROVED**: Memory management and resource optimization

### v1.0.0 – Initial Release
- Basic React provider
- Simple SDK context
- Basic error handling