import {
  DailyReport,
  DailyReportStatus,
  DailyReportsParams,
} from '@/domain/entities/daily-report.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface DailyReportApiOutput {
  uuid: string;
  pem_serial_number: string;
  date: string;
  total_receipts: number;
  total_amount: string;
  status: 'pending' | 'sent' | 'error';
}

export class DailyReportMapper {
  static fromApiOutput(output: DailyReportApiOutput): DailyReport {
    return {
      uuid: output.uuid,
      pemSerialNumber: output.pem_serial_number,
      date: output.date,
      totalReceipts: output.total_receipts,
      totalAmount: output.total_amount,
      status: output.status as DailyReportStatus,
    };
  }

  static toListParams(params?: DailyReportsParams): Record<string, string | number | undefined> {
    if (!params) return {};

    return {
      pem_serial_number: params.pemSerialNumber,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      status: params.status,
      page: params.page,
    };
  }

  static pageFromApi(data: {
    members: DailyReportApiOutput[];
    total?: number;
    page?: number;
    size?: number;
    pages?: number;
  }): Page<DailyReport> {
    return {
      members: data.members.map((item) => DailyReportMapper.fromApiOutput(item)),
      total: data.total,
      page: data.page,
      size: data.size,
      pages: data.pages,
    };
  }
}
