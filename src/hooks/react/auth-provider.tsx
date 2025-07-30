/**
 * React Auth Provider
 * Provides authentication context and state management for React applications
 */

import type { ACubeSDK } from '@/core/sdk';
import type {
  AuthUser,
  UserRole,
  AuthError,
  AuthState,
  SessionInfo,
  LogoutOptions,
  SimpleUserRole,
  PermissionCheck,
  LoginCredentials,
  PermissionResult,
} from '@/auth/types';

import React, { useRef, useEffect, useContext, useReducer, useCallback, createContext } from 'react';

// Auth Context Types
export interface AuthContextValue {
  // State
  state: AuthState;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: (options?: LogoutOptions) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;

  // Role Management
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  getEffectiveRoles: () => UserRole[];
  getPrimaryRole: () => UserRole | null;
  getSimpleRole: () => SimpleUserRole;
  switchRole: (
    targetRole: UserRole,
    context?: {
      merchant_id?: import('@/types/branded').MerchantId;
      cashier_id?: import('@/types/branded').CashierId;
      point_of_sale_id?: import('@/types/branded').PointOfSaleId;
    }
  ) => Promise<boolean>;

  // Permissions
  checkPermission: (permission: PermissionCheck) => Promise<PermissionResult>;

  // Session Management
  getSessionInfo: () => Promise<SessionInfo | null>;
}

// Auth Provider Props
export interface AuthProviderProps {
  children: React.ReactNode;
  sdk: ACubeSDK;
  autoInitialize?: boolean;
  onAuthError?: (error: AuthError) => void;
  onAuthSuccess?: (user: AuthUser) => void;
  onLogout?: (reason?: string) => void;
}

// Auth State Management
type AuthAction =
  | { type: 'AUTH_LOADING'; payload: boolean }
  | { type: 'AUTH_SUCCESS'; payload: { user: AuthUser; accessToken: string; refreshToken: string; expiresAt: number } }
  | { type: 'AUTH_ERROR'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_REFRESH'; payload: { accessToken: string; refreshToken: string; expiresAt: number } }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_USER'; payload: AuthUser };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error, // Clear error when starting new operation
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        expiresAt: action.payload.expiresAt,
        error: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        error: action.payload,
      };

    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        error: null,
      };

    case 'AUTH_REFRESH':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        expiresAt: action.payload.expiresAt,
        error: null,
      };

    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };

    default:
      return state;
  }
}

// Initial auth state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  error: null,
};

// Create auth context
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({
  children,
  sdk,
  autoInitialize = true,
  onAuthError,
  onAuthSuccess,
  onLogout,
}: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const sdkRef = useRef(sdk);

  // Update SDK ref when it changes
  useEffect(() => {
    sdkRef.current = sdk;
  }, [sdk]);

  // Initialize auth state from SDK
  const initializeAuth = useCallback(async () => {
    try {
      const authState = sdkRef.current.getAuthState();
      if (authState?.isAuthenticated && authState.user) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: authState.user,
            accessToken: authState.accessToken || '',
            refreshToken: authState.refreshToken || '',
            expiresAt: authState.expiresAt || 0,
          },
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
    }
  }, []);

  // Set up SDK event listeners
  useEffect(() => {
    const currentSdk = sdkRef.current;

    // Auth success handler
    const handleAuthSuccess = (event: any) => {
      const { user } = event.data;
      if (user) {
        const authState = currentSdk.getAuthState();
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user,
            accessToken: authState?.accessToken || '',
            refreshToken: authState?.refreshToken || '',
            expiresAt: authState?.expiresAt || 0,
          },
        });
        onAuthSuccess?.(user);
      }
    };

    // Auth error handler
    const handleAuthError = (event: any) => {
      const error: AuthError = {
        name: 'AuthError',
        type: event.data.errorCode || 'UNKNOWN_ERROR',
        message: event.data.errorMessage || 'Authentication failed',
        timestamp: Date.now(),
        recoverable: event.data.retry || false,
      };
      dispatch({ type: 'AUTH_ERROR', payload: error });
      onAuthError?.(error);
    };

    // Auth logout handler
    const handleAuthLogout = (event: any) => {
      dispatch({ type: 'AUTH_LOGOUT' });
      onLogout?.(event.data.reason);
    };

    // Token refresh handler
    const handleTokenRefresh = () => {
      const authState = currentSdk.getAuthState();
      if (authState?.accessToken) {
        dispatch({
          type: 'AUTH_REFRESH',
          payload: {
            accessToken: authState.accessToken,
            refreshToken: authState.refreshToken || '',
            expiresAt: authState.expiresAt || 0,
          },
        });
      }
    };

    // Register event listeners
    currentSdk.on('auth.success', handleAuthSuccess);
    currentSdk.on('auth.error', handleAuthError);
    currentSdk.on('auth.logout', handleAuthLogout);
    currentSdk.on('auth.refreshed', handleTokenRefresh);

    // Cleanup
    return () => {
      currentSdk.off('auth.success', handleAuthSuccess);
      currentSdk.off('auth.error', handleAuthError);
      currentSdk.off('auth.logout', handleAuthLogout);
      currentSdk.off('auth.refreshed', handleTokenRefresh);
    };
  }, [onAuthError, onAuthSuccess, onLogout]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initializeAuth();
    }
  }, [autoInitialize, initializeAuth]);

  // Auth actions
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    dispatch({ type: 'AUTH_LOADING', payload: true });
    try {
      const user = await sdkRef.current.login(credentials);
      return user;
    } catch (error) {
      const authError: AuthError = {
        name: 'AuthError',
        type: error instanceof Error && 'type' in error ? (error as any).type : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Login failed',
        timestamp: Date.now(),
        recoverable: false,
      };
      dispatch({ type: 'AUTH_ERROR', payload: authError });
      throw error;
    } finally {
      dispatch({ type: 'AUTH_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(async (options?: LogoutOptions): Promise<void> => {
    dispatch({ type: 'AUTH_LOADING', payload: true });
    try {
      await sdkRef.current.logout(options);
    } catch (error) {
      console.error('Logout error:', error);
      // Always clear local state even if logout fails
      dispatch({ type: 'AUTH_LOGOUT' });
    } finally {
      dispatch({ type: 'AUTH_LOADING', payload: false });
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const {authService} = sdkRef.current;
      await authService.refreshSession();
    } catch (error) {
      const authError: AuthError = {
        name: 'AuthError',
        type: 'SESSION_EXPIRED',
        message: 'Failed to refresh session',
        timestamp: Date.now(),
        recoverable: false,
      };
      dispatch({ type: 'AUTH_ERROR', payload: authError });
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // Role management
  const hasRole = useCallback((role: UserRole): boolean => sdkRef.current.hasRole(role), []);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => sdkRef.current.hasAnyRole(roles), []);

  const getEffectiveRoles = useCallback((): UserRole[] => sdkRef.current.getEffectiveRoles(), []);

  const getPrimaryRole = useCallback((): UserRole | null => sdkRef.current.getPrimaryRole(), []);

  const getSimpleRole = useCallback((): SimpleUserRole => sdkRef.current.getSimpleRole(), []);

  const switchRole = useCallback(async (
    targetRole: UserRole,
    context?: {
      merchant_id?: import('@/types/branded').MerchantId;
      cashier_id?: import('@/types/branded').CashierId;
      point_of_sale_id?: import('@/types/branded').PointOfSaleId;
    },
  ): Promise<boolean> => {
    try {
      const success = await sdkRef.current.switchRole(targetRole, context);
      if (success) {
        // Update user in state
        const updatedUser = sdkRef.current.getCurrentUser();
        if (updatedUser) {
          dispatch({ type: 'AUTH_UPDATE_USER', payload: updatedUser });
        }
      }
      return success;
    } catch (error) {
      console.error('Role switch failed:', error);
      return false;
    }
  }, []);

  // Permission checking
  const checkPermission = useCallback(async (permission: PermissionCheck): Promise<PermissionResult> => sdkRef.current.authService.checkPermission(permission), []);

  // Session management
  const getSessionInfo = useCallback(async (): Promise<SessionInfo | null> => sdkRef.current.authService.getSessionInfo(), []);

  // Context value
  const contextValue: AuthContextValue = {
    // State
    state,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    login,
    logout,
    refreshSession,
    clearError,

    // Role Management
    hasRole,
    hasAnyRole,
    getEffectiveRoles,
    getPrimaryRole,
    getSimpleRole,
    switchRole,

    // Permissions
    checkPermission,

    // Session Management
    getSessionInfo,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if auth is available
 */
export function useAuthAvailable(): boolean {
  return useContext(AuthContext) !== null;
}
