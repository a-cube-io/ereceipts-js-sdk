import { ICertificatePort, StoredCertificate } from '@/application/ports/driven/certificate.port';
import { ISecureStoragePort } from '@/application/ports/driven/storage.port';

const CERTIFICATE_KEY = 'acube_certificate';

export class CertificateService implements ICertificatePort {
  constructor(private readonly secureStorage: ISecureStoragePort) {}

  async hasCertificate(): Promise<boolean> {
    const cert = await this.getCertificate();
    return cert !== null;
  }

  async getCertificate(): Promise<StoredCertificate | null> {
    const stored = await this.secureStorage.get(CERTIFICATE_KEY);
    if (!stored) {
      return null;
    }
    const certData = JSON.parse(stored) as StoredCertificate;
    if (!certData.certificate || !certData.privateKey) {
      return null;
    }
    return certData;
  }

  async storeCertificate(cert: string, key: string, format: 'pem' | 'p12'): Promise<void> {
    if (!cert?.trim()) {
      throw new Error('Certificate content is required');
    }
    if (!key?.trim()) {
      throw new Error('Private key is required');
    }

    const certData: StoredCertificate = {
      certificate: cert.trim(),
      privateKey: key.trim(),
      format,
      storedAt: Date.now(),
    };

    await this.secureStorage.set(CERTIFICATE_KEY, JSON.stringify(certData));
  }

  async clearCertificate(): Promise<void> {
    await this.secureStorage.remove(CERTIFICATE_KEY);
  }

  async getCertificateInfo(): Promise<{ format: string } | null> {
    const cert = await this.getCertificate();
    if (!cert) {
      return null;
    }
    return { format: cert.format };
  }
}
