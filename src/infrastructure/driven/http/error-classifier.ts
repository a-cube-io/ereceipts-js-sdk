import { MTLSError } from '@/domain/errors';

export enum ErrorCategory {
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  CERTIFICATE_ERROR = 'CERTIFICATE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorClassification {
  category: ErrorCategory;
  statusCode?: number;
  message: string;
  shouldRetry: boolean;
  userMessage: string;
}

function extractStatusCode(error: unknown): number | undefined {
  if (error instanceof MTLSError && error.statusCode) {
    return error.statusCode;
  }

  const errorObj = error as { response?: { status?: number }; statusCode?: number };

  if (errorObj?.response?.status) {
    return errorObj.response.status;
  }

  if (typeof errorObj?.statusCode === 'number') {
    return errorObj.statusCode;
  }

  return undefined;
}

export function classifyError(error: unknown): ErrorClassification {
  const statusCode = extractStatusCode(error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return {
      category: ErrorCategory.SERVER_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: false,
      userMessage: `Server error (${statusCode}): The server encountered an error.`,
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      category: ErrorCategory.AUTH_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: false,
      userMessage: `Authentication error (${statusCode}): Invalid credentials or insufficient permissions.`,
    };
  }

  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return {
      category: ErrorCategory.CLIENT_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: false,
      userMessage: `Request error (${statusCode}): ${errorMessage}`,
    };
  }

  if (error instanceof MTLSError) {
    return {
      category: ErrorCategory.CERTIFICATE_ERROR,
      statusCode,
      message: errorMessage,
      shouldRetry: true,
      userMessage: 'Certificate error: Unable to establish secure connection.',
    };
  }

  if (
    !statusCode &&
    (errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('timeout') ||
      errorMessage.toLowerCase().includes('connection'))
  ) {
    return {
      category: ErrorCategory.NETWORK_ERROR,
      message: errorMessage,
      shouldRetry: true,
      userMessage: 'Network error: Unable to connect to server.',
    };
  }

  return {
    category: ErrorCategory.UNKNOWN_ERROR,
    statusCode,
    message: errorMessage,
    shouldRetry: false,
    userMessage: `Unexpected error: ${errorMessage}`,
  };
}

export function shouldReconfigureCertificate(error: unknown): boolean {
  const classification = classifyError(error);
  return classification.category === ErrorCategory.CERTIFICATE_ERROR;
}

export function shouldRetryRequest(error: unknown, isRetryAttempt: boolean): boolean {
  if (isRetryAttempt) {
    return false;
  }
  const classification = classifyError(error);
  return classification.shouldRetry;
}

export function getUserFriendlyMessage(error: unknown): string {
  const classification = classifyError(error);
  return classification.userMessage;
}
