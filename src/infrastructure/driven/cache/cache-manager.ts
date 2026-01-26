import { CacheSize, ICachePort } from '@/application/ports/driven/cache.port';

export interface CacheManagerConfig {
  maxCacheSize?: number;
  maxEntries?: number;
  cleanupInterval?: number;
  memoryPressureThreshold?: number;
  cleanupPercentage?: number;
  minAgeForRemoval?: number;
}

export type CleanupStrategy = 'lru' | 'age-based';

export interface CleanupResult {
  entriesRemoved: number;
  bytesFreed: number;
  cleanupTime: number;
  strategy: CleanupStrategy;
  reason: 'scheduled' | 'memory_pressure' | 'size_limit' | 'manual';
}

export interface MemoryStats {
  current: CacheSize;
  memoryUsagePercentage: number;
  isMemoryPressure: boolean;
  recommendedStrategy: CleanupStrategy;
}

const DEFAULT_CONFIG: Required<CacheManagerConfig> = {
  maxCacheSize: 100 * 1024 * 1024,
  maxEntries: 10000,
  cleanupInterval: 5 * 60 * 1000,
  memoryPressureThreshold: 0.8,
  cleanupPercentage: 30,
  minAgeForRemoval: 60 * 1000,
};

export class CacheManager {
  private readonly config: Required<CacheManagerConfig>;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private accessTimes = new Map<string, number>();

  constructor(
    private readonly cache: ICachePort,
    config: CacheManagerConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startAutomaticCleanup();
  }

  async getMemoryStats(): Promise<MemoryStats> {
    const current = await this.cache.getSize();
    const memoryUsagePercentage = (current.bytes / this.config.maxCacheSize) * 100;
    const isMemoryPressure = memoryUsagePercentage >= this.config.memoryPressureThreshold * 100;

    const recommendedStrategy: CleanupStrategy =
      isMemoryPressure || current.entries > this.config.maxEntries * 0.9 ? 'age-based' : 'lru';

    return {
      current,
      memoryUsagePercentage,
      isMemoryPressure,
      recommendedStrategy,
    };
  }

  async performCleanup(
    strategy: CleanupStrategy = 'lru',
    reason: CleanupResult['reason'] = 'manual'
  ): Promise<CleanupResult> {
    const startTime = performance.now();
    const initialSize = await this.cache.getSize();

    let entriesRemoved = strategy === 'lru' ? await this.cleanupLRU() : await this.cleanupByAge();

    entriesRemoved += await this.cache.cleanup();

    const finalSize = await this.cache.getSize();

    return {
      entriesRemoved,
      bytesFreed: initialSize.bytes - finalSize.bytes,
      cleanupTime: performance.now() - startTime,
      strategy,
      reason,
    };
  }

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

    return this.performCleanup(stats.recommendedStrategy, 'memory_pressure');
  }

  trackAccess(key: string): void {
    this.accessTimes.set(key, Date.now());
  }

  stopAutomaticCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  destroy(): void {
    this.stopAutomaticCleanup();
    this.accessTimes.clear();
  }

  private async cleanupLRU(): Promise<number> {
    const keys = await this.cache.getKeys();
    if (keys.length === 0) return 0;

    const sortedKeys = keys
      .map((key) => ({ key, accessTime: this.accessTimes.get(key) ?? 0 }))
      .sort((a, b) => a.accessTime - b.accessTime);

    const targetRemoval = Math.ceil(keys.length * (this.config.cleanupPercentage / 100));
    const keysToRemove = sortedKeys.slice(0, targetRemoval).map((item) => item.key);

    await this.removeKeys(keysToRemove);
    keysToRemove.forEach((key) => this.accessTimes.delete(key));

    return keysToRemove.length;
  }

  private async cleanupByAge(): Promise<number> {
    const keys = await this.cache.getKeys();
    if (keys.length === 0) return 0;

    const now = Date.now();
    const items = await Promise.all(
      keys.map(async (key) => {
        const item = await this.cache.get(key);
        return { key, age: now - (item?.timestamp ?? now) };
      })
    );

    const eligibleItems = items
      .filter((item) => item.age >= this.config.minAgeForRemoval)
      .sort((a, b) => b.age - a.age);

    const itemsToProcess =
      eligibleItems.length > 0 ? eligibleItems : items.sort((a, b) => b.age - a.age);

    const targetRemoval = Math.min(
      Math.ceil(keys.length * (this.config.cleanupPercentage / 100)),
      itemsToProcess.length
    );

    const keysToRemove = itemsToProcess.slice(0, targetRemoval).map((item) => item.key);
    await this.removeKeys(keysToRemove);

    return keysToRemove.length;
  }

  private async removeKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await Promise.all(keys.map((key) => this.cache.invalidate(key)));
  }

  private startAutomaticCleanup(): void {
    if (this.config.cleanupInterval <= 0) return;

    this.cleanupTimer = setInterval(async () => {
      try {
        const stats = await this.getMemoryStats();

        if (stats.isMemoryPressure) {
          await this.handleMemoryPressure();
        } else if (
          stats.current.bytes > this.config.maxCacheSize * 0.7 ||
          stats.current.entries > this.config.maxEntries * 0.7
        ) {
          await this.performCleanup('lru', 'scheduled');
        } else {
          await this.cache.cleanup();
        }
      } catch {
        // Cleanup failed silently
      }
    }, this.config.cleanupInterval);
  }
}
