import * as z from 'zod';

// Cash Register Create Schema
export const CashRegisterCreateSchema = z.object({
  pem_serial_number: z.string().min(1, { error: 'fieldIsRequired' }),
  name: z.string().min(1, { error: 'fieldIsRequired' }).max(100, { error: 'nameMaxLength' }),
});

// Type exports
export type CashRegisterCreateType = z.infer<typeof CashRegisterCreateSchema>;
