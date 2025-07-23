import { useCallback, useEffect, useState } from 'react';
import { 
  AuthenticationError, 
  getCurrentUser, 
  isAuthenticated, 
  loginCashier, 
  loginMerchant, 
  loginProvider,
  logout 
} from '../api/auth';
import { AuthToken } from '../api/types.generated';
import { UserRole } from '../constants/roles';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    email: string;
    role: string;
  } | null;
  token: string | null;
}

export interface AuthActions {
  loginAsProvider: (email: string, password: string) => Promise<void>;
  loginAsMerchant: (email: string, password: string) => Promise<void>;
  loginAsCashier: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export interface UseAuthReturn extends AuthState, AuthActions {
  error: string | null;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
  });

  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const user = await getCurrentUser();
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
        }));
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      }));
    }
  }, []);

  const loginAsProvider = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setState(prev => ({ ...prev, isLoading: true }));
      
      const tokenData = await loginProvider(email, password);
      const user = await getCurrentUser();
      
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user,
        token: tokenData.access_token,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof AuthenticationError 
        ? err.message 
        : 'Login failed. Please try again.';
      
      setError(errorMessage);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      }));
      throw err;
    }
  }, []);

  const loginAsMerchant = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setState(prev => ({ ...prev, isLoading: true }));
      
      const tokenData = await loginMerchant(email, password);
      const user = await getCurrentUser();
      
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user,
        token: tokenData.access_token,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof AuthenticationError 
        ? err.message 
        : 'Login failed. Please try again.';
      
      setError(errorMessage);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      }));
      throw err;
    }
  }, []);

  const loginAsCashier = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setState(prev => ({ ...prev, isLoading: true }));
      
      const tokenData = await loginCashier(email, password);
      const user = await getCurrentUser();
      
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        user,
        token: tokenData.access_token,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof AuthenticationError 
        ? err.message 
        : 'Login failed. Please try again.';
      
      setError(errorMessage);
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      }));
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await logout();
      
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
      
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Force state reset even if logout fails
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      });
    }
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    token: state.token,
    error,
    
    // Actions
    loginAsProvider,
    loginAsMerchant,
    loginAsCashier,
    logout: handleLogout,
    checkAuthStatus,
    clearError,
  };
};