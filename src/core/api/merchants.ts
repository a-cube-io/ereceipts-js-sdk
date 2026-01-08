import { HttpClient } from './http-client';
import {
  LdJsonPage,
  MerchantCreateInput,
  MerchantOutput,
  MerchantUpdateInput,
  MerchantsParams,
  PointOfSaleOutputMf2,
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

  /**
   * Retrieve Point of Sale resources for a specific merchant by Supplier logged
   */
  async listPointOfSalesBySuppliers(
    merchantUuid: string,
    params?: {
      page?: number;
    }
  ): Promise<LdJsonPage<PointOfSaleOutputMf2>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }

    const query = searchParams.toString();
    const url = query
      ? `/mf2/merchants/${merchantUuid}/point-of-sales?${query}`
      : `/mf2/merchants/${merchantUuid}/point-of-sales`;

    return this.httpClient.get<LdJsonPage<PointOfSaleOutputMf2>>(url, {
      headers: { Accept: 'application/ld+json' },
    });
  }

  /**
   *  Retrieve Point of Sale resources for a specific merchant by Merchant logged
   */
  async listPointOfSalesByMerchants(params?: {
    page?: number;
  }): Promise<LdJsonPage<PointOfSaleOutputMf2>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf1/point-of-sales?${query}` : `/mf1/point-of-sales`;

    return this.httpClient.get<LdJsonPage<PointOfSaleOutputMf2>>(url, {
      headers: { Accept: 'application/ld+json' },
    });
  }
}
