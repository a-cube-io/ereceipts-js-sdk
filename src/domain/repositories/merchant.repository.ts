import {
  Merchant,
  MerchantCreateInput,
  MerchantUpdateInput,
  MerchantsParams,
} from '@/domain/entities/merchant.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IMerchantRepository {
  create(input: MerchantCreateInput): Promise<Merchant>;
  findById(uuid: string): Promise<Merchant>;
  findAll(params?: MerchantsParams): Promise<Page<Merchant>>;
  update(uuid: string, input: MerchantUpdateInput): Promise<Merchant>;
}
