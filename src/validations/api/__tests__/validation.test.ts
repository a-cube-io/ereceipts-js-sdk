/**
 * Tests for API validation schemas
 */

import {
  ReceiptInputSchema,
  ReceiptItemSchema,
  CashierCreateInputSchema,
  MerchantCreateInputSchema,
  CashRegisterCreateSchema,
  PemCreateInputSchema,
  validateInput,
  ReceiptInputType,
} from '../index';

describe('Receipt Validation', () => {
  describe('ReceiptItemSchema', () => {
    it('should validate a valid receipt item', () => {
      const validItem = {
        quantity: '2',
        description: 'Coffee',
        unit_price: '2.50',
        vat_rate_code: '22',
      };

      const result = ReceiptItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should reject empty required fields', () => {
      const invalidItem = {
        quantity: '',
        description: '',
        unit_price: '',
      };

      const result = ReceiptItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3);
        expect(result.error.issues[0].message).toBe('fieldIsRequired');
      }
    });

    it('should accept optional fields', () => {
      const itemWithOptionals = {
        quantity: '1',
        description: 'Product',
        unit_price: '10.00',
        good_or_service: 'B',
        discount: '1.00',
        complimentary: true,
      };

      const result = ReceiptItemSchema.safeParse(itemWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe('ReceiptInputSchema', () => {
    it('should validate a complete receipt', () => {
      const validReceipt = {
        items: [
          {
            quantity: '2',
            description: 'Coffee',
            unit_price: '2.50',
            vat_rate_code: '22',
          },
        ],
        cash_payment_amount: '5.00',
        customer_lottery_code: 'ABC123',
      };

      const result = validateInput(ReceiptInputSchema, validReceipt);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should require at least one item', () => {
      const invalidReceipt = {
        items: [],
        cash_payment_amount: '5.00',
      };

      const result = validateInput(ReceiptInputSchema, invalidReceipt);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: any) => e.message === 'arrayMin1')).toBe(true);
    });

    it('should require at least one payment method', () => {
      const invalidReceipt = {
        items: [
          {
            quantity: '1',
            description: 'Product',
            unit_price: '10.00',
          },
        ],
        // No payment methods
      };

      const result = validateInput(ReceiptInputSchema, invalidReceipt);
      expect(result.success).toBe(false);
      expect(result.errors.some((e: any) => e.message === 'At least one payment method is required')).toBe(true);
    });
  });
});

describe('Cashier Validation', () => {
  it('should validate a valid cashier creation', () => {
    const validCashier = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'cashier@example.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(CashierCreateInputSchema, validCashier);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidCashier = {
      email: 'not-an-email',
      password: 'SecurePass123!',
    };

    const result = validateInput(CashierCreateInputSchema, invalidCashier);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'invalidEmail')).toBe(true);
  });

  it('should reject weak password', () => {
    const invalidCashier = {
      email: 'cashier@example.com',
      password: 'weak',
    };

    const result = validateInput(CashierCreateInputSchema, invalidCashier);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'passwordMinLength')).toBe(true);
  });

  it('should reject password without complexity', () => {
    const invalidCashier = {
      email: 'cashier@example.com',
      password: 'onlylowercase',
    };

    const result = validateInput(CashierCreateInputSchema, invalidCashier);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'passwordComplexity')).toBe(true);
  });
});

describe('Merchant Validation', () => {
  it('should validate a valid merchant creation', () => {
    const validMerchant = {
      vat_number: '12345678901', // Valid Italian Partita IVA
      fiscal_code: '12345678901', // Valid fiscal code (11 digits)
      business_name: 'Mario Rossi Store',
      email: 'mario@store.com',
      password: 'SecurePass123!',
      address: {
        street_address: 'Via Roma',
        street_number: '123',
        zip_code: '00100',
        city: 'Roma',
        province: 'RM',
      },
    };

    const result = validateInput(MerchantCreateInputSchema, validMerchant);
    expect(result.success).toBe(true);
  });

  it('should validate required vat_number format', () => {
    const validMerchant = {
      vat_number: '12345678901', // Valid Italian Partita IVA
      business_name: 'Test Company',
      email: 'test@company.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(MerchantCreateInputSchema, validMerchant);
    expect(result.success).toBe(true);
  });

  it('should reject invalid vat_number', () => {
    const invalidMerchant = {
      vat_number: 'INVALID123',
      business_name: 'Test Company',
      email: 'test@store.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(MerchantCreateInputSchema, invalidMerchant);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'invalidVatNumber')).toBe(true);
  });

  it('should validate address fields', () => {
    const merchantWithInvalidAddress = {
      vat_number: '12345678901', // Valid VAT number
      business_name: 'Test Company', // Valid business name
      email: 'test@store.com',
      password: 'SecurePass123!',
      address: {
        street_address: '',
        street_number: '', // Missing required field
        zip_code: '123', // Invalid zip code
        city: 'Roma',
        province: 'ROMA', // Too long
      },
    };

    const result = validateInput(MerchantCreateInputSchema, merchantWithInvalidAddress);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should accept merchant with business name only', () => {
    const merchantWithBusinessName = {
      vat_number: '12345678901',
      business_name: 'Test Company S.r.l.',
      email: 'test@company.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(MerchantCreateInputSchema, merchantWithBusinessName);
    expect(result.success).toBe(true);
  });

  it('should accept merchant with personal names only', () => {
    const merchantWithPersonalNames = {
      vat_number: '12345678901',
      first_name: 'Mario',
      last_name: 'Rossi',
      email: 'mario@rossi.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(MerchantCreateInputSchema, merchantWithPersonalNames);
    expect(result.success).toBe(true);
  });

  it('should reject merchant with both business name and personal names', () => {
    const merchantWithBoth = {
      vat_number: '12345678901',
      business_name: 'Test Company',
      first_name: 'Mario',
      last_name: 'Rossi',
      email: 'test@company.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(MerchantCreateInputSchema, merchantWithBoth);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'businessNameOrPersonalNamesRequired')).toBe(true);
  });

  it('should reject merchant with neither business name nor personal names', () => {
    const merchantWithoutNames = {
      vat_number: '12345678901',
      email: 'test@company.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(MerchantCreateInputSchema, merchantWithoutNames);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'businessNameOrPersonalNamesRequired')).toBe(true);
  });
});

describe('Cash Register Validation', () => {
  it('should validate a valid cash register creation', () => {
    const validCashRegister = {
      pem_serial_number: 'PEM123456789',
      name: 'Main Register',
    };

    const result = validateInput(CashRegisterCreateSchema, validCashRegister);
    expect(result.success).toBe(true);
  });

  it('should reject empty fields', () => {
    const invalidCashRegister = {
      pem_serial_number: '',
      name: '',
    };

    const result = validateInput(CashRegisterCreateSchema, invalidCashRegister);
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});

describe('PEM Validation', () => {
  it('should validate a valid PEM creation', () => {
    const validPem = {
      merchant_uuid: '123e4567-e89b-12d3-a456-426614174000',
      address: {
        street_address: 'Via Milano 456',
        street_number: '456',
        zip_code: '20100',
        city: 'Milano',
        province: 'MI',
      },
      external_pem_data: {
        version: '1.0',
        type: 'AP',
      },
    };

    const result = validateInput(PemCreateInputSchema, validPem);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const invalidPem = {
      merchant_uuid: 'not-a-valid-uuid',
    };

    const result = validateInput(PemCreateInputSchema, invalidPem);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'invalidUuid')).toBe(true);
  });

  it('should reject invalid PEM type', () => {
    const invalidPem = {
      merchant_uuid: '123e4567-e89b-12d3-a456-426614174000',
      external_pem_data: {
        version: '1.0',
        type: 'INVALID' as any,
      },
    };

    const result = validateInput(PemCreateInputSchema, invalidPem);
    expect(result.success).toBe(false);
    expect(result.errors.some((e: any) => e.message === 'invalidPemType')).toBe(true);
  });
});

describe('Validation Helper', () => {
  it('should return structured validation results', () => {
    const invalidData = {
      items: [],
    };

    const result = validateInput(ReceiptInputSchema, invalidData);
    
    expect(result.success).toBe(false);
    expect(result.data).toBe(null);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty('field');
    expect(result.errors[0]).toHaveProperty('message');
    expect(result.errors[0]).toHaveProperty('code');
  });

  it('should return successful validation with data', () => {
    const validData = {
      items: [
        {
          quantity: '1',
          description: 'Test',
          unit_price: '10.00',
        },
      ],
      cash_payment_amount: '10.00',
    };

    const result = validateInput(ReceiptInputSchema, validData);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toHaveLength(0);
    
    // Type assertion to verify TypeScript integration
    if (result.success && result.data) {
      const typedData: ReceiptInputType = result.data;
      expect(typedData.items).toHaveLength(1);
      expect(typedData.cash_payment_amount).toBe('10.00');
    }
  });
});