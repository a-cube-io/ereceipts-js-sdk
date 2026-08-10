import {
  Merchant,
  MerchantAteco,
  MerchantAtecoInput,
  MerchantCreateInput,
  MerchantUpdateInput,
  MerchantsParams,
} from '@/domain/entities/merchant.entity';

export interface IMerchantRepository {
  create(input: MerchantCreateInput): Promise<Merchant>;
  findById(uuid: string): Promise<Merchant>;
  findAll(params?: MerchantsParams): Promise<Merchant[]>;
  update(uuid: string, input: MerchantUpdateInput): Promise<Merchant>;
  getAtecoCodes(uuid: string): Promise<MerchantAteco>;
  updateAtecoCodes(uuid: string, input: MerchantAtecoInput): Promise<MerchantAteco>;
}
