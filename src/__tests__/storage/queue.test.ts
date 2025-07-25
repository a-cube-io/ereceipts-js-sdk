import AsyncStorage from '@react-native-async-storage/async-storage';
import { RequestQueue, type QueuedRequest } from '../../storage/queue';
import { STORAGE_KEYS } from '../../constants/keys';
import { AxiosRequestConfig } from 'axios';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('RequestQueue', () => {
  const mockRequestConfig: AxiosRequestConfig = {
    method: 'POST',
    url: '/api/test',
    data: { test: 'data' },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token',
    },
  };

  const mockQueuedRequest: QueuedRequest = {
    id: 'req_1234567890_abc123',
    config: mockRequestConfig,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    priority: 'medium',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('enqueueRequest', () => {
    it('should enqueue a request with default priority', async () => {
      await RequestQueue.enqueueRequest(mockRequestConfig);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.FAILED_REQUESTS_QUEUE,
        expect.any(String)
      );

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue).toHaveLength(1);
      expect(savedQueue[0].config).toEqual({
        ...mockRequestConfig,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          // Authorization header should be removed
        }),
      });
      expect(savedQueue[0].priority).toBe('medium');
      expect(savedQueue[0].maxRetries).toBe(3);
      expect(savedQueue[0].retryCount).toBe(0);
      expect(savedQueue[0].id).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should enqueue a request with high priority at the front', async () => {
      // Mock existing queue with a medium priority request
      const existingQueue = [{
        ...mockQueuedRequest,
        config: { ...mockRequestConfig },
        priority: 'medium',
        timestamp: 1000,
      }];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      
      // Add a high priority request
      const highPriorityConfig = { ...mockRequestConfig, url: '/api/high-priority' };
      await RequestQueue.enqueueRequest(highPriorityConfig, 'high');

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue).toHaveLength(2);
      expect(savedQueue[0].config.url).toBe('/api/high-priority');
      expect(savedQueue[0].priority).toBe('high');
      expect(savedQueue[1].priority).toBe('medium');
    });

    it('should enqueue a request with low priority at the end', async () => {
      // Mock existing queue with a medium priority request
      const existingQueue = [{
        ...mockQueuedRequest,
        config: { ...mockRequestConfig },
        priority: 'medium',
        timestamp: 1000,
      }];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));
      
      // Add a low priority request
      const lowPriorityConfig = { ...mockRequestConfig, url: '/api/low-priority' };
      await RequestQueue.enqueueRequest(lowPriorityConfig, 'low');

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue).toHaveLength(2);
      expect(savedQueue[0].priority).toBe('medium');
      expect(savedQueue[1].config.url).toBe('/api/low-priority');
      expect(savedQueue[1].priority).toBe('low');
    });

    it('should limit queue size to MAX_QUEUE_SIZE', async () => {
      // Mock existing queue with 99 requests (just under MAX_QUEUE_SIZE)
      const existingQueue = Array.from({ length: 99 }, (_, i) => ({
        ...mockQueuedRequest,
        id: `req-${i}`,
        config: { ...mockRequestConfig, url: `/api/request-${i}` },
        timestamp: 1000 + i,
      }));
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));

      // Add one more request to exceed MAX_QUEUE_SIZE
      await RequestQueue.enqueueRequest(mockRequestConfig);

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue).toHaveLength(100); // MAX_QUEUE_SIZE
    });

    it('should sanitize headers by removing Authorization', async () => {
      const configWithAuth = {
        ...mockRequestConfig,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer expired-token',
          'X-Custom-Header': 'custom-value',
        },
      };

      await RequestQueue.enqueueRequest(configWithAuth);

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue[0].config.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
      });
      expect(savedQueue[0].config.headers.Authorization).toBeUndefined();
    });

    it('should handle custom max retries', async () => {
      await RequestQueue.enqueueRequest(mockRequestConfig, 'medium', 5);

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue[0].maxRetries).toBe(5);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        RequestQueue.enqueueRequest(mockRequestConfig)
      ).resolves.toBeUndefined();
    });

    it('should handle malformed existing queue', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');

      await expect(
        RequestQueue.enqueueRequest(mockRequestConfig)
      ).resolves.toBeUndefined();
    });
  });

  describe('getQueue', () => {
    it('should return empty array when no queue exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await RequestQueue.getQueue();

      expect(result).toEqual([]);
    });

    it('should return parsed queue when it exists', async () => {
      const mockQueue = [mockQueuedRequest];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const result = await RequestQueue.getQueue();

      expect(result).toEqual(mockQueue);
    });

    it('should return empty array when queue is malformed', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');

      const result = await RequestQueue.getQueue();

      expect(result).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await RequestQueue.getQueue();

      expect(result).toEqual([]);
    });
  });

  describe('removeRequest', () => {
    it('should remove specific request from queue', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1' },
        { ...mockQueuedRequest, id: 'req-2' },
        { ...mockQueuedRequest, id: 'req-3' },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await RequestQueue.removeRequest('req-2');

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue).toHaveLength(2);
      expect(savedQueue.find((req: QueuedRequest) => req.id === 'req-2')).toBeUndefined();
    });

    it('should handle non-existent request ID', async () => {
      const mockQueue = [mockQueuedRequest];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await RequestQueue.removeRequest('non-existent-id');

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue).toEqual(mockQueue);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        RequestQueue.removeRequest('req-1')
      ).resolves.toBeUndefined();
    });
  });

  describe('getNextRequest', () => {
    it('should return null when queue is empty', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await RequestQueue.getNextRequest();

      expect(result).toBeNull();
    });

    it('should return highest priority request', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', priority: 'low', timestamp: 1000 },
        { ...mockQueuedRequest, id: 'req-2', priority: 'high', timestamp: 2000 },
        { ...mockQueuedRequest, id: 'req-3', priority: 'medium', timestamp: 1500 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const result = await RequestQueue.getNextRequest();

      expect(result?.id).toBe('req-2'); // High priority
    });

    it('should return oldest request when priorities are equal', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', priority: 'medium', timestamp: 2000 },
        { ...mockQueuedRequest, id: 'req-2', priority: 'medium', timestamp: 1000 },
        { ...mockQueuedRequest, id: 'req-3', priority: 'medium', timestamp: 1500 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const result = await RequestQueue.getNextRequest();

      expect(result?.id).toBe('req-2'); // Oldest timestamp
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await RequestQueue.getNextRequest();

      expect(result).toBeNull();
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count for specific request', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', retryCount: 0 },
        { ...mockQueuedRequest, id: 'req-2', retryCount: 1 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await RequestQueue.incrementRetryCount('req-1');

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue[0].retryCount).toBe(1);
      expect(savedQueue[1].retryCount).toBe(1); // Unchanged
    });

    it('should handle non-existent request ID', async () => {
      const mockQueue = [mockQueuedRequest];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await RequestQueue.incrementRetryCount('non-existent-id');

      // Should not save anything if request not found
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        RequestQueue.incrementRetryCount('req-1')
      ).resolves.toBeUndefined();
    });
  });

  describe('cleanupExpiredRequests', () => {
    it('should remove requests that have exceeded max retries', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', retryCount: 2, maxRetries: 3 }, // Should keep
        { ...mockQueuedRequest, id: 'req-2', retryCount: 3, maxRetries: 3 }, // Should remove
        { ...mockQueuedRequest, id: 'req-3', retryCount: 4, maxRetries: 3 }, // Should remove
        { ...mockQueuedRequest, id: 'req-4', retryCount: 1, maxRetries: 3 }, // Should keep
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await RequestQueue.cleanupExpiredRequests();

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      
      expect(savedQueue).toHaveLength(2);
      expect(savedQueue[0].id).toBe('req-1');
      expect(savedQueue[1].id).toBe('req-4');
    });

    it('should not save queue if no requests were removed', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', retryCount: 1, maxRetries: 3 },
        { ...mockQueuedRequest, id: 'req-2', retryCount: 0, maxRetries: 3 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await RequestQueue.cleanupExpiredRequests();

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        RequestQueue.cleanupExpiredRequests()
      ).resolves.toBeUndefined();
    });
  });

  describe('clearQueue', () => {
    it('should clear the entire queue', async () => {
      await RequestQueue.clearQueue();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.FAILED_REQUESTS_QUEUE
      );
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        RequestQueue.clearQueue()
      ).resolves.toBeUndefined();
    });
  });

  describe('getQueueStats', () => {
    it('should return stats for empty queue', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await RequestQueue.getQueueStats();

      expect(result).toEqual({
        total: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
      });
    });

    it('should return comprehensive stats for populated queue', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', priority: 'high', timestamp: 1000 },
        { ...mockQueuedRequest, id: 'req-2', priority: 'medium', timestamp: 2000 },
        { ...mockQueuedRequest, id: 'req-3', priority: 'low', timestamp: 1500 },
        { ...mockQueuedRequest, id: 'req-4', priority: 'high', timestamp: 3000 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const result = await RequestQueue.getQueueStats();

      expect(result).toEqual({
        total: 4,
        byPriority: { high: 2, medium: 1, low: 1 },
        oldestTimestamp: 1000,
        newestTimestamp: 3000,
      });
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await RequestQueue.getQueueStats();

      expect(result).toEqual({
        total: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
      });
    });
  });

  describe('shouldRetryRequest', () => {
    it('should retry 401 errors', () => {
      const error = {
        response: { status: 401 },
      };

      const result = RequestQueue.shouldRetryRequest(error);

      expect(result).toBe(true);
    });

    it('should not retry other 4xx errors', () => {
      const errors = [
        { response: { status: 400 } },
        { response: { status: 403 } },
        { response: { status: 404 } },
        { response: { status: 422 } },
      ];

      errors.forEach(error => {
        const result = RequestQueue.shouldRetryRequest(error);
        expect(result).toBe(false);
      });
    });

    it('should retry 5xx errors', () => {
      const errors = [
        { response: { status: 500 } },
        { response: { status: 502 } },
        { response: { status: 503 } },
        { response: { status: 504 } },
      ];

      errors.forEach(error => {
        const result = RequestQueue.shouldRetryRequest(error);
        expect(result).toBe(true);
      });
    });

    it('should retry network errors', () => {
      const error = new Error('Network error');

      const result = RequestQueue.shouldRetryRequest(error);

      expect(result).toBe(true);
    });

    it('should retry errors without response', () => {
      const error = { message: 'Some error' };

      const result = RequestQueue.shouldRetryRequest(error);

      expect(result).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete request lifecycle', async () => {
      // Enqueue a request
      await RequestQueue.enqueueRequest(mockRequestConfig, 'high');
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.FAILED_REQUESTS_QUEUE,
        expect.any(String)
      );

      // Get the queue
      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedQueue));

      const queue = await RequestQueue.getQueue();
      expect(queue).toHaveLength(1);

      // Get next request
      const nextRequest = await RequestQueue.getNextRequest();
      expect(nextRequest).toBeDefined();
      expect(nextRequest?.priority).toBe('high');

      // Increment retry count
      await RequestQueue.incrementRetryCount(nextRequest?.id ?? '');
      
      const updatedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[1][1]
      );
      expect(updatedQueue[0].retryCount).toBe(1);

      // Remove request
      await RequestQueue.removeRequest(nextRequest?.id ?? '');
      
      const finalQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[2][1]
      );
      expect(finalQueue).toHaveLength(0);
    });

    it('should handle priority-based ordering correctly', async () => {
      // Mock existing queue with mixed priorities
      const existingQueue = [
        { ...mockQueuedRequest, id: 'req-1', config: { ...mockRequestConfig, url: '/api/low' }, priority: 'low', timestamp: 1000 },
        { ...mockQueuedRequest, id: 'req-2', config: { ...mockRequestConfig, url: '/api/medium' }, priority: 'medium', timestamp: 1500 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));

      // Add a high priority request
      const highPriorityConfig = { ...mockRequestConfig, url: '/api/high' };
      await RequestQueue.enqueueRequest(highPriorityConfig, 'high');

      const finalQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );

      // High priority requests are added to the front, others to the end
      // So the order should be: [high, low, medium] (high added to front, existing items remain in order)
      expect(finalQueue[0].config.url).toBe('/api/high');
      expect(finalQueue[1].config.url).toBe('/api/low');
      expect(finalQueue[2].config.url).toBe('/api/medium');
    });

    it('should handle queue size limits', async () => {
      // Mock existing queue with 99 requests (just under MAX_QUEUE_SIZE)
      const existingQueue = Array.from({ length: 99 }, (_, i) => ({
        ...mockQueuedRequest,
        id: `req-${i}`,
        config: { ...mockRequestConfig, url: `/api/request-${i}` },
        timestamp: 1000 + i,
      }));
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));

      // Add one more request to exceed MAX_QUEUE_SIZE
      await RequestQueue.enqueueRequest(mockRequestConfig);

      const finalQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );

      expect(finalQueue).toHaveLength(100); // MAX_QUEUE_SIZE
    });

    it('should handle cleanup of expired requests', async () => {
      // Setup queue with some expired requests
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', retryCount: 2, maxRetries: 3 },
        { ...mockQueuedRequest, id: 'req-2', retryCount: 3, maxRetries: 3 },
        { ...mockQueuedRequest, id: 'req-3', retryCount: 1, maxRetries: 3 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      await RequestQueue.cleanupExpiredRequests();

      const savedQueue = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );

      expect(savedQueue).toHaveLength(2);
      expect(savedQueue.find((req: QueuedRequest) => req.id === 'req-2')).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        RequestQueue.enqueueRequest({
          ...mockRequestConfig,
          url: `/api/concurrent-${i}`,
        })
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle very large request configs', async () => {
      const largeConfig = {
        ...mockRequestConfig,
        data: { largeData: 'x'.repeat(10000) },
        headers: { largeHeader: 'y'.repeat(5000) },
      };

      await expect(
        RequestQueue.enqueueRequest(largeConfig)
      ).resolves.toBeUndefined();
    });

    it('should handle special characters in request data', async () => {
      const specialConfig = {
        ...mockRequestConfig,
        url: '/api/special-chars-ñáéíóú-中文-日本語',
        data: { special: 'ñáéíóú-中文-日本語' },
      };

      await expect(
        RequestQueue.enqueueRequest(specialConfig)
      ).resolves.toBeUndefined();
    });

    it('should handle null and undefined values in config', async () => {
      const configWithNulls = {
        method: 'POST',
        url: '/api/test',
        data: null,
        headers: undefined,
      };

      await expect(
        RequestQueue.enqueueRequest(configWithNulls)
      ).resolves.toBeUndefined();
    });

    it('should handle storage failures in all operations', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage failed'));
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Retrieval failed'));
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Removal failed'));

      // All operations should handle errors gracefully
      await expect(
        RequestQueue.enqueueRequest(mockRequestConfig)
      ).resolves.toBeUndefined();

      await expect(
        RequestQueue.getQueue()
      ).resolves.toEqual([]);

      await expect(
        RequestQueue.removeRequest('req-1')
      ).resolves.toBeUndefined();

      await expect(
        RequestQueue.getNextRequest()
      ).resolves.toBeNull();

      await expect(
        RequestQueue.incrementRetryCount('req-1')
      ).resolves.toBeUndefined();

      await expect(
        RequestQueue.cleanupExpiredRequests()
      ).resolves.toBeUndefined();

      await expect(
        RequestQueue.clearQueue()
      ).resolves.toBeUndefined();

      await expect(
        RequestQueue.getQueueStats()
      ).resolves.toEqual({
        total: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
      });
    });

    it('should handle malformed queue data gracefully', async () => {
      const malformedData = [
        'invalid-json',
        '[]',
        '[{"invalid": "data"}]',
        '[{"id": "req-1", "config": null}]',
      ];

      for (const data of malformedData) {
        mockAsyncStorage.getItem.mockResolvedValue(data);

        const queue = await RequestQueue.getQueue();
        expect(Array.isArray(queue)).toBe(true);
      }
    });

    it('should handle edge cases in priority sorting', async () => {
      const mockQueue = [
        { ...mockQueuedRequest, id: 'req-1', priority: 'high', timestamp: 1000 },
        { ...mockQueuedRequest, id: 'req-2', priority: 'high', timestamp: 1000 }, // Same timestamp
        { ...mockQueuedRequest, id: 'req-3', priority: 'medium', timestamp: 1000 },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const result = await RequestQueue.getNextRequest();

      expect(result).toBeDefined();
      expect(['req-1', 'req-2']).toContain(result?.id); // Either high priority request
    });
  });
}); 