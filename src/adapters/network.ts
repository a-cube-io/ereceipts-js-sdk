/**
 * Network monitor adapter interface for cross-platform network status
 */
export interface INetworkMonitor {
  /**
   * Check if the device is currently online
   * @returns true if online, false if offline
   */
  isOnline(): boolean;

  /**
   * Subscribe to network status changes
   * @param callback Function to call when network status changes
   * @returns Cleanup function to unsubscribe
   */
  onStatusChange(callback: (online: boolean) => void): () => void;

  /**
   * Get detailed network information (optional)
   * @returns Network information object or null
   */
  getNetworkInfo(): Promise<NetworkInfo | null>;
}

/**
 * Detailed network information
 */
export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | '5g';
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
}