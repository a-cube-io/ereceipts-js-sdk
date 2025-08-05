import { z } from 'zod';
import { AddressSchema } from './point-of-sales';

// Italian Fiscal ID validation regex (Codice Fiscale for individuals or Partita IVA for companies)
const FISCAL_ID_REGEX = /^([A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]|[0-9]{11})$/;

// Merchant Create Input Schema
export const MerchantCreateInputSchema = z.object({
  fiscal_id: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .regex(FISCAL_ID_REGEX, { message: 'invalidFiscalId' })
    .toUpperCase(),
  name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(200, { message: 'nameMaxLength' }),
  email: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .email({ message: 'invalidEmail' }),
  password: z
    .string()
    .min(8, { message: 'passwordMinLength' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message: 'passwordComplexity'
    }),
  address: AddressSchema.optional(),
});

// Merchant Update Input Schema
export const MerchantUpdateInputSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(200, { message: 'nameMaxLength' }),
  address: AddressSchema.optional(),
});

// Type exports
export type MerchantCreateInputType = z.infer<typeof MerchantCreateInputSchema>;
export type MerchantUpdateInputType = z.infer<typeof MerchantUpdateInputSchema>;