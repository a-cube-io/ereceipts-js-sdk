/**
 * Web Storage Adapter - IndexedDB with localStorage fallback
 * Enterprise-grade storage for web environments
 */

import type { StorageOptions } from '@/storage/base/storage-adapter';

import { BaseStorageAdapter } from '@/storage/base/storage-adapter';

export interface WebStorageConfig {
  dbName: string;
  dbVersion: number;
  storeName: string;
  fallbackToLocalStorage: boolean;
  quota?: number;
}

const DEFAULT_CONFIG: Required<WebStorageConfig> = {
  dbName: 'acube-queue-storage',
  dbVersion: 1,
  storeName: 'queue-items',
  fallbackToLocalStorage: true,
  quota: 100 * 1024 * 1024, // 100MB
};

export class WebStorageAdapter extends BaseStorageAdapter {
  private config: Required<WebStorageConfig>;

  private db: IDBDatabase | null = null;

  private useIndexedDB = false;

  constructor(config: Partial<WebStorageConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      // Try IndexedDB first
      await this.initializeIndexedDB();
      this.useIndexedDB = true;
    } catch (error) {
      console.warn('IndexedDB initialization failed, falling back to localStorage:', error);

      if (this.config.fallbackToLocalStorage && typeof localStorage !== 'undefined') {
        await this.initializeLocalStorage();
        this.useIndexedDB = false;
      } else {
        throw new Error('No storage backend available');
      }
    }

    this.isInitialized = true;
    await this.loadStats();
  }

  private async initializeIndexedDB(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  private async initializeLocalStorage(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage not available');
    }
    // localStorage is synchronous, so no initialization needed
  }

  async set(key: string, value: any, options: StorageOptions = {}): Promise<void> {
    this.ensureInitialized();

    const item = this.createStorageItem(value, options);
    const storageItem = { key, ...item };

    if (this.useIndexedDB) {
      await this.setIndexedDB(key, storageItem);
    } else {
      await this.setLocalStorage(key, storageItem);
    }

    this.updateStats(1, item.size);
  }

  private async setIndexedDB(key: string, item: any): Promise<void> {
    if (!this.db) {throw new Error('IndexedDB not initialized');}

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.put(item, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async setLocalStorage(key: string, item: any): Promise<void> {
    try {
      const serialized = JSON.stringify(item);
      localStorage.setItem(`${this.config.dbName}:${key}`, serialized);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        await this.cleanup();
        // Retry once after cleanup
        const serialized = JSON.stringify(item);
        localStorage.setItem(`${this.config.dbName}:${key}`, serialized);
      } else {
        throw error;
      }
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    this.ensureInitialized();

    if (this.useIndexedDB) {
      return this.getIndexedDB<T>(key);
    } 
      return this.getLocalStorage<T>(key);
    
  }

  private async getIndexedDB<T>(key: string): Promise<T | null> {
    if (!this.db) {throw new Error('IndexedDB not initialized');}

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const {result} = request;
        if (!result) {
          resolve(null);
          return;
        }

        if (this.isExpired(result)) {
          // Remove expired item
          this.remove(key);
          resolve(null);
          return;
        }

        resolve(result.value);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getLocalStorage<T>(key: string): Promise<T | null> {
    try {
      const serialized = localStorage.getItem(`${this.config.dbName}:${key}`);
      if (!serialized) {return null;}

      const item = JSON.parse(serialized);
      if (this.isExpired(item)) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch {
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    this.ensureInitialized();

    if (this.useIndexedDB) {
      return this.hasIndexedDB(key);
    } 
      return this.hasLocalStorage(key);
    
  }

  private async hasIndexedDB(key: string): Promise<boolean> {
    const value = await this.getIndexedDB(key);
    return value !== null;
  }

  private async hasLocalStorage(key: string): Promise<boolean> {
    const value = await this.getLocalStorage(key);
    return value !== null;
  }

  async remove(key: string): Promise<void> {
    this.ensureInitialized();

    if (this.useIndexedDB) {
      await this.removeIndexedDB(key);
    } else {
      await this.removeLocalStorage(key);
    }

    this.updateStats(-1, 0);
  }

  private async removeIndexedDB(key: string): Promise<void> {
    if (!this.db) {throw new Error('IndexedDB not initialized');}

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async removeLocalStorage(key: string): Promise<void> {
    localStorage.removeItem(`${this.config.dbName}:${key}`);
  }

  async clear(prefix?: string): Promise<void> {
    this.ensureInitialized();

    if (this.useIndexedDB) {
      await this.clearIndexedDB(prefix);
    } else {
      await this.clearLocalStorage(prefix);
    }

    this.stats.totalKeys = 0;
    this.stats.totalSize = 0;
  }

  private async clearIndexedDB(prefix?: string): Promise<void> {
    if (!this.db) {throw new Error('IndexedDB not initialized');}

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);

      if (!prefix) {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } else {
        const request = store.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            if (cursor.key.toString().startsWith(prefix)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  private async clearLocalStorage(prefix?: string): Promise<void> {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.config.dbName}:`)) {
        if (!prefix || key.substring(this.config.dbName.length + 1).startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  async keys(prefix?: string): Promise<string[]> {
    this.ensureInitialized();

    if (this.useIndexedDB) {
      return this.keysIndexedDB(prefix);
    } 
      return this.keysLocalStorage(prefix);
    
  }

  private async keysIndexedDB(prefix?: string): Promise<string[]> {
    if (!this.db) {throw new Error('IndexedDB not initialized');}

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        let keys = request.result.map(k => k.toString());
        if (prefix) {
          keys = keys.filter(key => key.startsWith(prefix));
        }
        resolve(keys);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async keysLocalStorage(prefix?: string): Promise<string[]> {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.config.dbName}:`)) {
        const actualKey = key.substring(this.config.dbName.length + 1);
        if (!prefix || actualKey.startsWith(prefix)) {
          keys.push(actualKey);
        }
      }
    }

    return keys;
  }

  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    this.ensureInitialized();
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async setMany(items: Array<{ key: string; value: any; options?: StorageOptions }>): Promise<void> {
    this.ensureInitialized();
    await Promise.all(items.map(item => this.set(item.key, item.value, item.options)));
  }

  async removeMany(keys: string[]): Promise<void> {
    this.ensureInitialized();
    await Promise.all(keys.map(key => this.remove(key)));
  }

  async cleanup(): Promise<void> {
    this.ensureInitialized();

    const now = Date.now();
    let cleanedCount = 0;

    if (this.useIndexedDB) {
      cleanedCount = await this.cleanupIndexedDB();
    } else {
      cleanedCount = await this.cleanupLocalStorage();
    }

    this.stats.lastCleanup = now;
    this.stats.expiredKeys = cleanedCount;
  }

  private async cleanupIndexedDB(): Promise<number> {
    if (!this.db) {throw new Error('IndexedDB not initialized');}

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index('expiresAt');
      const now = Date.now();
      let cleanedCount = 0;

      const request = index.openCursor(IDBKeyRange.upperBound(now));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cleanedCount++;
          cursor.continue();
        } else {
          resolve(cleanedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupLocalStorage(): Promise<number> {
    const keys = await this.keysLocalStorage();
    let cleanedCount = 0;

    for (const key of keys) {
      try {
        const serialized = localStorage.getItem(`${this.config.dbName}:${key}`);
        if (serialized) {
          const item = JSON.parse(serialized);
          if (this.isExpired(item)) {
            localStorage.removeItem(`${this.config.dbName}:${key}`);
            cleanedCount++;
          }
        }
      } catch {
        // Remove corrupted items
        localStorage.removeItem(`${this.config.dbName}:${key}`);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  private async loadStats(): Promise<void> {
    try {
      const keys = await this.keys();
      this.stats.totalKeys = keys.length;

      // Calculate total size (approximation)
      let totalSize = 0;
      for (const key of keys.slice(0, 100)) { // Sample first 100 keys
        const value = await this.get(key);
        if (value) {
          totalSize += this.calculateSize(value);
        }
      }

      // Extrapolate for all keys
      this.stats.totalSize = Math.round((totalSize / Math.min(keys.length, 100)) * keys.length);
    } catch (error) {
      console.warn('Failed to load storage stats:', error);
    }
  }

  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (!this.useIndexedDB) {
      await this.clearLocalStorage();
    }

    this.isInitialized = false;
  }
}
