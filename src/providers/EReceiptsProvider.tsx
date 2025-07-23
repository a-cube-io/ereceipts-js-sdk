import React, { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { SDKConfig, initializeAPIClient } from '../api/client';
import { SecureTokenStorage } from '../storage/token';
import { apiLogger } from '../utils/logger';

// Configuration interface for the provider
export interface EReceiptsProviderConfig extends Partial<SDKConfig> {
  /** 
   * Custom initialization callback
   * Called after SDK is initialized successfully
   */
  onInitialized?: () => void | Promise<void>;

  /** 
   * Error callback for initialization failures
   * Called if SDK initialization fails
   */
  onError?: (error: Error) => void | Promise<void>;

  /**
   * Loading state callback
   * Called when initialization status changes
   */
  onLoadingChange?: (isLoading: boolean) => void;

  /**
   * Authentication state callback
   * Called when authentication status changes
   */
  onAuthChange?: (isAuthenticated: boolean) => void;

  /**
   * Skip automatic token validation on mount
   * Default: false
   */
  skipTokenValidation?: boolean;
}

// Context state interface
export interface EReceiptsContextState {
  /** SDK initialization status */
  isInitialized: boolean;
  
  /** Loading state during initialization */
  isLoading: boolean;
  
  /** Current authentication status */
  isAuthenticated: boolean;
  
  /** Current user information */
  currentUser: { email: string; role: string } | null;
  
  /** Last initialization error */
  error: Error | null;
  
  /** SDK configuration */
  config: EReceiptsProviderConfig;
  
  /** Re-initialize the SDK with new config */
  reinitialize: (newConfig?: Partial<EReceiptsProviderConfig>) => Promise<void>;
  
  /** Refresh authentication status */
  refreshAuthStatus: () => Promise<void>;
  
  /** Clear error state */
  clearError: () => void;
}

// Create the context
const EReceiptsContext = createContext<EReceiptsContextState | null>(null);

// Provider component props
export interface EReceiptsProviderProps {
  children: ReactNode;
  config: EReceiptsProviderConfig;
}

/**
 * EReceiptsProvider - React Provider for A-Cube E-Receipts SDK
 * 
 * Automatically initializes the SDK and provides authentication state management
 * throughout your React application.
 * 
 * @example
 * ```tsx
 * import { EReceiptsProvider } from '@a-cube-io/ereceipts-js-sdk';
 * 
 * function App() {
 *   return (
 *     <EReceiptsProvider
 *       config={{
 *         environment: 'sandbox',
 *         enableLogging: true,
 *         onInitialized: () => console.log('SDK Ready!'),
 *         onAuthChange: (isAuth) => console.log('Auth status:', isAuth)
 *       }}
 *     >
 *       <YourApp />
 *     </EReceiptsProvider>
 *   );
 * }
 * ```
 */
export const EReceiptsProvider: React.FC<EReceiptsProviderProps> = ({ 
  children, 
  config 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; role: string } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentConfig, setCurrentConfig] = useState<EReceiptsProviderConfig>(config);

  // Initialize SDK
  const initializeSDK = useCallback(async (initConfig: EReceiptsProviderConfig) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call loading change callback
      if (initConfig.onLoadingChange) {
        initConfig.onLoadingChange(true);
      }

      apiLogger.info('Initializing E-Receipts SDK via React Provider', {
        environment: initConfig.environment,
        enableLogging: initConfig.enableLogging,
      });

      // Initialize the API client
      initializeAPIClient(initConfig);
      
      // Validate token if not skipped
      if (!initConfig.skipTokenValidation) {
        await refreshAuthStatus();
      }

      setIsInitialized(true);

      // Call success callback
      if (initConfig.onInitialized) {
        await initConfig.onInitialized();
      }

      apiLogger.info('E-Receipts SDK initialized successfully via React Provider');

    } catch (err) {
      const error = err instanceof Error ? err : new Error('SDK initialization failed');
      setError(error);
      setIsInitialized(false);

      apiLogger.error('E-Receipts SDK initialization failed', error);

      // Call error callback
      if (initConfig.onError) {
        await initConfig.onError(error);
      }
    } finally {
      setIsLoading(false);
      
      // Call loading change callback
      if (initConfig.onLoadingChange) {
        initConfig.onLoadingChange(false);
      }
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh authentication status  
  const refreshAuthStatus = useCallback(async () => {
    try {
      const token = await SecureTokenStorage.getToken();
      const isValid = token ? await SecureTokenStorage.isTokenValid() : false;
      
      setIsAuthenticated(isValid);

      if (isValid) {
        // Get user info
        const email = await SecureTokenStorage.getUserEmail();
        const role = await SecureTokenStorage.getUserRole();
        
        if (email && role) {
          setCurrentUser({ email, role });
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        // Clean up expired token
        if (token) {
          await SecureTokenStorage.removeToken();
        }
      }

      // Call auth change callback
      if (currentConfig.onAuthChange) {
        currentConfig.onAuthChange(isValid);
      }

    } catch (error) {
      apiLogger.error('Failed to refresh auth status in React Provider', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
      
      if (currentConfig.onAuthChange) {
        currentConfig.onAuthChange(false);
      }
    }
  }, [currentConfig]);

  // Re-initialize with new config
  const reinitialize = useCallback(async (newConfig?: Partial<EReceiptsProviderConfig>) => {
    const updatedConfig = { ...currentConfig, ...newConfig };
    setCurrentConfig(updatedConfig);
    await initializeSDK(updatedConfig);
  }, [currentConfig, initializeSDK]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount and config changes
  useEffect(() => {
    void initializeSDK(currentConfig);
  }, [currentConfig, initializeSDK]); // Only run on mount

  // Set up auth status monitoring
  useEffect(() => {
    if (!isInitialized) return;

    // Check auth status periodically
    const authCheckInterval = setInterval(() => {
      void refreshAuthStatus();
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(authCheckInterval);
    };
  }, [isInitialized, refreshAuthStatus]);

  // Context value
  const contextValue: EReceiptsContextState = {
    isInitialized,
    isLoading,
    isAuthenticated,
    currentUser,
    error,
    config: currentConfig,
    reinitialize,
    refreshAuthStatus,
    clearError,
  };

  return (
    <EReceiptsContext.Provider value={contextValue}>
      {children}
    </EReceiptsContext.Provider>
  );
};

/**
 * useEReceipts - Hook to access E-Receipts SDK context
 * 
 * Provides access to SDK state and methods within components wrapped by EReceiptsProvider
 * 
 * @example
 * ```tsx
 * import { useEReceipts } from '@a-cube-io/ereceipts-js-sdk';
 * 
 * function MyComponent() {
 *   const { 
 *     isInitialized, 
 *     isAuthenticated, 
 *     currentUser,
 *     refreshAuthStatus 
 *   } = useEReceipts();
 * 
 *   if (!isInitialized) {
 *     return <div>Loading SDK...</div>;
 *   }
 * 
 *   return (
 *     <div>
 *       <p>User: {currentUser?.email}</p>
 *       <p>Role: {currentUser?.role}</p>
 *       <button onClick={refreshAuthStatus}>
 *         Refresh Auth Status
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @throws {Error} If used outside of EReceiptsProvider
 */
export const useEReceipts = (): EReceiptsContextState => {
  const context = useContext(EReceiptsContext);
  
  if (!context) {
    throw new Error(
      'useEReceipts must be used within an EReceiptsProvider. ' +
      'Make sure to wrap your component tree with <EReceiptsProvider>.'
    );
  }
  
  return context;
};

/**
 * withEReceipts - Higher-order component to inject E-Receipts context
 * 
 * @example
 * ```tsx
 * import { withEReceipts } from '@a-cube-io/ereceipts-js-sdk';
 * 
 * const MyComponent = withEReceipts(({ ereceipts }) => {
 *   const { isInitialized, currentUser } = ereceipts;
 *   
 *   return <div>User: {currentUser?.email}</div>;
 * });
 * ```
 */
export const withEReceipts = <P extends object>(
  Component: React.ComponentType<P & { ereceipts: EReceiptsContextState }>
) => {
  return (props: P) => {
    const ereceipts = useEReceipts();
    return <Component {...props} ereceipts={ereceipts} />;
  };
};