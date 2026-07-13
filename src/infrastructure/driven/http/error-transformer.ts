import axios from 'axios';

import { MTLSError } from '@/domain/errors';
import { ACubeSDKError, APIViolation, SDKError } from '@/shared/types';

import { extractApiErrorMessage, extractHttpResponse } from './http-api.error';

function extractViolations(data: unknown): APIViolation[] | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const violations = (data as { violations?: APIViolation[] }).violations;
  return Array.isArray(violations) ? violations : undefined;
}

function mapStatusToErrorType(status: number): SDKError {
  switch (status) {
    case 400:
    case 422:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTH_ERROR';
    case 403:
      return 'FORBIDDEN_ERROR';
    case 404:
      return 'NOT_FOUND_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

function extractErrorMessage(originalError: unknown): string | undefined {
  if (originalError instanceof Error && originalError.message) {
    return originalError.message;
  }

  if (originalError && typeof originalError === 'object' && 'message' in originalError) {
    const message = (originalError as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return undefined;
}

function createACubeSDKErrorFromResponse(
  status: number,
  data: unknown,
  originalError: unknown
): ACubeSDKError {
  const violations = extractViolations(data);
  const message =
    extractApiErrorMessage(data) ?? extractErrorMessage(originalError) ?? 'Unknown error occurred';

  return new ACubeSDKError(
    mapStatusToErrorType(status),
    message,
    originalError,
    status,
    violations,
    data
  );
}

export function transformError(error: unknown): ACubeSDKError {
  if (error instanceof ACubeSDKError) {
    return error;
  }

  if (axios.isAxiosError(error) && !error.response) {
    return new ACubeSDKError('NETWORK_ERROR', 'Network error occurred', error);
  }

  const httpResponse = extractHttpResponse(error);
  if (httpResponse) {
    return createACubeSDKErrorFromResponse(httpResponse.status, httpResponse.data, error);
  }

  if (error instanceof MTLSError) {
    return new ACubeSDKError('UNKNOWN_ERROR', error.message, error, error.statusCode);
  }

  if (error instanceof Error) {
    return new ACubeSDKError('UNKNOWN_ERROR', error.message, error);
  }

  return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error);
}
