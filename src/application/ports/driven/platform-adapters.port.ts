import type { IMTLSPort } from './mtls.port';
import type { INetworkPort } from './network.port';
import type { ISecureStoragePort, IStoragePort } from './storage.port';

/**
 * Platform adapters collection
 */
export interface PlatformAdapters {
  storage: IStoragePort;
  secureStorage: ISecureStoragePort;
  networkMonitor: INetworkPort;
  mtls?: IMTLSPort;
}
