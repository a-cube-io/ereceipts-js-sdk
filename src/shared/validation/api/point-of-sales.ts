import * as z from 'zod';

// Enum options arrays
export const PEM_STATUS_OPTIONS = [
  'NEW',
  'REGISTERED',
  'ACTIVATED',
  'ONLINE',
  'OFFLINE',
  'DISCARDED',
] as const;

// Address Schema (reusable)
export const AddressSchema = z.object({
  street_address: z.string().min(1, { error: 'fieldIsRequired' }),
  street_number: z.string().min(1, { error: 'fieldIsRequired' }),
  zip_code: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .regex(/^\d{5}$/, { error: 'invalidZipCode' }),
  city: z.string().min(1, { error: 'fieldIsRequired' }),
  province: z
    .string()
    .min(2, { error: 'provinceMinLength' })
    .max(2, { error: 'provinceMaxLength' })
    .toUpperCase(),
});

// PEM Status Schema
export const PEMStatusSchema = z.enum(PEM_STATUS_OPTIONS);

// Activation Request Schema
export const ActivationRequestSchema = z.object({
  registration_key: z.string().min(1, { error: 'fieldIsRequired' }),
});

// PEM Status Offline Request Schema
export const PEMStatusOfflineRequestSchema = z.object({
  timestamp: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .refine((val) => !isNaN(Date.parse(val)), {
      error: 'invalidDateFormat',
    }),
  reason: z.string().min(1, { error: 'fieldIsRequired' }),
});

// Type exports
export type AddressType = z.infer<typeof AddressSchema>;
export type PEMStatusType = z.infer<typeof PEMStatusSchema>;
export type ActivationRequestType = z.infer<typeof ActivationRequestSchema>;
export type PEMStatusOfflineRequestType = z.infer<typeof PEMStatusOfflineRequestSchema>;
