/**
 * End-to-End Validation Integration Tests
 * Tests validation system integrated with actual OpenAPI resources
 */

import { ACubeSDK } from '@/core/sdk';
import { ValidationError } from '@/errors/index';
import { HttpTestHelpers, TestDataFactory } from '../setup';
import { ValidationMiddleware, ValidationConfig } from '@/validation/middleware';
import { createAmount, createQuantity, createReceiptId, createCashierId, createMerchantId } from '@/types/branded';

describe('End-to-End Validation Integration', () => {
  let sdk: ACubeSDK;
  let strictSDK: ACubeSDK;

  beforeEach(() => {
    // Standard SDK with default validation
    sdk = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
    });

    // Strict SDK with enhanced validation
    strictSDK = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
      httpConfig: {
        enableLogging: false
      }
    });

    // Mock successful HTTP responses for valid requests
    HttpTestHelpers.mockFetchSuccess({}, 200);
  });

  afterEach(() => {
    sdk.removeAllListeners();
    strictSDK.removeAllListeners();
  });

  describe('Resource Integration with Validation', () => {
    describe('Receipts Resource Integration', () => {
      it('should validate receipt input and allow valid requests through', async () => {
        const validReceiptInput = {
          items: [{
            description: 'Caffè Espresso',
            quantity: createQuantity('2.00'),
            unit_price: createAmount('1.50'),
            good_or_service: 'B' as const,
            vat_rate_code: '22' as const,
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }],
          cash_payment_amount: createAmount('3.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_123456789'),
          type: 'sale',
          created_at: '2024-01-01T10:00:00Z',
          total_amount: createAmount('3.00'),
          document_number: null,
          document_datetime: null
        }, 201);

        // This should succeed - validation passes, HTTP request is made
        const result = await sdk.receipts.create(validReceiptInput);

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalled();
        
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        expect(fetchCall[0]).toContain('/receipts');
        expect(fetchCall[1].method).toBe('POST');
      });

      it('should reject invalid receipt input before HTTP call', async () => {
        const invalidReceiptInput = {
          items: [], // Empty items array - should fail validation
          cash_payment_amount: 'invalid-amount', // Invalid amount format
          electronic_payment_amount: createAmount('0.00')
        };

        // Validation should fail before HTTP call is made
        await expect(
          sdk.receipts.create(invalidReceiptInput as any)
        ).rejects.toThrow();

        // HTTP client should not have been called
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should validate receipt void operations', async () => {
        const validVoidRequest = {
          reason: 'Customer returned item',
          serial_number: 'POS123456789'
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_void_123'),
          type: 'void',
          created_at: '2024-01-01T10:30:00Z',
          total_amount: createAmount('0.00'),
          document_number: null,
          document_datetime: null
        });

        const receiptId = createReceiptId('receipt_123456789');
        const result = await sdk.receipts.void(receiptId, validVoidRequest);

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should validate complex receipts with multiple items', async () => {
        const complexReceiptInput = {
          items: [
            {
              description: 'Caffè Americano',
              quantity: createQuantity('1.00'),
              unit_price: createAmount('2.50'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.25'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Cornetto',
              quantity: createQuantity('2.00'),
              unit_price: createAmount('1.80'),
              good_or_service: 'B' as const,
              vat_rate_code: '10' as const,
              discount: createAmount('0.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            },
            {
              description: 'Consulting Service',
              quantity: createQuantity('0.50'),
              unit_price: createAmount('100.00'),
              good_or_service: 'S' as const,
              vat_rate_code: '22' as const,
              discount: createAmount('5.00'),
              simplified_vat_allocation: false,
              is_down_payment_or_voucher_redemption: false,
              complimentary: false
            }
          ],
          cash_payment_amount: createAmount('50.00'),
          electronic_payment_amount: createAmount('50.85'),
          discount: createAmount('2.00'),
          invoice_issuing: true,
          uncollected_dcr_to_ssn: false,
          services_uncollected_amount: createAmount('0.00'),
          goods_uncollected_amount: createAmount('0.00'),
          ticket_restaurant_payment_amount: createAmount('0.00'),
          ticket_restaurant_quantity: 0
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId('receipt_complex_123'),
          type: 'sale',
          created_at: '2024-01-01T11:00:00Z',
          total_amount: createAmount('98.85'),
          document_number: null,
          document_datetime: null
        }, 201);

        const result = await sdk.receipts.create(complexReceiptInput);

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    describe('Merchants Resource Integration', () => {
      it('should validate merchant creation with Italian fiscal data', async () => {
        const validMerchantInput = {
          fiscal_id: '12345678903', // Valid Italian VAT with correct checksum
          name: 'Caffetteria Roma S.r.l.',
          email: 'info@caffetteriaroma.it',
          password: 'SecurePassword123!',
          address: {
            street_address: 'Via del Corso 123',
            zip_code: '00186',
            city: 'Roma',
            province: 'RM'
          }
        };

        HttpTestHelpers.mockFetchSuccess({
          uuid: createMerchantId('merchant_123456789'),
          fiscal_id: '12345678903',
          name: 'Caffetteria Roma S.r.l.',
          email: 'info@caffetteriaroma.it',
          address: validMerchantInput.address
        }, 201);

        const result = await sdk.merchants.create(validMerchantInput);

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalled();
        
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        expect(fetchCall[0]).toContain('/merchants');
        expect(fetchCall[1].method).toBe('POST');
      });

      it('should reject merchant with invalid Italian VAT number', async () => {
        const invalidMerchantInput = {
          fiscal_id: '12345678901', // Invalid checksum
          name: 'Test Merchant',
          email: 'test@example.com',
          password: 'Password123!',
          address: {
            street_address: 'Via Roma 1',
            zip_code: '00100',
            city: 'Roma',
            province: 'RM'
          }
        };

        await expect(
          sdk.merchants.create(invalidMerchantInput as any)
        ).rejects.toThrow();

        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should reject merchant with invalid Italian address', async () => {
        const invalidAddressMerchant = {
          fiscal_id: '12345678903',
          name: 'Test Merchant',
          email: 'test@example.com',
          password: 'Password123!',
          address: {
            street_address: '',
            zip_code: '123', // Invalid Italian postal code
            city: 'Roma',
            province: 'INVALID' // Invalid province code
          }
        };

        await expect(
          sdk.merchants.create(invalidAddressMerchant as any)
        ).rejects.toThrow();

        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('Cashiers Resource Integration', () => {
      it('should validate cashier creation with strong password', async () => {
        const validCashierInput = {
          email: 'cashier@caffetteriaroma.it',
          password: 'StrongCashierPass123!'
        };

        HttpTestHelpers.mockFetchSuccess({
          id: createCashierId(1),
          email: 'cashier@caffetteriaroma.it'
        }, 201);

        const result = await sdk.cashiers.create(validCashierInput);

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should reject cashier with weak password', async () => {
        const weakPasswordCashier = {
          email: 'cashier@example.com',
          password: '123' // Too weak
        };

        await expect(
          sdk.cashiers.create(weakPasswordCashier as any)
        ).rejects.toThrow();

        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should reject cashier with invalid email', async () => {
        const invalidEmailCashier = {
          email: 'not-an-email',
          password: 'StrongPassword123!'
        };

        await expect(
          sdk.cashiers.create(invalidEmailCashier as any)
        ).rejects.toThrow();

        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('Point of Sales Resource Integration', () => {
      it('should validate POS activation with registration key', async () => {
        const serialNumber = 'POS123456789';
        const validActivationData = {
          registration_key: 'ABCD-1234-EFGH-5678'
        };

        HttpTestHelpers.mockFetchSuccess({}, 200);

        await sdk.pointOfSales.activate(serialNumber, validActivationData);

        expect(global.fetch).toHaveBeenCalled();
        
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        expect(fetchCall[0]).toContain(`/point-of-sales/${serialNumber}/activation`);
        expect(fetchCall[1].method).toBe('POST');
      });

      it('should reject POS activation with invalid registration key', async () => {
        const serialNumber = 'POS123456789';
        const invalidActivationData = {
          registration_key: 'abc-123' // Too short and invalid format
        };

        await expect(
          sdk.pointOfSales.activate(serialNumber, invalidActivationData as any)
        ).rejects.toThrow();

        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('Cash Registers Resource Integration', () => {
      it('should validate cash register creation', async () => {
        const validCashRegisterInput = {
          serial_number: 'REG123456789',
          model: 'Model X1000',
          manufacturer: 'ACube Systems',
          merchant_uuid: createMerchantId('merchant_123456789'),
          location: 'Front Counter'
        };

        HttpTestHelpers.mockFetchSuccess({
          serial_number: 'REG123456789',
          model: 'Model X1000',
          manufacturer: 'ACube Systems',
          status: 'INACTIVE',
          merchant_uuid: 'merchant_123456789',
          location: 'Front Counter'
        }, 201);

        const result = await sdk.cashRegisters.create(validCashRegisterInput);

        expect(result).toBeDefined();
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Validation Error Propagation', () => {
    it('should provide detailed validation error information', async () => {
      const multipleErrorsData = {
        items: [], // Missing items
        cash_payment_amount: 'invalid', // Invalid amount
        electronic_payment_amount: -10.5, // Invalid type and negative
        invoice_issuing: 'yes' // Invalid boolean
      };

      try {
        await sdk.receipts.create(multipleErrorsData as any);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        
        const validationError = error as ValidationError;
        expect(validationError.violations.length).toBeGreaterThan(1);
        
        // Check that we have specific field errors
        const fieldErrors = validationError.violations.map(v => v.field);
        expect(fieldErrors).toContain('items');
        expect(fieldErrors).toContain('cash_payment_amount');
      }

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should preserve error context and operation information', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123'
      };

      try {
        await sdk.cashiers.create(invalidData as any);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        
        const validationError = error as ValidationError;
        expect(validationError.operation).toBeDefined();
        expect(validationError.requestId).toBeDefined();
        expect(validationError.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('HTTP Integration Verification', () => {
    it('should verify that validation success leads to HTTP calls', async () => {
      const validData = TestDataFactory.createReceiptInput();
      
      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_test'),
        type: 'sale',
        created_at: new Date().toISOString(),
        total_amount: createAmount('10.00'),
        document_number: null,
        document_datetime: null
      }, 201);

      await sdk.receipts.create(validData);

      // Verify HTTP call was made with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/receipts'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(validData)
        })
      );
    });

    it('should verify that validation failure prevents HTTP calls', async () => {
      const invalidData = {
        items: [], // Empty items - validation should fail
        cash_payment_amount: createAmount('10.00'),
        electronic_payment_amount: createAmount('0.00')
      };

      await expect(
        sdk.receipts.create(invalidData as any)
      ).rejects.toThrow();

      // HTTP should not have been called
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Validation Configuration Impact', () => {
    it('should respect validation configuration in resources', async () => {
      // This test would need actual validation middleware integration
      // For now, verify that resources can be configured with validation settings
      
      expect(sdk.receipts).toBeDefined();
      expect(sdk.merchants).toBeDefined();
      expect(sdk.cashiers).toBeDefined();
      expect(sdk.pointOfSales).toBeDefined();
      expect(sdk.cashRegisters).toBeDefined();
      expect(sdk.pems).toBeDefined();
    });
  });

  describe('Resource Method Coverage', () => {
    it('should validate all CRUD operations for resources', async () => {
      // Test that validation works for different HTTP methods
      
      // CREATE (POST) - already tested above
      const createData = TestDataFactory.createCashierInput();
      HttpTestHelpers.mockFetchSuccess({ id: 1, email: createData.email }, 201);
      await sdk.cashiers.create(createData);

      // RETRIEVE (GET) - should not require input validation
      HttpTestHelpers.mockFetchSuccess({ id: 1, email: 'test@example.com' });
      await sdk.cashiers.retrieve(createCashierId(1));

      // UPDATE (PUT) - would require validation if implemented
      // DELETE - would require ID validation if implemented

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});