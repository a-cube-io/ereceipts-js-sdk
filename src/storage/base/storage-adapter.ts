/**
 * Base Storage Adapter Interface
 * Provides cross-platform storage abstraction for the queue system
 */

export interface StorageAdapter {
  /**
   * Initialize the storage adapter
   */
  initialize(): Promise<void>;

  /**
   * Store data with optional expiration
   */
  set(key: string, value: any, options?: StorageOptions): Promise<void>;

  /**
   * Retrieve data
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Check if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Remove data
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all data (optionally by prefix)
   */
  clear(prefix?: string): Promise<void>;

  /**
   * Get all keys (optionally by prefix)
   */
  keys(prefix?: string): Promise<string[]>;

  /**
   * Get multiple values by keys
   */
  getMany<T = any>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple key-value pairs atomically
   */
  setMany(items: Array<{ key: string; value: any; options?: StorageOptions }>): Promise<void>;

  /**
   * Remove multiple keys atomically
   */
  removeMany(keys: string[]): Promise<void>;

  /**
   * Get storage statistics
   */
  getStats(): Promise<StorageStats>;

  /**
   * Cleanup expired entries
   */
  cleanup(): Promise<void>;

  /**
   * Destroy the storage adapter
   */
  destroy(): Promise<void>;
}

export interface StorageOptions {
  /**
   * Expiration time in milliseconds
   */
  expiresIn?: number;

  /**
   * Custom serialization
   */
  serialize?: boolean;

  /**
   * Storage priority (affects cleanup order)
   */
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface StorageStats {
  totalKeys: number;
  totalSize: number;
  availableSpace?: number;
  lastCleanup: number;
  expiredKeys: number;
}

export interface StorageItem<T = any> {
  value: T;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  priority: StorageOptions['priority'];
  size: number;
}

/**
 * Abstract base class for storage adapters
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  protected isInitialized = false;

  protected stats: StorageStats = {
    totalKeys: 0,
    totalSize: 0,
    lastCleanup: 0,
    expiredKeys: 0,
  };

  abstract initialize(): Promise<void>;
  abstract set(key: string, value: any, options?: StorageOptions): Promise<void>;
  abstract get<T = any>(key: string): Promise<T | null>;
  abstract has(key: string): Promise<boolean>;
  abstract remove(key: string): Promise<void>;
  abstract clear(prefix?: string): Promise<void>;
  abstract keys(prefix?: string): Promise<string[]>;
  abstract getMany<T = any>(keys: string[]): Promise<(T | null)[]>;
  abstract setMany(items: Array<{ key: string; value: any; options?: StorageOptions }>): Promise<void>;
  abstract removeMany(keys: string[]): Promise<void>;
  abstract cleanup(): Promise<void>;
  abstract destroy(): Promise<void>;

  async getStats(): Promise<StorageStats> {
    return { ...this.stats };
  }

  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Storage adapter not initialized. Call initialize() first.');
    }
  }

  protected createStorageItem<T>(value: T, options: StorageOptions = {}): StorageItem<T> {
    const now = Date.now();
    const item: StorageItem<T> = {
      value,
      createdAt: now,
      updatedAt: now,
      priority: options.priority ?? 'normal',
      size: this.calculateSize(value),
    };

    // Only add expiresAt if we have a value (exactOptionalPropertyTypes compliance)
    if (options.expiresIn) {
      item.expiresAt = now + options.expiresIn;
    }

    return item;
  }

  protected isExpired(item: StorageItem): boolean {
    return item.expiresAt ? Date.now() > item.expiresAt : false;
  }

  protected calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 0;
    }
  }

  protected updateStats(keyDelta: number, sizeDelta: number): void {
    this.stats.totalKeys = Math.max(0, this.stats.totalKeys + keyDelta);
    this.stats.totalSize = Math.max(0, this.stats.totalSize + sizeDelta);
  }
}
