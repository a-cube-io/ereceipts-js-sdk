import * as z from "zod";

// Cashier Create Input Schema (MF1)
export const CashierCreateInputSchema = z.object({
  email: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .max(255, { error: 'emailMaxLength' })
    .email({ error: 'invalidEmail' }),
  password: z
    .string()
    .min(8, { error: 'passwordMinLength' })
    .max(40, { error: 'passwordMaxLength' }),
  name: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .max(255, { error: 'nameMaxLength' }),
});

// Type exports
export type CashierCreateInputType = z.infer<typeof CashierCreateInputSchema>;