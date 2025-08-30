/**
 * mTLS Adapter Interface for A-Cube E-Receipt SDK
 * Provides abstraction layer for mTLS implementations across platforms
 */

export interface CertificateData {
  certificate: string;
  privateKey: string;
  format: 'PEM' | 'P12';
  password?: string; // For P12 certificates
}

export interface MTLSConnectionConfig {
  baseUrl: string;
  port?: number;
  timeout?: number;
  validateCertificate?: boolean;
}

export interface MTLSRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

export interface MTLSResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
}

/**
 * Core mTLS adapter interface
 * Implemented by platform-specific adapters (Expo, React Native, Node.js, Web)
 */
export interface IMTLSAdapter {
  /**
   * Check if mTLS is supported on current platform
   */
  isMTLSSupported(): Promise<boolean>;
  
  /**
   * Initialize the mTLS adapter with configuration
   */
  initialize(config: MTLSConnectionConfig): Promise<void>;
  
  /**
   * Configure certificates for mTLS authentication
   */
  configureCertificate(certificateData: CertificateData): Promise<void>;
  
  /**
   * Check if certificate is configured and valid
   */
  hasCertificate(): Promise<boolean>;
  
  /**
   * Get certificate information
   */
  getCertificateInfo(): Promise<CertificateInfo | null>;
  
  /**
   * Make authenticated mTLS request
   */
  request<T>(config: MTLSRequestConfig): Promise<MTLSResponse<T>>;
  
  /**
   * Test mTLS connection to endpoint
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Remove stored certificates
   */
  removeCertificate(): Promise<void>;
  
  /**
   * Get the configured mTLS base URL
   * Returns null if not initialized or configured
   */
  getBaseUrl(): string | null;
  
  /**
   * Get platform-specific information
   */
  getPlatformInfo(): {
    platform: 'react-native' | 'node' | 'web' | 'expo';
    mtlsSupported: boolean;
    certificateStorage: 'keychain' | 'keystore' | 'filesystem' | 'browser-managed' | 'memory';
    fallbackToJWT: boolean;
  };
}

/**
 * mTLS adapter factory for platform-specific implementations
 */
export interface IMTLSAdapterFactory {
  createAdapter(): Promise<IMTLSAdapter | null>;
  getPlatform(): string;
}

/**
 * Certificate validation utilities
 */
export class CertificateValidator {
  /**
   * Validate PEM certificate format
   */
  static validatePEMFormat(certificate: string, privateKey: string): boolean {
    const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/;
    const keyRegex = /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*-----END (RSA )?PRIVATE KEY-----/;
    
    return certRegex.test(certificate) && keyRegex.test(privateKey);
  }
  
  /**
   * Check if certificate is expired
   */
  static isCertificateExpired(validTo: Date): boolean {
    return new Date() > validTo;
  }
  
  /**
   * Get days until certificate expires
   */
  static getDaysUntilExpiry(validTo: Date): number {
    const now = new Date();
    const diffTime = validTo.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

/**
 * mTLS error types for better error handling
 */
export enum MTLSErrorType {
  NOT_SUPPORTED = 'MTLS_NOT_SUPPORTED',
  CERTIFICATE_NOT_FOUND = 'MTLS_CERTIFICATE_NOT_FOUND',
  CERTIFICATE_EXPIRED = 'MTLS_CERTIFICATE_EXPIRED',
  CERTIFICATE_INVALID = 'MTLS_CERTIFICATE_INVALID',
  CONNECTION_FAILED = 'MTLS_CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'MTLS_AUTHENTICATION_FAILED',
  CONFIGURATION_ERROR = 'MTLS_CONFIGURATION_ERROR'
}

export class MTLSError extends Error {
  constructor(
    public type: MTLSErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MTLSError';
  }
}

/**
 * Platform detection utilities for mTLS adapter selection
 */
export class PlatformDetector {
  /**
   * Detect current platform and return appropriate platform identifier
   */
  static detectPlatform(): 'react-native' | 'node' | 'web' {
    // React Native detection
    if (typeof global !== 'undefined' && 
        (global as any).__expo || 
        typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative') {
      return 'react-native';
    }
    
    // Node.js detection
    if (typeof process !== 'undefined' && process.versions?.node) {
      return 'node';
    }
    
    // Web browser detection (default fallback)
    return 'web';
  }

  /**
   * Check if running in React Native environment
   */
  static isReactNative(): boolean {
    return this.detectPlatform() === 'react-native';
  }

  /**
   * Check if running in Node.js environment
   */
  static isNode(): boolean {
    return this.detectPlatform() === 'node';
  }

  /**
   * Check if running in web browser environment
   */
  static isWeb(): boolean {
    return this.detectPlatform() === 'web';
  }

  /**
   * Get detailed platform information
   */
  static getPlatformDetails() {
    const platform = this.detectPlatform();
    
    return {
      platform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      nodeVersion: typeof process !== 'undefined' ? process.version : undefined,
      isExpo: typeof global !== 'undefined' && !!(global as any).__expo,
      hasWindow: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      hasProcess: typeof process !== 'undefined'
    };
  }
}

/**
 * Factory for creating platform-specific mTLS adapters
 */
export class MTLSAdapterFactory {
  private static debugEnabled = false;

  /**
   * Enable debug logging for adapter creation
   */
  static enableDebug(enabled = true): void {
    this.debugEnabled = enabled;
  }

  /**
   * Create appropriate mTLS adapter based on current platform
   */
  static async createAdapter(debugEnabled?: boolean): Promise<IMTLSAdapter | null> {
    const debug = debugEnabled ?? this.debugEnabled;
    const platform = PlatformDetector.detectPlatform();

    if (debug) {
      console.log('[MTLS-FACTORY] Creating adapter for platform:', platform);
    }

    try {
      switch (platform) {
        case 'react-native':
          const { ReactNativeMTLSAdapter } = await import('../platforms/react-native/mtls');
          return new ReactNativeMTLSAdapter(debug);

        case 'node':
          const { NodeMTLSAdapter } = await import('../platforms/node/mtls');
          return new NodeMTLSAdapter(debug);

        case 'web':
          const { WebMTLSAdapter } = await import('../platforms/web/mtls');
          return new WebMTLSAdapter(debug);

        default:
          if (debug) {
            console.warn('[MTLS-FACTORY] Unknown platform, falling back to web adapter');
          }
          const { WebMTLSAdapter: FallbackAdapter } = await import('../platforms/web/mtls');
          return new FallbackAdapter(debug);
      }
    } catch (error) {
      if (debug) {
        console.error('[MTLS-FACTORY] Failed to create mTLS adapter:', error);
      }
      return null;
    }
  }

  /**
   * Get current platform information
   */
  static getPlatform(): string {
    return PlatformDetector.detectPlatform();
  }

  /**
   * Check if mTLS is supported on current platform
   */
  static async isMTLSSupported(): Promise<boolean> {
    try {
      const adapter = await this.createAdapter();
      if (!adapter) return false;
      
      return await adapter.isMTLSSupported();
    } catch {
      return false;
    }
  }
}