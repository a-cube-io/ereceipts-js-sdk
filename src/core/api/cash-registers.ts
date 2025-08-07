import { HttpClient } from './http-client';
import { 
  CashRegisterCreate, 
  CashRegisterBasicOutput, 
  CashRegisterDetailedOutput,
  Page, 
  CashRegisterListParams
} from './types';

/**
 * Cash Registers API manager
 */
export class CashRegistersAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Create a new cash register (point of sale)
   */
  async create(cashRegisterData: CashRegisterCreate): Promise<CashRegisterDetailedOutput> {
    return this.httpClient.post<CashRegisterDetailedOutput>('/mf1/cash-register', cashRegisterData);
  }

  /**
   * Get all cash registers for the current merchant
   */
  async list(params: CashRegisterListParams = {}): Promise<Page<CashRegisterBasicOutput>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params.size) {
      searchParams.append('size', params.size.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf1/cash-register?${query}` : '/mf1/cash-register';
    
    return this.httpClient.get<Page<CashRegisterBasicOutput>>(url);
  }

  /**
   * Get a cash register by ID
   */
  async get(id: string): Promise<CashRegisterBasicOutput> {
    return this.httpClient.get<CashRegisterBasicOutput>(`/mf1/cash-register/${id}`);
  }
}