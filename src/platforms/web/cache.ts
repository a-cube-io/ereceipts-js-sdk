import { ICacheAdapter, CachedItem, CacheSize, CacheOptions } from '../../adapters';

/**
 * Web cache adapter using IndexedDB
 */
export class WebCacheAdapter implements ICacheAdapter {
  private static readonly DB_NAME = 'acube_cache';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'cache_entries';
  
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private options: CacheOptions;

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
    this.initPromise = this.initialize();
    this.startCleanupInterval();
  }

  private async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(WebCacheAdapter.DB_NAME, WebCacheAdapter.DB_VERSION);

      request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create cache store if it doesn't exist
        if (!db.objectStoreNames.contains(WebCacheAdapter.STORE_NAME)) {
          const store = db.createObjectStore(WebCacheAdapter.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('tags', 'tags', { multiEntry: true });
          store.createIndex('source', 'source');
          store.createIndex('syncStatus', 'syncStatus');
        }
      };
    });
  }

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    await this.ensureInitialized();
    
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

        resolve({
          data: item.data,
          timestamp: item.timestamp,
          ttl: item.ttl,
          tags: item.tags,
          etag: item.etag,
          source: item.source,
          syncStatus: item.syncStatus,
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

    const storedItem: StoredCacheItem<T> = {
      key,
      data: item.data,
      timestamp: item.timestamp,
      ttl: item.ttl || this.options.defaultTtl,
      tags: item.tags || [],
      etag: item.etag,
      source: item.source || 'server',
      syncStatus: item.syncStatus || 'synced',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([WebCacheAdapter.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(WebCacheAdapter.STORE_NAME);
      const request = store.put(storedItem);

      request.onerror = () => reject(new Error(`Failed to set cache item: ${request.error?.message}`));
      request.onsuccess = () => resolve();
    });
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
  tags?: string[];
  etag?: string;
  source?: 'server' | 'optimistic' | 'offline';
  syncStatus?: 'synced' | 'pending' | 'failed';
}