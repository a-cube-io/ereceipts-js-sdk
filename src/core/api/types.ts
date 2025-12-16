/**
 * Generated API types from OpenAPI spec
 */

// Base types
export interface Page<T> {
  members: T[];
  total?: number;
  page?: number;
  size?: number;
  pages?: number;
}

export interface LdJsonPage<T> {
  member: T[];
  totalItems?: number;
  view?: {
    '@id': string;
    type?: string;
    first?: string;
    last?: string;
    previous?: string;
    next?: string;
  };
}

// Cashier types (MF1)
export interface CashierCreateInput {
  email: string;
  password: string;
  name: string;
  display_name: string;
}

export interface CashierOutput {
  uuid: string;
  merchant_uuid: string;
  display_name: string;
  email: string;
  name: string;
}

export interface CashierListParams {
  page?: number;
  size?: number;
}

// Point of Sale types
export type PEMStatus = 'NEW' | 'REGISTERED' | 'ACTIVATED' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';

export interface Address {
  street_address: string;
  street_number: string;
  zip_code: string;
  city: string;
  province: string;
}

export type PointOfSaleMf2Type =  'AP' | 'SP' | 'TM' | 'PV'

export interface PointOfSaleOutputMf2 {
  id: string;
  status: PEMStatus;
  type: PointOfSaleMf2Type;
}

export interface PointOfSaleOutput {
  serial_number: string;
  status: PEMStatus;
  address: Address;
  operational_status: string;
}

export interface PointOfSaleListParams { 
  status?: PEMStatus; 
  page?: number; 
  size?: number;
}

export interface PointOfSaleDetailedOutput {
  serial_number: string;
  status: PEMStatus;
  address: Address;
  registration_key?: string;
  operational_status: string;
}

export interface ActivationRequest {
  registration_key: string;
}

export interface PEMStatusOfflineRequest {
  timestamp: string;
  reason: string;
}

export interface PointOfSaleUpdateInput {
  address?: Address;
}

// Receipt types
export type ReceiptType = 'sale' | 'return' | 'void';
export type GoodOrService = 'goods' | 'service';
export type VatRateCode = '4.00' | '5.00' | '10.00' | '22.00' | '2.00' | '6.40' | '7.00' | '7.30' | '7.50' | '7.65' | '7.95' | '8.30' | '8.50' | '8.80' | '9.50' | '12.30' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6';

export const VatRateCodeOptions: VatRateCode[] = [
  '4.00', '5.00', '10.00', '22.00', '2.00', '6.40', '7.00', '7.30', '7.50', '7.65', '7.95', '8.30', '8.50', '8.80', '9.50', '12.30', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6'
]

export interface ReceiptItem {
  type?: GoodOrService;
  quantity: string;
  description: string;
  unit_price: string;
  vat_rate_code?: VatRateCode;
  simplified_vat_allocation?: boolean;
  discount?: string;
  is_down_payment_or_voucher_redemption?: boolean;
  complimentary?: boolean;
}

export interface ReceiptReturnItem {
 id: number;
 quantity: string;
}

export interface ReceiptInput {
  items: ReceiptItem[];
  customer_tax_code?: string;
  customer_lottery_code?: string;
  discount?: string;
  invoice_issuing?: boolean;
  uncollected_dcr_to_ssn?: boolean;
  services_uncollected_amount?: string;
  goods_uncollected_amount?: string;
  cash_payment_amount?: string;
  electronic_payment_amount?: string;
  ticket_restaurant_payment_amount?: string;
  ticket_restaurant_quantity?: number;
}

export interface ReceiptOutput {
  uuid: string;
  type: ReceiptType;
  created_at: string;
  total_amount: string;
  document_number: string;
  document_datetime?: string;
  is_returnable: boolean;
  is_voidable: boolean;
  pdf_url?: string;
  parent_receipt_uuid?: string;
}

export interface ReceiptDetailsOutput {
  uuid: string;
  type: ReceiptType;
  customer_lottery_code?: string;
  created_at: string;
  total_amount: string;
  document_number?: string;
  document_datetime?: string;
  vat_number: string;
  total_taxable_amount: string;
  total_uncollected_amount: string;
  deductible_amount: string;
  total_vat_amount: string;
  total_discount: string;
  total_gross_discount: string;
  discount: string;
  is_returnable: boolean;
  is_voidable: boolean;
  pdf_url?: string;
  parent_receipt_uuid?: string;
  items?: ReceiptItem[];
}

export interface VoidReceiptInput {
  document_number: string;
}
export interface ReceiptReturnInput {
  items: ReceiptReturnItem[];
  document_number: string;
}

export interface ReturnableReceiptItem {
  id: number;
  type?: GoodOrService;
  quantity: string;
  returned_quantity: string;
  description: string;
  unit_price: string;
  vat_rate_code?: VatRateCode;
}

export interface ReceiptReturnOrVoidViaPEMInput {
  pos_id?: string;
  items: ReceiptItem[];
  document_number: string;
  document_datetime?: string;
  lottery_code?: string;
}

export type ReceiptProofType = 'POS' | 'VR' | 'ND';

export const RECEIPT_READY='ready';
export const RECEIPT_SENT='sent';
export type ReceiptStatus = typeof RECEIPT_READY | typeof RECEIPT_SENT;

export const RECEIPT_SORT_DESCENDING='descending';
export const RECEIPT_SORT_ASCENDING='ascending';
export type ReceiptSortOrder = typeof RECEIPT_SORT_DESCENDING | typeof RECEIPT_SORT_ASCENDING;

export interface ReceiptListParams {
  serial_number: string; // Path parameter for endpoint /mf1/point-of-sales/{serial_number}/receipts
  page?: number;
  size?: number;
  status?: ReceiptStatus;
  sort?: ReceiptSortOrder;
  document_number?: string;
  'document_datetime[before]'?: string;
  'document_datetime[after]'?: string | null;
}
export interface ReceiptReturnOrVoidWithProofInput {
  items: ReceiptItem[];
  proof: ReceiptProofType;
  document_datetime: string;
}

// Cash Register types
export interface CashRegisterCreate {
  pem_serial_number: string;
  name: string;
}

export interface CashRegisterBasicOutput {
  uuid: string;
  pem_serial_number: string;
  name: string;
}

export interface CashRegisterDetailedOutput {
  uuid: string;
  pem_serial_number: string;
  name: string;
  mtls_certificate: string;
  private_key: string;
}

export interface CashRegisterListParams { 
  page?: number; 
  size?: number; 
  serial_number?: string;
}

// Merchant types (MF2)
export interface MerchantOutput {
  uuid: string;
  vat_number: string;
  fiscal_code?: string | null;
  email: string;
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address?: Address;
}

export interface MerchantsParams {
  page?: number
}

export interface MerchantCreateInput {
  vat_number: string;
  fiscal_code?: string;
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  password: string;
  address?: Address;
}

export interface MerchantUpdateInput {
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address?: Address | null;
}

// PEM types (MF2)
export interface PemCreateInput {
  merchant_uuid: string;
  address?: Address;
  /* external_pem_data?: PemData; */
}

export interface PemData {
  version: string;
  type: PointOfSaleMf2Type;
}

export interface PemCreateOutput {
  serial_number: string;
  registration_key: string;
}

export interface PemCertificatesOutput {
  mtls_certificate: string;
  activation_xml_response?: string;
}

// Supplier types (MF2)
export interface SupplierOutput {
  uuid: string;
  fiscal_id: string;
  name: string;
  address?: Address;
}

export interface SuppliersParams {
  page?: number;
}

export interface SupplierCreateInput {
  fiscal_id: string;
  name: string;
  address?: Address;
}

export interface SupplierUpdateInput {
  name: string;
  address?: Address;
}

// Daily Reports types (MF2)
export interface DailyReportOutput {
  uuid: string;
  pem_serial_number: string;
  date: string;
  total_receipts: number;
  total_amount: string;
  status: 'pending' | 'sent' | 'error';
}

export interface DailyReportsParams {
  pem_serial_number?: string;
  date_from?: string;
  date_to?: string;
  status?: 'pending' | 'sent' | 'error';
  page?: number;
}

// Journal types (MF2)
export interface JournalOutput {
  uuid: string;
  pem_serial_number: string;
  date: string;
  sequence_number: number;
  total_receipts: number;
  total_amount: string;
  status: 'open' | 'closed';
}

export interface JournalsParams {
  pem_serial_number?: string;
  status?: 'open' | 'closed';
  date_from?: string;
  date_to?: string;
  page?: number;
}

// Error types
export interface ErrorModel {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}