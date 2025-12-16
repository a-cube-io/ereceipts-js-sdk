import { HttpClient, CacheRequestConfig } from './http-client';
import {
  ReceiptInput,
  ReceiptOutput,
  ReceiptDetailsOutput,
  ReceiptReturnOrVoidViaPEMInput,
  ReceiptReturnOrVoidWithProofInput,
  Page,
  ReceiptListParams,
  ReceiptReturnInput,
  VoidReceiptInput,
  ReturnableReceiptItem,
  RECEIPT_SENT
} from './types';

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

  constructor(private httpClient: HttpClient) {
    this.debugEnabled = httpClient.isDebugEnabled || true;

    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Receipts API initialized with mTLS support');
    }
  }

  /**
   * Set user context for role-based authentication
   */
  setUserContext(context: UserContext): void {
    this.userContext = context;
    
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] User context set:', {
        roles: context.roles,
        userId: context.userId,
        merchantId: context.merchantId
      });
    }
  }


  /**
   * Create request configuration
   * Let MTLSHandler determine the best authentication mode based on role/platform/method
   */
  private createRequestConfig(config?: Partial<CacheRequestConfig>): CacheRequestConfig {
    return {
      authMode: 'auto', // Let MTLSHandler decide based on authentication matrix
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
    }

    const config = this.createRequestConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts', receiptData, config);
  }

  /**
   * Get a list of electronic receipts
   * Authentication mode determined by MTLSHandler (typically JWT for GET operations)
   */
  async list(params: ReceiptListParams): Promise<Page<ReceiptOutput>> {
    const searchParams = new URLSearchParams();

    searchParams.append('page', params.page?.toString() || '1');
    searchParams.append('size', params.size?.toString() || '30');
    searchParams.append('status', params.status?.toString() || RECEIPT_SENT);
    searchParams.append('document_number', params.document_number?.toString() || '');

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
   * ✅ PDF downloads now use mTLS with binary response support (expo-mutual-tls v1.0.3+)
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
   * Void an electronic receipt via same pos
   */
  async voidViaSamePos(voidData: VoidReceiptInput): Promise<void> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Voiding receipt via same pos');
    }

    const config = this.createRequestConfig();

    await this.httpClient.delete('/mf1/receipts', voidData, config);
  }

  /**
   * Void an electronic receipt via different pos
   */
  async voidViaDifferentPos(voidData: ReceiptReturnOrVoidViaPEMInput): Promise<void> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Voiding receipt via different pos');
    }

    const config = this.createRequestConfig();
1
    await this.httpClient.delete('/mf1/receipts/void-via-different-pos', voidData, config);
  }

  /**
   * Void an electronic receipt identified by proof of purchase
   */
  async voidWithProof(voidData: ReceiptReturnOrVoidWithProofInput): Promise<void> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Voiding receipt with proof');
    }

    const config = this.createRequestConfig();

    await this.httpClient.delete('/mf1/receipts/void-with-proof', voidData, config);
  }

  /**
   * Return an electronic receipt via same pos
   */
  async return(returnData: ReceiptReturnInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Processing return via same pos');
    }

    const config = this.createRequestConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return', returnData, config);
  }

  /**
   * get returnable items for a receipt
   */
  async getReturnableItems(receiptUuid: string): Promise<ReturnableReceiptItem[]> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Getting returnable items for receipt UUID:', receiptUuid);
    }

    const config = this.createRequestConfig();
    return this.httpClient.get<ReturnableReceiptItem[]>(`/mf1/receipts/${receiptUuid}/returnable-items`, config);
  }

  /**
   * Return items from an electronic receipt via different pos
   */
  async returnViaDifferentPos(returnData: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Processing return via different pos');
    }

    const config = this.createRequestConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return-via-different-pos', returnData, config);
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
}