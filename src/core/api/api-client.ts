import { ConfigManager } from '../config';
import { HttpClient } from './http-client';
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

  constructor(config: ConfigManager) {
    this.httpClient = new HttpClient(config);

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
   * Set authorization header for all requests
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
}