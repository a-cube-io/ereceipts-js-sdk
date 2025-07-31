/**
 * UI-Free User Profile Hook
 * Pure business logic for user profile management without any UI dependencies
 */

import { useCallback } from 'react';

import { useAuth, useRoles, useLogout } from './use-auth';

export interface UserProfileConfig {
  showRoles?: boolean;
  showSession?: boolean;
  showPermissions?: boolean;
}

export interface UserProfileData {
  user: {
    name: string | null;
    email: string;
    lastLogin: Date | null;
    sessionId: string | null;
    permissions: string[];
  } | null;
  roles: {
    primary: string | null;
    simple: string;
    effective: string[];
    formatted: {
      primary: string;
      all: Array<{ role: string; formatted: string }>;
    };
  };
  status: {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  };
}

export interface UserProfileActions {
  handleLogout: () => Promise<void>;
  requestLogoutConfirmation: () => Promise<boolean>;
}

export interface UseUserProfileReturn {
  data: UserProfileData;
  actions: UserProfileActions;
  config: UserProfileConfig;
}

/**
 * UI-free user profile logic
 * Returns pure user data and logout handlers without any JSX
 */
export function useUserProfile(
  config: UserProfileConfig = {},
  callbacks?: {
    onLogout?: () => void;
    onLogoutConfirm?: () => Promise<boolean>;
  }
): UseUserProfileReturn {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  const { logout, isLoggingOut } = useLogout();
  const { primaryRole, simpleRole, effectiveRoles } = useRoles();

  const handleLogout = useCallback(async () => {
    await logout();
    callbacks?.onLogout?.();
  }, [logout, callbacks]);

  const requestLogoutConfirmation = useCallback(async (): Promise<boolean> => {
    if (callbacks?.onLogoutConfirm) {
      return await callbacks.onLogoutConfirm();
    }
    // Default behavior - always confirm
    return true;
  }, [callbacks]);

  // Format user data
  const userData = user ? {
    name: user.name || null,
    email: user.email,
    lastLogin: user.last_login || null,
    sessionId: user.session_id || null,
    permissions: user.permissions || [],
  } : null;

  // Format roles data
  const rolesData = {
    primary: primaryRole,
    simple: simpleRole,
    effective: effectiveRoles,
    formatted: {
      primary: primaryRole ? roleUtils.formatRoleName(primaryRole) : 'Unknown',
      all: effectiveRoles.map(role => ({
        role,
        formatted: roleUtils.formatRoleName(role),
      })),
    },
  };

  // Status data
  const statusData = {
    isAuthenticated,
    isLoading: isLoading || isLoggingOut,
    error: error?.message || null,
  };

  return {
    data: {
      user: userData,
      roles: rolesData,
      status: statusData,
    },
    actions: {
      handleLogout,
      requestLogoutConfirmation,
    },
    config: {
      showRoles: config.showRoles ?? true,
      showSession: config.showSession ?? true,
      showPermissions: config.showPermissions ?? false,
    },
  };
}

/**
 * Role formatting utilities
 */
export const roleUtils = {
  formatRoleName: (role: string): string => role.replace('ROLE_', '').toLowerCase().replace('_', ' '),

  getRoleHierarchy: (roles: string[]): { primary: string; secondary: string[] } => {
    if (roles.length === 0) return { primary: 'None', secondary: [] };
    return {
      primary: roles[0] || 'None',
      secondary: roles.slice(1),
    };
  },
};

/**
 * User profile utilities
 */
export const profileUtils = {
  getDisplayName: (user: { name?: string | null; email: string }): string => user.name || user.email,

  formatLastLogin: (lastLogin: Date | null): string => {
    if (!lastLogin) return 'Never';
    return lastLogin.toLocaleString();
  },

  getSessionInfo: (sessionId: string | null): { hasSession: boolean; shortId: string | null } => {
    if (!sessionId) return { hasSession: false, shortId: null };
    return {
      hasSession: true,
      shortId: `${sessionId.substring(0, 8)  }...`,
    };
  },

  groupPermissions: (permissions: string[]): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};
    
    permissions.forEach(permission => {
      const [resource, ...actions] = permission.split(':');
      if (resource && !grouped[resource]) {
        grouped[resource] = [];
      }
      if (resource && grouped[resource]) {
        grouped[resource].push(actions.join(':') || 'read');
      }
    });

    return grouped;
  },
};