import { MerchantCreateInput, MerchantUpdateInput } from '@/domain/entities/merchant.entity';
import { Address } from '@/domain/value-objects/address.vo';

import { AddressMapper, MerchantApiOutput, MerchantMapper } from '../merchant.dto';

describe('MerchantMapper', () => {
  describe('toCreateApiInput', () => {
    it('should map all required fields to snake_case', () => {
      const input: MerchantCreateInput = {
        vatNumber: 'IT12345678901',
        email: 'test@example.com',
        password: 'securePassword123',
      };

      const result = MerchantMapper.toCreateApiInput(input);

      expect(result).toEqual({
        vat_number: 'IT12345678901',
        email: 'test@example.com',
        password: 'securePassword123',
        fiscal_code: undefined,
        business_name: undefined,
        first_name: undefined,
        last_name: undefined,
        address: undefined,
      });
    });

    it('should map optional fiscalCode', () => {
      const input: MerchantCreateInput = {
        vatNumber: 'IT12345678901',
        fiscalCode: 'RSSMRA80A01H501U',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = MerchantMapper.toCreateApiInput(input);

      expect(result.fiscal_code).toBe('RSSMRA80A01H501U');
    });

    it('should map address when present using AddressMapper', () => {
      const address: Address = {
        streetAddress: 'Via Roma',
        streetNumber: '123',
        zipCode: '00100',
        city: 'Roma',
        province: 'RM',
      };
      const input: MerchantCreateInput = {
        vatNumber: 'IT12345678901',
        email: 'test@example.com',
        password: 'password123',
        address,
      };

      const result = MerchantMapper.toCreateApiInput(input);

      expect(result.address).toEqual({
        street_address: 'Via Roma',
        street_number: '123',
        zip_code: '00100',
        city: 'Roma',
        province: 'RM',
      });
    });

    it('should leave address undefined when not provided', () => {
      const input: MerchantCreateInput = {
        vatNumber: 'IT12345678901',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = MerchantMapper.toCreateApiInput(input);

      expect(result.address).toBeUndefined();
    });

    it('should map all name fields correctly', () => {
      const input: MerchantCreateInput = {
        vatNumber: 'IT12345678901',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Acme Corp',
        firstName: 'Mario',
        lastName: 'Rossi',
      };

      const result = MerchantMapper.toCreateApiInput(input);

      expect(result.business_name).toBe('Acme Corp');
      expect(result.first_name).toBe('Mario');
      expect(result.last_name).toBe('Rossi');
    });
  });

  describe('toUpdateApiInput', () => {
    it('should map only updatable fields', () => {
      const input: MerchantUpdateInput = {
        businessName: 'New Business Name',
        firstName: 'Giuseppe',
        lastName: 'Verdi',
      };

      const result = MerchantMapper.toUpdateApiInput(input);

      expect(result).toEqual({
        business_name: 'New Business Name',
        first_name: 'Giuseppe',
        last_name: 'Verdi',
        address: undefined,
      });
    });

    it('should preserve null address for removal', () => {
      const input: MerchantUpdateInput = {
        address: null,
      };

      const result = MerchantMapper.toUpdateApiInput(input);

      expect(result.address).toBeNull();
    });

    it('should map address when present', () => {
      const input: MerchantUpdateInput = {
        address: {
          streetAddress: 'Via Milano',
          streetNumber: '456',
          zipCode: '20100',
          city: 'Milano',
          province: 'MI',
        },
      };

      const result = MerchantMapper.toUpdateApiInput(input);

      expect(result.address).toEqual({
        street_address: 'Via Milano',
        street_number: '456',
        zip_code: '20100',
        city: 'Milano',
        province: 'MI',
      });
    });

    it('should handle null name fields for clearing', () => {
      const input: MerchantUpdateInput = {
        businessName: null,
        firstName: null,
        lastName: null,
      };

      const result = MerchantMapper.toUpdateApiInput(input);

      expect(result.business_name).toBeNull();
      expect(result.first_name).toBeNull();
      expect(result.last_name).toBeNull();
    });
  });

  describe('fromApiOutput', () => {
    it('should map snake_case API output to camelCase', () => {
      const output: MerchantApiOutput = {
        uuid: 'merchant-uuid-123',
        vat_number: 'IT12345678901',
        fiscal_code: 'RSSMRA80A01H501U',
        email: 'merchant@example.com',
        business_name: 'Test Business',
        first_name: 'Mario',
        last_name: 'Rossi',
        address: {
          street_address: 'Via Verdi',
          street_number: '789',
          zip_code: '10100',
          city: 'Torino',
          province: 'TO',
        },
      };

      const result = MerchantMapper.fromApiOutput(output);

      expect(result).toEqual({
        uuid: 'merchant-uuid-123',
        vatNumber: 'IT12345678901',
        fiscalCode: 'RSSMRA80A01H501U',
        email: 'merchant@example.com',
        businessName: 'Test Business',
        firstName: 'Mario',
        lastName: 'Rossi',
        address: {
          streetAddress: 'Via Verdi',
          streetNumber: '789',
          zipCode: '10100',
          city: 'Torino',
          province: 'TO',
        },
      });
    });

    it('should handle nullable fields with null values', () => {
      const output: MerchantApiOutput = {
        uuid: 'merchant-uuid',
        vat_number: 'IT12345678901',
        fiscal_code: null,
        email: 'test@example.com',
        business_name: null,
        first_name: null,
        last_name: null,
      };

      const result = MerchantMapper.fromApiOutput(output);

      expect(result.fiscalCode).toBeNull();
      expect(result.businessName).toBeNull();
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
    });

    it('should handle missing address', () => {
      const output: MerchantApiOutput = {
        uuid: 'merchant-uuid',
        vat_number: 'IT12345678901',
        email: 'test@example.com',
      };

      const result = MerchantMapper.fromApiOutput(output);

      expect(result.address).toBeUndefined();
    });
  });

  describe('pageFromApi', () => {
    it('should map empty array to empty array', () => {
      const response: MerchantApiOutput[] = [];

      const result = MerchantMapper.pageFromApi(response);

      expect(result).toEqual([]);
    });

    it('should map array of merchants correctly', () => {
      const response: MerchantApiOutput[] = [
        {
          uuid: 'merchant-1',
          vat_number: 'IT11111111111',
          email: 'one@example.com',
        },
        {
          uuid: 'merchant-2',
          vat_number: 'IT22222222222',
          email: 'two@example.com',
          business_name: 'Business Two',
        },
        {
          uuid: 'merchant-3',
          vat_number: 'IT33333333333',
          email: 'three@example.com',
          address: {
            street_address: 'Via Test',
            street_number: '1',
            zip_code: '00000',
            city: 'Test City',
            province: 'TC',
          },
        },
      ];

      const result = MerchantMapper.pageFromApi(response);

      expect(result).toHaveLength(3);
      expect(result[0].uuid).toBe('merchant-1');
      expect(result[1].businessName).toBe('Business Two');
      expect(result[2].address?.streetAddress).toBe('Via Test');
    });
  });
});

describe('AddressMapper', () => {
  describe('toApi', () => {
    it('should map streetAddress to street_address', () => {
      const address: Address = {
        streetAddress: 'Via Garibaldi',
        streetNumber: '10',
        zipCode: '50100',
        city: 'Firenze',
        province: 'FI',
      };

      const result = AddressMapper.toApi(address);

      expect(result.street_address).toBe('Via Garibaldi');
    });

    it('should map zipCode to zip_code', () => {
      const address: Address = {
        streetAddress: 'Via Test',
        streetNumber: '1',
        zipCode: '12345',
        city: 'TestCity',
        province: 'TC',
      };

      const result = AddressMapper.toApi(address);

      expect(result.zip_code).toBe('12345');
    });

    it('should map all 5 fields correctly', () => {
      const address: Address = {
        streetAddress: 'Corso Italia',
        streetNumber: '99',
        zipCode: '80100',
        city: 'Napoli',
        province: 'NA',
      };

      const result = AddressMapper.toApi(address);

      expect(result).toEqual({
        street_address: 'Corso Italia',
        street_number: '99',
        zip_code: '80100',
        city: 'Napoli',
        province: 'NA',
      });
    });
  });

  describe('fromApi', () => {
    it('should map street_address to streetAddress', () => {
      const apiAddress = {
        street_address: 'Via Nazionale',
        street_number: '50',
        zip_code: '00184',
        city: 'Roma',
        province: 'RM',
      };

      const result = AddressMapper.fromApi(apiAddress);

      expect(result.streetAddress).toBe('Via Nazionale');
    });

    it('should map zip_code to zipCode', () => {
      const apiAddress = {
        street_address: 'Via Test',
        street_number: '1',
        zip_code: '99999',
        city: 'City',
        province: 'PR',
      };

      const result = AddressMapper.fromApi(apiAddress);

      expect(result.zipCode).toBe('99999');
    });

    it('should provide symmetric mapping (toApi -> fromApi = identity)', () => {
      const original: Address = {
        streetAddress: 'Via Simmetrica',
        streetNumber: '42',
        zipCode: '54321',
        city: 'Symmetric City',
        province: 'SC',
      };

      const apiFormat = AddressMapper.toApi(original);
      const result = AddressMapper.fromApi(apiFormat);

      expect(result).toEqual(original);
    });
  });
});
