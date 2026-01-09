/**
 * Observer pattern implementation for network status monitoring
 * Eliminates duplicate listener management across Node, Web, and React Native adapters
 */
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('NETWORK-OBSERVER');

export type NetworkStatusCallback = (online: boolean) => void;

/**
 * Mixin class that provides observer pattern for network status changes
 */
export class NetworkObserverMixin {
  protected listeners: NetworkStatusCallback[] = [];

  /**
   * Register a callback to be notified when network status changes
   * @returns Cleanup function to unsubscribe
   */
  onStatusChange(callback: NetworkStatusCallback): () => void {
    this.listeners.push(callback);

    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all registered listeners of a status change
   */
  protected notifyListeners(online: boolean): void {
    this.listeners.forEach((callback) => {
      try {
        callback(online);
      } catch (error) {
        log.error('Error in network status callback:', error);
      }
    });
  }

  /**
   * Clear all listeners
   */
  protected clearListeners(): void {
    this.listeners = [];
  }

  /**
   * Get current listener count (useful for debugging)
   */
  protected getListenerCount(): number {
    return this.listeners.length;
  }
}
