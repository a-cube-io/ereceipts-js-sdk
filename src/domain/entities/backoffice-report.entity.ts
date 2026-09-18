export type BackofficeReportStatus = 'queued' | 'processing' | 'ready' | 'failed';

export type BackofficeReportType = 'journal_closure' | 'journal_reading' | 'telemetry' | 'details';

export type BackofficeReportRequestStatus = 'queued' | 'processed' | 'failed';

export interface BackofficeReport {
  uuid: string;
  status: BackofficeReportStatus;
  issuanceDatetime: string;
  type: BackofficeReportType;
  documentNumber?: string | null;
  journalId?: number | null;
  requestUuid: string;
  requestDatetime: string;
}

export interface BackofficeReportsParams {
  page?: number;
  size?: number;
  type?: BackofficeReportType | BackofficeReportType[];
  requestUuid?: string;
  issuanceDatetimeBefore?: string;
  issuanceDatetimeStrictlyBefore?: string;
  issuanceDatetimeAfter?: string;
  issuanceDatetimeStrictlyAfter?: string;
}

export interface BackofficeReportRequestReports {
  ready: boolean;
  count: number;
  readyCount: number;
}

/**
 * `filterBy` is a free-form echo of the filter the request was created with
 * (e.g. DocumentNumberFilter for receipts reports); shape depends on `type`.
 */
export interface BackofficeReportRequest {
  requestUuid: string;
  type: BackofficeReportType;
  filterBy?: Record<string, unknown> | null;
  status: BackofficeReportRequestStatus;
  requestDatetime: string;
  reports?: BackofficeReportRequestReports | null;
}

export interface BackofficeReportRequestsParams {
  page?: number;
  size?: number;
  type?: BackofficeReportType | BackofficeReportType[];
  requestDatetimeBefore?: string;
  requestDatetimeStrictlyBefore?: string;
  requestDatetimeAfter?: string;
  requestDatetimeStrictlyAfter?: string;
}

export interface BackofficeReportRequestQueued {
  requestUuid: string;
}

export interface DocumentNumberFilter {
  documentNumber: string;
}

export interface DocumentNumberRange {
  start: string;
  end: string;
}

export interface DocumentNumberRangeFilter {
  documentNumbers: DocumentNumberRange;
}

export interface DateIntervalFilter {
  startingDate: string;
  endingDate: string;
}

export type QueueReceiptsBackofficeReportFilter =
  | DocumentNumberFilter
  | DocumentNumberRangeFilter
  | DateIntervalFilter;

/**
 * `details` is currently the only implemented report flavour.
 */
export interface QueueReceiptsBackofficeReportInput {
  type: 'details';
  filterBy: QueueReceiptsBackofficeReportFilter;
}
