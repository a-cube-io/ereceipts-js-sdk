import { GoodOrService, VatRateCode } from '@/domain/value-objects/vat-code.vo';

export type ReceiptType = 'sale' | 'return' | 'void';

export interface ReceiptItem {
  type?: GoodOrService;
  quantity: string;
  description: string;
  unitPrice: string;
  vatRateCode?: VatRateCode;
  simplifiedVatAllocation?: boolean;
  discount?: string;
  isDownPaymentOrVoucherRedemption?: boolean;
  complimentary?: boolean;
}

export interface ReceiptReturnItem {
  id: number;
  quantity: string;
}

export interface ReturnableReceiptItem {
  id: number;
  type?: GoodOrService;
  quantity: string;
  returnedQuantity: string;
  description: string;
  unitPrice: string;
  vatRateCode?: VatRateCode;
}

export interface Receipt {
  uuid: string;
  type: ReceiptType;
  createdAt: string;
  totalAmount: string;
  documentNumber: string;
  documentDatetime?: string;
  isReturnable: boolean;
  isVoidable: boolean;
  pdfUrl?: string;
  parentReceiptUuid?: string;
}

export interface ReceiptDetails extends Receipt {
  customerLotteryCode?: string;
  vatNumber: string;
  totalTaxableAmount: string;
  totalUncollectedAmount: string;
  deductibleAmount: string;
  totalVatAmount: string;
  totalDiscount: string;
  totalGrossDiscount: string;
  discount: string;
  items?: ReceiptItem[];
}

export interface ReceiptInput {
  items: ReceiptItem[];
  customerTaxCode?: string;
  customerLotteryCode?: string;
  discount?: string;
  invoiceIssuing?: boolean;
  uncollectedDcrToSsn?: boolean;
  servicesUncollectedAmount?: string;
  goodsUncollectedAmount?: string;
  cashPaymentAmount?: string;
  electronicPaymentAmount?: string;
  ticketRestaurantPaymentAmount?: string;
  ticketRestaurantQuantity?: number;
}

export interface ReceiptReturnInput {
  items: ReceiptReturnItem[];
  documentNumber: string;
}

/**
 * Input for voiding a receipt from the same POS
 * DELETE /mf1/receipts
 */
export interface VoidReceiptInput {
  documentNumber: string;
}

/**
 * Input for voiding a receipt via a different device (PEM)
 * DELETE /mf1/receipts/void-via-different-device
 */
export interface VoidViaDifferentDeviceInput {
  posId: string;
  items: ReceiptItem[];
  documentNumber: string;
  documentDatetime: string;
  lotteryCode?: string;
}

export type ReceiptProofType = 'POS' | 'VR' | 'ND';

/**
 * Input for voiding a receipt with proof
 * DELETE /mf1/receipts/void-with-proof
 */
export interface VoidWithProofInput {
  items: ReceiptItem[];
  proof: ReceiptProofType;
  documentDatetime: string;
}

/**
 * Input for returning items via a different device (PEM)
 * POST /mf1/receipts/return-via-different-device
 */
export interface ReturnViaDifferentDeviceInput {
  posId: string;
  items: ReceiptItem[];
  documentNumber: string;
  documentDatetime: string;
  lotteryCode?: string;
}

/**
 * Input for returning items with proof
 * POST /mf1/receipts/return-with-proof
 */
export interface ReturnWithProofInput {
  items: ReceiptItem[];
  proof: ReceiptProofType;
  documentDatetime: string;
}

export const RECEIPT_READY = 'ready';
export const RECEIPT_SENT = 'sent';
export type ReceiptStatus = typeof RECEIPT_READY | typeof RECEIPT_SENT;

export const RECEIPT_SORT_DESCENDING = 'descending';
export const RECEIPT_SORT_ASCENDING = 'ascending';
export type ReceiptSortOrder = typeof RECEIPT_SORT_DESCENDING | typeof RECEIPT_SORT_ASCENDING;

export interface ReceiptListParams {
  serialNumber: string;
  page?: number;
  size?: number;
  status?: ReceiptStatus;
  sort?: ReceiptSortOrder;
  documentNumber?: string;
  documentDatetimeBefore?: string;
  documentDatetimeAfter?: string | null;
}
