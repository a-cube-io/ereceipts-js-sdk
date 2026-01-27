import { PemCreateInput } from '@/domain/entities/pem.entity';

import {
  PemCertificatesApiOutput,
  PemCreateApiOutput,
  PemMapper,
  PointOfSaleMf2ApiOutput,
} from '../pem.dto';

describe('PemMapper', () => {
  describe('toCreateApiInput', () => {
    it('should map merchantUuid to merchant_uuid', () => {
      const input: PemCreateInput = {
        merchantUuid: 'merchant-uuid-123',
      };

      const result = PemMapper.toCreateApiInput(input);

      expect(result).toEqual({
        merchant_uuid: 'merchant-uuid-123',
      });
    });

    it('should map address when present', () => {
      const input: PemCreateInput = {
        merchantUuid: 'merchant-uuid',
        address: {
          streetAddress: 'Via Roma',
          streetNumber: '10',
          zipCode: '00100',
          city: 'Roma',
          province: 'RM',
        },
      };

      const result = PemMapper.toCreateApiInput(input);

      expect(result.address).toEqual({
        street_address: 'Via Roma',
        street_number: '10',
        zip_code: '00100',
        city: 'Roma',
        province: 'RM',
      });
    });

    it('should not include address when not provided', () => {
      const input: PemCreateInput = {
        merchantUuid: 'merchant-uuid',
      };

      const result = PemMapper.toCreateApiInput(input);

      expect(result.address).toBeUndefined();
    });
  });

  describe('fromCreateApiOutput', () => {
    it('should map serial_number and registration_key', () => {
      const output: PemCreateApiOutput = {
        serial_number: 'PEM-SN-12345',
        registration_key: 'REG-KEY-67890',
      };

      const result = PemMapper.fromCreateApiOutput(output);

      expect(result).toEqual({
        serialNumber: 'PEM-SN-12345',
        registrationKey: 'REG-KEY-67890',
      });
    });
  });

  describe('fromCertificatesApiOutput', () => {
    it('should map certificate fields', () => {
      const output: PemCertificatesApiOutput = {
        mtls_certificate: '-----BEGIN CERTIFICATE-----\nMIIC...',
        activation_xml_response: '<xml>activation</xml>',
      };

      const result = PemMapper.fromCertificatesApiOutput(output);

      expect(result).toEqual({
        mtlsCertificate: '-----BEGIN CERTIFICATE-----\nMIIC...',
        activationXmlResponse: '<xml>activation</xml>',
      });
    });

    it('should handle optional activation_xml_response', () => {
      const output: PemCertificatesApiOutput = {
        mtls_certificate: 'cert-content',
      };

      const result = PemMapper.fromCertificatesApiOutput(output);

      expect(result.mtlsCertificate).toBe('cert-content');
      expect(result.activationXmlResponse).toBeUndefined();
    });
  });

  describe('fromPointOfSaleMf2ApiOutput', () => {
    it('should map all fields with address', () => {
      const output: PointOfSaleMf2ApiOutput = {
        serial_number: 'SN-001',
        status: 'ACTIVATED',
        type: 'PV',
        address: {
          street_address: 'Via Milano',
          street_number: '20',
          zip_code: '20100',
          city: 'Milano',
          province: 'MI',
        },
      };

      const result = PemMapper.fromPointOfSaleMf2ApiOutput(output);

      expect(result).toEqual({
        serialNumber: 'SN-001',
        status: 'ACTIVATED',
        type: 'PV',
        address: {
          streetAddress: 'Via Milano',
          streetNumber: '20',
          zipCode: '20100',
          city: 'Milano',
          province: 'MI',
        },
      });
    });

    it('should handle missing address', () => {
      const output: PointOfSaleMf2ApiOutput = {
        serial_number: 'SN-002',
        status: 'NEW',
        type: 'AP',
      };

      const result = PemMapper.fromPointOfSaleMf2ApiOutput(output);

      expect(result.address).toBeUndefined();
    });

    it('should map all PEM status types', () => {
      const statuses: Array<PointOfSaleMf2ApiOutput['status']> = [
        'NEW',
        'REGISTERED',
        'ACTIVATED',
        'ONLINE',
        'OFFLINE',
        'DISCARDED',
      ];

      for (const status of statuses) {
        const output: PointOfSaleMf2ApiOutput = {
          serial_number: 'SN',
          status,
          type: 'PV',
        };

        const result = PemMapper.fromPointOfSaleMf2ApiOutput(output);
        expect(result.status).toBe(status);
      }
    });

    it('should map all POS types', () => {
      const types: Array<PointOfSaleMf2ApiOutput['type']> = ['AP', 'SP', 'TM', 'PV'];

      for (const type of types) {
        const output: PointOfSaleMf2ApiOutput = {
          serial_number: 'SN',
          status: 'ONLINE',
          type,
        };

        const result = PemMapper.fromPointOfSaleMf2ApiOutput(output);
        expect(result.type).toBe(type);
      }
    });
  });

  describe('pageFromApi', () => {
    it('should map array of PointOfSaleMf2', () => {
      const data: PointOfSaleMf2ApiOutput[] = [
        { serial_number: 'SN1', status: 'ONLINE', type: 'PV' },
        { serial_number: 'SN2', status: 'OFFLINE', type: 'AP' },
        {
          serial_number: 'SN3',
          status: 'ACTIVATED',
          type: 'SP',
          address: {
            street_address: 'Via Test',
            street_number: '1',
            zip_code: '12345',
            city: 'Test',
            province: 'TE',
          },
        },
      ];

      const result = PemMapper.pageFromApi(data);

      expect(result).toHaveLength(3);
      expect(result[0].serialNumber).toBe('SN1');
      expect(result[1].status).toBe('OFFLINE');
      expect(result[2].address?.streetAddress).toBe('Via Test');
    });

    it('should handle empty array', () => {
      const result = PemMapper.pageFromApi([]);

      expect(result).toEqual([]);
    });
  });
});
