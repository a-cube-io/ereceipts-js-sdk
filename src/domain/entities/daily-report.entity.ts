export type DailyReportStatus = 'pending' | 'sent' | 'error';

export interface DailyReport {
  uuid: string;
  pemSerialNumber: string;
  date: string;
  totalReceipts: number;
  totalAmount: string;
  status: DailyReportStatus;
}

export interface DailyReportsParams {
  pemSerialNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: DailyReportStatus;
  page?: number;
}
