/**
 * Advanced Encryption Layer for A-Cube SDK
 * Provides comprehensive encryption, decryption, and key management
 */

// Web Crypto API types are declared in signatures.ts

export interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'AES-CBC' | 'RSA-OAEP';
  keyLength: 128 | 192 | 256 | 2048 | 4096;
  keyDerivation: {
    algorithm: 'PBKDF2' | 'scrypt' | 'Argon2';
    iterations: number;
    salt: Uint8Array;
  };
  compression: boolean;
  metadata: {
    version: string;
    timestamp: number;
    keyId: string;
  };
}

export interface EncryptedData {
  data: Uint8Array;
  iv: Uint8Array;
  authTag?: Uint8Array;
  metadata: EncryptionConfig['metadata'];
  algorithm: string;
}

export interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  keyId: string;
  algorithm: string;
  extractable: boolean;
  usages: KeyUsage[];
}

export class AdvancedEncryption {
  private keys = new Map<string, CryptoKey>();
  private keyPairs = new Map<string, CryptoKeyPair>();
  private config: EncryptionConfig;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      keyDerivation: {
        algorithm: 'PBKDF2',
        iterations: 100000,
        salt: crypto.getRandomValues(new Uint8Array(16)),
      },
      compression: true,
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        keyId: this.generateKeyId(),
      },
      ...config,
    };
  }

  /**
   * Generate a new symmetric encryption key
   */
  async generateSymmetricKey(keyId?: string): Promise<string> {
    const id = keyId || this.generateKeyId();
    
    const key = await crypto.subtle.generateKey(
      {
        name: this.config.algorithm,
        length: this.config.keyLength,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    this.keys.set(id, key);
    return id;
  }

  /**
   * Generate a new asymmetric key pair
   */
  async generateKeyPair(algorithm: 'RSA-OAEP' | 'ECDSA' = 'RSA-OAEP', keyId?: string): Promise<string> {
    const id = keyId || this.generateKeyId();
    
    let keyGenParams: RsaHashedKeyGenParams | EcKeyGenParams;
    let usages: KeyUsage[];

    if (algorithm === 'RSA-OAEP') {
      keyGenParams = {
        name: 'RSA-OAEP',
        modulusLength: this.config.keyLength as 2048 | 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      };
      usages = ['encrypt', 'decrypt'];
    } else {
      keyGenParams = {
        name: 'ECDSA',
        namedCurve: 'P-256',
      };
      usages = ['sign', 'verify'];
    }

    const keyPair = await crypto.subtle.generateKey(
      keyGenParams,
      true, // extractable
      usages
    );

    const cryptoKeyPair: CryptoKeyPair = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      keyId: id,
      algorithm,
      extractable: true,
      usages,
    };

    this.keyPairs.set(id, cryptoKeyPair);
    return id;
  }

  /**
   * Derive key from password using PBKDF2
   */
  async deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<string> {
    const keyId = this.generateKeyId();
    const usedSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: usedSalt,
        iterations: this.config.keyDerivation.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.config.algorithm,
        length: this.config.keyLength,
      },
      true,
      ['encrypt', 'decrypt']
    );

    this.keys.set(keyId, derivedKey);
    
    // Update salt in config for later use
    this.config.keyDerivation.salt = usedSalt;
    
    return keyId;
  }

  /**
   * Encrypt data with symmetric key
   */
  async encryptSymmetric(data: string | Uint8Array, keyId: string): Promise<EncryptedData> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    // Convert string to Uint8Array if needed
    let dataBuffer: Uint8Array;
    if (typeof data === 'string') {
      dataBuffer = new TextEncoder().encode(data);
    } else {
      dataBuffer = data;
    }

    // Optionally compress data
    if (this.config.compression) {
      dataBuffer = await this.compressData(dataBuffer);
    }

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.config.algorithm,
        iv: iv,
      },
      key,
      dataBuffer
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    
    // For GCM, the auth tag is included in the encrypted data
    const authTag = this.config.algorithm === 'AES-GCM' 
      ? encryptedArray.slice(-16) // Last 16 bytes
      : undefined;
    
    const ciphertext = this.config.algorithm === 'AES-GCM'
      ? encryptedArray.slice(0, -16) // All but last 16 bytes
      : encryptedArray;

    return {
      data: ciphertext,
      iv,
      metadata: {
        ...this.config.metadata,
        keyId,
      },
      algorithm: this.config.algorithm,
      ...(authTag ? { authTag } : {}),
    };
  }

  /**
   * Decrypt data with symmetric key
   */
  async decryptSymmetric(encryptedData: EncryptedData): Promise<Uint8Array> {
    const key = this.keys.get(encryptedData.metadata.keyId);
    if (!key) {
      throw new Error(`Decryption key not found: ${encryptedData.metadata.keyId}`);
    }

    // Reconstruct full encrypted buffer for GCM
    let fullEncryptedBuffer: Uint8Array;
    if (encryptedData.algorithm === 'AES-GCM' && encryptedData.authTag) {
      fullEncryptedBuffer = new Uint8Array(encryptedData.data.length + encryptedData.authTag.length);
      fullEncryptedBuffer.set(encryptedData.data);
      fullEncryptedBuffer.set(encryptedData.authTag, encryptedData.data.length);
    } else {
      fullEncryptedBuffer = encryptedData.data;
    }

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: encryptedData.algorithm,
        iv: encryptedData.iv,
      },
      key,
      fullEncryptedBuffer
    );

    let result = new Uint8Array(decryptedBuffer);

    // Decompress if compression was used
    if (this.config.compression) {
      result = new Uint8Array(await this.decompressData(result));
    }

    return result;
  }

  /**
   * Encrypt data with asymmetric key (RSA-OAEP)
   */
  async encryptAsymmetric(data: string | Uint8Array, keyId: string): Promise<EncryptedData> {
    const keyPair = this.keyPairs.get(keyId);
    if (!keyPair || keyPair.algorithm !== 'RSA-OAEP') {
      throw new Error(`RSA encryption key not found: ${keyId}`);
    }

    // Convert string to Uint8Array if needed
    let dataBuffer: Uint8Array;
    if (typeof data === 'string') {
      dataBuffer = new TextEncoder().encode(data);
    } else {
      dataBuffer = data;
    }

    // RSA-OAEP has size limitations, so we might need to chunk large data
    const maxChunkSize = Math.floor((this.config.keyLength as number) / 8) - 42; // OAEP padding overhead
    
    if (dataBuffer.length > maxChunkSize) {
      throw new Error(`Data too large for RSA encryption. Max size: ${maxChunkSize} bytes`);
    }

    // Encrypt with public key
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      keyPair.publicKey,
      dataBuffer
    );

    return {
      data: new Uint8Array(encryptedBuffer),
      iv: new Uint8Array(0), // Not used in RSA
      metadata: {
        ...this.config.metadata,
        keyId,
      },
      algorithm: 'RSA-OAEP',
    };
  }

  /**
   * Decrypt data with asymmetric key (RSA-OAEP)
   */
  async decryptAsymmetric(encryptedData: EncryptedData): Promise<Uint8Array> {
    const keyPair = this.keyPairs.get(encryptedData.metadata.keyId);
    if (!keyPair || keyPair.algorithm !== 'RSA-OAEP') {
      throw new Error(`RSA decryption key not found: ${encryptedData.metadata.keyId}`);
    }

    // Decrypt with private key
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      keyPair.privateKey,
      encryptedData.data
    );

    return new Uint8Array(decryptedBuffer);
  }

  /**
   * Export key for storage or transmission
   */
  async exportKey(keyId: string, format: 'raw' | 'pkcs8' | 'spki' | 'jwk' = 'jwk'): Promise<JsonWebKey | ArrayBuffer> {
    const symmetricKey = this.keys.get(keyId);
    if (symmetricKey) {
      if (format === 'jwk') {
        return await crypto.subtle.exportKey('jwk', symmetricKey) as JsonWebKey;
      } else {
        return await crypto.subtle.exportKey(format as 'raw', symmetricKey) as ArrayBuffer;
      }
    }

    const keyPair = this.keyPairs.get(keyId);
    if (keyPair) {
      // Export public key by default, private key requires special handling
      if (format === 'jwk') {
        return await crypto.subtle.exportKey('jwk', keyPair.publicKey) as JsonWebKey;
      } else {
        return await crypto.subtle.exportKey(format as 'spki', keyPair.publicKey) as ArrayBuffer;
      }
    }

    throw new Error(`Key not found: ${keyId}`);
  }

  /**
   * Import key from external source
   */
  async importKey(
    keyData: JsonWebKey | ArrayBuffer,
    algorithm: string,
    keyId?: string,
    usages: KeyUsage[] = ['encrypt', 'decrypt']
  ): Promise<string> {
    const id = keyId || this.generateKeyId();

    let algorithmParams: any;
    let format: 'raw' | 'pkcs8' | 'spki' | 'jwk';

    if (algorithm === 'AES-GCM') {
      algorithmParams = { name: 'AES-GCM' };
      format = keyData instanceof ArrayBuffer ? 'raw' : 'jwk';
    } else if (algorithm === 'RSA-OAEP') {
      algorithmParams = {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      };
      format = keyData instanceof ArrayBuffer ? 'spki' : 'jwk';
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const importedKey = await (format === 'jwk'
      ? crypto.subtle.importKey('jwk', keyData as JsonWebKey, algorithmParams, true, usages)
      : crypto.subtle.importKey(format as 'raw' | 'spki', keyData as ArrayBuffer, algorithmParams, true, usages));

    if (algorithm === 'AES-GCM') {
      this.keys.set(id, importedKey);
    } else {
      // For asymmetric keys, we need both public and private keys
      // This is a simplified version - in practice, you'd handle key pairs properly
      throw new Error('Asymmetric key import not fully implemented');
    }

    return id;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKey(oldKeyId: string): Promise<string> {
    const oldKey = this.keys.get(oldKeyId);
    const oldKeyPair = this.keyPairs.get(oldKeyId);

    if (!oldKey && !oldKeyPair) {
      throw new Error(`Key not found for rotation: ${oldKeyId}`);
    }

    // Generate new key
    let newKeyId: string;
    if (oldKey) {
      newKeyId = await this.generateSymmetricKey();
    } else {
      const algorithm = oldKeyPair!.algorithm as 'RSA-OAEP' | 'ECDSA';
      newKeyId = await this.generateKeyPair(algorithm);
    }

    // Keep old key for a transition period (implementation detail)
    // In practice, you'd have a more sophisticated key rotation strategy

    return newKeyId;
  }

  /**
   * Get key information
   */
  getKeyInfo(keyId: string): { algorithm: string; usages: string[]; extractable: boolean } | null {
    const symmetricKey = this.keys.get(keyId);
    if (symmetricKey) {
      return {
        algorithm: symmetricKey.algorithm.name,
        usages: Array.from(symmetricKey.usages),
        extractable: symmetricKey.extractable,
      };
    }

    const keyPair = this.keyPairs.get(keyId);
    if (keyPair) {
      return {
        algorithm: keyPair.algorithm,
        usages: keyPair.usages,
        extractable: keyPair.extractable,
      };
    }

    return null;
  }

  /**
   * List all available keys
   */
  listKeys(): Array<{ keyId: string; type: 'symmetric' | 'asymmetric'; algorithm: string }> {
    const keys: Array<{ keyId: string; type: 'symmetric' | 'asymmetric'; algorithm: string }> = [];

    for (const [keyId, key] of this.keys.entries()) {
      keys.push({
        keyId,
        type: 'symmetric',
        algorithm: key.algorithm.name,
      });
    }

    for (const [keyId, keyPair] of this.keyPairs.entries()) {
      keys.push({
        keyId,
        type: 'asymmetric',
        algorithm: keyPair.algorithm,
      });
    }

    return keys;
  }

  /**
   * Clear all keys from memory
   */
  clearKeys(): void {
    this.keys.clear();
    this.keyPairs.clear();
  }

  /**
   * Utility: Convert Uint8Array to base64
   */
  static arrayBufferToBase64(buffer: Uint8Array): string {
    const binary = String.fromCharCode.apply(null, Array.from(buffer));
    return btoa(binary);
  }

  /**
   * Utility: Convert base64 to Uint8Array
   */
  static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  /**
   * Utility: Convert encrypted data to JSON
   */
  static encryptedDataToJSON(encryptedData: EncryptedData): string {
    return JSON.stringify({
      data: this.arrayBufferToBase64(encryptedData.data),
      iv: this.arrayBufferToBase64(encryptedData.iv),
      authTag: encryptedData.authTag ? this.arrayBufferToBase64(encryptedData.authTag) : undefined,
      metadata: encryptedData.metadata,
      algorithm: encryptedData.algorithm,
    });
  }

  /**
   * Utility: Convert JSON to encrypted data
   */
  static encryptedDataFromJSON(json: string): EncryptedData {
    const obj = JSON.parse(json);
    return {
      data: this.base64ToArrayBuffer(obj.data),
      iv: this.base64ToArrayBuffer(obj.iv),
      metadata: obj.metadata,
      algorithm: obj.algorithm,
      ...(obj.authTag ? { authTag: this.base64ToArrayBuffer(obj.authTag) } : {}),
    };
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async compressData(data: Uint8Array): Promise<Uint8Array> {
    // Simple compression using CompressionStream if available
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(data);
      writer.close();

      const chunks: Uint8Array[] = [];
      let result;
      while (!(result = await reader.read()).done) {
        chunks.push(result.value);
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const compressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return compressed;
    }

    // Fallback: return original data
    return data;
  }

  private async decompressData(data: Uint8Array): Promise<Uint8Array> {
    // Simple decompression using DecompressionStream if available
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(data);
      writer.close();

      const chunks: Uint8Array[] = [];
      let result;
      while (!(result = await reader.read()).done) {
        chunks.push(result.value);
      }

      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const decompressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      return decompressed;
    }

    // Fallback: return original data
    return data;
  }
}