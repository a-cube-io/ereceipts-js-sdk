import { z } from 'zod';

// Enum options arrays
export const VAT_RATE_CODE_OPTIONS = [
  '4', '5', '10', '22', '2', '6.4', '7', '7.3', '7.5', '7.65', '7.95', 
  '8.3', '8.5', '8.8', '9.5', '12.3', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6'
] as const;

export const GOOD_OR_SERVICE_OPTIONS = ['B', 'S'] as const;

export const RECEIPT_PROOF_TYPE_OPTIONS = ['POS', 'VR', 'ND'] as const;

// Enum types for receipt validation
export const VatRateCodeSchema = z.enum(VAT_RATE_CODE_OPTIONS);

export const GoodOrServiceSchema = z.enum(GOOD_OR_SERVICE_OPTIONS);

export const ReceiptProofTypeSchema = z.enum(RECEIPT_PROOF_TYPE_OPTIONS);

// Receipt Item Schema
export const ReceiptItemSchema = z.object({
  good_or_service: GoodOrServiceSchema.optional(),
  quantity: z.string().min(1, { message: 'fieldIsRequired' }),
  description: z.string().min(1, { message: 'fieldIsRequired' }),
  unit_price: z.string().min(1, { message: 'fieldIsRequired' }),
  vat_rate_code: VatRateCodeSchema.optional(),
  simplified_vat_allocation: z.boolean().optional(),
  discount: z.string().nullable().optional(),
  is_down_payment_or_voucher_redemption: z.boolean().optional(),
  complimentary: z.boolean().optional(),
});

// Main Receipt Input Schema
export const ReceiptInputSchema = z.object({
  items: z.array(ReceiptItemSchema).min(1, { message: 'arrayMin1' }),
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
}).refine((data) => {
  // At least one payment method should be provided
  const hasCashPayment = data.cash_payment_amount && parseFloat(data.cash_payment_amount) > 0;
  const hasElectronicPayment = data.electronic_payment_amount && parseFloat(data.electronic_payment_amount) > 0;
  const hasTicketPayment = data.ticket_restaurant_payment_amount && parseFloat(data.ticket_restaurant_payment_amount) > 0;
  
  return hasCashPayment || hasElectronicPayment || hasTicketPayment;
}, {
  message: 'At least one payment method is required',
  path: ['payment_methods']
});

// Receipt Return or Void via PEM Schema
export const ReceiptReturnOrVoidViaPEMInputSchema = z.object({
  pem_id: z.string().optional(),
  items: z.array(ReceiptItemSchema).min(1, { message: 'arrayMin1' }),
  document_number: z.string().min(1, { message: 'fieldIsRequired' }),
  document_date: z.string().optional(),
  lottery_code: z.string().optional(),
});

// Receipt Return or Void with Proof Schema
export const ReceiptReturnOrVoidWithProofInputSchema = z.object({
  items: z.array(ReceiptItemSchema).min(1, { message: 'arrayMin1' }),
  proof: ReceiptProofTypeSchema,
  document_datetime: z.string().min(1, { message: 'fieldIsRequired' }),
});

// Type exports
export type ReceiptItemType = z.infer<typeof ReceiptItemSchema>;
export type ReceiptInputType = z.infer<typeof ReceiptInputSchema>;
export type ReceiptReturnOrVoidViaPEMInputType = z.infer<typeof ReceiptReturnOrVoidViaPEMInputSchema>;
export type ReceiptReturnOrVoidWithProofInputType = z.infer<typeof ReceiptReturnOrVoidWithProofInputSchema>;
export type VatRateCodeType = z.infer<typeof VatRateCodeSchema>;
export type GoodOrServiceType = z.infer<typeof GoodOrServiceSchema>;
export type ReceiptProofTypeType = z.infer<typeof ReceiptProofTypeSchema>;