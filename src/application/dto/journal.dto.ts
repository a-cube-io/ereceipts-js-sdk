import {
  Journal,
  JournalCloseInput,
  JournalStatus,
  JournalsParams,
} from '@/domain/entities/journal.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface JournalApiOutput {
  uuid: string;
  pem_serial_number: string;
  date: string;
  sequence_number: number;
  total_receipts: number;
  total_amount: string;
  status: 'open' | 'closed';
}

export class JournalMapper {
  static fromApiOutput(output: JournalApiOutput): Journal {
    return {
      uuid: output.uuid,
      pemSerialNumber: output.pem_serial_number,
      date: output.date,
      sequenceNumber: output.sequence_number,
      totalReceipts: output.total_receipts,
      totalAmount: output.total_amount,
      status: output.status as JournalStatus,
    };
  }

  static toListParams(params?: JournalsParams): Record<string, string | number | undefined> {
    if (!params) return {};

    return {
      pem_serial_number: params.pemSerialNumber,
      status: params.status,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      page: params.page,
    };
  }

  static toCloseApiInput(input: JournalCloseInput): { journal_uuid: string } {
    return {
      journal_uuid: input.journalUuid,
    };
  }

  static pageFromApi(data: {
    members: JournalApiOutput[];
    total?: number;
    page?: number;
    size?: number;
    pages?: number;
  }): Page<Journal> {
    return {
      members: data.members.map((item) => JournalMapper.fromApiOutput(item)),
      total: data.total,
      page: data.page,
      size: data.size,
      pages: data.pages,
    };
  }
}
