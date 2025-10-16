import { ConfigManager } from '../config';
import { HttpClient } from '../http';
import { PlatformAdapters } from '../../adapters';
import { CertificateManager } from '../certificates';
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
import {OfflineMaster} from "../../offline";
import {ReceiptInput} from "./types";

/**
 * Main API client that combines all resource managers
 */
export class APIClient {
  private readonly httpClient: HttpClient;
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
    adapters: PlatformAdapters,
    certificateManager?: CertificateManager,
    userProvider?: IUserProvider,
  ) {

   this.httpClient = new HttpClient(
        config,
        certificateManager,
        adapters.cache,
        adapters.networkMonitor,
        adapters.mtls,
        userProvider
    );

    // Initialize resource managers
    this.receipts = new ReceiptsAPI(
        this.httpClient,
        new OfflineMaster(
            adapters,
            (data: ReceiptInput) => this.receipts.create(data)
        )
    );

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
}