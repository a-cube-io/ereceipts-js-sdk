import { HttpClient } from './http-client';
import { SupplierCreateInput, SupplierOutput, SupplierUpdateInput, SuppliersParams } from './types';

/**
 * Suppliers API manager (MF2)
 */
export class SuppliersAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Retrieve the collection of Supplier resources
   */
  async list(params: SuppliersParams): Promise<SupplierOutput[]> {
    const searchParams = new URLSearchParams();

    if (params.page) {
      searchParams.append('page', params.page.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf2/suppliers?${query}` : '/mf2/suppliers';

    return this.httpClient.get<SupplierOutput[]>(url);
  }

  /**
   * Create a Supplier resource
   */
  async create(supplierData: SupplierCreateInput): Promise<SupplierOutput> {
    return this.httpClient.post<SupplierOutput>('/mf2/suppliers', supplierData);
  }

  /**
   * Retrieve a Supplier resource by UUID
   */
  async get(uuid: string): Promise<SupplierOutput> {
    return this.httpClient.get<SupplierOutput>(`/mf2/suppliers/${uuid}`);
  }

  /**
   * Replace the Supplier resource
   */
  async update(uuid: string, supplierData: SupplierUpdateInput): Promise<SupplierOutput> {
    return this.httpClient.put<SupplierOutput>(`/mf2/suppliers/${uuid}`, supplierData);
  }

  /**
   * Delete a Supplier resource
   */
  async delete(uuid: string): Promise<void> {
    return this.httpClient.delete(`/mf2/suppliers/${uuid}`);
  }
}
