import type { UserRoles } from '@/domain/value-objects';

export interface CertificateConfig {
  storagePrefix?: string;
  metadataKey?: string;
}

export interface SDKConfig {
  apiUrl: string;
  authUrl: string;
  debug?: boolean;
  /** Enable PEM telemetry (GET /mf1/pems/telemetry). Default: false */
  telemetryEnabled?: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
}

export interface JWTPayload {
  iat: number;
  exp: number;
  roles: Record<string, string[]>;
  username: string;
  uid: number;
  fid: string;
  pid: string | null;
}

export interface StoredTokenData {
  accessToken: string;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;
  fid: string;
  pid: string | null;
  expiresAt: number;
}

export interface IUserProvider {
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
}

export interface APIViolation {
  propertyPath: string;
  message: string;
}

export interface APIError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  violations?: APIViolation[];
}

export type SDKError =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'FORBIDDEN_ERROR'
  | 'UNKNOWN_ERROR'
  | 'STORAGE_CERTIFICATE_ERROR'
  | 'CERTIFICATE_MANAGER_NOT_INITIALIZED'
  | 'SDK_INITIALIZATION_ERROR'
  | 'SDK_NOT_INITIALIZED'
  | 'SDK_ALREADY_CONFIGURED'
  | 'SDK_NOT_CONFIGURED'
  | 'ADAPTERS_NOT_AVAILABLE'
  | 'API_CLIENT_NOT_INITIALIZED'
  | 'MTLS_ADAPTER_NOT_AVAILABLE'
  | 'CERTIFICATE_INFO_ERROR'
  | 'TELEMETRY_DISABLED';

export class ACubeSDKError extends Error {
  public violations?: APIViolation[];
  public responseData?: unknown;

  constructor(
    public type: SDKError,
    message: string,
    public originalError?: unknown,
    public statusCode?: number,
    violations?: APIViolation[],
    responseData?: unknown
  ) {
    super(message);
    this.name = 'ACubeSDKError';
    this.violations = violations;
    this.responseData = responseData;
  }
}
