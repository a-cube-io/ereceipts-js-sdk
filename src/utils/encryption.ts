/**
 * Encryption utilities for securing sensitive data
 * Uses Web Crypto API for encryption/decryption
 */

// Platform detection
const isWeb = typeof window !== 'undefined' && !!window.document;
const isReactNative = !isWeb && typeof global !== 'undefined';

/**
 * Encryption configuration
 */
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
}

const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96 bits for GCM
};

/**
 * Encrypted data structure
 */
interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
}

class EncryptionService {
  private static masterKey: CryptoKey | null = null;
  private static keyDerivationSalt: Uint8Array | null = null;

  /**
   * Initialize encryption service with a master password
   */
  static async initialize(masterPassword?: string): Promise<void> {
    if (!this.isCryptoAvailable()) {
      console.warn('Web Crypto API not available - encryption disabled');
      return;
    }

    try {
      // Use a default password if none provided (for SDK usage)
      const password = masterPassword ?? this.getDefaultPassword();
      
      // Generate or retrieve salt
      this.keyDerivationSalt = this.getOrCreateSalt();
      
      // Derive master key from password
      this.masterKey = await this.deriveKey(password, this.keyDerivationSalt);
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Check if Web Crypto API is available
   */
  private static isCryptoAvailable(): boolean {
    if (isWeb) {
      return !!(window.crypto?.subtle);
    } else if (isReactNative) {
      // React Native polyfills should provide crypto
      return !!(global.crypto?.subtle);
    }
    return false;
  }

  /**
   * Get or create a consistent salt for key derivation
   */
  private static getOrCreateSalt(): Uint8Array {
    const saltKey = 'encryption_salt';
    
    try {
      if (isWeb) {
        const stored = localStorage.getItem(saltKey);
        if (stored) {
          return new Uint8Array(JSON.parse(stored));
        }
      }
      
      // Generate new salt
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      if (isWeb) {
        localStorage.setItem(saltKey, JSON.stringify(Array.from(salt)));
      }
      
      return salt;
    } catch (error) {
      console.warn('Failed to manage salt, using default:', error);
      // Fallback to a deterministic salt (less secure but functional)
      const fallbackSalt = new TextEncoder().encode('acube-ereceipt-salt-v1-fallback-key');
      const saltArray = new Uint8Array(32);
      saltArray.set(fallbackSalt.slice(0, Math.min(32, fallbackSalt.length)));
      return saltArray;
    }
  }

  /**
   * Get default password for SDK usage
   */
  private static getDefaultPassword(): string {
    // In a real implementation, this could be:
    // - Device-specific identifier
    // - Hardware-based key
    // - User-provided key
    return 'acube-ereceipt-default-encryption-key-v1';
  }

  /**
   * Derive encryption key from password
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Ensure salt is compatible with Web Crypto API by creating a new Uint8Array with regular ArrayBuffer
    const saltBuffer = new Uint8Array(salt).slice();

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt sensitive data
   */
  static async encrypt(data: string): Promise<string> {
    if (!this.isCryptoAvailable() || !this.masterKey) {
      // If encryption is not available, return data as-is with a warning
      console.warn('Encryption not available - storing data in plain text');
      return data;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv,
        },
        this.masterKey,
        dataBuffer
      );

      // Encode encrypted data and IV as base64
      const encryptedData: EncryptedData = {
        data: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv.buffer),
        salt: this.arrayBufferToBase64(this.keyDerivationSalt ? new Uint8Array(this.keyDerivationSalt).buffer : new ArrayBuffer(0)),
      };

      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decrypt(encryptedData: string): Promise<string> {
    if (!this.isCryptoAvailable() || !this.masterKey) {
      // If encryption is not available, assume data is plain text
      console.warn('Encryption not available - treating as plain text');
      return encryptedData;
    }

    try {
      // Try to parse as encrypted data first
      let parsedData: EncryptedData;
      try {
        parsedData = JSON.parse(encryptedData);
        if (!parsedData.data || !parsedData.iv) {
          throw new Error('Invalid encrypted data format');
        }
      } catch {
        // If parsing fails, assume it's plain text (backward compatibility)
        console.warn('Data appears to be plain text - returning as-is');
        return encryptedData;
      }

      // Convert base64 back to ArrayBuffer
      const dataBuffer = this.base64ToArrayBuffer(parsedData.data);
      const iv = this.base64ToArrayBuffer(parsedData.iv);

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv,
        },
        this.masterKey,
        dataBuffer
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Utility: Convert ArrayBuffer to base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Check if data appears to be encrypted
   */
  static isEncrypted(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      return !!(parsed.data && parsed.iv && parsed.salt);
    } catch {
      return false;
    }
  }

  /**
   * Clear encryption keys (for security)
   */
  static clear(): void {
    this.masterKey = null;
    this.keyDerivationSalt = null;
  }
}

// Initialize encryption service on module load
EncryptionService.initialize().catch(error => {
  console.warn('Failed to auto-initialize encryption service:', error);
});

export { EncryptionService, type EncryptedData };