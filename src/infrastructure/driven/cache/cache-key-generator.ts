import {
  CacheResource,
  CacheResourceConfig,
  ICacheKeyGenerator,
} from '@/application/ports/driven/cache-key.port';
import { createPrefixedLogger } from '@/shared/utils';

const log = createPrefixedLogger('CACHE-KEY');

interface UrlPattern {
  pattern: RegExp;
  resource: CacheResource;
  action?: string;
  parent?: string;
  isList?: boolean;
}

const URL_PATTERNS: UrlPattern[] = [
  // Receipt (mf1) - specific patterns first
  {
    pattern: /^\/mf1\/receipts\/([^/]+)\/returnable-items$/,
    resource: 'receipt',
    action: 'returnable',
  },
  {
    pattern: /^\/mf1\/receipts\/([^/]+)\/details$/,
    resource: 'receipt',
    action: 'details',
  },
  { pattern: /^\/mf1\/receipts\/([^/]+)$/, resource: 'receipt' },
  {
    pattern: /^\/mf1\/pems\/([^/]+)\/receipts$/,
    resource: 'receipt',
    parent: 'point-of-sale',
    isList: true,
  },
  { pattern: /^\/mf1\/receipts$/, resource: 'receipt', isList: true },

  // Merchant (mf2)
  { pattern: /^\/mf2\/merchants\/([^/]+)$/, resource: 'merchant' },
  { pattern: /^\/mf2\/merchants$/, resource: 'merchant', isList: true },

  // Cashier (mf1)
  { pattern: /^\/mf1\/cashiers\/me$/, resource: 'cashier', action: 'me' },
  { pattern: /^\/mf1\/cashiers\/([^/]+)$/, resource: 'cashier' },
  { pattern: /^\/mf1\/cashiers$/, resource: 'cashier', isList: true },

  // Cash Register (mf1)
  { pattern: /^\/mf1\/cash-registers\/([^/]+)$/, resource: 'cash-register' },
  { pattern: /^\/mf1\/cash-registers$/, resource: 'cash-register', isList: true },

  // Point of Sale (mf1)
  { pattern: /^\/mf1\/pems\/([^/]+)$/, resource: 'point-of-sale' },
  { pattern: /^\/mf1\/pems$/, resource: 'point-of-sale', isList: true },

  // Nested resources under merchant (mf2)
  {
    pattern: /^\/mf2\/merchants\/([^/]+)\/suppliers\/([^/]+)$/,
    resource: 'supplier',
    parent: 'merchant',
  },
  {
    pattern: /^\/mf2\/merchants\/([^/]+)\/suppliers$/,
    resource: 'supplier',
    parent: 'merchant',
    isList: true,
  },
  {
    pattern: /^\/mf2\/merchants\/([^/]+)\/daily-reports/,
    resource: 'daily-report',
    parent: 'merchant',
    isList: true,
  },
  {
    pattern: /^\/mf2\/merchants\/([^/]+)\/journals/,
    resource: 'journal',
    parent: 'merchant',
    isList: true,
  },

  // PEM (mf2)
  {
    pattern: /^\/mf2\/pems\/([^/]+)\/certificates$/,
    resource: 'pem',
    action: 'certificates',
  },
  { pattern: /^\/mf2\/pems\/([^/]+)$/, resource: 'pem' },

  // Others
  { pattern: /^\/mf1\/notifications/, resource: 'notification', isList: true },
  {
    pattern: /^\/mf1\/pems\/([^/]+)\/telemetry$/,
    resource: 'telemetry',
  },
];

const DEFAULT_TTL_CONFIG: Record<CacheResource, CacheResourceConfig> = {
  // Data that rarely changes - 30 min TTL for items only
  merchant: { ttlMs: 30 * 60 * 1000, cacheList: false, cacheItem: true },
  'point-of-sale': { ttlMs: 30 * 60 * 1000, cacheList: false, cacheItem: true },
  'cash-register': { ttlMs: 30 * 60 * 1000, cacheList: false, cacheItem: true },
  pem: { ttlMs: 30 * 60 * 1000, cacheList: false, cacheItem: false },

  // Data that changes moderately - 10 min TTL for items only
  cashier: { ttlMs: 10 * 60 * 1000, cacheList: false, cacheItem: true },
  supplier: { ttlMs: 10 * 60 * 1000, cacheList: false, cacheItem: true },

  // Data that can change - 5 min TTL for items only
  receipt: { ttlMs: 5 * 60 * 1000, cacheList: false, cacheItem: true },
  'daily-report': { ttlMs: 5 * 60 * 1000, cacheList: false, cacheItem: true },
  journal: { ttlMs: 5 * 60 * 1000, cacheList: false, cacheItem: true },

  // Real-time data - 1 min TTL
  notification: { ttlMs: 1 * 60 * 1000, cacheList: false, cacheItem: false },
  telemetry: { ttlMs: 1 * 60 * 1000, cacheList: false, cacheItem: false },
};

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export class CacheKeyGenerator implements ICacheKeyGenerator {
  private config: Record<CacheResource, CacheResourceConfig>;

  constructor(customConfig?: Partial<Record<CacheResource, CacheResourceConfig>>) {
    this.config = { ...DEFAULT_TTL_CONFIG, ...customConfig };
    log.info('CacheKeyGenerator initialized with config:', {
      resources: Object.keys(this.config),
    });
  }

  generate(url: string, params?: Record<string, unknown>): string {
    const parsed = this.parseUrl(url);

    if (!parsed) {
      // Fallback: use URL as key
      const paramStr = params ? this.serializeParams(params) : '';
      const key = paramStr ? `${url}?${paramStr}` : url;
      log.debug('URL not matched, using fallback key:', { url, key });
      return key;
    }

    const { resource, ids, action, isList, parent } = parsed;

    if (isList) {
      const paramStr = params ? this.serializeParams(params) : '';
      const parentPart = parent && ids.length > 0 ? `${parent}=${ids[0]}&` : '';
      const key = `${resource}:list:${parentPart}${paramStr}`;
      log.debug('Generated list cache key:', { url, key, resource });
      return key;
    }

    // Single item
    if (ids.length === 0 && action) {
      // Special case for endpoints like /cashiers/me
      const key = `${resource}:${action}`;
      log.debug('Generated special action cache key:', { url, key, resource, action });
      return key;
    }

    let key = `${resource}:${ids.join(':')}`;
    if (action) {
      key += `:${action}`;
    }

    log.debug('Generated item cache key:', { url, key, resource, ids, action });
    return key;
  }

  parseResource(url: string): CacheResource | undefined {
    const parsed = this.parseUrl(url);
    return parsed?.resource;
  }

  getTTL(url: string): number {
    const resource = this.parseResource(url);
    if (!resource) {
      log.debug('No resource found for URL, using default TTL:', { url, ttl: DEFAULT_TTL });
      return DEFAULT_TTL;
    }
    const ttl = this.config[resource].ttlMs;
    log.debug('TTL for resource:', { url, resource, ttlMs: ttl, ttlMin: ttl / 60000 });
    return ttl;
  }

  shouldCache(url: string): boolean {
    const parsed = this.parseUrl(url);
    if (!parsed) {
      log.debug('URL not recognized, should not cache:', { url });
      return false;
    }

    const { resource, isList } = parsed;
    const config = this.config[resource];

    if (isList) {
      log.debug('List endpoint cache decision:', {
        url,
        resource,
        isList: true,
        shouldCache: config.cacheList,
      });
      return config.cacheList;
    }

    log.debug('Item endpoint cache decision:', {
      url,
      resource,
      isList: false,
      shouldCache: config.cacheItem,
    });
    return config.cacheItem;
  }

  getInvalidationPatterns(url: string, method: string): string[] {
    const parsed = this.parseUrl(url);
    if (!parsed) {
      log.debug('No patterns to invalidate for URL:', { url, method });
      return [];
    }

    const { resource, ids, parent } = parsed;
    const patterns: string[] = [];

    // Always invalidate list on mutations
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      if (parent && ids.length > 0) {
        patterns.push(`${resource}:list:${parent}=${ids[0]}*`);
      }
      patterns.push(`${resource}:list:*`);
    }

    // Invalidate specific item on PUT/PATCH/DELETE
    if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      if (ids.length > 0) {
        patterns.push(`${resource}:${ids.join(':')}*`);
      }
    }

    // Special cases
    if (resource === 'cashier' && (method === 'PUT' || method === 'DELETE')) {
      patterns.push('cashier:me');
    }

    log.debug('Invalidation patterns:', { url, method, patterns });
    return patterns;
  }

  private parseUrl(url: string): {
    resource: CacheResource;
    ids: string[];
    action?: string;
    isList?: boolean;
    parent?: string;
  } | null {
    // Remove query string for pattern matching
    const urlPath = url.split('?')[0];

    for (const pattern of URL_PATTERNS) {
      const match = urlPath?.match(pattern.pattern);
      if (match) {
        // Extract IDs from capture groups
        const ids = match.slice(1).filter(Boolean);

        return {
          resource: pattern.resource,
          ids,
          action: pattern.action,
          isList: pattern.isList,
          parent: pattern.parent,
        };
      }
    }

    return null;
  }

  private serializeParams(params: Record<string, unknown>): string {
    const sortedKeys = Object.keys(params).sort();
    const parts: string[] = [];

    for (const key of sortedKeys) {
      const value = params[key];
      if (value !== undefined && value !== null) {
        parts.push(`${key}=${String(value)}`);
      }
    }

    return parts.join('&');
  }
}
