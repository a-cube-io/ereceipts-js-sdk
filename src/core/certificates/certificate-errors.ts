/**
 * Certificate-specific error types
 */
export enum CertificateErrorType {
  CERTIFICATE_NOT_FOUND = 'CERTIFICATE_NOT_FOUND',
  CERTIFICATE_MANAGER_NOT_AVAILABLE = 'CERTIFICATE_MANAGER_NOT_AVAILABLE',
  CERTIFICATE_EXPIRED = 'CERTIFICATE_EXPIRED',
  CERTIFICATE_INVALID = 'CERTIFICATE_INVALID',
  CERTIFICATE_STORAGE_ERROR = 'CERTIFICATE_STORAGE_ERROR',
  CERTIFICATE_VALIDATION_ERROR = 'CERTIFICATE_VALIDATION_ERROR',
  MTLS_REQUIRED = 'MTLS_REQUIRED',
  MTLS_NOT_SUPPORTED = 'MTLS_NOT_SUPPORTED',
  INVALID_CERTIFICATE = 'INVALID_CERTIFICATE',
  INVALID_PRIVATE_KEY = 'INVALID_PRIVATE_KEY',
}

/**
 * Certificate warning types for non-critical issues
 */
export enum CertificateWarningType {
  NO_CERTIFICATE_AVAILABLE = 'NO_CERTIFICATE_AVAILABLE',
  CERTIFICATE_NEAR_EXPIRY = 'CERTIFICATE_NEAR_EXPIRY',
  FALLBACK_TO_JWT = 'FALLBACK_TO_JWT',
  CERTIFICATE_NOT_CONFIGURED = 'CERTIFICATE_NOT_CONFIGURED',
  MTLS_CONNECTION_FAILED = 'MTLS_CONNECTION_FAILED'
}

/**
 * Custom error class for certificate-related errors
 */
export class CertificateError extends Error {
  public readonly type: CertificateErrorType;
  public readonly certificateId?: string;
  public readonly originalError?: Error;
  public readonly isRecoverable: boolean;

  constructor(
    type: CertificateErrorType,
    message: string,
    options: {
      certificateId?: string;
      originalError?: Error;
      isRecoverable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'CertificateError';
    this.type = type;
    this.certificateId = options.certificateId;
    this.originalError = options.originalError;
    this.isRecoverable = options.isRecoverable ?? false;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CertificateError);
    }
  }

  /**
   * Check if this error indicates a missing certificate
   */
  isCertificateNotFound(): boolean {
    return this.type === CertificateErrorType.CERTIFICATE_NOT_FOUND;
  }

  /**
   * Check if this error requires mTLS configuration
   */
  requiresMTLSConfiguration(): boolean {
    return this.type === CertificateErrorType.MTLS_REQUIRED ||
           this.type === CertificateErrorType.CERTIFICATE_NOT_FOUND ||
           this.type === CertificateErrorType.CERTIFICATE_MANAGER_NOT_AVAILABLE;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case CertificateErrorType.CERTIFICATE_NOT_FOUND:
        return this.certificateId 
          ? `Certificate "${this.certificateId}" not found. Please configure a certificate for mTLS authentication.`
          : 'No certificate found. Please configure a certificate for mTLS authentication.';
      
      case CertificateErrorType.CERTIFICATE_MANAGER_NOT_AVAILABLE:
        return 'Certificate manager is not available. Please ensure the SDK is properly initialized.';
      
      case CertificateErrorType.CERTIFICATE_EXPIRED:
        return this.certificateId
          ? `Certificate "${this.certificateId}" has expired. Please update your certificate.`
          : 'Certificate has expired. Please update your certificate.';
      
      case CertificateErrorType.CERTIFICATE_INVALID:
        return 'Certificate is invalid. Please check the certificate format and content.';
      
      case CertificateErrorType.CERTIFICATE_STORAGE_ERROR:
        return 'Failed to store certificate. Please check storage permissions and try again.';
      
      case CertificateErrorType.CERTIFICATE_VALIDATION_ERROR:
        return 'Certificate validation failed. Please ensure the certificate is valid and properly formatted.';
      
      case CertificateErrorType.MTLS_REQUIRED:
        return 'This endpoint requires mTLS authentication. Please configure a certificate.';
      
      case CertificateErrorType.MTLS_NOT_SUPPORTED:
        return 'mTLS is not supported on this platform.';
      
      default:
        return this.message;
    }
  }

  /**
   * Convert to JSON for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.getUserMessage(),
      certificateId: this.certificateId,
      isRecoverable: this.isRecoverable,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Custom warning class for certificate-related warnings
 */
export class CertificateWarning {
  public readonly type: CertificateWarningType;
  public readonly message: string;
  public readonly certificateId?: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    type: CertificateWarningType,
    message: string,
    options: {
      certificateId?: string;
      context?: Record<string, any>;
    } = {}
  ) {
    this.type = type;
    this.message = message;
    this.certificateId = options.certificateId;
    this.context = options.context;
    this.timestamp = new Date();
  }

  /**
   * Get user-friendly warning message
   */
  getUserMessage(): string {
    switch (this.type) {
      case CertificateWarningType.NO_CERTIFICATE_AVAILABLE:
        return 'No certificate available for mTLS authentication. Falling back to JWT authentication.';
      
      case CertificateWarningType.CERTIFICATE_NEAR_EXPIRY:
        return this.certificateId
          ? `Certificate "${this.certificateId}" will expire soon. Please renew your certificate.`
          : 'Certificate will expire soon. Please renew your certificate.';
      
      case CertificateWarningType.FALLBACK_TO_JWT:
        return 'mTLS authentication failed. Falling back to JWT authentication.';
      
      case CertificateWarningType.CERTIFICATE_NOT_CONFIGURED:
        return 'Certificate is not configured. Using JWT authentication for this request.';
      
      case CertificateWarningType.MTLS_CONNECTION_FAILED:
        return 'mTLS connection test failed. Certificate may not be properly configured.';
      
      default:
        return this.message;
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      userMessage: this.getUserMessage(),
      certificateId: this.certificateId,
      context: this.context,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Helper function to create certificate errors
 */
export function createCertificateError(
  type: CertificateErrorType,
  message: string,
  options?: {
    certificateId?: string;
    originalError?: Error;
    isRecoverable?: boolean;
  }
): CertificateError {
  return new CertificateError(type, message, options);
}

/**
 * Helper function to create certificate warnings
 */
export function createCertificateWarning(
  type: CertificateWarningType,
  message: string,
  options?: {
    certificateId?: string;
    context?: Record<string, any>;
  }
): CertificateWarning {
  return new CertificateWarning(type, message, options);
}

/**
 * Certificate event handler interface
 */
export interface CertificateEventHandler {
  onCertificateError?: (error: CertificateError) => void;
  onCertificateWarning?: (warning: CertificateWarning) => void;
}