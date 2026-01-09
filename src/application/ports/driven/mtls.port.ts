export interface CertificateData {
  certificate: string;
  privateKey: string;
  format: 'PEM' | 'P12';
  password?: string;
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
  data?: unknown;
  timeout?: number;
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'text';
}

export interface MTLSResponse<T = unknown> {
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
  pemId: string;
  cashRegisterUUID: string;
}

export interface IMTLSPort {
  isMTLSSupported(): Promise<boolean>;
  initialize(config: MTLSConnectionConfig): Promise<void>;
  configureCertificate(certificateData: CertificateData): Promise<void>;
  hasCertificate(): Promise<boolean>;
  getCertificateInfo(): Promise<CertificateInfo | null>;
  request<T>(config: MTLSRequestConfig): Promise<MTLSResponse<T>>;
  testConnection(): Promise<boolean>;
  removeCertificate(): Promise<void>;
  getBaseUrl(): string | null;
  getPlatformInfo(): {
    platform: 'react-native' | 'node' | 'web' | 'expo';
    mtlsSupported: boolean;
    certificateStorage: 'keychain' | 'keystore' | 'filesystem' | 'browser-managed' | 'memory';
    fallbackToJWT: boolean;
  };
}

export interface IMTLSAdapterFactory {
  createAdapter(): Promise<IMTLSPort | null>;
  getPlatform(): string;
}

export type IMTLSAdapter = IMTLSPort;

export enum MTLSErrorType {
  NOT_SUPPORTED = 'MTLS_NOT_SUPPORTED',
  CERTIFICATE_NOT_FOUND = 'MTLS_CERTIFICATE_NOT_FOUND',
  CERTIFICATE_EXPIRED = 'MTLS_CERTIFICATE_EXPIRED',
  CERTIFICATE_INVALID = 'MTLS_CERTIFICATE_INVALID',
  CONNECTION_FAILED = 'MTLS_CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'MTLS_AUTHENTICATION_FAILED',
  CONFIGURATION_ERROR = 'MTLS_CONFIGURATION_ERROR',
}

export class MTLSError extends Error {
  constructor(
    public type: MTLSErrorType,
    message: string,
    public originalError?: Error,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'MTLSError';
  }
}

export class CertificateValidator {
  static validatePEMFormat(certificate: string, privateKey: string): boolean {
    const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/;
    const keyRegex = /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*-----END (RSA )?PRIVATE KEY-----/;
    return certRegex.test(certificate) && keyRegex.test(privateKey);
  }

  static isCertificateExpired(validTo: Date): boolean {
    return new Date() > validTo;
  }

  static getDaysUntilExpiry(validTo: Date): number {
    const now = new Date();
    const diffTime = validTo.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export class PlatformDetector {
  static detectPlatform(): 'react-native' | 'node' | 'web' {
    if (
      (typeof global !== 'undefined' && (global as { __expo?: unknown }).__expo) ||
      (typeof navigator !== 'undefined' &&
        (navigator as { product?: string }).product === 'ReactNative')
    ) {
      return 'react-native';
    }

    if (typeof process !== 'undefined' && process.versions?.node) {
      return 'node';
    }

    return 'web';
  }

  static isReactNative(): boolean {
    return this.detectPlatform() === 'react-native';
  }

  static isNode(): boolean {
    return this.detectPlatform() === 'node';
  }

  static isWeb(): boolean {
    return this.detectPlatform() === 'web';
  }

  static getPlatformDetails() {
    const platform = this.detectPlatform();

    return {
      platform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      nodeVersion: typeof process !== 'undefined' ? process.version : undefined,
      isExpo: typeof global !== 'undefined' && !!(global as { __expo?: unknown }).__expo,
      hasWindow: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      hasProcess: typeof process !== 'undefined',
    };
  }
}
