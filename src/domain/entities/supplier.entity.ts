import { Address } from '@/domain/value-objects/address.vo';

export interface Supplier {
  uuid: string;
  fiscalId: string;
  name: string;
  address?: Address;
}

export interface SupplierCreateInput {
  fiscalId: string;
  name: string;
  address?: Address;
}

export interface SupplierUpdateInput {
  name: string;
  address?: Address;
}

export interface SuppliersParams {
  page?: number;
}
