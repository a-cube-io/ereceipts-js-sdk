import {
  BackofficeReportApiOutput,
  BackofficeReportMapper,
  BackofficeReportRequestApiOutput,
  BackofficeReportRequestQueuedApiOutput,
} from '@/application/dto/backoffice-report.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  BackofficeReport,
  BackofficeReportRequest,
  BackofficeReportRequestQueued,
  BackofficeReportRequestsParams,
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

  async findAllRequests(
    serialNumber: string,
    params?: BackofficeReportRequestsParams
  ): Promise<Page<BackofficeReportRequest>> {
    const queryString = BackofficeReportMapper.toRequestsListSearchParams(params).toString();
    const url = `/mf1/pems/${serialNumber}/backoffice-reports/requests${queryString ? `?${queryString}` : ''}`;
    const response = await this.http.get<Page<BackofficeReportRequestApiOutput>>(url);
    return BackofficeReportMapper.requestsPageFromApi(response.data);
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

  async queueJournalReading(serialNumber: string): Promise<BackofficeReportRequestQueued> {
    const response = await this.http.post<BackofficeReportRequestQueuedApiOutput>(
      `/mf1/pems/${serialNumber}/backoffice-reports/journal-reading`
    );
    return BackofficeReportMapper.requestQueuedFromApiOutput(response.data);
  }

  async queueTelemetry(serialNumber: string): Promise<BackofficeReportRequestQueued> {
    const response = await this.http.post<BackofficeReportRequestQueuedApiOutput>(
      `/mf1/pems/${serialNumber}/backoffice-reports/telemetry`
    );
    return BackofficeReportMapper.requestQueuedFromApiOutput(response.data);
  }

  async queueReceiptsReport(
    serialNumber: string,
    input: QueueReceiptsBackofficeReportInput
  ): Promise<BackofficeReportRequestQueued> {
    const apiInput = BackofficeReportMapper.toQueueReceiptsApiInput(input);
    const response = await this.http.post<BackofficeReportRequestQueuedApiOutput>(
      `/mf1/pems/${serialNumber}/backoffice-reports/receipts`,
      apiInput
    );
    return BackofficeReportMapper.requestQueuedFromApiOutput(response.data);
  }
}
