import {
  PaymentDetail,
  Receipt,
  ReceiptDetails,
  ReceiptInput,
  ReceiptItem,
  ReceiptListParams,
  ReceiptProofType,
  ReceiptReturnInput,
  ReceiptReturnItem,
  ReceiptSortOrder,
  ReceiptStatus,
  ReceiptType,
  ReturnData,
  ReturnPaymentDetail,
  ReturnViaDifferentDeviceInput,
  ReturnWithProofInput,
  ReturnablePaymentDetails,
  ReturnableReceiptItem,
  ReturnableSummary,
  VoidReceiptInput,
  VoidViaDifferentDeviceInput,
  VoidWithProofInput,
} from '@/domain/entities/receipt.entity';
import { Page } from '@/domain/value-objects/page.vo';
import { GoodOrService, NatureCode, VatRateCode } from '@/domain/value-objects/vat-code.vo';
import { formatDecimal } from '@/shared/utils';

const RECEIPT_SORT_TO_API: Record<ReceiptSortOrder, 'desc' | 'asc'> = {
  descending: 'desc',
  ascending: 'asc',
};

export interface ReceiptItemApiInput {
  type?: GoodOrService;
  quantity: string;
  description: string;
  unit_price: string;
  vat_rate_code?: VatRateCode;
  simplified_vat_allocation?: boolean;
  discount?: string;
  surcharge?: string;
  prepaid_or_voucher?: boolean;
  complimentary?: boolean;
  ateco_code?: string;
}

export interface PaymentDetailApiInput {
  type: PaymentDetail['type'];
  description?: string;
  amount: string;
  voucher_count?: number;
}

export interface ReturnPaymentDetailApiInput {
  type: ReturnPaymentDetail['type'];
  amount: string;
  voucher_count?: number;
}

export interface ReceiptApiInput {
  items: ReceiptItemApiInput[];
  customer_tax_code?: string;
  customer_lottery_code?: string;
  payment_details?: PaymentDetailApiInput[];
  invoice_issuing?: boolean;
  uncollected_dcr_to_ssn?: boolean;
  additional_text?: string;
}

export interface ReceiptApiOutput {
  uuid: string;
  type: ReceiptType;
  total_amount?: string | null;
  document_number: string;
  document_datetime: string;
  is_returnable: boolean;
  is_voidable: boolean;
  pdf_url?: string | null;
  parent_receipt_uuid?: string | null;
  status: ReceiptStatus;
}

export interface ReceiptItemApiOutput extends Omit<
  ReceiptItemApiInput,
  'vat_rate_code' | 'ateco_code'
> {
  vat_rate_code?: VatRateCode | null;
  ateco_code?: string | null;
}

export interface ReceiptDetailsApiOutput extends ReceiptApiOutput {
  customer_lottery_code?: string | null;
  total_taxable_amount: string;
  total_uncollected_amount: string;
  total_vat_amount: string;
  total_discount: string;
  items: ReceiptItemApiOutput[];
  cashier_name?: string | null;
}

export interface ReceiptReturnApiInput {
  items: Array<{ id: number; quantity: string }>;
  document_number: string;
  payment_details?: ReturnPaymentDetailApiInput[];
  additional_text?: string;
}

export interface VoidReceiptApiInput {
  document_number: string;
  additional_text?: string;
}

export interface VoidViaDifferentDeviceApiInput {
  device_id: string;
  items: ReceiptItemApiInput[];
  document_number: string;
  document_datetime: string;
  lottery_code?: string;
  additional_text?: string;
}

export interface VoidWithProofApiInput {
  items: ReceiptItemApiInput[];
  proof: ReceiptProofType;
  document_datetime: string;
  additional_text?: string;
}

export interface ReturnViaDifferentDeviceApiInput {
  device_id: string;
  items: ReceiptItemApiInput[];
  document_number: string;
  document_datetime: string;
  lottery_code?: string;
  additional_text?: string;
}

export interface ReturnWithProofApiInput {
  items: ReceiptItemApiInput[];
  proof: ReceiptProofType;
  document_datetime: string;
  additional_text?: string;
}

export interface ReturnableReceiptItemApiOutput {
  id: number;
  type?: GoodOrService;
  quantity: string;
  returned_quantity: string;
  description: string;
  unit_price: string;
  vat_rate_code?: VatRateCode | null;
  simplified_vat_allocation: boolean;
  discount: string;
  surcharge: string;
  prepaid_or_voucher: boolean;
  complimentary: boolean;
  ateco_code?: string | null;
}

export interface ReturnableSummaryApiOutput {
  vat?: { vat_rate: string; total_vat_amount: string } | null;
  nature?: NatureCode | null;
  simplified_vat_allocation: boolean;
  total_taxable_amount: string;
  uncollected_goods_sales: string;
  uncollected_services: string;
  uncollected_invoices: string;
  uncollected_dcr_ssn: string;
  uncollected_complimentary: string;
  ateco_code?: string | null;
  meal_vouchers_invoiced_to_issuer: boolean;
}

export interface ReturnablePaymentDetailsApiOutput {
  cash_payment_amount?: string | null;
  electronic_payment_amount?: string | null;
  vouchers?: { amount: string; count: number } | null;
  discount_amount?: string | null;
  uncollected_goods_gross_amount?: string | null;
  uncollected_services_gross_amount: string;
}

export interface ReturnDataApiOutput {
  items: ReturnableReceiptItemApiOutput[];
  lottery?: {
    two_dimensional_lottery_code?: string | null;
    lottery_code?: string | null;
  } | null;
  summary: ReturnableSummaryApiOutput[];
  payment_details: ReturnablePaymentDetailsApiOutput;
}

export class ReceiptMapper {
  static toApiInput(input: ReceiptInput): ReceiptApiInput {
    return {
      items: input.items.map((item) => this.itemToApiInput(item)),
      customer_tax_code: input.customerTaxCode,
      customer_lottery_code: input.customerLotteryCode,
      payment_details: input.paymentDetails?.map((detail) => this.paymentDetailToApiInput(detail)),
      invoice_issuing: input.invoiceIssuing,
      uncollected_dcr_to_ssn: input.uncollectedDcrToSsn,
      additional_text: input.additionalText,
    };
  }

  static paymentDetailToApiInput(detail: PaymentDetail): PaymentDetailApiInput {
    return {
      type: detail.type,
      description: detail.description,
      amount: formatDecimal(detail.amount) as string,
      voucher_count: detail.voucherCount,
    };
  }

  static itemToApiInput(item: ReceiptItem): ReceiptItemApiInput {
    return {
      type: item.type,
      quantity: formatDecimal(item.quantity) as string,
      description: item.description,
      unit_price: formatDecimal(item.unitPrice) as string,
      vat_rate_code: item.vatRateCode,
      simplified_vat_allocation: item.simplifiedVatAllocation,
      discount: formatDecimal(item.discount),
      surcharge: formatDecimal(item.surcharge),
      prepaid_or_voucher: item.prepaidOrVoucher,
      complimentary: item.complimentary,
      ateco_code: item.atecoCode,
    };
  }

  static fromApiOutput(output: ReceiptApiOutput): Receipt {
    return {
      uuid: output.uuid,
      type: output.type,
      totalAmount: output.total_amount ?? undefined,
      documentNumber: output.document_number,
      documentDatetime: output.document_datetime,
      isReturnable: output.is_returnable,
      isVoidable: output.is_voidable,
      pdfUrl: output.pdf_url ?? undefined,
      status: output.status,
      parentReceiptUuid: output.parent_receipt_uuid ?? undefined,
    };
  }

  static fromApiDetailsOutput(output: ReceiptDetailsApiOutput): ReceiptDetails {
    return {
      ...this.fromApiOutput(output),
      customerLotteryCode: output.customer_lottery_code ?? undefined,
      totalTaxableAmount: output.total_taxable_amount,
      totalUncollectedAmount: output.total_uncollected_amount,
      totalVatAmount: output.total_vat_amount,
      totalDiscount: output.total_discount,
      items: (output.items ?? []).map((item) => this.itemFromApiOutput(item)),
      cashierName: output.cashier_name ?? undefined,
    };
  }

  static itemFromApiOutput(item: ReceiptItemApiOutput): ReceiptItem {
    return {
      type: item.type,
      quantity: item.quantity,
      description: item.description,
      unitPrice: item.unit_price,
      vatRateCode: item.vat_rate_code ?? undefined,
      simplifiedVatAllocation: item.simplified_vat_allocation,
      discount: item.discount,
      surcharge: item.surcharge,
      prepaidOrVoucher: item.prepaid_or_voucher,
      complimentary: item.complimentary,
      atecoCode: item.ateco_code ?? undefined,
    };
  }

  static returnItemToApiInput(item: ReceiptReturnItem): { id: number; quantity: string } {
    return {
      id: item.id,
      quantity: formatDecimal(item.quantity) as string,
    };
  }

  static returnInputToApi(input: ReceiptReturnInput): ReceiptReturnApiInput {
    return {
      items: input.items.map((item) => this.returnItemToApiInput(item)),
      document_number: input.documentNumber,
      payment_details: input.paymentDetails?.map((detail) =>
        this.returnPaymentDetailToApiInput(detail)
      ),
      additional_text: input.additionalText,
    };
  }

  static returnPaymentDetailToApiInput(detail: ReturnPaymentDetail): ReturnPaymentDetailApiInput {
    return {
      type: detail.type,
      amount: formatDecimal(detail.amount, 2) as string,
      voucher_count: detail.voucherCount,
    };
  }

  static voidInputToApi(input: VoidReceiptInput): VoidReceiptApiInput {
    return {
      document_number: input.documentNumber,
      additional_text: input.additionalText,
    };
  }

  static returnableItemFromApi(item: ReturnableReceiptItemApiOutput): ReturnableReceiptItem {
    return {
      id: item.id,
      type: item.type,
      quantity: item.quantity,
      returnedQuantity: item.returned_quantity,
      description: item.description,
      unitPrice: item.unit_price,
      vatRateCode: item.vat_rate_code ?? undefined,
      simplifiedVatAllocation: item.simplified_vat_allocation,
      discount: item.discount,
      surcharge: item.surcharge,
      prepaidOrVoucher: item.prepaid_or_voucher,
      complimentary: item.complimentary,
      atecoCode: item.ateco_code ?? undefined,
    };
  }

  static returnableSummaryFromApi(summary: ReturnableSummaryApiOutput): ReturnableSummary {
    return {
      vat: summary.vat
        ? { vatRate: summary.vat.vat_rate, totalVatAmount: summary.vat.total_vat_amount }
        : undefined,
      nature: summary.nature ?? undefined,
      simplifiedVatAllocation: summary.simplified_vat_allocation,
      totalTaxableAmount: summary.total_taxable_amount,
      uncollectedGoodsSales: summary.uncollected_goods_sales,
      uncollectedServices: summary.uncollected_services,
      uncollectedInvoices: summary.uncollected_invoices,
      uncollectedDcrSsn: summary.uncollected_dcr_ssn,
      uncollectedComplimentary: summary.uncollected_complimentary,
      atecoCode: summary.ateco_code ?? undefined,
      mealVouchersInvoicedToIssuer: summary.meal_vouchers_invoiced_to_issuer,
    };
  }

  static returnablePaymentDetailsFromApi(
    details: ReturnablePaymentDetailsApiOutput
  ): ReturnablePaymentDetails {
    return {
      cashPaymentAmount: details.cash_payment_amount ?? undefined,
      electronicPaymentAmount: details.electronic_payment_amount ?? undefined,
      vouchers: details.vouchers
        ? { amount: details.vouchers.amount, count: details.vouchers.count }
        : undefined,
      discountAmount: details.discount_amount ?? undefined,
      uncollectedGoodsGrossAmount: details.uncollected_goods_gross_amount ?? undefined,
      uncollectedServicesGrossAmount: details.uncollected_services_gross_amount,
    };
  }

  static returnDataFromApi(output: ReturnDataApiOutput): ReturnData {
    return {
      items: output.items.map((item) => this.returnableItemFromApi(item)),
      lottery: output.lottery
        ? {
            twoDimensionalLotteryCode: output.lottery.two_dimensional_lottery_code ?? undefined,
            lotteryCode: output.lottery.lottery_code ?? undefined,
          }
        : undefined,
      summary: output.summary.map((summary) => this.returnableSummaryFromApi(summary)),
      paymentDetails: this.returnablePaymentDetailsFromApi(output.payment_details),
    };
  }

  static toListParams(params: ReceiptListParams): Record<string, string | number | undefined> {
    return {
      page: params.page,
      size: params.size,
      status: params.status,
      'order[document_number]': params.sort ? RECEIPT_SORT_TO_API[params.sort] : undefined,
      type: params.type,
      document_number: params.documentNumber,
      'document_datetime[before]': params.documentDatetimeBefore,
      'document_datetime[strictly_before]': params.documentDatetimeStrictlyBefore,
      'document_datetime[after]': params.documentDatetimeAfter ?? undefined,
      'document_datetime[strictly_after]': params.documentDatetimeStrictlyAfter,
    };
  }

  static pageFromApi(response: {
    members: ReceiptApiOutput[];
    total?: number;
    page?: number;
    size?: number;
    pages?: number;
  }): Page<Receipt> {
    return {
      members: response.members.map((r) => this.fromApiOutput(r)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }

  static voidViaDifferentDeviceToApi(
    input: VoidViaDifferentDeviceInput
  ): VoidViaDifferentDeviceApiInput {
    return {
      device_id: input.deviceId,
      items: input.items.map((item) => this.itemToApiInput(item)),
      document_number: input.documentNumber,
      document_datetime: input.documentDatetime,
      lottery_code: input.lotteryCode,
      additional_text: input.additionalText,
    };
  }

  static voidWithProofToApi(input: VoidWithProofInput): VoidWithProofApiInput {
    return {
      items: input.items.map((item) => this.itemToApiInput(item)),
      proof: input.proof,
      document_datetime: input.documentDatetime,
      additional_text: input.additionalText,
    };
  }

  static returnViaDifferentDeviceToApi(
    input: ReturnViaDifferentDeviceInput
  ): ReturnViaDifferentDeviceApiInput {
    return {
      device_id: input.deviceId,
      items: input.items.map((item) => this.itemToApiInput(item)),
      document_number: input.documentNumber,
      document_datetime: input.documentDatetime,
      lottery_code: input.lotteryCode,
      additional_text: input.additionalText,
    };
  }

  static returnWithProofToApi(input: ReturnWithProofInput): ReturnWithProofApiInput {
    return {
      items: input.items.map((item) => this.itemToApiInput(item)),
      proof: input.proof,
      document_datetime: input.documentDatetime,
      additional_text: input.additionalText,
    };
  }
}
