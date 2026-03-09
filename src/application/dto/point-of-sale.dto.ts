import {
  ActivationRequest,
  DailyReportEntry,
  EmergencyReportInput,
  PEMInactivityPeriodInput,
  PEMStatus,
  PEMStatusOfflineRequest,
  PointOfSale,
  PointOfSaleDetailed,
} from '@/domain/entities/point-of-sale.entity';
import { Page } from '@/domain/value-objects/page.vo';

import { AddressApiOutput, AddressMapper } from './merchant.dto';

export interface PointOfSaleApiOutput {
  serial_number: string;
  status: PEMStatus;
  address: AddressApiOutput;
  journal_status: string;
}

export interface PointOfSaleDetailedApiOutput extends PointOfSaleApiOutput {
  registration_key?: string;
}

export interface ActivationRequestApiInput {
  registration_key: string;
}

export interface PEMStatusOfflineRequestApiInput {
  timestamp: string;
  reason: string;
}

export interface PEMInactivityInputApiInput {
  start_at: string;
  end_at: string;
}

export interface EmergencyReportInputApiInput {
  datetime: string;
  documents_count: number;
  cash_payment_amount: string;
  electronic_payment_amount: string;
  ticket_restaurant_payment_amount: string;
  discount?: string;
  ticket_restaurant_quantity: number;
  entries: DailyReportEntryApiInput[];
}

export interface DailyReportEntryApiInput {
  vat_rate_code: string;
  vat_amount: string;
  simplified_vat_allocation: boolean;
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

export class PointOfSaleMapper {
  static toActivationApiInput(input: ActivationRequest): ActivationRequestApiInput {
    return {
      registration_key: input.registrationKey,
    };
  }

  static toOfflineApiInput(input: PEMStatusOfflineRequest): PEMStatusOfflineRequestApiInput {
    return {
      timestamp: input.timestamp,
      reason: input.reason,
    };
  }

  static fromApiOutput(output: PointOfSaleApiOutput): PointOfSale {
    return {
      serialNumber: output.serial_number,
      status: output.status,
      address: AddressMapper.fromApi(output.address),
      journalStatus: output.journal_status,
    };
  }

  static fromDetailedApiOutput(output: PointOfSaleDetailedApiOutput): PointOfSaleDetailed {
    return {
      ...this.fromApiOutput(output),
      registrationKey: output.registration_key,
    };
  }

  static pageFromApi(response: Page<PointOfSaleApiOutput>): Page<PointOfSale> {
    return {
      members: response.members.map((p) => this.fromApiOutput(p)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }
  static toInactivityApiInput(input: PEMInactivityPeriodInput): PEMInactivityInputApiInput {
    return {
      start_at: input.startAt,
      end_at: input.endAt,
    };
  }

  static toEmergencyReportApiInput(input: EmergencyReportInput): EmergencyReportInputApiInput {
    return {
      datetime: input.datetime,
      documents_count: input.documentsCount,
      cash_payment_amount: input.cashPaymentAmount,
      electronic_payment_amount: input.electronicPaymentAmount,
      ticket_restaurant_payment_amount: input.ticketRestaurantPaymentAmount,
      ticket_restaurant_quantity: input.ticketRestaurantQuantity,
      entries: input.entries.map((entry) => this.toDailyReportEntryApiInput(entry)),
      discount: input.discount,
    };
  }

  static toDailyReportEntryApiInput(input: DailyReportEntry): DailyReportEntryApiInput {
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
