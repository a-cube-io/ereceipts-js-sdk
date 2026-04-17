import {
  DailyReportEntry,
  EmergencyReportInput,
  EmergencyReportOutput,
} from '@/domain/entities/point-of-sale.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface EmergencyReportCreateApiInput {
  datetime: string;
  documents_count?: number;
  cash_payment_amount?: string;
  electronic_payment_amount?: string;
  ticket_restaurant_payment_amount?: string;
  ticket_restaurant_quantity?: number;
  discount?: string;
  entries?: DailyReportEntryApiInput[];
}

export interface DailyReportEntryApiInput {
  vat_rate_code?: string;
  vat_amount?: string;
  simplified_vat_allocation?: boolean;
  partial_amount: string;
  total_returned_amount?: string;
  total_voided_amount?: string;
  total_prepaid_or_voucher_amount?: string;
  total_uncollected_services?: string;
  total_uncollected_invoiced?: string;
  total_uncollected_dcr_to_ssn?: string;
  total_uncollected_complimentary?: string;
  ateco_code?: string;
}

export interface EmergencyReportApiOutput {
  id: number;
  closed_at: string;
}

export class EmergencyReportMapper {
  static toCreateApiInput(input: EmergencyReportInput): EmergencyReportCreateApiInput {
    return {
      datetime: input.datetime,
      documents_count: input.documentsCount,
      cash_payment_amount: input.cashPaymentAmount,
      electronic_payment_amount: input.electronicPaymentAmount,
      ticket_restaurant_payment_amount: input.ticketRestaurantPaymentAmount,
      ticket_restaurant_quantity: input.ticketRestaurantQuantity,
      discount: input.discount,
      entries: input.entries.map((entry) => EmergencyReportMapper.toEntryApiInput(entry)),
    };
  }

  static fromApiOutput(output: EmergencyReportApiOutput): EmergencyReportOutput {
    return {
      id: output.id,
      closedAt: output.closed_at,
    };
  }

  static pageFromApi(response: Page<EmergencyReportApiOutput>): Page<EmergencyReportOutput> {
    return {
      members: response.members.map((item) => EmergencyReportMapper.fromApiOutput(item)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }

  static toEntryApiInput(input: DailyReportEntry): DailyReportEntryApiInput {
    return {
      vat_rate_code: input.vatRateCode,
      vat_amount: input.vatAmount,
      simplified_vat_allocation: input.simplifiedVatAllocation,
      partial_amount: input.partialAmount,
      total_returned_amount: input.totalReturnedAmount,
      total_voided_amount: input.totalVoidedAmount,
      total_prepaid_or_voucher_amount: input.totalPrepaidOrVoucherAmount,
      total_uncollected_services: input.totalUncollectedServices,
      total_uncollected_invoiced: input.totalUncollectedInvoiced,
      total_uncollected_dcr_to_ssn: input.totalUncollectedDcrToSsn,
      total_uncollected_complimentary: input.totalUncollectedComplimentary,
      ateco_code: input.atecoCode,
    };
  }
}