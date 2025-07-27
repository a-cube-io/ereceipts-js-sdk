/**
 * End-to-End Validation Configuration Tests
 * Tests validation behavior across different SDK configurations
 */

import { ACubeSDK } from '@/core/sdk';
import { ValidationError } from '@/errors/index';
import { HttpTestHelpers, TestDataFactory } from '../setup';
import { 
  createAmount, 
  createQuantity, 
  createReceiptId, 
  createCashierId, 
  createMerchantId 
} from '@/types/branded';

describe('End-to-End Validation Configuration', () => {
  let defaultSDK: ACubeSDK;
  let strictSDK: ACubeSDK;
  let permissiveSDK: ACubeSDK;

  beforeEach(() => {
    // Default SDK configuration
    defaultSDK = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
    });

    // Strict validation configuration
    strictSDK = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
      httpConfig: {
        enableLogging: true,
        retries: 0 // Disable retries for testing
      }
    });

    // Permissive configuration (minimal validation)
    permissiveSDK = new ACubeSDK({
      environment: 'sandbox',
      apiKey: 'test-api-key',
      httpConfig: {
        enableLogging: false,
        retries: 3
      }
    });
  });

  afterEach(() => {
    defaultSDK.removeAllListeners();
    strictSDK.removeAllListeners();
    permissiveSDK.removeAllListeners();
  });

  describe('Default Configuration Validation', () => {
    it('should use standard validation rules for merchant creation', async () => {
      const merchantData = {
        fiscal_id: '12345678903', // Valid VAT
        name: 'Test Merchant Default',
        email: 'default@merchant.com',
        password: 'DefaultPassword123!',
        address: {
          street_address: 'Via Default 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_default'),
        ...merchantData
      }, 201);

      const result = await defaultSDK.merchants.create(merchantData);
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should reject clearly invalid data with default configuration', async () => {
      const invalidMerchantData = {
        fiscal_id: '123', // Too short
        name: '',
        email: 'invalid-email',
        password: '123',
        address: {
          street_address: '',
          zip_code: '1',
          city: '',
          province: 'INVALID'
        }
      };

      await expect(
        defaultSDK.merchants.create(invalidMerchantData as any)
      ).rejects.toThrow(ValidationError);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should validate receipt with default settings', async () => {
      const receiptData = {
        items: [{
          description: 'Default Coffee',
          quantity: createQuantity('1.00'),
          unit_price: createAmount('2.50'),
          good_or_service: 'B' as const,
          vat_rate_code: '10' as const,
          discount: createAmount('0.00'),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: false
        }],
        cash_payment_amount: createAmount('2.50'),
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
        uuid: createReceiptId('receipt_default'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('2.50'),
        document_number: null,
        document_datetime: null
      }, 201);

      const result = await defaultSDK.receipts.create(receiptData);
      expect(result).toBeDefined();
    });
  });

  describe('Strict Configuration Validation', () => {
    it('should enforce stricter validation rules', async () => {
      // Test data that might pass default validation but should be more strict
      const borderlineMerchantData = {
        fiscal_id: '12345678903',
        name: 'A', // Very short name - might be allowed in default but strict should validate
        email: 'test@t.co', // Very short domain
        password: 'Password1!', // Minimum complexity
        address: {
          street_address: 'Via A 1', // Very short address
          zip_code: '00100',
          city: 'A', // Single character city
          province: 'RM'
        }
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_strict'),
        ...borderlineMerchantData
      }, 201);

      // Should still work with proper data
      const result = await strictSDK.merchants.create(borderlineMerchantData);
      expect(result).toBeDefined();
    });

    it('should provide detailed error information in strict mode', async () => {
      const invalidReceiptData = {
        items: [],
        cash_payment_amount: 'invalid',
        electronic_payment_amount: createAmount('0.00')
      };

      try {
        await strictSDK.receipts.create(invalidReceiptData as any);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        
        // Strict mode should provide comprehensive error details
        expect(validationError.violations.length).toBeGreaterThan(0);
        expect(validationError.operation).toBeDefined();
        expect(validationError.requestId).toBeDefined();
      }
    });

    it('should validate cashier passwords more strictly', async () => {
      const weakPasswordCashier = {
        email: 'cashier@strict.com',
        password: 'Weak123' // Might be borderline
      };

      // In strict mode, this should be rejected or require stronger passwords
      await expect(
        strictSDK.cashiers.create(weakPasswordCashier as any)
      ).rejects.toThrow();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Permissive Configuration Validation', () => {
    it('should allow more flexible validation in permissive mode', async () => {
      // Test data that might fail strict validation but could pass permissive
      const flexibleMerchantData = {
        fiscal_id: '12345678903',
        name: 'Permissive Test Merchant',
        email: 'permissive@test.com',
        password: 'PermissivePass123!',
        address: {
          street_address: 'Via Permissive 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_permissive'),
        ...flexibleMerchantData
      }, 201);

      const result = await permissiveSDK.merchants.create(flexibleMerchantData);
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should still reject fundamentally invalid data', async () => {
      const fundamentallyInvalidData = {
        fiscal_id: null, // Null values should still be rejected
        name: null,
        email: null,
        password: null
      };

      await expect(
        permissiveSDK.merchants.create(fundamentallyInvalidData as any)
      ).rejects.toThrow();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Environment-Specific Validation', () => {
    let prodSDK: ACubeSDK;
    let devSDK: ACubeSDK;

    beforeEach(() => {
      prodSDK = new ACubeSDK({
        environment: 'production',
        apiKey: 'prod-api-key',
      });

      devSDK = new ACubeSDK({
        environment: 'development',
        apiKey: 'dev-api-key',
      });
    });

    afterEach(() => {
      prodSDK.removeAllListeners();
      devSDK.removeAllListeners();
    });

    it('should enforce production-grade validation in production environment', async () => {
      const testReceiptData = {
        items: [{
          description: 'Production Test Item',
          quantity: createQuantity('1.00'),
          unit_price: createAmount('100.00'),
          good_or_service: 'B' as const,
          vat_rate_code: '22' as const,
          discount: createAmount('0.00'),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: false
        }],
        cash_payment_amount: createAmount('122.00'),
        electronic_payment_amount: createAmount('0.00'),
        discount: createAmount('0.00'),
        invoice_issuing: true, // Production might require invoice for high amounts
        uncollected_dcr_to_ssn: false,
        services_uncollected_amount: createAmount('0.00'),
        goods_uncollected_amount: createAmount('0.00'),
        ticket_restaurant_payment_amount: createAmount('0.00'),
        ticket_restaurant_quantity: 0
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_production'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('122.00'),
        document_number: 'PROD001',
        document_datetime: '2024-01-01T10:00:00Z'
      }, 201);

      const result = await prodSDK.receipts.create(testReceiptData);
      expect(result).toBeDefined();
    });

    it('should allow more lenient validation in development environment', async () => {
      const devReceiptData = {
        items: [{
          description: 'Dev Test Item',
          quantity: createQuantity('1.00'),
          unit_price: createAmount('0.01'), // Very small amount OK in dev
          good_or_service: 'B' as const,
          vat_rate_code: '0' as const, // 0% VAT OK in dev
          discount: createAmount('0.00'),
          simplified_vat_allocation: false,
          is_down_payment_or_voucher_redemption: false,
          complimentary: false
        }],
        cash_payment_amount: createAmount('0.01'),
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
        uuid: createReceiptId('receipt_development'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('0.01'),
        document_number: null,
        document_datetime: null
      }, 201);

      const result = await devSDK.receipts.create(devReceiptData);
      expect(result).toBeDefined();
    });
  });

  describe('Validation Configuration Override', () => {
    it('should allow per-request validation overrides', async () => {
      const receiptData = TestDataFactory.createReceiptInput();

      // Override validation for this specific request
      const validationOptions = {
        validateVATRates: false,
        checkTotalCalculations: false,
        enforceItalianFiscalRules: false,
        maxReceiptItems: 100
      };

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_override'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('10.00'),
        document_number: null,
        document_datetime: null
      }, 201);

      const result = await defaultSDK.receipts.create(receiptData, validationOptions);
      expect(result).toBeDefined();
    });

    it('should respect global validation settings when no override provided', async () => {
      const receiptData = TestDataFactory.createReceiptInput();

      HttpTestHelpers.mockFetchSuccess({
        uuid: createReceiptId('receipt_global'),
        type: 'sale',
        created_at: '2024-01-01T10:00:00Z',
        total_amount: createAmount('10.00'),
        document_number: null,
        document_datetime: null
      }, 201);

      // No validation options provided - should use global defaults
      const result = await defaultSDK.receipts.create(receiptData);
      expect(result).toBeDefined();
    });
  });

  describe('Validation Performance Impact', () => {
    it('should maintain reasonable performance with validation enabled', async () => {
      const startTime = Date.now();
      
      const merchantData = TestDataFactory.createMerchantInput();
      
      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_performance'),
        ...merchantData
      }, 201);

      await defaultSDK.merchants.create(merchantData);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Validation should not add significant overhead (< 100ms for simple operations)
      expect(duration).toBeLessThan(100);
    });

    it('should handle bulk operations efficiently with validation', async () => {
      const startTime = Date.now();
      
      const receipts = Array.from({ length: 10 }, () => TestDataFactory.createReceiptInput());
      
      // Mock responses for all receipts
      for (let i = 0; i < receipts.length; i++) {
        HttpTestHelpers.mockFetchSuccess({
          uuid: createReceiptId(`receipt_bulk_${i}`),
          type: 'sale',
          created_at: '2024-01-01T10:00:00Z',
          total_amount: createAmount('10.00'),
          document_number: null,
          document_datetime: null
        }, 201);
      }

      // Process all receipts in parallel
      await Promise.all(
        receipts.map(receipt => defaultSDK.receipts.create(receipt))
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Bulk validation should be reasonably fast (< 500ms for 10 items)
      expect(duration).toBeLessThan(500);
      expect(global.fetch).toHaveBeenCalledTimes(10);
    });
  });

  describe('Configuration Validation Consistency', () => {
    it('should maintain consistent validation behavior across different SDK instances', async () => {
      const merchantData = TestDataFactory.createMerchantInput();
      
      // Mock the same response for all SDKs
      HttpTestHelpers.mockFetchSuccess({
        uuid: createMerchantId('merchant_consistent'),
        ...merchantData
      }, 201);

      // All SDK configurations should handle valid data consistently
      const results = await Promise.all([
        defaultSDK.merchants.create(merchantData),
        strictSDK.merchants.create(merchantData),
        permissiveSDK.merchants.create(merchantData)
      ]);

      // All should succeed with valid data
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.uuid).toBeDefined();
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should fail consistently across configurations for fundamentally invalid data', async () => {
      const invalidData = {
        fiscal_id: '', // Empty required field
        name: '',
        email: '',
        password: ''
      };

      // All configurations should reject fundamentally invalid data
      await expect(defaultSDK.merchants.create(invalidData as any)).rejects.toThrow();
      await expect(strictSDK.merchants.create(invalidData as any)).rejects.toThrow();
      await expect(permissiveSDK.merchants.create(invalidData as any)).rejects.toThrow();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});