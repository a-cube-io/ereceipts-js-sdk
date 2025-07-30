/**
 * Digital Signatures for A-Cube SDK
 * Provides comprehensive digital signing and verification capabilities
 */

// Custom types for enhanced type safety
type SigningKeyUsage = 'sign' | 'verify';
type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

// Extended interfaces for better type definitions
interface CustomEcdsaParams extends EcdsaParams {
  hash: HashAlgorithm;
}

interface CustomRsaPssParams {
  name: 'RSA-PSS';
  saltLength: number;
}

interface CustomEcKeyGenParams extends EcKeyGenParams {
  namedCurve: 'P-256' | 'P-384' | 'P-521';
}

interface CustomRsaHashedKeyGenParams extends RsaHashedKeyGenParams {
  hash: HashAlgorithm;
}

interface CustomEcKeyImportParams extends EcKeyImportParams {
  namedCurve: 'P-256' | 'P-384' | 'P-521';
}

interface CustomRsaHashedImportParams extends RsaHashedImportParams {
  hash: HashAlgorithm;
}

export interface SignatureConfig {
  algorithm: 'ECDSA' | 'RSA-PSS' | 'HMAC';
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512';
  curve?: 'P-256' | 'P-384' | 'P-521'; // For ECDSA
  saltLength?: number; // For RSA-PSS
  keyLength?: 2048 | 3072 | 4096; // For RSA
}

export interface DigitalSignature {
  signature: Uint8Array;
  algorithm: string;
  keyId: string;
  timestamp: number;
  metadata: {
    version: string;
    signerId?: string;
    purpose: string;
    expiresAt?: number;
  };
}

export interface SignedData {
  data: Uint8Array;
  signature: DigitalSignature;
  certificateChain?: string[]; // X.509 certificates
}

export interface VerificationResult {
  isValid: boolean;
  signerId?: string;
  timestamp: number;
  algorithm: string;
  trustLevel: 'high' | 'medium' | 'low' | 'untrusted';
  warnings: string[];
  details: {
    keyId: string;
    signatureAge: number;
    certificateValid?: boolean;
    chainOfTrust?: boolean;
  };
}

export interface SigningCertificate {
  keyId: string;
  certificate: string; // PEM format
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
}

export class DigitalSignatureManager {
  private signingKeys = new Map<string, CryptoKeyPair>();

  private certificates = new Map<string, SigningCertificate>();

  private trustedIssuers = new Set<string>();

  private config: SignatureConfig;

  constructor(config?: Partial<SignatureConfig>) {
    this.config = {
      algorithm: 'ECDSA',
      hash: 'SHA-256',
      curve: 'P-256',
      saltLength: 32,
      keyLength: 2048,
      ...config,
    };
  }

  /**
   * Generate a new signing key pair
   */
  async generateSigningKeyPair(keyId?: string): Promise<string> {
    const id = keyId || this.generateKeyId();

    let keyGenParams: CustomEcKeyGenParams | CustomRsaHashedKeyGenParams;

    if (this.config.algorithm === 'ECDSA') {
      keyGenParams = {
        name: 'ECDSA',
        namedCurve: this.config.curve!,
      } as CustomEcKeyGenParams;
    } else if (this.config.algorithm === 'RSA-PSS') {
      keyGenParams = {
        name: 'RSA-PSS',
        modulusLength: this.config.keyLength!,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: this.config.hash,
      } as CustomRsaHashedKeyGenParams;
    } else {
      throw new Error(`Unsupported signing algorithm: ${this.config.algorithm}`);
    }

    const keyPair = await crypto.subtle.generateKey(
      keyGenParams as any,
      true, // extractable
      ['sign', 'verify'] as SigningKeyUsage[],
    );

    this.signingKeys.set(id, keyPair);
    return id;
  }

  /**
   * Import signing key pair from external source
   */
  async importSigningKeyPair(
    privateKeyData: JsonWebKey | ArrayBuffer,
    publicKeyData: JsonWebKey | ArrayBuffer,
    keyId?: string,
  ): Promise<string> {
    const id = keyId || this.generateKeyId();

    let algorithmParams: CustomEcKeyImportParams | CustomRsaHashedImportParams;
    let privateFormat: 'jwk' | 'pkcs8';
    let publicFormat: 'jwk' | 'spki';

    if (this.config.algorithm === 'ECDSA') {
      algorithmParams = {
        name: 'ECDSA',
        namedCurve: this.config.curve!,
      } as CustomEcKeyImportParams;
      privateFormat = privateKeyData instanceof ArrayBuffer ? 'pkcs8' : 'jwk';
      publicFormat = publicKeyData instanceof ArrayBuffer ? 'spki' : 'jwk';
    } else if (this.config.algorithm === 'RSA-PSS') {
      algorithmParams = {
        name: 'RSA-PSS',
        hash: this.config.hash,
      } as CustomRsaHashedImportParams;
      privateFormat = privateKeyData instanceof ArrayBuffer ? 'pkcs8' : 'jwk';
      publicFormat = publicKeyData instanceof ArrayBuffer ? 'spki' : 'jwk';
    } else {
      throw new Error(`Unsupported signing algorithm: ${this.config.algorithm}`);
    }

    // Import private key
    const privateKey = await (privateFormat === 'jwk'
      ? crypto.subtle.importKey('jwk', privateKeyData as JsonWebKey, algorithmParams as any, true, ['sign'])
      : crypto.subtle.importKey('pkcs8', privateKeyData as ArrayBuffer, algorithmParams as any, true, ['sign']));

    // Import public key
    const publicKey = await (publicFormat === 'jwk'
      ? crypto.subtle.importKey('jwk', publicKeyData as JsonWebKey, algorithmParams as any, true, ['verify'])
      : crypto.subtle.importKey('spki', publicKeyData as ArrayBuffer, algorithmParams as any, true, ['verify']));

    this.signingKeys.set(id, { privateKey, publicKey });
    return id;
  }

  /**
   * Sign data with specified key
   */
  async signData(
    data: string | Uint8Array,
    keyId: string,
    options?: {
      signerId?: string;
      purpose?: string;
      expiresIn?: number; // milliseconds
    },
  ): Promise<DigitalSignature> {
    const keyPair = this.signingKeys.get(keyId);
    if (!keyPair) {
      throw new Error(`Signing key not found: ${keyId}`);
    }

    // Convert string to Uint8Array if needed
    let dataBuffer: Uint8Array;
    if (typeof data === 'string') {
      dataBuffer = new TextEncoder().encode(data);
    } else {
      dataBuffer = data;
    }

    // Prepare signing algorithm
    let signAlgorithm: CustomEcdsaParams | CustomRsaPssParams;

    if (this.config.algorithm === 'ECDSA') {
      signAlgorithm = {
        name: 'ECDSA',
        hash: this.config.hash,
      } as CustomEcdsaParams;
    } else if (this.config.algorithm === 'RSA-PSS') {
      signAlgorithm = {
        name: 'RSA-PSS',
        saltLength: this.config.saltLength!,
      } as CustomRsaPssParams;
    } else {
      throw new Error(`Unsupported signing algorithm: ${this.config.algorithm}`);
    }

    // Create signature
    const signatureBuffer = await crypto.subtle.sign(
      signAlgorithm as any,
      keyPair.privateKey,
      dataBuffer,
    );

    const timestamp = Date.now();
    const expiresAt = options?.expiresIn ? timestamp + options.expiresIn : undefined;

    return {
      signature: new Uint8Array(signatureBuffer),
      algorithm: `${this.config.algorithm}-${this.config.hash}`,
      keyId,
      timestamp,
      metadata: {
        version: '1.0.0',
        purpose: options?.purpose || 'data-integrity',
        ...(options?.signerId ? { signerId: options.signerId } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      },
    };
  }

  /**
   * Verify digital signature
   */
  async verifySignature(
    data: string | Uint8Array,
    signature: DigitalSignature,
    publicKeyId?: string,
  ): Promise<VerificationResult> {
    const keyId = publicKeyId || signature.keyId;
    const keyPair = this.signingKeys.get(keyId);

    if (!keyPair) {
      return {
        isValid: false,
        timestamp: signature.timestamp,
        algorithm: signature.algorithm,
        trustLevel: 'untrusted',
        warnings: [`Verification key not found: ${keyId}`],
        details: {
          keyId,
          signatureAge: Date.now() - signature.timestamp,
        },
      };
    }

    // Convert string to Uint8Array if needed
    let dataBuffer: Uint8Array;
    if (typeof data === 'string') {
      dataBuffer = new TextEncoder().encode(data);
    } else {
      dataBuffer = data;
    }

    // Parse algorithm from signature
    const [algorithm, hash] = signature.algorithm.split('-');

    // Prepare verification algorithm
    let verifyAlgorithm: CustomEcdsaParams | CustomRsaPssParams;

    if (algorithm === 'ECDSA') {
      verifyAlgorithm = {
        name: 'ECDSA',
        hash: hash as HashAlgorithm,
      } as CustomEcdsaParams;
    } else if (algorithm === 'RSA') {
      verifyAlgorithm = {
        name: 'RSA-PSS',
        saltLength: this.config.saltLength!,
      } as CustomRsaPssParams;
    } else {
      return {
        isValid: false,
        timestamp: signature.timestamp,
        algorithm: signature.algorithm,
        trustLevel: 'untrusted',
        warnings: [`Unsupported algorithm: ${algorithm}`],
        details: {
          keyId,
          signatureAge: Date.now() - signature.timestamp,
        },
      };
    }

    // Verify signature
    try {
      const isValid = await crypto.subtle.verify(
        verifyAlgorithm as any,
        keyPair.publicKey,
        signature.signature,
        dataBuffer,
      );

      const warnings: string[] = [];
      const signatureAge = Date.now() - signature.timestamp;

      // Check expiration
      if (signature.metadata.expiresAt && Date.now() > signature.metadata.expiresAt) {
        warnings.push('Signature has expired');
      }

      // Check age
      if (signatureAge > 30 * 24 * 60 * 60 * 1000) { // 30 days
        warnings.push('Signature is older than 30 days');
      }

      // Determine trust level
      let trustLevel: VerificationResult['trustLevel'] = 'medium';
      const certificate = this.certificates.get(keyId);

      if (certificate) {
        const now = new Date();
        if (now >= certificate.validFrom && now <= certificate.validTo) {
          if (this.trustedIssuers.has(certificate.issuer)) {
            trustLevel = 'high';
          } else {
            trustLevel = 'medium';
          }
        } else {
          trustLevel = 'low';
          warnings.push('Certificate is not valid for current date');
        }
      } else {
        trustLevel = 'low';
        warnings.push('No certificate found for verification key');
      }

      return {
        isValid,
        timestamp: signature.timestamp,
        algorithm: signature.algorithm,
        trustLevel,
        warnings,
        details: {
          keyId,
          signatureAge,
          ...(certificate ? {
            certificateValid: (new Date() >= certificate.validFrom && new Date() <= certificate.validTo),
            chainOfTrust: this.trustedIssuers.has(certificate.issuer),
          } : {}),
        },
        ...(signature.metadata.signerId ? { signerId: signature.metadata.signerId } : {}),
      };
    } catch (error) {
      return {
        isValid: false,
        timestamp: signature.timestamp,
        algorithm: signature.algorithm,
        trustLevel: 'untrusted',
        warnings: [`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: {
          keyId,
          signatureAge: Date.now() - signature.timestamp,
        },
      };
    }
  }

  /**
   * Create a signed data package
   */
  async createSignedData(
    data: string | Uint8Array,
    keyId: string,
    options?: {
      signerId?: string;
      purpose?: string;
      expiresIn?: number;
      includeCertificate?: boolean;
    },
  ): Promise<SignedData> {
    // Convert string to Uint8Array if needed
    let dataBuffer: Uint8Array;
    if (typeof data === 'string') {
      dataBuffer = new TextEncoder().encode(data);
    } else {
      dataBuffer = data;
    }

    const signature = await this.signData(dataBuffer, keyId, options);

    let certificateChain: string[] | undefined;
    if (options?.includeCertificate) {
      const certificate = this.certificates.get(keyId);
      if (certificate) {
        certificateChain = [certificate.certificate];
      }
    }

    return {
      data: dataBuffer,
      signature,
      ...(certificateChain ? { certificateChain } : {}),
    };
  }

  /**
   * Verify signed data package
   */
  async verifySignedData(signedData: SignedData): Promise<VerificationResult> {
    return this.verifySignature(signedData.data, signedData.signature);
  }

  /**
   * Import X.509 certificate
   */
  async importCertificate(
    certificatePem: string,
    privateKey: CryptoKey,
    publicKey: CryptoKey,
    keyId?: string,
  ): Promise<string> {
    const id = keyId || this.generateKeyId();

    // Parse certificate (simplified - in production, use proper X.509 parser)
    const certInfo = this.parseCertificate(certificatePem);

    const certificate: SigningCertificate = {
      keyId: id,
      certificate: certificatePem,
      privateKey,
      publicKey,
      issuer: certInfo.issuer,
      subject: certInfo.subject,
      validFrom: certInfo.validFrom,
      validTo: certInfo.validTo,
      serialNumber: certInfo.serialNumber,
      fingerprint: await this.calculateFingerprint(certificatePem),
    };

    this.certificates.set(id, certificate);
    this.signingKeys.set(id, { privateKey, publicKey });

    return id;
  }

  /**
   * Add trusted certificate issuer
   */
  addTrustedIssuer(issuerDN: string): void {
    this.trustedIssuers.add(issuerDN);
  }

  /**
   * Remove trusted certificate issuer
   */
  removeTrustedIssuer(issuerDN: string): void {
    this.trustedIssuers.delete(issuerDN);
  }

  /**
   * Get certificate information
   */
  getCertificate(keyId: string): SigningCertificate | undefined {
    return this.certificates.get(keyId);
  }

  /**
   * List all certificates
   */
  listCertificates(): SigningCertificate[] {
    return Array.from(this.certificates.values());
  }

  /**
   * Revoke certificate
   */
  revokeCertificate(keyId: string): boolean {
    const removed = this.certificates.delete(keyId);
    this.signingKeys.delete(keyId);
    return removed;
  }

  /**
   * Generate HMAC signature (for API authentication)
   */
  async generateHMAC(
    data: string | Uint8Array,
    secret: string,
    algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256',
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign'],
    );

    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
    const signature = await crypto.subtle.sign('HMAC', secretKey, dataBuffer);

    return new Uint8Array(signature);
  }

  /**
   * Verify HMAC signature
   */
  async verifyHMAC(
    data: string | Uint8Array,
    signature: Uint8Array,
    secret: string,
    algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256',
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: algorithm },
      false,
      ['verify'],
    );

    const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;

    return crypto.subtle.verify('HMAC', secretKey, signature, dataBuffer);
  }

  /**
   * Export public key in various formats
   */
  async exportPublicKey(keyId: string, format: 'spki' | 'jwk' = 'spki'): Promise<ArrayBuffer | JsonWebKey> {
    const keyPair = this.signingKeys.get(keyId);
    if (!keyPair) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (format === 'jwk') {
      return crypto.subtle.exportKey('jwk', keyPair.publicKey);
    } 
      return crypto.subtle.exportKey('spki', keyPair.publicKey);
    
  }

  /**
   * Clear all keys and certificates from memory
   */
  clearAll(): void {
    this.signingKeys.clear();
    this.certificates.clear();
    this.trustedIssuers.clear();
  }

  /**
   * Utility: Convert signature to base64
   */
  static signatureToBase64(signature: DigitalSignature): string {
    return btoa(String.fromCharCode.apply(null, Array.from(signature.signature)));
  }

  /**
   * Utility: Convert base64 to signature
   */
  static signatureFromBase64(
    base64: string,
    algorithm: string,
    keyId: string,
    timestamp: number,
    metadata: DigitalSignature['metadata'],
  ): DigitalSignature {
    const binary = atob(base64);
    const signature = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      signature[i] = binary.charCodeAt(i);
    }

    return {
      signature,
      algorithm,
      keyId,
      timestamp,
      metadata,
    };
  }

  private generateKeyId(): string {
    return `sig_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private parseCertificate(_certificatePem: string): {
    issuer: string;
    subject: string;
    validFrom: Date;
    validTo: Date;
    serialNumber: string;
  } {
    // Simplified certificate parsing - in production, use proper ASN.1/X.509 parser
    // This is a mock implementation for demonstration

    return {
      issuer: 'CN=A-Cube CA, O=A-Cube, C=IT',
      subject: 'CN=SDK Client, O=A-Cube, C=IT',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      serialNumber: Math.random().toString(16).substring(2),
    };
  }

  private async calculateFingerprint(certificatePem: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(certificatePem);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')
      .toUpperCase();
  }
}
