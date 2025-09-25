import { ICacheAdapter, CachedItem, CacheSize, CacheOptions } from '../../adapters';
import { compressData, decompressData } from '../../adapters/compression';
import { openDB, IDBPDatabase, deleteDB } from 'idb';

/**
 * Web cache adapter using IndexedDB with automatic error recovery
 * Automatically handles version conflicts and other IndexedDB errors
 */
export class WebCacheAdapter implements ICacheAdapter {
  private static readonly DB_NAME = 'acube_cache';
  private static readonly DB_VERSION = 2;
  private static readonly STORE_NAME = 'cache_entries';

  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private options: CacheOptions;
  private debugEnabled = false;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTtl: 300000, // 5 minutes
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 10000,
      cleanupInterval: 60000, // 1 minute
      compression: false,
      compressionThreshold: 1024,
      ...options,
    };
    this.debugEnabled = options.debugEnabled || process.env.NODE_ENV === 'development';
    this.initPromise = this.initialize();
    this.startCleanupInterval();
  }

  private debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data) {
        console.log(`[CACHE-WEB] ${message}`, data);
      } else {
        console.log(`[CACHE-WEB] ${message}`);
      }
    }
  }

  private async initialize(): Promise<void> {
    if (this.db) return;

    this.debug('Initializing IndexedDB cache', {
      dbName: WebCacheAdapter.DB_NAME,
      version: WebCacheAdapter.DB_VERSION
    });

    try {
      this.db = await this.openDatabase();
      this.debug('IndexedDB cache initialized successfully');
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.debug('Failed to initialize IndexedDB', { error: errorMessage });

      // Check if this is a version conflict error
      if (this.isVersionConflictError(errorMessage)) {
        await this.handleVersionConflict();
      } else {
        throw new Error(`Failed to initialize IndexedDB: ${errorMessage}`);
      }
    }
  }

  private async openDatabase(): Promise<IDBPDatabase> {
    return await openDB(
      WebCacheAdapter.DB_NAME,
      WebCacheAdapter.DB_VERSION,
      {
        upgrade: (db, oldVersion, newVersion, transaction) => {
          this.debug('Database upgrade needed', { oldVersion, newVersion });
          this.handleUpgrade(db, oldVersion, newVersion, transaction);
        },
        blocked: () => {
          this.debug('Database blocked - another tab may be open');
        },
        blocking: () => {
          this.debug('Database blocking - will close connection');
          if (this.db) {
            this.db.close();
            this.db = null;
          }
        },
        terminated: () => {
          this.debug('Database connection terminated unexpectedly');
          this.db = null;
        },
      }
    );
  }

  private handleUpgrade(
    db: IDBPDatabase,
    oldVersion: number,
    newVersion: number | null,
    transaction: any
  ): void {
    this.debug('Handling database upgrade', { oldVersion, newVersion });

    // Create cache store if it doesn't exist (initial setup)
    if (!db.objectStoreNames.contains(WebCacheAdapter.STORE_NAME)) {
      const store = db.createObjectStore(WebCacheAdapter.STORE_NAME, { keyPath: 'key' });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      this.debug('Created cache store and timestamp index');
    }

    // Handle migration from version 1 to 2
    if (oldVersion < 2) {
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);

      // Remove unused indexes from simplified cache structure
      const indexesToRemove = ['tags', 'source', 'syncStatus'];

      indexesToRemove.forEach(indexName => {
        try {
          if (store.indexNames.contains(indexName)) {
            store.deleteIndex(indexName);
            this.debug(`Removed unused index: ${indexName}`);
          }
        } catch (error) {
          // Ignore errors if indexes don't exist
          this.debug(`Warning: Could not remove index ${indexName}`, error);
        }
      });
    }

    this.debug('Database upgrade completed');
  }

  private isVersionConflictError(errorMessage: string): boolean {
    return errorMessage.includes('less than the existing version') ||
           errorMessage.includes('version conflict') ||
           errorMessage.includes('VersionError');
  }

  private async handleVersionConflict(): Promise<void> {
    this.debug('Handling version conflict, attempting recovery...');

    if (this.retryCount >= this.maxRetries) {
      throw new Error('Failed to resolve IndexedDB version conflict after multiple attempts');
    }

    this.retryCount++;

    try {
      // Close any existing connection
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      // Delete the problematic database
      this.debug('Deleting problematic database to resolve version conflict');
      await deleteDB(WebCacheAdapter.DB_NAME);

      // Wait a bit for the deletion to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Try to open the database again
      this.debug(`Retrying database initialization (attempt ${this.retryCount}/${this.maxRetries})`);
      this.db = await this.openDatabase();

      this.debug('Successfully recovered from version conflict');
      this.retryCount = 0; // Reset retry count on success
    } catch (retryError) {
      const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Unknown error';
      this.debug('Recovery attempt failed', { attempt: this.retryCount, error: retryErrorMessage });

      if (this.retryCount < this.maxRetries) {
        // Try again
        await this.handleVersionConflict();
      } else {
        throw new Error(`Failed to recover from IndexedDB version conflict: ${retryErrorMessage}`);
      }
    }
  }

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    await this.ensureInitialized();

    this.debug('Getting cache item', { key });

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readonly');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const result = await store.get(key);

      if (!result) {
        return null;
      }

      // Check if item has expired
      const item = result as StoredCacheItem<T>;
      if (this.isExpired(item)) {
        // Remove expired item asynchronously
        this.delete(key).catch(console.error);
        return null;
      }

      // Handle decompression if needed
      const isCompressed = !!item.compressed;
      let finalData: any;

      if (isCompressed) {
        const decompressed = decompressData(item.data as string, true);
        finalData = JSON.parse(decompressed.data);
      } else {
        finalData = item.data;
      }

      return {
        data: finalData,
        timestamp: item.timestamp,
        ttl: item.ttl,
        etag: item.etag,
        compressed: isCompressed,
      };
    } catch (error) {
      this.debug('Error getting cache item', { key, error });
      return null; // Return null on error instead of throwing
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const item: CachedItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTtl,
    };

    return this.setItem(key, item);
  }

  async setItem<T>(key: string, item: CachedItem<T>): Promise<void> {
    await this.ensureInitialized();

    // Handle compression if enabled
    let finalData: any = item.data;
    let isCompressed = false;

    if (this.options.compression && this.options.compressionThreshold) {
      const serializedData = JSON.stringify(item.data);
      const compressionResult = compressData(serializedData, this.options.compressionThreshold);

      if (compressionResult.compressed) {
        finalData = compressionResult.data;
        isCompressed = true;

        this.debug('Compression result', {
          key,
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          compressed: isCompressed,
          savings: compressionResult.originalSize - compressionResult.compressedSize
        });
      }
    }

    this.debug('Setting cache item', { key, timestamp: item.timestamp, hasTtl: !!item.ttl, compressed: isCompressed });

    const storedItem: StoredCacheItem<any> = {
      key,
      data: finalData,
      timestamp: item.timestamp,
      ttl: item.ttl || this.options.defaultTtl,
      etag: item.etag,
      compressed: isCompressed,
    };

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      await store.put(storedItem);
    } catch (error) {
      this.debug('Error setting cache item', { key, error });
      // Silently fail for cache writes
    }
  }

  async setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void> {
    if (items.length === 0) return;

    await this.ensureInitialized();

    this.debug('Batch setting items', { count: items.length });

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);

      // Process all items in the transaction
      const promises = items.map(([key, item]) => {
        const storedItem = this.prepareBatchItem(key, item);
        return store.put(storedItem);
      });

      await Promise.all(promises);
      this.debug('Batch operation completed', { count: items.length });
    } catch (error) {
      this.debug('Error in batch operation', { count: items.length, error });
      // Silently fail for batch writes
    }
  }

  private prepareBatchItem<T>(key: string, item: CachedItem<T>): StoredCacheItem<any> {
    // Handle compression if enabled (same logic as setItem)
    let finalData: any = item.data;
    let isCompressed = false;

    if (this.options.compression && this.options.compressionThreshold) {
      const serializedData = JSON.stringify(item.data);
      const compressionResult = compressData(serializedData, this.options.compressionThreshold);

      if (compressionResult.compressed) {
        finalData = compressionResult.data;
        isCompressed = true;
      }
    }

    return {
      key,
      data: finalData,
      timestamp: item.timestamp,
      ttl: item.ttl || this.options.defaultTtl,
      etag: item.etag,
      compressed: isCompressed,
    };
  }

  async invalidate(pattern: string): Promise<void> {
    await this.ensureInitialized();

    const keys = await this.getKeys(pattern);
    const deletePromises = keys.map(key => this.delete(key));
    await Promise.all(deletePromises);
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      await store.clear();
      this.debug('Cache cleared successfully');
    } catch (error) {
      this.debug('Error clearing cache', error);
      // Silently fail for cache clear
    }
  }

  async getSize(): Promise<CacheSize> {
    await this.ensureInitialized();

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readonly');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);

      let entries = 0;
      let bytes = 0;

      // Use cursor for efficient iteration
      let cursor = await store.openCursor();

      while (cursor) {
        entries++;
        // Rough estimation of size
        bytes += JSON.stringify(cursor.value).length * 2; // UTF-16 encoding
        cursor = await cursor.continue();
      }

      return {
        entries,
        bytes,
        lastCleanup: Date.now(),
      };
    } catch (error) {
      this.debug('Error getting cache size', error);
      return {
        entries: 0,
        bytes: 0,
        lastCleanup: Date.now(),
      };
    }
  }

  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    let removedCount = 0;

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);

      let cursor = await store.openCursor();

      while (cursor) {
        const item = cursor.value as StoredCacheItem<any>;
        if (this.isExpired(item)) {
          await cursor.delete();
          removedCount++;
        }
        cursor = await cursor.continue();
      }

      this.debug('Cache cleanup completed', { removedCount });
      return removedCount;
    } catch (error) {
      this.debug('Error during cleanup', error);
      return 0;
    }
  }

  async getKeys(pattern?: string): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readonly');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const allKeys = await store.getAllKeys() as string[];

      if (!pattern) {
        return allKeys;
      }

      const regex = this.patternToRegex(pattern);
      return allKeys.filter(key => regex.test(key));
    } catch (error) {
      this.debug('Error getting cache keys', error);
      return [];
    }
  }

  private async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      await store.delete(key);
      return true;
    } catch (error) {
      this.debug('Error deleting cache item', { key, error });
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }

    try {
      await this.initPromise;
    } catch (error) {
      this.debug('Failed to ensure initialization', error);
      // Reset and try once more
      this.initPromise = null;
      this.db = null;
      this.initPromise = this.initialize();
      await this.initPromise;
    }
  }

  private isExpired(item: StoredCacheItem<any>): boolean {
    if (!item.ttl || item.ttl === 0) return false;
    return Date.now() - item.timestamp > item.ttl;
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert simple glob patterns to regex
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    return new RegExp(`^${regexPattern}$`);
  }

  private startCleanupInterval(): void {
    if (this.options.cleanupInterval && this.options.cleanupInterval > 0) {
      setInterval(() => {
        this.cleanup().catch(console.error);
      }, this.options.cleanupInterval);
    }
  }
}

/**
 * Internal storage format for IndexedDB
 */
interface StoredCacheItem<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number;
  etag?: string;
  compressed?: boolean;
}