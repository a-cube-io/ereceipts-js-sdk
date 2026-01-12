import axios from 'axios';

import { ACubeSDKError } from '@/shared/types';

export function transformError(error: unknown): ACubeSDKError {
  if (axios.isAxiosError(error)) {
    const response = error.response;

    if (!response) {
      return new ACubeSDKError('NETWORK_ERROR', 'Network error occurred', error);
    }

    const status = response.status;
    const data = response.data;
    const violations = data?.violations;

    let message = 'Unknown error occurred';
    if (data?.detail) {
      message = data.detail;
    } else if (data?.title) {
      message = data.title;
    } else if (error.message) {
      message = error.message;
    }

    switch (status) {
      case 400:
        return new ACubeSDKError('VALIDATION_ERROR', message, error, status, violations);
      case 401:
        return new ACubeSDKError('AUTH_ERROR', message, error, status, violations);
      case 403:
        return new ACubeSDKError('FORBIDDEN_ERROR', message, error, status, violations);
      case 404:
        return new ACubeSDKError('NOT_FOUND_ERROR', message, error, status, violations);
      case 422:
        return new ACubeSDKError('VALIDATION_ERROR', message, error, status, violations);
      default:
        return new ACubeSDKError('UNKNOWN_ERROR', message, error, status, violations);
    }
  }

  return new ACubeSDKError('UNKNOWN_ERROR', 'Unknown error occurred', error);
}
