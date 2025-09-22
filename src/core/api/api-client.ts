import { ConfigManager } from '../config';
import { HttpClient } from './http-client';
import { ICacheAdapter, INetworkMonitor, IMTLSAdapter } from '../../adapters';
import { CertificateManager } from '../certificates/certificate-manager';
import { IUserProvider } from '../types';
import { ReceiptsAPI } from './receipts';
import { CashiersAPI } from './cashiers';
import { PointOfSalesAPI } from './point-of-sales';
import { CashRegistersAPI } from './cash-registers';
import { MerchantsAPI } from './merchants';
import { PemsAPI } from './pems';
import { SuppliersAPI } from './suppliers';
import { DailyReportsAPI } from './daily-reports';
import { JournalsAPI } from './journals';

/**
 * Main API client that combines all resource managers
 */
export class APIClient {
  private httpClient: HttpClient;
  private cache?: ICacheAdapter;
  private networkMonitor?: INetworkMonitor;

  // Resource managers
  public readonly receipts: ReceiptsAPI;
  public readonly cashiers: CashiersAPI;
  public readonly pointOfSales: PointOfSalesAPI;
  public readonly cashRegisters: CashRegistersAPI;
  public readonly merchants: MerchantsAPI;
  public readonly pems: PemsAPI;
  public readonly suppliers: SuppliersAPI;
  public readonly dailyReports: DailyReportsAPI;
  public readonly journals: JournalsAPI;

  constructor(
    config: ConfigManager,
    certificateManager?: CertificateManager,
    cache?: ICacheAdapter,
    networkMonitor?: INetworkMonitor,
    mtlsAdapter?: IMTLSAdapter,
    userProvider?: IUserProvider
  ) {
    this.cache = cache;
    this.networkMonitor = networkMonitor;
    this.httpClient = new HttpClient(config, certificateManager, cache, networkMonitor, mtlsAdapter, userProvider);

    // Initialize resource managers
    this.receipts = new ReceiptsAPI(this.httpClient);
    this.cashiers = new CashiersAPI(this.httpClient);
    this.pointOfSales = new PointOfSalesAPI(this.httpClient);
    this.cashRegisters = new CashRegistersAPI(this.httpClient);
    this.merchants = new MerchantsAPI(this.httpClient);
    this.pems = new PemsAPI(this.httpClient);
    this.suppliers = new SuppliersAPI(this.httpClient);
    this.dailyReports = new DailyReportsAPI(this.httpClient);
    this.journals = new JournalsAPI(this.httpClient);
  }

  /**
   * Set an authorization header for all requests
   */
  setAuthorizationHeader(token: string): void {
    this.httpClient.setAuthorizationHeader(token);
  }

  /**
   * Remove authorization header
   */
  removeAuthorizationHeader(): void {
    this.httpClient.removeAuthorizationHeader();
  }

  /**
   * Get the underlying HTTP client for advanced use cases
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }

  /**
   * Get the cache adapter if available
   */
  getCache(): ICacheAdapter | undefined {
    return this.cache;
  }

  /**
   * Check if the cache is available and enabled
   */
  isCacheEnabled(): boolean {
    return !!this.cache;
  }

  /**
   * Get the network monitor if available
   */
  getNetworkMonitor(): INetworkMonitor | undefined {
    return this.networkMonitor;
  }

  /**
   * Check if network monitoring is enabled
   */
  isNetworkMonitorEnabled(): boolean {
    return !!this.networkMonitor;
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): { isOnline: boolean; hasMonitor: boolean } {
    return this.httpClient.getNetworkStatus();
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.getNetworkStatus().isOnline;
  }

  /**
   * Get mTLS adapter if available through HttpClient
   */
  getMTLSAdapter(): IMTLSAdapter | null {
    return this.httpClient.getMTLSAdapter();
  }

  /**
   * Check if mTLS is ready
   */
  async isMTLSReady(): Promise<boolean> {
    return this.httpClient.isMTLSReady();
  }
}