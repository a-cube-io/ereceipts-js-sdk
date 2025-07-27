/**
 * Branded Type Validators
 * Runtime validation for all branded types used in the SDK
 */

import type { Validator, ValidationResult, ValidationIssue } from './index';
import { 
  isReceiptId, 
  isCashierId, 
  isMerchantId, 
  isFiscalId, 
  isSerialNumber, 
  isPEMId, 
  isAmount, 
  isQuantity,
  type ReceiptId,
  type CashierId,
  type MerchantId,
  type FiscalId,
  type SerialNumber,
  type PEMId,
  type Amount,
  type Quantity
} from '../types/branded';

/**
 * Base branded type validator
 */
abstract class BrandedValidator<T> implements Validator<T> {
  constructor(
    protected typeName: string,
    protected typeGuard: (value: unknown) => boolean
  ) {}

  validate(value: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!this.typeGuard(value)) {
      issues.push({
        field: this.typeName.toLowerCase(),
        message: `Invalid ${this.typeName} format`,
        code: `INVALID_${this.typeName.toUpperCase()}_FORMAT`,
        severity: 'error',
        value
      });
    }

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings: []
    };
  }

  validateOrThrow(value: unknown): T {
    const result = this.validate(value);
    
    if (!result.isValid) {
      const error = result.errors[0];
      if (error) {
        throw new Error(`${error.message} (code: ${error.code})`);
      }
      throw new Error('Validation failed');
    }

    return value as T;
  }
}

/**
 * Receipt ID validator
 */
export class ReceiptIdValidator extends BrandedValidator<ReceiptId> {
  constructor() {
    super('ReceiptId', isReceiptId);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'string') {
      const issues: ValidationIssue[] = [];
      
      // Additional validation rules for receipt IDs
      if (value.length < 10) {
        issues.push({
          field: 'receipt_id',
          message: 'Receipt ID too short (minimum 10 characters)',
          code: 'RECEIPT_ID_TOO_SHORT',
          severity: 'warning',
          value
        });
      }
      
      // Check for common receipt ID patterns
      if (!value.startsWith('receipt_') && !value.startsWith('rcpt_')) {
        issues.push({
          field: 'receipt_id',
          message: 'Receipt ID should start with "receipt_" or "rcpt_" prefix',
          code: 'RECEIPT_ID_MISSING_PREFIX',
          severity: 'warning',
          value
        });
      }

      return {
        isValid: baseResult.isValid,
        errors: baseResult.errors,
        warnings: issues
      };
    }

    return baseResult;
  }
}

/**
 * Cashier ID validator
 */
export class CashierIdValidator extends BrandedValidator<CashierId> {
  constructor() {
    super('CashierId', isCashierId);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'number') {
      const issues: ValidationIssue[] = [];
      
      // Additional validation rules for cashier IDs
      if (value > 999999) {
        issues.push({
          field: 'cashier_id',
          message: 'Cashier ID unusually large (over 999999)',
          code: 'CASHIER_ID_VERY_LARGE',
          severity: 'warning',
          value
        });
      }

      return {
        isValid: baseResult.isValid,
        errors: baseResult.errors,
        warnings: issues
      };
    }

    return baseResult;
  }
}

/**
 * Merchant ID validator
 */
export class MerchantIdValidator extends BrandedValidator<MerchantId> {
  constructor() {
    super('MerchantId', isMerchantId);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'string') {
      const issues: ValidationIssue[] = [];
      
      // Additional validation rules for merchant IDs
      if (!value.startsWith('merchant_') && !value.startsWith('merch_')) {
        issues.push({
          field: 'merchant_id',
          message: 'Merchant ID should start with "merchant_" or "merch_" prefix',
          code: 'MERCHANT_ID_MISSING_PREFIX',
          severity: 'warning',
          value
        });
      }

      return {
        isValid: baseResult.isValid,
        errors: baseResult.errors,
        warnings: issues
      };
    }

    return baseResult;
  }
}

/**
 * Fiscal ID validator with Italian VAT number validation
 */
export class FiscalIdValidator extends BrandedValidator<FiscalId> {
  constructor() {
    super('FiscalId', isFiscalId);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'string') {
      const issues: ValidationIssue[] = [];
      
      // Luhn algorithm check for Italian VAT numbers
      if (!this.luhnCheck(value)) {
        issues.push({
          field: 'fiscal_id',
          message: 'Invalid Italian VAT number checksum',
          code: 'INVALID_VAT_CHECKSUM',
          severity: 'error',
          value
        });
      }

      // Check for common invalid patterns
      if (/^0{11}$/.test(value)) {
        issues.push({
          field: 'fiscal_id',
          message: 'Fiscal ID cannot be all zeros',
          code: 'FISCAL_ID_ALL_ZEROS',
          severity: 'error',
          value
        });
      }

      if (/^(\d)\1{10}$/.test(value)) {
        issues.push({
          field: 'fiscal_id',
          message: 'Fiscal ID cannot be all the same digit',
          code: 'FISCAL_ID_REPEATED_DIGIT',
          severity: 'error',
          value
        });
      }

      return {
        isValid: baseResult.isValid && issues.filter(i => i.severity === 'error').length === 0,
        errors: [...baseResult.errors, ...issues.filter(i => i.severity === 'error')],
        warnings: issues.filter(i => i.severity === 'warning')
      };
    }

    return baseResult;
  }

  private luhnCheck(vatNumber: string): boolean {
    const digits = vatNumber.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 10; i++) {
      const digit = digits[i];
      if (digit === undefined || isNaN(digit)) continue;
      
      let processedDigit = digit;
      if (i % 2 === 1) {
        processedDigit *= 2;
        if (processedDigit > 9) {
          processedDigit = Math.floor(processedDigit / 10) + (processedDigit % 10);
        }
      }
      sum += processedDigit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    const lastDigit = digits[10];
    return lastDigit !== undefined && !isNaN(lastDigit) && checkDigit === lastDigit;
  }
}

/**
 * Serial Number validator
 */
export class SerialNumberValidator extends BrandedValidator<SerialNumber> {
  constructor() {
    super('SerialNumber', isSerialNumber);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'string') {
      const issues: ValidationIssue[] = [];
      
      // Check for common device prefixes
      const validPrefixes = ['SN', 'DEVICE', 'POS', 'REG', 'TERM'];
      const hasValidPrefix = validPrefixes.some(prefix => value.startsWith(prefix));
      
      if (!hasValidPrefix) {
        issues.push({
          field: 'serial_number',
          message: `Serial number should start with one of: ${validPrefixes.join(', ')}`,
          code: 'SERIAL_NUMBER_UNUSUAL_PREFIX',
          severity: 'warning',
          value
        });
      }

      // Check for sufficient entropy (not all same character)
      if (/^(.)\1+$/.test(value)) {
        issues.push({
          field: 'serial_number',
          message: 'Serial number cannot be all the same character',
          code: 'SERIAL_NUMBER_NO_ENTROPY',
          severity: 'error',
          value
        });
      }

      return {
        isValid: baseResult.isValid && issues.filter(i => i.severity === 'error').length === 0,
        errors: [...baseResult.errors, ...issues.filter(i => i.severity === 'error')],
        warnings: issues.filter(i => i.severity === 'warning')
      };
    }

    return baseResult;
  }
}

/**
 * PEM ID validator
 */
export class PEMIdValidator extends BrandedValidator<PEMId> {
  constructor() {
    super('PEMId', isPEMId);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'string') {
      const issues: ValidationIssue[] = [];
      
      // Check for Italian PEM ID format (E001-000001)
      if (/^E\d{3}-\d{6}$/.test(value)) {
        // Valid Italian PEM format
      } else if (!value.startsWith('PEM') && !value.startsWith('DEVICE')) {
        issues.push({
          field: 'pem_id',
          message: 'PEM ID should follow Italian format (E001-000001) or start with "PEM"/"DEVICE"',
          code: 'PEM_ID_UNUSUAL_FORMAT',
          severity: 'warning',
          value
        });
      }

      return {
        isValid: baseResult.isValid,
        errors: baseResult.errors,
        warnings: issues
      };
    }

    return baseResult;
  }
}

/**
 * Amount validator with currency rules
 */
export class AmountValidator extends BrandedValidator<Amount> {
  constructor() {
    super('Amount', isAmount);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'string') {
      const issues: ValidationIssue[] = [];
      
      const numericValue = parseFloat(value);
      
      // Check for reasonable ranges
      if (numericValue > 999999.99) {
        issues.push({
          field: 'amount',
          message: 'Amount unusually large (over €999,999.99)',
          code: 'AMOUNT_VERY_LARGE',
          severity: 'warning',
          value
        });
      }
      
      if (numericValue < 0) {
        issues.push({
          field: 'amount',
          message: 'Amount cannot be negative',
          code: 'AMOUNT_NEGATIVE',
          severity: 'error',
          value
        });
      }

      // Check decimal places (should be appropriate for currency)
      const decimalPart = value.split('.')[1];
      if (decimalPart && decimalPart.length > 8) {
        issues.push({
          field: 'amount',
          message: 'Amount has too many decimal places (maximum 8)',
          code: 'AMOUNT_TOO_PRECISE',
          severity: 'error',
          value
        });
      }

      return {
        isValid: baseResult.isValid && issues.filter(i => i.severity === 'error').length === 0,
        errors: [...baseResult.errors, ...issues.filter(i => i.severity === 'error')],
        warnings: issues.filter(i => i.severity === 'warning')
      };
    }

    return baseResult;
  }
}

/**
 * Quantity validator
 */
export class QuantityValidator extends BrandedValidator<Quantity> {
  constructor() {
    super('Quantity', isQuantity);
  }

  override validate(value: unknown): ValidationResult {
    const baseResult = super.validate(value);
    
    if (baseResult.isValid && typeof value === 'string') {
      const issues: ValidationIssue[] = [];
      
      const numericValue = parseFloat(value);
      
      // Check for reasonable ranges
      if (numericValue > 9999.999) {
        issues.push({
          field: 'quantity',
          message: 'Quantity unusually large (over 9999.999)',
          code: 'QUANTITY_VERY_LARGE',
          severity: 'warning',
          value
        });
      }
      
      if (numericValue <= 0) {
        issues.push({
          field: 'quantity',
          message: 'Quantity must be positive',
          code: 'QUANTITY_NOT_POSITIVE',
          severity: 'error',
          value
        });
      }

      // Check for reasonable precision
      const decimalPart = value.split('.')[1];
      if (decimalPart && decimalPart.length > 6) {
        issues.push({
          field: 'quantity',
          message: 'Quantity has too many decimal places (maximum 6 recommended)',
          code: 'QUANTITY_TOO_PRECISE',
          severity: 'warning',
          value
        });
      }

      return {
        isValid: baseResult.isValid && issues.filter(i => i.severity === 'error').length === 0,
        errors: [...baseResult.errors, ...issues.filter(i => i.severity === 'error')],
        warnings: issues.filter(i => i.severity === 'warning')
      };
    }

    return baseResult;
  }
}

/**
 * Registry of all branded validators
 */
export const BrandedValidators = {
  ReceiptId: new ReceiptIdValidator(),
  CashierId: new CashierIdValidator(),
  MerchantId: new MerchantIdValidator(),
  FiscalId: new FiscalIdValidator(),
  SerialNumber: new SerialNumberValidator(),
  PEMId: new PEMIdValidator(),
  Amount: new AmountValidator(),
  Quantity: new QuantityValidator()
} as const;

export type BrandedValidatorName = keyof typeof BrandedValidators;