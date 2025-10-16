import { ISecureStorage } from '../../adapters';
import { 
  CertificateError, 
  CertificateErrorType
} from './certificate-errors';

/**
 * Single certificate data structure - Essential fields only
 */
export interface StoredCertificate {
  certificate: string;
  privateKey: string;
  format: 'pem' | 'p12' | 'pkcs12';
}

/**
 * Certificate storage options - Only a format is configurable
 */
export interface CertificateOptions {
  format?: 'pem' | 'p12' | 'pkcs12';
}

/**
 * Certificate manager configuration
 */
export interface CertificateManagerConfig {
  storageKey?: string;
}

/**
 * Simplified Certificate Manager - Supports only ONE certificate per device
 * 
 * Key behaviors:
 * - Installing a new certificate automatically removes the existing one
 * - No certificate IDs needed - there's only one
 * - Much simpler API and storage
 */
export class CertificateManager {
  private storageKey: string;
  private isDebugEnabled: boolean = false;

  constructor(
    private storage: ISecureStorage,
    config: CertificateManagerConfig = {},
    debugEnabled: boolean = false
  ) {
    this.storageKey = config.storageKey || 'acube_certificate';
    this.isDebugEnabled = debugEnabled;

    if (this.isDebugEnabled) {
      console.log('[CERTIFICATE-MANAGER] Initialized single certificate manager:', {
        storageKey: this.storageKey
      });
    }
  }

  /**
   * Store a certificate (replaces any existing certificate)
   */
  async storeCertificate(
    certificate: string,
    privateKey: string,
    options: CertificateOptions = {}
  ): Promise<void> {
    try {
      // Validate inputs
      if (!certificate?.trim()) {
        throw new CertificateError(
          CertificateErrorType.INVALID_CERTIFICATE,
          'Certificate content is required'
        );
      }

      if (!privateKey?.trim()) {
        throw new CertificateError(
          CertificateErrorType.INVALID_PRIVATE_KEY,
          'Private key is required'
        );
      }

      // Check if the certificate already exists and warn the user
      const existingCert = await this.getCertificate().catch(() => null);
      if (existingCert) {
        if (this.isDebugEnabled) {
          console.warn('[CERTIFICATE-MANAGER] Replacing existing certificate');
        }
      }

      // Create certificate object
      const certData: StoredCertificate = {
        certificate: certificate.trim(),
        privateKey: privateKey.trim(),
        format: options.format || 'pem'
      };

      // Store the certificate (this replaces any existing one)
      await this.storage.set(this.storageKey, JSON.stringify(certData));

      if (this.isDebugEnabled) {
        console.log('[CERTIFICATE-MANAGER] Certificate stored successfully:', {
          format: certData.format,
          replacedExisting: !!existingCert
        });
      }

    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CERTIFICATE-MANAGER] Failed to store certificate:', error);
      }

      if (error instanceof CertificateError) {
        throw error;
      }

      throw new CertificateError(
        CertificateErrorType.CERTIFICATE_STORAGE_ERROR,
        `Failed to store certificate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the stored certificate (returns null if none exists)
   */
  async getCertificate(): Promise<StoredCertificate | null> {
    try {

      const stored = await this.storage.get(this.storageKey);
      
      if (!stored) {
        if (this.isDebugEnabled) {
          console.log('[CERTIFICATE-MANAGER] No certificate found in storage');
        }
        return null;
      }

      const certData: StoredCertificate = JSON.parse(stored);

      // Validate stored data structure
      if (!certData.certificate || !certData.privateKey) {
        throw new CertificateError(
          CertificateErrorType.CERTIFICATE_INVALID,
          'Stored certificate data is corrupted'
        );
      }

      if (this.isDebugEnabled) {
        console.log('[CERTIFICATE-MANAGER] Certificate retrieved:', {
          format: certData.format
        });
      }

      return certData;

    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CERTIFICATE-MANAGER] Failed to retrieve certificate:', error);
      }

      if (error instanceof CertificateError) {
        throw error;
      }

      // If JSON parsing fails, the stored data is corrupted
      if (error instanceof SyntaxError) {
        throw new CertificateError(
          CertificateErrorType.CERTIFICATE_INVALID,
          'Stored certificate data is corrupted and cannot be parsed'
        );
      }

      throw new CertificateError(
        CertificateErrorType.CERTIFICATE_STORAGE_ERROR,
        `Failed to retrieve certificate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a certificate is stored
   */
  async hasCertificate(): Promise<boolean> {
    try {
      const cert = await this.getCertificate();
      return cert !== null;
    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CERTIFICATE-MANAGER] Error checking certificate existence:', error);
      }
      return false;
    }
  }

  /**
   * Remove the stored certificate
   */
  async clearCertificate(): Promise<void> {
    try {
      await this.storage.remove(this.storageKey);

      if (this.isDebugEnabled) {
        console.log('[CERTIFICATE-MANAGER] Certificate cleared from storage');
      }

    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CERTIFICATE-MANAGER] Failed to clear certificate:', error);
      }

      throw new CertificateError(
        CertificateErrorType.CERTIFICATE_STORAGE_ERROR,
        `Failed to clear certificate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get certificate information without exposing a private key
   */
  async getCertificateInfo(): Promise<{ format: string } | null> {
    try {
      const cert = await this.getCertificate();
      
      if (!cert) {
        return null;
      }

      return {
        format: cert.format
      };

    } catch (error) {
      if (this.isDebugEnabled) {
        console.error('[CERTIFICATE-MANAGER] Failed to get certificate info:', error);
      }
      return null;
    }
  }

}