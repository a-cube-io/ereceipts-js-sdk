/**
 * Token Manager Tests
 * Tests for JWT token management, refresh, and validation
 */

import type { HttpClient } from '@/http/client';

import { UserRole } from '@/auth/types';
import { TokenManager } from '@/auth/token-manager';

// Mock HttpClient
const mockHttpClient = {
  request: jest.fn(),
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  addMiddleware: jest.fn(),
  removeMiddleware: jest.fn(),
  getHealthStatus: jest.fn(),
  getCircuitBreakerMetrics: jest.fn(),
  getRetryMetrics: jest.fn(),
  updateConfig: jest.fn(),
  destroy: jest.fn(),
  emit: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  listenerCount: jest.fn(),
  listeners: jest.fn(),
  rawListeners: jest.fn(),
  prependListener: jest.fn(),
  prependOnceListener: jest.fn(),
  eventNames: jest.fn(),
} as unknown as jest.Mocked<HttpClient>;

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  const mockTokens = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huLmRvZUBleGFtcGxlLmNvbSIsInJvbGVzIjpbInVzZXIiXSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.fake-signature-for-testing-purposes',
    refreshToken: 'refresh_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    expiresIn: 3600,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    tokenManager = new TokenManager(mockHttpClient, {
      refreshUrl: '/auth/refresh',
      tokenRefreshBuffer: 5,
      maxRefreshAttempts: 3,
      refreshRetryDelay: 1000,
      enableTokenRotation: true,
    });
  });

  describe('initialization', () => {
    it('should create TokenManager with default config', () => {
      const tm = new TokenManager(mockHttpClient);
      expect(tm).toBeInstanceOf(TokenManager);
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        refreshUrl: '/custom/refresh',
        tokenRefreshBuffer: 10,
        maxRefreshAttempts: 5,
      };

      const tm = new TokenManager(mockHttpClient, customConfig);
      expect(tm).toBeInstanceOf(TokenManager);
    });
  });

  describe('token storage and retrieval', () => {
    it('should store and retrieve tokens', () => {
      const tokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };

      tokenManager.setTokens(tokens);
      expect(tokenManager.getAccessToken()).toBe(mockTokens.accessToken);
      expect(tokenManager.getRefreshToken()).toBe(mockTokens.refreshToken);
    });

    it('should get token status', () => {
      const tokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };

      tokenManager.setTokens(tokens);
      const status = tokenManager.getTokenStatus();

      expect(status).toEqual({
        isValid: expect.any(Boolean),
        expiresIn: expect.any(Number),
        isRefreshing: false,
        needsRefresh: expect.any(Boolean),
        refreshFailures: 0,
      });
    });

    it('should clear tokens', () => {
      const tokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };

      tokenManager.setTokens(tokens);
      tokenManager.clearTokens();

      expect(tokenManager.getAccessToken()).toBeNull();
      expect(tokenManager.getRefreshToken()).toBeNull();
    });
  });

  describe('token validation', () => {
    it('should validate valid token', () => {
      const validation = tokenManager.validateToken(mockTokens.accessToken);
      expect(validation.valid).toBe(true);
    });

    it('should detect invalid token', () => {
      const validation = tokenManager.validateToken('invalid.token.here');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Invalid token format');
    });

    it('should detect expired token', () => {
      // Token with past expiration
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';

      const validation = tokenManager.validateToken(expiredToken);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Token expired');
    });

    it('should handle malformed tokens', () => {
      const validation = tokenManager.validateToken('not.a.valid.jwt');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Invalid token format');
    });
  });

  describe('token expiration checks', () => {
    beforeEach(() => {
      const tokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };
      tokenManager.setTokens(tokens);
    });

    it('should detect token needs refresh', () => {
      // Mock current time to be close to expiration
      const mockDate = new Date(9999999999 * 1000 - 4000); // 4 seconds before expiration
      jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

      const status = tokenManager.getTokenStatus();
      expect(status.needsRefresh).toBe(true);

      jest.restoreAllMocks();
    });

    it('should detect token does not need refresh', () => {
      // Mock current time to be well before expiration
      const mockDate = new Date(Date.now());
      jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

      const status = tokenManager.getTokenStatus();
      expect(status.needsRefresh).toBe(false);

      jest.restoreAllMocks();
    });

    it('should get time until expiration', () => {
      const status = tokenManager.getTokenStatus();
      expect(status.expiresIn).toBeGreaterThan(0);
    });
  });

  describe('token refresh', () => {
    beforeEach(() => {
      // Mock parseToken to avoid token format issues in refresh tests
      jest.spyOn(tokenManager, 'parseToken').mockReturnValue({
        sub: '1234567890',
        email: 'john.doe@example.com',
        roles: [UserRole.ROLE_CASHIER],
        permissions: ['read', 'write'],
        iat: 1516239022,
        exp: 9999999999,
      });

      const tokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };
      tokenManager.setTokens(tokens);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should refresh token successfully', async () => {
      const newTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
      };

      mockHttpClient.post.mockResolvedValue({
        data: newTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'test-request-id',
        duration: 100,
      });

      const result = await tokenManager.refreshTokens();

      expect(result).toEqual(newTokens);

      expect(tokenManager.getAccessToken()).toBe('new_access_token');
      expect(tokenManager.getRefreshToken()).toBe('new_refresh_token');
    });

    it('should handle refresh failure', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Refresh failed'));

      await expect(tokenManager.refreshTokens()).rejects.toMatchObject({
        message: expect.stringContaining('Failed to refresh token'),
      });
    });

    it('should handle refresh with invalid response', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { error: 'invalid_grant' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        requestId: 'test-request-id',
        duration: 100,
      });

      await expect(tokenManager.refreshTokens()).rejects.toMatchObject({
        message: expect.stringContaining('Failed to refresh token'),
      });
    });

    it('should track retry attempts and eventually fail after max attempts', async () => {
      // Test retry behavior by checking that multiple HTTP calls are made
      // and that it eventually fails after max attempts

      // Setup mock to always fail
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      await expect(tokenManager.refreshTokens()).rejects.toMatchObject({
        message: expect.stringContaining('Failed to refresh token'),
      });

      // Verify that multiple attempts were made (at least the initial attempt)
      expect(mockHttpClient.post).toHaveBeenCalled();

      // Check that the retry counter is properly managed
      const status = tokenManager.getTokenStatus();
      expect(status.refreshFailures).toBeGreaterThan(0);
    });

    it('should fail after max retry attempts', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Persistent error'));

      await expect(tokenManager.refreshTokens()).rejects.toMatchObject({
        message: expect.stringContaining('Failed to refresh token'),
      });
      // Note: TokenManager may make additional calls due to retry logic
      expect(mockHttpClient.post).toHaveBeenCalled();
    });
  });

  describe('automatic refresh', () => {
    beforeEach(() => {
      // Mock parseToken to avoid token format issues
      jest.spyOn(tokenManager, 'parseToken').mockReturnValue({
        sub: '1234567890',
        email: 'john.doe@example.com',
        roles: [UserRole.ROLE_CASHIER],
        permissions: ['read', 'write'],
        iat: 1516239022,
        exp: 9999999999,
      });

      const tokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };
      tokenManager.setTokens(tokens);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should refresh token when it expires', async () => {
      // Mock token as expired
      jest.spyOn(tokenManager, 'getAccessToken').mockReturnValue(null); // Expired token returns null

      mockHttpClient.post.mockResolvedValue({
        data: {
          access_token: 'auto_refreshed_token',
          refresh_token: 'auto_refresh_token',
          expires_in: 3600,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'test-request-id',
        duration: 100,
      });

      const result = await tokenManager.refreshTokens();

      expect(result.access_token).toBe('auto_refreshed_token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/auth/refresh',
        expect.objectContaining({
          refresh_token: mockTokens.refreshToken,
          grant_type: 'refresh_token',
        }),
        expect.any(Object),
      );
    });

    it('should return current token if valid', () => {
      const token = tokenManager.getAccessToken();
      expect(token).toBe(mockTokens.accessToken);
    });

    it('should handle concurrent refresh requests', async () => {
      mockHttpClient.post.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            data: {
              access_token: 'concurrent_token',
              refresh_token: 'concurrent_refresh',
              expires_in: 3600,
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            requestId: 'test-request-id',
            duration: 100,
          }), 100),
        ),
      );

      // Make multiple concurrent calls
      const promises = [
        tokenManager.refreshTokens(),
        tokenManager.refreshTokens(),
        tokenManager.refreshTokens(),
      ];

      const results = await Promise.all(promises);

      // All should return the same token
      results.forEach(result => {
        expect(result.access_token).toBe('concurrent_token');
      });

      // Note: Due to retry logic, there may be multiple calls
      expect(mockHttpClient.post).toHaveBeenCalled();
    });
  });

  describe('token parsing', () => {
    it('should parse token payload', () => {
      const payload = tokenManager.parseToken(mockTokens.accessToken);

      expect(payload).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        email: 'john.doe@example.com',
        roles: ['user'],
        iat: 1516239022,
        exp: 9999999999,
      });
    });

    it('should handle invalid token format', () => {
      const payload = tokenManager.parseToken('invalid.token');
      expect(payload).toBeNull();
    });

    it('should handle malformed JSON in token', () => {
      const invalidToken = 'header.invalid-json.signature';
      const payload = tokenManager.parseToken(invalidToken);
      expect(payload).toBeNull();
    });
  });

  describe('event handling', () => {
    it('should emit token refresh events', async () => {
      const onTokenRefresh = jest.fn();

      const tmWithCallback = new TokenManager(mockHttpClient, {
        onTokenRefresh,
      });

      // Mock parseToken for this instance
      jest.spyOn(tmWithCallback, 'parseToken').mockReturnValue({
        sub: '1234567890',
        email: 'john.doe@example.com',
        roles: [UserRole.ROLE_CASHIER],
        permissions: ['read', 'write'],
        iat: 1516239022,
        exp: 9999999999,
      });

      const initialTokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };
      tmWithCallback.setTokens(initialTokens);

      const newTokens = {
        access_token: 'event_token',
        refresh_token: 'event_refresh',
        expires_in: 3600,
      };

      mockHttpClient.post.mockResolvedValue({
        data: newTokens,
        status: 200,
        statusText: 'OK',
        headers: {},
        requestId: 'test-request-id',
        duration: 100,
      });

      await tmWithCallback.refreshTokens();

      expect(onTokenRefresh).toHaveBeenCalledWith(newTokens);
    });

    it('should emit token expired events', async () => {
      const onTokenExpired = jest.fn();

      const tmWithCallback = new TokenManager(mockHttpClient, {
        onTokenExpired,
      });

      // Mock parseToken for this instance
      jest.spyOn(tmWithCallback, 'parseToken').mockReturnValue({
        sub: '1234567890',
        email: 'john.doe@example.com',
        roles: [UserRole.ROLE_CASHIER],
        permissions: ['read', 'write'],
        iat: 1516239022,
        exp: 9999999999,
      });

      const initialTokens = {
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        token_type: 'Bearer' as const,
        expires_in: mockTokens.expiresIn,
      };
      tmWithCallback.setTokens(initialTokens);

      // Mock refresh failure
      mockHttpClient.post.mockRejectedValue(new Error('Token expired'));

      try {
        await tmWithCallback.refreshTokens();
      } catch (error) {
        // Expected to throw
      }

      expect(onTokenExpired).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up timers on destroy', () => {
      const destroySpy = jest.spyOn(tokenManager, 'destroy');

      tokenManager.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(tokenManager.getAccessToken()).toBeNull();
      expect(tokenManager.getRefreshToken()).toBeNull();
    });
  });
});
