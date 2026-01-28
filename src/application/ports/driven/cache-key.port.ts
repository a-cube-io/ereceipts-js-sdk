export type CacheResource =
  | 'receipt'
  | 'merchant'
  | 'cashier'
  | 'cash-register'
  | 'point-of-sale'
  | 'supplier'
  | 'daily-report'
  | 'journal'
  | 'pem'
  | 'notification'
  | 'telemetry';

export interface CacheResourceConfig {
  ttlMs: number;
  cacheList: boolean;
  cacheItem: boolean;
}

export interface ICacheKeyGenerator {
  generate(url: string, params?: Record<string, unknown>): string;
  parseResource(url: string): CacheResource | undefined;
  getInvalidationPatterns(url: string, method: string): string[];
  getTTL(url: string): number;
  shouldCache(url: string): boolean;
}
