#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const OPENAPI_FILE = 'openapi.yaml';
const RAW_TYPES_FILE = 'src/api/types.generated.ts';
const CONVENIENCE_TYPES_FILE = 'src/api/types.convenience.ts';
const TEMP_FILE = 'src/api/types.generated.temp.ts';
const VERSION_FILE = 'src/api/.types-version.json';

console.log('🚀 Generating TypeScript types from OpenAPI specification...');

// Function to calculate file hash for versioning
function calculateFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

// Function to read version info
function readVersionInfo() {
  try {
    return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  } catch (error) {
    return null;
  }
}

// Function to write version info
function writeVersionInfo(versionInfo) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2), 'utf8');
}

// Check if regeneration is needed
const currentOpenApiHash = calculateFileHash(OPENAPI_FILE);
const versionInfo = readVersionInfo();

if (versionInfo && versionInfo.openApiHash === currentOpenApiHash) {
  console.log('📋 OpenAPI specification unchanged, skipping type generation');
  console.log('✅ Types are up to date!');
  process.exit(0);
}

console.log('📝 OpenAPI specification changed or no version info found, regenerating types...');

try {
  // Step 1: Generate raw types using openapi-typescript
  console.log('📄 Running openapi-typescript...');
  execSync(`npx openapi-typescript ${OPENAPI_FILE} --output ${TEMP_FILE}`, { stdio: 'inherit' });

  // Step 2: Read the generated file
  console.log('📖 Reading generated types...');
  let rawContent = fs.readFileSync(TEMP_FILE, 'utf8');

  // Step 3: Transform interfaces to types for raw types file
  console.log('🔄 Converting interfaces to types...');
  
  // Replace interface declarations with type declarations
  rawContent = rawContent.replace(/^(\s*)export interface (\w+)\s*{/gm, '$1export type $2 = {');
  rawContent = rawContent.replace(/^(\s*)interface (\w+)\s*{/gm, '$1type $2 = {');
  
  // Step 4: Add headers
  const timestamp = new Date().toISOString();
  const rawHeader = `// Generated raw types from OpenAPI specification
// This file is auto-generated. Do not edit manually.
// Generated on: ${timestamp}
// OpenAPI Hash: ${currentOpenApiHash}

`;
  
  const convenienceHeader = `// Convenience types for E-Receipt IT API
// This file is auto-generated. Do not edit manually.
// Generated on: ${timestamp}
// OpenAPI Hash: ${currentOpenApiHash}

`;

  // Step 5: Create convenience types content
  const convenienceTypes = `import type { components } from './types.generated';

// ===============================================
// MF1 API TYPES (E-Receipt Core Functionality)
// ===============================================

// Authentication & Cashier Management
export type CashierCreateInput = components['schemas']['E-Receipt_IT_API_CashierCreateInput'];
export type CashierOutput = components['schemas']['E-Receipt_IT_API_CashierOutput'];

// Point of Sale (PEM) Management
export type PointOfSaleOutput = components['schemas']['E-Receipt_IT_API_PointOfSaleOutput'];
export type PointOfSaleDetailedOutput = components['schemas']['E-Receipt_IT_API_PointOfSaleDetailedOutput'];
export type PEMPublic = PointOfSaleOutput;
export type PEMDetailed = PointOfSaleDetailedOutput;
export type PEMStatus = components['schemas']['E-Receipt_IT_API_PEMStatus'];
export type PEMStatusOfflineRequest = components['schemas']['E-Receipt_IT_API_PEMStatusOfflineRequest'];
export type ActivationRequest = components['schemas']['E-Receipt_IT_API_ActivationRequest'];

// Cash Register Management
export type CashRegisterCreate = components['schemas']['E-Receipt_IT_API_CashRegisterCreate'];
export type CashRegisterBasicOutput = components['schemas']['E-Receipt_IT_API_CashRegisterBasicOutput'];
export type CashRegisterDetailedOutput = components['schemas']['E-Receipt_IT_API_CashRegisterDetailedOutput'];
export type CashRegisterOutput = CashRegisterDetailedOutput;

// Receipt Management
export type ReceiptInput = components['schemas']['E-Receipt_IT_API_ReceiptInput'];
export type ReceiptOutput = components['schemas']['E-Receipt_IT_API_ReceiptOutput'];
export type ReceiptDetailsOutput = components['schemas']['E-Receipt_IT_API_ReceiptDetailsOutput'];
export type ReceiptItem = components['schemas']['E-Receipt_IT_API_ReceiptItem'];
export type ReceiptType = components['schemas']['E-Receipt_IT_API_ReceiptType'];
export type ReceiptProofType = components['schemas']['E-Receipt_IT_API_ReceiptProofType'];
export type ReceiptReturnOrVoidViaPEMInput = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput'];
export type ReceiptReturnOrVoidWithProofInput = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput'];

// Core Business Types
export type Address = components['schemas']['E-Receipt_IT_API_Address'];
export type GoodOrService = components['schemas']['E-Receipt_IT_API_GoodOrService'];
export type VatRateCode = components['schemas']['E-Receipt_IT_API_VatRateCode'];

// ===============================================
// MF2 API TYPES (Merchant Platform)
// ===============================================

// Merchant Management
export type MerchantAddress = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address'];
export type MerchantCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput'];
export type MerchantOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput'];
export type MerchantUpdateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput'];

// PEM (Point of Electronic Money) Management
export type PemCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateInput'];
export type PemCreateOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Pem.PemCreateOutput'];
export type PemCertificatesOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Pem.PemCertificatesOutput'];
export type PemData = components['schemas']['A-Cube_GOV-IT_PEL_Platform_PemData'];

// ===============================================
// ERROR HANDLING TYPES
// ===============================================

// MF1 Error Types
export type ErrorModel400BadRequest = components['schemas']['E-Receipt_IT_API_ErrorModel400BadRequest'];
export type ErrorModel401Unauthorized = components['schemas']['E-Receipt_IT_API_ErrorModel401Unauthorized'];
export type ErrorModel403Forbidden = components['schemas']['E-Receipt_IT_API_ErrorModel403Forbidden'];
export type ErrorModel404NotFound = components['schemas']['E-Receipt_IT_API_ErrorModel404NotFound'];
export type HTTPValidationError = components['schemas']['E-Receipt_IT_API_HTTPValidationError'];
export type ValidationError = components['schemas']['E-Receipt_IT_API_ValidationError'];

// MF2 Error Types
export type ConstraintViolationJson = components['schemas']['A-Cube_GOV-IT_PEL_Platform_ConstraintViolation-json'];
export type PlatformError = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Error'];

// ===============================================
// PAGINATION & RESPONSE WRAPPERS
// ===============================================

// Paginated Response Types
export type PageCashierOutput = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashierOutput_'];
export type PagePointOfSaleOutput = components['schemas']['E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_'];
export type PageReceiptOutput = components['schemas']['E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_'];
export type PageCashRegisterBasicOutput = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashRegisterBasicOutput_'];

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
`;

  // Step 6: Combine and write files
  const rawFinalContent = rawHeader + rawContent;
  const convenienceFinalContent = convenienceHeader + convenienceTypes;

  // Step 7: Write both files
  console.log('💾 Writing raw types file...');
  fs.writeFileSync(RAW_TYPES_FILE, rawFinalContent, 'utf8');
  
  console.log('💾 Writing convenience types file...');
  fs.writeFileSync(CONVENIENCE_TYPES_FILE, convenienceFinalContent, 'utf8');

  // Step 8: Clean up temp file
  if (fs.existsSync(TEMP_FILE)) {
    fs.unlinkSync(TEMP_FILE);
  }

  // Step 9: Update version info
  const newVersionInfo = {
    openApiHash: currentOpenApiHash,
    generatedAt: timestamp,
    version: '2.0.0',
    files: {
      rawTypes: RAW_TYPES_FILE,
      convenienceTypes: CONVENIENCE_TYPES_FILE
    }
  };
  writeVersionInfo(newVersionInfo);

  console.log('✅ TypeScript types generated successfully!');
  console.log(`📁 Raw types file: ${RAW_TYPES_FILE}`);
  console.log(`📁 Convenience types file: ${CONVENIENCE_TYPES_FILE}`);
  console.log(`📋 Version info: ${VERSION_FILE}`);

  // Step 10: Format files if prettier is available
  try {
    console.log('🎨 Formatting generated files...');
    execSync(`npx prettier --write ${RAW_TYPES_FILE} ${CONVENIENCE_TYPES_FILE}`, { stdio: 'inherit' });
    console.log('✅ Files formatted successfully!');
  } catch (error) {
    console.log('⚠️  Could not format files with prettier (optional step)');
  }

} catch (error) {
  console.error('❌ Error generating types:', error.message);
  
  // Clean up temp file on error
  if (fs.existsSync(TEMP_FILE)) {
    fs.unlinkSync(TEMP_FILE);
  }
  
  process.exit(1);
}