import { z } from 'zod';
import { AddressSchema } from './point-of-sales';

// Italian Fiscal ID validation regex (Codice Fiscale for individuals or Partita IVA for companies)
const FISCAL_ID_REGEX = /^([A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]|[0-9]{11})$/;

// Supplier Create Input Schema
export const SupplierCreateInputSchema = z.object({
  fiscal_id: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .regex(FISCAL_ID_REGEX, { message: 'invalidFiscalId' })
    .toUpperCase(),
  name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(200, { message: 'nameMaxLength' }),
  address: AddressSchema.optional(),
});

// Supplier Update Input Schema
export const SupplierUpdateInputSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(200, { message: 'nameMaxLength' }),
  address: AddressSchema.optional(),
});

// Type exports
export type SupplierCreateInputType = z.infer<typeof SupplierCreateInputSchema>;
export type SupplierUpdateInputType = z.infer<typeof SupplierUpdateInputSchema>;