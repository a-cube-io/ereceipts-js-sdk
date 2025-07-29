/**
 * Authentication Service
 * Main service for handling OAuth2 authentication, session management, and user state
 */

import { EventEmitter } from 'eventemitter3';
import { HttpClient } from '@/http/client';
import { AccessControlManager } from '@/compliance/access-control';
import { TokenManager } from './token-manager';
import { AuthStorage } from './auth-storage';
import type {
  LoginCredentials,
  OAuth2TokenResponse,
  AuthUser,
  AuthState,
  AuthError,
  AuthErrorType,
  AuthConfig,
  LogoutOptions,
  PermissionCheck,
  PermissionResult,
  SessionInfo,
  SimpleUserRole,
  StoredAuthData,
  JWTPayload
} from './types';
import { UserRole } from './types';
import {
  hasRole,
  hasAnyRole,
  getEffectiveRoles,
  getPrimaryRole,
  toSimpleRole,
  autoDetectRole,
  canSwitchToRole,
  ROLE_TO_SIMPLE
} from './types';
import type { MerchantId, CashierId, PointOfSaleId } from '@/types/branded';
import {
  AuthEventType,
  createAuthEvent,
  type LoginStartEvent,
  type LoginSuccessEvent,
  type LoginFailureEvent,
  type LogoutEvent,
  type SessionCreatedEvent,
  type SessionRestoredEvent,
} from './auth-events';
import { 
  AuthPerformanceOptimizer, 
  COMMON_PERMISSION_SETS,
  type AuthPerformanceMetrics
} from './auth-performance';

const DEFAULT_CONFIG: AuthConfig = {
  loginUrl: '/login',
  refreshUrl: '/token/refresh',
  tokenRefreshBuffer: 5,
  maxRefreshAttempts: 3,
  refreshRetryDelay: 1000,
  storageKey: 'acube_auth',
  storageEncryption: true,
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
  maxConcurrentSessions: 3,
  requireReauth: false,
  enableDeviceBinding: true,
  enableSessionValidation: true,
  enableTokenRotation: true,
  enablePerformanceOptimization: true,
  performanceConfig: {
    permissionCacheSize: 1000,
    permissionCacheTTL: 5 * 60 * 1000, // 5 minutes
    roleCacheSize: 100,
    roleCacheTTL: 10 * 60 * 1000, // 10 minutes
    tokenValidationCacheSize: 500,
    tokenValidationCacheTTL: 1 * 60 * 1000, // 1 minute
    maxBatchSize: 10,
    batchTimeoutMs: 50,
    enableMetrics: true,
  },
};

/**
 * Enterprise authentication service with OAuth2, role-based access, and session management
 */
export class AuthService extends EventEmitter {
  private config: AuthConfig;
  private httpClient: HttpClient;
  private tokenManager: TokenManager;
  private storage: AuthStorage;
  private accessControl: AccessControlManager;
  private currentState: AuthState;
  private deviceId: string;
  private sessionCleanupInterval: NodeJS.Timeout | null = null;
  private performanceOptimizer: AuthPerformanceOptimizer;

  constructor(
    httpClient: HttpClient,
    config: Partial<AuthConfig> = {},
    accessControl?: AccessControlManager,
    storage?: AuthStorage,
    tokenManager?: TokenManager
  ) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.httpClient = httpClient;
    
    // Use provided token manager or create a new one
    if (tokenManager) {
      this.tokenManager = tokenManager;
    } else {
      this.tokenManager = new TokenManager(httpClient, {
        refreshUrl: this.config.refreshUrl,
        tokenRefreshBuffer: this.config.tokenRefreshBuffer,
        maxRefreshAttempts: this.config.maxRefreshAttempts,
        refreshRetryDelay: this.config.refreshRetryDelay,
        enableTokenRotation: this.config.enableTokenRotation,
        ...(this.config.onTokenRefresh && { onTokenRefresh: this.config.onTokenRefresh }),
        onTokenExpired: this.handleTokenExpired.bind(this),
      });
    }
    
    // Initialize storage
    this.storage = storage || new AuthStorage({
      storageKey: this.config.storageKey,
      enableEncryption: this.config.storageEncryption,
    });
    
    // Initialize access control
    this.accessControl = accessControl || new AccessControlManager({
      enabled: true,
      model: 'HYBRID',
      session: {
        timeout: this.config.sessionTimeout,
        maxConcurrentSessions: this.config.maxConcurrentSessions,
        requireReauth: this.config.requireReauth,
      },
    });

    // Initialize state
    this.currentState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      error: null,
    };

    // Generate device ID
    this.deviceId = this.generateDeviceId();

    // Initialize performance optimizer
    this.performanceOptimizer = new AuthPerformanceOptimizer(
      this.config.enablePerformanceOptimization ? this.config.performanceConfig : { enableMetrics: false }
    );

    // Set up event listeners
    this.setupEventListeners();

    // Start session cleanup
    this.startSessionCleanup();
  }

  /**
   * Initialize the auth service and restore session if available
   */
  async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      await this.restoreSession();
    } catch (error) {
      console.error('Auth service initialization failed:', error);
      // Don't throw - service should work without persistent session
    }
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    // Update loading state
    this.updateState({ isLoading: true, error: null });

    // Emit login start
    this.emitLoginStart(credentials);

    try {
      // Prepare login request with correct JSON format
      const requestData = {
        email: credentials.username, // API expects 'email' field instead of 'username'
        password: credentials.password,
      };

      // Make login request
      const response = await this.httpClient.post<{ token: string }>(
        this.config.loginUrl,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          skipRetry: false,
          metadata: { isAuthentication: true },
        }
      );

      const tokens = response.data;

      // Parse user from token (API returns { token: string } format)
      const rawTokenPayload = this.tokenManager.parseToken(tokens.token);
      if (!rawTokenPayload) {
        throw this.createAuthError(
          'TOKEN_INVALID',
          'Invalid access token received'
        );
      }

      // Convert API token format to expected format
      const tokenPayload: JWTPayload = {
        sub: String((rawTokenPayload as any).uid || (rawTokenPayload as any).sub || 'unknown'),
        email: (rawTokenPayload as any).username || (rawTokenPayload as any).email || credentials.username,
        roles: [], // Will be populated below
        permissions: [],
        iat: rawTokenPayload.iat,
        exp: rawTokenPayload.exp,
        ...((rawTokenPayload as any).merchant_id && { merchant_id: (rawTokenPayload as any).merchant_id }),
        ...((rawTokenPayload as any).cashier_id && { cashier_id: (rawTokenPayload as any).cashier_id }),
        ...((rawTokenPayload as any).point_of_sale_id && { point_of_sale_id: (rawTokenPayload as any).point_of_sale_id }),
      };

      // Extract roles from nested API format
      let apiRoles: string[] = [];
      if ((rawTokenPayload as any).roles && typeof (rawTokenPayload as any).roles === 'object') {
        // API returns roles as: {"ereceipts-it.acubeapi.com": ["ROLE_MERCHANT"]}
        const domainRoles = Object.values((rawTokenPayload as any).roles)[0] as unknown;
        apiRoles = Array.isArray(domainRoles) ? domainRoles as string[] : [];
      }

      // Convert API role strings to UserRole enum values
      const tokenRoles = apiRoles.map(role => {
        switch (role) {
          case 'ROLE_MERCHANT': return UserRole.ROLE_MERCHANT;
          case 'ROLE_CASHIER': return UserRole.ROLE_CASHIER;
          case 'ROLE_SUPPLIER': return UserRole.ROLE_SUPPLIER;
          case 'ROLE_ADMIN': return UserRole.ROLE_ADMIN;
          default: return UserRole.ROLE_CASHIER; // Default fallback
        }
      });

      tokenPayload.roles = tokenRoles;
      const effectiveRoles = getEffectiveRoles(tokenRoles);
      
      // Auto-detect primary role based on context and preferences
      const contextForDetection: {
        merchantId?: MerchantId;
        cashierId?: CashierId;
        pointOfSaleId?: PointOfSaleId;
        preferredRole?: UserRole | SimpleUserRole;
        userRoles?: UserRole[];
      } = {
        userRoles: effectiveRoles,
      };
      
      if (tokenPayload.merchant_id) {
        contextForDetection.merchantId = tokenPayload.merchant_id;
      }
      if (tokenPayload.cashier_id) {
        contextForDetection.cashierId = tokenPayload.cashier_id;
      }
      if (tokenPayload.point_of_sale_id) {
        contextForDetection.pointOfSaleId = tokenPayload.point_of_sale_id;
      }
      if (credentials.preferred_role) {
        contextForDetection.preferredRole = credentials.preferred_role;
      }
      
      const primaryRole = autoDetectRole(contextForDetection);
      
      // Create user object with enhanced role information
      const user: AuthUser = {
        id: tokenPayload.sub,
        email: tokenPayload.email,
        name: (rawTokenPayload as any).username || tokenPayload.email || 'Unknown User',
        roles: effectiveRoles,
        permissions: tokenPayload.permissions || [],
        ...(tokenPayload.cashier_id && { cashier_id: tokenPayload.cashier_id }),
        ...(tokenPayload.merchant_id && { merchant_id: tokenPayload.merchant_id }),
        ...(tokenPayload.point_of_sale_id && { point_of_sale_id: tokenPayload.point_of_sale_id }),
        session_id: this.generateSessionId(),
        last_login: new Date(),
        attributes: {
          deviceId: this.deviceId,
          loginMethod: 'password',
          primaryRole,
          simpleRole: toSimpleRole(effectiveRoles),
          originalRoles: tokenRoles,
          contextDetected: {
            merchant: !!tokenPayload.merchant_id,
            cashier: !!tokenPayload.cashier_id,
            pointOfSale: !!tokenPayload.point_of_sale_id,
          },
        },
      };

      // Set tokens in token manager (convert to OAuth2 format for compatibility)
      const oauth2Tokens: OAuth2TokenResponse = {
        access_token: tokens.token,
        refresh_token: '', // API doesn't provide refresh token in this format
        token_type: 'Bearer' as const,
        expires_in: tokenPayload.exp ? Math.floor((tokenPayload.exp * 1000 - Date.now()) / 1000) : 3600,
      };
      this.tokenManager.setTokens(oauth2Tokens);

      // Create session in access control (skip for CLI usage if it fails)
      try {
        const clientIP = await this.getClientIP();
        const userAgent = this.getUserAgent();
        
        const { sessionId } = await this.accessControl.authenticate(user.id, {
          timestamp: Date.now(),
          deviceId: this.deviceId,
          ipAddress: clientIP || 'unknown',
          userAgent: userAgent || 'unknown',
        });

        user.session_id = sessionId;
      } catch (accessControlError) {
        // For CLI usage, we can skip access control and just use the generated session ID
        // This is expected behavior for CLI - no need to warn
        // user.session_id is already set above
      }

      // Store auth data
      const authData: StoredAuthData = {
        accessToken: tokens.token,
        refreshToken: '', // No refresh token available
        expiresAt: tokenPayload.exp * 1000,
        tokenType: 'Bearer',
        user,
        encryptedAt: Date.now(),
        version: '1.0',
        deviceId: this.deviceId,
      };

      await this.storage.store(authData);

      // Update state
      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user,
        accessToken: tokens.token,
        refreshToken: '', // No refresh token available
        expiresAt: tokenPayload.exp * 1000,
        error: null,
      });

      // Emit success events
      this.emitLoginSuccess(user, oauth2Tokens);
      this.emitSessionCreated(user);

      // Preload common permissions for performance
      if (this.config.enablePerformanceOptimization) {
        this.preloadCommonPermissions(user).catch(error => {
          console.warn('Failed to preload permissions:', error);
        });
      }

      return user;
    } catch (error) {
      const authError = this.handleLoginError(error, credentials);
      this.updateState({
        isLoading: false,
        error: authError,
      });
      
      this.emitLoginFailure(authError, credentials);
      throw authError;
    }
  }

  /**
   * Logout user and clear session
   */
  async logout(options: LogoutOptions = {}): Promise<void> {
    const user = this.currentState.user;
    const sessionId = user?.session_id;

    try {
      // Call logout endpoint if configured
      if (this.config.logoutUrl && this.currentState.accessToken) {
        try {
          await this.httpClient.post(this.config.logoutUrl, {
            refresh_token: this.currentState.refreshToken,
            clear_all_sessions: options.clearAllSessions || false,
          });
        } catch (error) {
          // Don't fail logout if server call fails
          console.warn('Server logout failed:', error);
        }
      }

      // Terminate session in access control
      if (sessionId) {
        await this.accessControl.terminateSession(sessionId);
      }

      // Clear tokens
      this.tokenManager.clearTokens();

      // Clear storage
      if (options.clearLocalData !== false) {
        await this.storage.clear();
      }

      // Clear performance caches
      this.clearUserCaches();

      // Emit logout event
      this.emitLogout(user?.id || 'unknown', options);

      // Reset state
      this.updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        error: null,
      });

      // Call callback if provided
      if (this.config.onLogout) {
        this.config.onLogout(options.reason);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if server operations fail
      this.updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        error: null,
      });
    }
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.currentState };
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentState.user;
  }

  /**
   * Check if user has permission (optimized with caching and batching)
   */
  async checkPermission(permission: PermissionCheck): Promise<PermissionResult> {
    const user = this.currentState.user;
    if (!user || !user.session_id) {
      return {
        granted: false,
        reason: 'User not authenticated',
      };
    }

    // Use performance optimizer if enabled
    if (this.config.enablePerformanceOptimization) {
      return this.performanceOptimizer.checkPermissionOptimized(
        user,
        permission,
        async (perm) => this.checkPermissionDirect(perm)
      );
    }

    return this.checkPermissionDirect(permission);
  }

  /**
   * Direct permission check without optimization (used by optimizer)
   */
  private async checkPermissionDirect(permission: PermissionCheck): Promise<PermissionResult> {
    const user = this.currentState.user;
    if (!user || !user.session_id) {
      return {
        granted: false,
        reason: 'User not authenticated',
      };
    }

    try {
      const result = await this.accessControl.checkAccess(
        user.session_id,
        permission.resource,
        permission.action,
        {
          timestamp: Date.now(),
          deviceId: this.deviceId,
          attributes: permission.context || {},
        }
      );

      return {
        granted: result.granted,
        reason: result.reason || 'Permission check completed',
        requiresApproval: result.requiresApproval || false,
      };
    } catch (error) {
      return {
        granted: false,
        reason: 'Permission check failed',
      };
    }
  }

  /**
   * Check if user has specific role (including inherited roles)
   */
  hasRole(role: UserRole): boolean {
    const userRoles = this.currentState.user?.roles || [];
    return hasRole(userRoles, role);
  }

  /**
   * Check if user has any of the specified roles (including inherited roles)
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const userRoles = this.currentState.user?.roles || [];
    return hasAnyRole(userRoles, roles);
  }

  /**
   * Get user's effective roles (including inherited roles) - optimized with caching
   */
  getEffectiveRoles(): UserRole[] {
    const user = this.currentState.user;
    if (!user) return [];
    
    // Use performance optimizer if enabled
    if (this.config.enablePerformanceOptimization) {
      return this.performanceOptimizer.getEffectiveRolesOptimized(
        user,
        (u) => getEffectiveRoles(u.roles || [])
      );
    }

    return getEffectiveRoles(user.roles || []);
  }

  /**
   * Get user's primary role for display purposes
   */
  getPrimaryRole(): UserRole | null {
    const userRoles = this.currentState.user?.roles || [];
    return getPrimaryRole(userRoles);
  }

  /**
   * Get user's simple role for external APIs
   */
  getSimpleRole(): SimpleUserRole {
    const userRoles = this.currentState.user?.roles || [];
    return toSimpleRole(userRoles);
  }

  /**
   * Switch to a different role context during session
   */
  async switchRole(
    targetRole: UserRole,
    context?: {
      merchant_id?: import('@/types/branded').MerchantId;
      cashier_id?: import('@/types/branded').CashierId;
      point_of_sale_id?: import('@/types/branded').PointOfSaleId;
    }
  ): Promise<boolean> {
    const userRoles = this.currentState.user?.roles || [];
    
    // Validate if user can switch to this role
    const switchContext = context ? (() => {
      const ctx: {
        merchantId?: MerchantId;
        cashierId?: CashierId;
        pointOfSaleId?: PointOfSaleId;
      } = {};
      
      if (context.merchant_id) ctx.merchantId = context.merchant_id;
      if (context.cashier_id) ctx.cashierId = context.cashier_id;
      if (context.point_of_sale_id) ctx.pointOfSaleId = context.point_of_sale_id;
      
      return ctx;
    })() : undefined;
    
    if (!canSwitchToRole(userRoles, targetRole, switchContext)) {
      return false;
    }

    // Update user's current context
    if (this.currentState.user) {
      this.currentState.user.attributes = {
        ...this.currentState.user.attributes,
        primaryRole: targetRole,
        simpleRole: ROLE_TO_SIMPLE[targetRole] || 'cashier',
        contextSwitched: true,
        previousRole: this.currentState.user.attributes?.primaryRole,
      };

      // Update context-specific IDs if provided
      if (context) {
        if (context.merchant_id) this.currentState.user.merchant_id = context.merchant_id;
        if (context.cashier_id) this.currentState.user.cashier_id = context.cashier_id;
        if (context.point_of_sale_id) this.currentState.user.point_of_sale_id = context.point_of_sale_id;
      }

      // Update stored auth data
      try {
        await this.storage.update({
          user: this.currentState.user,
        });
      } catch (error) {
        console.warn('Failed to update stored auth data after role switch:', error);
      }

      // Emit role change event
      this.emit(AuthEventType.ROLE_CHANGED, createAuthEvent(
        AuthEventType.ROLE_CHANGED,
        {
          userId: this.currentState.user.id,
          oldRoles: [this.currentState.user.attributes?.previousRole || targetRole],
          newRoles: [targetRole],
          changedBy: this.currentState.user.id,
          reason: 'user_initiated_switch',
        }
      ));
    }

    return true;
  }

  /**
   * Get current session info
   */
  async getSessionInfo(): Promise<SessionInfo | null> {
    const user = this.currentState.user;
    if (!user || !user.session_id) {
      return null;
    }

    // This would typically come from the access control manager
    // For now, construct from available data
    const clientIP = await this.getClientIP();
    const userAgent = this.getUserAgent();
    
    return {
      id: user.session_id,
      userId: user.id,
      createdAt: user.last_login,
      lastActivity: new Date(),
      expiresAt: new Date(this.currentState.expiresAt || Date.now() + this.config.sessionTimeout),
      deviceId: this.deviceId,
      deviceName: this.getDeviceName(),
      deviceType: this.getDeviceType(),
      ipAddress: clientIP || 'unknown',
      userAgent: userAgent || 'unknown',
      active: this.currentState.isAuthenticated,
    };
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<void> {
    if (!this.currentState.isAuthenticated || !this.tokenManager.getRefreshToken()) {
      throw this.createAuthError(
        'SESSION_EXPIRED',
        'No active session to refresh'
      );
    }

    try {
      const tokens = await this.tokenManager.refreshTokens();
      
      // Update stored data
      await this.storage.update({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: this.tokenManager.parseToken(tokens.access_token)?.exp! * 1000,
      });

      // Update state
      this.updateState({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: this.tokenManager.parseToken(tokens.access_token)?.exp! * 1000,
      });
    } catch (error) {
      // Refresh failed - logout user
      await this.logout({
        reason: 'token_invalid',
        clearLocalData: true,
      });
      
      throw error;
    }
  }

  /**
   * Restore session from storage
   */
  private async restoreSession(): Promise<void> {
    try {
      const storedData = await this.storage.retrieve();
      if (!storedData || storedData.expiresAt <= Date.now()) {
        return; // No valid session to restore
      }

      // Validate token
      const tokenValidation = this.tokenManager.validateToken(storedData.accessToken);
      if (!tokenValidation.valid) {
        // Try to refresh if we have a refresh token
        if (storedData.refreshToken) {
          this.tokenManager.setTokens({
            access_token: storedData.accessToken,
            refresh_token: storedData.refreshToken,
            token_type: 'Bearer',
            expires_in: Math.floor((storedData.expiresAt - Date.now()) / 1000),
          });

          try {
            await this.refreshSession();
            return; // Successfully refreshed
          } catch {
            // Refresh failed, continue to clear invalid session
          }
        }

        // Clear invalid session
        await this.storage.clear();
        return;
      }

      // Set tokens
      this.tokenManager.setTokens({
        access_token: storedData.accessToken,
        refresh_token: storedData.refreshToken,
        token_type: 'Bearer',
        expires_in: Math.floor((storedData.expiresAt - Date.now()) / 1000),
      });

      // Restore state
      this.updateState({
        isAuthenticated: true,
        user: storedData.user,
        accessToken: storedData.accessToken,
        refreshToken: storedData.refreshToken,
        expiresAt: storedData.expiresAt,
        error: null,
      });

      // Emit session restored
      this.emitSessionRestored(storedData.user);
    } catch (error) {
      console.error('Session restoration failed:', error);
      // Clear potentially corrupted data
      await this.storage.clear();
    }
  }

  /**
   * Handle token expiration
   */
  private async handleTokenExpired(): Promise<void> {
    // Emit session expired event
    this.emit(AuthEventType.SESSION_EXPIRED, createAuthEvent(
      AuthEventType.SESSION_EXPIRED,
      {
        sessionId: this.currentState.user?.session_id || 'unknown',
        userId: this.currentState.user?.id || 'unknown',
        expiredAt: new Date(),
        reason: 'timeout',
      }
    ));

    // Call callback if provided
    if (this.config.onTokenExpired) {
      this.config.onTokenExpired();
    }

    // Auto-logout
    await this.logout({
      reason: 'session_expired',
      clearLocalData: true,
    });
  }

  /**
   * Handle login errors
   */
  private handleLoginError(error: unknown, _credentials: LoginCredentials): AuthError {
    let authError: AuthError;

    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as any).statusCode;
      
      switch (statusCode) {
        case 401:
          authError = this.createAuthError(
            'INVALID_CREDENTIALS',
            'Invalid username or password',
            error
          );
          break;
        case 403:
          authError = this.createAuthError(
            'PERMISSION_DENIED',
            'Account is locked or suspended',
            error
          );
          break;
        case 429:
          authError = this.createAuthError(
            'NETWORK_ERROR',
            'Too many login attempts. Please try again later.',
            error
          );
          break;
        default:
          authError = this.createAuthError(
            'NETWORK_ERROR',
            'Login failed due to network error',
            error
          );
      }
    } else {
      authError = this.createAuthError(
        'UNKNOWN_ERROR',
        'Login failed due to unknown error',
        error
      );
    }

    return authError;
  }

  /**
   * Update authentication state
   */
  private updateState(updates: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...updates };
    
    // Emit state change event
    this.emit('stateChange', this.currentState);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Forward token manager events
    this.tokenManager.on(AuthEventType.TOKEN_REFRESH_SUCCESS, (event) => {
      this.emit(AuthEventType.TOKEN_REFRESH_SUCCESS, event);
    });

    this.tokenManager.on(AuthEventType.TOKEN_REFRESH_FAILURE, (event) => {
      this.emit(AuthEventType.TOKEN_REFRESH_FAILURE, event);
    });

    this.tokenManager.on(AuthEventType.TOKEN_EXPIRED, (event) => {
      this.emit(AuthEventType.TOKEN_EXPIRED, event);
    });

    // Forward storage events
    this.storage.on(AuthEventType.STORAGE_ERROR, (event) => {
      this.emit(AuthEventType.STORAGE_ERROR, event);
    });
  }

  /**
   * Start session cleanup timer
   */
  private startSessionCleanup(): void {
    // Clean up expired sessions every hour
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000) as unknown as NodeJS.Timeout;
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const stats = await this.storage.getStats();
      if (stats.isExpired) {
        await this.storage.clear();
      }
    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }

  /**
   * Event emitters
   */
  private emitLoginStart(credentials: LoginCredentials): void {
    const event = createAuthEvent<LoginStartEvent>(
      AuthEventType.LOGIN_START,
      {
        username: credentials.username,
        hasPassword: !!credentials.password,
        hasMFA: !!credentials.mfa_code,
        deviceId: this.deviceId,
      }
    );
    this.emit(AuthEventType.LOGIN_START, event);
  }

  private emitLoginSuccess(user: AuthUser, tokens: OAuth2TokenResponse): void {
    const event = createAuthEvent<LoginSuccessEvent>(
      AuthEventType.LOGIN_SUCCESS,
      {
        user,
        tokens,
        isFirstLogin: !user.last_login || user.last_login.getTime() === Date.now(),
        loginMethod: 'password',
      }
    );
    this.emit(AuthEventType.LOGIN_SUCCESS, event);
  }

  private emitLoginFailure(error: AuthError, credentials: LoginCredentials): void {
    const event = createAuthEvent<LoginFailureEvent>(
      AuthEventType.LOGIN_FAILURE,
      {
        error,
        username: credentials.username,
        attemptNumber: 1, // Would track this in real implementation
      }
    );
    this.emit(AuthEventType.LOGIN_FAILURE, event);
  }

  private emitLogout(userId: string, options: LogoutOptions): void {
    const event = createAuthEvent<LogoutEvent>(
      AuthEventType.LOGOUT,
      {
        userId,
        reason: options.reason || 'user_initiated',
        ...(options.message && { message: options.message }),
        clearAllSessions: options.clearAllSessions || false,
      }
    );
    this.emit(AuthEventType.LOGOUT, event);
  }

  private emitSessionCreated(user: AuthUser): void {
    const event = createAuthEvent<SessionCreatedEvent>(
      AuthEventType.SESSION_CREATED,
      {
        sessionId: user.session_id,
        userId: user.id,
        expiresAt: new Date(this.currentState.expiresAt || Date.now() + this.config.sessionTimeout),
        deviceId: this.deviceId,
      }
    );
    this.emit(AuthEventType.SESSION_CREATED, event);
  }

  private emitSessionRestored(user: AuthUser): void {
    const event = createAuthEvent<SessionRestoredEvent>(
      AuthEventType.SESSION_RESTORED,
      {
        sessionId: user.session_id,
        user,
        remainingTime: (this.currentState.expiresAt || 0) - Date.now(),
        source: 'storage',
      }
    );
    this.emit(AuthEventType.SESSION_RESTORED, event);
  }

  /**
   * Utility methods
   */
  private generateDeviceId(): string {
    // Use localStorage if available for persistence across sessions
    if (typeof window !== 'undefined' && window.localStorage) {
      let deviceId = window.localStorage.getItem('acube_device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        window.localStorage.setItem('acube_device_id', deviceId);
      }
      return deviceId;
    }
    
    // Generate new ID
    return `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private getDeviceName(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent.split(' ')[0] || 'Unknown Device';
    }
    return 'Unknown Device';
  }

  private getDeviceType(): 'web' | 'mobile' | 'desktop' {
    if (typeof navigator === 'undefined') return 'desktop';
    
    if (navigator.product === 'ReactNative') return 'mobile';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) return 'mobile';
    
    return 'web';
  }

  private async getClientIP(): Promise<string | undefined> {
    // In a real implementation, this would come from the server or a service
    // For now, return undefined as IP detection is complex and privacy-sensitive
    return undefined;
  }

  private getUserAgent(): string | undefined {
    return typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  }

  private createAuthError(
    type: AuthErrorType,
    message: string,
    cause?: unknown
  ): AuthError {
    return {
      name: 'AuthError',
      type,
      message,
      details: cause instanceof Error ? { cause: cause.message } : {},
      timestamp: Date.now(),
      recoverable: false,
    };
  }

  /**
   * Preload common permissions for the current user
   */
  private async preloadCommonPermissions(user: AuthUser): Promise<void> {
    if (!this.config.enablePerformanceOptimization) return;

    // Determine common permissions based on user's primary role
    // const primaryRole = getPrimaryRole(user.roles || []);
    let commonPermissions = COMMON_PERMISSION_SETS.CASHIER; // Default

    if (hasRole(user.roles || [], UserRole.ROLE_SUPPLIER)) {
      commonPermissions = COMMON_PERMISSION_SETS.SUPPLIER;
    } else if (hasRole(user.roles || [], UserRole.ROLE_MERCHANT)) {
      commonPermissions = COMMON_PERMISSION_SETS.MERCHANT;
    }

    await this.performanceOptimizer.preloadUserPermissions(
      user,
      commonPermissions,
      async (permission) => this.checkPermissionDirect(permission)
    );
  }

  /**
   * Clear user-specific performance caches (call on role change, logout, etc.)
   */
  clearUserCaches(): void {
    if (this.config.enablePerformanceOptimization && this.currentState.user) {
      this.performanceOptimizer.clearUserCaches(this.currentState.user.id);
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): AuthPerformanceMetrics | null {
    if (!this.config.enablePerformanceOptimization) return null;
    
    return this.performanceOptimizer.getMetrics();
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    if (this.config.enablePerformanceOptimization) {
      this.performanceOptimizer.resetMetrics();
    }
  }

  /**
   * Destroy auth service
   */
  async destroy(): Promise<void> {
    // Clear timers
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Destroy components
    this.tokenManager.destroy();
    await this.storage.destroy();
    
    // Destroy performance optimizer
    if (this.performanceOptimizer) {
      this.performanceOptimizer.destroy();
    }

    // Clear listeners
    this.removeAllListeners();
  }
}