import { GoodOrService, NatureCode, VatRateCode } from '@/domain/value-objects/vat-code.vo';

export type ReceiptType = 'sale' | 'return' | 'void';

export type VoucherPaymentType = 'meal_vouchers' | 'other_vouchers';

export type PaymentType =
  | 'cash'
  | 'electronic'
  | VoucherPaymentType
  | 'discount'
  | 'uncollected_goods'
  | 'uncollected_services'
  | 'rounding_up'
  | 'rounding_down';

interface BasePaymentDetail {
  description?: string;
  amount: string;
}

// voucher payments require the number of vouchers
export type PaymentDetail =
  | (BasePaymentDetail & {
      type: Exclude<PaymentType, VoucherPaymentType>;
      voucherCount?: never;
    })
  | (BasePaymentDetail & {
      type: VoucherPaymentType;
      voucherCount: number;
    });

export type ReturnPaymentType =
  | 'cash'
  | 'electronic'
  | 'vouchers'
  | 'discount'
  | 'uncollected_goods'
  | 'uncollected_services';

// amount is gross, max 2 decimals; voucherCount is required (>= 1) only for vouchers
export type ReturnPaymentDetail =
  | {
      type: Exclude<ReturnPaymentType, 'vouchers'>;
      amount: string;
      voucherCount?: never;
    }
  | {
      type: 'vouchers';
      amount: string;
      voucherCount: number;
    };

export interface ReceiptItem {
  type?: GoodOrService;
  quantity: string;
  description: string;
  unitPrice: string;
  vatRateCode?: VatRateCode;
  simplifiedVatAllocation?: boolean;
  discount?: string;
  surcharge?: string;
  prepaidOrVoucher?: boolean;
  complimentary?: boolean;
  atecoCode?: string;
}

export interface ReceiptReturnItem {
  id: number;
  quantity: string;
}

export interface ReturnableReceiptItem {
  id: number;
  type?: GoodOrService;
  /** Original quantity of the sale receipt item */
  quantity: string;
  /** Quantity already returned. Still returnable: quantity - returnedQuantity */
  returnedQuantity: string;
  description: string;
  unitPrice: string;
  /** Undefined with simplified VAT allocation (Ventilazione IVA) */
  vatRateCode?: VatRateCode;
  simplifiedVatAllocation: boolean;
  discount: string;
  surcharge: string;
  prepaidOrVoucher: boolean;
  complimentary: boolean;
  atecoCode?: string;
}

export interface ReturnableLottery {
  twoDimensionalLotteryCode?: string;
  lotteryCode?: string;
}

export interface ReturnableSummaryVat {
  vatRate: string;
  /** VAT amount still returnable for the summary */
  totalVatAmount: string;
}

/**
 * Amounts still returnable for a summary (Riepilogo) block of the sale receipt,
 * i.e. net of the ones already returned. Amounts are net of VAT, except with
 * simplified VAT allocation.
 */
export interface ReturnableSummary {
  vat?: ReturnableSummaryVat;
  nature?: NatureCode;
  simplifiedVatAllocation: boolean;
  totalTaxableAmount: string;
  uncollectedGoodsSales: string;
  uncollectedServices: string;
  uncollectedInvoices: string;
  uncollectedDcrSsn: string;
  uncollectedComplimentary: string;
  atecoCode?: string;
  /**
   * Whether the summary block of the sale receipt has RifNormativo "TICKET",
   * i.e. its services were paid with meal vouchers invoiced to the issuer
   */
  mealVouchersInvoicedToIssuer: boolean;
}

export interface ReturnableVouchers {
  /** Amount paid with vouchers still returnable */
  amount: string;
  /** Number of vouchers still returnable */
  count: number;
}

/**
 * Amounts of the sale receipt still returnable for each type of the payment details
 * of a return. All amounts are gross, i.e. they include VAT.
 */
export interface ReturnablePaymentDetails {
  /** Amount paid in cash still returnable */
  cashPaymentAmount?: string;
  /** Amount paid electronically still returnable */
  electronicPaymentAmount?: string;
  /** Amount and number of vouchers still returnable */
  vouchers?: ReturnableVouchers;
  /** Discount applied at payment time (ScontoApagare) still returnable */
  discountAmount?: string;
  /** Amount for goods not collected yet (credit) still returnable */
  uncollectedGoodsGrossAmount?: string;
  /**
   * Amount for services not collected yet still returnable, i.e. the sum for all
   * the summaries of uncollectedServices plus its VAT
   */
  uncollectedServicesGrossAmount: string;
}

/**
 * Items and amounts of a sale receipt that can still be returned
 * GET /mf1/receipts/{uuid}/return-data
 */
export interface ReturnData {
  items: ReturnableReceiptItem[];
  lottery?: ReturnableLottery;
  summary: ReturnableSummary[];
  paymentDetails: ReturnablePaymentDetails;
}

export interface Receipt {
  uuid: string;
  type: ReceiptType;
  totalAmount?: string;
  documentNumber: string;
  documentDatetime: string;
  isReturnable: boolean;
  isVoidable: boolean;
  pdfUrl?: string;
  status: ReceiptStatus;
  parentReceiptUuid?: string;
}

export interface ReceiptDetails extends Receipt {
  customerLotteryCode?: string;
  totalTaxableAmount: string;
  totalUncollectedAmount: string;
  totalVatAmount: string;
  totalDiscount: string;
  items: ReceiptItem[];
  cashierName?: string;
}

export interface ReceiptInput {
  items: ReceiptItem[];
  customerTaxCode?: string;
  customerLotteryCode?: string;
  paymentDetails?: PaymentDetail[];
  invoiceIssuing?: boolean;
  uncollectedDcrToSsn?: boolean;
  additionalText?: string;
}

/**
 * Input for returning items from the same device (PEM)
 * POST /mf1/receipts/return
 */
export interface ReceiptReturnInput {
  items: ReceiptReturnItem[];
  documentNumber: string;
  paymentDetails?: ReturnPaymentDetail[];
  additionalText?: string;
}

/**
 * Input for voiding a receipt from the same device (PEM)
 * POST /mf1/receipts/void
 */
export interface VoidReceiptInput {
  documentNumber: string;
  additionalText?: string;
}

/**
 * Input for voiding a receipt via a different device (PEM)
 * POST /mf1/receipts/void-via-different-device
 */
export interface VoidViaDifferentDeviceInput {
  deviceId: string;
  items: ReceiptItem[];
  documentNumber: string;
  documentDatetime: string;
  lotteryCode?: string;
  additionalText?: string;
}

export type ReceiptProofType = 'POS' | 'VR' | 'ND';

/**
 * Input for voiding a receipt with proof
 * POST /mf1/receipts/void-with-proof
 */
export interface VoidWithProofInput {
  items: ReceiptItem[];
  proof: ReceiptProofType;
  documentDatetime: string;
  additionalText?: string;
}

/**
 * Input for returning items via a different device (PEM)
 * POST /mf1/receipts/return-via-different-device
 */
export interface ReturnViaDifferentDeviceInput {
  deviceId: string;
  items: ReceiptItem[];
  documentNumber: string;
  documentDatetime: string;
  lotteryCode?: string;
  additionalText?: string;
}

/**
 * Input for returning items with proof
 * POST /mf1/receipts/return-with-proof
 */
export interface ReturnWithProofInput {
  items: ReceiptItem[];
  proof: ReceiptProofType;
  documentDatetime: string;
  additionalText?: string;
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
  type?: ReceiptType;
  documentNumber?: string;
  documentDatetimeBefore?: string;
  documentDatetimeStrictlyBefore?: string;
  documentDatetimeAfter?: string | null;
  documentDatetimeStrictlyAfter?: string;
}
