/**
 * Tests for Validation Middleware
 * Tests the integration of validation with OpenAPI resources
 */

import {
  ValidationMiddleware,
  ValidationHelpers,
  ValidationConfig,
  globalValidationMiddleware,
  DEFAULT_VALIDATION_CONFIG
} from '@/validation/middleware';
import { ValidationError } from '@/errors/index';
import { createAmount, createQuantity } from '@/types/branded';

describe('Validation Middleware', () => {
  let middleware: ValidationMiddleware;

  beforeEach(() => {
    middleware = new ValidationMiddleware();
  });

  describe('ValidationMiddleware', () => {
    it('should create with default configuration', () => {
      expect(middleware).toBeInstanceOf(ValidationMiddleware);
    });

    it('should create with custom configuration', () => {
      const customConfig = {
        enabled: false,
        strict: true,
        enableWarnings: false
      };

      const customMiddleware = new ValidationMiddleware(customConfig);
      expect(customMiddleware).toBeInstanceOf(ValidationMiddleware);
    });

    describe('Input Validation', () => {
      it('should validate receipt input successfully', () => {
        const validReceiptInput = {
          items: [{
            description: 'Test Product',
            quantity: createQuantity('1.00'),
            unit_price: createAmount('10.00'),
            good_or_service: 'B',
            vat_rate_code: '22',
            discount: createAmount('0.00'),
            simplified_vat_allocation: false,
            is_down_payment_or_voucher_redemption: false,
            complimentary: false
          }],
          cash_payment_amount: createAmount('10.00'),
          electronic_payment_amount: createAmount('0.00'),
          discount: createAmount('0.00'),
          invoice_issuing: false,
          uncollected_dcr_to_ssn: false
        };

        expect(() => {
          middleware.validateInput(validReceiptInput, 'ReceiptInput', 'create_receipt');
        }).not.toThrow();
      });

      it('should reject invalid receipt input', () => {
        const invalidReceiptInput = {
          items: [], // Empty items array
          cash_payment_amount: 'invalid', // Invalid amount format
          electronic_payment_amount: createAmount('0.00')
        };

        expect(() => {
          middleware.validateInput(invalidReceiptInput, 'ReceiptInput', 'create_receipt');
        }).toThrow(ValidationError);
      });

      it('should validate cashier input successfully', () => {
        const validCashierInput = {
          email: 'test@example.com',
          password: 'SecurePass123!'
        };

        expect(() => {
          middleware.validateInput(validCashierInput, 'CashierInput', 'create_cashier');
        }).not.toThrow();
      });

      it('should reject invalid cashier input', () => {
        const invalidCashierInput = {
          email: 'invalid-email',
          password: '123' // Too short
        };

        expect(() => {
          middleware.validateInput(invalidCashierInput, 'CashierInput', 'create_cashier');
        }).toThrow(ValidationError);
      });

      it('should validate merchant input successfully', () => {
        const validMerchantInput = {
          fiscal_id: '12345678903', // Valid test VAT
          name: 'Test Merchant Ltd',
          email: 'merchant@example.com',
          password: 'MerchantPass123!',
          address: {
            street_address: 'Via Roma 123',
            zip_code: '00100',
            city: 'Roma',
            province: 'RM'
          }
        };

        expect(() => {
          middleware.validateInput(validMerchantInput, 'MerchantInput', 'create_merchant');
        }).not.toThrow();
      });

      it('should validate activation request successfully', () => {
        const validActivationRequest = {
          registration_key: 'ABCD-1234-EFGH-5678'
        };

        expect(() => {
          middleware.validateInput(validActivationRequest, 'ActivationRequest', 'activate_device');
        }).not.toThrow();
      });

      it('should reject invalid activation request', () => {
        const invalidActivationRequest = {
          registration_key: 'abc-123' // Too short and invalid format
        };

        expect(() => {
          middleware.validateInput(invalidActivationRequest, 'ActivationRequest', 'activate_device');
        }).toThrow(ValidationError);
      });
    });

    describe('Configuration Options', () => {
      it('should skip validation when disabled', () => {
        const disabledMiddleware = new ValidationMiddleware({ enabled: false });
        
        const invalidData = { invalid: 'data' };
        
        expect(() => {
          disabledMiddleware.validateInput(invalidData, 'ReceiptInput', 'create_receipt');
        }).not.toThrow();
      });

      it('should skip validation for specified operations', () => {
        const skipMiddleware = new ValidationMiddleware({
          skipValidation: ['create_receipt']
        });
        
        const invalidData = { invalid: 'data' };
        
        expect(() => {
          skipMiddleware.validateInput(invalidData, 'ReceiptInput', 'create_receipt');
        }).not.toThrow();
      });

      it('should handle warnings based on configuration', () => {
        const strictMiddleware = new ValidationMiddleware({
          enableWarnings: true,
          failOnWarnings: true
        });

        // Mock console.warn to capture warnings
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Data that would generate warnings (unknown province code)
        const dataWithWarnings = {
          fiscal_id: '12345678903',
          name: 'Test Merchant',
          email: 'test@example.com',
          password: 'Password123!',
          address: {
            street_address: 'Via Roma 123',
            zip_code: '00100',
            city: 'Roma',
            province: 'ZZ' // Unknown province code
          }
        };

        expect(() => {
          strictMiddleware.validateInput(dataWithWarnings, 'MerchantInput', 'create_merchant');
        }).toThrow(ValidationError);

        consoleSpy.mockRestore();
      });

      it('should log warnings without failing in lenient mode', () => {
        const lenientMiddleware = new ValidationMiddleware({
          enableWarnings: true,
          failOnWarnings: false
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const dataWithWarnings = {
          fiscal_id: '12345678903',
          name: 'Test Merchant',
          email: 'test@example.com',
          password: 'Password123!',
          address: {
            street_address: 'Via Roma 123',
            zip_code: '00100',
            city: 'Roma',
            province: 'ZZ' // Unknown province code
          }
        };

        expect(() => {
          lenientMiddleware.validateInput(dataWithWarnings, 'MerchantInput', 'create_merchant');
        }).not.toThrow();

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('Output Validation', () => {
      it('should validate output in strict mode', () => {
        const strictMiddleware = new ValidationMiddleware({ strict: true });
        
        const validOutput = {
          fiscal_id: '12345678903',
          name: 'Test Merchant',
          email: 'test@example.com',
          address: {
            street_address: 'Via Roma 123',
            zip_code: '00100',
            city: 'Roma',
            province: 'RM'
          }
        };

        expect(() => {
          strictMiddleware.validateOutput(validOutput, 'MerchantInput', 'get_merchant');
        }).not.toThrow();
      });

      it('should skip output validation in non-strict mode', () => {
        const lenientMiddleware = new ValidationMiddleware({ strict: false });
        
        const invalidOutput = { invalid: 'data' };

        expect(() => {
          lenientMiddleware.validateOutput(invalidOutput, 'MerchantInput', 'get_merchant');
        }).not.toThrow();
      });
    });

    describe('Schema Management', () => {
      it('should handle unknown schemas gracefully in non-strict mode', () => {
        const lenientMiddleware = new ValidationMiddleware({ strict: false });
        
        expect(() => {
          lenientMiddleware.validateInput({}, 'UnknownSchema', 'test_operation');
        }).not.toThrow();
      });

      it('should throw error for unknown schemas in strict mode', () => {
        const strictMiddleware = new ValidationMiddleware({ strict: true });
        
        expect(() => {
          strictMiddleware.validateInput({}, 'UnknownSchema', 'test_operation');
        }).toThrow(ValidationError);
      });
    });

    describe('Configuration Updates', () => {
      it('should update configuration', () => {
        middleware.updateConfig({ strict: true });
        expect(middleware.isValidationEnabled('test')).toBe(true);
      });

      it('should check validation status', () => {
        expect(middleware.isValidationEnabled('test')).toBe(true);
        
        middleware.updateConfig({ enabled: false });
        expect(middleware.isValidationEnabled('test')).toBe(false);
        
        middleware.updateConfig({ 
          enabled: true, 
          skipValidation: ['test'] 
        });
        expect(middleware.isValidationEnabled('test')).toBe(false);
      });
    });
  });

  describe('ValidationHelpers', () => {
    it('should validate receipt input', () => {
      const validInput = {
        items: [{
          description: 'Test Product',
          quantity: createQuantity('1.00'),
          unit_price: createAmount('10.00'),
          good_or_service: 'B',
          vat_rate_code: '22'
        }],
        cash_payment_amount: createAmount('10.00'),
        electronic_payment_amount: createAmount('0.00')
      };

      expect(() => {
        ValidationHelpers.validateReceiptInput(validInput);
      }).not.toThrow();
    });

    it('should validate cashier input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      expect(() => {
        ValidationHelpers.validateCashierInput(validInput);
      }).not.toThrow();
    });

    it('should validate merchant input', () => {
      const validInput = {
        fiscal_id: '12345678903',
        name: 'Test Merchant',
        email: 'merchant@example.com',
        password: 'Password123!',
        address: {
          street_address: 'Via Roma 123',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      };

      expect(() => {
        ValidationHelpers.validateMerchantInput(validInput);
      }).not.toThrow();
    });

    it('should validate arrays of items', () => {
      const items = [
        { email: 'test1@example.com', password: 'Pass123!' },
        { email: 'test2@example.com', password: 'Pass456!' }
      ];

      expect(() => {
        ValidationHelpers.validateArray(items, 'CashierInput', 'validate_cashiers');
      }).not.toThrow();
    });

    it('should create custom validation middleware', () => {
      const customMiddleware = ValidationHelpers.createValidationMiddleware({
        strict: true,
        enableWarnings: false
      });

      expect(customMiddleware).toBeInstanceOf(ValidationMiddleware);
    });
  });

  describe('ValidationConfig', () => {
    it('should create strict configuration', () => {
      const config = ValidationConfig.strictConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.strict).toBe(true);
      expect(config.failOnWarnings).toBe(true);
    });

    it('should create lenient configuration', () => {
      const config = ValidationConfig.lenientConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.strict).toBe(false);
      expect(config.failOnWarnings).toBe(false);
    });

    it('should create development configuration', () => {
      const config = ValidationConfig.developmentConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.enableWarnings).toBe(true);
    });

    it('should create production configuration', () => {
      const config = ValidationConfig.productionConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.strict).toBe(true);
      expect(config.enableWarnings).toBe(false);
    });

    it('should create disabled configuration', () => {
      const config = ValidationConfig.disabledConfig();
      
      expect(config.enabled).toBe(false);
    });
  });

  describe('Global Middleware', () => {
    it('should provide global validation middleware instance', () => {
      expect(globalValidationMiddleware).toBeInstanceOf(ValidationMiddleware);
    });

    it('should have default configuration', () => {
      expect(DEFAULT_VALIDATION_CONFIG.enabled).toBe(true);
      expect(DEFAULT_VALIDATION_CONFIG.strict).toBe(false);
      expect(DEFAULT_VALIDATION_CONFIG.enableWarnings).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should validate complex receipt with multiple items', () => {
      const complexReceipt = {
        items: [
          {
            description: 'Coffee',
            quantity: createQuantity('2.00'),
            unit_price: createAmount('3.50'),
            good_or_service: 'B',
            vat_rate_code: '10'
          },
          {
            description: 'Consulting Service',
            quantity: createQuantity('1.00'),
            unit_price: createAmount('100.00'),
            good_or_service: 'S',
            vat_rate_code: '22'
          }
        ],
        cash_payment_amount: createAmount('50.00'),
        electronic_payment_amount: createAmount('57.00'),
        discount: createAmount('0.00'),
        invoice_issuing: true
      };

      expect(() => {
        ValidationHelpers.validateReceiptInput(complexReceipt);
      }).not.toThrow();
    });

    it('should validate merchant with complete address', () => {
      const merchantWithAddress = {
        fiscal_id: '12345678903',
        name: 'Roma Café S.r.l.',
        email: 'info@romacafe.it',
        password: 'RomaSecure2024!',
        address: {
          street_address: 'Via del Corso 123',
          zip_code: '00186',
          city: 'Roma',
          province: 'RM'
        }
      };

      expect(() => {
        ValidationHelpers.validateMerchantInput(merchantWithAddress);
      }).not.toThrow();
    });

    it('should handle validation errors with detailed information', () => {
      const invalidMerchant = {
        fiscal_id: '123', // Invalid VAT format
        name: '', // Empty name
        email: 'invalid-email', // Invalid email
        password: '123', // Weak password
        address: {
          street_address: '',
          zip_code: '123', // Invalid postal code
          city: '',
          province: 'invalid' // Invalid province
        }
      };

      try {
        ValidationHelpers.validateMerchantInput(invalidMerchant);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        
        const validationError = error as ValidationError;
        expect(validationError.violations.length).toBeGreaterThan(0);
        
        // Check that we have violations for multiple fields
        const fields = validationError.violations.map(v => v.field);
        expect(fields).toContain('fiscal_id');
        expect(fields).toContain('name');
        expect(fields).toContain('email');
      }
    });
  });
});