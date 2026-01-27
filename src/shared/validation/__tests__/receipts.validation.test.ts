import {
  GoodOrServiceSchema,
  ReceiptInputSchema,
  ReceiptItemSchema,
  ReceiptProofTypeSchema,
  VAT_RATE_CODE_OPTIONS,
  VatRateCodeSchema,
} from '../api/receipts';

describe('VatRateCodeSchema', () => {
  it('should accept valid VAT code "22.00"', () => {
    const result = VatRateCodeSchema.safeParse('22.00');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('22.00');
    }
  });

  it('should reject invalid VAT code "XX"', () => {
    const result = VatRateCodeSchema.safeParse('XX');
    expect(result.success).toBe(false);
  });

  it('should accept all 22 valid VAT codes', () => {
    expect(VAT_RATE_CODE_OPTIONS).toHaveLength(22);

    for (const code of VAT_RATE_CODE_OPTIONS) {
      const result = VatRateCodeSchema.safeParse(code);
      expect(result.success).toBe(true);
    }
  });

  it('should accept numeric VAT codes', () => {
    const numericCodes = ['4.00', '5.00', '10.00', '22.00', '2.00'];
    for (const code of numericCodes) {
      expect(VatRateCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('should accept N-prefixed exemption codes', () => {
    const nCodes = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
    for (const code of nCodes) {
      expect(VatRateCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('should reject VAT code with wrong decimal places', () => {
    const result = VatRateCodeSchema.safeParse('22.0');
    expect(result.success).toBe(false);
  });
});

describe('GoodOrServiceSchema', () => {
  it('should accept "goods"', () => {
    const result = GoodOrServiceSchema.safeParse('goods');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('goods');
    }
  });

  it('should accept "service"', () => {
    const result = GoodOrServiceSchema.safeParse('service');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('service');
    }
  });

  it('should reject invalid value "product"', () => {
    const result = GoodOrServiceSchema.safeParse('product');
    expect(result.success).toBe(false);
  });

  it('should reject empty string', () => {
    const result = GoodOrServiceSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('ReceiptProofTypeSchema', () => {
  it('should accept "POS"', () => {
    const result = ReceiptProofTypeSchema.safeParse('POS');
    expect(result.success).toBe(true);
  });

  it('should accept "VR"', () => {
    const result = ReceiptProofTypeSchema.safeParse('VR');
    expect(result.success).toBe(true);
  });

  it('should accept "ND"', () => {
    const result = ReceiptProofTypeSchema.safeParse('ND');
    expect(result.success).toBe(true);
  });

  it('should reject invalid proof type', () => {
    const result = ReceiptProofTypeSchema.safeParse('INVALID');
    expect(result.success).toBe(false);
  });

  it('should reject lowercase variants', () => {
    const result = ReceiptProofTypeSchema.safeParse('pos');
    expect(result.success).toBe(false);
  });
});

describe('ReceiptItemSchema', () => {
  it('should accept valid minimal item with required fields', () => {
    const item = {
      quantity: '1',
      description: 'Test Product',
      unit_price: '10.00',
    };

    const result = ReceiptItemSchema.safeParse(item);

    expect(result.success).toBe(true);
  });

  it('should accept item with all optional fields', () => {
    const item = {
      type: 'goods',
      quantity: '2',
      description: 'Full Product',
      unit_price: '25.50',
      vat_rate_code: '22.00',
      simplified_vat_allocation: true,
      discount: '5.00',
      is_down_payment_or_voucher_redemption: false,
      complimentary: false,
    };

    const result = ReceiptItemSchema.safeParse(item);

    expect(result.success).toBe(true);
  });

  it('should reject item with empty quantity', () => {
    const item = {
      quantity: '',
      description: 'Test',
      unit_price: '10.00',
    };

    const result = ReceiptItemSchema.safeParse(item);

    expect(result.success).toBe(false);
  });

  it('should reject item with empty description', () => {
    const item = {
      quantity: '1',
      description: '',
      unit_price: '10.00',
    };

    const result = ReceiptItemSchema.safeParse(item);

    expect(result.success).toBe(false);
  });

  it('should reject item with empty unit_price', () => {
    const item = {
      quantity: '1',
      description: 'Test',
      unit_price: '',
    };

    const result = ReceiptItemSchema.safeParse(item);

    expect(result.success).toBe(false);
  });

  it('should accept null discount', () => {
    const item = {
      quantity: '1',
      description: 'Test',
      unit_price: '10.00',
      discount: null,
    };

    const result = ReceiptItemSchema.safeParse(item);

    expect(result.success).toBe(true);
  });

  it('should accept service type', () => {
    const item = {
      type: 'service',
      quantity: '1',
      description: 'Consulting Service',
      unit_price: '100.00',
    };

    const result = ReceiptItemSchema.safeParse(item);

    expect(result.success).toBe(true);
  });
});

describe('ReceiptInputSchema', () => {
  const validItem = {
    quantity: '1',
    description: 'Test Item',
    unit_price: '100.00',
  };

  it('should accept valid receipt with cash_payment_amount', () => {
    const input = {
      items: [validItem],
      cash_payment_amount: '100.00',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should accept valid receipt with electronic_payment_amount', () => {
    const input = {
      items: [validItem],
      electronic_payment_amount: '100.00',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should accept valid receipt with ticket_restaurant_payment', () => {
    const input = {
      items: [validItem],
      ticket_restaurant_payment_amount: '100.00',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject receipt with no payment method (refinement 1)', () => {
    const input = {
      items: [validItem],
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject receipt with zero payment amounts', () => {
    const input = {
      items: [validItem],
      cash_payment_amount: '0.00',
      electronic_payment_amount: '0',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject when both customer_tax_code and customer_lottery_code are provided (refinement 2)', () => {
    const input = {
      items: [validItem],
      cash_payment_amount: '100.00',
      customer_tax_code: 'RSSMRA80A01H501U',
      customer_lottery_code: 'LOTTERY123',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should accept receipt with only customer_tax_code', () => {
    const input = {
      items: [validItem],
      cash_payment_amount: '100.00',
      customer_tax_code: 'RSSMRA80A01H501U',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should accept receipt with only customer_lottery_code', () => {
    const input = {
      items: [validItem],
      cash_payment_amount: '100.00',
      customer_lottery_code: 'LOTTERY123',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject receipt with empty items array', () => {
    const input = {
      items: [],
      cash_payment_amount: '100.00',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should accept receipt with multiple items', () => {
    const input = {
      items: [
        { quantity: '1', description: 'Item 1', unit_price: '50.00' },
        { quantity: '2', description: 'Item 2', unit_price: '25.00' },
      ],
      cash_payment_amount: '100.00',
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should accept receipt with all optional fields', () => {
    const input = {
      items: [validItem],
      cash_payment_amount: '50.00',
      electronic_payment_amount: '50.00',
      discount: '10.00',
      invoice_issuing: true,
      uncollected_dcr_to_ssn: false,
      services_uncollected_amount: '0.00',
      goods_uncollected_amount: '0.00',
      ticket_restaurant_payment_amount: null,
      ticket_restaurant_quantity: 0,
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should accept receipt with combined payment methods', () => {
    const input = {
      items: [validItem],
      cash_payment_amount: '30.00',
      electronic_payment_amount: '50.00',
      ticket_restaurant_payment_amount: '20.00',
      ticket_restaurant_quantity: 2,
    };

    const result = ReceiptInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });
});
