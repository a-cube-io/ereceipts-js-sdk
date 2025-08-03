import { INetworkMonitor, NetworkInfo } from '../../adapters';

/**
 * Web network monitor using navigator.onLine and Network Information API
 */
export class WebNetworkMonitor implements INetworkMonitor {
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    // Set up global event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    // Fallback to true if navigator is not available
    return true;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      return {
        type: this.mapConnectionType(connection.type),
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }

    // Fallback to basic info
    return {
      type: this.isOnline() ? 'unknown' : 'unknown',
    };
  }

  private handleOnline = (): void => {
    this.notifyListeners(true);
  };

  private handleOffline = (): void => {
    this.notifyListeners(false);
  };

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
      case '2g':
      case '3g':
      case '4g':
      case '5g':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }

  /**
   * Cleanup method to remove event listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners = [];
  }
}