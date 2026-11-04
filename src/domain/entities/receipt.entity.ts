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
      vouchersQuantity?: never;
    })
  | (BasePaymentDetail & {
      type: VoucherPaymentType;
      vouchersQuantity: number;
    });

/**
 * Payment types accepted when returning items from the same device (PEM).
 * - `ticket` replaces `meal_vouchers` / `other_vouchers`: it returns what the sale
 *   recorded as ticket (see returnable-items).
 * - Meal vouchers with the meal-voucher option enabled are recorded in the sale as
 *   uncollected services, so they are returned as `uncollected_services`.
 * - The sale's rounding down is already part of the discount, so it is returned as
 *   `discount`; rounding up has no corresponding entry.
 */
export type ReturnPaymentType =
  | 'cash'
  | 'electronic'
  | 'ticket'
  | 'discount'
  | 'uncollected_goods'
  | 'uncollected_services';

// amount is gross, max 2 decimals; vouchersQuantity is required (>= 1) only for ticket
export type ReturnPaymentDetail =
  | {
      type: Exclude<ReturnPaymentType, 'ticket'>;
      amount: string;
      vouchersQuantity?: never;
    }
  | {
      type: 'ticket';
      amount: string;
      vouchersQuantity: number;
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
  regulatoryReference?: string;
}

export interface ReturnableTicket {
  amount: string;
  quantity: number;
}

/**
 * Items and amounts of a sale receipt that can still be returned
 * GET /mf1/receipts/{uuid}/returnable-items
 */
export interface ReturnableItems {
  items: ReturnableReceiptItem[];
  lottery?: ReturnableLottery;
  summary: ReturnableSummary[];
  /** Amount paid in cash still returnable */
  cashPaymentAmount?: string;
  /** Amount paid electronically still returnable */
  electronicPaymentAmount?: string;
  /** Amount and quantity of tickets still returnable */
  ticket?: ReturnableTicket;
  /** Discount at payment time (including the mandatory rounding down) still returnable */
  discountAmount?: string;
  /** Amount for goods not collected yet (credit) still returnable */
  uncollectedGoodsAmount?: string;
  /**
   * Amount for services not collected yet still returnable, including VAT
   * (sum of the summaries' uncollectedServices plus their VAT): the maximum that
   * can be returned as uncollected_services
   */
  uncollectedServicesAmount: string;
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
  pdfUrl: string;
  status: ReceiptStatus;
  parentReceiptUuid?: string;
}

export interface ReceiptDetails extends Receipt {
  customerLotteryCode?: string;
  vatNumber: string;
  totalTaxableAmount: string;
  totalUncollectedAmount: string;
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
  paymentDetails?: PaymentDetail[];
  invoiceIssuing?: boolean;
  uncollectedDcrToSsn?: boolean;
}

/**
 * Input for returning items from the same device (PEM)
 * POST /mf1/receipts/return
 */
export interface ReceiptReturnInput {
  items: ReceiptReturnItem[];
  documentNumber: string;
  paymentDetails?: ReturnPaymentDetail[];
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
  deviceId: string;
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
  deviceId: string;
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
