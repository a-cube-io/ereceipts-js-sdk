import {
  ReceiptApiOutput,
  ReceiptDetailsApiOutput,
  ReceiptMapper,
  ReturnableReceiptItemApiOutput,
} from '@/application/dto/receipt.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  Receipt,
  ReceiptDetails,
  ReceiptInput,
  ReceiptListParams,
  ReceiptReturnInput,
  ReturnViaDifferentDeviceInput,
  ReturnWithProofInput,
  ReturnableReceiptItem,
  VoidReceiptInput,
  VoidViaDifferentDeviceInput,
  VoidWithProofInput,
} from '@/domain/entities/receipt.entity';
import { IReceiptRepository } from '@/domain/repositories/receipt.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class ReceiptRepositoryImpl implements IReceiptRepository {
  constructor(private readonly http: IHttpPort) {}

  async create(input: ReceiptInput): Promise<Receipt> {
    const apiInput = ReceiptMapper.toApiInput(input);
    const response = await this.http.post<ReceiptApiOutput>('/mf1/receipts', apiInput);
    return ReceiptMapper.fromApiOutput(response.data);
  }

  async findById(receiptUuid: string): Promise<Receipt> {
    const response = await this.http.get<ReceiptApiOutput>(`/mf1/receipts/${receiptUuid}`);
    return ReceiptMapper.fromApiOutput(response.data);
  }

  async findAll(params: ReceiptListParams): Promise<Page<Receipt>> {
    const queryParams = ReceiptMapper.toListParams(params);
    const response = await this.http.get<Page<ReceiptApiOutput>>(
      `/mf1/point-of-sales/${params.serialNumber}/receipts`,
      { params: queryParams }
    );
    return ReceiptMapper.pageFromApi(response.data);
  }

  async getDetails(receiptUuid: string, format: 'json'): Promise<ReceiptDetails>;
  async getDetails(receiptUuid: string, format: 'pdf'): Promise<Blob>;
  async getDetails(receiptUuid: string, format: 'json' | 'pdf'): Promise<ReceiptDetails | Blob> {
    if (format === 'pdf') {
      const response = await this.http.get<Blob>(`/mf1/receipts/${receiptUuid}/details`, {
        headers: { Accept: 'application/pdf' },
        responseType: 'blob',
      });
      return response.data;
    }
    const response = await this.http.get<ReceiptDetailsApiOutput>(
      `/mf1/receipts/${receiptUuid}/details`,
      { headers: { Accept: 'application/json' } }
    );
    return ReceiptMapper.fromApiDetailsOutput(response.data);
  }

  async getReturnableItems(receiptUuid: string): Promise<ReturnableReceiptItem[]> {
    const response = await this.http.get<ReturnableReceiptItemApiOutput[]>(
      `/mf1/receipts/${receiptUuid}/returnable-items`
    );
    return response.data.map((item) => ReceiptMapper.returnableItemFromApi(item));
  }

  async voidReceipt(input: VoidReceiptInput): Promise<void> {
    const apiInput = ReceiptMapper.voidInputToApi(input);
    await this.http.delete('/mf1/receipts', { data: apiInput });
  }

  async voidViaDifferentDevice(input: VoidViaDifferentDeviceInput): Promise<void> {
    const apiInput = ReceiptMapper.voidViaDifferentDeviceToApi(input);
    await this.http.delete('/mf1/receipts/void-via-different-device', { data: apiInput });
  }

  async voidWithProof(input: VoidWithProofInput): Promise<void> {
    const apiInput = ReceiptMapper.voidWithProofToApi(input);
    await this.http.delete('/mf1/receipts/void-with-proof', { data: apiInput });
  }

  async returnItems(input: ReceiptReturnInput): Promise<Receipt> {
    const apiInput = ReceiptMapper.returnInputToApi(input);
    const response = await this.http.post<ReceiptApiOutput>('/mf1/receipts/return', apiInput);
    return ReceiptMapper.fromApiOutput(response.data);
  }

  async returnViaDifferentDevice(input: ReturnViaDifferentDeviceInput): Promise<Receipt> {
    const apiInput = ReceiptMapper.returnViaDifferentDeviceToApi(input);
    const response = await this.http.post<ReceiptApiOutput>(
      '/mf1/receipts/return-via-different-device',
      apiInput
    );
    return ReceiptMapper.fromApiOutput(response.data);
  }

  async returnWithProof(input: ReturnWithProofInput): Promise<Receipt> {
    const apiInput = ReceiptMapper.returnWithProofToApi(input);
    const response = await this.http.post<ReceiptApiOutput>(
      '/mf1/receipts/return-with-proof',
      apiInput
    );
    return ReceiptMapper.fromApiOutput(response.data);
  }
}
