import { JournalApiOutput, JournalMapper } from '@/application/dto/journal.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { Journal, JournalCloseInput, JournalsParams } from '@/domain/entities/journal.entity';
import { IJournalRepository } from '@/domain/repositories/journal.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class JournalRepositoryImpl implements IJournalRepository {
  constructor(private readonly http: IHttpPort) {}

  async findById(merchantUuid: string, journalUuid: string): Promise<Journal> {
    const response = await this.http.get<JournalApiOutput>(
      `/mf2/merchants/${merchantUuid}/journals/${journalUuid}`
    );
    return JournalMapper.fromApiOutput(response.data);
  }

  async findAll(merchantUuid: string, params?: JournalsParams): Promise<Page<Journal>> {
    const queryParams = JournalMapper.toListParams(params);
    const response = await this.http.get<Page<JournalApiOutput>>(
      `/mf2/merchants/${merchantUuid}/journals`,
      { params: queryParams }
    );
    return JournalMapper.pageFromApi(response.data);
  }

  async close(merchantUuid: string, input: JournalCloseInput): Promise<Journal> {
    const apiInput = JournalMapper.toCloseApiInput(input);
    const response = await this.http.post<JournalApiOutput>(
      `/mf2/merchants/${merchantUuid}/journals/close`,
      apiInput
    );
    return JournalMapper.fromApiOutput(response.data);
  }
}
