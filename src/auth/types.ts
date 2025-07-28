/**
 * Authentication Types and Interfaces
 * Comprehensive type definitions for the enterprise auth system
 */

import type { CashierId, MerchantId, PointOfSaleId } from '@/types/branded';

/**
 * User roles in the A-Cube system with hierarchical structure
 */
export enum UserRole {
  // Core business roles
  ROLE_SUPPLIER = 'ROLE_SUPPLIER',         // Provider level
  ROLE_MERCHANT = 'ROLE_MERCHANT',         // Merchant level (includes cashier permissions)
  ROLE_CASHIER = 'ROLE_CASHIER',           // Cashier level (basic operations)
  
  // Administrative roles
  ROLE_ADMIN = 'ROLE_ADMIN',               // Administrative access
  ROLE_PREVIOUS_ADMIN = 'ROLE_PREVIOUS_ADMIN', // Former admin with limited access
  
  // MF1 Integration roles
  ROLE_ACUBE_MF1 = 'ROLE_ACUBE_MF1',       // A-Cube MF1 integration
  ROLE_EXTERNAL_MF1 = 'ROLE_EXTERNAL_MF1', // External MF1 integration
  ROLE_MF1 = 'ROLE_MF1',                   // Base MF1 access
}

/**
 * Simplified user role types for external APIs and UI
 */
export type SimpleUserRole = 'provider' | 'merchant' | 'cashier' | 'admin';

/**
 * Role hierarchy mapping - child roles inherit parent permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ROLE_SUPPLIER]: [
    UserRole.ROLE_MERCHANT,
    UserRole.ROLE_CASHIER,
    UserRole.ROLE_ADMIN,
    UserRole.ROLE_ACUBE_MF1,
    UserRole.ROLE_EXTERNAL_MF1,
  ],
  [UserRole.ROLE_MERCHANT]: [
    UserRole.ROLE_CASHIER,
  ],
  [UserRole.ROLE_CASHIER]: [],
  [UserRole.ROLE_ADMIN]: [
    UserRole.ROLE_PREVIOUS_ADMIN,
  ],
  [UserRole.ROLE_ACUBE_MF1]: [
    UserRole.ROLE_MF1,
  ],
  [UserRole.ROLE_EXTERNAL_MF1]: [
    UserRole.ROLE_MF1,
  ],
  [UserRole.ROLE_MF1]: [],
  [UserRole.ROLE_PREVIOUS_ADMIN]: [],
};

/**
 * Role to simple role mapping for backward compatibility
 */
export const ROLE_TO_SIMPLE: Record<UserRole, SimpleUserRole> = {
  [UserRole.ROLE_SUPPLIER]: 'provider',
  [UserRole.ROLE_MERCHANT]: 'merchant',
  [UserRole.ROLE_CASHIER]: 'cashier',
  [UserRole.ROLE_ADMIN]: 'admin',
  [UserRole.ROLE_PREVIOUS_ADMIN]: 'admin',
  [UserRole.ROLE_ACUBE_MF1]: 'provider',
  [UserRole.ROLE_EXTERNAL_MF1]: 'provider',
  [UserRole.ROLE_MF1]: 'provider',
};

/**
 * Simple role to full role mapping
 */
export const SIMPLE_TO_ROLE: Record<SimpleUserRole, UserRole> = {
  provider: UserRole.ROLE_SUPPLIER,
  merchant: UserRole.ROLE_MERCHANT,
  cashier: UserRole.ROLE_CASHIER,
  admin: UserRole.ROLE_ADMIN,
};

/**
 * OAuth2 token response from /mf1/login endpoint
 */
export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number; // seconds
  scope?: string;
}

/**
 * Decoded JWT token payload
 */
export interface JWTPayload {
  sub: string; // Subject (user ID)
  email: string;
  roles: UserRole[];
  permissions: string[];
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration (timestamp)
  nbf?: number; // Not before (timestamp)
  jti?: string; // JWT ID
  iss?: string; // Issuer
  aud?: string | string[]; // Audience
  
  // Role-specific data
  cashier_id?: CashierId;
  merchant_id?: MerchantId;
  point_of_sale_id?: PointOfSaleId;
  
  // Additional claims
  [key: string]: unknown;
}

/**
 * Login credentials for OAuth2 password grant
 */
export interface LoginCredentials {
  username: string;
  password: string;
  scope?: string;
  
  // Multi-factor authentication
  mfa_code?: string;
  
  // Device binding
  device_id?: string;
  device_name?: string;
  
  // Role specification during authentication
  preferred_role?: UserRole | SimpleUserRole;
  
  // Context-specific authentication
  context?: {
    merchant_id?: MerchantId;
    cashier_id?: CashierId;
    point_of_sale_id?: PointOfSaleId;
  };
}

/**
 * User information after successful authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  roles: UserRole[];
  permissions: string[];
  
  // Role-specific IDs
  cashier_id?: CashierId;
  merchant_id?: MerchantId;
  point_of_sale_id?: PointOfSaleId;
  
  // Session information
  session_id: string;
  last_login: Date;
  
  // Additional user attributes
  attributes?: Record<string, unknown>;
}

/**
 * Authentication state for the SDK
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // Timestamp
  error: AuthError | null;
}

/**
 * Stored authentication data (encrypted in storage)
 */
export interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
  user: AuthUser;
  encryptedAt: number;
  version: '1.0';
  
  // Device binding
  deviceId?: string;
  
  // Session metadata
  sessionMetadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
  };
}

/**
 * Authentication error types
 */
export const AuthErrorType = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_FAILED: 'REFRESH_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type AuthErrorType = typeof AuthErrorType[keyof typeof AuthErrorType];

/**
 * Authentication error with context
 */
export interface AuthError extends Error {
  type: AuthErrorType;
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  timestamp: number;
  recoverable: boolean;
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  refresh_token: string;
  grant_type: 'refresh_token';
  scope?: string;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  // OAuth2 endpoints
  loginUrl: string;
  refreshUrl: string;
  logoutUrl?: string;
  
  // Token management
  tokenRefreshBuffer: number; // Refresh X minutes before expiry (default: 5)
  maxRefreshAttempts: number; // Max retry attempts for refresh (default: 3)
  refreshRetryDelay: number; // Delay between retries in ms (default: 1000)
  
  // Storage
  storageKey: string; // Key for storing auth data (default: 'acube_auth')
  storageEncryption: boolean; // Enable encryption (default: true)
  
  // Session management
  sessionTimeout: number; // Session timeout in ms (default: 8 hours)
  maxConcurrentSessions: number; // Max sessions per user (default: 3)
  requireReauth: boolean; // Require re-authentication for sensitive operations
  
  // Security
  enableDeviceBinding: boolean; // Bind tokens to device (default: true)
  enableSessionValidation: boolean; // Validate session on each request
  enableTokenRotation: boolean; // Rotate refresh tokens on use
  
  // Performance optimization
  enablePerformanceOptimization?: boolean; // Enable caching and batching (default: true)
  performanceConfig?: {
    permissionCacheSize?: number;
    permissionCacheTTL?: number;
    roleCacheSize?: number;
    roleCacheTTL?: number;
    tokenValidationCacheSize?: number;
    tokenValidationCacheTTL?: number;
    maxBatchSize?: number;
    batchTimeoutMs?: number;
    enableMetrics?: boolean;
  };
  
  // Events
  onTokenRefresh?: (tokens: OAuth2TokenResponse) => void;
  onTokenExpired?: () => void;
  onAuthError?: (error: AuthError) => void;
  onSessionExpired?: () => void;
  onLogout?: (reason?: string) => void;
}

/**
 * Permission check request
 */
export interface PermissionCheck {
  resource: string;
  action: string;
  context?: Record<string, unknown>;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  granted: boolean;
  reason?: string;
  requiresApproval?: boolean;
  conditions?: Array<{
    type: string;
    satisfied: boolean;
    message?: string;
  }>;
}

/**
 * Token status information
 */
export interface TokenStatus {
  isValid: boolean;
  expiresIn: number; // Seconds until expiration
  isRefreshing: boolean;
  needsRefresh: boolean;
  lastRefreshed?: Date;
  refreshFailures: number;
}

/**
 * Authentication middleware configuration
 */
export interface AuthMiddlewareConfig {
  // Retry configuration
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  
  // Headers
  authHeaderName: string; // Default: 'Authorization'
  authScheme: string; // Default: 'Bearer'
  
  // Role headers
  includeRoleHeaders: boolean;
  roleHeaderName: string; // Default: 'X-User-Role'
  
  // Permission headers
  includePermissionHeaders: boolean;
  permissionHeaderName: string; // Default: 'X-User-Permissions'
  
  // Request context
  includeRequestContext: boolean;
  contextHeaders: Record<string, string>;
}

/**
 * Logout options
 */
export interface LogoutOptions {
  // Clear all sessions across devices
  clearAllSessions?: boolean;
  
  // Reason for logout
  reason?: 'user_initiated' | 'session_expired' | 'security' | 'token_invalid' | 'other';
  
  // Custom message
  message?: string;
  
  // Redirect after logout
  redirectUrl?: string;
  
  // Clean up local data
  clearLocalData?: boolean;
}

/**
 * Multi-factor authentication challenge
 */
export interface MFAChallenge {
  challengeId: string;
  type: 'totp' | 'sms' | 'email' | 'push';
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  
  // Device information
  deviceId?: string;
  deviceName?: string;
  deviceType?: 'web' | 'mobile' | 'desktop';
  
  // Location information
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Session metadata
  userAgent?: string;
  active: boolean;
}

/**
 * Role hierarchy and utility functions
 */

/**
 * Check if a user has a specific role (including inherited roles)
 */
export function hasRole(userRoles: UserRole[], requiredRole: UserRole): boolean {
  // Direct role match
  if (userRoles.includes(requiredRole)) {
    return true;
  }
  
  // Check if any user role grants the required role through hierarchy
  return userRoles.some(role => {
    const inheritedRoles = ROLE_HIERARCHY[role] || [];
    return inheritedRoles.includes(requiredRole);
  });
}

/**
 * Check if a user has any of the specified roles (including inherited roles)
 */
export function hasAnyRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => hasRole(userRoles, role));
}

/**
 * Get all effective roles for a user (including inherited roles)
 */
export function getEffectiveRoles(userRoles: UserRole[]): UserRole[] {
  const effectiveRoles = new Set(userRoles);
  
  // Add all inherited roles
  userRoles.forEach(role => {
    const inheritedRoles = ROLE_HIERARCHY[role] || [];
    inheritedRoles.forEach(inheritedRole => {
      effectiveRoles.add(inheritedRole);
    });
  });
  
  return Array.from(effectiveRoles);
}

/**
 * Get the highest priority role for a user (for display purposes)
 */
export function getPrimaryRole(userRoles: UserRole[]): UserRole | null {
  if (userRoles.length === 0) return null;
  
  // Priority order (highest to lowest)
  const rolePriority = [
    UserRole.ROLE_SUPPLIER,
    UserRole.ROLE_ADMIN,
    UserRole.ROLE_MERCHANT,
    UserRole.ROLE_ACUBE_MF1,
    UserRole.ROLE_EXTERNAL_MF1,
    UserRole.ROLE_CASHIER,
    UserRole.ROLE_MF1,
    UserRole.ROLE_PREVIOUS_ADMIN,
  ];
  
  for (const role of rolePriority) {
    if (userRoles.includes(role)) {
      return role;
    }
  }
  
  return userRoles[0] || null; // Fallback to first role
}

/**
 * Convert user roles to simple role for external APIs
 */
export function toSimpleRole(userRoles: UserRole[]): SimpleUserRole {
  const primaryRole = getPrimaryRole(userRoles);
  if (!primaryRole) return 'cashier'; // Default fallback
  
  return ROLE_TO_SIMPLE[primaryRole] || 'cashier';
}

/**
 * Auto-detect user role based on context and credentials
 */
export function autoDetectRole(context: {
  merchantId?: MerchantId;
  cashierId?: CashierId;
  pointOfSaleId?: PointOfSaleId;
  preferredRole?: UserRole | SimpleUserRole;
  userRoles?: UserRole[];
}): UserRole {
  // If preferred role is specified and user has permission, use it
  if (context.preferredRole && context.userRoles) {
    const targetRole = typeof context.preferredRole === 'string' && context.preferredRole in SIMPLE_TO_ROLE
      ? SIMPLE_TO_ROLE[context.preferredRole as SimpleUserRole]
      : context.preferredRole as UserRole;
      
    if (hasRole(context.userRoles, targetRole)) {
      return targetRole;
    }
  }
  
  // Auto-detect based on context
  if (context.cashierId && context.pointOfSaleId) {
    return UserRole.ROLE_CASHIER;
  }
  
  if (context.merchantId && !context.cashierId) {
    return UserRole.ROLE_MERCHANT;
  }
  
  if (!context.merchantId && !context.cashierId) {
    return UserRole.ROLE_SUPPLIER;
  }
  
  // Default fallback
  return UserRole.ROLE_CASHIER;
}

/**
 * Validate role transition (for role switching during session)
 */
export function canSwitchToRole(
  currentRoles: UserRole[],
  targetRole: UserRole,
  context?: {
    merchantId?: MerchantId;
    cashierId?: CashierId;
    pointOfSaleId?: PointOfSaleId;
  }
): boolean {
  // Check if user has permission for target role
  if (!hasRole(currentRoles, targetRole)) {
    return false;
  }
  
  // Additional context-based validation
  if (targetRole === UserRole.ROLE_CASHIER) {
    return !!(context?.cashierId && context?.pointOfSaleId);
  }
  
  if (targetRole === UserRole.ROLE_MERCHANT) {
    return !!context?.merchantId;
  }
  
  return true;
}