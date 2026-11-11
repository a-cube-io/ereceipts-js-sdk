import {
  Receipt,
  ReceiptDetails,
  ReceiptInput,
  ReceiptListParams,
  ReceiptReturnInput,
  ReturnData,
  ReturnViaDifferentDeviceInput,
  ReturnWithProofInput,
  VoidReceiptInput,
  VoidViaDifferentDeviceInput,
  VoidWithProofInput,
} from '@/domain/entities/receipt.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IReceiptRepository {
  create(input: ReceiptInput): Promise<Receipt>;
  findById(receiptUuid: string): Promise<Receipt>;
  findAll(params: ReceiptListParams): Promise<Page<Receipt>>;
  getDetails(receiptUuid: string, format: 'json'): Promise<ReceiptDetails>;
  getDetails(receiptUuid: string, format: 'pdf'): Promise<string>;
  getDetails(receiptUuid: string, format: 'json' | 'pdf'): Promise<ReceiptDetails | string>;
  getReturnData(receiptUuid: string): Promise<ReturnData>;
  voidReceipt(input: VoidReceiptInput): Promise<Receipt>;
  voidViaDifferentDevice(input: VoidViaDifferentDeviceInput): Promise<Receipt>;
  voidWithProof(input: VoidWithProofInput): Promise<Receipt>;
  returnItems(input: ReceiptReturnInput): Promise<Receipt>;
  returnViaDifferentDevice(input: ReturnViaDifferentDeviceInput): Promise<Receipt>;
  returnWithProof(input: ReturnWithProofInput): Promise<Receipt>;
}
