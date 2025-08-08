import { z } from 'zod';

// Daily Report Status Options
export const DAILY_REPORT_STATUS_OPTIONS = ['pending', 'sent', 'error'] as const;

// Daily Report Status Schema
export const DailyReportStatusSchema = z.enum(DAILY_REPORT_STATUS_OPTIONS, {
  message: 'invalidDailyReportStatus'
});

// Daily Reports List Parameters Schema
export const DailyReportsParamsSchema = z.object({
  pem_serial_number: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .optional(),
  date_from: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'invalidDateFormat'
    })
    .optional(),
  date_to: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'invalidDateFormat'
    })
    .optional(),
  status: DailyReportStatusSchema.optional(),
  page: z
    .number()
    .min(1, { message: 'pageMinValue' })
    .optional(),
});

// Type exports
export type DailyReportStatusType = z.infer<typeof DailyReportStatusSchema>;
export type DailyReportsParamsType = z.infer<typeof DailyReportsParamsSchema>;