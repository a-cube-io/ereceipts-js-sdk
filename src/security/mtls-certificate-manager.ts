/**
 * mTLS Certificate Manager
 * Secure storage and management of mTLS certificates for POS devices
 * 
 * Features:
 * - Secure storage of certificates received from server
 * - Cross-platform certificate management
 * - Certificate validation and lifecycle management
 * - Integration with cash register endpoints
 */

import { EventEmitter } from 'eventemitter3';
import type { UnifiedStorage } from '@/storage/unified-storage';
import { createStorageKey } from '@/storage/unified-storage';
import { createStorage } from '@/storage/storage-factory';
import { AdvancedEncryption, type EncryptedData } from '@/security/encryption';
import type { CashRegisterId, SerialNumber } from '@/types/branded';

/**
 * mTLS Certificate data structure
 */
export interface MTLSCertificate {
  /** Unique identifier for the cash register */
  cashRegisterId: CashRegisterId;
  
  /** PEM serial number from the device */
  pemSerialNumber: SerialNumber;
  
  /** Human-readable name for the cash register */
  name: string;
  
  /** The actual mTLS certificate in PEM format */
  certificate: string;
  
  /** Certificate metadata */
  metadata: {
    /** When the certificate was issued */
    issuedAt: Date;
    
    /** When the certificate expires (if available) */
    expiresAt?: Date;
    
    /** Certificate authority information */
    issuer?: string;
    
    /** Certificate subject information */
    subject?: string;
    
    /** Certificate fingerprint for validation */
    fingerprint?: string;
  };
  
  /** When this certificate was stored locally */
  storedAt: Date;
  
  /** Certificate status */
  status: 'active' | 'expired' | 'revoked' | 'pending';
}

/**
 * Certificate storage data structure
 */
interface StoredCertificateData {
  certificates: Record<string, MTLSCertificate>;
  version: '1.0';
  encryptedAt: number;
}

/**
 * Certificate manager configuration
 */
export interface MTLSCertificateManagerConfig {
  /** Storage key for certificates */
  storageKey?: string;
  
  /** Enable encryption for stored certificates */
  enableEncryption?: boolean;
  
  /** Storage adapter type */
  storageAdapter?: 'memory' | 'localStorage' | 'indexedDB' | 'reactNative';
  
  /** Certificate validation options */
  validation?: {
    /** Validate certificate format */
    validateFormat?: boolean;
    
    /** Check certificate expiration */
    checkExpiration?: boolean;
    
    /** Validate certificate chain */
    validateChain?: boolean;
  };
}

/**
 * Certificate management events
 */
export interface CertificateEvents {
  'certificate:stored': { certificate: MTLSCertificate };
  'certificate:retrieved': { certificateId: string; certificate: MTLSCertificate };
  'certificate:expired': { certificateId: string; certificate: MTLSCertificate };
  'certificate:error': { error: Error; operation: string };
  'storage:error': { error: Error };
}

const DEFAULT_CONFIG: Required<MTLSCertificateManagerConfig> = {
  storageKey: 'acube_mtls_certificates',
  enableEncryption: true,
  storageAdapter: 'memory',
  validation: {
    validateFormat: true,
    checkExpiration: true,
    validateChain: false,
  },
};

/**
 * Secure mTLS Certificate Manager
 * Handles storage, retrieval, and management of mTLS certificates
 */
export class MTLSCertificateManager extends EventEmitter<CertificateEvents> {
  private config: Required<MTLSCertificateManagerConfig>;
  private storage: UnifiedStorage | null = null;
  private encryption: AdvancedEncryption | null = null;
  private initialized = false;

  constructor(config: MTLSCertificateManagerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the certificate manager
   */
  async initialize(): Promise<void> {
    try {
      // Initialize storage
      const adapterMapping: Record<string, 'indexeddb' | 'localstorage' | 'auto'> = {
        'memory': 'localstorage',
        'localStorage': 'localstorage', 
        'indexedDB': 'indexeddb',
        'reactNative': 'localstorage',
      };
      
      this.storage = await createStorage({
        preferredAdapter: adapterMapping[this.config.storageAdapter] || 'auto',
        encryption: this.config.enableEncryption ? { enabled: true } : { enabled: false },
      });

      // Initialize encryption if enabled
      if (this.config.enableEncryption) {
        this.encryption = new AdvancedEncryption();
        await this.encryption.initialize();
      }

      this.initialized = true;
    } catch (error) {
      const certificateError = new Error(`Failed to initialize certificate manager: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'initialize' });
      throw certificateError;
    }
  }

  /**
   * Store a new mTLS certificate securely
   */
  async storeCertificate(
    cashRegisterId: CashRegisterId,
    pemSerialNumber: SerialNumber,
    name: string,
    certificate: string
  ): Promise<MTLSCertificate> {
    this.ensureInitialized();

    try {
      // Parse certificate metadata
      const metadata = this.parseCertificateMetadata(certificate);
      
      // Create certificate object
      const mtlsCertificate: MTLSCertificate = {
        cashRegisterId,
        pemSerialNumber,
        name,
        certificate,
        metadata,
        storedAt: new Date(),
        status: 'active',
      };

      // Validate certificate if enabled
      if (this.config.validation.validateFormat) {
        this.validateCertificateFormat(certificate);
      }

      // Get existing certificates
      const existingData = await this.getStoredData();
      
      // Store certificate
      existingData.certificates[cashRegisterId] = mtlsCertificate;
      
      // Save to storage
      await this.saveStoredData(existingData);

      // Emit event
      this.emit('certificate:stored', { certificate: mtlsCertificate });

      return mtlsCertificate;
    } catch (error) {
      const certificateError = new Error(`Failed to store certificate: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'store' });
      throw certificateError;
    }
  }

  /**
   * Retrieve a certificate by cash register ID
   */
  async getCertificate(cashRegisterId: CashRegisterId): Promise<MTLSCertificate | null> {
    this.ensureInitialized();

    try {
      const storedData = await this.getStoredData();
      const certificate = storedData.certificates[cashRegisterId] || null;

      if (certificate) {
        // Check if certificate is expired
        if (this.config.validation.checkExpiration && this.isCertificateExpired(certificate)) {
          certificate.status = 'expired';
          await this.updateCertificateStatus(cashRegisterId, 'expired');
          this.emit('certificate:expired', { certificateId: cashRegisterId, certificate });
        }

        this.emit('certificate:retrieved', { certificateId: cashRegisterId, certificate });
      }

      return certificate;
    } catch (error) {
      const certificateError = new Error(`Failed to retrieve certificate: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'retrieve' });
      throw certificateError;
    }
  }

  /**
   * Get all stored certificates
   */
  async getAllCertificates(): Promise<MTLSCertificate[]> {
    this.ensureInitialized();

    try {
      const storedData = await this.getStoredData();
      return Object.values(storedData.certificates);
    } catch (error) {
      const certificateError = new Error(`Failed to retrieve all certificates: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'retrieveAll' });
      throw certificateError;
    }
  }

  /**
   * Update certificate status
   */
  async updateCertificateStatus(
    cashRegisterId: CashRegisterId, 
    status: MTLSCertificate['status']
  ): Promise<void> {
    this.ensureInitialized();

    try {
      const storedData = await this.getStoredData();
      const certificate = storedData.certificates[cashRegisterId];

      if (certificate) {
        certificate.status = status;
        await this.saveStoredData(storedData);
      }
    } catch (error) {
      const certificateError = new Error(`Failed to update certificate status: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'updateStatus' });
      throw certificateError;
    }
  }

  /**
   * Remove a certificate
   */
  async removeCertificate(cashRegisterId: CashRegisterId): Promise<boolean> {
    this.ensureInitialized();

    try {
      const storedData = await this.getStoredData();
      const existed = !!storedData.certificates[cashRegisterId];
      
      delete storedData.certificates[cashRegisterId];
      await this.saveStoredData(storedData);

      return existed;
    } catch (error) {
      const certificateError = new Error(`Failed to remove certificate: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'remove' });
      throw certificateError;
    }
  }

  /**
   * Clear all certificates
   */
  async clearAllCertificates(): Promise<void> {
    this.ensureInitialized();

    try {
      const emptyData: StoredCertificateData = {
        certificates: {},
        version: '1.0',
        encryptedAt: Date.now(),
      };

      await this.saveStoredData(emptyData);
    } catch (error) {
      const certificateError = new Error(`Failed to clear certificates: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'clear' });
      throw certificateError;
    }
  }

  /**
   * Get certificate storage statistics
   */
  async getStorageStats(): Promise<{
    totalCertificates: number;
    activeCertificates: number;
    expiredCertificates: number;
    storageSize: number;
    lastUpdate: Date | null;
  }> {
    this.ensureInitialized();

    try {
      const storedData = await this.getStoredData();
      const certificates = Object.values(storedData.certificates);
      
      const activeCertificates = certificates.filter(cert => cert.status === 'active').length;
      const expiredCertificates = certificates.filter(cert => cert.status === 'expired').length;
      
      // Estimate storage size (rough calculation)
      const storageSize = JSON.stringify(storedData).length;
      
      const lastUpdate = certificates.length > 0 
        ? new Date(Math.max(...certificates.map(cert => cert.storedAt.getTime())))
        : null;

      return {
        totalCertificates: certificates.length,
        activeCertificates,
        expiredCertificates,
        storageSize,
        lastUpdate,
      };
    } catch (error) {
      const certificateError = new Error(`Failed to get storage stats: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'stats' });
      throw certificateError;
    }
  }

  /**
   * Cleanup expired certificates
   */
  async cleanupExpiredCertificates(): Promise<number> {
    this.ensureInitialized();

    try {
      const storedData = await this.getStoredData();
      const certificates = Object.entries(storedData.certificates);
      let removedCount = 0;

      for (const [cashRegisterId, certificate] of certificates) {
        if (this.isCertificateExpired(certificate)) {
          delete storedData.certificates[cashRegisterId];
          removedCount++;
          this.emit('certificate:expired', { certificateId: cashRegisterId, certificate });
        }
      }

      if (removedCount > 0) {
        await this.saveStoredData(storedData);
      }

      return removedCount;
    } catch (error) {
      const certificateError = new Error(`Failed to cleanup expired certificates: ${error}`);
      this.emit('certificate:error', { error: certificateError, operation: 'cleanup' });
      throw certificateError;
    }
  }

  /**
   * Destroy the certificate manager
   */
  async destroy(): Promise<void> {
    if (this.storage) {
      await this.storage.destroy();
    }
    
    this.removeAllListeners();
    this.initialized = false;
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Certificate manager not initialized. Call initialize() first.');
    }
  }

  private async getStoredData(): Promise<StoredCertificateData> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      const storageKey = createStorageKey(this.config.storageKey);
      const result = await this.storage.get(storageKey);
      
      if (!result || !result.data) {
        return {
          certificates: {},
          version: '1.0',
          encryptedAt: Date.now(),
        };
      }

      // Handle both encrypted and unencrypted data
      const data = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      
      let parsedData: StoredCertificateData;
      
      if (this.config.enableEncryption && this.encryption) {
        try {
          const encryptedDataObj = JSON.parse(data);
          const decryptedBuffer = await this.encryption.decrypt(encryptedDataObj);
          const decryptedString = new TextDecoder().decode(decryptedBuffer);
          parsedData = JSON.parse(decryptedString);
        } catch (decryptError) {
          // Fallback to unencrypted data if decryption fails
          console.warn('Failed to decrypt certificate data, falling back to unencrypted:', decryptError);
          parsedData = JSON.parse(data);
        }
      } else {
        parsedData = JSON.parse(data);
      }

      // Convert stored dates back to Date objects
      Object.values(parsedData.certificates).forEach(cert => {
        cert.storedAt = new Date(cert.storedAt);
        cert.metadata.issuedAt = new Date(cert.metadata.issuedAt);
        if (cert.metadata.expiresAt) {
          cert.metadata.expiresAt = new Date(cert.metadata.expiresAt);
        }
      });

      return parsedData;
    } catch (error) {
      console.warn('Failed to retrieve certificate data:', error);
      return {
        certificates: {},
        version: '1.0',
        encryptedAt: Date.now(),
      };
    }
  }

  private async saveStoredData(data: StoredCertificateData): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }

    try {
      data.encryptedAt = Date.now();
      let dataToStore: string | EncryptedData = JSON.stringify(data);

      if (this.config.enableEncryption && this.encryption) {
        const encryptedData = await this.encryption.encrypt(JSON.stringify(data));
        dataToStore = JSON.stringify(encryptedData);
      }

      const storageKey = createStorageKey(this.config.storageKey);
      await this.storage.set(storageKey, dataToStore, {
        encrypt: this.config.enableEncryption,
      });
    } catch (error) {
      this.emit('storage:error', { error: error as Error });
      throw error;
    }
  }

  private parseCertificateMetadata(certificate: string): MTLSCertificate['metadata'] {
    // Basic certificate parsing - in a real implementation,
    // you might want to use a proper X.509 certificate parser
    const metadata: MTLSCertificate['metadata'] = {
      issuedAt: new Date(),
    };

    try {
      // Extract basic information from PEM certificate
      // This is a simplified parser - in production you might want to use
      // a proper certificate parsing library
      
      const certLines = certificate.split('\n');
      const certData = certLines.find(line => line.includes('Subject:'));
      if (certData) {
        metadata.subject = certData.replace('Subject:', '').trim();
      }

      const issuerData = certLines.find(line => line.includes('Issuer:'));
      if (issuerData) {
        metadata.issuer = issuerData.replace('Issuer:', '').trim();
      }

      // Create a simple fingerprint (hash of certificate)
      let hash = 0;
      for (let i = 0; i < certificate.length; i++) {
        const char = certificate.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      metadata.fingerprint = Math.abs(hash).toString(16);

    } catch (error) {
      console.warn('Failed to parse certificate metadata:', error);
    }

    return metadata;
  }

  private validateCertificateFormat(certificate: string): void {
    if (!certificate.includes('-----BEGIN CERTIFICATE-----') || 
        !certificate.includes('-----END CERTIFICATE-----')) {
      throw new Error('Invalid certificate format: must be PEM format');
    }

    // Additional format validation could be added here
  }

  private isCertificateExpired(certificate: MTLSCertificate): boolean {
    if (!certificate.metadata.expiresAt) {
      return false; // If no expiration date, assume not expired
    }

    return certificate.metadata.expiresAt.getTime() < Date.now();
  }
}