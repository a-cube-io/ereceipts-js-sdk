import { ICacheAdapter, CachedItem, CacheSize, CacheOptions } from '../../adapters';

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
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${ReactNativeCacheAdapter.TABLE_NAME} (
        cache_key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER,
        tags TEXT,
        etag TEXT,
        source TEXT DEFAULT 'server',
        sync_status TEXT DEFAULT 'synced'
      );
      
      CREATE INDEX IF NOT EXISTS idx_timestamp ON ${ReactNativeCacheAdapter.TABLE_NAME}(timestamp);
      CREATE INDEX IF NOT EXISTS idx_source ON ${ReactNativeCacheAdapter.TABLE_NAME}(source);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON ${ReactNativeCacheAdapter.TABLE_NAME}(sync_status);
    `;

    await this.executeSql(createTableSQL);
  }

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    await this.ensureInitialized();

    const sql = `SELECT * FROM ${ReactNativeCacheAdapter.TABLE_NAME} WHERE cache_key = ?`;
    const results = await this.executeSql(sql, [key]);
    
    if (!results.rows || results.rows.length === 0) {
      return null;
    }

    const row = this.isExpo ? results.rows[0] : results.rows.item(0);
    
    // Check if expired
    if (this.isExpired(row)) {
      // Remove expired item asynchronously
      this.delete(key).catch(console.error);
      return null;
    }

    return {
      data: JSON.parse(row.data),
      timestamp: row.timestamp,
      ttl: row.ttl,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      etag: row.etag,
      source: row.source,
      syncStatus: row.sync_status,
    };
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

    const sql = `
      INSERT OR REPLACE INTO ${ReactNativeCacheAdapter.TABLE_NAME} 
      (cache_key, data, timestamp, ttl, tags, etag, source, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      key,
      JSON.stringify(item.data),
      item.timestamp,
      item.ttl || this.options.defaultTtl,
      item.tags ? JSON.stringify(item.tags) : null,
      item.etag || null,
      item.source || 'server',
      item.syncStatus || 'synced',
    ];

    await this.executeSql(sql, params);
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
    const row = this.isExpo ? results.rows[0] : results.rows.item(0);

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

    if (this.isExpo) {
      for (const row of results.rows || []) {
        keys.push(row.cache_key);
      }
    } else {
      for (let i = 0; i < (results.rows?.length || 0); i++) {
        keys.push(results.rows.item(i).cache_key);
      }
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
        return await this.db.getAllAsync(sql, params);
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

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTtl: 300000, // 5 minutes
      maxEntries: 1000,
      ...options,
    };
  }

  async get<T>(key: string): Promise<CachedItem<T> | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    return item;
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
    // Enforce max entries limit
    if (this.cache.size >= (this.options.maxEntries || 1000)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, item);
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = this.patternToRegex(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getSize(): Promise<CacheSize> {
    return {
      entries: this.cache.size,
      bytes: 0, // Not easily calculable in memory
      lastCleanup: Date.now(),
    };
  }

  async cleanup(): Promise<number> {
    let removed = 0;
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        removed++;
      }
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