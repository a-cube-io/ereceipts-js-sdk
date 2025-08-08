import { HttpClient } from './http-client';
import { 
  PemCreateInput, 
  PemCreateOutput, 
  PemCertificatesOutput,
  PointOfSaleDetailedOutput
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
   * Get a specific PEM by serial number
   */
  async get(serialNumber: string): Promise<PointOfSaleDetailedOutput> {
    return this.httpClient.get<PointOfSaleDetailedOutput>(`/mf2/point-of-sales/${serialNumber}`);
  }

  /**
   * Get mTLS and signing certificates for a PEM
   */
  async getCertificates(serialNumber: string): Promise<PemCertificatesOutput> {
    return this.httpClient.get<PemCertificatesOutput>(`/mf2/point-of-sales/${serialNumber}/certificates`);
  }
}