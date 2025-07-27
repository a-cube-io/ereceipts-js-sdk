/**
 * End-to-End Validation Error Tests
 * Comprehensive testing of error scenarios and edge cases
 */

import { ACubeSDK } from '@/core/sdk';
import { ValidationError, NetworkError, AuthenticationError } from '@/errors/index';
import { HttpTestHelpers, TestDataFactory } from '../setup';
import { 
  createAmount, 
  createQuantity, 
  createReceiptId, 
  createCashierId, 
  createMerchantId,
  createSerialNumber 
} from '@/types/branded';

describe('End-to-End Validation Error Scenarios', () => {
  let sdk: ACubeSDK;

  beforeEach(() => {
    sdk = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    sdk.removeAllListeners();
  });

  describe('Validation Error Scenarios', () => {
    describe('Required Field Validation Errors', () => {
      it('should provide detailed errors for missing required merchant fields', async () => {
        const incompleteMerchantData = {
          // Missing fiscal_id
          name: 'Test Merchant',
          // Missing email
          password: 'Password123!',
          address: {
            // Missing street_address
            zip_code: '00100',
            // Missing city
            province: 'RM'
          }
        };

        try {
          await sdk.merchants.create(incompleteMerchantData as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          // Should have multiple validation errors
          expect(validationError.violations.length).toBeGreaterThanOrEqual(3);
          
          // Check that we have specific field errors
          const fieldErrors = validationError.violations.map(v => v.field);
          expect(fieldErrors).toContain('fiscal_id');
          expect(fieldErrors).toContain('email');
          expect(fieldErrors.some(field => field.includes('address'))).toBe(true);
        }

        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should provide detailed errors for missing required receipt fields', async () => {
        const incompleteReceiptData = {
          items: [], // Empty items array
          // Missing cash_payment_amount
          electronic_payment_amount: createAmount('0.00'),
          // Missing other required fields
        };

        try {
          await sdk.receipts.create(incompleteReceiptData as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          expect(validationError.violations.length).toBeGreaterThan(0);
          
          const fieldErrors = validationError.violations.map(v => v.field);
          expect(fieldErrors).toContain('items');
        }
      });

      it('should provide detailed errors for missing cashier fields', async () => {
        const incompleteCashierData = {
          // Missing email
          password: '' // Empty password
        };

        try {
          await sdk.cashiers.create(incompleteCashierData as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          expect(validationError.violations.length).toBeGreaterThanOrEqual(2);
          
          const fieldErrors = validationError.violations.map(v => v.field);
          expect(fieldErrors).toContain('email');
          expect(fieldErrors).toContain('password');
        }
      });
    });

    describe('Type Validation Errors', () => {
      it('should reject receipt with invalid amount types', async () => {
        const invalidAmountReceipt = {
          items: [{
            description: 'Test Item',
            quantity: 'invalid-quantity', // Invalid type
            unit_price: 'not-a-number', // Invalid type
            good_or_service: 'B' as const,
            vat_rate_code: '10' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }],
          cash_payment_amount: { invalid: 'object' }, // Invalid type
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: 'not-a-boolean', // Invalid type
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        try {
          await sdk.receipts.create(invalidAmountReceipt as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          // Should have multiple type validation errors
          expect(validationError.violations.length).toBeGreaterThan(1);
          
          const errorCodes = validationError.violations.map(v => v.code);
          expect(errorCodes).toContain('INVALID_TYPE');
        }
      });

      it('should reject merchant with invalid email format', async () => {
        const invalidEmailMerchant = {
          fiscal_id: '12345678903',
          name: 'Test Merchant',
          email: 'not-an-email-address',
          password: 'Password123!',
          address: {
            street_address: 'Via Test 1',
            zip_code: '00100',
            city: 'Roma',
            province: 'RM'
          }
        };

        try {
          await sdk.merchants.create(invalidEmailMerchant as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          const emailError = validationError.violations.find(v => v.field === 'email');
          expect(emailError).toBeDefined();
          expect(emailError?.code).toBe('INVALID_EMAIL');
        }
      });
    });

    describe('Business Logic Validation Errors', () => {
      it('should reject receipt with negative amounts', async () => {
        const negativeAmountReceipt = {
          items: [{
            description: 'Test Item',
            quantity: createQuantity('1.00'),
            unit_price: createAmount('-10.00'), // Negative price
            good_or_service: 'B' as const,
            vat_rate_code: '10' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }],
          cash_payment_amount: createAmount('-5.00'), // Negative payment
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        try {
          await sdk.receipts.create(negativeAmountReceipt as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          const negativeAmountErrors = validationError.violations.filter(v => 
            v.code === 'NEGATIVE_AMOUNT' || v.code === 'INVALID_PRICE'
          );
          expect(negativeAmountErrors.length).toBeGreaterThan(0);
        }
      });

      it('should reject receipt with invalid VAT rates', async () => {
        const invalidVATReceipt = {
          items: [{
            description: 'Test Item',
            quantity: createQuantity('1.00'),
            unit_price: createAmount('10.00'),
            good_or_service: 'B' as const,
            vat_rate_code: '99' as const, // Invalid VAT rate for Italy
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }],
          cash_payment_amount: createAmount('10.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        const validationOptions = { validateVATRates: true };

        try {
          await sdk.receipts.create(invalidVATReceipt as any, validationOptions);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          const vatError = validationError.violations.find(v => v.code === 'INVALID_VAT_RATE');
          expect(vatError).toBeDefined();
        }
      });

      it('should reject merchant with invalid Italian VAT number checksum', async () => {
        const invalidVATMerchant = {
          fiscal_id: '12345678901', // Invalid checksum (should be 903)
          name: 'Test Merchant',
          email: 'test@example.com',
          password: 'Password123!',
          address: {
            street_address: 'Via Test 1',
            zip_code: '00100',
            city: 'Roma',
            province: 'RM'
          }
        };

        try {
          await sdk.merchants.create(invalidVATMerchant as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          const vatError = validationError.violations.find(v => 
            v.field === 'fiscal_id' && v.code === 'INVALID_VAT_CHECKSUM'
          );
          expect(vatError).toBeDefined();
        }
      });
    });

    describe('Complex Validation Error Combinations', () => {
      it('should handle multiple validation errors in a single request', async () => {
        const multipleErrorsData = {
          fiscal_id: '123', // Too short
          name: '', // Empty
          email: 'invalid-email', // Invalid format
          password: '123', // Too weak
          address: {
            street_address: '', // Empty
            zip_code: '1', // Invalid format
            city: '', // Empty
            province: 'INVALID' // Invalid code
          }
        };

        try {
          await sdk.merchants.create(multipleErrorsData as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          // Should have many validation errors
          expect(validationError.violations.length).toBeGreaterThanOrEqual(6);
          
          // Should have errors for all major fields
          const fieldErrors = validationError.violations.map(v => v.field);
          expect(fieldErrors).toContain('fiscal_id');
          expect(fieldErrors).toContain('name');
          expect(fieldErrors).toContain('email');
          expect(fieldErrors).toContain('password');
          expect(fieldErrors.some(field => field.includes('address'))).toBe(true);
        }
      });

      it('should handle receipt with multiple item validation errors', async () => {
        const multipleItemErrorsReceipt = {
          items: [
            {
              description: '', // Empty description
              quantity: createQuantity('0.00'), // Zero quantity
              unit_price: createAmount('-5.00'), // Negative price
              good_or_service: 'B' as const,
              vat_rate_code: '99' as const, // Invalid VAT
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'A'.repeat(300), // Too long description
              quantity: createQuantity('-1.00'), // Negative quantity
              unit_price: createAmount('0.00'), // Zero price might be invalid
              good_or_service: 'B' as const,
              vat_rate_code: '55' as const, // Another invalid VAT
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('0.00'), // No payment method
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        const validationOptions = { 
          validateVATRates: true,
          checkTotalCalculations: true 
        };

        try {
          await sdk.receipts.create(multipleItemErrorsReceipt as any, validationOptions);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          
          // Should have multiple item-specific errors
          expect(validationError.violations.length).toBeGreaterThanOrEqual(5);
          
          // Check for specific error patterns
          const itemErrors = validationError.violations.filter(v => v.field.startsWith('items['));
          expect(itemErrors.length).toBeGreaterThan(0);
          
          const errorCodes = validationError.violations.map(v => v.code);
          expect(errorCodes).toContain('REQUIRED');
          expect(errorCodes).toContain('INVALID_QUANTITY');
          expect(errorCodes).toContain('INVALID_VAT_RATE');
        }
      });
    });
  });

  describe('Network and HTTP Error Scenarios', () => {
    it('should handle network timeout errors', async () => {
      const validData = TestDataFactory.createMerchantInput();
      
      // Mock network timeout
      HttpTestHelpers.mockFetchError(new Error('Network timeout'), 0);

      try {
        await sdk.merchants.create(validData);
        fail('Should have thrown NetworkError');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect(error.message).toContain('timeout');
      }
    });

    it('should handle authentication errors', async () => {
      const validData = TestDataFactory.createReceiptInput();
      
      // Mock authentication error
      HttpTestHelpers.mockFetchError(new Error('Unauthorized'), 401);

      try {
        await sdk.receipts.create(validData);
        fail('Should have thrown AuthenticationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toContain('Unauthorized');
      }
    });

    it('should handle server validation errors (422)', async () => {
      const validLocalData = TestDataFactory.createMerchantInput();
      
      // Data passes local validation but fails on server
      const serverValidationError = {
        message: 'Server validation failed',
        errors: [
          { field: 'fiscal_id', message: 'VAT number already exists', code: 'DUPLICATE' }
        ]
      };
      
      HttpTestHelpers.mockFetchError(serverValidationError, 422);

      try {
        await sdk.merchants.create(validLocalData);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Server validation failed');
      }
    });

    it('should handle server errors (500)', async () => {
      const validData = TestDataFactory.createCashierInput();
      
      // Mock server error
      HttpTestHelpers.mockFetchError(new Error('Internal Server Error'), 500);

      try {
        await sdk.cashiers.create(validData);
        fail('Should have thrown Error');
      } catch (error) {
        expect(error.message).toContain('Internal Server Error');
      }
    });
  });

  describe('Edge Case Error Scenarios', () => {
    it('should handle extremely large receipt with validation', async () => {
      const largeReceipt = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          description: `Item ${i + 1}`,
          quantity: createQuantity('1.00'),
          unit_price: createAmount('1.00'),
          good_or_service: 'B' as const,
          vat_rate_code: '22' as const,
          discount: createAmount('0.00'),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: false
        })),
        cash_payment_amount: createAmount('1220.00'), // 1000 * 1.22
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: true, // Large receipts should have invoice
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      const validationOptions = { maxReceiptItems: 500 }; // Limit to 500 items

      try {
        await sdk.receipts.create(largeReceipt as any, validationOptions);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        
        const itemCountError = validationError.violations.find(v => v.code === 'TOO_MANY_ITEMS');
        expect(itemCountError).toBeDefined();
      }
    });

    it('should handle null and undefined values gracefully', async () => {
      const nullValueData = {
        fiscal_id: null,
        name: undefined,
        email: null,
        password: undefined,
        address: null
      };

      try {
        await sdk.merchants.create(nullValueData as any);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        
        // Should handle null/undefined gracefully with proper error messages
        expect(validationError.violations.length).toBeGreaterThan(0);
        validationError.violations.forEach(violation => {
          expect(violation.message).not.toContain('null');
          expect(violation.message).not.toContain('undefined');
        });
      }
    });

    it('should handle circular reference objects', async () => {
      const circularData: any = {
        fiscal_id: '12345678903',
        name: 'Test Merchant',
        email: 'test@example.com',
        password: 'Password123!',
        address: {
          street_address: 'Via Test 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      };
      
      // Create circular reference
      circularData.self = circularData;

      try {
        await sdk.merchants.create(circularData as any);
        fail('Should have thrown ValidationError');
      } catch (error) {
        // Should handle circular references without hanging
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from validation errors and allow subsequent valid requests', async () => {
      // First, make an invalid request
      const invalidData = {
        fiscal_id: '123',
        name: '',
        email: 'invalid',
        password: '123'
      };

      try {
        await sdk.merchants.create(invalidData as any);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }

      // Then, make a valid request
      const validData = TestDataFactory.createMerchantInput();
      
      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_recovery'),
        ...validData
      }, 201);

      const result = await sdk.merchants.create(validData);
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should maintain validation state consistency across multiple errors', async () => {
      const invalidDataSets = [
        { fiscal_id: '123' }, // Too short
        { fiscal_id: '', name: '' }, // Empty fields
        { email: 'invalid' }, // Invalid email
      ];

      // Process multiple invalid requests
      for (const invalidData of invalidDataSets) {
        try {
          await sdk.merchants.create(invalidData as any);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
      }

      // Validation should still work correctly for valid data
      const validData = TestDataFactory.createMerchantInput();
      
      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_consistent'),
        ...validData
      }, 201);

      const result = await sdk.merchants.create(validData);
      expect(result).toBeDefined();
    });
  });
});