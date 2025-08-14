/**
 * Zod v4 Migration Verification Tests
 * 
 * This test file verifies that the Zod v4 migration was successful
 * and that validation behaviors are maintained.
 */

import { z } from 'zod';
import {
  CashierCreateInputSchema,
  MerchantCreateInputSchema,
  ReceiptInputSchema,
  validateInput,
} from '../index';

describe('Zod v4 Migration Verification', () => {
  it('should use Zod v4.x', () => {
    // Check that we're using Zod 4.x
    const zodVersion = require('zod/package.json').version;
    expect(zodVersion).toMatch(/^4\./);
  });

  it('should maintain error message functionality with new syntax', () => {
    // Test that custom error messages still work with new { error: '...' } syntax
    const testSchema = z.string().min(5, { error: 'customErrorMessage' });
    const result = testSchema.safeParse('abc');
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('customErrorMessage');
    }
  });

  it('should validate cashier creation with proper error messages', () => {
    const invalidCashier = {
      email: 'invalid-email',
      password: 'weak',
    };

    const result = validateInput(CashierCreateInputSchema, invalidCashier);
    
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Verify error messages are still properly formatted
    const emailError = result.errors.find(e => e.field === 'email');
    const passwordError = result.errors.find(e => e.field === 'password');
    
    expect(emailError?.message).toBe('invalidEmail');
    expect(passwordError?.message).toBe('passwordMinLength');
  });

  it('should validate merchant creation with refine logic', () => {
    // Test that complex .refine() validation still works
    const invalidMerchant = {
      vat_number: '12345678901',
      // Neither business_name nor personal names provided
      email: 'test@company.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(MerchantCreateInputSchema, invalidMerchant);
    
    expect(result.success).toBe(false);
    const businessNameError = result.errors.find(e => 
      e.message === 'businessNameOrPersonalNamesRequired'
    );
    expect(businessNameError).toBeDefined();
  });

  it('should validate receipts with array validation', () => {
    // Test that array validation still works
    const invalidReceipt = {
      items: [], // Empty array should fail
    };

    const result = validateInput(ReceiptInputSchema, invalidReceipt);
    
    expect(result.success).toBe(false);
    const arrayError = result.errors.find(e => e.message === 'arrayMin1');
    expect(arrayError).toBeDefined();
  });

  it('should maintain successful validation', () => {
    // Test that valid data still passes validation
    const validCashier = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
    };

    const result = validateInput(CashierCreateInputSchema, validCashier);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  it('should support all validation features', () => {
    // Comprehensive test of various validation features
    const testSchema = z.object({
      email: z.string().email({ error: 'invalidEmail' }),
      uuid: z.string().uuid({ error: 'invalidUuid' }),
      minLength: z.string().min(3, { error: 'tooShort' }),
      enumValue: z.enum(['A', 'B'], { error: 'invalidEnum' }),
    });

    const invalidData = {
      email: 'not-email',
      uuid: 'not-uuid',
      minLength: 'x',
      enumValue: 'C',
    };

    const result = testSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const issues = result.error.issues;
      expect(issues.some(i => i.message === 'invalidEmail')).toBe(true);
      expect(issues.some(i => i.message === 'invalidUuid')).toBe(true);
      expect(issues.some(i => i.message === 'tooShort')).toBe(true);
      expect(issues.some(i => i.message === 'invalidEnum')).toBe(true);
    }
  });
});