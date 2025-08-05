import { z } from 'zod';

// Cash Register Create Schema
export const CashRegisterCreateSchema = z.object({
  pem_serial_number: z.string().min(1, { message: 'fieldIsRequired' }),
  name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(100, { message: 'nameMaxLength' }),
});

// Type exports
export type CashRegisterCreateType = z.infer<typeof CashRegisterCreateSchema>;