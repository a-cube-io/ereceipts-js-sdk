import {
  Receipt,
  ReceiptDetails,
  ReceiptInput,
  ReceiptItem,
  ReceiptListParams,
  ReceiptProofType,
  ReceiptReturnInput,
  ReceiptReturnItem,
  ReturnViaDifferentDeviceInput,
  ReturnWithProofInput,
  ReturnableReceiptItem,
  VoidReceiptInput,
  VoidViaDifferentDeviceInput,
  VoidWithProofInput,
} from '@/domain/entities/receipt.entity';
import { Page } from '@/domain/value-objects/page.vo';
import { GoodOrService, VatRateCode } from '@/domain/value-objects/vat-code.vo';
import { formatDecimal } from '@/shared/utils';

export interface ReceiptItemApiInput {
  type?: GoodOrService;
  quantity: string;
  description: string;
  unit_price: string;
  vat_rate_code?: VatRateCode;
  simplified_vat_allocation?: boolean;
  discount?: string;
  is_down_payment_or_voucher_redemption?: boolean;
  complimentary?: boolean;
}

export interface ReceiptApiInput {
  items: ReceiptItemApiInput[];
  customer_tax_code?: string;
  customer_lottery_code?: string;
  discount?: string;
  invoice_issuing?: boolean;
  uncollected_dcr_to_ssn?: boolean;
  services_uncollected_amount?: string;
  goods_uncollected_amount?: string;
  cash_payment_amount?: string;
  electronic_payment_amount?: string;
  ticket_restaurant_payment_amount?: string;
  ticket_restaurant_quantity?: number;
}

export interface ReceiptApiOutput {
  uuid: string;
  type: 'sale' | 'return' | 'void';
  created_at: string;
  total_amount: string;
  document_number: string;
  document_datetime?: string;
  is_returnable: boolean;
  is_voidable: boolean;
  pdf_url?: string;
  parent_receipt_uuid?: string;
}

export interface ReceiptDetailsApiOutput extends ReceiptApiOutput {
  customer_lottery_code?: string;
  vat_number: string;
  total_taxable_amount: string;
  total_uncollected_amount: string;
  deductible_amount: string;
  total_vat_amount: string;
  total_discount: string;
  total_gross_discount: string;
  discount: string;
  items?: ReceiptItemApiInput[];
}

export interface ReceiptReturnApiInput {
  items: Array<{ id: number; quantity: string }>;
  document_number: string;
}

export interface VoidReceiptApiInput {
  document_number: string;
}

export interface VoidViaDifferentDeviceApiInput {
  device_id: string;
  items: ReceiptItemApiInput[];
  document_number: string;
  document_datetime: string;
  lottery_code?: string;
}

export interface VoidWithProofApiInput {
  items: ReceiptItemApiInput[];
  proof: ReceiptProofType;
  document_datetime: string;
}

export interface ReturnViaDifferentDeviceApiInput {
  device_id: string;
  items: ReceiptItemApiInput[];
  document_number: string;
  document_datetime: string;
  lottery_code?: string;
}

export interface ReturnWithProofApiInput {
  items: ReceiptItemApiInput[];
  proof: ReceiptProofType;
  document_datetime: string;
}

export interface ReturnableReceiptItemApiOutput {
  id: number;
  type?: GoodOrService;
  quantity: string;
  returned_quantity: string;
  description: string;
  unit_price: string;
  vat_rate_code?: VatRateCode;
}

export class ReceiptMapper {
  static toApiInput(input: ReceiptInput): ReceiptApiInput {
    return {
      items: input.items.map((item) => this.itemToApiInput(item)),
      customer_tax_code: input.customerTaxCode,
      customer_lottery_code: input.customerLotteryCode,
      discount: formatDecimal(input.discount),
      invoice_issuing: input.invoiceIssuing,
      uncollected_dcr_to_ssn: input.uncollectedDcrToSsn,
      services_uncollected_amount: formatDecimal(input.servicesUncollectedAmount),
      goods_uncollected_amount: formatDecimal(input.goodsUncollectedAmount),
      cash_payment_amount: formatDecimal(input.cashPaymentAmount),
      electronic_payment_amount: formatDecimal(input.electronicPaymentAmount),
      ticket_restaurant_payment_amount: formatDecimal(input.ticketRestaurantPaymentAmount),
      ticket_restaurant_quantity: input.ticketRestaurantQuantity,
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
      is_down_payment_or_voucher_redemption: item.isDownPaymentOrVoucherRedemption,
      complimentary: item.complimentary,
    };
  }

  static fromApiOutput(output: ReceiptApiOutput): Receipt {
    return {
      uuid: output.uuid,
      type: output.type,
      createdAt: output.created_at,
      totalAmount: output.total_amount,
      documentNumber: output.document_number,
      documentDatetime: output.document_datetime,
      isReturnable: output.is_returnable,
      isVoidable: output.is_voidable,
      pdfUrl: output.pdf_url,
      parentReceiptUuid: output.parent_receipt_uuid,
    };
  }

  static fromApiDetailsOutput(output: ReceiptDetailsApiOutput): ReceiptDetails {
    return {
      ...this.fromApiOutput(output),
      customerLotteryCode: output.customer_lottery_code,
      vatNumber: output.vat_number,
      totalTaxableAmount: output.total_taxable_amount,
      totalUncollectedAmount: output.total_uncollected_amount,
      deductibleAmount: output.deductible_amount,
      totalVatAmount: output.total_vat_amount,
      totalDiscount: output.total_discount,
      totalGrossDiscount: output.total_gross_discount,
      discount: output.discount,
      items: output.items?.map((item) => this.itemFromApiOutput(item)),
    };
  }

  static itemFromApiOutput(item: ReceiptItemApiInput): ReceiptItem {
    return {
      type: item.type,
      quantity: item.quantity,
      description: item.description,
      unitPrice: item.unit_price,
      vatRateCode: item.vat_rate_code,
      simplifiedVatAllocation: item.simplified_vat_allocation,
      discount: item.discount,
      isDownPaymentOrVoucherRedemption: item.is_down_payment_or_voucher_redemption,
      complimentary: item.complimentary,
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
    };
  }

  static voidInputToApi(input: VoidReceiptInput): VoidReceiptApiInput {
    return {
      document_number: input.documentNumber,
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
      vatRateCode: item.vat_rate_code,
    };
  }

  static toListParams(params: ReceiptListParams): Record<string, string | number | undefined> {
    return {
      page: params.page,
      size: params.size,
      status: params.status,
      sort: params.sort,
      document_number: params.documentNumber,
      'document_datetime[before]': params.documentDatetimeBefore,
      'document_datetime[after]': params.documentDatetimeAfter ?? undefined,
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
    };
  }

  static voidWithProofToApi(input: VoidWithProofInput): VoidWithProofApiInput {
    return {
      items: input.items.map((item) => this.itemToApiInput(item)),
      proof: input.proof,
      document_datetime: input.documentDatetime,
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
    };
  }

  static returnWithProofToApi(input: ReturnWithProofInput): ReturnWithProofApiInput {
    return {
      items: input.items.map((item) => this.itemToApiInput(item)),
      proof: input.proof,
      document_datetime: input.documentDatetime,
    };
  }
}
