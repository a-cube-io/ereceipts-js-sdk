import { MTLSError } from '../../../adapters';

/**
 * Error types for better error classification
 */
export enum ErrorCategory {
  SERVER_ERROR = 'SERVER_ERROR',           // 5xx - Server internal errors
  CLIENT_ERROR = 'CLIENT_ERROR',           // 4xx - Client request errors
  AUTH_ERROR = 'AUTH_ERROR',               // 401, 403 - Authentication/Authorization
  CERTIFICATE_ERROR = 'CERTIFICATE_ERROR', // Certificate-related errors
  NETWORK_ERROR = 'NETWORK_ERROR',         // Network/connection errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'          // Unknown errors
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  category: ErrorCategory;
  statusCode?: number;
  message: string;
  shouldRetry: boolean;
  userMessage: string;
}

/**
 * Extract status code from various error types
 */
function extractStatusCode(error: any): number | undefined {
  // Check MTLSError
  if (error instanceof MTLSError && error.statusCode) {
    return error.statusCode;
  }

  // Check axios error
  if (error?.response?.status) {
    return error.response.status;
  }

  // Check if error has statusCode property
  if (typeof error?.statusCode === 'number') {
    return error.statusCode;
  }

  return undefined;
}

/**
 * Classify error based on status code and error type
 */
export function classifyError(error: any): ErrorClassification {
  const statusCode = extractStatusCode(error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Server errors (5xx) - Don't retry
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return {
      category: ErrorCategory.SERVER_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: false,
      userMessage: `Server error (${statusCode}): The server encountered an error. Please contact support if this persists.`
    };
  }

  // Authentication/Authorization errors (401, 403)
  if (statusCode === 401 || statusCode === 403) {
    return {
      category: ErrorCategory.AUTH_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: false,
      userMessage: `Authentication error (${statusCode}): Invalid credentials or insufficient permissions.`
    };
  }

  // Other client errors (4xx) - Don't retry
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return {
      category: ErrorCategory.CLIENT_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: false,
      userMessage: `Request error (${statusCode}): ${errorMessage}`
    };
  }

  // Certificate-specific errors - Retry once
  if (error instanceof MTLSError) {
    return {
      category: ErrorCategory.CERTIFICATE_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: true,
      userMessage: 'Certificate error: Unable to establish secure connection. Please check your certificate.'
    };
  }

  // Network errors (no status code) - Retry once
  if (!statusCode && (
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('timeout') ||
    errorMessage.toLowerCase().includes('connection')
  )) {
    return {
      category: ErrorCategory.NETWORK_ERROR,
      message: errorMessage,
      shouldRetry: true,
      userMessage: 'Network error: Unable to connect to server. Please check your connection.'
    };
  }

  // Unknown errors - Don't retry for safety
  return {
    category: ErrorCategory.UNKNOWN_ERROR,
    statusCode,
    message: errorMessage,
    shouldRetry: false,
    userMessage: `Unexpected error: ${errorMessage}`
  };
}

/**
 * Check if error should trigger certificate reconfiguration
 */
export function shouldReconfigureCertificate(error: any): boolean {
  const classification = classifyError(error);

  // Only reconfigure for certificate errors, not for server/client errors
  return classification.category === ErrorCategory.CERTIFICATE_ERROR;
}

/**
 * Check if error should be retried
 */
export function shouldRetryRequest(error: any, isRetryAttempt: boolean): boolean {
  // Never retry if this is already a retry attempt
  if (isRetryAttempt) {
    return false;
  }

  const classification = classifyError(error);
  return classification.shouldRetry;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  const classification = classifyError(error);
  return classification.userMessage;
}
