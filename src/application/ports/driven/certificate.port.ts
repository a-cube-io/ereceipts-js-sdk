export interface StoredCertificate {
  certificate: string;
  privateKey: string;
  format: 'pem' | 'p12';
  storedAt: number;
  /** Certificate material lives in the browser keystore, not in app storage */
  browserManaged?: boolean;
}

export interface ICertificatePort {
  hasCertificate(): Promise<boolean>;
  getCertificate(): Promise<StoredCertificate | null>;
  storeCertificate(cert: string, key: string, format: 'pem' | 'p12'): Promise<void>;
  storeBrowserManagedCertificate(format?: 'pem' | 'p12'): Promise<void>;
  clearCertificate(): Promise<void>;
  getCertificateInfo(): Promise<{ format: string; browserManaged?: boolean } | null>;
}
