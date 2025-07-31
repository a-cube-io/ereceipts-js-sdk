/**
 * UI-Free Authentication Form Hook
 * Pure business logic for login forms without any UI dependencies
 */

import type { UserRole, LoginCredentials } from '@/auth/types';

import { useState, useCallback } from 'react';

import { useLogin } from './use-auth';

export interface AuthFormConfig {
  autoComplete?: boolean;
  showRememberMe?: boolean;
  allowRoleSelection?: boolean;
  availableRoles?: UserRole[];
}

export interface AuthFormState {
  credentials: LoginCredentials;
  rememberMe: boolean;
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthFormActions {
  handleInputChange: (field: keyof LoginCredentials, value: string) => void;
  handleRememberMeChange: (value: boolean) => void;
  handleSubmit: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export interface UseAuthFormReturn {
  state: AuthFormState;
  actions: AuthFormActions;
  config: AuthFormConfig;
}

/**
 * UI-free authentication form logic
 * Returns pure state and event handlers without any JSX
 */
export function useAuthForm(
  config: AuthFormConfig = {},
  callbacks?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }
): UseAuthFormReturn {
  const { login, isLogging, loginError, clearLoginError } = useLogin();

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const handleInputChange = useCallback((field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (loginError || customError) {
      clearLoginError();
      setCustomError(null);
    }
  }, [loginError, customError, clearLoginError]);

  const handleRememberMeChange = useCallback((value: boolean) => {
    setRememberMe(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    clearLoginError();
    setCustomError(null);

    try {
      await login({
        ...credentials,
        ...(rememberMe && { scope: 'remember_me' }),
      });
      callbacks?.onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setCustomError(errorMessage);
      callbacks?.onError?.(errorMessage);
    }
  }, [credentials, rememberMe, login, callbacks, clearLoginError]);

  const clearError = useCallback(() => {
    clearLoginError();
    setCustomError(null);
  }, [clearLoginError]);

  const reset = useCallback(() => {
    setCredentials({ username: '', password: '' });
    setRememberMe(false);
    clearError();
  }, [clearError]);

  const isFormValid = credentials.username.length > 0 && credentials.password.length > 0;
  const currentError = customError || loginError?.message || null;

  return {
    state: {
      credentials,
      rememberMe,
      isValid: isFormValid,
      isLoading: isLogging,
      error: currentError,
    },
    actions: {
      handleInputChange,
      handleRememberMeChange,
      handleSubmit,
      clearError,
      reset,
    },
    config,
  };
}

/**
 * Form validation utilities
 */
export const authFormValidators = {
  username: (value: string): string | null => {
    if (!value.trim()) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    return null;
  },

  password: (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  },

  email: (value: string): string | null => {
    if (!value.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  },
};

/**
 * Role selection utilities for forms
 */
export const roleUtils = {
  formatRoleName: (role: UserRole): string => role.replace('ROLE_', '').toLowerCase().replace('_', ' '),

  getRoleDisplayOptions: (roles: UserRole[]): Array<{ value: string; label: string }> => [
      { value: '', label: 'Auto-detect role' },
      ...roles.map(role => ({
        value: role,
        label: roleUtils.formatRoleName(role),
      })),
    ],
};