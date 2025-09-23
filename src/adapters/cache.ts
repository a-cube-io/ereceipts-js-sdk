/**
 * Cache adapter interface for cross-platform caching operations
 */
export interface ICacheAdapter {
  /**
   * Get a cached item
   * @param key The cache key
   * @returns The cached item with metadata or null if not found/expired
   */
  get<T>(key: string): Promise<CachedItem<T> | null>;

  /**
   * Set a value in cache with optional TTL
   * @param key The cache key
   * @param data The data to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  set<T>(key: string, data: T, ttl?: number): Promise<void>;

  /**
   * Set a value with explicit metadata
   * @param key The cache key
   * @param item The cached item with metadata
   */
  setItem<T>(key: string, item: CachedItem<T>): Promise<void>;

  /**
   * Set multiple values in a single batch operation
   * @param items Array of [key, item] pairs to set
   */
  setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void>;

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern Pattern to match (supports wildcards like 'receipts/*')
   */
  invalidate(pattern: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get cache size information
   * @returns Cache size metrics
   */
  getSize(): Promise<CacheSize>;

  /**
   * Remove expired entries from cache
   * @returns Number of entries removed
   */
  cleanup(): Promise<number>;

  /**
   * Get all cache keys matching a pattern
   * @param pattern Optional pattern to match
   * @returns Array of matching cache keys
   */
  getKeys(pattern?: string): Promise<string[]>;
}

/**
 * Cached item with simplified metadata
 */
export interface CachedItem<T> {
  /** The actual cached data */
  data: T;
  /** Timestamp when item was cached */
  timestamp: number;
  /** Time to live in milliseconds (optional, 0 = no expiration) */
  ttl?: number;
  /** ETag from server for conditional requests */
  etag?: string;
  /** Whether the data is compressed */
  compressed?: boolean;
}

/**
 * Cache size metrics
 */
export interface CacheSize {
  /** Total number of entries */
  entries: number;
  /** Estimated size in bytes */
  bytes: number;
  /** Last cleanup timestamp */
  lastCleanup: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Default TTL in milliseconds */
  defaultTtl?: number;
  /** Maximum cache size in bytes */
  maxSize?: number;
  /** Maximum number of entries */
  maxEntries?: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval?: number;
  /** Enable compression for large items */
  compression?: boolean;
  /** Compression threshold in bytes */
  compressionThreshold?: number;
  /** Enable debug logging */
  debugEnabled?: boolean;
}

/**
 * Cache query filter for basic operations
 */
export interface CacheQuery {
  /** Pattern to match keys */
  pattern?: string;
  /** Minimum timestamp */
  minTimestamp?: number;
  /** Maximum timestamp */
  maxTimestamp?: number;
}