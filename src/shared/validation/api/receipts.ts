import * as z from 'zod';

// Enum options arrays
export const VAT_RATE_CODE_OPTIONS = [
  '4.00',
  '5.00',
  '10.00',
  '22.00',
  '2.00',
  '6.40',
  '7.00',
  '7.30',
  '7.50',
  '7.65',
  '7.95',
  '8.30',
  '8.50',
  '8.80',
  '9.50',
  '12.30',
  'N1',
  'N2',
  'N3',
  'N4',
  'N5',
  'N6',
] as const;

export const GOOD_OR_SERVICE_OPTIONS = ['goods', 'service'] as const;

export const RECEIPT_PROOF_TYPE_OPTIONS = ['POS', 'VR', 'ND'] as const;

// Enum types for receipt validation
export const VatRateCodeSchema = z.enum(VAT_RATE_CODE_OPTIONS);

export const GoodOrServiceSchema = z.enum(GOOD_OR_SERVICE_OPTIONS);

export const ReceiptProofTypeSchema = z.enum(RECEIPT_PROOF_TYPE_OPTIONS);

// Receipt Item Schema
export const ReceiptItemSchema = z.object({
  type: GoodOrServiceSchema.optional(),
  quantity: z.string().min(1, { error: 'fieldIsRequired' }),
  description: z.string().min(1, { error: 'fieldIsRequired' }),
  unit_price: z.string().min(1, { error: 'fieldIsRequired' }),
  vat_rate_code: VatRateCodeSchema.optional(),
  simplified_vat_allocation: z.boolean().optional(),
  discount: z.string().nullable().optional(),
  is_down_payment_or_voucher_redemption: z.boolean().optional(),
  complimentary: z.boolean().optional(),
});

// Main Receipt Input Schema
export const ReceiptInputSchema = z
  .object({
    items: z.array(ReceiptItemSchema).min(1, { error: 'arrayMin1' }),
    customer_tax_code: z.string().optional(),
    customer_lottery_code: z.string().optional(),
    discount: z.string().nullable().optional(),
    invoice_issuing: z.boolean().optional(),
    uncollected_dcr_to_ssn: z.boolean().optional(),
    services_uncollected_amount: z.string().nullable().optional(),
    goods_uncollected_amount: z.string().nullable().optional(),
    cash_payment_amount: z.string().nullable().optional(),
    electronic_payment_amount: z.string().nullable().optional(),
    ticket_restaurant_payment_amount: z.string().nullable().optional(),
    ticket_restaurant_quantity: z.number().optional(),
  })
  .refine(
    (data) => {
      // At least one payment method should be provided
      const hasCashPayment = data.cash_payment_amount && parseFloat(data.cash_payment_amount) > 0;
      const hasElectronicPayment =
        data.electronic_payment_amount && parseFloat(data.electronic_payment_amount) > 0;
      const hasTicketPayment =
        data.ticket_restaurant_payment_amount &&
        parseFloat(data.ticket_restaurant_payment_amount) > 0;

      return hasCashPayment || hasElectronicPayment || hasTicketPayment;
    },
    {
      error: 'At least one payment method is required',
      path: ['payment_methods'],
    }
  )
  .refine(
    (data) => {
      // only one between customer_tax_code and customer_lottery_code can be provided
      return !data.customer_tax_code || !data.customer_lottery_code;
    },
    {
      error: 'Only one between customer_tax_code and customer_lottery_code can be provided',
      path: ['customer_tax_code', 'customer_lottery_code'],
    }
  );

// Receipt Return or Void via PEM Schema
export const ReceiptReturnOrVoidViaPEMInputSchema = z.object({
  device_id: z.string().optional(),
  items: z.array(ReceiptItemSchema).min(1, { error: 'arrayMin1' }),
  document_number: z.string().min(1, { error: 'fieldIsRequired' }),
  document_datetime: z.string().optional(),
  lottery_code: z.string().optional(),
});

// Receipt Return or Void with Proof Schema
export const ReceiptReturnOrVoidWithProofInputSchema = z.object({
  items: z.array(ReceiptItemSchema).min(1, { error: 'arrayMin1' }),
  proof: ReceiptProofTypeSchema,
  document_datetime: z.string().min(1, { error: 'fieldIsRequired' }),
});

// Void Receipt Schema
export const VoidReceiptInputSchema = z.object({
  document_number: z.string().min(1, { error: 'fieldIsRequired' }),
});

export const ReceiptReturnItemSchema = z
  .array(
    z.object({
      id: z.number(),
      quantity: z.string().min(1, { error: 'fieldIsRequired' }),
    })
  )
  .min(1, { error: 'arrayMin1' });

// Receipt Return Schema
export const ReceiptReturnInputSchema = z.object({
  items: z.array(ReceiptReturnItemSchema).min(1, { error: 'arrayMin1' }),
  document_number: z.string().min(1, { error: 'fieldIsRequired' }),
});

// Type exports
export type ReceiptItemType = z.infer<typeof ReceiptItemSchema>;
export type ReceiptInputType = z.infer<typeof ReceiptInputSchema>;
export type ReceiptReturnOrVoidViaPEMInputType = z.infer<
  typeof ReceiptReturnOrVoidViaPEMInputSchema
>;
export type ReceiptReturnOrVoidWithProofInputType = z.infer<
  typeof ReceiptReturnOrVoidWithProofInputSchema
>;
export type VatRateCodeType = z.infer<typeof VatRateCodeSchema>;
export type GoodOrServiceType = z.infer<typeof GoodOrServiceSchema>;
export type ReceiptProofTypeType = z.infer<typeof ReceiptProofTypeSchema>;
export type ReceiptReturnType = z.infer<typeof ReceiptReturnInputSchema>;
export type ReceiptReturnItemType = z.infer<typeof ReceiptReturnItemSchema>;
export type VoidReceiptInputType = z.infer<typeof VoidReceiptInputSchema>;
