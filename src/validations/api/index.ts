/**
 * Zod validation schemas for ACube E-Receipt API
 * 
 * This module exports all validation schemas and types for API input DTOs.
 * Use these schemas to validate user input before sending requests to the API.
 * 
 * @example
 * ```typescript
 * import { ReceiptInputSchema, ReceiptInputType } from '@/validations/api';
 * 
 * // Validate input data
 * const result = ReceiptInputSchema.safeParse(userInput);
 * if (!result.success) {
 *   console.error('Validation errors:', result.error.errors);
 * } else {
 *   // Use validated data
 *   const validatedData: ReceiptInputType = result.data;
 * }
 * ```
 */

import * as z from "zod";

// Receipt schemas and types
export {
  ReceiptItemSchema,
  ReceiptInputSchema,
  ReceiptReturnOrVoidViaPEMInputSchema,
  ReceiptReturnOrVoidWithProofInputSchema,
  ReceiptReturnInputSchema,
  VoidReceiptInputSchema,
  ReceiptReturnItemSchema,
  VatRateCodeSchema,
  GoodOrServiceSchema,
  ReceiptProofTypeSchema,
  VAT_RATE_CODE_OPTIONS,
  GOOD_OR_SERVICE_OPTIONS,
  RECEIPT_PROOF_TYPE_OPTIONS,
  type ReceiptItemType,
  type ReceiptInputType,
  type ReceiptReturnOrVoidViaPEMInputType,
  type ReceiptReturnOrVoidWithProofInputType,
  type VatRateCodeType,
  type GoodOrServiceType,
  type ReceiptProofTypeType,
  type ReceiptReturnType,
  type ReceiptReturnItemType,
  type VoidReceiptInputType,
} from './receipts';

// Cashier schemas and types
export {
  CashierCreateInputSchema,
  type CashierCreateInputType,
} from './cashiers';

// Point of Sales schemas and types
export {
  AddressSchema,
  PEMStatusSchema,
  ActivationRequestSchema,
  PEMStatusOfflineRequestSchema,
  PEM_STATUS_OPTIONS,
  type AddressType,
  type PEMStatusType,
  type ActivationRequestType,
  type PEMStatusOfflineRequestType,
} from './point-of-sales';

// Cash Register schemas and types
export {
  CashRegisterCreateSchema,
  type CashRegisterCreateType,
} from './cash-registers';

// Merchant schemas and types
export {
  MerchantCreateInputSchema,
  MerchantUpdateInputSchema,
  type MerchantCreateInputType,
  type MerchantUpdateInputType,
} from './merchants';

// PEM schemas and types
export {
  PemDataSchema,
  PemCreateInputSchema,
  PEM_TYPE_OPTIONS,
  type PemDataType,
  type PemCreateInputType,
} from './pems';

// Supplier schemas and types
export {
  SupplierCreateInputSchema,
  SupplierUpdateInputSchema,
  type SupplierCreateInputType,
  type SupplierUpdateInputType,
} from './suppliers';

// Journal schemas and types
export {
  JournalCloseInputSchema,
  type JournalCloseInputType,
} from './journals';

// Daily Reports schemas and types
export {
  DailyReportStatusSchema,
  DailyReportsParamsSchema,
  DAILY_REPORT_STATUS_OPTIONS,
  type DailyReportStatusType,
  type DailyReportsParamsType,
} from './daily-reports';

// Common validation utilities
export const ValidationMessages = {
  fieldIsRequired: 'This field is required',
  arrayMin1: 'At least one item is required',
  paymentMethodRequired: 'At least one payment method is required',
  invalidEmail: 'Please enter a valid email address',
  passwordMinLength: 'Password must be at least 8 characters long',
  passwordComplexity: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  invalidZipCode: 'Please enter a valid 5-digit zip code',
  provinceMinLength: 'Province code must be 2 characters',
  provinceMaxLength: 'Province code must be 2 characters',
  invalidDateFormat: 'Please enter a valid date',
  nameMaxLength: 'Name is too long',
  invalidFiscalId: 'Please enter a valid Italian fiscal ID (Codice Fiscale or Partita IVA)',
  invalidVatNumber: 'Please enter a valid VAT number (11 digits)',
  invalidFiscalCode: 'Please enter a valid fiscal code (11 digits)',
  businessNameMaxLength: 'Business name is too long (max 200 characters)',
  businessNameOrPersonalNamesRequired: 'Please provide either a business name or first/last name, but not both',
  firstNameMaxLength: 'First name is too long (max 100 characters)',
  lastNameMaxLength: 'Last name is too long (max 100 characters)',
  invalidUuid: 'Please enter a valid UUID',
  invalidPemType: 'PEM type must be one of: AP, SP, TM, PV',
  reasonMaxLength: 'Reason is too long (max 255 characters)',
  pageMinValue: 'Page number must be at least 1',
  invalidDailyReportStatus: 'Daily report status must be one of: pending, sent, error',
  displayNameMaxLength: 'Display name is too long (max 255 characters)',
} as const;


// Validation helper functions
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.issues.map((error: any) => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code,
    }));
    
    return {
      success: false,
      errors,
      data: null,
    };
  }
  
  return {
    success: true,
    errors: [],
    data: result.data,
  };
};

// Type-safe validation result
export interface ValidationResult<T> {
  success: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  data: T | null;
}
