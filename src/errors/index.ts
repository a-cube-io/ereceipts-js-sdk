/**
 * Enterprise-grade error handling system
 * Hierarchical error types with retry logic and audit information
 */

// Base error class with audit information
export abstract class ACubeSDKError extends Error {
  public readonly timestamp: Date;
  public readonly requestId: string;
  public readonly operation: string;
  public readonly retryable: boolean;
  public readonly statusCode?: number;
  public readonly auditInfo?: AuditInfo;
  public override readonly cause?: Error;

  constructor(
    message: string,
    public readonly code: string,
    options: {
      operation: string;
      retryable?: boolean;
      statusCode?: number;
      requestId?: string;
      auditInfo?: AuditInfo;
      cause?: Error;
    }
  ) {
    super(message);
    if (options.cause) {
      this.cause = options.cause;
    }
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.requestId = options.requestId ?? generateRequestId();
    this.operation = options.operation;
    this.retryable = options.retryable ?? false;
    if (options.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
    if (options.auditInfo !== undefined) {
      this.auditInfo = options.auditInfo;
    }

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      operation: this.operation,
      retryable: this.retryable,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      auditInfo: this.auditInfo,
      stack: this.stack,
    };
  }
}

// Audit information for compliance
export interface AuditInfo {
  userId?: string;
  role?: 'provider' | 'merchant' | 'cashier';
  fiscalId?: string;
  receiptId?: string;
  pemId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Network-related errors (usually retryable)
export class NetworkError extends ACubeSDKError {
  constructor(
    message: string,
    operation: string,
    options: {
      statusCode?: number;
      requestId?: string;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, 'NETWORK_ERROR', {
      operation,
      retryable: options.retryable ?? true,
      ...(options.statusCode !== undefined && { statusCode: options.statusCode }),
      ...(options.requestId !== undefined && { requestId: options.requestId }),
      ...(options.cause !== undefined && { cause: options.cause }),
    });
  }
}

// Authentication/Authorization errors (not retryable)
export class AuthenticationError extends ACubeSDKError {
  constructor(
    message: string,
    operation: string,
    options: {
      statusCode?: number;
      requestId?: string;
      auditInfo?: AuditInfo;
    } = {}
  ) {
    super(message, 'AUTHENTICATION_ERROR', {
      operation,
      retryable: false,
      statusCode: options.statusCode ?? 401,
      ...(options.requestId !== undefined && { requestId: options.requestId }),
      ...(options.auditInfo !== undefined && { auditInfo: options.auditInfo }),
    });
  }
}

// Authorization errors (not retryable)
export class AuthorizationError extends ACubeSDKError {
  constructor(
    message: string,
    operation: string,
    options: {
      statusCode?: number;
      requestId?: string;
      auditInfo?: AuditInfo;
    } = {}
  ) {
    super(message, 'AUTHORIZATION_ERROR', {
      operation,
      retryable: false,
      statusCode: options.statusCode ?? 403,
      ...(options.requestId !== undefined && { requestId: options.requestId }),
      ...(options.auditInfo !== undefined && { auditInfo: options.auditInfo }),
    });
  }
}

// Validation errors (not retryable)
export class ValidationError extends ACubeSDKError {
  public readonly violations: ValidationViolation[];

  constructor(
    message: string,
    operation: string,
    violations: ValidationViolation[],
    options: {
      requestId?: string;
      auditInfo?: AuditInfo;
    } = {}
  ) {
    super(message, 'VALIDATION_ERROR', {
      operation,
      retryable: false,
      statusCode: 422,
      ...(options.requestId !== undefined && { requestId: options.requestId }),
      ...(options.auditInfo !== undefined && { auditInfo: options.auditInfo }),
    });
    this.violations = violations;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      violations: this.violations,
    };
  }
}

export interface ValidationViolation {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// Fiscal/compliance specific errors (usually not retryable)
export class FiscalError extends ACubeSDKError {
  public readonly fiscalCode?: string;
  public readonly documentNumber?: string;

  constructor(
    message: string,
    operation: string,
    options: {
      fiscalCode?: string;
      documentNumber?: string;
      statusCode?: number;
      requestId?: string;
      retryable?: boolean;
      auditInfo?: AuditInfo;
    } = {}
  ) {
    super(message, 'FISCAL_ERROR', {
      operation,
      retryable: options.retryable ?? false,
      statusCode: options.statusCode ?? 400,
      ...(options.requestId !== undefined && { requestId: options.requestId }),
      ...(options.auditInfo !== undefined && { auditInfo: options.auditInfo }),
    });
    if (options.fiscalCode !== undefined) {
      this.fiscalCode = options.fiscalCode;
    }
    if (options.documentNumber !== undefined) {
      this.documentNumber = options.documentNumber;
    }
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fiscalCode: this.fiscalCode,
      documentNumber: this.documentNumber,
    };
  }
}

// Rate limiting errors (retryable)
export class RateLimitError extends ACubeSDKError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    operation: string,
    options: {
      retryAfter?: number;
      requestId?: string;
    } = {}
  ) {
    super(message, 'RATE_LIMIT_ERROR', {
      operation,
      retryable: true,
      statusCode: 429,
      ...(options.requestId !== undefined && { requestId: options.requestId }),
    });
    if (options.retryAfter !== undefined) {
      this.retryAfter = options.retryAfter;
    }
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// Configuration errors (not retryable)
export class ConfigurationError extends ACubeSDKError {
  constructor(
    message: string,
    operation: string,
    options: {
      requestId?: string;
    } = {}
  ) {
    super(message, 'CONFIGURATION_ERROR', {
      operation,
      retryable: false,
      ...(options.requestId !== undefined && { requestId: options.requestId }),
    });
  }
}

// Resource not found errors (not retryable)
export class NotFoundError extends ACubeSDKError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(
    resourceType: string,
    resourceId: string,
    operation: string,
    options: {
      requestId?: string;
      auditInfo?: AuditInfo;
    } = {}
  ) {
    super(
      `${resourceType} with id ${resourceId} not found`,
      'NOT_FOUND_ERROR',
      {
        operation,
        retryable: false,
        statusCode: 404,
        ...(options.requestId !== undefined && { requestId: options.requestId }),
        ...(options.auditInfo !== undefined && { auditInfo: options.auditInfo }),
      }
    );
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}

// Circuit breaker errors (retryable)
export class CircuitBreakerError extends ACubeSDKError {
  public readonly state: 'OPEN' | 'HALF_OPEN';

  constructor(
    message: string,
    operation: string,
    state: 'OPEN' | 'HALF_OPEN',
    options: {
      requestId?: string;
    } = {}
  ) {
    super(message, 'CIRCUIT_BREAKER_ERROR', {
      operation,
      retryable: true,
      ...(options.requestId !== undefined && { requestId: options.requestId }),
    });
    this.state = state;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      state: this.state,
    };
  }
}

// Utility functions
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Error factory for creating errors from HTTP responses
export function createErrorFromResponse(
  response: {
    status: number;
    statusText: string;
    data?: unknown;
  },
  operation: string,
  requestId?: string
): ACubeSDKError {
  const message = getErrorMessage(response.data) || response.statusText;

  switch (response.status) {
    case 401:
      return new AuthenticationError(message, operation, {
        statusCode: response.status,
        ...(requestId !== undefined && { requestId }),
      });
    case 403:
      return new AuthorizationError(message, operation, {
        statusCode: response.status,
        ...(requestId !== undefined && { requestId }),
      });
    case 404:
      // Try to extract resource info from error data
      const resourceType = extractResourceType(response.data);
      const resourceId = extractResourceId(response.data);
      if (resourceType && resourceId) {
        return new NotFoundError(resourceType, resourceId, operation, {
          ...(requestId !== undefined && { requestId }),
        });
      }
      // Create a concrete NotFoundError for generic 404s
      return new NotFoundError('Resource', 'unknown', operation, {
        ...(requestId !== undefined && { requestId }),
      });
    case 422:
      const violations = extractValidationViolations(response.data);
      return new ValidationError(message, operation, violations, {
        ...(requestId !== undefined && { requestId }),
      });
    case 429:
      const retryAfter = extractRetryAfter(response.data);
      return new RateLimitError(message, operation, {
        ...(retryAfter !== undefined && { retryAfter }),
        ...(requestId !== undefined && { requestId }),
      });
    case 500:
    case 502:
    case 503:
    case 504:
      return new NetworkError(message, operation, {
        statusCode: response.status,
        ...(requestId !== undefined && { requestId }),
        retryable: true,
      });
    default:
      return new NetworkError(message, operation, {
        statusCode: response.status,
        ...(requestId !== undefined && { requestId }),
        retryable: response.status >= 500,
      });
  }
}

// Helper functions for extracting error details
function getErrorMessage(data: unknown): string | null {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return (obj.message as string) || (obj.detail as string) || null;
  }
  return null;
}

function extractResourceType(data: unknown): string | null {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return obj.resourceType as string || null;
  }
  return null;
}

function extractResourceId(data: unknown): string | null {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return obj.resourceId as string || null;
  }
  return null;
}

function extractValidationViolations(data: unknown): ValidationViolation[] {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.violations)) {
      return obj.violations.map((v: any) => ({
        field: v.propertyPath || v.field || 'unknown',
        message: v.message || 'Validation failed',
        code: v.code || 'VALIDATION_FAILED',
        value: v.value,
      }));
    }
    if (Array.isArray(obj.detail)) {
      return obj.detail.map((v: any) => ({
        field: v.loc?.join('.') || 'unknown',
        message: v.msg || 'Validation failed',
        code: v.type || 'VALIDATION_FAILED',
        value: v.input,
      }));
    }
  }
  return [];
}

function extractRetryAfter(data: unknown): number | undefined {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const retryAfter = obj.retryAfter || obj.retry_after;
    return typeof retryAfter === 'number' ? retryAfter : undefined;
  }
  return undefined;
}