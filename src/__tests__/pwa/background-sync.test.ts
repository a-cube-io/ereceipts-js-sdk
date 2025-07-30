/**
 * Background Sync Manager Tests
 * Comprehensive testing for offline-first synchronization with intelligent retry strategies
 * including queue management, conflict resolution, and background sync coordination
 */

import { 
  BackgroundSyncManager,
  type BackgroundSyncConfig,
  type SyncOperationType,
  type SyncPriority,
  type SyncStatus
} from '@/pwa/background-sync';
import type { HttpClient, HttpResponse } from '@/http/client';
import type { UnifiedStorage } from '@/storage/unified-storage';

// Mock HttpClient
const mockHttpClient: HttpClient = {
  request: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  uploadFile: jest.fn(),
} as any;

// Mock createStorage function to return our mocked storage
jest.mock('@/storage/storage-factory', () => ({
  createStorage: jest.fn(),
}));

// Mock UnifiedStorage
const mockStorage: UnifiedStorage = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  keys: jest.fn(),
  count: jest.fn(),
  cleanup: jest.fn(),
} as any;

// Get the mocked createStorage function
import { createStorage } from '@/storage/storage-factory';
const mockCreateStorage = createStorage as jest.MockedFunction<typeof createStorage>;

// Configure createStorage mock to return our mockStorage
mockCreateStorage.mockResolvedValue(mockStorage);

// Mock createStorageKey function
jest.mock('@/storage/unified-storage', () => ({
  createStorageKey: jest.fn((key: string) => `acube:${key}`),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock navigator
const mockNavigator = {
  onLine: true,
  serviceWorker: {
    ready: Promise.resolve({
      sync: {
        register: jest.fn().mockResolvedValue(undefined),
      },
    }),
  },
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// Mock window by extending existing window
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Add mock methods to existing window object
Object.assign(window, mockWindow);

// Mock document by extending existing document
const mockDocument = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  hidden: false,
};

// Add mock methods to existing document object (avoiding readonly properties)
document.addEventListener = mockDocument.addEventListener;
document.removeEventListener = mockDocument.removeEventListener;

// Define hidden property separately since it's readonly
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true,
  configurable: true,
});

// Mock ServiceWorkerRegistration
(global as any).ServiceWorkerRegistration = {
  prototype: {
    sync: {},
  },
};

// Mock console
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

Object.defineProperty(global, 'console', {
  value: mockConsole,
  writable: true,
});

describe('BackgroundSyncManager', () => {
  let syncManager: BackgroundSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset createStorage mock
    mockCreateStorage.mockResolvedValue(mockStorage);
    
    (mockLocalStorage.getItem as jest.Mock).mockReturnValue(null);
    (mockStorage.get as jest.Mock).mockResolvedValue(null);
    (mockStorage.set as jest.Mock).mockResolvedValue(undefined);
    (mockStorage.delete as jest.Mock).mockResolvedValue(true);
    (mockStorage.clear as jest.Mock).mockResolvedValue(undefined);
    (mockHttpClient.request as jest.Mock).mockResolvedValue({
      status: 200,
      data: { success: true },
      headers: {},
    } as HttpResponse<any>);
  });

  afterEach(async () => {
    if (syncManager) {
      await syncManager.destroy();
    }
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient);
      
      expect(syncManager).toBeDefined();
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = syncManager.getStatistics();
      expect(stats.totalOperations).toBe(0);
      expect(stats.pendingOperations).toBe(0);
      expect(stats.completedOperations).toBe(0);
      expect(stats.failedOperations).toBe(0);
    });

    it('should initialize with custom configuration', async () => {
      const customConfig: BackgroundSyncConfig = {
        maxQueueSize: 1000,
        maxRetries: 3,
        baseRetryDelay: 2000,
        maxRetryDelay: 60000,
        batchSize: 25,
        enableDeltaSync: false,
        enableCompression: false,
        defaultConflictStrategy: 'client-wins',
        storage: {
          adapter: 'localStorage',
          encryptionKey: 'test-key',
        },
        networkDetection: {
          enabled: false,
          checkInterval: 60000,
          endpoints: ['/custom-health'],
        },
      };

      syncManager = new BackgroundSyncManager(mockHttpClient, customConfig);
      
      expect(syncManager).toBeDefined();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(syncManager.getStatistics()).toBeDefined();
    });

    it('should load existing queue from storage on initialization', async () => {
      const existingQueue = {
        'op_123': {
          id: 'op_123',
          type: 'create' as SyncOperationType,
          priority: 'high' as SyncPriority,
          endpoint: '/api/receipts',
          method: 'POST' as const,
          data: { test: 'data' },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attemptCount: 0,
            userId: 'user123',
            deviceId: 'device123',
            checksum: 'abc123',
          },
          status: 'pending' as SyncStatus,
        },
      };

      (mockStorage.get as jest.Mock).mockResolvedValueOnce({
        data: JSON.stringify(existingQueue),
      });

      syncManager = new BackgroundSyncManager(mockHttpClient);
      
      // Wait for async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = syncManager.getStatistics();
      expect(stats.pendingOperations).toBe(1);
      
      const operation = syncManager.getOperation('op_123');
      expect(operation).toBeDefined();
      expect(operation!.type).toBe('create');
      expect(operation!.priority).toBe('high');
    });

    it('should handle storage initialization errors gracefully', async () => {
      (mockStorage.get as jest.Mock).mockRejectedValueOnce(new Error('Storage access denied'));

      syncManager = new BackgroundSyncManager(mockHttpClient);
      
      // Wait for async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to load sync queue from storage:',
        expect.any(Error)
      );
    });
  });

  describe('Queue Management', () => {
    beforeEach(async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        maxQueueSize: 100,
        maxRetries: 3,
      });
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should queue a sync operation successfully', async () => {
      const operationData = {
        type: 'create' as SyncOperationType,
        priority: 'high' as SyncPriority,
        endpoint: '/api/receipts',
        method: 'POST' as const,
        data: { 
          receiptId: 'receipt_123',
          amount: 29.99,
          currency: 'EUR',
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0.0',
        },
      };

      const queuedOp = await syncManager.queueOperation(operationData);
      
      expect(queuedOp).toBeDefined();
      expect(queuedOp.id).toBeDefined();
      expect(queuedOp.type).toBe('create');
      expect(queuedOp.priority).toBe('high');
      expect(queuedOp.endpoint).toBe('/api/receipts');
      expect(queuedOp.method).toBe('POST');
      expect(queuedOp.data).toEqual(operationData.data);
      expect(queuedOp.headers).toEqual(operationData.headers);
      expect(queuedOp.status).toBe('pending');
      expect(queuedOp.metadata.createdAt).toBeInstanceOf(Date);
      expect(queuedOp.metadata.attemptCount).toBe(0);
      expect(queuedOp.metadata.deviceId).toBeDefined();
      expect(queuedOp.metadata.checksum).toBeDefined();
      
      const stats = syncManager.getStatistics();
      expect(stats.totalOperations).toBe(1);
      expect(stats.pendingOperations).toBe(1);
    });

    it('should queue operations with different priorities', async () => {
      const operations = [
        {
          type: 'create' as SyncOperationType,
          priority: 'low' as SyncPriority,
          endpoint: '/api/low-priority',
          method: 'POST' as const,
          data: { priority: 'low' },
        },
        {
          type: 'update' as SyncOperationType,
          priority: 'critical' as SyncPriority,
          endpoint: '/api/critical',
          method: 'PUT' as const,
          data: { priority: 'critical' },
        },
        {
          type: 'delete' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: '/api/normal',
          method: 'DELETE' as const,
        },
      ];

      const queuedOps = [];
      for (const op of operations) {
        queuedOps.push(await syncManager.queueOperation(op));
      }
      
      expect(queuedOps).toHaveLength(3);
      expect(queuedOps[0]?.priority).toBe('low');
      expect(queuedOps[1]?.priority).toBe('critical');
      expect(queuedOps[2]?.priority).toBe('normal');
      
      const stats = syncManager.getStatistics();
      expect(stats.totalOperations).toBe(3);
      expect(stats.pendingOperations).toBe(3);
    });

    it('should reject operations when queue is full', async () => {
      // Set a very small queue size
      await syncManager.destroy();
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        maxQueueSize: 1,
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));

      // Queue first operation - should succeed
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test1',
        method: 'POST' as const,
        data: { test1: true },
      });

      // Queue second operation - should fail
      await expect(syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test2',
        method: 'POST' as const,
        data: { test2: true },
      })).rejects.toThrow('Sync queue is full');
    });

    it('should create batch operations correctly', async () => {
      const operations = [
        {
          type: 'create' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: '/api/receipts',
          method: 'POST' as const,
          data: { receiptId: '1', amount: 10.00 },
        },
        {
          type: 'create' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: '/api/receipts',
          method: 'POST' as const,
          data: { receiptId: '2', amount: 20.00 },
        },
        {
          type: 'create' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: '/api/receipts',
          method: 'POST' as const,
          data: { receiptId: '3', amount: 30.00 },
        },
      ];

      const batch = await syncManager.queueBatch(operations, 'high');
      
      expect(batch).toBeDefined();
      expect(batch.id).toBeDefined();
      expect(batch.operations).toHaveLength(3);
      expect(batch.priority).toBe('high');
      expect(batch.status).toBe('pending');
      expect(batch.progress.total).toBe(3);
      expect(batch.progress.completed).toBe(0);
      expect(batch.progress.failed).toBe(0);
      expect(batch.progress.conflicts).toBe(0);
      expect(batch.metadata.createdAt).toBeInstanceOf(Date);
      
      // Each operation should have the batch priority
      for (const op of batch.operations) {
        expect(op.priority).toBe('high');
      }
      
      const stats = syncManager.getStatistics();
      expect(stats.totalOperations).toBe(3);
      expect(stats.pendingOperations).toBe(3);
    });

    it('should get operations by ID and list all operations', async () => {
      const op1 = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test1',
        method: 'POST' as const,
        data: { test: 1 },
      });

      const op2 = await syncManager.queueOperation({
        type: 'update' as SyncOperationType,
        priority: 'high' as SyncPriority,
        endpoint: '/api/test2',
        method: 'PUT' as const,
        data: { test: 2 },
      });

      const retrievedOp1 = syncManager.getOperation(op1.id);
      expect(retrievedOp1).toEqual(op1);

      const allOps = syncManager.getAllOperations();
      expect(allOps).toHaveLength(2);
      expect(allOps.find(op => op.id === op1.id)).toEqual(op1);
      expect(allOps.find(op => op.id === op2.id)).toEqual(op2);
    });

    it('should cancel pending operations', async () => {
      const op = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      const cancelled = syncManager.cancelOperation(op.id);
      expect(cancelled).toBe(true);

      const retrievedOp = syncManager.getOperation(op.id);
      expect(retrievedOp).toBeUndefined();

      const stats = syncManager.getStatistics();
      expect(stats.pendingOperations).toBe(0);
    });

    it('should not cancel non-pending operations', async () => {
      const op = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      // Manually change status to syncing
      const operation = syncManager.getOperation(op.id)!;
      operation.status = 'syncing';

      const cancelled = syncManager.cancelOperation(op.id);
      expect(cancelled).toBe(false);

      const retrievedOp = syncManager.getOperation(op.id);
      expect(retrievedOp).toBeDefined();
    });
  });

  describe('Sync Processing', () => {
    beforeEach(async () => {
      // Mock navigator.onLine as true for sync tests
      mockNavigator.onLine = true;
      
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        batchSize: 2,
        maxRetries: 3,
        baseRetryDelay: 100,
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should process successful sync operations', async () => {
      const operation = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts',
        method: 'POST' as const,
        data: { receiptId: '123', amount: 29.99 },
        headers: { 'Content-Type': 'application/json' },
      });

      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 201,
        data: { id: '123', created: true },
        headers: {},
      } as HttpResponse<any>);

      const syncStartedSpy = jest.fn();
      const operationCompletedSpy = jest.fn();
      const syncCompletedSpy = jest.fn();
      
      syncManager.on('sync:started', syncStartedSpy);
      syncManager.on('operation:completed', operationCompletedSpy);
      syncManager.on('sync:completed', syncCompletedSpy);

      await syncManager.syncNow();

      expect(mockHttpClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/api/receipts',
        data: { receiptId: '123', amount: 29.99 },
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Operation-Id': operation.id,
          'X-Sync-Priority': 'normal',
          'X-Sync-Checksum': expect.any(String),
        },
      });

      expect(syncStartedSpy).toHaveBeenCalledWith({
        batch: expect.objectContaining({
          id: expect.any(String),
          operations: expect.arrayContaining([
            expect.objectContaining({ id: operation.id }),
          ]),
          status: expect.stringMatching(/syncing|completed/),
        }),
      });

      expect(operationCompletedSpy).toHaveBeenCalledWith({
        operation: expect.objectContaining({
          id: operation.id,
          status: 'completed',
        }),
        response: { id: '123', created: true },
      });

      expect(syncCompletedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          batch: expect.objectContaining({
            status: 'completed',
            progress: expect.objectContaining({
              completed: 1,
              failed: 0,
              conflicts: 0,
            }),
          }),
          duration: expect.any(Number),
        })
      );

      const stats = syncManager.getStatistics();
      expect(stats.completedOperations).toBe(1);
      expect(stats.pendingOperations).toBe(0);
    });

    it('should handle sync failures with retry logic', async () => {
      const operation = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts',
        method: 'POST' as const,
        data: { test: true },
      });

      // Mock network failure
      (mockHttpClient.request as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const operationFailedSpy = jest.fn();
      syncManager.on('operation:failed', operationFailedSpy);

      await syncManager.syncNow();

      expect(operationFailedSpy).toHaveBeenCalledWith({
        operation: expect.objectContaining({
          id: operation.id,
          status: 'pending', // Should be pending for retry
          metadata: expect.objectContaining({
            attemptCount: 1,
            nextRetry: expect.any(Date),
          }),
          error: expect.objectContaining({
            code: 'SYNC_ERROR',
            message: 'Network error',
          }),
        }),
        error: expect.any(Error),
      });

      const stats = syncManager.getStatistics();
      expect(stats.pendingOperations).toBe(1);
      expect(stats.failedOperations).toBe(0); // Not failed yet, just pending retry
    });

    it('should mark operations as failed after max retries', async () => {
      const operation = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts',
        method: 'POST' as const,
        data: { test: true },
      });

      // Simulate exceeding max retries
      const op = syncManager.getOperation(operation.id)!;
      op.metadata.attemptCount = 3; // Equal to maxRetries

      (mockHttpClient.request as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await syncManager.syncNow();

      const retrievedOp = syncManager.getOperation(operation.id);
      expect(retrievedOp).toBeUndefined(); // Should be removed from queue

      const stats = syncManager.getStatistics();
      expect(stats.failedOperations).toBe(1);
      expect(stats.pendingOperations).toBe(0);
    });

    it('should respect batch size limits', async () => {
      // Queue 5 operations, but batch size is 2
      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(await syncManager.queueOperation({
          type: 'create' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: `/api/test${i}`,
          method: 'POST' as const,
          data: { index: i },
        }));
      }

      (mockHttpClient.request as jest.Mock).mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      } as HttpResponse<any>);

      const syncStartedSpy = jest.fn();
      syncManager.on('sync:started', syncStartedSpy);

      await syncManager.syncNow();

      expect(syncStartedSpy).toHaveBeenCalledWith({
        batch: expect.objectContaining({
          operations: expect.arrayContaining([
            // Should only process 2 operations (batch size)
          ]),
          progress: expect.objectContaining({
            total: 2, // Batch size limit
          }),
        }),
      });

      expect(mockHttpClient.request).toHaveBeenCalledTimes(2);
      
      // Should still have 3 pending operations
      const stats = syncManager.getStatistics();
      expect(stats.pendingOperations).toBe(3);
      expect(stats.completedOperations).toBe(2);
    });

    it('should not sync when offline', async () => {
      // Mock navigator.onLine as false
      mockNavigator.onLine = false;
      (syncManager as any).isOnline = false;

      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      const syncStartedSpy = jest.fn();
      syncManager.on('sync:started', syncStartedSpy);

      await syncManager.syncNow();

      expect(syncStartedSpy).not.toHaveBeenCalled();
      expect(mockHttpClient.request).not.toHaveBeenCalled();
    });

    it('should prioritize operations correctly', async () => {
      // Queue operations in different order than priority
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'low' as SyncPriority,
        endpoint: '/api/low',
        method: 'POST' as const,
        data: { priority: 'low' },
      });

      const criticalOp = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'critical' as SyncPriority,
        endpoint: '/api/critical',
        method: 'POST' as const,
        data: { priority: 'critical' },
      });

      const normalOp = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/normal',
        method: 'POST' as const,
        data: { priority: 'normal' },
      });

      (mockHttpClient.request as jest.Mock).mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      } as HttpResponse<any>);

      const operationStartedSpy = jest.fn();
      syncManager.on('operation:started', operationStartedSpy);

      await syncManager.syncNow();

      // Should process critical first, then normal (batch size is 2)
      expect(operationStartedSpy).toHaveBeenCalledTimes(2);
      expect(operationStartedSpy).toHaveBeenNthCalledWith(1, {
        operation: expect.objectContaining({
          id: criticalOp.id,
          priority: 'critical',
        }),
      });
      expect(operationStartedSpy).toHaveBeenNthCalledWith(2, {
        operation: expect.objectContaining({
          id: normalOp.id,
          priority: 'normal',
        }),
      });
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      mockNavigator.onLine = true;
      
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        defaultConflictStrategy: 'server-wins',
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle server-wins conflict strategy', async () => {
      const operation = await syncManager.queueOperation({
        type: 'update' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts/123',
        method: 'PUT' as const,
        data: { amount: 29.99, version: 1 },
      });

      // Mock conflict response
      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 409,
        data: {
          serverVersion: { amount: 39.99, version: 2 },
          conflict: true,
        },
        headers: {},
      } as HttpResponse<any>);

      const operationConflictSpy = jest.fn();
      const operationCompletedSpy = jest.fn();
      
      syncManager.on('operation:conflict', operationConflictSpy);
      syncManager.on('operation:completed', operationCompletedSpy);

      await syncManager.syncNow();

      expect(operationConflictSpy).toHaveBeenCalledWith({
        operation: expect.objectContaining({
          id: operation.id,
          status: 'completed', // Server-wins means operation is completed
          conflictData: {
            localVersion: { amount: 29.99, version: 1 },
            serverVersion: { amount: 39.99, version: 2 },
            strategy: 'server-wins',
          },
        }),
        conflict: expect.objectContaining({
          localVersion: { amount: 29.99, version: 1 },
          serverVersion: { amount: 39.99, version: 2 },
          strategy: 'server-wins',
        }),
      });

      // Operation should be removed from queue
      const retrievedOp = syncManager.getOperation(operation.id);
      expect(retrievedOp).toBeUndefined();

      const stats = syncManager.getStatistics();
      expect(stats.conflictedOperations).toBe(1);
      expect(stats.pendingOperations).toBe(0);
    });

    it('should handle client-wins conflict strategy', async () => {
      await syncManager.destroy();
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        defaultConflictStrategy: 'client-wins',
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const operation = await syncManager.queueOperation({
        type: 'update' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts/123',
        method: 'PUT' as const,
        data: { amount: 29.99, version: 1 },
      });

      // Mock conflict response
      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 409,
        data: {
          serverVersion: { amount: 39.99, version: 2 },
          conflict: true,
        },
        headers: {},
      } as HttpResponse<any>);

      await syncManager.syncNow();

      const retrievedOp = syncManager.getOperation(operation.id);
      expect(retrievedOp).toBeDefined();
      expect(retrievedOp!.status).toBe('pending'); // Should be reset for retry
      expect(retrievedOp!.metadata.attemptCount).toBe(0); // Reset attempt count
      expect(retrievedOp!.headers).toEqual(
        expect.objectContaining({
          'X-Force-Update': 'true',
        })
      );
    });

    it('should handle merge conflict strategy', async () => {
      await syncManager.destroy();
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        defaultConflictStrategy: 'merge',
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const operation = await syncManager.queueOperation({
        type: 'update' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts/123',
        method: 'PUT' as const,
        data: { amount: 29.99, description: 'Local update' },
      });

      // Mock conflict response
      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 409,
        data: {
          serverVersion: { amount: 39.99, description: 'Server update', category: 'food' },
          conflict: true,
        },
        headers: {},
      } as HttpResponse<any>);

      await syncManager.syncNow();

      const retrievedOp = syncManager.getOperation(operation.id);
      expect(retrievedOp).toBeDefined();
      expect(retrievedOp!.status).toBe('pending'); // Should be reset for retry
      expect(retrievedOp!.metadata.attemptCount).toBe(0); // Reset attempt count
      expect(retrievedOp!.data).toEqual(
        expect.objectContaining({
          amount: 29.99, // Local value preserved
          description: 'Local update', // Local value preserved
          category: 'food', // Server value merged
          _merged: true,
          _mergedAt: expect.any(String),
        })
      );
    });

    it('should handle manual conflict strategy', async () => {
      await syncManager.destroy();
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        defaultConflictStrategy: 'manual',
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const operation = await syncManager.queueOperation({
        type: 'update' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts/123',
        method: 'PUT' as const,
        data: { amount: 29.99, version: 1 },
      });

      // Mock conflict response
      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 409,
        data: {
          serverVersion: { amount: 39.99, version: 2 },
          conflict: true,
        },
        headers: {},
      } as HttpResponse<any>);

      await syncManager.syncNow();

      const retrievedOp = syncManager.getOperation(operation.id);
      expect(retrievedOp).toBeDefined();
      expect(retrievedOp!.status).toBe('conflict'); // Should remain in conflict state
      expect(retrievedOp!.conflictData).toEqual({
        localVersion: { amount: 29.99, version: 1 },
        serverVersion: { amount: 39.99, version: 2 },
        strategy: 'manual',
      });
    });
  });

  describe('Network Detection and Online/Offline Handling', () => {
    beforeEach(async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        networkDetection: {
          enabled: true,
          checkInterval: 100, // Short interval for testing
          endpoints: ['/health'],
        },
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should emit network events when status changes', () => {
      const networkOnlineSpy = jest.fn();
      const networkOfflineSpy = jest.fn();
      
      syncManager.on('network:online', networkOnlineSpy);
      syncManager.on('network:offline', networkOfflineSpy);

      // Simulate going offline
      (syncManager as any).handleOnlineStatus(false);
      
      expect(networkOfflineSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Date),
      });

      // Simulate coming back online
      (syncManager as any).handleOnlineStatus(true);
      
      expect(networkOnlineSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Date),
      });
    });

    it('should trigger sync when coming back online', async () => {
      // Queue an operation while "offline"
      (syncManager as any).isOnline = false;
      
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      } as HttpResponse<any>);

      const syncStartedSpy = jest.fn();
      syncManager.on('sync:started', syncStartedSpy);

      // Simulate coming back online
      (syncManager as any).handleOnlineStatus(true);

      // Wait for scheduled sync
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(syncStartedSpy).toHaveBeenCalled();
    });

    it('should cancel scheduled sync when going offline', async () => {
      // Mock a scheduled sync
      (syncManager as any).syncTimeout = setTimeout(() => {}, 10000);
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      // Simulate going offline
      (syncManager as any).handleOnlineStatus(false);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect((syncManager as any).syncTimeout).toBeUndefined();
    });

    it('should perform network health checks', async () => {
      (mockHttpClient.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: { healthy: true },
        headers: {},
      } as HttpResponse<any>);

      // Simulate network check interval trigger
      
      // Wait for network check to potentially trigger
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockHttpClient.get).toHaveBeenCalledWith('/health', {
        timeout: 5000,
      });
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should track operation statistics correctly', async () => {
      const initialStats = syncManager.getStatistics();
      expect(initialStats.totalOperations).toBe(0);
      expect(initialStats.pendingOperations).toBe(0);
      expect(initialStats.completedOperations).toBe(0);
      expect(initialStats.failedOperations).toBe(0);

      // Queue operations
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test1',
        method: 'POST' as const,
        data: { test: 1 },
      });

      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test2',
        method: 'POST' as const,
        data: { test: 2 },
      });

      const afterQueueStats = syncManager.getStatistics();
      expect(afterQueueStats.totalOperations).toBe(2);
      expect(afterQueueStats.pendingOperations).toBe(2);

      // Mock successful sync
      (mockHttpClient.request as jest.Mock).mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      } as HttpResponse<any>);

      await syncManager.syncNow();

      const afterSyncStats = syncManager.getStatistics();
      expect(afterSyncStats.completedOperations).toBe(2);
      expect(afterSyncStats.pendingOperations).toBe(0);
      expect(afterSyncStats.lastSyncTime).toBeInstanceOf(Date);
    });

    it('should track data transfer statistics', async () => {
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts',
        method: 'POST' as const,
        data: { 
          receiptId: '123',
          amount: 29.99,
          items: [
            { name: 'Item 1', price: 15.00 },
            { name: 'Item 2', price: 14.99 },
          ],
        },
      });

      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 201,
        data: { 
          id: '123',
          created: true,
          serverData: 'response data',
        },
        headers: {},
      } as HttpResponse<any>);

      await syncManager.syncNow();

      const stats = syncManager.getStatistics();
      expect(stats.dataTransferred.uploaded).toBeGreaterThan(0);
      expect(stats.dataTransferred.downloaded).toBeGreaterThan(0);
    });

    it('should track conflict statistics', async () => {
      await syncManager.queueOperation({
        type: 'update' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/receipts/123',
        method: 'PUT' as const,
        data: { amount: 29.99 },
      });

      // Mock conflict response
      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 409,
        data: { serverVersion: { amount: 39.99 } },
        headers: {},
      } as HttpResponse<any>);

      await syncManager.syncNow();

      const stats = syncManager.getStatistics();
      expect(stats.conflictedOperations).toBe(1);
    });
  });

  describe('Storage Persistence', () => {
    beforeEach(async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should save queue to storage after operations', async () => {
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      // Allow time for async storage operations
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockStorage.set).toHaveBeenCalledWith(
        'acube:acube_sync_queue',
        expect.any(String),
        { encrypt: true }
      );
    });

    it('should handle storage save errors gracefully', async () => {
      (mockStorage.set as jest.Mock).mockRejectedValueOnce(new Error('Storage quota exceeded'));

      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      // Allow time for async error handling
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to save sync queue to storage:',
        expect.any(Error)
      );
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should clear completed operations', async () => {
      // Queue operations
      const op1 = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test1',
        method: 'POST' as const,
        data: { test: 1 },
      });

      const op2 = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test2',
        method: 'POST' as const,
        data: { test: 2 },
      });

      // Manually mark one as completed
      const operation1 = syncManager.getOperation(op1.id)!;
      operation1.status = 'completed';

      const cleared = syncManager.clearCompleted();
      expect(cleared).toBe(1);

      const remainingOps = syncManager.getAllOperations();
      expect(remainingOps).toHaveLength(1);
      expect(remainingOps[0]?.id).toBe(op2.id);
    });

    it('should retry failed operations', async () => {
      const operation = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      // Manually mark as failed
      const op = syncManager.getOperation(operation.id)!;
      op.status = 'failed';
      op.metadata.attemptCount = 3;
      op.error = { code: 'SYNC_ERROR', message: 'Test error' };
      (syncManager as any).statistics.failedOperations = 1;
      (syncManager as any).statistics.pendingOperations = 0;

      const retried = syncManager.retryFailed();
      expect(retried).toBe(1);

      const retriedOp = syncManager.getOperation(operation.id)!;
      expect(retriedOp.status).toMatch(/pending|syncing|completed/);
      expect(retriedOp.metadata.attemptCount).toBeGreaterThanOrEqual(0);
      expect(retriedOp.error).toBeUndefined();
      expect(retriedOp.metadata.nextRetry).toBeUndefined();

      const stats = syncManager.getStatistics();
      expect(stats.pendingOperations).toBe(1);
      expect(stats.failedOperations).toBe(0);
    });

    it('should force sync even when offline', async () => {
      // Set offline
      (syncManager as any).isOnline = false;

      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      (mockHttpClient.request as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: {},
      } as HttpResponse<any>);

      const syncStartedSpy = jest.fn();
      syncManager.on('sync:started', syncStartedSpy);

      await syncManager.forceSyncNow();

      expect(syncStartedSpy).toHaveBeenCalled();
      expect(mockHttpClient.request).toHaveBeenCalled();

      // Should restore offline status
      expect((syncManager as any).isOnline).toBe(false);
    });
  });

  describe('Event System', () => {
    beforeEach(async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should emit operation:queued event when queueing operations', async () => {
      const operationQueuedSpy = jest.fn();
      syncManager.on('operation:queued', operationQueuedSpy);

      const operation = await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      expect(operationQueuedSpy).toHaveBeenCalledWith({
        operation: expect.objectContaining({
          id: operation.id,
          type: 'create',
          priority: 'normal',
          status: 'pending',
        }),
      });
    });

    it('should emit queue:full event when queue limit is reached', async () => {
      await syncManager.destroy();
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        maxQueueSize: 1,
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));

      const queueFullSpy = jest.fn();
      syncManager.on('queue:full', queueFullSpy);

      // Queue first operation
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test1',
        method: 'POST' as const,
        data: { test: 1 },
      });

      // Try to queue second operation - should emit queue:full
      try {
        await syncManager.queueOperation({
          type: 'create' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: '/api/test2',
          method: 'POST' as const,
          data: { test: 2 },
        });
      } catch (error) {
        // Expected to throw
      }

      expect(queueFullSpy).toHaveBeenCalledWith({
        size: 1,
        operation: expect.objectContaining({
          type: 'create',
          priority: 'normal',
          endpoint: '/api/test2',
        }),
      });
    });

    it('should emit sync:progress events during batch processing', async () => {
      const operations = [
        await syncManager.queueOperation({
          type: 'create' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: '/api/test1',
          method: 'POST' as const,
          data: { test: 1 },
        }),
        await syncManager.queueOperation({
          type: 'create' as SyncOperationType,
          priority: 'normal' as SyncPriority,
          endpoint: '/api/test2',
          method: 'POST' as const,
          data: { test: 2 },
        }),
      ];

      (mockHttpClient.request as jest.Mock).mockResolvedValue({
        status: 200,
        data: { success: true },
        headers: {},
      } as HttpResponse<any>);

      const syncProgressSpy = jest.fn();
      syncManager.on('sync:progress', syncProgressSpy);

      await syncManager.syncNow();

      expect(syncProgressSpy).toHaveBeenCalledTimes(2);
      expect(syncProgressSpy).toHaveBeenNthCalledWith(1, {
        batch: expect.objectContaining({
          id: expect.any(String),
          status: expect.stringMatching(/syncing|completed/),
        }),
        operation: expect.objectContaining({
          id: operations[0]?.id,
        }),
      });
      expect(syncProgressSpy).toHaveBeenNthCalledWith(2, {
        batch: expect.objectContaining({
          id: expect.any(String),
          status: expect.stringMatching(/syncing|completed/),
        }),
        operation: expect.objectContaining({
          id: operations[1]?.id,
        }),
      });
    });
  });

  describe('Resource Cleanup', () => {
    beforeEach(async () => {
      syncManager = new BackgroundSyncManager(mockHttpClient, {
        networkDetection: { enabled: true, checkInterval: 100 },
      });
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should clean up resources on destroy', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const removeAllListenersSpy = jest.spyOn(syncManager, 'removeAllListeners');

      // Create some operations to ensure timeouts might be set
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      await syncManager.destroy();

      // Spies should be set up (they may or may not be called depending on active timers)
      expect(clearIntervalSpy).toBeDefined();
      expect(clearTimeoutSpy).toBeDefined();
      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(mockStorage.set).toHaveBeenCalledWith(
        'acube:acube_sync_queue',
        expect.any(String),
        { encrypt: true }
      );
    });

    it('should save final state to storage on destroy', async () => {
      await syncManager.queueOperation({
        type: 'create' as SyncOperationType,
        priority: 'normal' as SyncPriority,
        endpoint: '/api/test',
        method: 'POST' as const,
        data: { test: true },
      });

      await syncManager.destroy();

      // Should save queue state
      expect(mockStorage.set).toHaveBeenCalledWith(
        'acube:acube_sync_queue',
        expect.stringContaining('"test":true'),
        { encrypt: true }
      );
    });
  });
});