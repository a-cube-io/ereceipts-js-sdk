import {
  BackofficeReportsParams,
  QueueReceiptsBackofficeReportInput,
} from '@/domain/entities/backoffice-report.entity';

import { BackofficeReportApiOutput, BackofficeReportMapper } from '../backoffice-report.dto';

describe('BackofficeReportMapper', () => {
  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: BackofficeReportApiOutput = {
        uuid: 'report-uuid-123',
        status: 'ready',
        issuance_datetime: '2025-10-08 16:20:42',
        type: 'journal_reading',
        document_number: '0002-0008',
        journal_progressive_number: 4,
      };

      const result = BackofficeReportMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'report-uuid-123',
        status: 'ready',
        issuanceDatetime: '2025-10-08 16:20:42',
        type: 'journal_reading',
        documentNumber: '0002-0008',
        journalProgressiveNumber: 4,
      });
    });

    it('should handle null document_number and journal_progressive_number', () => {
      const output: BackofficeReportApiOutput = {
        uuid: 'report-uuid',
        status: 'queued',
        issuance_datetime: '2025-10-08 16:20:42',
        type: 'details',
        document_number: null,
        journal_progressive_number: null,
      };

      const result = BackofficeReportMapper.fromApiOutput(output);

      expect(result.documentNumber).toBeNull();
      expect(result.journalProgressiveNumber).toBeNull();
    });
  });

  describe('queuedFromApiOutput', () => {
    it('should map uuid', () => {
      const result = BackofficeReportMapper.queuedFromApiOutput({ uuid: 'queued-uuid' });

      expect(result).toEqual({ uuid: 'queued-uuid' });
    });
  });

  describe('toQueueReceiptsApiInput', () => {
    it('should map filterBy.documentNumber to filter_by.document_number', () => {
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
            journal_progressive_number: 1,
          },
          {
            uuid: 'r2',
            status: 'queued' as const,
            issuance_datetime: '2025-10-08 17:00:00',
            type: 'telemetry' as const,
          },
        ],
        total: 2,
        page: 1,
        size: 30,
        pages: 1,
      };

      const result = BackofficeReportMapper.pageFromApi(data);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].journalProgressiveNumber).toBe(1);
      expect(result.members[1].status).toBe('queued');
      expect(result.total).toBe(2);
    });

    it('should handle empty page', () => {
      const data = { members: [], total: 0, page: 1, size: 30, pages: 0 };

      const result = BackofficeReportMapper.pageFromApi(data);

      expect(result.members).toEqual([]);
    });
  });
});
