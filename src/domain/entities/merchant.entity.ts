import { Address } from '@/domain/value-objects/address.vo';

export interface Merchant {
  uuid: string;
  vatNumber: string;
  fiscalCode?: string | null;
  email: string;
  businessName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: Address;
}

export interface MerchantCreateInput {
  vatNumber: string;
  fiscalCode?: string;
  businessName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  password: string;
  address?: Address;
}

export interface MerchantUpdateInput {
  businessName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address?: Address | null;
}

export interface MerchantsParams {
  page?: number;
}
