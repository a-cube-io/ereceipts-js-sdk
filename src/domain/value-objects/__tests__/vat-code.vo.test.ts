import { EXEMPT_VAT_CODES, STANDARD_VAT_RATES, VAT_RATE_CODES } from '../vat-code.vo';

describe('vat-code.vo', () => {
  describe('VAT_RATE_CODES', () => {
    it('should contain exactly 22 codes', () => {
      expect(VAT_RATE_CODES).toHaveLength(22);
    });

    it('should not contain any duplicates', () => {
      const uniqueCodes = new Set(VAT_RATE_CODES);
      expect(uniqueCodes.size).toBe(VAT_RATE_CODES.length);
    });
  });

  describe('STANDARD_VAT_RATES', () => {
    it('should contain the 4 standard Italian VAT rates', () => {
      expect(STANDARD_VAT_RATES).toEqual(['4.00', '5.00', '10.00', '22.00']);
    });

    it('should have all standard rates included in VAT_RATE_CODES', () => {
      for (const rate of STANDARD_VAT_RATES) {
        expect(VAT_RATE_CODES).toContain(rate);
      }
    });
  });

  describe('EXEMPT_VAT_CODES', () => {
    it('should contain the 6 exempt codes N1-N6', () => {
      expect(EXEMPT_VAT_CODES).toEqual(['N1', 'N2', 'N3', 'N4', 'N5', 'N6']);
    });
  });
});
