import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { ACubeSDK, ACubeSDKError, SDKConfig, SDKEvents, User } from '../';

/**
 * ACube SDK Context interface
 */
export interface ACubeContextValue {
  sdk: ACubeSDK | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  error: ACubeSDKError | null;
  pendingOperations: number;
}

/**
 * ACube SDK Context
 */
const ACubeContext = createContext<ACubeContextValue | undefined>(undefined);

/**
 * ACube Provider Props
 */
export interface ACubeProviderProps {
  config: SDKConfig;
  children: ReactNode;
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
}

/**
 * ACube SDK Provider Component
 */
export function ACubeProvider({
  config,
  children,
  onUserChanged,
  onAuthError,
  onNetworkStatusChanged,
}: ACubeProviderProps) {
  const [sdk, setSDK] = useState<ACubeSDK | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<ACubeSDKError | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);

  useEffect(() => {
    let mounted = true;
    let sdkInstance: ACubeSDK | null = null;

    async function initializeSDK() {
      try {
        setIsLoading(true);
        setError(null);

        const events: SDKEvents = {
          onUserChanged: (newUser) => {
            if (mounted) {
              setUser(newUser);
              setIsAuthenticated(!!newUser);
              onUserChanged?.(newUser);
            }
          },
          onAuthError: (authError) => {
            if (mounted) {
              setError(authError);
              setUser(null);
              setIsAuthenticated(false);
              onAuthError?.(authError);
            }
          },
          onNetworkStatusChanged: (online) => {
            if (mounted) {
              setIsOnline(online);
              onNetworkStatusChanged?.(online);
            }
          },
          onOfflineOperationAdded: () => {
            if (mounted && sdkInstance) {
              setPendingOperations(sdkInstance.getOfflineManager().getPendingCount());
            }
          },
          onOfflineOperationCompleted: () => {
            if (mounted && sdkInstance) {
              setPendingOperations(sdkInstance.getOfflineManager().getPendingCount());
            }
          },
        };

        // Create and initialize SDK
        sdkInstance = new ACubeSDK(config, undefined, events);
        await sdkInstance.initialize();

        if (mounted) {
          setSDK(sdkInstance);
          setIsOnline(sdkInstance.isOnline());

          // Check if already authenticated
          const authenticated = await sdkInstance.isAuthenticated();
          setIsAuthenticated(authenticated);

          if (authenticated) {
            const currentUser = await sdkInstance.getCurrentUser();
            setUser(currentUser);
          }

          // Get initial pending operations count
          setPendingOperations(sdkInstance.getOfflineManager().getPendingCount());
        }
      } catch (err) {
        if (mounted) {
          const sdkError =
            err instanceof ACubeSDKError
              ? err
              : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to initialize SDK', err);
          setError(sdkError);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeSDK();

    return () => {
      mounted = false;
      if (sdkInstance) {
        sdkInstance.destroy();
      }
    };
  }, [config, onUserChanged, onAuthError, onNetworkStatusChanged]);

  const contextValue: ACubeContextValue = {
    sdk,
    user,
    isAuthenticated,
    isLoading,
    isOnline,
    error,
    pendingOperations,
  };

  return <ACubeContext.Provider value={contextValue}>{children}</ACubeContext.Provider>;
}

/**
 * Hook to use ACube SDK context
 */
export function useACube(): ACubeContextValue {
  const context = useContext(ACubeContext);
  if (context === undefined) {
    throw new Error('useACube must be used within an ACubeProvider');
  }
  return context;
}
