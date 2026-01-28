export {
  CompressionAdapter,
  compressData,
  decompressData,
  estimateCompressionSavings,
} from './compression.adapter';

export {
  CacheManager,
  type CacheManagerConfig,
  type CleanupStrategy,
  type CleanupResult,
  type MemoryStats,
} from './cache-manager';

export { CacheKeyGenerator } from './cache-key-generator';

export { CachingHttpDecorator, type CachingHttpDecoratorConfig } from './caching-http-decorator';
