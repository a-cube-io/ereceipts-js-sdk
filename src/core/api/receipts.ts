import {CacheRequestConfig, HttpClient} from './http-client';
import {
    Page,
    RECEIPT_READY,
    ReceiptDetailsOutput,
    ReceiptInput,
    ReceiptListParams,
    ReceiptOutput,
    ReceiptReturnOrVoidViaPEMInput,
    ReceiptReturnOrVoidWithProofInput
} from './types';
import {OfflineMaster} from "../../offline";

/**
 * User role information for authentication routing
 */
export interface UserContext {
  roles: string[];
  userId?: string;
  merchantId?: string;
}

/**
 * Receipts API manager with mTLS and role-based authentication
 */
export class ReceiptsAPI {
  private debugEnabled: boolean = false;
  private userContext: UserContext | null = null;

  constructor(
      private httpClient: HttpClient,
      private offlineMaster: OfflineMaster,
  ) {
    this.debugEnabled = httpClient.isDebugEnabled || true;

    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Receipts API initialized with mTLS support');
    }
  }

  /**
   * Create request configuration
   * Let MTLSHandler determine the best authentication mode based on role/platform/method
   */
  private createRequestConfig(config?: Partial<CacheRequestConfig>): CacheRequestConfig {
    return {
      authMode: 'auto', // Let MTLSHandler decide based on the authentication matrix
      ...config
    };
  }

  /**
   * Create a new electronic receipt
   * Authentication mode determined by MTLSHandler based on role/platform
   */
  async create(receiptData: ReceiptInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Creating receipt');
      console.log('[RECEIPTS-API] [OFFLINE MASTER]', this.offlineMaster);
    }

    try {
        const config = this.createRequestConfig();
        return this.httpClient.post<ReceiptOutput>('/mf1/receipts', receiptData, config)
            .then((result) => {
                this.offlineMaster.successSendReceipt()
                return result;
            })
            .catch(async (error) => {
                throw error
            });

    }catch (error){
        if (this.debugEnabled) {
            console.log('[RECEIPTS-API] Error creating receipt:', error);
            console.log('[RECEIPTS-API] [OFFLINE MASTER]', this.offlineMaster);
        }
        this.offlineMaster.beginOfflineOrEmergencyModeProcess();
        await this.offlineMaster.saveData(receiptData);
        throw error;
    }
  }

  /**
   * Get a list of electronic receipts
   * Authentication mode determined by MTLSHandler (typically JWT for GET operations)
   */
  async list(params: ReceiptListParams): Promise<Page<ReceiptOutput>> {
    const searchParams = new URLSearchParams();

    searchParams.append('page', params.page?.toString() || '1');
    searchParams.append('size', params.size?.toString() || '30');
    searchParams.append('status', params.status?.toString() || RECEIPT_READY);

    if (params.sort !== undefined && params.sort !== null) {
      searchParams.append('sort', params.sort);
    }

    if (params['document_datetime[before]'] !== undefined) {
      searchParams.append('document_datetime[before]', params['document_datetime[before]']);
    }
    if (params['document_datetime[after]'] !== undefined && params['document_datetime[after]'] !== null) {
      searchParams.append('document_datetime[after]', params['document_datetime[after]']);
    }

    const query = searchParams.toString();
    const url = `/mf1/point-of-sales/${params.serial_number}/receipts${query ? `?${query}` : ''}`;

    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Listing receipts for POS:', params.serial_number);
    }

    const config = this.createRequestConfig();
    return this.httpClient.get<Page<ReceiptOutput>>(url, config);
  }

  /**
   * Get an electronic receipt by UUID
   * Authentication mode determined by MTLSHandler based on role/platform
   */
  async get(receiptUuid: string): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Getting receipt by UUID:', receiptUuid);
    }

    const config = this.createRequestConfig();
    return this.httpClient.get<ReceiptOutput>(`/mf1/receipts/${receiptUuid}`, config);
  }

  /**
   * Get receipt details (JSON or PDF)
   * Authentication mode determined by MTLSHandler
   * PDF downloads now use mTLS with binary response support (expo-mutual-tls v1.0.3+)
   */
  async getDetails(
    receiptUuid: string,
    format: 'json' | 'pdf' = 'json'
  ): Promise<ReceiptDetailsOutput | string> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Getting receipt details:', {
        receiptUuid,
        format
      });
    }

    const headers: Record<string, string> = {};

    if (format === 'pdf') {
      headers['Accept'] = 'application/pdf';
      const config = this.createRequestConfig({
        headers,
        authMode: 'mtls', // Force mTLS for PDF downloads
        responseType: 'blob'
      });

      if (this.debugEnabled) {
        console.log('[RECEIPTS-API] Downloading PDF receipt (mTLS on mobile, JWT+:444 on web)', config);
      }

      return this.httpClient.get<string>(`/mf1/receipts/${receiptUuid}/details`, config);
    } else {
      headers['Accept'] = 'application/json';
      const config = this.createRequestConfig({ 
        headers,
        responseType: 'json',
        authMode: 'mtls' // Force mTLS for JSON responses
      });

      return this.httpClient.get<ReceiptDetailsOutput>(
        `/mf1/receipts/${receiptUuid}/details`,
        config
      );
    }
  }

  /**
   * Void an electronic receipt
   * Authentication mode determined by MTLSHandler
   */
  async void(voidData: ReceiptReturnOrVoidViaPEMInput): Promise<void> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Voiding receipt');
    }

    const config = this.createRequestConfig({
      data: voidData
    });

    await this.httpClient.delete('/mf1/receipts', config);
  }

  /**
   * Void an electronic receipt identified by proof of purchase
   * Authentication mode determined by MTLSHandler
   */
  async voidWithProof(voidData: ReceiptReturnOrVoidWithProofInput): Promise<void> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Voiding receipt with proof');
    }

    const config = this.createRequestConfig({
      data: voidData
    });

    await this.httpClient.delete('/mf1/receipts/void-with-proof', config);
  }

  /**
   * Return items from an electronic receipt
   * Authentication mode determined by MTLSHandler
   */
  async return(returnData: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Processing return');
    }

    const config = this.createRequestConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return', returnData, config);
  }

  /**
   * Return items from an electronic receipt identified by proof of purchase
   * Authentication mode determined by MTLSHandler
   */
  async returnWithProof(returnData: ReceiptReturnOrVoidWithProofInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Processing return with proof');
    }

    const config = this.createRequestConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return-with-proof', returnData, config);
  }

  /**
   * Get current authentication status
   */
  async getAuthenticationStatus(): Promise<{
    mtlsAvailable: boolean;
    mtlsReady: boolean;
    userContext: UserContext | null;
    recommendedAuthMode: 'auto';
  }> {
    const mtlsStatus = await this.httpClient.getMTLSStatus();

    const status = {
      mtlsAvailable: mtlsStatus.adapterAvailable,
      mtlsReady: mtlsStatus.isReady,
      userContext: this.userContext,
      recommendedAuthMode: 'auto' as const // Let MTLSHandler decide based on role/platform/method
    };

    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Authentication status:', status);
    }

    return status;
  }

  getOfflineReceipts(): ReceiptInput[] {
      return this.offlineMaster.getOfflineData();
  }
}