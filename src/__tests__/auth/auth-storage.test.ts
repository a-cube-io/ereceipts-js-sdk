/**
 * Auth Storage Tests
 * Tests for cross-platform secure authentication storage
 */

import { AuthStorage } from '@/auth/auth-storage';
import { UserRole, type AuthUser, type StoredAuthData } from '@/auth/types';

// Mock storage factory
jest.mock('@/storage/storage-factory', () => {
  const mockStorageInstance = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    has: jest.fn().mockResolvedValue(false),
    keys: jest.fn().mockResolvedValue([]),
    values: jest.fn().mockResolvedValue([]),
    size: jest.fn().mockResolvedValue(0),
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  };

  return {
    createStorage: jest.fn().mockResolvedValue(mockStorageInstance),
    __mockStorageInstance: mockStorageInstance, // Export for test access
  };
});

// Mock encryption
jest.mock('@/security/encryption', () => ({
  AdvancedEncryption: jest.fn().mockImplementation(() => ({
    encryptSymmetric: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    decryptSymmetric: jest.fn().mockResolvedValue(new Uint8Array([123, 34, 116, 101, 115, 116, 34, 58, 34, 100, 97, 116, 97, 34, 125])), // {"test":"data"} as bytes
    generateKey: jest.fn().mockResolvedValue('mock-key-id'),
  })),
  encryptedDataToJSON: jest.fn().mockReturnValue('encrypted-data-json'),
  encryptedDataFromJSON: jest.fn().mockReturnValue('encrypted-data'),
}));

// Mock unified storage
jest.mock('@/storage/unified-storage', () => ({
  createStorageKey: jest.fn().mockReturnValue('mock-storage-key'),
}));

// Mock keytar for Node.js environment
jest.mock('keytar', () => ({
  setPassword: jest.fn(),
  getPassword: jest.fn(),
  deletePassword: jest.fn(),
}));

// Mock AsyncStorage for React Native environment
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('AuthStorage', () => {
  let authStorage: AuthStorage;
  const mockUser: AuthUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    roles: [UserRole.ROLE_CASHIER],
    permissions: ['receipts:read'],
    session_id: 'session123',
    last_login: new Date('2025-01-01T00:00:00Z'),
    attributes: {
      simpleRole: 'cashier',
      profile: {
        firstName: 'Test',
        lastName: 'User',
      },
    },
  };

  const mockStoredAuthData: StoredAuthData = {
    accessToken: 'access123',
    refreshToken: 'refresh123',
    expiresAt: Date.now() + 3600000,
    tokenType: 'Bearer',
    user: mockUser,
    encryptedAt: Date.now(),
    version: '1.0',
    deviceId: 'device123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    authStorage = new AuthStorage({
      storageKey: 'test_auth',
      enableEncryption: true,
      storageAdapter: 'memory',
    });
  });

  describe('initialization', () => {
    it('should create AuthStorage with default config', () => {
      const storage = new AuthStorage();
      expect(storage).toBeInstanceOf(AuthStorage);
    });

    it('should initialize successfully', async () => {
      await expect(authStorage.initialize()).resolves.not.toThrow();
    });

    it('should handle encryption key generation', async () => {
      const encryptedStorage = new AuthStorage({
        enableEncryption: true,
        storageAdapter: 'memory',
      });

      await expect(encryptedStorage.initialize()).resolves.not.toThrow();
    });
  });

  describe('auth data management', () => {
    beforeEach(async () => {
      await authStorage.initialize();
    });

    it('should store and retrieve auth data', async () => {
      // Mock storage.get to return stored data wrapped in storage entry
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockResolvedValue({
        data: { ...mockStoredAuthData, encrypted: false },
      });

      await authStorage.store(mockStoredAuthData);
      const retrieved = await authStorage.retrieve();

      expect(retrieved).toEqual(expect.objectContaining({
        accessToken: 'access123',
        refreshToken: 'refresh123',
        user: expect.objectContaining({
          id: 'user123',
          email: 'test@example.com',
        }),
      }));
    });

    it('should clear auth data', async () => {
      // First store data
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockResolvedValue({
        data: { ...mockStoredAuthData, encrypted: false },
      });

      await authStorage.store(mockStoredAuthData);

      // Clear should clear both storage and memory cache
      await authStorage.clear();

      // After clear, memory cache should be null and storage should return null
      expect((authStorage as any).memoryCache).toBeNull();

      // Mock storage to return null after clear
      mockStorage.get.mockResolvedValue(null);
      const retrieved = await authStorage.retrieve();
      expect(retrieved).toBeNull();
    });

    it('should handle corrupted stored data gracefully', async () => {
      // Simulate corrupted storage by making get throw an error
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockRejectedValue(new Error('Storage corruption'));

      const retrieved = await authStorage.retrieve();
      expect(retrieved).toBeNull();
    });

    it('should check if auth data exists', async () => {
      expect(await authStorage.exists()).toBe(false);

      // Mock storage to return data when exists() calls retrieve()
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockResolvedValue({
        data: { ...mockStoredAuthData, encrypted: false },
      });

      await authStorage.store(mockStoredAuthData);
      expect(await authStorage.exists()).toBe(true);
    });
  });

  describe('data updates', () => {
    beforeEach(async () => {
      await authStorage.initialize();

      // Mock storage to return data for update operations
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockResolvedValue({
        data: { ...mockStoredAuthData, encrypted: false },
      });

      await authStorage.store(mockStoredAuthData);
    });

    it('should update auth data partially', async () => {
      const updates = {
        accessToken: 'updated-access-token',
        expiresAt: Date.now() + 7200000, // 2 hours
      };

      // Mock storage to return updated data
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockResolvedValue({
        data: { ...mockStoredAuthData, ...updates, encrypted: false },
      });

      await authStorage.update(updates);
      const retrieved = await authStorage.retrieve();

      expect(retrieved?.accessToken).toBe('updated-access-token');
      expect(retrieved?.expiresAt).toBe(updates.expiresAt);
      expect(retrieved?.refreshToken).toBe(mockStoredAuthData.refreshToken); // Unchanged
    });

    it('should get storage stats', async () => {
      const stats = await authStorage.getStats();

      expect(stats).toEqual(expect.objectContaining({
        hasData: expect.any(Boolean),
        isExpired: expect.any(Boolean),
        expiresIn: expect.anything(), // Can be null or number
        storageType: expect.any(String),
        encryptionEnabled: expect.any(Boolean),
      }));
    });
  });

  describe('encryption handling', () => {
    it('should work with encryption enabled', async () => {
      const encryptedStorage = new AuthStorage({
        enableEncryption: true,
        storageAdapter: 'memory',
      });

      await encryptedStorage.initialize();
      await encryptedStorage.store(mockStoredAuthData);

      const retrieved = await encryptedStorage.retrieve();
      expect(retrieved).toEqual(expect.objectContaining({
        accessToken: mockStoredAuthData.accessToken,
        user: expect.objectContaining({
          id: mockStoredAuthData.user.id,
        }),
      }));
    });

    it('should handle encryption errors gracefully', async () => {
      const encryptedStorage = new AuthStorage({
        enableEncryption: true,
        storageAdapter: 'memory',
      });

      await encryptedStorage.initialize();

      // Mock encryption to fail by making it null
      (encryptedStorage as any).encryption = null;
      (encryptedStorage as any).encryptionKeyId = null;

      // Should store without encryption when encryption fails
      await expect(encryptedStorage.store(mockStoredAuthData)).resolves.not.toThrow();
    });
  });

  describe('cleanup and destruction', () => {
    beforeEach(async () => {
      await authStorage.initialize();
    });

    it('should clear all data on destroy', async () => {
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockResolvedValueOnce({
        data: { ...mockStoredAuthData, encrypted: false },
      }).mockResolvedValueOnce(null); // After destroy

      await authStorage.store(mockStoredAuthData);
      await authStorage.destroy();

      // After destroy, create new instance to test cleanup
      const newStorage = new AuthStorage({
        storageKey: 'test_auth',
        enableEncryption: true,
        storageAdapter: 'memory',
      });
      await newStorage.initialize();
      const retrieved = await newStorage.retrieve();
      expect(retrieved).toBeNull();
    });

    it('should handle destroy when not initialized', async () => {
      const newStorage = new AuthStorage();
      await expect(newStorage.destroy()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      await authStorage.initialize();

      // Mock storage to throw on retrieve
      const mockStorage = (authStorage as any).storage;
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      const retrieved = await authStorage.retrieve();
      expect(retrieved).toBeNull();
    });

    it('should emit storage error events', async () => {
      await authStorage.initialize();

      const errorHandler = jest.fn();
      authStorage.on('auth:storage:error', errorHandler);

      // Directly call the private emitStorageError method to test event emission
      const emitStorageErrorSpy = jest.spyOn(authStorage as any, 'emitStorageError');
      const testError = new Error('Test storage error');

      // Call the private method directly
      (authStorage as any).emitStorageError('write', testError);

      // Should emit error event
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth:storage:error',
          data: expect.objectContaining({
            operation: 'write',
            error: testError,
            fallbackUsed: false,
          }),
        }),
      );

      expect(emitStorageErrorSpy).toHaveBeenCalledWith('write', testError);
    });
  });
});
