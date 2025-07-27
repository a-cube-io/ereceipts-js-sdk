/**
 * Tests for Error Handling System
 * Tests the comprehensive error types and error creation utilities
 */

import {
  ACubeSDKError,
  ValidationError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  FiscalError,
  ServerError,
  TimeoutError,
  createErrorFromResponse,
} from '@/errors/index';

describe('Error System', () => {
  describe('ACubeSDKError Base Class', () => {
    it('should create base error with required properties', () => {
      class TestError extends ACubeSDKError {
        constructor(message: string, operation: string) {
          super(message, 'TEST_ERROR', { operation });
        }
      }

      const error = new TestError('Test error message', 'test_operation');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.operation).toBe('test_operation');
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(typeof error.requestId).toBe('string');
    });

    it('should create error with all optional properties', () => {
      class TestError extends ACubeSDKError {
        constructor() {
          super('Full error', 'FULL_ERROR', {
            operation: 'full_test',
            retryable: true,
            statusCode: 500,
            requestId: 'req_12345',
            auditInfo: {
              userId: 'user_123',
              timestamp: new Date().toISOString(),
              operation: 'full_test',
              metadata: { key: 'value' }
            },
            cause: new Error('Original error')
          });
        }
      }

      const error = new TestError();

      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(500);
      expect(error.requestId).toBe('req_12345');
      expect(error.auditInfo).toEqual(expect.objectContaining({
        userId: 'user_123',
        operation: 'full_test',
        metadata: { key: 'value' }
      }));
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause?.message).toBe('Original error');
    });

    it('should serialize to JSON correctly', () => {
      class TestError extends ACubeSDKError {
        constructor() {
          super('JSON test', 'JSON_ERROR', {
            operation: 'json_test',
            statusCode: 400,
            retryable: true
          });
        }
      }

      const error = new TestError();
      const json = error.toJSON();

      expect(json).toEqual(expect.objectContaining({
        name: 'TestError',
        message: 'JSON test',
        code: 'JSON_ERROR',
        operation: 'json_test',
        statusCode: 400,
        retryable: true,
        timestamp: expect.any(String),
        requestId: expect.any(String)
      }));
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with violations', () => {
      const violations = [
        { field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' },
        { field: 'password', message: 'Password too weak', code: 'WEAK_PASSWORD' }
      ];

      const error = new ValidationError('Validation failed', 'user_registration', violations);

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.operation).toBe('user_registration');
      expect(error.retryable).toBe(false);
      expect(error.violations).toEqual(violations);
    });

    it('should work with empty violations array', () => {
      const error = new ValidationError('Generic validation error', 'test_op', []);

      expect(error.violations).toEqual([]);
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const originalError = new Error('Connection refused');
      const error = new NetworkError('Failed to connect', 'api_call', originalError);

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.cause).toBe(originalError);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid API key', 'authenticate_user');

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError('Access denied', 'access_protected_resource');

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry info', () => {
      const error = new RateLimitError('Too many requests', 'api_call', 60);

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });

    it('should create rate limit error without retry info', () => {
      const error = new RateLimitError('Rate limited', 'api_call');

      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('FiscalError', () => {
    it('should create fiscal compliance error', () => {
      const error = new FiscalError('Invalid VAT number', 'validate_vat');

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(FiscalError);
      expect(error.code).toBe('FISCAL_ERROR');
      expect(error.retryable).toBe(false);
    });
  });

  describe('ServerError', () => {
    it('should create server error', () => {
      const error = new ServerError('Internal server error', 'process_request');

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(ServerError);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('Request timeout', 'api_call', 5000);

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.timeout).toBe(5000);
    });
  });

  describe('createErrorFromResponse', () => {
    it('should create ValidationError for 422 responses', () => {
      const response = {
        status: 422,
        statusText: 'Unprocessable Entity',
        data: {
          status: 422,
          violations: [
            { propertyPath: 'email', message: 'Invalid email' }
          ]
        }
      };

      const error = createErrorFromResponse(response, 'user_creation');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(422);
      expect((error as ValidationError).violations).toHaveLength(1);
    });

    it('should create AuthenticationError for 401 responses', () => {
      const response = {
        status: 401,
        statusText: 'Unauthorized',
        data: {
          type: '/errors/401',
          title: 'Unauthorized',
          detail: 'Invalid credentials'
        }
      };

      const error = createErrorFromResponse(response, 'authenticate');

      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('Invalid credentials');
    });

    it('should create AuthorizationError for 403 responses', () => {
      const response = {
        status: 403,
        statusText: 'Forbidden',
        data: {
          type: '/errors/403',
          title: 'Forbidden',
          detail: 'Access denied'
        }
      };

      const error = createErrorFromResponse(response, 'access_resource');

      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.statusCode).toBe(403);
    });

    it('should create RateLimitError for 429 responses', () => {
      const response = {
        status: 429,
        statusText: 'Too Many Requests',
        data: {},
        headers: {
          'retry-after': '60'
        }
      };

      const error = createErrorFromResponse(response, 'api_call');

      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.statusCode).toBe(429);
      expect((error as RateLimitError).retryAfter).toBe(60);
    });

    it('should create ServerError for 500 responses', () => {
      const response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {
          type: '/errors/500',
          title: 'Internal Server Error',
          detail: 'Something went wrong'
        }
      };

      const error = createErrorFromResponse(response, 'process_data');

      expect(error).toBeInstanceOf(ServerError);
      expect(error.statusCode).toBe(500);
    });

    it('should create generic ACubeSDKError for unknown status codes', () => {
      const response = {
        status: 418,
        statusText: "I'm a teapot",
        data: { message: 'Teapot error' }
      };

      const error = createErrorFromResponse(response, 'make_coffee');

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('HTTP_ERROR');
    });

    it('should handle responses without data', () => {
      const response = {
        status: 404,
        statusText: 'Not Found'
      };

      const error = createErrorFromResponse(response, 'find_resource');

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Not Found');
    });

    it('should handle responses with string data', () => {
      const response = {
        status: 400,
        statusText: 'Bad Request',
        data: 'Invalid request format'
      };

      const error = createErrorFromResponse(response, 'parse_request');

      expect(error).toBeInstanceOf(ACubeSDKError);
      expect(error.message).toContain('Invalid request format');
    });

    it('should include requestId when provided', () => {
      const response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {}
      };

      const error = createErrorFromResponse(response, 'test_op', 'req_123456');

      expect(error.requestId).toBe('req_123456');
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError('Test', 'test_op', []);
      const networkError = new NetworkError('Test', 'test_op');
      const authError = new AuthenticationError('Test', 'test_op');

      expect(validationError instanceof Error).toBe(true);
      expect(validationError instanceof ACubeSDKError).toBe(true);
      expect(validationError instanceof ValidationError).toBe(true);

      expect(networkError instanceof Error).toBe(true);
      expect(networkError instanceof ACubeSDKError).toBe(true);
      expect(networkError instanceof NetworkError).toBe(true);

      expect(authError instanceof Error).toBe(true);
      expect(authError instanceof ACubeSDKError).toBe(true);
      expect(authError instanceof AuthenticationError).toBe(true);
    });

    it('should have correct error names', () => {
      const errors = [
        new ValidationError('Test', 'test', []),
        new NetworkError('Test', 'test'),
        new AuthenticationError('Test', 'test'),
        new AuthorizationError('Test', 'test'),
        new RateLimitError('Test', 'test'),
        new FiscalError('Test', 'test'),
        new ServerError('Test', 'test'),
        new TimeoutError('Test', 'test', 1000)
      ];

      const expectedNames = [
        'ValidationError',
        'NetworkError',
        'AuthenticationError',
        'AuthorizationError',
        'RateLimitError',
        'FiscalError',
        'ServerError',
        'TimeoutError'
      ];

      errors.forEach((error, index) => {
        expect(error.name).toBe(expectedNames[index]);
      });
    });
  });

  describe('Error Stacks and Debugging', () => {
    it('should preserve stack traces', () => {
      const error = new ValidationError('Test error', 'test_operation', []);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toContain('ValidationError');
    });

    it('should chain errors properly', () => {
      const originalError = new Error('Original problem');
      const networkError = new NetworkError('Network failed', 'api_call', originalError);

      expect(networkError.cause).toBe(originalError);
      expect(networkError.message).toBe('Network failed');
      expect(networkError.cause?.message).toBe('Original problem');
    });
  });
});