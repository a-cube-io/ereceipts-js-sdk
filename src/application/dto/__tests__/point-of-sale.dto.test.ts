import { ActivationRequest, PEMStatusOfflineRequest } from '@/domain/entities/point-of-sale.entity';
import { Page } from '@/domain/value-objects/page.vo';

import {
  PointOfSaleApiOutput,
  PointOfSaleDetailedApiOutput,
  PointOfSaleMapper,
} from '../point-of-sale.dto';

describe('PointOfSaleMapper', () => {
  describe('toActivationApiInput', () => {
    it('should map registrationKey to registration_key', () => {
      const input: ActivationRequest = {
        registrationKey: 'REG-KEY-12345',
      };

      const result = PointOfSaleMapper.toActivationApiInput(input);

      expect(result).toEqual({
        registration_key: 'REG-KEY-12345',
      });
    });
  });

  describe('toOfflineApiInput', () => {
    it('should map timestamp and reason', () => {
      const input: PEMStatusOfflineRequest = {
        timestamp: '2024-01-15T10:30:00Z',
        reason: 'Scheduled maintenance',
      };

      const result = PointOfSaleMapper.toOfflineApiInput(input);

      expect(result).toEqual({
        timestamp: '2024-01-15T10:30:00Z',
        reason: 'Scheduled maintenance',
      });
    });
  });

  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: PointOfSaleApiOutput = {
        serial_number: 'POS-SN-001',
        status: 'ONLINE',
        address: {
          street_address: 'Via Roma',
          street_number: '10',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM',
        },
        operational_status: 'operational',
      };

      const result = PointOfSaleMapper.fromApiOutput(output);

      expect(result).toEqual({
        serialNumber: 'POS-SN-001',
        status: 'ONLINE',
        address: {
          streetAddress: 'Via Roma',
          streetNumber: '10',
          zipCode: '00100',
          city: 'Roma',
          province: 'RM',
        },
        operationalStatus: 'operational',
      });
    });

    it('should map all PEM status values', () => {
      const statuses: Array<PointOfSaleApiOutput['status']> = [
        'NEW',
        'REGISTERED',
        'ACTIVATED',
        'ONLINE',
        'OFFLINE',
        'DISCARDED',
      ];

      for (const status of statuses) {
        const output: PointOfSaleApiOutput = {
          serial_number: 'SN',
          status,
          address: {
            street_address: 'Via',
            street_number: '1',
            zip_code: '12345',
            city: 'City',
            province: 'PR',
          },
          operational_status: 'status',
        };

        const result = PointOfSaleMapper.fromApiOutput(output);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('fromDetailedApiOutput', () => {
    it('should include registration_key', () => {
      const output: PointOfSaleDetailedApiOutput = {
        serial_number: 'POS-SN-002',
        status: 'REGISTERED',
        address: {
          street_address: 'Via Milano',
          street_number: '20',
          zip_code: '20100',
          city: 'Milano',
          province: 'MI',
        },
        operational_status: 'pending',
        registration_key: 'REG-KEY-ABC123',
      };

      const result = PointOfSaleMapper.fromDetailedApiOutput(output);

      expect(result.registrationKey).toBe('REG-KEY-ABC123');
      expect(result.serialNumber).toBe('POS-SN-002');
    });

    it('should handle optional registration_key', () => {
      const output: PointOfSaleDetailedApiOutput = {
        serial_number: 'POS-SN-003',
        status: 'NEW',
        address: {
          street_address: 'Via Test',
          street_number: '1',
          zip_code: '12345',
          city: 'Test',
          province: 'TE',
        },
        operational_status: 'new',
      };

      const result = PointOfSaleMapper.fromDetailedApiOutput(output);

      expect(result.registrationKey).toBeUndefined();
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response', () => {
      const response: Page<PointOfSaleApiOutput> = {
        members: [
          {
            serial_number: 'SN1',
            status: 'ONLINE',
            address: {
              street_address: 'Via 1',
              street_number: '1',
              zip_code: '11111',
              city: 'City1',
              province: 'C1',
            },
            operational_status: 'active',
          },
          {
            serial_number: 'SN2',
            status: 'OFFLINE',
            address: {
              street_address: 'Via 2',
              street_number: '2',
              zip_code: '22222',
              city: 'City2',
              province: 'C2',
            },
            operational_status: 'maintenance',
          },
        ],
        total: 50,
        page: 2,
        size: 10,
        pages: 5,
      };

      const result = PointOfSaleMapper.pageFromApi(response);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].serialNumber).toBe('SN1');
      expect(result.members[1].operationalStatus).toBe('maintenance');
      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
    });

    it('should handle empty page', () => {
      const response: Page<PointOfSaleApiOutput> = {
        members: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };

      const result = PointOfSaleMapper.pageFromApi(response);

      expect(result.members).toEqual([]);
    });
  });
});
