import { PlatformAdapters } from '../adapters';
import { detectPlatform } from './platform-detector';
import { 
  loadCacheAdapter, 
  loadStorageAdapters, 
  loadNetworkMonitor 
} from './loaders';

/**
 * Dynamically load platform-specific adapters
 */
export function loadPlatformAdapters(): PlatformAdapters {
  const { platform } = detectPlatform();
  
  // Load all adapters using dedicated loaders
  const storageAdapters = loadStorageAdapters(platform);
  const networkMonitor = loadNetworkMonitor(platform);
  const cache = loadCacheAdapter(platform);
  
  return {
    ...storageAdapters,
    networkMonitor,
    cache,
  };
}