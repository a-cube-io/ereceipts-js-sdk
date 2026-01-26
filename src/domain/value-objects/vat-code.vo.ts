export type GoodOrService = 'goods' | 'service';

export type VatRateCode =
  | '4.00'
  | '5.00'
  | '10.00'
  | '22.00'
  | '2.00'
  | '6.40'
  | '7.00'
  | '7.30'
  | '7.50'
  | '7.65'
  | '7.95'
  | '8.30'
  | '8.50'
  | '8.80'
  | '9.50'
  | '12.30'
  | 'N1'
  | 'N2'
  | 'N3'
  | 'N4'
  | 'N5'
  | 'N6';

export const VAT_RATE_CODES: VatRateCode[] = [
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
];

export const STANDARD_VAT_RATES: VatRateCode[] = ['4.00', '5.00', '10.00', '22.00'];
export const EXEMPT_VAT_CODES: VatRateCode[] = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
