import { z } from 'zod';
import { AddressSchema } from './point-of-sales';

// Enum options arrays
export const PEM_TYPE_OPTIONS = ['AP', 'SP', 'TM', 'PV'] as const;

// PEM Data Schema
export const PemDataSchema = z.object({
  version: z.string().min(1, { message: 'fieldIsRequired' }),
  type: z.enum(PEM_TYPE_OPTIONS, { 
    message: 'invalidPemType'
  }),
});

// PEM Create Input Schema
export const PemCreateInputSchema = z.object({
  merchant_uuid: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .uuid({ message: 'invalidUuid' }),
  address: AddressSchema.optional(),
  external_pem_data: PemDataSchema.optional(),
});

// Type exports
export type PemDataType = z.infer<typeof PemDataSchema>;
export type PemCreateInputType = z.infer<typeof PemCreateInputSchema>;