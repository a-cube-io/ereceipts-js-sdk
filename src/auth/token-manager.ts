/**
 * Token Manager
 * Handles JWT token parsing, validation, and automatic refresh
 */

import type { HttpClient } from '@/http/client';

import { EventEmitter } from 'eventemitter3';

import { AuthErrorType } from './types';
import {
  AuthEventType,
  createAuthEvent,
  type TokenExpiredEvent,
  type TokenRefreshStartEvent,
  type TokenRefreshFailureEvent,
  type TokenRefreshSuccessEvent,
} from './auth-events';

import type {
  AuthError,
  JWTPayload,
  TokenStatus,
  OAuth2TokenResponse,
  TokenRefreshRequest,
} from './types';

interface TokenManagerConfig {
  refreshUrl: string;
  tokenRefreshBuffer: number; // minutes before expiry to refresh
  maxRefreshAttempts: number;
  refreshRetryDelay: number; // milliseconds
  enableTokenRotation: boolean;
  onTokenRefresh?: (tokens: OAuth2TokenResponse) => void;
  onTokenExpired?: () => void;
}

const DEFAULT_CONFIG: TokenManagerConfig = {
  refreshUrl: '/token/refresh',
  tokenRefreshBuffer: 5, // 5 minutes
  maxRefreshAttempts: 3,
  refreshRetryDelay: 1000,
  enableTokenRotation: true,
};

/**
 * Manages JWT tokens with automatic refresh
 */
export class TokenManager extends EventEmitter {
  private config: TokenManagerConfig;

  private httpClient: HttpClient;

  private refreshTimer: NodeJS.Timeout | null = null;

  private refreshPromise: Promise<OAuth2TokenResponse> | null = null;

  private refreshAttempts = 0;

  private currentTokens: {
    access: string | null;
    refresh: string | null;
    expiresAt: number | null;
  } = {
    access: null,
    refresh: null,
    expiresAt: null,
  };

  constructor(httpClient: HttpClient, config: Partial<TokenManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.httpClient = httpClient;
  }

  /**
   * Set tokens and start refresh timer
   */
  setTokens(tokens: OAuth2TokenResponse): void {
    // Parse and validate access token
    const payload = this.parseToken(tokens.access_token);
    if (!payload) {
      throw this.createAuthError(
        'TOKEN_INVALID',
        'Invalid access token format',
      );
    }

    // Calculate expiration
    const expiresAt = payload.exp * 1000; // Convert to milliseconds

    // Store tokens
    this.currentTokens = {
      access: tokens.access_token,
      refresh: tokens.refresh_token,
      expiresAt,
    };

    // Reset refresh attempts
    this.refreshAttempts = 0;

    // Start refresh timer
    this.scheduleRefresh(expiresAt);
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    // Check if token exists and is not expired
    if (this.currentTokens.access && this.currentTokens.expiresAt) {
      if (Date.now() < this.currentTokens.expiresAt) {
        return this.currentTokens.access;
      }
    }
    return null;
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return this.currentTokens.refresh;
  }

  /**
   * Get token status
   */
  getTokenStatus(): TokenStatus {
    const now = Date.now();
    const expiresAt = this.currentTokens.expiresAt || 0;
    const expiresIn = Math.max(0, expiresAt - now);
    const bufferMs = this.config.tokenRefreshBuffer * 60 * 1000;

    return {
      isValid: !!this.currentTokens.access && now < expiresAt,
      expiresIn: Math.floor(expiresIn / 1000), // seconds
      isRefreshing: this.refreshPromise !== null,
      needsRefresh: expiresIn < bufferMs && expiresIn > 0,
      refreshFailures: this.refreshAttempts,
    };
  }

  /**
   * Parse JWT token
   */
  parseToken(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode payload (base64url)
      const payload = parts[1];
      if (!payload) {
        return null;
      }
      const decoded = this.base64UrlDecode(payload);
      return JSON.parse(decoded) as JWTPayload;
    } catch (error) {
      console.error('Failed to parse JWT token:', error);
      return null;
    }
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): { valid: boolean; reason?: string } {
    const payload = this.parseToken(token);
    if (!payload) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.exp && payload.exp < now) {
      return { valid: false, reason: 'Token expired' };
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      return { valid: false, reason: 'Token not yet valid' };
    }

    // Check required claims
    if (!payload.sub || !payload.email || !payload.roles) {
      return { valid: false, reason: 'Missing required claims' };
    }

    return { valid: true };
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(): Promise<OAuth2TokenResponse> {
    // If already refreshing, return existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Check if we have a refresh token
    if (!this.currentTokens.refresh) {
      throw this.createAuthError(
        'REFRESH_FAILED',
        'No refresh token available',
      );
    }

    // Emit refresh start event
    this.emitRefreshStart();

    // Create refresh promise
    this.refreshPromise = this.performRefresh()
      .then((tokens) => {
        // Success - update tokens
        this.setTokens(tokens);
        this.emitRefreshSuccess(tokens);
        this.refreshPromise = null;

        // Call callback if provided
        if (this.config.onTokenRefresh) {
          this.config.onTokenRefresh(tokens);
        }

        return tokens;
      })
      .catch((error) => {
        // Failure - handle error
        this.refreshPromise = null;
        this.emitRefreshFailure(error);

        // Check if we should retry
        if (this.refreshAttempts < this.config.maxRefreshAttempts) {
          // Schedule retry
          return new Promise<OAuth2TokenResponse>((resolve, reject) => {
            setTimeout(() => {
              this.refreshTokens().then(resolve).catch(reject);
            }, this.config.refreshRetryDelay * 2**(this.refreshAttempts - 1)) as unknown as NodeJS.Timeout;
          });
        }

        // Max attempts reached - emit expiry and throw
        this.emitTokenExpired();
        if (this.config.onTokenExpired) {
          this.config.onTokenExpired();
        }

        throw error;
      });

    return this.refreshPromise;
  }

  /**
   * Perform the actual refresh request
   */
  private async performRefresh(): Promise<OAuth2TokenResponse> {
    this.refreshAttempts++;

    const request: TokenRefreshRequest = {
      refresh_token: this.currentTokens.refresh!,
      grant_type: 'refresh_token',
    };

    try {
      const response = await this.httpClient.post<OAuth2TokenResponse>(
        this.config.refreshUrl,
        request,
        {
          skipRetry: false, // Allow retries for refresh
          metadata: { isTokenRefresh: true },
        },
      );

      // Validate response
      if (!response.data.access_token || !response.data.refresh_token) {
        throw this.createAuthError(
          'REFRESH_FAILED',
          'Invalid refresh response',
        );
      }

      // Handle token rotation
      if (this.config.enableTokenRotation) {
        // The new refresh token should be different
        if (response.data.refresh_token === this.currentTokens.refresh) {
          console.warn('Refresh token was not rotated');
        }
      }

      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error && 'statusCode' in error) {
        const {statusCode} = (error as any);

        if (statusCode === 401 || statusCode === 403) {
          // Refresh token invalid or expired
          throw this.createAuthError(
            'TOKEN_INVALID',
            'Refresh token is invalid or expired',
            error,
          );
        }
      }

      throw this.createAuthError(
        'REFRESH_FAILED',
        'Failed to refresh token',
        error,
      );
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleRefresh(expiresAt: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const now = Date.now();
    const bufferMs = this.config.tokenRefreshBuffer * 60 * 1000;
    const refreshAt = expiresAt - bufferMs;
    const delay = Math.max(0, refreshAt - now);

    // Don't schedule if token is already expired or about to expire
    if (delay <= 0) {
      // Refresh immediately
      this.refreshTokens().catch((error) => {
        console.error('Immediate token refresh failed:', error);
      });
      return;
    }

    // Schedule refresh
    this.refreshTimer = setTimeout(() => {
      this.refreshTokens().catch((error) => {
        console.error('Scheduled token refresh failed:', error);
      });
    }, delay) as unknown as NodeJS.Timeout;
  }

  /**
   * Clear tokens and stop refresh timer
   */
  clearTokens(): void {
    // Clear tokens
    this.currentTokens = {
      access: null,
      refresh: null,
      expiresAt: null,
    };

    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear refresh promise
    this.refreshPromise = null;
    this.refreshAttempts = 0;
  }

  /**
   * Force token refresh
   */
  async forceRefresh(): Promise<OAuth2TokenResponse> {
    // Clear existing promise to force new refresh
    this.refreshPromise = null;
    return this.refreshTokens();
  }

  /**
   * Base64URL decode
   */
  private base64UrlDecode(str: string): string {
    // Add padding if needed
    str += '='.repeat((4 - (str.length % 4)) % 4);

    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');

    // Decode base64
    if (typeof window !== 'undefined' && window.atob) {
      return window.atob(str);
    } if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8');
    } 
      throw new Error('No base64 decoder available');
    
  }

  /**
   * Create auth error
   */
  private createAuthError(
    type: AuthErrorType,
    message: string,
    cause?: unknown,
  ): AuthError {
    const error: AuthError = {
      name: 'AuthError',
      type,
      message,
      timestamp: Date.now(),
      recoverable: type === AuthErrorType.REFRESH_FAILED && this.refreshAttempts < this.config.maxRefreshAttempts,
    };

    if (cause instanceof Error) {
      error.details = { cause: cause.message };
    }

    return error;
  }

  /**
   * Event emitters
   */
  private emitRefreshStart(): void {
    const event = createAuthEvent<TokenRefreshStartEvent>(
      AuthEventType.TOKEN_REFRESH_START,
      {
        reason: this.refreshAttempts > 1 ? 'retry' : 'expiry_approaching',
        attemptNumber: this.refreshAttempts,
        tokenStatus: this.getTokenStatus(),
      },
    );
    this.emit(AuthEventType.TOKEN_REFRESH_START, event);
  }

  private emitRefreshSuccess(tokens: OAuth2TokenResponse): void {
    const event = createAuthEvent<TokenRefreshSuccessEvent>(
      AuthEventType.TOKEN_REFRESH_SUCCESS,
      {
        tokens,
        oldExpiresAt: this.currentTokens.expiresAt || 0,
        newExpiresAt: this.parseToken(tokens.access_token)?.exp || 0,
        attemptNumber: this.refreshAttempts,
      },
    );
    this.emit(AuthEventType.TOKEN_REFRESH_SUCCESS, event);
  }

  private emitRefreshFailure(error: AuthError): void {
    const eventData: any = {
      error,
      attemptNumber: this.refreshAttempts,
      willRetry: this.refreshAttempts < this.config.maxRefreshAttempts,
    };

    if (this.refreshAttempts < this.config.maxRefreshAttempts) {
      eventData.nextRetryAt = new Date(Date.now() + this.config.refreshRetryDelay * 2**(this.refreshAttempts - 1));
    }

    const event = createAuthEvent<TokenRefreshFailureEvent>(
      AuthEventType.TOKEN_REFRESH_FAILURE,
      eventData,
    );
    this.emit(AuthEventType.TOKEN_REFRESH_FAILURE, event);
  }

  private emitTokenExpired(): void {
    const event = createAuthEvent<TokenExpiredEvent>(
      AuthEventType.TOKEN_EXPIRED,
      {
        expiredAt: new Date(this.currentTokens.expiresAt || Date.now()),
        wasRefreshAttempted: this.refreshAttempts > 0,
        refreshFailed: true,
      },
    );
    this.emit(AuthEventType.TOKEN_EXPIRED, event);
  }

  /**
   * Destroy token manager
   */
  destroy(): void {
    this.clearTokens();
    this.removeAllListeners();
  }
}
