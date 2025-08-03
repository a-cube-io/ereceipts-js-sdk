import { HttpClient } from './http-client';
import { 
  PemCreateInput, 
  PemCreateOutput, 
  PemCertificatesOutput 
} from './types';

/**
 * PEMs API manager (MF2)
 */
export class PemsAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Create a new PEM
   */
  async create(pemData: PemCreateInput): Promise<PemCreateOutput> {
    return this.httpClient.post<PemCreateOutput>('/mf2/point-of-sales', pemData);
  }

  /**
   * Get mTLS and signing certificates for a PEM
   */
  async getCertificates(id: string): Promise<PemCertificatesOutput> {
    return this.httpClient.get<PemCertificatesOutput>(`/mf2/point-of-sales/${id}/certificates`);
  }
}