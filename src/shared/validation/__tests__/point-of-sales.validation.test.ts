import {
  ActivationRequestSchema,
  AddressSchema,
  PEMStatusOfflineRequestSchema,
  PEMStatusSchema,
  PEM_STATUS_OPTIONS,
} from '../api/point-of-sales';

describe('AddressSchema', () => {
  const validAddress = {
    street_address: 'Via Roma',
    street_number: '10',
    zip_code: '00100',
    city: 'Roma',
    province: 'RM',
  };

  it('should accept valid address', () => {
    const result = AddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it('should reject empty street_address', () => {
    const input = { ...validAddress, street_address: '' };
    const result = AddressSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject empty street_number', () => {
    const input = { ...validAddress, street_number: '' };
    const result = AddressSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  describe('zip_code validation', () => {
    it('should accept valid 5-digit zip code', () => {
      const input = { ...validAddress, zip_code: '12345' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject zip code with less than 5 digits', () => {
      const input = { ...validAddress, zip_code: '1234' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject zip code with more than 5 digits', () => {
      const input = { ...validAddress, zip_code: '123456' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject zip code with letters', () => {
      const input = { ...validAddress, zip_code: '1234A' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty zip code', () => {
      const input = { ...validAddress, zip_code: '' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  it('should reject empty city', () => {
    const input = { ...validAddress, city: '' };
    const result = AddressSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  describe('province validation', () => {
    it('should accept valid 2-letter province', () => {
      const input = { ...validAddress, province: 'MI' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should convert province to uppercase', () => {
      const input = { ...validAddress, province: 'mi' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.province).toBe('MI');
      }
    });

    it('should reject province with less than 2 characters', () => {
      const input = { ...validAddress, province: 'M' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject province with more than 2 characters', () => {
      const input = { ...validAddress, province: 'MIL' };
      const result = AddressSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('PEMStatusSchema', () => {
  it('should accept all valid PEM status options', () => {
    expect(PEM_STATUS_OPTIONS).toHaveLength(6);

    for (const status of PEM_STATUS_OPTIONS) {
      const result = PEMStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('should accept NEW status', () => {
    const result = PEMStatusSchema.safeParse('NEW');
    expect(result.success).toBe(true);
  });

  it('should accept ACTIVATED status', () => {
    const result = PEMStatusSchema.safeParse('ACTIVATED');
    expect(result.success).toBe(true);
  });

  it('should accept ONLINE status', () => {
    const result = PEMStatusSchema.safeParse('ONLINE');
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = PEMStatusSchema.safeParse('INVALID');
    expect(result.success).toBe(false);
  });

  it('should reject lowercase status', () => {
    const result = PEMStatusSchema.safeParse('online');
    expect(result.success).toBe(false);
  });
});

describe('ActivationRequestSchema', () => {
  it('should accept valid registration_key', () => {
    const input = {
      registration_key: 'REG-KEY-12345-ABCDE',
    };

    const result = ActivationRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject empty registration_key', () => {
    const input = {
      registration_key: '',
    };

    const result = ActivationRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject missing registration_key', () => {
    const result = ActivationRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('PEMStatusOfflineRequestSchema', () => {
  it('should accept valid request', () => {
    const input = {
      timestamp: '2024-01-15T10:30:00Z',
      reason: 'Scheduled maintenance',
    };

    const result = PEMStatusOfflineRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept valid ISO date timestamp', () => {
    const input = {
      timestamp: '2024-12-31T23:59:59.999Z',
      reason: 'Year end closure',
    };

    const result = PEMStatusOfflineRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid timestamp format', () => {
    const input = {
      timestamp: 'not-a-date',
      reason: 'Test',
    };

    const result = PEMStatusOfflineRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject empty timestamp', () => {
    const input = {
      timestamp: '',
      reason: 'Test',
    };

    const result = PEMStatusOfflineRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject empty reason', () => {
    const input = {
      timestamp: '2024-01-15T10:00:00Z',
      reason: '',
    };

    const result = PEMStatusOfflineRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = PEMStatusOfflineRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
