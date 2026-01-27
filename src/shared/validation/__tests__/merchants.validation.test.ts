import { MerchantCreateInputSchema, MerchantUpdateInputSchema } from '../api/merchants';

describe('MerchantCreateInputSchema', () => {
  const validAddress = {
    street_address: 'Via Roma',
    street_number: '10',
    zip_code: '00100',
    city: 'Roma',
    province: 'RM',
  };

  describe('vat_number validation', () => {
    it('should accept valid 11-digit VAT number', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test Business',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject VAT number with less than 11 digits', () => {
      const input = {
        vat_number: '1234567890',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject VAT number with letters', () => {
      const input = {
        vat_number: '1234567890A',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty VAT number', () => {
      const input = {
        vat_number: '',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('fiscal_code validation', () => {
    it('should accept valid 11-digit fiscal code', () => {
      const input = {
        vat_number: '12345678901',
        fiscal_code: '98765432101',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept missing fiscal_code (optional)', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('email validation', () => {
    it('should accept valid email', () => {
      const input = {
        vat_number: '12345678901',
        email: 'user@domain.com',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const input = {
        vat_number: '12345678901',
        email: 'not-an-email',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const input = {
        vat_number: '12345678901',
        email: '',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should accept valid complex password', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'MyPassword1!',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'mypassword1!',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'MYPASSWORD1!',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'MyPassword!!',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'MyPassword123',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 10 characters', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Pass1!',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('name fields refinement', () => {
    it('should accept business_name only', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'My Business',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept first_name and last_name only', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        first_name: 'Mario',
        last_name: 'Rossi',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject both business_name and personal names', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Business',
        first_name: 'Mario',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject when no name is provided', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept first_name only', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        first_name: 'Mario',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('address validation', () => {
    it('should accept valid address', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test',
        address: validAddress,
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept missing address (optional)', () => {
      const input = {
        vat_number: '12345678901',
        email: 'test@example.com',
        password: 'Password1!@#',
        business_name: 'Test',
      };

      const result = MerchantCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('MerchantUpdateInputSchema', () => {
  it('should accept valid update with business_name', () => {
    const input = {
      business_name: 'Updated Business',
    };

    const result = MerchantUpdateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept valid update with personal names', () => {
    const input = {
      first_name: 'Giuseppe',
      last_name: 'Verdi',
    };

    const result = MerchantUpdateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept null values for clearing fields', () => {
    const input = {
      business_name: null,
      first_name: null,
      last_name: null,
      address: null,
    };

    const result = MerchantUpdateInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = MerchantUpdateInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject business_name over 200 characters', () => {
    const input = {
      business_name: 'A'.repeat(201),
    };

    const result = MerchantUpdateInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
