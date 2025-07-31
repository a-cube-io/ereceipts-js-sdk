/**
 * UI-Free Role Switching Hook
 * Pure business logic for role switching without any UI dependencies
 */

import type { UserRole } from '@/auth/types';

import { useState, useCallback } from 'react';

import { useRoles } from './use-auth';

export interface RoleSwitchConfig {
  availableRoles?: UserRole[];
  autoSelect?: boolean;
}

export interface RoleSwitchState {
  currentRole: UserRole | null;
  availableRoles: UserRole[];
  switchableRoles: UserRole[];
  isLoading: boolean;
  error: string | null;
  canSwitch: boolean;
}

export interface RoleSwitchActions {
  switchRole: (targetRole: UserRole) => Promise<boolean>;
  clearError: () => void;
}

export interface UseRoleSwitchReturn {
  state: RoleSwitchState;
  actions: RoleSwitchActions;
  config: RoleSwitchConfig;
}

/**
 * UI-free role switching logic
 * Returns pure state and event handlers without any JSX
 */
export function useRoleSwitch(
  config: RoleSwitchConfig = {},
  callbacks?: {
    onRoleSwitch?: (role: UserRole) => void;
    onError?: (error: string) => void;
  }
): UseRoleSwitchReturn {
  const { switchRole: performSwitch, isSwitchingRole, primaryRole, effectiveRoles } = useRoles();
  const [customError, setCustomError] = useState<string | null>(null);

  const switchRole = useCallback(async (targetRole: UserRole): Promise<boolean> => {
    setCustomError(null);

    try {
      const success = await performSwitch(targetRole);
      if (success) {
        callbacks?.onRoleSwitch?.(targetRole);
        return true;
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to switch role. Please try again.';
      
      setCustomError(errorMessage);
      callbacks?.onError?.(errorMessage);
      return false;
    }
  }, [performSwitch, callbacks]);

  const clearError = useCallback(() => {
    setCustomError(null);
  }, []);

  // Determine switchable roles
  const availableRoles = config.availableRoles || effectiveRoles;
  const switchableRoles = availableRoles.filter(role => effectiveRoles.includes(role));
  const canSwitch = switchableRoles.length > 1;

  return {
    state: {
      currentRole: primaryRole,
      availableRoles,
      switchableRoles,
      isLoading: isSwitchingRole,
      error: customError,
      canSwitch,
    },
    actions: {
      switchRole,
      clearError,
    },
    config: {
      availableRoles: config.availableRoles ?? [],
      autoSelect: config.autoSelect ?? false,
    },
  };
}

/**
 * Role switching utilities
 */
export const roleSwitchUtils = {
  /**
   * Format role for display
   */
  formatRoleForDisplay: (role: UserRole): string => role.replace('ROLE_', '').toLowerCase().replace('_', ' '),

  /**
   * Get role priority (lower number = higher priority)
   */
  getRolePriority: (role: UserRole): number => {
    const priorities: Record<string, number> = {
      'ROLE_ADMIN': 1,
      'ROLE_MANAGER': 2,
      'ROLE_CASHIER': 3,
      'ROLE_USER': 4,
    };
    return priorities[role] || 99;
  },

  /**
   * Sort roles by priority
   */
  sortRolesByPriority: (roles: UserRole[]): UserRole[] => [...roles].sort((a, b) => 
      roleSwitchUtils.getRolePriority(a) - roleSwitchUtils.getRolePriority(b)
    ),

  /**
   * Get role permissions summary
   */
  getRolePermissionsSummary: (role: UserRole): string[] => {
    const permissions: Record<string, string[]> = {
      'ROLE_ADMIN': ['Full system access', 'User management', 'System configuration'],
      'ROLE_MANAGER': ['Team management', 'Reports access', 'Cashier oversight'],
      'ROLE_CASHIER': ['Create receipts', 'Process transactions', 'Customer interaction'],
      'ROLE_USER': ['View receipts', 'Basic access'],
    };
    return permissions[role] || ['Basic access'];
  },

  /**
   * Check if role switch is allowed
   */
  canSwitchToRole: (currentRole: UserRole | null, targetRole: UserRole, effectiveRoles: UserRole[]): boolean => {
    if (!effectiveRoles.includes(targetRole)) return false;
    if (currentRole === targetRole) return false;
    return true;
  },

  /**
   * Get role switch options for UI
   */
  getRoleSwitchOptions: (
    currentRole: UserRole | null, 
    effectiveRoles: UserRole[]
  ): Array<{ role: UserRole; label: string; isCurrent: boolean; permissions: string[] }> => effectiveRoles.map(role => ({
      role,
      label: roleSwitchUtils.formatRoleForDisplay(role),
      isCurrent: role === currentRole,
      permissions: roleSwitchUtils.getRolePermissionsSummary(role),
    })),
};