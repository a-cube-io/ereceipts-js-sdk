import { IStoragePort as IStorage } from '@/application/ports/driven';
import { createPrefixedLogger } from '@/shared/utils';

import { BaseSecureStorageAdapter } from '../shared';

const log = createPrefixedLogger('RN-STORAGE');

/**
 * Interfaces for React Native storage dependencies
 */
interface AsyncStorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<[string, string | null][]>;
  multiSet(pairs: [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

interface ExpoSecureStoreInterface {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

interface KeychainCredentials {
  password: string;
  username: string;
  service: string;
}

interface KeychainInterface {
  getInternetCredentials(server: string): Promise<KeychainCredentials | false>;
  setInternetCredentials(server: string, username: string, password: string): Promise<void>;
  resetInternetCredentials(server: string): Promise<void>;
}

/**
 * React Native storage adapter using AsyncStorage
 * Note: Uses native batch operations for better performance (not base class)
 */
export class ReactNativeStorageAdapter implements IStorage {
  private AsyncStorage: AsyncStorageInterface | null = null;

  constructor() {
    this.initializeAsyncStorage();
  }

  private async initializeAsyncStorage() {
    try {
      const AsyncStorageModule = require('@react-native-async-storage/async-storage');
      this.AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
    } catch {
      try {
        const ReactNative = require('react-native');
        this.AsyncStorage = ReactNative.AsyncStorage;
      } catch {
        throw new Error(
          'AsyncStorage not available. Please install @react-native-async-storage/async-storage'
        );
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      return await this.AsyncStorage!.getItem(key);
    } catch (error) {
      log.error('Failed to get item from AsyncStorage:', error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      await this.AsyncStorage!.setItem(key, value);
    } catch (error) {
      throw new Error(`Failed to store item: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      await this.AsyncStorage!.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove item: ${error}`);
    }
  }

  async clear(): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      await this.AsyncStorage!.clear();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  async getAllKeys(): Promise<string[]> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      return await this.AsyncStorage!.getAllKeys();
    } catch (error) {
      log.error('Failed to get all keys:', error);
      return [];
    }
  }

  // Uses native AsyncStorage batch operations for better performance
  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      const pairs = await this.AsyncStorage!.multiGet(keys);
      const result: Record<string, string | null> = {};
      pairs.forEach(([key, value]: [string, string | null]) => {
        result[key] = value;
      });
      return result;
    } catch (error) {
      log.error('Failed to get multiple items:', error);
      const result: Record<string, string | null> = {};
      keys.forEach((key) => {
        result[key] = null;
      });
      return result;
    }
  }

  async multiSet(items: Record<string, string>): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      const pairs = Object.entries(items);
      await this.AsyncStorage!.multiSet(pairs);
    } catch (error) {
      throw new Error(`Failed to store multiple items: ${error}`);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();

    try {
      await this.AsyncStorage!.multiRemove(keys);
    } catch (error) {
      throw new Error(`Failed to remove multiple items: ${error}`);
    }
  }
}

/**
 * React Native secure storage adapter using expo-secure-store or react-native-keychain
 * Uses BaseSecureStorageAdapter for multi operations (no native batch support)
 */
export class ReactNativeSecureStorageAdapter extends BaseSecureStorageAdapter {
  private secureStore: ExpoSecureStoreInterface | null = null;
  private keychain: KeychainInterface | null = null;
  private isExpo: boolean = false;

  constructor() {
    super();
    this.initializeSecureStorage();
  }

  private async initializeSecureStorage() {
    try {
      const SecureStore = require('expo-secure-store');
      this.secureStore = SecureStore;
      this.isExpo = true;
      return;
    } catch {
      log.debug('expo-secure-store not available, trying react-native-keychain');
    }

    try {
      const Keychain = require('react-native-keychain');
      this.keychain = Keychain;
      this.isExpo = false;
      return;
    } catch {
      log.error('react-native-keychain not available');
    }

    throw new Error(
      'No secure storage available. Please install expo-secure-store or react-native-keychain'
    );
  }

  async get(key: string): Promise<string | null> {
    if (!this.secureStore && !this.keychain) {
      await this.initializeSecureStorage();
    }

    try {
      if (this.isExpo && this.secureStore) {
        return await this.secureStore.getItemAsync(key);
      } else if (this.keychain) {
        const credentials = await this.keychain.getInternetCredentials(key);
        return credentials ? credentials.password : null;
      }
    } catch (error) {
      log.error('Failed to get secure item:', error);
    }

    return null;
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.secureStore && !this.keychain) {
      await this.initializeSecureStorage();
    }

    try {
      if (this.isExpo && this.secureStore) {
        await this.secureStore.setItemAsync(key, value);
      } else if (this.keychain) {
        await this.keychain.setInternetCredentials(key, key, value);
      }
    } catch (error) {
      throw new Error(`Failed to store secure item: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.secureStore && !this.keychain) {
      await this.initializeSecureStorage();
    }

    try {
      if (this.isExpo && this.secureStore) {
        await this.secureStore.deleteItemAsync(key);
      } else if (this.keychain) {
        await this.keychain.resetInternetCredentials(key);
      }
    } catch (error) {
      throw new Error(`Failed to remove secure item: ${error}`);
    }
  }

  async clear(): Promise<void> {
    log.warn('Clear all secure items not fully implemented for React Native');
  }

  async getAllKeys(): Promise<string[]> {
    log.warn('Get all secure keys not implemented for React Native');
    return [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initializeSecureStorage();
      return true;
    } catch {
      return false;
    }
  }

  async getSecurityLevel(): Promise<string> {
    if (this.isExpo) {
      return 'Expo SecureStore (iOS Keychain / Android EncryptedSharedPreferences)';
    } else {
      return 'React Native Keychain (iOS Keychain / Android Keystore)';
    }
  }
}
