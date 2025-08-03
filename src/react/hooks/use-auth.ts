import { useState, useCallback } from 'react';
import { useACube } from '../context';
import { AuthCredentials, User, ACubeSDKError } from '../../';

/**
 * Authentication hook return type
 */
export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ACubeSDKError | null;
  login: (credentials: AuthCredentials) => Promise<User | null>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for authentication operations
 */
export function useAuth(): UseAuthReturn {
  const { sdk, user, isAuthenticated } = useACube();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ACubeSDKError | null>(null);

  const login = useCallback(async (credentials: AuthCredentials): Promise<User | null> => {
    if (!sdk) {
      const authError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
      setError(authError);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const loggedInUser = await sdk.login(credentials);
      return loggedInUser;
    } catch (err) {
      const authError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('AUTH_ERROR', 'Login failed', err);
      setError(authError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  const logout = useCallback(async (): Promise<void> => {
    if (!sdk) {
      const authError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
      setError(authError);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await sdk.logout();
    } catch (err) {
      const authError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('AUTH_ERROR', 'Logout failed', err);
      setError(authError);
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}