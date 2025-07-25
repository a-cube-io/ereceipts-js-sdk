import { getAPIClient, getAuthClient } from './client';
import { SecureTokenStorage } from '../storage/token';
import { MF1_PATHS } from '../constants/endpoints';
import { AuthToken } from './types.convenience';
import { ValidationResult, validateEmail, validatePassword } from '../utils/validation';
import { authLogger } from '../utils/logger';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Validate login credentials
 */
export const validateLoginCredentials = (email: string, password: string): ValidationResult => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  
  return {
    isValid: emailValidation.isValid && passwordValidation.isValid,
    errors: [...emailValidation.errors, ...passwordValidation.errors],
  };
};

/**
 * Login as Provider (MF2 system)
 */
export const loginProvider = async (email: string, password: string): Promise<AuthToken> => {
  authLogger.info('Attempting provider login', { email });
  
  // Validate credentials
  const validation = validateLoginCredentials(email, password);
  if (!validation.isValid) {
    const error = new AuthenticationError(
      'Invalid credentials format',
      'INVALID_CREDENTIALS_FORMAT'
    );
    authLogger.authFailure('provider', error);
    throw error;
  }

  try {
    const client = getAuthClient();
    const response = await client.post<LoginResponse>(MF1_PATHS.LOGIN, {
      username: email, // OAuth2 password flow uses 'username' field
      password,
      grant_type: 'password',
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData: AuthToken = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };

    // Store token securely
    await SecureTokenStorage.storeToken(tokenData);
    await SecureTokenStorage.storeUserInfo(tokenData.access_token);

    authLogger.authSuccess('provider', { email });
    return tokenData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const authError = new AuthenticationError(
      error.response?.data?.detail || 'Login failed',
      'LOGIN_FAILED',
      error.response?.status
    );
    
    authLogger.authFailure('provider', authError);
    throw authError;
  }
};

/**
 * Login as Merchant (MF1 system)
 */
export const loginMerchant = async (email: string, password: string): Promise<AuthToken> => {
  authLogger.info('Attempting merchant login', { email });
  
  // Validate credentials
  const validation = validateLoginCredentials(email, password);
  if (!validation.isValid) {
    const error = new AuthenticationError(
      'Invalid credentials format',
      'INVALID_CREDENTIALS_FORMAT'
    );
    authLogger.authFailure('merchant', error);
    throw error;
  }

  try {
    const client = getAuthClient();
    const response = await client.post<LoginResponse>(MF1_PATHS.LOGIN, {
      username: email, // OAuth2 password flow uses 'username' field
      password,
      grant_type: 'password',
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData: AuthToken = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };

    // Store token securely
    await SecureTokenStorage.storeToken(tokenData);
    await SecureTokenStorage.storeUserInfo(tokenData.access_token);

    authLogger.authSuccess('merchant', { email });
    return tokenData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const authError = new AuthenticationError(
      error.response?.data?.detail || 'Login failed',
      'LOGIN_FAILED',
      error.response?.status
    );
    
    authLogger.authFailure('merchant', authError);
    throw authError;
  }
};

/**
 * Login as Cashier (MF1 system)
 */
export const loginCashier = async (email: string, password: string): Promise<AuthToken> => {
  authLogger.info('Attempting cashier login', { email });
  
  // Validate credentials
  const validation = validateLoginCredentials(email, password);
  if (!validation.isValid) {
    const error = new AuthenticationError(
      'Invalid credentials format',
      'INVALID_CREDENTIALS_FORMAT'
    );
    authLogger.authFailure('cashier', error);
    throw error;
  }

  try {
    const client = getAuthClient();
    const response = await client.post<LoginResponse>(MF1_PATHS.LOGIN, {
      username: email, // OAuth2 password flow uses 'username' field
      password,
      grant_type: 'password',
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData: AuthToken = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
    };

    // Store token securely
    await SecureTokenStorage.storeToken(tokenData);
    await SecureTokenStorage.storeUserInfo(tokenData.access_token);

    authLogger.authSuccess('cashier', { email });
    return tokenData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const authError = new AuthenticationError(
      error.response?.data?.detail || 'Login failed',
      'LOGIN_FAILED',
      error.response?.status
    );
    
    authLogger.authFailure('cashier', authError);
    throw authError;
  }
};

/**
 * Logout user and clear all authentication data
 */
export const logout = async (): Promise<void> => {
  authLogger.info('Logging out user');
  
  try {
    // Clear all stored authentication data
    await SecureTokenStorage.removeToken();
    
    // Process any pending offline requests before logout
    const client = getAPIClient();
    await client.processOfflineQueue();
    
    authLogger.info('Logout successful');
  } catch (error) {
    authLogger.error('Error during logout', error);
    // Still clear token even if other operations fail
    await SecureTokenStorage.removeToken();
  }
};

/**
 * Check if user is currently authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await SecureTokenStorage.getToken();
    if (!token) {
      return false;
    }

    const isValid = await SecureTokenStorage.isTokenValid();
    if (!isValid) {
      // Clean up expired token
      await SecureTokenStorage.removeToken();
      return false;
    }

    return true;
  } catch (error) {
    authLogger.error('Error checking authentication status', error);
    return false;
  }
};

/**
 * Get current user information from stored token
 */
export const getCurrentUser = async (): Promise<{
  email: string;
  role: string;
} | null> => {
  try {
    const email = await SecureTokenStorage.getUserEmail();
    const role = await SecureTokenStorage.getUserRole();
    
    if (!email || !role) {
      return null;
    }

    return { email, role };
  } catch (error) {
    authLogger.error('Error getting current user', error);
    return null;
  }
};

/**
 * Refresh authentication token (if refresh token is available)
 */
export const refreshToken = async (): Promise<AuthToken | null> => {
  authLogger.info('Attempting to refresh token');
  
  try {
    // Note: The current API spec doesn't show refresh token endpoint
    // This is a placeholder for future implementation
    
    // For now, we'll check if current token is still valid
    const isValid = await SecureTokenStorage.isTokenValid();
    if (isValid) {
      const token = await SecureTokenStorage.getToken();
      if (token) {
        return {
          access_token: token,
          token_type: 'Bearer',
        };
      }
    }

    authLogger.warn('Token refresh not available, user needs to re-login');
    return null;
  } catch (error) {
    authLogger.error('Token refresh failed', error);
    return null;
  }
};

/**
 * Get authentication headers for API requests
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await SecureTokenStorage.getToken();
  
  if (!token || !await SecureTokenStorage.isTokenValid()) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Check if current user has specific role
 */
export const hasRole = async (role: string): Promise<boolean> => {
  try {
    const userRole = await SecureTokenStorage.getUserRole();
    return userRole === role;
  } catch (error) {
    authLogger.error('Error checking user role', error);
    return false;
  }
};