export interface INetworkPort {
  isOnline(): boolean;
  onStatusChange(callback: (online: boolean) => void): () => void;
  getNetworkInfo(): Promise<NetworkInfo | null>;
}

export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | '5g';
  downlink?: number;
  rtt?: number;
}

export type INetworkMonitor = INetworkPort;
