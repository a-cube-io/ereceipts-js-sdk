/**
 * Tests for Validation System
 * Comprehensive tests for the runtime validation framework
 */

import {
  ValidationEngine,
  defaultValidator,
  ItalianFiscalValidator,
  type SchemaDefinition,
  type ValidationOptions
} from '@/validation/index';
import { ValidationError } from '@/errors/index';

describe('Validation System', () => {
  let validationEngine: ValidationEngine;

  beforeEach(() => {
    validationEngine = new ValidationEngine();
  });

  describe('ValidationEngine', () => {
    describe('String Validation', () => {
      it('should validate required strings', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          required: true
        };

        const result = validationEngine.validate('test', schema);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject missing required strings', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          required: true
        };

        const result = validationEngine.validate(undefined, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('REQUIRED');
      });

      it('should validate string length constraints', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          minLength: 5,
          maxLength: 10
        };

        expect(validationEngine.validate('hello', schema).isValid).toBe(true);
        expect(validationEngine.validate('hi', schema).isValid).toBe(false);
        expect(validationEngine.validate('verylongstring', schema).isValid).toBe(false);
      });

      it('should validate string patterns', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          pattern: /^[A-Z]+$/
        };

        expect(validationEngine.validate('HELLO', schema).isValid).toBe(true);
        expect(validationEngine.validate('hello', schema).isValid).toBe(false);
        expect(validationEngine.validate('Hello123', schema).isValid).toBe(false);
      });

      it('should validate enum values', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          enum: ['red', 'green', 'blue'] as const
        };

        expect(validationEngine.validate('red', schema).isValid).toBe(true);
        expect(validationEngine.validate('yellow', schema).isValid).toBe(false);
      });
    });

    describe('Number Validation', () => {
      it('should validate numbers', () => {
        const schema: SchemaDefinition = {
          type: 'number'
        };

        expect(validationEngine.validate(42, schema).isValid).toBe(true);
        expect(validationEngine.validate('42', schema).isValid).toBe(false);
        expect(validationEngine.validate(NaN, schema).isValid).toBe(false);
      });

      it('should validate number ranges', () => {
        const schema: SchemaDefinition = {
          type: 'number',
          min: 0,
          max: 100
        };

        expect(validationEngine.validate(50, schema).isValid).toBe(true);
        expect(validationEngine.validate(-1, schema).isValid).toBe(false);
        expect(validationEngine.validate(101, schema).isValid).toBe(false);
      });
    });

    describe('Boolean Validation', () => {
      it('should validate booleans', () => {
        const schema: SchemaDefinition = {
          type: 'boolean'
        };

        expect(validationEngine.validate(true, schema).isValid).toBe(true);
        expect(validationEngine.validate(false, schema).isValid).toBe(true);
        expect(validationEngine.validate('true', schema).isValid).toBe(false);
        expect(validationEngine.validate(1, schema).isValid).toBe(false);
      });
    });

    describe('Object Validation', () => {
      it('should validate object properties', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            age: { type: 'number', required: false }
          }
        };

        const validObject = { name: 'John', age: 30 };
        const invalidObject = { age: 30 }; // Missing required name

        expect(validationEngine.validate(validObject, schema).isValid).toBe(true);
        expect(validationEngine.validate(invalidObject, schema).isValid).toBe(false);
      });

      it('should handle strict mode for unexpected properties', () => {
        const schema: SchemaDefinition = {
          type: 'object',
          properties: {
            name: { type: 'string', required: true }
          }
        };

        const objectWithExtra = { name: 'John', extra: 'value' };

        const lenientResult = validationEngine.validate(objectWithExtra, schema, { strict: false });
        expect(lenientResult.isValid).toBe(true);

        const strictResult = validationEngine.validate(objectWithExtra, schema, { strict: true });
        expect(strictResult.isValid).toBe(false);
      });
    });

    describe('Array Validation', () => {
      it('should validate array items', () => {
        const schema: SchemaDefinition = {
          type: 'array',
          items: { type: 'string' }
        };

        const validArray = ['a', 'b', 'c'];
        const invalidArray = ['a', 1, 'c'];

        expect(validationEngine.validate(validArray, schema).isValid).toBe(true);
        expect(validationEngine.validate(invalidArray, schema).isValid).toBe(false);
      });
    });

    describe('Branded Type Validation', () => {
      it('should validate branded types with custom validators', () => {
        const schema: SchemaDefinition = {
          type: 'branded',
          brandValidator: (value) => typeof value === 'string' && value.startsWith('ID_')
        };

        expect(validationEngine.validate('ID_12345', schema).isValid).toBe(true);
        expect(validationEngine.validate('12345', schema).isValid).toBe(false);
      });
    });

    describe('Custom Validation', () => {
      it('should run custom validation functions', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          customValidation: (value) => {
            const str = value as string;
            if (str.includes('forbidden')) {
              return [{
                field: 'text',
                message: 'Text contains forbidden word',
                code: 'FORBIDDEN_WORD',
                severity: 'error' as const
              }];
            }
            return [];
          }
        };

        expect(validationEngine.validate('hello world', schema).isValid).toBe(true);
        expect(validationEngine.validate('hello forbidden world', schema).isValid).toBe(false);
      });
    });

    describe('validateOrThrow', () => {
      it('should return value when validation passes', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          required: true
        };

        const result = validationEngine.validateOrThrow('test', schema, 'test_operation');
        expect(result).toBe('test');
      });

      it('should throw ValidationError when validation fails', () => {
        const schema: SchemaDefinition = {
          type: 'string',
          required: true
        };

        expect(() => {
          validationEngine.validateOrThrow(undefined, schema, 'test_operation');
        }).toThrow(ValidationError);
      });
    });
  });

  describe('ItalianFiscalValidator', () => {
    describe('VAT Number Validation', () => {
      it('should validate correct Italian VAT numbers', () => {
        // These are test VAT numbers with correct checksums
        const validVATs = [
          '12345678903', // Valid test VAT
          '01234567890'  // Another valid test VAT
        ];

        validVATs.forEach(vat => {
          const result = ItalianFiscalValidator.validateVATNumber(vat);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid VAT number formats', () => {
        const invalidVATs = [
          '1234567890',    // 10 digits
          '123456789012',  // 12 digits
          '1234567890a',   // Contains letter
          '',              // Empty
          'abcdefghijk'    // All letters
        ];

        invalidVATs.forEach(vat => {
          const result = ItalianFiscalValidator.validateVATNumber(vat);
          expect(result.isValid).toBe(false);
        });
      });

      it('should reject VAT numbers with invalid checksums', () => {
        const invalidChecksum = '12345678901'; // Wrong checksum
        const result = ItalianFiscalValidator.validateVATNumber(invalidChecksum);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('INVALID_VAT_CHECKSUM');
      });

      it('should handle non-string input', () => {
        const result = ItalianFiscalValidator.validateVATNumber(123 as any);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('INVALID_TYPE');
      });
    });

    describe('Postal Code Validation', () => {
      it('should validate correct Italian postal codes', () => {
        const validCodes = ['00100', '20121', '10100'];

        validCodes.forEach(code => {
          const result = ItalianFiscalValidator.validatePostalCode(code);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid postal codes', () => {
        const invalidCodes = [
          '1234',      // Too short
          '123456',    // Too long
          '0010a',     // Contains letter
          ''           // Empty
        ];

        invalidCodes.forEach(code => {
          const result = ItalianFiscalValidator.validatePostalCode(code);
          expect(result.isValid).toBe(false);
        });
      });
    });

    describe('Province Code Validation', () => {
      it('should validate correct Italian province codes', () => {
        const validCodes = ['RM', 'MI', 'TO', 'NA'];

        validCodes.forEach(code => {
          const result = ItalianFiscalValidator.validateProvinceCode(code);
          expect(result.isValid).toBe(true);
        });
      });

      it('should reject invalid province codes', () => {
        const invalidCodes = [
          'rm',        // Lowercase
          'R',         // Too short
          'ROM',       // Too long
          '12',        // Numbers
          ''           // Empty
        ];

        invalidCodes.forEach(code => {
          const result = ItalianFiscalValidator.validateProvinceCode(code);
          expect(result.isValid).toBe(false);
        });
      });

      it('should warn about unknown province codes', () => {
        const unknownCode = 'ZZ';
        const result = ItalianFiscalValidator.validateProvinceCode(unknownCode);
        
        // Should pass validation but generate warnings
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe('UNKNOWN_PROVINCE_CODE');
      });
    });
  });

  describe('Validation Options', () => {
    it('should respect strict mode', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          name: { type: 'string', required: true }
        }
      };

      const objectWithExtra = { name: 'John', extra: 'value' };

      const strictResult = validationEngine.validate(objectWithExtra, schema, { strict: true });
      expect(strictResult.isValid).toBe(false);

      const lenientResult = validationEngine.validate(objectWithExtra, schema, { strict: false });
      expect(lenientResult.isValid).toBe(true);
    });

    it('should handle warnings correctly', () => {
      const schema: SchemaDefinition = {
        type: 'string',
        customValidation: () => [{
          field: 'test',
          message: 'Warning message',
          code: 'TEST_WARNING',
          severity: 'warning' as const
        }]
      };

      const result = validationEngine.validate('test', schema, { enableWarnings: true });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);

      const noWarningsResult = validationEngine.validate('test', schema, { enableWarnings: false });
      expect(noWarningsResult.warnings).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation engine internal errors gracefully', () => {
      const schema: SchemaDefinition = {
        type: 'string',
        customValidation: () => {
          throw new Error('Internal validation error');
        }
      };

      const result = validationEngine.validate('test', schema);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('VALIDATION_INTERNAL_ERROR');
    });

    it('should provide detailed error information', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          },
          age: {
            type: 'number',
            required: true,
            min: 0,
            max: 120
          }
        }
      };

      const invalidData = {
        email: 'invalid-email',
        age: -5
      };

      const result = validationEngine.validate(invalidData, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const emailError = result.errors.find(e => e.field === 'email');
      const ageError = result.errors.find(e => e.field === 'age');
      
      expect(emailError).toBeDefined();
      expect(ageError).toBeDefined();
      expect(emailError?.code).toBe('PATTERN_MISMATCH');
      expect(ageError?.code).toBe('TOO_SMALL');
    });
  });

  describe('Complex Scenarios', () => {
    it('should validate nested objects', () => {
      const schema: SchemaDefinition = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            required: true,
            properties: {
              name: { type: 'string', required: true },
              contact: {
                type: 'object',
                required: true,
                properties: {
                  email: { type: 'string', required: true }
                }
              }
            }
          }
        }
      };

      const validData = {
        user: {
          name: 'John',
          contact: {
            email: 'john@example.com'
          }
        }
      };

      const invalidData = {
        user: {
          name: 'John',
          contact: {
            // Missing email
          }
        }
      };

      expect(validationEngine.validate(validData, schema).isValid).toBe(true);
      expect(validationEngine.validate(invalidData, schema).isValid).toBe(false);
    });

    it('should validate arrays of complex objects', () => {
      const schema: SchemaDefinition = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number', required: true },
            name: { type: 'string', required: true }
          }
        }
      };

      const validArray = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];

      const invalidArray = [
        { id: 1, name: 'Item 1' },
        { id: 'invalid', name: 'Item 2' } // Invalid id type
      ];

      expect(validationEngine.validate(validArray, schema).isValid).toBe(true);
      expect(validationEngine.validate(invalidArray, schema).isValid).toBe(false);
    });
  });
});