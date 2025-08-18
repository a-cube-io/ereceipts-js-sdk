import * as z from "zod";
// Cashier Create Input Schema
export const CashierCreateInputSchema = z.object({
  first_name: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .max(50, { error: 'firstNameMaxLength' }),
  last_name: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .max(50, { error: 'lastNameMaxLength' }),
  email: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .email({ error: 'invalidEmail' }),
  password: z
    .string()
    .min(8, { error: 'passwordMinLength' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      error: 'passwordComplexity'
    }),
});

// Type exports
export type CashierCreateInputType = z.infer<typeof CashierCreateInputSchema>;