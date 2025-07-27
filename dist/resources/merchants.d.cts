import { B as BaseOpenAPIResource, H as HttpClient, c as components, M as MerchantId, F as FiscalId } from '../generated-CJUuxFn-.cjs';
import 'eventemitter3';

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

type MerchantCreateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantCreateInput'];
type MerchantUpdateInput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantUpdateInput'];
type MerchantOutput = components['schemas']['A-Cube_GOV-IT_PEL_Platform_Merchant.MerchantOutput'];
interface MerchantValidationOptions {
    validateVATNumber?: boolean;
    checkBusinessRegistration?: boolean;
    enforceAddressValidation?: boolean;
    validateItalianPostalCodes?: boolean;
}
interface BusinessAnalytics {
    registrationDate: string;
    businessAge: number;
    completenessScore: number;
    missingFields: string[];
    recommendations: string[];
    complianceStatus: 'compliant' | 'pending' | 'non-compliant';
}
interface AddressValidationResult {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
    formattedAddress?: string | undefined;
}
type BusinessType = 'individual' | 'partnership' | 'corporation' | 'cooperative' | 'other';
type MerchantStatus = 'active' | 'pending' | 'suspended' | 'closed';
/**
 * Merchants Resource Class - OpenAPI Based
 * Manages merchant business entities with full Italian compliance
 */
declare class MerchantsResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of merchants
     *
     * @returns Promise resolving to merchant list
     */
    list(): Promise<MerchantOutput[]>;
    /**
     * Create a new merchant
     *
     * @param data - Merchant creation input data
     * @param options - Validation options
     * @returns Promise resolving to created merchant
     */
    create(data: MerchantCreateInput, options?: MerchantValidationOptions): Promise<MerchantOutput>;
    /**
     * Get a merchant by UUID
     *
     * @param merchantId - Merchant UUID
     * @returns Promise resolving to merchant details
     */
    retrieve(merchantId: MerchantId | string): Promise<MerchantOutput>;
    /**
     * Update a merchant's information
     *
     * @param merchantId - Merchant UUID
     * @param data - Merchant update input data
     * @param options - Validation options
     * @returns Promise resolving to updated merchant
     */
    update(merchantId: MerchantId | string, data: MerchantUpdateInput, options?: MerchantValidationOptions): Promise<MerchantOutput>;
    /**
     * Get merchant business analytics
     *
     * @param merchantId - Merchant UUID
     * @returns Promise resolving to business analytics
     */
    getAnalytics(merchantId: MerchantId | string): Promise<BusinessAnalytics>;
    /**
     * Validate merchant address
     *
     * @param address - Address to validate
     * @returns Address validation result
     */
    validateAddress(address: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address']): Promise<AddressValidationResult>;
    /**
     * Comprehensive merchant creation input validation
     */
    private validateMerchantCreateInput;
    /**
     * Merchant update input validation
     */
    private validateMerchantUpdateInput;
    /**
     * Validate Italian VAT number with checksum
     */
    private validateItalianVATNumber;
    /**
     * Validate business name
     */
    private validateBusinessName;
    /**
     * Validate password strength
     */
    private validatePassword;
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Validate Italian VAT number (static utility)
     */
    static isValidItalianVATNumber(vatNumber: string): boolean;
    /**
     * Format fiscal ID for display
     */
    static formatFiscalId(fiscalId: FiscalId | string): string;
    /**
     * Validate Italian address
     */
    static validateItalianAddress(address: components['schemas']['A-Cube_GOV-IT_PEL_Platform_Address']): Promise<AddressValidationResult>;
    /**
     * Analyze business profile completeness and compliance
     */
    static analyzeBusinessProfile(merchant: MerchantOutput): BusinessAnalytics;
    /**
     * Generate business summary
     */
    static generateBusinessSummary(merchant: MerchantOutput): string;
    /**
     * Validate business name format (static utility)
     */
    static isValidBusinessName(name: string): boolean;
    /**
     * Normalize business name
     */
    static normalizeBusinessName(name: string): string;
    /**
     * Extract province code from address
     */
    static getProvinceCode(merchant: MerchantOutput): string | null;
    /**
     * Check if merchant is based in specific region
     */
    static isInRegion(merchant: MerchantOutput, regionProvinces: string[]): boolean;
    /**
     * Get Italian business regions
     */
    static getItalianRegions(): Record<string, string[]>;
    /**
     * Determine merchant region
     */
    static getMerchantRegion(merchant: MerchantOutput): string | null;
}

export { type AddressValidationResult, type BusinessAnalytics, type BusinessType, type MerchantCreateInput, type MerchantOutput, type MerchantStatus, type MerchantUpdateInput, type MerchantValidationOptions, MerchantsResource as Merchants, MerchantsResource };
