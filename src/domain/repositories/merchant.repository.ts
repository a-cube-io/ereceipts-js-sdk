import {
  Merchant,
  MerchantCreateInput,
  MerchantUpdateInput,
  MerchantsParams,
} from '@/domain/entities/merchant.entity';

export interface IMerchantRepository {
  create(input: MerchantCreateInput): Promise<Merchant>;
  findById(uuid: string): Promise<Merchant>;
  findAll(params?: MerchantsParams): Promise<Merchant[]>;
  update(uuid: string, input: MerchantUpdateInput): Promise<Merchant>;
}
