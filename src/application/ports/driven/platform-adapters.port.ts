import type { ICachePort } from './cache.port';
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
  cache?: ICachePort;
  mtls?: IMTLSPort;
}
