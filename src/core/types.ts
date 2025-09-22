/**
 * Core SDK types
 */

import type { UserRoles } from './roles';

export type Environment = 'production' | 'development' | 'sandbox';

/**
 * Certificate management configuration
 */
export interface CertificateConfig {
  storagePrefix?: string;
  metadataKey?: string;
}

/**
 * SDK Configuration
 */
export interface SDKConfig {
  environment: Environment;
  apiUrl?: string;
  authUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  debug?: boolean;
  customHeaders?: Record<string, string>;
  certificateConfig?: CertificateConfig;
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Token response from auth server
 */
export interface TokenResponse {
  token: string;
}

/**
 * JWT Token payload structure
 */
export interface JWTPayload {
  iat: number;
  exp: number;
  roles: Record<string, string[]>;
  username: string;
  uid: number;
  fid: string;
  pid: string | null;
}

/**
 * Stored token data
 */
export interface StoredTokenData {
  accessToken: string;
  expiresAt: number;
}

/**
 * User information
 */
export interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;
  fid: string;
  pid: string | null;
}

/**
 * User provider interface for accessing current user information
 */
export interface IUserProvider {
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): Promise<boolean>;
}

/**
 * API Error response
 */
export interface APIError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

/**
 * SDK Error types
 */
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
  | 'API_CLIENT_NOT_INITIALIZED';

/**
 * SDK Exception class
 */
export class ACubeSDKError extends Error {
  constructor(
    public type: SDKError,
    message: string,
    public originalError?: any,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ACubeSDKError';
  }
}