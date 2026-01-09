import { CashierApiOutput, CashierMapper } from '@/application/dto/cashier.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { Cashier, CashierCreateInput, CashierListParams } from '@/domain/entities/cashier.entity';
import { ICashierRepository } from '@/domain/repositories/cashier.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class CashierRepositoryImpl implements ICashierRepository {
  constructor(private readonly http: IHttpPort) {}

  async create(input: CashierCreateInput): Promise<Cashier> {
    const apiInput = CashierMapper.toCreateApiInput(input);
    const response = await this.http.post<CashierApiOutput>('/mf1/cashiers', apiInput);
    return CashierMapper.fromApiOutput(response.data);
  }

  async findMe(): Promise<Cashier> {
    const response = await this.http.get<CashierApiOutput>('/mf1/cashiers/me');
    return CashierMapper.fromApiOutput(response.data);
  }

  async findById(uuid: string): Promise<Cashier> {
    const response = await this.http.get<CashierApiOutput>(`/mf1/cashiers/${uuid}`);
    return CashierMapper.fromApiOutput(response.data);
  }

  async findAll(params?: CashierListParams): Promise<Page<Cashier>> {
    const response = await this.http.get<Page<CashierApiOutput>>('/mf1/cashiers', {
      params: { page: params?.page, size: params?.size, status: params?.status },
    });
    return CashierMapper.pageFromApi(response.data);
  }

  async delete(uuid: string): Promise<void> {
    await this.http.delete(`/mf1/cashiers/${uuid}`);
  }
}
