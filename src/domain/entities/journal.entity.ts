export type JournalStatus = 'open' | 'closed';

export interface Journal {
  uuid: string;
  pemSerialNumber: string;
  date: string;
  sequenceNumber: number;
  totalReceipts: number;
  totalAmount: string;
  status: JournalStatus;
}

export interface JournalsParams {
  pemSerialNumber?: string;
  status?: JournalStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

export interface JournalCloseInput {
  journalUuid: string;
}
