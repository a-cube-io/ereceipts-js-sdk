import * as z from 'zod';

export const TelemetryMerchantSchema = z.object({
  vat_number: z.string(),
  fiscal_code: z.string().nullable(),
  business_name: z.string(),
});

export const TelemetrySupplierSchema = z.object({
  vat_number: z.string(),
  fiscal_code: z.string().nullable(),
  business_name: z.string(),
});

export const TelemetrySoftwareVersionSchema = z.object({
  version: z.string(),
  swid: z.string(),
  installed_at: z.string(),
  status: z.enum(['active', 'inactive', 'archived']),
});

export const TelemetrySoftwareSchema = z.object({
  code: z.string(),
  name: z.string(),
  approval_reference: z.string(),
  version_info: TelemetrySoftwareVersionSchema,
});

export const PendingReceiptsSchema = z.object({
  count: z.number().int().nonnegative(),
  total_amount: z.string(),
});

export const TransmissionSchema = z.object({
  attempted_at: z.string(),
  outcome: z.enum(['success', 'failed', 'pending']),
});

export const MessageSchema = z.object({
  received_at: z.string(),
  content: z.string(),
});

export const LotterySecretRequestSchema = z.object({
  requested_at: z.string(),
  outcome: z.enum(['success', 'failed', 'pending']),
});

export const LotterySchema = z.object({
  last_transmission: TransmissionSchema,
  secret_request: LotterySecretRequestSchema,
});

export const TelemetrySchema = z.object({
  pem_id: z.string(),
  pem_status: z.enum(['ONLINE', 'OFFLINE', 'ERROR']),
  pem_status_changed_at: z.string(),
  merchant: TelemetryMerchantSchema,
  supplier: TelemetrySupplierSchema,
  software: TelemetrySoftwareSchema,
  last_communication_at: z.string(),
  pending_receipts: PendingReceiptsSchema,
  last_receipt_transmission: TransmissionSchema,
  last_message_from_mf2: MessageSchema,
  ade_corrispettivi_transmission: TransmissionSchema,
  last_message_from_ade: MessageSchema,
  lottery: LotterySchema,
});

export type TelemetrySchemaType = z.infer<typeof TelemetrySchema>;
