import {
  Supplier,
  SupplierCreateInput,
  SupplierUpdateInput,
  SuppliersParams,
} from '@/domain/entities/supplier.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface ISupplierRepository {
  create(merchantUuid: string, input: SupplierCreateInput): Promise<Supplier>;
  findById(merchantUuid: string, supplierUuid: string): Promise<Supplier>;
  findAll(merchantUuid: string, params?: SuppliersParams): Promise<Page<Supplier>>;
  update(merchantUuid: string, supplierUuid: string, input: SupplierUpdateInput): Promise<Supplier>;
  delete(merchantUuid: string, supplierUuid: string): Promise<void>;
}
