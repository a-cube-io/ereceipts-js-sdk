import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { createStore, del, get, set } from 'idb-keyval';
import { SECURE_KEYS, STORAGE_KEYS } from '../constants/keys';
import { AuthToken, JWTPayload } from '../api/types.convenience';
import { apiLogger } from '../utils/logger';
import { EncryptionService } from '../utils/encryption';

// Platform detection
const isWeb = typeof window !== 'undefined' && !!window?.document;
const isReactNative = !isWeb;

// Configuration interface
export interface SecureStorageConfig {
  encryptionKeyId: string;
  storeNamespace: string;
}

// Global configuration - must be initialized
let currentConfig: SecureStorageConfig | null = null;


// Helper function to check if a key requires secure storage
const isSecureKey = (key: string): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return SECURE_KEYS.has(key as any) || 
         key.startsWith(STORAGE_KEYS.MTLS_CERTIFICATE_PREFIX) ||
         key.startsWith(STORAGE_KEYS.MTLS_PRIVATE_KEY_PREFIX);
};

// Web secure storage with IndexedDB and localStorage fallback
class WebSecureStorage {
  private static customStore: ReturnType<typeof createStore> | null = null;
  private static isIndexedDBAvailable = true;

  private static getStore() {
    if (!this.customStore && currentConfig) {
      try {
        this.customStore = createStore(currentConfig.storeNamespace, 'secure-data');
      } catch (error) {
        apiLogger.warn('Failed to create IndexedDB store, using default', error);
        this.customStore = null;
        this.isIndexedDBAvailable = false;
      }
    }
    return this.customStore;
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (!currentConfig) {
      throw new Error('SecureStorageConfig must be initialized before use. Call SecureTokenStorage.configure() first.');
    }
    
    const secureKey = `${currentConfig.encryptionKeyId}_${key}`;
    
    // Encrypt sensitive data using key-specific encryption
    const isSensitive = isSecureKey(key);
    const finalValue = isSensitive ? await this.encrypt(value, currentConfig.encryptionKeyId) : value;
    
    if (this.isIndexedDBAvailable) {
      try {
        const store = this.getStore();
        if (store) {
          await set(secureKey, finalValue, store);
          return;
        }
      } catch (error) {
        apiLogger.warn('IndexedDB failed, falling back to localStorage', {
          key: secureKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.isIndexedDBAvailable = false;
      }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(`secure_${secureKey}`, finalValue);
    } catch (error) {
      apiLogger.error('Failed to store secure item in localStorage', {
        key: secureKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  static async getItem(key: string): Promise<string | null> {
    if (!currentConfig) {
      throw new Error('SecureStorageConfig must be initialized before use. Call SecureTokenStorage.configure() first.');
    }
    
    const secureKey = `${currentConfig.encryptionKeyId}_${key}`;
    let storedValue: string | null = null;
    
    if (this.isIndexedDBAvailable) {
      try {
        const store = this.getStore();
        if (store) {
          storedValue = await get(secureKey, store) ?? null;
        }
      } catch (error) {
        apiLogger.warn('IndexedDB read failed, trying localStorage', {
          key: secureKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.isIndexedDBAvailable = false;
      }
    }

    // Fallback to localStorage if IndexedDB failed or is unavailable
    if (storedValue === null) {
      try {
        storedValue = localStorage.getItem(`secure_${secureKey}`);
      } catch (error) {
        apiLogger.error('Failed to get secure item from localStorage', {
          key: secureKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
      }
    }

    if (!storedValue) {
      return null;
    }

    // Decrypt sensitive data using key-specific decryption
    const isSensitive = isSecureKey(key);
    return isSensitive ? await this.decrypt(storedValue, currentConfig.encryptionKeyId) : storedValue;
  }

  static async removeItem(key: string): Promise<void> {
    if (!currentConfig) {
      throw new Error('SecureStorageConfig must be initialized before use');
    }
    
    const secureKey = `${currentConfig.encryptionKeyId}_${key}`;
    
    if (this.isIndexedDBAvailable) {
      try {
        const store = this.getStore();
        if (store) {
          await del(secureKey, store);
        }
      } catch (error) {
        apiLogger.warn('IndexedDB delete failed', {
          key: secureKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Always try localStorage cleanup as well
    try {
      localStorage.removeItem(`secure_${secureKey}`);
    } catch (error) {
      apiLogger.warn('localStorage delete failed', {
        key: secureKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Reset IndexedDB availability for testing/recovery
  static resetIndexedDBStatus(): void {
    this.isIndexedDBAvailable = true;
    this.customStore = null;
  }

  /**
   * Encrypt data using the configured encryption key
   * @param data - Plain text data to encrypt
   * @param keyId - Encryption key identifier
   * @returns Encrypted data as string
   */
  private static async encrypt(data: string, keyId: string): Promise<string> {
    try {
      // Use EncryptionService with key-specific context
      const contextualData = `${keyId}:${data}`;
      return await EncryptionService.encrypt(contextualData);
    } catch (error) {
      apiLogger.error('Failed to encrypt data', {
        keyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using the configured encryption key
   * @param encryptedData - Encrypted data string
   * @param keyId - Encryption key identifier used during encryption
   * @returns Decrypted plain text data
   */
  private static async decrypt(encryptedData: string, keyId: string): Promise<string> {
    try {
      // Use EncryptionService to decrypt
      const decryptedContextualData = await EncryptionService.decrypt(encryptedData);
      
      // Extract original data by removing key context
      const prefix = `${keyId}:`;
      if (decryptedContextualData.startsWith(prefix)) {
        return decryptedContextualData.slice(prefix.length);
      }
      
      // Fallback for data encrypted without key context (backward compatibility)
      return decryptedContextualData;
    } catch (error) {
      apiLogger.error('Failed to decrypt data', {
        keyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Decryption failed');
    }
  }
}

// Cross-platform storage utilities
export class SecureTokenStorage {
  
  // Configuration method
  static configure(config: SecureStorageConfig): void {
    currentConfig = config;
    
    // Reset web storage to use new configuration
    if (isWeb) {
      WebSecureStorage.resetIndexedDBStatus();
    }
    
    apiLogger.info('SecureTokenStorage configured', {
      encryptionKeyId: config.encryptionKeyId,
      storeNamespace: config.storeNamespace,
    });
  }
  
  // Ensure configuration is initialized - throws error if not
  static ensureInitialized(): void {
    if (!currentConfig) {
      throw new Error('SecureTokenStorage must be configured before use. Call SecureTokenStorage.configure() first.');
    }
  }
  
  // Get current configuration
  static getConfig(): SecureStorageConfig {
    this.ensureInitialized();
    if (!currentConfig) {
      throw new Error('Configuration not initialized');
    }
    return { ...currentConfig };
  }
  // Store data securely based on platform
  private static async setSecureItem(key: string, value: string): Promise<void> {
    // Encrypt sensitive data
    const encryptedValue = await EncryptionService.encrypt(value);
    
    if (isReactNative) {
      await Keychain.setInternetCredentials(key, key, encryptedValue);
    } else {
      await WebSecureStorage.setItem(key, encryptedValue);
    }
  }

  private static async getSecureItem(key: string): Promise<string | null> {
    try {
      let encryptedValue: string | null = null;
      
      if (isReactNative) {
        const credentials = await Keychain.getInternetCredentials(key);
        encryptedValue = credentials ? credentials.password : null;
      } else {
        encryptedValue = await WebSecureStorage.getItem(key);
      }
      
      if (!encryptedValue) {
        return null;
      }
      
      // Decrypt the value
      return await EncryptionService.decrypt(encryptedValue);
    } catch (error) {
      apiLogger.warn('Failed to get secure item', {
        key,
        platform: isReactNative ? 'react-native' : 'web',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private static async removeSecureItem(key: string): Promise<void> {
    try {
      if (isReactNative) {
        await Keychain.resetInternetCredentials(key);
      } else {
        await WebSecureStorage.removeItem(key);
      }
    } catch (error) {
      apiLogger.warn('Failed to remove secure item', {
        key,
        platform: isReactNative ? 'react-native' : 'web',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Store data using appropriate method based on sensitivity
  static async setItem(key: string, value: string): Promise<void> {
    const isSecure = isSecureKey(key);
    
    if (isSecure) {
      await this.setSecureItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    const isSecure = isSecureKey(key);
    
    if (isSecure) {
      return await this.getSecureItem(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  }

  static async removeItem(key: string): Promise<void> {
    const isSecure = isSecureKey(key);
    
    if (isSecure) {
      await this.removeSecureItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  // Token-specific methods
  static async storeToken(token: AuthToken): Promise<void> {
    await this.setItem(STORAGE_KEYS.ACCESS_TOKEN, token.access_token);
    
    if (token.expires_in) {
      const expiryTime = Date.now() + (token.expires_in * 1000);
      await this.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    }
  }

  static async getToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  static async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    const expiryStr = await this.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (!expiryStr) return true; // No expiry set, assume valid

    const expiry = parseInt(expiryStr, 10);
    return Date.now() < expiry;
  }

  static async removeToken(): Promise<void> {
    await Promise.all([
      this.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      this.removeItem(STORAGE_KEYS.TOKEN_EXPIRY),
      this.removeItem(STORAGE_KEYS.USER_ROLE),
      this.removeItem(STORAGE_KEYS.USER_EMAIL),
    ]);
  }

  // JWT payload extraction
  static parseJWT(token: string): JWTPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => `%${  (`00${  c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      apiLogger.warn('Failed to parse JWT', {
        tokenLength: token?.length ?? 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  // Store user info from JWT
  static async storeUserInfo(token: string): Promise<void> {
    const payload = this.parseJWT(token);
    if (payload) {
      await Promise.all([
        this.setItem(STORAGE_KEYS.USER_ROLE, payload.role || ''),
        this.setItem(STORAGE_KEYS.USER_EMAIL, payload.email || '')
      ]);
      
      apiLogger.info('User info stored successfully', {
        email: payload.email,
        role: payload.role,
        hasExpiry: !!payload.exp
      });
    } else {
      apiLogger.warn('Failed to store user info: invalid token payload');
    }
  }

  static async getUserRole(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.USER_ROLE);
  }

  static async getUserEmail(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.USER_EMAIL);
  }

  // Clear all stored data
  static async clearAll(): Promise<void> {
    const keysToRemove = Object.values(STORAGE_KEYS);
    await Promise.all(keysToRemove.map(key => this.removeItem(key)));
    
    apiLogger.info('All stored data cleared', {
      keysCleared: keysToRemove.length
    });
  }

  // Advanced utility methods
  
  // Get token expiry information
  static async getTokenExpiryInfo(): Promise<{
    expiresAt: number | null;
    isExpired: boolean;
    expiresInMs: number | null;
  }> {
    const expiryStr = await this.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    const expiresAt = expiryStr ? parseInt(expiryStr, 10) : null;
    const now = Date.now();
    
    return {
      expiresAt,
      isExpired: expiresAt ? now >= expiresAt : false,
      expiresInMs: expiresAt ? Math.max(0, expiresAt - now) : null,
    };
  }

  // Check if storage is properly configured and accessible
  static async checkStorageHealth(): Promise<{
    isHealthy: boolean;
    platform: 'web' | 'react-native';
    storageType: 'indexeddb' | 'localStorage' | 'keychain' | 'asyncStorage';
    issues: string[];
  }> {
    const issues: string[] = [];
    let storageType: 'indexeddb' | 'localStorage' | 'keychain' | 'asyncStorage';
    
    if (isReactNative) {
      storageType = 'keychain';
      try {
        // Test keychain access
        await this.setItem('__health_check__', 'test');
        await this.getItem('__health_check__');
        await this.removeItem('__health_check__');
      } catch (error) {
        issues.push('Keychain access failed');
        storageType = 'asyncStorage';
      }
    } else {
      try {
        // Test IndexedDB
        await WebSecureStorage.setItem('__health_check__', 'test');
        await WebSecureStorage.getItem('__health_check__');
        await WebSecureStorage.removeItem('__health_check__');
        storageType = 'indexeddb';
      } catch (error) {
        issues.push('IndexedDB access failed, using localStorage fallback');
        storageType = 'localStorage';
      }
    }

    const result = {
      isHealthy: issues.length === 0,
      platform: isReactNative ? 'react-native' as const : 'web' as const,
      storageType,
      issues,
    };

    apiLogger.info('Storage health check completed', result);
    return result;
  }

  // Get storage statistics
  static async getStorageStats(): Promise<{
    hasToken: boolean;
    hasUserInfo: boolean;
    tokenExpiryInfo: Awaited<ReturnType<typeof SecureTokenStorage.getTokenExpiryInfo>>;
    configuredNamespace: string;
    encryptionKeyId: string;
  }> {
    const [token, userRole, userEmail, tokenExpiryInfo] = await Promise.all([
      this.getToken(),
      this.getUserRole(),
      this.getUserEmail(),
      this.getTokenExpiryInfo(),
    ]);

    const config = this.getConfig();

    return {
      hasToken: !!token,
      hasUserInfo: !!(userRole ?? userEmail),
      tokenExpiryInfo,
      configuredNamespace: config.storeNamespace,
      encryptionKeyId: config.encryptionKeyId,
    };
  }

  // Import/Export for migration purposes (development only)
  static async exportData(): Promise<Record<string, string | null>> {
    const keys = Object.values(STORAGE_KEYS);
    const data: Record<string, string | null> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        data[key] = await this.getItem(key);
      })
    );

    apiLogger.info('Data exported', { keysExported: Object.keys(data).length });
    return data;
  }

  // @TODO: Add encryption/decryption methods here when implementing encryption
  // private static async encrypt(data: string, keyId: string): Promise<string> { ... }
  // private static async decrypt(encryptedData: string, keyId: string): Promise<string> { ... }
}