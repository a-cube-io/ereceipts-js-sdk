/**
 * Storage Factory for A-Cube SDK
 * Automatic platform detection and optimal storage adapter selection
 */

import { EventEmitter } from 'events';
import { 
  UnifiedStorage, 
  StorageAdapter, 
  StorageKey, 
  StorageValue, 
  StorageEntry, 
  StorageOptions, 
  QueryOptions, 
  StorageTransaction, 
  StorageStats,
  StorageError,
  DEFAULT_STORAGE_OPTIONS,
  createReceiptKey,
  createCashierKey,
  createMerchantKey,
  createPEMKey,
  createCashRegisterKey,
  createCacheKey,
  createSessionKey,
  createSecureKey,
  createConfigKey,
} from './unified-storage';
import { 
  ReceiptId, 
  CashierId, 
  PEMId, 
  MerchantId, 
  CashRegisterId 
} from '../types/branded';
import { platformDetector, PlatformType, EnvironmentInfo } from './platform-detector';
import { IndexedDBAdapter } from './adapters/indexeddb-adapter';
import { LocalStorageAdapter } from './adapters/localstorage-adapter';
import { 
  StorageEncryptionService, 
  StorageEncryptionConfig,
  createEncryptionService,
} from './encryption-service';

// Factory configuration
export interface StorageFactoryConfig {
  readonly preferredAdapter?: 'indexeddb' | 'localstorage' | 'auto';
  readonly encryption?: Partial<StorageEncryptionConfig>;
  readonly keyPrefix?: string;
  readonly enableCompression?: boolean;
  readonly enableCaching?: boolean;
  readonly performanceMode?: 'high' | 'balanced' | 'conservative';
  readonly debug?: boolean;
  readonly maxRetries?: number;
  readonly connectionTimeout?: number;
}

// Memory-based adapter for fallback scenarios
class MemoryStorageAdapter implements StorageAdapter {
  public readonly name = 'Memory';
  private store = new Map<string, any>();

  public readonly capabilities = {
    supportsTransactions: false,
    supportsIndexing: false,
    maxKeyLength: Infinity,
    maxValueSize: Infinity,
    supportsCompression: false,
    supportsEncryption: false,
    supportsTTL: true,
  } as const;

  get isAvailable(): boolean { return true; }
  isConnected(): boolean { return true; }
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> { this.store.clear(); }

  async set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void> {
    const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
    const entry = this.createStorageEntry(key, value, mergedOptions);
    this.store.set(key, entry);
  }

  async get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Check expiration
    if (entry.metadata.expiresAt && entry.metadata.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }

  async delete(key: StorageKey): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: StorageKey): Promise<boolean> {
    return this.store.has(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async setMany<T extends StorageValue>(entries: Array<{ key: StorageKey; value: T; options?: StorageOptions }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.options);
    }
  }

  async getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async deleteMany(keys: StorageKey[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) count++;
    }
    return count;
  }

  async keys(): Promise<StorageKey[]> {
    return Array.from(this.store.keys()) as StorageKey[];
  }

  async values<T extends StorageValue>(): Promise<Array<StorageEntry<T>>> {
    return Array.from(this.store.values());
  }

  async entries<T extends StorageValue>(): Promise<Array<StorageEntry<T>>> {
    return this.values<T>();
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  async beginTransaction(): Promise<StorageTransaction> {
    throw new StorageError('Transactions not supported', 'TRANSACTION_NOT_SUPPORTED', 'beginTransaction');
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.metadata.expiresAt && entry.metadata.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  async optimize(): Promise<void> {
    await this.cleanup();
  }

  async getStats(): Promise<StorageStats> {
    const entries = Array.from(this.store.values());
    const now = Date.now();
    
    return {
      totalKeys: entries.length,
      totalSize: entries.reduce((size, entry) => size + JSON.stringify(entry).length, 0),
      namespaces: [...new Set(entries.map(e => e.metadata.key.split(':')[0]))],
      oldestEntry: Math.min(...entries.map(e => e.metadata.createdAt)),
      newestEntry: Math.max(...entries.map(e => e.metadata.createdAt)),
      expiredEntries: entries.filter(e => e.metadata.expiresAt && e.metadata.expiresAt < now).length,
      encryptedEntries: entries.filter(e => e.metadata.encrypted).length,
      compressedEntries: entries.filter(e => e.metadata.compressed).length,
    };
  }

  private createStorageEntry<T extends StorageValue>(key: StorageKey, value: T, options: Required<StorageOptions>): StorageEntry<T> {
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
}

/**
 * Unified Storage Implementation
 * Brings together adapter, encryption, and high-level operations
 */
class UnifiedStorageImpl extends EventEmitter implements UnifiedStorage {
  public readonly name: string;
  public readonly capabilities;
  public readonly isAvailable: boolean;

  constructor(
    private adapter: StorageAdapter,
    private encryptionService: StorageEncryptionService,
    // @ts-ignore - Config parameter reserved for future use
    private _config: StorageFactoryConfig
  ) {
    super();
    this.name = `Unified-${adapter.name}`;
    this.capabilities = adapter.capabilities;
    this.isAvailable = adapter.isAvailable;
  }

  // Delegate core methods to adapter
  isConnected(): boolean { return this.adapter.isConnected(); }
  async connect(): Promise<void> { return this.adapter.connect(); }
  async disconnect(): Promise<void> { return this.adapter.disconnect(); }

  async set<T extends StorageValue>(key: StorageKey, value: T, options?: StorageOptions): Promise<void> {
    const mergedOptions = { ...DEFAULT_STORAGE_OPTIONS, ...options };
    
    try {
      // Apply encryption if needed
      let finalValue: T | string = value;
      if (mergedOptions.encrypt || (mergedOptions.namespace === 'secure')) {
        const encrypted = await this.encryptionService.encryptValue(value, key, true);
        finalValue = encrypted.data;
        mergedOptions.encrypt = true;
      }

      await this.adapter.set(key, finalValue, mergedOptions);
      this.emit('set', key, value, options);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async get<T extends StorageValue>(key: StorageKey): Promise<StorageEntry<T> | null> {
    try {
      const entry = await this.adapter.get<T | string>(key);
      if (!entry) {
        this.emit('get', key, null);
        return null;
      }

      // Apply decryption if needed
      if (entry.metadata.encrypted) {
        const decrypted = await this.encryptionService.decryptStorageEntry(entry);
        this.emit('get', key, decrypted.data);
        return decrypted as StorageEntry<T>;
      }

      this.emit('get', key, entry.data);
      return entry as StorageEntry<T>;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async delete(key: StorageKey): Promise<boolean> {
    try {
      const result = await this.adapter.delete(key);
      this.emit('delete', key, result);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    return this.adapter.exists(key);
  }

  async clear(namespace?: string): Promise<void> {
    try {
      await this.adapter.clear(namespace);
      this.emit('clear', namespace);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // High-level entity methods
  async setReceipt(id: ReceiptId, receipt: any, options?: StorageOptions): Promise<void> {
    const key = createReceiptKey(id);
    return this.set(key, receipt, { ...options, namespace: 'receipts' });
  }

  async getReceipt(id: ReceiptId): Promise<any | null> {
    const key = createReceiptKey(id);
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async deleteReceipt(id: ReceiptId): Promise<boolean> {
    const key = createReceiptKey(id);
    return this.delete(key);
  }

  async setCashier(id: CashierId, cashier: any, options?: StorageOptions): Promise<void> {
    const key = createCashierKey(id);
    return this.set(key, cashier, { ...options, namespace: 'cashiers' });
  }

  async getCashier(id: CashierId): Promise<any | null> {
    const key = createCashierKey(id);
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async deleteCashier(id: CashierId): Promise<boolean> {
    const key = createCashierKey(id);
    return this.delete(key);
  }

  async setMerchant(id: MerchantId, merchant: any, options?: StorageOptions): Promise<void> {
    const key = createMerchantKey(id);
    return this.set(key, merchant, { ...options, namespace: 'merchants' });
  }

  async getMerchant(id: MerchantId): Promise<any | null> {
    const key = createMerchantKey(id);
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async deleteMerchant(id: MerchantId): Promise<boolean> {
    const key = createMerchantKey(id);
    return this.delete(key);
  }

  async setPEM(id: PEMId, pem: any, options?: StorageOptions): Promise<void> {
    const key = createPEMKey(id);
    return this.set(key, pem, { ...options, namespace: 'pems' });
  }

  async getPEM(id: PEMId): Promise<any | null> {
    const key = createPEMKey(id);
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async deletePEM(id: PEMId): Promise<boolean> {
    const key = createPEMKey(id);
    return this.delete(key);
  }

  async setCashRegister(id: CashRegisterId, cashRegister: any, options?: StorageOptions): Promise<void> {
    const key = createCashRegisterKey(id);
    return this.set(key, cashRegister, { ...options, namespace: 'cash_registers' });
  }

  async getCashRegister(id: CashRegisterId): Promise<any | null> {
    const key = createCashRegisterKey(id);
    const entry = await this.get(key);
    return entry?.data || null;
  }

  async deleteCashRegister(id: CashRegisterId): Promise<boolean> {
    const key = createCashRegisterKey(id);
    return this.delete(key);
  }

  // Cache operations
  async setCache<T extends StorageValue>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = createCacheKey(key);
    return this.set(cacheKey, value, { namespace: 'cache', ...(ttl && { ttl }) });
  }

  async getCache<T extends StorageValue>(key: string): Promise<T | null> {
    const cacheKey = createCacheKey(key);
    const entry = await this.get<T>(cacheKey);
    return entry?.data || null;
  }

  async invalidateCache(pattern?: string): Promise<number> {
    const keys = await this.keys({ namespace: 'cache', ...(pattern && { prefix: pattern }) });
    return this.deleteMany(keys);
  }

  // Session storage
  async setSession<T extends StorageValue>(key: string, value: T): Promise<void> {
    const sessionKey = createSessionKey(key);
    return this.set(sessionKey, value, { namespace: 'session' });
  }

  async getSession<T extends StorageValue>(key: string): Promise<T | null> {
    const sessionKey = createSessionKey(key);
    const entry = await this.get<T>(sessionKey);
    return entry?.data || null;
  }

  async clearSession(): Promise<void> {
    return this.clear('session');
  }

  // Secure storage (always encrypted)
  async setSecure<T extends StorageValue>(key: string, value: T): Promise<void> {
    const secureKey = createSecureKey(key);
    return this.set(secureKey, value, { namespace: 'secure', encrypt: true });
  }

  async getSecure<T extends StorageValue>(key: string): Promise<T | null> {
    const secureKey = createSecureKey(key);
    const entry = await this.get<T>(secureKey);
    return entry?.data || null;
  }

  async deleteSecure(key: string): Promise<boolean> {
    const secureKey = createSecureKey(key);
    return this.delete(secureKey);
  }

  // Configuration storage
  async setConfig<T extends StorageValue>(key: string, value: T): Promise<void> {
    const configKey = createConfigKey(key);
    return this.set(configKey, value, { namespace: 'config' });
  }

  async getConfig<T extends StorageValue>(key: string): Promise<T | null> {
    const configKey = createConfigKey(key);
    const entry = await this.get<T>(configKey);
    return entry?.data || null;
  }

  async deleteConfig(key: string): Promise<boolean> {
    const configKey = createConfigKey(key);
    return this.delete(configKey);
  }

  // Backup and restore
  async exportData(namespace?: string): Promise<string> {
    const entries = await this.entries({ ...(namespace && { namespace }) });
    return JSON.stringify(entries, null, 2);
  }

  async importData(data: string): Promise<number> {
    const entries = JSON.parse(data) as StorageEntry<any>[];
    let imported = 0;
    
    for (const entry of entries) {
      try {
        await this.set(entry.metadata.key, entry.data);
        imported++;
      } catch (error) {
        console.warn(`Failed to import entry ${entry.metadata.key}:`, error);
      }
    }
    
    return imported;
  }

  // Delegate remaining methods to adapter
  async setMany<T extends StorageValue>(entries: Array<{ key: StorageKey; value: T; options?: StorageOptions }>): Promise<void> {
    return this.adapter.setMany(entries);
  }

  async getMany<T extends StorageValue>(keys: StorageKey[]): Promise<Array<StorageEntry<T> | null>> {
    return this.adapter.getMany(keys);
  }

  async deleteMany(keys: StorageKey[]): Promise<number> {
    return this.adapter.deleteMany(keys);
  }

  async keys(options?: QueryOptions): Promise<StorageKey[]> {
    return this.adapter.keys(options);
  }

  async values<T extends StorageValue>(options?: QueryOptions): Promise<Array<StorageEntry<T>>> {
    return this.adapter.values(options);
  }

  async entries<T extends StorageValue>(options?: QueryOptions): Promise<Array<StorageEntry<T>>> {
    return this.adapter.entries(options);
  }

  async count(options?: QueryOptions): Promise<number> {
    return this.adapter.count(options);
  }

  async beginTransaction(): Promise<StorageTransaction> {
    return this.adapter.beginTransaction();
  }

  async cleanup(): Promise<number> {
    return this.adapter.cleanup();
  }

  async optimize(): Promise<void> {
    return this.adapter.optimize();
  }

  async getStats(): Promise<StorageStats> {
    return this.adapter.getStats();
  }

  // Missing interface methods
  async query<T extends StorageValue>(options: QueryOptions): Promise<Array<{ key: StorageKey; value: T }>> {
    const keys = await this.keys(options);
    const results: Array<{ key: StorageKey; value: T }> = [];
    
    for (const key of keys) {
      try {
        const entry = await this.get<T>(key);
        if (entry?.data) {
          results.push({ key, value: entry.data });
        }
      } catch (error) {
        console.warn(`Failed to query key ${key}:`, error);
      }
    }
    
    return results;
  }

  async initialize(): Promise<void> {
    await this.connect();
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
  }
}

/**
 * Storage Factory
 * Main entry point for creating storage instances
 */
export class StorageFactory {
  private static instance: StorageFactory | null = null;
  private storageInstances = new Map<string, UnifiedStorage>();

  private constructor() {}

  static getInstance(): StorageFactory {
    if (!StorageFactory.instance) {
      StorageFactory.instance = new StorageFactory();
    }
    return StorageFactory.instance;
  }

  /**
   * Create storage instance with automatic adapter selection
   */
  async createStorage(config: StorageFactoryConfig = {}): Promise<UnifiedStorage> {
    const instanceKey = this.generateInstanceKey(config);
    
    if (this.storageInstances.has(instanceKey)) {
      return this.storageInstances.get(instanceKey)!;
    }

    try {
      // Detect platform and select adapter
      const environmentInfo = platformDetector.getEnvironmentInfo();
      const adapter = await this.selectOptimalAdapter(config, environmentInfo);
      
      // Create encryption service
      const encryptionService = createEncryptionService(config.encryption);
      
      // Create unified storage instance
      const storage = new UnifiedStorageImpl(adapter, encryptionService, config);
      
      // Connect to storage
      await storage.connect();
      
      // Cache instance
      this.storageInstances.set(instanceKey, storage);
      
      if (config.debug) {
        console.log(`Storage created: ${storage.name} for platform: ${environmentInfo.platform}`);
      }
      
      return storage;
    } catch (error) {
      throw new StorageError(
        'Failed to create storage instance',
        'STORAGE_FACTORY_ERROR',
        'createStorage',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo(): EnvironmentInfo {
    return platformDetector.getEnvironmentInfo();
  }

  /**
   * Test storage compatibility
   */
  async testCompatibility(): Promise<{
    platform: PlatformType;
    availableAdapters: string[];
    recommendedAdapter: string;
    encryptionSupported: boolean;
    compressionSupported: boolean;
  }> {
    const environmentInfo = platformDetector.getEnvironmentInfo();
    const availableAdapters: string[] = [];
    
    // Test IndexedDB
    if (environmentInfo.hasIndexedDB) {
      try {
        const adapter = new IndexedDBAdapter();
        if (adapter.isAvailable) {
          availableAdapters.push('indexeddb');
        }
      } catch {
        // IndexedDB not working
      }
    }
    
    // Test LocalStorage
    if (environmentInfo.hasLocalStorage) {
      try {
        const adapter = new LocalStorageAdapter();
        if (adapter.isAvailable) {
          availableAdapters.push('localstorage');
        }
      } catch {
        // LocalStorage not working
      }
    }
    
    // Memory is always available
    availableAdapters.push('memory');
    
    return {
      platform: environmentInfo.platform,
      availableAdapters,
      recommendedAdapter: platformDetector.getRecommendedStorageAdapter(),
      encryptionSupported: environmentInfo.hasWebCrypto,
      compressionSupported: environmentInfo.hasCompressionStreams,
    };
  }

  /**
   * Clear all cached instances
   */
  clearInstances(): void {
    this.storageInstances.clear();
  }

  private async selectOptimalAdapter(
    config: StorageFactoryConfig, 
    environmentInfo: EnvironmentInfo
  ): Promise<StorageAdapter> {
    const preferredAdapter = config.preferredAdapter || 'auto';
    
    if (preferredAdapter !== 'auto') {
      return this.createSpecificAdapter(preferredAdapter, config);
    }

    // Auto-selection based on platform capabilities
    if (environmentInfo.hasIndexedDB) {
      try {
        const adapter = new IndexedDBAdapter();
        await adapter.connect();
        return adapter;
      } catch (error) {
        console.warn('IndexedDB failed, falling back to localStorage:', error);
      }
    }

    if (environmentInfo.hasLocalStorage) {
      try {
        const adapter = new LocalStorageAdapter(config.keyPrefix);
        await adapter.connect();
        return adapter;
      } catch (error) {
        console.warn('LocalStorage failed, falling back to memory:', error);
      }
    }

    // Final fallback to memory
    console.warn('Using memory storage as fallback - data will not persist');
    return new MemoryStorageAdapter();
  }

  private createSpecificAdapter(
    adapterType: 'indexeddb' | 'localstorage', 
    config: StorageFactoryConfig
  ): StorageAdapter {
    switch (adapterType) {
      case 'indexeddb':
        return new IndexedDBAdapter();
      case 'localstorage':
        return new LocalStorageAdapter(config.keyPrefix);
      default:
        throw new StorageError(
          `Unknown adapter type: ${adapterType}`,
          'UNKNOWN_ADAPTER',
          'createSpecificAdapter'
        );
    }
  }

  private generateInstanceKey(config: StorageFactoryConfig): string {
    const keyParts = [
      config.preferredAdapter || 'auto',
      config.keyPrefix || 'default',
      config.enableCompression ? 'compressed' : 'uncompressed',
      config.encryption?.enabled ? 'encrypted' : 'unencrypted',
    ];
    return keyParts.join('_');
  }
}

// Export singleton instance and convenience functions
export const storageFactory = StorageFactory.getInstance();

export const createStorage = (config?: StorageFactoryConfig): Promise<UnifiedStorage> => {
  return storageFactory.createStorage(config);
};

export const createSecureStorage = (masterPassword: string): Promise<UnifiedStorage> => {
  return storageFactory.createStorage({
    encryption: {
      enabled: true,
      masterPassword,
    },
  });
};

export const createHighPerformanceStorage = (): Promise<UnifiedStorage> => {
  return storageFactory.createStorage({
    preferredAdapter: 'indexeddb',
    performanceMode: 'high',
    enableCompression: true,
  });
};

export const createCompatibilityStorage = (): Promise<UnifiedStorage> => {
  return storageFactory.createStorage({
    preferredAdapter: 'localstorage',
    performanceMode: 'conservative',
    enableCompression: false,
  });
};