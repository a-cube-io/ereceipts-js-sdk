import {
  BackofficeReport,
  BackofficeReportRequest,
  BackofficeReportRequestQueued,
  BackofficeReportRequestsParams,
  BackofficeReportsParams,
  QueueReceiptsBackofficeReportInput,
} from '@/domain/entities/backoffice-report.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IBackofficeReportRepository {
  findAll(serialNumber: string, params?: BackofficeReportsParams): Promise<Page<BackofficeReport>>;
  findAllRequests(
    serialNumber: string,
    params?: BackofficeReportRequestsParams
  ): Promise<Page<BackofficeReportRequest>>;
  downloadPdf(serialNumber: string, reportUuid: string): Promise<string>;
  queueJournalReading(serialNumber: string): Promise<BackofficeReportRequestQueued>;
  queueTelemetry(serialNumber: string): Promise<BackofficeReportRequestQueued>;
  queueReceiptsReport(
    serialNumber: string,
    input: QueueReceiptsBackofficeReportInput
  ): Promise<BackofficeReportRequestQueued>;
}
