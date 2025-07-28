/**
 * React Auth Hooks
 * Convenient hooks for authentication functionality in React applications
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuthContext } from './auth-provider';
import type {
  LoginCredentials,
  LogoutOptions,
  AuthUser,
  AuthError,
  UserRole,
  PermissionCheck,
  PermissionResult,
  SessionInfo,
} from '@/auth/types';

/**
 * Main authentication hook
 * Provides complete auth state and actions
 */
export function useAuth() {
  const context = useAuthContext();
  return {
    // State
    user: context.user,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    error: context.error,
    
    // Actions
    login: context.login,
    logout: context.logout,
    refreshSession: context.refreshSession,
    clearError: context.clearError,
    
    // Role Management
    hasRole: context.hasRole,
    hasAnyRole: context.hasAnyRole,
    getEffectiveRoles: context.getEffectiveRoles,
    getPrimaryRole: context.getPrimaryRole,
    getSimpleRole: context.getSimpleRole,
    switchRole: context.switchRole,
    
    // Permissions
    checkPermission: context.checkPermission,
    
    // Session
    getSessionInfo: context.getSessionInfo,
  };
}

/**
 * Hook for login functionality
 * Manages login state and provides login action
 */
export function useLogin() {
  const { login: contextLogin, isLoading, error, clearError } = useAuthContext();
  const [loginError, setLoginError] = useState<AuthError | null>(null);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    try {
      setLoginError(null);
      const user = await contextLogin(credentials);
      return user;
    } catch (error) {
      const authError = error as AuthError;
      setLoginError(authError);
      throw error;
    }
  }, [contextLogin]);

  const clearLoginError = useCallback(() => {
    setLoginError(null);
    clearError();
  }, [clearError]);

  return {
    login,
    isLogging: isLoading,
    loginError: loginError || error,
    clearLoginError,
  };
}

/**
 * Hook for logout functionality
 * Manages logout state and provides logout action
 */
export function useLogout() {
  const { logout: contextLogout, isLoading } = useAuthContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async (options?: LogoutOptions): Promise<void> => {
    try {
      setIsLoggingOut(true);
      await contextLogout(options);
    } finally {
      setIsLoggingOut(false);
    }
  }, [contextLogout]);

  return {
    logout,
    isLoggingOut: isLoggingOut || isLoading,
  };
}

/**
 * Hook for user information
 * Provides current user data and user-related utilities
 */
export function useUser() {
  const { user, isAuthenticated } = useAuthContext();

  return {
    user,
    isAuthenticated,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userRoles: user?.roles || [],
    userPermissions: user?.permissions || [],
    lastLogin: user?.last_login,
    sessionId: user?.session_id,
  };
}

/**
 * Hook for role management
 * Provides role checking and switching functionality
 */
export function useRoles() {
  const {
    hasRole,
    hasAnyRole,
    getEffectiveRoles,
    getPrimaryRole,
    getSimpleRole,
    switchRole,
    user,
  } = useAuthContext();

  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const switchToRole = useCallback(async (
    targetRole: UserRole,
    context?: {
      merchant_id?: import('@/types/branded').MerchantId;
      cashier_id?: import('@/types/branded').CashierId;
      point_of_sale_id?: import('@/types/branded').PointOfSaleId;
    }
  ): Promise<boolean> => {
    try {
      setIsSwitchingRole(true);
      return await switchRole(targetRole, context);
    } finally {
      setIsSwitchingRole(false);
    }
  }, [switchRole]);

  const currentRoles = user?.roles || [];
  const effectiveRoles = getEffectiveRoles();
  const primaryRole = getPrimaryRole();
  const simpleRole = getSimpleRole();

  return {
    currentRoles,
    effectiveRoles,
    primaryRole,
    simpleRole,
    hasRole,
    hasAnyRole,
    switchRole: switchToRole,
    isSwitchingRole,
  };
}

/**
 * Hook for permission checking
 * Provides permission checking functionality with caching
 */
export function usePermissions() {
  const { checkPermission } = useAuthContext();
  const [permissionCache, setPermissionCache] = useState<Map<string, PermissionResult>>(new Map());
  const [checkingPermissions, setCheckingPermissions] = useState<Set<string>>(new Set());

  const checkPermissionWithCache = useCallback(async (
    permission: PermissionCheck,
    useCache = true
  ): Promise<PermissionResult> => {
    const cacheKey = `${permission.resource}:${permission.action}:${JSON.stringify(permission.context || {})}`;
    
    // Return cached result if available and cache is enabled
    if (useCache && permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!;
    }

    // Prevent duplicate requests
    if (checkingPermissions.has(cacheKey)) {
      // Wait for ongoing request
      return new Promise((resolve) => {
        const checkCache = () => {
          if (permissionCache.has(cacheKey)) {
            resolve(permissionCache.get(cacheKey)!);
          } else {
            setTimeout(checkCache, 50);
          }
        };
        checkCache();
      });
    }

    try {
      setCheckingPermissions(prev => new Set(prev).add(cacheKey));
      const result = await checkPermission(permission);
      
      // Cache successful results
      if (useCache) {
        setPermissionCache(prev => new Map(prev).set(cacheKey, result));
      }
      
      return result;
    } finally {
      setCheckingPermissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  }, [checkPermission, permissionCache, checkingPermissions]);

  const clearPermissionCache = useCallback(() => {
    setPermissionCache(new Map());
  }, []);

  const isCheckingPermission = useCallback((permission: PermissionCheck): boolean => {
    const cacheKey = `${permission.resource}:${permission.action}:${JSON.stringify(permission.context || {})}`;
    return checkingPermissions.has(cacheKey);
  }, [checkingPermissions]);

  return {
    checkPermission: checkPermissionWithCache,
    clearPermissionCache,
    isCheckingPermission,
  };
}

/**
 * Hook for session management
 * Provides session information and management
 */
export function useSession() {
  const { getSessionInfo, refreshSession, isAuthenticated } = useAuthContext();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Load session info
  const loadSessionInfo = useCallback(async () => {
    if (!isAuthenticated) {
      setSessionInfo(null);
      return;
    }

    try {
      const info = await getSessionInfo();
      setSessionInfo(info);
      setSessionError(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Failed to load session info');
    }
  }, [getSessionInfo, isAuthenticated]);

  // Refresh session
  const refresh = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      setSessionError(null);
      await refreshSession();
      await loadSessionInfo(); // Reload session info after refresh
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Failed to refresh session');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshSession, loadSessionInfo]);

  // Load session info when authentication state changes
  useEffect(() => {
    loadSessionInfo();
  }, [loadSessionInfo]);

  // Auto-refresh session before expiration
  useEffect(() => {
    if (!sessionInfo?.expiresAt || !isAuthenticated) return;

    const expiresAt = sessionInfo.expiresAt.getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes before expiry

    if (timeUntilExpiry > refreshBuffer) {
      const refreshTimeout = setTimeout(() => {
        refresh().catch(error => {
          console.error('Auto-refresh failed:', error);
        });
      }, timeUntilExpiry - refreshBuffer);

      return () => clearTimeout(refreshTimeout);
    }
    
    return undefined;
  }, [sessionInfo, isAuthenticated, refresh]);

  return {
    sessionInfo,
    isRefreshing,
    sessionError,
    refreshSession: refresh,
    reloadSessionInfo: loadSessionInfo,
    isSessionExpired: sessionInfo ? sessionInfo.expiresAt.getTime() < Date.now() : false,
    timeUntilExpiry: sessionInfo ? Math.max(0, sessionInfo.expiresAt.getTime() - Date.now()) : 0,
  };
}

/**
 * Hook to require authentication
 * Throws error or redirects if user is not authenticated
 */
export function useRequireAuth(redirectTo?: string) {
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (redirectTo && typeof window !== 'undefined') {
        window.location.href = redirectTo;
      } else {
        throw new Error('Authentication required');
      }
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook to require specific role
 * Throws error if user doesn't have required role
 */
export function useRequireRole(requiredRole: UserRole | UserRole[], fallbackComponent?: React.ComponentType) {
  const { hasRole, hasAnyRole, isAuthenticated, isLoading } = useAuthContext();

  const hasRequiredRole = Array.isArray(requiredRole) 
    ? hasAnyRole(requiredRole)
    : hasRole(requiredRole);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRequiredRole) {
      if (!fallbackComponent) {
        throw new Error(`Required role not found: ${Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole}`);
      }
    }
  }, [hasRequiredRole, isAuthenticated, isLoading, requiredRole, fallbackComponent]);

  return {
    hasRequiredRole,
    isAuthenticated,
    isLoading,
    canAccess: isAuthenticated && hasRequiredRole,
  };
}