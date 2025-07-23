// Generated types from OpenAPI specification
// This file is auto-generated. Do not edit manually.

export interface components {
  schemas: {
    // E-Receipt IT API Types
    'E-Receipt_IT_API_ActivationRequest': {
      registration_key: string;
    };

    'E-Receipt_IT_API_Address': {
      street_address: string;
      zip_code: string;
      city: string;
      province: string;
    };

    'E-Receipt_IT_API_CashRegisterBasicOutput': {
      id: string;
      pem_serial_number: string;
      name: string;
    };

    'E-Receipt_IT_API_CashRegisterCreate': {
      pem_serial_number: string;
      name: string;
    };

    'E-Receipt_IT_API_CashRegisterDetailedOutput': {
      id: string;
      pem_serial_number: string;
      name: string;
      mtls_certificate: string;
    };

    'E-Receipt_IT_API_CashierCreateInput': {
      email: string;
      password: string;
    };

    'E-Receipt_IT_API_CashierOutput': {
      id: number;
      email: string;
    };

    'E-Receipt_IT_API_PEMPublic': {
      serial_number: string;
      status: 'NEW' | 'REGISTERED' | 'ACTIVE' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
      address: components['schemas']['E-Receipt_IT_API_Address'];
    };

    'E-Receipt_IT_API_ReceiptInput': {
      items: components['schemas']['E-Receipt_IT_API_ReceiptItem'][];
      customer_tax_code?: string | null;
      customer_lottery_code?: string | null;
      discount?: string;
      invoice_issuing?: boolean;
      uncollected_dcr_to_ssn?: boolean;
      services_uncollected_amount?: string;
      goods_uncollected_amount?: string;
      cash_payment_amount?: string;
      electronic_payment_amount?: string;
      ticket_restaurant_payment_amount?: string;
      ticket_restaurant_quantity?: number;
    };

    'E-Receipt_IT_API_ReceiptItem': {
      good_or_service?: 'B' | 'S';
      quantity: string;
      description: string;
      unit_price: string;
      vat_rate_code?: string | null;
      simplified_vat_allocation?: boolean;
      discount?: string;
      is_down_payment_or_voucher_redemption?: boolean;
      complimentary?: boolean;
    };

    'E-Receipt_IT_API_ReceiptOutput': {
      uuid: string;
      type: 'sale' | 'return' | 'void';
      customer_lottery_code?: string | null;
      created_at: string;
      total_amount: string;
      document_number?: string | null;
      document_datetime?: string | null;
    };

    'E-Receipt_IT_API_ReceiptDetailsOutput': {
      uuid: string;
      type: 'sale' | 'return' | 'void';
      customer_lottery_code?: string | null;
      created_at: string;
      total_amount: string;
      document_number?: string | null;
      document_datetime?: string | null;
      fiscal_id: string;
      total_taxable_amount: string;
      total_uncollected_amount: string;
      deductible_amount: string;
      total_vat_amount: string;
      total_discount: string;
      total_gross_discount: string;
      discount: string;
      items: components['schemas']['E-Receipt_IT_API_ReceiptItem'][];
    };

    // Merchant Platform Types
    'A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput': {
      fiscal_id: string;
      name: string;
      email: string;
      password: string;
      address?: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address'];
    };

    'A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput': {
      uuid: string;
      fiscal_id: string;
      name: string;
      email: string;
      address?: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address'];
    };

    'A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput': {
      name: string;
      address?: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address'] | null;
    };

    'A-Cube_GOV-IT_PEL_Platform_Address': {
      street_address: string;
      zip_code: string;
      city: string;
      province: string;
    };

    // Error Types
    'E-Receipt_IT_API_ErrorModel403Forbidden': {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      instance?: string | null;
    };

    'E-Receipt_IT_API_ErrorModel404NotFound': {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      instance?: string | null;
    };

    'E-Receipt_IT_API_HTTPValidationError': {
      detail?: components['schemas']['E-Receipt_IT_API_ValidationError'][];
    };

    'E-Receipt_IT_API_ValidationError': {
      loc: (string | number)[];
      msg: string;
      type: string;
    };
  };
}

// Convenience type aliases
export type Address = components['schemas']['E-Receipt_IT_API_Address'];
export type MerchantCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput'];
export type MerchantOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput'];
export type MerchantUpdateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput'];
export type CashRegisterCreate = components['schemas']['E-Receipt_IT_API_CashRegisterCreate'];
export type CashRegisterOutput = components['schemas']['E-Receipt_IT_API_CashRegisterDetailedOutput'];
export type CashierCreateInput = components['schemas']['E-Receipt_IT_API_CashierCreateInput'];
export type CashierOutput = components['schemas']['E-Receipt_IT_API_CashierOutput'];
export type ReceiptInput = components['schemas']['E-Receipt_IT_API_ReceiptInput'];
export type ReceiptOutput = components['schemas']['E-Receipt_IT_API_ReceiptOutput'];
export type ReceiptDetailsOutput = components['schemas']['E-Receipt_IT_API_ReceiptDetailsOutput'];
export type ReceiptItem = components['schemas']['E-Receipt_IT_API_ReceiptItem'];
export type PEMPublic = components['schemas']['E-Receipt_IT_API_PEMPublic'];
export type PEMStatus = 'NEW' | 'REGISTERED' | 'ACTIVE' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
export type ReceiptType = 'sale' | 'return' | 'void';
export type GoodOrService = 'B' | 'S';

// API Response wrapper types
export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

export interface PaginatedResponse<T> {
  members: T[];
  total?: number | null;
  page?: number | null;
  size?: number | null;
  pages?: number | null;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
}