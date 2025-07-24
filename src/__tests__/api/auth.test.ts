import {
  validateLoginCredentials,
  loginProvider,
  loginMerchant,
  loginCashier,
  logout,
  isAuthenticated,
  getCurrentUser,
  refreshToken,
  getAuthHeaders,
  hasRole,
  AuthenticationError,
} from '../../api/auth';
import { SecureTokenStorage } from '../../storage/token';
import { getAPIClient, getAuthClient } from '../../api/client';
import { MF1_PATHS } from '../../constants/endpoints';
import { authLogger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../storage/token');
jest.mock('../../api/client');
jest.mock('../../utils/logger');

const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
const mockGetAPIClient = getAPIClient as jest.MockedFunction<typeof getAPIClient>;
const mockGetAuthClient = getAuthClient as jest.MockedFunction<typeof getAuthClient>;
const mockAuthLogger = authLogger as jest.Mocked<typeof authLogger>;

describe('Authentication Module', () => {
  let mockAPIClient: any;
  let mockAuthClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock API clients
    mockAPIClient = {
      processOfflineQueue: jest.fn().mockResolvedValue(undefined),
    };

    mockAuthClient = {
      post: jest.fn(),
    };

    mockGetAPIClient.mockReturnValue(mockAPIClient);
    mockGetAuthClient.mockReturnValue(mockAuthClient);

    // Setup default SecureTokenStorage mocks
    mockSecureTokenStorage.storeToken.mockResolvedValue(undefined);
    mockSecureTokenStorage.storeUserInfo.mockResolvedValue(undefined);
    mockSecureTokenStorage.removeToken.mockResolvedValue(undefined);
    mockSecureTokenStorage.getToken.mockResolvedValue('mock-token');
    mockSecureTokenStorage.isTokenValid.mockResolvedValue(true);
    mockSecureTokenStorage.getUserEmail.mockResolvedValue('test@example.com');
    mockSecureTokenStorage.getUserRole.mockResolvedValue('merchant');
  });

  describe('validateLoginCredentials', () => {
    it('should validate correct email and password', () => {
      const result = validateLoginCredentials('test@example.com', 'Password123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const result = validateLoginCredentials('invalid-email', 'Password123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Invalid email format',
        code: 'EMAIL_INVALID'
      });
    });

    it('should reject empty password', () => {
      const result = validateLoginCredentials('test@example.com', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password is required',
        code: 'PASSWORD_REQUIRED'
      });
    });

    it('should reject password that is too short', () => {
      const result = validateLoginCredentials('test@example.com', '123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    });

    it('should reject both invalid email and password', () => {
      const result = validateLoginCredentials('invalid', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'Invalid email format',
        code: 'EMAIL_INVALID'
      });
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password is required',
        code: 'PASSWORD_REQUIRED'
      });
    });

    it('should accept valid email with subdomain', () => {
      const result = validateLoginCredentials('test@subdomain.example.com', 'Password123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid email with special characters', () => {
      const result = validateLoginCredentials('test+tag@example.com', 'Password123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('loginProvider', () => {
    const validCredentials = {
      email: 'provider@example.com',
      password: 'Password123!',
    };

    const mockTokenResponse = {
      access_token: 'provider-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    it('should successfully login provider with valid credentials', async () => {
      mockAuthClient.post.mockResolvedValue({
        data: mockTokenResponse,
      });

      const result = await loginProvider(validCredentials.email, validCredentials.password);

      expect(result).toEqual(mockTokenResponse);
      expect(mockAuthClient.post).toHaveBeenCalledWith(
        MF1_PATHS.LOGIN,
        {
          username: validCredentials.email,
          password: validCredentials.password,
          grant_type: 'password',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      expect(mockSecureTokenStorage.storeToken).toHaveBeenCalledWith(mockTokenResponse);
      expect(mockSecureTokenStorage.storeUserInfo).toHaveBeenCalledWith(mockTokenResponse.access_token);
      expect(mockAuthLogger.authSuccess).toHaveBeenCalledWith('provider', { email: validCredentials.email });
    });

    it('should throw AuthenticationError for invalid credentials format', async () => {
      await expect(loginProvider('invalid-email', '')).rejects.toThrow(AuthenticationError);
      await expect(loginProvider('invalid-email', '')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS_FORMAT',
      });
      expect(mockAuthLogger.authFailure).toHaveBeenCalledWith('provider', expect.any(AuthenticationError));
    });

    it('should handle API error responses', async () => {
      const apiError = {
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' },
        },
      };

      mockAuthClient.post.mockRejectedValue(apiError);

      await expect(loginProvider(validCredentials.email, validCredentials.password)).rejects.toThrow(AuthenticationError);
      await expect(loginProvider(validCredentials.email, validCredentials.password)).rejects.toMatchObject({
        code: 'LOGIN_FAILED',
        status: 401,
      });
      expect(mockAuthLogger.authFailure).toHaveBeenCalledWith('provider', expect.any(AuthenticationError));
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockAuthClient.post.mockRejectedValue(networkError);

      await expect(loginProvider(validCredentials.email, validCredentials.password)).rejects.toThrow(AuthenticationError);
      await expect(loginProvider(validCredentials.email, validCredentials.password)).rejects.toMatchObject({
        code: 'LOGIN_FAILED',
      });
    });
  });

  describe('loginMerchant', () => {
    const validCredentials = {
      email: 'merchant@example.com',
      password: 'Password123!',
    };

    const mockTokenResponse = {
      access_token: 'merchant-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    it('should successfully login merchant with valid credentials', async () => {
      mockAuthClient.post.mockResolvedValue({
        data: mockTokenResponse,
      });

      const result = await loginMerchant(validCredentials.email, validCredentials.password);

      expect(result).toEqual(mockTokenResponse);
      expect(mockAuthClient.post).toHaveBeenCalledWith(
        MF1_PATHS.LOGIN,
        {
          username: validCredentials.email,
          password: validCredentials.password,
          grant_type: 'password',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      expect(mockSecureTokenStorage.storeToken).toHaveBeenCalledWith(mockTokenResponse);
      expect(mockSecureTokenStorage.storeUserInfo).toHaveBeenCalledWith(mockTokenResponse.access_token);
      expect(mockAuthLogger.authSuccess).toHaveBeenCalledWith('merchant', { email: validCredentials.email });
    });

    it('should throw AuthenticationError for invalid credentials format', async () => {
      await expect(loginMerchant('invalid-email', '')).rejects.toThrow(AuthenticationError);
      await expect(loginMerchant('invalid-email', '')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS_FORMAT',
      });
      expect(mockAuthLogger.authFailure).toHaveBeenCalledWith('merchant', expect.any(AuthenticationError));
    });

    it('should handle API error responses', async () => {
      const apiError = {
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' },
        },
      };

      mockAuthClient.post.mockRejectedValue(apiError);

      await expect(loginMerchant(validCredentials.email, validCredentials.password)).rejects.toThrow(AuthenticationError);
      await expect(loginMerchant(validCredentials.email, validCredentials.password)).rejects.toMatchObject({
        code: 'LOGIN_FAILED',
        status: 401,
      });
      expect(mockAuthLogger.authFailure).toHaveBeenCalledWith('merchant', expect.any(AuthenticationError));
    });
  });

  describe('loginCashier', () => {
    const validCredentials = {
      email: 'cashier@example.com',
      password: 'Password123!',
    };

    const mockTokenResponse = {
      access_token: 'cashier-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    it('should successfully login cashier with valid credentials', async () => {
      mockAuthClient.post.mockResolvedValue({
        data: mockTokenResponse,
      });

      const result = await loginCashier(validCredentials.email, validCredentials.password);

      expect(result).toEqual(mockTokenResponse);
      expect(mockAuthClient.post).toHaveBeenCalledWith(
        MF1_PATHS.LOGIN,
        {
          username: validCredentials.email,
          password: validCredentials.password,
          grant_type: 'password',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      expect(mockSecureTokenStorage.storeToken).toHaveBeenCalledWith(mockTokenResponse);
      expect(mockSecureTokenStorage.storeUserInfo).toHaveBeenCalledWith(mockTokenResponse.access_token);
      expect(mockAuthLogger.authSuccess).toHaveBeenCalledWith('cashier', { email: validCredentials.email });
    });

    it('should throw AuthenticationError for invalid credentials format', async () => {
      await expect(loginCashier('invalid-email', '')).rejects.toThrow(AuthenticationError);
      await expect(loginCashier('invalid-email', '')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS_FORMAT',
      });
      expect(mockAuthLogger.authFailure).toHaveBeenCalledWith('cashier', expect.any(AuthenticationError));
    });

    it('should handle API error responses', async () => {
      const apiError = {
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' },
        },
      };

      mockAuthClient.post.mockRejectedValue(apiError);

      await expect(loginCashier(validCredentials.email, validCredentials.password)).rejects.toThrow(AuthenticationError);
      await expect(loginCashier(validCredentials.email, validCredentials.password)).rejects.toMatchObject({
        code: 'LOGIN_FAILED',
        status: 401,
      });
      expect(mockAuthLogger.authFailure).toHaveBeenCalledWith('cashier', expect.any(AuthenticationError));
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear authentication data', async () => {
      await logout();

      expect(mockSecureTokenStorage.removeToken).toHaveBeenCalled();
      expect(mockAPIClient.processOfflineQueue).toHaveBeenCalled();
      expect(mockAuthLogger.info).toHaveBeenCalledWith('Logout successful');
    });

    it('should handle errors during logout but still clear token', async () => {
      const error = new Error('Process queue failed');
      mockAPIClient.processOfflineQueue.mockRejectedValue(error);

      await logout();

      expect(mockSecureTokenStorage.removeToken).toHaveBeenCalledTimes(2); // Once in try, once in catch
      expect(mockAuthLogger.error).toHaveBeenCalledWith('Error during logout', error);
    });

    it('should handle token removal errors gracefully', async () => {
      const tokenError = new Error('Token removal failed');
      mockSecureTokenStorage.removeToken.mockRejectedValue(tokenError);

      await expect(logout()).rejects.toThrow(tokenError);
      expect(mockAuthLogger.error).toHaveBeenCalledWith('Error during logout', tokenError);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when valid token exists', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue('valid-token');
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(true);

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no token exists', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue(null);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false and clear token when token is expired', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue('expired-token');
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(false);

      const result = await isAuthenticated();

      expect(result).toBe(false);
      expect(mockSecureTokenStorage.removeToken).toHaveBeenCalled();
    });

    it('should return false when token validation throws error', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue('token');
      mockSecureTokenStorage.isTokenValid.mockRejectedValue(new Error('Validation error'));

      const result = await isAuthenticated();

      expect(result).toBe(false);
      expect(mockAuthLogger.error).toHaveBeenCalledWith('Error checking authentication status', expect.any(Error));
    });
  });

  describe('getCurrentUser', () => {
    it('should return user information when available', async () => {
      mockSecureTokenStorage.getUserEmail.mockResolvedValue('user@example.com');
      mockSecureTokenStorage.getUserRole.mockResolvedValue('merchant');

      const result = await getCurrentUser();

      expect(result).toEqual({
        email: 'user@example.com',
        role: 'merchant',
      });
    });

    it('should return null when email is missing', async () => {
      mockSecureTokenStorage.getUserEmail.mockResolvedValue(null);
      mockSecureTokenStorage.getUserRole.mockResolvedValue('merchant');

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when role is missing', async () => {
      mockSecureTokenStorage.getUserEmail.mockResolvedValue('user@example.com');
      mockSecureTokenStorage.getUserRole.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when both email and role are missing', async () => {
      mockSecureTokenStorage.getUserEmail.mockResolvedValue(null);
      mockSecureTokenStorage.getUserRole.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockSecureTokenStorage.getUserEmail.mockRejectedValue(new Error('Storage error'));

      const result = await getCurrentUser();

      expect(result).toBeNull();
      expect(mockAuthLogger.error).toHaveBeenCalledWith('Error getting current user', expect.any(Error));
    });
  });

  describe('refreshToken', () => {
    it('should return current token if still valid', async () => {
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(true);
      mockSecureTokenStorage.getToken.mockResolvedValue('valid-token');

      const result = await refreshToken();

      expect(result).toEqual({
        access_token: 'valid-token',
        token_type: 'Bearer',
      });
    });

    it('should return null when token is expired', async () => {
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(false);

      const result = await refreshToken();

      expect(result).toBeNull();
      expect(mockAuthLogger.warn).toHaveBeenCalledWith('Token refresh not available, user needs to re-login');
    });

    it('should return null when no token exists', async () => {
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(true);
      mockSecureTokenStorage.getToken.mockResolvedValue(null);

      const result = await refreshToken();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockSecureTokenStorage.isTokenValid.mockRejectedValue(new Error('Validation error'));

      const result = await refreshToken();

      expect(result).toBeNull();
      expect(mockAuthLogger.error).toHaveBeenCalledWith('Token refresh failed', expect.any(Error));
    });
  });

  describe('getAuthHeaders', () => {
    it('should return authorization headers when valid token exists', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue('valid-token');
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(true);

      const result = await getAuthHeaders();

      expect(result).toEqual({
        Authorization: 'Bearer valid-token',
      });
    });

    it('should return empty object when no token exists', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue(null);

      const result = await getAuthHeaders();

      expect(result).toEqual({});
    });

    it('should return empty object when token is expired', async () => {
      mockSecureTokenStorage.getToken.mockResolvedValue('expired-token');
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(false);

      const result = await getAuthHeaders();

      expect(result).toEqual({});
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the specified role', async () => {
      mockSecureTokenStorage.getUserRole.mockResolvedValue('merchant');

      const result = await hasRole('merchant');

      expect(result).toBe(true);
    });

    it('should return false when user has different role', async () => {
      mockSecureTokenStorage.getUserRole.mockResolvedValue('cashier');

      const result = await hasRole('merchant');

      expect(result).toBe(false);
    });

    it('should return false when user has no role', async () => {
      mockSecureTokenStorage.getUserRole.mockResolvedValue(null);

      const result = await hasRole('merchant');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockSecureTokenStorage.getUserRole.mockRejectedValue(new Error('Storage error'));

      const result = await hasRole('merchant');

      expect(result).toBe(false);
      expect(mockAuthLogger.error).toHaveBeenCalledWith('Error checking user role', expect.any(Error));
    });
  });

  describe('AuthenticationError', () => {
    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError('Test error', 'TEST_CODE', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.status).toBe(400);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create AuthenticationError without status', () => {
      const error = new AuthenticationError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.status).toBeUndefined();
      expect(error.name).toBe('AuthenticationError');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete login and logout flow', async () => {
      // Setup for successful login
      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockAuthClient.post.mockResolvedValue({
        data: mockTokenResponse,
      });

             // Login
       const loginResult = await loginMerchant('test@example.com', 'Password123!');
      expect(loginResult).toEqual(mockTokenResponse);

      // Check authentication
      mockSecureTokenStorage.getToken.mockResolvedValue('test-token');
      mockSecureTokenStorage.isTokenValid.mockResolvedValue(true);
      const isAuth = await isAuthenticated();
      expect(isAuth).toBe(true);

      // Get auth headers
      const headers = await getAuthHeaders();
      expect(headers).toEqual({
        Authorization: 'Bearer test-token',
      });

      // Logout
      await logout();
      expect(mockSecureTokenStorage.removeToken).toHaveBeenCalled();
    });

    it('should handle failed login followed by successful login', async () => {
             const validCredentials = {
         email: 'test@example.com',
         password: 'Password123!',
       };

      // First login attempt fails
      const apiError = {
        response: {
          status: 401,
          data: { detail: 'Invalid credentials' },
        },
      };
      mockAuthClient.post.mockRejectedValueOnce(apiError);

      await expect(loginMerchant(validCredentials.email, validCredentials.password)).rejects.toThrow(AuthenticationError);

      // Second login attempt succeeds
      const mockTokenResponse = {
        access_token: 'success-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      mockAuthClient.post.mockResolvedValueOnce({
        data: mockTokenResponse,
      });

      const result = await loginMerchant(validCredentials.email, validCredentials.password);
      expect(result).toEqual(mockTokenResponse);
    });
  });
}); 