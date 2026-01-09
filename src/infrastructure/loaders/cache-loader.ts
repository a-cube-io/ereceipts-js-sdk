import { ICachePort as ICacheAdapter } from '@/application/ports/driven';
import {
  MemoryCacheAdapter,
  ReactNativeCacheAdapter,
} from '@/infrastructure/driven/platforms/react-native/cache';
import { WebCacheAdapter } from '@/infrastructure/driven/platforms/web/cache';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('CACHE-LOADER');

export function loadCacheAdapter(platform: string): ICacheAdapter | undefined {
  try {
    switch (platform) {
      case 'web':
        return new WebCacheAdapter({
          maxSize: 50 * 1024 * 1024,
          maxEntries: 10000,
          compression: false,
        });
      case 'react-native':
        try {
          return new ReactNativeCacheAdapter({
            maxSize: 100 * 1024 * 1024,
            maxEntries: 15000,
          });
        } catch {
          return new MemoryCacheAdapter({
            maxSize: 10 * 1024 * 1024,
            maxEntries: 5000,
          });
        }
      case 'node':
      default:
        return new MemoryCacheAdapter({
          maxSize: 10 * 1024 * 1024,
          maxEntries: 5000,
        });
    }
  } catch (error) {
    log.warn(`Cache adapter not available for platform ${platform}:`, error);
    return undefined;
  }
}

export const CACHE_CONFIG_BY_PLATFORM = {
  web: { maxSize: 50 * 1024 * 1024, maxEntries: 10000, compression: false },
  'react-native': { maxSize: 100 * 1024 * 1024, maxEntries: 15000 },
  node: { maxSize: 10 * 1024 * 1024, maxEntries: 5000 },
  memory: { maxSize: 10 * 1024 * 1024, maxEntries: 5000 },
} as const;
