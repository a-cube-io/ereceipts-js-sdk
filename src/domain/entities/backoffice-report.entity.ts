export type BackofficeReportStatus = 'queued' | 'processing' | 'ready' | 'failed';

export type BackofficeReportType =
  | 'journal_closure'
  | 'journal_reading'
  | 'diagnostics'
  | 'details'
  | 'summary';

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
  filterBy?: Record<string, unknown> | null;
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
 * Line-item details of the receipt(s) in `filterBy`.
 */
export interface QueueDetailsReceiptsBackofficeReportInput {
  type: 'details';
  filterBy: QueueReceiptsBackofficeReportFilter;
}

/**
 * Summary data of the receipts in `filterBy`, grouped by VAT treatment
 * (and by ATECO code for multi-activity merchants).
 * `filterBy` is either a document-number range (within a single journal)
 * or a date interval covering already available daily reports.
 */
export interface QueueSummaryReceiptsBackofficeReportInput {
  type: 'summary';
  filterBy: DocumentNumberRangeFilter | DateIntervalFilter;
}

export type QueueReceiptsBackofficeReportInput =
  | QueueDetailsReceiptsBackofficeReportInput
  | QueueSummaryReceiptsBackofficeReportInput;
