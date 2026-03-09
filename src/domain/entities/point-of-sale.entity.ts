import { Address } from '@/domain/value-objects/address.vo';

export type PEMStatus = 'NEW' | 'REGISTERED' | 'ACTIVATED' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';

export type PointOfSaleType = 'AP' | 'SP' | 'TM' | 'PV';

export interface PointOfSale {
  serialNumber: string;
  status: PEMStatus;
  address: Address;
  journalStatus: string;
}

export interface PointOfSaleDetailed extends PointOfSale {
  registrationKey?: string;
}

export interface PointOfSaleMf2 {
  serialNumber: string;
  status: PEMStatus;
  type: PointOfSaleType;
  address?: Address;
}

export interface PointOfSaleListParams {
  status?: PEMStatus;
  page?: number;
  size?: number;
}

export interface ActivationRequest {
  registrationKey: string;
}

export interface PEMStatusOfflineRequest {
  timestamp: string;
  reason: string;
}

export interface PEMInactivityPeriodInput {
  startAt: string;
  endAt: string;
}


export interface EmergencyReportInput {
  datetime: string;
  documentsCount: number;
  cashPaymentAmount: string;
  electronicPaymentAmount: string;
  discount?: string;
  ticketRestaurantPaymentAmount: string;
  ticketRestaurantQuantity: number;
  entries: DailyReportEntry[];
}

export interface DailyReportEntry {
  vatRateCode: string;
  vatAmount: string;
  simplifiedVatAllocation: boolean;
  partialAmount: string;
  totalReturnedAmount?: string;
  totalVoidedAmount?: string;
  totalPrepaidOrVoucherAmount?: string;
  totalUncollectedServices?: string;
  totalUncollectedInvoiced?: string;
  totalUncollectedDcrToSsn?: string;
  totalUncollectedComplimentary?: string;
  atecoCode?: string;
}