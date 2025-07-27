/**
 * Runtime Validation System
 * Enterprise-grade validation framework with Zod integration support
 * 
 * Features:
 * - Schema-based validation for OpenAPI types
 * - Branded type validation 
 * - Italian fiscal compliance rules
 * - Configurable validation levels
 * - Detailed error reporting
 */

import { ValidationError } from '../errors/index';


// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
  value?: unknown;
}

export interface ValidationOptions {
  strict?: boolean;
  enableWarnings?: boolean;
  customValidators?: Record<string, (value: unknown) => ValidationResult>;
}

// Base validator interface
export interface Validator<T = unknown> {
  validate(value: unknown, options?: ValidationOptions): ValidationResult;
  validateOrThrow(value: unknown, options?: ValidationOptions): T;
}

// Schema definition interface (compatible with Zod)
export interface SchemaDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'branded';
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: readonly string[];
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  brandValidator?: (value: unknown) => boolean;
  customValidation?: (value: unknown) => ValidationIssue[];
}

/**
 * Core validation engine
 */
export class ValidationEngine {
  private customValidators: Map<string, Validator> = new Map();

  constructor(private globalOptions: ValidationOptions = {}) {}

  /**
   * Register a custom validator
   */
  registerValidator<T>(name: string, validator: Validator<T>): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Validate a value against a schema
   */
  validate(value: unknown, schema: SchemaDefinition, options?: ValidationOptions): ValidationResult {
    const opts = { ...this.globalOptions, ...options };
    const issues: ValidationIssue[] = [];

    try {
      this.validateValue(value, schema, '', issues, opts);
    } catch (error) {
      issues.push({
        field: 'root',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'VALIDATION_INTERNAL_ERROR',
        severity: 'error',
        value
      });
    }

    const errors = issues.filter(issue => issue.severity === 'error');
    const warnings = issues.filter(issue => issue.severity === 'warning');

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate and throw on error
   */
  validateOrThrow<T>(value: unknown, schema: SchemaDefinition, operation: string, options?: ValidationOptions): T {
    const result = this.validate(value, schema, options);
    
    if (!result.isValid) {
      throw new ValidationError(
        `Validation failed for ${operation}`,
        operation,
        result.errors.map(error => ({
          field: error.field,
          message: error.message,
          code: error.code
        }))
      );
    }

    return value as T;
  }

  private validateValue(
    value: unknown, 
    schema: SchemaDefinition, 
    path: string, 
    issues: ValidationIssue[],
    options: ValidationOptions
  ): void {
    // Handle required validation
    if (schema.required && (value === undefined || value === null)) {
      issues.push({
        field: path || 'root',
        message: 'Required field is missing',
        code: 'REQUIRED',
        severity: 'error',
        value
      });
      return;
    }

    // Skip validation for optional undefined values
    if (value === undefined || value === null) {
      return;
    }

    // Type validation
    switch (schema.type) {
      case 'string':
        this.validateString(value, schema, path, issues);
        break;
      case 'number':
        this.validateNumber(value, schema, path, issues);
        break;
      case 'boolean':
        this.validateBoolean(value, schema, path, issues);
        break;
      case 'object':
        this.validateObject(value, schema, path, issues, options);
        break;
      case 'array':
        this.validateArray(value, schema, path, issues, options);
        break;
      case 'branded':
        this.validateBranded(value, schema, path, issues);
        break;
    }

    // Custom validation
    if (schema.customValidation) {
      const customIssues = schema.customValidation(value);
      issues.push(...customIssues.map(issue => ({
        ...issue,
        field: path ? `${path}.${issue.field}` : issue.field
      })));
    }
  }

  private validateString(
    value: unknown, 
    schema: SchemaDefinition, 
    path: string, 
    issues: ValidationIssue[]
  ): void {
    if (typeof value !== 'string') {
      issues.push({
        field: path,
        message: 'Expected string',
        code: 'INVALID_TYPE',
        severity: 'error',
        value
      });
      return;
    }

    if (schema.minLength !== undefined && value.length < schema.minLength) {
      issues.push({
        field: path,
        message: `String too short (minimum ${schema.minLength} characters)`,
        code: 'TOO_SHORT',
        severity: 'error',
        value
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      issues.push({
        field: path,
        message: `String too long (maximum ${schema.maxLength} characters)`,
        code: 'TOO_LONG',
        severity: 'error',
        value
      });
    }

    if (schema.pattern && !schema.pattern.test(value)) {
      issues.push({
        field: path,
        message: 'String does not match required pattern',
        code: 'PATTERN_MISMATCH',
        severity: 'error',
        value
      });
    }

    if (schema.enum && !schema.enum.includes(value)) {
      issues.push({
        field: path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        code: 'ENUM_MISMATCH',
        severity: 'error',
        value
      });
    }
  }

  private validateNumber(
    value: unknown, 
    schema: SchemaDefinition, 
    path: string, 
    issues: ValidationIssue[]
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      issues.push({
        field: path,
        message: 'Expected valid number',
        code: 'INVALID_TYPE',
        severity: 'error',
        value
      });
      return;
    }

    if (schema.min !== undefined && value < schema.min) {
      issues.push({
        field: path,
        message: `Number too small (minimum ${schema.min})`,
        code: 'TOO_SMALL',
        severity: 'error',
        value
      });
    }

    if (schema.max !== undefined && value > schema.max) {
      issues.push({
        field: path,
        message: `Number too large (maximum ${schema.max})`,
        code: 'TOO_LARGE',
        severity: 'error',
        value
      });
    }
  }

  private validateBoolean(
    value: unknown, 
    _schema: SchemaDefinition, 
    path: string, 
    issues: ValidationIssue[]
  ): void {
    if (typeof value !== 'boolean') {
      issues.push({
        field: path,
        message: 'Expected boolean',
        code: 'INVALID_TYPE',
        severity: 'error',
        value
      });
    }
  }

  private validateObject(
    value: unknown, 
    schema: SchemaDefinition, 
    path: string, 
    issues: ValidationIssue[],
    options: ValidationOptions
  ): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      issues.push({
        field: path,
        message: 'Expected object',
        code: 'INVALID_TYPE',
        severity: 'error',
        value
      });
      return;
    }

    if (schema.properties) {
      const obj = value as Record<string, unknown>;
      
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propPath = path ? `${path}.${key}` : key;
        this.validateValue(obj[key], propSchema, propPath, issues, options);
      }

      // Check for unexpected properties in strict mode
      if (options.strict) {
        const allowedKeys = Object.keys(schema.properties);
        const actualKeys = Object.keys(obj);
        
        for (const key of actualKeys) {
          if (!allowedKeys.includes(key)) {
            issues.push({
              field: path ? `${path}.${key}` : key,
              message: 'Unexpected property',
              code: 'UNEXPECTED_PROPERTY',
              severity: options.enableWarnings ? 'warning' : 'error',
              value: obj[key]
            });
          }
        }
      }
    }
  }

  private validateArray(
    value: unknown, 
    schema: SchemaDefinition, 
    path: string, 
    issues: ValidationIssue[],
    options: ValidationOptions
  ): void {
    if (!Array.isArray(value)) {
      issues.push({
        field: path,
        message: 'Expected array',
        code: 'INVALID_TYPE',
        severity: 'error',
        value
      });
      return;
    }

    if (schema.items) {
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        this.validateValue(item, schema.items!, itemPath, issues, options);
      });
    }
  }

  private validateBranded(
    value: unknown, 
    schema: SchemaDefinition, 
    path: string, 
    issues: ValidationIssue[]
  ): void {
    if (schema.brandValidator && !schema.brandValidator(value)) {
      issues.push({
        field: path,
        message: 'Invalid branded type format',
        code: 'INVALID_BRANDED_TYPE',
        severity: 'error',
        value
      });
    }
  }
}

// Global validation engine instance
export const defaultValidator = new ValidationEngine({
  strict: false,
  enableWarnings: true
});

/**
 * Italian fiscal validation utilities
 */
export class ItalianFiscalValidator {
  /**
   * Validate Italian VAT number (Partita IVA)
   */
  static validateVATNumber(vatNumber: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (typeof vatNumber !== 'string') {
      issues.push({
        field: 'vat_number',
        message: 'VAT number must be a string',
        code: 'INVALID_TYPE',
        severity: 'error',
        value: vatNumber
      });
      return { isValid: false, errors: issues, warnings: [] };
    }

    // Remove any spaces or formatting
    const cleanVat = vatNumber.replace(/\s+/g, '');

    // Must be exactly 11 digits
    if (!/^\d{11}$/.test(cleanVat)) {
      issues.push({
        field: 'vat_number',
        message: 'Italian VAT number must be exactly 11 digits',
        code: 'INVALID_VAT_FORMAT',
        severity: 'error',
        value: vatNumber
      });
      return { isValid: false, errors: issues, warnings: [] };
    }

    // Luhn algorithm check for Italian VAT
    if (!this.luhnCheck(cleanVat)) {
      issues.push({
        field: 'vat_number',
        message: 'Invalid Italian VAT number checksum',
        code: 'INVALID_VAT_CHECKSUM',
        severity: 'error',
        value: vatNumber
      });
    }

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings: []
    };
  }

  /**
   * Validate Italian postal code (CAP)
   */
  static validatePostalCode(postalCode: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (typeof postalCode !== 'string') {
      issues.push({
        field: 'postal_code',
        message: 'Postal code must be a string',
        code: 'INVALID_TYPE',
        severity: 'error',
        value: postalCode
      });
      return { isValid: false, errors: issues, warnings: [] };
    }

    // Italian postal codes are exactly 5 digits
    if (!/^\d{5}$/.test(postalCode)) {
      issues.push({
        field: 'postal_code',
        message: 'Italian postal code must be exactly 5 digits',
        code: 'INVALID_POSTAL_CODE',
        severity: 'error',
        value: postalCode
      });
    }

    return {
      isValid: issues.length === 0,
      errors: issues,
      warnings: []
    };
  }

  /**
   * Validate Italian province code
   */
  static validateProvinceCode(provinceCode: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (typeof provinceCode !== 'string') {
      issues.push({
        field: 'province_code',
        message: 'Province code must be a string',
        code: 'INVALID_TYPE',
        severity: 'error',
        value: provinceCode
      });
      return { isValid: false, errors: issues, warnings: [] };
    }

    // Italian province codes are exactly 2 uppercase letters
    if (!/^[A-Z]{2}$/.test(provinceCode)) {
      issues.push({
        field: 'province_code',
        message: 'Italian province code must be exactly 2 uppercase letters',
        code: 'INVALID_PROVINCE_CODE',
        severity: 'error',
        value: provinceCode
      });
    }

    // Optional: Check against known province codes
    const validProvinceCodes = [
      'AG', 'AL', 'AN', 'AO', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ', 'BS', 'BR',
      'CA', 'CL', 'CB', 'CI', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN', 'FM', 'FE', 'FI', 'FG',
      'FC', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'AQ', 'LT', 'LE', 'LC', 'LI', 'LO', 'LU', 'MC', 'MN', 'MS',
      'MT', 'VS', 'ME', 'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OG', 'OT', 'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PU',
      'PE', 'PC', 'PI', 'PT', 'PN', 'PZ', 'PO', 'RG', 'RA', 'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'SS', 'SV',
      'SI', 'SR', 'SO', 'TA', 'TE', 'TR', 'TO', 'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV',
      'VI', 'VT'
    ];

    if (validProvinceCodes.length > 0 && !validProvinceCodes.includes(provinceCode)) {
      issues.push({
        field: 'province_code',
        message: 'Unknown Italian province code',
        code: 'UNKNOWN_PROVINCE_CODE',
        severity: 'warning',
        value: provinceCode
      });
    }

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      errors: issues.filter(i => i.severity === 'error'),
      warnings: issues.filter(i => i.severity === 'warning')
    };
  }

  private static luhnCheck(vatNumber: string): boolean {
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

// Export utility functions and modules
export * from './schemas';
export * from './branded-validators';
export * from './middleware';