import { IStorage, ISecureStorage } from '../../adapters';

// Static imports for all platforms
import { WebStorageAdapter, WebSecureStorageAdapter } from '../../platforms/web/storage';
import { ReactNativeStorageAdapter, ReactNativeSecureStorageAdapter } from '../../platforms/react-native/storage';
import { NodeStorageAdapter, NodeSecureStorageAdapter } from '../../platforms/node/storage';

/**
 * Storage adapters result
 */
export interface StorageAdapters {
  storage: IStorage;
  secureStorage: ISecureStorage;
}

/**
 * Load platform-specific storage adapters
 */
export function loadStorageAdapters(platform: string): StorageAdapters {
  switch (platform) {
    case 'web':
      return loadWebStorageAdapters();
    case 'react-native':
      return loadReactNativeStorageAdapters();
    case 'node':
      return loadNodeStorageAdapters();
    default:
      return loadMemoryStorageAdapters();
  }
}

/**
 * Load web storage adapters (localStorage/sessionStorage-based)
 */
function loadWebStorageAdapters(): StorageAdapters {
  return {
    storage: new WebStorageAdapter(),
    secureStorage: new WebSecureStorageAdapter(),
  };
}

/**
 * Load React Native storage adapters (AsyncStorage-based)
 */
function loadReactNativeStorageAdapters(): StorageAdapters {
  return {
    storage: new ReactNativeStorageAdapter(),
    secureStorage: new ReactNativeSecureStorageAdapter(),
  };
}

/**
 * Load Node.js storage adapters (file-based)
 */
function loadNodeStorageAdapters(): StorageAdapters {
  return {
    storage: new NodeStorageAdapter(),
    secureStorage: new NodeSecureStorageAdapter(),
  };
}

/**
 * Load memory storage adapters (fallback)
 */
function loadMemoryStorageAdapters(): StorageAdapters {
  return {
    storage: new NodeStorageAdapter(),
    secureStorage: new NodeSecureStorageAdapter(),
  };
}