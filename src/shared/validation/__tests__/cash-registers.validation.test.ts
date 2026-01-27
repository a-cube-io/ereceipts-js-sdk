import { CashRegisterCreateSchema } from '../api/cash-registers';

describe('CashRegisterCreateSchema', () => {
  describe('pem_serial_number validation', () => {
    it('should accept valid pem_serial_number', () => {
      const input = {
        pem_serial_number: 'PEM-12345-SN',
        name: 'Main Register',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty pem_serial_number', () => {
      const input = {
        pem_serial_number: '',
        name: 'Register',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept any non-empty string for pem_serial_number', () => {
      const input = {
        pem_serial_number: 'A',
        name: 'Register',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('name validation', () => {
    it('should accept valid name', () => {
      const input = {
        pem_serial_number: 'PEM-123',
        name: 'Cash Register 1',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const input = {
        pem_serial_number: 'PEM-123',
        name: '',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const input = {
        pem_serial_number: 'PEM-123',
        name: 'a'.repeat(101),
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept name with exactly 100 characters', () => {
      const input = {
        pem_serial_number: 'PEM-123',
        name: 'a'.repeat(100),
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('complete validation', () => {
    it('should accept valid complete input', () => {
      const input = {
        pem_serial_number: 'PEM-SERIAL-NUMBER-001',
        name: 'Reception Desk Register',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pem_serial_number).toBe('PEM-SERIAL-NUMBER-001');
        expect(result.data.name).toBe('Reception Desk Register');
      }
    });

    it('should reject missing pem_serial_number', () => {
      const input = {
        name: 'Register',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const input = {
        pem_serial_number: 'PEM-123',
      };

      const result = CashRegisterCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
