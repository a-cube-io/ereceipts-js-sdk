import {
  BackofficeReportApiOutput,
  BackofficeReportMapper,
  BackofficeReportQueuedApiOutput,
} from '@/application/dto/backoffice-report.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  BackofficeReport,
  BackofficeReportQueued,
  BackofficeReportsParams,
  QueueReceiptsBackofficeReportInput,
} from '@/domain/entities/backoffice-report.entity';
import { IBackofficeReportRepository } from '@/domain/repositories/backoffice-report.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class BackofficeReportRepositoryImpl implements IBackofficeReportRepository {
  constructor(private readonly http: IHttpPort) {}

  async findAll(
    serialNumber: string,
    params?: BackofficeReportsParams
  ): Promise<Page<BackofficeReport>> {
    const queryString = BackofficeReportMapper.toListSearchParams(params).toString();
    const url = `/mf1/pems/${serialNumber}/backoffice-reports${queryString ? `?${queryString}` : ''}`;
    const response = await this.http.get<Page<BackofficeReportApiOutput>>(url);
    return BackofficeReportMapper.pageFromApi(response.data);
  }

  async downloadPdf(serialNumber: string, reportUuid: string): Promise<string> {
    const response = await this.http.get<string>(
      `/mf1/pems/${serialNumber}/backoffice-reports/${reportUuid}/pdf`,
      {
        headers: { Accept: 'application/pdf' },
        responseType: 'arraybuffer',
      }
    );
    return response.data;
  }

  async queueJournalReading(serialNumber: string): Promise<BackofficeReportQueued> {
    const response = await this.http.post<BackofficeReportQueuedApiOutput>(
      `/mf1/pems/${serialNumber}/backoffice-reports/journal-reading`
    );
    return BackofficeReportMapper.queuedFromApiOutput(response.data);
  }

  async queueTelemetry(serialNumber: string): Promise<BackofficeReportQueued> {
    const response = await this.http.post<BackofficeReportQueuedApiOutput>(
      `/mf1/pems/${serialNumber}/backoffice-reports/telemetry`
    );
    return BackofficeReportMapper.queuedFromApiOutput(response.data);
  }

  async queueReceiptsReport(
    serialNumber: string,
    input: QueueReceiptsBackofficeReportInput
  ): Promise<BackofficeReportQueued> {
    const apiInput = BackofficeReportMapper.toQueueReceiptsApiInput(input);
    const response = await this.http.post<BackofficeReportQueuedApiOutput>(
      `/mf1/pems/${serialNumber}/backoffice-reports/receipts`,
      apiInput
    );
    return BackofficeReportMapper.queuedFromApiOutput(response.data);
  }
}
