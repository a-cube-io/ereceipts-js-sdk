/**
 * Authentication Storage
 * Secure cross-platform storage for authentication tokens
 */

import { createStorageKey } from '@/storage/unified-storage';
import type { UnifiedStorage } from '@/storage/unified-storage';
import { createStorage } from '@/storage/storage-factory';
import { AdvancedEncryption } from '@/security/encryption';
import type { StoredAuthData, AuthError, AuthErrorType } from './types';
import { AuthEventType, createAuthEvent, type StorageErrorEvent } from './auth-events';
import { EventEmitter } from 'eventemitter3';

export interface AuthStorageConfig {
  storageKey: string;
  enableEncryption: boolean;
  encryptionKey?: string;
  storageAdapter?: 'indexeddb' | 'localstorage' | 'asyncstorage' | 'filesystem' | 'memory';
  autoMigrate: boolean;
}

const DEFAULT_CONFIG: AuthStorageConfig = {
  storageKey: 'acube_auth',
  enableEncryption: true,
  autoMigrate: true,
};

/**
 * Secure authentication storage with cross-platform support
 */
export class AuthStorage extends EventEmitter {
  private config: AuthStorageConfig;
  private storage: UnifiedStorage;
  private encryption: AdvancedEncryption | null = null;
  private encryptionKeyId: string | null = null;
  private memoryCache: StoredAuthData | null = null;
  private isInitialized = false;

  constructor(config: Partial<AuthStorageConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Storage will be initialized in initialize() method
    this.storage = null as any; // Temporary assignment

    // Initialize encryption if enabled
    if (this.config.enableEncryption) {
      this.encryption = new AdvancedEncryption({
        algorithm: 'AES-GCM',
        keyLength: 256,
        keyDerivation: {
          algorithm: 'PBKDF2',
          iterations: 100000,
          salt: new Uint8Array(16), // Will be generated per operation
        },
      });
    }
  }

  /**
   * Initialize storage and encryption
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize storage with appropriate adapter
      this.storage = await createStorage({
        // @ts-ignore
        preferredAdapter: this.config.storageAdapter  || 'auto',
        encryption: this.config.enableEncryption ? {
          enabled: true,
          ...(this.config.encryptionKey && { key: this.config.encryptionKey }),
        } : undefined,
        keyPrefix: 'auth',
      });

      // Generate or restore encryption key
      if (this.encryption) {
        await this.initializeEncryption();
      }

      // Auto-migrate from old storage if needed
      if (this.config.autoMigrate) {
        await this.migrateFromLegacyStorage();
      }

      this.isInitialized = true;
    } catch (error) {
      this.emitStorageError('initialize', error as Error);
      throw error;
    }
  }

  /**
   * Store authentication data securely
   */
  async store(data: StoredAuthData): Promise<void> {
    await this.ensureInitialized();

    try {
      // Update memory cache immediately
      this.memoryCache = data;

      // Prepare data for storage
      let storageData: any = data;

      // Encrypt if enabled
      if (this.encryption && this.encryptionKeyId) {
        const serialized = JSON.stringify(data);
        const encrypted = await this.encryption.encryptSymmetric(
          serialized,
          this.encryptionKeyId
        );

        storageData = {
          encrypted: true,
          data: AdvancedEncryption.encryptedDataToJSON(encrypted),
          version: '1.0',
          timestamp: Date.now(),
        };
      }

      // Store in unified storage
      const storageKey = createStorageKey(this.config.storageKey);
      await this.storage.set(storageKey, storageData, {
        ttl: data.expiresAt - Date.now(),
        encrypt: this.config.enableEncryption,
      });

      // Also store in platform-specific secure storage if available
      await this.storePlatformSpecific(data);
    } catch (error) {
      this.emitStorageError('write', error as Error);
      throw this.createAuthError(
        'STORAGE_ERROR' as AuthErrorType,
        'Failed to store authentication data',
        error
      );
    }
  }

  /**
   * Retrieve authentication data
   */
  async retrieve(): Promise<StoredAuthData | null> {
    await this.ensureInitialized();

    try {
      // Check memory cache first
      if (this.memoryCache) {
        // Validate expiration
        if (this.memoryCache.expiresAt > Date.now()) {
          return this.memoryCache;
        } else {
          // Clear expired cache
          this.memoryCache = null;
        }
      }

      // Retrieve from storage
      const storageKey = createStorageKey(this.config.storageKey);
      const storageEntry = await this.storage.get<any>(storageKey);
      if (!storageEntry) {
        // Try platform-specific storage as fallback
        return await this.retrievePlatformSpecific();
      }

      const storageData = storageEntry.data;

      // Handle encrypted data
      if (storageData.encrypted && this.encryption && this.encryptionKeyId) {
        const encrypted = AdvancedEncryption.encryptedDataFromJSON(storageData.data);
        const decrypted = await this.encryption.decryptSymmetric(encrypted);
        const data = JSON.parse(new TextDecoder().decode(decrypted)) as StoredAuthData;
        
        // Update memory cache
        this.memoryCache = data;
        return data;
      }

      // Handle unencrypted data (backward compatibility)
      if (!storageData.encrypted) {
        this.memoryCache = storageData as StoredAuthData;
        return storageData as StoredAuthData;
      }

      return null;
    } catch (error) {
      this.emitStorageError('read', error as Error);
      // Don't throw - return null to indicate no valid auth data
      return null;
    }
  }

  /**
   * Clear authentication data
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      // Clear memory cache
      this.memoryCache = null;

      // Clear from unified storage
      const storageKey = createStorageKey(this.config.storageKey);
      await this.storage.delete(storageKey);

      // Clear from platform-specific storage
      await this.clearPlatformSpecific();

      // Emit storage cleared event
      this.emit(AuthEventType.STORAGE_CLEARED, createAuthEvent(
        AuthEventType.STORAGE_CLEARED,
        { timestamp: Date.now() }
      ));
    } catch (error) {
      this.emitStorageError('delete', error as Error);
      throw this.createAuthError(
        'STORAGE_ERROR' as AuthErrorType,
        'Failed to clear authentication data',
        error
      );
    }
  }

  /**
   * Update specific fields in stored auth data
   */
  async update(updates: Partial<StoredAuthData>): Promise<void> {
    const current = await this.retrieve();
    if (!current) {
      throw this.createAuthError(
        'STORAGE_ERROR' as AuthErrorType,
        'No authentication data to update'
      );
    }

    const updated: StoredAuthData = {
      ...current,
      ...updates,
      user: updates.user ? { ...current.user, ...updates.user } : current.user,
    };

    await this.store(updated);
  }

  /**
   * Check if auth data exists and is valid
   */
  async exists(): Promise<boolean> {
    const data = await this.retrieve();
    return data !== null && data.expiresAt > Date.now();
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    hasData: boolean;
    isExpired: boolean;
    expiresIn: number | null;
    storageType: string;
    encryptionEnabled: boolean;
  }> {
    const data = await this.retrieve();
    const now = Date.now();

    return {
      hasData: data !== null,
      isExpired: data ? data.expiresAt <= now : false,
      expiresIn: data ? Math.max(0, data.expiresAt - now) : null,
      storageType: (this.config.storageAdapter || this.detectStorageAdapter()) as string,
      encryptionEnabled: this.config.enableEncryption,
    };
  }

  /**
   * Platform-specific secure storage (React Native Keychain)
   */
  private async storePlatformSpecific(data: StoredAuthData): Promise<void> {
    if (typeof window === 'undefined') return; // Node.js environment

    try {
      // React Native Keychain
      if (this.isReactNative() && this.config.enableEncryption) {
        const Keychain = await this.getKeychain();
        if (Keychain) {
          await Keychain.setInternetCredentials(
            'acube.com',
            data.user.email,
            JSON.stringify({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            })
          );
        }
      }

      // Web - use secure session storage for sensitive tokens
      if (this.isWeb() && typeof window.sessionStorage !== 'undefined') {
        // Only store non-sensitive data in session storage
        const safeData = {
          userId: data.user.id,
          expiresAt: data.expiresAt,
          roles: data.user.roles,
        };
        window.sessionStorage.setItem(`${this.config.storageKey}_session`, JSON.stringify(safeData));
      }
    } catch (error) {
      // Platform-specific storage is optional, don't throw
      console.warn('Platform-specific storage failed:', error);
    }
  }

  /**
   * Retrieve from platform-specific storage
   */
  private async retrievePlatformSpecific(): Promise<StoredAuthData | null> {
    if (typeof window === 'undefined') return null;

    try {
      // React Native Keychain
      if (this.isReactNative() && this.config.enableEncryption) {
        const Keychain = await this.getKeychain();
        if (Keychain) {
          const credentials = await Keychain.getInternetCredentials('acube.com');
          if (credentials) {
            // Reconstruct from keychain data
            // Note: This is partial data, full data should come from main storage
            return null; // Return null to force main storage retrieval
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('Platform-specific retrieval failed:', error);
      return null;
    }
  }

  /**
   * Clear platform-specific storage
   */
  private async clearPlatformSpecific(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // React Native Keychain
      if (this.isReactNative()) {
        const Keychain = await this.getKeychain();
        if (Keychain) {
          await Keychain.resetInternetCredentials('acube.com');
        }
      }

      // Web - clear session storage
      if (this.isWeb() && typeof window.sessionStorage !== 'undefined') {
        window.sessionStorage.removeItem(`${this.config.storageKey}_session`);
      }
    } catch (error) {
      console.warn('Platform-specific clear failed:', error);
    }
  }

  /**
   * Initialize encryption key
   */
  private async initializeEncryption(): Promise<void> {
    if (!this.encryption) return;

    try {
      // Try to retrieve existing key
      const keyStorageKey = createStorageKey('_auth_encryption_key');
      const keyEntry = await this.storage.get<{ keyId: string; key: string }>(keyStorageKey);
      
      if (keyEntry) {
        // Import existing key
        const keyData = keyEntry.data;
        this.encryptionKeyId = keyData.keyId;
        await this.encryption.importKey(
          this.base64ToArrayBuffer(keyData.key),
          'AES-GCM',
          keyData.keyId
        );
      } else {
        // Generate new key
        this.encryptionKeyId = await this.encryption.generateSymmetricKey();
        
        // Export and store key
        const exportedKey = await this.encryption.exportKey(this.encryptionKeyId, 'raw');
        const keyStorageKey = createStorageKey('_auth_encryption_key');
        await this.storage.set(keyStorageKey, {
          keyId: this.encryptionKeyId,
          key: this.arrayBufferToBase64(exportedKey as ArrayBuffer),
        }, { encrypt: true });
      }
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      // Disable encryption on failure
      this.encryption = null;
      this.config.enableEncryption = false;
    }
  }

  /**
   * Migrate from legacy storage formats
   */
  private async migrateFromLegacyStorage(): Promise<void> {
    try {
      // Check for legacy localStorage data
      if (this.isWeb() && typeof window.localStorage !== 'undefined') {
        const legacyData = window.localStorage.getItem('acube_auth_legacy');
        if (legacyData) {
          try {
            const parsed = JSON.parse(legacyData);
            // Convert to new format and store
            await this.store({
              ...parsed,
              version: '1.0',
              encryptedAt: Date.now(),
            });
            // Remove legacy data
            window.localStorage.removeItem('acube_auth_legacy');
          } catch {
            // Invalid legacy data, ignore
          }
        }
      }
    } catch (error) {
      console.warn('Legacy migration failed:', error);
    }
  }

  /**
   * Detect appropriate storage adapter
   */
  private detectStorageAdapter(): AuthStorageConfig['storageAdapter'] {
    // React Native
    if (this.isReactNative()) {
      return 'asyncstorage';
    }

    // Web Browser
    if (this.isWeb()) {
      // Prefer IndexedDB for better security and storage limits
      if (typeof window.indexedDB !== 'undefined') {
        return 'indexeddb';
      }
      return 'localstorage';
    }

    // Node.js
    if (typeof process !== 'undefined' && process.versions?.node) {
      return 'filesystem';
    }

    // Fallback to memory
    return 'memory';
  }

  /**
   * Platform detection helpers
   */
  private isReactNative(): boolean {
    return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  }

  private isWeb(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  }

  /**
   * Get React Native Keychain module
   */
  private async getKeychain(): Promise<any> {
    try {
      const KeychainModule = await import('react-native-keychain');
      return KeychainModule;
    } catch {
      return null;
    }
  }

  /**
   * Ensure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Emit storage error event
   */
  private emitStorageError(operation: 'read' | 'write' | 'delete' | 'clear' | 'initialize', error: Error): void {
    const event = createAuthEvent<StorageErrorEvent>(
      AuthEventType.STORAGE_ERROR,
      {
        operation,
        error,
        fallbackUsed: false,
      }
    );
    this.emit(AuthEventType.STORAGE_ERROR, event);
  }

  /**
   * Create auth error
   */
  private createAuthError(type: AuthErrorType, message: string, cause?: unknown): AuthError {
    const error: AuthError = {
      name: 'AuthError',
      type,
      message,
      timestamp: Date.now(),
      recoverable: false,
    };

    if (cause instanceof Error) {
      error.details = { cause: cause.message };
    }

    return error;
  }

  /**
   * Utility: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary);
  }

  /**
   * Utility: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const array = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  /**
   * Destroy storage instance
   */
  async destroy(): Promise<void> {
    this.memoryCache = null;
    this.removeAllListeners();
    if (this.storage) {
      await this.storage.destroy();
    }
  }
}