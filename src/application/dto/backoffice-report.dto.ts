import {
  BackofficeReport,
  BackofficeReportQueued,
  BackofficeReportStatus,
  BackofficeReportType,
  BackofficeReportsParams,
  QueueReceiptsBackofficeReportInput,
} from '@/domain/entities/backoffice-report.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface BackofficeReportApiOutput {
  uuid: string;
  status: BackofficeReportStatus;
  issuance_datetime: string;
  type: BackofficeReportType;
  document_number?: string | null;
  journal_progressive_number?: number | null;
}

export interface BackofficeReportQueuedApiOutput {
  uuid: string;
}

export interface DocumentNumberFilterApiInput {
  document_number: string;
}

export interface QueueReceiptsBackofficeReportApiInput {
  type: 'details';
  filter_by: DocumentNumberFilterApiInput;
}

export class BackofficeReportMapper {
  static fromApiOutput(output: BackofficeReportApiOutput): BackofficeReport {
    return {
      uuid: output.uuid,
      status: output.status,
      issuanceDatetime: output.issuance_datetime,
      type: output.type,
      documentNumber: output.document_number,
      journalProgressiveNumber: output.journal_progressive_number,
    };
  }

  static queuedFromApiOutput(output: BackofficeReportQueuedApiOutput): BackofficeReportQueued {
    return {
      uuid: output.uuid,
    };
  }

  static toQueueReceiptsApiInput(
    input: QueueReceiptsBackofficeReportInput
  ): QueueReceiptsBackofficeReportApiInput {
    return {
      type: input.type,
      filter_by: {
        document_number: input.filterBy.documentNumber,
      },
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
}
