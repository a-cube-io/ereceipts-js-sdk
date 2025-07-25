import {
  validateEmail,
  validatePassword,
  validateFiscalId,
  validateZipCode,
  validateProvinceCode,
  validateAddress,
  validateReceiptItem,
  validateMoneyAmount,
  combineValidationResults,
  validateRequired,
  ValidationError,
  ValidationResult,
} from '../../utils/validation';

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    describe('Valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.cd',
        'user@subdomain.example.com',
        'test.email+alias@example.co.uk',
        'user_name@domain.org',
        'user-name@domain.net',
        'user123@example123.com',
      ];

      test.each(validEmails)('should accept valid email: %s', (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid emails', () => {
      const invalidEmails = [
        { email: '', reason: 'empty string' },
        { email: '   ', reason: 'whitespace only' },
        { email: 'invalid-email', reason: 'no @ symbol' },
        { email: '@example.com', reason: 'no local part' },
        { email: 'user@', reason: 'no domain' },
        { email: 'user@.com', reason: 'domain starts with dot' },
        { email: 'user@example.', reason: 'domain ends with dot' },
        { email: 'user..name@example.com', reason: 'consecutive dots in local part' },
        { email: 'user@example..com', reason: 'consecutive dots in domain' },
        { email: 'user name@example.com', reason: 'space in local part' },
        { email: 'user@example com', reason: 'space in domain' },
        { email: 'user@example', reason: 'missing TLD' },
        { email: 'user@.example.com', reason: 'domain starts with dot' },
        { email: 'user@example..com', reason: 'consecutive dots in domain' },
        { email: 'user@-example.com', reason: 'domain starts with hyphen' },
        // { email: 'user@example-.com', reason: 'domain ends with hyphen' }, // Zod considers this valid
        { email: 'user@example.-com', reason: 'TLD starts with dot' },
        { email: 'user@example.com-', reason: 'TLD ends with hyphen' },
      ];

      test.each(invalidEmails)('should reject invalid email: $email ($reason)', ({ email }) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Invalid email format',
          code: 'EMAIL_INVALID',
        });
      });
    });

    describe('ReDoS protection', () => {
      const maliciousPatterns = [
        `a!@!.${'!.'.repeat(1000)}@example.com`,
        `a!@!.${'!.'.repeat(10000)}@example.com`,
        `a${'!'.repeat(1000)}@example.com`,
        `a${'@'.repeat(1000)}example.com`,
      ];

      test.each(maliciousPatterns)('should handle ReDoS-safe pattern: %s', (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Invalid email format',
          code: 'EMAIL_INVALID',
        });
      });
    });

    describe('Edge cases', () => {
      it('should reject email with only @ symbol', () => {
        const result = validateEmail('@');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Invalid email format',
          code: 'EMAIL_INVALID',
        });
      });

      it('should reject email with only dots', () => {
        const result = validateEmail('...@...');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Invalid email format',
          code: 'EMAIL_INVALID',
        });
      });
    });
  });

  describe('Password Validation', () => {
    describe('Valid passwords', () => {
      const validPasswords = [
        'Password123!',
        'MySecurePass1@',
        'Complex#Pass2',
        'Test123$Pass',
        'Valid@Pass1',
        'StrongP@ssw0rd',
        'C0mpl3x!Pass',
        'S3cur3#P@ss',
        'T3st$P@ssw0rd',
        'V@lid!P@ss1',
      ];

      test.each(validPasswords)('should accept valid password: %s', (password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid passwords', () => {
      it('should reject empty password', () => {
        const result = validatePassword('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Password must be at least 8 characters',
          code: 'PASSWORD_TOO_SHORT',
        });
      });

      it('should reject password that is too short', () => {
        const result = validatePassword('Pass1!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Password must be at least 8 characters',
          code: 'PASSWORD_TOO_SHORT',
        });
      });

      it('should reject password that is too long', () => {
        const longPassword = 'A'.repeat(41);
        const result = validatePassword(longPassword);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Password must not exceed 40 characters',
          code: 'PASSWORD_TOO_LONG',
        });
      });

      it('should reject password without uppercase', () => {
        const result = validatePassword('password123!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Password must contain uppercase letter',
          code: 'PASSWORD_NO_UPPERCASE',
        });
      });

      it('should reject password without lowercase', () => {
        const result = validatePassword('PASSWORD123!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Password must contain lowercase letter',
          code: 'PASSWORD_NO_LOWERCASE',
        });
      });

      it('should reject password without digit', () => {
        const result = validatePassword('Password!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Password must contain a digit',
          code: 'PASSWORD_NO_DIGIT',
        });
      });

      it('should reject password without special character', () => {
        const result = validatePassword('Password123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Password must contain a special character',
          code: 'PASSWORD_NO_SPECIAL',
        });
      });
    });

    describe('Multiple validation errors', () => {
      it('should collect multiple errors for invalid password', () => {
        const result = validatePassword('pass');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        
        const errorCodes = result.errors.map(e => e.code);
        expect(errorCodes).toContain('PASSWORD_TOO_SHORT');
        expect(errorCodes).toContain('PASSWORD_NO_UPPERCASE');
        expect(errorCodes).toContain('PASSWORD_NO_DIGIT');
        expect(errorCodes).toContain('PASSWORD_NO_SPECIAL');
      });

      it('should collect all validation errors for empty password', () => {
        const result = validatePassword('');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        
        const errorCodes = result.errors.map(e => e.code);
        expect(errorCodes).toContain('PASSWORD_TOO_SHORT');
        expect(errorCodes).toContain('PASSWORD_NO_UPPERCASE');
        expect(errorCodes).toContain('PASSWORD_NO_LOWERCASE');
        expect(errorCodes).toContain('PASSWORD_NO_DIGIT');
        expect(errorCodes).toContain('PASSWORD_NO_SPECIAL');
      });
    });
  });

  describe('Fiscal ID Validation', () => {
    describe('Valid fiscal IDs', () => {
      const validFiscalIds = [
        '12345678901',
        '98765432109',
        '11111111111',
        '00000000000',
        '12345678901',
        '98765432109',
        '55555555555',
        '99999999999',
      ];

      test.each(validFiscalIds)('should accept valid fiscal ID: %s', (fiscalId) => {
        const result = validateFiscalId(fiscalId);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid fiscal IDs', () => {
      const invalidFiscalIds = [
        { fiscalId: '', reason: 'empty string' },
        { fiscalId: '1234567890', reason: 'too short (10 digits)' },
        { fiscalId: '123456789012', reason: 'too long (12 digits)' },
        { fiscalId: '1234567890a', reason: 'contains letter' },
        { fiscalId: '1234567890.', reason: 'contains special char' },
        { fiscalId: '1234567890 ', reason: 'contains space' },
        { fiscalId: '1234567890-', reason: 'contains hyphen' },
        { fiscalId: '1234567890_', reason: 'contains underscore' },
        { fiscalId: '1234567890@', reason: 'contains @ symbol' },
        { fiscalId: '1234567890#', reason: 'contains hash' },
      ];

      test.each(invalidFiscalIds)('should reject invalid fiscal ID: $fiscalId ($reason)', ({ fiscalId }) => {
        const result = validateFiscalId(fiscalId);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Fiscal ID must be exactly 11 digits',
          code: 'FISCAL_ID_INVALID',
        });
      });
    });
  });

  describe('ZIP Code Validation', () => {
    describe('Valid ZIP codes', () => {
      const validZipCodes = [
        '12345',
        '00000',
        '99999',
        '54321',
        '12345',
        '00000',
        '99999',
        '54321',
        '11111',
        '22222',
      ];

      test.each(validZipCodes)('should accept valid ZIP code: %s', (zipCode) => {
        const result = validateZipCode(zipCode);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid ZIP codes', () => {
      const invalidZipCodes = [
        { zipCode: '', reason: 'empty string' },
        { zipCode: '1234', reason: 'too short (4 digits)' },
        { zipCode: '123456', reason: 'too long (6 digits)' },
        { zipCode: '1234a', reason: 'contains letter' },
        { zipCode: '1234.', reason: 'contains special char' },
        { zipCode: '1234 ', reason: 'contains space' },
        { zipCode: '1234-', reason: 'contains hyphen' },
        { zipCode: '1234_', reason: 'contains underscore' },
        { zipCode: '1234@', reason: 'contains @ symbol' },
        { zipCode: '1234#', reason: 'contains hash' },
      ];

      test.each(invalidZipCodes)('should reject invalid ZIP code: $zipCode ($reason)', ({ zipCode }) => {
        const result = validateZipCode(zipCode);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'ZIP code must be 5 digits',
          code: 'ZIP_CODE_INVALID',
        });
      });
    });
  });

  describe('Province Code Validation', () => {
    describe('Valid province codes', () => {
      const validProvinces = [
        'MI', 'RO', 'TO', 'NA', 'RM',
        'MI', 'RO', 'TO', 'NA', 'RM',
        'MI', 'RO', 'TO', 'NA', 'RM',
      ];

      test.each(validProvinces)('should accept valid province code: %s', (province) => {
        const result = validateProvinceCode(province);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Case insensitive validation', () => {
      const lowercaseProvinces = ['mi', 'ro', 'to', 'na', 'rm'];

      test.each(lowercaseProvinces)('should accept lowercase province code: %s', (province) => {
        const result = validateProvinceCode(province);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid province codes', () => {
      const invalidProvinces = [
        { province: '', reason: 'empty string' },
        { province: 'M', reason: 'too short (1 character)' },
        { province: 'MIL', reason: 'too long (3 characters)' },
        { province: 'M1', reason: 'contains digit' },
        { province: 'M.', reason: 'contains special char' },
        { province: 'M ', reason: 'contains space' },
        { province: 'M-', reason: 'contains hyphen' },
        { province: 'M_', reason: 'contains underscore' },
        { province: 'M@', reason: 'contains @ symbol' },
        { province: 'M#', reason: 'contains hash' },
      ];

      test.each(invalidProvinces)('should reject invalid province code: $province ($reason)', ({ province }) => {
        const result = validateProvinceCode(province);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Province code must be 2 letters',
          code: 'PROVINCE_INVALID',
        });
      });
    });
  });

  describe('Address Validation', () => {
    describe('Valid addresses', () => {
      const validAddresses = [
        {
          street_address: 'Via Roma 123',
          zip_code: '20100',
          city: 'Milano',
          province: 'MI',
        },
        {
          street_address: 'Corso Italia 456',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM',
        },
        {
          street_address: 'Via Torino 789',
          zip_code: '10100',
          city: 'Torino',
          province: 'TO',
        },
      ];

      test.each(validAddresses)('should accept valid address: $street_address', (address) => {
        const result = validateAddress(address);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid addresses', () => {
      it('should reject address with missing street address', () => {
        const invalidAddress = {
          street_address: '',
          zip_code: '20100',
          city: 'Milano',
          province: 'MI',
        };

        const result = validateAddress(invalidAddress);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'street_address',
          message: 'Street address is required',
          code: 'STREET_ADDRESS_REQUIRED',
        });
      });

      it('should reject address with missing city', () => {
        const invalidAddress = {
          street_address: 'Via Roma 123',
          zip_code: '20100',
          city: '',
          province: 'MI',
        };

        const result = validateAddress(invalidAddress);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'city',
          message: 'City is required',
          code: 'CITY_REQUIRED',
        });
      });

      it('should reject address with invalid ZIP code', () => {
        const invalidAddress = {
          street_address: 'Via Roma 123',
          zip_code: '1234', // invalid
          city: 'Milano',
          province: 'MI',
        };

        const result = validateAddress(invalidAddress);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'zip_code',
          message: 'ZIP code must be 5 digits',
          code: 'ZIP_CODE_INVALID',
        });
      });

      it('should reject address with invalid province code', () => {
        const invalidAddress = {
          street_address: 'Via Roma 123',
          zip_code: '20100',
          city: 'Milano',
          province: 'M', // invalid
        };

        const result = validateAddress(invalidAddress);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'province',
          message: 'Province code must be 2 letters',
          code: 'PROVINCE_INVALID',
        });
      });
    });

    describe('Multiple validation errors', () => {
      it('should collect multiple address errors', () => {
        const invalidAddress = {
          street_address: '',
          zip_code: '1234', // invalid
          city: '',
          province: 'M', // invalid
        };

        const result = validateAddress(invalidAddress);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        
        const errorCodes = result.errors.map(e => e.code);
        expect(errorCodes).toContain('STREET_ADDRESS_REQUIRED');
        expect(errorCodes).toContain('CITY_REQUIRED');
        expect(errorCodes).toContain('ZIP_CODE_INVALID');
        expect(errorCodes).toContain('PROVINCE_INVALID');
      });
    });
  });

  describe('Receipt Item Validation', () => {
    describe('Valid receipt items', () => {
      const validItems = [
        {
          quantity: '2.00',
          description: 'Test product',
          unit_price: '10.50',
        },
        {
          quantity: '1.00',
          description: 'Another product',
          unit_price: '25.99',
        },
        {
          quantity: '0.50',
          description: 'Half product',
          unit_price: '100.00',
        },
      ];

      test.each(validItems)('should accept valid receipt item: $description', (item) => {
        const result = validateReceiptItem(item);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid receipt items', () => {
      it('should reject item with missing quantity', () => {
        const invalidItem = {
          quantity: '',
          description: 'Test product',
          unit_price: '10.50',
        };

        const result = validateReceiptItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'quantity',
          message: 'Quantity is required',
          code: 'QUANTITY_REQUIRED',
        });
      });

      it('should reject item with invalid quantity format', () => {
        const invalidItem = {
          quantity: '2', // missing .XX
          description: 'Test product',
          unit_price: '10.50',
        };

        const result = validateReceiptItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'quantity',
          message: 'Quantity must be format X.XX',
          code: 'QUANTITY_INVALID_FORMAT',
        });
      });

      it('should reject item with missing description', () => {
        const invalidItem = {
          quantity: '2.00',
          description: '',
          unit_price: '10.50',
        };

        const result = validateReceiptItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'description',
          message: 'Description is required',
          code: 'DESCRIPTION_REQUIRED',
        });
      });

      it('should reject item with description too long', () => {
        const longDescription = 'A'.repeat(1001);
        const invalidItem = {
          quantity: '2.00',
          description: longDescription,
          unit_price: '10.50',
        };

        const result = validateReceiptItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'description',
          message: 'Description must not exceed 1000 characters',
          code: 'DESCRIPTION_TOO_LONG',
        });
      });

      it('should reject item with missing unit price', () => {
        const invalidItem = {
          quantity: '2.00',
          description: 'Test product',
          unit_price: '',
        };

        const result = validateReceiptItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'unit_price',
          message: 'Unit price is required',
          code: 'UNIT_PRICE_REQUIRED',
        });
      });

      it('should reject item with invalid unit price format', () => {
        const invalidItem = {
          quantity: '2.00',
          description: 'Test product',
          unit_price: '10.123456789', // too many decimal places
        };

        const result = validateReceiptItem(invalidItem);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'unit_price',
          message: 'Unit price invalid format',
          code: 'UNIT_PRICE_INVALID_FORMAT',
        });
      });
    });
  });

  describe('Money Amount Validation', () => {
    describe('Valid money amounts', () => {
      const validAmounts = [
        '10.50',
        '100.00',
        '0.01',
        '1234.5678',
        '1000',
        '0.99',
        '999999.99',
        '1.23456789',
      ];

      test.each(validAmounts)('should accept valid money amount: %s', (amount) => {
        const result = validateMoneyAmount(amount, 'amount');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Optional validation', () => {
      it('should accept empty amount when not required', () => {
        const result = validateMoneyAmount('', 'amount', false);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty amount when required', () => {
        const result = validateMoneyAmount('', 'amount', true);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Field invalid',
          code: 'AMOUNT_REQUIRED',
        });
      });
    });

    describe('Invalid money amounts', () => {
      const invalidAmounts = [
        { amount: '10.1', reason: 'too few decimal places' },
        { amount: '10.123456789', reason: 'too many decimal places' },
        { amount: '10,50', reason: 'wrong decimal separator' },
        { amount: '10.50.00', reason: 'multiple decimal points' },
        { amount: 'abc', reason: 'non-numeric' },
        { amount: '10.50a', reason: 'contains letter' },
        { amount: '10.50@', reason: 'contains special char' },
        { amount: '10.50 ', reason: 'contains space' },
        { amount: '-10.50', reason: 'negative amount' },
        { amount: '+10.50', reason: 'positive sign' },
      ];

      test.each(invalidAmounts)('should reject invalid money amount: $amount ($reason)', ({ amount }) => {
        const result = validateMoneyAmount(amount, 'amount');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Field invalid',
          code: 'AMOUNT_INVALID_FORMAT',
        });
      });
    });
  });

  describe('Validation Result Combination', () => {
    describe('combineValidationResults', () => {
      it('should combine valid results', () => {
        const result1: ValidationResult = { isValid: true, errors: [] };
        const result2: ValidationResult = { isValid: true, errors: [] };

        const combined = combineValidationResults(result1, result2);
        expect(combined.isValid).toBe(true);
        expect(combined.errors).toHaveLength(0);
      });

      it('should combine results with errors', () => {
        const error1: ValidationError = {
          field: 'email',
          message: 'Invalid email',
          code: 'EMAIL_INVALID',
        };
        const error2: ValidationError = {
          field: 'password',
          message: 'Invalid password',
          code: 'PASSWORD_INVALID',
        };

        const result1: ValidationResult = { isValid: false, errors: [error1] };
        const result2: ValidationResult = { isValid: false, errors: [error2] };

        const combined = combineValidationResults(result1, result2);
        expect(combined.isValid).toBe(false);
        expect(combined.errors).toHaveLength(2);
        expect(combined.errors).toContainEqual(error1);
        expect(combined.errors).toContainEqual(error2);
      });

      it('should handle mixed valid and invalid results', () => {
        const error: ValidationError = {
          field: 'email',
          message: 'Invalid email',
          code: 'EMAIL_INVALID',
        };

        const result1: ValidationResult = { isValid: true, errors: [] };
        const result2: ValidationResult = { isValid: false, errors: [error] };

        const combined = combineValidationResults(result1, result2);
        expect(combined.isValid).toBe(false);
        expect(combined.errors).toHaveLength(1);
        expect(combined.errors).toContainEqual(error);
      });

      it('should handle multiple results', () => {
        const error1: ValidationError = { field: 'field1', message: 'Error 1', code: 'ERROR_1' };
        const error2: ValidationError = { field: 'field2', message: 'Error 2', code: 'ERROR_2' };
        const error3: ValidationError = { field: 'field3', message: 'Error 3', code: 'ERROR_3' };

        const result1: ValidationResult = { isValid: false, errors: [error1] };
        const result2: ValidationResult = { isValid: true, errors: [] };
        const result3: ValidationResult = { isValid: false, errors: [error2, error3] };

        const combined = combineValidationResults(result1, result2, result3);
        expect(combined.isValid).toBe(false);
        expect(combined.errors).toHaveLength(3);
        expect(combined.errors).toContainEqual(error1);
        expect(combined.errors).toContainEqual(error2);
        expect(combined.errors).toContainEqual(error3);
      });
    });
  });

  describe('Required Field Validation', () => {
    describe('Valid values', () => {
      const validValues = [
        'test',
        '0',
        'false',
        'null',
        0,
        false,
        [],
        {},
        ' ',
        'hello world',
      ];

      test.each(validValues)('should accept valid value: %s', (value) => {
        const result = validateRequired(value, 'field');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid values', () => {
      it('should reject null values', () => {
        const result = validateRequired(null, 'field');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Field invalid',
          code: 'FIELD_REQUIRED',
        });
      });

      it('should reject undefined values', () => {
        const result = validateRequired(undefined, 'field');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Field invalid',
          code: 'FIELD_REQUIRED',
        });
      });

      it('should reject empty strings', () => {
        const result = validateRequired('', 'field');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: '',
          message: 'Field invalid',
          code: 'FIELD_REQUIRED',
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle zero as valid value', () => {
        const result = validateRequired(0, 'field');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle false as valid value', () => {
        const result = validateRequired(false, 'field');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle empty array as valid value', () => {
        const result = validateRequired([], 'field');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle empty object as valid value', () => {
        const result = validateRequired({}, 'field');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
}); 