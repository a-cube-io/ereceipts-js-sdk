import { DailyReport, DailyReportsParams } from '@/domain/entities/daily-report.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IDailyReportRepository {
  findById(merchantUuid: string, reportUuid: string): Promise<DailyReport>;
  findAll(merchantUuid: string, params?: DailyReportsParams): Promise<Page<DailyReport>>;
}
