import { MTLSError, MTLSErrorType } from '../mtls.error';

describe('mtls.error', () => {
  describe('MTLSErrorType', () => {
    it('should have all 7 error type values', () => {
      const expectedTypes = [
        'MTLS_NOT_SUPPORTED',
        'MTLS_CERTIFICATE_NOT_FOUND',
        'MTLS_CERTIFICATE_EXPIRED',
        'MTLS_CERTIFICATE_INVALID',
        'MTLS_CONNECTION_FAILED',
        'MTLS_AUTHENTICATION_FAILED',
        'MTLS_CONFIGURATION_ERROR',
      ];

      const actualTypes = Object.values(MTLSErrorType);

      expect(actualTypes).toHaveLength(7);
      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
    });
  });

  describe('MTLSError', () => {
    it('should set type and message properties', () => {
      const error = new MTLSError(MTLSErrorType.CERTIFICATE_NOT_FOUND, 'Certificate not found');

      expect(error.type).toBe(MTLSErrorType.CERTIFICATE_NOT_FOUND);
      expect(error.message).toBe('Certificate not found');
    });

    it('should preserve originalError when provided', () => {
      const originalError = new Error('Original error');
      const error = new MTLSError(
        MTLSErrorType.CONNECTION_FAILED,
        'Connection failed',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should set statusCode when provided', () => {
      const error = new MTLSError(
        MTLSErrorType.AUTHENTICATION_FAILED,
        'Auth failed',
        undefined,
        401
      );

      expect(error.statusCode).toBe(401);
    });

    it('should have name equal to MTLSError', () => {
      const error = new MTLSError(MTLSErrorType.NOT_SUPPORTED, 'Not supported');

      expect(error.name).toBe('MTLSError');
    });

    it('should be an instance of Error', () => {
      const error = new MTLSError(MTLSErrorType.CERTIFICATE_INVALID, 'Invalid certificate');

      expect(error).toBeInstanceOf(Error);
    });
  });
});
