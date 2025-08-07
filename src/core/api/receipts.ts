import { HttpClient } from './http-client';
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
 * Receipts API manager
 */
export class ReceiptsAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Create a new electronic receipt
   */
  async create(receiptData: ReceiptInput): Promise<ReceiptOutput> {
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts', receiptData);
  }

  /**
   * Get a list of electronic receipts
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
    
    return this.httpClient.get<Page<ReceiptOutput>>(url);
  }

  /**
   * Get an electronic receipt by UUID
   */
  async get(receiptUuid: string): Promise<ReceiptOutput> {
    return this.httpClient.get<ReceiptOutput>(`/mf1/receipts/${receiptUuid}`);
  }

  /**
   * Get receipt details (JSON or PDF)
   */
  async getDetails(
    receiptUuid: string, 
    format: 'json' | 'pdf' = 'json'
  ): Promise<ReceiptDetailsOutput | Blob> {
    const headers: Record<string, string> = {};
    
    if (format === 'pdf') {
      headers['Accept'] = 'application/pdf';
      return this.httpClient.download(`/mf1/receipts/${receiptUuid}/details`, { headers });
    } else {
      headers['Accept'] = 'application/json';
      return this.httpClient.get<ReceiptDetailsOutput>(`/mf1/receipts/${receiptUuid}/details`, { headers });
    }
  }

  /**
   * Void an electronic receipt
   */
  async void(voidData: ReceiptReturnOrVoidViaPEMInput): Promise<void> {
    await this.httpClient.delete('/mf1/receipts', {
      data: voidData,
    });
  }

  /**
   * Void an electronic receipt identified by proof of purchase
   */
  async voidWithProof(voidData: ReceiptReturnOrVoidWithProofInput): Promise<void> {
    await this.httpClient.delete('/mf1/receipts/void-with-proof', {
      data: voidData,
    });
  }

  /**
   * Return items from an electronic receipt
   */
  async return(returnData: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput> {
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return', returnData);
  }

  /**
   * Return items from an electronic receipt identified by proof of purchase
   */
  async returnWithProof(returnData: ReceiptReturnOrVoidWithProofInput): Promise<ReceiptOutput> {
    return this.httpClient.post<ReceiptOutput>('/mf1/receipts/return-with-proof', returnData);
  }
}