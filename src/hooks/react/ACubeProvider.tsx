/**
 * ACubeProvider - React Context System for A-Cube SDK
 * Enterprise-grade provider with offline capabilities, sync management, and error boundaries
 */

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { ACubeSDK, type ACubeSDKConfig } from '@/core/sdk';
import type { ProgressiveSyncEngine } from '@/sync/sync-engine';
import type { UnifiedStorage } from '@/storage/unified-storage';
import type { EnterpriseQueueManager } from '@/storage/queue/queue-manager';
import type { NetworkManager } from '@/sync/network-manager-simple';

export interface ACubeContextValue {
  sdk: ACubeSDK;
  storage?: UnifiedStorage | undefined;
  queueManager?: EnterpriseQueueManager | undefined;
  syncEngine?: ProgressiveSyncEngine | undefined;
  networkManager?: NetworkManager | undefined;
  isInitialized: boolean;
  isOnline: boolean;
  isOfflineEnabled: boolean;
  isSyncEnabled: boolean;
  initializationError?: Error | undefined;
  
  // Utility methods
  enableOffline: () => Promise<void>;
  enableSync: () => Promise<void>;
  getOfflineStatus: () => {
    queuedOperations: number;
    lastSyncTime?: Date;
    pendingSyncOperations: number;
  };
}

const ACubeContext = createContext<ACubeContextValue | undefined>(undefined);

export interface ACubeProviderProps {
  config: ACubeSDKConfig;
  children: ReactNode;
  fallback?: ReactNode;
  onInitializationError?: (error: Error) => void;
  autoInitialize?: boolean;
}

/**
 * Enhanced error boundary for ACube SDK initialization and runtime errors
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ACubeErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ACube SDK Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong with the ACube SDK</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            {this.state.error?.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * ACubeProvider - Main provider component for the A-Cube SDK
 * Provides SDK instance, offline storage, queue management, and sync capabilities
 */
export const ACubeProvider: React.FC<ACubeProviderProps> = ({
  config,
  children,
  fallback,
  onInitializationError,
  autoInitialize = true,
}) => {
  // Core state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [initializationError, setInitializationError] = useState<Error>();
  
  // SDK instance (created once)
  const sdkRef = useRef<ACubeSDK | undefined>(undefined);
  const networkManagerRef = useRef<NetworkManager | undefined>(undefined);
  
  // Initialize SDK instance
  if (!sdkRef.current) {
    sdkRef.current = new ACubeSDK(config);
  }
  
  const sdk = sdkRef.current;

  // Initialize network manager
  useEffect(() => {
    const initializeNetworkManager = async () => {
      if (!networkManagerRef.current) {
        try {
          const { NetworkManager } = await import('@/sync/network-manager-simple');
          networkManagerRef.current = new NetworkManager();
          await networkManagerRef.current.initialize?.();
          
          // Listen for network changes
          networkManagerRef.current.onConnectionChange?.((info: any) => {
            setIsOnline(info.isOnline);
          });
        } catch (error) {
          console.warn('Failed to initialize network manager:', error);
        }
      }
    };

    initializeNetworkManager();
    
    return () => {
      if (networkManagerRef.current) {
        networkManagerRef.current.destroy?.();
      }
    };
  }, []);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    
    return undefined;
  }, []);

  // SDK initialization
  useEffect(() => {
    let mounted = true;

    const initializeSDK = async () => {
      if (!autoInitialize) return;

      try {
        await sdk.initialize();
        
        if (mounted) {
          setIsInitialized(true);
          setInitializationError(undefined);
        }
      } catch (error) {
        const initError = error instanceof Error ? error : new Error('SDK initialization failed');
        
        if (mounted) {
          setInitializationError(initError);
          onInitializationError?.(initError);
        }
      }
    };

    initializeSDK();

    return () => {
      mounted = false;
    };
  }, [sdk, autoInitialize, onInitializationError]);

  // Utility methods
  const enableOffline = async (): Promise<void> => {
    try {
      // Update configuration to enable offline
      sdk.updateConfig({
        ...config,
        offline: { ...config.offline, enabled: true },
        features: { ...config.features, enableOfflineQueue: true },
      });
      
      // Initialize storage and queue if not already done
      if (sdk.storage && sdk.queue) {
        await sdk.storage.initialize?.();
        await sdk.queue.initialize?.();
      }
    } catch (error) {
      throw new Error(`Failed to enable offline mode: ${error}`);
    }
  };

  const enableSync = async (): Promise<void> => {
    try {
      // Update configuration to enable sync
      sdk.updateConfig({
        ...config,
        features: { ...config.features, enableSync: true },
      });
      
      // Initialize sync engine
      if (sdk.sync) {
        await sdk.sync.initialize?.();
      }
    } catch (error) {
      throw new Error(`Failed to enable sync: ${error}`);
    }
  };

  const getOfflineStatus = () => {
    let queuedOperations = 0;
    let pendingSyncOperations = 0;
    let lastSyncTime: Date | undefined;

    try {
      if (config.features?.enableOfflineQueue && sdk.queue) {
        const stats = sdk.queue.getStats();
        queuedOperations = stats.totalItems;
      }

      if (config.features?.enableSync && sdk.sync) {
        const status = sdk.sync.getStatus();
        pendingSyncOperations = status.activeSyncs + status.queuedSyncs;
        lastSyncTime = status.lastSync || undefined;
      }
    } catch (error) {
      console.warn('Failed to get offline status:', error);
    }

    return {
      queuedOperations,
      ...(lastSyncTime && { lastSyncTime }),
      pendingSyncOperations,
    };
  };

  // Context value
  const contextValue: ACubeContextValue = {
    sdk,
    storage: config.offline?.enabled ? sdk.storage : undefined,
    queueManager: config.features?.enableOfflineQueue ? sdk.queue : undefined,
    syncEngine: config.features?.enableSync ? sdk.sync : undefined,
    networkManager: networkManagerRef.current || undefined,
    isInitialized,
    isOnline,
    isOfflineEnabled: Boolean(config.offline?.enabled),
    isSyncEnabled: Boolean(config.features?.enableSync),
    initializationError: initializationError || undefined,
    enableOffline,
    enableSync,
    getOfflineStatus,
  };

  const errorBoundaryProps = {
    fallback,
    ...(onInitializationError && { onError: onInitializationError }),
  };

  return (
    <ACubeErrorBoundary {...errorBoundaryProps}>
      <ACubeContext.Provider value={contextValue}>
        {children}
      </ACubeContext.Provider>
    </ACubeErrorBoundary>
  );
};

/**
 * Hook to access the ACube SDK context
 * Throws an error if used outside of ACubeProvider
 */
export const useACube = (): ACubeContextValue => {
  const context = useContext(ACubeContext);
  
  if (context === undefined) {
    throw new Error('useACube must be used within an ACubeProvider');
  }
  
  return context;
};

/**
 * Hook to access just the SDK instance
 */
export const useACubeSDK = (): ACubeSDK => {
  const { sdk } = useACube();
  return sdk;
};

/**
 * Hook to access offline storage
 */
export const useACubeStorage = (): UnifiedStorage => {
  const { storage } = useACube();
  
  if (!storage) {
    throw new Error('Offline storage is not enabled. Set offline.enabled to true in ACubeProvider config.');
  }
  
  return storage;
};

/**
 * Hook to access queue manager
 */
export const useACubeQueueManager = (): EnterpriseQueueManager => {
  const { queueManager } = useACube();
  
  if (!queueManager) {
    throw new Error('Offline queue is not enabled. Set features.enableOfflineQueue to true in ACubeProvider config.');
  }
  
  return queueManager;
};

/**
 * Hook to access sync engine
 */
export const useACubeSyncEngine = (): ProgressiveSyncEngine => {
  const { syncEngine } = useACube();
  
  if (!syncEngine) {
    throw new Error('Sync is not enabled. Set features.enableSync to true in ACubeProvider config.');
  }
  
  return syncEngine;
};

/**
 * Hook to access network manager
 */
export const useACubeNetworkManager = (): NetworkManager | undefined => {
  const { networkManager } = useACube();
  return networkManager;
};

/**
 * Hook for network status
 */
export const useACubeNetworkStatus = () => {
  const { isOnline, networkManager } = useACube();
  const [connectionInfo, setConnectionInfo] = useState({
    isOnline,
    quality: 'unknown' as 'excellent' | 'good' | 'fair' | 'poor' | 'unknown',
    type: 'unknown' as 'wifi' | 'cellular' | 'ethernet' | 'unknown',
  });

  useEffect(() => {
    if (networkManager) {
      const updateConnectionInfo = (info: any) => {
        setConnectionInfo({
          isOnline: info.isOnline,
          quality: info.quality || 'unknown',
          type: info.type || 'unknown',
        });
      };

      networkManager.onConnectionChange(updateConnectionInfo);
      
      // Get initial status
      const currentInfo = networkManager.getConnectionInfo();
      updateConnectionInfo(currentInfo);
    }
  }, [networkManager]);

  return connectionInfo;
};

export default ACubeProvider;