/**
 * UI-Free Protected Route Hook
 * Pure business logic for route protection without any UI dependencies
 */

import type { UserRole } from '@/auth/types';

import { useMemo, useCallback } from 'react';

import { useAuth, useRequireRole } from './use-auth';

export interface ProtectedRouteConfig {
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
  fallbackType?: 'redirect' | 'component' | 'message';
}

export interface ProtectedRouteState {
  canAccess: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRequiredRole: boolean;
  shouldRedirect: boolean;
  shouldShowFallback: boolean;
  accessDeniedReason: 'not_authenticated' | 'insufficient_role' | null;
}

export interface ProtectedRouteActions {
  handleRedirect: () => void;
  requestRedirectConfirmation: () => Promise<boolean>;
}

export interface UseProtectedRouteReturn {
  state: ProtectedRouteState;
  actions: ProtectedRouteActions;
  config: ProtectedRouteConfig;
}

/**
 * UI-free protected route logic
 * Returns access control state and handlers without any JSX
 */
export function useProtectedRoute(
  config: ProtectedRouteConfig = {},
  callbacks?: {
    onRedirect?: (redirectTo: string) => void;
    onAccessDenied?: (reason: string) => void;
    onRedirectConfirm?: () => Promise<boolean>;
  }
): UseProtectedRouteReturn {
  const { isAuthenticated, isLoading } = useAuth();
  const roleResult = config.requiredRole ? useRequireRole(config.requiredRole) : null;

  const handleRedirect = useCallback(() => {
    if (config.redirectTo && callbacks?.onRedirect) {
      callbacks.onRedirect(config.redirectTo);
    }
  }, [config.redirectTo, callbacks]);

  const requestRedirectConfirmation = useCallback(async (): Promise<boolean> => {
    if (callbacks?.onRedirectConfirm) {
      return await callbacks.onRedirectConfirm();
    }
    // Default behavior - always allow redirect
    return true;
  }, [callbacks]);

  const state = useMemo((): ProtectedRouteState => {
    // Determine authentication status
    if (isLoading) {
      return {
        canAccess: false,
        isLoading: true,
        isAuthenticated: false,
        hasRequiredRole: false,
        shouldRedirect: false,
        shouldShowFallback: false,
        accessDeniedReason: null,
      };
    }

    // Check authentication
    if (!isAuthenticated) {
      const shouldRedirect = !!config.redirectTo;
      return {
        canAccess: false,
        isLoading: false,
        isAuthenticated: false,
        hasRequiredRole: false,
        shouldRedirect,
        shouldShowFallback: !shouldRedirect,
        accessDeniedReason: 'not_authenticated',
      };
    }

    // Check role requirements
    const hasRequiredRole = !config.requiredRole || (roleResult?.canAccess ?? true);
    
    if (!hasRequiredRole) {
      return {
        canAccess: false,
        isLoading: false,
        isAuthenticated: true,
        hasRequiredRole: false,
        shouldRedirect: false,
        shouldShowFallback: true,
        accessDeniedReason: 'insufficient_role',
      };
    }

    // Full access granted
    return {
      canAccess: true,
      isLoading: false,
      isAuthenticated: true,
      hasRequiredRole: true,
      shouldRedirect: false,
      shouldShowFallback: false,
      accessDeniedReason: null,
    };
  }, [isLoading, isAuthenticated, config.requiredRole, config.redirectTo, roleResult]);

  // Trigger access denied callback
  if (state.accessDeniedReason && callbacks?.onAccessDenied) {
    callbacks.onAccessDenied(state.accessDeniedReason);
  }

  return {
    state,
    actions: {
      handleRedirect,
      requestRedirectConfirmation,
    },
    config: {
      ...(config.requiredRole !== undefined && { requiredRole: config.requiredRole }),
      ...(config.redirectTo !== undefined && { redirectTo: config.redirectTo }),
      fallbackType: config.fallbackType ?? 'component',
    },
  };
}

/**
 * Protected route utilities
 */
export const protectedRouteUtils = {
  /**
   * Get access denied message
   */
  getAccessDeniedMessage: (reason: 'not_authenticated' | 'insufficient_role' | null): string => {
    const messages = {
      not_authenticated: 'Authentication required',
      insufficient_role: 'Insufficient permissions',
    };
    return reason ? messages[reason] : 'Access denied';
  },

  /**
   * Get loading message
   */
  getLoadingMessage: (): string => 'Loading...',

  /**
   * Check if roles match requirement
   */
  checkRoleRequirement: (
    userRoles: UserRole[], 
    requiredRole: UserRole | UserRole[]
  ): boolean => {
    if (!requiredRole) return true;
    
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return required.some(role => userRoles.includes(role));
  },

  /**
   * Format role requirement for display
   */
  formatRoleRequirement: (requiredRole: UserRole | UserRole[]): string => {
    if (!requiredRole) return 'None';
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles
      .map(role => role.replace('ROLE_', '').toLowerCase().replace('_', ' '))
      .join(' or ');
  },

  /**
   * Get recommended action based on state
   */
  getRecommendedAction: (state: ProtectedRouteState): string | null => {
    if (state.isLoading) return null;
    if (!state.isAuthenticated) return 'Sign In';
    if (!state.hasRequiredRole) return 'Contact Administrator';
    return null;
  },

  /**
   * Determine redirect behavior for different platforms
   */
  getRedirectBehavior: (platform: 'web' | 'mobile'): {
    shouldNavigate: boolean;
    shouldShowAlert: boolean;
  } => ({
      shouldNavigate: platform === 'web',
      shouldShowAlert: platform === 'mobile',
    }),
};