import { INetworkMonitor, NetworkInfo } from '../../adapters';

/**
 * Node.js network monitor (basic implementation)
 */
export class NodeNetworkMonitor implements INetworkMonitor {
  private listeners: Array<(online: boolean) => void> = [];
  private isConnected: boolean = true;

  isOnline(): boolean {
    return this.isConnected;
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
    // Basic implementation - in production, could use system-specific APIs
    return {
      type: 'ethernet', // Assume ethernet for Node.js
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

  private notifyListeners(online: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(online);
      } catch (error) {
        console.error('Error in network status callback:', error);
      }
    });
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.listeners = [];
  }
}