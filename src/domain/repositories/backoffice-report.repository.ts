import {
  BackofficeReport,
  BackofficeReportQueued,
  BackofficeReportsParams,
  QueueReceiptsBackofficeReportInput,
} from '@/domain/entities/backoffice-report.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IBackofficeReportRepository {
  findAll(serialNumber: string, params?: BackofficeReportsParams): Promise<Page<BackofficeReport>>;
  downloadPdf(serialNumber: string, reportUuid: string): Promise<string>;
  queueJournalReading(serialNumber: string): Promise<BackofficeReportQueued>;
  queueTelemetry(serialNumber: string): Promise<BackofficeReportQueued>;
  queueReceiptsReport(
    serialNumber: string,
    input: QueueReceiptsBackofficeReportInput
  ): Promise<BackofficeReportQueued>;
}
