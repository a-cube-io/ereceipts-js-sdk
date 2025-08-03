export * from './storage';
export * from './secure-storage';
export * from './network';

import { IStorage } from './storage';
import { ISecureStorage } from './secure-storage';
import { INetworkMonitor } from './network';

/**
 * Platform adapters collection
 */
export interface PlatformAdapters {
  storage: IStorage;
  secureStorage: ISecureStorage;
  networkMonitor: INetworkMonitor;
}