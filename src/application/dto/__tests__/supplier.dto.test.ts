import { SupplierCreateInput, SupplierUpdateInput } from '@/domain/entities/supplier.entity';
import { Address } from '@/domain/value-objects/address.vo';

import { SupplierApiOutput, SupplierMapper } from '../supplier.dto';

describe('SupplierMapper', () => {
  const testAddress: Address = {
    streetAddress: 'Via Fornitore',
    streetNumber: '50',
    zipCode: '30100',
    city: 'Venezia',
    province: 'VE',
  };

  describe('toCreateApiInput', () => {
    it('should map fiscalId to fiscal_id', () => {
      const input: SupplierCreateInput = {
        fiscalId: 'IT12345678901',
        name: 'Supplier Company',
      };

      const result = SupplierMapper.toCreateApiInput(input);

      expect(result).toEqual({
        fiscal_id: 'IT12345678901',
        name: 'Supplier Company',
        address: undefined,
      });
    });

    it('should map address when present', () => {
      const input: SupplierCreateInput = {
        fiscalId: 'IT12345678901',
        name: 'Supplier',
        address: testAddress,
      };

      const result = SupplierMapper.toCreateApiInput(input);

      expect(result.address).toEqual({
        street_address: 'Via Fornitore',
        street_number: '50',
        zip_code: '30100',
        city: 'Venezia',
        province: 'VE',
      });
    });

    it('should leave address undefined when not provided', () => {
      const input: SupplierCreateInput = {
        fiscalId: 'IT12345678901',
        name: 'Supplier',
      };

      const result = SupplierMapper.toCreateApiInput(input);

      expect(result.address).toBeUndefined();
    });
  });

  describe('toUpdateApiInput', () => {
    it('should map name and address', () => {
      const input: SupplierUpdateInput = {
        name: 'Updated Supplier Name',
        address: testAddress,
      };

      const result = SupplierMapper.toUpdateApiInput(input);

      expect(result.name).toBe('Updated Supplier Name');
      expect(result.address).toBeDefined();
    });

    it('should handle update without address', () => {
      const input: SupplierUpdateInput = {
        name: 'Name Only Update',
      };

      const result = SupplierMapper.toUpdateApiInput(input);

      expect(result.name).toBe('Name Only Update');
      expect(result.address).toBeUndefined();
    });
  });

  describe('fromApiOutput', () => {
    it('should map snake_case to camelCase', () => {
      const output: SupplierApiOutput = {
        uuid: 'supplier-uuid-123',
        fiscal_id: 'FSCL12345678901',
        name: 'Supplier Name',
        address: {
          street_address: 'Via Test',
          street_number: '1',
          zip_code: '12345',
          city: 'TestCity',
          province: 'TC',
        },
      };

      const result = SupplierMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'supplier-uuid-123',
        fiscalId: 'FSCL12345678901',
        name: 'Supplier Name',
        address: {
          streetAddress: 'Via Test',
          streetNumber: '1',
          zipCode: '12345',
          city: 'TestCity',
          province: 'TC',
        },
      });
    });

    it('should handle missing address', () => {
      const output: SupplierApiOutput = {
        uuid: 'supplier-uuid',
        fiscal_id: 'FSCL',
        name: 'Supplier',
      };

      const result = SupplierMapper.fromApiOutput(output);

      expect(result.address).toBeUndefined();
    });
  });

  describe('pageFromApi', () => {
    it('should map paginated response', () => {
      const response = {
        members: [
          { uuid: 's1', fiscal_id: 'F1', name: 'Supplier 1' },
          {
            uuid: 's2',
            fiscal_id: 'F2',
            name: 'Supplier 2',
            address: {
              street_address: 'Via',
              street_number: '1',
              zip_code: '11111',
              city: 'City',
              province: 'PR',
            },
          },
        ],
        total: 100,
        page: 3,
        size: 25,
        pages: 4,
      };

      const result = SupplierMapper.pageFromApi(response);

      expect(result.members).toHaveLength(2);
      expect(result.members[0].fiscalId).toBe('F1');
      expect(result.members[1].address?.streetAddress).toBe('Via');
      expect(result.total).toBe(100);
      expect(result.pages).toBe(4);
    });

    it('should handle empty response', () => {
      const response = {
        members: [],
      };

      const result = SupplierMapper.pageFromApi(response);

      expect(result.members).toEqual([]);
      expect(result.total).toBeUndefined();
    });
  });
});
