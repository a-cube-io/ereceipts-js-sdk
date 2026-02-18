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
