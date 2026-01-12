import { CashierCreateInputSchema } from '../api/cashiers';

describe('CashierCreateInputSchema', () => {
  describe('email validation', () => {
    it('should accept valid email', () => {
      const input = {
        email: 'cashier@example.com',
        password: 'password123',
        name: 'Test Cashier',
        display_name: 'TC',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const input = {
        email: 'not-valid-email',
        password: 'password123',
        name: 'Test',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const input = {
        email: '',
        password: 'password123',
        name: 'Test',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject email over 255 characters', () => {
      const input = {
        email: 'a'.repeat(250) + '@example.com',
        password: 'password123',
        name: 'Test',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should accept password with 8 characters', () => {
      const input = {
        email: 'test@example.com',
        password: '12345678',
        name: 'Test',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const input = {
        email: 'test@example.com',
        password: '1234567',
        name: 'Test',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject password longer than 40 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'a'.repeat(41),
        name: 'Test',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept password with exactly 40 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'a'.repeat(40),
        name: 'Test',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('name validation', () => {
    it('should accept valid name', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Mario Rossi',
        display_name: 'Mario',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: '',
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject name over 255 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: 'a'.repeat(256),
        display_name: 'T',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('display_name validation', () => {
    it('should accept valid display_name', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
        display_name: 'Display',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty display_name', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
        display_name: '',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject display_name over 255 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
        display_name: 'a'.repeat(256),
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('complete validation', () => {
    it('should accept valid complete input', () => {
      const input = {
        email: 'cashier@store.com',
        password: 'SecurePass123',
        name: 'Mario Rossi',
        display_name: 'Mario R.',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const input = {
        email: 'test@example.com',
      };

      const result = CashierCreateInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
