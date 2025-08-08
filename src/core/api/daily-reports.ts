import { HttpClient } from './http-client';
import { 
  DailyReportOutput, 
  DailyReportsParams
} from './types';

/**
 * Daily Reports API manager (MF2)
 */
export class DailyReportsAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Retrieve the collection of Daily Report resources
   */
  async list(params: DailyReportsParams = {}): Promise<DailyReportOutput[]> {
    const searchParams = new URLSearchParams();
    
    if (params.pem_serial_number) {
      searchParams.append('pem_serial_number', params.pem_serial_number);
    }
    if (params.date_from) {
      searchParams.append('date_from', params.date_from);
    }
    if (params.date_to) {
      searchParams.append('date_to', params.date_to);
    }
    if (params.status) {
      searchParams.append('status', params.status);
    }
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf2/daily-reports?${query}` : '/mf2/daily-reports';
    
    return this.httpClient.get<DailyReportOutput[]>(url);
  }

  /**
   * Retrieve a Daily Report resource by UUID
   */
  async get(uuid: string): Promise<DailyReportOutput> {
    return this.httpClient.get<DailyReportOutput>(`/mf2/daily-reports/${uuid}`);
  }

  /**
   * Regenerate/resend a daily report
   */
  async regenerate(uuid: string): Promise<DailyReportOutput> {
    return this.httpClient.post<DailyReportOutput>(`/mf2/daily-reports/${uuid}/regenerate`);
  }
}