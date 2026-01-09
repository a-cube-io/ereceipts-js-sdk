import { INetworkPort as INetworkMonitor, NetworkInfo } from '@/application/ports/driven';

import { NetworkObserverMixin } from '../shared';

interface NetworkInformationConnection {
  type?: string;
  effectiveType?: '2g' | '3g' | '4g' | '5g';
  downlink?: number;
  rtt?: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationConnection;
}

/**
 * Web network monitor using navigator.onLine and Network Information API
 * Uses NetworkObserverMixin for listener management
 */
export class WebNetworkMonitor extends NetworkObserverMixin implements INetworkMonitor {
  constructor() {
    super();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection;

      return {
        type: this.mapConnectionType(connection?.type ?? 'unknown'),
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      };
    }

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
    this.clearListeners();
  }
}
