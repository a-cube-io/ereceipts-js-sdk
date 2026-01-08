import { CacheSize, ICacheAdapter } from '../adapters';

/**
 * Cache management configuration (simplified)
 */
export interface CacheManagementConfig {
  /** Maximum cache size in bytes before triggering cleanup */
  maxCacheSize?: number;
  /** Maximum number of entries before triggering cleanup */
  maxEntries?: number;
  /** Automatic cleanup interval in milliseconds */
  cleanupInterval?: number;
  /** Memory pressure threshold (0.0-1.0) for aggressive cleanup */
  memoryPressureThreshold?: number;
  /** Percentage of entries to remove during memory pressure cleanup */
  memoryPressureCleanupPercentage?: number;
  /** Minimum cache entry age before eligible for removal (ms) */
  minAgeForRemoval?: number;
}

/**
 * Cache cleanup strategy (simplified)
 */
export type CleanupStrategy =
  | 'lru' // Least Recently Used
  | 'age-based'; // Remove oldest items first

/**
 * Cache cleanup result
 */
export interface CleanupResult {
  /** Number of entries removed */
  entriesRemoved: number;
  /** Bytes freed */
  bytesFreed: number;
  /** Time taken for cleanup operation (ms) */
  cleanupTime: number;
  /** Cleanup strategy used */
  strategy: CleanupStrategy;
  /** Reason for cleanup */
  reason: 'scheduled' | 'memory_pressure' | 'size_limit' | 'manual';
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  /** Current cache size */
  current: CacheSize;
  /** Memory usage percentage (0-100) */
  memoryUsagePercentage: number;
  /** Whether memory pressure threshold is exceeded */
  isMemoryPressure: boolean;
  /** Recommended cleanup strategy */
  recommendedStrategy: CleanupStrategy;
}

/**
 * Simplified cache management with memory optimization
 */
export class CacheManager {
  private config: Required<CacheManagementConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  private lastCleanupTime = Date.now(); // Initialize to current time
  private accessTimes = new Map<string, number>();

  constructor(
    private cache: ICacheAdapter,
    config: CacheManagementConfig = {}
  ) {
    this.config = {
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 10000,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      memoryPressureThreshold: 0.8, // 80%
      memoryPressureCleanupPercentage: 30, // Remove 30% of entries
      minAgeForRemoval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startAutomaticCleanup();
  }

  /**
   * Get current memory usage statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    const current = await this.cache.getSize();
    const memoryUsagePercentage = (current.bytes / this.config.maxCacheSize) * 100;
    const isMemoryPressure = memoryUsagePercentage >= this.config.memoryPressureThreshold * 100;

    // Recommend cleanup strategy based on current state
    let recommendedStrategy: CleanupStrategy = 'lru';
    if (isMemoryPressure) {
      recommendedStrategy = 'age-based'; // Remove old items first under pressure
    } else if (current.entries > this.config.maxEntries * 0.9) {
      recommendedStrategy = 'age-based'; // Remove oldest items when approaching entry limit
    }

    return {
      current,
      memoryUsagePercentage,
      isMemoryPressure,
      recommendedStrategy,
    };
  }

  /**
   * Perform cache cleanup with simplified strategy
   */
  async performCleanup(
    strategy: CleanupStrategy = 'lru',
    reason: CleanupResult['reason'] = 'manual'
  ): Promise<CleanupResult> {
    const startTime = performance.now();

    const initialSize = await this.cache.getSize();
    let entriesRemoved = 0;

    // Simplified cleanup strategies
    switch (strategy) {
      case 'lru':
        entriesRemoved = await this.cleanupLRU();
        break;
      case 'age-based':
        entriesRemoved = await this.cleanupByAge();
        break;
    }

    // Also clean up expired entries
    const expiredRemoved = await this.cache.cleanup();
    entriesRemoved += expiredRemoved;

    const finalSize = await this.cache.getSize();
    const bytesFreed = initialSize.bytes - finalSize.bytes;
    const cleanupTime = performance.now() - startTime;

    this.lastCleanupTime = Date.now();

    const result: CleanupResult = {
      entriesRemoved,
      bytesFreed,
      cleanupTime,
      strategy,
      reason,
    };

    return result;
  }

  /**
   * Force cleanup when memory pressure is detected
   */
  async handleMemoryPressure(): Promise<CleanupResult> {
    const stats = await this.getMemoryStats();

    if (!stats.isMemoryPressure) {
      return {
        entriesRemoved: 0,
        bytesFreed: 0,
        cleanupTime: 0,
        strategy: 'lru',
        reason: 'memory_pressure',
      };
    }

    // Aggressive cleanup under memory pressure
    return this.performCleanup(stats.recommendedStrategy, 'memory_pressure');
  }

  /**
   * Clean cache based on Least Recently Used strategy
   */
  private async cleanupLRU(): Promise<number> {
    const keys = await this.cache.getKeys();
    if (keys.length === 0) return 0;

    // Sort by access time (oldest first)
    const sortedKeys = keys
      .map((key) => ({
        key,
        accessTime: this.accessTimes.get(key) || 0,
      }))
      .sort((a, b) => a.accessTime - b.accessTime);

    // Remove least recently used entries
    const targetRemoval = Math.ceil(
      keys.length * (this.config.memoryPressureCleanupPercentage / 100)
    );
    const keysToRemove = sortedKeys.slice(0, targetRemoval).map((item) => item.key);

    await this.removeKeys(keysToRemove);

    // Clean up access times for removed keys
    keysToRemove.forEach((key) => this.accessTimes.delete(key));

    return keysToRemove.length;
  }

  /**
   * Clean cache based on age (remove oldest first)
   */
  private async cleanupByAge(): Promise<number> {
    const keys = await this.cache.getKeys();
    if (keys.length === 0) return 0;

    const now = Date.now();
    const items = await Promise.all(
      keys.map(async (key) => {
        const item = await this.cache.get(key);
        return {
          key,
          age: now - (item?.timestamp || now),
        };
      })
    );

    // Only remove items older than minimum age
    const eligibleItems = items
      .filter((item) => item.age >= this.config.minAgeForRemoval)
      .sort((a, b) => b.age - a.age); // Oldest first

    // If no items are old enough, remove oldest items anyway if we're over limits
    const itemsToProcess =
      eligibleItems.length > 0 ? eligibleItems : items.sort((a, b) => b.age - a.age);

    const targetRemoval = Math.min(
      Math.ceil(keys.length * (this.config.memoryPressureCleanupPercentage / 100)),
      itemsToProcess.length
    );

    const keysToRemove = itemsToProcess.slice(0, targetRemoval).map((item) => item.key);

    await this.removeKeys(keysToRemove);
    return keysToRemove.length;
  }

  /**
   * Remove multiple keys efficiently
   */
  private async removeKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    // Use batch invalidation for efficiency
    await Promise.all(keys.map((key) => this.cache.invalidate(key)));
  }

  /**
   * Track cache access for LRU implementation
   */
  trackAccess(key: string): void {
    this.accessTimes.set(key, Date.now());
  }

  /**
   * Start automatic cleanup process
   */
  private startAutomaticCleanup(): void {
    if (this.config.cleanupInterval <= 0) return;

    this.cleanupTimer = setInterval(async () => {
      try {
        const stats = await this.getMemoryStats();

        // Decide whether cleanup is needed
        if (stats.isMemoryPressure) {
          await this.handleMemoryPressure();
        } else if (
          stats.current.bytes > this.config.maxCacheSize * 0.7 ||
          stats.current.entries > this.config.maxEntries * 0.7
        ) {
          // Preventive cleanup when approaching limits
          await this.performCleanup('lru', 'scheduled');
        } else {
          // Just clean expired entries
          await this.cache.cleanup();
        }
      } catch (error) {
        console.error('Automatic cache cleanup failed:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutomaticCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get cache cleanup recommendations
   */
  async getCleanupRecommendations(): Promise<{
    shouldCleanup: boolean;
    recommendedStrategy: CleanupStrategy;
    urgency: 'low' | 'medium' | 'high';
    reason: string;
  }> {
    const stats = await this.getMemoryStats();

    if (stats.isMemoryPressure) {
      return {
        shouldCleanup: true,
        recommendedStrategy: 'age-based',
        urgency: 'high',
        reason: 'Memory pressure detected - cache size exceeds threshold',
      };
    }

    if (stats.current.entries > this.config.maxEntries * 0.9) {
      return {
        shouldCleanup: true,
        recommendedStrategy: 'age-based',
        urgency: 'medium',
        reason: 'Entry count approaching limit',
      };
    }

    if (stats.current.bytes > this.config.maxCacheSize * 0.7) {
      return {
        shouldCleanup: true,
        recommendedStrategy: 'lru',
        urgency: 'medium',
        reason: 'Cache size approaching limit',
      };
    }

    // Check time since last cleanup
    const timeSinceLastCleanup = Date.now() - this.lastCleanupTime;
    if (timeSinceLastCleanup > this.config.cleanupInterval * 2) {
      return {
        shouldCleanup: true,
        recommendedStrategy: 'age-based',
        urgency: 'low',
        reason: 'Scheduled cleanup overdue',
      };
    }

    return {
      shouldCleanup: false,
      recommendedStrategy: 'lru',
      urgency: 'low',
      reason: 'No cleanup needed at this time',
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutomaticCleanup();
    this.accessTimes.clear();
  }
}
