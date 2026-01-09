export interface ICachePort {
  get<T>(key: string): Promise<CachedItem<T> | null>;
  set<T>(key: string, data: T): Promise<void>;
  setItem<T>(key: string, item: CachedItem<T>): Promise<void>;
  setBatch<T>(items: Array<[string, CachedItem<T>]>): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
  getSize(): Promise<CacheSize>;
  cleanup(): Promise<number>;
  getKeys(pattern?: string): Promise<string[]>;
}

export interface CachedItem<T> {
  data: T;
  timestamp: number;
  compressed?: boolean;
}

export interface CacheSize {
  entries: number;
  bytes: number;
  lastCleanup: number;
}

export interface CacheOptions {
  maxSize?: number;
  maxEntries?: number;
  compression?: boolean;
  compressionThreshold?: number;
  debugEnabled?: boolean;
}

export type ICacheAdapter = ICachePort;
