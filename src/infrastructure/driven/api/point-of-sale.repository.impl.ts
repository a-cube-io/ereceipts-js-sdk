import {
  PointOfSaleApiOutput,
  PointOfSaleDetailedApiOutput,
  PointOfSaleMapper,
} from '@/application/dto/point-of-sale.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  ActivationRequest,
  PEMStatusOfflineRequest,
  PointOfSale,
  PointOfSaleDetailed,
  PointOfSaleListParams,
} from '@/domain/entities/point-of-sale.entity';
import { IPointOfSaleRepository } from '@/domain/repositories/point-of-sale.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class PointOfSaleRepositoryImpl implements IPointOfSaleRepository {
  constructor(private readonly http: IHttpPort) {}

  async findById(serialNumber: string): Promise<PointOfSaleDetailed> {
    const response = await this.http.get<PointOfSaleDetailedApiOutput>(`/mf1/pems/${serialNumber}`);
    return PointOfSaleMapper.fromDetailedApiOutput(response.data);
  }

  async findAll(params?: PointOfSaleListParams): Promise<Page<PointOfSale>> {
    const response = await this.http.get<Page<PointOfSaleApiOutput>>('/mf1/pems', {
      params: {
        status: params?.status,
        page: params?.page,
        size: params?.size,
      },
    });
    return PointOfSaleMapper.pageFromApi(response.data);
  }

  async activate(serialNumber: string, input: ActivationRequest): Promise<void> {
    const apiInput = PointOfSaleMapper.toActivationApiInput(input);
    await this.http.post(`/mf1/pems/${serialNumber}/activation`, apiInput);
  }

  async closeJournal(serialNumber: string): Promise<void> {
    await this.http.post(`/mf1/pems/${serialNumber}/close`);
  }

  async createInactivity(serialNumber: string): Promise<void> {
    await this.http.post(`/mf1/pems/${serialNumber}/inactivity`);
  }

  async communicateOffline(serialNumber: string, input: PEMStatusOfflineRequest): Promise<void> {
    const apiInput = PointOfSaleMapper.toOfflineApiInput(input);
    await this.http.post(`/mf1/pems/${serialNumber}/communicate-offline`, apiInput);
  }
}
