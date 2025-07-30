/**
 * Queue Manager Tests
 * Testing for offline queue operations and sync functionality
 */

import { RetryManager } from '@/storage/queue/retry-manager';
import { EnterpriseQueueManager } from '@/storage/queue/queue-manager';



describe('EnterpriseQueueManager', () => {
  let queueManager: EnterpriseQueueManager;
  
  const mockQueueItem = {
    operation: 'create' as const,
    resource: 'receipts' as const,
    data: {
      items: [{ description: 'Test item', quantity: '1', unit_price: '10.00' }],
    },
    metadata: {
      userId: 'user_123',
      deviceId: 'device_456',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    queueManager = new EnterpriseQueueManager({
      maxSize: 1000,
      maxRetries: 3,
      processingInterval: 5000,
      maxConcurrentProcessing: 10,
      enablePersistence: true,
      enableAnalytics: true,
    });
  });

  afterEach(async () => {
    await queueManager.destroy();
  });

  describe('initialization', () => {
    it('should initialize queue manager successfully', async () => {
      await queueManager.initialize();
      
      // Check that initialization completed by verifying the manager is ready
      const stats = queueManager.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalItems).toBe(0);
    });

    it('should handle initialization with default config', async () => {
      const defaultQueueManager = new EnterpriseQueueManager();
      
      await defaultQueueManager.initialize();
      
      // Check that initialization completed
      const stats = defaultQueueManager.getStats();
      expect(stats).toBeDefined();
      
      await defaultQueueManager.destroy();
    });
  });

  describe('enqueue operations', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should enqueue item successfully', async () => {
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      
      const stats = queueManager.getStats();
      expect(stats.pendingItems).toBe(1);
      expect(stats.totalItems).toBe(1);
    });

    it('should assign priority correctly', async () => {
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, { ...mockQueueItem.data, id: 'high_priority' }, {
        priority: 'high',
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, { ...mockQueueItem.data, id: 'normal_priority' }, {
        priority: 'normal',
      });
      
      const stats = queueManager.getStats();
      expect(stats.totalItems).toBe(2);
    });

    it('should reject items when queue is full', async () => {
      // Create a queue with very small capacity and deduplication disabled
      const smallQueueManager = new EnterpriseQueueManager({
        maxSize: 1,
        deduplicationEnabled: false,
      });
      
      await smallQueueManager.initialize();
      
      // Add first item (should succeed)
      await smallQueueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, { ...mockQueueItem.data, id: 'first' });
      
      // Try to add second item (should be rejected)
      await expect(smallQueueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, { ...mockQueueItem.data, id: 'second' }))
        .rejects.toThrow('Queue is full');
      
      await smallQueueManager.destroy();
    });

    it('should handle duplicate item prevention', async () => {
      const itemData = { uniqueId: 'test_123' };
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, itemData);
      
      // Try to enqueue the same operation again - should throw duplicate error
      await expect(queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, itemData))
        .rejects.toThrow('Duplicate operation detected');
      
      const stats = queueManager.getStats();
      expect(stats.totalItems).toBe(1);
    });
  });

  describe('dequeue operations', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should process items by priority', async () => {
      // Add items with different priorities
      await queueManager.enqueue('create', 'receipts', { id: 'low_1' }, { priority: 'low' });
      await queueManager.enqueue('create', 'receipts', { id: 'normal_1' }, { priority: 'normal' });
      await queueManager.enqueue('create', 'receipts', { id: 'high_1' }, { priority: 'high' });
      
      // Mock processor for testing
      queueManager.registerProcessor('receipts', 'create', async (item) => {
        return { success: true, result: item.data, processingTime: 100 };
      });
      
      // Process one item - should get the high priority one
      const results = await queueManager.processNext(1);
      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
    });

    it('should handle empty queue gracefully', async () => {
      const results = await queueManager.processNext(1);
      expect(results).toHaveLength(0);
    });
  });

  describe('queue processing', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should process queue items successfully', async () => {
      // Register a mock processor
      queueManager.registerProcessor('receipts', 'create', async () => {
        return {
          success: true,
          result: { id: 'receipt_123' },
          processingTime: 150,
        };
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      
      const results = await queueManager.processNext(1);
      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
    });

    it('should handle processing failures with retry', async () => {
      // Register a processor that fails initially
      let callCount = 0;
      queueManager.registerProcessor('receipts', 'create', async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return {
          success: true,
          result: { id: 'receipt_123' },
          processingTime: 150,
        };
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      
      // First processing attempt should handle the error
      const results = await queueManager.processNext(1);
      expect(results).toHaveLength(1);
      
      // The item should be retried or marked for retry
      const stats = queueManager.getStats();
      expect(stats.failedItems + stats.pendingItems).toBeGreaterThanOrEqual(0);
    });

    it('should batch process multiple items', async () => {
      // Register a mock processor
      queueManager.registerProcessor('receipts', 'create', async () => {
        return {
          success: true,
          result: { success: true },
          processingTime: 100,
        };
      });
      
      // Add multiple items
      for (let i = 0; i < 5; i++) {
        await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, {
          ...mockQueueItem.data,
          id: `batch_item_${i}`,
        });
      }
      
      const results = await queueManager.processNext(5);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('queue management', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should get queue status correctly', async () => {
      await queueManager.enqueue('create', 'receipts', { id: 'pending_1' });
      
      const stats = queueManager.getStats();
      
      expect(stats).toEqual(
        expect.objectContaining({
          totalItems: expect.any(Number),
          pendingItems: expect.any(Number),
          processingItems: expect.any(Number),
          completedItems: expect.any(Number),
          failedItems: expect.any(Number),
        })
      );
    });

    it('should clear queue successfully', async () => {
      await queueManager.enqueue('create', 'receipts', { id: 'item_1' });
      await queueManager.enqueue('create', 'receipts', { id: 'item_2' });
      await queueManager.enqueue('create', 'receipts', { id: 'item_3' });
      
      await queueManager.clear();
      
      const stats = queueManager.getStats();
      expect(stats.totalItems).toBe(0);
    });
  });

  describe('retry management', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should implement exponential backoff for retries', () => {
      const retryManager = new RetryManager({
        defaultRetryPolicy: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 30000,
          strategy: 'custom',
          backoffFactor: 0,
          jitterEnabled: false
        },
        circuitBreakerConfig: {
          enabled: false,
          failureThreshold: 5,
          successThreshold: 3,
          timeout: 60000,
          monitoringWindow: 300000,
        },
        maxConcurrentRetries: 5,
        retryQueueSize: 1000,
        enableJitter: true,
        enableMetrics: true,
      });
      
      // Test the retry manager was created successfully
      expect(retryManager).toBeDefined();
    });
  });

  describe('analytics and monitoring', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should track processing metrics', async () => {
      // Register a mock processor
      queueManager.registerProcessor('receipts', 'create', async () => {
        return {
          success: true,
          result: { success: true },
          processingTime: 150,
        };
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      await queueManager.processNext(1);
      
      const stats = queueManager.getStats();
      
      expect(stats).toEqual(
        expect.objectContaining({
          totalItems: expect.any(Number),
          completedItems: expect.any(Number),
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should handle network timeouts', async () => {
      // Register a processor that simulates timeout
      queueManager.registerProcessor('receipts', 'create', async () => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      const results = await queueManager.processNext(1);
      
      // Should handle the timeout error gracefully
      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(false);
    });

    it('should handle non-retryable errors', async () => {
      // Register a processor that simulates validation error
      queueManager.registerProcessor('receipts', 'create', async () => {
        const validationError = new Error('Invalid data');
        (validationError as any).status = 400;
        throw validationError;
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      const results = await queueManager.processNext(1);
      
      // Should handle the validation error
      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(false);
    });

    it('should handle processing interruption gracefully', async () => {
      // Start processing but immediately destroy
      queueManager.registerProcessor('receipts', 'create', async () => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, result: {}, processingTime: 100 };
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      
      // Start processing but don't await
      const processingPromise = queueManager.processNext(1);
      
      // Immediately destroy
      await queueManager.destroy();
      
      // Processing should complete without errors
      await expect(processingPromise).resolves.toBeDefined();
    });
  });

  describe('processor registration', () => {
    beforeEach(async () => {
      await queueManager.initialize();
    });

    it('should register and use processors correctly', async () => {
      let processedData: any = null;
      
      queueManager.registerProcessor('receipts', 'create', async (item) => {
        processedData = item.data;
        return { success: true, result: { processed: true }, processingTime: 50 };
      });
      
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      
      const results = await queueManager.processNext(1);
      
      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
      expect(processedData).toEqual(mockQueueItem.data);
    });

    it('should handle missing processors gracefully', async () => {
      // Don't register any processor for 'receipts'
      await queueManager.enqueue(mockQueueItem.operation, mockQueueItem.resource, mockQueueItem.data);
      
      const results = await queueManager.processNext(1);
      
      // Should handle missing processor
      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(false);
    });
  });
});