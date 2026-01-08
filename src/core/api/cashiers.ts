import { HttpClient } from './http-client';
import { CashierCreateInput, CashierListParams, CashierOutput, Page } from './types';

/**
 * Cashiers API manager
 */
export class CashiersAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Read cashiers with pagination
   */
  async list(params: CashierListParams = {}): Promise<Page<CashierOutput>> {
    const searchParams = new URLSearchParams();

    if (params.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params.size) {
      searchParams.append('size', params.size.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf1/cashiers?${query}` : '/mf1/cashiers';

    return this.httpClient.get<Page<CashierOutput>>(url);
  }

  /**
   * Create a new cashier
   */
  async create(cashierData: CashierCreateInput): Promise<CashierOutput> {
    return this.httpClient.post<CashierOutput>('/mf1/cashiers', cashierData);
  }

  /**
   * Read currently authenticated cashier's information
   */
  async me(): Promise<CashierOutput> {
    return this.httpClient.get<CashierOutput>('/mf1/cashiers/me');
  }

  /**
   * Get a specific cashier by ID
   */
  async get(cashierId: string): Promise<CashierOutput> {
    return this.httpClient.get<CashierOutput>(`/mf1/cashiers/${cashierId}`);
  }

  /**
   * Delete a cashier
   */
  async delete(cashierId: string): Promise<void> {
    await this.httpClient.delete(`/mf1/cashiers/${cashierId}`);
  }
}
