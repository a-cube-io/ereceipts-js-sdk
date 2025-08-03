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

// Cashier types
export interface CashierCreateInput {
  email: string;
  password: string;
}

export interface CashierOutput {
  id: number;
  email: string;
}

// Point of Sale types
export type PEMStatus = 'NEW' | 'REGISTERED' | 'ACTIVE' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';

export interface Address {
  street_address: string;
  zip_code: string;
  city: string;
  province: string;
}

export interface PointOfSaleOutput {
  serial_number: string;
  status: PEMStatus;
  address: Address;
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

// Receipt types
export type ReceiptType = 'sale' | 'return' | 'void';
export type GoodOrService = 'B' | 'S';
export type VatRateCode = '4' | '5' | '10' | '22' | '2' | '6.4' | '7' | '7.3' | '7.5' | '7.65' | '7.95' | '8.3' | '8.5' | '8.8' | '9.5' | '12.3' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6';

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
  document_number?: string;
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
  fiscal_id: string;
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

// Merchant types (MF2)
export interface MerchantOutput {
  uuid: string;
  fiscal_id: string;
  name: string;
  email: string;
  address?: Address;
}

export interface MerchantCreateInput {
  fiscal_id: string;
  name: string;
  email: string;
  password: string;
  address?: Address;
}

export interface MerchantUpdateInput {
  name: string;
  address?: Address;
}

// PEM types (MF2)
export interface PemCreateInput {
  merchant_uuid: string;
  address?: Address;
  external_pem_data?: PemData;
}

export interface PemData {
  version: string;
  type: 'AP' | 'SP' | 'TM' | 'PV';
}

export interface PemCreateOutput {
  serial_number: string;
  registration_key: string;
}

export interface PemCertificatesOutput {
  mtls_certificate: string;
  activation_xml_response?: string;
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