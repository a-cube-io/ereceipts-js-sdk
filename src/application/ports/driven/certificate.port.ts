export interface StoredCertificate {
  certificate: string;
  privateKey: string;
  format: 'pem' | 'p12';
  storedAt: number;
}

export interface ICertificatePort {
  hasCertificate(): Promise<boolean>;
  getCertificate(): Promise<StoredCertificate | null>;
  storeCertificate(cert: string, key: string, format: 'pem' | 'p12'): Promise<void>;
  clearCertificate(): Promise<void>;
  getCertificateInfo(): Promise<{ format: string } | null>;
}
