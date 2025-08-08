import { z } from 'zod';
import { AddressSchema } from './point-of-sales';

// VAT number validation regex (Partita IVA - 11 digits)
const VAT_NUMBER_REGEX = /^\d{11}$/;

// Fiscal code validation regex (Codice Fiscale - 11 digits only for merchants)
const FISCAL_CODE_REGEX = /^\d{11}$/;

// Password validation regex (from OpenAPI spec)
const PASSWORD_REGEX = /^((?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%\^&\*])(?=.{10,}).*)$/;

// Merchant Create Input Schema
export const MerchantCreateInputSchema = z.object({
  vat_number: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .regex(VAT_NUMBER_REGEX, { message: 'invalidVatNumber' }),
  fiscal_code: z
    .string()
    .regex(FISCAL_CODE_REGEX, { message: 'invalidFiscalCode' })
    .optional(),
  business_name: z
    .string()
    .max(200, { message: 'businessNameMaxLength' })
    .optional()
    .nullable(),
  first_name: z
    .string()
    .max(100, { message: 'firstNameMaxLength' })
    .optional()
    .nullable(),
  last_name: z
    .string()
    .max(100, { message: 'lastNameMaxLength' })
    .optional()
    .nullable(),
  email: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .email({ message: 'invalidEmail' }),
  password: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .regex(PASSWORD_REGEX, { message: 'passwordComplexity' }),
  address: AddressSchema.optional(),
});

// Merchant Update Input Schema
export const MerchantUpdateInputSchema = z.object({
  business_name: z
    .string()
    .max(200, { message: 'businessNameMaxLength' })
    .optional()
    .nullable(),
  first_name: z
    .string()
    .max(100, { message: 'firstNameMaxLength' })
    .optional()
    .nullable(),
  last_name: z
    .string()
    .max(100, { message: 'lastNameMaxLength' })
    .optional()
    .nullable(),
  address: AddressSchema.optional().nullable(),
});

// Type exports
export type MerchantCreateInputType = z.infer<typeof MerchantCreateInputSchema>;
export type MerchantUpdateInputType = z.infer<typeof MerchantUpdateInputSchema>;