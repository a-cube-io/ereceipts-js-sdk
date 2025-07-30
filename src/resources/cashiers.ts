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

import type { HttpClient } from '@/http/client';
import type { CashierId } from '@/types/branded';
import type { components } from '@/types/generated';
import type { UnifiedStorage } from '@/storage/unified-storage';
import type { EnterpriseQueueManager } from '@/storage/queue/queue-manager';

import { ValidationError } from '@/errors/index';
import { CashierEndpoints } from '@/generated/endpoints';
import { BaseOpenAPIResource, type RequestOptions } from '@/resources/base-openapi';

// Extract types from OpenAPI generated types
type CashierCreateInput = components['schemas']['E-Receipt_IT_API_CashierCreateInput'];
type CashierOutput = components['schemas']['E-Receipt_IT_API_CashierOutput'];
type CashierPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashierOutput_'];

export interface CashierListParams {
  page?: number;
  size?: number;
}

export interface CashierValidationOptions {
  enforceStrongPassword?: boolean;
  allowedEmailDomains?: string[];
  checkEmailUniqueness?: boolean;
}

/**
 * Cashiers Resource Class - OpenAPI Based
 * Manages cashier user accounts with full OpenAPI compliance
 * Enhanced with offline-first capabilities
 */
export class CashiersResource extends BaseOpenAPIResource {
  constructor(client: HttpClient, storage?: UnifiedStorage | undefined, queueManager?: EnterpriseQueueManager | undefined) {
    super({
      client,
      storage: storage || undefined,
      queueManager: queueManager || undefined,
      offlineEnabled: Boolean(storage || queueManager),
      endpoints: {
        list: CashierEndpoints.LIST,
        create: CashierEndpoints.CREATE,
        me: CashierEndpoints.ME,
        getById: CashierEndpoints.GET_BY_ID,
        delete: CashierEndpoints.DELETE,
      },
    });
  }

  /**
   * Get a list of cashiers with pagination
   * Enhanced with offline-first capabilities
   *
   * @param params - Pagination parameters
   * @param options - Request options including offline preferences
   * @returns Promise resolving to paginated cashier list
   */
  async list(params?: CashierListParams, options: Partial<RequestOptions> = {}): Promise<CashierPage> {
    return this.executeRequest<void, CashierPage>('list', undefined, {
      ...(params && { queryParams: params as Record<string, unknown> }),
      cacheTTL: 600, // Cache for 10 minutes
      queueIfOffline: false,
      ...options,
      metadata: {
        operation: 'list_cashiers',
        ...options.metadata,
      },
    });
  }

  /**
   * Create a new cashier
   * Enhanced with offline queuing and optimistic updates
   *
   * @param data - Cashier creation input data
   * @param validationOptions - Validation options
   * @param requestOptions - Request options including offline preferences
   * @returns Promise resolving to created cashier
   */
  async create(
    data: CashierCreateInput,
    validationOptions: CashierValidationOptions = {},
    requestOptions: Partial<RequestOptions> = {},
  ): Promise<CashierOutput> {
    // Validate input with custom business rules
    await this.validateCashierInput(data, validationOptions);

    return this.executeRequest<CashierCreateInput, CashierOutput>('create', data, {
      queueIfOffline: true,
      optimistic: true,
      ...requestOptions,
      metadata: {
        operation: 'create_cashier',
        email: data.email,
        ...requestOptions.metadata,
      },
    });
  }

  /**
   * Get current cashier information
   * Enhanced with intelligent caching
   *
   * @param options - Request options including offline preferences
   * @returns Promise resolving to current cashier details
   */
  async me(options: Partial<RequestOptions> = {}): Promise<CashierOutput> {
    return this.executeRequest<void, CashierOutput>('me', undefined, {
      cacheTTL: 300, // Cache for 5 minutes
      queueIfOffline: false,
      ...options,
      metadata: {
        operation: 'get_current_cashier',
        ...options.metadata,
      },
    });
  }

  /**
   * Get a specific cashier by ID
   *
   * @param cashierId - Cashier ID (branded or number)
   * @returns Promise resolving to cashier details
   */
  async retrieve(cashierId: CashierId | number): Promise<CashierOutput> {
    return this.executeRequest<void, CashierOutput>('getById', undefined, {
      pathParams: { cashier_id: cashierId },
      metadata: {
        operation: 'get_cashier',
        cashierId,
      },
    });
  }

  /**
   * Delete a cashier
   *
   * @param cashierId - Cashier ID (branded or number)
   * @returns Promise resolving when deletion is complete
   */
  async delete(cashierId: CashierId | number): Promise<void> {
    return this.executeRequest<void, void>('delete', undefined, {
      pathParams: { cashier_id: cashierId },
      metadata: {
        operation: 'delete_cashier',
        cashierId,
      },
    });
  }

  /**
   * Update a cashier's profile (future enhancement)
   * Note: This endpoint is not yet available in the OpenAPI spec
   */
  async update(cashierId: CashierId | number, data: Partial<CashierCreateInput>): Promise<CashierOutput> {
    if (!this.hasOperation('update')) {
      throw this.createUnsupportedOperationError('update');
    }

    return this.executeRequest<Partial<CashierCreateInput>, CashierOutput>('update', data, {
      pathParams: { cashier_id: cashierId },
      metadata: {
        operation: 'update_cashier',
        cashierId,
      },
    });
  }

  // Validation methods

  /**
   * Comprehensive cashier input validation
   */
  private async validateCashierInput(
    data: CashierCreateInput,
    options: CashierValidationOptions = {},
  ): Promise<void> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Email validation
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    } else {
      // Domain validation if specified
      if (options.allowedEmailDomains && options.allowedEmailDomains.length > 0) {
        if (!CashiersResource.isAllowedEmailDomain(data.email, options.allowedEmailDomains)) {
          errors.push({
            field: 'email',
            message: `Email domain not allowed. Allowed domains: ${options.allowedEmailDomains.join(', ')}`,
            code: 'DOMAIN_NOT_ALLOWED',
          });
        }
      }

      // Email uniqueness check (if enabled and implemented)
      if (options.checkEmailUniqueness) {
        const isDuplicate = await this.checkEmailExists(data.email);
        if (isDuplicate) {
          errors.push({
            field: 'email',
            message: 'Email address is already in use',
            code: 'EMAIL_EXISTS',
          });
        }
      }
    }

    // Password validation
    const passwordCheck = CashiersResource.checkPasswordStrength(data.password);
    if (!passwordCheck.isValid) {
      if (options.enforceStrongPassword) {
        errors.push({
          field: 'password',
          message: passwordCheck.message || 'Password does not meet security requirements',
          code: 'WEAK_PASSWORD',
        });
      } else {
        // Just warn for weak passwords if not enforcing
        console.warn(`Weak password detected for ${data.email}: ${passwordCheck.suggestions.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid cashier input', 'create_cashier', errors);
    }
  }

  /**
   * Check if email already exists (placeholder for future implementation)
   */
  private async checkEmailExists(email: string): Promise<boolean> {
    // This would require a separate endpoint or database query
    // For now, we'll return false as a placeholder
    console.warn(`Email uniqueness check not implemented for: ${email}`);
    return false;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    return CashiersResource.isValidEmail(email);
  }

  // Static utility methods

  /**
   * Validate email format (static utility)
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check password strength with detailed analysis
   */
  static checkPasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    message?: string;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0;

    // Length checks
    if (password.length >= 8) {score++;}
    if (password.length >= 12) {score++;}
    if (password.length < 8) {
      suggestions.push('Use at least 8 characters');
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {score++;}
    else {suggestions.push('Include lowercase letters');}

    if (/[A-Z]/.test(password)) {score++;}
    else {suggestions.push('Include uppercase letters');}

    if (/\d/.test(password)) {score++;}
    else {suggestions.push('Include numbers');}

    if (/[^a-zA-Z0-9]/.test(password)) {score++;}
    else {suggestions.push('Include special characters');}

    // Common patterns to avoid
    if (/(.)\\1{2,}/.test(password)) {
      score--;
      suggestions.push('Avoid repeating characters');
    }

    // Common passwords check
    const commonPasswords = [
      'password', 'password123', '12345678', 'qwerty', 'abc123',
      'password1', '123456789', 'welcome', 'admin', 'letmein',
    ];

    if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
      score = 0;
      suggestions.push('Avoid common passwords');
    }

    // Dictionary word check (basic)
    if (/^[a-zA-Z]+$/.test(password) && password.length < 12) {
      score--;
      suggestions.push('Avoid using only dictionary words');
    }

    const isValid = score >= 4 && password.length >= 8;
    const message = isValid ? 'Strong password' : 'Password too weak';

    return { isValid, score, message, suggestions };
  }

  /**
   * Generate a secure password
   */
  static generateSecurePassword(length = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowercase + uppercase + numbers + symbols;

    // Ensure at least one character from each category
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Format email for display (partial masking for privacy)
   */
  static formatEmailForDisplay(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {return email;}

    if (localPart.length <= 3) {
      return `${localPart[0]}**@${domain}`;
    }

    const visibleChars = Math.min(3, Math.floor(localPart.length / 2));
    const maskedPart = '*'.repeat(localPart.length - visibleChars);

    return `${localPart.substring(0, visibleChars)}${maskedPart}@${domain}`;
  }

  /**
   * Extract domain from email
   */
  static getEmailDomain(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] || null : null;
  }

  /**
   * Validate email domain against allowed domains
   */
  static isAllowedEmailDomain(email: string, allowedDomains: string[]): boolean {
    const domain = this.getEmailDomain(email);
    return domain ? allowedDomains.includes(domain.toLowerCase()) : false;
  }

  /**
   * Generate username suggestion from email
   */
  static generateUsername(email: string): string {
    const [localPart] = email.split('@');
    if (!localPart) {return 'user';}

    // Clean up the local part for username
    return localPart
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
  }

  /**
   * Validate cashier creation rate limits (placeholder for future implementation)
   */
  static checkCreationRateLimit(ipAddress: string): boolean {
    // This would check against a rate limiting service
    console.warn(`Rate limit check not implemented for IP: ${ipAddress}`);
    return true; // Allow by default
  }

  /**
   * Get cashier role permissions (placeholder for future implementation)
   */
  static getCashierPermissions(): string[] {
    return [
      'create_receipt',
      'view_receipts',
      'void_receipt',
      'return_items',
      'view_daily_summary',
    ];
  }

  /**
   * Format cashier for display in UI
   */
  static formatCashierForDisplay(cashier: CashierOutput): {
    displayName: string;
    maskedEmail: string;
    status: string;
    permissions: string[];
  } {
    return {
      displayName: cashier.email.split('@')[0] || 'Unknown',
      maskedEmail: this.formatEmailForDisplay(cashier.email),
      status: 'active', // This would come from the API response
      permissions: this.getCashierPermissions(),
    };
  }

  /**
   * Validate cashier session (placeholder for future implementation)
   */
  static validateCashierSession(cashierId: CashierId | number): Promise<boolean> {
    // This would validate against the authentication service
    console.warn(`Session validation not implemented for cashier: ${cashierId}`);
    return Promise.resolve(true);
  }
}

// Re-export for convenience
export { CashiersResource as Cashiers };

// Export types for external use
export type {
  CashierPage,
  CashierOutput,
  CashierCreateInput,
};
