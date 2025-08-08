import { z } from 'zod';

// Journal Close Input Schema
export const JournalCloseInputSchema = z.object({
  closing_timestamp: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'invalidDateFormat'
    }),
  reason: z
    .string()
    .max(255, { message: 'reasonMaxLength' })
    .optional(),
});

// Type exports
export type JournalCloseInputType = z.infer<typeof JournalCloseInputSchema>;