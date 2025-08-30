import { HttpClient, CacheRequestConfig } from './http-client';
import { 
  ReceiptInput, 
  ReceiptOutput, 
  ReceiptDetailsOutput,
  ReceiptReturnOrVoidViaPEMInput,
  ReceiptReturnOrVoidWithProofInput,
  Page, 
  ReceiptListParams
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
    this.debugEnabled = (httpClient as any).isDebugEnabled || false;

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
   * Check if user has merchant role
   */
  private hasMerchantRole(): boolean {
    const isMerchant = this.userContext?.roles.includes('ROLE_MERCHANT') || false;
    
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Merchant role check:', {
        roles: this.userContext?.roles,
        isMerchant
      });
    }
    
    return isMerchant;
  }

  /**
   * Create mTLS request configuration
   */
  private createMTLSConfig(config?: Partial<CacheRequestConfig>): CacheRequestConfig {
    return {
      authMode: 'mtls',
      port: 444, // A-Cube mTLS port
      noFallback: false, // Allow fallback for resilience
      ...config
    };
  }

  /**
   * Create a new electronic receipt (mTLS required)
   */
  async create(receiptData: ReceiptInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Creating receipt with mTLS authentication');
    }

    const config = this.createMTLSConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts', receiptData, config);
  }

  /**
   * Get a list of electronic receipts
   * ROLE_MERCHANT can use JWT, others must use mTLS
   */
  async list(params: ReceiptListParams = {}): Promise<Page<ReceiptOutput>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params.size) {
      searchParams.append('size', params.size.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf1/receipts?${query}` : '/mf1/receipts';

    // Role-based authentication logic
    const isMerchant = this.hasMerchantRole();
    
    if (isMerchant) {
      // ROLE_MERCHANT can use JWT
      if (this.debugEnabled) {
        console.log('[RECEIPTS-API] Using JWT authentication for merchant role');
      }
      
      const config: CacheRequestConfig = { 
        authMode: 'jwt' 
      };
      return this.httpClient.get<Page<ReceiptOutput>>(url, config);
    } else {
      // Other roles must use mTLS
      if (this.debugEnabled) {
        console.log('[RECEIPTS-API] Using mTLS authentication for non-merchant role');
      }
      
      const config = this.createMTLSConfig();
      return this.httpClient.get<Page<ReceiptOutput>>(url, config);
    }
  }

  /**
   * Get an electronic receipt by UUID (mTLS required)
   */
  async get(receiptUuid: string): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Getting receipt by UUID with mTLS:', receiptUuid);
    }

    const config = this.createMTLSConfig();
    return this.httpClient.get<ReceiptOutput>(`/mf1/receipts/${receiptUuid}`, config);
  }

  /**
   * Get receipt details (JSON or PDF) with mTLS
   */
  async getDetails(
    receiptUuid: string, 
    format: 'json' | 'pdf' = 'json'
  ): Promise<ReceiptDetailsOutput | Blob> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Getting receipt details with mTLS:', {
        receiptUuid,
        format
      });
    }

    const headers: Record<string, string> = {};
    const config = this.createMTLSConfig({ headers });
    
    if (format === 'pdf') {
      headers['Accept'] = 'application/pdf';
      config.headers = headers;
      
      // For PDF downloads, use download method if available
      if (typeof (this.httpClient as any).download === 'function') {
        return (this.httpClient as any).download(`/mf1/receipts/${receiptUuid}/details`, config);
      } else {
        // Fallback to regular GET for PDF
        return this.httpClient.get<Blob>(`/mf1/receipts/${receiptUuid}/details`, config);
      }
    } else {
      headers['Accept'] = 'application/json';
      config.headers = headers;
      
      return this.httpClient.get<ReceiptDetailsOutput>(
        `/mf1/receipts/${receiptUuid}/details`, 
        config
      );
    }
  }

  /**
   * Void an electronic receipt (mTLS required)
   */
  async void(voidData: ReceiptReturnOrVoidViaPEMInput): Promise<void> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Voiding receipt with mTLS');
    }

    const config = this.createMTLSConfig({
      data: voidData
    });

    await this.httpClient.delete('/mf1/receipts', config);
  }

  /**
   * Void an electronic receipt identified by proof of purchase (mTLS required)
   */
  async voidWithProof(voidData: ReceiptReturnOrVoidWithProofInput): Promise<void> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Voiding receipt with proof using mTLS');
    }

    const config = this.createMTLSConfig({
      data: voidData
    });

    await this.httpClient.delete('/mf1/receipts/void-with-proof', config);
  }

  /**
   * Return items from an electronic receipt (mTLS required)
   */
  async return(returnData: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Processing return with mTLS');
    }

    const config = this.createMTLSConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return', returnData, config);
  }

  /**
   * Return items from an electronic receipt identified by proof of purchase (mTLS required)
   */
  async returnWithProof(returnData: ReceiptReturnOrVoidWithProofInput): Promise<ReceiptOutput> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Processing return with proof using mTLS');
    }

    const config = this.createMTLSConfig();
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return-with-proof', returnData, config);
  }

  /**
   * Test mTLS connectivity for receipt operations
   */
  async testMTLSConnectivity(): Promise<{
    isConnected: boolean;
    latency?: number;
    error?: string;
  }> {
    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Testing mTLS connectivity for receipt operations');
    }

    const startTime = Date.now();

    try {
      // Test with a lightweight endpoint
      await this.list({ size: 1 });
      
      const latency = Date.now() - startTime;
      
      const result = {
        isConnected: true,
        latency
      };

      if (this.debugEnabled) {
        console.log('[RECEIPTS-API] mTLS connectivity test passed:', result);
      }

      return result;
    } catch (error) {
      const result = {
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      if (this.debugEnabled) {
        console.error('[RECEIPTS-API] mTLS connectivity test failed:', result);
      }

      return result;
    }
  }

  /**
   * Get current authentication status
   */
  async getAuthenticationStatus(): Promise<{
    mtlsAvailable: boolean;
    mtlsReady: boolean;
    userContext: UserContext | null;
    recommendedAuthMode: 'jwt' | 'mtls';
  }> {
    const mtlsStatus = await this.httpClient.getMTLSStatus();
    const isMerchant = this.hasMerchantRole();

    const status = {
      mtlsAvailable: mtlsStatus.adapterAvailable,
      mtlsReady: mtlsStatus.isReady,
      userContext: this.userContext,
      recommendedAuthMode: (isMerchant ? 'jwt' : 'mtls') as 'jwt' | 'mtls'
    };

    if (this.debugEnabled) {
      console.log('[RECEIPTS-API] Authentication status:', status);
    }

    return status;
  }
}