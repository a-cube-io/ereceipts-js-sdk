import { JournalCloseInput, JournalsParams } from '@/domain/entities/journal.entity';

import { JournalApiOutput, JournalMapper } from '../journal.dto';

describe('JournalMapper', () => {
  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: JournalApiOutput = {
        uuid: 'journal-uuid-123',
        pem_serial_number: 'PEM-SN-001',
        date: '2024-01-15',
        sequence_number: 42,
        total_receipts: 75,
        total_amount: '7500.00',
        status: 'open',
      };

      const result = JournalMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'journal-uuid-123',
        pemSerialNumber: 'PEM-SN-001',
        date: '2024-01-15',
        sequenceNumber: 42,
        totalReceipts: 75,
        totalAmount: '7500.00',
        status: 'open',
      });
    });

    it('should map closed status', () => {
      const output: JournalApiOutput = {
        uuid: 'uuid',
        pem_serial_number: 'SN',
        date: '2024-01-15',
        sequence_number: 1,
        total_receipts: 100,
        total_amount: '10000.00',
        status: 'closed',
      };

      const result = JournalMapper.fromApiOutput(output);

      expect(result.status).toBe('closed');
    });
  });

  describe('toListParams', () => {
    it('should return empty object for undefined params', () => {
      const result = JournalMapper.toListParams(undefined);

      expect(result).toEqual({});
    });

    it('should return empty object for empty params', () => {
      const result = JournalMapper.toListParams({});

      expect(result).toEqual({});
    });

    it('should map all params to snake_case', () => {
      const params: JournalsParams = {
        pemSerialNumber: 'PEM-SN-001',
        status: 'open',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        page: 3,
      };

      const result = JournalMapper.toListParams(params);

      expect(result).toEqual({
        pem_serial_number: 'PEM-SN-001',
        status: 'open',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        page: 3,
      });
    });

    it('should handle partial params', () => {
      const params: JournalsParams = {
        status: 'closed',
        page: 1,
      };

      const result = JournalMapper.toListParams(params);

      expect(result.status).toBe('closed');
      expect(result.page).toBe(1);
      expect(result.pem_serial_number).toBeUndefined();
    });
  });

  describe('toCloseApiInput', () => {
    it('should map journalUuid to journal_uuid', () => {
      const input: JournalCloseInput = {
        journalUuid: 'journal-to-close-uuid',
      };

      const result = JournalMapper.toCloseApiInput(input);

      expect(result).toEqual({
        journal_uuid: 'journal-to-close-uuid',
      });
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response', () => {
      const data = {
        members: [
          {
            uuid: 'j1',
            pem_serial_number: 'SN1',
            date: '2024-01-15',
            sequence_number: 1,
            total_receipts: 50,
            total_amount: '5000.00',
            status: 'open' as const,
          },
          {
            uuid: 'j2',
            pem_serial_number: 'SN1',
            date: '2024-01-14',
            sequence_number: 2,
            total_receipts: 60,
            total_amount: '6000.00',
            status: 'closed' as const,
          },
        ],
        total: 20,
        page: 1,
        size: 10,
        pages: 2,
      };

      const result = JournalMapper.pageFromApi(data);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].sequenceNumber).toBe(1);
      expect(result.members[1].status).toBe('closed');
      expect(result.total).toBe(20);
    });

    it('should handle empty page', () => {
      const data = {
        members: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };

      const result = JournalMapper.pageFromApi(data);

      expect(result.members).toEqual([]);
    });
  });
});
