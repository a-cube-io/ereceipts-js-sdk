import { CacheOptions, CacheSize, CachedItem, ICacheAdapter } from '../../adapters';
import { compressData, decompressData } from '../../adapters/compression';
import {
  CacheRow,
  ExpoSQLiteDatabase,
  RNSQLiteDatabase,
  SQLiteColumnInfo,
  SQLiteExecuteResult,
  SQLiteParams,
  SQLiteTransaction,
} from './types';

/**
 * React Native cache adapter using SQLite (Expo or react-native-sqlite-storage)
 * Cache never expires - data persists until explicitly invalidated
 */
export class ReactNativeCacheAdapter implements ICacheAdapter {
  private static readonly DB_NAME = 'acube_cache.db';
  private static readonly TABLE_NAME = 'cache_entries';

  private db: ExpoSQLiteDatabase | RNSQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private options: CacheOptions;
  private isExpo = false;
  private debugEnabled = false;
  private hasCompressedColumn = false;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 10000,
      compression: false,
      compressionThreshold: 1024,
      ...options,
    };
    this.debugEnabled = options.debugEnabled || false;
    this.initPromise = this.initialize();
  }

  private debug(message: string, data?: Record<string, unknown> | unknown): void {
    if (this.debugEnabled) {
      if (data) {
        console.log(`[CACHE-RN] ${message}`, data);
      } else {
        console.log(`[CACHE-RN] ${message}`);
      }
    }
  }

  private normalizeResults<T = CacheRow>(results: SQLiteExecuteResult): T[] {
    if (this.isExpo) {
      const expoResults = results as { results?: T[] } | T[];
      if (Array.isArray(expoResults)) {
        return expoResults;
      }
      return expoResults.results || [];
    } else {
      const rnResults = results as { rows?: { length: number; item(i: number): T } };
      const rows = rnResults.rows;
      if (!rows || rows.length === 0) return [];

      const normalizedRows: T[] = [];
      for (let i = 0; i < rows.length; i++) {
        normalizedRows.push(rows.item(i));
      }
      return normalizedRows;
    }
  }

  private async initialize(): Promise<void> {
    if (this.db) return;

    try {
      // Try Expo SQLite first
      const ExpoSQLite = require('expo-sqlite');
      this.db = await ExpoSQLite.openDatabaseAsync(ReactNativeCacheAdapter.DB_NAME);
      this.isExpo = true;
      await this.createTables();
    } catch (expoError) {
      try {
        // Fallback to react-native-sqlite-storage
        const SQLite = require('react-native-sqlite-storage');

        this.db = await new Promise<RNSQLiteDatabase>((resolve, reject) => {
          SQLite.openDatabase(
            {
              name: ReactNativeCacheAdapter.DB_NAME,
              location: 'default',
            },
            resolve,
            reject
          );
        });

        this.isExpo = false;
        await this.createTables();
      } catch (rnError) {
        throw new Error(
          `Failed to initialize SQLite: Expo error: ${expoError}, RN error: ${rnError}`
        );
      }
    }
  }

  private async createTables(): Promise<void> {
    // Create table with simplified schema (no TTL)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${ReactNativeCacheAdapter.TABLE_NAME} (
        cache_key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON ${ReactNativeCacheAdapter.TABLE_NAME}(timestamp);
    `;

    await this.executeSql(createTableSQL);

    // Then, run migrations to add new columns if they don't exist
    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    this.debug('Running database migrations...');

    try {
      // Check if compressed column exists
      this.hasCompressedColumn = await this.checkColumnExists('compressed');

      if (!this.hasCompressedColumn) {
        this.debug('Adding compressed column to cache table');
        const addColumnSQL = `ALTER TABLE ${ReactNativeCacheAdapter.TABLE_NAME} ADD COLUMN compressed INTEGER DEFAULT 0`;
        await this.executeSql(addColumnSQL);
        this.hasCompressedColumn = true;
        this.debug('Successfully added compressed column');
      } else {
        this.debug('Compressed column already exists');
      }

      this.debug('Database migrations completed', {
        hasCompressedColumn: this.hasCompressedColumn,
      });
    } catch (error) {
      this.debug('Migration failed, disabling compression features', error);
      this.hasCompressedColumn = false;
      // Don't throw - allow the app to continue even if migration fails
      // The compressed feature will just be disabled
    }
  }

  private async checkColumnExists(columnName: string): Promise<boolean> {
    try {
      const pragmaSQL = `PRAGMA table_info(${ReactNativeCacheAdapter.TABLE_NAME})`;
      const results = await this.executeSql(pragmaSQL);
      const columns = this.normalizeResults<SQLiteColumnInfo>(results);

      this.debug('Table columns found', { columns: columns.map((c) => c.name) });

      return columns.some((column) => column.name === columnName);
    } catch (error) {
      this.debug('Error checking column existence', error);
      return false;
    }
  }

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    await this.ensureInitialized();

    const sql = `SELECT * FROM ${ReactNativeCacheAdapter.TABLE_NAME} WHERE cache_key = ?`;
    this.debug('Executing get query', { sql, key });
    const results = await this.executeSql(sql, [key]);
    this.debug('Get query results', { key, hasResults: !!results });

    // Normalize results from different SQLite implementations
    const rows = this.normalizeResults(results);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    if (!row) {
      return null;
    }

    const isCompressed = this.hasCompressedColumn ? !!row.compressed : false;
    const rawData = isCompressed ? decompressData(row.data, true).data : row.data;

    return {
      data: JSON.parse(rawData),
      timestamp: row.timestamp,
      compressed: isCompressed,
    };
  }

  async set<T>(key: string, data: T): Promise<void> {
    const item: CachedItem<T> = {
      data,
      timestamp: Date.now(),
    };

    this.debug('Setting cache item', { key });

    return this.setItem(key, item);
  }

  async setItem<T>(key: string, item: CachedItem<T>): Promise<void> {
    await this.ensureInitialized();

    // Handle compression if enabled and compressed column is available
    const serializedData = JSON.stringify(item.data);
    let finalData = serializedData;
    let isCompressed = false;

    if (this.options.compression && this.options.compressionThreshold && this.hasCompressedColumn) {
      const compressionResult = compressData(serializedData, this.options.compressionThreshold);
      finalData = compressionResult.data;
      isCompressed = compressionResult.compressed;

      this.debug('Compression result', {
        key,
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        compressed: isCompressed,
        savings: compressionResult.originalSize - compressionResult.compressedSize,
      });
    }

    this.debug('Setting item with metadata', {
      key,
      timestamp: item.timestamp,
      compressed: isCompressed,
      hasCompressedColumn: this.hasCompressedColumn,
    });

    // Build SQL and parameters based on available columns
    let sql: string;
    let params: SQLiteParams;

    if (this.hasCompressedColumn) {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, compressed)
        VALUES (?, ?, ?, ?)
      `;
      params = [key, finalData, item.timestamp, isCompressed ? 1 : 0];
    } else {
      // Fallback for databases without compressed column
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp)
        VALUES (?, ?, ?)
      `;
      params = [key, finalData, item.timestamp];
    }

    this.debug('Executing setItem SQL', { key, paramsCount: params.length });

    await this.executeSql(sql, params);
  }

  async setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void> {
    if (items.length === 0) return;

    await this.ensureInitialized();

    this.debug('Batch setting items', { count: items.length });

    if (this.isExpo) {
      await (this.db as ExpoSQLiteDatabase).withTransactionAsync(async () => {
        for (const [key, item] of items) {
          await this.setBatchItem(key, item);
        }
      });
    } else {
      return new Promise<void>((resolve, reject) => {
        (this.db as RNSQLiteDatabase).transaction(
          (tx: SQLiteTransaction) => {
            const promises = items.map(([key, item]) => this.setBatchItemRN(tx, key, item));
            Promise.all(promises)
              .then(() => resolve())
              .catch(reject);
          },
          reject,
          () => resolve()
        );
      });
    }

    this.debug('Batch operation completed', { count: items.length });
  }

  private async setBatchItem<T>(key: string, item: CachedItem<T>): Promise<void> {
    // Handle compression if enabled and compressed column is available
    const serializedData = JSON.stringify(item.data);
    let finalData = serializedData;
    let isCompressed = false;

    if (this.options.compression && this.options.compressionThreshold && this.hasCompressedColumn) {
      const compressionResult = compressData(serializedData, this.options.compressionThreshold);
      finalData = compressionResult.data;
      isCompressed = compressionResult.compressed;
    }

    // Build SQL and parameters based on available columns
    let sql: string;
    let params: SQLiteParams;

    if (this.hasCompressedColumn) {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, compressed)
        VALUES (?, ?, ?, ?)
      `;
      params = [key, finalData, item.timestamp, isCompressed ? 1 : 0];
    } else {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp)
        VALUES (?, ?, ?)
      `;
      params = [key, finalData, item.timestamp];
    }

    await (this.db as ExpoSQLiteDatabase).runAsync(sql, params);
  }

  private async setBatchItemRN<T>(
    tx: SQLiteTransaction,
    key: string,
    item: CachedItem<T>
  ): Promise<void> {
    // Handle compression if enabled and compressed column is available
    const serializedData = JSON.stringify(item.data);
    let finalData = serializedData;
    let isCompressed = false;

    if (this.options.compression && this.options.compressionThreshold && this.hasCompressedColumn) {
      const compressionResult = compressData(serializedData, this.options.compressionThreshold);
      finalData = compressionResult.data;
      isCompressed = compressionResult.compressed;
    }

    // Build SQL and parameters based on available columns
    let sql: string;
    let params: SQLiteParams;

    if (this.hasCompressedColumn) {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, compressed)
        VALUES (?, ?, ?, ?)
      `;
      params = [key, finalData, item.timestamp, isCompressed ? 1 : 0];
    } else {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp)
        VALUES (?, ?, ?)
      `;
      params = [key, finalData, item.timestamp];
    }

    return new Promise<void>((resolve, reject) => {
      tx.executeSql(
        sql,
        params,
        () => resolve(),
        (_: SQLiteTransaction, error: Error) => {
          reject(error);
          return false;
        }
      );
    });
  }

  async invalidate(pattern: string): Promise<void> {
    await this.ensureInitialized();

    const keys = await this.getKeys(pattern);
    if (keys.length === 0) return;

    const placeholders = keys.map(() => '?').join(',');
    const sql = `DELETE FROM ${ReactNativeCacheAdapter.TABLE_NAME} WHERE cache_key IN (${placeholders})`;

    await this.executeSql(sql, keys);
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    const sql = `DELETE FROM ${ReactNativeCacheAdapter.TABLE_NAME}`;
    await this.executeSql(sql);
  }

  async getSize(): Promise<CacheSize> {
    await this.ensureInitialized();

    const sql = `
      SELECT
        COUNT(*) as entries,
        SUM(LENGTH(data)) as bytes
      FROM ${ReactNativeCacheAdapter.TABLE_NAME}
    `;

    const results = await this.executeSql(sql);
    const rows = this.normalizeResults<{ entries: number; bytes: number }>(results);
    const row = rows[0] || { entries: 0, bytes: 0 };

    return {
      entries: row.entries || 0,
      bytes: (row.bytes || 0) * 2,
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    // No cleanup needed - cache never expires
    return 0;
  }

  async getKeys(pattern?: string): Promise<string[]> {
    await this.ensureInitialized();

    let sql = `SELECT cache_key FROM ${ReactNativeCacheAdapter.TABLE_NAME}`;
    const params: SQLiteParams = [];

    if (pattern) {
      // Simple pattern matching with LIKE
      const likePattern = pattern.replace(/\*/g, '%').replace(/\?/g, '_');
      sql += ' WHERE cache_key LIKE ?';
      params.push(likePattern);
    }

    const results = await this.executeSql(sql, params);
    const keys: string[] = [];

    const rows = this.normalizeResults(results);
    for (const row of rows) {
      keys.push(row.cache_key);
    }

    return keys;
  }

  private async executeSql(sql: string, params: SQLiteParams = []): Promise<SQLiteExecuteResult> {
    if (this.isExpo) {
      const expoDB = this.db as ExpoSQLiteDatabase;
      if (sql.toLowerCase().includes('select') || sql.toLowerCase().includes('pragma')) {
        const result = await expoDB.getAllAsync(sql, params);
        return Array.isArray(result) ? { results: result } : result;
      } else {
        return await expoDB.runAsync(sql, params);
      }
    } else {
      // react-native-sqlite-storage
      return new Promise((resolve, reject) => {
        (this.db as RNSQLiteDatabase).transaction((tx: SQLiteTransaction) => {
          tx.executeSql(
            sql,
            params,
            (_: SQLiteTransaction, results: SQLiteExecuteResult) => resolve(results),
            (_: SQLiteTransaction, error: Error) => {
              reject(error);
              return false;
            }
          );
        });
      });
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }
}

/**
 * Memory-based fallback cache adapter for environments without SQLite
 * Cache never expires - data persists until explicitly invalidated
 */
export class MemoryCacheAdapter implements ICacheAdapter {
  private cache = new Map<string, CachedItem<unknown>>();
  private options: CacheOptions;
  private debugEnabled = false;
  private totalBytes = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntries: 1000,
      ...options,
    };
    this.debugEnabled = options.debugEnabled || false;
  }

  private debug(message: string, data?: Record<string, unknown> | unknown): void {
    if (this.debugEnabled) {
      if (data) {
        console.log(`[CACHE-MEMORY] ${message}`, data);
      } else {
        console.log(`[CACHE-MEMORY] ${message}`);
      }
    }
  }

  private calculateItemSize(key: string, item: CachedItem<unknown>): number {
    // Calculate rough size estimation for memory usage
    const keySize = key.length * 2; // UTF-16 estimation
    const itemSize = JSON.stringify(item).length * 2; // UTF-16 estimation
    return keySize + itemSize;
  }

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    this.debug('Getting cache item', { key });
    const item = this.cache.get(key);
    if (!item) {
      this.debug('Cache miss', { key });
      return null;
    }

    // Handle decompression if needed
    const isCompressed = !!item.compressed;
    let finalData = item.data;

    if (isCompressed) {
      const decompressed = decompressData(item.data as string, true);
      finalData = JSON.parse(decompressed.data);
    }

    this.debug('Cache hit', { key, compressed: isCompressed });

    return {
      ...item,
      data: finalData as T,
      compressed: isCompressed,
    };
  }

  async set<T>(key: string, data: T): Promise<void> {
    this.debug('Setting cache item', { key });

    // Handle compression if enabled
    let finalData: T | string = data;
    let isCompressed = false;

    if (this.options.compression && this.options.compressionThreshold) {
      const serializedData = JSON.stringify(data);
      const compressionResult = compressData(serializedData, this.options.compressionThreshold);

      if (compressionResult.compressed) {
        finalData = compressionResult.data;
        isCompressed = true;

        this.debug('Compression result', {
          key,
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          savings: compressionResult.originalSize - compressionResult.compressedSize,
        });
      }
    }

    const item: CachedItem<T | string> = {
      data: finalData,
      timestamp: Date.now(),
      compressed: isCompressed,
    };

    return this.setItem(key, item);
  }

  async setItem<T>(key: string, item: CachedItem<T>): Promise<void> {
    // Calculate size of new item
    const newItemSize = this.calculateItemSize(key, item);

    // If item already exists, subtract old size
    if (this.cache.has(key)) {
      const oldItem = this.cache.get(key)!;
      const oldItemSize = this.calculateItemSize(key, oldItem);
      this.totalBytes -= oldItemSize;
    }

    // Enforce max entries limit
    if (this.cache.size >= (this.options.maxEntries || 1000) && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const oldestItem = this.cache.get(oldestKey)!;
        const oldestItemSize = this.calculateItemSize(oldestKey, oldestItem);
        this.totalBytes -= oldestItemSize;
        this.cache.delete(oldestKey);
        this.debug('Removed oldest item for capacity', { oldestKey, freedBytes: oldestItemSize });
      }
    }

    // Set new item and update total size
    this.cache.set(key, item);
    this.totalBytes += newItemSize;

    this.debug('Updated cache size', {
      entries: this.cache.size,
      totalBytes: this.totalBytes,
      newItemSize,
    });
  }

  async setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void> {
    if (items.length === 0) return;

    this.debug('Batch setting items', { count: items.length });

    let totalNewBytes = 0;
    let totalOldBytes = 0;
    const itemsToRemove: string[] = [];

    // First pass: calculate size changes and identify capacity issues
    for (const [key, item] of items) {
      const newItemSize = this.calculateItemSize(key, item);
      totalNewBytes += newItemSize;

      // If item already exists, track old size for removal
      if (this.cache.has(key)) {
        const oldItem = this.cache.get(key)!;
        const oldItemSize = this.calculateItemSize(key, oldItem);
        totalOldBytes += oldItemSize;
      }
    }

    // Handle capacity limits - remove oldest items if needed
    const projectedEntries = this.cache.size + items.filter(([key]) => !this.cache.has(key)).length;
    const maxEntries = this.options.maxEntries || 1000;

    if (projectedEntries > maxEntries) {
      const entriesToRemove = projectedEntries - maxEntries;
      const oldestKeys = Array.from(this.cache.keys()).slice(0, entriesToRemove);

      for (const oldKey of oldestKeys) {
        const oldItem = this.cache.get(oldKey)!;
        const oldItemSize = this.calculateItemSize(oldKey, oldItem);
        this.totalBytes -= oldItemSize;
        this.cache.delete(oldKey);
        itemsToRemove.push(oldKey);
      }

      if (itemsToRemove.length > 0) {
        this.debug('Removed items for batch capacity', {
          removedCount: itemsToRemove.length,
          removedKeys: itemsToRemove,
        });
      }
    }

    // Update total bytes accounting
    this.totalBytes = this.totalBytes - totalOldBytes + totalNewBytes;

    // Second pass: set all items
    for (const [key, item] of items) {
      this.cache.set(key, item);
    }

    this.debug('Batch operation completed', {
      count: items.length,
      totalBytes: this.totalBytes,
      entries: this.cache.size,
      bytesAdded: totalNewBytes - totalOldBytes,
    });
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = this.patternToRegex(pattern);
    let removed = 0;
    let bytesFreed = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const item = this.cache.get(key)!;
        const itemSize = this.calculateItemSize(key, item);
        this.cache.delete(key);
        this.totalBytes -= itemSize;
        bytesFreed += itemSize;
        removed++;
      }
    }

    if (removed > 0) {
      this.debug('Invalidation completed', {
        pattern,
        entriesRemoved: removed,
        bytesFreed,
        remainingEntries: this.cache.size,
        remainingBytes: this.totalBytes,
      });
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.totalBytes = 0;
    this.debug('Cache cleared', { entries: 0, bytes: 0 });
  }

  async getSize(): Promise<CacheSize> {
    return {
      entries: this.cache.size,
      bytes: this.totalBytes,
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    // No cleanup needed - cache never expires
    return 0;
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    if (!pattern) return keys;

    const regex = this.patternToRegex(pattern);
    return keys.filter((key) => regex.test(key));
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    return new RegExp(`^${regexPattern}$`);
  }
}
