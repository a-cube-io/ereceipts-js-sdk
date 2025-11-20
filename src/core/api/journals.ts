import { HttpClient } from './http-client';
import { 
  JournalOutput, 
  JournalsParams,
} from './types';

/**
 * Journals API manager (MF2)
 */
export class JournalsAPI {
  constructor(private httpClient: HttpClient) {}

  /**
   * Retrieve the collection of Journal resources
   */
  async list(params: JournalsParams = {}): Promise<JournalOutput[]> {
    const searchParams = new URLSearchParams();
    
    if (params.pem_serial_number) {
      searchParams.append('pem_serial_number', params.pem_serial_number);
    }
    if (params.status) {
      searchParams.append('status', params.status);
    }
    if (params.date_from) {
      searchParams.append('date_from', params.date_from);
    }
    if (params.date_to) {
      searchParams.append('date_to', params.date_to);
    }
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }

    const query = searchParams.toString();
    const url = query ? `/mf2/journals?${query}` : '/mf2/journals';
    
    return this.httpClient.get<JournalOutput[]>(url);
  }

  /**
   * Retrieve a Journal resource by UUID
   */
  async get(uuid: string): Promise<JournalOutput> {
    return this.httpClient.get<JournalOutput>(`/mf2/journals/${uuid}`);
  }
}