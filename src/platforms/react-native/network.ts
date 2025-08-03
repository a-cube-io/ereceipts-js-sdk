import { INetworkMonitor, NetworkInfo } from '../../adapters';

/**
 * React Native network monitor using @react-native-community/netinfo
 */
export class ReactNativeNetworkMonitor implements INetworkMonitor {
  private NetInfo: any;
  private listeners: Array<(online: boolean) => void> = [];
  private unsubscribe: (() => void) | null = null;
  private currentState: boolean = true;

  constructor() {
    this.initializeNetInfo();
  }

  private async initializeNetInfo() {
    try {
      // Try to import NetInfo
      const NetInfoModule = await import('@react-native-community/netinfo');
      this.NetInfo = NetInfoModule.default;
      
      // Subscribe to network state changes
      this.subscribeToNetworkState();
    } catch (error) {
      console.warn('NetInfo not available. Network monitoring will be limited:', error);
    }
  }

  private subscribeToNetworkState() {
    if (!this.NetInfo) return;

    this.unsubscribe = this.NetInfo.addEventListener((state: any) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      
      if (isOnline !== this.currentState) {
        this.currentState = isOnline;
        this.notifyListeners(isOnline);
      }
    });
  }

  isOnline(): boolean {
    return this.currentState;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Initialize NetInfo if not already done
    if (!this.NetInfo) {
      this.initializeNetInfo();
    }
    
    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    if (!this.NetInfo) {
      await this.initializeNetInfo();
    }

    if (!this.NetInfo) {
      return null;
    }

    try {
      const state = await this.NetInfo.fetch();
      
      return {
        type: this.mapConnectionType(state.type),
        effectiveType: this.mapEffectiveType(state.details?.cellularGeneration),
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  private notifyListeners(online: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(online);
      } catch (error) {
        console.error('Error in network status callback:', error);
      }
    });
  }

  private mapConnectionType(type: string): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      case 'none':
      case 'unknown':
      default:
        return 'unknown';
    }
  }

  private mapEffectiveType(generation: string): '2g' | '3g' | '4g' | '5g' | undefined {
    switch (generation) {
      case '2g':
        return '2g';
      case '3g':
        return '3g';
      case '4g':
        return '4g';
      case '5g':
        return '5g';
      default:
        return undefined;
    }
  }

  /**
   * Cleanup method to remove listeners and unsubscribe
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }
}