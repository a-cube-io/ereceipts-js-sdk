import { ICacheAdapter, CachedItem, CacheSize, CacheOptions } from '../../adapters';
import { compressData, decompressData } from '../../adapters/compression';

/**
 * React Native cache adapter using SQLite (Expo or react-native-sqlite-storage)
 */
export class ReactNativeCacheAdapter implements ICacheAdapter {
  private static readonly DB_NAME = 'acube_cache.db';
  private static readonly TABLE_NAME = 'cache_entries';
  
  private db: any = null;
  private initPromise: Promise<void> | null = null;
  private options: CacheOptions;
  private isExpo = false;
  private debugEnabled = false;
  private hasCompressedColumn = false;

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
        console.log(`[CACHE-RN] ${message}`, data);
      } else {
        console.log(`[CACHE-RN] ${message}`);
      }
    }
  }

  private normalizeResults(results: any): any[] {
    // Handle different SQLite result formats
    if (this.isExpo) {
      // Expo SQLite: results.results or direct array
      return results.results || results || [];
    } else {
      // React Native SQLite: results.rows with .item() method
      const rows = results.rows;
      if (!rows || rows.length === 0) return [];

      const normalizedRows = [];
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

        this.db = await new Promise<any>((resolve, reject) => {
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
        throw new Error(`Failed to initialize SQLite: Expo error: ${expoError}, RN error: ${rnError}`);
      }
    }
  }

  private async createTables(): Promise<void> {
    // First, create table with basic schema (backwards compatible)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${ReactNativeCacheAdapter.TABLE_NAME} (
        cache_key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER,
        etag TEXT
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

      this.debug('Database migrations completed', { hasCompressedColumn: this.hasCompressedColumn });
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
      const columns = this.normalizeResults(results);

      this.debug('Table columns found', { columns: columns.map(c => c.name) });

      return columns.some(column => column.name === columnName);
    } catch (error) {
      this.debug('Error checking column existence', error);
      return false; // Assume column doesn't exist if we can't check
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
    
    // Check if expired
    if (this.isExpired(row)) {
      // Remove expired item asynchronously
      this.delete(key).catch(console.error);
      return null;
    }

    // Handle decompression if needed (fallback if column doesn't exist)
    const isCompressed = this.hasCompressedColumn ? !!row.compressed : false;
    const rawData = isCompressed ? decompressData(row.data, true).data : row.data;

    return {
      data: JSON.parse(rawData),
      timestamp: row.timestamp,
      ttl: row.ttl,
      etag: row.etag,
      compressed: isCompressed,
    };
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const item: CachedItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTtl,
    };

    this.debug('Setting cache item', { key, ttl: item.ttl });
    
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
        savings: compressionResult.originalSize - compressionResult.compressedSize
      });
    }

    this.debug('Setting item with metadata', {
      key,
      timestamp: item.timestamp,
      hasTtl: !!item.ttl,
      compressed: isCompressed,
      hasCompressedColumn: this.hasCompressedColumn
    });

    // Build SQL and parameters based on available columns
    let sql: string;
    let params: any[];

    if (this.hasCompressedColumn) {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, ttl, etag, compressed)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [
        key,
        finalData,
        item.timestamp,
        item.ttl || this.options.defaultTtl,
        item.etag || null,
        isCompressed ? 1 : 0,
      ];
    } else {
      // Fallback for databases without compressed column
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, ttl, etag)
        VALUES (?, ?, ?, ?, ?)
      `;
      params = [
        key,
        finalData,
        item.timestamp,
        item.ttl || this.options.defaultTtl,
        item.etag || null,
      ];
    }

    this.debug('Executing setItem SQL', { key, paramsCount: params.length });

    await this.executeSql(sql, params);
  }

  async setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void> {
    if (items.length === 0) return;

    await this.ensureInitialized();

    this.debug('Batch setting items', { count: items.length });

    if (this.isExpo) {
      // Expo SQLite - use withTransactionAsync for batching
      await this.db.withTransactionAsync(async () => {
        for (const [key, item] of items) {
          await this.setBatchItem(key, item);
        }
      });
    } else {
      // React Native SQLite - use transaction
      return new Promise((resolve, reject) => {
        this.db.transaction(
          async (tx: any) => {
            try {
              for (const [key, item] of items) {
                await this.setBatchItemRN(tx, key, item);
              }
            } catch (error) {
              reject(error);
            }
          },
          reject,
          resolve
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
    let params: any[];

    if (this.hasCompressedColumn) {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, ttl, etag, compressed)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [
        key,
        finalData,
        item.timestamp,
        item.ttl || this.options.defaultTtl,
        item.etag || null,
        isCompressed ? 1 : 0,
      ];
    } else {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, ttl, etag)
        VALUES (?, ?, ?, ?, ?)
      `;
      params = [
        key,
        finalData,
        item.timestamp,
        item.ttl || this.options.defaultTtl,
        item.etag || null,
      ];
    }

    await this.db.runAsync(sql, params);
  }

  private async setBatchItemRN(tx: any, key: string, item: CachedItem<any>): Promise<void> {
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
    let params: any[];

    if (this.hasCompressedColumn) {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, ttl, etag, compressed)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      params = [
        key,
        finalData,
        item.timestamp,
        item.ttl || this.options.defaultTtl,
        item.etag || null,
        isCompressed ? 1 : 0,
      ];
    } else {
      sql = `
        INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME}
        (cache_key, data, timestamp, ttl, etag)
        VALUES (?, ?, ?, ?, ?)
      `;
      params = [
        key,
        finalData,
        item.timestamp,
        item.ttl || this.options.defaultTtl,
        item.etag || null,
      ];
    }

    return new Promise<void>((resolve, reject) => {
      tx.executeSql(
        sql,
        params,
        () => resolve(),
        (_: any, error: any) => reject(error)
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
    const rows = this.normalizeResults(results);
    const row = rows[0];

    return {
      entries: row.entries || 0,
      bytes: (row.bytes || 0) * 2, // Rough UTF-16 estimation
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    // Remove expired items
    const currentTime = Date.now();
    const sql = `
      DELETE FROM ${ReactNativeCacheAdapter.TABLE_NAME} 
      WHERE ttl IS NOT NULL AND ttl > 0 AND (timestamp + ttl) < ?
    `;
    
    const results = await this.executeSql(sql, [currentTime]);
    return this.isExpo ? results.changes || 0 : results.rowsAffected || 0;
  }

  async getKeys(pattern?: string): Promise<string[]> {
    await this.ensureInitialized();

    let sql = `SELECT cache_key FROM ${ReactNativeCacheAdapter.TABLE_NAME}`;
    const params: any[] = [];

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

  private async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();

    const sql = `DELETE FROM ${ReactNativeCacheAdapter.TABLE_NAME} WHERE cache_key = ?`;
    const results = await this.executeSql(sql, [key]);
    
    return this.isExpo ? (results.changes || 0) > 0 : (results.rowsAffected || 0) > 0;
  }

  private async executeSql(sql: string, params: any[] = []): Promise<any> {
    if (this.isExpo) {
      // Expo SQLite
      if (sql.toLowerCase().includes('select') || sql.toLowerCase().includes('pragma')) {
        const result = await this.db.getAllAsync(sql, params);
        // Normalize to match expected structure - wrap in results array if needed
        return Array.isArray(result) ? { results: result } : result;
      } else {
        return await this.db.runAsync(sql, params);
      }
    } else {
      // react-native-sqlite-storage
      return new Promise((resolve, reject) => {
        this.db.transaction((tx: any) => {
          tx.executeSql(
            sql,
            params,
            (_: any, results: any) => resolve(results),
            (_: any, error: any) => reject(error)
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

  private isExpired(row: any): boolean {
    if (!row.ttl || row.ttl === 0) return false;
    return Date.now() - row.timestamp > row.ttl;
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
 * Memory-based fallback cache adapter for environments without SQLite
 */
export class MemoryCacheAdapter implements ICacheAdapter {
  private cache = new Map<string, CachedItem<any>>();
  private options: CacheOptions;
  private debugEnabled = false;
  private totalBytes = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTtl: 300000, // 5 minutes
      maxEntries: 1000,
      ...options,
    };
    this.debugEnabled = options.debugEnabled || false;
  }

  private debug(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data) {
        console.log(`[CACHE-MEMORY] ${message}`, data);
      } else {
        console.log(`[CACHE-MEMORY] ${message}`);
      }
    }
  }

  private calculateItemSize(key: string, item: CachedItem<any>): number {
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

    if (this.isExpired(item)) {
      this.debug('Cache item expired, removing', { key });
      const itemSize = this.calculateItemSize(key, item);
      this.cache.delete(key);
      this.totalBytes -= itemSize;
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
      data: finalData,
      compressed: isCompressed,
    };
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    this.debug('Setting cache item', { key, ttl: ttl || this.options.defaultTtl });

    // Handle compression if enabled
    let finalData: any = data;
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
          savings: compressionResult.originalSize - compressionResult.compressedSize
        });
      }
    }

    const item: CachedItem<any> = {
      data: finalData,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTtl,
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
      newItemSize
    });
  }

  async setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void> {
    if (items.length === 0) return;

    this.debug('Batch setting items', { count: items.length });

    let totalNewBytes = 0;
    let totalOldBytes = 0;
    let itemsToRemove: string[] = [];

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
          removedKeys: itemsToRemove
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
      bytesAdded: totalNewBytes - totalOldBytes
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
        remainingBytes: this.totalBytes
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
    let removed = 0;
    let bytesFreed = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        const itemSize = this.calculateItemSize(key, item);
        this.cache.delete(key);
        this.totalBytes -= itemSize;
        bytesFreed += itemSize;
        removed++;
      }
    }

    if (removed > 0) {
      this.debug('Cleanup completed', {
        entriesRemoved: removed,
        bytesFreed,
        remainingEntries: this.cache.size,
        remainingBytes: this.totalBytes
      });
    }

    return removed;
  }

  async getKeys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    if (!pattern) return keys;

    const regex = this.patternToRegex(pattern);
    return keys.filter(key => regex.test(key));
  }

  private isExpired(item: CachedItem<any>): boolean {
    if (!item.ttl || item.ttl === 0) return false;
    return Date.now() - item.timestamp > item.ttl;
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    return new RegExp(`^${regexPattern}$`);
  }
}