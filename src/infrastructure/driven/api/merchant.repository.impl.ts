import { MerchantApiOutput, MerchantMapper } from '@/application/dto/merchant.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  Merchant,
  MerchantCreateInput,
  MerchantUpdateInput,
  MerchantsParams,
} from '@/domain/entities/merchant.entity';
import { IMerchantRepository } from '@/domain/repositories/merchant.repository';

export class MerchantRepositoryImpl implements IMerchantRepository {
  constructor(private readonly http: IHttpPort) {}

  async create(input: MerchantCreateInput): Promise<Merchant> {
    const apiInput = MerchantMapper.toCreateApiInput(input);
    const response = await this.http.post<MerchantApiOutput>('/mf2/merchants', apiInput);
    return MerchantMapper.fromApiOutput(response.data);
  }

  async findById(uuid: string): Promise<Merchant> {
    const response = await this.http.get<MerchantApiOutput>(`/mf2/merchants/${uuid}`);
    return MerchantMapper.fromApiOutput(response.data);
  }

  async findAll(params?: MerchantsParams): Promise<Merchant[]> {
    const response = await this.http.get<MerchantApiOutput[]>('/mf2/merchants', {
      params: { page: params?.page },
    });
    return MerchantMapper.pageFromApi(response.data);
  }

  async update(uuid: string, input: MerchantUpdateInput): Promise<Merchant> {
    const apiInput = MerchantMapper.toUpdateApiInput(input);
    const response = await this.http.put<MerchantApiOutput>(`/mf2/merchants/${uuid}`, apiInput);
    return MerchantMapper.fromApiOutput(response.data);
  }
}
