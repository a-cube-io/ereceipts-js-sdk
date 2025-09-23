import { ICacheAdapter, CachedItem, CacheSize, CacheOptions } from '../../adapters';
import { compressData, decompressData } from '../../adapters/compression';

/**
 * Web cache adapter using IndexedDB
 */
export class WebCacheAdapter implements ICacheAdapter {
  private static readonly DB_NAME = 'acube_cache';
  private static readonly DB_VERSION = 2;
  private static readonly STORE_NAME = 'cache_entries';
  
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private options: CacheOptions;
  private debugEnabled = false;

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
    this.debugEnabled = options.debugEnabled || false;
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

    this.debug('Initializing IndexedDB cache', { dbName: WebCacheAdapter.DB_NAME, version: WebCacheAdapter.DB_VERSION });

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(WebCacheAdapter.DB_NAME, WebCacheAdapter.DB_VERSION);

      request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const oldVersion = event.oldVersion;

        // Create cache store if it doesn't exist (initial setup)
        if (!db.objectStoreNames.contains(WebCacheAdapter.STORE_NAME)) {
          const store = db.createObjectStore(WebCacheAdapter.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
        } else {
          // Handle migration from version 1 to 2
          if (oldVersion < 2) {
            const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);

            // Remove unused indexes from simplified cache structure
            try {
              if (store.indexNames.contains('tags')) {
                store.deleteIndex('tags');
              }
              if (store.indexNames.contains('source')) {
                store.deleteIndex('source');
              }
              if (store.indexNames.contains('syncStatus')) {
                store.deleteIndex('syncStatus');
              }
            } catch (error) {
              // Ignore errors if indexes don't exist
              console.warn('[CACHE-WEB] Index cleanup warning:', error);
            }
          }
        }
      };
    });
  }

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    await this.ensureInitialized();

    this.debug('Getting cache item', { key });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readonly');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(new Error(`Failed to get cache item: ${request.error?.message}`));
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if item has expired
        const item = result as StoredCacheItem<T>;
        if (this.isExpired(item)) {
          // Remove expired item asynchronously
          this.delete(key).catch(console.error);
          resolve(null);
          return;
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

        resolve({
          data: finalData,
          timestamp: item.timestamp,
          ttl: item.ttl,
          etag: item.etag,
          compressed: isCompressed,
        });
      };
    });
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

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const request = store.put(storedItem);

      request.onerror = () => reject(new Error(`Failed to set cache item: ${request.error?.message}`));
      request.onsuccess = () => resolve();
    });
  }

  async setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void> {
    if (items.length === 0) return;

    await this.ensureInitialized();

    this.debug('Batch setting items', { count: items.length });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);

      let completed = 0;
      let hasError = false;

      transaction.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(new Error(`Failed to complete batch operation: ${transaction.error?.message}`));
        }
      };

      transaction.oncomplete = () => {
        if (!hasError) {
          this.debug('Batch operation completed', { count: items.length });
          resolve();
        }
      };

      // Process all items in the transaction
      for (const [key, item] of items) {
        try {
          const storedItem = this.prepareBatchItem(key, item);
          const request = store.put(storedItem);

          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(new Error(`Failed to set batch item ${key}: ${request.error?.message}`));
            }
          };

          request.onsuccess = () => {
            completed++;
          };
        } catch (error) {
          if (!hasError) {
            hasError = true;
            reject(error);
          }
          break;
        }
      }
    });
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

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(new Error(`Failed to clear cache: ${request.error?.message}`));
      request.onsuccess = () => resolve();
    });
  }

  async getSize(): Promise<CacheSize> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readonly');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      
      let entries = 0;
      let bytes = 0;
      const request = store.openCursor();

      request.onerror = () => reject(new Error(`Failed to get cache size: ${request.error?.message}`));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          entries++;
          // Rough estimation of size
          bytes += JSON.stringify(cursor.value).length * 2; // UTF-16 encoding
          cursor.continue();
        } else {
          resolve({
            entries,
            bytes,
            lastCleanup: Date.now(),
          });
        }
      };
    });
  }

  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    let removedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const request = store.openCursor();

      request.onerror = () => reject(new Error(`Failed to cleanup cache: ${request.error?.message}`));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value as StoredCacheItem<any>;
          if (this.isExpired(item)) {
            cursor.delete();
            removedCount++;
          }
          cursor.continue();
        } else {
          resolve(removedCount);
        }
      };
    });
  }

  async getKeys(pattern?: string): Promise<string[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readonly');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => reject(new Error(`Failed to get cache keys: ${request.error?.message}`));
      
      request.onsuccess = () => {
        let keys = request.result as string[];
        
        if (pattern) {
          const regex = this.patternToRegex(pattern);
          keys = keys.filter(key => regex.test(key));
        }
        
        resolve(keys);
      };
    });
  }

  private async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(new Error(`Failed to delete cache item: ${request.error?.message}`));
      request.onsuccess = () => resolve(true);
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
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