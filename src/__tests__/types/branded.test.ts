/**
 * Tests for Branded Types System
 * Tests type-safe branded types for domain-specific values
 */

import {
  createReceiptId,
  createCashierId,
  createMerchantId,
  createFiscalId,
  createSerialNumber,
  createPEMId,
  createAmount,
  createQuantity,
  isReceiptId,
  isCashierId,
  isMerchantId,
  isFiscalId,
  isSerialNumber,
  isPEMId,
  isAmount,
  isQuantity,
} from '@/types/branded';

describe('Branded Types System', () => {
  describe('Receipt ID', () => {
    it('should create valid receipt IDs', () => {
      const id1 = createReceiptId('receipt_123456789');
      const id2 = createReceiptId('rcpt_abcdef12345');

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).toBe('receipt_123456789');
      expect(id2).toBe('rcpt_abcdef12345');
    });

    it('should validate receipt IDs', () => {
      expect(isReceiptId('receipt_123456789')).toBe(true);
      expect(isReceiptId('rcpt_abcdef12345')).toBe(true);
      
      expect(isReceiptId('')).toBe(false);
      expect(isReceiptId('invalid')).toBe(false);
      expect(isReceiptId('123')).toBe(false);
    });

    it('should handle edge cases for receipt IDs', () => {
      expect(isReceiptId('receipt_')).toBe(false); // Too short after prefix
      expect(isReceiptId('receipt_123')).toBe(false); // Too short
      expect(isReceiptId('RECEIPT_123456789')).toBe(false); // Wrong case
    });
  });

  describe('Cashier ID', () => {
    it('should create valid cashier IDs', () => {
      const id1 = createCashierId(1);
      const id2 = createCashierId(99999);

      expect(typeof id1).toBe('number');
      expect(typeof id2).toBe('number');
      expect(id1).toBe(1);
      expect(id2).toBe(99999);
    });

    it('should validate cashier IDs', () => {
      expect(isCashierId(1)).toBe(true);
      expect(isCashierId(100)).toBe(true);
      expect(isCashierId(999999)).toBe(true);
      
      expect(isCashierId(0)).toBe(false);
      expect(isCashierId(-1)).toBe(false);
      expect(isCashierId(1.5)).toBe(false);
      expect(isCashierId('1')).toBe(false);
    });
  });

  describe('Merchant ID', () => {
    it('should create valid merchant IDs', () => {
      const id1 = createMerchantId('merchant_123456789');
      const id2 = createMerchantId('merch_abcdef12345');

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).toBe('merchant_123456789');
      expect(id2).toBe('merch_abcdef12345');
    });

    it('should validate merchant IDs', () => {
      expect(isMerchantId('merchant_123456789')).toBe(true);
      expect(isMerchantId('merch_abcdef12345')).toBe(true);
      
      expect(isMerchantId('')).toBe(false);
      expect(isMerchantId('invalid')).toBe(false);
      expect(isMerchantId('123')).toBe(false);
    });
  });

  describe('Fiscal ID', () => {
    it('should create valid fiscal IDs', () => {
      const id1 = createFiscalId('12345678901'); // 11 digits
      const id2 = createFiscalId('98765432109');

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).toBe('12345678901');
      expect(id2).toBe('98765432109');
    });

    it('should validate fiscal IDs', () => {
      expect(isFiscalId('12345678901')).toBe(true);
      expect(isFiscalId('98765432109')).toBe(true);
      
      expect(isFiscalId('1234567890')).toBe(false); // 10 digits
      expect(isFiscalId('123456789012')).toBe(false); // 12 digits
      expect(isFiscalId('1234567890a')).toBe(false); // Contains letter
      expect(isFiscalId('')).toBe(false);
    });
  });

  describe('Serial Number', () => {
    it('should create valid serial numbers', () => {
      const sn1 = createSerialNumber('SN123456789');
      const sn2 = createSerialNumber('DEVICE001');

      expect(typeof sn1).toBe('string');
      expect(typeof sn2).toBe('string');
      expect(sn1).toBe('SN123456789');
      expect(sn2).toBe('DEVICE001');
    });

    it('should validate serial numbers', () => {
      expect(isSerialNumber('SN123456789')).toBe(true);
      expect(isSerialNumber('DEVICE001')).toBe(true);
      expect(isSerialNumber('POS12345')).toBe(true);
      
      expect(isSerialNumber('')).toBe(false);
      expect(isSerialNumber('123')).toBe(false); // Too short
      expect(isSerialNumber('sn123')).toBe(false); // Contains lowercase
      expect(isSerialNumber('SN@123')).toBe(false); // Contains special char
    });
  });

  describe('PEM ID', () => {
    it('should create valid PEM IDs', () => {
      const id1 = createPEMId('PEM123456789');
      const id2 = createPEMId('E001-000001');

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).toBe('PEM123456789');
      expect(id2).toBe('E001-000001');
    });

    it('should validate PEM IDs', () => {
      expect(isPEMId('PEM123456789')).toBe(true);
      expect(isPEMId('E001-000001')).toBe(true);
      expect(isPEMId('DEVICE123')).toBe(true);
      
      expect(isPEMId('')).toBe(false);
      expect(isPEMId('pem123')).toBe(false); // Contains lowercase
      expect(isPEMId('12')).toBe(false); // Too short
    });
  });

  describe('Amount', () => {
    it('should create valid amounts', () => {
      const amt1 = createAmount('10.50');
      const amt2 = createAmount('0.00');
      const amt3 = createAmount('999.99');

      expect(typeof amt1).toBe('string');
      expect(typeof amt2).toBe('string');
      expect(typeof amt3).toBe('string');
      expect(amt1).toBe('10.50');
      expect(amt2).toBe('0.00');
      expect(amt3).toBe('999.99');
    });

    it('should validate amounts', () => {
      expect(isAmount('10.50')).toBe(true);
      expect(isAmount('0.00')).toBe(true);
      expect(isAmount('999.99')).toBe(true);
      expect(isAmount('1000.000')).toBe(true); // More than 2 decimals allowed
      expect(isAmount('123.456789')).toBe(true); // Up to 8 decimals
      
      expect(isAmount('10')).toBe(false); // No decimal places
      expect(isAmount('10.')).toBe(false); // Missing decimal digits
      expect(isAmount('10.5')).toBe(false); // Only 1 decimal place
      expect(isAmount('-10.50')).toBe(false); // Negative
      expect(isAmount('10.50€')).toBe(false); // Contains currency symbol
      expect(isAmount('')).toBe(false);
    });

    it('should handle edge cases for amounts', () => {
      expect(isAmount('0.01')).toBe(true); // Minimum positive
      expect(isAmount('999999999.99')).toBe(true); // Large amount
      expect(isAmount('123.123456789')).toBe(false); // Too many decimals (>8)
    });
  });

  describe('Quantity', () => {
    it('should create valid quantities', () => {
      const qty1 = createQuantity('1.00');
      const qty2 = createQuantity('0.50');
      const qty3 = createQuantity('10.25');

      expect(typeof qty1).toBe('string');
      expect(typeof qty2).toBe('string');
      expect(typeof qty3).toBe('string');
      expect(qty1).toBe('1.00');
      expect(qty2).toBe('0.50');
      expect(qty3).toBe('10.25');
    });

    it('should validate quantities', () => {
      expect(isQuantity('1.00')).toBe(true);
      expect(isQuantity('0.50')).toBe(true);
      expect(isQuantity('10.25')).toBe(true);
      expect(isQuantity('100.000')).toBe(true);
      
      expect(isQuantity('1')).toBe(false); // No decimal places
      expect(isQuantity('1.')).toBe(false); // Missing decimal digits
      expect(isQuantity('1.5')).toBe(false); // Only 1 decimal place
      expect(isQuantity('-1.00')).toBe(false); // Negative
      expect(isQuantity('1.00kg')).toBe(false); // Contains unit
      expect(isQuantity('')).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type distinctions at compile time', () => {
      const receiptId = createReceiptId('receipt_123');
      const merchantId = createMerchantId('merchant_456');
      
      // These should be different types at compile time
      // (TypeScript would catch this, but we can test runtime behavior)
      expect(receiptId).not.toBe(merchantId);
      expect(typeof receiptId).toBe(typeof merchantId); // Both strings at runtime
    });

    it('should work with type guards in conditional logic', () => {
      const testValue = 'receipt_123456789';
      
      if (isReceiptId(testValue)) {
        // In this block, TypeScript knows testValue is ReceiptId
        expect(testValue).toBe('receipt_123456789');
      } else {
        fail('Should have been a valid receipt ID');
      }
    });

    it('should handle mixed type validation', () => {
      const values = [
        'receipt_123456789',
        'merchant_123456789',
        '12345678901',
        'SN123456789',
        '10.50',
        '1.00',
        'invalid'
      ];

      const results = values.map(value => ({
        value,
        isReceiptId: isReceiptId(value),
        isMerchantId: isMerchantId(value),
        isFiscalId: isFiscalId(value),
        isSerialNumber: isSerialNumber(value),
        isAmount: isAmount(value),
        isQuantity: isQuantity(value)
      }));

      expect(results[0].isReceiptId).toBe(true);
      expect(results[1].isMerchantId).toBe(true);
      expect(results[2].isFiscalId).toBe(true);
      expect(results[3].isSerialNumber).toBe(true);
      expect(results[4].isAmount).toBe(true);
      expect(results[5].isQuantity).toBe(true);
      expect(results[6]).toEqual({
        value: 'invalid',
        isReceiptId: false,
        isMerchantId: false,
        isFiscalId: false,
        isSerialNumber: false,
        isAmount: false,
        isQuantity: false
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values', () => {
      expect(isReceiptId(null as any)).toBe(false);
      expect(isReceiptId(undefined as any)).toBe(false);
      expect(isCashierId(null as any)).toBe(false);
      expect(isCashierId(undefined as any)).toBe(false);
      expect(isAmount(null as any)).toBe(false);
      expect(isAmount(undefined as any)).toBe(false);
    });

    it('should handle non-string/non-number values', () => {
      expect(isReceiptId(123 as any)).toBe(false);
      expect(isReceiptId(true as any)).toBe(false);
      expect(isReceiptId({} as any)).toBe(false);
      expect(isReceiptId([] as any)).toBe(false);
      
      expect(isCashierId('123' as any)).toBe(false);
      expect(isCashierId(true as any)).toBe(false);
      expect(isCashierId({} as any)).toBe(false);
    });

    it('should handle extreme values', () => {
      const veryLongString = 'a'.repeat(1000);
      expect(isReceiptId(veryLongString)).toBe(false);
      expect(isSerialNumber(veryLongString)).toBe(false);
      
      expect(isCashierId(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(isCashierId(Number.MAX_VALUE)).toBe(false); // Too large
      expect(isCashierId(Infinity)).toBe(false);
      expect(isCashierId(NaN)).toBe(false);
    });
  });
});