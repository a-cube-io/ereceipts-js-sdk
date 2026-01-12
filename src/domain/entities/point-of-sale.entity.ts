import { Address } from '@/domain/value-objects/address.vo';

export type PEMStatus = 'NEW' | 'REGISTERED' | 'ACTIVATED' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';

export type PointOfSaleType = 'AP' | 'SP' | 'TM' | 'PV';

export interface PointOfSale {
  serialNumber: string;
  status: PEMStatus;
  address: Address;
  operationalStatus: string;
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
