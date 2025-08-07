import { HttpClient } from './http-client';
import { 
  MerchantOutput, 
  MerchantCreateInput, 
  MerchantUpdateInput, 
  MerchantsParams
} from './types';

/**
 * Merchants API manager (MF2)
 */
export class MerchantsAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Retrieve the collection of Merchant resources
   */
  async list(params: MerchantsParams): Promise<MerchantOutput[]> {
    const searchParams = new URLSearchParams();
    
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf2/merchants?${query}` : '/mf2/merchants';
    
    return this.httpClient.get<MerchantOutput[]>(url);
  }

  /**
   * Create a Merchant resource
   */
  async create(merchantData: MerchantCreateInput): Promise<MerchantOutput> {
    return this.httpClient.post<MerchantOutput>('/mf2/merchants', merchantData);
  }

  /**
   * Retrieve a Merchant resource by UUID
   */
  async get(uuid: string): Promise<MerchantOutput> {
    return this.httpClient.get<MerchantOutput>(`/mf2/merchants/${uuid}`);
  }

  /**
   * Replace the Merchant resource
   */
  async update(uuid: string, merchantData: MerchantUpdateInput): Promise<MerchantOutput> {
    return this.httpClient.put<MerchantOutput>(`/mf2/merchants/${uuid}`, merchantData);
  }
}