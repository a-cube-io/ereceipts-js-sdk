import { ZodIssue, z } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

function mapIssuesToValidationResult(issues: ZodIssue[]): ValidationResult {
  const errors = issues.map(issue => {
    const path = issue.path.join('.') || issue.path[0]?.toString() || '';
    const code = issue.message; // usiamo il messaggio come codice univoco
    const message = humanReadable(issue.message, path);
    return { field: path, message, code };
  });
  return { isValid: errors.length === 0, errors };
}

function humanReadable(code: string, field: string): string {
  const messages: Record<string, string> = {
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Invalid email format',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
    PASSWORD_TOO_LONG: 'Password must not exceed 40 characters',
    PASSWORD_NO_UPPERCASE: 'Password must contain uppercase letter',
    PASSWORD_NO_LOWERCASE: 'Password must contain lowercase letter',
    PASSWORD_NO_DIGIT: 'Password must contain a digit',
    PASSWORD_NO_SPECIAL: 'Password must contain a special character',
    FISCAL_ID_REQUIRED: 'Fiscal ID is required',
    FISCAL_ID_INVALID: 'Fiscal ID must be exactly 11 digits',
    ZIP_CODE_REQUIRED: 'ZIP code is required',
    ZIP_CODE_INVALID: 'ZIP code must be 5 digits',
    PROVINCE_REQUIRED: 'Province code is required',
    PROVINCE_INVALID: 'Province code must be 2 letters',
    STREET_ADDRESS_REQUIRED: 'Street address is required',
    CITY_REQUIRED: 'City is required',
    QUANTITY_REQUIRED: 'Quantity is required',
    QUANTITY_INVALID_FORMAT: 'Quantity must be format X.XX',
    DESCRIPTION_REQUIRED: 'Description is required',
    DESCRIPTION_TOO_LONG: 'Description must not exceed 1000 characters',
    UNIT_PRICE_REQUIRED: 'Unit price is required',
    UNIT_PRICE_INVALID_FORMAT: 'Unit price invalid format',
  };
  return messages[code] || `${field || 'Field'} invalid`;
}

// SCHEMI Zod con message come codice
const emailSchema = z.string({ error: 'EMAIL_REQUIRED' })
  .email({ message: 'EMAIL_INVALID' });

const passwordSchema = z.string({ error: 'PASSWORD_REQUIRED' })
  .min(8, { error: 'PASSWORD_TOO_SHORT' })
  .max(40, { error: 'PASSWORD_TOO_LONG' })
  .refine(p => /[A-Z]/.test(p), { error: 'PASSWORD_NO_UPPERCASE' })
  .refine(p => /[a-z]/.test(p), { error: 'PASSWORD_NO_LOWERCASE' })
  .refine(p => /[0-9]/.test(p), { error: 'PASSWORD_NO_DIGIT' })
  .refine(p => /[!@#$%^&*]/.test(p), { error: 'PASSWORD_NO_SPECIAL' });

const fiscalIdSchema = z.string({ error: 'FISCAL_ID_REQUIRED' })
  .regex(/^\d{11}$/, { error: 'FISCAL_ID_INVALID' });

const zipSchema = z.string({ error: 'ZIP_CODE_REQUIRED' })
  .regex(/^\d{5}$/, { error: 'ZIP_CODE_INVALID' });

const provinceSchema = z.string({ error: 'PROVINCE_REQUIRED' })
  .regex(/^[A-Z]{2}$/, { error: 'PROVINCE_INVALID' });

const addressSchema = z.object({
  street_address: z.string({ error: 'STREET_ADDRESS_REQUIRED' }).min(1, { error: 'STREET_ADDRESS_REQUIRED' }),
  city: z.string({ error: 'CITY_REQUIRED' }).min(1, { error: 'CITY_REQUIRED' }),
  zip_code: zipSchema,
  province: provinceSchema
});

const receiptItemSchema = z.object({
  quantity: z.string({ error: 'QUANTITY_REQUIRED' }).min(1, { error: 'QUANTITY_REQUIRED' })
    .regex(/^\d+\.\d{2}$/, { error: 'QUANTITY_INVALID_FORMAT' }),
  description: z.string({ error: 'DESCRIPTION_REQUIRED' }).min(1, { error: 'DESCRIPTION_REQUIRED' })
    .max(1000, { error: 'DESCRIPTION_TOO_LONG' }),
  unit_price: z.string({ error: 'UNIT_PRICE_REQUIRED' }).min(1, { error: 'UNIT_PRICE_REQUIRED' })
    .regex(/^\d+(\.\d{1,8})?$/, { error: 'UNIT_PRICE_INVALID_FORMAT' }),
});

const moneyAmountSchema = (fieldName: string, required: boolean) => {
  const fname = fieldName.toUpperCase();
  return required
    ? z.string({ error: `${fname}_REQUIRED` }).min(1, { error: `${fname}_REQUIRED` })
        .regex(/^\d+(\.\d{2,8})?$/, { error: `${fname}_INVALID_FORMAT` })
    : z.string().optional().refine(v => v === undefined || v === '' || /^\d+(\.\d{2,8})?$/.test(v), {
        error: `${fname}_INVALID_FORMAT`
      });
};

// VALIDATORI
export function validateEmail(email: string): ValidationResult {
  const r = emailSchema.safeParse(email);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function validatePassword(password: string): ValidationResult {
  const r = passwordSchema.safeParse(password);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function validateFiscalId(fiscalId: string): ValidationResult {
  const r = fiscalIdSchema.safeParse(fiscalId);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function validateZipCode(zip: string): ValidationResult {
  const r = zipSchema.safeParse(zip);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function validateProvinceCode(province: string): ValidationResult {
  const r = provinceSchema.safeParse(province.toUpperCase());
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function validateAddress(address: {
  street_address: string;
  city: string;
  zip_code: string;
  province: string;
}): ValidationResult {
  const r = addressSchema.safeParse(address);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function validateReceiptItem(item: {
  quantity: string;
  description: string;
  unit_price: string;
}): ValidationResult {
  const r = receiptItemSchema.safeParse(item);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function validateMoneyAmount(
  amount: string,
  fieldName: string,
  required = false
): ValidationResult {
  const schema = moneyAmountSchema(fieldName, required);
  const r = schema.safeParse(amount);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}

export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  return { isValid: allErrors.length === 0, errors: allErrors };
}

export function validateRequired(value: unknown, _fieldName: string): ValidationResult {
  const schema = z.any().refine(v => v !== null && v !== undefined && v !== '', {
    error: 'FIELD_REQUIRED'
  });
  const r = schema.safeParse(value);
  return r.success ? { isValid: true, errors: [] } : mapIssuesToValidationResult(r.error.issues);
}