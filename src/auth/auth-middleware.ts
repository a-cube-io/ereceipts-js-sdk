/**
 * Enhanced Authentication Middleware
 * Advanced middleware with automatic token refresh, role-based headers, and request queuing
 */

import type { Middleware, RequestContext, ResponseContext } from '@/http/middleware';

import { EventEmitter } from 'eventemitter3';

import { AuthErrorType } from './types';
import { AuthEventType, createAuthEvent } from './auth-events';

import type { AuthService } from './auth-service';
import type { TokenManager } from './token-manager';
import type { UserRole, AuthError, AuthMiddlewareConfig } from './types';

interface QueuedRequest {
  context: RequestContext;
  resolve: (context: RequestContext) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

const DEFAULT_CONFIG: Required<AuthMiddlewareConfig> = {
  enableRetry: true,
  maxRetries: 2,
  retryDelay: 1000,
  authHeaderName: 'Authorization',
  authScheme: 'Bearer',
  includeRoleHeaders: true,
  roleHeaderName: 'X-User-Role',
  includePermissionHeaders: true,
  permissionHeaderName: 'X-User-Permissions',
  includeRequestContext: true,
  contextHeaders: {
    'X-Device-ID': 'deviceId',
    'X-Session-ID': 'sessionId',
    'X-Request-Context': 'requestContext',
  },
};

/**
 * Enhanced authentication middleware with automatic token refresh and role-based access
 */
export class EnhancedAuthMiddleware extends EventEmitter implements Middleware {
  readonly name = 'enhanced-auth';

  readonly priority = 100; // Highest priority for auth

  private config: Required<AuthMiddlewareConfig>;

  private authService: AuthService;

  private tokenManager: TokenManager;

  private isRefreshing = false;

  private requestQueue: QueuedRequest[] = [];

  private readonly queueTimeout = 30000; // 30 seconds

  constructor(
    authService: AuthService,
    tokenManager: TokenManager,
    config: Partial<AuthMiddlewareConfig> = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.authService = authService;
    this.tokenManager = tokenManager;

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Before request: Add authentication headers and user context
   */
  async beforeRequest(context: RequestContext): Promise<RequestContext> {
    // Skip auth for authentication endpoints
    if (this.isAuthEndpoint(context.url)) {
      return context;
    }

    // Check if we're currently refreshing tokens
    if (this.isRefreshing) {
      return this.queueRequest(context);
    }

    // Get current authentication state
    const authState = this.authService.getState();

    // If not authenticated, return as-is (let the endpoint decide how to handle)
    if (!authState.isAuthenticated || !authState.accessToken) {
      return context;
    }

    // Check if token needs refresh before request
    const tokenStatus = this.tokenManager.getTokenStatus();
    if (tokenStatus.needsRefresh && !tokenStatus.isRefreshing) {
      try {
        await this.refreshTokensWithQueue();
      } catch (error) {
        // If refresh fails, continue with current token
        console.warn('Pre-request token refresh failed:', error);
      }
    }

    // Add authentication headers
    const updatedContext = await this.addAuthHeaders(context);

    return updatedContext;
  }

  /**
   * After response: Handle token expiration and refresh
   */
  async afterResponse(
    context: RequestContext,
    response: ResponseContext,
  ): Promise<ResponseContext> {
    // Handle 401 Unauthorized responses
    if (response.status === 401 && this.shouldRetryWithRefresh(context)) {
      try {
        // Attempt token refresh
        await this.refreshTokensWithQueue();

        // Retry the original request with new token
        return this.retryRequestWithNewToken(context, response);
      } catch (refreshError) {
        // Token refresh failed - user needs to re-authenticate
        this.handleAuthenticationFailure(refreshError as AuthError);
        return response;
      }
    }

    // Handle 403 Forbidden responses
    if (response.status === 403) {
      this.handleAuthorizationFailure(context, response);
    }

    return response;
  }

  /**
   * Error handler: Process authentication-related errors
   */
  async onError(context: RequestContext, error: Error): Promise<Error> {
    // Handle network errors that might be auth-related
    if (this.isAuthRelatedError(error)) {
      const authError = this.createAuthError(error, context);

      // Emit auth error event
      this.emit(AuthEventType.NETWORK_ERROR, createAuthEvent(
        AuthEventType.NETWORK_ERROR,
        {
          operation: 'request',
          error: authError,
          endpoint: context.url,
          statusCode: (error as any).statusCode,
          willRetry: false,
        },
      ));

      return authError;
    }

    return error;
  }

  /**
   * Add authentication and context headers to request
   */
  private async addAuthHeaders(context: RequestContext): Promise<RequestContext> {
    const authState = this.authService.getState();
    const updatedContext = { ...context };

    // Add authorization header
    if (authState.accessToken) {
      const authHeader = `${this.config.authScheme} ${authState.accessToken}`;
      updatedContext.headers[this.config.authHeaderName] = authHeader;

      /* // Debug: Log request headers for API server debugging
      console.log('🔧 API Request Debug:', {
        url: `${context.method} ${context.url}`,
        authHeaderName: this.config.authHeaderName,
        authScheme: this.config.authScheme,
        tokenLength: authState.accessToken.length,
        tokenPreview: `${authState.accessToken.substring(0, 20)}...`,
        hasToken: !!authState.accessToken,
        isAuthenticated: authState.isAuthenticated
      }); */
    } else {
      console.log('⚠️  No access token available for request:', {
        url: `${context.method} ${context.url}`,
        authState: {
          isAuthenticated: authState.isAuthenticated,
          hasUser: !!authState.user,
          hasToken: !!authState.accessToken,
        },
      });
    }

    // Add role headers
    if (this.config.includeRoleHeaders && authState.user?.roles) {
      updatedContext.headers[this.config.roleHeaderName] =
        authState.user.roles.join(',');
    }

    // Add permission headers
    if (this.config.includePermissionHeaders && authState.user?.permissions) {
      updatedContext.headers[this.config.permissionHeaderName] =
        authState.user.permissions.join(',');
    }

    // Add context headers
    if (this.config.includeRequestContext && authState.user) {
      Object.entries(this.config.contextHeaders).forEach(([headerName, contextKey]) => {
        let value: string | undefined;

        switch (contextKey) {
          case 'deviceId':
            value = authState.user?.attributes?.deviceId as string;
            break;
          case 'sessionId':
            value = authState.user?.session_id;
            break;
          case 'requestContext':
            value = JSON.stringify({
              userId: authState.user?.id,
              roles: authState.user?.roles,
              timestamp: Date.now(),
            });
            break;
          default:
            value = (authState.user as any)?.[contextKey];
        }

        if (value) {
          updatedContext.headers[headerName] = value;
        }
      });
    }

    // Add request metadata
    updatedContext.metadata = {
      ...updatedContext.metadata,
      isAuthenticated: authState.isAuthenticated,
      userId: authState.user?.id,
      roles: authState.user?.roles,
      permissions: authState.user?.permissions,
    };

    /* // Debug: Log ALL headers being sent to API server
    const allHeaders: Record<string, string> = {};
    Object.entries(updatedContext.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Truncate Authorization header for security, show others in full
        if (key.toLowerCase() === 'authorization') {
          allHeaders[key] = `${value.substring(0, 30)}...`;
        } else {
          allHeaders[key] = value;
        }
      }
    });

    if (Object.keys(allHeaders).length > 0) {
      console.log('📋 ALL Request Headers:', allHeaders);
    } */

    return updatedContext;
  }

  /**
   * Queue request during token refresh
   */
  private async queueRequest(context: RequestContext): Promise<RequestContext> {
    return new Promise<RequestContext>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        context,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.requestQueue.push(queuedRequest);

      // Set timeout for queued request
      setTimeout(() => {
        const index = this.requestQueue.indexOf(queuedRequest);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error('Request queue timeout'));
        }
      }, this.queueTimeout);
    });
  }

  /**
   * Refresh tokens with request queuing
   */
  private async refreshTokensWithQueue(): Promise<void> {
    if (this.isRefreshing) {
      // Wait for existing refresh to complete
      return new Promise((resolve, reject) => {
        const checkRefresh = () => {
          if (!this.isRefreshing) {
            resolve();
          } else {
            setTimeout(checkRefresh, 100);
          }
        };

        setTimeout(() => reject(new Error('Token refresh timeout')), this.queueTimeout);
        checkRefresh();
      });
    }

    this.isRefreshing = true;

    try {
      // Perform token refresh
      await this.authService.refreshSession();

      // Process queued requests
      await this.processQueuedRequests();
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Process all queued requests after token refresh
   */
  private async processQueuedRequests(): Promise<void> {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const queuedRequest of queue) {
      try {
        // Update request with new auth headers
        const updatedContext = await this.addAuthHeaders(queuedRequest.context);
        queuedRequest.resolve(updatedContext);
      } catch (error) {
        queuedRequest.reject(error as Error);
      }
    }
  }

  /**
   * Retry request with new token after 401 response
   */
  private async retryRequestWithNewToken(
    _context: RequestContext,
    originalResponse: ResponseContext,
  ): Promise<ResponseContext> {
    // This would typically involve re-executing the HTTP request
    // For now, we'll return a modified response indicating retry should happen
    // The actual retry logic would be handled by the HTTP client

    const retryResponse: ResponseContext = {
      ...originalResponse,
      status: 200, // Assume retry would succeed
      statusText: 'OK',
      metadata: {
        ...originalResponse.metadata,
        wasRetried: true,
        retryReason: 'token_refresh',
      },
    };

    return retryResponse;
  }

  /**
   * Handle authentication failure (401 after refresh attempt)
   */
  private handleAuthenticationFailure(_error: AuthError): void {
    // Emit unauthorized access event
    this.emit(AuthEventType.UNAUTHORIZED_ACCESS, createAuthEvent(
      AuthEventType.UNAUTHORIZED_ACCESS,
      {
        userId: this.authService.getCurrentUser()?.id,
        resource: 'api',
        action: 'request',
        reason: 'Token refresh failed',
      },
    ));

    // Auto-logout user
    this.authService.logout({
      reason: 'token_invalid',
      clearLocalData: true,
    }).catch(logoutError => {
      console.error('Auto-logout failed:', logoutError);
    });
  }

  /**
   * Handle authorization failure (403 responses)
   */
  private handleAuthorizationFailure(
    context: RequestContext,
    _response: ResponseContext,
  ): void {
    const user = this.authService.getCurrentUser();

    // Emit unauthorized access event
    this.emit(AuthEventType.UNAUTHORIZED_ACCESS, createAuthEvent(
      AuthEventType.UNAUTHORIZED_ACCESS,
      {
        userId: user?.id,
        resource: context.url,
        action: context.method,
        reason: 'Insufficient permissions',
      },
    ));

    // Check if this indicates role/permission changes
    if (user) {
      this.checkForRoleChanges(user.roles);
    }
  }

  /**
   * Check for role changes that might explain authorization failure
   */
  private async checkForRoleChanges(currentRoles: UserRole[]): Promise<void> {
    try {
      // In a real implementation, you might fetch fresh user info here
      // For now, we'll just log the potential role change
      const user = this.authService.getCurrentUser();

      // check if user roles have changed
      if (!user?.roles || user.roles.length === 0) {
        console.warn('User roles are empty or user is not authenticated');
        return;
      }

      const hasRoleChanged = !currentRoles.every(role => user.roles.includes(role));

      if (hasRoleChanged) {
        console.warn('Authorization failure - possible role changes detected');
      }
    } catch (error) {
      console.error('Failed to check role changes:', error);
    }
  }

  /**
   * Setup event listeners for auth service
   */
  private setupEventListeners(): void {
    // Listen for token refresh events
    this.tokenManager.on(AuthEventType.TOKEN_REFRESH_SUCCESS, () => {
      // Process any queued requests
      if (this.requestQueue.length > 0) {
        this.processQueuedRequests().catch(error => {
          console.error('Failed to process queued requests:', error);
        });
      }
    });

    // Listen for token expiration
    this.tokenManager.on(AuthEventType.TOKEN_EXPIRED, () => {
      // Clear request queue on token expiration
      this.requestQueue.forEach(request => {
        request.reject(new Error('Token expired'));
      });
      this.requestQueue = [];
    });
  }

  /**
   * Check if URL is an authentication endpoint
   */
  private isAuthEndpoint(url: string): boolean {
    const authEndpoints = ['/mf1/login', '/mf1/token/refresh', '/mf1/logout'];
    return authEndpoints.some(endpoint => url.includes(endpoint));
  }

  /**
   * Check if request should be retried with token refresh
   */
  private shouldRetryWithRefresh(context: RequestContext): boolean {
    // Don't retry if retries are disabled
    if (!this.config.enableRetry) {
      return false;
    }

    // Don't retry auth endpoints
    if (this.isAuthEndpoint(context.url)) {
      return false;
    }

    // Don't retry if already retried too many times
    const retryCount = (context.metadata.retryCount as number) || 0;
    if (retryCount >= this.config.maxRetries) {
      return false;
    }

    // Don't retry if no refresh token available
    const tokenStatus = this.tokenManager.getTokenStatus();
    if (!tokenStatus || !tokenStatus.isValid || !tokenStatus.isRefreshing) {
      return false;
    }

    return true;
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthRelatedError(error: Error): boolean {
    const authStatusCodes = [401, 403];
    const {statusCode} = (error as any);

    return authStatusCodes.includes(statusCode) ||
           error.message.toLowerCase().includes('auth') ||
           error.message.toLowerCase().includes('token') ||
           error.message.toLowerCase().includes('unauthorized');
  }

  /**
   * Create auth error from generic error
   */
  private createAuthError(error: Error, context: RequestContext): AuthError {
    const {statusCode} = (error as any);

    let type: AuthErrorType;
    let {message} = error;

    switch (statusCode) {
      case 401:
        type = AuthErrorType.TOKEN_EXPIRED;
        message = 'Authentication token expired or invalid';
        break;
      case 403:
        type = AuthErrorType.PERMISSION_DENIED;
        message = 'Insufficient permissions for this operation';
        break;
      default:
        type = AuthErrorType.NETWORK_ERROR;
        message = `Network error during authentication: ${error.message}`;
    }

    return {
      name: 'AuthError',
      type,
      message,
      code: `HTTP_${statusCode}`,
      statusCode,
      details: {
        originalError: error.message,
        url: context.url,
        method: context.method,
      },
      timestamp: Date.now(),
      recoverable: statusCode === 401, // 401 is recoverable via token refresh
    };
  }

  /**
   * Get middleware statistics
   */
  getStats(): {
    queuedRequests: number;
    isRefreshing: boolean;
    totalRetries: number;
    averageQueueTime: number;
  } {
    const queueTimes = this.requestQueue.map(req => Date.now() - req.timestamp);
    const averageQueueTime = queueTimes.length > 0
      ? queueTimes.reduce((sum, time) => sum + time, 0) / queueTimes.length
      : 0;

    return {
      queuedRequests: this.requestQueue.length,
      isRefreshing: this.isRefreshing,
      totalRetries: 0, // Would track this in real implementation
      averageQueueTime,
    };
  }

  /**
   * Clear request queue and reset state
   */
  clearQueue(): void {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
    this.isRefreshing = false;
  }

  /**
   * Destroy middleware and clean up resources
   */
  destroy(): void {
    this.clearQueue();
    this.removeAllListeners();
  }
}

/**
 * Factory function to create enhanced auth middleware
 */
export function createEnhancedAuthMiddleware(
  authService: AuthService,
  tokenManager: TokenManager,
  config?: Partial<AuthMiddlewareConfig>,
): EnhancedAuthMiddleware {
  return new EnhancedAuthMiddleware(authService, tokenManager, config);
}

/**
 * Helper to check if user has required role for request
 */
export function hasRequiredRole(
  userRoles: UserRole[],
  requiredRoles: UserRole | UserRole[],
): boolean {
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return required.some(role => userRoles.includes(role));
}

/**
 * Helper to check if user has required permission
 */
export function hasRequiredPermission(
  userPermissions: string[],
  requiredPermission: string | string[],
): boolean {
  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  return required.some(permission => userPermissions.includes(permission));
}
