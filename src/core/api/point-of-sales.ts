import { HttpClient } from './http-client';
import { 
  PointOfSaleOutput, 
  PointOfSaleDetailedOutput,
  ActivationRequest,
  PEMStatusOfflineRequest,
  PEMStatus,
  Page 
} from './types';

/**
 * Point of Sales API manager
 */
export class PointOfSalesAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Retrieve Point of Sales (PEMs)
   */
  async list(params: { 
    status?: PEMStatus; 
    page?: number; 
    size?: number;
  } = {}): Promise<Page<PointOfSaleOutput>> {
    const searchParams = new URLSearchParams();
    
    if (params.status) {
      searchParams.append('status', params.status);
    }
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params.size) {
      searchParams.append('size', params.size.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf1/point-of-sales?${query}` : '/mf1/point-of-sales';
    
    return this.httpClient.get<Page<PointOfSaleOutput>>(url);
  }

  /**
   * Get a specific Point of Sale by serial number
   */
  async get(serialNumber: string): Promise<PointOfSaleDetailedOutput> {
    return this.httpClient.get<PointOfSaleDetailedOutput>(`/mf1/point-of-sales/${serialNumber}`);
  }

  /**
   * Close journal
   */
  async closeJournal(): Promise<any> {
    return this.httpClient.post('/mf1/point-of-sales/close');
  }

  /**
   * Trigger the activation process of a Point of Sale
   */
  async activate(serialNumber: string, activationData: ActivationRequest): Promise<any> {
    return this.httpClient.post(`/mf1/point-of-sales/${serialNumber}/activation`, activationData);
  }

  /**
   * Create a new inactivity period
   */
  async createInactivityPeriod(serialNumber: string): Promise<any> {
    return this.httpClient.post(`/mf1/point-of-sales/${serialNumber}/inactivity`);
  }

  /**
   * Change the state of the Point of Sale to 'offline'
   */
  async setOffline(serialNumber: string, offlineData: PEMStatusOfflineRequest): Promise<any> {
    return this.httpClient.post(`/mf1/point-of-sales/${serialNumber}/status/offline`, offlineData);
  }
}