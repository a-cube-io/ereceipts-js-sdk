import { z } from 'zod';

// Cashier Create Input Schema
export const CashierCreateInputSchema = z.object({
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
});

// Type exports
export type CashierCreateInputType = z.infer<typeof CashierCreateInputSchema>;