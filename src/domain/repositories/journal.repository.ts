import { Journal, JournalCloseInput, JournalsParams } from '@/domain/entities/journal.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IJournalRepository {
  findById(merchantUuid: string, journalUuid: string): Promise<Journal>;
  findAll(merchantUuid: string, params?: JournalsParams): Promise<Page<Journal>>;
  close(merchantUuid: string, input: JournalCloseInput): Promise<Journal>;
}
