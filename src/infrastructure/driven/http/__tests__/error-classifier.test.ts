import { MTLSError, MTLSErrorType } from '@/domain/errors';

import {
  ErrorCategory,
  classifyError,
  getUserFriendlyMessage,
  shouldReconfigureCertificate,
  shouldRetryRequest,
} from '../error-classifier';

describe('classifyError', () => {
  describe('Server errors (5xx)', () => {
    it('should classify 500 as SERVER_ERROR', () => {
      const error = { response: { status: 500 }, message: 'Internal Server Error' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.SERVER_ERROR);
      expect(result.statusCode).toBe(500);
      expect(result.shouldRetry).toBe(false);
    });

    it('should classify 502 as SERVER_ERROR', () => {
      const error = { response: { status: 502 }, message: 'Bad Gateway' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.SERVER_ERROR);
      expect(result.statusCode).toBe(502);
    });

    it('should classify 503 as SERVER_ERROR', () => {
      const error = { response: { status: 503 }, message: 'Service Unavailable' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.SERVER_ERROR);
      expect(result.statusCode).toBe(503);
    });

    it('should include user-friendly message for server errors', () => {
      const error = { response: { status: 500 }, message: 'Error' };

      const result = classifyError(error);

      expect(result.userMessage).toContain('Server error');
      expect(result.userMessage).toContain('500');
    });
  });

  describe('Auth errors (401, 403)', () => {
    it('should classify 401 as AUTH_ERROR', () => {
      const error = { response: { status: 401 }, message: 'Unauthorized' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.AUTH_ERROR);
      expect(result.statusCode).toBe(401);
      expect(result.shouldRetry).toBe(false);
    });

    it('should classify 403 as AUTH_ERROR', () => {
      const error = { response: { status: 403 }, message: 'Forbidden' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.AUTH_ERROR);
      expect(result.statusCode).toBe(403);
    });

    it('should include user-friendly message for auth errors', () => {
      const error = { response: { status: 401 }, message: 'Error' };

      const result = classifyError(error);

      expect(result.userMessage).toContain('Authentication error');
    });
  });

  describe('Client errors (4xx)', () => {
    it('should classify 400 as CLIENT_ERROR', () => {
      const error = { response: { status: 400 }, message: 'Bad Request' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.CLIENT_ERROR);
      expect(result.statusCode).toBe(400);
      expect(result.shouldRetry).toBe(false);
    });

    it('should classify 404 as CLIENT_ERROR', () => {
      const error = { response: { status: 404 }, message: 'Not Found' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.CLIENT_ERROR);
      expect(result.statusCode).toBe(404);
    });

    it('should classify 422 as CLIENT_ERROR', () => {
      const error = { response: { status: 422 }, message: 'Unprocessable Entity' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.CLIENT_ERROR);
      expect(result.statusCode).toBe(422);
    });

    it('should include error message in user message for Error instances', () => {
      // classifyError only gets message from Error instances
      const error = new Error('Invalid input');
      // Add response to make it a client error
      (error as unknown as { response: { status: number } }).response = { status: 400 };

      const result = classifyError(error);

      expect(result.userMessage).toContain('Invalid input');
    });
  });

  describe('Certificate errors', () => {
    it('should classify MTLSError as CERTIFICATE_ERROR', () => {
      const error = new MTLSError(
        MTLSErrorType.CERTIFICATE_INVALID,
        'Certificate validation failed'
      );

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.CERTIFICATE_ERROR);
      expect(result.shouldRetry).toBe(true);
    });

    it('should extract status code from MTLSError but classify by status code first', () => {
      // Note: classifyError checks status code ranges BEFORE MTLSError instance check
      // So MTLSError with 4xx status is classified as CLIENT_ERROR
      const error = new MTLSError(
        MTLSErrorType.CONNECTION_FAILED,
        'Certificate error',
        undefined,
        495
      );

      const result = classifyError(error);

      // Status code 495 falls into 4xx range, so it's CLIENT_ERROR not CERTIFICATE_ERROR
      expect(result.category).toBe(ErrorCategory.CLIENT_ERROR);
      expect(result.statusCode).toBe(495);
    });

    it('should include user-friendly message for certificate errors', () => {
      const error = new MTLSError(MTLSErrorType.AUTHENTICATION_FAILED, 'SSL handshake failed');

      const result = classifyError(error);

      expect(result.userMessage).toContain('Certificate error');
    });
  });

  describe('Network errors', () => {
    it('should classify network error message as NETWORK_ERROR', () => {
      const error = new Error('Network request failed');

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK_ERROR);
      expect(result.shouldRetry).toBe(true);
    });

    it('should classify timeout error as NETWORK_ERROR', () => {
      const error = new Error('Request timeout');

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK_ERROR);
    });

    it('should classify connection error as NETWORK_ERROR', () => {
      const error = new Error('Connection refused');

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK_ERROR);
    });

    it('should include user-friendly message for network errors', () => {
      const error = new Error('Network unavailable');

      const result = classifyError(error);

      expect(result.userMessage).toContain('Network error');
    });
  });

  describe('Unknown errors', () => {
    it('should classify generic error as UNKNOWN_ERROR', () => {
      const error = new Error('Something went wrong');

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.UNKNOWN_ERROR);
      expect(result.shouldRetry).toBe(false);
    });

    it('should handle string errors', () => {
      const error = 'String error message';

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.UNKNOWN_ERROR);
      expect(result.message).toBe('String error message');
    });

    it('should handle null errors', () => {
      const result = classifyError(null);

      expect(result.category).toBe(ErrorCategory.UNKNOWN_ERROR);
    });

    it('should handle undefined errors', () => {
      const result = classifyError(undefined);

      expect(result.category).toBe(ErrorCategory.UNKNOWN_ERROR);
    });
  });

  describe('Status code extraction', () => {
    it('should extract status from response.status', () => {
      const error = { response: { status: 418 }, message: 'Teapot' };

      const result = classifyError(error);

      expect(result.statusCode).toBe(418);
    });

    it('should extract status from statusCode property', () => {
      const error = { statusCode: 429, message: 'Rate limited' };

      const result = classifyError(error);

      expect(result.statusCode).toBe(429);
    });
  });
});

describe('shouldReconfigureCertificate', () => {
  it('should return true for MTLSError', () => {
    const error = new MTLSError(MTLSErrorType.CERTIFICATE_EXPIRED, 'Certificate expired');

    const result = shouldReconfigureCertificate(error);

    expect(result).toBe(true);
  });

  it('should return false for non-certificate errors', () => {
    const error = new Error('Generic error');

    const result = shouldReconfigureCertificate(error);

    expect(result).toBe(false);
  });

  it('should return false for HTTP errors', () => {
    const error = { response: { status: 401 }, message: 'Unauthorized' };

    const result = shouldReconfigureCertificate(error);

    expect(result).toBe(false);
  });
});

describe('shouldRetryRequest', () => {
  it('should return true for retryable errors on first attempt', () => {
    const error = new Error('Network timeout');

    const result = shouldRetryRequest(error, false);

    expect(result).toBe(true);
  });

  it('should return false for retryable errors on retry attempt', () => {
    const error = new Error('Network timeout');

    const result = shouldRetryRequest(error, true);

    expect(result).toBe(false);
  });

  it('should return false for non-retryable errors', () => {
    const error = { response: { status: 400 }, message: 'Bad request' };

    const result = shouldRetryRequest(error, false);

    expect(result).toBe(false);
  });

  it('should return true for certificate errors on first attempt', () => {
    const error = new MTLSError(MTLSErrorType.CONNECTION_FAILED, 'SSL error');

    const result = shouldRetryRequest(error, false);

    expect(result).toBe(true);
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return user-friendly message for server errors', () => {
    const error = { response: { status: 500 }, message: 'Internal error' };

    const result = getUserFriendlyMessage(error);

    expect(result).toContain('Server error');
  });

  it('should return user-friendly message for auth errors', () => {
    const error = { response: { status: 401 }, message: 'Unauthorized' };

    const result = getUserFriendlyMessage(error);

    expect(result).toContain('Authentication error');
  });

  it('should return user-friendly message for network errors', () => {
    const error = new Error('Network failed');

    const result = getUserFriendlyMessage(error);

    expect(result).toContain('Network error');
  });

  it('should return user-friendly message for certificate errors', () => {
    const error = new MTLSError(MTLSErrorType.CERTIFICATE_INVALID, 'Certificate invalid');

    const result = getUserFriendlyMessage(error);

    expect(result).toContain('Certificate error');
  });
});
