import { IStorage, ISecureStorage } from '../../adapters';

/**
 * React Native storage adapter using AsyncStorage
 */
export class ReactNativeStorageAdapter implements IStorage {
  private AsyncStorage: any;

  constructor() {
    this.initializeAsyncStorage();
  }

  private async initializeAsyncStorage() {
    try {
      // Try to require AsyncStorage - avoid dynamic import for Metro compatibility
      const AsyncStorageModule = require('@react-native-async-storage/async-storage');
      this.AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;
    } catch {
      // Fallback to legacy AsyncStorage if available
      try {
        const ReactNative = require('react-native');
        this.AsyncStorage = ReactNative.AsyncStorage;
      } catch {
        throw new Error('AsyncStorage not available. Please install @react-native-async-storage/async-storage');
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      return await this.AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get item from AsyncStorage:', error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      await this.AsyncStorage.setItem(key, value);
    } catch (error) {
      throw new Error(`Failed to store item: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      await this.AsyncStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove item: ${error}`);
    }
  }

  async clear(): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      await this.AsyncStorage.clear();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  async getAllKeys(): Promise<string[]> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      return await this.AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      const pairs = await this.AsyncStorage.multiGet(keys);
      const result: Record<string, string | null> = {};
      pairs.forEach(([key, value]: [string, string | null]) => {
        result[key] = value;
      });
      return result;
    } catch (error) {
      console.error('Failed to get multiple items:', error);
      const result: Record<string, string | null> = {};
      keys.forEach(key => {
        result[key] = null;
      });
      return result;
    }
  }

  async multiSet(items: Record<string, string>): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      const pairs = Object.entries(items);
      await this.AsyncStorage.multiSet(pairs);
    } catch (error) {
      throw new Error(`Failed to store multiple items: ${error}`);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    if (!this.AsyncStorage) await this.initializeAsyncStorage();
    
    try {
      await this.AsyncStorage.multiRemove(keys);
    } catch (error) {
      throw new Error(`Failed to remove multiple items: ${error}`);
    }
  }
}

/**
 * React Native secure storage adapter using expo-secure-store or react-native-keychain
 */
export class ReactNativeSecureStorageAdapter implements ISecureStorage {
  private secureStore: any;
  private keychain: any;
  private isExpo: boolean = false;

  constructor() {
    this.initializeSecureStorage();
  }

  private async initializeSecureStorage() {
    // Try to initialize Expo SecureStore first
    try {
      // Use require() instead of dynamic import() to avoid Metro bundling issues
      const SecureStore = require('expo-secure-store');
      this.secureStore = SecureStore;
      this.isExpo = true;
      return;
    } catch (error) {
      // expo-secure-store not available, continue to fallback
      console.log('expo-secure-store not available, trying react-native-keychain');
    }

    // Fallback to react-native-keychain
    try {
      const Keychain = require('react-native-keychain');
      this.keychain = Keychain;
      this.isExpo = false;
      return;
    } catch (error) {
      // react-native-keychain not available
      console.error('react-native-keychain not available');
    }

    throw new Error('No secure storage available. Please install expo-secure-store or react-native-keychain');
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
      console.error('Failed to get secure item:', error);
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
    // Note: This is a simplified implementation
    // In a real implementation, you'd need to track keys or use a different approach
    console.warn('Clear all secure items not fully implemented for React Native');
  }

  async getAllKeys(): Promise<string[]> {
    // Note: This is not easily implementable with current secure storage solutions
    // You would need to maintain a separate index of keys
    console.warn('Get all secure keys not implemented for React Native');
    return [];
  }

  async multiGet(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const key of keys) {
      result[key] = await this.get(key);
    }
    return result;
  }

  async multiSet(items: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
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