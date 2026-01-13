import * as z from 'zod';

export const NotificationScopeSchema = z.object({
  type: z.literal('global'),
});

export const PemStatusSchema = z.enum(['ONLINE', 'OFFLINE']);

export const NotificationDataBlockAtSchema = z.object({
  block_at: z.string(),
});

export const NotificationDataPemStatusSchema = z.object({
  from: PemStatusSchema,
  to: PemStatusSchema,
});

const NotificationBaseSchema = z.object({
  uuid: z.string().uuid({ error: 'invalidUuid' }),
  scope: NotificationScopeSchema,
  source: z.enum(['system', 'Italian Tax Authority']),
  level: z.enum(['info', 'warning', 'error', 'critical']),
  created_at: z.string(),
});

export const NotificationMf2UnreachableSchema = NotificationBaseSchema.extend({
  type: z.literal('INTERNAL_COMMUNICATION_FAILURE'),
  code: z.literal('SYS-W-01'),
  data: NotificationDataBlockAtSchema,
});

export const NotificationPemsBlockedSchema = NotificationBaseSchema.extend({
  type: z.literal('PEM_STATUS_CHANGED'),
  code: z.literal('SYS-C-01'),
  data: NotificationDataPemStatusSchema,
});

export const NotificationPemBackOnlineSchema = NotificationBaseSchema.extend({
  type: z.literal('PEM_STATUS_CHANGED'),
  code: z.literal('SYS-I-01'),
  data: NotificationDataPemStatusSchema,
});

export const NotificationSchema = z.discriminatedUnion('code', [
  NotificationMf2UnreachableSchema,
  NotificationPemsBlockedSchema,
  NotificationPemBackOnlineSchema,
]);

export const NotificationListResponseSchema = z.object({
  members: z.array(NotificationSchema),
});

export type NotificationSchemaType = z.infer<typeof NotificationSchema>;
export type NotificationListResponseSchemaType = z.infer<typeof NotificationListResponseSchema>;
