// Convenience types for E-Receipt IT API
// This file is auto-generated. Do not edit manually.
// Generated on: 2025-07-25T09:28:31.315Z
// OpenAPI Hash: 2be51c155bfaff04a1d114f2875cc9e18ba14949e780bf891800e9a68aff041f

import type { components } from "./types.generated";

// ===============================================
// MF1 API TYPES (E-Receipt Core Functionality)
// ===============================================

// Authentication & Cashier Management
export type CashierCreateInput =
  components["schemas"]["E-Receipt_IT_API_CashierCreateInput"];
export type CashierOutput =
  components["schemas"]["E-Receipt_IT_API_CashierOutput"];

// Point of Sale (PEM) Management
export type PointOfSaleOutput =
  components["schemas"]["E-Receipt_IT_API_PointOfSaleOutput"];
export type PointOfSaleDetailedOutput =
  components["schemas"]["E-Receipt_IT_API_PointOfSaleDetailedOutput"];
export type PEMPublic = PointOfSaleOutput;
export type PEMDetailed = PointOfSaleDetailedOutput;
export type PEMStatus = components["schemas"]["E-Receipt_IT_API_PEMStatus"];
export type PEMStatusOfflineRequest =
  components["schemas"]["E-Receipt_IT_API_PEMStatusOfflineRequest"];
export type ActivationRequest =
  components["schemas"]["E-Receipt_IT_API_ActivationRequest"];

// Cash Register Management
export type CashRegisterCreate =
  components["schemas"]["E-Receipt_IT_API_CashRegisterCreate"];
export type CashRegisterBasicOutput =
  components["schemas"]["E-Receipt_IT_API_CashRegisterBasicOutput"];
export type CashRegisterDetailedOutput =
  components["schemas"]["E-Receipt_IT_API_CashRegisterDetailedOutput"];
export type CashRegisterOutput = CashRegisterDetailedOutput;

// Receipt Management
export type ReceiptInput =
  components["schemas"]["E-Receipt_IT_API_ReceiptInput"];
export type ReceiptOutput =
  components["schemas"]["E-Receipt_IT_API_ReceiptOutput"];
export type ReceiptDetailsOutput =
  components["schemas"]["E-Receipt_IT_API_ReceiptDetailsOutput"];
export type ReceiptItem = components["schemas"]["E-Receipt_IT_API_ReceiptItem"];
export type ReceiptType = components["schemas"]["E-Receipt_IT_API_ReceiptType"];
export type ReceiptProofType =
  components["schemas"]["E-Receipt_IT_API_ReceiptProofType"];
export type ReceiptReturnOrVoidViaPEMInput =
  components["schemas"]["E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput"];
export type ReceiptReturnOrVoidWithProofInput =
  components["schemas"]["E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput"];

// Core Business Types
export type Address = components["schemas"]["E-Receipt_IT_API_Address"];
export type GoodOrService =
  components["schemas"]["E-Receipt_IT_API_GoodOrService"];
export type VatRateCode = components["schemas"]["E-Receipt_IT_API_VatRateCode"];

// ===============================================
// MF2 API TYPES (Merchant Platform)
// ===============================================

// Merchant Management
export type MerchantAddress =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Address"];
export type MerchantCreateInput =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput"];
export type MerchantOutput =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput"];
export type MerchantUpdateInput =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput"];

// PEM (Point of Electronic Money) Management
export type PemCreateInput =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateInput"];
export type PemCreateOutput =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateOutput"];
export type PemCertificatesOutput =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Pem.PemCertificatesOutput"];
export type PemData =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_PemData"];

// ===============================================
// ERROR HANDLING TYPES
// ===============================================

// MF1 Error Types
export type ErrorModel400BadRequest =
  components["schemas"]["E-Receipt_IT_API_ErrorModel400BadRequest"];
export type ErrorModel401Unauthorized =
  components["schemas"]["E-Receipt_IT_API_ErrorModel401Unauthorized"];
export type ErrorModel403Forbidden =
  components["schemas"]["E-Receipt_IT_API_ErrorModel403Forbidden"];
export type ErrorModel404NotFound =
  components["schemas"]["E-Receipt_IT_API_ErrorModel404NotFound"];
export type HTTPValidationError =
  components["schemas"]["E-Receipt_IT_API_HTTPValidationError"];
export type ValidationError =
  components["schemas"]["E-Receipt_IT_API_ValidationError"];

// MF2 Error Types
export type ConstraintViolationJson =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_ConstraintViolation-json"];
export type PlatformError =
  components["schemas"]["A-Cube_GOV-IT_PEL_Platform_Error"];

// ===============================================
// PAGINATION & RESPONSE WRAPPERS
// ===============================================

// Paginated Response Types
export type PageCashierOutput =
  components["schemas"]["E-Receipt_IT_API_Page__T_Customized_CashierOutput_"];
export type PagePointOfSaleOutput =
  components["schemas"]["E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_"];
export type PageReceiptOutput =
  components["schemas"]["E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_"];
export type PageCashRegisterBasicOutput =
  components["schemas"]["E-Receipt_IT_API_Page__T_Customized_CashRegisterBasicOutput_"];

// Generic API Response Wrappers
export type ApiResponse<T> = {
  data: T;
  status: number;
  statusText: string;
};

export type PaginatedResponse<T> = {
  members: T[];
  total?: number | null;
  page?: number | null;
  size?: number | null;
  pages?: number | null;
};

// ===============================================
// AUTHENTICATION & SECURITY
// ===============================================

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthToken = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

export type JWTPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
};

// ===============================================
// UTILITY TYPES
// ===============================================

// Union types for easier usage
export type AnyErrorType =
  | ErrorModel400BadRequest
  | ErrorModel401Unauthorized
  | ErrorModel403Forbidden
  | ErrorModel404NotFound
  | HTTPValidationError
  | ConstraintViolationJson
  | PlatformError;

export type AnyPageType =
  | PageCashierOutput
  | PagePointOfSaleOutput
  | PageReceiptOutput
  | PageCashRegisterBasicOutput;

// Common field types
export type UUID = string;
export type Email = string;
export type DateTime = string;
export type Amount = string;
export type SerialNumber = string;
