import { SupplierCreateInputSchema, SupplierUpdateInputSchema } from '../api/suppliers';

describe('SupplierCreateInputSchema', () => {
  const validAddress = {
    street_address: 'Via Fornitori',
    street_number: '100',
    zip_code: '20100',
    city: 'Milano',
    province: 'MI',
  };

  describe('fiscal_id validation', () => {
    it('should accept valid 11-digit Partita IVA', () => {
      const input = {
        fiscal_id: '12345678901',
        name: 'Supplier Company',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept valid 16-character Codice Fiscale', () => {
      const input = {
        fiscal_id: 'RSSMRA80A01H501U',
        name: 'Mario Rossi',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject lowercase fiscal_id (regex validates before toUpperCase transform)', () => {
      const input = {
        fiscal_id: 'rssmra80a01h501u',
        name: 'Test',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      // Lowercase fails because regex [A-Z] runs before toUpperCase() transform
      expect(result.success).toBe(false);
    });

    it('should reject invalid fiscal_id format', () => {
      const input = {
        fiscal_id: 'INVALID123',
        name: 'Test',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty fiscal_id', () => {
      const input = {
        fiscal_id: '',
        name: 'Test',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject fiscal_id with wrong length', () => {
      const input = {
        fiscal_id: '1234567890', // 10 digits instead of 11
        name: 'Test',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('name validation', () => {
    it('should accept valid name', () => {
      const input = {
        fiscal_id: '12345678901',
        name: 'Test Supplier Company',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const input = {
        fiscal_id: '12345678901',
        name: '',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject name over 200 characters', () => {
      const input = {
        fiscal_id: '12345678901',
        name: 'a'.repeat(201),
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept name with exactly 200 characters', () => {
      const input = {
        fiscal_id: '12345678901',
        name: 'a'.repeat(200),
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('address validation', () => {
    it('should accept valid address', () => {
      const input = {
        fiscal_id: '12345678901',
        name: 'Test',
        address: validAddress,
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept missing address (optional)', () => {
      const input = {
        fiscal_id: '12345678901',
        name: 'Test',
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid address', () => {
      const input = {
        fiscal_id: '12345678901',
        name: 'Test',
        address: {
          street_address: '',
          street_number: '1',
          zip_code: '12345',
          city: 'City',
          province: 'PR',
        },
      };

      const result = SupplierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('SupplierUpdateInputSchema', () => {
  describe('name validation', () => {
    it('should accept valid name', () => {
      const input = {
        name: 'Updated Supplier Name',
      };

      const result = SupplierUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
      };

      const result = SupplierUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject name over 200 characters', () => {
      const input = {
        name: 'a'.repeat(201),
      };

      const result = SupplierUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('address validation', () => {
    it('should accept valid address', () => {
      const input = {
        name: 'Test',
        address: {
          street_address: 'Via Test',
          street_number: '1',
          zip_code: '12345',
          city: 'City',
          province: 'PR',
        },
      };

      const result = SupplierUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept missing address', () => {
      const input = {
        name: 'Test',
      };

      const result = SupplierUpdateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
