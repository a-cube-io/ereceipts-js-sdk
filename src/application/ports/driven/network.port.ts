import { Observable } from 'rxjs';

export interface NetworkStatus {
  online: boolean;
  timestamp: number;
}

export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType?: '2g' | '3g' | '4g' | '5g';
  downlink?: number;
  rtt?: number;
}

export interface INetworkPort {
  readonly status$: Observable<NetworkStatus>;
  readonly online$: Observable<boolean>;
  getNetworkInfo(): Promise<NetworkInfo | null>;
  destroy(): void;
}

export type INetworkMonitor = INetworkPort;
