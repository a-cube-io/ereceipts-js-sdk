import { SecureTokenStorage } from './token';
import { getMTLSCertificateKey, getMTLSPrivateKeyKey } from '../constants/keys';
import { EncryptionService } from '../utils/encryption';

export interface MTLSCertificate {
  uuid: string;
  certificate: string;
  privateKey?: string;
  createdAt: string;
  expiresAt?: string;
}

export class CertificateStorage {
  /**
   * Store mTLS certificate securely
   */
  static async storeMTLSCertificate(
    uuid: string, 
    certificate: string,
    privateKey?: string
  ): Promise<void> {
    try {
      // Encrypt the certificate data
      const encryptedCertificate = await EncryptionService.encrypt(certificate);
      const encryptedPrivateKey = privateKey ? await EncryptionService.encrypt(privateKey) : undefined;
      
      const certData: MTLSCertificate = {
        uuid,
        certificate: encryptedCertificate,
        privateKey: encryptedPrivateKey,
        createdAt: new Date().toISOString(),
      };

      const certKey = getMTLSCertificateKey(uuid);
      await SecureTokenStorage.setItem(certKey, JSON.stringify(certData));
    } catch (error) {
      console.error('Failed to store MTLS certificate:', error);
      throw new Error('Failed to securely store certificate');
    }
  }

  /**
   * Retrieve mTLS certificate
   */
  static async getMTLSCertificate(uuid: string): Promise<MTLSCertificate | null> {
    try {
      const certKey = getMTLSCertificateKey(uuid);
      const certDataStr = await SecureTokenStorage.getItem(certKey);
      
      if (!certDataStr) {
        return null;
      }

      const encryptedCertData = JSON.parse(certDataStr) as MTLSCertificate;
      
      // Decrypt the certificate data
      const decryptedCertificate = await EncryptionService.decrypt(encryptedCertData.certificate);
      const decryptedPrivateKey = encryptedCertData.privateKey 
        ? await EncryptionService.decrypt(encryptedCertData.privateKey) 
        : undefined;

      return {
        ...encryptedCertData,
        certificate: decryptedCertificate,
        privateKey: decryptedPrivateKey,
      };
    } catch (error) {
      console.warn(`Failed to retrieve certificate for ${uuid}:`, error);
      return null;
    }
  }

  /**
   * Remove mTLS certificate
   */
  static async removeMTLSCertificate(uuid: string): Promise<void> {
    const certKey = getMTLSCertificateKey(uuid);
    const privateKeyKey = getMTLSPrivateKeyKey(uuid);
    
    await Promise.all([
      SecureTokenStorage.removeItem(certKey),
      SecureTokenStorage.removeItem(privateKeyKey),
    ]);
  }

  /**
   * List all stored certificates
   */
  static async listCertificates(): Promise<MTLSCertificate[]> {
    // This is a simplified implementation
    // In a real scenario, you might want to maintain an index of certificate UUIDs
    try {
      const certificates: MTLSCertificate[] = [];
      
      // Note: This is a placeholder implementation
      // In practice, you'd need to maintain a list of certificate UUIDs
      // or iterate through storage keys (platform-specific)

      // generate fake data waiting time
      //@Todo: Replace with actual storage key retrieval logic
      await new Promise(resolve => setTimeout(resolve, 1000));

      return certificates;
    } catch (error) {
      console.warn('Failed to list certificates:', error);
      return [];
    }
  }

  /**
   * Check if certificate exists
   */
  static async hasCertificate(uuid: string): Promise<boolean> {
    const certificate = await this.getMTLSCertificate(uuid);
    return certificate !== null;
  }

  /**
   * Validate certificate (basic checks)
   */
  static async validateCertificate(uuid: string): Promise<boolean> {
    const certificate = await this.getMTLSCertificate(uuid);
    
    if (!certificate) {
      return false;
    }

    // Basic validation
    if (!certificate.certificate || certificate.certificate.trim() === '') {
      return false;
    }

    // Check expiry if available
    if (certificate.expiresAt) {
      const expiryDate = new Date(certificate.expiresAt);
      if (expiryDate < new Date()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parse certificate information (basic implementation)
   */
  static parseCertificateInfo(certificatePEM: string): {
    subject?: string;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    fingerprint?: string;
  } {
    // This is a placeholder implementation
    // In a real scenario, you'd use a proper certificate parsing library
    try {
      // Basic extraction from PEM format
      const cert = certificatePEM.replace(/-----BEGIN CERTIFICATE-----/, '')
                                 .replace(/-----END CERTIFICATE-----/, '')
                                 .replace(/\s/g, '');
      
      return {
        fingerprint: cert.substring(0, 40), // Simplified fingerprint
        // Other fields would be extracted using proper certificate parsing
      };
    } catch (error) {
      console.warn('Failed to parse certificate:', error);
      return {};
    }
  }

  /**
   * Clear all certificates
   */
  static async clearAllCertificates(): Promise<void> {
    const certificates = await this.listCertificates();
    await Promise.all(
      certificates.map(cert => this.removeMTLSCertificate(cert.uuid))
    );
  }
}