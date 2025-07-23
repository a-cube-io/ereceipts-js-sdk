import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/keys';
import { AxiosRequestConfig } from 'axios';

export interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

export class RequestQueue {
  private static readonly MAX_QUEUE_SIZE = 100;
  private static readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * Add a failed request to the queue
   */
  static async enqueueRequest(
    config: AxiosRequestConfig,
    priority: 'high' | 'medium' | 'low' = 'medium',
    maxRetries: number = this.DEFAULT_MAX_RETRIES
  ): Promise<void> {
    try {
      const queue = await this.getQueue();
      
      const queuedRequest: QueuedRequest = {
        id: this.generateRequestId(),
        config: {
          ...config,
          // Remove sensitive headers that might have expired
          headers: this.sanitizeHeaders(config.headers || {}),
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries,
        priority,
      };

      // Add to front of queue based on priority
      if (priority === 'high') {
        queue.unshift(queuedRequest);
      } else {
        queue.push(queuedRequest);
      }

      // Limit queue size
      if (queue.length > this.MAX_QUEUE_SIZE) {
        queue.splice(this.MAX_QUEUE_SIZE);
      }

      await this.saveQueue(queue);
    } catch (error) {
      console.warn('Failed to enqueue request:', error);
    }
  }

  /**
   * Get all queued requests
   */
  static async getQueue(): Promise<QueuedRequest[]> {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.FAILED_REQUESTS_QUEUE);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.warn('Failed to get request queue:', error);
      return [];
    }
  }

  /**
   * Save queue to storage
   */
  private static async saveQueue(queue: QueuedRequest[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FAILED_REQUESTS_QUEUE,
        JSON.stringify(queue)
      );
    } catch (error) {
      console.warn('Failed to save request queue:', error);
    }
  }

  /**
   * Remove a request from the queue
   */
  static async removeRequest(requestId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(req => req.id !== requestId);
      await this.saveQueue(filteredQueue);
    } catch (error) {
      console.warn('Failed to remove request from queue:', error);
    }
  }

  /**
   * Get the next request to retry (sorted by priority and timestamp)
   */
  static async getNextRequest(): Promise<QueuedRequest | null> {
    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        return null;
      }

      // Sort by priority (high -> medium -> low) then by timestamp (oldest first)
      const sortedQueue = queue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        
        return a.timestamp - b.timestamp;
      });

      return sortedQueue[0];
    } catch (error) {
      console.warn('Failed to get next request:', error);
      return null;
    }
  }

  /**
   * Increment retry count for a request
   */
  static async incrementRetryCount(requestId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const requestIndex = queue.findIndex(req => req.id === requestId);
      
      if (requestIndex !== -1) {
        queue[requestIndex].retryCount += 1;
        await this.saveQueue(queue);
      }
    } catch (error) {
      console.warn('Failed to increment retry count:', error);
    }
  }

  /**
   * Remove requests that have exceeded max retries
   */
  static async cleanupExpiredRequests(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const validRequests = queue.filter(req => req.retryCount < req.maxRetries);
      
      if (validRequests.length !== queue.length) {
        await this.saveQueue(validRequests);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired requests:', error);
    }
  }

  /**
   * Clear the entire queue
   */
  static async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.FAILED_REQUESTS_QUEUE);
    } catch (error) {
      console.warn('Failed to clear request queue:', error);
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    total: number;
    byPriority: { high: number; medium: number; low: number };
    oldestTimestamp?: number;
    newestTimestamp?: number;
  }> {
    try {
      const queue = await this.getQueue();
      
      const stats = {
        total: queue.length,
        byPriority: { high: 0, medium: 0, low: 0 },
        oldestTimestamp: undefined as number | undefined,
        newestTimestamp: undefined as number | undefined,
      };

      if (queue.length > 0) {
        stats.oldestTimestamp = Math.min(...queue.map(req => req.timestamp));
        stats.newestTimestamp = Math.max(...queue.map(req => req.timestamp));
        
        queue.forEach(req => {
          stats.byPriority[req.priority] += 1;
        });
      }

      return stats;
    } catch (error) {
      console.warn('Failed to get queue stats:', error);
      return {
        total: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
      };
    }
  }

  /**
   * Generate a unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize headers to remove potentially expired tokens
   */
  private static sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    
    // Remove Authorization header as it might be expired
    // It will be re-added when the request is retried
    delete sanitized.Authorization;
    delete sanitized.authorization;
    
    return sanitized;
  }

  /**
   * Check if a request should be retried based on error type
   */
  static shouldRetryRequest(error: any): boolean {
    // Don't retry client errors (4xx) except for 401 (unauthorized)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return error.response.status === 401;
    }
    
    // Retry server errors (5xx) and network errors
    return true;
  }
}