import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { createStore, del, get, set } from 'idb-keyval';
import { SecureTokenStorage, type SecureStorageConfig } from '../../storage/token';
import { STORAGE_KEYS, SECURE_KEYS } from '../../constants/keys';
import { AuthToken, JWTPayload } from '../../api/types.convenience';
import { apiLogger } from '../../utils/logger';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-keychain');
jest.mock('idb-keyval');
jest.mock('../../utils/logger');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;
const mockIdbKeyval = { createStore, del, get, set } as jest.Mocked<typeof import('idb-keyval')>;
const mockApiLogger = apiLogger as jest.Mocked<typeof apiLogger>;

// Mock platform detection
const originalWindow = global.window;
const mockWindow = {
  document: {},
} as any;

// Mock localStorage for web platform tests
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('SecureTokenStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset platform detection to React Native by default
    // @ts-ignore: allow simulating absence of window for platform detection
    (global as any).window = undefined;
    
    // Setup default mocks
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    
    mockKeychain.setInternetCredentials.mockResolvedValue(false);
    mockKeychain.getInternetCredentials.mockResolvedValue(false);
    mockKeychain.resetInternetCredentials.mockResolvedValue();
    
    mockIdbKeyval.createStore.mockReturnValue('mock-store' as any);
    mockIdbKeyval.set.mockResolvedValue(undefined);
    mockIdbKeyval.get.mockResolvedValue(null);
    mockIdbKeyval.del.mockResolvedValue(undefined);
    
    mockApiLogger.info.mockImplementation(() => {});
    mockApiLogger.warn.mockImplementation(() => {});
    mockApiLogger.error.mockImplementation(() => {});
    
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore window
    global.window = originalWindow;
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = SecureTokenStorage.getConfig();
      expect(config).toEqual({
        encryptionKeyId: 'acube-default-key',
        storeNamespace: 'acube-secure-store',
      });
    });

    it('should configure with custom settings', () => {
      const customConfig: SecureStorageConfig = {
        encryptionKeyId: 'custom-key',
        storeNamespace: 'custom-store',
      };

      SecureTokenStorage.configure(customConfig);
      const config = SecureTokenStorage.getConfig();
      
      expect(config).toEqual(customConfig);
      expect(mockApiLogger.info).toHaveBeenCalledWith('SecureTokenStorage configured', {
        encryptionKeyId: 'custom-key',
        storeNamespace: 'custom-store',
      });
    });

    it('should merge partial configuration with defaults', () => {
      const partialConfig: SecureStorageConfig = {
        encryptionKeyId: 'partial-key',
      };

      SecureTokenStorage.configure(partialConfig);
      const config = SecureTokenStorage.getConfig();
      
      expect(config.encryptionKeyId).toBe('partial-key');
      expect(config.storeNamespace).toBe('acube-secure-store'); // Default value
    });
  });

  describe('Storage Operations', () => {
    describe('setItem', () => {
      it('should store secure items using secure storage', async () => {
        await SecureTokenStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'secure-value');
        
        expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.ACCESS_TOKEN,
          'secure-value'
        );
      });

      it('should store regular items using AsyncStorage', async () => {
        await SecureTokenStorage.setItem('regular-key', 'regular-value');
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('regular-key', 'regular-value');
        expect(mockKeychain.setInternetCredentials).not.toHaveBeenCalled();
      });

      it('should handle storage errors gracefully', async () => {
        mockKeychain.setInternetCredentials.mockRejectedValue(new Error('Storage error'));
        
        // setSecureItem doesn't have error handling, so this should throw
        await expect(SecureTokenStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'value')).rejects.toThrow('Storage error');
      });
    });

    describe('getItem', () => {
      it('should retrieve secure items from secure storage', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue({
          username: STORAGE_KEYS.ACCESS_TOKEN,
          password: 'secure-value',
          server: 'test-server',
          service: 'test-service',
          storage: 'keychain',
        });

        const result = await SecureTokenStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        
        expect(result).toBe('secure-value');
        expect(mockKeychain.getInternetCredentials).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      });

      it('should retrieve regular items from AsyncStorage', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('regular-value');

        const result = await SecureTokenStorage.getItem('regular-key');
        
        expect(result).toBe('regular-value');
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('regular-key');
      });

      it('should return null when item not found', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue(false);

        const result = await SecureTokenStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        
        expect(result).toBeNull();
      });

      it('should handle retrieval errors gracefully', async () => {
        mockKeychain.getInternetCredentials.mockRejectedValue(new Error('Retrieval error'));

        const result = await SecureTokenStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        
        expect(result).toBeNull();
        expect(mockApiLogger.warn).toHaveBeenCalledWith('Failed to get secure item', expect.any(Object));
      });
    });

    describe('removeItem', () => {
      it('should remove secure items from secure storage', async () => {
        await SecureTokenStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        
        expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      });

      it('should remove regular items from AsyncStorage', async () => {
        await SecureTokenStorage.removeItem('regular-key');
        
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('regular-key');
        expect(mockKeychain.resetInternetCredentials).not.toHaveBeenCalled();
      });

      it('should handle removal errors gracefully', async () => {
        mockKeychain.resetInternetCredentials.mockRejectedValue(new Error('Removal error'));
        
        await expect(SecureTokenStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)).resolves.toBeUndefined();
        
        expect(mockApiLogger.warn).toHaveBeenCalledWith('Failed to remove secure item', expect.any(Object));
      });
    });
  });

  describe('Token Management', () => {
    const mockToken: AuthToken = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };

    describe('storeToken', () => {
      it('should store token with expiry', async () => {
        await SecureTokenStorage.storeToken(mockToken);
        
        expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.ACCESS_TOKEN,
          mockToken.access_token
        );
        
        // Should store expiry time
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS.TOKEN_EXPIRY,
          expect.any(String)
        );
      });

      it('should store token without expiry', async () => {
        const tokenWithoutExpiry = { ...mockToken };
        delete tokenWithoutExpiry.expires_in;

        await SecureTokenStorage.storeToken(tokenWithoutExpiry);
        
        expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.ACCESS_TOKEN,
          tokenWithoutExpiry.access_token
        );
        
        // Should not store expiry
        expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(
          STORAGE_KEYS.TOKEN_EXPIRY,
          expect.any(String)
        );
      });
    });

    describe('getToken', () => {
      it('should retrieve stored token', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue({
          username: STORAGE_KEYS.ACCESS_TOKEN,
          password: 'test-token',
          server: 'test-server',
          service: 'test-service',
          storage: 'keychain',
        });

        const result = await SecureTokenStorage.getToken();
        
        expect(result).toBe('test-token');
      });

      it('should return null when no token stored', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue(false);

        const result = await SecureTokenStorage.getToken();
        
        expect(result).toBeNull();
      });
    });

    describe('isTokenValid', () => {
      it('should return false when no token exists', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue(false);

        const result = await SecureTokenStorage.isTokenValid();
        
        expect(result).toBe(false);
      });

      it('should return true when token exists without expiry', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue({
          username: STORAGE_KEYS.ACCESS_TOKEN,
          password: 'test-token',
          server: 'test-server',
          service: 'test-service',
          storage: 'keychain',
        });
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const result = await SecureTokenStorage.isTokenValid();
        
        expect(result).toBe(true);
      });

      it('should return true when token is not expired', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue({
          username: STORAGE_KEYS.ACCESS_TOKEN,
          password: 'test-token',
          server: 'test-server',
          service: 'test-service',
          storage: 'keychain',
        });
        
        const futureExpiry = Date.now() + 3600000; // 1 hour from now
        mockAsyncStorage.getItem.mockResolvedValue(futureExpiry.toString());

        const result = await SecureTokenStorage.isTokenValid();
        
        expect(result).toBe(true);
      });

      it('should return false when token is expired', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue({
          username: STORAGE_KEYS.ACCESS_TOKEN,
          password: 'test-token',
          server: 'test-server',
          service: 'test-service',
          storage: 'keychain',
        });
        
        const pastExpiry = Date.now() - 3600000; // 1 hour ago
        mockAsyncStorage.getItem.mockResolvedValue(pastExpiry.toString());

        const result = await SecureTokenStorage.isTokenValid();
        
        expect(result).toBe(false);
      });
    });

    describe('removeToken', () => {
      it('should remove all token-related data', async () => {
        await SecureTokenStorage.removeToken();
        
        expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.TOKEN_EXPIRY);
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ROLE);
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL);
      });
    });
  });

  describe('JWT Operations', () => {
    describe('parseJWT', () => {
      it('should parse valid JWT token', () => {
        const mockPayload = {
          sub: 'user123',
          email: 'test@example.com',
          role: 'merchant',
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
        
        const result = SecureTokenStorage.parseJWT(mockToken);
        
        expect(result).toEqual(mockPayload);
      });

      it('should return null for invalid JWT', () => {
        const result = SecureTokenStorage.parseJWT('invalid-token');
        
        expect(result).toBeNull();
        expect(mockApiLogger.warn).toHaveBeenCalledWith('Failed to parse JWT', expect.any(Object));
      });

      it('should handle malformed JWT gracefully', () => {
        const result = SecureTokenStorage.parseJWT('header.payload');
        
        expect(result).toBeNull();
      });

      it('should handle empty token', () => {
        const result = SecureTokenStorage.parseJWT('');
        
        expect(result).toBeNull();
      });
    });

    describe('storeUserInfo', () => {
      it('should store user info from valid JWT', async () => {
        const mockPayload = {
          email: 'test@example.com',
          role: 'merchant',
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
        
        await SecureTokenStorage.storeUserInfo(mockToken);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ROLE, 'merchant');
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL, 'test@example.com');
        expect(mockApiLogger.info).toHaveBeenCalledWith('User info stored successfully', expect.any(Object));
      });

      it('should handle invalid JWT gracefully', async () => {
        await SecureTokenStorage.storeUserInfo('invalid-token');
        
        expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
        expect(mockApiLogger.warn).toHaveBeenCalledWith('Failed to store user info: invalid token payload');
      });

      it('should handle missing user fields', async () => {
        const mockPayload = { sub: 'user123' };
        const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
        
        await SecureTokenStorage.storeUserInfo(mockToken);
        
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ROLE, '');
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL, '');
      });
    });

    describe('getUserRole and getUserEmail', () => {
      it('should retrieve user role', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('merchant');

        const result = await SecureTokenStorage.getUserRole();
        
        expect(result).toBe('merchant');
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ROLE);
      });

      it('should retrieve user email', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('test@example.com');

        const result = await SecureTokenStorage.getUserEmail();
        
        expect(result).toBe('test@example.com');
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL);
      });

      it('should return null when user info not found', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const roleResult = await SecureTokenStorage.getUserRole();
        const emailResult = await SecureTokenStorage.getUserEmail();
        
        expect(roleResult).toBeNull();
        expect(emailResult).toBeNull();
      });
    });
  });

  describe('Utility Methods', () => {
    describe('clearAll', () => {
      it('should clear all stored data', async () => {
        await SecureTokenStorage.clearAll();
        
        // Count the actual number of storage keys
        const storageKeysCount = Object.values(STORAGE_KEYS).length;
        // Each key is removed via removeItem, which calls AsyncStorage.removeItem for non-secure keys
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(10); // Non-secure keys only
        
        expect(mockApiLogger.info).toHaveBeenCalledWith('All stored data cleared', {
          keysCleared: storageKeysCount
        });
        
        // Verify that non-secure storage keys were processed via AsyncStorage
        const calledKeys = mockAsyncStorage.removeItem.mock.calls.map(call => call[0]);
        const nonSecureKeys = Object.values(STORAGE_KEYS).filter(key => !SECURE_KEYS.has(key as any));
        expect(calledKeys).toEqual(expect.arrayContaining(nonSecureKeys));
        
        // Verify that secure keys were processed via Keychain
        expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledTimes(4); // Number of secure keys
      });
    });

    describe('getTokenExpiryInfo', () => {
      it('should return expiry info for valid token', async () => {
        const futureExpiry = Date.now() + 3600000; // 1 hour from now
        mockAsyncStorage.getItem.mockResolvedValue(futureExpiry.toString());

        const result = await SecureTokenStorage.getTokenExpiryInfo();
        
        expect(result.expiresAt).toBe(futureExpiry);
        expect(result.isExpired).toBe(false);
        expect(result.expiresInMs).toBeGreaterThan(0);
      });

      it('should return expiry info for expired token', async () => {
        const pastExpiry = Date.now() - 3600000; // 1 hour ago
        mockAsyncStorage.getItem.mockResolvedValue(pastExpiry.toString());

        const result = await SecureTokenStorage.getTokenExpiryInfo();
        
        expect(result.expiresAt).toBe(pastExpiry);
        expect(result.isExpired).toBe(true);
        expect(result.expiresInMs).toBe(0);
      });

      it('should handle token without expiry', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const result = await SecureTokenStorage.getTokenExpiryInfo();
        
        expect(result.expiresAt).toBeNull();
        expect(result.isExpired).toBe(false);
        expect(result.expiresInMs).toBeNull();
      });
    });

    describe('checkStorageHealth', () => {
      it('should return healthy status for React Native', async () => {
        const result = await SecureTokenStorage.checkStorageHealth();
        
        expect(result.isHealthy).toBe(true);
        expect(result.platform).toBe('react-native');
        expect(result.storageType).toBe('keychain');
        expect(result.issues).toHaveLength(0);
      });

      it('should handle storage health check failures', async () => {
        // Mock the setItem to throw an error during health check
        const originalSetItem = SecureTokenStorage.setItem;
        SecureTokenStorage.setItem = jest.fn().mockRejectedValue(new Error('Keychain error'));

        const result = await SecureTokenStorage.checkStorageHealth();
        
        expect(result.isHealthy).toBe(false);
        expect(result.issues).toContain('Keychain access failed');
        expect(result.storageType).toBe('asyncStorage');
        
        // Restore original method
        SecureTokenStorage.setItem = originalSetItem;
      });
    });

    describe('getStorageStats', () => {
      it('should return storage statistics', async () => {
        // Reset to default config first
        SecureTokenStorage.configure({});
        
        mockKeychain.getInternetCredentials.mockResolvedValue({
          username: STORAGE_KEYS.ACCESS_TOKEN,
          password: 'test-token',
          server: 'test-server',
          service: 'test-service',
          storage: 'keychain',
        });
        mockAsyncStorage.getItem
          .mockResolvedValueOnce('merchant') // userRole
          .mockResolvedValueOnce('test@example.com') // userEmail
          .mockResolvedValueOnce((Date.now() + 3600000).toString()); // tokenExpiry

        const result = await SecureTokenStorage.getStorageStats();
        
        expect(result.hasToken).toBe(true);
        expect(result.hasUserInfo).toBe(true);
        expect(result.tokenExpiryInfo).toBeDefined();
        expect(result.configuredNamespace).toBe('acube-secure-store');
        expect(result.encryptionKeyId).toBe('acube-default-key');
      });

      it('should handle missing data in statistics', async () => {
        mockKeychain.getInternetCredentials.mockResolvedValue(false);
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const result = await SecureTokenStorage.getStorageStats();
        
        expect(result.hasToken).toBe(false);
        expect(result.hasUserInfo).toBe(false);
      });
    });

    describe('exportData', () => {
      it('should export all stored data', async () => {
        // Mock getItem to return different values for different keys
        const mockGetItem = jest.fn()
          .mockResolvedValueOnce('test-token') // ACCESS_TOKEN
          .mockResolvedValueOnce(null) // REFRESH_TOKEN
          .mockResolvedValueOnce('3600000') // TOKEN_EXPIRY
          .mockResolvedValueOnce('merchant') // USER_ROLE
          .mockResolvedValueOnce('test@example.com') // USER_EMAIL
          .mockResolvedValueOnce(null) // MTLS_CERTIFICATE_PREFIX
          .mockResolvedValueOnce(null) // MTLS_PRIVATE_KEY_PREFIX
          .mockResolvedValueOnce(null) // FAILED_REQUESTS_QUEUE
          .mockResolvedValueOnce(null) // LAST_SYNC_TIMESTAMP
          .mockResolvedValueOnce(null) // ENVIRONMENT
          .mockResolvedValueOnce(null) // BASE_URL
          .mockResolvedValueOnce(null) // ONBOARDING_STEP
          .mockResolvedValueOnce(null) // MERCHANT_UUID
          .mockResolvedValueOnce(null); // CURRENT_POS_SERIAL

        // Mock the getItem method to return our test data
        const originalGetItem = SecureTokenStorage.getItem;
        SecureTokenStorage.getItem = mockGetItem;

        const result = await SecureTokenStorage.exportData();
        
        expect(Object.keys(result)).toHaveLength(Object.values(STORAGE_KEYS).length);
        expect(result[STORAGE_KEYS.ACCESS_TOKEN]).toBe('test-token');
        expect(result[STORAGE_KEYS.USER_ROLE]).toBe('merchant');
        expect(result[STORAGE_KEYS.USER_EMAIL]).toBe('test@example.com');
        
        expect(mockApiLogger.info).toHaveBeenCalledWith('Data exported', {
          keysExported: Object.values(STORAGE_KEYS).length
        });
        
        // Restore original method
        SecureTokenStorage.getItem = originalGetItem;
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow', async () => {
      const mockToken: AuthToken = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      // Store token
      await SecureTokenStorage.storeToken(mockToken);
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.ACCESS_TOKEN,
        mockToken.access_token
      );

      // Store user info
      await SecureTokenStorage.storeUserInfo(mockToken.access_token);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ROLE, '');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL, '');

      // Check token validity
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: STORAGE_KEYS.ACCESS_TOKEN,
        password: mockToken.access_token,
        server: 'test-server',
        service: 'test-service',
        storage: 'keychain',
      });
      const isValid = await SecureTokenStorage.isTokenValid();
      expect(isValid).toBe(true);

      // Get user info
      mockAsyncStorage.getItem.mockResolvedValueOnce('').mockResolvedValueOnce('');
      const userRole = await SecureTokenStorage.getUserRole();
      const userEmail = await SecureTokenStorage.getUserEmail();
      expect(userRole).toBe('');
      expect(userEmail).toBe('');

      // Remove token
      await SecureTokenStorage.removeToken();
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    });

    it('should handle configuration changes', async () => {
      const customConfig: SecureStorageConfig = {
        encryptionKeyId: 'test-key',
        storeNamespace: 'test-store',
      };

      SecureTokenStorage.configure(customConfig);
      
      // Verify configuration is applied
      const config = SecureTokenStorage.getConfig();
      expect(config).toEqual(customConfig);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle storage operation failures gracefully', async () => {
      mockKeychain.setInternetCredentials.mockRejectedValue(new Error('Storage failed'));
      mockAsyncStorage.setItem.mockRejectedValue(new Error('AsyncStorage failed'));

      // setSecureItem doesn't have error handling, so this should throw
      await expect(SecureTokenStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'value')).rejects.toThrow('Storage failed');
      
      // AsyncStorage errors should also throw
      await expect(SecureTokenStorage.setItem('regular-key', 'value')).rejects.toThrow('AsyncStorage failed');
    });

    it('should handle malformed JWT tokens', async () => {
      const malformedTokens = [
        '',
        'invalid',
        'header.payload',
        'header.payload.signature.extra',
        'header..signature',
      ];

      for (const token of malformedTokens) {
        const result = SecureTokenStorage.parseJWT(token);
        expect(result).toBeNull();
      }
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        SecureTokenStorage.setItem(`key-${i}`, `value-${i}`)
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle large data storage', async () => {
      const largeData = 'x'.repeat(10000);
      
      await expect(SecureTokenStorage.setItem('large-key', largeData)).resolves.toBeUndefined();
    });

    it('should handle special characters in keys and values', async () => {
      const specialKey = 'key-with-special-chars!@#$%^&*()';
      const specialValue = 'value-with-unicode-ñáéíóú-中文-日本語';
      
      await expect(SecureTokenStorage.setItem(specialKey, specialValue)).resolves.toBeUndefined();
    });
  });
}); 

describe('End-to-End', () => {
  const secureKey = STORAGE_KEYS.ACCESS_TOKEN;
  const nonSecureKey = 'test_non_secure_key';
  const secureValue = 'secure_value';
  const nonSecureValue = 'non_secure_value';
  const token: AuthToken = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6Im1lcmNoYW50IiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiZXhwIjoxNzAwMDAwMDAwfQ.signature',
    token_type: 'Bearer',
    expires_in: 3600,
  };

  afterEach(() => {
    jest.clearAllMocks();
    // @ts-ignore: allow simulating absence of window for platform detection
    (global as any).window = undefined;
  });

  describe('React Native Platform', () => {
    beforeEach(() => {
      // @ts-ignore: allow simulating absence of window for platform detection
      (global as any).window = undefined;
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);
      mockKeychain.setInternetCredentials.mockResolvedValue(false);
      mockKeychain.getInternetCredentials.mockResolvedValue(false);
      mockKeychain.resetInternetCredentials.mockResolvedValue();
    });

    it('should store, retrieve, and remove secure and non-secure items', async () => {
      // Secure item
      await SecureTokenStorage.setItem(secureKey, secureValue);
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(secureKey, secureKey, secureValue);
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: secureKey,
        password: secureValue,
        server: 'test-server',
        service: 'test-service',
        storage: 'keychain',
      });
      const retrievedSecure = await SecureTokenStorage.getItem(secureKey);
      expect(retrievedSecure).toBe(secureValue);
      await SecureTokenStorage.removeItem(secureKey);
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(secureKey);

      // Non-secure item
      await SecureTokenStorage.setItem(nonSecureKey, nonSecureValue);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(nonSecureKey, nonSecureValue);
      mockAsyncStorage.getItem.mockResolvedValue(nonSecureValue);
      const retrievedNonSecure = await SecureTokenStorage.getItem(nonSecureKey);
      expect(retrievedNonSecure).toBe(nonSecureValue);
      await SecureTokenStorage.removeItem(nonSecureKey);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(nonSecureKey);
    });

    it('should store, retrieve, and validate token and user info', async () => {
      // Store token
      await SecureTokenStorage.storeToken(token);
      expect(mockKeychain.setInternetCredentials).toHaveBeenCalledWith(secureKey, secureKey, token.access_token);
      // Simulate token retrieval
      mockKeychain.getInternetCredentials.mockResolvedValue({
        username: secureKey,
        password: token.access_token,
        server: 'test-server',
        service: 'test-service',
        storage: 'keychain',
      });
      const retrievedToken = await SecureTokenStorage.getToken();
      expect(retrievedToken).toBe(token.access_token);
      // Token validity
      mockAsyncStorage.getItem.mockResolvedValue((Date.now() + 3600000).toString());
      const isValid = await SecureTokenStorage.isTokenValid();
      expect(isValid).toBe(true);
      // Store user info
      await SecureTokenStorage.storeUserInfo(token.access_token);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ROLE, 'merchant');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL, 'user@example.com');
      // Retrieve user info
      mockAsyncStorage.getItem.mockResolvedValueOnce('merchant').mockResolvedValueOnce('user@example.com');
      const role = await SecureTokenStorage.getUserRole();
      const email = await SecureTokenStorage.getUserEmail();
      expect(role).toBe('merchant');
      expect(email).toBe('user@example.com');
      // Clear all
      await SecureTokenStorage.clearAll();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_ROLE);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_EMAIL);
      expect(mockKeychain.resetInternetCredentials).toHaveBeenCalledWith(secureKey);
    });
  });
}); 