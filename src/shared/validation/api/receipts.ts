import * as z from 'zod';

// Enum options arrays (used by consumers for dropdowns and form validation)
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

// Enum schemas (used by consumers as building blocks for their own form schemas)
export const VatRateCodeSchema = z.enum(VAT_RATE_CODE_OPTIONS);
export const GoodOrServiceSchema = z.enum(GOOD_OR_SERVICE_OPTIONS);
export const ReceiptProofTypeSchema = z.enum(RECEIPT_PROOF_TYPE_OPTIONS);

// Type exports
export type VatRateCodeType = z.infer<typeof VatRateCodeSchema>;
export type GoodOrServiceType = z.infer<typeof GoodOrServiceSchema>;
export type ReceiptProofTypeType = z.infer<typeof ReceiptProofTypeSchema>;
