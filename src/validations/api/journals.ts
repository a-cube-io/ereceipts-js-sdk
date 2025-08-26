import * as z from "zod";

// Journal Close Input Schema
export const JournalCloseInputSchema = z.object({
  closing_timestamp: z
    .string()
    .min(1, { error: 'fieldIsRequired' })
    .refine((val) => !isNaN(Date.parse(val)), {
      error: 'invalidDateFormat'
    }),
  reason: z
    .string()
    .max(255, { error: 'reasonMaxLength' })
    .optional(),
});

// Type exports
export type JournalCloseInputType = z.infer<typeof JournalCloseInputSchema>;