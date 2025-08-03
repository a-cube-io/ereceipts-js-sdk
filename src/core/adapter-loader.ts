import { PlatformAdapters } from '../adapters';
import { detectPlatform } from './platform-detector';

/**
 * Dynamically load platform-specific adapters
 */
export async function loadPlatformAdapters(): Promise<PlatformAdapters> {
  const { platform } = detectPlatform();

  console.log({platform})
  
  switch (platform) {
    case 'web':
      return loadWebAdapters();
    case 'react-native':
      return loadReactNativeAdapters();
    case 'node':
      return loadNodeAdapters();
    default:
      // Fallback to memory adapters
      return loadMemoryAdapters();
  }
}

async function loadWebAdapters(): Promise<PlatformAdapters> {
  const [storage, network] = await Promise.all([
    import('../platforms/web/storage'),
    import('../platforms/web/network'),
  ]);
  
  return {
    storage: new storage.WebStorageAdapter(),
    secureStorage: new storage.WebSecureStorageAdapter(),
    networkMonitor: new network.WebNetworkMonitor(),
  };
}

async function loadReactNativeAdapters(): Promise<PlatformAdapters> {
  const [storage, network] = await Promise.all([
    import('../platforms/react-native/storage'),
    import('../platforms/react-native/network'),
  ]);
  
  return {
    storage: new storage.ReactNativeStorageAdapter(),
    secureStorage: new storage.ReactNativeSecureStorageAdapter(),
    networkMonitor: new network.ReactNativeNetworkMonitor(),
  };
}

async function loadNodeAdapters(): Promise<PlatformAdapters> {
  const [storage, network] = await Promise.all([
    import('../platforms/node/storage'),
    import('../platforms/node/network'),
  ]);
  
  return {
    storage: new storage.NodeStorageAdapter(),
    secureStorage: new storage.NodeSecureStorageAdapter(),
    networkMonitor: new network.NodeNetworkMonitor(),
  };
}

async function loadMemoryAdapters(): Promise<PlatformAdapters> {
  const storage = await import('../platforms/node/storage');
  const network = await import('../platforms/node/network');
  
  // Use memory adapters as fallback
  return {
    storage: new storage.NodeStorageAdapter(),
    secureStorage: new storage.NodeSecureStorageAdapter(),
    networkMonitor: new network.NodeNetworkMonitor(),
  };
}