/**
 * Authentication Performance Optimizations
 * Memory-efficient caching, batching, and performance monitoring for auth operations
 */

import { LRUCache } from 'lru-cache';

import type { AuthUser, UserRole, PermissionCheck, PermissionResult } from './types';

export interface AuthPerformanceConfig {
  // Permission caching
  permissionCacheSize: number;
  permissionCacheTTL: number; // milliseconds

  // Role computation caching
  roleCacheSize: number;
  roleCacheTTL: number;

  // Token validation caching
  tokenValidationCacheSize: number;
  tokenValidationCacheTTL: number;

  // Batch processing
  maxBatchSize: number;
  batchTimeoutMs: number;

  // Performance monitoring
  enableMetrics: boolean;
  metricsRetentionMs: number;
}

const DEFAULT_PERFORMANCE_CONFIG: AuthPerformanceConfig = {
  permissionCacheSize: 1000,
  permissionCacheTTL: 5 * 60 * 1000, // 5 minutes
  roleCacheSize: 100,
  roleCacheTTL: 10 * 60 * 1000, // 10 minutes
  tokenValidationCacheSize: 500,
  tokenValidationCacheTTL: 1 * 60 * 1000, // 1 minute
  maxBatchSize: 10,
  batchTimeoutMs: 50,
  enableMetrics: true,
  metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
};

export interface AuthPerformanceMetrics {
  permissionChecks: {
    total: number;
    cached: number;
    cacheHitRate: number;
    avgResponseTime: number;
  };
  roleComputations: {
    total: number;
    cached: number;
    cacheHitRate: number;
    avgResponseTime: number;
  };
  tokenValidations: {
    total: number;
    cached: number;
    cacheHitRate: number;
    avgResponseTime: number;
  };
  batchOperations: {
    totalBatches: number;
    avgBatchSize: number;
    avgBatchTime: number;
  };
  memoryUsage: {
    totalCacheSize: number;
    permissionCacheSize: number;
    roleCacheSize: number;
    tokenCacheSize: number;
  };
}

/**
 * High-performance authentication operations with intelligent caching and batching
 */
export class AuthPerformanceOptimizer {
  private config: AuthPerformanceConfig;

  // Permission caching
  private permissionCache: LRUCache<string, PermissionResult>;

  private roleCache: LRUCache<string, UserRole[]>;

  private tokenValidationCache: LRUCache<string, boolean>;

  // Batch processing
  private pendingPermissionChecks: Map<string, {
    checks: Array<{
      permission: PermissionCheck;
      resolve: (result: PermissionResult) => void;
      reject: (error: Error) => void;
    }>;
    timer: NodeJS.Timeout;
  }> = new Map();

  // Performance metrics
  private metrics: AuthPerformanceMetrics = this.createEmptyMetrics();

  constructor(config: Partial<AuthPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };

    // Initialize caches
    this.permissionCache = new LRUCache({
      max: this.config.permissionCacheSize,
      ttl: this.config.permissionCacheTTL,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    this.roleCache = new LRUCache({
      max: this.config.roleCacheSize,
      ttl: this.config.roleCacheTTL,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    this.tokenValidationCache = new LRUCache({
      max: this.config.tokenValidationCacheSize,
      ttl: this.config.tokenValidationCacheTTL,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    // Initialize metrics
    this.resetMetrics();

    // Setup cache cleanup
    this.setupCacheCleanup();
  }

  /**
   * Cache-aware permission checking with intelligent batching
   */
  async checkPermissionOptimized(
    user: AuthUser,
    permission: PermissionCheck,
    checkFn: (permission: PermissionCheck) => Promise<PermissionResult>,
  ): Promise<PermissionResult> {
    const startTime = performance.now();

    // Generate cache key
    const cacheKey = this.generatePermissionCacheKey(user, permission);

    // Check cache first
    const cached = this.permissionCache.get(cacheKey);
    if (cached) {
      this.updateMetrics('permissionChecks', startTime, true);
      return cached;
    }

    // Add to batch for processing
    return new Promise((resolve, reject) => {
      const userKey = user.id;

      if (!this.pendingPermissionChecks.has(userKey)) {
        this.pendingPermissionChecks.set(userKey, {
          checks: [],
          timer: setTimeout(() => {
            this.processPendingPermissionChecks(userKey, checkFn);
          }, this.config.batchTimeoutMs) as unknown as NodeJS.Timeout,
        });
      }

      const pending = this.pendingPermissionChecks.get(userKey)!;
      pending.checks.push({ permission, resolve, reject });

      // Process immediately if batch is full
      if (pending.checks.length >= this.config.maxBatchSize) {
        clearTimeout(pending.timer);
        this.processPendingPermissionChecks(userKey, checkFn);
      }
    });
  }

  /**
   * Cache-aware role computation with memoization
   */
  getEffectiveRolesOptimized(
    user: AuthUser,
    getRolesFn: (user: AuthUser) => UserRole[],
  ): UserRole[] {
    const startTime = performance.now();

    // Generate cache key based on user roles and context
    const cacheKey = this.generateRoleCacheKey(user);

    // Check cache first
    const cached = this.roleCache.get(cacheKey);
    if (cached) {
      this.updateMetrics('roleComputations', startTime, true);
      return cached;
    }

    // Compute roles
    const roles = getRolesFn(user);

    // Cache result
    this.roleCache.set(cacheKey, roles);
    this.updateMetrics('roleComputations', startTime, false);

    return roles;
  }

  /**
   * Optimized token validation with caching
   */
  async validateTokenOptimized(
    token: string,
    validateFn: (token: string) => Promise<boolean>,
  ): Promise<boolean> {
    const startTime = performance.now();

    // Generate cache key (hash the token for security)
    const cacheKey = this.hashToken(token);

    // Check cache first
    const cached = this.tokenValidationCache.get(cacheKey);
    if (cached !== undefined) {
      this.updateMetrics('tokenValidations', startTime, true);
      return cached;
    }

    // Validate token
    const isValid = await validateFn(token);

    // Cache result
    this.tokenValidationCache.set(cacheKey, isValid);
    this.updateMetrics('tokenValidations', startTime, false);

    return isValid;
  }

  /**
   * Preload common permissions for a user
   */
  async preloadUserPermissions(
    user: AuthUser,
    commonPermissions: PermissionCheck[],
    checkFn: (permission: PermissionCheck) => Promise<PermissionResult>,
  ): Promise<void> {
    const uncachedPermissions = commonPermissions.filter(permission => {
      const cacheKey = this.generatePermissionCacheKey(user, permission);
      return !this.permissionCache.has(cacheKey);
    });

    if (uncachedPermissions.length === 0) {return;}

    // Batch preload permissions
    const results = await Promise.allSettled(
      uncachedPermissions.map(permission => checkFn(permission)),
    );

    // Cache results
    results.forEach((result, index) => {
      const permission = uncachedPermissions[index];
      if (result.status === 'fulfilled' && permission) {
        const cacheKey = this.generatePermissionCacheKey(user, permission);
        this.permissionCache.set(cacheKey, result.value);
      }
    });
  }

  /**
   * Clear user-specific caches (on logout, role change, etc.)
   */
  clearUserCaches(userId: string): void {
    // Clear permission cache entries for user
    for (const [key] of this.permissionCache.entries()) {
      if (key.startsWith(`user:${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }

    // Clear role cache entries for user
    for (const [key] of this.roleCache.entries()) {
      if (key.startsWith(`user:${userId}:`)) {
        this.roleCache.delete(key);
      }
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): AuthPerformanceMetrics {
    return {
      ...this.metrics,
      memoryUsage: {
        totalCacheSize: this.permissionCache.size + this.roleCache.size + this.tokenValidationCache.size,
        permissionCacheSize: this.permissionCache.size,
        roleCacheSize: this.roleCache.size,
        tokenCacheSize: this.tokenValidationCache.size,
      },
    };
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): AuthPerformanceMetrics {
    return {
      permissionChecks: {
        total: 0,
        cached: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
      },
      roleComputations: {
        total: 0,
        cached: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
      },
      tokenValidations: {
        total: 0,
        cached: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
      },
      batchOperations: {
        totalBatches: 0,
        avgBatchSize: 0,
        avgBatchTime: 0,
      },
      memoryUsage: {
        totalCacheSize: 0,
        permissionCacheSize: 0,
        roleCacheSize: 0,
        tokenCacheSize: 0,
      },
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all pending batch operations
    for (const [, pending] of this.pendingPermissionChecks) {
      clearTimeout(pending.timer);
      pending.checks.forEach(({ reject }) => {
        reject(new Error('AuthPerformanceOptimizer destroyed'));
      });
    }
    this.pendingPermissionChecks.clear();

    // Clear caches
    this.permissionCache.clear();
    this.roleCache.clear();
    this.tokenValidationCache.clear();
  }

  // Private methods

  private async processPendingPermissionChecks(
    userKey: string,
    checkFn: (permission: PermissionCheck) => Promise<PermissionResult>,
  ): Promise<void> {
    const pending = this.pendingPermissionChecks.get(userKey);
    if (!pending) {return;}

    this.pendingPermissionChecks.delete(userKey);
    clearTimeout(pending.timer);

    const batchStartTime = performance.now();

    try {
      // Process batch
      const results = await Promise.allSettled(
        pending.checks.map(({ permission }) => checkFn(permission)),
      );

      // Update metrics
      this.metrics.batchOperations.totalBatches++;
      this.metrics.batchOperations.avgBatchSize =
        (this.metrics.batchOperations.avgBatchSize * (this.metrics.batchOperations.totalBatches - 1) +
         pending.checks.length) / this.metrics.batchOperations.totalBatches;

      const batchTime = performance.now() - batchStartTime;
      this.metrics.batchOperations.avgBatchTime =
        (this.metrics.batchOperations.avgBatchTime * (this.metrics.batchOperations.totalBatches - 1) +
         batchTime) / this.metrics.batchOperations.totalBatches;

      // Resolve individual promises and cache results
      results.forEach((result, index) => {
        const check = pending.checks[index];
        if (!check) {return;}

        const { permission, resolve, reject } = check;

        if (result.status === 'fulfilled') {
          // Cache the result
          const cacheKey = this.generatePermissionCacheKey(
            { id: userKey } as AuthUser,
            permission,
          );
          this.permissionCache.set(cacheKey, result.value);

          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all pending checks
      pending.checks.forEach(({ reject }) => {
        reject(error as Error);
      });
    }
  }

  private generatePermissionCacheKey(user: AuthUser, permission: PermissionCheck): string {
    // Include user context that affects permissions
    const context = [
      user.id,
      user.merchant_id || '',
      user.cashier_id || '',
      JSON.stringify(user.roles.sort()),
      permission.resource,
      permission.action,
      JSON.stringify(permission.context || {}),
    ].join(':');

    return `perm:${this.hashString(context)}`;
  }

  private generateRoleCacheKey(user: AuthUser): string {
    // Include user context that affects role computation
    const context = [
      user.id,
      user.merchant_id || '',
      user.cashier_id || '',
      JSON.stringify(user.roles.sort()),
      user.attributes?.primaryRole || '',
    ].join(':');

    return `role:${this.hashString(context)}`;
  }

  private hashToken(token: string): string {
    // Simple hash for caching (not cryptographic)
    return `token:${this.hashString(token)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private updateMetrics(
    type: 'permissionChecks' | 'roleComputations' | 'tokenValidations',
    startTime: number,
    fromCache: boolean,
  ): void {
    if (!this.config.enableMetrics) {return;}

    const responseTime = performance.now() - startTime;
    const metric = this.metrics[type];

    metric.total++;
    if (fromCache) {
      metric.cached++;
    }

    // Update cache hit rate
    metric.cacheHitRate = metric.cached / metric.total;

    // Update average response time
    metric.avgResponseTime =
      (metric.avgResponseTime * (metric.total - 1) + responseTime) / metric.total;
  }

  private setupCacheCleanup(): void {
    // Periodic cache cleanup to prevent memory leaks
    setInterval(() => {
      this.permissionCache.purgeStale();
      this.roleCache.purgeStale();
      this.tokenValidationCache.purgeStale();
    }, 5 * 60 * 1000) as unknown as NodeJS.Timeout; // Every 5 minutes
  }
}

/**
 * Common permission sets for preloading
 */
export const COMMON_PERMISSION_SETS = {
  CASHIER: [
    { resource: 'receipts', action: 'create' },
    { resource: 'receipts', action: 'read' },
    { resource: 'receipts', action: 'void' },
    { resource: 'pointOfSales', action: 'read' },
  ] as PermissionCheck[],

  MERCHANT: [
    { resource: 'receipts', action: 'create' },
    { resource: 'receipts', action: 'read' },
    { resource: 'receipts', action: 'void' },
    { resource: 'receipts', action: 'return' },
    { resource: 'pointOfSales', action: 'read' },
    { resource: 'pointOfSales', action: 'update' },
    { resource: 'cashiers', action: 'read' },
    { resource: 'merchants', action: 'read' },
    { resource: 'merchants', action: 'update' },
  ] as PermissionCheck[],

  SUPPLIER: [
    { resource: 'receipts', action: 'create' },
    { resource: 'receipts', action: 'read' },
    { resource: 'receipts', action: 'void' },
    { resource: 'receipts', action: 'return' },
    { resource: 'pointOfSales', action: 'create' },
    { resource: 'pointOfSales', action: 'read' },
    { resource: 'pointOfSales', action: 'update' },
    { resource: 'pointOfSales', action: 'delete' },
    { resource: 'cashiers', action: 'create' },
    { resource: 'cashiers', action: 'read' },
    { resource: 'cashiers', action: 'update' },
    { resource: 'cashiers', action: 'delete' },
    { resource: 'merchants', action: 'create' },
    { resource: 'merchants', action: 'read' },
    { resource: 'merchants', action: 'update' },
    { resource: 'merchants', action: 'delete' },
  ] as PermissionCheck[],
} as const;
