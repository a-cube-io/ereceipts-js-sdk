/**
 * UI-Free Authentication Status Hook
 * Pure business logic for authentication status without any UI dependencies
 */

import type { AuthUser, AuthError } from '@/auth/types';

import { useAuth } from './use-auth';

export interface AuthStatusConfig {
  showLoginPrompt?: boolean;
  loginPromptText?: string;
  showUserInfo?: boolean;
}

export interface AuthStatusState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isError: boolean;
  user: AuthUser | null;
  error: AuthError | null;
  displayMessage: string;
  statusType: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
}

export interface UseAuthStatusReturn {
  state: AuthStatusState;
  config: AuthStatusConfig;
}

/**
 * UI-free authentication status logic
 * Returns pure authentication state without any JSX
 */
export function useAuthStatus(config: AuthStatusConfig = {}): UseAuthStatusReturn {
  const { isAuthenticated, isLoading, error, user } = useAuth();

  // Determine status type
  let statusType: AuthStatusState['statusType'];
  if (isLoading) {
    statusType = 'loading';
  } else if (error) {
    statusType = 'error';
  } else if (isAuthenticated) {
    statusType = 'authenticated';
  } else {
    statusType = 'unauthenticated';
  }

  // Generate display message
  let displayMessage: string;
  const showLoginPrompt = config.showLoginPrompt ?? true;
  const loginPromptText = config.loginPromptText ?? 'Please sign in to continue';
  const showUserInfo = config.showUserInfo ?? true;

  switch (statusType) {
    case 'loading':
      displayMessage = 'Loading...';
      break;
    case 'error':
      displayMessage = `Authentication error: ${error?.message}`;
      break;
    case 'authenticated':
      if (showUserInfo && user) {
        displayMessage = `Signed in as ${user.name || user.email}`;
      } else {
        displayMessage = 'Authenticated';
      }
      break;
    case 'unauthenticated':
      displayMessage = showLoginPrompt ? loginPromptText : 'Not authenticated';
      break;
  }

  return {
    state: {
      isAuthenticated,
      isLoading,
      isError: !!error,
      user,
      error,
      displayMessage,
      statusType,
    },
    config: {
      showLoginPrompt,
      loginPromptText,
      showUserInfo,
    },
  };
}

/**
 * Authentication status utilities
 */
export const authStatusUtils = {
  /**
   * Get status color for UI theming
   */
  getStatusColor: (statusType: AuthStatusState['statusType']): string => {
    const colors = {
      loading: '#666',
      authenticated: '#4CAF50',
      unauthenticated: '#FF9800',
      error: '#F44336',
    };
    return colors[statusType];
  },

  /**
   * Get status icon name (for icon libraries)
   */
  getStatusIcon: (statusType: AuthStatusState['statusType']): string => {
    const icons = {
      loading: 'loading',
      authenticated: 'check-circle',
      unauthenticated: 'warning',
      error: 'error',
    };
    return icons[statusType];
  },

  /**
   * Check if status should show action button
   */
  shouldShowAction: (statusType: AuthStatusState['statusType']): boolean => statusType === 'unauthenticated' || statusType === 'error',

  /**
   * Get recommended action for status
   */
  getRecommendedAction: (statusType: AuthStatusState['statusType']): string | null => {
    const actions = {
      loading: null,
      authenticated: 'Sign Out',
      unauthenticated: 'Sign In',
      error: 'Retry',
    };
    return actions[statusType];
  },

  /**
   * Format error message for display
   */
  formatErrorMessage: (error: AuthError | null): string | null => {
    if (!error) return null;
    
    // Common error message mappings
    const errorMappings: Record<string, string> = {
      'invalid_credentials': 'Invalid username or password',
      'account_locked': 'Account is temporarily locked',
      'token_expired': 'Session has expired, please sign in again',
      'network_error': 'Network connection error, please try again',
      'server_error': 'Server error, please try again later',
    };

    return (error.code && errorMappings[error.code]) || error.message || 'An authentication error occurred';
  },

  /**
   * Get user display name
   */
  getUserDisplayName: (user: AuthUser | null): string | null => {
    if (!user) return null;
    return user.name || user.email || 'Unknown User';
  },
};