import {
  CashRegisterApiOutput,
  CashRegisterDetailedApiOutput,
  CashRegisterMapper,
} from '@/application/dto/cash-register.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  CashRegister,
  CashRegisterCreateInput,
  CashRegisterDetailed,
  CashRegisterListParams,
  CashRegisterUpdateInput,
} from '@/domain/entities/cash-register.entity';
import { ICashRegisterRepository } from '@/domain/repositories/cash-register.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class CashRegisterRepositoryImpl implements ICashRegisterRepository {
  constructor(private readonly http: IHttpPort) {}

  async create(input: CashRegisterCreateInput): Promise<CashRegisterDetailed> {
    const apiInput = CashRegisterMapper.toCreateApiInput(input);
    const response = await this.http.post<CashRegisterDetailedApiOutput>(
      '/mf1/cash-registers',
      apiInput
    );
    return CashRegisterMapper.fromDetailedApiOutput(response.data);
  }

  async findById(uuid: string): Promise<CashRegister> {
    const response = await this.http.get<CashRegisterApiOutput>(`/mf1/cash-registers/${uuid}`);
    return CashRegisterMapper.fromApiOutput(response.data);
  }

  async findAll(params?: CashRegisterListParams): Promise<Page<CashRegister>> {
    const response = await this.http.get<Page<CashRegisterApiOutput>>('/mf1/cash-registers', {
      params: {
        page: params?.page,
        size: params?.size,
        pem_id: params?.pemId,
      },
    });
    return CashRegisterMapper.pageFromApi(response.data);
  }

  async update(uuid: string, input: CashRegisterUpdateInput): Promise<CashRegister> {
    const apiInput = CashRegisterMapper.toUpdateApiInput(input);
    const response = await this.http.patch<CashRegisterApiOutput>(
      `/mf1/cash-registers/${uuid}`,
      apiInput
    );
    return CashRegisterMapper.fromApiOutput(response.data);
  }
}
