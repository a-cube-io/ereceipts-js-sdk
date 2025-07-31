/**
 * useNetworkStatus - Cross-platform network status hook for React Native and Web
 * Best practices implementation for 2024-2025
 * 
 * Features:
 * - Works in Expo Go (graceful fallback)
 * - Uses @react-native-community/netinfo in development builds
 * - Fallback to web APIs for web builds
 * - TypeScript support
 * - Real-time network status updates
 */

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isExpensiveConnection: boolean;
  details: {
    strength?: number;
    ssid?: string;
    ipAddress?: string;
    subnet?: string;
  } | null;
}

export interface UseNetworkStatusOptions {
  /** Whether to check for actual internet reachability (requires network request) */
  checkReachability?: boolean;
  /** How often to poll for network status (ms). Set to 0 to disable polling */
  pollInterval?: number;
}

const DEFAULT_OPTIONS: UseNetworkStatusOptions = {
  checkReachability: true,
  pollInterval: 0, // Rely on event listeners by default
};

/**
 * Cross-platform network status hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, isInternetReachable, type } = useNetworkStatus();
 *   
 *   if (!isConnected) {
 *     return <Text>No network connection</Text>;
 *   }
 *   
 *   if (isInternetReachable === false) {
 *     return <Text>Connected but no internet access</Text>;
 *   }
 *   
 *   return <Text>Online via {type}</Text>;
 * }
 * ```
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkStatus {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimistic default
    isInternetReachable: null,
    type: 'unknown',
    isExpensiveConnection: false,
    details: null,
  });

  const updateNetworkStatus = useCallback((newStatus: Partial<NetworkStatus>) => {
    setNetworkStatus(prev => ({ ...prev, ...newStatus }));
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const initializeNetworkDetection = async () => {
      // Strategy 1: Try @react-native-community/netinfo (React Native)
      if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        try {
          // Dynamic import to avoid bundling in web builds
          const NetInfo = await import('@react-native-community/netinfo');
          
          console.log('[useNetworkStatus] Using @react-native-community/netinfo');
          
          // Subscribe to network state changes
          const unsubscribe = NetInfo.default.addEventListener(state => {
            const details = state.details as any; // Type assertion for NetInfo details
            updateNetworkStatus({
              isConnected: state.isConnected ?? false,
              isInternetReachable: config.checkReachability ? state.isInternetReachable : null,
              type: state.type || 'unknown',
              isExpensiveConnection: details?.isConnectionExpensive ?? false,
              details: details ? {
                strength: details.strength,
                ssid: details.ssid,
                ipAddress: details.ipAddress,
                subnet: details.subnet,
              } : null,
            });
          });

          // Get initial state
          const initialState = await NetInfo.default.fetch();
          const initialDetails = initialState.details as any; // Type assertion for NetInfo details
          updateNetworkStatus({
            isConnected: initialState.isConnected ?? false,
            isInternetReachable: config.checkReachability ? initialState.isInternetReachable : null,
            type: initialState.type || 'unknown',
            isExpensiveConnection: initialDetails?.isConnectionExpensive ?? false,
            details: initialDetails ? {
              strength: initialDetails.strength,
              ssid: initialDetails.ssid,
              ipAddress: initialDetails.ipAddress,
              subnet: initialDetails.subnet,
            } : null,
          });

          cleanup = unsubscribe;
          return;
        } catch (error) {
          console.log('[useNetworkStatus] NetInfo not available (likely Expo Go), using fallback');
        }
      }

      // Strategy 2: Web event listeners
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        console.log('[useNetworkStatus] Using web online/offline events');
        
        const handleOnline = () => {
          updateNetworkStatus({
            isConnected: true,
            isInternetReachable: config.checkReachability ? null : true, // Will be checked if enabled
            type: 'wifi', // Assumption for web
            isExpensiveConnection: false,
            details: null,
          });
        };

        const handleOffline = () => {
          updateNetworkStatus({
            isConnected: false,
            isInternetReachable: false,
            type: 'none',
            isExpensiveConnection: false,
            details: null,
          });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Set initial state
        const isOnline = navigator.onLine;
        updateNetworkStatus({
          isConnected: isOnline,
          isInternetReachable: config.checkReachability ? null : isOnline,
          type: isOnline ? 'wifi' : 'none',
          isExpensiveConnection: false,
          details: null,
        });

        cleanup = () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } else {
        // Strategy 3: Basic fallback (assume online)
        console.log('[useNetworkStatus] Using basic fallback (assume online)');
        updateNetworkStatus({
          isConnected: true,
          isInternetReachable: null,
          type: 'unknown',
          isExpensiveConnection: false,
          details: null,
        });
      }

      // Optional polling for reachability checks
      if (config.pollInterval && config.pollInterval > 0 && config.checkReachability) {
        pollTimer = setInterval(async () => {
          try {
            // Simple reachability test
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            await fetch('https://www.google.com/favicon.ico', {
              method: 'HEAD',
              mode: 'no-cors',
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            updateNetworkStatus({ isInternetReachable: true });
          } catch {
            updateNetworkStatus({ isInternetReachable: false });
          }
        }, config.pollInterval);
      }
    };

    initializeNetworkDetection();

    return () => {
      if (cleanup) {
        cleanup();
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [config.checkReachability, config.pollInterval, updateNetworkStatus]);

  return networkStatus;
}

/**
 * Simple hook that only returns boolean connection status
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useIsOnline();
 *   return <Text>{isOnline ? 'Online' : 'Offline'}</Text>;
 * }
 * ```
 */
export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  
  // If we can't determine internet reachability, fall back to connection status
  return isInternetReachable !== false && isConnected;
}

/**
 * Hook for detecting expensive connections (cellular, metered)
 * Useful for reducing data usage on mobile networks
 * 
 * @example
 * ```tsx
 * function DataIntensiveComponent() {
 *   const isExpensive = useIsExpensiveConnection();
 *   
 *   return (
 *     <View>
 *       {isExpensive && (
 *         <Text>Using cellular data - reduced quality mode</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useIsExpensiveConnection(): boolean {
  const { isExpensiveConnection } = useNetworkStatus();
  return isExpensiveConnection;
}