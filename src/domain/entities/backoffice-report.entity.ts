export type BackofficeReportStatus = 'queued' | 'processing' | 'ready' | 'failed';

export type BackofficeReportType = 'journal_closure' | 'journal_reading' | 'telemetry' | 'details';

export interface BackofficeReport {
  uuid: string;
  status: BackofficeReportStatus;
  issuanceDatetime: string;
  type: BackofficeReportType;
  documentNumber?: string | null;
  journalProgressiveNumber?: number | null;
}

export interface BackofficeReportsParams {
  page?: number;
  size?: number;
  type?: BackofficeReportType | BackofficeReportType[];
  issuanceDatetimeBefore?: string;
  issuanceDatetimeStrictlyBefore?: string;
  issuanceDatetimeAfter?: string;
  issuanceDatetimeStrictlyAfter?: string;
}

export interface BackofficeReportQueued {
  uuid: string;
}

export interface DocumentNumberFilter {
  documentNumber: string;
}

/**
 * `details` is currently the only implemented report flavour/filter combination.
 */
export interface QueueReceiptsBackofficeReportInput {
  type: 'details';
  filterBy: DocumentNumberFilter;
}
