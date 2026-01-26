export enum MTLSErrorType {
  NOT_SUPPORTED = 'MTLS_NOT_SUPPORTED',
  CERTIFICATE_NOT_FOUND = 'MTLS_CERTIFICATE_NOT_FOUND',
  CERTIFICATE_EXPIRED = 'MTLS_CERTIFICATE_EXPIRED',
  CERTIFICATE_INVALID = 'MTLS_CERTIFICATE_INVALID',
  CONNECTION_FAILED = 'MTLS_CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'MTLS_AUTHENTICATION_FAILED',
  CONFIGURATION_ERROR = 'MTLS_CONFIGURATION_ERROR',
}

export class MTLSError extends Error {
  constructor(
    public type: MTLSErrorType,
    message: string,
    public originalError?: Error,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'MTLSError';
  }
}
