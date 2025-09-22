import { ICacheAdapter } from '../../adapters';

// Static imports for all platforms
import { WebCacheAdapter } from '../../platforms/web/cache';
import { ReactNativeCacheAdapter, MemoryCacheAdapter } from '../../platforms/react-native/cache';

/**
 * Load platform-specific cache adapter
 */
export function loadCacheAdapter(platform: string): ICacheAdapter | undefined {
  try {
    switch (platform) {
      case 'web':
        return loadWebCacheAdapter();
      case 'react-native':
        return loadReactNativeCacheAdapter();
      case 'node':
        return loadNodeCacheAdapter();
      default:
        return loadMemoryCacheAdapter();
    }
  } catch (error) {
    console.warn(`Cache adapter not available for platform ${platform}:`, error);
    return undefined;
  }
}

/**
 * Load web cache adapter (IndexedDB-based)
 */
function loadWebCacheAdapter(): ICacheAdapter {
  return new WebCacheAdapter({
    defaultTtl: 300000, // 5 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 10000,
    cleanupInterval: 60000, // 1 minute
    compression: false,
  });
}

/**
 * Load React Native cache adapter (SQLite-based with memory fallback)
 */
function loadReactNativeCacheAdapter(): ICacheAdapter {
  try {
    return new ReactNativeCacheAdapter({
      defaultTtl: 300000, // 5 minutes
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 15000,
      cleanupInterval: 300000, // 5 minutes
    });
  } catch (error) {
    console.warn('SQLite cache not available, falling back to memory cache');
    return loadMemoryCacheAdapter();
  }
}

/**
 * Load Node.js cache adapter (memory-based)
 */
function loadNodeCacheAdapter(): ICacheAdapter {
  return loadMemoryCacheAdapter();
}

/**
 * Load memory cache adapter (fallback for all platforms)
 */
function loadMemoryCacheAdapter(): ICacheAdapter {
  return new MemoryCacheAdapter({
    defaultTtl: 300000, // 5 minutes
    maxSize: 10 * 1024 * 1024, // 10MB for memory cache
    maxEntries: 5000,
    cleanupInterval: 120000, // 2 minutes
  });
}

/**
 * Cache adapter configuration by platform
 */
export const CACHE_CONFIG_BY_PLATFORM = {
  web: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 10000,
    cleanupInterval: 60000, // 1 minute
    compression: false,
  },
  'react-native': {
    defaultTtl: 300000, // 5 minutes
    maxSize: 100 * 1024 * 1024, // 100MB
    maxEntries: 15000,
    cleanupInterval: 300000, // 5 minutes
  },
  node: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
    maxEntries: 5000,
    cleanupInterval: 120000, // 2 minutes
  },
  memory: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
    maxEntries: 5000,
    cleanupInterval: 120000, // 2 minutes
  },
} as const;