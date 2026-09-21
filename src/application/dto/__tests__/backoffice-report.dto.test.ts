import {
  BackofficeReportRequestsParams,
  BackofficeReportsParams,
  QueueReceiptsBackofficeReportInput,
} from '@/domain/entities/backoffice-report.entity';

import {
  BackofficeReportApiOutput,
  BackofficeReportMapper,
  BackofficeReportRequestApiOutput,
} from '../backoffice-report.dto';

describe('BackofficeReportMapper', () => {
  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: BackofficeReportApiOutput = {
        uuid: 'report-uuid-123',
        status: 'ready',
        issuance_datetime: '2025-10-08 16:20:42',
        type: 'journal_reading',
        document_number: '0002-0008',
        journal_id: 4,
        request_uuid: 'request-uuid-123',
        request_datetime: '2025-10-08 16:20:40',
      };

      const result = BackofficeReportMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'report-uuid-123',
        status: 'ready',
        issuanceDatetime: '2025-10-08 16:20:42',
        type: 'journal_reading',
        documentNumber: '0002-0008',
        journalId: 4,
        requestUuid: 'request-uuid-123',
        requestDatetime: '2025-10-08 16:20:40',
      });
    });

    it('should handle null document_number and journal_id', () => {
      const output: BackofficeReportApiOutput = {
        uuid: 'report-uuid',
        status: 'queued',
        issuance_datetime: '2025-10-08 16:20:42',
        type: 'details',
        document_number: null,
        journal_id: null,
        request_uuid: 'request-uuid',
        request_datetime: '2025-10-08 16:20:40',
      };

      const result = BackofficeReportMapper.fromApiOutput(output);

      expect(result.documentNumber).toBeNull();
      expect(result.journalId).toBeNull();
    });

    it('should map filter_by to filterBy', () => {
      const output: BackofficeReportApiOutput = {
        uuid: 'report-uuid',
        status: 'ready',
        issuance_datetime: '2025-10-08 16:20:42',
        type: 'details',
        document_number: '0002-0008',
        journal_id: 4,
        request_uuid: 'request-uuid',
        request_datetime: '2025-10-08 16:20:40',
        filter_by: { document_number: '0002-0008' },
      };

      const result = BackofficeReportMapper.fromApiOutput(output);

      expect(result.filterBy).toEqual({ document_number: '0002-0008' });
    });
  });

  describe('requestQueuedFromApiOutput', () => {
    it('should map request_uuid to requestUuid', () => {
      const result = BackofficeReportMapper.requestQueuedFromApiOutput({
        request_uuid: 'queued-request-uuid',
      });

      expect(result).toEqual({ requestUuid: 'queued-request-uuid' });
    });
  });

  describe('requestReportsFromApiOutput', () => {
    it('should map ready_count to readyCount', () => {
      const result = BackofficeReportMapper.requestReportsFromApiOutput({
        ready: false,
        count: 3,
        ready_count: 1,
      });

      expect(result).toEqual({ ready: false, count: 3, readyCount: 1 });
    });
  });

  describe('requestFromApiOutput', () => {
    it('should map snake_case to camelCase including nested reports', () => {
      const output: BackofficeReportRequestApiOutput = {
        request_uuid: 'request-uuid-123',
        type: 'details',
        filter_by: { document_number: '1234-5678' },
        status: 'processed',
        request_datetime: '2025-10-08 16:20:40',
        reports: { ready: true, count: 1, ready_count: 1 },
      };

      const result = BackofficeReportMapper.requestFromApiOutput(output);

      expect(result).toEqual({
        requestUuid: 'request-uuid-123',
        type: 'details',
        filterBy: { document_number: '1234-5678' },
        status: 'processed',
        requestDatetime: '2025-10-08 16:20:40',
        reports: { ready: true, count: 1, readyCount: 1 },
      });
    });

    it('should handle null/undefined reports', () => {
      const output: BackofficeReportRequestApiOutput = {
        request_uuid: 'request-uuid',
        type: 'journal_reading',
        status: 'queued',
        request_datetime: '2025-10-08 16:20:40',
        reports: null,
      };

      const result = BackofficeReportMapper.requestFromApiOutput(output);

      expect(result.reports).toBeNull();
    });
  });

  describe('toQueueReceiptsApiInput', () => {
    it('should map a DocumentNumberFilter', () => {
      const input: QueueReceiptsBackofficeReportInput = {
        type: 'details',
        filterBy: { documentNumber: '1234-5678' },
      };

      const result = BackofficeReportMapper.toQueueReceiptsApiInput(input);

      expect(result).toEqual({
        type: 'details',
        filter_by: { document_number: '1234-5678' },
      });
    });

    it('should map a DocumentNumberRangeFilter', () => {
      const input: QueueReceiptsBackofficeReportInput = {
        type: 'details',
        filterBy: { documentNumbers: { start: '0001-0001', end: '0001-0009' } },
      };

      const result = BackofficeReportMapper.toQueueReceiptsApiInput(input);

      expect(result).toEqual({
        type: 'details',
        filter_by: { document_numbers: { start: '0001-0001', end: '0001-0009' } },
      });
    });

    it('should map a DateIntervalFilter', () => {
      const input: QueueReceiptsBackofficeReportInput = {
        type: 'details',
        filterBy: { startingDate: '2025-12-31', endingDate: '2026-02-15' },
      };

      const result = BackofficeReportMapper.toQueueReceiptsApiInput(input);

      expect(result).toEqual({
        type: 'details',
        filter_by: { starting_date: '2025-12-31', ending_date: '2026-02-15' },
      });
    });
  });

  describe('toListSearchParams', () => {
    it('should return empty params for undefined params', () => {
      const result = BackofficeReportMapper.toListSearchParams(undefined);

      expect(result.toString()).toBe('');
    });

    it('should map page and size', () => {
      const params: BackofficeReportsParams = { page: 2, size: 10 };

      const result = BackofficeReportMapper.toListSearchParams(params);

      expect(result.get('page')).toBe('2');
      expect(result.get('size')).toBe('10');
    });

    it('should append a single type as one query param', () => {
      const params: BackofficeReportsParams = { type: 'telemetry' };

      const result = BackofficeReportMapper.toListSearchParams(params);

      expect(result.getAll('type')).toEqual(['telemetry']);
    });

    it('should append multiple types as repeated query params', () => {
      const params: BackofficeReportsParams = { type: ['journal_reading', 'telemetry'] };

      const result = BackofficeReportMapper.toListSearchParams(params);

      expect(result.getAll('type')).toEqual(['journal_reading', 'telemetry']);
    });

    it('should map requestUuid to request_uuid', () => {
      const params: BackofficeReportsParams = { requestUuid: 'request-uuid-123' };

      const result = BackofficeReportMapper.toListSearchParams(params);

      expect(result.get('request_uuid')).toBe('request-uuid-123');
    });

    it('should map issuance datetime filters to bracket notation', () => {
      const params: BackofficeReportsParams = {
        issuanceDatetimeBefore: '2024-01-31T23:59:59Z',
        issuanceDatetimeStrictlyBefore: '2024-01-31T00:00:00Z',
        issuanceDatetimeAfter: '2024-01-01T00:00:00Z',
        issuanceDatetimeStrictlyAfter: '2024-01-01T00:00:01Z',
      };

      const result = BackofficeReportMapper.toListSearchParams(params);

      expect(result.get('issuance_datetime[before]')).toBe('2024-01-31T23:59:59Z');
      expect(result.get('issuance_datetime[strictly_before]')).toBe('2024-01-31T00:00:00Z');
      expect(result.get('issuance_datetime[after]')).toBe('2024-01-01T00:00:00Z');
      expect(result.get('issuance_datetime[strictly_after]')).toBe('2024-01-01T00:00:01Z');
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response', () => {
      const data = {
        members: [
          {
            uuid: 'r1',
            status: 'ready' as const,
            issuance_datetime: '2025-10-08 16:20:42',
            type: 'journal_reading' as const,
            document_number: '0001-0001',
            journal_id: 1,
            request_uuid: 'req-1',
            request_datetime: '2025-10-08 16:20:40',
          },
          {
            uuid: 'r2',
            status: 'queued' as const,
            issuance_datetime: '2025-10-08 17:00:00',
            type: 'telemetry' as const,
            request_uuid: 'req-2',
            request_datetime: '2025-10-08 16:59:59',
          },
        ],
        total: 2,
        page: 1,
        size: 30,
        pages: 1,
      };

      const result = BackofficeReportMapper.pageFromApi(data);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].journalId).toBe(1);
      expect(result.members[1].requestUuid).toBe('req-2');
      expect(result.members[1].status).toBe('queued');
      expect(result.total).toBe(2);
    });

    it('should handle empty page', () => {
      const data = { members: [], total: 0, page: 1, size: 30, pages: 0 };

      const result = BackofficeReportMapper.pageFromApi(data);

      expect(result.members).toEqual([]);
    });
  });

  describe('toRequestsListSearchParams', () => {
    it('should return empty params for undefined params', () => {
      const result = BackofficeReportMapper.toRequestsListSearchParams(undefined);

      expect(result.toString()).toBe('');
    });

    it('should map page and size', () => {
      const params: BackofficeReportRequestsParams = { page: 2, size: 10 };

      const result = BackofficeReportMapper.toRequestsListSearchParams(params);

      expect(result.get('page')).toBe('2');
      expect(result.get('size')).toBe('10');
    });

    it('should append a single type as one query param', () => {
      const params: BackofficeReportRequestsParams = { type: 'telemetry' };

      const result = BackofficeReportMapper.toRequestsListSearchParams(params);

      expect(result.getAll('type')).toEqual(['telemetry']);
    });

    it('should append multiple types as repeated query params', () => {
      const params: BackofficeReportRequestsParams = {
        type: ['journal_reading', 'telemetry'],
      };

      const result = BackofficeReportMapper.toRequestsListSearchParams(params);

      expect(result.getAll('type')).toEqual(['journal_reading', 'telemetry']);
    });

    it('should map request datetime filters to bracket notation', () => {
      const params: BackofficeReportRequestsParams = {
        requestDatetimeBefore: '2024-01-31T23:59:59Z',
        requestDatetimeStrictlyBefore: '2024-01-31T00:00:00Z',
        requestDatetimeAfter: '2024-01-01T00:00:00Z',
        requestDatetimeStrictlyAfter: '2024-01-01T00:00:01Z',
      };

      const result = BackofficeReportMapper.toRequestsListSearchParams(params);

      expect(result.get('request_datetime[before]')).toBe('2024-01-31T23:59:59Z');
      expect(result.get('request_datetime[strictly_before]')).toBe('2024-01-31T00:00:00Z');
      expect(result.get('request_datetime[after]')).toBe('2024-01-01T00:00:00Z');
      expect(result.get('request_datetime[strictly_after]')).toBe('2024-01-01T00:00:01Z');
    });
  });

  describe('requestsPageFromApi', () => {
    it('should map paginated response', () => {
      const data = {
        members: [
          {
            request_uuid: 'req-1',
            type: 'details' as const,
            filter_by: { document_number: '0001-0001' },
            status: 'processed' as const,
            request_datetime: '2025-10-08 16:20:40',
            reports: { ready: true, count: 1, ready_count: 1 },
          },
          {
            request_uuid: 'req-2',
            type: 'telemetry' as const,
            status: 'queued' as const,
            request_datetime: '2025-10-08 16:59:59',
            reports: null,
          },
        ],
        total: 2,
        page: 1,
        size: 30,
        pages: 1,
      };

      const result = BackofficeReportMapper.requestsPageFromApi(data);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].reports).toEqual({ ready: true, count: 1, readyCount: 1 });
      expect(result.members[1].status).toBe('queued');
      expect(result.total).toBe(2);
    });

    it('should handle empty page', () => {
      const data = { members: [], total: 0, page: 1, size: 30, pages: 0 };

      const result = BackofficeReportMapper.requestsPageFromApi(data);

      expect(result.members).toEqual([]);
    });
  });
});
