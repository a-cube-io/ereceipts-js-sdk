import {
  CashRegisterCreateInput,
  CashRegisterUpdateInput,
} from '@/domain/entities/cash-register.entity';
import { Page } from '@/domain/value-objects/page.vo';

import {
  CashRegisterApiOutput,
  CashRegisterDetailedApiOutput,
  CashRegisterMapper,
} from '../cash-register.dto';

describe('CashRegisterMapper', () => {
  describe('toCreateApiInput', () => {
    it('should map pemSerialNumber to pem_serial_number', () => {
      const input: CashRegisterCreateInput = {
        pemSerialNumber: 'PEM-12345',
        name: 'Register 1',
      };

      const result = CashRegisterMapper.toCreateApiInput(input);

      expect(result).toEqual({
        pem_serial_number: 'PEM-12345',
        name: 'Register 1',
      });
    });
  });

  describe('toUpdateApiInput', () => {
    it('should map only name field', () => {
      const input: CashRegisterUpdateInput = {
        name: 'Updated Register Name',
      };

      const result = CashRegisterMapper.toUpdateApiInput(input);

      expect(result).toEqual({
        name: 'Updated Register Name',
      });
    });
  });

  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: CashRegisterApiOutput = {
        uuid: 'register-uuid-123',
        pem_serial_number: 'PEM-SN-001',
        name: 'Main Register',
      };

      const result = CashRegisterMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'register-uuid-123',
        pemSerialNumber: 'PEM-SN-001',
        name: 'Main Register',
      });
    });
  });

  describe('fromDetailedApiOutput', () => {
    it('should map detailed output including certificate fields', () => {
      const output: CashRegisterDetailedApiOutput = {
        uuid: 'register-uuid',
        pem_serial_number: 'PEM-SN-002',
        name: 'Detailed Register',
        mtls_certificate: '-----BEGIN CERTIFICATE-----\nMIIC...',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIE...',
      };

      const result = CashRegisterMapper.fromDetailedApiOutput(output);

      expect(result).toEqual({
        uuid: 'register-uuid',
        pemSerialNumber: 'PEM-SN-002',
        name: 'Detailed Register',
        mtlsCertificate: '-----BEGIN CERTIFICATE-----\nMIIC...',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIE...',
      });
    });

    it('should extend base fromApiOutput mapping', () => {
      const output: CashRegisterDetailedApiOutput = {
        uuid: 'uuid',
        pem_serial_number: 'SN',
        name: 'Name',
        mtls_certificate: 'cert',
        private_key: 'key',
      };

      const result = CashRegisterMapper.fromDetailedApiOutput(output);

      expect(result.uuid).toBe('uuid');
      expect(result.pemSerialNumber).toBe('SN');
      expect(result.name).toBe('Name');
      expect(result.mtlsCertificate).toBe('cert');
      expect(result.privateKey).toBe('key');
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response', () => {
      const response: Page<CashRegisterApiOutput> = {
        members: [
          { uuid: 'r1', pem_serial_number: 'SN1', name: 'Register 1' },
          { uuid: 'r2', pem_serial_number: 'SN2', name: 'Register 2' },
        ],
        total: 2,
        page: 1,
        size: 10,
        pages: 1,
      };

      const result = CashRegisterMapper.pageFromApi(response);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].pemSerialNumber).toBe('SN1');
      expect(result.members[1].pemSerialNumber).toBe('SN2');
    });

    it('should handle empty page', () => {
      const response: Page<CashRegisterApiOutput> = {
        members: [],
        total: 0,
        page: 1,
        size: 10,
        pages: 0,
      };

      const result = CashRegisterMapper.pageFromApi(response);

      expect(result.members).toEqual([]);
    });
  });
});
