import {
  BackofficeReport,
  BackofficeReportRequest,
  BackofficeReportRequestQueued,
  BackofficeReportRequestReports,
  BackofficeReportRequestStatus,
  BackofficeReportRequestsParams,
  BackofficeReportStatus,
  BackofficeReportType,
  BackofficeReportsParams,
  QueueReceiptsBackofficeReportFilter,
  QueueReceiptsBackofficeReportInput,
} from '@/domain/entities/backoffice-report.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface BackofficeReportApiOutput {
  uuid: string;
  status: BackofficeReportStatus;
  issuance_datetime: string;
  type: BackofficeReportType;
  document_number?: string | null;
  journal_id?: number | null;
  request_uuid: string;
  request_datetime: string;
}

export interface BackofficeReportRequestReportsApiOutput {
  ready: boolean;
  count: number;
  ready_count: number;
}

export interface BackofficeReportRequestApiOutput {
  request_uuid: string;
  type: BackofficeReportType;
  filter_by?: Record<string, unknown> | null;
  status: BackofficeReportRequestStatus;
  request_datetime: string;
  reports?: BackofficeReportRequestReportsApiOutput | null;
}

export interface BackofficeReportRequestQueuedApiOutput {
  request_uuid: string;
}

export interface DocumentNumberFilterApiInput {
  document_number: string;
}

export interface DocumentNumberRangeApiInput {
  start: string;
  end: string;
}

export interface DocumentNumberRangeFilterApiInput {
  document_numbers: DocumentNumberRangeApiInput;
}

export interface DateIntervalFilterApiInput {
  starting_date: string;
  ending_date: string;
}

export type QueueReceiptsBackofficeReportFilterApiInput =
  | DocumentNumberFilterApiInput
  | DocumentNumberRangeFilterApiInput
  | DateIntervalFilterApiInput;

export interface QueueReceiptsBackofficeReportApiInput {
  type: 'details';
  filter_by: QueueReceiptsBackofficeReportFilterApiInput;
}

export class BackofficeReportMapper {
  static fromApiOutput(output: BackofficeReportApiOutput): BackofficeReport {
    return {
      uuid: output.uuid,
      status: output.status,
      issuanceDatetime: output.issuance_datetime,
      type: output.type,
      documentNumber: output.document_number,
      journalId: output.journal_id,
      requestUuid: output.request_uuid,
      requestDatetime: output.request_datetime,
    };
  }

  static requestQueuedFromApiOutput(
    output: BackofficeReportRequestQueuedApiOutput
  ): BackofficeReportRequestQueued {
    return {
      requestUuid: output.request_uuid,
    };
  }

  static requestReportsFromApiOutput(
    output: BackofficeReportRequestReportsApiOutput
  ): BackofficeReportRequestReports {
    return {
      ready: output.ready,
      count: output.count,
      readyCount: output.ready_count,
    };
  }

  static requestFromApiOutput(output: BackofficeReportRequestApiOutput): BackofficeReportRequest {
    return {
      requestUuid: output.request_uuid,
      type: output.type,
      filterBy: output.filter_by,
      status: output.status,
      requestDatetime: output.request_datetime,
      reports: output.reports
        ? BackofficeReportMapper.requestReportsFromApiOutput(output.reports)
        : output.reports,
    };
  }

  static toQueueReceiptsApiInput(
    input: QueueReceiptsBackofficeReportInput
  ): QueueReceiptsBackofficeReportApiInput {
    return {
      type: input.type,
      filter_by: BackofficeReportMapper.filterByToApiInput(input.filterBy),
    };
  }

  static filterByToApiInput(
    filterBy: QueueReceiptsBackofficeReportFilter
  ): QueueReceiptsBackofficeReportFilterApiInput {
    if ('documentNumber' in filterBy) {
      return { document_number: filterBy.documentNumber };
    }
    if ('documentNumbers' in filterBy) {
      return {
        document_numbers: {
          start: filterBy.documentNumbers.start,
          end: filterBy.documentNumbers.end,
        },
      };
    }
    return {
      starting_date: filterBy.startingDate,
      ending_date: filterBy.endingDate,
    };
  }

  static toListSearchParams(params?: BackofficeReportsParams): URLSearchParams {
    const searchParams = new URLSearchParams();
    if (!params) return searchParams;

    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.size !== undefined) searchParams.set('size', String(params.size));

    if (params.type !== undefined) {
      const types = Array.isArray(params.type) ? params.type : [params.type];
      types.forEach((type) => searchParams.append('type', type));
    }

    if (params.requestUuid !== undefined) {
      searchParams.set('request_uuid', params.requestUuid);
    }

    if (params.issuanceDatetimeBefore !== undefined) {
      searchParams.set('issuance_datetime[before]', params.issuanceDatetimeBefore);
    }
    if (params.issuanceDatetimeStrictlyBefore !== undefined) {
      searchParams.set('issuance_datetime[strictly_before]', params.issuanceDatetimeStrictlyBefore);
    }
    if (params.issuanceDatetimeAfter !== undefined) {
      searchParams.set('issuance_datetime[after]', params.issuanceDatetimeAfter);
    }
    if (params.issuanceDatetimeStrictlyAfter !== undefined) {
      searchParams.set('issuance_datetime[strictly_after]', params.issuanceDatetimeStrictlyAfter);
    }

    return searchParams;
  }

  static pageFromApi(data: {
    members: BackofficeReportApiOutput[];
    total?: number;
    page?: number;
    size?: number;
    pages?: number;
  }): Page<BackofficeReport> {
    return {
      members: data.members.map((item) => BackofficeReportMapper.fromApiOutput(item)),
      total: data.total,
      page: data.page,
      size: data.size,
      pages: data.pages,
    };
  }

  static toRequestsListSearchParams(params?: BackofficeReportRequestsParams): URLSearchParams {
    const searchParams = new URLSearchParams();
    if (!params) return searchParams;

    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.size !== undefined) searchParams.set('size', String(params.size));

    return searchParams;
  }

  static requestsPageFromApi(data: {
    members: BackofficeReportRequestApiOutput[];
    total?: number;
    page?: number;
    size?: number;
    pages?: number;
  }): Page<BackofficeReportRequest> {
    return {
      members: data.members.map((item) => BackofficeReportMapper.requestFromApiOutput(item)),
      total: data.total,
      page: data.page,
      size: data.size,
      pages: data.pages,
    };
  }
}
