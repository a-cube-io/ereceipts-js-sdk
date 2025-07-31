/**
 * UI-Free Permission Gate Hook
 * Pure business logic for permission-based access control without any UI dependencies
 */

import type { PermissionCheck } from '@/auth/types';

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from './use-auth';

export interface PermissionGateConfig {
  resource: string;
  action: string;
  context?: Record<string, unknown>;
  showLoading?: boolean;
  cachePermissions?: boolean;
}

export interface PermissionGateState {
  hasPermission: boolean | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  accessType: 'granted' | 'denied' | 'loading' | 'error';
}

export interface PermissionGateActions {
  recheckPermission: () => Promise<void>;
  clearError: () => void;
}

export interface UsePermissionGateReturn {
  state: PermissionGateState;
  actions: PermissionGateActions;
  config: PermissionGateConfig;
}

/**
 * UI-free permission gate logic
 * Returns permission state and controls without any JSX
 */
export function usePermissionGate(
  config: PermissionGateConfig,
  callbacks?: {
    onPermissionGranted?: () => void;
    onPermissionDenied?: (reason: string) => void;
    onError?: (error: string) => void;
  }
): UsePermissionGateReturn {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkPermission } = useAuth();

  // Permission cache for performance
  const [permissionCache] = useState(new Map<string, { result: boolean; timestamp: number }>());

  const checkUserPermission = useCallback(async () => {
    const cacheKey = `${config.resource}:${config.action}:${JSON.stringify(config.context || {})}`;
    
    // Check cache if enabled
    if (config.cachePermissions) {
      const cached = permissionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        setHasPermission(cached.result);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const permissionCheck: PermissionCheck = {
        resource: config.resource,
        action: config.action,
        ...(config.context && { context: config.context }),
      };

      const result = await checkPermission(permissionCheck);
      const granted = result.granted;

      setHasPermission(granted);

      // Cache result if enabled
      if (config.cachePermissions) {
        permissionCache.set(cacheKey, { result: granted, timestamp: Date.now() });
      }

      // Trigger callbacks
      if (granted) {
        callbacks?.onPermissionGranted?.();
      } else {
        const reason = result.reason || 'Permission denied';
        callbacks?.onPermissionDenied?.(reason);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission check failed';
      setError(errorMessage);
      setHasPermission(false);
      callbacks?.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [config, checkPermission, callbacks, permissionCache]);

  const recheckPermission = useCallback(async () => {
    // Clear cache for this permission
    if (config.cachePermissions) {
      const cacheKey = `${config.resource}:${config.action}:${JSON.stringify(config.context || {})}`;
      permissionCache.delete(cacheKey);
    }
    await checkUserPermission();
  }, [checkUserPermission, config, permissionCache]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial permission check
  useEffect(() => {
    checkUserPermission();
  }, [checkUserPermission]);

  // Determine access type
  let accessType: PermissionGateState['accessType'];
  if (isLoading) {
    accessType = 'loading';
  } else if (error) {
    accessType = 'error';
  } else if (hasPermission === true) {
    accessType = 'granted';
  } else {
    accessType = 'denied';
  }

  return {
    state: {
      hasPermission,
      isLoading: isLoading && (config.showLoading ?? true),
      isError: !!error,
      error,
      accessType,
    },
    actions: {
      recheckPermission,
      clearError,
    },
    config: {
      resource: config.resource,
      action: config.action,
      ...(config.context !== undefined && { context: config.context }),
      showLoading: config.showLoading ?? true,
      cachePermissions: config.cachePermissions ?? true,
    },
  };
}

/**
 * Permission gate utilities
 */
export const permissionGateUtils = {
  /**
   * Format permission check for display
   */
  formatPermissionCheck: (resource: string, action: string): string => `${action} ${resource}`,

  /**
   * Get permission denied message
   */
  getPermissionDeniedMessage: (resource: string, action: string): string => `You don't have permission to ${action} ${resource}`,

  /**
   * Get loading message
   */
  getLoadingMessage: (): string => 'Checking permissions...',

  /**
   * Get error message
   */
  getErrorMessage: (error: string | null): string => error || 'Permission check failed',

  /**
   * Check if permission is cacheable
   */
  isCacheable: (_resource: string, action: string): boolean => {
    // Some permissions change frequently and shouldn't be cached
    const nonCacheableActions = ['create', 'delete', 'modify'];
    return !nonCacheableActions.includes(action.toLowerCase());
  },

  /**
   * Generate permission cache key
   */
  generateCacheKey: (resource: string, action: string, context?: Record<string, unknown>): string => {
    const contextStr = context ? JSON.stringify(context) : '';
    return `${resource}:${action}:${contextStr}`;
  },

  /**
   * Parse permission string (e.g., "receipts:create" -> { resource: "receipts", action: "create" })
   */
  parsePermissionString: (permission: string): { resource: string; action: string } => {
    const [resource, action] = permission.split(':');
    return {
      resource: resource || 'unknown',
      action: action || 'read',
    };
  },

  /**
   * Create permission check object
   */
  createPermissionCheck: (
    resource: string, 
    action: string, 
    context?: Record<string, unknown>
  ): PermissionCheck => ({
      resource,
      action,
      ...(context && { context }),
    }),

  /**
   * Get suggested action for denied permission
   */
  getSuggestedAction: (_resource: string, action: string): string | null => {
    const suggestions: Record<string, string> = {
      'create': 'Contact your administrator to request creation permissions',
      'delete': 'Contact your administrator to request deletion permissions',
      'modify': 'Contact your administrator to request modification permissions',
      'admin': 'This action requires administrator privileges',
    };
    
    return suggestions[action.toLowerCase()] || 'Contact your administrator for access';
  },
};