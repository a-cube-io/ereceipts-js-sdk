import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { ICertificatePort, StoredCertificate } from '@/application/ports/driven/certificate.port';
import { ISecureStoragePort } from '@/application/ports/driven/storage.port';

const CERTIFICATE_KEY = 'acube_certificate';

export type CertificateState = 'idle' | 'loading' | 'stored' | 'error';

export class CertificateService implements ICertificatePort {
  private readonly certificateSubject = new BehaviorSubject<StoredCertificate | null>(null);
  private readonly stateSubject = new BehaviorSubject<CertificateState>('idle');
  private readonly destroy$ = new Subject<void>();

  get certificate$(): Observable<StoredCertificate | null> {
    return this.certificateSubject.asObservable();
  }

  get hasCertificate$(): Observable<boolean> {
    return this.certificateSubject.pipe(
      map((cert) => cert !== null),
      distinctUntilChanged()
    );
  }

  get state$(): Observable<CertificateState> {
    return this.stateSubject.asObservable();
  }

  constructor(private readonly secureStorage: ISecureStoragePort) {}

  async hasCertificate(): Promise<boolean> {
    const cert = await this.getCertificate();
    return cert !== null;
  }

  async getCertificate(): Promise<StoredCertificate | null> {
    this.stateSubject.next('loading');

    const stored = await this.secureStorage.get(CERTIFICATE_KEY);
    if (!stored) {
      this.stateSubject.next('idle');
      return null;
    }

    const certData = JSON.parse(stored) as StoredCertificate;
    if (!certData.certificate || !certData.privateKey) {
      this.stateSubject.next('idle');
      return null;
    }

    this.certificateSubject.next(certData);
    this.stateSubject.next('stored');
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
    this.certificateSubject.next(certData);
    this.stateSubject.next('stored');
  }

  async clearCertificate(): Promise<void> {
    await this.secureStorage.remove(CERTIFICATE_KEY);
    this.certificateSubject.next(null);
    this.stateSubject.next('idle');
  }

  async getCertificateInfo(): Promise<{ format: string } | null> {
    const cert = await this.getCertificate();
    if (!cert) {
      return null;
    }
    return { format: cert.format };
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
