/**
 * Advanced Security Layer for A-Cube SDK
 * Complete security suite with encryption, digital signatures, and key rotation
 */

import { KeyRotationManager, type KeyRotationConfig } from './key-rotation';
// Import classes for internal use
import { AdvancedEncryption, type EncryptedData, type EncryptionConfig } from './encryption';
import { type SignatureConfig, type DigitalSignature, DigitalSignatureManager, type VerificationResult } from './signatures';

// Re-export everything for external use
export {
  AdvancedEncryption,
  type EncryptedData,
  type CryptoKeyPair,
  type EncryptionConfig,
} from './encryption';

export {
  type KeyBackup,
  type KeyVersion,
  KeyRotationManager,
  type RotationEvent,
  type KeyRotationConfig,
} from './key-rotation';

export {
  type SignedData,
  type SignatureConfig,
  type DigitalSignature,
  DigitalSignatureManager,
  type VerificationResult,
  type SigningCertificate,
} from './signatures';

/**
 * Comprehensive Security Manager
 * Integrates all security components into a unified interface
 */
export class SecurityManager {
  private encryption: AdvancedEncryption;

  private signatures: DigitalSignatureManager;

  private keyRotation: KeyRotationManager;

  constructor(config?: {
    encryption?: Partial<EncryptionConfig>;
    signatures?: Partial<SignatureConfig>;
    keyRotation?: Partial<KeyRotationConfig>;
  }) {
    this.encryption = new AdvancedEncryption(config?.encryption);
    this.signatures = new DigitalSignatureManager(config?.signatures);
    this.keyRotation = new KeyRotationManager(
      this.encryption,
      this.signatures,
      config?.keyRotation,
    );
  }

  /**
   * Get encryption manager
   */
  getEncryption(): AdvancedEncryption {
    return this.encryption;
  }

  /**
   * Get signature manager
   */
  getSignatures(): DigitalSignatureManager {
    return this.signatures;
  }

  /**
   * Get key rotation manager
   */
  getKeyRotation(): KeyRotationManager {
    return this.keyRotation;
  }

  /**
   * Initialize security with master keys
   */
  async initialize(): Promise<{
    encryptionKeyId: string;
    signingKeyId: string;
  }> {
    // Generate master encryption key
    const encryptionKeyId = await this.encryption.generateSymmetricKey();

    // Generate master signing key pair
    const signingKeyId = await this.signatures.generateSigningKeyPair();

    // Register keys for rotation
    await this.keyRotation.registerKey(
      encryptionKeyId,
      'AES-GCM-256',
      'master_encryption',
      'production',
    );

    await this.keyRotation.registerKey(
      signingKeyId,
      'ECDSA-P256',
      'master_signing',
      'production',
    );

    return { encryptionKeyId, signingKeyId };
  }

  /**
   * Secure data with encryption and signature
   */
  async secureData(
    data: string | Uint8Array,
    encryptionKeyId: string,
    signingKeyId: string,
  ): Promise<{
    encryptedData: EncryptedData;
    signature: DigitalSignature;
  }> {
    // Record key usage
    this.keyRotation.recordKeyUsage(encryptionKeyId);
    this.keyRotation.recordKeyUsage(signingKeyId);

    // Encrypt data
    const encryptedData = await this.encryption.encryptSymmetric(data, encryptionKeyId);

    // Sign encrypted data
    const signature = await this.signatures.signData(
      encryptedData.data,
      signingKeyId,
      { purpose: 'data-integrity' },
    );

    return { encryptedData, signature };
  }

  /**
   * Verify and decrypt secured data
   */
  async verifyAndDecrypt(
    encryptedData: EncryptedData,
    signature: DigitalSignature,
  ): Promise<{
    data: Uint8Array;
    verification: VerificationResult;
  }> {
    // Verify signature first
    const verification = await this.signatures.verifySignature(
      encryptedData.data,
      signature,
    );

    if (!verification.isValid) {
      throw new Error(`Signature verification failed: ${verification.warnings.join(', ')}`);
    }

    // Decrypt data
    const data = await this.encryption.decryptSymmetric(encryptedData);

    return { data, verification };
  }

  /**
   * Get security status
   */
  getSecurityStatus(): {
    encryption: {
      totalKeys: number;
      algorithms: string[];
    };
    signatures: {
      totalKeys: number;
      certificates: number;
      trustedIssuers: number;
    };
    keyRotation: {
      totalKeys: number;
      activeKeys: number;
      upcomingRotations: number;
      totalRotations: number;
    };
  } {
    const encryptionKeys = this.encryption.listKeys();
    const certificates = this.signatures.listCertificates();
    const rotationStats = this.keyRotation.getRotationStatistics();

    return {
      encryption: {
        totalKeys: encryptionKeys.length,
        algorithms: [...new Set(encryptionKeys.map(k => k.algorithm))],
      },
      signatures: {
        totalKeys: encryptionKeys.filter(k => k.type === 'asymmetric').length,
        certificates: certificates.length,
        trustedIssuers: 0, // Would need access to private property
      },
      keyRotation: {
        totalKeys: rotationStats.totalKeys,
        activeKeys: rotationStats.activeKeys,
        upcomingRotations: rotationStats.upcomingRotations,
        totalRotations: rotationStats.totalRotations,
      },
    };
  }

  /**
   * Emergency security reset
   */
  async emergencyReset(): Promise<void> {
    // Clear all keys from memory
    this.encryption.clearKeys();
    this.signatures.clearAll();

    // This would also clear rotation schedules and backups
    // In a real implementation, you'd want more granular control
    console.warn('Emergency security reset performed - all keys cleared');
  }
}

/**
 * Security utilities
 */
export const SecurityUtils = {
  /**
   * Generate secure random bytes
   */
  generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  },

  /**
   * Generate secure random string
   */
  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = this.generateRandomBytes(length);
    return Array.from(randomBytes)
      .map(byte => chars[byte % chars.length])
      .join('');
  },

  /**
   * Calculate SHA-256 hash
   */
  async calculateHash(data: string | Uint8Array): Promise<Uint8Array> {
    const buffer = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return new Uint8Array(hashBuffer);
  },

  /**
   * Constant-time comparison to prevent timing attacks
   */
  constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= (a[i] || 0) ^ (b[i] || 0);
    }

    return result === 0;
  },

  /**
   * Convert bytes to hex string
   */
  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Convert hex string to bytes
   */
  hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  },

  /**
   * Generate UUID v4
   */
  generateUUID(): string {
    const randomBytes = this.generateRandomBytes(16);

    // Set version (4) and variant bits
    randomBytes[6] = ((randomBytes[6] || 0) & 0x0f) | 0x40;
    randomBytes[8] = ((randomBytes[8] || 0) & 0x3f) | 0x80;

    const hex = this.bytesToHex(randomBytes);
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32),
    ].join('-');
  },

  /**
   * Validate security configuration
   */
  validateSecurityConfig(config: any): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Check encryption settings
    if (config.encryption) {
      if (config.encryption.keyLength < 256) {
        warnings.push('Encryption key length should be at least 256 bits');
      }

      if (config.encryption.algorithm === 'AES-CBC') {
        warnings.push('AES-GCM is recommended over AES-CBC for better security');
      }
    }

    // Check signature settings
    if (config.signatures) {
      if (config.signatures.algorithm === 'RSA-PSS' && config.signatures.keyLength < 2048) {
        warnings.push('RSA key length should be at least 2048 bits');
        isValid = false;
      }
    }

    // Check rotation settings
    if (config.keyRotation) {
      if (config.keyRotation.rotationInterval > 90 * 24 * 60 * 60 * 1000) {
        warnings.push('Key rotation interval longer than 90 days is not recommended');
      }

      if (!config.keyRotation.backup?.enabled) {
        warnings.push('Key backup should be enabled for production environments');
      }
    }

    return { isValid, warnings };
  },
};
