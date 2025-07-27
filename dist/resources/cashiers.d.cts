import { B as BaseOpenAPIResource, H as HttpClient, c as components, C as CashierId } from '../generated-CJUuxFn-.cjs';
import 'eventemitter3';

/**
 * Cashiers Resource - OpenAPI Implementation
 * Type-safe implementation based on OpenAPI specification
 *
 * Features:
 * - Full CRUD operations for cashier management
 * - Type-safe input/output with branded types
 * - Advanced validation and business logic
 * - Password security utilities
 * - Email management and formatting
 */

type CashierCreateInput = components['schemas']['E-Receipt_IT_API_CashierCreateInput'];
type CashierOutput = components['schemas']['E-Receipt_IT_API_CashierOutput'];
type CashierPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashierOutput_'];
interface CashierListParams {
    page?: number;
    size?: number;
}
interface CashierValidationOptions {
    enforceStrongPassword?: boolean;
    allowedEmailDomains?: string[];
    checkEmailUniqueness?: boolean;
}
/**
 * Cashiers Resource Class - OpenAPI Based
 * Manages cashier user accounts with full OpenAPI compliance
 */
declare class CashiersResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of cashiers with pagination
     *
     * @param params - Pagination parameters
     * @returns Promise resolving to paginated cashier list
     */
    list(params?: CashierListParams): Promise<CashierPage>;
    /**
     * Create a new cashier
     *
     * @param data - Cashier creation input data
     * @param options - Validation options
     * @returns Promise resolving to created cashier
     */
    create(data: CashierCreateInput, options?: CashierValidationOptions): Promise<CashierOutput>;
    /**
     * Get current cashier information
     *
     * @returns Promise resolving to current cashier details
     */
    me(): Promise<CashierOutput>;
    /**
     * Get a specific cashier by ID
     *
     * @param cashierId - Cashier ID (branded or number)
     * @returns Promise resolving to cashier details
     */
    retrieve(cashierId: CashierId | number): Promise<CashierOutput>;
    /**
     * Delete a cashier
     *
     * @param cashierId - Cashier ID (branded or number)
     * @returns Promise resolving when deletion is complete
     */
    delete(cashierId: CashierId | number): Promise<void>;
    /**
     * Update a cashier's profile (future enhancement)
     * Note: This endpoint is not yet available in the OpenAPI spec
     */
    update(cashierId: CashierId | number, data: Partial<CashierCreateInput>): Promise<CashierOutput>;
    /**
     * Comprehensive cashier input validation
     */
    private validateCashierInput;
    /**
     * Check if email already exists (placeholder for future implementation)
     */
    private checkEmailExists;
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Validate email format (static utility)
     */
    static isValidEmail(email: string): boolean;
    /**
     * Check password strength with detailed analysis
     */
    static checkPasswordStrength(password: string): {
        isValid: boolean;
        score: number;
        message?: string;
        suggestions: string[];
    };
    /**
     * Generate a secure password
     */
    static generateSecurePassword(length?: number): string;
    /**
     * Format email for display (partial masking for privacy)
     */
    static formatEmailForDisplay(email: string): string;
    /**
     * Extract domain from email
     */
    static getEmailDomain(email: string): string | null;
    /**
     * Validate email domain against allowed domains
     */
    static isAllowedEmailDomain(email: string, allowedDomains: string[]): boolean;
    /**
     * Generate username suggestion from email
     */
    static generateUsername(email: string): string;
    /**
     * Validate cashier creation rate limits (placeholder for future implementation)
     */
    static checkCreationRateLimit(ipAddress: string): boolean;
    /**
     * Get cashier role permissions (placeholder for future implementation)
     */
    static getCashierPermissions(): string[];
    /**
     * Format cashier for display in UI
     */
    static formatCashierForDisplay(cashier: CashierOutput): {
        displayName: string;
        maskedEmail: string;
        status: string;
        permissions: string[];
    };
    /**
     * Validate cashier session (placeholder for future implementation)
     */
    static validateCashierSession(cashierId: CashierId | number): Promise<boolean>;
}

export { type CashierCreateInput, type CashierListParams, type CashierOutput, type CashierPage, type CashierValidationOptions, CashiersResource as Cashiers, CashiersResource };
