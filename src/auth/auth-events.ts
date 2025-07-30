/**
 * Authentication Events
 * Event definitions for auth state changes and notifications
 */

import type { AuthUser, AuthError, TokenStatus, OAuth2TokenResponse } from './types';

/**
 * Authentication event types
 */
export enum AuthEventType {
  // Authentication lifecycle
  LOGIN_START = 'auth:login:start',
  LOGIN_SUCCESS = 'auth:login:success',
  LOGIN_FAILURE = 'auth:login:failure',
  LOGOUT = 'auth:logout',

  // Token management
  TOKEN_REFRESH_START = 'auth:token:refresh:start',
  TOKEN_REFRESH_SUCCESS = 'auth:token:refresh:success',
  TOKEN_REFRESH_FAILURE = 'auth:token:refresh:failure',
  TOKEN_EXPIRED = 'auth:token:expired',
  TOKEN_REVOKED = 'auth:token:revoked',

  // Session management
  SESSION_CREATED = 'auth:session:created',
  SESSION_RESTORED = 'auth:session:restored',
  SESSION_EXPIRED = 'auth:session:expired',
  SESSION_TERMINATED = 'auth:session:terminated',

  // User state
  USER_UPDATED = 'auth:user:updated',
  ROLE_CHANGED = 'auth:role:changed',
  PERMISSION_CHANGED = 'auth:permission:changed',

  // Security events
  SECURITY_WARNING = 'auth:security:warning',
  UNAUTHORIZED_ACCESS = 'auth:security:unauthorized',
  MFA_REQUIRED = 'auth:security:mfa:required',
  MFA_COMPLETED = 'auth:security:mfa:completed',

  // Storage events
  STORAGE_ERROR = 'auth:storage:error',
  STORAGE_CLEARED = 'auth:storage:cleared',

  // Network events
  NETWORK_ERROR = 'auth:network:error',
  API_RATE_LIMITED = 'auth:api:rate_limited',
}

/**
 * Base authentication event
 */
export interface BaseAuthEvent {
  type: AuthEventType;
  timestamp: Date;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Login start event
 */
export interface LoginStartEvent extends BaseAuthEvent {
  type: AuthEventType.LOGIN_START;
  data: {
    username: string;
    hasPassword: boolean;
    hasMFA?: boolean;
    deviceId?: string;
  };
}

/**
 * Login success event
 */
export interface LoginSuccessEvent extends BaseAuthEvent {
  type: AuthEventType.LOGIN_SUCCESS;
  data: {
    user: AuthUser;
    tokens: OAuth2TokenResponse;
    isFirstLogin: boolean;
    loginMethod: 'password' | 'refresh' | 'sso';
  };
}

/**
 * Login failure event
 */
export interface LoginFailureEvent extends BaseAuthEvent {
  type: AuthEventType.LOGIN_FAILURE;
  data: {
    error: AuthError;
    username?: string;
    attemptNumber: number;
    remainingAttempts?: number;
  };
}

/**
 * Logout event
 */
export interface LogoutEvent extends BaseAuthEvent {
  type: AuthEventType.LOGOUT;
  data: {
    userId: string;
    reason: 'user_initiated' | 'session_expired' | 'security' | 'token_invalid' | 'other';
    message?: string;
    clearAllSessions: boolean;
  };
}

/**
 * Token refresh start event
 */
export interface TokenRefreshStartEvent extends BaseAuthEvent {
  type: AuthEventType.TOKEN_REFRESH_START;
  data: {
    reason: 'expiry_approaching' | 'token_expired' | 'manual' | 'retry';
    attemptNumber: number;
    tokenStatus: TokenStatus;
  };
}

/**
 * Token refresh success event
 */
export interface TokenRefreshSuccessEvent extends BaseAuthEvent {
  type: AuthEventType.TOKEN_REFRESH_SUCCESS;
  data: {
    tokens: OAuth2TokenResponse;
    oldExpiresAt: number;
    newExpiresAt: number;
    attemptNumber: number;
  };
}

/**
 * Token refresh failure event
 */
export interface TokenRefreshFailureEvent extends BaseAuthEvent {
  type: AuthEventType.TOKEN_REFRESH_FAILURE;
  data: {
    error: AuthError;
    attemptNumber: number;
    willRetry: boolean;
    nextRetryAt?: Date;
  };
}

/**
 * Token expired event
 */
export interface TokenExpiredEvent extends BaseAuthEvent {
  type: AuthEventType.TOKEN_EXPIRED;
  data: {
    expiredAt: Date;
    wasRefreshAttempted: boolean;
    refreshFailed: boolean;
  };
}

/**
 * Session created event
 */
export interface SessionCreatedEvent extends BaseAuthEvent {
  type: AuthEventType.SESSION_CREATED;
  data: {
    sessionId: string;
    userId: string;
    expiresAt: Date;
    deviceId?: string;
    location?: string;
  };
}

/**
 * Session restored event
 */
export interface SessionRestoredEvent extends BaseAuthEvent {
  type: AuthEventType.SESSION_RESTORED;
  data: {
    sessionId: string;
    user: AuthUser;
    remainingTime: number; // milliseconds
    source: 'storage' | 'memory' | 'cookie';
  };
}

/**
 * Session expired event
 */
export interface SessionExpiredEvent extends BaseAuthEvent {
  type: AuthEventType.SESSION_EXPIRED;
  data: {
    sessionId: string;
    userId: string;
    expiredAt: Date;
    reason: 'timeout' | 'revoked' | 'concurrent_limit';
  };
}

/**
 * User updated event
 */
export interface UserUpdatedEvent extends BaseAuthEvent {
  type: AuthEventType.USER_UPDATED;
  data: {
    userId: string;
    changes: Partial<AuthUser>;
    updatedBy: 'system' | 'user' | 'admin';
  };
}

/**
 * Role changed event
 */
export interface RoleChangedEvent extends BaseAuthEvent {
  type: AuthEventType.ROLE_CHANGED;
  data: {
    userId: string;
    oldRoles: string[];
    newRoles: string[];
    changedBy: string;
    reason?: string;
  };
}

/**
 * Security warning event
 */
export interface SecurityWarningEvent extends BaseAuthEvent {
  type: AuthEventType.SECURITY_WARNING;
  data: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    code: string;
    message: string;
    details?: Record<string, unknown>;
    action?: 'none' | 'logout' | 'require_mfa' | 'lock_account';
  };
}

/**
 * Unauthorized access event
 */
export interface UnauthorizedAccessEvent extends BaseAuthEvent {
  type: AuthEventType.UNAUTHORIZED_ACCESS;
  data: {
    userId?: string;
    resource: string;
    action: string;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Storage error event
 */
export interface StorageErrorEvent extends BaseAuthEvent {
  type: AuthEventType.STORAGE_ERROR;
  data: {
    operation: 'read' | 'write' | 'delete' | 'clear' | 'initialize';
    error: Error;
    key?: string;
    fallbackUsed: boolean;
  };
}

/**
 * Network error event
 */
export interface NetworkErrorEvent extends BaseAuthEvent {
  type: AuthEventType.NETWORK_ERROR;
  data: {
    operation: 'login' | 'refresh' | 'logout' | 'validate';
    error: Error;
    endpoint: string;
    statusCode?: number;
    willRetry: boolean;
  };
}

/**
 * All authentication events union type
 */
export type AuthEvent =
  | LoginStartEvent
  | LoginSuccessEvent
  | LoginFailureEvent
  | LogoutEvent
  | TokenRefreshStartEvent
  | TokenRefreshSuccessEvent
  | TokenRefreshFailureEvent
  | TokenExpiredEvent
  | SessionCreatedEvent
  | SessionRestoredEvent
  | SessionExpiredEvent
  | UserUpdatedEvent
  | RoleChangedEvent
  | SecurityWarningEvent
  | UnauthorizedAccessEvent
  | StorageErrorEvent
  | NetworkErrorEvent;

/**
 * Authentication event handler type
 */
export type AuthEventHandler<T extends AuthEvent = AuthEvent> = (event: T) => void | Promise<void>;

/**
 * Authentication event listener map
 */
export type AuthEventListeners = {
  [K in AuthEventType]?: AuthEventHandler<Extract<AuthEvent, { type: K }>>;
};

/**
 * Helper to create auth events
 */
export function createAuthEvent<T extends AuthEvent>(
  type: T['type'],
  data: T['data'],
  metadata?: Record<string, unknown>,
): T {
  return {
    type,
    timestamp: new Date(),
    requestId: `auth_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    data,
    metadata,
  } as T;
}
