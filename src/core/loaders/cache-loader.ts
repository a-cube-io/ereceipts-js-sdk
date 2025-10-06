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
 * Load web cache adapter (IndexedDB-based with automatic error recovery)
 */
function loadWebCacheAdapter(): ICacheAdapter {
  return new WebCacheAdapter({
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 10000,
    compression: false,
    debugEnabled: process.env.NODE_ENV === 'development',
  });
}

/**
 * Load React Native cache adapter (SQLite-based with memory fallback)
 */
function loadReactNativeCacheAdapter(): ICacheAdapter {
  try {
    return new ReactNativeCacheAdapter({
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 15000,
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
    maxSize: 10 * 1024 * 1024, // 10MB for memory cache
    maxEntries: 5000,
  });
}

/**
 * Cache adapter configuration by platform (simplified - no TTL/expiration)
 */
export const CACHE_CONFIG_BY_PLATFORM = {
  web: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 10000,
    compression: false,
  },
  'react-native': {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxEntries: 15000,
  },
  node: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxEntries: 5000,
  },
  memory: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxEntries: 5000,
  },
} as const;