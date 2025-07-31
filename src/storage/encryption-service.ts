/**
 * Storage Encryption Service for A-Cube SDK
 * Provides seamless encryption/decryption integration with storage adapters
 */

import { AdvancedEncryption } from '../security/encryption';
import { getRandomValues } from '../security/crypto-polyfill';
import {
  // StorageError,
  StorageEncryptionError,
} from './unified-storage';

import type {
  StorageKey,
  StorageEntry,
  StorageValue,
} from './unified-storage';

// Encryption configuration for storage
export interface StorageEncryptionConfig {
  readonly enabled: boolean;
  readonly algorithm: 'AES-GCM' | 'AES-CBC';
  readonly keyLength: 128 | 192 | 256;
  readonly keyDerivation: {
    readonly algorithm: 'PBKDF2' | 'scrypt';
    readonly iterations: number;
  };
  readonly compression: boolean;
  readonly keyRotationInterval?: number; // in milliseconds
  readonly masterPassword?: string;
  readonly keyId?: string;
}

// Encryption metadata attached to storage entries
export interface EncryptionMetadata {
  readonly encrypted: boolean;
  readonly algorithm?: string;
  readonly keyId?: string;
  readonly version: string;
  readonly checksum?: string;
}

// Key management interface
export interface EncryptionKeyManager {
  getCurrentKeyId(): Promise<string>;
  deriveKey(password: string, keyId?: string): Promise<string>;
  rotateKey(): Promise<string>;
  getKeyInfo(keyId: string): Promise<{ algorithm: string; created: number; expires?: number } | null>;
  cleanup(): Promise<number>; // Returns number of old keys removed
}

/**
 * Default key manager implementation
 */
class DefaultKeyManager implements EncryptionKeyManager {
  private currentKeyId: string | null = null;

  private keyCache = new Map<string, { keyId: string; created: number; expires?: number }>();

  constructor(
    private encryption: AdvancedEncryption,
    private config: StorageEncryptionConfig,
  ) {}

  async getCurrentKeyId(): Promise<string> {
    if (this.currentKeyId) {
      // Check if key needs rotation
      const keyInfo = this.keyCache.get(this.currentKeyId);
      if (keyInfo && this.config.keyRotationInterval) {
        const age = Date.now() - keyInfo.created;
        if (age > this.config.keyRotationInterval) {
          this.currentKeyId = await this.rotateKey();
        }
      }
      return this.currentKeyId;
    }

    // Generate or derive initial key
    if (this.config.masterPassword) {
      this.currentKeyId = await this.deriveKey(this.config.masterPassword, this.config.keyId);
    } else {
      this.currentKeyId = await this.encryption.generateSymmetricKey(this.config.keyId);
    }

    // Cache key info
    const keyInfo: any = {
      keyId: this.currentKeyId,
      created: Date.now(),
    };
    if (this.config.keyRotationInterval) {
      keyInfo.expires = Date.now() + this.config.keyRotationInterval;
    }
    this.keyCache.set(this.currentKeyId, keyInfo);

    return this.currentKeyId;
  }

  async deriveKey(password: string, keyId?: string): Promise<string> {
    const derivedKeyId = await this.encryption.deriveKeyFromPassword(password);

    const finalKeyId = keyId || derivedKeyId;
    const keyInfo2: any = {
      keyId: finalKeyId,
      created: Date.now(),
    };
    if (this.config.keyRotationInterval) {
      keyInfo2.expires = Date.now() + this.config.keyRotationInterval;
    }
    this.keyCache.set(finalKeyId, keyInfo2);

    return finalKeyId;
  }

  async rotateKey(): Promise<string> {
    const oldKeyId = this.currentKeyId;

    // Generate new key
    const newKeyId = await this.encryption.generateSymmetricKey();

    // Update current key
    this.currentKeyId = newKeyId;

    // Cache new key info
    const keyInfo3: any = {
      keyId: newKeyId,
      created: Date.now(),
    };
    if (this.config.keyRotationInterval) {
      keyInfo3.expires = Date.now() + this.config.keyRotationInterval;
    }
    this.keyCache.set(newKeyId, keyInfo3);

    // Mark old key for eventual cleanup (but keep it for decryption)
    if (oldKeyId) {
      const oldKeyInfo = this.keyCache.get(oldKeyId);
      if (oldKeyInfo) {
        this.keyCache.set(oldKeyId, {
          ...oldKeyInfo,
          expires: Date.now() + (24 * 60 * 60 * 1000), // Keep old key for 24 hours
        });
      }
    }

    return newKeyId;
  }

  async getKeyInfo(keyId: string): Promise<{ algorithm: string; created: number; expires?: number } | null> {
    const cached = this.keyCache.get(keyId);
    if (cached) {
      const info = this.encryption.getKeyInfo(keyId);
      if (info) {
        const result: any = {
          algorithm: info.algorithm,
          created: cached.created,
        };
        if (cached.expires !== undefined) {
          result.expires = cached.expires;
        }
        return result;
      }
    }
    return null;
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    const expiredKeys = Array.from(this.keyCache.entries())
      .filter(([_, info]) => info.expires && info.expires < now)
      .map(([keyId]) => keyId);

    for (const keyId of expiredKeys) {
      this.keyCache.delete(keyId);
      cleanedCount++;
    }

    return cleanedCount;
  }
}

/**
 * Storage Encryption Service
 * Handles encryption/decryption for storage adapters
 */
export class StorageEncryptionService {
  private encryption: AdvancedEncryption;

  private keyManager: EncryptionKeyManager;

  private config: StorageEncryptionConfig;

  constructor(config: Partial<StorageEncryptionConfig> = {}) {
    this.config = {
      enabled: true,
      algorithm: 'AES-GCM',
      keyLength: 256,
      keyDerivation: {
        algorithm: 'PBKDF2',
        iterations: 100000,
      },
      compression: true,
      keyRotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...config,
    };

    this.encryption = new AdvancedEncryption({
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength,
      keyDerivation: {
        algorithm: this.config.keyDerivation.algorithm,
        iterations: this.config.keyDerivation.iterations,
        salt: getRandomValues(new Uint8Array(16)),
      },
      compression: this.config.compression,
      metadata: {
        version: '2.0.0',
        timestamp: Date.now(),
        keyId: this.config.keyId || this.generateKeyId(),
      },
    });

    this.keyManager = new DefaultKeyManager(this.encryption, this.config);
  }

  /**
   * Encrypt storage value if encryption is enabled
   */
  async encryptValue<T extends StorageValue>(
    value: T,
    key: StorageKey,
    forceEncrypt: boolean = false,
  ): Promise<{ data: T | string; metadata: EncryptionMetadata }> {
    if (!this.config.enabled && !forceEncrypt) {
      return {
        data: value,
        metadata: {
          encrypted: false,
          version: '2.0.0',
        },
      };
    }

    try {
      // Serialize value for encryption
      const serialized = JSON.stringify(value);
      const keyId = await this.keyManager.getCurrentKeyId();

      // Encrypt the serialized data
      const encryptedData = await this.encryption.encryptSymmetric(serialized, keyId);

      // Convert to base64 for storage
      const encryptedString = AdvancedEncryption.encryptedDataToJSON(encryptedData);

      // Generate checksum for integrity verification
      const checksum = await this.generateChecksum(serialized);

      return {
        data: encryptedString,
        metadata: {
          encrypted: true,
          algorithm: this.config.algorithm,
          keyId,
          version: '2.0.0',
          checksum,
        },
      };
    } catch (error) {
      throw new StorageEncryptionError(key, 'encrypt', error as Error);
    }
  }

  /**
   * Decrypt storage value if it was encrypted
   */
  async decryptValue<T extends StorageValue>(
    data: T | string,
    metadata: EncryptionMetadata,
    key: StorageKey,
  ): Promise<T> {
    if (!metadata.encrypted) {
      return data as T;
    }

    try {
      // Parse encrypted data from JSON
      const encryptedData = AdvancedEncryption.encryptedDataFromJSON(data as string);

      // Decrypt the data
      const decryptedBuffer = await this.encryption.decryptSymmetric(encryptedData);
      const decryptedString = new TextDecoder().decode(decryptedBuffer);

      // Verify checksum if available
      if (metadata.checksum) {
        const actualChecksum = await this.generateChecksum(decryptedString);
        if (actualChecksum !== metadata.checksum) {
          throw new Error('Checksum verification failed - data may be corrupted');
        }
      }

      // Deserialize the decrypted data
      return JSON.parse(decryptedString) as T;
    } catch (error) {
      throw new StorageEncryptionError(key, 'decrypt', error as Error);
    }
  }

  /**
   * Process storage entry for encryption
   */
  async encryptStorageEntry<T extends StorageValue>(
    entry: StorageEntry<T>,
    forceEncrypt: boolean = false,
  ): Promise<StorageEntry<T | string>> {
    const { data, metadata: encryptionMetadata } = await this.encryptValue(
      entry.data,
      entry.metadata.key,
      forceEncrypt,
    );

    const resultMetadata: any = {
      ...entry.metadata,
      encrypted: encryptionMetadata.encrypted,
    };

    if (encryptionMetadata.checksum !== undefined) {
      resultMetadata.checksum = encryptionMetadata.checksum;
    }

    return {
      data,
      metadata: resultMetadata,
    };
  }

  /**
   * Process storage entry for decryption
   */
  async decryptStorageEntry<T extends StorageValue>(
    entry: StorageEntry<T | string>,
  ): Promise<StorageEntry<T>> {
    const encryptionMetadata: any = {
      encrypted: entry.metadata.encrypted,
      algorithm: this.config.algorithm,
      version: entry.metadata.version,
    };

    if (this.config.keyId) {
      encryptionMetadata.keyId = this.config.keyId;
    }

    if (entry.metadata.checksum !== undefined) {
      encryptionMetadata.checksum = entry.metadata.checksum;
    }

    const decryptedData = await this.decryptValue(
      entry.data,
      encryptionMetadata,
      entry.metadata.key,
    );

    return {
      data: decryptedData,
      metadata: {
        ...entry.metadata,
        encrypted: false, // Mark as decrypted for consumers
      },
    };
  }

  /**
   * Check if encryption is enabled
   */
  isEncryptionEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current encryption configuration
   */
  getConfig(): Readonly<StorageEncryptionConfig> {
    return { ...this.config };
  }

  /**
   * Update encryption configuration
   */
  async updateConfig(newConfig: Partial<StorageEncryptionConfig>): Promise<void> {
    const oldConfig = this.config;
    this.config = { ...this.config, ...newConfig };

    // If key configuration changed, regenerate encryption instance
    if (newConfig.algorithm !== oldConfig.algorithm ||
        newConfig.keyLength !== oldConfig.keyLength ||
        newConfig.keyDerivation !== oldConfig.keyDerivation) {

      this.encryption = new AdvancedEncryption({
        algorithm: this.config.algorithm,
        keyLength: this.config.keyLength,
        keyDerivation: {
          algorithm: this.config.keyDerivation.algorithm,
          iterations: this.config.keyDerivation.iterations,
          salt: getRandomValues(new Uint8Array(16)),
        },
        compression: this.config.compression,
        metadata: {
          version: '2.0.0',
          timestamp: Date.now(),
          keyId: this.config.keyId || this.generateKeyId(),
        },
      });

      // Force key rotation with new configuration
      await this.keyManager.rotateKey();
    }
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<string> {
    return this.keyManager.rotateKey();
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats(): Promise<{
    enabled: boolean;
    algorithm: string;
    keyLength: number;
    currentKeyId: string;
    keyAge: number;
    nextRotation?: number;
  }> {
    const currentKeyId = await this.keyManager.getCurrentKeyId();
    const keyInfo = await this.keyManager.getKeyInfo(currentKeyId);

    const result: any = {
      enabled: this.config.enabled,
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength,
      currentKeyId,
      keyAge: keyInfo ? Date.now() - keyInfo.created : 0,
    };

    if (keyInfo?.expires !== undefined) {
      result.nextRotation = keyInfo.expires;
    }

    return result;
  }

  /**
   * Cleanup expired keys
   */
  async cleanup(): Promise<number> {
    return this.keyManager.cleanup();
  }

  /**
   * Test encryption/decryption with sample data
   */
  async testEncryption(): Promise<boolean> {
    try {
      const testData = { test: 'encryption_test', timestamp: Date.now() };
      const testKey = 'test:encryption' as StorageKey;

      // Test encryption
      const { data: encrypted, metadata } = await this.encryptValue(testData, testKey, true);

      // Test decryption
      const decrypted = await this.decryptValue(encrypted, metadata, testKey);

      // Verify data integrity
      return JSON.stringify(testData) === JSON.stringify(decrypted);
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }

  /**
   * Generate integrity checksum
   */
  private async generateChecksum(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } 
      // Fallback for environments without Web Crypto API
      return this.simpleHash(data);
    
  }

  /**
   * Simple hash fallback for environments without crypto.subtle
   */
  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return `storage_key_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

// Export convenience functions
export const createEncryptionService = (config?: Partial<StorageEncryptionConfig>): StorageEncryptionService => new StorageEncryptionService(config);

export const createSecureEncryptionService = (masterPassword: string): StorageEncryptionService => new StorageEncryptionService({
    enabled: true,
    masterPassword,
    keyRotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
    compression: true,
  });

export const createMinimalEncryptionService = (): StorageEncryptionService => {
  const config: any = {
    enabled: true,
    algorithm: 'AES-GCM',
    keyLength: 256,
    compression: false,
  };
  // keyRotationInterval omitted for no automatic rotation

  return new StorageEncryptionService(config);
};
