/**
 * ACubeProvider - Minimalist React Context System for A-Cube SDK
 * Framework-agnostic provider with core SDK functionality
 *
 * @module ACubeProvider
 * @description
 * The ACubeProvider is a minimalist, framework-agnostic React context provider that
 * initializes and manages the A-Cube SDK instance across your application. This provider
 * is designed to work seamlessly across Web, React Native, and server environments
 * without any UI dependencies.
 *
 * Features:
 * - Framework-agnostic design (Web, React Native, SSR compatible)
 * - Basic network status monitoring using navigator.onLine
 * - Offline queue management
 * - Sync engine integration
 * - Error boundary protection with fragment-based fallbacks
 * - TypeScript support with full type safety
 * - No UI dependencies - delegates all presentation to children
 *
 * @example
 * ```typescript
 * import { ACubeProvider, useACube } from '@a-cube-io/ereceipts-js-sdk/hooks/react';
 *
 * function App() {
 *   return (
 *     <ACubeProvider
 *       config={{
 *         apiKey: process.env.ACUBE_API_KEY,
 *         environment: 'production',
 *         features: {
 *           enableOfflineQueue: true,
 *           enableSync: true
 *         }
 *       }}
 *       fallback={<div>Something went wrong</div>}
 *     >
 *       <MyApp />
 *     </ACubeProvider>
 *   );
 * }
 *
 * function MyApp() {
 *   const { sdk, isOnline, isInitialized } = useACube();
 *   if (!isInitialized) return <div>Loading...</div>;
 *   // Use SDK...
 * }
 * ```
 */

import type { ReactNode } from "react";
import type { ProgressiveSyncEngine } from "@/sync/sync-engine";
import type { UnifiedStorage } from "@/storage/unified-storage";
import type { EnterpriseQueueManager } from "@/storage/queue/queue-manager";

import { ACubeSDK, type ACubeSDKConfig } from "@/core/sdk";
import React, {
  useRef,
  useState,
  useEffect,
  useContext,
  createContext,
} from "react";

// Common interface for network managers (enterprise functionality preserved)
interface INetworkManager {
  initialize?(): Promise<void>;
  getConnectionInfo?(): any;
  onConnectionChange?(callback: (info: any) => void): void;
  destroy?(): void;
}

export interface ACubeContextValue {
  sdk: ACubeSDK;
  storage?: UnifiedStorage | undefined;
  queueManager?: EnterpriseQueueManager | undefined;
  syncEngine?: ProgressiveSyncEngine | undefined;
  networkManager?: INetworkManager | undefined;
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
 * Minimalist error boundary for ACube SDK initialization and runtime errors
 * Uses React fragments for UI-free error handling
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ACubeErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error) => void;
  },
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
    console.error("ACube SDK Error:", error, errorInfo);
    this.props.onError?.(error);
  }

  override render() {
    if (this.state.hasError) {
      // Return user-provided fallback or empty fragment
      // UI presentation is delegated to the consumer
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * ACubeProvider - Minimalist provider component for the A-Cube SDK
 * Framework-agnostic provider that delegates UI concerns to children
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
  const [isOnline, setIsOnline] = useState(() => {
    // Use basic navigator.onLine detection when available (SSR-safe)
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.onLine === "boolean"
    ) {
      return navigator.onLine;
    }
    // Default to online for environments without navigator
    return true;
  });
  const [initializationError, setInitializationError] = useState<Error>();

  // SDK instance (created once)
  const sdkRef = useRef<ACubeSDK | undefined>(undefined);
  const networkManagerRef = useRef<INetworkManager | undefined>(undefined);

  // Initialize SDK instance
  if (!sdkRef.current) {
    sdkRef.current = new ACubeSDK({
      ...config
    });
  }

  const sdk = sdkRef.current;

  // Platform detection without UI dependencies
  const isReactNative = !!(
    (typeof navigator !== "undefined" && navigator.product === "ReactNative") ||
    (typeof global !== "undefined" && (global as any).__fbBatchedBridge) ||
    (typeof global !== "undefined" && (global as any).HermesInternal) ||
    (typeof window !== "undefined" &&
      (window as any).__REACT_NATIVE_VERSION_CHECK__)
  );
  const isWeb = !isReactNative;

  // Initialize platform-specific network manager (enterprise functionality preserved)
  useEffect(() => {
    const initializeNetworkManager = async () => {
      if (!networkManagerRef.current) {
        try {
          if (isReactNative && config.reactNative?.enabled) {
            // Use React Native connectivity manager for better network detection
            // Only when React Native optimizations are explicitly enabled
            console.log(
              "[ACube SDK] Using ConnectivityManager for React Native"
            );
            const { ConnectivityManager } = await import(
              "@/react-native/connectivity-manager"
            );
            const manager = new ConnectivityManager();

            // Create a unified interface wrapper for ConnectivityManager
            const wrappedManager: INetworkManager = {
              initialize: async () => Promise.resolve(),
              getConnectionInfo: () => {
                const state = manager.getNetworkState();
                return {
                  isOnline: state.isConnected,
                  isConnected: state.isConnected,
                  type: state.connectionType,
                  quality: state.quality,
                };
              },
              onConnectionChange: (callback: (info: any) => void) => {
                manager.on("network:change", (event) => {
                  callback({
                    isOnline: event.current.isConnected,
                    isConnected: event.current.isConnected,
                    type: event.current.connectionType,
                    quality: event.current.quality,
                  });
                });
              },
              destroy: () => {
                manager.destroy();
              },
            };

            networkManagerRef.current = wrappedManager;
          } else if (isReactNative && !config.reactNative?.enabled) {
            // React Native detected but optimizations disabled - use simple fallback
            console.log(
              "[ACube SDK] Using basic network manager for React Native (optimizations disabled)"
            );
            const { NetworkManager } = await import(
              "@/sync/network-manager-simple"
            );
            const manager = new NetworkManager();

            const wrappedManager: INetworkManager = {
              initialize: () => manager.initialize(),
              getConnectionInfo: () => {
                const info = manager.getConnectionInfo();
                return {
                  isOnline: info.isOnline,
                  isConnected: info.isOnline,
                  type: "unknown",
                  quality: "unknown",
                };
              },
              onConnectionChange: (callback: (info: any) => void) => {
                manager.onConnectionChange(callback);
              },
              destroy: () => {
                manager.destroy();
              },
            };

            networkManagerRef.current = wrappedManager;
          } else {
            // Use simple network manager for web
            const { NetworkManager } = await import(
              "@/sync/network-manager-simple"
            );
            const manager = new NetworkManager();

            // Create a unified interface wrapper for NetworkManager
            const wrappedManager: INetworkManager = {
              initialize: () => manager.initialize(),
              getConnectionInfo: () => {
                const info = manager.getConnectionInfo();
                return {
                  isOnline: info.isOnline,
                  isConnected: info.isOnline,
                  type: info.type,
                  quality: info.quality,
                };
              },
              onConnectionChange: (callback: (info: any) => void) => {
                manager.onConnectionChange(callback);
              },
              destroy: () => {
                manager.stopMonitoring();
              },
            };

            networkManagerRef.current = wrappedManager;
          }

          // Initialize the wrapped manager
          if (networkManagerRef.current.initialize) {
            await networkManagerRef.current.initialize();
          }

          // Listen for network changes
          if (networkManagerRef.current.onConnectionChange) {
            networkManagerRef.current.onConnectionChange((info: any) => {
              setIsOnline(info.isOnline || info.isConnected);
            });
          }

          // Get initial network status
          if (networkManagerRef.current.getConnectionInfo) {
            const initialInfo = networkManagerRef.current.getConnectionInfo();
            setIsOnline(initialInfo.isOnline || initialInfo.isConnected);
          }
        } catch (error) {
          console.warn("Failed to initialize network manager:", error);
          // Fallback to basic detection for web
          if (isWeb && typeof navigator !== "undefined") {
            setIsOnline(navigator.onLine);
          }
        }
      }
    };

    initializeNetworkManager();

    return () => {
      if (networkManagerRef.current?.destroy) {
        networkManagerRef.current.destroy();
      }
    };
  }, []);

  // Handle browser online/offline events (web only) - enterprise fallback
  useEffect(() => {
    if (!isWeb) return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    return undefined;
  }, []);

  // SDK initialization
  useEffect(() => {
    let mounted = true;

    const initializeSDK = async () => {
      if (!autoInitialize) {
        return;
      }

      try {
        await sdk.initialize();

        if (mounted) {
          setIsInitialized(true);
          setInitializationError(undefined);
        }
      } catch (error) {
        const initError =
          error instanceof Error
            ? error
            : new Error("SDK initialization failed");

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
      console.warn("Failed to get offline status:", error);
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
    throw new Error("useACube must be used within an ACubeProvider");
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
    throw new Error(
      "Offline storage is not enabled. Set offline.enabled to true in ACubeProvider config."
    );
  }

  return storage;
};

/**
 * Hook to access queue manager
 */
export const useACubeQueueManager = (): EnterpriseQueueManager => {
  const { queueManager } = useACube();

  if (!queueManager) {
    throw new Error(
      "Offline queue is not enabled. Set features.enableOfflineQueue to true in ACubeProvider config."
    );
  }

  return queueManager;
};

/**
 * Hook to access sync engine
 */
export const useACubeSyncEngine = (): ProgressiveSyncEngine => {
  const { syncEngine } = useACube();

  if (!syncEngine) {
    throw new Error(
      "Sync is not enabled. Set features.enableSync to true in ACubeProvider config."
    );
  }

  return syncEngine;
};

/**
 * Hook to access network manager (enterprise functionality preserved)
 */
export const useACubeNetworkManager = (): INetworkManager | undefined => {
  const { networkManager } = useACube();
  return networkManager;
};

/**
 * Hook for enterprise network status with quality and type detection
 * Framework-agnostic but maintains enterprise functionality
 */
export const useACubeNetworkStatus = () => {
  const { isOnline, networkManager } = useACube();
  const [connectionInfo, setConnectionInfo] = useState({
    isOnline,
    quality: "unknown" as "excellent" | "good" | "fair" | "poor" | "unknown",
    type: "unknown" as "wifi" | "cellular" | "ethernet" | "unknown",
  });

  useEffect(() => {
    if (networkManager) {
      const updateConnectionInfo = (info: any) => {
        setConnectionInfo({
          isOnline: info.isOnline || info.isConnected || false,
          quality: info.quality || "unknown",
          type: info.type || "unknown",
        });
      };

      if (networkManager.onConnectionChange) {
        networkManager.onConnectionChange(updateConnectionInfo);
      }

      // Get initial status
      if (networkManager.getConnectionInfo) {
        const currentInfo = networkManager.getConnectionInfo();
        updateConnectionInfo(currentInfo);
      }
    }
  }, [networkManager]);

  return connectionInfo;
};

export default ACubeProvider;
