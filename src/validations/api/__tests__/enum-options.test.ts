/**
 * Tests for enum options arrays
 */

import {
  VAT_RATE_CODE_OPTIONS,
  GOOD_OR_SERVICE_OPTIONS,
  RECEIPT_PROOF_TYPE_OPTIONS,
  PEM_STATUS_OPTIONS,
  PEM_TYPE_OPTIONS,
} from '../index';

describe('Enum Options Arrays', () => {
  describe('VAT_RATE_CODE_OPTIONS', () => {
    it('should contain all Italian VAT rate codes', () => {
      expect(VAT_RATE_CODE_OPTIONS).toContain('22'); // Standard VAT rate
      expect(VAT_RATE_CODE_OPTIONS).toContain('10'); // Reduced VAT rate
      expect(VAT_RATE_CODE_OPTIONS).toContain('4');  // Super reduced VAT rate
      expect(VAT_RATE_CODE_OPTIONS).toContain('N1'); // Exempt VAT
      expect(VAT_RATE_CODE_OPTIONS).toHaveLength(22);
    });

    it('should be a readonly array', () => {
      // Test that the array is immutable at compile time
      // The 'as const' assertion makes it readonly
      expect(VAT_RATE_CODE_OPTIONS).toHaveLength(22);
      
      // TypeScript will prevent mutations at compile time
      // This test just verifies the array structure
      expect(Array.isArray(VAT_RATE_CODE_OPTIONS)).toBe(true);
    });
  });

  describe('GOOD_OR_SERVICE_OPTIONS', () => {
    it('should contain goods and services options', () => {
      expect(GOOD_OR_SERVICE_OPTIONS).toEqual(['B', 'S']);
      expect(GOOD_OR_SERVICE_OPTIONS).toContain('B'); // Goods (Beni)
      expect(GOOD_OR_SERVICE_OPTIONS).toContain('S'); // Services (Servizi)
    });
  });

  describe('RECEIPT_PROOF_TYPE_OPTIONS', () => {
    it('should contain all proof types', () => {
      expect(RECEIPT_PROOF_TYPE_OPTIONS).toEqual(['POS', 'VR', 'ND']);
      expect(RECEIPT_PROOF_TYPE_OPTIONS).toContain('POS'); // Point of Sale
      expect(RECEIPT_PROOF_TYPE_OPTIONS).toContain('VR');  // Virtual Receipt
      expect(RECEIPT_PROOF_TYPE_OPTIONS).toContain('ND');  // No Document
    });
  });

  describe('PEM_STATUS_OPTIONS', () => {
    it('should contain all PEM status values', () => {
      expect(PEM_STATUS_OPTIONS).toEqual(['NEW', 'REGISTERED', 'ACTIVATED', 'ONLINE', 'OFFLINE', 'DISCARDED']);
      expect(PEM_STATUS_OPTIONS).toContain('NEW');
      expect(PEM_STATUS_OPTIONS).toContain('ACTIVATED');
      expect(PEM_STATUS_OPTIONS).toContain('ONLINE');
      expect(PEM_STATUS_OPTIONS).toContain('OFFLINE');
    });
  });

  describe('PEM_TYPE_OPTIONS', () => {
    it('should contain all PEM types', () => {
      expect(PEM_TYPE_OPTIONS).toEqual(['AP', 'SP', 'TM', 'PV']);
      expect(PEM_TYPE_OPTIONS).toContain('AP'); // Apparecchio POS
      expect(PEM_TYPE_OPTIONS).toContain('SP'); // Sistema POS
      expect(PEM_TYPE_OPTIONS).toContain('TM'); // Terminale Mobile
      expect(PEM_TYPE_OPTIONS).toContain('PV'); // Punto Vendita
    });
  });

  describe('Type consistency', () => {
    it('should export arrays that can be used for form options', () => {
      // Test that arrays can be used for creating select options
      const vatRateOptions = VAT_RATE_CODE_OPTIONS.map(code => ({
        value: code,
        label: `${code}%`
      }));

      expect(vatRateOptions).toHaveLength(22);
      expect(vatRateOptions[0]).toHaveProperty('value');
      expect(vatRateOptions[0]).toHaveProperty('label');
    });

    it('should maintain type safety with const assertions', () => {
      // TypeScript should infer the exact literal types
      const vatRate = '22';
      expect(VAT_RATE_CODE_OPTIONS).toContain(vatRate);

      const goodType = 'B';
      expect(GOOD_OR_SERVICE_OPTIONS).toContain(goodType);
    });
  });
});