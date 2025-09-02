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

// Cashier types (MF1)
export interface CashierCreateInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface CashierOutput {
  uuid: string;
  merchant_uuid: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface CashierSimpleOutput {
  uuid: string;
  first_name: string;
  last_name: string;
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
export type GoodOrService = 'B' | 'S';
export type VatRateCode = '4' | '5' | '10' | '22' | '2' | '6.4' | '7' | '7.3' | '7.5' | '7.65' | '7.95' | '8.3' | '8.5' | '8.8' | '9.5' | '12.3' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6';

export const VatRateCodeOptions: VatRateCode[] = [
  '4', '5', '10', '22', '2', '6.4', '7', '7.3', '7.5', '7.65', '7.95', '8.3', '8.5', '8.8', '9.5', '12.3', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6'
]

export interface ReceiptItem {
  good_or_service?: GoodOrService;
  quantity: string;
  description: string;
  unit_price: string;
  vat_rate_code?: VatRateCode;
  simplified_vat_allocation?: boolean;
  discount?: string;
  is_down_payment_or_voucher_redemption?: boolean;
  complimentary?: boolean;
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
  customer_lottery_code?: string;
  created_at: string;
  total_amount: string;
  document_number: string;
  document_datetime?: string;
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
  items?: ReceiptItem[];
}

export interface ReceiptReturnOrVoidViaPEMInput {
  pem_id?: string;
  items: ReceiptItem[];
  document_number: string;
  document_date?: string;
  lottery_code?: string;
}

export type ReceiptProofType = 'POS' | 'VR' | 'ND';


export interface ReceiptListParams { page?: number; size?: number }
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
  id: string;
  pem_serial_number: string;
  name: string;
}

export interface CashRegisterDetailedOutput {
  id: string;
  pem_serial_number: string;
  name: string;
  mtls_certificate: string;
  private_key: string;
}

export interface CashRegisterListParams { 
  page?: number; 
  size?: number; 
  pem_id?: string; 
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
  external_pem_data?: PemData;
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

export interface JournalCloseInput {
  closing_timestamp: string;
  reason?: string;
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