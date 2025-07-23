// Network status utilities for cross-platform support
// For React Native, use @react-native-community/netinfo
// For web, use browser APIs

// Platform detection
const isWeb = typeof window !== 'undefined' && !!window.document;

// Network status types
export interface NetworkState {
  isConnected: boolean;
  connectionType?: string;
  isInternetReachable?: boolean;
}

export type NetworkStateChangeHandler = (state: NetworkState) => void;

class NetworkManager {
  private listeners: Set<NetworkStateChangeHandler> = new Set();
  private currentState: NetworkState = { isConnected: true };
  private webEventListener?: () => void;

  constructor() {
    void this.initializeNetworkMonitoring();
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    if (isWeb) {
      this.initializeWebNetworkMonitoring();
    } else {
      await this.initializeRNNetworkMonitoring();
    }
  }

  private initializeWebNetworkMonitoring(): void {
    // Web implementation using navigator.onLine
    this.currentState = {
      isConnected: navigator.onLine,
      connectionType: 'unknown',
      isInternetReachable: navigator.onLine,
    };

    this.webEventListener = () => {
      const newState: NetworkState = {
        isConnected: navigator.onLine,
        connectionType: 'unknown',
        isInternetReachable: navigator.onLine,
      };
      
      this.updateNetworkState(newState);
    };

    window.addEventListener('online', this.webEventListener);
    window.addEventListener('offline', this.webEventListener);
  }

  private async initializeRNNetworkMonitoring(): Promise<void> {
    try {
      // Dynamic import for React Native NetInfo
      const NetInfo = await import('@react-native-community/netinfo');
      
      // Get initial state
      const initialState = await NetInfo.default.fetch();
      this.currentState = {
        isConnected: initialState.isConnected ?? false,
        connectionType: initialState.type,
        isInternetReachable: initialState.isInternetReachable ?? false,
      };

      // Subscribe to network state changes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      NetInfo.default.addEventListener((state: any) => {
        const newState: NetworkState = {
          isConnected: state.isConnected ?? false,
          connectionType: state.type,
          isInternetReachable: state.isInternetReachable ?? false,
        };
        
        this.updateNetworkState(newState);
      });
    } catch (error) {
      console.warn('NetInfo not available, using fallback:', error);
      // Fallback to assuming connected
      this.currentState = { isConnected: true };
    }
  }

  private updateNetworkState(newState: NetworkState): void {
    const wasConnected = this.currentState.isConnected;
    const isConnected = newState.isConnected;
    
    this.currentState = newState;
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(newState);
      } catch (error) {
        console.warn('Network state listener error:', error);
      }
    });

    // Log significant state changes
    if (wasConnected !== isConnected) {
      console.log(`Network status changed: ${isConnected ? 'connected' : 'disconnected'}`);
    }
  }

  public getNetworkState(): NetworkState {
    return { ...this.currentState };
  }

  public isConnected(): boolean {
    return this.currentState.isConnected;
  }

  public addListener(listener: NetworkStateChangeHandler): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public removeListener(listener: NetworkStateChangeHandler): void {
    this.listeners.delete(listener);
  }

  public async checkInternetConnectivity(): Promise<boolean> {
    if (!this.currentState.isConnected) {
      return false;
    }

    try {
      if (isWeb) {
        // Simple connectivity check for web
        const response = await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } else {
        // For React Native, rely on NetInfo's isInternetReachable
        return this.currentState.isInternetReachable ?? false;
      }
    } catch (error) {
      console.warn('Internet connectivity check failed:', error);
      return false;
    }
  }

  public cleanup(): void {
    if (isWeb && this.webEventListener) {
      window.removeEventListener('online', this.webEventListener);
      window.removeEventListener('offline', this.webEventListener);
    }
    
    this.listeners.clear();
  }
}

// Singleton instance
const networkManager = new NetworkManager();

// Public API
export const getNetworkState = (): NetworkState => networkManager.getNetworkState();
export const isConnected = (): boolean => networkManager.isConnected();
export const addNetworkListener = (listener: NetworkStateChangeHandler): (() => void) => 
  networkManager.addListener(listener);
export const removeNetworkListener = (listener: NetworkStateChangeHandler): void => 
  networkManager.removeListener(listener);
export const checkInternetConnectivity = (): Promise<boolean> => 
  networkManager.checkInternetConnectivity();

// Utility function to wait for network connection
export const waitForConnection = (timeoutMs: number = 30000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isConnected()) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);

    const unsubscribe = addNetworkListener((state) => {
      if (state.isConnected) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(true);
      }
    });
  });
};

export default networkManager;