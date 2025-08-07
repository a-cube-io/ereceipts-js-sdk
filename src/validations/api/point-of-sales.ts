import { z } from 'zod';

// Enum options arrays
export const PEM_STATUS_OPTIONS = ['NEW', 'REGISTERED', 'ACTIVE', 'ONLINE', 'OFFLINE', 'DISCARDED'] as const;

// Address Schema (reusable)
export const AddressSchema = z.object({
  street_address: z.string().min(1, { message: 'fieldIsRequired' }),
  zip_code: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .regex(/^\d{5}$/, { message: 'invalidZipCode' }),
  city: z.string().min(1, { message: 'fieldIsRequired' }),
  province: z
    .string()
    .min(2, { message: 'provinceMinLength' })
    .max(2, { message: 'provinceMaxLength' })
    .toUpperCase(),
});

// PEM Status Schema
export const PEMStatusSchema = z.enum(PEM_STATUS_OPTIONS);

// Activation Request Schema
export const ActivationRequestSchema = z.object({
  registration_key: z.string().min(1, { message: 'fieldIsRequired' }),
});

// PEM Status Offline Request Schema
export const PEMStatusOfflineRequestSchema = z.object({
  timestamp: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'invalidDateFormat'
    }),
  reason: z.string().min(1, { message: 'fieldIsRequired' }),
});

// Type exports
export type AddressType = z.infer<typeof AddressSchema>;
export type PEMStatusType = z.infer<typeof PEMStatusSchema>;
export type ActivationRequestType = z.infer<typeof ActivationRequestSchema>;
export type PEMStatusOfflineRequestType = z.infer<typeof PEMStatusOfflineRequestSchema>;