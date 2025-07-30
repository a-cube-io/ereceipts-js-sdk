/**
 * IndexedDB Storage Adapter for A-Cube SDK
 * Provides robust, high-performance storage with schema management and migrations
 */

import {
  StorageError,
  StorageConnectionError,
  // StorageCapacityError,
  StorageTransactionError,
  DEFAULT_STORAGE_OPTIONS,
} from '../unified-storage';

import type {
  StorageKey,
  QueryOptions,
  StorageEntry,
  StorageStats,
  StorageValue,
  StorageAdapter,
  StorageOptions,
  StorageTransaction,
  InternalStorageStats } from '../unified-storage';

// IndexedDB specific types
interface IndexedDBSchema {
  readonly version: number;
  readonly stores: {
    readonly [storeName: string]: {
      readonly keyPath?: string;
      readonly autoIncrement?: boolean;
      readonly indexes?: {
        readonly [indexName: string]: {
          readonly keyPath: string | string[];
          readonly unique?: boolean;
          readonly multiEntry?: boolean;
        };
      };
    };
  };
}

interface IndexedDBMigration {
  readonly version: number;
  readonly up: (db: IDBDatabase, transaction: IDBTransaction) => void | Promise<void>;
  readonly down?: (db: IDBDatabase, transaction: IDBTransaction) => void | Promise<void>;
}

interface IndexedDBConfig {
  readonly databaseName: string;
  readonly version: number;
  readonly schema: IndexedDBSchema;
  readonly migrations: IndexedDBMigration[];
  readonly timeout?: number;
  readonly maxRetries?: number;
}

// Transaction implementation
class IndexedDBTransaction implements StorageTransaction {
  public readonly id: string;

  public isActive: boolean = true;

  private operations: Array<() => Promise<void>> = [];

  private rollbackOperations: Array<() => Promise<void>> = [];

  constructor(
    private adapter: IndexedDBAdapter,
    private idbTransaction: IDBTransaction,
  ) {
    this.id = `txn_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Handle transaction abort
    this.idbTransaction.addEventListener('abort', () => {
      this.isActive = false;
    });

    this.idbTransaction.addEventListener('complete', () => {
      this.isActive = false;
    });

    this.idbTransaction.addEventListener('error', () => {
      this.isActive = false;
    });
  }

  async set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'set', new Error('Transaction not active'));
    }

    const operation = async () => {
      await this.adapter.setWithTransaction(key, value, options, this.idbTransaction);
    };

    const rollback = async () => {
      await this.adapter.deleteWithTransaction(key, this.idbTransaction);
    };

    this.operations.push(operation);
    this.rollbackOperations.unshift(rollback);
  }

  async get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'get', new Error('Transaction not active'));
    }

    return this.adapter.getWithTransaction<T>(key, this.idbTransaction);
  }

  async delete(key: StorageKey): Promise<boolean> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'delete', new Error('Transaction not active'));
    }

    const originalValue = await this.get(key);

    const operation = async () => {
      await this.adapter.deleteWithTransaction(key, this.idbTransaction);
    };

    const rollback = async () => {
      if (originalValue) {
        await this.adapter.setWithTransaction(key, originalValue.data, undefined, this.idbTransaction);
      }
    };

    this.operations.push(operation);
    this.rollbackOperations.unshift(rollback);

    return true;
  }

  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new StorageTransactionError(this.id, 'commit', new Error('Transaction not active'));
    }

    try {
      // Execute all operations
      for (const operation of this.operations) {
        await operation();
      }

      // Transaction will auto-commit when it goes out of scope
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
      // Execute rollback operations in reverse order
      for (const rollback of this.rollbackOperations) {
        await rollback();
      }
    } catch (error) {
      console.warn(`Failed to rollback transaction ${this.id}:`, error);
    } finally {
      this.idbTransaction.abort();
      this.isActive = false;
    }
  }
}

/**
 * IndexedDB Storage Adapter
 * High-performance storage with advanced features
 */
export class IndexedDBAdapter implements StorageAdapter {
  public readonly name = 'IndexedDB';

  private db: IDBDatabase | null = null;

  private config: IndexedDBConfig;

  private connectionPromise: Promise<IDBDatabase> | null = null;

  public readonly capabilities = {
    supportsTransactions: true,
    supportsIndexing: true,
    maxKeyLength: 1024,
    maxValueSize: 256 * 1024 * 1024, // 256MB
    supportsCompression: true,
    supportsEncryption: true,
    supportsTTL: true,
  } as const;

  constructor(config: Partial<IndexedDBConfig> = {}) {
    this.config = {
      databaseName: config.databaseName || 'acube-sdk-storage',
      version: config.version || 1,
      schema: config.schema || this.getDefaultSchema(),
      migrations: config.migrations || [],
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    };
  }

  get isAvailable(): boolean {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  }

  isConnected(): boolean {
    return this.db !== null && this.db.objectStoreNames.length > 0;
  }

  async connect(): Promise<void> {
    if (this.db) {
      return; // Already connected
    }

    if (this.connectionPromise) {
      await this.connectionPromise;
      return;
    }

    this.connectionPromise = this.establishConnection();

    try {
      this.db = await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async establishConnection(): Promise<IDBDatabase> {
    if (!this.isAvailable) {
      throw new StorageConnectionError('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new StorageConnectionError('IndexedDB connection timeout'));
      }, this.config.timeout);

      const request = indexedDB.open(this.config.databaseName, this.config.version);

      request.onerror = () => {
        clearTimeout(timeout);
        reject(new StorageConnectionError('IndexedDB', request.error || undefined));
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        this.handleUpgrade(db, event.oldVersion, event.newVersion || this.config.version);
      };

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked. Close other tabs using this database.');
      };
    });
  }

  private handleUpgrade(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    // Create stores according to schema
    for (const [storeName, storeConfig] of Object.entries(this.config.schema.stores)) {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          ...(storeConfig.keyPath && { keyPath: storeConfig.keyPath }),
          ...(storeConfig.autoIncrement && { autoIncrement: storeConfig.autoIncrement }),
        });

        // Create indexes
        if (storeConfig.indexes) {
          for (const [indexName, indexConfig] of Object.entries(storeConfig.indexes)) {
            store.createIndex(indexName, indexConfig.keyPath, {
              ...(indexConfig.unique !== undefined && { unique: indexConfig.unique }),
              ...(indexConfig.multiEntry !== undefined && { multiEntry: indexConfig.multiEntry }),
            });
          }
        }
      }
    }

    // Run migrations
    const relevantMigrations = this.config.migrations.filter(
      migration => migration.version > oldVersion && migration.version <= newVersion,
    );

    for (const migration of relevantMigrations.sort((a, b) => a.version - b.version)) {
      try {
        migration.up(db, db.transaction(Array.from(db.objectStoreNames), 'readwrite'));
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
  }

  private getDefaultSchema(): IndexedDBSchema {
    return {
      version: 1,
      stores: {
        storage: {
          keyPath: 'key',
          indexes: {
            namespace: { keyPath: 'namespace' },
            createdAt: { keyPath: 'createdAt' },
            expiresAt: { keyPath: 'expiresAt' },
          },
        },
      },
    };
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void> {
    await this.connect();

    const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
    const entry = this.createStorageEntry(key, value, mergedOptions);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');

      const request = store.put({
        key,
        ...entry,
        namespace: mergedOptions.namespace,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(
        `Failed to set key: ${key}`,
        'STORAGE_SET_ERROR',
        'set',
        key,
        request.error || undefined,
      ));
    });
  }

  async setWithTransaction<T extends StorageValue>(
    key: StorageKey,
    value: T,
    options: StorageOptions = {},
    transaction: IDBTransaction,
  ): Promise<void> {
    const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
    const entry = this.createStorageEntry(key, value, mergedOptions);

    return new Promise((resolve, reject) => {
      const store = transaction.objectStore('storage');
      const request = store.put({
        key,
        ...entry,
        namespace: mergedOptions.namespace,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new StorageError(
        `Failed to set key in transaction: ${key}`,
        'STORAGE_TRANSACTION_SET_ERROR',
        'set',
        key,
        request.error || undefined,
      ));
    });
  }

  async get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');

      const request = store.get(key);

      request.onsuccess = () => {
        const {result} = request;
        if (!result) {
          resolve(null);
          return;
        }

        // Check expiration
        if (result.metadata.expiresAt && result.metadata.expiresAt < Date.now()) {
          // Async cleanup of expired entry
          this.delete(key).catch(console.warn);
          resolve(null);
          return;
        }

        resolve(result as StorageEntry<T>);
      };

      request.onerror = () => reject(new StorageError(
        `Failed to get key: ${key}`,
        'STORAGE_GET_ERROR',
        'get',
        key,
        request.error || undefined,
      ));
    });
  }

  async getWithTransaction<T extends StorageValue>(
    key: StorageKey,
    transaction: IDBTransaction,
  ): Promise<StorageEntry<T> | null> {
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore('storage');
      const request = store.get(key);

      request.onsuccess = () => {
        const {result} = request;
        if (!result) {
          resolve(null);
          return;
        }

        // Check expiration
        if (result.metadata.expiresAt && result.metadata.expiresAt < Date.now()) {
          resolve(null);
          return;
        }

        resolve(result as StorageEntry<T>);
      };

      request.onerror = () => reject(new StorageError(
        `Failed to get key in transaction: ${key}`,
        'STORAGE_TRANSACTION_GET_ERROR',
        'get',
        key,
        request.error || undefined,
      ));
    });
  }

  async delete(key: StorageKey): Promise<boolean> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');

      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new StorageError(
        `Failed to delete key: ${key}`,
        'STORAGE_DELETE_ERROR',
        'delete',
        key,
        request.error || undefined,
      ));
    });
  }

  async deleteWithTransaction(key: StorageKey, transaction: IDBTransaction): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore('storage');
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new StorageError(
        `Failed to delete key in transaction: ${key}`,
        'STORAGE_TRANSACTION_DELETE_ERROR',
        'delete',
        key,
        request.error || undefined,
      ));
    });
  }

  async exists(key: StorageKey): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  async clear(namespace?: string): Promise<void> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');

      if (namespace) {
        // Clear only specific namespace using index
        const index = store.index('namespace');
        const request = index.openCursor(IDBKeyRange.only(namespace));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(new StorageError(
          `Failed to clear namespace: ${namespace}`,
          'STORAGE_CLEAR_ERROR',
          'clear',
          undefined,
          request.error || undefined,
        ));
      } else {
        // Clear entire store
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new StorageError(
          'Failed to clear storage',
          'STORAGE_CLEAR_ERROR',
          'clear',
          undefined,
          request.error || undefined,
        ));
      }
    });
  }

  async setMany<T extends StorageValue>(entries: Array<{ key: StorageKey; value: T; options?: StorageOptions }>): Promise<void> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      let completed = 0;

      for (const entry of entries) {
        const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...entry.options };
        const storageEntry = this.createStorageEntry(entry.key, entry.value, mergedOptions);

        const request = store.put({
          key: entry.key,
          ...storageEntry,
          namespace: mergedOptions.namespace,
        });

        request.onsuccess = () => {
          completed++;
          if (completed === entries.length) {
            resolve();
          }
        };

        request.onerror = () => reject(new StorageError(
          `Failed to set key in batch: ${entry.key}`,
          'STORAGE_BATCH_SET_ERROR',
          'setMany',
          entry.key,
          request.error || undefined,
        ));
      }
    });
  }

  async getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>> {
    await this.connect();

    const results: Array<StorageEntry<T> | null> = [];

    for (const key of keys) {
      results.push(await this.get<T>(key));
    }

    return results;
  }

  async deleteMany(keys: StorageKey[]): Promise<number> {
    await this.connect();

    let deletedCount = 0;

    for (const key of keys) {
      const deleted = await this.delete(key);
      if (deleted) {deletedCount++;}
    }

    return deletedCount;
  }

  async keys(options: QueryOptions = {}): Promise<StorageKey[]> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const keys: StorageKey[] = [];

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value;

          // Apply filters
          if (this.matchesQuery(entry, options)) {
            keys.push(entry.key as StorageKey);
          }

          cursor.continue();
        } else {
          resolve(this.applySortingAndPaging(keys, options));
        }
      };

      request.onerror = () => reject(new StorageError(
        'Failed to get keys',
        'STORAGE_KEYS_ERROR',
        'keys',
        undefined,
        request.error || undefined,
      ));
    });
  }

  async values<T extends StorageValue>(options: QueryOptions = {}): Promise<Array<StorageEntry<T>>> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const values: Array<StorageEntry<T>> = [];

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value;

          // Apply filters
          if (this.matchesQuery(entry, options)) {
            values.push(entry as StorageEntry<T>);
          }

          cursor.continue();
        } else {
          resolve(this.applySortingAndPaging(values, options));
        }
      };

      request.onerror = () => reject(new StorageError(
        'Failed to get values',
        'STORAGE_VALUES_ERROR',
        'values',
        undefined,
        request.error || undefined,
      ));
    });
  }

  async entries<T extends StorageValue>(options: QueryOptions = {}): Promise<Array<StorageEntry<T>>> {
    return this.values<T>(options);
  }

  async count(options: QueryOptions = {}): Promise<number> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      let count = 0;

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value;

          if (this.matchesQuery(entry, options)) {
            count++;
          }

          cursor.continue();
        } else {
          resolve(count);
        }
      };

      request.onerror = () => reject(new StorageError(
        'Failed to count entries',
        'STORAGE_COUNT_ERROR',
        'count',
        undefined,
        request.error || undefined,
      ));
    });
  }

  async beginTransaction(): Promise<StorageTransaction> {
    await this.connect();

    const idbTransaction = this.db!.transaction(['storage'], 'readwrite');
    return new IndexedDBTransaction(this, idbTransaction);
  }

  async cleanup(): Promise<number> {
    await this.connect();

    const now = Date.now();
    let cleanedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value;

          // Check if entry is expired
          if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
            cursor.delete();
            cleanedCount++;
          }

          cursor.continue();
        } else {
          resolve(cleanedCount);
        }
      };

      request.onerror = () => reject(new StorageError(
        'Failed to cleanup expired entries',
        'STORAGE_CLEANUP_ERROR',
        'cleanup',
        undefined,
        request.error || undefined,
      ));
    });
  }

  async optimize(): Promise<void> {
    // IndexedDB doesn't require manual optimization
    // But we can run cleanup to remove expired entries
    await this.cleanup();
  }

  async getStats(): Promise<StorageStats> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.openCursor();

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

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value;

          stats.totalKeys++;
          stats.totalSize += this.estimateEntrySize(entry);

          namespaceSet.add(entry.namespace);

          if (entry.metadata.createdAt < stats.oldestEntry) {
            stats.oldestEntry = entry.metadata.createdAt;
          }
          if (entry.metadata.createdAt > stats.newestEntry) {
            stats.newestEntry = entry.metadata.createdAt;
          }

          if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
            stats.expiredEntries++;
          }

          if (entry.metadata.encrypted) {
            stats.encryptedEntries++;
          }

          if (entry.metadata.compressed) {
            stats.compressedEntries++;
          }

          cursor.continue();
        } else {
          stats.namespaces = Array.from(namespaceSet);
          resolve(stats);
        }
      };

      request.onerror = () => reject(new StorageError(
        'Failed to get storage stats',
        'STORAGE_STATS_ERROR',
        'getStats',
        undefined,
        request.error || undefined,
      ));
    });
  }

  private createStorageEntry<T extends StorageValue>(
    key: StorageKey,
    value: T,
    options: Required<StorageOptions>,
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

  private matchesQuery(entry: any, options: QueryOptions): boolean {
    const now = Date.now();

    // Check expiration
    if (!options.includeExpired && entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
      return false;
    }

    // Check namespace
    if (options.namespace && entry.namespace !== options.namespace) {
      return false;
    }

    // Check prefix
    if (options.prefix && !entry.key.startsWith(options.prefix)) {
      return false;
    }

    return true;
  }

  private applySortingAndPaging<T>(items: T[], options: QueryOptions): T[] {
    let result = [...items];

    // Apply sorting (simplified for this implementation)
    if (options.sortBy) {
      result.sort((a: any, b: any) => {
        const {sortBy} = options;
        if (!sortBy) {return 0;}

        const aVal = sortBy === 'key' ? a.key || a : a.metadata?.[sortBy] || 0;
        const bVal = sortBy === 'key' ? b.key || b : b.metadata?.[sortBy] || 0;

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply paging
    const offset = options.offset || 0;
    const {limit} = options;

    if (limit) {
      result = result.slice(offset, offset + limit);
    } else if (offset) {
      result = result.slice(offset);
    }

    return result;
  }

  private estimateEntrySize(entry: any): number {
    // Rough estimation of entry size in bytes
    const jsonString = JSON.stringify(entry);
    return new Blob([jsonString]).size;
  }
}
