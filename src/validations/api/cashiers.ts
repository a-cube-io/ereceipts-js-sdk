import { z } from 'zod';

// Cashier Create Input Schema
export const CashierCreateInputSchema = z.object({
  first_name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(50, { message: 'firstNameMaxLength' }),
  last_name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(50, { message: 'lastNameMaxLength' }),
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