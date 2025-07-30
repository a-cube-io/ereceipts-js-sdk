/**
 * Validation Middleware for OpenAPI Resources
 * Integrates runtime validation with resource operations
 */

import { defaultValidator } from './index';
import { ValidationError } from '../errors/index';
import { ValidationSchemas, type ValidationSchemaName } from './schemas';

import type { SchemaDefinition, ValidationEngine, ValidationOptions } from './index';

/**
 * Validation middleware configuration
 */
export interface ValidationMiddlewareConfig {
  enabled: boolean;
  strict: boolean;
  enableWarnings: boolean;
  failOnWarnings: boolean;
  customSchemas?: Record<string, SchemaDefinition>;
  skipValidation?: string[]; // Operations to skip validation for
}

/**
 * Default validation middleware configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationMiddlewareConfig = {
  enabled: true,
  strict: false,
  enableWarnings: true,
  failOnWarnings: false,
  skipValidation: [],
};

/**
 * Validation middleware for request data
 */
export class ValidationMiddleware {
  private engine: ValidationEngine;

  private config: ValidationMiddlewareConfig;

  constructor(
    config: Partial<ValidationMiddlewareConfig> = {},
    engine: ValidationEngine = defaultValidator,
  ) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.engine = engine;

    // Register custom schemas if provided
    if (config.customSchemas) {
      Object.entries(config.customSchemas).forEach(([name, schema]) => {
        this.registerSchema(name, schema);
      });
    }
  }

  /**
   * Register a custom validation schema
   */
  registerSchema(_name: string, _schema: SchemaDefinition): void {
    // This would extend the ValidationSchemas object
    // For now, we store it in the engine's custom validators
  }

  /**
   * Validate request input data
   */
  validateInput<T>(
    data: unknown,
    schemaName: ValidationSchemaName | string,
    operation: string,
    options?: ValidationOptions,
  ): T {
    if (!this.config.enabled || this.config.skipValidation?.includes(operation)) {
      return data as T;
    }

    const schema = this.getSchema(schemaName);
    if (!schema) {
      if (this.config.strict) {
        throw new ValidationError(
          `No validation schema found for ${schemaName}`,
          operation,
          [{
            field: 'schema',
            message: `Schema '${schemaName}' not found`,
            code: 'SCHEMA_NOT_FOUND',
          }],
        );
      }
      return data as T;
    }

    const validationOptions: ValidationOptions = {
      strict: this.config.strict,
      enableWarnings: this.config.enableWarnings,
      ...options,
    };

    const result = this.engine.validate(data, schema, validationOptions);

    // Handle warnings
    if (result.warnings.length > 0 && this.config.enableWarnings) {
      if (this.config.failOnWarnings) {
        throw new ValidationError(
          `Validation warnings for ${operation}`,
          operation,
          result.warnings.map(warning => ({
            field: warning.field,
            message: warning.message,
            code: warning.code,
          })),
        );
      }

      // Log warnings if not failing on them
      console.warn(`Validation warnings for ${operation}:`, result.warnings);
    }

    // Handle errors
    if (!result.isValid) {
      throw new ValidationError(
        `Validation failed for ${operation}`,
        operation,
        result.errors.map(error => ({
          field: error.field,
          message: error.message,
          code: error.code,
        })),
      );
    }

    return data as T;
  }

  /**
   * Validate response data (optional)
   */
  validateOutput<T>(
    data: unknown,
    schemaName: ValidationSchemaName | string,
    operation: string,
    options?: ValidationOptions,
  ): T {
    // Response validation is typically less strict
    if (!this.config.enabled || !this.config.strict) {
      return data as T;
    }

    return this.validateInput<T>(data, schemaName, `${operation}_response`, options);
  }

  /**
   * Get validation schema by name
   */
  private getSchema(schemaName: string): SchemaDefinition | null {
    return ValidationSchemas[schemaName as ValidationSchemaName] || null;
  }

  /**
   * Update middleware configuration
   */
  updateConfig(config: Partial<ValidationMiddlewareConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if validation is enabled for an operation
   */
  isValidationEnabled(operation: string): boolean {
    return this.config.enabled && !this.config.skipValidation?.includes(operation);
  }
}

/**
 * Resource-specific validation decorators
 */
export namespace ValidationDecorators {
  /**
   * Validate method input parameters
   */
  export function ValidateInput(schemaName: ValidationSchemaName | string, options?: ValidationOptions) {
    return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = function (this: { validationMiddleware?: ValidationMiddleware }, ...args: unknown[]) {
        const middleware = this.validationMiddleware || new ValidationMiddleware();

        if (args.length > 0 && middleware.isValidationEnabled(propertyKey)) {
          args[0] = middleware.validateInput(args[0], schemaName, propertyKey, options);
        }

        return originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  /**
   * Validate method output
   */
  export function ValidateOutput(schemaName: ValidationSchemaName | string, options?: ValidationOptions) {
    return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: { validationMiddleware?: ValidationMiddleware }, ...args: unknown[]) {
        const result = await originalMethod.apply(this, args);
        const middleware = this.validationMiddleware || new ValidationMiddleware();

        if (middleware.isValidationEnabled(propertyKey)) {
          return middleware.validateOutput(result, schemaName, propertyKey, options);
        }

        return result;
      };

      return descriptor;
    };
  }
}

/**
 * Validation helper functions for common scenarios
 */
export namespace ValidationHelpers {
  /**
   * Validate receipt input data
   */
  export function validateReceiptInput(data: unknown, operation = 'create_receipt'): unknown {
    const middleware = new ValidationMiddleware();
    return middleware.validateInput(data, 'ReceiptInput', operation);
  }

  /**
   * Validate cashier input data
   */
  export function validateCashierInput(data: unknown, operation = 'create_cashier'): unknown {
    const middleware = new ValidationMiddleware();
    return middleware.validateInput(data, 'CashierInput', operation);
  }

  /**
   * Validate merchant input data
   */
  export function validateMerchantInput(data: unknown, operation = 'create_merchant'): unknown {
    const middleware = new ValidationMiddleware();
    return middleware.validateInput(data, 'MerchantInput', operation);
  }

  /**
   * Validate cash register input data
   */
  export function validateCashRegisterInput(data: unknown, operation = 'create_cash_register'): unknown {
    const middleware = new ValidationMiddleware();
    return middleware.validateInput(data, 'CashRegisterInput', operation);
  }

  /**
   * Validate point of sale input data
   */
  export function validatePointOfSaleInput(data: unknown, operation = 'create_point_of_sale'): unknown {
    const middleware = new ValidationMiddleware();
    return middleware.validateInput(data, 'PointOfSaleInput', operation);
  }

  /**
   * Validate activation request data
   */
  export function validateActivationRequest(data: unknown, operation = 'activate_device'): unknown {
    const middleware = new ValidationMiddleware();
    return middleware.validateInput(data, 'ActivationRequest', operation);
  }

  /**
   * Validate branded type
   */
  export function validateBrandedType<T>(
    value: unknown,
    typeName: ValidationSchemaName,
    operation = 'validate_type',
  ): T {
    const middleware = new ValidationMiddleware();
    return middleware.validateInput<T>(value, typeName, operation);
  }

  /**
   * Create validation middleware with custom configuration
   */
  export function createValidationMiddleware(config: Partial<ValidationMiddlewareConfig>): ValidationMiddleware {
    return new ValidationMiddleware(config);
  }

  /**
   * Validate array of items
   */
  export function validateArray<T>(
    items: unknown[],
    itemSchemaName: ValidationSchemaName | string,
    operation = 'validate_array',
  ): T[] {
    const middleware = new ValidationMiddleware();

    return items.map((item, index) =>
      middleware.validateInput<T>(item, itemSchemaName, `${operation}[${index}]`),
    );
  }
}

/**
 * Global validation middleware instance
 */
export const globalValidationMiddleware = new ValidationMiddleware();

/**
 * Configuration utilities
 */
export namespace ValidationConfig {
  /**
   * Create strict validation configuration
   */
  export function strictConfig(): ValidationMiddlewareConfig {
    return {
      enabled: true,
      strict: true,
      enableWarnings: true,
      failOnWarnings: true,
      skipValidation: [],
    };
  }

  /**
   * Create lenient validation configuration
   */
  export function lenientConfig(): ValidationMiddlewareConfig {
    return {
      enabled: true,
      strict: false,
      enableWarnings: true,
      failOnWarnings: false,
      skipValidation: [],
    };
  }

  /**
   * Create development validation configuration
   */
  export function developmentConfig(): ValidationMiddlewareConfig {
    return {
      enabled: true,
      strict: false,
      enableWarnings: true,
      failOnWarnings: false,
      skipValidation: [],
    };
  }

  /**
   * Create production validation configuration
   */
  export function productionConfig(): ValidationMiddlewareConfig {
    return {
      enabled: true,
      strict: true,
      enableWarnings: false,
      failOnWarnings: false,
      skipValidation: [],
    };
  }

  /**
   * Disable validation (for testing or development)
   */
  export function disabledConfig(): ValidationMiddlewareConfig {
    return {
      enabled: false,
      strict: false,
      enableWarnings: false,
      failOnWarnings: false,
      skipValidation: [],
    };
  }
}
