/**
 * OpenAPI Schema Definitions for Runtime Validation
 * Auto-generated validation schemas based on OpenAPI specification
 */

import type { SchemaDefinition } from './index';
import { ItalianFiscalValidator } from './index';
import { 
  isReceiptId, 
  isCashierId, 
  isMerchantId, 
  isFiscalId, 
  isSerialNumber, 
  isPEMId, 
  isAmount, 
  isQuantity 
} from '../types/branded';

/**
 * Address validation schema
 */
export const AddressSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    street_address: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255
    },
    city: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    zip_code: {
      type: 'string',
      required: true,
      pattern: /^\d{5}$/,
      customValidation: (value) => {
        const result = ItalianFiscalValidator.validatePostalCode(value as string);
        return result.errors.concat(result.warnings);
      }
    },
    province: {
      type: 'string',
      required: true,
      pattern: /^[A-Z]{2}$/,
      customValidation: (value) => {
        const result = ItalianFiscalValidator.validateProvinceCode(value as string);
        return result.errors.concat(result.warnings);
      }
    }
  }
};

/**
 * Receipt Item validation schema
 */
export const ReceiptItemSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    description: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255
    },
    quantity: {
      type: 'branded',
      required: true,
      brandValidator: isQuantity
    },
    unit_price: {
      type: 'branded',
      required: true,
      brandValidator: isAmount
    },
    good_or_service: {
      type: 'string',
      required: true,
      enum: ['B', 'S'] as const
    },
    vat_rate_code: {
      type: 'string',
      required: true,
      enum: ['0', '4', '5', '10', '22'] as const
    },
    discount: {
      type: 'branded',
      required: false,
      brandValidator: isAmount
    },
    simplified_vat_allocation: {
      type: 'boolean',
      required: false
    },
    is_down_payment_or_voucher_redemption: {
      type: 'boolean',
      required: false
    },
    complimentary: {
      type: 'boolean',
      required: false
    }
  }
};

/**
 * Receipt Input validation schema
 */
export const ReceiptInputSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    items: {
      type: 'array',
      required: true,
      items: ReceiptItemSchema
    },
    cash_payment_amount: {
      type: 'branded',
      required: true,
      brandValidator: isAmount
    },
    electronic_payment_amount: {
      type: 'branded',
      required: true,
      brandValidator: isAmount
    },
    discount: {
      type: 'branded',
      required: false,
      brandValidator: isAmount
    },
    invoice_issuing: {
      type: 'boolean',
      required: false
    },
    uncollected_dcr_to_ssn: {
      type: 'boolean',
      required: false
    },
    services_uncollected_amount: {
      type: 'branded',
      required: false,
      brandValidator: isAmount
    },
    goods_uncollected_amount: {
      type: 'branded',
      required: false,
      brandValidator: isAmount
    },
    ticket_restaurant_payment_amount: {
      type: 'branded',
      required: false,
      brandValidator: isAmount
    },
    ticket_restaurant_quantity: {
      type: 'number',
      required: false,
      min: 0
    }
  }
};

/**
 * Cashier Input validation schema
 */
export const CashierInputSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    email: {
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 255
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      customValidation: (value) => {
        const password = value as string;
        const issues = [];
        
        if (!/[A-Z]/.test(password)) {
          issues.push({
            field: 'password',
            message: 'Password must contain at least one uppercase letter',
            code: 'PASSWORD_MISSING_UPPERCASE',
            severity: 'error' as const
          });
        }
        
        if (!/[a-z]/.test(password)) {
          issues.push({
            field: 'password',
            message: 'Password must contain at least one lowercase letter',
            code: 'PASSWORD_MISSING_LOWERCASE',
            severity: 'error' as const
          });
        }
        
        if (!/\d/.test(password)) {
          issues.push({
            field: 'password',
            message: 'Password must contain at least one number',
            code: 'PASSWORD_MISSING_NUMBER',
            severity: 'error' as const
          });
        }
        
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          issues.push({
            field: 'password',
            message: 'Password must contain at least one special character',
            code: 'PASSWORD_MISSING_SPECIAL',
            severity: 'warning' as const
          });
        }
        
        return issues;
      }
    }
  }
};

/**
 * Merchant Input validation schema
 */
export const MerchantInputSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    fiscal_id: {
      type: 'branded',
      required: true,
      brandValidator: isFiscalId,
      customValidation: (value) => {
        const result = ItalianFiscalValidator.validateVATNumber(value as string);
        return result.errors.concat(result.warnings);
      }
    },
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255
    },
    email: {
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 255
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128
    },
    address: AddressSchema
  }
};

/**
 * Cash Register Input validation schema
 */
export const CashRegisterInputSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    serial_number: {
      type: 'branded',
      required: true,
      brandValidator: isSerialNumber
    },
    model: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    manufacturer: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    merchant_uuid: {
      type: 'branded',
      required: true,
      brandValidator: isMerchantId
    },
    location: {
      type: 'string',
      required: false,
      maxLength: 255
    }
  }
};

/**
 * Point of Sale Input validation schema
 */
export const PointOfSaleInputSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    merchant_uuid: {
      type: 'branded',
      required: true,
      brandValidator: isMerchantId
    },
    address: AddressSchema
  }
};

/**
 * Activation Request validation schema
 */
export const ActivationRequestSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    registration_key: {
      type: 'string',
      required: true,
      pattern: /^[A-Z0-9-]{16,}$/,
      customValidation: (value) => {
        const key = value as string;
        const issues = [];
        
        if (key.length < 16) {
          issues.push({
            field: 'registration_key',
            message: 'Registration key must be at least 16 characters',
            code: 'REGISTRATION_KEY_TOO_SHORT',
            severity: 'error' as const
          });
        }
        
        if (!/^[A-Z0-9-]+$/.test(key)) {
          issues.push({
            field: 'registration_key',
            message: 'Registration key contains invalid characters',
            code: 'REGISTRATION_KEY_INVALID_CHARS',
            severity: 'error' as const
          });
        }
        
        return issues;
      }
    }
  }
};

/**
 * Inactivity Request validation schema
 */
export const InactivityRequestSchema: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    timestamp: {
      type: 'string',
      required: true,
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/,
      customValidation: (value) => {
        const timestamp = value as string;
        const issues = [];
        
        try {
          const date = new Date(timestamp);
          if (isNaN(date.getTime())) {
            issues.push({
              field: 'timestamp',
              message: 'Invalid timestamp format',
              code: 'INVALID_TIMESTAMP',
              severity: 'error' as const
            });
          }
          
          // Check if timestamp is in the future
          if (date > new Date()) {
            issues.push({
              field: 'timestamp',
              message: 'Timestamp cannot be in the future',
              code: 'TIMESTAMP_FUTURE',
              severity: 'error' as const
            });
          }
        } catch (error) {
          issues.push({
            field: 'timestamp',
            message: 'Invalid timestamp format',
            code: 'INVALID_TIMESTAMP',
            severity: 'error' as const
          });
        }
        
        return issues;
      }
    },
    reason: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 500
    }
  }
};

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  ReceiptId: {
    type: 'branded' as const,
    brandValidator: isReceiptId
  },
  CashierId: {
    type: 'branded' as const,
    brandValidator: isCashierId
  },
  MerchantId: {
    type: 'branded' as const,
    brandValidator: isMerchantId
  },
  FiscalId: {
    type: 'branded' as const,
    brandValidator: isFiscalId
  },
  SerialNumber: {
    type: 'branded' as const,
    brandValidator: isSerialNumber
  },
  PEMId: {
    type: 'branded' as const,
    brandValidator: isPEMId
  },
  Amount: {
    type: 'branded' as const,
    brandValidator: isAmount
  },
  Quantity: {
    type: 'branded' as const,
    brandValidator: isQuantity
  },
  Email: {
    type: 'string' as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  Password: {
    type: 'string' as const,
    minLength: 8,
    maxLength: 128
  }
} as const;

/**
 * PEM Status validation
 */
export const PEMStatusSchema: SchemaDefinition = {
  type: 'string',
  enum: ['NEW', 'REGISTERED', 'ACTIVE', 'ONLINE', 'OFFLINE', 'DISCARDED'] as const
};

/**
 * Receipt Type validation
 */
export const ReceiptTypeSchema: SchemaDefinition = {
  type: 'string',
  enum: ['sale', 'return', 'void'] as const
};

/**
 * Validation schema registry
 */
export const ValidationSchemas = {
  Address: AddressSchema,
  ReceiptItem: ReceiptItemSchema,
  ReceiptInput: ReceiptInputSchema,
  CashierInput: CashierInputSchema,
  MerchantInput: MerchantInputSchema,
  CashRegisterInput: CashRegisterInputSchema,
  PointOfSaleInput: PointOfSaleInputSchema,
  ActivationRequest: ActivationRequestSchema,
  InactivityRequest: InactivityRequestSchema,
  PEMStatus: PEMStatusSchema,
  ReceiptType: ReceiptTypeSchema,
  ...CommonSchemas
} as const;

export type ValidationSchemaName = keyof typeof ValidationSchemas;