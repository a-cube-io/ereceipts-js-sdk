import { DailyReportApiOutput, DailyReportMapper } from '@/application/dto/daily-report.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { DailyReport, DailyReportsParams } from '@/domain/entities/daily-report.entity';
import { IDailyReportRepository } from '@/domain/repositories/daily-report.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class DailyReportRepositoryImpl implements IDailyReportRepository {
  constructor(private readonly http: IHttpPort) {}

  async findById(merchantUuid: string, reportUuid: string): Promise<DailyReport> {
    const response = await this.http.get<DailyReportApiOutput>(
      `/mf2/merchants/${merchantUuid}/daily-reports/${reportUuid}`
    );
    return DailyReportMapper.fromApiOutput(response.data);
  }

  async findAll(merchantUuid: string, params?: DailyReportsParams): Promise<Page<DailyReport>> {
    const queryParams = DailyReportMapper.toListParams(params);
    const response = await this.http.get<Page<DailyReportApiOutput>>(
      `/mf2/merchants/${merchantUuid}/daily-reports`,
      { params: queryParams }
    );
    return DailyReportMapper.pageFromApi(response.data);
  }
}
