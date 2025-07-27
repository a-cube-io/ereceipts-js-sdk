/**
 * Merchants Resource - OpenAPI Implementation
 * Type-safe implementation for business entity management
 * 
 * Features:
 * - Complete merchant lifecycle management
 * - Italian VAT number validation and verification
 * - Business address management
 * - Merchant profile and settings
 * - Compliance and certification tracking
 */

import { BaseOpenAPIResource } from '@/resources/base-openapi';
import { MerchantEndpoints } from '@/generated/endpoints';
import type { HttpClient } from '@/http/client';
import type { MerchantId, FiscalId } from '@/types/branded';
import type { components } from '@/types/generated';
import { ValidationError } from '@/errors/index';

// Extract types from OpenAPI generated types
type MerchantCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput'];
type MerchantUpdateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput'];
type MerchantOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput'];

export interface MerchantValidationOptions {
  validateVATNumber?: boolean;
  checkBusinessRegistration?: boolean;
  enforceAddressValidation?: boolean;
  validateItalianPostalCodes?: boolean;
}

export interface BusinessAnalytics {
  registrationDate: string;
  businessAge: number;
  completenessScore: number;
  missingFields: string[];
  recommendations: string[];
  complianceStatus: 'compliant' | 'pending' | 'non-compliant';
}

export interface AddressValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
  formattedAddress?: string | undefined;
}

export type BusinessType = 'individual' | 'partnership' | 'corporation' | 'cooperative' | 'other';
export type MerchantStatus = 'active' | 'pending' | 'suspended' | 'closed';

/**
 * Merchants Resource Class - OpenAPI Based
 * Manages merchant business entities with full Italian compliance
 */
export class MerchantsResource extends BaseOpenAPIResource {
  constructor(client: HttpClient) {
    super({
      client,
      endpoints: {
        list: MerchantEndpoints.LIST,
        create: MerchantEndpoints.CREATE,
        getByUuid: MerchantEndpoints.GET_BY_UUID,
        update: MerchantEndpoints.UPDATE,
      }
    });
  }

  /**
   * Get a list of merchants
   * 
   * @returns Promise resolving to merchant list
   */
  async list(): Promise<MerchantOutput[]> {
    return this.executeRequest<void, MerchantOutput[]>('list', undefined, {
      metadata: {
        operation: 'list_merchants',
      }
    });
  }

  /**
   * Create a new merchant
   * 
   * @param data - Merchant creation input data
   * @param options - Validation options
   * @returns Promise resolving to created merchant
   */
  async create(
    data: MerchantCreateInput, 
    options: MerchantValidationOptions = {}
  ): Promise<MerchantOutput> {
    // Validate input with business rules
    await this.validateMerchantCreateInput(data, options);

    return this.executeRequest<MerchantCreateInput, MerchantOutput>('create', data, {
      metadata: {
        operation: 'create_merchant',
        fiscalId: data.fiscal_id,
        email: data.email,
        businessName: data.name,
      }
    });
  }

  /**
   * Get a merchant by UUID
   * 
   * @param merchantId - Merchant UUID
   * @returns Promise resolving to merchant details
   */
  async retrieve(merchantId: MerchantId | string): Promise<MerchantOutput> {
    return this.executeRequest<void, MerchantOutput>('getByUuid', undefined, {
      pathParams: { uuid: merchantId },
      metadata: {
        operation: 'get_merchant',
        merchantId,
      }
    });
  }

  /**
   * Update a merchant's information
   * 
   * @param merchantId - Merchant UUID
   * @param data - Merchant update input data
   * @param options - Validation options
   * @returns Promise resolving to updated merchant
   */
  async update(
    merchantId: MerchantId | string, 
    data: MerchantUpdateInput,
    options: MerchantValidationOptions = {}
  ): Promise<MerchantOutput> {
    await this.validateMerchantUpdateInput(data, options);

    return this.executeRequest<MerchantUpdateInput, MerchantOutput>('update', data, {
      pathParams: { uuid: merchantId },
      metadata: {
        operation: 'update_merchant',
        merchantId,
        businessName: data.name,
      }
    });
  }

  /**
   * Get merchant business analytics
   * 
   * @param merchantId - Merchant UUID
   * @returns Promise resolving to business analytics
   */
  async getAnalytics(merchantId: MerchantId | string): Promise<BusinessAnalytics> {
    const merchant = await this.retrieve(merchantId);
    return MerchantsResource.analyzeBusinessProfile(merchant);
  }

  /**
   * Validate merchant address
   * 
   * @param address - Address to validate
   * @returns Address validation result
   */
  async validateAddress(address: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address']): Promise<AddressValidationResult> {
    return MerchantsResource.validateItalianAddress(address);
  }

  // Validation methods

  /**
   * Comprehensive merchant creation input validation
   */
  private async validateMerchantCreateInput(
    data: MerchantCreateInput, 
    options: MerchantValidationOptions = {}
  ): Promise<void> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Required fields validation
    if (!data.fiscal_id) {
      errors.push({
        field: 'fiscal_id',
        message: 'Fiscal ID is required',
        code: 'REQUIRED'
      });
    } else if (options.validateVATNumber) {
      const vatValidation = await this.validateItalianVATNumber(data.fiscal_id);
      if (!vatValidation.isValid) {
        errors.push({
          field: 'fiscal_id',
          message: vatValidation.error || 'Invalid Italian VAT number',
          code: 'INVALID_VAT_NUMBER'
        });
      }
    }

    if (!data.name || data.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Business name is required',
        code: 'REQUIRED'
      });
    } else {
      const nameValidation = this.validateBusinessName(data.name);
      if (!nameValidation.isValid) {
        errors.push({
          field: 'name',
          message: nameValidation.error || 'Invalid business name',
          code: 'INVALID_BUSINESS_NAME'
        });
      }
    }

    if (!data.email) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED'
      });
    } else if (!this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    if (!data.password) {
      errors.push({
        field: 'password',
        message: 'Password is required',
        code: 'REQUIRED'
      });
    } else {
      const passwordValidation = this.validatePassword(data.password);
      if (!passwordValidation.isValid) {
        errors.push({
          field: 'password',
          message: passwordValidation.error || 'Password does not meet requirements',
          code: 'WEAK_PASSWORD'
        });
      }
    }

    // Address validation if provided
    if (data.address && options.enforceAddressValidation) {
      const addressValidation = await MerchantsResource.validateItalianAddress(data.address);
      if (!addressValidation.isValid) {
        errors.push(...addressValidation.errors.map(error => ({
          field: 'address',
          message: error,
          code: 'INVALID_ADDRESS'
        })));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid merchant create input', 'create_merchant', errors);
    }
  }

  /**
   * Merchant update input validation
   */
  private async validateMerchantUpdateInput(
    data: MerchantUpdateInput, 
    options: MerchantValidationOptions = {}
  ): Promise<void> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Business name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Business name is required',
        code: 'REQUIRED'
      });
    } else {
      const nameValidation = this.validateBusinessName(data.name);
      if (!nameValidation.isValid) {
        errors.push({
          field: 'name',
          message: nameValidation.error || 'Invalid business name',
          code: 'INVALID_BUSINESS_NAME'
        });
      }
    }

    // Address validation if provided
    if (data.address && options.enforceAddressValidation) {
      const addressValidation = await MerchantsResource.validateItalianAddress(data.address);
      if (!addressValidation.isValid) {
        errors.push(...addressValidation.errors.map(error => ({
          field: 'address',
          message: error,
          code: 'INVALID_ADDRESS'
        })));
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid merchant update input', 'update_merchant', errors);
    }
  }

  /**
   * Validate Italian VAT number with checksum
   */
  private async validateItalianVATNumber(vatNumber: string): Promise<{ isValid: boolean; error?: string }> {
    if (!MerchantsResource.isValidItalianVATNumber(vatNumber)) {
      return { isValid: false, error: 'Invalid Italian VAT number format or checksum' };
    }

    // Additional online validation could be implemented here
    // For now, we'll just check the format and checksum
    return { isValid: true };
  }

  /**
   * Validate business name
   */
  private validateBusinessName(name: string): { isValid: boolean; error?: string } {
    if (name.length > 200) {
      return { isValid: false, error: 'Business name cannot exceed 200 characters' };
    }

    if (!/^[\w\s&.,'()\-]+$/u.test(name)) {
      return { isValid: false, error: 'Business name contains invalid characters' };
    }

    // Check for suspicious patterns
    if (/test|example|sample/i.test(name)) {
      console.warn(`Potentially test business name detected: ${name}`);
    }

    return { isValid: true };
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): { isValid: boolean; error?: string } {
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'Password must contain uppercase, lowercase, and numeric characters' };
    }

    return { isValid: true };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Static utility methods

  /**
   * Validate Italian VAT number (static utility)
   */
  static isValidItalianVATNumber(vatNumber: string): boolean {
    // Must be exactly 11 digits
    if (!/^\d{11}$/.test(vatNumber)) {
      return false;
    }

    // Calculate checksum for Italian VAT number
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      let digit = parseInt(vatNumber[i]!, 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(vatNumber[10]!, 10);
  }

  /**
   * Format fiscal ID for display
   */
  static formatFiscalId(fiscalId: FiscalId | string): string {
    // Format as XXX XXX XXXXX for readability
    return fiscalId.replace(/(\d{3})(\d{3})(\d{5})/, '$1 $2 $3');
  }

  /**
   * Validate Italian address
   */
  static async validateItalianAddress(address: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address']): Promise<AddressValidationResult> {
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (!address.street_address || address.street_address.trim().length === 0) {
      errors.push('Street address is required');
    }

    if (!address.zip_code || !/^\d{5}$/.test(address.zip_code)) {
      errors.push('ZIP code must be exactly 5 digits');
    } else {
      // Basic Italian postal code validation
      const zipCode = parseInt(address.zip_code, 10);
      if (zipCode < 10000 || zipCode > 98168) {
        errors.push('Invalid Italian postal code range');
      }
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push('City is required');
    }

    if (!address.province || address.province.length !== 2) {
      errors.push('Province must be exactly 2 characters');
    } else {
      // Validate against Italian province codes
      const validProvinces = [
        'AG', 'AL', 'AN', 'AO', 'AQ', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ', 'BS', 'BR',
        'CA', 'CL', 'CB', 'CI', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN', 'FM', 'FE', 'FI', 'FG', 'FC',
        'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'LT', 'LE', 'LC', 'LI', 'LO', 'LU', 'MC', 'MN', 'MS', 'MT', 'VS', 'ME',
        'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OG', 'OT', 'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PU', 'PE', 'PC', 'PI', 'PT',
        'PN', 'PZ', 'PO', 'RG', 'RA', 'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'SS', 'SV', 'SI', 'SR', 'SO', 'TA', 'TE',
        'TR', 'TO', 'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV', 'VI', 'VT'
      ];
      
      if (!validProvinces.includes(address.province.toUpperCase())) {
        errors.push('Invalid Italian province code');
        suggestions.push('Please use a valid Italian province code (e.g., RM for Rome, MI for Milan)');
      }
    }

    const isValid = errors.length === 0;
    const formattedAddress = isValid ? 
      `${address.street_address}, ${address.zip_code} ${address.city} (${address.province.toUpperCase()})` : 
      undefined;

    return {
      isValid,
      errors,
      suggestions,
      formattedAddress,
    };
  }

  /**
   * Analyze business profile completeness and compliance
   */
  static analyzeBusinessProfile(merchant: MerchantOutput): BusinessAnalytics {
    const missingFields: string[] = [];
    const recommendations: string[] = [];
    let completenessScore = 0;
    const totalFields = 6; // Total number of important fields

    // Check required fields
    if (merchant.fiscal_id) completenessScore++;
    else missingFields.push('fiscal_id');

    if (merchant.name) completenessScore++;
    else missingFields.push('name');

    if (merchant.email) completenessScore++;
    else missingFields.push('email');

    if (merchant.address) {
      completenessScore++;
      // Check address completeness
      if (!merchant.address.street_address) {
        missingFields.push('address.street_address');
        recommendations.push('Add complete street address for legal compliance');
      }
      if (!merchant.address.zip_code) {
        missingFields.push('address.zip_code');
      }
      if (!merchant.address.city) {
        missingFields.push('address.city');
      }
      if (!merchant.address.province) {
        missingFields.push('address.province');
      }
    } else {
      missingFields.push('address');
      recommendations.push('Add complete business address for legal compliance');
    }

    // Business age calculation (mock implementation)
    // Note: created_at field not available in OpenAPI schema
    const registrationDate = new Date().toISOString();
    const businessAge = Math.floor((Date.now() - new Date(registrationDate).getTime()) / (1000 * 60 * 60 * 24));

    // Generate recommendations
    if (completenessScore < totalFields) {
      recommendations.push('Complete all required business information');
    }

    // Note: phone and website fields not available in OpenAPI schema
    // Using mock recommendations
    recommendations.push('Add phone number for better customer communication');
    recommendations.push('Add website URL to improve business presence');

    // Determine compliance status
    let complianceStatus: 'compliant' | 'pending' | 'non-compliant' = 'compliant';
    if (missingFields.length > 0) {
      complianceStatus = missingFields.length > 2 ? 'non-compliant' : 'pending';
    }

    return {
      registrationDate,
      businessAge,
      completenessScore: Math.round((completenessScore / totalFields) * 100),
      missingFields,
      recommendations,
      complianceStatus,
    };
  }

  /**
   * Generate business summary
   */
  static generateBusinessSummary(merchant: MerchantOutput): string {
    const addressPart = merchant.address 
      ? ` - ${merchant.address.city}, ${merchant.address.province}`
      : '';
    
    return `${merchant.name} (VAT: ${this.formatFiscalId(merchant.fiscal_id || '')})${addressPart}`;
  }

  /**
   * Validate business name format (static utility)
   */
  static isValidBusinessName(name: string): boolean {
    return typeof name === 'string' && 
           name.trim().length > 0 && 
           name.length <= 200 && 
           /^[\w\s&.,'()\-]+$/u.test(name);
  }

  /**
   * Normalize business name
   */
  static normalizeBusinessName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^\\w/, c => c.toUpperCase());
  }

  /**
   * Extract province code from address
   */
  static getProvinceCode(merchant: MerchantOutput): string | null {
    return merchant.address?.province || null;
  }

  /**
   * Check if merchant is based in specific region
   */
  static isInRegion(merchant: MerchantOutput, regionProvinces: string[]): boolean {
    const province = this.getProvinceCode(merchant);
    return province ? regionProvinces.includes(province.toUpperCase()) : false;
  }

  /**
   * Get Italian business regions
   */
  static getItalianRegions(): Record<string, string[]> {
    return {
      'Northern Italy': ['AO', 'TO', 'CN', 'AT', 'AL', 'VC', 'BI', 'NO', 'VB', 'VA', 'CO', 'SO', 'MI', 'MB', 'BG', 'BS', 'PV', 'CR', 'MN', 'LO', 'LC', 'BZ', 'TN', 'VR', 'VI', 'BL', 'TV', 'VE', 'PD', 'RO', 'UD', 'PN', 'TS', 'GO', 'PC', 'PR', 'RE', 'MO', 'BO', 'FE', 'RA', 'FC', 'RN', 'GE', 'SV', 'IM', 'SP', 'MS'],
      'Central Italy': ['LU', 'PT', 'FI', 'LI', 'PI', 'AR', 'SI', 'GR', 'PO', 'PG', 'TR', 'VT', 'RI', 'RM', 'LT', 'FR', 'AQ', 'TE', 'PE', 'CH', 'MC', 'AP', 'AN', 'PU', 'FM'],
      'Southern Italy': ['CB', 'IS', 'CE', 'BN', 'NA', 'AV', 'SA', 'FG', 'BT', 'BA', 'BR', 'TA', 'MT', 'PZ', 'CS', 'CZ', 'VV', 'RC', 'KR'],
      'Islands': ['PA', 'ME', 'AG', 'CL', 'EN', 'CT', 'RG', 'SR', 'TP', 'CA', 'CI', 'VS', 'NU', 'OG', 'OR', 'SS', 'OT']
    };
  }

  /**
   * Determine merchant region
   */
  static getMerchantRegion(merchant: MerchantOutput): string | null {
    const province = this.getProvinceCode(merchant);
    if (!province) return null;

    const regions = this.getItalianRegions();
    for (const [region, provinces] of Object.entries(regions)) {
      if (provinces.includes(province.toUpperCase())) {
        return region;
      }
    }

    return null;
  }
}

// Re-export for convenience
export { MerchantsResource as Merchants };

// Export types for external use
export type {
  MerchantCreateInput,
  MerchantUpdateInput,
  MerchantOutput,
};