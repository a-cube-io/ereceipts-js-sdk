import {
  PemCertificatesApiOutput,
  PemCreateApiOutput,
  PemMapper,
  PointOfSaleMf2ApiOutput,
} from '@/application/dto/pem.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { PemCertificates, PemCreateInput, PemCreateOutput } from '@/domain/entities/pem.entity';
import { PointOfSaleMf2 } from '@/domain/entities/point-of-sale.entity';
import { IPemRepository } from '@/domain/repositories/pem.repository';

export class PemRepositoryImpl implements IPemRepository {
  constructor(private readonly http: IHttpPort) {}

  async create(input: PemCreateInput): Promise<PemCreateOutput> {
    const apiInput = PemMapper.toCreateApiInput(input);
    const response = await this.http.post<PemCreateApiOutput>('/mf2/pems', apiInput);
    return PemMapper.fromCreateApiOutput(response.data);
  }

  async findBySerialNumber(serialNumber: string): Promise<PointOfSaleMf2> {
    const response = await this.http.get<PointOfSaleMf2ApiOutput>(`/mf2/pems/${serialNumber}`);
    return PemMapper.fromPointOfSaleMf2ApiOutput(response.data);
  }

  async findAllByMerchant(merchantUuid: string, page?: number): Promise<PointOfSaleMf2[]> {
    const response = await this.http.get<PointOfSaleMf2ApiOutput[]>(
      `/mf2/merchants/${merchantUuid}/pems`,
      { params: { page } }
    );
    return PemMapper.pageFromApi(response.data);
  }

  async getCertificates(serialNumber: string): Promise<PemCertificates> {
    const response = await this.http.get<PemCertificatesApiOutput>(
      `/mf2/pems/${serialNumber}/certificates`
    );
    return PemMapper.fromCertificatesApiOutput(response.data);
  }
}
