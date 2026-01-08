import { ICacheAdapter } from './cache';
import { IMTLSAdapter } from './mtls';
import { INetworkMonitor } from './network';
import { ISecureStorage } from './secure-storage';
import { IStorage } from './storage';

export * from './storage';
export * from './secure-storage';
export * from './network';
export * from './cache';
export * from './mtls';

/**
 * Platform adapters collection
 */
export interface PlatformAdapters {
  storage: IStorage;
  secureStorage: ISecureStorage;
  networkMonitor: INetworkMonitor;
  cache?: ICacheAdapter; // Optional for backward compatibility
  mtls?: IMTLSAdapter; // Optional for backward compatibility and unsupported platforms
}
