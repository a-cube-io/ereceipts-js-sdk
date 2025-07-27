/**
 * LocalStorage Storage Adapter for A-Cube SDK
 * Provides fallback storage for environments without IndexedDB
 */

import { 
  StorageAdapter, 
  StorageKey, 
  StorageValue, 
  StorageEntry, 
  StorageOptions, 
  QueryOptions, 
  StorageTransaction, 
  StorageStats,
  InternalStorageStats,
  StorageError,
  StorageConnectionError,
  StorageCapacityError,
  StorageTransactionError,
  DEFAULT_STORAGE_OPTIONS 
} from '../unified-storage';

// LocalStorage specific types
// interface LocalStorageData {
//   readonly [key: string]: string;
// }

interface LocalStorageTransaction extends StorageTransaction {
  readonly pendingOperations: Map<StorageKey, { action: 'set' | 'delete'; value?: any; options?: StorageOptions }>;
  readonly originalValues: Map<StorageKey, string | null>;
}

/**
 * Simple transaction implementation for localStorage
 * Uses in-memory operations with commit/rollback support
 */
class LocalStorageTransactionImpl implements LocalStorageTransaction {
  public readonly id: string;
  public isActive: boolean = true;
  public readonly pendingOperations = new Map<StorageKey, { action: 'set' | 'delete'; value?: any; options?: StorageOptions }>();
  public readonly originalValues = new Map<StorageKey, string | null>();

  constructor(private adapter: LocalStorageAdapter) {
    this.id = `txn_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  async set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'set', new Error('Transaction not active'));
    }

    // Store original value if not already stored
    if (!this.originalValues.has(key)) {
      try {
        const originalValue = localStorage.getItem(this.adapter.getStorageKey(key));
        this.originalValues.set(key, originalValue);
      } catch {
        this.originalValues.set(key, null);
      }
    }

    this.pendingOperations.set(key, { action: 'set', value, ...(options && { options }) });
  }

  async get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'get', new Error('Transaction not active'));
    }

    // Check pending operations first
    const pending = this.pendingOperations.get(key);
    if (pending) {
      if (pending.action === 'delete') {
        return null;
      } else if (pending.action === 'set') {
        const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...pending.options };
        return this.adapter.createStorageEntry(key, pending.value, mergedOptions);
      }
    }

    // Fallback to adapter
    return this.adapter.get<T>(key);
  }

  async delete(key: StorageKey): Promise<boolean> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'delete', new Error('Transaction not active'));
    }

    // Store original value if not already stored
    if (!this.originalValues.has(key)) {
      try {
        const originalValue = localStorage.getItem(this.adapter.getStorageKey(key));
        this.originalValues.set(key, originalValue);
      } catch {
        this.originalValues.set(key, null);
      }
    }

    this.pendingOperations.set(key, { action: 'delete' });
    return true;
  }

  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'commit', new Error('Transaction not active'));
    }

    try {
      // Apply all pending operations
      for (const [key, operation] of this.pendingOperations) {
        if (operation.action === 'set') {
          await this.adapter.set(key, operation.value, operation.options);
        } else if (operation.action === 'delete') {
          await this.adapter.delete(key);
        }
      }
      
      this.isActive = false;
    } catch (error) {
      await this.rollback();
      throw new StorageTransactionError(this.id, 'commit', error as Error);
    }
  }

  async rollback(): Promise<void> {
    if (!this.isActive) {
      return; // Already rolled back
    }

    try {
      // Restore original values
      for (const [key, originalValue] of this.originalValues) {
        const storageKey = this.adapter.getStorageKey(key);
        if (originalValue === null) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, originalValue);
        }
      }
    } catch (error) {
      console.warn(`Failed to rollback transaction ${this.id}:`, error);
    } finally {
      this.isActive = false;
    }
  }
}

/**
 * LocalStorage Storage Adapter
 * Fallback storage implementation for environments without IndexedDB
 */
export class LocalStorageAdapter implements StorageAdapter {
  public readonly name = 'LocalStorage';
  private keyPrefix: string;

  public readonly capabilities = {
    supportsTransactions: true, // Simulated transactions
    supportsIndexing: false,
    maxKeyLength: 256,
    maxValueSize: 5 * 1024 * 1024, // 5MB typical localStorage limit
    supportsCompression: true,
    supportsEncryption: true,
    supportsTTL: true,
  } as const;

  constructor(keyPrefix: string = 'acube_sdk_') {
    this.keyPrefix = keyPrefix;
  }

  get isAvailable(): boolean {
    try {
      if (typeof Storage === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }
      
      // Test localStorage availability
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.isAvailable;
  }

  async connect(): Promise<void> {
    if (!this.isAvailable) {
      throw new StorageConnectionError('LocalStorage not available');
    }
  }

  async disconnect(): Promise<void> {
    // LocalStorage doesn't require explicit disconnection
  }

  getStorageKey(key: StorageKey): string {
    return `${this.keyPrefix}${key}`;
  }

  createStorageEntry<T extends StorageValue>(
    key: StorageKey, 
    value: T, 
    options: Required<StorageOptions>
  ): StorageEntry<T> {
    const now = Date.now();
    
    return {
      data: value,
      metadata: {
        key,
        createdAt: now,
        updatedAt: now,
        ...(options.ttl > 0 && { expiresAt: now + options.ttl }),
        encrypted: options.encrypt,
        compressed: options.compress,
        version: options.version,
      },
    };
  }

  async set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void> {
    await this.connect();
    
    const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
    const entry = this.createStorageEntry(key, value, mergedOptions);
    const storageKey = this.getStorageKey(key);
    
    let serialized = '';
    try {
      serialized = JSON.stringify(entry);
      
      // Check size constraints
      if (serialized.length > this.capabilities.maxValueSize) {
        throw new StorageCapacityError(key, serialized.length, this.capabilities.maxValueSize);
      }
      
      localStorage.setItem(storageKey, serialized);
    } catch (error) {
      if (error instanceof StorageCapacityError) {
        throw error;
      }
      
      // Handle quota exceeded error
      if (error instanceof DOMException && (
        error.code === 22 || // QUOTA_EXCEEDED_ERR
        error.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED
        error.name === 'QuotaExceededError'
      )) {
        const size = serialized ? serialized.length : 0;
        throw new StorageCapacityError(key, size, this.getAvailableSpace());
      }
      
      throw new StorageError(
        `Failed to set key: ${key}`,
        'STORAGE_SET_ERROR',
        'set',
        key,
        error as Error
      );
    }
  }

  async get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null> {
    await this.connect();
    
    const storageKey = this.getStorageKey(key);
    
    try {
      const serialized = localStorage.getItem(storageKey);
      if (!serialized) {
        return null;
      }
      
      const entry: StorageEntry<T> = JSON.parse(serialized);
      
      // Check expiration
      if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
        // Async cleanup of expired entry
        this.delete(key).catch(console.warn);
        return null;
      }
      
      return entry;
    } catch (error) {
      throw new StorageError(
        `Failed to get key: ${key}`,
        'STORAGE_GET_ERROR',
        'get',
        key,
        error as Error
      );
    }
  }

  async delete(key: StorageKey): Promise<boolean> {
    await this.connect();
    
    const storageKey = this.getStorageKey(key);
    
    try {
      const existed = localStorage.getItem(storageKey) !== null;
      localStorage.removeItem(storageKey);
      return existed;
    } catch (error) {
      throw new StorageError(
        `Failed to delete key: ${key}`,
        'STORAGE_DELETE_ERROR',
        'delete',
        key,
        error as Error
      );
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    await this.connect();
    
    const storageKey = this.getStorageKey(key);
    return localStorage.getItem(storageKey) !== null;
  }

  async clear(namespace?: string): Promise<void> {
    await this.connect();
    
    try {
      if (namespace) {
        // Clear only specific namespace
        const namespacePrefix = `${this.keyPrefix}${namespace}:`;
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(namespacePrefix)) {
            keysToRemove.push(key);
          }
        }
        
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      } else {
        // Clear all keys with our prefix
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.keyPrefix)) {
            keysToRemove.push(key);
          }
        }
        
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      throw new StorageError(
        `Failed to clear storage${namespace ? ` for namespace: ${namespace}` : ''}`,
        'STORAGE_CLEAR_ERROR',
        'clear',
        undefined,
        error as Error
      );
    }
  }

  async setMany<T extends StorageValue>(entries: Array<{ key: StorageKey; value: T; options?: StorageOptions }>): Promise<void> {
    // Execute individually (no atomic batch support in localStorage)
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.options);
    }
  }

  async getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>> {
    const results: Array<StorageEntry<T> | null> = [];
    
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    
    return results;
  }

  async deleteMany(keys: StorageKey[]): Promise<number> {
    let deletedCount = 0;
    
    for (const key of keys) {
      const deleted = await this.delete(key);
      if (deleted) deletedCount++;
    }
    
    return deletedCount;
  }

  async keys(options: QueryOptions = {}): Promise<StorageKey[]> {
    await this.connect();
    
    const keys: StorageKey[] = [];
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
        continue;
      }
      
      try {
        const originalKey = storageKey.substring(this.keyPrefix.length) as StorageKey;
        const entry = await this.get(originalKey);
        
        if (entry && this.matchesQuery(entry, options, now)) {
          keys.push(originalKey);
        }
      } catch {
        // Skip invalid entries
        continue;
      }
    }
    
    return this.applySortingAndPaging(keys, options);
  }

  async values<T extends StorageValue>(options: QueryOptions = {}): Promise<Array<StorageEntry<T>>> {
    await this.connect();
    
    const values: Array<StorageEntry<T>> = [];
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
        continue;
      }
      
      try {
        const originalKey = storageKey.substring(this.keyPrefix.length) as StorageKey;
        const entry = await this.get<T>(originalKey);
        
        if (entry && this.matchesQuery(entry, options, now)) {
          values.push(entry);
        }
      } catch {
        // Skip invalid entries
        continue;
      }
    }
    
    return this.applySortingAndPaging(values, options);
  }

  async entries<T extends StorageValue>(options: QueryOptions = {}): Promise<Array<StorageEntry<T>>> {
    return this.values<T>(options);
  }

  async count(options: QueryOptions = {}): Promise<number> {
    const keys = await this.keys(options);
    return keys.length;
  }

  async beginTransaction(): Promise<StorageTransaction> {
    await this.connect();
    return new LocalStorageTransactionImpl(this);
  }

  async cleanup(): Promise<number> {
    await this.connect();
    
    const now = Date.now();
    let cleanedCount = 0;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
        continue;
      }
      
      try {
        const serialized = localStorage.getItem(storageKey);
        if (serialized) {
          const entry: StorageEntry<any> = JSON.parse(serialized);
          
          // Check if entry is expired
          if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
            keysToRemove.push(storageKey);
            cleanedCount++;
          }
        }
      } catch {
        // Remove corrupted entries
        keysToRemove.push(storageKey);
        cleanedCount++;
      }
    }
    
    // Remove expired entries
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    
    return cleanedCount;
  }

  async optimize(): Promise<void> {
    // Run cleanup to remove expired entries
    await this.cleanup();
  }

  async getStats(): Promise<StorageStats> {
    await this.connect();
    
    const stats: InternalStorageStats = {
      totalKeys: 0,
      totalSize: 0,
      namespaces: [],
      oldestEntry: Date.now(),
      newestEntry: 0,
      expiredEntries: 0,
      encryptedEntries: 0,
      compressedEntries: 0,
    };
    
    const namespaceSet = new Set<string>();
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey || !storageKey.startsWith(this.keyPrefix)) {
        continue;
      }
      
      try {
        const serialized = localStorage.getItem(storageKey);
        if (serialized) {
          const entry: StorageEntry<any> = JSON.parse(serialized);
          
          stats.totalKeys++;
          stats.totalSize += serialized.length;
          
          // Extract namespace from key
          const originalKey = storageKey.substring(this.keyPrefix.length);
          const namespacePart = originalKey.split(':')[0];
          if (namespacePart) {
            namespaceSet.add(namespacePart);
          }
          
          if (entry.metadata.createdAt < stats.oldestEntry) {
            stats.oldestEntry = entry.metadata.createdAt;
          }
          if (entry.metadata.createdAt > stats.newestEntry) {
            stats.newestEntry = entry.metadata.createdAt;
          }
          
          if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
            stats.expiredEntries++;
          }
          
          if (entry.metadata.encrypted) {
            stats.encryptedEntries++;
          }
          
          if (entry.metadata.compressed) {
            stats.compressedEntries++;
          }
        }
      } catch {
        // Skip invalid entries
        continue;
      }
    }
    
    stats.namespaces = Array.from(namespaceSet);
    return stats;
  }

  private matchesQuery(entry: StorageEntry<any>, options: QueryOptions, now: number): boolean {
    // Check expiration
    if (!options.includeExpired && entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
      return false;
    }
    
    // Extract namespace from key
    const key = entry.metadata.key;
    const namespacePart = key.split(':')[0];
    
    // Check namespace
    if (options.namespace && namespacePart !== options.namespace) {
      return false;
    }
    
    // Check prefix
    if (options.prefix && !key.startsWith(options.prefix)) {
      return false;
    }
    
    return true;
  }

  private applySortingAndPaging<T>(items: T[], options: QueryOptions): T[] {
    let result = [...items];
    
    // Apply sorting (simplified for this implementation)
    if (options.sortBy) {
      result.sort((a: any, b: any) => {
        const sortBy = options.sortBy;
        if (!sortBy) return 0;
        
        const aVal = sortBy === 'key' ? a.key || a : a.metadata?.[sortBy] || 0;
        const bVal = sortBy === 'key' ? b.key || b : b.metadata?.[sortBy] || 0;
        
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }
    
    // Apply paging
    const offset = options.offset || 0;
    const limit = options.limit;
    
    if (limit) {
      result = result.slice(offset, offset + limit);
    } else if (offset) {
      result = result.slice(offset);
    }
    
    return result;
  }

  private getAvailableSpace(): number {
    try {
      // Try to estimate available space
      let testSize = 1024 * 1024; // Start with 1MB
      const testKey = '__space_test__';
      
      while (testSize > 1024) {
        try {
          const testData = 'x'.repeat(testSize);
          localStorage.setItem(testKey, testData);
          localStorage.removeItem(testKey);
          return testSize;
        } catch {
          testSize = Math.floor(testSize / 2);
        }
      }
      
      return testSize;
    } catch {
      return this.capabilities.maxValueSize;
    }
  }
}