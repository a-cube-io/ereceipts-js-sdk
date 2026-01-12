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
import { Page } from '@/domain/value-objects/page.vo';

export interface IReceiptRepository {
  create(input: ReceiptInput): Promise<Receipt>;
  findById(receiptUuid: string): Promise<Receipt>;
  findAll(params: ReceiptListParams): Promise<Page<Receipt>>;
  getDetails(receiptUuid: string, format: 'json'): Promise<ReceiptDetails>;
  getDetails(receiptUuid: string, format: 'pdf'): Promise<Blob>;
  getDetails(receiptUuid: string, format: 'json' | 'pdf'): Promise<ReceiptDetails | Blob>;
  getReturnableItems(receiptUuid: string): Promise<ReturnableReceiptItem[]>;
  voidReceipt(input: VoidReceiptInput): Promise<void>;
  voidViaDifferentDevice(input: VoidViaDifferentDeviceInput): Promise<void>;
  voidWithProof(input: VoidWithProofInput): Promise<void>;
  returnItems(input: ReceiptReturnInput): Promise<Receipt>;
  returnViaDifferentDevice(input: ReturnViaDifferentDeviceInput): Promise<Receipt>;
  returnWithProof(input: ReturnWithProofInput): Promise<Receipt>;
}
