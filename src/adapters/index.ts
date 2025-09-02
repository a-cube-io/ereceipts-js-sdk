export * from './storage';
export * from './secure-storage';
export * from './network';
export * from './cache';
export * from './mtls';

import { IStorage } from './storage';
import { ISecureStorage } from './secure-storage';
import { INetworkMonitor } from './network';
import { ICacheAdapter } from './cache';
import { IMTLSAdapter } from './mtls';

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