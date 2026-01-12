import { DailyReportsParams } from '@/domain/entities/daily-report.entity';

import { DailyReportApiOutput, DailyReportMapper } from '../daily-report.dto';

describe('DailyReportMapper', () => {
  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: DailyReportApiOutput = {
        uuid: 'report-uuid-123',
        pem_serial_number: 'PEM-SN-001',
        date: '2024-01-15',
        total_receipts: 150,
        total_amount: '15000.00',
        status: 'sent',
      };

      const result = DailyReportMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'report-uuid-123',
        pemSerialNumber: 'PEM-SN-001',
        date: '2024-01-15',
        totalReceipts: 150,
        totalAmount: '15000.00',
        status: 'sent',
      });
    });

    it('should map pending status', () => {
      const output: DailyReportApiOutput = {
        uuid: 'uuid',
        pem_serial_number: 'SN',
        date: '2024-01-15',
        total_receipts: 10,
        total_amount: '100.00',
        status: 'pending',
      };

      const result = DailyReportMapper.fromApiOutput(output);

      expect(result.status).toBe('pending');
    });

    it('should map error status', () => {
      const output: DailyReportApiOutput = {
        uuid: 'uuid',
        pem_serial_number: 'SN',
        date: '2024-01-15',
        total_receipts: 0,
        total_amount: '0.00',
        status: 'error',
      };

      const result = DailyReportMapper.fromApiOutput(output);

      expect(result.status).toBe('error');
    });
  });

  describe('toListParams', () => {
    it('should return empty object for undefined params', () => {
      const result = DailyReportMapper.toListParams(undefined);

      expect(result).toEqual({});
    });

    it('should return empty object for empty params', () => {
      const result = DailyReportMapper.toListParams({});

      expect(result).toEqual({});
    });

    it('should map all params to snake_case', () => {
      const params: DailyReportsParams = {
        pemSerialNumber: 'PEM-SN-001',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        status: 'sent',
        page: 2,
      };

      const result = DailyReportMapper.toListParams(params);

      expect(result).toEqual({
        pem_serial_number: 'PEM-SN-001',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        status: 'sent',
        page: 2,
      });
    });

    it('should handle partial params', () => {
      const params: DailyReportsParams = {
        pemSerialNumber: 'PEM-123',
      };

      const result = DailyReportMapper.toListParams(params);

      expect(result.pem_serial_number).toBe('PEM-123');
      expect(result.date_from).toBeUndefined();
      expect(result.date_to).toBeUndefined();
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response', () => {
      const data = {
        members: [
          {
            uuid: 'r1',
            pem_serial_number: 'SN1',
            date: '2024-01-15',
            total_receipts: 100,
            total_amount: '10000.00',
            status: 'sent' as const,
          },
          {
            uuid: 'r2',
            pem_serial_number: 'SN2',
            date: '2024-01-16',
            total_receipts: 50,
            total_amount: '5000.00',
            status: 'pending' as const,
          },
        ],
        total: 30,
        page: 1,
        size: 10,
        pages: 3,
      };

      const result = DailyReportMapper.pageFromApi(data);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].pemSerialNumber).toBe('SN1');
      expect(result.members[1].status).toBe('pending');
      expect(result.total).toBe(30);
    });

    it('should handle empty page', () => {
      const data = {
        members: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };

      const result = DailyReportMapper.pageFromApi(data);

      expect(result.members).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
