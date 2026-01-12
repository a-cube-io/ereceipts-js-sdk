import { INetworkPort as INetworkMonitor, NetworkInfo } from '@/application/ports/driven';

import { NetworkObserverMixin } from '../shared';

/**
 * Node.js network monitor (basic implementation)
 * Uses NetworkObserverMixin for listener management
 */
export class NodeNetworkMonitor extends NetworkObserverMixin implements INetworkMonitor {
  private isConnected: boolean = true;

  isOnline(): boolean {
    return this.isConnected;
  }

  async getNetworkInfo(): Promise<NetworkInfo | null> {
    return {
      type: 'ethernet',
    };
  }

  /**
   * Manually set network status (for testing)
   */
  setNetworkStatus(online: boolean): void {
    if (online !== this.isConnected) {
      this.isConnected = online;
      this.notifyListeners(online);
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.clearListeners();
  }
}
