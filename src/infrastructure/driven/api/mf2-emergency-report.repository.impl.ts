import {
  EmergencyReportApiOutput,
  EmergencyReportListApiResponse,
  EmergencyReportMapper,
} from '@/application/dto/emergency-report.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  EmergencyReportInput,
  EmergencyReportOutput,
} from '@/domain/entities/point-of-sale.entity';
import { IMf2EmergencyReportRepository } from '@/domain/repositories/mf2-emergency-report';

// this repository is used for MF2 emergency report endpoints
export class Mf2EmergencyReportRepositoryImpl implements IMf2EmergencyReportRepository {
  constructor(private readonly http: IHttpPort) {}

  async upload(serialNumber: string, input: EmergencyReportInput): Promise<EmergencyReportOutput> {
    const apiInput = EmergencyReportMapper.toCreateApiInput(input);
    const response = await this.http.post<EmergencyReportApiOutput>(
      `/mf2/pems/${serialNumber}/emergency-reports`,
      apiInput
    );
    return EmergencyReportMapper.fromApiOutput(response.data);
  }

  async findAllBySerialNumber(
    serialNumber: string,
    page?: number
  ): Promise<EmergencyReportOutput[]> {
    const response = await this.http.get<EmergencyReportListApiResponse>(
      `/mf2/pems/${serialNumber}/emergency-reports`,
      { params: { page }, headers: { Accept: 'application/json' } }
    );
    return EmergencyReportMapper.listFromApi(response.data);
  }

  async findById(serialNumber: string, id: number): Promise<EmergencyReportOutput> {
    const response = await this.http.get<EmergencyReportApiOutput>(
      `/mf2/pems/${serialNumber}/emergency-reports/${id}`
    );
    return EmergencyReportMapper.fromApiOutput(response.data);
  }
}
