import axios, { AxiosError } from 'axios';

import { ACubeSDKError } from '@/shared/types';

import { transformError } from '../error-transformer';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  isAxiosError: jest.fn(),
}));

const mockedIsAxiosError = axios.isAxiosError as jest.MockedFunction<typeof axios.isAxiosError>;

describe('transformError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Axios errors with response', () => {
    it('should return VALIDATION_ERROR for status 400', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 400,
          data: { detail: 'Bad request' },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result).toBeInstanceOf(ACubeSDKError);
      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Bad request');
      expect(result.statusCode).toBe(400);
    });

    it('should return AUTH_ERROR for status 401', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 401,
          data: { detail: 'Unauthorized' },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result.type).toBe('AUTH_ERROR');
      expect(result.statusCode).toBe(401);
    });

    it('should return FORBIDDEN_ERROR for status 403', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 403,
          data: { detail: 'Forbidden' },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result.type).toBe('FORBIDDEN_ERROR');
      expect(result.statusCode).toBe(403);
    });

    it('should return NOT_FOUND_ERROR for status 404', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 404,
          data: { detail: 'Resource not found' },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result.type).toBe('NOT_FOUND_ERROR');
      expect(result.statusCode).toBe(404);
    });

    it('should return VALIDATION_ERROR for status 422', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 422,
          data: { detail: 'Unprocessable entity' },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.statusCode).toBe(422);
    });

    it('should return UNKNOWN_ERROR for status 500', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result.type).toBe('UNKNOWN_ERROR');
      expect(result.statusCode).toBe(500);
    });
  });

  describe('Error message extraction', () => {
    it('should use data.detail when present', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Specific detail message',
            title: 'General title',
          },
        },
        message: 'Axios error message',
      } as AxiosError;

      const result = transformError(error);

      expect(result.message).toBe('Specific detail message');
    });

    it('should use data.title when detail is not present', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 400,
          data: {
            title: 'Title message',
          },
        },
        message: 'Axios error message',
      } as AxiosError;

      const result = transformError(error);

      expect(result.message).toBe('Title message');
    });

    it('should use error.message when neither detail nor title is present', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 400,
          data: {},
        },
        message: 'Axios error message',
      } as AxiosError;

      const result = transformError(error);

      expect(result.message).toBe('Axios error message');
    });

    it('should use default message when no other message is available', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 400,
          data: null,
        },
        message: '',
      } as unknown as AxiosError;

      const result = transformError(error);

      expect(result.message).toBe('Unknown error occurred');
    });
  });

  describe('Violations handling', () => {
    it('should preserve violations array in ACubeSDKError', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const violations = [
        { propertyPath: 'email', message: 'Invalid email format' },
        { propertyPath: 'password', message: 'Password too short' },
      ];
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Validation failed',
            violations,
          },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result.violations).toEqual(violations);
      expect(result.violations).toHaveLength(2);
    });

    it('should handle undefined violations', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Error without violations',
          },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = transformError(error);

      expect(result.violations).toBeUndefined();
    });
  });

  describe('Network errors', () => {
    it('should return NETWORK_ERROR for Axios error without response', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const error = {
        message: 'Network Error',
        response: undefined,
      } as AxiosError;

      const result = transformError(error);

      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Network error occurred');
      expect(result.statusCode).toBeUndefined();
    });
  });

  describe('Non-Axios errors', () => {
    it('should return UNKNOWN_ERROR for generic Error', () => {
      mockedIsAxiosError.mockReturnValue(false);
      const error = new Error('Generic error');

      const result = transformError(error);

      expect(result.type).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should return UNKNOWN_ERROR for string error', () => {
      mockedIsAxiosError.mockReturnValue(false);
      const error = 'String error message';

      const result = transformError(error);

      expect(result.type).toBe('UNKNOWN_ERROR');
      expect(result.originalError).toBe('String error message');
    });

    it('should return UNKNOWN_ERROR for null', () => {
      mockedIsAxiosError.mockReturnValue(false);

      const result = transformError(null);

      expect(result.type).toBe('UNKNOWN_ERROR');
    });

    it('should return UNKNOWN_ERROR for undefined', () => {
      mockedIsAxiosError.mockReturnValue(false);

      const result = transformError(undefined);

      expect(result.type).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Original error preservation', () => {
    it('should preserve original error in ACubeSDKError', () => {
      mockedIsAxiosError.mockReturnValue(true);
      const originalError = {
        response: {
          status: 400,
          data: { detail: 'Test error' },
        },
        message: 'Test',
      } as AxiosError;

      const result = transformError(originalError);

      expect(result.originalError).toBe(originalError);
    });
  });
});
