/**
 * React Native Storage Adapter - AsyncStorage with Keychain integration
 * Enterprise-grade storage for React Native environments
 */

import { BaseStorageAdapter, StorageOptions, StorageItem } from '@/storage/base/storage-adapter';

// Platform detection
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

export interface ReactNativeStorageConfig {
  keyPrefix: string;
  useKeychain: boolean;
  keychainService: string;
  quota?: number;
  encryptSensitiveData: boolean;
}

const DEFAULT_CONFIG: Required<ReactNativeStorageConfig> = {
  keyPrefix: 'acube-queue',
  useKeychain: false,
  keychainService: 'acube-sdk',
  quota: 50 * 1024 * 1024, // 50MB
  encryptSensitiveData: true,
};

export class ReactNativeStorageAdapter extends BaseStorageAdapter {
  private config: Required<ReactNativeStorageConfig>;
  private AsyncStorage: any;
  private Keychain: any;

  constructor(config: Partial<ReactNativeStorageConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!isReactNative) {
      throw new Error('ReactNativeStorageAdapter can only be used in React Native environment');
    }

    try {
      // Dynamically import React Native modules
      const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
      this.AsyncStorage = AsyncStorageModule.default;

      if (this.config.useKeychain) {
        const KeychainModule = await import('react-native-keychain');
        this.Keychain = KeychainModule;
      }
    } catch (error) {
      throw new Error(`Failed to initialize React Native storage modules: ${error}`);
    }

    this.isInitialized = true;
    await this.loadStats();
  }

  async set(key: string, value: any, options: StorageOptions = {}): Promise<void> {
    this.ensureInitialized();

    const item = this.createStorageItem(value, options);
    const storageKey = this.getPrefixedKey(key);

    try {
      if (this.shouldUseKeychain(key, options)) {
        await this.setKeychain(storageKey, item);
      } else {
        await this.setAsyncStorage(storageKey, item);
      }

      this.updateStats(1, item.size);
    } catch (error) {
      throw new Error(`Failed to store item: ${error}`);
    }
  }

  private shouldUseKeychain(_key: string, options: StorageOptions): boolean {
    return (
      this.config.useKeychain &&
      this.Keychain &&
      (this.config.encryptSensitiveData || options.priority === 'critical')
    );
  }

  private async setKeychain(key: string, item: StorageItem): Promise<void> {
    if (!this.Keychain) throw new Error('Keychain not available');

    const serialized = JSON.stringify(item);
    await this.Keychain.setInternetCredentials(
      this.config.keychainService,
      key,
      serialized
    );
  }

  private async setAsyncStorage(key: string, item: StorageItem): Promise<void> {
    const serialized = JSON.stringify(item);
    await this.AsyncStorage.setItem(key, serialized);
  }

  async get<T = any>(key: string): Promise<T | null> {
    this.ensureInitialized();

    const storageKey = this.getPrefixedKey(key);

    try {
      let item: StorageItem | null = null;

      // Try keychain first if available
      if (this.config.useKeychain && this.Keychain) {
        try {
          const credentials = await this.Keychain.getInternetCredentials(this.config.keychainService);
          if (credentials && credentials.username === storageKey) {
            item = JSON.parse(credentials.password);
          }
        } catch {
          // Fall through to AsyncStorage
        }
      }

      // Try AsyncStorage if not found in keychain
      if (!item) {
        const serialized = await this.AsyncStorage.getItem(storageKey);
        if (serialized) {
          item = JSON.parse(serialized);
        }
      }

      if (!item) return null;

      if (this.isExpired(item)) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async remove(key: string): Promise<void> {
    this.ensureInitialized();

    const storageKey = this.getPrefixedKey(key);

    try {
      // Remove from both keychain and AsyncStorage
      if (this.config.useKeychain && this.Keychain) {
        try {
          await this.Keychain.resetInternetCredentials(this.config.keychainService);
        } catch {
          // Ignore keychain errors
        }
      }

      await this.AsyncStorage.removeItem(storageKey);
      this.updateStats(-1, 0);
    } catch (error) {
      throw new Error(`Failed to remove item: ${error}`);
    }
  }

  async clear(prefix?: string): Promise<void> {
    this.ensureInitialized();

    try {
      const keys = await this.keys(prefix);
      await this.removeMany(keys);

      // Clear keychain if used
      if (this.config.useKeychain && this.Keychain) {
        try {
          await this.Keychain.resetInternetCredentials(this.config.keychainService);
        } catch {
          // Ignore keychain errors
        }
      }

      this.stats.totalKeys = 0;
      this.stats.totalSize = 0;
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    this.ensureInitialized();

    try {
      const allKeys = await this.AsyncStorage.getAllKeys();
      let filteredKeys = allKeys.filter((key: string) => 
        key.startsWith(this.config.keyPrefix)
      );

      // Remove prefix from keys
      filteredKeys = filteredKeys.map((key: string) => 
        key.substring(this.config.keyPrefix.length + 1)
      );

      if (prefix) {
        filteredKeys = filteredKeys.filter((key: string) => key.startsWith(prefix));
      }

      return filteredKeys;
    } catch (error) {
      throw new Error(`Failed to get keys: ${error}`);
    }
  }

  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    this.ensureInitialized();

    try {
      const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
      const results = await this.AsyncStorage.multiGet(prefixedKeys);

      return results.map(([key, value]: [string, string | null]) => {
        if (!value) return null;

        try {
          const item: StorageItem = JSON.parse(value);
          if (this.isExpired(item)) {
            // Remove expired item asynchronously
            const originalKey = key.substring(this.config.keyPrefix.length + 1);
            this.remove(originalKey);
            return null;
          }
          return item.value;
        } catch {
          return null;
        }
      });
    } catch (error) {
      throw new Error(`Failed to get multiple items: ${error}`);
    }
  }

  async setMany(items: Array<{ key: string; value: any; options?: StorageOptions }>): Promise<void> {
    this.ensureInitialized();

    try {
      const asyncStorageItems: Array<[string, string]> = [];
      const keychainItems: Array<{ key: string; item: StorageItem }> = [];

      for (const { key, value, options = {} } of items) {
        const item = this.createStorageItem(value, options);
        const storageKey = this.getPrefixedKey(key);

        if (this.shouldUseKeychain(key, options)) {
          keychainItems.push({ key: storageKey, item });
        } else {
          asyncStorageItems.push([storageKey, JSON.stringify(item)]);
        }

        this.updateStats(1, item.size);
      }

      // Set AsyncStorage items
      if (asyncStorageItems.length > 0) {
        await this.AsyncStorage.multiSet(asyncStorageItems);
      }

      // Set Keychain items
      for (const { key, item } of keychainItems) {
        await this.setKeychain(key, item);
      }
    } catch (error) {
      throw new Error(`Failed to set multiple items: ${error}`);
    }
  }

  async removeMany(keys: string[]): Promise<void> {
    this.ensureInitialized();

    try {
      const prefixedKeys = keys.map(key => this.getPrefixedKey(key));
      await this.AsyncStorage.multiRemove(prefixedKeys);

      // Clear keychain for these keys if used
      if (this.config.useKeychain && this.Keychain) {
        try {
          await this.Keychain.resetInternetCredentials(this.config.keychainService);
        } catch {
          // Ignore keychain errors
        }
      }

      this.updateStats(-keys.length, 0);
    } catch (error) {
      throw new Error(`Failed to remove multiple items: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    this.ensureInitialized();

    const now = Date.now();
    let cleanedCount = 0;

    try {
      const keys = await this.keys();
      const expiredKeys: string[] = [];

      for (const key of keys) {
        try {
          const storageKey = this.getPrefixedKey(key);
          const serialized = await this.AsyncStorage.getItem(storageKey);
          
          if (serialized) {
            const item: StorageItem = JSON.parse(serialized);
            if (this.isExpired(item)) {
              expiredKeys.push(key);
            }
          }
        } catch {
          // Remove corrupted items
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await this.removeMany(expiredKeys);
        cleanedCount = expiredKeys.length;
      }

      this.stats.lastCleanup = now;
      this.stats.expiredKeys = cleanedCount;
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const keys = await this.keys();
      this.stats.totalKeys = keys.length;

      // Calculate total size (sample approach for performance)
      let totalSize = 0;
      const sampleSize = Math.min(keys.length, 50);
      
      for (let i = 0; i < sampleSize; i++) {
        const key = keys[i];
        if (!key) continue;
        const value = await this.get(key);
        if (value) {
          totalSize += this.calculateSize(value);
        }
      }

      // Extrapolate total size
      this.stats.totalSize = Math.round((totalSize / sampleSize) * keys.length);
    } catch (error) {
      console.warn('Failed to load storage stats:', error);
    }
  }

  private getPrefixedKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  async destroy(): Promise<void> {
    await this.clear();
    this.isInitialized = false;
  }
}